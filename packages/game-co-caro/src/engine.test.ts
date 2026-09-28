import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, withStandardMeta } from '@co/core';
import { runEngineConformance } from '@co/core/testkit';
import { caroBot } from './bot.js';
import { caroEngine, neighbourhood, type CaroAction, type CaroState } from './engine.js';

const SEATS = [0, 1];

/** Dựng thế cờ từ tranh ASCII: `x` ghế 0, `o` ghế 1, `.` trống. */
function board(rows: string[], cfg: Partial<CaroState['cfg']> = {}): CaroState {
  const size = rows[0]!.length;
  const s = caroEngine.init(SEATS, { size, ...cfg }, makeRng('t', 0));
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === 'x') s.cells[r * size + c] = 0;
      if (ch === 'o') s.cells[r * size + c] = 1;
    });
  });
  s.filled = s.cells.filter((v) => v !== -1).length;
  return s;
}

/** Ô cuối cùng của chuỗi `x` trên hàng `r` — nơi ta coi như vừa đặt quân. */
function lastX(s: CaroState, r: number): { r: number; c: number } {
  for (let c = s.size - 1; c >= 0; c--) if (s.cells[r * s.size + c] === 0) return { r, c };
  throw new Error('không tìm thấy quân x');
}

test('luật chặn hai đầu — bảng tình huống trong docs/rules/co-caro.md', () => {
  const cases: [string, string, boolean][] = [
    ['hở hai đầu', '.xxxxx.', true],
    ['hở đầu phải', 'oxxxxx.', true],
    ['hở đầu trái', '.xxxxxo', true],
    ['chặn hai đầu bằng quân địch', 'oxxxxxo', false],
    ['mép bàn tính là chặn', 'xxxxxo.', false],
    ['mép bàn nhưng đầu kia hở', 'xxxxx..', true],
    ['sáu quân luôn thắng dù bị bịt', 'oxxxxxxo', true],
  ];
  for (const [name, row, expected] of cases) {
    const s = board([row.padEnd(9, '.')]);
    // Coi như quân x cuối cùng vừa được đặt xuống.
    const at = lastX(s, 0);
    const line = caroEngine.legal(s, 0) && winLineAtPublic(s, at.r, at.c);
    assert.equal(!!line, expected, `${name}: "${row}"`);
  }
});

function winLineAtPublic(s: CaroState, r: number, c: number) {
  // Gọi qua reduce cho giống đường chạy thật thay vì gọi hàm nội bộ: đây là
  // cách duy nhất chắc chắn rằng luật áp dụng đúng chỗ engine thực sự dùng.
  const cells = s.cells.slice();
  cells[r * s.size + c] = -1;
  const before: CaroState = { ...s, cells, filled: s.filled - 1, toMove: 0 };
  const after = caroEngine.reduce(before, 0, { r, c }, makeRng('t', before.rngCursor));
  return after.winLine;
}

test('phải quét đủ bốn hướng, không thoát sớm ở hướng đầu', () => {
  // Ngang bị chặn hai đầu (không thắng) nhưng chéo hở một đầu (thắng).
  // Ô (4,4) là giao của cả hai chuỗi.
  const s = board([
    '.........',
    '....x....',
    '....x....',
    '....x....',
    'oxxx.xxxo',
    '....x....',
    '....x....',
    '....x....',
    '.........',
  ]);
  const line = winLineAtPublic({ ...s, cells: s.cells.slice() }, 4, 4);
  assert.ok(line, 'chuỗi dọc hở hai đầu phải thắng dù chuỗi ngang bị bịt');
});

test('kín bàn thì hoà', () => {
  // Bàn 3×3 không bao giờ có chuỗi 5, nên lấp đầy là hoà.
  let s = caroEngine.init(SEATS, { size: 3 }, makeRng('t', 0));
  let turn = 0;
  for (let i = 0; i < 9; i++) {
    const seat = turn % 2;
    s = caroEngine.reduce(s, seat, { r: Math.floor(i / 3), c: i % 3 }, makeRng('t', s.rngCursor));
    turn++;
  }
  assert.equal(caroEngine.turn(s).kind, 'over');
  const out = caroEngine.outcome(s);
  assert.equal(out?.winner, null);
  assert.equal(out?.reason, 'kín bàn');
});

test('không đặt đè lên ô đã có quân, không đi khi chưa tới lượt', () => {
  const s = caroEngine.init(SEATS, { size: 9 }, makeRng('t', 0));
  const s1 = caroEngine.reduce(s, 0, { r: 4, c: 4 }, makeRng('t', 0));
  assert.throws(() => caroEngine.reduce(s1, 1, { r: 4, c: 4 }, makeRng('t', 0)), /ILLEGAL_MOVE/);
  assert.throws(() => caroEngine.reduce(s1, 0, { r: 0, c: 0 }, makeRng('t', 0)), /ILLEGAL_MOVE/, 'chưa tới lượt');
  assert.throws(() => caroEngine.reduce(s1, 1, { r: -1, c: 0 }, makeRng('t', 0)), /ILLEGAL_MOVE/, 'ngoài bàn');
});

test('luật khai cuộc bắt đặt giữa bàn', () => {
  const s = caroEngine.init(SEATS, { size: 15, centerOpening: true }, makeRng('t', 0));
  const moves = caroEngine.legal(s, 0);
  assert.deepEqual(moves, [{ r: 7, c: 7 }]);
  assert.throws(() => caroEngine.reduce(s, 0, { r: 0, c: 0 }, makeRng('t', 0)), /ILLEGAL_MOVE/);
});

test('bộ kiểm hợp đồng — chín ràng buộc kiến trúc', () => {
  runEngineConformance(caroEngine, {
    seats: SEATS,
    config: { size: 9 },
    maxPlies: 40,
    // Ép bot-ngẫu-nhiên của testkit đi quanh quân đã có, nếu không ván 9×9
    // rải rác khắp bàn và không bao giờ kết thúc trong 40 nước.
    pickMove: (moves, s, _seat, pick) => {
      const near = neighbourhood(s as CaroState, 1);
      const pool = near.length ? near : moves;
      return pool[pick(pool.length)] as CaroAction;
    },
    decoys: (s) => [
      { r: -1, c: 0 },
      { r: 0, c: s.size },
      { r: 0, c: 0 },
    ],
  });
});

test('bộ kiểm hợp đồng vẫn xanh sau khi bọc meta-action', () => {
  const wrapped = withStandardMeta(caroEngine);
  runEngineConformance(wrapped, {
    seats: SEATS,
    config: { size: 9 },
    maxPlies: 30,
    pickMove: (moves, _s, _seat, pick) => {
      // Bỏ qua nước đầu hàng, không thì ván nào cũng kết thúc ở nước một.
      const games = moves.filter((m) => (m as { t: string }).t === 'game');
      const pool = games.length ? games : moves;
      return pool[pick(pool.length)]!;
    },
  });
});

test('đầu hàng thì bên kia thắng, và cầu hoà hai bên đồng ý thì hoà', () => {
  const wrapped = withStandardMeta(caroEngine);
  const s0 = wrapped.init(SEATS, { size: 9 }, makeRng('t', 0));

  const resigned = wrapped.reduce(s0, 0, { t: 'resign' }, makeRng('t', s0.rngCursor));
  assert.equal(wrapped.turn(resigned).kind, 'over');
  assert.equal(wrapped.outcome(resigned)?.winner, 1);

  const offered = wrapped.reduce(s0, 0, { t: 'offer-draw' }, makeRng('t', s0.rngCursor));
  assert.throws(
    () => wrapped.reduce(offered, 0, { t: 'accept-draw' }, makeRng('t', offered.rngCursor)),
    /NO_DRAW_OFFER/,
    'không tự chấp nhận lời cầu hoà của chính mình được',
  );
  const drawn = wrapped.reduce(offered, 1, { t: 'accept-draw' }, makeRng('t', offered.rngCursor));
  assert.equal(wrapped.outcome(drawn)?.winner, null);
});

test('engine không hề nhìn thấy meta-action', () => {
  // Chứng minh ràng buộc R4: lớp bọc nuốt trọn, engine caro chỉ thấy nước cờ.
  const wrapped = withStandardMeta(caroEngine);
  const s0 = wrapped.init(SEATS, { size: 9 }, makeRng('t', 0));
  const moves = wrapped.legal(s0, 0);
  assert.ok(moves.some((m) => (m as { t: string }).t === 'resign'));
  assert.equal(
    caroEngine.legal(s0.inner, 0).some((m) => 't' in (m as object)),
    false,
    'engine bên trong không được biết tới meta-action',
  );
});

test('bot chỉ trả nước hợp lệ, và biết chặn thế thắng của đối thủ', () => {
  for (const level of [1, 2, 3] as const) {
    let s = caroEngine.init(SEATS, { size: 11 }, makeRng('t', 0));
    const rng = makeRng(`bot-${level}`, 0);
    for (let i = 0; i < 24 && caroEngine.turn(s).kind === 'seat'; i++) {
      const seat = (caroEngine.turn(s) as { seat: number }).seat;
      const a = caroBot.pick(s, seat, level, rng, 50);
      assert.equal(caroEngine.isLegalFast!(s, seat, a), true, `mức ${level} trả nước phạm luật`);
      s = caroEngine.reduce(s, seat, a, makeRng('t', s.rngCursor));
    }
  }

  // Đối thủ có bốn quân hở một đầu: bot mức Khó bắt buộc phải bịt.
  const s = board(
    [
      '...........',
      '...........',
      '...........',
      '...........',
      '.oooo......',
      '...........',
      '...........',
      '...........',
      '...........',
      '...........',
      '...........',
    ],
  );
  s.toMove = 0;
  const a = caroBot.pick(s, 0, 3, makeRng('b', 0), 50);
  assert.ok(
    (a.r === 4 && a.c === 0) || (a.r === 4 && a.c === 5),
    `phải bịt một đầu của chuỗi bốn, nhưng bot đi (${a.r},${a.c})`,
  );
});
