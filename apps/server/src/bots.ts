import { Worker } from 'node:worker_threads';
import { BOT_BUDGET_MS, makeRng, type BotLane, type BotLevel, type Seat } from '@co/core';
import { botOf } from './bot-catalog.js';
import type { BotJob, BotJobResult } from './bot-worker.js';

/**
 * Hàng đợi bot của máy chủ — hai làn tách theo chi phí, chạy ngoài vòng
 * lặp sự kiện (docs/ARCHITECTURE.md mục 4).
 *
 * Vì sao hai làn: gộp chung thì một ván Hex nghĩ gần một giây sẽ làm mọi
 * ván caro xếp hàng sau nó. Mỗi làn có **một worker riêng và một hàng
 * FIFO riêng** — trong một làn, các nước tính lần lượt (hai nước của cùng
 * một ván không bao giờ được tính chéo nhau), còn hai làn không chờ nhau.
 *
 * Vì sao worker: một bot nghĩ 1,5 giây trên luồng chính là 1,5 giây đồng
 * hồ của **mọi** ván trên máy chủ đứng yên. Bot là nguồn input bên ngoài,
 * nên chỗ của nó là một tiến trình con chỉ nhận thế cờ và trả nước đi.
 *
 * Lỗi không được phép làm đứng ván: worker chết hoặc quá hạn thì lời hứa
 * bị từ chối, và tầng phòng (`Rooms.maybeBot`) rơi về nước hợp lệ đầu
 * tiên. Ván đi tiếp bằng một nước dở còn hơn ván treo vì hạ tầng.
 */

export interface BotPickRequest {
  gameId: string;
  /** State **bên trong** lớp meta — đúng thứ bot của game đó nhận. */
  state: unknown;
  seat: Seat;
  level: BotLevel;
  seed: string;
}

interface QueuedJob {
  req: BotPickRequest;
  jobId: number;
  resolve: (a: unknown) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout | null;
}

interface LaneState {
  worker: Worker | null;
  queue: QueuedJob[];
  running: QueuedJob | null;
  /** Hỏng hẳn (không dựng được worker): chạy trong tiến trình, có cảnh báo. */
  inProcess: boolean;
  /** Xích hứa hẹn để các job trong-tiến-trình vẫn chạy lần lượt như có worker. */
  chain: Promise<unknown>;
}

export interface BotDispatcherOptions {
  /**
   * Chạy bot ngay trong tiến trình, không mở worker. Chỉ cho test và môi
   * trường không có worker thread — **không** dùng cho máy chủ thật, vì
   * nó đưa thời gian nghĩ của bot trở lại vòng lặp sự kiện.
   */
  inProcess?: boolean;
  /** Trần cứng cho một job, theo làn. Mặc định gấp đôi ngân sách mềm cộng hai giây. */
  hardTimeoutMs?: (lane: BotLane, budgetMs: number) => number;
}

const LANES: BotLane[] = ['fast', 'heavy'];

export class BotDispatcher {
  private readonly lanes = new Map<BotLane, LaneState>();
  private nextJobId = 1;
  private readonly hardTimeoutMs: (lane: BotLane, budgetMs: number) => number;
  private closed = false;

  constructor(private readonly opts: BotDispatcherOptions = {}) {
    this.hardTimeoutMs = opts.hardTimeoutMs ?? ((_lane, budgetMs) => budgetMs * 2 + 2000);
    for (const lane of LANES) {
      this.lanes.set(lane, {
        worker: null,
        queue: [],
        running: null,
        inProcess: opts.inProcess ?? false,
        chain: Promise.resolve(),
      });
    }
  }

  /** Bộ môn này có bot không, và bot của nó thuộc làn nào. */
  laneOf(gameId: string): BotLane | null {
    return botOf(gameId)?.lane ?? null;
  }

  has(gameId: string): boolean {
    return botOf(gameId) !== undefined;
  }

  /** Chọn một nước. Từ chối khi không có bot, worker chết, hoặc quá hạn. */
  pick(req: BotPickRequest): Promise<unknown> {
    const bot = botOf(req.gameId);
    if (!bot) return Promise.reject(new Error(`NO_BOT:${req.gameId}`));
    if (this.closed) return Promise.reject(new Error('BOT_CLOSED'));
    const lane = this.lanes.get(bot.lane)!;
    if (lane.inProcess) {
      const run = lane.chain.then(() => {
        const rng = makeRng(req.seed, 0);
        return bot.pick(req.state as never, req.seat, req.level, rng, BOT_BUDGET_MS[bot.lane]);
      });
      // Job hỏng không được làm gãy xích của các job sau.
      lane.chain = run.catch(() => undefined);
      return run;
    }
    return new Promise((resolve, reject) => {
      const job: QueuedJob = { req, jobId: this.nextJobId++, resolve, reject, timer: null };
      lane.queue.push(job);
      this.pump(bot.lane, lane);
    });
  }

  /** Số job đang chờ và đang chạy theo làn — cho trang trạng thái và test. */
  stats(): Record<BotLane, { queued: number; running: boolean; inProcess: boolean }> {
    const out = {} as Record<BotLane, { queued: number; running: boolean; inProcess: boolean }>;
    for (const lane of LANES) {
      const s = this.lanes.get(lane)!;
      out[lane] = { queued: s.queue.length, running: s.running !== null, inProcess: s.inProcess };
    }
    return out;
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const lane of LANES) {
      const s = this.lanes.get(lane)!;
      for (const job of s.queue.splice(0)) job.reject(new Error('BOT_CLOSED'));
      if (s.running) {
        s.running.reject(new Error('BOT_CLOSED'));
        s.running = null;
      }
      if (s.worker) {
        await s.worker.terminate();
        s.worker = null;
      }
    }
  }

  // ---- nội bộ ------------------------------------------------------------

  private pump(laneName: BotLane, lane: LaneState): void {
    if (lane.running || lane.queue.length === 0 || this.closed) return;
    const worker = this.workerFor(laneName, lane);
    if (!worker) return; // workerFor đã chuyển làn sang inProcess và tự xả hàng
    const job = lane.queue.shift()!;
    lane.running = job;
    const budgetMs = BOT_BUDGET_MS[laneName];
    const hard = this.hardTimeoutMs(laneName, budgetMs);
    job.timer = setTimeout(() => {
      // Quá hạn nghĩa là worker có thể đã kẹt trong một vòng tìm kiếm:
      // giết hẳn và dựng lại cho job sau, job này coi như hỏng.
      job.reject(new Error(`BOT_TIMEOUT:${job.req.gameId}`));
      lane.running = null;
      void lane.worker?.terminate();
      lane.worker = null;
      this.pump(laneName, lane);
    }, hard);
    const msg: BotJob = {
      jobId: job.jobId,
      gameId: job.req.gameId,
      state: job.req.state,
      seat: job.req.seat,
      level: job.req.level,
      budgetMs,
      seed: job.req.seed,
    };
    worker.postMessage(msg);
  }

  private workerFor(laneName: BotLane, lane: LaneState): Worker | null {
    if (lane.worker) return lane.worker;
    let worker: Worker;
    try {
      worker = new Worker(new URL('./bot-worker.js', import.meta.url));
    } catch (e) {
      console.error(`Không dựng được worker cho làn bot ${laneName}, chạy trong tiến trình:`, e);
      lane.inProcess = true;
      // Xả hàng đang chờ bằng đường trong-tiến-trình.
      for (const job of lane.queue.splice(0)) {
        this.pick(job.req).then(job.resolve, job.reject);
      }
      return null;
    }
    worker.on('message', (r: BotJobResult) => {
      const job = lane.running;
      if (!job || job.jobId !== r.jobId) return; // trả lời muộn của job đã quá hạn
      if (job.timer) clearTimeout(job.timer);
      lane.running = null;
      if (r.ok) job.resolve(r.action);
      else job.reject(new Error(r.error ?? 'BOT_ERROR'));
      this.pump(laneName, lane);
    });
    worker.on('error', (e) => {
      console.error(`Worker làn bot ${laneName} lỗi:`, e);
      this.killLane(laneName, lane, e instanceof Error ? e : new Error(String(e)));
    });
    worker.on('exit', (code) => {
      if (code !== 0 && !this.closed) {
        console.error(`Worker làn bot ${laneName} thoát với mã ${code}`);
        this.killLane(laneName, lane, new Error(`BOT_WORKER_EXIT:${code}`));
      }
    });
    lane.worker = worker;
    return worker;
  }

  /** Worker chết: job đang chạy hỏng, hàng chờ giữ lại cho worker mới. */
  private killLane(laneName: BotLane, lane: LaneState, e: Error): void {
    if (lane.running) {
      if (lane.running.timer) clearTimeout(lane.running.timer);
      lane.running.reject(e);
      lane.running = null;
    }
    lane.worker = null;
    this.pump(laneName, lane);
  }
}
