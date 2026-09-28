import type { BaseState, GameId, Rng, Seat } from './types.js';

/**
 * Bot là **nguồn input bên ngoài**, không phải một đường đi tắt vào engine.
 *
 * Nước bot chọn đi qua đúng cổng như nước người: cùng kiểm tra hợp lệ, cùng
 * nonce, cùng input log. Khác biệt duy nhất là ai gõ. Và nước đã chọn được
 * **ghi thẳng vào log** chứ không ghi seed rồi tính lại (ràng buộc R9) — bot
 * dùng iterative deepening chặn bằng đồng hồ tường, nên cùng seed trên máy
 * đang tải nặng sẽ ra nước khác.
 */

export type BotLevel = 1 | 2 | 3;

export const BOT_LEVEL_NAME: Record<BotLevel, string> = {
  1: 'Dễ',
  2: 'Vừa',
  3: 'Khó',
};

/**
 * Hàng đợi bot tách theo chi phí. Gộp chung thì một ván cờ vây nghĩ 1,5 giây
 * làm 200 ván caro xếp hàng sau nó.
 */
export type BotLane = 'fast' | 'heavy';

export interface Bot<S extends BaseState, A> {
  readonly gameId: GameId;
  readonly lane: BotLane;
  /**
   * Chọn một nước. **Phải** trả về một nước có trong `engine.legal()` — lớp
   * gọi vẫn kiểm tra lại, và bot trả nước phạm luật là lỗi của bot.
   *
   * `budgetMs` là trần mềm; bot nên tự cắt tìm kiếm để không vượt.
   */
  pick(s: S, seat: Seat, level: BotLevel, rng: Rng, budgetMs: number): A;
}

/** Ngân sách suy nghĩ mặc định theo hàng đợi. */
export const BOT_BUDGET_MS: Record<BotLane, number> = { fast: 50, heavy: 900 };
