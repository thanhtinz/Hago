import type {
  AnyEngine,
  BaseState,
  ChanceOutcome,
  Engine,
  Outcome,
  Placement,
  Rng,
  Seat,
  SeatView,
  Turn,
  Viewer,
} from './types.js';

/**
 * Đầu hàng, cầu hoà, hết giờ, bỏ trận — ngữ nghĩa **giống hệt nhau ở cả 9
 * game**, nên chúng thuộc về lõi chứ không thuộc từng engine (ràng buộc R4).
 *
 * Để mỗi engine tự xử là 9 engine × 6 meta-action = 54 chỗ để sai lặng lẽ, và
 * kiểu sai điển hình rất khó thấy: `isLegal` cho `offer-draw` đi qua, rồi
 * `reduce` không có nhánh nào bắt nó và rơi thẳng vào hàm đi nước cờ. Bọc một
 * lần ở đây thì engine chỉ còn nhìn thấy nước đi game.
 */

export type MetaAction =
  | { t: 'resign' }
  | { t: 'offer-draw' }
  | { t: 'accept-draw' }
  | { t: 'decline-draw' }
  /** Do máy chủ phát khi đồng hồ cạn, không phải client gửi. */
  | { t: 'flag'; seat: Seat }
  /** Do máy chủ phát khi mất kết nối quá hạn ân hạn. */
  | { t: 'abandon'; seat: Seat };

export type Wrapped<A> = { t: 'game'; a: A } | MetaAction;

export interface MetaState<S> extends BaseState {
  inner: S;
  /**
   * Số meta-action đã áp dụng. `ply` của lớp bọc = `inner.ply + metaPlies`.
   *
   * Không có trường này thì `ply` **thụt lùi**: cầu hoà cộng 1 vào ply của
   * lớp bọc nhưng không đụng tới ply bên trong, rồi nước cờ kế tiếp lại lấy
   * thẳng ply bên trong ra dùng — thế là hai input liên tiếp mang cùng một
   * số. Mà client reconnect bằng `(matchId, ply)`, nên ply trùng nghĩa là
   * người vào lại phòng nhận đúng state cũ và mất một nước.
   *
   * Lỗi này ẩn kỹ ở game có nhiều nước đi: bốc ngẫu nhiên trong 225 nước
   * caro thì hiếm khi trúng cầu hoà. Ô ăn quan chỉ có 10 nước nên nó lộ ra
   * ngay lần chạy bộ kiểm đầu tiên.
   */
  metaPlies: number;
  seats: Seat[];
  /** Ghế đã rời cuộc, theo thứ tự rời — dùng để xếp hạng ngược. */
  out: { seat: Seat; why: 'resign' | 'flag' | 'abandon' }[];
  drawOffer: { by: Seat; atPly: number } | null;
  /** Số lần mỗi ghế đã cầu hoà. Chặn spam mà không cần đồng hồ tường. */
  drawOffers: Record<Seat, number>;
  ended: Outcome | null;
}

/** Lời cầu hoà hết hiệu lực sau chừng này nước, khỏi treo mãi. */
const DRAW_OFFER_TTL_PLIES = 2;
/** Mỗi ghế cầu hoà tối đa ngần này lần một ván. */
const MAX_DRAW_OFFERS = 3;

export interface MetaEvent {
  t: 'meta';
  kind: 'resign' | 'flag' | 'abandon' | 'draw-offer' | 'draw-accept' | 'draw-decline';
  seat: Seat;
}

function alive<S>(s: MetaState<S>): Seat[] {
  const gone = new Set(s.out.map((o) => o.seat));
  return s.seats.filter((x) => !gone.has(x));
}

/**
 * Xếp hạng khi ván kết thúc vì có người rời cuộc: người còn lại đứng trên,
 * người rời sau đứng trên người rời trước.
 */
function placementsFromExits<S>(s: MetaState<S>, survivors: Seat[]): Placement[] {
  const out: Placement[] = survivors.map((seat) => ({ seat, place: 1, score: 0 }));
  let place = survivors.length + 1;
  for (const o of [...s.out].reverse()) {
    out.push({ seat: o.seat, place, score: 0 });
    place++;
  }
  return out;
}

export function withStandardMeta<S extends BaseState, A, V, Ev>(
  inner: Engine<S, A, V, Ev>,
): Engine<MetaState<S>, Wrapped<A>, V, Ev | MetaEvent> {
  const wrap = (s: MetaState<S>, next: S, extra?: Partial<MetaState<S>>): MetaState<S> => ({
    ...s,
    ...extra,
    inner: next,
    ply: next.ply + s.metaPlies,
    rngCursor: next.rngCursor,
  });

  /** Một meta-action: ply của lớp bọc tiến lên, ply bên trong đứng yên. */
  const bump = (s: MetaState<S>): Pick<MetaState<S>, 'ply' | 'metaPlies'> => ({
    ply: s.ply + 1,
    metaPlies: s.metaPlies + 1,
  });

  /** Ghi một ghế rời cuộc, và kết thúc ván nếu không còn đủ người. */
  const exit = (s: MetaState<S>, seat: Seat, why: 'resign' | 'flag' | 'abandon'): MetaState<S> => {
    if (s.ended || s.out.some((o) => o.seat === seat)) return s;
    const after: MetaState<S> = { ...s, out: [...s.out, { seat, why }], drawOffer: null, ...bump(s) };
    const left = alive(after);
    if (left.length >= 2) return after;
    const reason = why === 'resign' ? 'đối thủ đầu hàng' : why === 'flag' ? 'đối thủ hết giờ' : 'đối thủ bỏ trận';
    return {
      ...after,
      ended: {
        winner: left[0] ?? null,
        reason,
        placements: placementsFromExits(after, left),
      },
    };
  };

  return {
    spec: inner.spec,
    version: inner.version,
    ruleHash: inner.ruleHash,

    init(seats, config, rng) {
      const s0 = inner.init(seats, config, rng);
      const drawOffers: Record<Seat, number> = {};
      for (const x of seats) drawOffers[x] = 0;
      return {
        ply: s0.ply,
        rngCursor: s0.rngCursor,
        inner: s0,
        metaPlies: 0,
        seats: [...seats],
        out: [],
        drawOffer: null,
        drawOffers,
        ended: null,
      };
    },

    turn(s) {
      if (s.ended) return { kind: 'over' };
      const t = inner.turn(s.inner);
      // Ghế đã rời cuộc mà engine vẫn gọi tên thì bỏ qua lượt của nó: engine
      // bên trong không biết chuyện đầu hàng, đó là việc của lớp này.
      if (t.kind === 'seat' && s.out.some((o) => o.seat === t.seat)) {
        const left = alive(s);
        return left.length ? { kind: 'seat', seat: left[0] as Seat } : { kind: 'over' };
      }
      return t;
    },

    legal(s, seat) {
      if (s.ended) return [];
      const meta: Wrapped<A>[] = [];
      const isOut = s.out.some((o) => o.seat === seat);
      if (!isOut) {
        meta.push({ t: 'resign' });
        if (s.drawOffer && s.drawOffer.by !== seat) {
          meta.push({ t: 'accept-draw' }, { t: 'decline-draw' });
        } else if (!s.drawOffer && (s.drawOffers[seat] ?? 0) < MAX_DRAW_OFFERS) {
          meta.push({ t: 'offer-draw' });
        }
      }
      const t = this.turn(s);
      const canMove = t.kind === 'seat' ? t.seat === seat : t.kind === 'sealed' ? t.seats.includes(seat) : false;
      if (isOut || !canMove) return meta;
      return [...inner.legal(s.inner, seat).map((a): Wrapped<A> => ({ t: 'game', a })), ...meta];
    },

    reduce(s, seat, a, rng) {
      if (s.ended) throw new Error('MATCH_OVER');
      switch (a.t) {
        case 'game': {
          const next = inner.reduce(s.inner, seat, a.a, rng);
          // Lời cầu hoà tự hết hạn khi ván đi tiếp — không để nó treo lơ lửng
          // rồi bị chấp nhận sau mười nước.
          const stale = s.drawOffer && next.ply - s.drawOffer.atPly >= DRAW_OFFER_TTL_PLIES;
          return wrap(s, next, stale ? { drawOffer: null } : {});
        }
        case 'resign':
          return exit(s, seat, 'resign');
        case 'flag':
          return exit(s, a.seat, 'flag');
        case 'abandon':
          return exit(s, a.seat, 'abandon');
        case 'offer-draw': {
          if (s.drawOffer) throw new Error('DRAW_ALREADY_OFFERED');
          if ((s.drawOffers[seat] ?? 0) >= MAX_DRAW_OFFERS) throw new Error('TOO_MANY_DRAW_OFFERS');
          return {
            ...s,
            ...bump(s),
            drawOffer: { by: seat, atPly: s.ply },
            drawOffers: { ...s.drawOffers, [seat]: (s.drawOffers[seat] ?? 0) + 1 },
          };
        }
        case 'decline-draw': {
          if (!s.drawOffer || s.drawOffer.by === seat) throw new Error('NO_DRAW_OFFER');
          return { ...s, ...bump(s), drawOffer: null };
        }
        case 'accept-draw': {
          if (!s.drawOffer || s.drawOffer.by === seat) throw new Error('NO_DRAW_OFFER');
          return {
            ...s,
            ...bump(s),
            drawOffer: null,
            ended: {
              winner: null,
              reason: 'hai bên thoả thuận hoà',
              placements: alive(s).map((x) => ({ seat: x, place: 1, score: 0 })),
            },
          };
        }
      }
    },

    ...(inner.step
      ? {
          step(s: MetaState<S>, rng: Rng): MetaState<S> {
            return wrap(s, inner.step!(s.inner, rng));
          },
        }
      : {}),

    view(s, viewer): SeatView<V, Ev | MetaEvent> {
      const base = inner.view(s.inner, viewer);
      const extra: MetaEvent[] = s.drawOffer ? [{ t: 'meta', kind: 'draw-offer', seat: s.drawOffer.by }] : [];
      const exits: MetaEvent[] = s.out.map((o) => ({ t: 'meta', kind: o.why, seat: o.seat }));
      return { ply: s.ply, v: base.v, events: [...base.events, ...exits, ...extra] };
    },

    outcome(s) {
      return s.ended ?? inner.outcome(s.inner);
    },

    encode(s) {
      return JSON.stringify({
        ply: s.ply,
        rngCursor: s.rngCursor,
        metaPlies: s.metaPlies,
        seats: s.seats,
        out: s.out,
        drawOffer: s.drawOffer,
        drawOffers: s.drawOffers,
        ended: s.ended,
        inner: inner.encode(s.inner),
      });
    },

    decode(x) {
      const o = JSON.parse(x) as Omit<MetaState<S>, 'inner'> & { inner: string };
      return { ...o, inner: inner.decode(o.inner) };
    },

    ...(inner.enumerateChance
      ? {
          enumerateChance(s: MetaState<S>): ChanceOutcome[] {
            return inner.enumerateChance!(s.inner);
          },
        }
      : {}),
    ...(inner.applyChance
      ? {
          applyChance(s: MetaState<S>, draw: unknown): MetaState<S> {
            return wrap(s, inner.applyChance!(s.inner, draw));
          },
        }
      : {}),
  };
}

/** Kiểu đã bọc, xoá tham số kiểu — dùng ở registry. */
export type MetaWrappedEngine = AnyEngine;

/** Một `Turn` có nghĩa là ván còn chạy hay đã xong. */
export function isOver(t: Turn): boolean {
  return t.kind === 'over';
}
