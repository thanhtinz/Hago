import assert from 'node:assert/strict';
import test from 'node:test';
import { applyChecked, RngCursorDesync } from './driver.js';
import { makeRng } from './rng.js';
import { assertLegalityAgrees, assertNoLeak, assertSnapshotResume } from './testkit.js';
import type { BaseState, Engine, GameSpec, Seat } from './types.js';

/**
 * Bộ kiểm mà không bao giờ đỏ thì chỉ là trang trí.
 *
 * Ở đây ta cố tình dựng những engine mắc **đúng** ba lỗi mà hai kiến trúc độc
 * lập cùng mắc, rồi khẳng định bộ kiểm bắt được. Nếu ai đó nới lỏng testkit
 * về sau, những test này đỏ trước.
 */

interface ToyState extends BaseState {
  seats: Seat[];
  toMove: Seat;
  /** Số bí mật mỗi ghế bốc được. Đối thủ không được biết. */
  secret: number[];
  picked: number[];
  done: boolean;
}

type ToyAction = { n: number };

const SPEC: GameSpec = {
  id: 'toy',
  nameVi: 'Đồ chơi',
  nameEn: 'Toy',
  taglineVi: 'Chỉ để kiểm bộ kiểm',
  minSeats: 2,
  maxSeats: 2,
  usesChance: true,
  hiddenInfo: true,
  realtime: false,
  defaultClock: { initialMs: 60_000, incrementMs: 0, graceMs: 500 },
};

/** Engine đúng chuẩn: ghi lại con trỏ RNG, che bí mật ở cả `v` lẫn `events`. */
function makeToy(flaw: 'none' | 'forget-cursor' | 'leak-in-view' | 'leak-in-events' | 'bad-fast'): Engine<
  ToyState,
  ToyAction,
  unknown,
  unknown
> {
  const fast =
    flaw === 'bad-fast'
      ? {
          // Lỗi kinh điển: đường nhanh rộng hơn `legal()`, chấp nhận cả nước
          // mà bộ sinh nước không bao giờ đẻ ra.
          isLegalFast: (s: ToyState, seat: Seat, a: ToyAction) => !s.done && seat === s.toMove && a.n >= 0,
        }
      : {};
  return {
    spec: SPEC,
    version: 1,
    ruleHash: `toy-${flaw}`,
    ...fast,

    init(seats, _config, rng) {
      const secret = seats.map(() => rng.int(1000) + 9000);
      return {
        ply: 0,
        rngCursor: flaw === 'forget-cursor' ? 0 : rng.cursor,
        seats: [...seats],
        toMove: seats[0] as Seat,
        secret,
        picked: [],
        done: false,
      };
    },

    turn: (s) => (s.done ? { kind: 'over' } : { kind: 'seat', seat: s.toMove }),

    legal: (s, seat) => (s.done || seat !== s.toMove ? [] : [{ n: 0 }, { n: 1 }, { n: 2 }]),

    reduce(s, seat, a, rng) {
      // Mỗi nước rút một giá trị ngẫu nhiên, để lỗi con trỏ lộ ra.
      const roll = rng.int(6);
      const picked = [...s.picked, a.n + roll];
      return {
        ...s,
        picked,
        ply: s.ply + 1,
        rngCursor: flaw === 'forget-cursor' ? s.rngCursor : rng.cursor,
        toMove: s.seats.find((x) => x !== seat) as Seat,
        done: picked.length >= 6,
      };
    },

    view(s, viewer) {
      const mine = typeof viewer === 'number' ? s.secret[viewer] : undefined;
      const v =
        flaw === 'leak-in-view'
          ? { picked: s.picked, secret: s.secret } // lộ hết
          : { picked: s.picked, yourSecret: mine ?? null };
      const events =
        flaw === 'leak-in-events'
          ? // Đúng đường rò mà cả hai kiến trúc cùng bỏ sót: `v` sạch sẽ,
            // nhưng event phát thẳng ra dây mang theo bí mật.
            [{ t: 'draw', all: s.secret }]
          : [{ t: 'draw' }];
      return { ply: s.ply, v, events };
    },

    outcome: (s) => (s.done ? { winner: s.seats[0] as Seat, reason: 'xong', placements: [] } : null),
    encode: (s) => JSON.stringify(s),
    decode: (x) => JSON.parse(x) as ToyState,
  };
}

const OPTS = {
  seats: [0, 1],
  maxPlies: 6,
  secretsHiddenFrom: (s: ToyState, viewer: Seat | 'spectator') =>
    s.secret.filter((_, i) => i !== viewer),
};

test('engine đúng chuẩn thì mọi phép thử đều xanh', () => {
  const e = makeToy('none');
  assertSnapshotResume(e, OPTS);
  assertNoLeak(e, OPTS);
  assertLegalityAgrees(e, OPTS);
});

test('R2 — quên ghi con trỏ RNG bị bắt ngay ở nước đầu', () => {
  const e = makeToy('forget-cursor');
  const s = e.init([0, 1], {}, makeRng('s', 0));
  assert.throws(() => applyChecked(e, s, 0, { n: 1 }, 's'), RngCursorDesync);
});

test('R2 — cắt ván rồi khôi phục phải ra đúng ván liền mạch', () => {
  // Engine này ghi con trỏ đúng nhưng ta bỏ nó khỏi encode(): đây là biến thể
  // tinh vi hơn, chạy đúng suốt phiên và chỉ sai sau khi node chết.
  const base = makeToy('none');
  const leaky: typeof base = {
    ...base,
    encode(s) {
      const { rngCursor: _drop, ...rest } = s;
      return JSON.stringify({ ...rest, rngCursor: 0 });
    },
  };
  assert.throws(() => assertSnapshotResume(leaky, OPTS), /rngCursor|khác ván liền mạch/);
});

test('R1 — lộ bí mật trong `v` bị bắt', () => {
  assert.throws(() => assertNoLeak(makeToy('leak-in-view'), OPTS), /view\.v lộ bí mật/);
});

test('R1 — lộ bí mật trong `events` cũng bị bắt, đây mới là đường rò bị bỏ sót', () => {
  assert.throws(() => assertNoLeak(makeToy('leak-in-events'), OPTS), /view\.events lộ bí mật/);
});

test('R6 — đường nhanh rộng hơn legal() bị bắt', () => {
  assert.throws(
    () => assertLegalityAgrees(makeToy('bad-fast'), { ...OPTS, decoys: () => [{ n: 99 }] }),
    /isLegalFast chấp nhận nước mà legal\(\) không có/,
  );
});

test('dòng ngẫu nhiên nối lại đúng từ một con trỏ bất kỳ', () => {
  const whole = makeRng('abc', 0);
  const first = [whole.int(100), whole.int(100), whole.int(100)];
  const rest = [whole.int(100), whole.int(100)];

  const resumed = makeRng('abc', 3);
  assert.deepEqual([resumed.int(100), resumed.int(100)], rest);
  assert.equal(makeRng('abc', 0).int(100), first[0]);
});

test('shuffle tiêu thụ đúng n-1 giá trị bất kể nội dung', () => {
  for (const n of [1, 2, 5, 13]) {
    const rng = makeRng('sh', 0);
    rng.shuffle(Array.from({ length: n }, (_, i) => i));
    assert.equal(rng.cursor, Math.max(0, n - 1), `mảng ${n} phần tử`);
  }
});
