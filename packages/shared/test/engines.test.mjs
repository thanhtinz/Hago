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

