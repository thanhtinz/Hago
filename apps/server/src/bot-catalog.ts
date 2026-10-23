import type { BaseState, Bot } from '@co/core';
import { caroBot } from '@co/game-co-caro';
import { ganhBot } from '@co/game-co-ganh';
import { quanBot } from '@co/game-o-an-quan';
import { latBot } from '@co/game-co-lat';
import { baQuanBot } from '@co/game-co-ba-quan';
import { hexBot } from '@co/game-co-hex';

/**
 * Nơi duy nhất máy chủ cắm bot vào — cặp song sinh của `catalog.ts`.
 *
 * `catalog.ts` đăng ký engine (trọng tài), tệp này đăng ký bot (một nguồn
 * input). Hai danh sách phải khớp nhau theo `gameId`: có engine mà không
 * có bot thì bộ môn đó không mở được ván với máy trên máy chủ, có bot mà
 * không có engine thì bot không có luật nào để đi qua cổng kiểm tra.
 *
 * Bot chạy trong worker (xem `bots.ts`), và tệp này được **worker** nạp —
 * không phải luồng chính. Luồng chính chỉ cần biết mỗi bộ môn thuộc làn
 * nào, và câu trả lời đó nằm ngay trên bot (`lane`), nên danh sách này
 * cũng là nguồn của bảng làn.
 */
export const BOTS = new Map<string, Bot<BaseState, unknown>>([
  [caroBot.gameId, caroBot as Bot<BaseState, unknown>],
  [ganhBot.gameId, ganhBot as Bot<BaseState, unknown>],
  [quanBot.gameId, quanBot as Bot<BaseState, unknown>],
  [latBot.gameId, latBot as Bot<BaseState, unknown>],
  [baQuanBot.gameId, baQuanBot as Bot<BaseState, unknown>],
  [hexBot.gameId, hexBot as Bot<BaseState, unknown>],
]);

export function botOf(gameId: string): Bot<BaseState, unknown> | undefined {
  return BOTS.get(gameId);
}
