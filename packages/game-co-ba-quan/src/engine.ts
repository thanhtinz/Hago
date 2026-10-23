import type { BaseState, Engine, GameSpec, Outcome, Seat, SeatView } from '@co/core';

/**
 * Cờ Ba Quân (Three Men's Morris) — luật: `docs/rules/co-ba-quan.md`.
 *
 * Bàn 9 điểm, mỗi bên 3 quân, hai giai đoạn: **thả** 6 nước đầu rồi **đi**
 * từng quân sang điểm kề trống. Không ăn quân bao giờ — bàn luôn có đúng 6
 * quân sau giai đoạn thả.
 *
 * Hoà có hai đường, và cả hai đều phải nằm trong state vì `outcome()` chỉ
 * được nhìn state:
 * - lặp thế 3 lần với cùng bên đi — `seen` đếm mọi thế đã qua, khoá là bàn
 *   cộng bên đi;
 * - 30 nước liên tiếp không ai thắng — `quiet` đếm từ khi hết giai đoạn thả
 *   (trước đó ván nào cũng "không ai thắng" mà không phải lỗi của ai).
 */

export interface BaQuanState extends BaseState {
  /** -1 trống, còn lại là số ghế. Ô `i = r*3 + c`. */
  cells: number[];
  seats: Seat[];
  toMove: Seat;
  /** Số quân mỗi ghế đã thả: [ghế 0, ghế 1]. Cả hai đủ 3 là sang giai đoạn đi. */
  placed: [number, number];
  winner: Seat | null;
  winLine: number[] | null;
  /** Ván hoà, và hoà vì đường nào. */
  drawn: boolean;
  drawWhy: 'lap-the' | 'ba-muoi-nuoc' | null;
  /** Nước đi liên tiếp ở giai đoạn đi mà chưa ai thắng. */
  quiet: number;
  /** Số lần mỗi thế (bàn + bên đi) đã xuất hiện, tính cả thế hiện tại. */
  seen: Record<string, number>;
  last: { f: number; t: number } | null;
}

export interface BaQuanAction {
  /** Điểm đi; `-1` ở giai đoạn thả (quân từ tay, chưa có điểm đi). */
  f: number;
  /** Điểm đến. */
  t: number;
}

export interface BaQuanView {
  cells: number[];
  toMove: Seat;
  placed: [number, number];
  winner: Seat | null;
  winLine: number[] | null;
  drawn: boolean;
  last: { f: number; t: number } | null;
  yourSeat: Seat | 'spectator';
}

export type BaQuanEvent =
  | { t: 'place'; seat: Seat; at: number }
  | { t: 'move'; seat: Seat; f: number; t2: number }
  | { t: 'win'; seat: Seat; line: number[] }
  | { t: 'draw'; why: 'lap-the' | 'ba-muoi-nuoc' };

/** Tám hàng thắng: 3 ngang, 3 dọc, 2 chéo. */
export const LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Kề: ngang, dọc, và chéo **qua điểm giữa** — đường chéo chỉ có ở hai đường
 * chéo lớn, nên góc kề cạnh và tâm, cạnh kề hai góc và tâm, tâm kề tất cả.
 */
export const ADJ: number[][] = [
  [1, 3, 4],
  [0, 2, 4],
  [1, 5, 4],
  [0, 6, 4],
  [0, 1, 2, 3, 5, 6, 7, 8],
  [2, 8, 4],
  [3, 7, 4],
  [6, 8, 4],
  [5, 7, 4],
];

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

export function lineAt(cells: number[], seat: Seat): number[] | null {
  for (const line of LINES) {
    if (line.every((i) => cells[i] === seat)) return [...line];
  }
  return null;
}

export const posKey = (cells: number[], toMove: Seat): string => `${cells.map((v) => (v < 0 ? '.' : v)).join('')}|${toMove}`;

/** Ván đã xong chưa, và xong thế nào — nguồn duy nhất cho turn/outcome. */
function ended(s: BaQuanState): boolean {
  return s.winner !== null || s.drawn;
}

export const baQuanEngine: Engine<BaQuanState, BaQuanAction, BaQuanView, BaQuanEvent> = {
  spec: {
    id: 'co-ba-quan',
    nameVi: 'Cờ Ba Quân',
    nameEn: "Three Men's Morris",
    taglineVi: 'Chín điểm, ba quân mỗi bên — xếp ba quân thành hàng là thắng',
    minSeats: 2,
    maxSeats: 2,
    usesChance: false,
    hiddenInfo: false,
    realtime: false,
    defaultClock: { initialMs: 3 * 60_000, incrementMs: 3_000, graceMs: 1_500 },
    variant: 'standard',
  } satisfies GameSpec,
  version: 1,
  ruleHash: 'ba-quan-v1',

  init(seats) {
    const cells = new Array<number>(9).fill(-1);
    const first = seats[0] as Seat;
    return {
      ply: 0,
      rngCursor: 0,
      cells,
      seats: [...seats],
      toMove: first,
      placed: [0, 0],
      winner: null,
      winLine: null,
      drawn: false,
      drawWhy: null,
      quiet: 0,
      seen: { [posKey(cells, first)]: 1 },
      last: null,
    };
  },

  turn(s) {
    if (ended(s)) return { kind: 'over' };
    // Đến lượt mà không còn nước đi là thua ngay — outcome() xử, ở đây chỉ
    // cần đừng treo ván: không nước đi thì ván coi như đã xong.
    if (!this.legal(s, s.toMove).length) return { kind: 'over' };
    return { kind: 'seat', seat: s.toMove };
  },

  legal(s, seat) {
    if (ended(s) || seat !== s.toMove) return [];
    const out: BaQuanAction[] = [];
    if (s.placed[seat]! < 3) {
      for (let i = 0; i < 9; i++) if (s.cells[i] === -1) out.push({ f: -1, t: i });
      return out;
    }
    for (let f = 0; f < 9; f++) {
      if (s.cells[f] !== seat) continue;
      for (const t of ADJ[f]!) if (s.cells[t] === -1) out.push({ f, t });
    }
    return out;
  },

  isLegalFast(s, seat, a) {
    if (ended(s) || seat !== s.toMove || !a) return false;
    if (!Number.isInteger(a.t) || a.t < 0 || a.t > 8 || s.cells[a.t] !== -1) return false;
    if (s.placed[seat]! < 3) return a.f === -1;
    return Number.isInteger(a.f) && s.cells[a.f] === seat && (ADJ[a.f]?.includes(a.t) ?? false);
  },

  reduce(s, seat, a) {
    if (!this.isLegalFast!(s, seat, a)) throw new Error('ILLEGAL_MOVE');
    const cells = s.cells.slice();
    const placing = s.placed[seat]! < 3;
    if (!placing) cells[a.f] = -1;
    cells[a.t] = seat;
    const placed: [number, number] = [...s.placed] as [number, number];
    if (placing) placed[seat] = placed[seat]! + 1;
    const next: BaQuanState = {
      ...s,
      cells,
      placed,
      ply: s.ply + 1,
      toMove: other(seat),
      last: { f: a.f, t: a.t },
      quiet: placing ? 0 : s.quiet + 1,
    };
    const line = lineAt(cells, seat);
    if (line) {
      next.winner = seat;
      next.winLine = line;
      return next;
    }
    // Bên sắp đi mà không còn nước đi thì thua — ghi luôn vào state để
    // outcome() không phải tự suy khác đi.
    if (!this.legal(next, next.toMove).length && next.placed[next.toMove]! >= 3) {
      next.winner = seat;
      return next;
    }
    const key = posKey(cells, next.toMove);
    const seen = { ...s.seen, [key]: (s.seen[key] ?? 0) + 1 };
    next.seen = seen;
    if ((seen[key] ?? 0) >= 3) {
      next.drawn = true;
      next.drawWhy = 'lap-the';
    } else if (next.quiet >= 30) {
      next.drawn = true;
      next.drawWhy = 'ba-muoi-nuoc';
    }
    return next;
  },

  view(s, viewer): SeatView<BaQuanView, BaQuanEvent> {
    const events: BaQuanEvent[] = [];
    if (s.last) {
      const seat = s.cells[s.last.t] as Seat;
      events.push(
        s.last.f < 0
          ? { t: 'place', seat, at: s.last.t }
          : { t: 'move', seat, f: s.last.f, t2: s.last.t },
      );
    }
    if (s.winner !== null && s.winLine) events.push({ t: 'win', seat: s.winner, line: s.winLine });
    if (s.drawn && s.drawWhy) events.push({ t: 'draw', why: s.drawWhy });
    return {
      ply: s.ply,
      v: {
        cells: s.cells,
        toMove: s.toMove,
        placed: s.placed,
        winner: s.winner,
        winLine: s.winLine,
        drawn: s.drawn,
        last: s.last,
        yourSeat: viewer,
      },
      events,
    };
  },

  outcome(s): Outcome | null {
    if (s.winner !== null) {
      const loser = other(s.winner);
      const blocked = s.winLine === null;
      return {
        winner: s.winner,
        reason: blocked ? 'đối thủ không còn nước đi' : 'ba quân thành hàng',
        placements: [
          { seat: s.winner, place: 1, score: 1 },
          { seat: loser, place: 2, score: 0 },
        ],
      };
    }
    if (s.drawn) {
      return {
        winner: null,
        reason: s.drawWhy === 'lap-the' ? 'lặp thế ba lần' : '30 nước không ai thắng',
        placements: s.seats.map((seat) => ({ seat, place: 1, score: 0 })),
      };
    }
    return null;
  },

  encode(s) {
    return JSON.stringify(s);
  },

  decode(x) {
    return JSON.parse(x) as BaQuanState;
  },
};
