import type { BaseState, Engine, GameSpec, Outcome, Rng, Seat, SeatView, Turn, Viewer } from '@co/core';
import { CELLS, NB, PAIRS, START_BOTTOM, START_TOP } from './board.js';

/**
 * Cờ Gánh (cờ chém) — cờ dân gian Quảng Nam.
 *
 * Luật đầy đủ: `docs/rules/co-ganh.md`.
 *
 * Điểm cốt lõi khiến game này khác mọi game cờ khác trong nền tảng: **không
 * quân nào bị nhấc khỏi bàn bao giờ**. Quân bị ăn chỉ **đổi màu** tại chỗ, nên
 * trên bàn luôn đúng 16 quân, và thắng nghĩa là chiếm hết cả 16.
 *
 * Ba chỗ phải làm đúng thứ tự, sai là ra ván khác hẳn:
 *
 * 1. **Gánh trước, vây sau.** Gánh đổi màu và có thể tách cụm của đối phương,
 *    nên chạy vây trước sẽ soi vào cấu trúc cụm cũ.
 * 2. **Vây xét theo cụm, không xét từng quân.** Cài theo từng quân thì một
 *    quân nằm sâu trong đội hình của *chính mình* cũng không có ô trống kề, và
 *    bị đối phương ăn oan.
 * 3. **Luật mở chỉ tính ô vừa mới trở thành thế kẹp.** Thiếu điều kiện "trước
 *    nước đi chưa kẹp", đối thủ sẽ bị ép mãi bởi một thế mở cũ đứng yên.
 */

export interface GanhConfig {
  /** Đối thủ có bị ép đi vào ô vừa mở không. Tắt là mất gần hết chiều sâu. */
  forcedOpenCapture?: boolean;
  /** Vây theo cụm hay theo từng quân. `group` là đúng luật. */
  vayScope?: 'group' | 'single';
  /** Quân vừa đổi màu có gánh tiếp không. Dân gian là không. */
  chainGanh?: boolean;
  /** Số ply liên tiếp không có quân nào đổi màu thì xử hoà. */
  quietLimit?: number;
}

export interface GanhState extends BaseState {
  /** 25 điểm: -1 trống, còn lại là ghế đang chiếm. */
  board: number[];
  seats: Seat[];
  /** Ghế cầm quân phía dưới — bên đi trước. */
  bottom: Seat;
  toMove: Seat;
  /** Ô đích bắt buộc cho lượt này (luật mở). null là đi tự do. */
  forcedTo: number[] | null;
  /** Số ply liên tiếp không có quân nào đổi màu. */
  quiet: number;
  /** Số lần đã gặp từng thế cờ, để xử hoà lặp ba lần. */
  reps: Record<string, number>;
  last: { f: number; t: number } | null;
  /** Quân vừa đổi màu ở nước gần nhất — client lấy đây để làm cú lật. */
  flipped: number[];
  ended: Outcome | null;
  cfg: Required<GanhConfig>;
}

export interface GanhAction {
  f: number;
  t: number;
}

export interface GanhView {
  board: number[];
  toMove: Seat;
  forcedTo: number[] | null;
  last: { f: number; t: number } | null;
  flipped: number[];
  bottom: Seat;
  yourSeat: Seat | 'spectator';
  winner: Seat | null;
}

export type GanhEvent =
  | { t: 'move'; seat: Seat; f: number; t2: number }
  | { t: 'flip'; seat: Seat; cells: number[] }
  | { t: 'open'; points: number[] };

const DEFAULTS: Required<GanhConfig> = {
  forcedOpenCapture: true,
  vayScope: 'group',
  chainGanh: false,
  quietLimit: 50,
};

const spec: GameSpec = {
  id: 'co-ganh',
  nameVi: 'Cờ Gánh',
  nameEn: 'Co Ganh',
  taglineVi: 'Cờ dân gian Quảng Nam — kẹp hai đầu là gánh được quân',
  minSeats: 2,
  maxSeats: 2,
  usesChance: false,
  hiddenInfo: false,
  realtime: false,
  defaultClock: { initialMs: 8 * 60 * 1000, incrementMs: 5000, graceMs: 800 },
};

/** Bên kia của `seat` trong một ván hai người. */
const other = (s: GanhState, seat: Seat): Seat => (s.seats[0] === seat ? s.seats[1]! : s.seats[0]!);

/** `side` có đang kẹp điểm `p` không (hai đầu của một cặp đều là quân `side`). */
export function clamps(board: readonly number[], p: number, side: Seat): boolean {
  for (const [a, b] of PAIRS[p]!) if (board[a] === side && board[b] === side) return true;
  return false;
}

/** Quân của `side` còn trên bàn. */
export function countOf(board: readonly number[], side: Seat): number {
  let n = 0;
  for (const v of board) if (v === side) n++;
  return n;
}

/**
 * Gánh: đặt quân xuống `t` rồi lật mọi cặp quân địch bị kẹp hai đầu.
 *
 * Xét **tất cả các cặp cùng lúc** trên bàn cờ sau khi quân đã nằm ở `t`: một
 * nước có thể gánh 2, 4, 6 hoặc 8 quân. Và chỉ bên vừa đi mới gánh được — đối
 * phương đi khiến quân ta tình cờ nằm giữa hai quân họ thì không có gì xảy ra.
 */
function resolveGanh(board: number[], t: number, me: Seat, opp: Seat, flipped: number[]): void {
  for (const [a, b] of PAIRS[t]!) {
    if (board[a] === opp && board[b] === opp) {
      board[a] = me;
      board[b] = me;
      flipped.push(a, b);
    }
  }
}

/**
 * Vây: cụm quân địch không còn khí nào thì cả cụm đổi màu.
 *
 * Lặp tới điểm bất động, vì đổi màu một cụm có thể **tách** cụm địch còn lại
 * thành mấy cụm con, và cụm con có thể đã hết khí từ trước. Tập ô trống không
 * đổi khi lật màu, nhưng cấu trúc cụm thì đổi.
 */
function resolveVay(board: number[], me: Seat, opp: Seat, flipped: number[], scope: 'group' | 'single'): void {
  for (;;) {
    let changed = false;
    const seen = new Uint8Array(CELLS);
    for (let i = 0; i < CELLS; i++) {
      if (board[i] !== opp || seen[i]) continue;
      const group = [i];
      seen[i] = 1;
      let hasLiberty = false;
      for (let k = 0; k < group.length; k++) {
        for (const n of NB[group[k]!]!) {
          if (board[n] === -1) hasLiberty = true;
          else if (scope === 'group' && board[n] === opp && !seen[n]) {
            seen[n] = 1;
            group.push(n);
          }
        }
      }
      if (!hasLiberty) {
        for (const x of group) {
          board[x] = me;
          flipped.push(x);
        }
        changed = true;
      }
    }
    if (!changed) return;
  }
}

/**
 * Luật mở: những ô vừa trở thành thế kẹp của bên vừa đi, và đối phương với
 * tới được. Có ô như vậy thì lượt sau đối phương **bắt buộc** đi vào một
 * trong số đó.
 *
 * Đây là linh hồn chiến thuật của cờ gánh: thí hai quân để ép đối thủ đi đúng
 * ô mình muốn, rồi nước sau gánh lại nhiều hơn.
 */
function openPointsOf(before: readonly number[], after: readonly number[], me: Seat, opp: Seat): number[] {
  const out: number[] = [];
  for (let p = 0; p < CELLS; p++) {
    if (after[p] !== -1) continue;
    if (!clamps(after, p, me)) continue;
    // Ô đã **mở sẵn** từ trước mà đối phương không thèm ăn thì thôi, không ép
    // nữa. Thiếu vế này thì một thế mở cũ đứng yên sẽ ép đối thủ mãi mãi.
    //
    // "Mở sẵn" đòi hỏi ô đó vừa trống vừa bị kẹp ở bàn cờ trước. Chỉ xét kẹp
    // mà bỏ qua "trống" thì loại nhầm trường hợp phổ biến nhất: ô xuất phát
    // `f` mà bên đi vừa rời khỏi, vốn đã nằm giữa hai quân của chính họ. Đó
    // đúng là cú mở kinh điển, và bỏ nó đi thì perft lệch ngay từ tầng 3.
    if (before[p] === -1 && clamps(before, p, me)) continue;
    // Đối phương với tới được thì mới ép được, nếu không sẽ tạo ra thế không
    // còn nước đi hợp lệ nào.
    if (!NB[p]!.some((n) => after[n] === opp)) continue;
    out.push(p);
  }
  return out;
}

/**
 * Áp dụng một nước lên bàn cờ và trả về bàn mới. Tách riêng khỏi `reduce` để
 * bot gọi được hàng trăm nghìn lần mà không phải dựng cả một `GanhState`.
 */
export function applyMove(
  before: readonly number[],
  a: GanhAction,
  me: Seat,
  opp: Seat,
  cfg: Required<GanhConfig>,
): { board: number[]; flipped: number[]; forcedTo: number[] | null } {
  const board = [...before];
  const flipped: number[] = [];
  board[a.f] = -1;
  board[a.t] = me;
  resolveGanh(board, a.t, me, opp, flipped);
  resolveVay(board, me, opp, flipped, cfg.vayScope);
  const open = cfg.forcedOpenCapture ? openPointsOf(before, board, me, opp) : [];
  return { board, flipped, forcedTo: open.length ? open : null };
}

/** Sinh nước đi cho một bên trên một bàn cờ trần. */
export function movesOn(board: readonly number[], seat: Seat, forcedTo: number[] | null): GanhAction[] {
  const out: GanhAction[] = [];
  for (let f = 0; f < CELLS; f++) {
    if (board[f] !== seat) continue;
    for (const t of NB[f]!) {
      if (board[t] !== -1) continue;
      if (forcedTo && !forcedTo.includes(t)) continue;
      out.push({ f, t });
    }
  }
  return out;
}

/** Khoá thế cờ để đếm lặp. Phải gồm cả ràng buộc mở, xem `docs/rules`. */
function repKey(board: readonly number[], toMove: Seat, forcedTo: number[] | null): string {
  return `${board.join('')}|${toMove}|${forcedTo ? [...forcedTo].sort((a, b) => a - b).join(',') : ''}`;
}

const movesOf = (s: GanhState, seat: Seat) => movesOn(s.board, seat, s.forcedTo);

export const ganhEngine: Engine<GanhState, GanhAction, GanhView, GanhEvent> = {
  spec,
  version: 1,
  ruleHash: 'co-ganh/v1/forced+group+nochain',

  init(seats, config, rng) {
    const cfg = { ...DEFAULTS, ...((config ?? {}) as GanhConfig) };
    // Ai cầm quân dưới (và đi trước) do rng quyết, không do thứ tự vào phòng.
    const order = rng.shuffle([...seats]);
    const bottom = order[0]!;
    const top = order[1]!;
    const board = new Array<number>(CELLS).fill(-1);
    for (const i of START_BOTTOM) board[i] = bottom;
    for (const i of START_TOP) board[i] = top;
    const s: GanhState = {
      ply: 0,
      rngCursor: rng.cursor,
      board,
      seats: [...seats],
      bottom,
      toMove: bottom,
      forcedTo: null,
      quiet: 0,
      reps: {},
      last: null,
      flipped: [],
      ended: null,
      cfg,
    };
    s.reps[repKey(board, bottom, null)] = 1;
    return s;
  },

  turn(s) {
    return s.ended ? { kind: 'over' } : ({ kind: 'seat', seat: s.toMove } as Turn);
  },

  legal(s, seat) {
    if (s.ended || seat !== s.toMove) return [];
    const ms = movesOf(s, seat);
    // Cờ gánh không có thế bí: cụm còn khí tương đương có quân đi được, mà
    // cụm hết khí thì đã bị lật ở nước trước. Nên mảng rỗng khi còn quân
    // nghĩa là engine sai, không phải luật.
    if (ms.length === 0 && countOf(s.board, seat) > 0) {
      throw new Error('KHONG_CO_NUOC_DI: engine sai, cờ gánh không có thế bí');
    }
    return ms;
  },

  isLegalFast(s, seat, a) {
    if (s.ended || seat !== s.toMove) return false;
    if (a.f < 0 || a.f >= CELLS || a.t < 0 || a.t >= CELLS) return false;
    if (s.board[a.f] !== seat || s.board[a.t] !== -1) return false;
    if (!NB[a.f]!.includes(a.t)) return false;
    if (s.forcedTo && !s.forcedTo.includes(a.t)) return false;
    return true;
  },

  reduce(s, seat, a, rng) {
    if (!this.isLegalFast!(s, seat, a)) throw new Error('NUOC_KHONG_HOP_LE');
    const opp = other(s, seat);
    const { board, flipped, forcedTo } = applyMove(s.board, a, seat, opp, s.cfg);
    const quiet = flipped.length ? 0 : s.quiet + 1;

    const next: GanhState = {
      ...s,
      ply: s.ply + 1,
      rngCursor: rng.cursor,
      board,
      toMove: opp,
      forcedTo,
      quiet,
      reps: { ...s.reps },
      last: { f: a.f, t: a.t },
      flipped,
      ended: null,
    };

    const key = repKey(board, opp, forcedTo);
    const seen = (next.reps[key] ?? 0) + 1;
    next.reps[key] = seen;

    const oppLeft = countOf(board, opp);
    if (oppLeft === 0) {
      next.ended = {
        winner: seat,
        reason: 'chiếm hết mười sáu quân',
        placements: [
          { seat, place: 1, score: 16 },
          { seat: opp, place: 2, score: 0 },
        ],
      };
    } else if (seen >= 3) {
      next.ended = draw(s.seats, 'lặp thế cờ ba lần');
    } else if (quiet >= s.cfg.quietLimit) {
      next.ended = draw(s.seats, `${s.cfg.quietLimit} nước không quân nào đổi màu`);
    }
    return next;
  },

  view(s, viewer) {
    const events: GanhEvent[] = [];
    if (s.last) events.push({ t: 'move', seat: other(s, s.toMove), f: s.last.f, t2: s.last.t });
    if (s.flipped.length) events.push({ t: 'flip', seat: other(s, s.toMove), cells: [...s.flipped] });
    if (s.forcedTo) events.push({ t: 'open', points: [...s.forcedTo] });
    return {
      ply: s.ply,
      v: {
        board: [...s.board],
        toMove: s.toMove,
        forcedTo: s.forcedTo ? [...s.forcedTo] : null,
        last: s.last,
        flipped: [...s.flipped],
        bottom: s.bottom,
        yourSeat: viewer,
        winner: s.ended?.winner ?? null,
      },
      events,
    };
  },

  outcome(s) {
    return s.ended;
  },

  encode(s) {
    return JSON.stringify(s);
  },

  decode(x) {
    return JSON.parse(x) as GanhState;
  },
};

function draw(seats: Seat[], reason: string): Outcome {
  return {
    winner: null,
    reason,
    placements: seats.map((seat) => ({ seat, place: 1, score: 8 })),
  };
}
