import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, type Seat } from '@co/core';
import { runEngineConformance } from '@co/core/testkit';
import { baQuanBot } from './bot.js';
import { baQuanEngine, type BaQuanState } from './engine.js';

const SEATS = [0, 1];

function play(moves: { f: number; t: number }[]): BaQuanState {
  let s = baQuanEngine.init(SEATS, {}, makeRng('t', 0));
  for (const [i, a] of moves.entries()) {
    s = baQuanEngine.reduce(s, (i % 2) as Seat, a, makeRng('t', s.rngCursor));
  }
  return s;
}

/** Sáu nước thả tạo thế không ai thắng: x vào 0,4,7 — o vào 2,3,8. */
const THA_KHONG_THANG = [
  { f: -1, t: 0 },
  { f: -1, t: 2 },
  { f: -1, t: 4 },
  { f: -1, t: 3 },
  { f: -1, t: 7 },
  { f: -1, t: 8 },
];

test('giai đoạn thả: đúng 9 nước đầu mỗi bên, đặt vào ô trống', () => {
  const s = baQuanEngine.init(SEATS, {}, makeRng('t', 0));
  assert.equal(baQuanEngine.legal(s, 0).length, 9);
  assert.ok(baQuanEngine.legal(s, 0).every((a) => a.f === -1));
  const s1 = baQuanEngine.reduce(s, 0, { f: -1, t: 4 }, makeRng('t', 0));
  assert.equal(baQuanEngine.legal(s1, 1).length, 8);
  assert.throws(() => baQuanEngine.reduce(s1, 1, { f: -1, t: 4 }, makeRng('t', 0)), /ILLEGAL_MOVE/, 'đặt đè');
});

test('số thế giai đoạn thả khớp chỉnh hợp 9!/(9-n)! trừ nhánh thắng sớm', () => {
  // Bảng trong docs/rules/co-ba-quan.md là số chưa trừ nhánh kết thúc sớm;
  // từ độ sâu 5 engine phải ra số nhỏ hơn, vì đã có nhánh xếp đủ hàng ba.
  function perft(s: BaQuanState, depth: number): number {
    if (depth === 0) return 1;
    const t = baQuanEngine.turn(s);
    if (t.kind !== 'seat') return 1;
    let total = 0;
    for (const m of baQuanEngine.legal(s, t.seat)) {
      total += perft(baQuanEngine.reduce(s, t.seat, m, makeRng('t', s.rngCursor)), depth - 1);
    }
    return total;
  }
  const s = baQuanEngine.init(SEATS, {}, makeRng('t', 0));
  assert.equal(perft(s, 1), 9);
  assert.equal(perft(s, 2), 72);
  assert.equal(perft(s, 3), 504);
  assert.equal(perft(s, 4), 3024);
  // Ở độ sâu 5 con số chưa tụt: một nhánh thắng ở đúng nước 5 vẫn là một lá.
  assert.equal(perft(s, 5), 15120);
  // Độ sâu 6 mới thấy nhánh thắng sớm bị cắt. Soi tay: có đúng 1 440 dãy
  // năm nước mà ghế 0 xếp đủ một hàng (8 hàng × 6 thứ tự quân mình × 30
  // thứ tự hai quân đối thủ), mỗi dãy mất 4 lá ở tầng 6 và chỉ còn 1 lá:
  // (15120 − 1440) × 4 + 1440 = 56 160.
  assert.equal(perft(s, 6), 56160);
});

test('thắng ngay trong giai đoạn thả khi xếp đủ hàng ba', () => {
  const s = play([
    { f: -1, t: 0 },
    { f: -1, t: 3 },
    { f: -1, t: 1 },
    { f: -1, t: 4 },
    { f: -1, t: 2 },
  ]);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.winLine, [0, 1, 2]);
  assert.equal(baQuanEngine.outcome(s)?.reason, 'ba quân thành hàng');
});

test('giai đoạn đi: chỉ dời sang điểm kề trống, chéo chỉ qua tâm', () => {
  const s = play(THA_KHONG_THANG);
  // Tới lượt ghế 0 (x ở 0,4,7; trống 1,5,6).
  const moves = baQuanEngine.legal(s, 0);
  assert.ok(moves.every((a) => a.f >= 0), 'hết giai đoạn thả thì không còn nước f=-1');
  assert.ok(moves.some((a) => a.f === 0 && a.t === 1));
  assert.ok(moves.some((a) => a.f === 7 && a.t === 6));
  assert.ok(!moves.some((a) => a.f === 0 && a.t === 5), 'góc 0 không kề cạnh 5');
  assert.ok(!moves.some((a) => a.f === 7 && a.t === 5), 'cạnh 7 không kề cạnh 5 dù cùng hàng dưới một phần');
  assert.throws(() => baQuanEngine.reduce(s, 0, { f: 0, t: 8 }, makeRng('t', 0)), /ILLEGAL_MOVE/, 'nhảy xa');
});

test('bí nước thì thua', () => {
  // Dựng thẳng state: x ở 0,1,3 — mọi điểm kề của x đều có quân hoặc không trống.
  // o ở 2,4,6; trống 5,7,8. Kề của 0: 1(x),3(x),4(o) — bí. Tương tự 1 và 3.
  const s = baQuanEngine.init(SEATS, {}, makeRng('t', 0));
  s.cells = [0, 0, 1, 0, 1, -1, 1, -1, -1];
  s.placed = [3, 3];
  s.toMove = 0;
  assert.equal(baQuanEngine.legal(s, 0).length, 0);
  assert.equal(baQuanEngine.turn(s).kind, 'over');
});

test('lặp thế ba lần thì hoà', () => {
  // Hai bên đi qua đi lại: x 0<->1, o 8<->5... cần thế lặp 3 lần cùng bên đi.
  // Từ thế thả xong ở trên, lặp chu trình 4 nước hai vòng.
  let s = play(THA_KHONG_THANG);
  // Chu trình phải né mọi hàng ba: x ở 0,4,7 nên 7<->6 (vào 1 là thắng vì
  // cột 1,4,7), o ở 2,3,8 nên 2<->1.
  const cycle: [Seat, { f: number; t: number }][] = [
    [0, { f: 7, t: 6 }],
    [1, { f: 2, t: 1 }],
    [0, { f: 6, t: 7 }],
    [1, { f: 1, t: 2 }],
  ];
  for (let round = 0; round < 2 && !s.drawn; round++) {
    for (const [seat, a] of cycle) {
      s = baQuanEngine.reduce(s, seat, a, makeRng('t', s.rngCursor));
      if (s.drawn) break;
    }
  }
  assert.ok(s.drawn, 'đi qua lại hai vòng là thế đầu lặp lần thứ ba');
  assert.equal(s.drawWhy, 'lap-the');
  assert.equal(baQuanEngine.outcome(s)?.winner, null);
});

test('bot mức cao nhất không thua khi đấu với bot thường cả hai ghế', () => {
  // Game đã giải được: đi đúng thì hoà. Bot "Không thua" ngồi ghế nào cũng
  // không được phép thua bot Thường.
  for (const strongSeat of [0, 1] as Seat[]) {
    let s = baQuanEngine.init(SEATS, {}, makeRng('t', 0));
    const rng = makeRng('bot', 0);
    for (let i = 0; i < 80; i++) {
      const t = baQuanEngine.turn(s);
      if (t.kind !== 'seat') break;
      const level = t.seat === strongSeat ? 3 : 2;
      const a = baQuanBot.pick(s, t.seat, level as 2 | 3, rng, 50);
      s = baQuanEngine.reduce(s, t.seat, a, makeRng('t', s.rngCursor));
    }
    const out = baQuanEngine.outcome(s);
    assert.ok(out, 'ván phải kết thúc');
    assert.notEqual(out.winner, strongSeat === 0 ? 1 : 0, `bot Không thua ngồi ghế ${strongSeat} mà thua`);
  }
});

test('bot trả nước hợp lệ ở mọi mức', () => {
  let s = baQuanEngine.init(SEATS, {}, makeRng('t', 0));
  const rng = makeRng('bot', 0);
  for (let i = 0; i < 12; i++) {
    const t = baQuanEngine.turn(s);
    if (t.kind !== 'seat') break;
    for (const level of [1, 2, 3] as const) {
      const a = baQuanBot.pick(s, t.seat, level, rng, 50);
      assert.ok(
        baQuanEngine.legal(s, t.seat).some((m) => m.f === a.f && m.t === a.t),
        `mức ${level} trả nước ngoài legal()`,
      );
    }
    s = baQuanEngine.reduce(s, t.seat, baQuanBot.pick(s, t.seat, 1, rng, 50), makeRng('t', s.rngCursor));
  }
});

test('bộ kiểm hợp đồng — chín ràng buộc kiến trúc', () => {
  runEngineConformance(baQuanEngine, {
    seats: SEATS,
    config: {},
    maxPlies: 40,
    decoys: () => [
      { f: -1, t: 99 },
      { f: 0, t: 0 },
      { f: 8, t: 8 },
    ],
  });
});
