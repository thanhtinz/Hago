import type { Bot, BotLevel, Rng, Seat } from '@co/core';
import { flipsFor, movesFor, countsOf, N, type LatAction, type LatState } from './engine.js';

/**
 * Bot cờ lật — phải biết điều mà trực giác người mới biết ngược: **ăn nhiều
 * quân ở giữa ván là xấu** (mục 8 của `docs/rules/co-lat.md`).
 *
 * - Mức Dễ chấm bằng số quân ăn được — và do đó chơi sai một cách tự nhiên,
 *   giống người mới. Đó là cố ý, không phải bot yếu vì cẩu thả.
 * - Mức Vừa: tìm kiếm nông với điểm vị trí (góc áp đảo, ô X / ô C âm nặng)
 *   cộng tính cơ động.
 * - Mức Khó: tìm sâu hơn, và từ 12 ô trống cuối thì **vét cạn tới hết ván**
 *   chấm bằng hiệu số quân thật — giai đoạn mà số quân mới là thứ đáng đếm.
 */

const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

/** Điểm thế cờ theo góc nhìn của `seat`. Số quân chỉ nặng ở cuối ván. */
function evaluate(cells: number[], seat: Seat, empties: number): number {
  const foe = other(seat);
  let score = 0;
  for (let i = 0; i < 64; i++) {
    if (cells[i] === seat) score += WEIGHTS[i]!;
    else if (cells[i] === foe) score -= WEIGHTS[i]!;
  }
  const myMoves = movesFor(cells, seat).length;
  const foeMoves = movesFor(cells, foe).length;
  score += (myMoves - foeMoves) * 6;
  if (empties <= 12) {
    const [a, b] = countsOf(cells);
    score += (seat === 0 ? a - b : b - a) * (13 - empties);
  }
  return score;
}

/** Đặt thử một quân lên bản sao của bàn. */
function placed(cells: number[], i: number, seat: Seat): number[] {
  const flips = flipsFor(cells, Math.floor(i / N), i % N, seat);
  const next = cells.slice();
  next[i] = seat;
  for (const f of flips) next[f] = seat;
  return next;
}

/** Negamax với cắt tỉa alpha-beta. Bên không có nước thì mất lượt trong cây. */
function search(cells: number[], seat: Seat, depth: number, alpha: number, beta: number, empties: number): number {
  const moves = movesFor(cells, seat);
  if (!moves.length) {
    const foe = other(seat);
    if (!movesFor(cells, foe).length) {
      const [a, b] = countsOf(cells);
      return (seat === 0 ? a - b : b - a) * 100;
    }
    return -search(cells, foe, depth - 1, -beta, -alpha, empties);
  }
  if (depth === 0) return evaluate(cells, seat, empties);
  // Sắp nước theo điểm vị trí giảm dần: nước tốt xét trước thì cắt tỉa
  // alpha-beta mới cắt được nhiều, cây tìm kiếm co lại thấy rõ.
  moves.sort((a, b) => WEIGHTS[b]! - WEIGHTS[a]!);
  let best = -Infinity;
  for (const m of moves) {
    const v = -search(placed(cells, m, seat), other(seat), depth - 1, -beta, -alpha, empties - 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export const latBot: Bot<LatState, LatAction> = {
  gameId: 'co-lat',
  lane: 'fast',

  pick(s, seat, level: BotLevel, rng: Rng): LatAction {
    const moves = movesFor(s.cells, seat);
    const toAction = (i: number): LatAction => ({ r: Math.floor(i / N), c: i % N });
    // movesFor không rỗng khi bot được gọi: turn() đã lọc bên mất lượt rồi.
    const first = moves[0] ?? 0;

    if (level === 1) {
      // Ăn được nhiều nhất, cộng chút ngẫu nhiên — lối chơi của người mới.
      let best = first;
      let bestScore = -Infinity;
      for (const m of moves) {
        const score = flipsFor(s.cells, Math.floor(m / N), m % N, seat).length + rng.next() * 1.5;
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
      return toAction(best);
    }

    const empties = 64 - s.filled;
    // Cuối ván thì vét cạn: ở mức Khó là từ 10 ô trống, mức Vừa từ 8.
    // Sâu hơn thế ở giữa ván là cây nước đi nổ tung mà bot vẫn phải trả lời
    // trong ngân sách của hàng đợi nhanh — độ sâu 4 kèm cắt tỉa và sắp xếp
    // nước theo điểm vị trí là mức sâu nhất còn giữ được nhịp đó.
    const solveFrom = level === 3 ? 10 : 8;
    const depth = empties <= solveFrom ? empties : level === 3 ? 5 : 4;
    let best = first;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    for (const m of moves) {
      const v = -search(placed(s.cells, m, seat), other(seat), depth - 1, -Infinity, -alpha, empties - 1);
      // Nhiễu rất nhỏ ở mức Vừa để hai ván không lặp lại y hệt.
      const score = v + (level === 2 ? rng.next() * 0.01 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
      if (v > alpha) alpha = v;
    }
    return toAction(best);
  },
};
