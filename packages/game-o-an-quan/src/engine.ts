import type { BaseState, Engine, GameSpec, Outcome, Rng, Seat, SeatView, Turn, Viewer } from '@co/core';

/**
 * Ô Ăn Quan.
 *
 * Luật đầy đủ: `docs/rules/o-an-quan.md`.
 *
 * Bàn là một **vòng khép kín 12 ô**, đánh số 0..11 theo đúng hình học thật:
 * rải hết hàng dưới thì vào quan Đông, sang hàng trên đi ngược lại, rồi vào
 * quan Tây. Ô 0 và ô 6 là hai ô quan, không của riêng ai.
 *
 * Bốn chỗ hỏng game nếu cài sai, xếp theo mức chí mạng:
 *
 * 1. **Rải có bỏ quân vào ô quan.** Bỏ qua ô quan là phá nát chiến thuật
 *    "nuôi quan" — thứ làm nên toàn bộ chiều sâu của game — và người Việt
 *    nào từng chơi cũng nhận ra ngay trong ba nước.
 * 2. **Ô quan làm ô kế tiếp thì mất lượt, làm ô thứ hai thì ăn được.** Hai
 *    luật khác nhau ở cùng một ô. Nhầm cái nào cũng hỏng.
 * 3. **Ô quan đã bị ăn sạch là ô trống bình thường**, nhảy qua được, và vẫn
 *    tích dân tiếp, vẫn ăn được phần dân đó.
 * 4. **Vòng rải nối tiếp phải có chốt an toàn.** Sai một dấu `dir` là vòng
 *    lặp chạy vô hạn, và nó treo cả tiến trình chứ không riêng ván đó.
 */

export type Dir = 1 | -1;

export interface QuanCell {
  kind: 'dan' | 'quan';
  dan: number;
  quan: 0 | 1;
}

export interface QuanConfig {
  /** Một con quan đổi được bao nhiêu dân khi tính điểm. */
  quanValue?: number;
  danPerCell?: number;
  /** Cho chọn chiều rải ở mỗi nước, hay chốt một chiều cả ván. */
  freeDirection?: boolean;
  allowEatQuan?: boolean;
  /** Bật luật "quan non": không ăn ô quan có ít hơn chừng này dân. 0 là tắt. */
  quanNonThreshold?: number;
  /** Dân còn sót trong ô quan lúc thu quân thuộc về ai. */
  leftoverQuanCellDan?: 'conqueror' | 'split' | 'discard';
  /** Bao nhiêu nửa nước liên tiếp không ăn được gì thì hoà kỹ thuật. */
  noCaptureLimit?: number;
  maxPlies?: number;
}

export interface QuanState extends BaseState {
  cells: QuanCell[];
  seats: Seat[];
  toMove: Seat;
  /** Dân và quan đã ăn, theo chỉ số bên (0 hàng dưới, 1 hàng trên). */
  capturedDan: [number, number];
  capturedQuan: [number, number];
  /** Dân đã vay của đối phương để rải lại. Chỉ trừ khi tính điểm cuối ván. */
  debt: [number, number];
  /** Ai đã ăn con quan ở ô 0 và ô 6. */
  quanConqueror: [number | null, number | null];
  pliesSinceCapture: number;
  consecutivePasses: number;
  /** Chiều đã chốt, chỉ dùng khi `freeDirection` tắt. */
  lockedDir: Dir | null;
  /** Diễn biến của nước vừa rồi, để client chạy hoạt hoạ rải quân. */
  trail: QuanEvent[];
  ended: Outcome | null;
  cfg: Required<QuanConfig>;
}

export interface QuanAction {
  cell: number;
  dir: Dir;
}

export interface QuanView {
  cells: QuanCell[];
  toMove: Seat;
  capturedDan: [number, number];
  capturedQuan: [number, number];
  /** Điểm nếu thu quân ngay lúc này — để người chơi không bị bất ngờ. */
  projected: [number, number];
  yourSide: number;
  yourSeat: Seat | 'spectator';
  trail: QuanEvent[];
  winner: Seat | null;
}

export type QuanEvent =
  | { t: 'drop'; cell: number }
  | { t: 'relay'; cell: number; count: number }
  | { t: 'capture'; cell: number; dan: number; quan: number }
  | { t: 'lose'; reason: 'quan_occupied' | 'two_empty' | 'quan_protected' | 'quan_non' }
  | { t: 'refill'; side: number; own: number; borrowed: number }
  | { t: 'pass'; side: number };

const DEFAULTS: Required<QuanConfig> = {
  quanValue: 10,
  danPerCell: 5,
  freeDirection: true,
  allowEatQuan: true,
  quanNonThreshold: 0,
  leftoverQuanCellDan: 'conqueror',
  noCaptureLimit: 60,
  maxPlies: 400,
};

export const QUAN_CELLS = [0, 6];
export const OWN_CELLS: [number[], number[]] = [
  [1, 2, 3, 4, 5],
  [7, 8, 9, 10, 11],
];

const spec: GameSpec = {
  id: 'o-an-quan',
  nameVi: 'Ô Ăn Quan',
  nameEn: 'O An Quan',
  taglineVi: 'Rải sỏi từng ô, ăn quan, hết quan thì tàn dân',
  minSeats: 2,
  maxSeats: 2,
  usesChance: false,
  hiddenInfo: false,
  realtime: false,
  defaultClock: { initialMs: 10 * 60 * 1000, incrementMs: 5000, graceMs: 800 },
};

const step = (i: number, dir: Dir) => (i + dir + 12) % 12;
const isEmpty = (c: QuanCell) => c.dan === 0 && c.quan === 0;
const clone = (cs: QuanCell[]) => cs.map((c) => ({ ...c }));

export const sideOf = (s: QuanState, seat: Seat): number => (s.seats[0] === seat ? 0 : 1);
export const seatOf = (s: QuanState, side: number): Seat => s.seats[side]!;

/** Điểm hiện tại nếu thu quân ngay bây giờ. */
export function projectedScores(s: QuanState): [number, number] {
  const t = collect(clone(s.cells), [...s.capturedDan] as [number, number], [...s.capturedQuan] as [number, number], s);
  return [scoreOf(t, s, 0), scoreOf(t, s, 1)];
}

interface Purse {
  dan: [number, number];
  quan: [number, number];
}

/**
 * "Hết quan, tàn dân, thu quân, kéo về" — gom quân về khi ván kết thúc.
 *
 * Dân còn trong ô của ai thì về tay người ấy. Dân còn sót trong **ô quan**
 * thì luật dân gian im lặng, nên đây là luật nhà: về tay người đã ăn con
 * quan ở ô đó. Nếu ván kết thúc mà con quan vẫn còn trên bàn thì con quan
 * không tính cho ai, dân trong ô chia đôi, lẻ một quân thì bỏ.
 */
function collect(cells: QuanCell[], dan: [number, number], quan: [number, number], s: QuanState): Purse {
  const purse: Purse = { dan: [...dan] as [number, number], quan: [...quan] as [number, number] };
  for (const side of [0, 1]) {
    for (const i of OWN_CELLS[side]!) {
      purse.dan[side]! += cells[i]!.dan;
      cells[i]!.dan = 0;
    }
  }
  for (const [k, i] of QUAN_CELLS.entries()) {
    const cell = cells[i]!;
    if (cell.dan === 0) continue;
    const conqueror = s.quanConqueror[k] ?? null;
    const mode = cell.quan > 0 ? 'split' : s.cfg.leftoverQuanCellDan;
    if (mode === 'conqueror' && conqueror !== null) {
      purse.dan[conqueror]! += cell.dan;
    } else if (mode === 'split' || (mode === 'conqueror' && conqueror === null)) {
      const half = Math.floor(cell.dan / 2);
      purse.dan[0]! += half;
      purse.dan[1]! += half;
    }
    cell.dan = 0;
  }
  return purse;
}

function scoreOf(p: Purse, s: QuanState, side: number): number {
  const other = 1 - side;
  return p.dan[side]! - s.debt[side]! + s.debt[other]! + p.quan[side]! * s.cfg.quanValue;
}

function finish(s: QuanState, reason: string): Outcome {
  const cells = clone(s.cells);
  const purse = collect(cells, s.capturedDan, s.capturedQuan, s);
  const a = scoreOf(purse, s, 0);
  const b = scoreOf(purse, s, 1);
  // Hoà 35–35 xảy ra thật, đừng giả định lúc nào cũng có người thắng.
  const winner = a === b ? null : a > b ? seatOf(s, 0) : seatOf(s, 1);
  return {
    winner,
    reason,
    placements: [
      { seat: seatOf(s, 0), place: a === b ? 1 : a > b ? 1 : 2, score: a },
      { seat: seatOf(s, 1), place: a === b ? 1 : b > a ? 1 : 2, score: b },
    ],
  };
}

/**
 * Rải quân. Đây là toàn bộ luật chơi, viết đúng từng bước theo đặc tả.
 */
function applySow(s: QuanState, side: number, start: number, dir: Dir): { captured: boolean } {
  const cells = s.cells;
  const trail = s.trail;
  let hand = cells[start]!.dan;
  cells[start]!.dan = 0;
  let cur = start;
  let guard = 0;
  let captured = false;

  for (;;) {
    while (hand > 0) {
      cur = step(cur, dir);
      // Rải vào **mọi** ô, kể cả ô quan và ô của đối phương. Không có luật
      // bỏ qua ô nào, kể cả ô xuất phát khi vòng rải quay lại.
      cells[cur]!.dan += 1;
      hand--;
      trail.push({ t: 'drop', cell: cur });
      if (++guard > 5000) throw new Error('ENGINE_LOOP: vòng rải không dừng');
    }

    const next = cells[step(cur, dir)]!;
    const nextIdx = step(cur, dir);

    if (next.kind === 'dan' && next.dan > 0) {
      hand = next.dan;
      next.dan = 0;
      cur = nextIdx;
      trail.push({ t: 'relay', cell: nextIdx, count: hand });
      continue;
    }

    // Ô quan còn quân làm ô kế tiếp thì mất lượt. Đây là lý do nuôi quan an
    // toàn — và là luật hay bị nhầm với "không bao giờ ăn được quan".
    if (next.kind === 'quan' && (next.dan > 0 || next.quan > 0)) {
      trail.push({ t: 'lose', reason: 'quan_occupied' });
      break;
    }

    let target = step(nextIdx, dir);
    if (isEmpty(cells[target]!)) {
      trail.push({ t: 'lose', reason: 'two_empty' });
      break;
    }

    for (;;) {
      const cell = cells[target]!;
      if (cell.kind === 'quan') {
        if (!s.cfg.allowEatQuan) {
          trail.push({ t: 'lose', reason: 'quan_protected' });
          break;
        }
        if (s.cfg.quanNonThreshold > 0 && cell.quan > 0 && cell.dan < s.cfg.quanNonThreshold) {
          trail.push({ t: 'lose', reason: 'quan_non' });
          break;
        }
      }
      s.capturedDan[side]! += cell.dan;
      s.capturedQuan[side]! += cell.quan;
      if (cell.quan > 0) s.quanConqueror[target === 0 ? 0 : 1] = side;
      trail.push({ t: 'capture', cell: target, dan: cell.dan, quan: cell.quan });
      cell.dan = 0;
      cell.quan = 0;
      captured = true;

      const gap = step(target, dir);
      const nextTarget = step(gap, dir);
      if (isEmpty(cells[gap]!) && !isEmpty(cells[nextTarget]!)) {
        target = nextTarget;
        continue;
      }
      break;
    }
    break;
  }
  return { captured };
}

/**
 * Rải lại và vay quân khi một bên hết sạch dân, rồi xét kết thúc ván.
 *
 * Chạy ở **cuối** nước của đối phương chứ không ở đầu nước của mình: nếu
 * chạy muộn thì client hiện một hàng rỗng và người chơi tưởng máy treo.
 */
function normalize(s: QuanState): void {
  for (let round = 0; round < 4; round++) {
    if (s.ended) return;
    if (s.cells[0]!.quan === 0 && s.cells[6]!.quan === 0) {
      s.ended = finish(s, 'hết quan, tàn dân');
      return;
    }
    if (s.pliesSinceCapture >= s.cfg.noCaptureLimit) {
      s.ended = finish(s, `${s.cfg.noCaptureLimit} nửa nước không ai ăn được gì`);
      return;
    }
    if (s.ply >= s.cfg.maxPlies) {
      s.ended = finish(s, 'chạm trần số nước');
      return;
    }

    const side = sideOf(s, s.toMove);
    const own = OWN_CELLS[side]!;
    if (own.some((i) => s.cells[i]!.dan > 0)) return;

    const need = 5;
    const take = Math.min(need, s.capturedDan[side]!);
    s.capturedDan[side]! -= take;
    // Vay dân của đối phương. Nợ chỉ trừ khi tính điểm cuối ván, nên tổng
    // dân trên bàn cộng trong kho vẫn luôn đúng 50.
    const borrow = Math.min(need - take, s.capturedDan[1 - side]!);
    s.capturedDan[1 - side]! -= borrow;
    s.debt[side]! += borrow;
    const total = take + borrow;

    if (total === 0) {
      s.trail.push({ t: 'pass', side });
      s.consecutivePasses++;
      s.toMove = seatOf(s, 1 - side);
      if (s.consecutivePasses >= 2) {
        s.ended = finish(s, 'hai bên đều không còn quân để rải');
        return;
      }
      continue;
    }

    // Rải theo thứ tự chỉ số tăng dần, thiếu thì mấy ô cuối bỏ trống. Phải
    // tất định, không được rải ngẫu nhiên.
    for (let k = 0; k < total; k++) s.cells[own[k]!]!.dan += 1;
    s.trail.push({ t: 'refill', side, own: take, borrowed: borrow });
    s.consecutivePasses = 0;
    return;
  }
}

export const quanEngine: Engine<QuanState, QuanAction, QuanView, QuanEvent> = {
  spec,
  version: 1,
  ruleHash: 'o-an-quan/v1/quan10+freedir+conqueror',

  init(seats, config, rng) {
    const cfg = { ...DEFAULTS, ...((config ?? {}) as QuanConfig) };
    const cells: QuanCell[] = Array.from({ length: 12 }, (_, i) =>
      i === 0 || i === 6 ? { kind: 'quan', dan: 0, quan: 1 } : { kind: 'dan', dan: cfg.danPerCell, quan: 0 },
    );
    // Không có xúc xắc trong luật, nhưng vẫn bốc thăm ai đi trước bằng rng —
    // và vì thế seed phải nằm trong bản ghi ván, nếu không replay sẽ đổi
    // người đi trước và lệch toàn bộ.
    const first = rng.int(2);
    const s: QuanState = {
      ply: 0,
      rngCursor: rng.cursor,
      cells,
      seats: [...seats],
      toMove: seats[first]!,
      capturedDan: [0, 0],
      capturedQuan: [0, 0],
      debt: [0, 0],
      quanConqueror: [null, null],
      pliesSinceCapture: 0,
      consecutivePasses: 0,
      lockedDir: null,
      trail: [],
      ended: null,
      cfg,
    };
    normalize(s);
    return s;
  },

  turn(s) {
    return s.ended ? { kind: 'over' } : ({ kind: 'seat', seat: s.toMove } as Turn);
  },

  legal(s, seat) {
    if (s.ended || seat !== s.toMove) return [];
    const side = sideOf(s, seat);
    const dirs: Dir[] = s.cfg.freeDirection ? [1, -1] : [s.lockedDir ?? 1, s.lockedDir ?? -1];
    const uniq = s.cfg.freeDirection ? dirs : ([dirs[0]!] as Dir[]);
    const out: QuanAction[] = [];
    for (const cell of OWN_CELLS[side]!) {
      if (s.cells[cell]!.dan < 1) continue;
      for (const dir of uniq) out.push({ cell, dir });
    }
    return out;
  },

  isLegalFast(s, seat, a) {
    if (s.ended || seat !== s.toMove) return false;
    if (a.dir !== 1 && a.dir !== -1) return false;
    if (!s.cfg.freeDirection && s.lockedDir !== null && a.dir !== s.lockedDir) return false;
    const side = sideOf(s, seat);
    if (!OWN_CELLS[side]!.includes(a.cell)) return false;
    return s.cells[a.cell]!.dan >= 1;
  },

  reduce(s, seat, a, rng) {
    if (!this.isLegalFast!(s, seat, a)) throw new Error('NUOC_KHONG_HOP_LE');
    const side = sideOf(s, seat);
    const next: QuanState = {
      ...s,
      ply: s.ply + 1,
      rngCursor: rng.cursor,
      cells: clone(s.cells),
      capturedDan: [...s.capturedDan] as [number, number],
      capturedQuan: [...s.capturedQuan] as [number, number],
      debt: [...s.debt] as [number, number],
      quanConqueror: [...s.quanConqueror] as [number | null, number | null],
      lockedDir: s.cfg.freeDirection ? null : (s.lockedDir ?? a.dir),
      trail: [],
      ended: null,
    };
    const { captured } = applySow(next, side, a.cell, a.dir);
    next.pliesSinceCapture = captured ? 0 : s.pliesSinceCapture + 1;
    next.toMove = seatOf(next, 1 - side);
    normalize(next);
    return next;
  },

  view(s, viewer) {
    const projected = projectedScores(s);
    const yourSide = typeof viewer === 'number' && s.seats.includes(viewer) ? sideOf(s, viewer) : -1;
    return {
      ply: s.ply,
      v: {
        cells: clone(s.cells),
        toMove: s.toMove,
        capturedDan: [...s.capturedDan] as [number, number],
        capturedQuan: [...s.capturedQuan] as [number, number],
        projected,
        yourSide,
        yourSeat: viewer,
        trail: [...s.trail],
        winner: s.ended?.winner ?? null,
      },
      events: [...s.trail],
    };
  },

  outcome(s) {
    return s.ended;
  },

  encode(s) {
    const { ...rest } = s;
    return JSON.stringify(rest);
  },

  decode(x) {
    return JSON.parse(x) as QuanState;
  },
};
