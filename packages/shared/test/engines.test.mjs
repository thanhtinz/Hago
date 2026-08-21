/**
 * Test engine bằng node:test — chạy: npm test -w @hago/shared
 * Mục tiêu: mọi engine phải luôn kết thúc, không rò rỉ thông tin ẩn,
 * và phần thưởng phải tuân thủ luật chống farm.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINES,
  GAME_CATALOG,
  GAME_TYPES,
  Rng,
  computeRewards,
  levelFromXp,
  rankOf,
  xpForLevel,
} from '../dist/index.js';

const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `u${i}`, name: `P${i}`, seat: i }));

/** Đánh ngẫu nhiên hợp lệ cho tới khi ván kết thúc. */
function playOut(type, seed, maxSteps = 6000) {
  const engine = ENGINES[type];
  const rng = new Rng(seed);
  const n = Math.max(engine.minPlayers, type === 'werewolf' ? 6 : 2);
  let state = engine.init(players(n), {}, rng);
  let now = Date.now();
  for (let step = 0; step < maxSteps && !engine.finished(state); step++) {
    now += 400;
    if (engine.tick) {
      const r = engine.tick(state, now, rng);
      state = r.state;
      if (engine.finished(state)) break;
    }
    const deadline = engine.deadline(state);
    if (engine.timeout && (deadline == null || now > deadline)) {
      state = engine.timeout(state, rng).state;
    }
  }
  return { engine, state };
}

for (const type of GAME_TYPES) {
  test(`${type}: ván đấu luôn kết thúc và trả kết quả hợp lệ`, () => {
    for (const seed of ['a', 'b', 'c']) {
      const { engine, state } = playOut(type, `${type}-${seed}`);
      assert.equal(engine.finished(state), true, `${type} không kết thúc với seed ${seed}`);

      const rows = engine.results(state);
      assert.equal(rows.length, state.players.length);
      const places = rows.map((r) => r.place);
      assert.ok(Math.min(...places) === 1, 'phải có hạng 1');
      rows.forEach((r) => {
        assert.ok(['win', 'lose', 'draw'].includes(r.result));
        assert.equal(typeof r.score, 'number');
      });
      // Không thể vừa có người thắng vừa toàn bộ là hoà.
      const wins = rows.filter((r) => r.result === 'win').length;
      const draws = rows.filter((r) => r.result === 'draw').length;
      assert.ok(!(wins > 0 && draws > 0), 'không được lẫn win và draw');
    }
  });

  test(`${type}: view() không rò rỉ state gốc`, () => {
    const engine = ENGINES[type];
    const rng = new Rng(`view-${type}`);
    const n = Math.max(engine.minPlayers, 2);
    const state = engine.init(players(n), {}, rng);
    const view = engine.view(state, 'u0');
    assert.ok(view && typeof view === 'object');
    assert.notEqual(view, state, 'view phải là bản chiếu, không phải state gốc');
  });

  test(`${type}: catalog khai báo số người chơi khớp engine`, () => {
    const meta = GAME_CATALOG[type];
    assert.equal(meta.minPlayers, ENGINES[type].minPlayers);
    assert.equal(meta.maxPlayers, ENGINES[type].maxPlayers);
  });
}

test('battleship: không gửi vị trí tàu còn sống của đối thủ', () => {
  const engine = ENGINES.battleship;
  const rng = new Rng('hidden');
  let state = engine.init(players(2), {}, rng);
  state = engine.apply(state, 'u0', 'place', {}, rng).state;
  state = engine.apply(state, 'u1', 'place', {}, rng).state;

  const view = engine.view(state, 'u0');
  assert.equal(view.me.ships.length, 5, 'phải thấy hạm đội của mình');
  assert.equal(view.foe.ships.length, 0, 'không được thấy tàu đối thủ khi chưa chìm');
  assert.equal(view.foe.alive, 5, 'nhưng vẫn biết còn bao nhiêu tàu');
});

test('werewolf: chỉ sói biết đồng đội, dân làng không biết ai là sói', () => {
  const engine = ENGINES.werewolf;
  const state = engine.init(players(8), {}, new Rng('roles'));
  const wolfSeat = state.seats.findIndex((s) => s.role === 'werewolf');
  const villagerSeat = state.seats.findIndex((s) => s.role === 'villager');

  const wolfView = engine.view(state, `u${wolfSeat}`);
  const wolves = wolfView.seats.filter((s) => s.role === 'werewolf');
  assert.ok(wolves.length >= 1, 'sói phải thấy đồng đội sói');

  const villagerView = engine.view(state, `u${villagerSeat}`);
  const revealed = villagerView.seats.filter((s) => s.role !== null && s.seat !== villagerSeat);
  assert.equal(revealed.length, 0, 'dân làng không được thấy vai của ai khác');
});

test('caro: từ chối nước đi sai lượt và ô đã có quân', () => {
  const engine = ENGINES.caro;
  const rng = new Rng('caro-rules');
  const state = engine.init(players(2), {}, rng);

  assert.equal(engine.apply(state, 'u1', 'move', { x: 7, y: 7 }, rng).error, 'NOT_YOUR_TURN');
  const after = engine.apply(state, 'u0', 'move', { x: 7, y: 7 }, rng);
  assert.equal(after.ok, true);
  assert.equal(engine.apply(after.state, 'u1', 'move', { x: 7, y: 7 }, rng).error, 'CELL_TAKEN');
  assert.equal(engine.apply(after.state, 'u1', 'move', { x: 99, y: 0 }, rng).error, 'OUT_OF_BOARD');
});

test('caro: năm quân thẳng hàng thì thắng', () => {
  const engine = ENGINES.caro;
  const rng = new Rng('caro-win');
  let state = engine.init(players(2), {}, rng);
  for (let i = 0; i < 5; i++) {
    state = engine.apply(state, 'u0', 'move', { x: i, y: 5 }, rng).state;
    if (engine.finished(state)) break;
    state = engine.apply(state, 'u1', 'move', { x: i, y: 12 }, rng).state;
  }
  assert.equal(engine.finished(state), true);
  assert.deepEqual(state.winnerIds, ['u0']);
});

test('rng: cùng seed cho cùng chuỗi số', () => {
  const a = new Rng('same');
  const b = new Rng('same');
  const rollsA = Array.from({ length: 50 }, () => a.dice(6));
  const rollsB = Array.from({ length: 50 }, () => b.dice(6));
  assert.deepEqual(rollsA, rollsB);
  assert.ok(rollsA.every((r) => r >= 1 && r <= 6));
});

test('progression: rank và level tính đúng theo mốc', () => {
  assert.equal(rankOf(0).tier, 'Bronze');
  assert.equal(rankOf(1200).tier, 'Silver');
  assert.equal(rankOf(1999).tier, 'Gold');
  assert.equal(rankOf(5000).tier, 'Master');
  assert.equal(xpForLevel(1), 0);
  assert.equal(levelFromXp(0).level, 1);
  assert.ok(levelFromXp(xpForLevel(10)).level === 10);
});

test('progression: ranked cộng/trừ Elo đối xứng, normal không đổi rank', () => {
  const rows = [
    { userId: 'a', result: 'win', score: 10, place: 1 },
    { userId: 'b', result: 'lose', score: 4, place: 2 },
  ];
  const base = { ratings: { a: 1500, b: 1500 }, gameType: 'caro', durationMs: 120_000, firstWinAvailable: {}, dailyXp: {} };

  const ranked = computeRewards({ ...base, rows, mode: 'ranked' });
  assert.ok(ranked[0].ratingDelta > 0 && ranked[1].ratingDelta < 0);
  assert.equal(ranked[0].ratingDelta + ranked[1].ratingDelta, 0, 'Elo phải bảo toàn tổng');

  const normal = computeRewards({ ...base, rows, mode: 'normal' });
  assert.ok(normal.every((r) => r.ratingDelta === 0));
});

test('progression: trận ngắn bị giảm thưởng và daily cap chặn farm', () => {
  const rows = [
    { userId: 'a', result: 'win', score: 1, place: 1 },
    { userId: 'b', result: 'lose', score: 0, place: 2 },
  ];
  const base = { ratings: { a: 1000, b: 1000 }, mode: 'normal', gameType: 'caro', firstWinAvailable: {}, dailyXp: {} };

  const long = computeRewards({ ...base, rows, durationMs: 120_000 });
  const short = computeRewards({ ...base, rows, durationMs: 5_000 });
  assert.ok(short[0].xpGain < long[0].xpGain, 'trận ngắn phải ít XP hơn');

  const capped = computeRewards({ ...base, rows, durationMs: 120_000, dailyXp: { a: 2990, b: 0 }, dailyXpCap: 3000 });
  assert.ok(capped[0].xpGain <= 10, 'không được vượt trần XP ngày');
});

test('progression: first win of the day cộng thêm thưởng', () => {
  const rows = [
    { userId: 'a', result: 'win', score: 1, place: 1 },
    { userId: 'b', result: 'lose', score: 0, place: 2 },
  ];
  const base = { ratings: { a: 1000, b: 1000 }, mode: 'normal', gameType: 'caro', durationMs: 120_000, dailyXp: {} };
  const without = computeRewards({ ...base, rows, firstWinAvailable: {} });
  const withBonus = computeRewards({ ...base, rows, firstWinAvailable: { a: true } });
  assert.equal(withBonus[0].xpGain - without[0].xpGain, 100);
  assert.equal(withBonus[0].coinGain - without[0].coinGain, 100);
});


// ---------------------------------------------------------------- Cờ Vua

/** Đi một loạt nước theo ô, ví dụ ['e2e4', 'e7e5']. Trả state sau cùng. */
function playChess(moves, config = {}) {
  const engine = ENGINES.chess;
  const rng = new Rng('chess');
  let state = engine.init(players(2), config, rng);
  moves.forEach((m, i) => {
    const from = sq(m.slice(0, 2));
    const to = sq(m.slice(2, 4));
    const promo = m[4];
    const res = engine.apply(state, `u${i % 2}`, 'move', { from, to, promo }, rng);
    assert.ok(res.ok, `nước ${m} bị từ chối: ${res.error}`);
    state = res.state;
  });
  return state;
}

/** 'e4' -> chỉ số ô trên bàn 64 ô. */
function sq(name) {
  const col = 'abcdefgh'.indexOf(name[0]);
  const row = 8 - Number(name[1]);
  return row * 8 + col;
}

test('chess: thế khai cuộc có đúng 20 nước đi', () => {
  const engine = ENGINES.chess;
  const state = engine.init(players(2), {}, new Rng('c'));
  assert.equal(engine.view(state, 'u0').moves.length, 20);
});

test('chess: chiếu bí bốn nước (Scholar mate) kết thúc ván', () => {
  const state = playChess(['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7']);
  assert.equal(state.over, true);
  assert.equal(state.draw, false);
  assert.deepEqual(state.winnerIds, ['u0']);
  assert.equal(state.history[state.history.length - 1].san, 'Qxf7#');
});

test('chess: đang bị chiếu thì nước không gỡ chiếu bị từ chối', () => {
  const engine = ENGINES.chess;
  const rng = new Rng('pin');
  // 1.d4 e5 2.Nf3 Bb4+ — tượng đen ăn dọc b4-c3-d2-e1, vua trắng đang bị chiếu.
  const state = playChess(['d2d4', 'e7e5', 'g1f3', 'f8b4']);
  const bad = engine.apply(state, 'u0', 'move', { from: sq('f3'), to: sq('g5') }, rng);
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'ILLEGAL_MOVE');
  // Chặn bằng tốt c3 thì hợp lệ.
  const good = engine.apply(state, 'u0', 'move', { from: sq('c2'), to: sq('c3') }, rng);
  assert.equal(good.ok, true);
});

test('chess: nhập thành gần vua dời cả xe', () => {
  const state = playChess(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1']);
  assert.equal(state.board[sq('g1')], 'K');
  assert.equal(state.board[sq('f1')], 'R');
  assert.equal(state.board[sq('h1')], null);
  assert.equal(state.history[state.history.length - 1].san, 'O-O');
});

test('chess: bắt tốt qua đường ăn đúng con tốt bên cạnh', () => {
  const state = playChess(['e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6']);
  assert.equal(state.board[sq('d6')], 'P');
  assert.equal(state.board[sq('d5')], null, 'tốt đen phải bị nhấc khỏi bàn');
});

test('chess: hết giờ là xử thua bên đang đi', () => {
  const engine = ENGINES.chess;
  const state = engine.init(players(2), {}, new Rng('t'));
  const out = engine.timeout(state, new Rng('t')).state;
  assert.equal(out.over, true);
  assert.deepEqual(out.winnerIds, ['u1']);
});

// ---------------------------------------------------------------- Flappy

test('flappy: không vỗ cánh thì rơi và ván kết thúc', () => {
  const engine = ENGINES.flappy;
  const rng = new Rng('f');
  let state = engine.init(players(1), {}, rng);
  let now = state.startAt;
  for (let i = 0; i < 200 && !engine.finished(state); i++) {
    now += 200;
    state = engine.tick(state, now, rng).state;
  }
  assert.equal(engine.finished(state), true);
  assert.ok(state.birds.every((b) => !b.alive));
  // Chơi một mình thì không có kẻ thắng người thua, chỉ có điểm.
  assert.deepEqual(state.winnerIds, []);
});

test('flappy: vỗ cánh đẩy chim lên và chưa tới giờ thì không nhận', () => {
  const engine = ENGINES.flappy;
  const rng = new Rng('f2');
  const state = engine.init(players(1), {}, rng);
  const early = engine.apply(state, 'u0', 'flap', {}, rng);
  assert.equal(early.ok, false, 'đang đếm ngược thì chưa cho vỗ');

  const started = { ...state, startAt: Date.now() - 10, lastTick: Date.now() - 10 };
  const res = engine.apply(started, 'u0', 'flap', {}, rng);
  assert.ok(res.ok);
  assert.ok(res.state.birds[0].vy < started.birds[0].vy, 'vỗ cánh phải đẩy chim lên nhanh hơn');
});

test('flappy: kết quả là điểm chứ không phải thắng thua', () => {
  const engine = ENGINES.flappy;
  const rng = new Rng('f3');
  let state = engine.init(players(1), {}, rng);
  let now = state.startAt;
  while (!engine.finished(state)) {
    now += 200;
    state = engine.tick(state, now, rng).state;
  }
  const rows = engine.results(state);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].place, 1);
  assert.equal(rows[0].score, state.birds[0].score);
});

test('flappy: cùng seed thì cùng một hàng ống', () => {
  const engine = ENGINES.flappy;
  const a = engine.init(players(1), {}, new Rng('same'));
  const b = engine.init(players(1), {}, new Rng('same'));
  assert.deepEqual(
    a.pipes.slice(0, 5).map((p) => p.gapY),
    b.pipes.slice(0, 5).map((p) => p.gapY),
  );
});
