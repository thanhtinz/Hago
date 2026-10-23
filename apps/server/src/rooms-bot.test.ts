import assert from 'node:assert/strict';
import test from 'node:test';
import type { ServerMsg } from '@co/protocol';
import './catalog.js';
import { BotDispatcher } from './bots.js';
import { Rooms, type BotSource } from './rooms.js';

/**
 * Ván với máy **trên máy chủ**: bot ngồi một ghế thật và đi qua cổng
 * `act()` như người. Khác ván đấu máy trong app — ván đó chạy trên máy
 * người chơi, máy chủ không biết gì, và không có gì để kiểm ở đây.
 */

function client(rooms: Rooms, id: string, name: string) {
  const inbox: ServerMsg[] = [];
  rooms.connect(id, name, (m) => inbox.push(m));
  return {
    id,
    inbox,
    last<T extends ServerMsg['t']>(t: T): Extract<ServerMsg, { t: T }> | undefined {
      for (let i = inbox.length - 1; i >= 0; i--) if (inbox[i]!.t === t) return inbox[i] as never;
      return undefined;
    },
  };
}

const fixedCodes = () => {
  let n = 0;
  return () => ((n++ * 7919) % 32) / 32;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Nước thô đầu tiên đang hợp lệ của một người — `legalFor` trả nước đã bọc meta. */
function firstMove(rooms: Rooms, id: string): unknown {
  const legal = rooms.legalFor(id) as { t?: string; a?: unknown }[];
  const game = legal.find((w) => w.t === 'game');
  assert.ok(game, 'phải có nước cờ hợp lệ');
  return game.a;
}

/** Chờ một điều kiện thành đúng, tối đa ~5 giây. */
async function until(fn: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 500; i++) {
    if (fn()) return;
    await sleep(10);
  }
  assert.fail(`chờ mãi không thấy: ${what}`);
}

function makeRooms(bots?: BotSource) {
  const finishes: { rated: boolean; seats: (string | null)[]; log: string; winner: unknown }[] = [];
  const rooms = new Rooms({
    serverSeed: 'test',
    random: fixedCodes(),
    ...(bots ? { bots } : {}),
    onFinish: (e) => finishes.push({ rated: e.rated, seats: e.seats, log: e.log, winner: e.outcome.winner }),
  });
  return { rooms, finishes };
}

test('vsBot mở ván đã bắt đầu, không tính hạng, đối thủ tên Máy', () => {
  const { rooms } = makeRooms(new BotDispatcher({ inProcess: true }));
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 1);
  const room = a.last('room')!;
  assert.equal(room.started, true);
  assert.equal(room.rated, false, 'ván với máy không bao giờ tính xếp hạng');
  assert.equal(room.yourSeat, 0);
  assert.equal(room.seats[1]?.name, 'Máy');
  assert.ok(a.last('state'), 'đủ ghế là ván chạy ngay');
  rooms.leave(a.id);
});

test('không có nguồn bot thì báo NO_BOT, bộ môn lạ thì NO_GAME', () => {
  const { rooms } = makeRooms();
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 1);
  assert.equal(a.last('error')?.code, 'NO_BOT');
  const { rooms: rooms2 } = makeRooms(new BotDispatcher({ inProcess: true }));
  const b = client(rooms2, 'b', 'Bình');
  rooms2.vsBot(b.id, 'co-vay', 1);
  assert.equal(b.last('error')?.code, 'NO_GAME');
});

test('đánh trọn một ván với máy: nước bot vào log như nước người, kết quả ghi sổ không hạng', async () => {
  const bots = new BotDispatcher({ inProcess: true });
  const { rooms, finishes } = makeRooms(bots);
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 1);

  // Người cứ đi nước hợp lệ đầu tiên; máy trả lời tự động sau mỗi nước.
  for (let guard = 0; guard < 300; guard++) {
    const st = a.last('state')!;
    if (st.outcome) break;
    if (st.turn.kind === 'seat' && st.turn.seat === 0) {
      rooms.act(a.id, `n${guard}`, { t: 'game', a: firstMove(rooms, a.id) });
    }
    await sleep(5);
    if (guard === 299) assert.fail('ván với máy không kết thúc được');
  }

  const st = a.last('state')!;
  assert.ok(st.outcome, 'ván phải có kết quả');
  assert.equal(finishes.length, 1, 'ghi sổ đúng một lần');
  assert.equal(finishes[0]!.rated, false);
  assert.equal(finishes[0]!.seats[0], 'a');
  assert.ok(String(finishes[0]!.seats[1]).startsWith('bot:'), 'ghế 1 trong sổ là bot');

  const log = JSON.parse(finishes[0]!.log) as { inputs: { seat: number; nonce?: string; action: { t?: string } }[] };
  const botMoves = log.inputs.filter((r) => r.seat === 1 && r.action.t === 'game');
  assert.ok(botMoves.length > 0, 'log phải có nước của bot');
  assert.ok(
    botMoves.every((r) => String(r.nonce).startsWith('bot:')),
    'nước bot mang nonce của máy chủ, phát lại được như mọi nước khác',
  );
  await bots.close();
});

test('người rời phòng giữa ván thì phòng bot tan và ghế bot được dọn', async () => {
  const bots = new BotDispatcher({ inProcess: true });
  const { rooms } = makeRooms(bots);
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 1);
  assert.equal(rooms.stats().rooms, 1);
  assert.equal(rooms.stats().players, 2, 'người và bot là hai Player');
  rooms.leave(a.id);
  assert.equal(rooms.stats().rooms, 0, 'phòng chỉ còn bot thì phải tan');
  assert.equal(rooms.stats().players, 1, 'ghế bot phải được dọn khỏi danh sách người chơi');
  await bots.close();
});

test('đấu lại: bot đồng ý ngay, ghế đổi bên, và bot đi nước đầu của ván mới', async () => {
  const bots = new BotDispatcher({ inProcess: true });
  const { rooms } = makeRooms(bots);
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 1);
  // Kết thúc ván đầu bằng cách xin thua cho nhanh.
  rooms.act(a.id, 'gg', { t: 'resign' });
  await until(() => a.last('state')?.outcome != null, 'ván đầu kết thúc');

  rooms.rematch(a.id, true);
  await until(() => a.last('room')?.game === 2, 'ván hai được dựng');
  // Ghế đã đổi: người ngồi ghế 1, bot ghế 0 và phải tự đi nước mở màn.
  await until(() => (a.last('state')?.ply ?? 0) >= 1, 'bot đi nước đầu ván hai');
  assert.equal(a.last('room')!.yourSeat, 1);
  await bots.close();
});

test('nguồn bot hỏng thì ván vẫn đi tiếp bằng nước hợp lệ đầu tiên', async () => {
  const broken: BotSource = {
    has: () => true,
    pick: () => Promise.reject(new Error('worker chết giả lập')),
  };
  const { rooms } = makeRooms(broken);
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 2);
  rooms.act(a.id, 'n0', { t: 'game', a: firstMove(rooms, a.id) });
  await until(() => (a.last('state')?.ply ?? 0) >= 2, 'bot vẫn đi được dù nguồn bot hỏng');
  const st = a.last('state')!;
  assert.equal(st.outcome, null);
});

test('bot trả nước phạm luật thì máy chủ thay bằng nước hợp lệ', async () => {
  const cheating: BotSource = {
    has: () => true,
    pick: () => Promise.resolve({ r: 99, c: 99 }),
  };
  const { rooms } = makeRooms(cheating);
  const a = client(rooms, 'a', 'An');
  rooms.vsBot(a.id, 'co-caro', 2);
  rooms.act(a.id, 'n0', { t: 'game', a: firstMove(rooms, a.id) });
  await until(() => (a.last('state')?.ply ?? 0) >= 2, 'nước thay thế được áp dụng');
});
