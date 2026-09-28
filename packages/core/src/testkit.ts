import assert from 'node:assert/strict';
import { applyChecked, runAuto } from './driver.js';
import { makeRng } from './rng.js';
import type { BaseState, Engine, Seat, Viewer } from './types.js';

/**
 * Bộ kiểm bắt buộc cho mọi engine.
 *
 * Chín ràng buộc trong `docs/ARCHITECTURE.md` đều là lỗi **im lặng** — không
 * làm sập gì, chỉ âm thầm sai cho tới lúc quá muộn. Tài liệu không chặn được
 * chúng; chỉ có test chạy trong CI mới chặn được. Mỗi engine gọi
 * `runEngineConformance()` và phải xanh.
 */

export interface PlayoutOptions<S extends BaseState, A> {
  seats: Seat[];
  config?: unknown;
  seed?: string;
  maxPlies?: number;
  /**
   * Giá trị bí mật mà một người xem **không được** thấy. Trả mảng rỗng nếu
   * game không có thông tin ẩn. Dùng cho phép thử rò rỉ (ràng buộc R1).
   */
  secretsHiddenFrom?: (s: S, viewer: Viewer) => unknown[];
  /** Lọc bớt nước đi cho playout hội tụ nhanh (ví dụ ưu tiên nước ăn quân). */
  pickMove?: (moves: A[], s: S, seat: Seat, pick: (n: number) => number) => A;
}

export interface Playout<S> {
  states: S[];
  plies: number;
}

function opts<S extends BaseState, A>(o: PlayoutOptions<S, A>) {
  return {
    seats: o.seats,
    config: o.config ?? {},
    seed: o.seed ?? 'testkit-seed',
    maxPlies: o.maxPlies ?? 200,
  };
}

/** Đánh ngẫu nhiên tới hết ván hoặc hết `maxPlies`, ghi lại từng state. */
export function randomPlayout<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): Playout<S> {
  const { seats, config, seed, maxPlies } = opts(o);
  // Dòng ngẫu nhiên riêng cho việc *chọn nước*, tách khỏi dòng của engine —
  // trộn chung thì test tự làm lệch con trỏ mà nó đang đi kiểm.
  const chooser = makeRng(`${seed}|chooser`, 0);
  const states: S[] = [];

  let s = engine.init(seats, config, makeRng(seed, 0));
  s = runAuto(engine, s, seed);
  states.push(s);

  for (let i = 0; i < maxPlies; i++) {
    const t = engine.turn(s);
    if (t.kind === 'over') break;
    if (t.kind !== 'seat') break;
    const moves = engine.legal(s, t.seat);
    if (!moves.length) break;
    const a = o.pickMove
      ? o.pickMove(moves, s, t.seat, (n) => chooser.int(n))
      : (moves[chooser.int(moves.length)] as A);
    s = applyChecked(engine, s, t.seat, a, seed);
    s = runAuto(engine, s, seed);
    states.push(s);
  }
  return { states, plies: states.length - 1 };
}

/**
 * R2 + R7 — cắt ván ra làm đôi, đóng gói, mở lại, đánh tiếp và so với ván
 * không bị cắt.
 *
 * Đây là phép thử giá trị nhất trong cả bộ: nó bắt đúng cái lỗi con trỏ RNG
 * nằm ngoài state, thứ mà cả hai kiến trúc độc lập đều mắc và không kiến trúc
 * nào tự phát hiện được.
 */
export function assertSnapshotResume<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): void {
  const { seats, config, seed, maxPlies } = opts(o);
  const chooserSeed = `${seed}|chooser`;

  const play = (cutAt: number): { s: S; encoded: string } => {
    const chooser = makeRng(chooserSeed, 0);
    let s = engine.init(seats, config, makeRng(seed, 0));
    s = runAuto(engine, s, seed);
    for (let i = 0; i < maxPlies; i++) {
      if (i === cutAt) {
        // Đúng chỗ này: giả lập node chết rồi phòng dựng lại từ snapshot.
        s = engine.decode(engine.encode(s));
      }
      const t = engine.turn(s);
      if (t.kind !== 'seat') break;
      const moves = engine.legal(s, t.seat);
      if (!moves.length) break;
      const a = o.pickMove
        ? o.pickMove(moves, s, t.seat, (n) => chooser.int(n))
        : (moves[chooser.int(moves.length)] as A);
      s = applyChecked(engine, s, t.seat, a, seed);
      s = runAuto(engine, s, seed);
    }
    return { s, encoded: engine.encode(s) };
  };

  const whole = play(-1);
  for (const cut of [1, 3, 7]) {
    const cutRun = play(cut);
    assert.equal(
      cutRun.encoded,
      whole.encoded,
      `${engine.spec.id}: cắt ở nước ${cut} rồi khôi phục ra state khác ván liền mạch. ` +
        'Gần như chắc chắn là `rngCursor` hoặc một trường nào đó không có trong encode() — ràng buộc R2.',
    );
  }
}

/** R2 — `encode()` phải mang đủ `ply` và `rngCursor`. */
export function assertEncodeCarriesBase<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): void {
  const { states } = randomPlayout(engine, o);
  for (const s of states) {
    const back = engine.decode(engine.encode(s));
    assert.equal(back.ply, s.ply, `${engine.spec.id}: encode() làm mất ply`);
    assert.equal(back.rngCursor, s.rngCursor, `${engine.spec.id}: encode() làm mất rngCursor (R2)`);
  }
}

/** R5 — `turn()` phải tính được từ state đã đóng gói rồi mở lại. */
export function assertTurnIsPureFromState<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): void {
  const { states } = randomPlayout(engine, o);
  for (const s of states) {
    const a = engine.turn(s);
    const b = engine.turn(engine.decode(engine.encode(s)));
    assert.deepEqual(b, a, `${engine.spec.id}: turn() khác nhau trước và sau khi khôi phục state (R5)`);
  }
}

/**
 * R1 — không giá trị bí mật nào được rời máy chủ, kể cả qua `events`.
 *
 * Quét **cả** `v` lẫn `events`. Đây chính là chỗ cả hai kiến trúc cùng thủng:
 * tuyên bố `view()` là cửa duy nhất rồi phát event thẳng ra dây ngoài cửa đó.
 */
export function assertNoLeak<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): void {
  const secretsOf = o.secretsHiddenFrom;
  if (!secretsOf) {
    assert.equal(
      engine.spec.hiddenInfo,
      false,
      `${engine.spec.id}: spec khai có thông tin ẩn nhưng test không cung cấp secretsHiddenFrom`,
    );
    return;
  }
  const { states } = randomPlayout(engine, o);
  const viewers: Viewer[] = [...o.seats, 'spectator'];
  for (const s of states) {
    for (const viewer of viewers) {
      const secrets: unknown[] = secretsOf(s, viewer);
      if (!secrets.length) continue;
      const out = engine.view(s, viewer);
      const wireV = JSON.stringify(out.v);
      const wireE = JSON.stringify(out.events);
      for (const secret of secrets) {
        const needle: string = JSON.stringify(secret);
        assert.equal(
          wireV.includes(needle),
          false,
          `${engine.spec.id}: view.v lộ bí mật ${needle} cho ${String(viewer)} ở nước ${s.ply}`,
        );
        assert.equal(
          wireE.includes(needle),
          false,
          `${engine.spec.id}: view.events lộ bí mật ${needle} cho ${String(viewer)} ở nước ${s.ply} — ` +
            'đây đúng là đường rò mà cả hai kiến trúc cùng bỏ sót (R1)',
        );
      }
    }
  }
}

/**
 * R6 — `isLegalFast` phải khớp `legal()` từng nước một.
 *
 * Hai đường mã trả lời cùng một câu hỏi là công thức kinh điển đẻ ra "nước này
 * hợp lệ trên máy tôi". Engine nào khai đường nhanh thì phải chịu phép thử này.
 */
export function assertLegalityAgrees<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A> & { decoys?: (s: S, seat: Seat) => A[] },
): void {
  if (!engine.isLegalFast) return;
  const fast = engine.isLegalFast.bind(engine);
  const { states } = randomPlayout(engine, o);
  for (const s of states) {
    const t = engine.turn(s);
    if (t.kind !== 'seat') continue;
    const moves = engine.legal(s, t.seat);
    for (const a of moves) {
      assert.equal(fast(s, t.seat, a), true, `${engine.spec.id}: isLegalFast từ chối một nước mà legal() sinh ra (R6)`);
    }
    for (const bad of o.decoys?.(s, t.seat) ?? []) {
      const reallyLegal = moves.some((m) => JSON.stringify(m) === JSON.stringify(bad));
      if (reallyLegal) continue;
      assert.equal(
        fast(s, t.seat, bad),
        false,
        `${engine.spec.id}: isLegalFast chấp nhận nước mà legal() không có (R6): ${JSON.stringify(bad)}`,
      );
    }
  }
}

/** Ván chạy tới nơi tới chốn: `ply` tăng đơn điệu, kết thúc thì có kết quả. */
export function assertProgress<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): void {
  const { states } = randomPlayout(engine, o);
  for (let i = 1; i < states.length; i++) {
    const prev = states[i - 1] as S;
    const cur = states[i] as S;
    assert.ok(cur.ply > prev.ply, `${engine.spec.id}: ply không tăng sau một nước (${prev.ply} -> ${cur.ply})`);
    assert.ok(cur.rngCursor >= prev.rngCursor, `${engine.spec.id}: rngCursor đi lùi`);
  }
  const last = states[states.length - 1] as S;
  if (engine.turn(last).kind === 'over') {
    const out = engine.outcome(last);
    assert.ok(out, `${engine.spec.id}: turn() báo 'over' nhưng outcome() trả null`);
    assert.equal(out.placements.length, o.seats.length, `${engine.spec.id}: outcome thiếu ghế trong bảng xếp hạng`);
  }
}

/** Hai lần chạy cùng seed phải ra cùng một ván, từng bit. */
export function assertDeterministic<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A>,
): void {
  const a = randomPlayout(engine, o);
  const b = randomPlayout(engine, o);
  assert.equal(a.plies, b.plies, `${engine.spec.id}: cùng seed ra số nước khác nhau`);
  for (let i = 0; i < a.states.length; i++) {
    assert.equal(
      engine.encode(a.states[i] as S),
      engine.encode(b.states[i] as S),
      `${engine.spec.id}: cùng seed ra state khác nhau ở nước ${i}`,
    );
  }
}

/** `spec` phải tự nhất quán, và khớp với thứ engine thực sự cài. */
export function assertSpecSane(engine: Engine<BaseState, unknown, unknown, unknown>): void {
  const s = engine.spec;
  assert.ok(s.id.length > 0, 'spec.id rỗng');
  assert.ok(s.minSeats >= 1 && s.maxSeats >= s.minSeats, `${s.id}: minSeats/maxSeats vô lý`);
  assert.ok(s.defaultClock.initialMs > 0, `${s.id}: đồng hồ mặc định phải dương`);
  assert.ok(engine.ruleHash.length > 0, `${s.id}: thiếu ruleHash`);
  if (s.realtime) assert.ok(engine.step, `${s.id}: khai realtime nhưng không có step()`);
  if (s.usesChance) {
    assert.ok(
      engine.enumerateChance ? !!engine.applyChance : true,
      `${s.id}: có enumerateChance thì phải có applyChance`,
    );
  }
}

/** Chạy trọn bộ. Mỗi engine gọi đúng hàm này trong test của nó. */
export function runEngineConformance<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  o: PlayoutOptions<S, A> & { decoys?: (s: S, seat: Seat) => A[] },
): void {
  assertSpecSane(engine as unknown as Engine<BaseState, unknown, unknown, unknown>);
  assertProgress(engine, o);
  assertDeterministic(engine, o);
  assertEncodeCarriesBase(engine, o);
  assertTurnIsPureFromState(engine, o);
  assertSnapshotResume(engine, o);
  assertNoLeak(engine, o);
  assertLegalityAgrees(engine, o);
}
