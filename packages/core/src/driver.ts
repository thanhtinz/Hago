import { makeRng } from './rng.js';
import type { AnyEngine, BaseState, Engine, Outcome, Seat, Turn } from './types.js';

/**
 * Bộ điều khiển trận: cầm log input và dựng state từ đó.
 *
 * State **không phải** nguồn chân lý — log input mới là. State chỉ là kết quả
 * phát lại log. Nhờ vậy khôi phục sau sự cố, kiểm toán tranh chấp và sửa bug
 * luật (giữ engine cũ theo version) đều là cùng một cơ chế.
 */

export interface InputRecord {
  seq: number;
  /** Ghế gửi. Nước do máy chủ phát (hết giờ, bỏ trận) dùng `-1`. */
  seat: Seat;
  action: unknown;
  /**
   * Khoá chống gửi lặp. Ở tầng lưu trữ đây là `UNIQUE (match_id, seat, nonce)`
   * **trong cùng transaction** với lệnh ghi input (ràng buộc R8) — để ở Redis
   * là mở cheat đổ lại xúc xắc bằng cách tắt bật 4G rồi retry.
   */
  nonce?: string;
  /**
   * Nước do bot chọn thì ghi thẳng nước đó vào đây, **không** ghi seed rồi
   * tính lại (ràng buộc R9): bot dùng iterative deepening chặn bằng đồng hồ
   * tường, cùng seed trên máy tải nặng sẽ ra nước khác.
   */
  byBot?: boolean;
}

export interface MatchLog {
  matchId: string;
  gameId: string;
  engineVersion: number;
  ruleHash: string;
  variant?: string;
  seed: string;
  seats: Seat[];
  config: unknown;
  inputs: InputRecord[];
}

/** Trần số vòng tự chạy giữa hai nước người — chặn engine lỗi treo máy chủ. */
const MAX_AUTO_STEPS = 512;

export class RngCursorDesync extends Error {
  constructor(expected: number, got: number) {
    super(
      `Engine không ghi lại con trỏ RNG: đã rút tới ${expected} nhưng state ghi ${got}. ` +
        'Xem ràng buộc R2 trong docs/ARCHITECTURE.md — con trỏ phải nằm trong state.',
    );
  }
}

/**
 * Áp một nước rồi **kiểm tra engine đã ghi lại con trỏ RNG**.
 *
 * Đây là chỗ biến ràng buộc R2 từ lời hứa trong tài liệu thành lỗi nổ ngay lần
 * chạy đầu. Không có kiểm tra này, engine quên cập nhật `rngCursor` vẫn chạy
 * đúng suốt phiên hiện tại và chỉ sai sau khi khôi phục từ snapshot — tức là
 * sai ở đúng lúc không ai đang nhìn.
 */
export function applyChecked<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  s: S,
  seat: Seat,
  action: A,
  seed: string,
): S {
  const rng = makeRng(seed, s.rngCursor);
  const next = engine.reduce(s, seat, action, rng);
  if (next.rngCursor !== rng.cursor) throw new RngCursorDesync(rng.cursor, next.rngCursor);
  return next;
}

/** Chạy hết các bước engine tự làm được, dừng khi tới lượt người. */
export function runAuto<S extends BaseState>(
  engine: Engine<S, unknown, unknown, unknown>,
  s: S,
  seed: string,
): S {
  let cur = s;
  for (let i = 0; i < MAX_AUTO_STEPS; i++) {
    const t: Turn = engine.turn(cur);
    if (t.kind !== 'auto' && t.kind !== 'chance') return cur;
    if (!engine.step) throw new Error(`${engine.spec.id}: turn trả '${t.kind}' nhưng engine không có step()`);
    const rng = makeRng(seed, cur.rngCursor);
    const next = engine.step(cur, rng);
    if (next.rngCursor !== rng.cursor) throw new RngCursorDesync(rng.cursor, next.rngCursor);
    if (next === cur) throw new Error(`${engine.spec.id}: step() không làm state đổi, sẽ lặp vô hạn`);
    cur = next;
  }
  throw new Error(`${engine.spec.id}: quá ${MAX_AUTO_STEPS} bước tự chạy giữa hai nước người`);
}

/**
 * Dựng lại state từ log. Cùng log + cùng engine version ⇒ cùng state, từng
 * bit. Đây là hàm mà CI chạy cho cả 9 engine.
 */
export function replay<S extends BaseState>(engine: Engine<S, never, unknown, unknown>, log: MatchLog): S {
  if (log.engineVersion !== engine.version) {
    throw new Error(
      `Log ghi engineVersion=${log.engineVersion} nhưng engine hiện tại là ${engine.version}. ` +
        'Phải lấy đúng bản engine cũ từ registry theo version.',
    );
  }
  const rng0 = makeRng(log.seed, 0);
  let s = engine.init(log.seats, log.config, rng0);
  if (s.rngCursor !== rng0.cursor) throw new RngCursorDesync(rng0.cursor, s.rngCursor);
  s = runAuto(engine, s, log.seed);
  for (const rec of log.inputs) {
    s = applyChecked(engine, s, rec.seat, rec.action as never, log.seed);
    s = runAuto(engine, s, log.seed);
  }
  return s;
}

/**
 * Phát lại và giữ **từng khung hình** một, không chỉ khung cuối.
 *
 * `replay()` trả về thế cờ cuối, đủ cho máy chủ dựng lại một ván đang chạy.
 * Nhưng xem lại một ván đã đánh thì cần tua tới tua lui, tức là cần mọi thế
 * cờ trung gian — và tính lại từ đầu mỗi lần bấm nút lùi là việc thừa ở
 * một ván hai trăm nước.
 *
 * Khung 0 là thế mở ván, khung `i` là thế sau nước thứ `i`. Nên số khung
 * luôn là `inputs.length + 1`.
 */
export function replayFrames<S extends BaseState>(engine: Engine<S, never, unknown, unknown>, log: MatchLog): S[] {
  if (log.engineVersion !== engine.version) {
    throw new Error(
      `Log ghi engineVersion=${log.engineVersion} nhưng engine hiện tại là ${engine.version}. ` +
        'Phải lấy đúng bản engine cũ từ registry theo version.',
    );
  }
  const rng0 = makeRng(log.seed, 0);
  let s = engine.init(log.seats, log.config, rng0);
  if (s.rngCursor !== rng0.cursor) throw new RngCursorDesync(rng0.cursor, s.rngCursor);
  s = runAuto(engine, s, log.seed);
  const frames: S[] = [s];
  for (const rec of log.inputs) {
    s = applyChecked(engine, s, rec.seat, rec.action as never, log.seed);
    s = runAuto(engine, s, log.seed);
    frames.push(s);
  }
  return frames;
}

/** Trận đang chạy: giữ state hiện thời và nối thêm vào log. */
export class LiveMatch<S extends BaseState> {
  readonly log: MatchLog;
  private state: S;
  private readonly seen = new Set<string>();

  constructor(
    private readonly engine: Engine<S, never, unknown, unknown>,
    log: MatchLog,
  ) {
    this.log = log;
    this.state = replay(engine, log);
    for (const r of log.inputs) if (r.nonce) this.seen.add(`${r.seat}:${r.nonce}`);
  }

  get s(): S {
    return this.state;
  }

  turn(): Turn {
    return this.engine.turn(this.state);
  }

  /**
   * Đã nhận `(ghế, nonce)` này chưa. Tầng máy chủ hỏi **trước** khi kiểm luật:
   * gửi lại một nước đã đánh là retry của client mất mạng, không phải nước
   * phạm luật, và trả về `ILLEGAL` cho nó thì client tưởng mình sai.
   */
  hasNonce(seat: Seat, nonce: string): boolean {
    return this.seen.has(`${seat}:${nonce}`);
  }

  /** Kết quả nếu ván đã xong, null nếu còn chạy. */
  outcome(): Outcome | null {
    return this.engine.outcome(this.state);
  }

  /**
   * Áp một nước. Gửi lại cùng `(seat, nonce)` là **không làm gì** và không
   * báo lỗi — client mất mạng rồi retry là chuyện thường, và im lặng bỏ qua
   * đúng hơn là gieo lại xúc xắc.
   */
  apply(seat: Seat, action: unknown, opts: { nonce?: string; byBot?: boolean } = {}): { applied: boolean; state: S } {
    const key = opts.nonce ? `${seat}:${opts.nonce}` : null;
    if (key && this.seen.has(key)) return { applied: false, state: this.state };

    let next = applyChecked(this.engine, this.state, seat, action as never, this.log.seed);
    next = runAuto(this.engine, next, this.log.seed);

    const rec: InputRecord = { seq: this.log.inputs.length, seat, action };
    if (opts.nonce !== undefined) rec.nonce = opts.nonce;
    if (opts.byBot !== undefined) rec.byBot = opts.byBot;
    this.log.inputs.push(rec);
    if (key) this.seen.add(key);
    this.state = next;
    return { applied: true, state: next };
  }
}

export type AnyLiveMatch = LiveMatch<BaseState>;
export type { AnyEngine };
