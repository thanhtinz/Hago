import type { BaseState, Engine, GameSpec, Outcome, Rng, Seat, SeatView, Turn, Viewer } from '@co/core';

/**
 * Cờ Caro — biến thể Việt Nam.
 *
 * Luật đầy đủ: `docs/rules/co-caro.md`. Điểm khác caro quốc tế và là chỗ dễ
 * chép nhầm nhất: **chuỗi đúng 5 quân bị chặn cả hai đầu thì KHÔNG thắng**,
 * trong đó "chặn" gồm cả mép bàn, còn **chuỗi từ 6 quân trở lên thì luôn
 * thắng**. Code Renju trên mạng làm ngược lại ở vế thứ hai (overline là nước
 * cấm), nên chép về là sai luật ngay.
 */

export interface CaroConfig {
  size?: number;
  /** Luật chặn hai đầu. Tắt đi là thành caro tự do quốc tế. */
  blockedEnds?: boolean;
  /** Chuỗi từ 6 quân trở lên có thắng không. Mặc định có (khác Renju). */
  overlineWins?: boolean;
  /** Bắt nước đầu tiên phải đặt giữa bàn, giảm lợi thế của người đi trước. */
  centerOpening?: boolean;
}

export interface CaroState extends BaseState {
  size: number;
  /** -1 trống, còn lại là số ghế đã chiếm ô. */
  cells: number[];
  seats: Seat[];
  toMove: Seat;
  last: number | null;
  winner: Seat | null;
  /** Các ô làm nên chuỗi thắng, để client tô sáng. */
  winLine: number[] | null;
  filled: number;
  cfg: Required<CaroConfig>;
}

export interface CaroAction {
  r: number;
  c: number;
}

export interface CaroView {
  size: number;
  cells: number[];
  toMove: Seat;
  last: number | null;
  winner: Seat | null;
  winLine: number[] | null;
  yourSeat: Seat | 'spectator';
}

export type CaroEvent = { t: 'place'; seat: Seat; r: number; c: number } | { t: 'win'; seat: Seat; line: number[] };

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const defaults = (c: CaroConfig | undefined): Required<CaroConfig> => ({
  size: c?.size ?? 15,
  blockedEnds: c?.blockedEnds ?? true,
  overlineWins: c?.overlineWins ?? true,
  centerOpening: c?.centerOpening ?? false,
});

const inBoard = (r: number, c: number, n: number): boolean => r >= 0 && r < n && c >= 0 && c < n;

/**
 * Trả về chuỗi thắng nếu nước vừa đặt tại `(r, c)` thắng, ngược lại `null`.
 *
 * Chỉ cần xét quanh ô vừa đặt: mọi chuỗi mới xuất hiện đều phải chứa ô đó, và
 * vì chuỗi 5 hở một đầu thắng ngay khi hình thành nên không tồn tại trạng
 * thái "chuỗi chờ được công nhận".
 *
 * **Phải quét đủ cả bốn hướng.** Một nước có thể vừa tạo chuỗi ngang 5 bị
 * chặn hai đầu (không thắng) vừa tạo chuỗi chéo 5 hở một đầu (thắng) — thoát
 * sớm ở hướng đầu tiên là bỏ sót thế thắng.
 */
export function winLineAt(s: CaroState, r: number, c: number, seat: Seat): number[] | null {
  const n = s.size;
  const W = 5;
  for (const [dr, dc] of DIRS) {
    let back = 0;
    let rr = r - dr;
    let cc = c - dc;
    while (inBoard(rr, cc, n) && s.cells[rr * n + cc] === seat) {
      back++;
      rr -= dr;
      cc -= dc;
    }
    let fwd = 0;
    let r2 = r + dr;
    let c2 = c + dc;
    while (inBoard(r2, c2, n) && s.cells[r2 * n + c2] === seat) {
      fwd++;
      r2 += dr;
      c2 += dc;
    }

    const len = back + 1 + fwd;
    const collect = (): number[] => {
      const out: number[] = [];
      for (let k = -back; k <= fwd; k++) out.push((r + k * dr) * n + (c + k * dc));
      return out;
    };

    if (len > W) {
      if (s.cfg.overlineWins) return collect();
      continue;
    }
    if (len === W) {
      if (!s.cfg.blockedEnds) return collect();
      // "Hở" nghĩa là ô ngoài chuỗi nằm TRONG bàn và đang TRỐNG. Ra khỏi bàn
      // tính là bị chặn — đây là nửa luật hay bị bỏ quên.
      const openA = inBoard(rr, cc, n) && s.cells[rr * n + cc] === -1;
      const openB = inBoard(r2, c2, n) && s.cells[r2 * n + c2] === -1;
      if (openA || openB) return collect();
    }
  }
  return null;
}

export const caroEngine: Engine<CaroState, CaroAction, CaroView, CaroEvent> = {
  spec: {
    id: 'co-caro',
    nameVi: 'Cờ Caro',
    nameEn: 'Gomoku',
    taglineVi: 'Năm quân liền nhau, nhưng bị chặn hai đầu thì không tính',
    minSeats: 2,
    maxSeats: 2,
    usesChance: false,
    hiddenInfo: false,
    realtime: false,
    defaultClock: { initialMs: 5 * 60_000, incrementMs: 5_000, graceMs: 1_500 },
    variant: 'vn-blocked-ends',
  } satisfies GameSpec,
  version: 1,
  ruleHash: 'caro-vn-v1',

  init(seats, config) {
    const cfg = defaults(config as CaroConfig);
    return {
      ply: 0,
      rngCursor: 0,
      size: cfg.size,
      cells: new Array<number>(cfg.size * cfg.size).fill(-1),
      seats: [...seats],
      toMove: seats[0] as Seat,
      last: null,
      winner: null,
      winLine: null,
      filled: 0,
      cfg,
    };
  },

  turn(s) {
    if (s.winner !== null || s.filled === s.size * s.size) return { kind: 'over' };
    return { kind: 'seat', seat: s.toMove };
  },

  legal(s, seat) {
    if (s.winner !== null || seat !== s.toMove) return [];
    const n = s.size;
    if (s.cfg.centerOpening && s.filled === 0) {
      const m = Math.floor(n / 2);
      return [{ r: m, c: m }];
    }
    const out: CaroAction[] = [];
    for (let i = 0; i < s.cells.length; i++) {
      if (s.cells[i] === -1) out.push({ r: Math.floor(i / n), c: i % n });
    }
    return out;
  },

  /**
   * Bàn 15×15 có tới 225 ô, nên sinh toàn bộ `legal()` chỉ để kiểm tra một
   * nước là lãng phí thật sự. Đường nhanh này có fuzz test đối chiếu với
   * `legal()` trong `engine.test.ts` theo đúng ràng buộc R6.
   */
  isLegalFast(s, seat, a) {
    if (s.winner !== null || seat !== s.toMove) return false;
    const n = s.size;
    if (!Number.isInteger(a?.r) || !Number.isInteger(a?.c) || !inBoard(a.r, a.c, n)) return false;
    if (s.cells[a.r * n + a.c] !== -1) return false;
    if (s.cfg.centerOpening && s.filled === 0) {
      const m = Math.floor(n / 2);
      return a.r === m && a.c === m;
    }
    return true;
  },

  reduce(s, seat, a) {
    if (!this.isLegalFast!(s, seat, a)) throw new Error('ILLEGAL_MOVE');
    const n = s.size;
    const idx = a.r * n + a.c;
    const cells = s.cells.slice();
    cells[idx] = seat;
    const next: CaroState = {
      ...s,
      cells,
      ply: s.ply + 1,
      filled: s.filled + 1,
      last: idx,
      toMove: s.seats.find((x) => x !== seat) as Seat,
    };
    const line = winLineAt(next, a.r, a.c, seat);
    if (line) {
      next.winner = seat;
      next.winLine = line;
    }
    return next;
  },

  view(s, viewer): SeatView<CaroView, CaroEvent> {
    // Caro không có gì để giấu: bàn cờ công khai hoàn toàn. Nhưng vẫn đi qua
    // đúng cửa ải này để `events` không bao giờ có đường ra thứ hai.
    const events: CaroEvent[] = [];
    if (s.last !== null) {
      const seat = s.cells[s.last] as Seat;
      events.push({ t: 'place', seat, r: Math.floor(s.last / s.size), c: s.last % s.size });
    }
    if (s.winner !== null && s.winLine) events.push({ t: 'win', seat: s.winner, line: s.winLine });
    return {
      ply: s.ply,
      v: {
        size: s.size,
        cells: s.cells,
        toMove: s.toMove,
        last: s.last,
        winner: s.winner,
        winLine: s.winLine,
        yourSeat: viewer,
      },
      events,
    };
  },

  outcome(s): Outcome | null {
    if (s.winner !== null) {
      const loser = s.seats.find((x) => x !== s.winner) as Seat;
      return {
        winner: s.winner,
        reason: 'năm quân liền nhau',
        placements: [
          { seat: s.winner, place: 1, score: 1 },
          { seat: loser, place: 2, score: 0 },
        ],
      };
    }
    if (s.filled === s.size * s.size) {
      return {
        winner: null,
        reason: 'kín bàn',
        placements: s.seats.map((seat) => ({ seat, place: 1, score: 0 })),
      };
    }
    return null;
  },

  encode(s) {
    return JSON.stringify(s);
  },

  decode(x) {
    return JSON.parse(x) as CaroState;
  },
};

/** Tiện cho bot và test: mọi ô trống, ưu tiên quanh quân đã đặt. */
export function neighbourhood(s: CaroState, radius = 2): CaroAction[] {
  const n = s.size;
  if (s.filled === 0) {
    const m = Math.floor(n / 2);
    return [{ r: m, c: m }];
  }
  const keep = new Set<number>();
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] === -1) continue;
    const r0 = Math.floor(i / n);
    const c0 = i % n;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (inBoard(r, c, n) && s.cells[r * n + c] === -1) keep.add(r * n + c);
      }
    }
  }
  return [...keep].map((i) => ({ r: Math.floor(i / n), c: i % n }));
}

export function unusedRng(_rng: Rng): void {
  /* caro không dùng ngẫu nhiên; giữ chữ ký cho đồng bộ */
}

export type { Turn, Viewer };
