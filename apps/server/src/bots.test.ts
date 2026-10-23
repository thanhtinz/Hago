import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng } from '@co/core';
import { caroEngine, type CaroState } from '@co/game-co-caro';
import { hexEngine, type HexState } from '@co/game-co-hex';
import { BotDispatcher } from './bots.js';

/**
 * Hàng đợi bot kiểm ở đúng hai tính chất làm nên nó: **đúng làn** và
 * **ngoài vòng lặp sự kiện**. Nước trả về có hợp lệ không là việc của bot
 * từng game (đã có test riêng trong package của chúng); ở đây chỉ cần
 * nước đó nằm trong `legal()` của engine.
 */

function caroState(): CaroState {
  return caroEngine.init([0, 1], {}, makeRng('t', 0));
}
function hexState(): HexState {
  return hexEngine.init([0, 1], {}, makeRng('t', 0));
}

test('bảng làn: bộ môn có bot thì có làn, không có thì thôi', () => {
  const d = new BotDispatcher({ inProcess: true });
  assert.equal(d.laneOf('co-caro'), 'fast');
  assert.equal(d.laneOf('co-hex'), 'heavy');
  assert.equal(d.laneOf('co-vay'), null);
  assert.equal(d.has('co-caro'), true);
  assert.equal(d.has('co-vay'), false);
});

test('trong tiến trình: trả nước hợp lệ, job hỏng không gãy hàng', async () => {
  const d = new BotDispatcher({ inProcess: true });
  const s = caroState();
  const a = (await d.pick({ gameId: 'co-caro', state: s, seat: 0, level: 1, seed: 'x:1:0' })) as { r: number; c: number };
  assert.ok(caroEngine.legal(s, 0).some((m) => m.r === a.r && m.c === a.c));
  await assert.rejects(d.pick({ gameId: 'co-vay', state: s, seat: 0, level: 1, seed: 'x' }), /NO_BOT/);
  const b = (await d.pick({ gameId: 'co-caro', state: s, seat: 0, level: 2, seed: 'x:1:1' })) as { r: number; c: number };
  assert.ok(caroEngine.legal(s, 0).some((m) => m.r === b.r && m.c === b.c));
  await d.close();
});

test('worker thật: nước caro về đúng, và làn heavy không chặn làn fast', async () => {
  const d = new BotDispatcher();
  try {
    const hs = hexState();
    const t0 = Date.now();
    let hexDoneAt = 0;
    const hexPick = d
      .pick({ gameId: 'co-hex', state: hs, seat: 0, level: 3, seed: 'phong:1:0' })
      .then((a) => {
        hexDoneAt = Date.now() - t0;
        return a as { at?: number; swap?: boolean };
      });
    // Làn heavy đang nghĩ (~900ms ngân sách MCTS) — nước caro ở làn fast
    // phải về trước, không xếp hàng sau nó.
    const cs = caroState();
    const a = (await d.pick({ gameId: 'co-caro', state: cs, seat: 0, level: 1, seed: 'phong:1:0' })) as { r: number; c: number };
    const caroMs = Date.now() - t0;
    assert.ok(caroEngine.legal(cs, 0).some((m) => m.r === a.r && m.c === a.c));
    assert.ok(caroMs < 600, `nước caro mất ${caroMs}ms — làn fast đang bị làn heavy chặn`);
    const hexAction = await hexPick;
    assert.ok(hexDoneAt >= caroMs, 'nước Hex phải về sau nước caro trong cảnh này');
    assert.ok(
      hexEngine.legal(hs, 0).some((m) => m.at === hexAction.at && m.swap === hexAction.swap),
      'nước Hex từ worker phải hợp lệ',
    );
  } finally {
    await d.close();
  }
});

test('worker quá hạn thì bị giết và dựng lại, job sau vẫn chạy', async () => {
  // Trần cứng chỉ siết ở làn heavy: worker mới của làn fast cần vài trăm
  // mili giây chỉ để khởi động và nạp luật, siết nó ở 30ms là kiểm sai thứ.
  const d = new BotDispatcher({ hardTimeoutMs: (lane) => (lane === 'heavy' ? 30 : 5000) });
  try {
    // 30ms không đủ cho MCTS mức Khó: job này phải hỏng vì quá hạn…
    await assert.rejects(
      d.pick({ gameId: 'co-hex', state: hexState(), seat: 0, level: 3, seed: 'phong:1:0' }),
      /BOT_TIMEOUT/,
    );
    // …và worker mới của làn fast vẫn phục vụ bình thường.
    const cs = caroState();
    const a = (await d.pick({ gameId: 'co-caro', state: cs, seat: 0, level: 1, seed: 'phong:1:0' })) as { r: number; c: number };
    assert.ok(caroEngine.legal(cs, 0).some((m) => m.r === a.r && m.c === a.c));
  } finally {
    await d.close();
  }
});

test('đóng hàng đợi thì mọi lời hứa sau đó đều bị từ chối', async () => {
  const d = new BotDispatcher({ inProcess: true });
  await d.close();
  await assert.rejects(d.pick({ gameId: 'co-caro', state: caroState(), seat: 0, level: 1, seed: 'x' }), /BOT_CLOSED/);
});
