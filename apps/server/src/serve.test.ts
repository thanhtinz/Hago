import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import type { ServerMsg } from '@co/protocol';
import './catalog.js';
import { MAX_FRAME, buildServer, type Serving } from './serve.js';

/**
 * Cả đường dây thật: cổng mở, socket thật, HTTP thật.
 *
 * Bài kiểm ở `rooms.test.ts` gọi thẳng vào `Rooms` nên nhanh và ổn định,
 * nhưng nó **không thể** bắt được lớp lỗi nguy hiểm nhất của dự án này:
 * một gói tin dị dạng đi qua `JSON.parse` rồi ném ở tầng dưới, thoát ra
 * thành `uncaughtException`, và giết cả tiến trình cùng mọi ván đang chạy
 * của mọi người. Chỉ bài kiểm mở cổng thật mới chứng minh được là hết.
 */

async function up(): Promise<{ s: Serving; url: string; ws: string; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'co-serve-'));
  const s = buildServer({ dbFile: ':memory:', avatarDir: path.join(dir, 'avatars'), heartbeatMs: 60_000 });
  const port = await s.listen(0);
  return { s, url: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}`, dir };
}

function down(x: { s: Serving; dir: string }): Promise<void> {
  rmSync(x.dir, { recursive: true, force: true });
  return x.s.close();
}

/** Mở một socket và gom mọi thông điệp máy chủ đẩy về. */
function sock(url: string) {
  const ws = new WebSocket(url);
  const inbox: ServerMsg[] = [];
  ws.on('message', (d) => inbox.push(JSON.parse(String(d)) as ServerMsg));
  const open = new Promise<void>((ok, no) => {
    ws.once('open', () => ok());
    ws.once('error', no);
  });
  return {
    ws,
    inbox,
    open,
    send: (m: unknown) => ws.send(JSON.stringify(m)),
    /** Chờ tới khi có thông điệp loại này, hoặc hết giờ. */
    async wait<T extends ServerMsg['t']>(t: T, ms = 2000): Promise<Extract<ServerMsg, { t: T }>> {
      const until = Date.now() + ms;
      for (;;) {
        const hit = inbox.find((m) => m.t === t);
        if (hit) return hit as never;
        if (Date.now() > until) throw new Error(`không nhận được "${t}" sau ${ms}ms: ${JSON.stringify(inbox)}`);
        await new Promise((r) => setTimeout(r, 15));
      }
    },
    close: () => ws.close(),
  };
}

async function signUp(url: string, name: string, email: string): Promise<{ token: string; id: string }> {
  const r = await fetch(`${url}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'matkhaudai' }),
  });
  const j = (await r.json()) as { token: string; user: { id: string } };
  assert.ok(j.token, `đăng ký hỏng: ${JSON.stringify(j)}`);
  return { token: j.token, id: j.user.id };
}

test('gói tin dị dạng không giết được máy chủ, và ván vẫn chạy tiếp', async () => {
  const x = await up();
  try {
    const a = await signUp(x.url, 'An', 'an@vidu.com');
    const b = await signUp(x.url, 'Bình', 'binh@vidu.com');
    const A = sock(x.ws);
    const B = sock(x.ws);
    await A.open;
    await B.open;
    A.send({ t: 'hello', token: a.token });
    B.send({ t: 'hello', token: b.token });
    await A.wait('welcome');
    await B.wait('welcome');

    A.send({ t: 'create', gameId: 'co-caro' });
    const room = await A.wait('room');
    B.send({ t: 'join', code: room.code });
    await B.wait('state');

    // Đúng những gói tin từng giết cả tiến trình.
    for (const bad of [
      { t: 'join', code: 5 },
      { t: 'watch', ids: 5 },
      { t: 'chat-open', channel: 5 },
      { t: 'act', nonce: 1, action: null },
      { t: 'quick', gameId: {} },
      'khong-phai-json-object',
    ]) {
      A.send(bad);
    }
    A.send('{ dut dang json');
    await new Promise((r) => setTimeout(r, 200));

    assert.ok(
      A.inbox.some((m) => m.t === 'error' && (m.code === 'BAD_MSG' || m.code === 'BAD_JSON')),
      'phải trả lỗi chứ không im lặng',
    );

    // Và chứng minh máy chủ còn sống: đi một nước thật, cả hai màn cùng đổi.
    A.send({ t: 'act', nonce: 'n1', action: { t: 'game', a: { r: 7, c: 7 } } });
    for (;;) {
      const st = B.inbox.filter((m) => m.t === 'state');
      if (st.length >= 2) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    const last = [...B.inbox].reverse().find((m) => m.t === 'state')!;
    assert.equal(last.t, 'state');
    assert.ok(last.ply >= 1, 'nước đi thật vẫn tới nơi sau trận mưa gói tin rác');

    A.close();
    B.close();
  } finally {
    await down(x);
  }
});

test('khung vượt trần bị đóng, không nuốt hết bộ nhớ', async () => {
  const x = await up();
  try {
    const A = sock(x.ws);
    await A.open;
    const closed = new Promise<void>((ok) => A.ws.once('close', () => ok()));
    // Chưa đăng nhập vẫn bơm được — đó chính là chỗ đau: kiểm token nằm sau
    // khi `ws` đã gom cả khung vào bộ nhớ.
    A.ws.send(JSON.stringify({ t: 'hello', token: 'x'.repeat(MAX_FRAME * 2) }));
    await Promise.race([closed, new Promise((_, no) => setTimeout(() => no(new Error('khung quá khổ không bị đóng')), 3000))]);
  } finally {
    await down(x);
  }
});

test('gõ sai mật khẩu quá nhiều lần thì bị chặn tạm, kèm thời gian chờ', async () => {
  const x = await up();
  try {
    await signUp(x.url, 'An', 'an@vidu.com');
    let blocked: { status: number; body: { code?: string; waitMs?: number }; retry: string | null } | null = null;
    for (let i = 0; i < 15; i++) {
      const r = await fetch(`${x.url}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'an@vidu.com', password: 'sai-be-bet' }),
      });
      if (r.status === 429) {
        blocked = { status: r.status, body: (await r.json()) as never, retry: r.headers.get('retry-after') };
        break;
      }
      await r.text();
    }
    assert.ok(blocked, 'mười lăm lần gõ sai liên tiếp mà không bị chặn thì đó là cửa dò mật khẩu');
    assert.equal(blocked.body.code, 'TOO_FAST');
    assert.ok(Number(blocked.retry) > 0, 'phải nói phải chờ bao lâu qua header retry-after');
  } finally {
    await down(x);
  }
});

test('gõ đúng mật khẩu thì xoá dấu, lần sau không bị tính tiếp', async () => {
  const x = await up();
  try {
    await signUp(x.url, 'An', 'an@vidu.com');
    const login = (password: string) =>
      fetch(`${x.url}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'an@vidu.com', password }),
      });
    // Người thật gõ sai vài lần rồi gõ đúng — không đáng bị khoá năm phút.
    for (let i = 0; i < 5; i++) await (await login('sai-be-bet')).text();
    const ok = await login('matkhaudai');
    assert.equal(ok.status, 200);
    await ok.text();
    for (let i = 0; i < 5; i++) {
      const r = await login('sai-be-bet');
      assert.notEqual(r.status, 429, `lần thứ ${i + 1} sau khi đăng nhập đúng không được bị chặn`);
      await r.text();
    }
  } finally {
    await down(x);
  }
});

test('nhắn quá nhanh bị chặn riêng, không kéo theo nước cờ', async () => {
  const x = await up();
  try {
    const a = await signUp(x.url, 'An', 'an@vidu.com');
    const A = sock(x.ws);
    await A.open;
    A.send({ t: 'hello', token: a.token });
    await A.wait('welcome');
    A.send({ t: 'chat-open', channel: 'chung' });
    await A.wait('chat-page');

    for (let i = 0; i < 30; i++) A.send({ t: 'chat-send', channel: 'chung', body: `spam ${i}` });
    await new Promise((r) => setTimeout(r, 300));
    assert.ok(
      A.inbox.some((m) => m.t === 'error' && m.code === 'TOO_FAST'),
      'ba mươi tin trong một nhịp mà không bị chặn thì sảnh chung thành bãi rác',
    );
    A.close();
  } finally {
    await down(x);
  }
});
