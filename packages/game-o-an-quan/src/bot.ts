import type { Bot, BotLevel, Rng, Seat } from '@co/core';
import { makeRng } from '@co/core';
import {
  OWN_CELLS,
  projectedScores,
  quanEngine,
  sideOf,
  type QuanAction,
  type QuanState,
} from './engine.js';

/**
 * Bot ô ăn quan — minimax alpha-beta trên chính engine.
 *
 * Bot **gọi đúng `reduce` của engine**, không mô phỏng luật riêng. Đây là
 * lỗi tốn thời gian nhất ở game này: hai bản cài luật rải sẽ lệch nhau ở
 * một tình huống biên nào đó, rồi bot đề xuất nước mà máy chủ từ chối.
 *
 * Hệ số phân nhánh chỉ 10 (5 ô × 2 chiều) nên tìm sâu 4–6 tầng là chuyện
 * nhẹ nhàng — đây là game dễ làm bot mạnh nhất trong chín bộ.
 */

const WIN = 1_000_000;

/**
 * Lượng giá, đơn vị là **điểm dân**, để so trực tiếp với điểm thật.
 *
 * Hai chỗ phải có, thiếu là bot chơi rất phản cảm:
 *
 * - **Dân còn trên bàn có giá.** Thiếu vế này bot ăn con quan trần trụi
 *   ngay nước sáu, kết thúc ván khi đang dẫn 12–3 mà đối phương còn 28 dân
 *   trên bàn, rồi thu quân xong thua ngược. Nhìn như bot tự sát.
 * - **Sắp hết quan thì dân trên bàn đáng giá hơn.** Còn một con quan nghĩa
 *   là ván sắp đóng, nên dân đang nằm sẵn ở sân mình gần như đã là điểm.
 */
function evaluate(s: QuanState, side: number): number {
  const other = 1 - side;
  const [p0, p1] = projectedScores(s);
  const projected = side === 0 ? p0 - p1 : p1 - p0;

  let mine = 0;
  let theirs = 0;
  for (const i of OWN_CELLS[side]!) mine += s.cells[i]!.dan;
  for (const i of OWN_CELLS[other]!) theirs += s.cells[i]!.dan;

  const quanLeft = (s.cells[0]!.quan ? 1 : 0) + (s.cells[6]!.quan ? 1 : 0);
  const w = quanLeft <= 1 ? 0.9 : 0.55;
  return projected + (mine - theirs) * w;
}

function search(s: QuanState, side: number, depth: number, alpha: number, beta: number, deadline: number, nodes: { n: number }): number {
  const done = quanEngine.outcome(s);
  if (done) {
    const [p0, p1] = projectedScores(s);
    const diff = side === 0 ? p0 - p1 : p1 - p0;
    // Cộng `depth` vào điểm thắng để bot kết thúc nhanh, trừ vào điểm thua
    // để bot kéo dài. Không có vế này thì bot đang thua chắc sẽ chọn nước
    // đầu tiên trong danh sách, trông như bỏ cuộc một cách kỳ quặc.
    return diff >= 0 ? WIN + diff + depth : -WIN + diff - depth;
  }
  if (depth === 0) return evaluate(s, side);
  // Đếm nút rồi mới xem đồng hồ: gọi Date.now() ở mỗi nút ăn mất một phần
  // năm thời gian tìm kiếm.
  if ((++nodes.n & 1023) === 0 && Date.now() > deadline) return evaluate(s, side);

  const mover = s.toMove;
  const moverSide = sideOf(s, mover);
  const moves = quanEngine.legal(s, mover);
  if (moves.length === 0) return evaluate(s, side);

  let best = moverSide === side ? -Infinity : Infinity;
  for (const mv of moves) {
    const next = quanEngine.reduce(s, mover, mv, makeRng('bot', s.rngCursor));
    const v = search(next, side, depth - 1, alpha, beta, deadline, nodes);
    if (moverSide === side) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }
  return best;
}

export const quanBot: Bot<QuanState, QuanAction> = {
  gameId: 'o-an-quan',
  lane: 'fast',

  pick(s, seat, level: BotLevel, rng: Rng, budgetMs: number): QuanAction {
    const moves = quanEngine.legal(s, seat);
    if (moves.length === 0) throw new Error('KHONG_CO_NUOC_DI');
    if (moves.length === 1) return moves[0]!;
    const side = sideOf(s, seat);

    // Mức Dễ: ưu tiên nước ăn được nhưng vẫn hay đi lung tung. Chỉ giảm độ
    // sâu là chưa đủ yếu — depth 2 đã đủ thắng đa số người mới.
    if (level === 1) {
      if (rng.next() < 0.45) return moves[rng.int(moves.length)]!;
      let best = moves[0]!;
      let bestGain = -Infinity;
      for (const mv of rng.shuffle([...moves])) {
        const next = quanEngine.reduce(s, seat, mv, makeRng('e', s.rngCursor));
        const gain = next.capturedDan[side]! - s.capturedDan[side]! + (next.capturedQuan[side]! - s.capturedQuan[side]!) * s.cfg.quanValue;
        if (gain > bestGain) {
          bestGain = gain;
          best = mv;
        }
      }
      return best;
    }

    const depth = level === 2 ? 3 : 6;
    const deadline = Date.now() + Math.max(20, budgetMs);
    const nodes = { n: 0 };
    let best = moves[0]!;
    let bestScore = -Infinity;
    for (const mv of rng.shuffle([...moves])) {
      const next = quanEngine.reduce(s, seat, mv, makeRng('b', s.rngCursor));
      const v = search(next, side, depth - 1, -Infinity, Infinity, deadline, nodes);
      if (v > bestScore) {
        bestScore = v;
        best = mv;
      }
      if (Date.now() > deadline) break;
    }
    return best;
  },
};
