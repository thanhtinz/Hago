import type { BaseState, Engine, GameSpec, Outcome, Seat, SeatView } from '@co/core';

/**
 * Cờ Hex — luật: `docs/rules/co-hex.md` (Hein 1942 / Nash 1948).
 *
 * Ba chỗ hay cài sai, và cả ba đều có test riêng:
 * - bảng kề thiếu hai hướng chéo `(r−1, c+1)` và `(r+1, c−1)` — bàn trông
 *   vẫn là Hex nhưng định lý Hex sụp đổ: bàn đầy mà không bên nào nối;
 * - luật đổi cài bằng cách đổi ghế thay vì đổi màu quân — đổi ghế làm hỏng
 *   log, đồng hồ và biên bản, nên ở đây quân đổi màu và **ghế 0 đi tiếp**;
 * - tưởng ván có thể hoà — không bao giờ. Bàn đầy thì đúng một bên đã nối,
 *   nên engine không có đường nào tuyên hoà cả.
 */

export interface HexConfig {
  /** Cạnh bàn. Mặc định 11; bàn nhỏ chỉ để kiểm chứng và dạy chơi. */
  size?: number;
}

export interface HexState extends BaseState {
  /** -1 trống, còn lại là số ghế. Ô `i = r*size + c`. Ghế 0 = Đỏ nối trên–dưới, ghế 1 = Xanh nối trái–phải. */
  cells: number[];
  seats: Seat[];
  size: number;
  toMove: Seat;
  /** Ô của nước gần nhất (cả nước đổi: ô của quân vừa đổi màu). */
  last: number | null;
  /** Nước gần nhất là đặt hay đổi — `view` sinh sự kiện từ đây. */
  lastKind: 'place' | 'swap' | null;
  winner: Seat | null;
  /** Một dải nối hoàn chỉnh của bên thắng, để client tô sáng. */
  winPath: number[] | null;
  /** Luật đổi đã dùng. Hết lượt đầu mà không đổi thì cơ hội tự mất theo `ply`. */
  swapUsed: boolean;
}

export interface HexAction {
  /** Ô đặt quân, `i = r*size + c`. Vắng mặt khi đây là nước đổi. */
  at?: number;
  /** `true` là nước đổi: nhận quân đầu tiên của đối thủ làm của mình. */
  swap?: boolean;
}

export interface HexView {
  cells: number[];
  size: number;
  toMove: Seat;
  last: number | null;
  winner: Seat | null;
  winPath: number[] | null;
  /** Bên tới lượt (ghế 1 ở nước thứ hai) có quyền đổi hay không. */
  canSwap: boolean;
  swapUsed: boolean;
  yourSeat: Seat | 'spectator';
}

export type HexEvent =
  | { t: 'place'; seat: Seat; at: number }
  | { t: 'swap'; seat: Seat; at: number }
  | { t: 'win'; seat: Seat; path: number[] };

export const DEFAULT_SIZE = 11;

/** Sáu hướng kề. Thiếu hai hướng chéo là biến Hex thành game khác. */
export const DIRS: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [-1, 1],
  [1, -1],
  [1, 0],
];

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

export function neighborsOf(i: number, size: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
  }
  return out;
}

/** Ghế 0 nối hàng 0 với hàng cuối; ghế 1 nối cột 0 với cột cuối. */
function touchesStart(i: number, size: number, seat: Seat): boolean {
  return seat === 0 ? Math.floor(i / size) === 0 : i % size === 0;
}
function touchesEnd(i: number, size: number, seat: Seat): boolean {
  return seat === 0 ? Math.floor(i / size) === size - 1 : i % size === size - 1;
}

/**
 * Kiểm thắng bằng union-find trên bốn nút ảo, như đặc tả mục 5: mỗi bên hai
 * nút cho hai bờ của mình. Quân không bao giờ bị nhấc lên nên hàm này chạy
 * lại từ đầu mỗi lần vẫn đúng — và ở bàn 121 ô nó rẻ tới mức không cần bộ
 * máy tăng dần nào phải mang theo trong state.
 *
 * Trả về bên thắng kèm **một** dải nối (tìm bằng BFS sau khi biết ai thắng),
 * hoặc `null`. Định lý Hex bảo đảm không bao giờ có cả hai bên cùng thắng.
 */
export function winnerOf(cells: number[], size: number): { winner: Seat; path: number[] } | null {
  const n = size * size;
  const parent = new Int32Array(n + 4);
  for (let i = 0; i < n + 4; i++) parent[i] = i;
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root]!;
    while (parent[x] !== root) {
      const next = parent[x]!;
      parent[x] = root;
      x = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const edgeNode = (seat: Seat, end: boolean) => n + seat * 2 + (end ? 1 : 0);

  for (let i = 0; i < n; i++) {
    const seat = cells[i];
    if (seat !== 0 && seat !== 1) continue;
    if (touchesStart(i, size, seat as Seat)) union(i, edgeNode(seat as Seat, false));
    if (touchesEnd(i, size, seat as Seat)) union(i, edgeNode(seat as Seat, true));
    for (const j of neighborsOf(i, size)) {
      if (j > i && cells[j] === seat) union(i, j);
    }
  }

  for (const seat of [0, 1] as Seat[]) {
    if (find(edgeNode(seat, false)) !== find(edgeNode(seat, true))) continue;
    return { winner: seat, path: connectionPath(cells, size, seat) };
  }
  return null;
}

/** Một dải nối cụ thể của `seat`, BFS từ mọi ô chạm bờ đầu tới bờ cuối. */
export function connectionPath(cells: number[], size: number, seat: Seat): number[] {
  const prev = new Map<number, number>();
  const queue: number[] = [];
  for (let i = 0; i < size * size; i++) {
    if (cells[i] === seat && touchesStart(i, size, seat)) {
      prev.set(i, -1);
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]!;
    if (touchesEnd(cur, size, seat)) {
      const path: number[] = [];
      let x = cur;
      while (x !== -1) {
        path.push(x);
        x = prev.get(x)!;
      }
      return path.reverse();
    }
    for (const j of neighborsOf(cur, size)) {
      if (cells[j] === seat && !prev.has(j)) {
        prev.set(j, cur);
        queue.push(j);
      }
    }
  }
  return [];
}

/** Ghế 1 ngay sau nước đầu tiên của ghế 0: quyền đổi còn nguyên. */
export function canSwap(s: HexState): boolean {
  return s.ply === 1 && s.winner === null && !s.swapUsed;
}

function sizeOf(config: HexConfig | undefined): number {
  const size = config?.size ?? DEFAULT_SIZE;
  if (!Number.isInteger(size) || size < 3 || size > 19) {
    throw new Error('BAD_CONFIG: size phải là số nguyên từ 3 tới 19');
  }
  return size;
}

export const hexEngine: Engine<HexState, HexAction, HexView, HexEvent> = {
  spec: {
    id: 'co-hex',
    nameVi: 'Cờ Hex',
    nameEn: 'Hex',
    taglineVi: 'Nối hai bờ của mình — không bao giờ có ván hoà',
    minSeats: 2,
    maxSeats: 2,
    usesChance: false,
    hiddenInfo: false,
    realtime: false,
    defaultClock: { initialMs: 10 * 60_000, incrementMs: 5_000, graceMs: 1_500 },
    variant: 'hex-swap',
  } satisfies GameSpec,
  version: 1,
  ruleHash: 'hex-v1',

  init(seats, config) {
    const size = sizeOf(config as HexConfig | undefined);
    return {
      ply: 0,
      rngCursor: 0,
      cells: new Array<number>(size * size).fill(-1),
      seats: [...seats],
      size,
      toMove: seats[0] as Seat,
      last: null,
      lastKind: null,
      winner: null,
      winPath: null,
      swapUsed: false,
    };
  },

  turn(s) {
    return s.winner !== null ? { kind: 'over' } : { kind: 'seat', seat: s.toMove };
  },

  legal(s, seat) {
    if (s.winner !== null || seat !== s.toMove) return [];
    const out: HexAction[] = [];
    if (canSwap(s) && seat === (s.seats[1] as Seat)) out.push({ swap: true });
    for (let i = 0; i < s.cells.length; i++) {
      if (s.cells[i] === -1) out.push({ at: i });
    }
    return out;
  },

  isLegalFast(s, seat, a) {
    if (s.winner !== null || seat !== s.toMove || !a || typeof a !== 'object') return false;
    if (a.swap === true) {
      // Nước đổi chỉ tồn tại đúng một lần, cho ghế 1, ngay sau nước đầu.
      return a.at === undefined && canSwap(s) && seat === (s.seats[1] as Seat);
    }
    if (!Number.isInteger(a.at)) return false;
    const at = a.at as number;
    return at >= 0 && at < s.cells.length && s.cells[at] === -1;
  },

  reduce(s, seat, a) {
    if (!this.isLegalFast!(s, seat, a)) throw new Error('ILLEGAL_MOVE');
    if (a.swap === true) {
      // Đổi màu quân, không đổi ghế: quân đầu tiên thành của ghế 1, ghế 0
      // đi tiếp. Log ghi đúng một nước đổi, đồng hồ trừ vào ghế 1.
      const cells = s.cells.slice();
      cells[s.last!] = seat;
      return {
        ...s,
        cells,
        ply: s.ply + 1,
        toMove: other(seat),
        lastKind: 'swap' as const,
        swapUsed: true,
      };
    }
    const at = a.at!;
    const cells = s.cells.slice();
    cells[at] = seat;
    const win = winnerOf(cells, s.size);
    return {
      ...s,
      cells,
      ply: s.ply + 1,
      toMove: other(seat),
      last: at,
      lastKind: 'place' as const,
      winner: win ? win.winner : null,
      winPath: win ? win.path : null,
    };
  },

  view(s, viewer): SeatView<HexView, HexEvent> {
    const out = this.outcome(s);
    const events: HexEvent[] = [];
    if (s.last !== null && s.lastKind === 'place') {
      events.push({ t: 'place', seat: s.cells[s.last] as Seat, at: s.last });
    }
    if (s.last !== null && s.lastKind === 'swap') {
      events.push({ t: 'swap', seat: s.cells[s.last] as Seat, at: s.last });
    }
    if (out?.winner !== null && out?.winner !== undefined) {
      events.push({ t: 'win', seat: out.winner, path: s.winPath ?? [] });
    }
    return {
      ply: s.ply,
      v: {
        cells: s.cells,
        size: s.size,
        toMove: s.toMove,
        last: s.last,
        winner: s.winner,
        winPath: s.winPath,
        canSwap: canSwap(s),
        swapUsed: s.swapUsed,
        yourSeat: viewer,
      },
      events,
    };
  },

  outcome(s): Outcome | null {
    if (s.winner === null) return null;
    const winner = s.winner;
    const loser = other(winner);
    const stones = (seat: Seat) => s.cells.reduce((n, c) => n + (c === seat ? 1 : 0), 0);
    return {
      winner,
      // Lý do trung lập: cùng một câu đọc được ở cả hai phía bàn.
      reason: 'Đã nối xong hai bờ',
      placements: [
        { seat: winner, place: 1, score: stones(winner) },
        { seat: loser, place: 2, score: stones(loser) },
      ],
    };
  },

  encode(s) {
    return JSON.stringify(s);
  },

  decode(x) {
    return JSON.parse(x) as HexState;
  },
};
