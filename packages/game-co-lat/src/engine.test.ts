import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, type Seat } from '@co/core';
import { runEngineConformance } from '@co/core/testkit';
import { latBot } from './bot.js';
import { latEngine, movesFor, sideToMove, type LatAction, type LatState } from './engine.js';

const SEATS = [0, 1];

/** Dựng thế cờ từ tranh ASCII: `x` ghế 0 (đen), `o` ghế 1 (trắng), `.` trống. */
function board(rows: string[], toMove: Seat = 0): LatState {
  const s = latEngine.init(SEATS, {}, makeRng('t', 0));
  s.cells = rows.flatMap((row) => [...row].map((ch) => (ch === 'x' ? 0 : ch === 'o' ? 1 : -1)));
  s.filled = s.cells.filter((v) => v !== -1).length;
  s.toMove = toMove;
  s.last = null;
  s.flipped = [];
  return s;
}

function perft(s: LatState, depth: number): number {
  if (depth === 0) return 1;
  const t = latEngine.turn(s);
  if (t.kind === 'over') return 1;
  if (t.kind !== 'seat') throw new Error('turn lạ');
  const moves = latEngine.legal(s, t.seat);
  if (!moves.length) {
    // Bỏ lượt: không tốn nước đặt, nhưng tốn một tầng của cây.
    return perft({ ...s, toMove: t.seat === 0 ? 1 : 0 }, depth - 1);
  }
  let total = 0;
  for (const m of moves) total += perft(latEngine.reduce(s, t.seat, m, makeRng('t', s.rngCursor)), depth - 1);
  return total;
}

test('thế xuất phát: bốn quân chéo nhau, đen có đúng 4 nước', () => {
  const s = latEngine.init(SEATS, {}, makeRng('t', 0));
  assert.equal(s.cells[3 * 8 + 3], 1);
  assert.equal(s.cells[3 * 8 + 4], 0);
  assert.equal(s.cells[4 * 8 + 3], 0);
  assert.equal(s.cells[4 * 8 + 4], 1);
  assert.deepEqual(
    latEngine.legal(s, 0).map((m) => `${m.r},${m.c}`).sort(),
    ['2,3', '3,2', '4,5', '5,4'],
  );
  assert.deepEqual(latEngine.legal(s, 1), [], 'trắng chưa tới lượt');
});

test('perft khớp bảng đã công bố trong docs/rules/co-lat.md', () => {
  const s = latEngine.init(SEATS, {}, makeRng('t', 0));
  const expected = [4, 12, 56, 244, 1396, 8200, 55092];
  for (let d = 1; d <= expected.length; d++) {
    assert.equal(perft(s, d), expected[d - 1], `perft(${d})`);
  }
});

test('lật đủ 8 hướng trong một nước, không lật dây chuyền', () => {
  // Quân x ở giữa bị vây bởi o theo nhiều hướng; đặt x ở (0,0)... dựng thế:
  // hàng 0: . o x — đặt x vào (0,0) không kẹp gì theo hàng vì (0,1)=o,(0,2)=x -> lật (0,1).
  // Thêm cột: (1,0)=o,(2,0)=x -> lật (1,0). Chéo: (1,1)=o,(2,2)=x -> lật (1,1).
  const s = board([
    '.ox.....',
    'oo......',
    'x.x.....',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]);
  const next = latEngine.reduce(s, 0, { r: 0, c: 0 }, makeRng('t', 0));
  assert.deepEqual(next.flipped.sort((a, b) => a - b), [1, 8, 9], 'lật ngang + dọc + chéo trong cùng một nước');
  assert.equal(next.cells[1], 0);
  assert.equal(next.cells[8], 0);
  assert.equal(next.cells[9], 0);
});

test('dãy bị ô trống chen vào thì không lật', () => {
  const s = board([
    '.o.x....',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]);
  assert.throws(() => latEngine.reduce(s, 0, { r: 0, c: 0 }, makeRng('t', 0)), /ILLEGAL_MOVE/);
});

test('không còn nước thì bắt buộc bỏ lượt, turn() trả ghế còn nước', () => {
  // Trắng bị kẹp sạch nước đi ở thế này, đen còn nước (7,7)-kẹp hàng cuối.
  const s = board(
    [
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxo.',
    ],
    1,
  );
  assert.equal(movesFor(s.cells, 1).length, 0);
  assert.equal(sideToMove(s), 0, 'trắng mất lượt, lượt về đen');
  const t = latEngine.turn(s);
  assert.deepEqual(t, { kind: 'seat', seat: 0 });
  assert.deepEqual(latEngine.legal(s, 1), []);
  assert.ok(latEngine.legal(s, 0).length > 0);
});

test('kết thúc khi cả hai bên hết nước dù bàn chưa đầy, reason ghi tỉ số', () => {
  const s = board([
    'xxxxxxxx',
    'xxxxxxxx',
    'xxxxxxxx',
    'xxxxxxxx',
    'xxxxxxxx',
    'xxxxxxxx',
    'xxxxxxxx',
    'xxxxxxxx',
  ]);
  // Bàn đầy toàn đen — sửa vài ô thành trắng cho có tỉ số.
  s.cells[0] = 1;
  s.cells[1] = 1;
  const out = latEngine.outcome(s);
  assert.equal(out?.winner, 0);
  assert.equal(out?.reason, '62–2');
});

test('bot trả nước hợp lệ ở mọi mức, cho cả hai ghế', () => {
  // Kiểm mọi mức ở vài thế cờ thật (đầu ván + giữa ván do mức Vừa tự đánh
  // ra), chứ không gọi mức Khó ở mọi nước — bot khó tìm sâu, gọi mấy chục
  // lần trong một bài test là biến bài test thành bài đo hiệu năng.
  let s = latEngine.init(SEATS, {}, makeRng('t', 0));
  const rng = makeRng('bot', 0);
  const positions: LatState[] = [s];
  for (let i = 0; i < 14 && latEngine.turn(s).kind === 'seat'; i++) {
    const t = latEngine.turn(s);
    if (t.kind !== 'seat') break;
    const a = latBot.pick(s, t.seat, 2, rng, 50);
    s = latEngine.reduce(s, t.seat, a, makeRng('t', s.rngCursor));
    if (i === 6 || i === 13) positions.push(s);
  }
  for (const pos of positions) {
    const t = latEngine.turn(pos);
    if (t.kind !== 'seat') continue;
    for (const level of [1, 2, 3] as const) {
      const a: LatAction = latBot.pick(pos, t.seat, level, rng, 50);
      assert.ok(
        latEngine.legal(pos, t.seat).some((m) => m.r === a.r && m.c === a.c),
        `mức ${level} trả nước ngoài legal()`,
      );
    }
  }
});

test('bộ kiểm hợp đồng — chín ràng buộc kiến trúc', () => {
  runEngineConformance(latEngine, {
    seats: SEATS,
    config: {},
    maxPlies: 70,
    decoys: (s) => {
      const moves = latEngine.legal(s, sideToMove(s) ?? 0);
      void moves;
      return [
        { r: -1, c: 0 },
        { r: 0, c: 0 },
        { r: 8, c: 8 },
      ];
    },
  });
});
