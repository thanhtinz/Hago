import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, withStandardMeta } from '@co/core';
import { runEngineConformance } from '@co/core/testkit';
import { quanBot } from './bot.js';
import { OWN_CELLS, projectedScores, quanEngine, sideOf, type QuanState } from './engine.js';

const SEATS = [0, 1];
const fresh = (seed = 'q', cfg: object = {}) => quanEngine.init(SEATS, cfg, makeRng(seed, 0));

/**
 * Dựng thế cờ tay, **luôn để bên dưới (side 0) đi**.
 *
 * Mọi thế viết tay đều để sẵn một quân ở ô 11 cho hàng trên. Không có nó
 * thì sau nước đi hàng trên sạch dân, luật rải lại tự động nổ ra và **vay
 * ngay vào kho vừa ăn được** — mọi con số trong bài test lệch hết mà nhìn
 * thì tưởng luật ăn quân sai.
 *
 * Ép side 0 chứ không dùng bên mà rng bốc được: thế cờ viết tay phải đọc
 * được bằng mắt, mà số ô của hai bên khác nhau (1..5 và 7..11) nên cùng một
 * bài test chạy cho hai bên sẽ có hai nghĩa khác nhau.
 */
function put(s: QuanState, dan: Record<number, number>, quan: [0 | 1, 0 | 1] = [1, 1]): QuanState {
  const cells = s.cells.map((c, i) => ({ ...c, dan: dan[i] ?? 0, quan: (i === 0 ? quan[0] : i === 6 ? quan[1] : 0) as 0 | 1 }));
  return { ...s, cells, toMove: s.seats[0]!, ended: null };
}

/** Ghế cầm hàng dưới. */
const P0 = 0;

/** Tổng dân ở mọi nơi: trên bàn cộng trong kho. Bất biến của cả ván. */
const totalDan = (s: QuanState) =>
  s.cells.reduce((n, c) => n + c.dan, 0) + s.capturedDan[0] + s.capturedDan[1];

test('thế mở ván: 12 ô vòng tròn, 5 dân mỗi ô dân, 1 quan mỗi ô quan', () => {
  const s = fresh();
  assert.equal(s.cells.length, 12);
  assert.equal(s.cells[0]!.kind, 'quan');
  assert.equal(s.cells[6]!.kind, 'quan');
  assert.equal(s.cells[0]!.quan, 1);
  assert.equal(totalDan(s), 50, 'tổng 50 dân');
  assert.equal(quanEngine.legal(s, s.toMove).length, 10, '5 ô × 2 chiều');
});

test('rải có bỏ quân vào ô quan và vào ô của đối phương', () => {
  const s = put(fresh(), { 5: 3, 11: 1 });
  const after = quanEngine.reduce(s, P0, { cell: 5, dir: 1 }, makeRng('t', 0));
  const dropped = after.trail.filter((e) => e.t === 'drop').map((e) => (e as { cell: number }).cell);
  assert.deepEqual(dropped.slice(0, 3), [6, 7, 8], 'rải qua ô quan Đông rồi sang hàng đối phương');
});

test('ô quan còn quân làm ô kế tiếp thì mất lượt, không ăn được', () => {
  // Rải 1 quân từ ô 4 sang ô 5; ô kế tiếp là ô quan Đông đang còn quan.
  const s = put(fresh(), { 4: 1, 11: 1 });
  const after = quanEngine.reduce(s, P0, { cell: 4, dir: 1 }, makeRng('t', 0));
  assert.deepEqual(
    after.trail.filter((e) => e.t === 'lose').map((e) => (e as { reason: string }).reason),
    ['quan_occupied'],
  );
  assert.equal(after.capturedQuan[0], 0, 'không ăn được con quan ở tình huống này');
});

test('ăn quân: ô kế tiếp rỗng rồi tới ô có quân thì ăn sạch ô đó', () => {
  // Rải 1 quân từ ô 1 sang ô 2; ô 3 rỗng; ô 4 có 7 dân.
  const s = put(fresh(), { 1: 1, 4: 7, 5: 2, 11: 1 });
  const after = quanEngine.reduce(s, P0, { cell: 1, dir: 1 }, makeRng('t', 0));
  assert.equal(after.cells[4]!.dan, 0);
  assert.equal(after.capturedDan[0], 7);
});

test('ăn dây chuyền: trống – có – trống – có thì ăn liên tiếp, kể cả ăn quan', () => {
  // Ô 2 nhận quân, ô 3 rỗng, ăn ô 4 (3 dân), ô 5 rỗng, ăn tiếp ô quan Đông.
  const s = put(fresh(), { 1: 1, 4: 3, 11: 1 });
  const after = quanEngine.reduce(s, P0, { cell: 1, dir: 1 }, makeRng('t', 0));
  assert.equal(after.trail.filter((e) => e.t === 'capture').length, 2);
  assert.equal(after.capturedDan[0], 3);
  assert.equal(after.capturedQuan[0], 1, 'nhịp thứ hai ăn luôn con quan');
});

test('ô quan đã mất quan là ô trống bình thường, nhảy qua được để ăn ô sau nó', () => {
  // Ô quan Đông đã bị ăn từ trước. Rải 1 quân từ ô 4 sang ô 5, ô 6 rỗng,
  // ăn ô 7 của đối phương.
  const s = put(fresh(), { 4: 1, 7: 4, 11: 1 }, [1, 0]);
  const after = quanEngine.reduce(s, P0, { cell: 4, dir: 1 }, makeRng('t', 0));
  assert.equal(after.capturedDan[0], 4);
});

test('ăn nốt con quan thứ hai thì hết ván, và thu quân về hai bên', () => {
  // Quan Tây đã mất; nước này ăn ô 4 rồi ăn nốt quan Đông.
  // Dân của đối phương để ở ô 10, đủ xa để chuỗi ăn dây chuyền không với
  // tới — ở ô 8 thì nhịp thứ ba của chuỗi ăn luôn cả chỗ đó.
  const s = put(fresh(), { 1: 1, 4: 3, 10: 6 }, [0, 1]);
  const after = quanEngine.reduce(s, P0, { cell: 1, dir: 1 }, makeRng('t', 0));
  const done = quanEngine.outcome(after);
  assert.ok(done, 'hết cả hai quan là hết ván');
  const theirs = done!.placements.find((p) => p.seat === s.seats[1])!.score;
  assert.ok(theirs >= 6, 'sáu dân còn trên hàng đối phương phải được thu về cho họ');
});

test('hết dân bên mình thì tự rải lại năm quân từ kho riêng', () => {
  // Sau nước này hàng trên sạch dân, kho của họ có 3 -> rải lại được 3 ô.
  const s = { ...put(fresh(), { 1: 1 }), capturedDan: [0, 3] as [number, number] };
  const after = quanEngine.reduce(s, P0, { cell: 1, dir: 1 }, makeRng('t', 0));
  assert.deepEqual([7, 8, 9, 10, 11].map((i) => after.cells[i]!.dan), [1, 1, 1, 0, 0]);
  assert.equal(after.capturedDan[1], 0, 'lấy hết kho riêng ra rải');
  assert.equal(after.debt[1], 0, 'đủ quân thì không phải vay');
});

test('không đủ quân rải lại thì vay của đối phương và ghi nợ', () => {
  const s = { ...put(fresh(), { 1: 1 }), capturedDan: [9, 1] as [number, number] };
  const after = quanEngine.reduce(s, P0, { cell: 1, dir: 1 }, makeRng('t', 0));
  assert.deepEqual([7, 8, 9, 10, 11].map((i) => after.cells[i]!.dan), [1, 1, 1, 1, 1]);
  assert.equal(after.debt[1], 4, 'vay bốn dân');
  assert.equal(after.capturedDan[0], 5, 'kho đối phương bị trừ đúng bốn');
});

test('tổng dân luôn bằng 50 suốt 60 ván ngẫu nhiên, và ván nào cũng kết thúc', () => {
  let ended = 0;
  for (let g = 0; g < 60; g++) {
    let s = fresh(`r-${g}`);
    const rng = makeRng(`p-${g}`, 0);
    for (let k = 0; k < 500 && !quanEngine.outcome(s); k++) {
      const ms = quanEngine.legal(s, s.toMove);
      assert.ok(ms.length > 0, 'còn quân thì phải còn nước');
      s = quanEngine.reduce(s, s.toMove, ms[rng.int(ms.length)]!, makeRng('x', s.rngCursor));
      assert.equal(totalDan(s), 50, `tổng dân lệch ở ván ${g}`);
      assert.equal(s.cells[0]!.quan + s.cells[6]!.quan + s.capturedQuan[0] + s.capturedQuan[1], 2, 'luôn đủ hai con quan');
    }
    if (quanEngine.outcome(s)) ended++;
  }
  assert.equal(ended, 60, 'mọi ván đều phải kết thúc trong giới hạn');
});

test('điểm cuối ván cộng lại đúng bằng tổng giá trị đã chia', () => {
  for (let g = 0; g < 20; g++) {
    let s = fresh(`s-${g}`);
    const rng = makeRng(`q-${g}`, 0);
    while (!quanEngine.outcome(s)) {
      const ms = quanEngine.legal(s, s.toMove);
      s = quanEngine.reduce(s, s.toMove, ms[rng.int(ms.length)]!, makeRng('x', s.rngCursor));
    }
    const done = quanEngine.outcome(s)!;
    const [a, b] = done.placements.map((p) => p.score) as [number, number];
    const quanTaken = s.capturedQuan[0] + s.capturedQuan[1];
    // Nợ triệt tiêu lẫn nhau nên tổng điểm = 50 dân + số quan đã ăn × giá.
    // Dân bỏ đi khi chia lẻ ô quan làm tổng hụt tối đa 1.
    const expect = 50 + quanTaken * s.cfg.quanValue;
    assert.ok(expect - (a + b) <= 1 && a + b <= expect, `ván ${g}: ${a}+${b} vs ${expect}`);
  }
});

test('bot không ăn con quan trần trụi khi ăn xong là thua ngược', () => {
  // Ăn nốt con quan ở đây kết thúc ván ngay, mà hàng trên còn 35 dân sẽ
  // được thu về cho họ: 26 điểm so với 38, bot thắng thành thua.
  const s: QuanState = {
    ...put(fresh(), { 1: 1, 4: 3, 7: 7, 8: 7, 9: 7, 10: 7, 11: 7 }, [0, 1]),
    capturedDan: [12, 3],
  };
  const greedy = quanEngine.reduce(s, P0, { cell: 1, dir: 1 }, makeRng('g', 0));
  const lost = quanEngine.outcome(greedy)!;
  assert.ok(
    lost.placements.find((p) => p.seat === P0)!.score < lost.placements.find((p) => p.seat !== P0)!.score,
    'thế cờ này đúng là cái bẫy: ăn quan xong thì thua',
  );

  const mv = quanBot.pick(s, P0, 3, makeRng('greed', 0), 500);
  const after = quanEngine.reduce(s, P0, mv, makeRng('z', 0));
  const done = quanEngine.outcome(after);
  assert.ok(!done, 'bot mức Khó phải thấy cái bẫy và không kết thúc ván');
});

test('bot trả nước hợp lệ ở mọi mức, cho cả hai ghế', () => {
  const rng = makeRng('legal', 0);
  let s = fresh('legal');
  for (let k = 0; k < 30 && !quanEngine.outcome(s); k++) {
    for (const lv of [1, 2, 3] as const) {
      const mv = quanBot.pick(s, s.toMove, lv, makeRng(`l${k}${lv}`, 0), 60);
      assert.ok(quanEngine.isLegalFast!(s, s.toMove, mv), `mức ${lv} trả nước ngoài luật`);
    }
    const ms = quanEngine.legal(s, s.toMove);
    s = quanEngine.reduce(s, s.toMove, ms[rng.int(ms.length)]!, makeRng('x', s.rngCursor));
  }
});

test('hợp đồng engine', () => {
  runEngineConformance(quanEngine, { seats: SEATS, maxPlies: 300 });
  runEngineConformance(withStandardMeta(quanEngine), { seats: SEATS, maxPlies: 300 });
});
