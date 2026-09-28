import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, withStandardMeta } from '@co/core';
import { runEngineConformance } from '@co/core/testkit';
import { CELLS, NB, PAIRS, idx } from './board.js';
import { ganhBot } from './bot.js';
import { applyMove, clamps, countOf, ganhEngine, movesOn, type GanhState } from './engine.js';

const SEATS = [0, 1];
const fresh = (seed = 'g') => ganhEngine.init(SEATS, {}, makeRng(seed, 0));

test('đồ thị kề: bậc của từng điểm khớp bảng trong docs/rules/co-ganh.md', () => {
  const want = [
    [3, 3, 5, 3, 3],
    [3, 8, 4, 8, 3],
    [5, 4, 8, 4, 5],
    [3, 8, 4, 8, 3],
    [3, 3, 5, 3, 3],
  ];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      assert.equal(NB[idx(r, c)]!.length, want[r]![c], `bậc tại (${r},${c})`);
    }
  }
  const edges = NB.reduce((n, a) => n + a.length, 0) / 2;
  assert.equal(edges, 56, 'tổng 56 cạnh: 40 ngang dọc + 16 chéo');
});

test('bảng cặp gánh khớp docs, bốn góc không có cặp nào', () => {
  const want = [
    [0, 1, 1, 1, 0],
    [1, 4, 2, 4, 1],
    [1, 2, 4, 2, 1],
    [1, 4, 2, 4, 1],
    [0, 1, 1, 1, 0],
  ];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      assert.equal(PAIRS[idx(r, c)]!.length, want[r]![c], `số cặp tại (${r},${c})`);
    }
  }
  // Bộ ba (1,1) (2,0) (3,1) là hình chữ V, không phải đường thẳng.
  const atEdge = PAIRS[idx(2, 0)]!;
  assert.deepEqual(atEdge, [[idx(1, 0), idx(3, 0)]], '(2,0) chỉ có đúng cặp dọc');
});

test('thế xuất phát: viền kín, lòng bàn trống, mỗi bên 12 nước và không nước nào gánh', () => {
  const s = fresh();
  assert.equal(countOf(s.board, s.seats[0]!) + countOf(s.board, s.seats[1]!), 16);
  assert.equal(countOf(s.board, s.bottom), 8);
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) assert.equal(s.board[idx(r, c)], -1);

  const moves = ganhEngine.legal(s, s.toMove);
  assert.equal(moves.length, 12, 'bên đi trước có đúng 12 nước');
  const opp = s.seats[0] === s.toMove ? s.seats[1]! : s.seats[0]!;
  for (const m of moves) {
    assert.equal(applyMove(s.board, m, s.toMove, opp, s.cfg).flipped.length, 0, 'không nước đầu nào gánh được');
  }
});

/**
 * Perft là bài kiểm tra mạnh nhất cho một bộ luật cờ: nó đếm toàn bộ cây nước
 * đi, nên sai bất kỳ chỗ nào trong kề, gánh, vây hay luật mở đều làm lệch số.
 * Bảng đối chiếu nằm trong `docs/rules/co-ganh.md`.
 */
function perft(s: GanhState, depth: number): number {
  if (depth === 0) return 1;
  if (ganhEngine.outcome(s)) return 1; // nút kết thúc ván tính là một lá
  let n = 0;
  for (const m of ganhEngine.legal(s, s.toMove)) {
    n += perft(ganhEngine.reduce(s, s.toMove, m, makeRng('p', s.rngCursor)), depth - 1);
  }
  return n;
}

test('perft khớp bảng hồi quy trong docs', () => {
  // Tầng 6 (1.533.538) và 7 cũng đã đối chiếu tay và khớp, nhưng mất 6 giây
  // nên không để trong bộ chạy mỗi lần.
  const s = fresh();
  for (const [depth, nodes] of [
    [1, 12],
    [2, 129],
    [3, 1444],
    [4, 14099],
    [5, 146130],
  ] as const) {
    assert.equal(perft(s, depth), nodes, `perft(${depth})`);
  }
});

test('gánh: đi vào giữa hai quân địch thì lật cả hai, và chỉ bên vừa đi mới gánh', () => {
  const s = fresh();
  const board = new Array<number>(CELLS).fill(-1);
  // Hàng 2: địch ở (2,1) và (2,3), ta đi từ (1,2) xuống (2,2) — kẹp dọc hàng.
  board[idx(2, 1)] = 1;
  board[idx(2, 3)] = 1;
  board[idx(1, 2)] = 0;
  const r = applyMove(board, { f: idx(1, 2), t: idx(2, 2) }, 0, 1, s.cfg);
  assert.deepEqual([...r.flipped].sort((a, b) => a - b), [idx(2, 1), idx(2, 3)]);
  assert.equal(r.board[idx(2, 1)], 0);

  // Ngược lại: quân ta đứng sẵn giữa hai quân địch mà địch đi nơi khác thì
  // không có gì xảy ra.
  const b2 = new Array<number>(CELLS).fill(-1);
  b2[idx(2, 1)] = 1;
  b2[idx(2, 2)] = 0;
  b2[idx(2, 3)] = 1;
  b2[idx(0, 0)] = 1;
  const r2 = applyMove(b2, { f: idx(0, 0), t: idx(0, 1) }, 1, 0, s.cfg);
  assert.equal(r2.board[idx(2, 2)], 0, 'quân ta vẫn là của ta');
});

test('vây xét theo cụm, không xét từng quân', () => {
  const s = fresh();
  // Một quân địch ở góc (0,0), ta bịt hết khí của nó: (0,1) và (1,0) và (1,1)
  // không kề vì (0,0) chẵn nên có chéo — kề của (0,0) là (0,1),(1,0),(1,1).
  const board = new Array<number>(CELLS).fill(-1);
  board[idx(0, 0)] = 1;
  board[idx(0, 1)] = 0;
  board[idx(1, 1)] = 0;
  board[idx(2, 0)] = 0;
  const r = applyMove(board, { f: idx(2, 0), t: idx(1, 0) }, 0, 1, s.cfg);
  assert.equal(r.board[idx(0, 0)], 0, 'cụm một quân hết khí thì đổi màu');

  // Quân nằm sâu trong đội hình của chính mình thì không bị gì, dù nó không
  // có ô trống nào kề. Cài vây theo từng quân là hỏng đúng ở đây.
  const b2 = new Array<number>(CELLS).fill(-1);
  for (const n of NB[idx(2, 2)]!) b2[n] = 1;
  b2[idx(2, 2)] = 1;
  b2[idx(4, 4)] = 0;
  const r2 = applyMove(b2, { f: idx(4, 4), t: idx(4, 3) }, 0, 1, s.cfg);
  assert.equal(r2.board[idx(2, 2)], 1, 'quân giữa đội hình mình vẫn còn khí qua cụm');
});

test('luật mở: chỉ ép khi thế kẹp vừa mới xuất hiện', () => {
  const s = fresh();
  const board = new Array<number>(CELLS).fill(-1);
  // Ta kẹp sẵn ô (2,2) bằng (2,1) và (2,3); địch đứng cạnh để với tới.
  board[idx(2, 1)] = 0;
  board[idx(2, 3)] = 0;
  board[idx(0, 2)] = 1;
  board[idx(4, 0)] = 0;
  assert.ok(clamps(board, idx(2, 2), 0), 'thế kẹp có sẵn từ trước');
  // Đi một nước ở góc xa, không tạo ra thế kẹp mới nào.
  const r = applyMove(board, { f: idx(4, 0), t: idx(4, 1) }, 0, 1, s.cfg);
  assert.equal(r.forcedTo, null, 'thế kẹp cũ không ép được nữa');

  // Còn khi nước đi vừa tạo ra thế kẹp thì mới ép.
  const b2 = new Array<number>(CELLS).fill(-1);
  b2[idx(2, 1)] = 0;
  b2[idx(1, 3)] = 0;
  b2[idx(3, 2)] = 1;
  const r2 = applyMove(b2, { f: idx(1, 3), t: idx(2, 3) }, 0, 1, s.cfg);
  assert.ok(r2.forcedTo?.includes(idx(2, 2)), 'thế kẹp vừa tạo thì ép đối thủ vào đó');
});

test('không tồn tại thế bí: chơi ngẫu nhiên 40 ván, bên còn quân luôn còn nước', () => {
  for (let g = 0; g < 40; g++) {
    let s = fresh(`bi-${g}`);
    const rng = makeRng(`r-${g}`, 0);
    for (let k = 0; k < 400 && !ganhEngine.outcome(s); k++) {
      const ms = ganhEngine.legal(s, s.toMove);
      assert.ok(ms.length > 0, 'còn quân thì phải còn nước đi');
      s = ganhEngine.reduce(s, s.toMove, ms[rng.int(ms.length)]!, makeRng('x', s.rngCursor));
      assert.equal(countOf(s.board, s.seats[0]!) + countOf(s.board, s.seats[1]!), 16, 'luôn đủ 16 quân');
    }
  }
});

test('bot: mức Khó ăn được quân khi có nước gánh rõ ràng', () => {
  const s = fresh();
  const board = new Array<number>(CELLS).fill(-1);
  board[idx(2, 1)] = 1;
  board[idx(2, 3)] = 1;
  board[idx(1, 2)] = 0;
  board[idx(4, 0)] = 0;
  board[idx(0, 0)] = 1;
  const st: GanhState = { ...s, board, toMove: 0, forcedTo: null };
  const mv = ganhBot.pick(st, 0, 3, makeRng('b', 0), 200);
  assert.equal(mv.t, idx(2, 2), 'bot phải đi vào giữa để gánh hai quân');
});

/**
 * Nút gợi ý hỏi chính con bot xem nó sẽ đi nước nào **ở chỗ người chơi**.
 * Nghĩa là bot bị gọi với ghế mà nó không thường cầm, và nó vẫn phải trả về
 * nước hợp lệ — nếu không thì bấm gợi ý xong người chơi đi theo và bị engine
 * từ chối.
 */
test('bot trả nước hợp lệ cho cả hai ghế, ở mọi mức', () => {
  const rng = makeRng('both', 0);
  let s = fresh('both');
  for (let k = 0; k < 40; k++) {
    if (ganhEngine.outcome(s)) s = fresh(`both-${k}`);
    const legal = new Set(ganhEngine.legal(s, s.toMove).map((m) => `${m.f}>${m.t}`));
    for (const lv of [1, 2, 3] as const) {
      const mv = ganhBot.pick(s, s.toMove, lv, makeRng(`p${k}${lv}`, 0), 60);
      assert.ok(legal.has(`${mv.f}>${mv.t}`), `mức ${lv} trả nước ngoài luật`);
    }
    const ms = [...legal].map((x) => x.split('>').map(Number));
    const [f, t] = ms[rng.int(ms.length)]!;
    s = ganhEngine.reduce(s, s.toMove, { f: f!, t: t! }, makeRng('z', s.rngCursor));
  }
});

test('hợp đồng engine', () => {
  runEngineConformance(ganhEngine, { seats: SEATS });
  runEngineConformance(withStandardMeta(ganhEngine), { seats: SEATS });
});

test('isLegalFast khớp legal trên 300 thế cờ ngẫu nhiên', () => {
  const rng = makeRng('fuzz', 0);
  let s = fresh('fuzz');
  for (let k = 0; k < 300; k++) {
    if (ganhEngine.outcome(s)) s = fresh(`fuzz-${k}`);
    const legal = new Set(ganhEngine.legal(s, s.toMove).map((m) => `${m.f}>${m.t}`));
    for (let f = 0; f < CELLS; f++) {
      for (const t of NB[f]!) {
        const fast = ganhEngine.isLegalFast!(s, s.toMove, { f, t });
        assert.equal(fast, legal.has(`${f}>${t}`), `lệch tại ${f}>${t}`);
      }
    }
    const ms = movesOn(s.board, s.toMove, s.forcedTo);
    s = ganhEngine.reduce(s, s.toMove, ms[rng.int(ms.length)]!, makeRng('y', s.rngCursor));
  }
});
