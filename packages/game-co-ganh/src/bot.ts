import type { Bot, BotLevel, Rng, Seat } from '@co/core';
import { CELLS, NB } from './board.js';
import { applyMove, countOf, movesOn, type GanhAction, type GanhConfig, type GanhState } from './engine.js';

/**
 * Bot cờ gánh — minimax alpha-beta.
 *
 * Khác caro: bàn chỉ 25 điểm, hệ số phân nhánh trung bình 12,4 và tối đa 35,
 * nên tìm kiếm thật sự chạy được trong ngân sách vài chục mili giây. Mà cũng
 * **bắt buộc** phải tìm kiếm: chấm điểm một nước theo hình cục bộ như caro sẽ
 * hỏng ngay ở luật mở, vì cả ý nghĩa của nước thí hai quân chỉ hiện ra ở nước
 * sau. Bot không nhìn trước hai tầng thì không bao giờ hiểu nổi cú thí.
 */

/**
 * Trọng số vị trí = bậc của điểm trong đồ thị kề.
 *
 * Điểm 8 hướng (tâm và bốn điểm chéo trong) vừa đi được nhiều hướng vừa gánh
 * được nhiều cặp; bốn góc chỉ 3 hướng và **không bao giờ gánh được**.
 */
const WEIGHT = (() => {
  const w = new Array<number>(CELLS);
  for (let i = 0; i < CELLS; i++) w[i] = NB[i]!.length;
  return w;
})();

/**
 * Lượng giá theo góc nhìn của `me`.
 *
 * Quân là tất cả — thắng nghĩa là chiếm hết 16 quân — nên chênh lệch quân ăn
 * đứt mọi yếu tố khác. Vị trí và khả năng đi chỉ là tie-break giữa những nước
 * ngang nhau về quân.
 */
function evaluate(board: readonly number[], me: Seat, opp: Seat): number {
  let material = 0;
  let position = 0;
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === me) {
      material += 1;
      position += WEIGHT[i]!;
    } else if (board[i] === opp) {
      material -= 1;
      position -= WEIGHT[i]!;
    }
  }
  return material * 1000 + position * 3;
}

const WIN = 1_000_000;

function search(
  board: readonly number[],
  toMove: Seat,
  me: Seat,
  opp: Seat,
  forcedTo: number[] | null,
  depth: number,
  alpha: number,
  beta: number,
  cfg: Required<GanhConfig>,
  deadline: number,
): number {
  if (countOf(board, opp) === 0) return WIN - (10 - depth);
  if (countOf(board, me) === 0) return -WIN + (10 - depth);
  if (depth === 0 || Date.now() > deadline) return evaluate(board, me, opp);

  const mover = toMove;
  const next = mover === me ? opp : me;
  const moves = movesOn(board, mover, forcedTo);
  if (moves.length === 0) return evaluate(board, me, opp);

  let best = mover === me ? -Infinity : Infinity;
  for (const mv of moves) {
    const r = applyMove(board, mv, mover, next, cfg);
    const v = search(r.board, next, me, opp, r.forcedTo, depth - 1, alpha, beta, cfg, deadline);
    if (mover === me) {
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

export const ganhBot: Bot<GanhState, GanhAction> = {
  gameId: 'co-ganh',
  lane: 'fast',

  pick(s, seat, level: BotLevel, rng: Rng, budgetMs: number): GanhAction {
    const opp = s.seats[0] === seat ? s.seats[1]! : s.seats[0]!;
    const moves = movesOn(s.board, seat, s.forcedTo);
    if (moves.length === 0) throw new Error('KHONG_CO_NUOC_DI');
    if (moves.length === 1) return moves[0]!;

    // Mức Dễ: đi gần như ngẫu nhiên, nhưng không bỏ qua nước ăn được quân
    // ngay trước mắt. Bot dễ mà không bao giờ ăn thì người mới không học
    // được cơ chế gánh.
    if (level === 1) {
      const greedy = moves.filter((m) => applyMove(s.board, m, seat, opp, s.cfg).flipped.length > 0);
      const pool = greedy.length && rng.next() < 0.5 ? greedy : moves;
      return pool[rng.int(pool.length)]!;
    }

    const depth = level === 2 ? 2 : 4;
    const deadline = Date.now() + Math.max(10, budgetMs);
    let best: GanhAction = moves[0]!;
    let bestScore = -Infinity;
    // Xáo trước khi duyệt: nhiều nước ngang điểm nhau ở thế mở ván, không
    // xáo thì bot luôn đi đúng một nước và ván nào cũng giống ván nào.
    for (const mv of rng.shuffle([...moves])) {
      const r = applyMove(s.board, mv, seat, opp, s.cfg);
      const v = search(r.board, opp, seat, opp, r.forcedTo, depth - 1, -Infinity, Infinity, s.cfg, deadline);
      if (v > bestScore) {
        bestScore = v;
        best = mv;
      }
      if (Date.now() > deadline) break;
    }
    return best;
  },
};
