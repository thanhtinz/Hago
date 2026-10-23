import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, type Seat } from '@co/core';
import { runEngineConformance } from '@co/core/testkit';
import { hexBot } from './bot.js';
import { pathCost } from './bot.js';
import { canSwap, hexEngine, neighborsOf, winnerOf, type HexState } from './engine.js';

const SEATS = [0, 1];

function play(moves: { at?: number; swap?: boolean }[], size = 11): HexState {
  let s = hexEngine.init(SEATS, { size }, makeRng('t', 0));
  moves.forEach((a, i) => {
    s = hexEngine.reduce(s, (i % 2) as Seat, a, makeRng('t', s.rngCursor));
  });
  return s;
}

test('bàn trống có 121 nước, và nước đổi chưa tồn tại', () => {
  const s = hexEngine.init(SEATS, {}, makeRng('t', 0));
  assert.equal(hexEngine.legal(s, 0).length, 121);
  assert.ok(hexEngine.legal(s, 0).every((a) => a.swap !== true));
  assert.equal(canSwap(s), false);
});

test('định lý Hex: bàn đầy ngẫu nhiên luôn có đúng một bên thắng', () => {
  // Bài kiểm mạnh nhất của game này (đặc tả luật, mục 6): bảng kề sai một
  // hướng là tỉ lệ "không bên nào thắng" nhảy lên ngay. `winnerOf` trả về
  // tối đa một bên, nên chỉ cần khẳng định không ván nào về tay không.
  const rng = makeRng('hex-theorem', 0);
  for (let k = 0; k < 100_000; k++) {
    const cells = new Array<number>(121);
    for (let i = 0; i < 121; i++) cells[i] = rng.next() < 0.5 ? 0 : 1;
    assert.notEqual(winnerOf(cells, 11), null, `bàn đầy thứ ${k} mà không bên nào nối được`);
  }
});

test('dải chéo (r+1, c+1) không phải là nối — hướng đó không kề', () => {
  // Lỗi cài đặt kinh điển: coi lưới lục giác như lưới vuông 8 hướng. Dải
  // quân ghế 0 chạy chéo (0,0) xuống (10,10) trông như chạm cả hai bờ
  // nhưng không có hai ô liên tiếp nào kề nhau thật.
  const cells = new Array<number>(121).fill(-1);
  for (let k = 0; k < 11; k++) cells[k * 11 + k] = 0;
  assert.equal(winnerOf(cells, 11), null);
});

test('dải chéo (r+1, c−1) thì nối thật: ghế 0 thắng từ (0,10) xuống (10,0)', () => {
  const cells = new Array<number>(121).fill(-1);
  for (let k = 0; k < 11; k++) cells[k * 11 + (10 - k)] = 0;
  const w = winnerOf(cells, 11);
  assert.equal(w?.winner, 0);
  assert.equal(w?.path.length, 11);
});

test('ghế 1 nối trái–phải bằng một hàng ngang', () => {
  const cells = new Array<number>(121).fill(-1);
  for (let c = 0; c < 11; c++) cells[5 * 11 + c] = 1;
  const w = winnerOf(cells, 11);
  assert.equal(w?.winner, 1);
  assert.equal(w?.path.length, 11);
});

test('thắng sớm nhất ở nước 21, khi ghế 0 lấp kín một cột', () => {
  const moves: { at: number }[] = [];
  for (let r = 0; r < 11; r++) {
    moves.push({ at: r * 11 + 0 }); // ghế 0: cột 0
    if (r < 10) moves.push({ at: r * 11 + 10 }); // ghế 1: cột 10, không cản
  }
  const s = play(moves);
  assert.equal(s.ply, 21);
  assert.equal(s.winner, 0);
  assert.equal(hexEngine.outcome(s)?.winner, 0);
  assert.equal(s.winPath?.length, 11);
  assert.equal(hexEngine.turn(s).kind, 'over');
});

test('luật đổi: đổi màu quân chứ không đổi ghế, chỉ một lần, chỉ ghế 1 ngay sau nước đầu', () => {
  const s1 = play([{ at: 60 }]); // ghế 0 mở ở giữa bàn
  assert.equal(canSwap(s1), true);
  assert.ok(hexEngine.legal(s1, 1).some((a) => a.swap === true));

  const s2 = hexEngine.reduce(s1, 1, { swap: true }, makeRng('t', 0));
  assert.equal(s2.cells[60], 1, 'quân đổi thành màu ghế 1');
  assert.equal(s2.toMove, 0, 'ghế 0 đi tiếp sau khi bị đổi');
  assert.equal(s2.ply, 2);
  assert.equal(s2.swapUsed, true);
  assert.equal(canSwap(s2), false);
  assert.ok(!hexEngine.legal(s2, 0).some((a) => a.swap === true));

  // Không đổi mà đặt quân thì cơ hội đổi mất luôn.
  const s3 = hexEngine.reduce(s1, 1, { at: 0 }, makeRng('t', 0));
  assert.equal(canSwap(s3), false);
  assert.throws(() => hexEngine.reduce(s3, 0, { swap: true }, makeRng('t', 0)), /ILLEGAL_MOVE/);
  // Ghế 0 không bao giờ được đổi, và chưa có nước đầu thì chưa có gì để đổi.
  assert.throws(() => hexEngine.reduce(s1, 0, { swap: true }, makeRng('t', 0)), /ILLEGAL_MOVE/);
  const s0 = hexEngine.init(SEATS, {}, makeRng('t', 0));
  assert.throws(() => hexEngine.reduce(s0, 0, { swap: true }, makeRng('t', 0)), /ILLEGAL_MOVE/);

  // Sự kiện trong view phải nói là đổi, không phải đặt.
  const v = hexEngine.view(s2, 1);
  assert.ok(v.events.some((e) => e.t === 'swap' && e.at === 60));
});

test('bàn 3×3 giải vét cạn: bên đi trước thắng, cả khi ghế 1 có luật đổi', () => {
  // Bộ giải đi qua chính engine (legal/reduce), có nhớ đệm. Giá trị đã
  // biết của Hex 3×3 là thắng cho người đi trước; luật đổi không lật được
  // nó ở cỡ bàn này.
  function solve(s: HexState, allowSwap: boolean, memo: Map<string, Seat>): Seat {
    if (s.winner !== null) return s.winner;
    const key = s.cells.join('') + '|' + s.toMove + '|' + (allowSwap ? 1 : 0);
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const seat = s.toMove;
    let result = (1 - seat) as Seat;
    for (const a of hexEngine.legal(s, seat)) {
      if (!allowSwap && a.swap === true) continue;
      const next = hexEngine.reduce(s, seat, a, makeRng('t', s.rngCursor));
      if (solve(next, allowSwap, memo) === seat) {
        result = seat;
        break;
      }
    }
    memo.set(key, result);
    return result;
  }
  for (const allowSwap of [false, true]) {
    const s = hexEngine.init(SEATS, { size: 3 }, makeRng('t', 0));
    assert.equal(solve(s, allowSwap, new Map()), 0, `3×3 (đổi=${allowSwap}) phải là thắng cho ghế 0`);
  }
});

test('bàn 4×4 giải vét cạn (không luật đổi): bên đi trước thắng', () => {
  // Chạy trên mảng ô thô với kiểm thắng tăng dần từ quân vừa đặt — đi qua
  // engine ở 4×4 là 3,5 triệu nút nhân kiểm thắng toàn bàn, không vừa một
  // bài test. Hàm `winnerOf` của engine vẫn chốt các thế đầy.
  const size = 4;
  const N = size * size;
  const memo = new Map<string, Seat>();
  const connects = (cells: number[], at: number, seat: Seat): boolean => {
    const seen = new Set([at]);
    const queue = [at];
    let start = seat === 0 ? Math.floor(at / size) === 0 : at % size === 0;
    let end = seat === 0 ? Math.floor(at / size) === size - 1 : at % size === size - 1;
    for (let h = 0; h < queue.length && !(start && end); h++) {
      for (const j of neighborsOf(queue[h]!, size)) {
        if (cells[j] === seat && !seen.has(j)) {
          seen.add(j);
          queue.push(j);
          if (seat === 0 ? Math.floor(j / size) === 0 : j % size === 0) start = true;
          if (seat === 0 ? Math.floor(j / size) === size - 1 : j % size === size - 1) end = true;
        }
      }
    }
    return start && end;
  };
  // Ô giữa trước: tìm thấy nước thắng sớm thì cây cắt sớm.
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => {
    const da = Math.abs(Math.floor(a / size) - 1.5) + Math.abs((a % size) - 1.5);
    const db = Math.abs(Math.floor(b / size) - 1.5) + Math.abs((b % size) - 1.5);
    return da - db;
  });
  function winFrom(cells: number[], toMove: Seat, stones: number): Seat {
    const key = cells.join('') + '|' + toMove;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let result = (1 - toMove) as Seat;
    for (const i of order) {
      if (cells[i] !== -1) continue;
      cells[i] = toMove;
      const res = connects(cells, i, toMove)
        ? toMove
        : stones + 1 === N
          ? winnerOf(cells, size)!.winner
          : winFrom(cells, (1 - toMove) as Seat, stones + 1);
      cells[i] = -1;
      if (res === toMove) {
        result = toMove;
        break;
      }
    }
    memo.set(key, result);
    return result;
  }
  assert.equal(winFrom(new Array<number>(N).fill(-1), 0, 0), 0);
});

test('bot: khoảng cách nối của bàn trống là 11 cho cả hai bên', () => {
  const s = hexEngine.init(SEATS, {}, makeRng('t', 0));
  assert.equal(pathCost(s.cells, 11, 0), 11);
  assert.equal(pathCost(s.cells, 11, 1), 11);
});

test('bot mức Thường thấy nước thắng ngay và chặn nước thắng của địch', () => {
  // Ghế 0 đã lấp cột 5 từ hàng 0 tới hàng 9: đặt xuống hàng 10 là thắng.
  let s = hexEngine.init(SEATS, {}, makeRng('t', 0));
  for (let r = 0; r < 10; r++) {
    s = hexEngine.reduce(s, 0, { at: r * 11 + 5 }, makeRng('t', 0));
    s = hexEngine.reduce(s, 1, { at: r * 11 + 9 }, makeRng('t', 0));
  }
  const win = hexBot.pick(s, 0, 2, makeRng('bot', 0), 50);
  const after = hexEngine.reduce(s, 0, win, makeRng('t', 0));
  assert.equal(after.winner, 0, 'mức Thường phải lấy nước thắng ngay trước mắt');

  // Ghế 1 sắp nối xong hàng 5, còn thiếu đúng ô (5,10): ô hoàn tất còn
  // lại, (4,10), đã bị ghế 0 ngồi sẵn nên mối đe doạ là duy nhất và nước
  // chặn là bắt buộc.
  let s2 = hexEngine.init(SEATS, {}, makeRng('t', 0));
  const junk = [0, 1, 2, 3, 4, 5, 6, 7, 8, 4 * 11 + 10];
  for (let c = 0; c < 10; c++) {
    s2 = hexEngine.reduce(s2, 0, { at: junk[c]! }, makeRng('t', 0));
    s2 = hexEngine.reduce(s2, 1, { at: 5 * 11 + c }, makeRng('t', 0));
  }
  assert.equal(pathCost(s2.cells, 11, 1), 1);
  const block = hexBot.pick(s2, 0, 2, makeRng('bot', 0), 50);
  assert.deepEqual(block, { at: 5 * 11 + 10 });
  const blocked = hexEngine.reduce(s2, 0, block, makeRng('t', 0));
  assert.ok(pathCost(blocked.cells, 11, 1) >= 2, 'chặn xong đường của địch phải dài ra');
});

test('bot mức Khó đổi khi quân mở nằm giữa bàn, và trả nước hợp lệ', () => {
  const s1 = play([{ at: 60 }]); // ô chính giữa (5,5)
  assert.deepEqual(hexBot.pick(s1, 1, 3, makeRng('bot', 0), 100), { swap: true });
  const weak = play([{ at: 10 }]); // góc (0,10): quân mở yếu, không đổi
  const a = hexBot.pick(weak, 1, 3, makeRng('bot', 0), 100);
  assert.ok(a.swap !== true && Number.isInteger(a.at));
});

test('bot trả nước hợp lệ ở mọi mức trên thế giữa ván', () => {
  let s = hexEngine.init(SEATS, {}, makeRng('t', 0));
  const rng = makeRng('bot', 0);
  for (let i = 0; i < 14; i++) {
    const t = hexEngine.turn(s);
    if (t.kind !== 'seat') break;
    for (const level of [1, 2, 3] as const) {
      const a = hexBot.pick(s, t.seat, level, rng, 120);
      assert.ok(
        hexEngine.legal(s, t.seat).some((m) => m.at === a.at && m.swap === a.swap),
        `mức ${level} trả nước ngoài legal()`,
      );
    }
    s = hexEngine.reduce(s, t.seat, hexBot.pick(s, t.seat, 1, rng, 50), makeRng('t', s.rngCursor));
  }
});

test('bộ kiểm hợp đồng — chín ràng buộc kiến trúc', () => {
  runEngineConformance(hexEngine, {
    seats: SEATS,
    config: {},
    maxPlies: 200,
    decoys: () => [{ swap: true }, { at: -1 }, { at: 121 }, { at: 0, swap: true }],
  });
});
