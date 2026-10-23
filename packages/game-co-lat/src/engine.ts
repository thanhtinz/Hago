import type { BaseState, Engine, GameSpec, Outcome, Seat, SeatView } from '@co/core';

/**
 * Cờ Lật (Othello) — luật World Othello Federation.
 *
 * Luật đầy đủ: `docs/rules/co-lat.md`. Ba chỗ hay cài sai, và cả ba đều nằm
 * trong `flipsFor()`:
 * - phải xét đủ **8 hướng** và lật **tất cả** các hướng thoả;
 * - dãy ở giữa phải **toàn** quân đối phương, có ô trống chen vào là đứt;
 * - quân vừa lật **không** kích hoạt lật dây chuyền.
 *
 * Bỏ lượt **không** phải một action: `turn()` nhìn thế cờ và trả về ghế thật
 * sự đi được (mục 4 của đặc tả). `toMove` trong state là ghế *trên danh
 * nghĩa* vừa được trao lượt; ghế hiệu lực tính lại từ bàn mỗi lần hỏi.
 */

export interface LatState extends BaseState {
  /** -1 trống, còn lại là số ghế. Ghế 0 = đen, đi trước. */
  cells: number[];
  seats: Seat[];
  /** Ghế được trao lượt gần nhất — ghế hiệu lực xem `sideToMove()`. */
  toMove: Seat;
  /** Ô vừa đặt, để client tô sáng. */
  last: number | null;
  /** Mọi ô vừa lật ở nước gần nhất, để client chạy hiệu ứng lật. */
  flipped: number[];
  filled: number;
}

export interface LatAction {
  r: number;
  c: number;
}

export interface LatView {
  cells: number[];
  toMove: Seat;
  last: number | null;
  flipped: number[];
  /** Số quân từng bên: [ghế 0, ghế 1]. */
  counts: [number, number];
  /** Các ô đặt được của bên đang đi — client vẽ chấm gợi ý từ đây. */
  moves: number[];
  winner: Seat | null;
  yourSeat: Seat | 'spectator';
}

export type LatEvent =
  | { t: 'place'; seat: Seat; r: number; c: number; flipped: number[] }
  | { t: 'pass'; seat: Seat }
  | { t: 'win'; seat: Seat };

const DIRS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export const N = 8;
const idx = (r: number, c: number) => r * N + c;
const inBoard = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

/**
 * Mọi ô sẽ lật nếu `seat` đặt vào `(r, c)`. Rỗng nghĩa là nước không hợp lệ.
 *
 * Chỉ đọc bàn hiện tại — quân lật trong lúc tính không được tính tiếp, nên
 * không có lật dây chuyền.
 */
export function flipsFor(cells: number[], r: number, c: number, seat: Seat): number[] {
  if (!inBoard(r, c) || cells[idx(r, c)] !== -1) return [];
  const foe = other(seat);
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const run: number[] = [];
    let rr = r + dr;
    let cc = c + dc;
    while (inBoard(rr, cc) && cells[idx(rr, cc)] === foe) {
      run.push(idx(rr, cc));
      rr += dr;
      cc += dc;
    }
    // Dãy địch phải khép lại bằng một quân của mình, ngay sau đó.
    if (run.length && inBoard(rr, cc) && cells[idx(rr, cc)] === seat) out.push(...run);
  }
  return out;
}

/** Mọi ô đặt được của một ghế. */
export function movesFor(cells: number[], seat: Seat): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) {
    if (cells[i] === -1 && flipsFor(cells, Math.floor(i / N), i % N, seat).length) out.push(i);
  }
  return out;
}

/**
 * Ghế thật sự đi được, tính từ bàn (R5). `null` là ván xong: cả hai bên đều
 * không còn nước — không nhất thiết phải đầy bàn.
 */
export function sideToMove(s: LatState): Seat | null {
  if (movesFor(s.cells, s.toMove).length) return s.toMove;
  const foe = other(s.toMove);
  if (movesFor(s.cells, foe).length) return foe;
  return null;
}

export function countsOf(cells: number[]): [number, number] {
  let a = 0;
  let b = 0;
  for (const v of cells) {
    if (v === 0) a++;
    else if (v === 1) b++;
  }
  return [a, b];
}

export const latEngine: Engine<LatState, LatAction, LatView, LatEvent> = {
  spec: {
    id: 'co-lat',
    nameVi: 'Cờ Lật',
    nameEn: 'Othello',
    taglineVi: 'Kẹp quân địch giữa hai quân mình thì chúng lật sang màu mình',
    minSeats: 2,
    maxSeats: 2,
    usesChance: false,
    hiddenInfo: false,
    realtime: false,
    defaultClock: { initialMs: 5 * 60_000, incrementMs: 5_000, graceMs: 1_500 },
    variant: 'woc-standard',
  } satisfies GameSpec,
  version: 1,
  ruleHash: 'lat-woc-v1',

  init(seats) {
    const cells = new Array<number>(64).fill(-1);
    // Thế xuất phát theo đặc tả: chéo nhau ở bốn ô giữa.
    cells[idx(3, 3)] = 1;
    cells[idx(3, 4)] = 0;
    cells[idx(4, 3)] = 0;
    cells[idx(4, 4)] = 1;
    return {
      ply: 0,
      rngCursor: 0,
      cells,
      seats: [...seats],
      toMove: seats[0] as Seat,
      last: null,
      flipped: [],
      filled: 4,
    };
  },

  turn(s) {
    const seat = sideToMove(s);
    return seat === null ? { kind: 'over' } : { kind: 'seat', seat };
  },

  legal(s, seat) {
    if (sideToMove(s) !== seat) return [];
    return movesFor(s.cells, seat).map((i) => ({ r: Math.floor(i / N), c: i % N }));
  },

  isLegalFast(s, seat, a) {
    if (sideToMove(s) !== seat) return false;
    if (!Number.isInteger(a?.r) || !Number.isInteger(a?.c)) return false;
    return flipsFor(s.cells, a.r, a.c, seat).length > 0;
  },

  reduce(s, seat, a) {
    if (!this.isLegalFast!(s, seat, a)) throw new Error('ILLEGAL_MOVE');
    const flips = flipsFor(s.cells, a.r, a.c, seat);
    const cells = s.cells.slice();
    cells[idx(a.r, a.c)] = seat;
    for (const i of flips) cells[i] = seat;
    return {
      ...s,
      cells,
      ply: s.ply + 1,
      filled: s.filled + 1,
      last: idx(a.r, a.c),
      flipped: flips,
      // Trao lượt cho đối thủ; nếu họ không đi được, `sideToMove` tự trả
      // lượt lại cho mình — bỏ lượt không tốn một ply nào trong log.
      toMove: other(seat),
    };
  },

  view(s, viewer): SeatView<LatView, LatEvent> {
    const mover = sideToMove(s);
    const out = this.outcome(s);
    const events: LatEvent[] = [];
    if (s.last !== null) {
      const seat = s.cells[s.last] as Seat;
      events.push({ t: 'place', seat, r: Math.floor(s.last / N), c: s.last % N, flipped: s.flipped });
      // Nước đặt vừa rồi khiến đối thủ mất lượt: nói ra, nếu không client
      // chỉ thấy lượt quay lại mình mà không hiểu vì sao.
      if (mover === seat && out === null) events.push({ t: 'pass', seat: other(seat) });
    }
    if (out?.winner !== null && out?.winner !== undefined) events.push({ t: 'win', seat: out.winner });
    return {
      ply: s.ply,
      v: {
        cells: s.cells,
        toMove: mover ?? s.toMove,
        last: s.last,
        flipped: s.flipped,
        counts: countsOf(s.cells),
        moves: mover === null ? [] : movesFor(s.cells, mover),
        winner: out ? out.winner : null,
        yourSeat: viewer,
      },
      events,
    };
  },

  outcome(s): Outcome | null {
    if (sideToMove(s) !== null) return null;
    const [a, b] = countsOf(s.cells);
    const score = (seat: Seat) => (seat === 0 ? a : b);
    if (a === b) {
      return {
        winner: null,
        reason: `${a}–${b}`,
        placements: s.seats.map((seat) => ({ seat, place: 1, score: score(seat) })),
      };
    }
    const winner = (a > b ? 0 : 1) as Seat;
    const loser = other(winner);
    return {
      winner,
      // Đặc tả yêu cầu reason ghi tỉ số: đó là thứ người chơi muốn thấy.
      reason: `${Math.max(a, b)}–${Math.min(a, b)}`,
      placements: [
        { seat: winner, place: 1, score: score(winner) },
        { seat: loser, place: 2, score: score(loser) },
      ],
    };
  },

  encode(s) {
    return JSON.stringify(s);
  },

  decode(x) {
    return JSON.parse(x) as LatState;
  },
};
