import { parentPort } from 'node:worker_threads';
import { makeRng, type Seat } from '@co/core';
import { botOf } from './bot-catalog.js';

/**
 * Đầu worker của hàng đợi bot — một worker cho mỗi làn.
 *
 * Việc của nó đúng một thứ: nhận một thế cờ, trả về một nước. Nó không
 * biết phòng nào, người nào, đồng hồ nào — mọi thứ đó ở lại luồng chính,
 * nơi nước bot chọn vẫn phải đi qua cổng `act()` như nước của người
 * (ràng buộc R9: nước đã chọn được ghi vào log, không ghi seed).
 *
 * Thế cờ đi qua dây bằng structured clone: state của engine là dữ liệu
 * thuần JSON nên clone là đủ, không cần `encode` — `encode` sinh ra để
 * lưu và phát lại, không phải để qua một sợi dây nội bộ.
 */

export interface BotJob {
  jobId: number;
  gameId: string;
  state: unknown;
  seat: Seat;
  level: 1 | 2 | 3;
  budgetMs: number;
  /** Hạt cho rng của bot: mã phòng + số ván + ply, để một ván có thể dựng lại cách bot đã nghĩ. */
  seed: string;
}

export interface BotJobResult {
  jobId: number;
  ok: boolean;
  action?: unknown;
  error?: string;
}

if (!parentPort) throw new Error('bot-worker phải chạy trong worker thread');
const port = parentPort;

port.on('message', (job: BotJob) => {
  const reply = (r: BotJobResult) => port.postMessage(r);
  const bot = botOf(job.gameId);
  if (!bot) return reply({ jobId: job.jobId, ok: false, error: `NO_BOT:${job.gameId}` });
  try {
    const rng = makeRng(job.seed, 0);
    const action = bot.pick(job.state as never, job.seat, job.level, rng, job.budgetMs);
    reply({ jobId: job.jobId, ok: true, action });
  } catch (e) {
    reply({ jobId: job.jobId, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
