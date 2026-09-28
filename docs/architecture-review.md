# Phụ lục — biên bản thẩm định kiến trúc

> Sinh tự động. Hai kiến trúc độc lập, hai giám khảo chấm chéo.
> Phần đáng giá nhất là **lỗi chết người mà cả hai phương án cùng mắc** — chúng
> trở thành ràng buộc bắt buộc trong `docs/ARCHITECTURE.md`.


## Phương án: Hago — Kiến trúc "Engine thuần, Server là chân lý, Bot ở ngoài tiến trình"

**Luận điểm.** Đổi tốc độ ra mắt lấy một cái nền không bao giờ phải đập: mọi luật chơi là hàm thuần không I/O, mọi ngẫu nhiên sinh từ seed cam kết trước, mọi trận đấu tái lập được bit-by-bit từ log input — cái giá phải trả là 6–9 tháng cho đủ 9 game thay vì 3 tháng, và một lớp trừu tượng mà cờ tỷ phú sẽ phải cưỡng ép mới vừa.

### Stack
NGÔN NGỮ: TypeScript strict trên toàn bộ (kernel, 9 engine, server, bot, client). Lý do quyết định: engine luật chơi phải chạy NGUYÊN VĂN ở 4 nơi — game-server (chân lý), bot-worker (tìm kiếm), client (tô sáng nước đi hợp lệ + animation), job replay đêm (kiểm toán). Bất kỳ ngôn ngữ nào khác đều buộc viết luật 2 lần → 2 bản luật lệch nhau → lỗi "server bảo sai luật, client bảo đúng". Đây là lý do duy nhất và nó đủ mạnh.

SERVER: Node 22 + Fastify (HTTP) + `ws` thuần (WebSocket). Không Socket.IO — cần kiểm soát khung tin, số thứ tự (seq), và giao thức resume thủ công; Socket.IO giấu những thứ đó đi. Không dùng framework game realtime (Colyseus/Nakama): chúng áp đặt mô hình vòng lặp riêng, mà mô hình `Awaiting` bên dưới mới là thứ gộp được cả cờ vua lẫn cờ tỷ phú.

DB CHÂN LÝ: PostgreSQL 16. Log input append-only + snapshot nhị phân. Partition theo tháng. Lý do: cần giao dịch thật cho elo/ví, cần JSONB cho payload action, cần replay chính xác — không phải chỗ cho NoSQL.

TRẠNG THÁI NÓNG: Redis 7. Hàng chờ ghép cặp (sorted set), trạng thái phòng, ring buffer 500 event gần nhất/trận (để reconnect), khoá phân tán, bảng nonce chống lặp input. Redis KHÔNG bao giờ là chân lý — mất Redis thì mất tốc độ, không mất trận đấu.

HÀNG ĐỢI BOT: NATS request/reply có deadline. Không HTTP (không huỷ được request đang bay), không Kafka (quá nặng, cần độ trễ ms).

CLIENT: React Native + Expo (không Flutter). Lý do: dùng lại y nguyên gói engine TS — đây là toàn bộ luận điểm kiến trúc. Flutter sẽ buộc viết lại 9 bộ luật bằng Dart. Bàn cờ vẽ bằng React Native Skia (canvas, 60fps, mỹ thuật tự do), HUD vẽ bằng RN view thường.

HASH/CRYPTO: `@noble/hashes` (JS thuần, đồng bộ, chạy cả trên RN lẫn Node) cho HMAC-SHA256 của RNG và commit-reveal. Không dùng `node:crypto` trong kernel vì kernel phải chạy trên điện thoại.

BOT NẶNG: sidecar native (Rust) cho cờ vây và cờ tướng mức cao — CHỈ khi số liệu thực tế đòi hỏi, không làm trước.

TRIỂN KHAI: 1 vùng Singapore (RTT từ VN ~30–50ms) giai đoạn đầu, chuẩn bị sẵn 1 node đặt tại VN nếu cờ tỷ phú realtime bị kêu lag.

### Hợp đồng engine
/* =========================================================================
 * @hago/kernel/src/types.ts
 * Luật chơi thuần. KHÔNG I/O. KHÔNG Date.now(). KHÔNG Math.random().
 * Chạy y hệt nhau ở: game-server, bot-worker, điện thoại, job replay đêm.
 * ========================================================================= */
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

export type Seat = 0 | 1 | 2 | 3;
export type Millis = number;
export type GameId =
  | 'co-caro' | 'co-vua' | 'co-tuong' | 'co-up' | 'co-vay'
  | 'co-ganh' | 'o-an-quan' | 'co-ca-ngua' | 'co-ty-phu';

export interface GameSpec {
  readonly id: GameId;
  readonly minSeats: number;
  readonly maxSeats: number;
  readonly usesChance: boolean;     // có xúc xắc / xáo bài
  readonly hiddenInfo: boolean;     // có thông tin ẩn → bắt buộc cài determinize()
  readonly realtime: boolean;       // cần tick định kỳ (chỉ co-ty-phu)
  readonly tickMs?: Millis;
  readonly defaultClock: { initialMs: Millis; incrementMs: Millis; perTurnCapMs?: Millis };
}

export interface MatchConfig {
  readonly gameId: GameId;
  readonly engineVersion: string;   // 'co-tuong@2' — chốt cứng vào bảng matches
  readonly variant: string;         // 'chuan' | 'mien-nam' | 'nhanh' ...
  readonly seatCount: number;
  readonly options: Readonly<Record<string, string | number | boolean>>;
  readonly ruleHash: string;        // sha256(canonicalJSON(variant+options))
}
export interface SeatAssignment { seat: Seat; kind: 'human' | 'bot'; ref: string; }

/* ---------- Nút ngẫu nhiên: engine XIN, runtime TRẢ ------------------------
 * Engine không bao giờ tự sinh số. Nó mô tả nhu cầu, runtime giải bằng seed
 * đã cam kết trước trận. Nhờ vậy reduce() vẫn là hàm thuần và replay khớp. */
export type ChanceRequest =
  | { id: string; kind: 'dice'; count: number; sides: number }
  | { id: string; kind: 'permutation'; n: number }      // xáo 32 quân cờ úp
  | { id: string; kind: 'uniform'; max: number };       // rút 1 lá Khí Vận
export type ChanceDraw =
  | { id: string; kind: 'dice'; values: number[] }
  | { id: string; kind: 'permutation'; perm: number[] }
  | { id: string; kind: 'uniform'; value: number };

/* ---------- Trạng thái chờ: thứ gộp được cả 9 game ------------------------ */
export interface Outcome {
  ranking: Seat[][];      // [[0],[1]] thắng-thua | [[0,1]] hoà | 4 người: [[2],[0],[3],[1]]
  scores?: Partial<Record<Seat, number>>;
  termination: 'normal'|'resign'|'timeout'|'abandon'|'agreement'|'violation'|'admin';
}
export type Awaiting =
  | { kind: 'player'; seats: Seat[]; mode: 'any' | 'all'; deadlineMs: Millis }
  | { kind: 'chance'; request: ChanceRequest }
  | { kind: 'tick'; afterMs: Millis }
  | { kind: 'terminal'; outcome: Outcome };

/* ---------- Đầu vào: MỌI thứ làm đổi trạng thái đều đi qua đây ------------
 * spentMs do SERVER đo (đồng hồ server, không tin client) và được GHI LOG,
 * nên đồng hồ cũng tái lập được chính xác khi replay. */
export type EngineInput<A> =
  | { t: 'act'; seat: Seat; action: A; spentMs: Millis; nonce: string }
  | { t: 'chance'; draw: ChanceDraw }
  | { t: 'tick'; elapsedMs: Millis }
  | { t: 'timeout'; seat: Seat }
  | { t: 'resign'; seat: Seat }
  | { t: 'draw-offer'; seat: Seat } | { t: 'draw-accept'; seat: Seat }
  | { t: 'seat-left'; seat: Seat } | { t: 'seat-back'; seat: Seat };

export type RuleErrorCode =
  | 'NOT_YOUR_TURN' | 'ILLEGAL_MOVE' | 'WRONG_PHASE' | 'GAME_OVER'
  | 'MALFORMED' | 'UNEXPECTED_INPUT';
export interface GameEvent { type: string; seat?: Seat; data?: unknown }

export type Reduced<S> =
  | { ok: true; state: S; changed: boolean; events: GameEvent[]; awaiting: Awaiting }
  | { ok: false; code: RuleErrorCode; detail?: string };

export interface Rng { next(): number; int(maxExclusive: number): number }

/* ---------- HỢP ĐỒNG ENGINE ---------------------------------------------- */
export interface GameEngine<S, A, V> {
  readonly spec: GameSpec;
  init(cfg: MatchConfig, seats: readonly SeatAssignment[]): { state: S; awaiting: Awaiting };
  /** Hàm thuần tuyệt đối. Cùng (state,input) → cùng kết quả, mãi mãi. */
  reduce(state: S, input: EngineInput<A>): Reduced<S>;
  /** Cửa ải DUY NHẤT dữ liệu rời server. seat=null là khán giả. */
  view(state: S, seat: Seat | null): V;
  legalActions(state: S, seat: Seat, cap?: number): A[];
  outcome(state: S): Outcome | null;
  hash(state: S): string;                       // bắt lặp 3 lần + khử trùng ở bot
  encode(state: S): Uint8Array;                 // snapshot nhị phân
  decode(buf: Uint8Array): S;
  parseAction(raw: unknown): A | null;          // biên giới với dữ liệu client
  /** BẮT BUỘC khi spec.hiddenInfo — bot lấy mẫu một thế giới hợp lệ từ view. */
  determinize?(view: V, seat: Seat, rng: Rng): S;
}

/* =========================================================================
 * @hago/kernel/src/chance.ts — giải ngẫu nhiên, thuần & kiểm chứng được
 * ========================================================================= */
export function resolveChance(
  req: ChanceRequest, matchSeed: Uint8Array, counter: number
): ChanceDraw {
  const stream = (i: number) =>
    hmac(sha256, matchSeed, new TextEncoder().encode(`${counter}|${req.id}|${i}`));
  const u32 = (i: number) => { const b = stream(i); return ((b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3])>>>0; };
  // Bác bỏ (rejection sampling) để phân phối đều tuyệt đối — không dùng modulo trần.
  const below = (max: number, salt: number) => {
    const lim = Math.floor(0x1_0000_0000 / max) * max;
    for (let i = 0; i < 64; i++) { const x = u32(salt * 1024 + i); if (x < lim) return x % max; }
    return u32(salt) % max;
  };
  switch (req.kind) {
    case 'dice':
      return { id: req.id, kind: 'dice',
               values: Array.from({length: req.count}, (_, i) => 1 + below(req.sides, i)) };
    case 'uniform':
      return { id: req.id, kind: 'uniform', value: below(req.max, 0) };
    case 'permutation': {                       // Fisher–Yates xác định
      const p = Array.from({length: req.n}, (_, i) => i);
      for (let i = req.n - 1; i > 0; i--) { const j = below(i + 1, i); [p[i], p[j]] = [p[j], p[i]]; }
      return { id: req.id, kind: 'permutation', perm: p };
    }
  }
}

/* =========================================================================
 * @hago/kernel/src/drive.ts — VÒNG LẶP DUY NHẤT của game-server.
 * Bảo đảm: không engine nào chạm được vào nguồn ngẫu nhiên.
 * ========================================================================= */
export interface DriveCtx { matchSeed: Uint8Array; chanceCounter: number }
export function drive<S, A, V>(
  eng: GameEngine<S, A, V>, state: S, input: EngineInput<A>, ctx: DriveCtx
): { res: Reduced<S>; resolvedChances: ChanceDraw[] } {
  const drawn: ChanceDraw[] = [];
  let res = eng.reduce(state, input);
  let guard = 0;
  while (res.ok && res.awaiting.kind === 'chance') {
    if (++guard > 256) throw new Error('chance loop runaway');   // bảo hiểm engine lỗi
    const draw = resolveChance(res.awaiting.request, ctx.matchSeed, ctx.chanceCounter++);
    drawn.push(draw);                                            // ghi vào match_inputs
    res = eng.reduce(res.state, { t: 'chance', draw });
  }
  return { res, resolvedChances: drawn };
}

/* =========================================================================
 * engines/co-vua/src/v1 — GAME THUẦN LƯỢT (không xúc xắc, không thông tin ẩn)
 * ========================================================================= */
export interface ChessState {
  board: string;                 // 64 ký tự, hoa=trắng, '.'=trống
  turn: 0 | 1; castling: string; ep: number;
  halfmove: number; fullmove: number;
  repetition: Record<string, number>;
  remainingMs: [Millis, Millis];
  drawOfferBy: Seat | null;
  result: Outcome | null;
}
export type ChessAction = { from: number; to: number; promo?: 'q'|'r'|'b'|'n' };
export type ChessView = Omit<ChessState, 'repetition'> & { legal: ChessAction[] };

declare function genMoves(s: ChessState): ChessAction[];
declare function applyMove(s: ChessState, m: ChessAction): ChessState;
declare function inCheck(s: ChessState, side: 0|1): boolean;
declare function zobrist(s: ChessState): string;

export const coVua: GameEngine<ChessState, ChessAction, ChessView> = {
  spec: { id: 'co-vua', minSeats: 2, maxSeats: 2, usesChance: false, hiddenInfo: false,
          realtime: false, defaultClock: { initialMs: 300_000, incrementMs: 3_000 } },

  init(cfg) {
    const state: ChessState = {
      board: 'RNBQKBNRPPPPPPPP' + '.'.repeat(32) + 'pppppppprnbqkbnr',
      turn: 0, castling: 'KQkq', ep: -1, halfmove: 0, fullmove: 1, repetition: {},
      remainingMs: [cfg.options.initialMs as number ?? 300_000,
                    cfg.options.initialMs as number ?? 300_000],
      drawOfferBy: null, result: null,
    };
    return { state, awaiting: { kind: 'player', seats: [0], mode: 'any',
                                deadlineMs: state.remainingMs[0] } };
  },

  reduce(s, input) {
    if (s.result) return { ok: false, code: 'GAME_OVER' };
    switch (input.t) {
      case 'chance': case 'tick':
        return { ok: false, code: 'UNEXPECTED_INPUT' };          // cờ vua không có 2 thứ này

      case 'resign': {
        const win = (1 - input.seat) as Seat;
        const st = { ...s, result: { ranking: [[win], [input.seat]],
                                     termination: 'resign' as const } };
        return { ok: true, state: st, changed: true,
                 events: [{ type: 'resign', seat: input.seat }],
                 awaiting: { kind: 'terminal', outcome: st.result! } };
      }
      case 'timeout': {
        const win = (1 - input.seat) as Seat;
        const st = { ...s, remainingMs: setAt(s.remainingMs, input.seat, 0),
                     result: { ranking: [[win], [input.seat]], termination: 'timeout' as const } };
        return { ok: true, state: st, changed: true, events: [{ type: 'flag', seat: input.seat }],
                 awaiting: { kind: 'terminal', outcome: st.result! } };
      }
      case 'draw-offer':
        return { ok: true, state: { ...s, drawOfferBy: input.seat }, changed: true,
                 events: [{ type: 'draw-offer', seat: input.seat }],
                 awaiting: { kind: 'player', seats: [s.turn], mode: 'any',
                             deadlineMs: s.remainingMs[s.turn] } };
      case 'draw-accept': {
        if (s.drawOfferBy === null || s.drawOfferBy === input.seat)
          return { ok: false, code: 'WRONG_PHASE' };
        const st = { ...s, result: { ranking: [[0, 1] as Seat[]],
                                     termination: 'agreement' as const } };
        return { ok: true, state: st, changed: true, events: [{ type: 'draw' }],
                 awaiting: { kind: 'terminal', outcome: st.result! } };
      }
      case 'seat-left': case 'seat-back':
        return { ok: true, state: s, changed: false, events: [],
                 awaiting: { kind: 'player', seats: [s.turn], mode: 'any',
                             deadlineMs: s.remainingMs[s.turn] } };

      case 'act': {
        if (input.seat !== s.turn) return { ok: false, code: 'NOT_YOUR_TURN' };
        const ok = genMoves(s).some(m => m.from === input.action.from &&
                                         m.to === input.action.to &&
                                         m.promo === input.action.promo);
        if (!ok) return { ok: false, code: 'ILLEGAL_MOVE' };

        // Đồng hồ: trừ đúng thời gian SERVER đo, cộng increment. Ghi vào state
        // ⇒ replay cho ra đồng hồ giống hệt, không phụ thuộc wall-clock.
        const inc = 3_000;
        const left = Math.max(0, s.remainingMs[input.seat] - input.spentMs) + inc;
        let ns = applyMove({ ...s, remainingMs: setAt(s.remainingMs, input.seat, left) },
                           input.action);
        ns.drawOfferBy = null;

        const key = zobrist(ns);
        ns.repetition = { ...ns.repetition, [key]: (ns.repetition[key] ?? 0) + 1 };

        const replies = genMoves(ns);
        if (replies.length === 0)
          ns.result = inCheck(ns, ns.turn)
            ? { ranking: [[input.seat], [ns.turn as Seat]], termination: 'normal' }
            : { ranking: [[0, 1] as Seat[]], termination: 'normal' };          // hết nước = hoà
        else if (ns.repetition[key] >= 3 || ns.halfmove >= 100)
          ns.result = { ranking: [[0, 1] as Seat[]], termination: 'normal' };

        return {
          ok: true, state: ns, changed: true,
          events: [{ type: 'move', seat: input.seat, data: input.action }],
          awaiting: ns.result
            ? { kind: 'terminal', outcome: ns.result }
            : { kind: 'player', seats: [ns.turn], mode: 'any',
                deadlineMs: ns.remainingMs[ns.turn] },
        };
      }
    }
  },

  // Cờ vua công khai hoàn toàn: view chỉ bỏ bảng lặp cho nhẹ và thêm nước hợp lệ.
  view(s) { const { repetition, ...pub } = s; return { ...pub, legal: genMoves(s) }; },
  legalActions(s, seat) { return seat === s.turn ? genMoves(s) : []; },
  outcome(s) { return s.result; },
  hash(s) { return zobrist(s); },
  encode(s) { return new TextEncoder().encode(JSON.stringify(s)); },
  decode(b) { return JSON.parse(new TextDecoder().decode(b)); },
  parseAction(raw) {
    const r = raw as ChessAction;
    return (r && Number.isInteger(r.from) && Number.isInteger(r.to) &&
            r.from >= 0 && r.from < 64 && r.to >= 0 && r.to < 64) ? r : null;
  },
};
const setAt = <T,>(a: readonly T[], i: number, v: T) =>
  a.map((x, k) => (k === i ? v : x)) as unknown as [T, T];

/* =========================================================================
 * engines/co-ca-ngua/src/v1 — GAME CÓ XÚC XẮC + 4 NGƯỜI + LƯỢT THÊM
 * Điểm mấu chốt: 'roll' KHÔNG sinh ra số. Nó chuyển sang pha 'rolling' và
 * trả về Awaiting.chance. drive() giải xúc xắc rồi nạp lại bằng input 'chance'.
 * ========================================================================= */
export interface HorsePiece { pos: number }           // -1 chuồng, 0..55 vòng, 100.. đích
export interface HorseState {
  seatCount: number; turn: Seat;
  phase: 'rolling' | 'moving';
  dice: number[] | null; diceUsed: boolean[];
  extraTurn: boolean; consecutiveSix: number;
  pieces: Record<Seat, HorsePiece[]>;
  finished: Seat[];
  remainingMs: Record<Seat, Millis>;
  chanceSeq: number;
  result: Outcome | null;
}
export type HorseAction = { t: 'roll' } | { t: 'move'; piece: number; dieIdx: number } | { t: 'pass' };
export type HorseView = HorseState;                    // 100% công khai

declare function horseMoves(s: HorseState): HorseAction[];
declare function horseApply(s: HorseState, a: Extract<HorseAction,{t:'move'}>): HorseState;

export const coCaNgua: GameEngine<HorseState, HorseAction, HorseView> = {
  spec: { id: 'co-ca-ngua', minSeats: 2, maxSeats: 4, usesChance: true, hiddenInfo: false,
          realtime: false, defaultClock: { initialMs: 0, incrementMs: 0, perTurnCapMs: 25_000 } },

  init(cfg) {
    const seats = Array.from({ length: cfg.seatCount }, (_, i) => i as Seat);
    const s: HorseState = {
      seatCount: cfg.seatCount, turn: 0, phase: 'rolling', dice: null, diceUsed: [],
      extraTurn: false, consecutiveSix: 0,
      pieces: Object.fromEntries(seats.map(x => [x, [{pos:-1},{pos:-1},{pos:-1},{pos:-1}]])) as any,
      finished: [], remainingMs: Object.fromEntries(seats.map(x => [x, 0])) as any,
      chanceSeq: 0, result: null,
    };
    return { state: s, awaiting: { kind: 'player', seats: [0], mode: 'any', deadlineMs: 25_000 } };
  },

  reduce(s, input) {
    if (s.result) return { ok: false, code: 'GAME_OVER' };
    const wait = (st: HorseState): Awaiting =>
      st.result ? { kind: 'terminal', outcome: st.result }
                : { kind: 'player', seats: [st.turn], mode: 'any', deadlineMs: 25_000 };

    if (input.t === 'chance') {
      if (s.phase !== 'rolling' || input.draw.kind !== 'dice')
        return { ok: false, code: 'UNEXPECTED_INPUT' };
      const v = input.draw.values;
      const six = v.filter(x => x === 6).length;
      const cs = six > 0 ? s.consecutiveSix + 1 : 0;

      // Luật nhà: 3 lần liên tiếp ra 6 → mất lượt (chống kéo dài vô hạn).
      if (cs >= 3) {
        const ns = { ...s, dice: null, diceUsed: [], consecutiveSix: 0, extraTurn: false,
                     phase: 'rolling' as const, turn: nextSeat(s) };
        return { ok: true, state: ns, changed: true,
                 events: [{ type: 'dice', seat: s.turn, data: v },
                          { type: 'burn-turn', seat: s.turn }], awaiting: wait(ns) };
      }
      const ns: HorseState = { ...s, dice: v, diceUsed: v.map(() => false),
                               consecutiveSix: cs, extraTurn: six > 0, phase: 'moving' };
      // Không có nước nào đi được → bỏ lượt ngay, không bắt người chơi bấm 'pass'.
      if (horseMoves(ns).length === 0) {
        const skipped = { ...ns, phase: 'rolling' as const, dice: null, diceUsed: [],
                          extraTurn: false, turn: nextSeat(ns) };
        return { ok: true, state: skipped, changed: true,
                 events: [{ type: 'dice', seat: s.turn, data: v },
                          { type: 'no-move', seat: s.turn }], awaiting: wait(skipped) };
      }
      return { ok: true, state: ns, changed: true,
               events: [{ type: 'dice', seat: s.turn, data: v }], awaiting: wait(ns) };
    }

    if (input.t === 'timeout') {                       // hết giờ lượt: tự động đi hộ
      const opts = s.phase === 'rolling' ? [{ t: 'roll' } as HorseAction] : horseMoves(s);
      if (opts.length === 0) return { ok: false, code: 'WRONG_PHASE' };
      return this.reduce(s, { t: 'act', seat: s.turn, action: opts[0], spentMs: 25_000,
                              nonce: `auto-${s.chanceSeq}` });
    }
    if (input.t === 'resign' || input.t === 'seat-left') { /* … xếp hạng cuối, bot tiếp quản … */ }
    if (input.t === 'tick') return { ok: false, code: 'UNEXPECTED_INPUT' };

    if (input.t !== 'act') return { ok: true, state: s, changed: false, events: [], awaiting: wait(s) };
    if (input.seat !== s.turn) return { ok: false, code: 'NOT_YOUR_TURN' };

    if (input.action.t === 'roll') {
      if (s.phase !== 'rolling') return { ok: false, code: 'WRONG_PHASE' };
      const ns = { ...s, chanceSeq: s.chanceSeq + 1 };
      // ★ Engine chỉ XIN. drive() sẽ giải bằng matchSeed đã cam kết trước trận.
      return { ok: true, state: ns, changed: true, events: [],
               awaiting: { kind: 'chance',
                           request: { id: `d${ns.chanceSeq}`, kind: 'dice', count: 2, sides: 6 } } };
    }
    if (input.action.t === 'pass') {
      if (s.phase !== 'moving' || horseMoves(s).length > 0) return { ok: false, code: 'WRONG_PHASE' };
      const ns = { ...s, phase: 'rolling' as const, dice: null, diceUsed: [],
                   extraTurn: false, turn: nextSeat(s) };
      return { ok: true, state: ns, changed: true, events: [{ type:'pass', seat: input.seat }],
               awaiting: wait(ns) };
    }
    // move
    if (s.phase !== 'moving') return { ok: false, code: 'WRONG_PHASE' };
    const legal = horseMoves(s).some(m => m.t === 'move' &&
        m.piece === (input.action as any).piece && m.dieIdx === (input.action as any).dieIdx);
    if (!legal) return { ok: false, code: 'ILLEGAL_MOVE' };

    let ns = horseApply(s, input.action as Extract<HorseAction,{t:'move'}>);
    ns.diceUsed = ns.diceUsed.map((u, i) => i === (input.action as any).dieIdx ? true : u);

    const home = ns.pieces[input.seat].every(p => p.pos >= 100);
    if (home && !ns.finished.includes(input.seat)) ns.finished = [...ns.finished, input.seat];
    if (ns.finished.length >= ns.seatCount - 1) {
      const rest = allSeats(ns).filter(x => !ns.finished.includes(x));
      ns.result = { ranking: [...ns.finished.map(x => [x]), rest], termination: 'normal' };
    } else if (ns.diceUsed.every(Boolean)) {
      // Hết xúc xắc: ra 6 thì được cuộn lại, không thì sang người kế.
      ns = { ...ns, phase: 'rolling', dice: null, diceUsed: [],
             turn: ns.extraTurn ? ns.turn : nextSeat(ns), extraTurn: false };
    }
    return { ok: true, state: ns, changed: true,
             events: [{ type: 'move', seat: input.seat, data: input.action }], awaiting: wait(ns) };
  },

  view(s) { return s; },                                 // không có gì để giấu
  legalActions(s, seat) {
    if (seat !== s.turn || s.result) return [];
    return s.phase === 'rolling' ? [{ t: 'roll' }] : horseMoves(s);
  },
  outcome(s) { return s.result; },
  hash(s) { return JSON.stringify([s.turn, s.phase, s.dice, s.pieces]); },
  encode(s) { return new TextEncoder().encode(JSON.stringify(s)); },
  decode(b) { return JSON.parse(new TextDecoder().decode(b)); },
  parseAction(raw) {
    const r = raw as HorseAction;
    if (!r || typeof (r as any).t !== 'string') return null;
    if (r.t === 'roll' || r.t === 'pass') return r;
    return (Number.isInteger(r.piece) && Number.isInteger(r.dieIdx)) ? r : null;
  },
};
const allSeats = (s: HorseState) => Array.from({length: s.seatCount}, (_, i) => i as Seat);
function nextSeat(s: HorseState): Seat {
  let n = s.turn;
  for (let i = 0; i < 4; i++) {
    n = ((n + 1) % s.seatCount) as Seat;
    if (!s.finished.includes(n)) return n;
  }
  return s.turn;
}

/* =========================================================================
 * engines/co-up/src/v1 — GAME THÔNG TIN ẨN
 * Bất biến sống còn: mọi bí mật nằm trong state.secret, và view() là nơi DUY
 * NHẤT bí mật bị cắt. Test tính chất ép điều đó (xem phần antiCheat).
 * ========================================================================= */
export type Kind = 'X'|'S'|'T'|'M'|'P'|'C'|'B';        // xe sĩ tượng mã pháo chốt tướng
export interface UpSquare { side: 0|1; open: boolean; kind?: Kind; slot: number }
export interface UpState {
  cells: (UpSquare | null)[];                            // 90 điểm bàn cờ tướng
  secret: { deck: [Kind[], Kind[]] } | null;             // deck[side][slot] — KHÔNG BAO GIỜ rời server
  pool: [Partial<Record<Kind, number>>, Partial<Record<Kind, number>>]; // còn ẩn — CÔNG KHAI
  turn: 0|1; remainingMs: [Millis, Millis];
  repetition: Record<string, number>;
  result: Outcome | null;
}
export type UpAction = { from: number; to: number };
export interface UpView {
  cells: (Omit<UpSquare, 'slot'> | null)[];              // 'slot' cũng bị cắt: nó rò rỉ vị trí trong deck
  pool: UpState['pool'];
  turn: 0|1; remainingMs: [Millis, Millis]; me: Seat | null;
  result: Outcome | null;
}
declare function upMoves(s: UpState, side: 0|1): UpAction[];
declare function upApply(s: UpState, a: UpAction): UpState;   // tự lật quân khi nó rời ô đầu
declare const UP_START_KINDS: Kind[];                          // 16 quân/bên trừ tướng

export const coUp: GameEngine<UpState, UpAction, UpView> = {
  spec: { id: 'co-up', minSeats: 2, maxSeats: 2, usesChance: true, hiddenInfo: true,
          realtime: false, defaultClock: { initialMs: 600_000, incrementMs: 5_000 } },

  init() {
    const s: UpState = {
      cells: new Array(90).fill(null), secret: null,
      pool: [count(UP_START_KINDS), count(UP_START_KINDS)],
      turn: 0, remainingMs: [600_000, 600_000], repetition: {}, result: null,
    };
    // ★ Ngay từ init đã XIN ngẫu nhiên. drive() xáo bằng matchSeed cam kết trước.
    return { state: s, awaiting: { kind: 'chance',
             request: { id: 'shuffle', kind: 'permutation', n: 32 } } };
  },

  reduce(s, input) {
    if (input.t === 'chance') {
      if (s.secret) return { ok: false, code: 'UNEXPECTED_INPUT' };
      if (input.draw.kind !== 'permutation') return { ok: false, code: 'MALFORMED' };
      const p = input.draw.perm;
      const deck: [Kind[], Kind[]] = [
        p.slice(0, 16).map(i => UP_START_KINDS[i % 16]),
        p.slice(16, 32).map(i => UP_START_KINDS[i % 16]),
      ];
      const ns = { ...s, secret: { deck }, cells: layoutClosed() };
      return { ok: true, state: ns, changed: true, events: [{ type: 'deal' }],
               awaiting: { kind: 'player', seats: [0], mode: 'any', deadlineMs: ns.remainingMs[0] } };
    }
    if (!s.secret) return { ok: false, code: 'WRONG_PHASE' };
    if (s.result)  return { ok: false, code: 'GAME_OVER' };
    if (input.t !== 'act')
      return { ok: true, state: s, changed: false, events: [],
               awaiting: { kind: 'player', seats: [s.turn], mode: 'any',
                           deadlineMs: s.remainingMs[s.turn] } };
    if (input.seat !== s.turn) return { ok: false, code: 'NOT_YOUR_TURN' };
    if (!upMoves(s, s.turn).some(m => m.from === input.action.from && m.to === input.action.to))
      return { ok: false, code: 'ILLEGAL_MOVE' };

    const left = Math.max(0, s.remainingMs[input.seat] - input.spentMs) + 5_000;
    const ns = upApply({ ...s, remainingMs: setAt(s.remainingMs, input.seat, left) }, input.action);
    // upApply() cập nhật pool khi quân được lật ⇒ thông tin công khai luôn nhất quán.
    return { ok: true, state: ns, changed: true,
             events: [{ type: 'move', seat: input.seat, data: input.action }],
             awaiting: ns.result ? { kind: 'terminal', outcome: ns.result }
                                 : { kind: 'player', seats: [ns.turn], mode: 'any',
                                     deadlineMs: ns.remainingMs[ns.turn] } };
  },

  // ★ CỬA ẢI DUY NHẤT. 'secret' và 'slot' biến mất hoàn toàn khỏi dây.
  view(s, seat) {
    return {
      cells: s.cells.map(c => c && { side: c.side, open: c.open, ...(c.open ? { kind: c.kind } : {}) }),
      pool: s.pool, turn: s.turn, remainingMs: s.remainingMs, me: seat, result: s.result,
    };
  },

  // ★ Cho bot PIMC: lấy mẫu MỘT thế giới hợp lệ với đúng những gì view thấy.
  determinize(v, _seat, rng) {
    const draw = (side: 0|1, bag: Kind[]) => bag.splice(rng.int(bag.length), 1)[0];
    const bags: [Kind[], Kind[]] = [expand(v.pool[0]), expand(v.pool[1])];
    const cells = v.cells.map((c, i) => c ? ({
      side: c.side, open: c.open, slot: i,
      kind: c.open ? c.kind : draw(c.side, bags[c.side]),
    }) as UpSquare : null);
    return { cells, secret: { deck: [[], []] }, pool: v.pool, turn: v.turn,
             remainingMs: v.remainingMs, repetition: {}, result: v.result };
  },

  legalActions(s, seat) { return seat === s.turn && s.secret ? upMoves(s, s.turn) : []; },
  outcome(s) { return s.result; },
  hash(s) { return JSON.stringify([s.turn, s.cells]); },
  encode(s) { return new TextEncoder().encode(JSON.stringify(s)); },
  decode(b) { return JSON.parse(new TextDecoder().decode(b)); },
  parseAction(raw) {
    const r = raw as UpAction;
    return (r && Number.isInteger(r.from) && Number.isInteger(r.to) &&
            r.from >= 0 && r.from < 90 && r.to >= 0 && r.to < 90) ? r : null;
  },
};
declare function layoutClosed(): (UpSquare | null)[];
const count = (ks: Kind[]) => ks.reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }),
                                        {} as Partial<Record<Kind, number>>);
const expand = (p: Partial<Record<Kind, number>>) =>
  Object.entries(p).flatMap(([k, n]) => Array(n as number).fill(k as Kind)) as Kind[];

/* -------------------------------------------------------------------------
 * BA GAME TRÊN CHỨNG MINH HỢP ĐỒNG CHỨA ĐỦ MA TRẬN:
 *   cờ vua   : chance=✗ hidden=✗ 2 ghế → Awaiting.player thuần
 *   cá ngựa  : chance=✓ hidden=✗ 4 ghế → Awaiting.chance + lượt thêm + auto-skip
 *   cờ úp    : chance=✓ hidden=✓ 2 ghế → view() cắt bí mật + determinize() cho PIMC
 *   cờ tỷ phú: realtime=✓ → Awaiting.tick (đấu giá đếm ngược) + mode:'all' (mọi
 *              người cùng ra giá). Không cần thêm khái niệm nào ngoài 2 cái đã có.
 * ------------------------------------------------------------------------- */

### Mô hình bot
NGUYÊN TẮC SỐ 1: game-server KHÔNG BAO GIỜ chạy tìm kiếm. Trong game-server chỉ có `reduce()`, `isLegal` và `legalActions()` — tất cả đều O(nhỏ), tệ nhất là cờ vây 361 nước, dưới 1ms. Vòng lặp sự kiện Node của game-server không bao giờ bị chiếm quá ~2ms.

BOT SỐNG Ở ĐÂU
- Dịch vụ riêng `bot-service`, deploy riêng, scale riêng, chết riêng. Nói chuyện với game-server qua NATS request/reply, không qua lời gọi hàm. ESLint chặn cứng `game-server` import `packages/bots` — vi phạm là gãy CI.
- Bên trong `bot-service`: tiến trình Node giữ một pool `worker_threads` (số luồng = số core − 1). Tìm kiếm chạy ĐỒNG BỘ, chặn hoàn toàn, bên trong worker. Chặn vòng lặp của chính worker đó là chuyện bình thường — nó không phục vụ ai khác. Luồng chính của bot-service chỉ nhận NATS, chọn worker rảnh, `postMessage`, chờ trả lời. Nó không bao giờ tự tính.
- Cờ vây (và cờ tướng ở mức cao, nếu đo thấy cần): sidecar native riêng `bot-native` (Rust), giao tiếp qua stdin/stdout theo dòng, mỗi request chạy trong tiến trình con có `setrlimit` CPU + timeout cấp tiến trình. Node không tham gia vào việc tính ở đây, nó chỉ đọc đường ống.

CHẶN VÒNG LẶP — 4 LỚP PHÒNG THỦ CHỒNG NHAU
1. Deadline tuyệt đối: request mang `deadlineAt` (epoch ms, đồng hồ server). Thuật toán luôn là iterative deepening (làm sâu dần) — depth 1, 2, 3… và mỗi lần hoàn tất một độ sâu thì lưu lại nước tốt nhất. Hết giờ thì trả nước của độ sâu đã xong gần nhất. KHÔNG BAO GIỜ có đệ quy không giới hạn.
2. Kiểm tra trong vòng lặp: cứ 2048 node thì kiểm `performance.now() >= deadline` và `Atomics.load(abortFlag, 0) === 1` (SharedArrayBuffer dùng chung với luồng chính). Ném `AbortSearch`, bắt ở gốc, trả kết quả dở.
3. Giết luồng: nếu worker vượt `deadline + 300ms` mà chưa trả lời, luồng chính gọi `worker.terminate()` và sinh luồng mới. Một bot lỗi làm mất 1 luồng, không làm treo cả dịch vụ.
4. Hạ cấp khi quá tải: NATS có giới hạn in-flight. Khi bão hoà, bot rơi xuống mức `instant` — heuristic + tìm kiếm 1 tầng, dưới 5ms, luôn trả lời được. Người chơi không bao giờ phải chờ quá đồng hồ vì bot bận. Thà bot đánh yếu hơn là trận treo.

BOT NHÌN THẤY GÌ — điểm chống gian lận quan trọng nhất
Request gửi cho bot là `{ gameId, engineVersion, view: PlayerView, seat, level, deadlineAt, botSeed }`. `view` chính là thứ engine trả về từ `view(state, seat)` — CÙNG MỘT HÀM, cùng dữ liệu mà người thật nhận được. Bot KHÔNG nhận `state` đầy đủ. Hệ quả: ở cờ úp, bot không thể biết quân úp là gì, đúng như người. Ở cờ tỷ phú, bot không biết bài Khí Vận sắp rút. Đây không phải lựa chọn đạo đức mà là bất biến kiến trúc — gửi `state` cho bot là gãy build vì kiểu dữ liệu không khớp.

Với game thông tin ẩn, bot dựng lại thế giới bằng `engine.determinize(view, seat, rng)`, với `rng` gieo từ `botSeed` (do server sinh, có ghi log). Nghĩa là: replay một trận sẽ tái tạo CHÍNH XÁC nước bot đã đi. Bot cũng tái lập được như mọi thứ khác.

THUẬT TOÁN THEO TỪNG GAME (bám đúng khảo sát luật)
- co-caro, co-ganh, o-an-quan: negamax + alpha-beta + bảng chuyển vị + killer/history. Cờ gánh và ô ăn quan nhỏ tới mức giải gần như hoàn hảo trong ngân sách 300ms. Ô ăn quan cần lưu ý mô phỏng rải-ăn dây chuyền chính xác vì nó là nguồn lỗi chính. Caro cần giới hạn nước sinh trong bán kính 2 ô quanh quân đã đặt, không thì phân nhánh nổ.
- co-vua: negamax + alpha-beta + iterative deepening + tìm kiếm yên tĩnh (quiescence) + bảng chuyển vị Zobrist + null-move + LMR. Sách khai cuộc nhỏ (Polyglot rút gọn) 12 nước đầu để tránh bot mở cờ ngu. Bàn kết cờ tàn 3-4 quân tra bảng.
- co-tuong: cùng khung với cờ vua nhưng ĐÁNH GIÁ khác hẳn — bảng vị trí quân theo cung/sông, pháo cần ngòi nên sinh nước và đánh giá tấn công phải riêng, và luật cấm chiếu mãi/đuổi mãi phải nằm trong engine chứ không trong bot. Phân nhánh ~38. JS đạt được depth 6-7 trong 800ms; đủ cho hầu hết người chơi phổ thông, KHÔNG đủ cho kỳ thủ mạnh — đây là điểm sẽ phải chuyển sang sidecar native.
- co-up: PIMC (Perfect-Information Monte Carlo). Lấy K=24 mẫu thế giới bằng `determinize`, mỗi mẫu chạy alpha-beta nông (depth 4) với ngân sách `deadline/K`, rồi bỏ phiếu theo tổng điểm chứ không theo số phiếu (tránh nước "an toàn trung bình" thắng nước "rất tốt trong đa số"). Biết rõ nhược điểm của PIMC: nó giả định thông tin sẽ hoàn hảo ở lượt sau nên không bao giờ chơi nước để DÒ thông tin, và định giá quá cao nước lật quân may rủi. Chấp nhận — cờ úp vốn nhiều may rủi, người chơi không cảm nhận được sự khác biệt này ở mức nghiệp dư.
- co-ca-ngua: KHÔNG expectiminimax đầy đủ (4 người × 21 tổ hợp xúc xắc × lượt thêm = cây nổ). Dùng: liệt kê mọi nước hợp lệ ở lượt hiện tại, với mỗi nước chạy 200–400 lượt mô phỏng rollout có chính sách heuristic (ưu tiên đá quân đối thủ > ra chuồng > tiến gần đích > vào đích), lấy tỉ lệ thắng. Đây là MCTS phẳng, đủ mạnh cho game phụ thuộc xúc xắc nặng và tốn dưới 100ms.
- co-vay: MCTS + RAVE trên sidecar Rust. Giai đoạn 1: 9×9, rollout heuristic (bắt sống, nối, mở rộng, tránh tự tử/ko). Giai đoạn 2: mạng chính sách nhỏ chạy ONNX Runtime để dẫn hướng MCTS, mới đủ chơi 19×19 tử tế. Tôi coi cờ vây là DỰ ÁN RIÊNG, không phải một mốc trong dự án này.
- co-ty-phu: không tìm kiếm cây. Bot luật-cứng có tham số: bảng ROI theo từng ô, ngưỡng tiền mặt an toàn theo giai đoạn, hàm định giá thương lượng dựa trên "độ hoàn thiện nhóm màu", chính sách đấu giá = giá trị kỳ vọng × hệ số hung hăng theo mức bot. Ba mức bot = ba bộ tham số, tinh chỉnh bằng self-play hàng loạt offline chứ không bằng tìm kiếm lúc chơi.

BOT NGỒI VÀO TRẬN NHƯ THẾ NÀO
Bot là một `Seat` bình thường, có `bot_profile_id` và một hàng trong `match_seats` y như người. Game-server KHÔNG có nhánh `if (isBot)` nào trong vòng lặp luật. Thay vào đó có một `BotDriver` đăng ký nghe cùng luồng event mà client nghe: khi nhận `Awaiting.player` chứa ghế của bot, nó phát một NATS request. Kết quả về thì nó gửi vào server đúng như một client gửi — qua cùng cổng, cùng lớp validate, cùng bảng nonce.

Ba hệ quả của thiết kế này:
1. Bot vs bot chạy được ngay, miễn phí → có ngay công cụ self-play để đo sức mạnh và tinh chỉnh tham số.
2. Bot có thể TIẾP QUẢN một người bỏ trận giữa chừng (quan trọng ở cá ngựa và cờ tỷ phú 4 người — mất 1 người không được làm hỏng trận của 3 người còn lại).
3. Không tồn tại đường nào để bot ăn gian, vì nó đi qua đúng những cánh cổng mà người đi qua.

TRỄ NHÂN TẠO
Bot trả lời sau 40ms thì lộ liễu và khó chịu. Server giữ nước lại tới thời điểm `now + delay`, với `delay` lấy từ phân phối log-normal phụ thuộc (game, mức bot, độ phức tạp thế cờ ước lượng bằng số nước hợp lệ), kẹp trong [700ms, 6s], cộng nhiễu. Ngân sách SUY NGHĨ và độ trễ HIỂN THỊ là hai đại lượng tách rời — bot mức dễ vẫn "nghĩ" lâu trên màn hình dù chỉ tốn 5ms. Điều này còn chặn việc nhận diện bot bằng vân tay thời gian.

CÔNG KHAI LÀ BOT
Đối thủ bot được gắn nhãn rõ trong UI. Trận với bot không tính vào elo chính (có bảng `bot_rating` riêng). Lừa người chơi rằng bot là người vừa vi phạm chính sách cửa hàng ứng dụng, vừa là thứ cộng đồng VN phát hiện ra rất nhanh và sẽ mất niềm tin vĩnh viễn.

### Ghép cặp
CẤU TRÚC HÀNG CHỜ
Mỗi (gameId, mode, variant) một Redis sorted set `q:{game}:{mode}:{variant}`, score = rating Glicko-2. Kèm hash `qmeta:{userId}` lưu `{joinedAt, rating, rd, region, seatPref, deviceId}`.

TICKER
Tiến trình `matchmaker` chạy mỗi 500ms. Mỗi (game, mode) được một shard xử lý, chọn bằng consistent hash → không bao giờ hai ticker cùng đụng một hàng chờ. Trong shard, việc ghép cặp làm bằng một Lua script Redis nguyên tử: "đọc N ứng viên → chọn nhóm → ZREM tất cả cùng lúc → ghi khoá match". Nếu ZREM thất bại (ai đó vừa huỷ), script rollback và bỏ qua vòng này. Đây là chỗ duy nhất có thể ghép trùng, nên nó phải nguyên tử — không dùng WATCH/MULTI vì retry storm.

CỬA SỔ NỚI DẦN
window(t) = min(400, 60 + 55 × floor(t/2s)) điểm rating.
- 0–2s: chỉ ghép trong ±60 (cặp gần như hoàn hảo)
- 10s: ±335
- 12s trở đi: ±400 và dừng nới.
Với người mới (RD > 150 trong Glicko-2), cửa sổ khởi điểm rộng gấp đôi — độ tin cậy rating của họ vốn thấp, ghép chặt là vô nghĩa và chỉ làm họ chờ.

GAME 4 NGƯỜI (cá ngựa, cờ tỷ phú)
Không ghép cặp mà MỞ BÀN. Người đầu tiên vào hàng chờ tạo một "bàn đang gom" trong Redis (`table:{id}` với TTL 45s). Người tiếp theo trong cửa sổ rating sẽ được hút vào bàn đó thay vì mở bàn mới. Mốc thời gian của bàn:
- t=0..15s: chờ đủ 4.
- t=15s: nếu có ≥3 người → hỏi "bắt đầu với 3 người?" (nút), đồng thời vẫn tiếp tục gom.
- t=25s: thả bot vào các ghế trống cho đủ 4, thông báo rõ "2 người + 2 máy".
- t=45s: nếu vẫn chỉ 1 người → chuyển hẳn sang chế độ đấu bot (3 bot), có xác nhận.
Cờ tỷ phú 4 người trận dài 20–40 phút, nên có thêm bước: xác nhận "bạn có 30 phút không?" trước khi vào bàn, giảm tỉ lệ bỏ trận giữa chừng — vốn là vấn đề số một của thể loại này.

THẢ BOT VÀO (ngưỡng theo độ dày pool)
Ngưỡng `T_bot` cấu hình được per-game, chỉnh theo số người online thực tế:
- co-caro: 10s (pool dày nhất, người chơi kiên nhẫn thấp nhất)
- co-tuong, co-vua: 15s
- co-ganh, o-an-quan, co-up: 20s
- co-vay: 30s (pool mỏng nhất; và nói thẳng với người chơi rằng pool mỏng)
Bot được chọn với `bot_rating` gần rating người chơi, cộng nhiễu ±40 để không quá máy móc. UI hiện nhãn bot ngay từ màn hình "đã tìm thấy đối thủ" — không giấu đến khi vào trận.

SAU KHI GHÉP
1. Ghi hàng `matches` trong Postgres (trạng thái `pending`), sinh `serverSeed` ngẫu nhiên 32 byte, lưu, và công bố `seedCommit = SHA256(serverSeed || matchId)`.
2. Chọn node `game-server` ít tải nhất (Redis heartbeat có `activeMatches`), ghi `match:{id}:owner`.
3. Đẩy `MATCH_FOUND {matchId, gameId, engineVersion, ruleHash, seedCommit, seats[], serverNode}` cho từng người qua gateway của họ.
4. Mỗi client trả về `clientSeed` (16 byte tự sinh) trong 5s. Seed cuối = HMAC-SHA256(serverSeed, clientSeedA || clientSeedB || … || matchId). Ai không trả lời thì dùng chuỗi rỗng.
5. Ai không xác nhận sẵn sàng trong 10s → huỷ ghép, người kia được ưu tiên trả về đầu hàng chờ (giữ nguyên joinedAt, không bị thiệt thời gian chờ), người bỏ bị phạt cooldown tăng dần (30s / 2 phút / 10 phút).

CHỐNG ÉP CẶP
Hai tài khoản cùng deviceId hoặc cùng /24 IP thì hệ số ưu tiên ghép giảm mạnh (không cấm hẳn — hai anh em cùng nhà là có thật), và trận giữa họ bị đánh dấu `suspect_pair` để job phân tích hậu kiểm. Không chặn ở thời điểm ghép vì sẽ tạo tín hiệu cho kẻ gian dò.

### Phòng
MÃ PHÒNG
6 ký tự Crockford Base32 bỏ I/L/O/U (32^6 ≈ 1.07 tỷ). Sinh bằng HMAC counter chứ không random rồi thử lại, nên không bao giờ đụng. Lọc qua blocklist từ tục tiếng Việt (bao gồm biến thể leet). Mã sống 30 phút kể từ hoạt động cuối; trận đang chơi thì mã sống tới hết trận.

SỞ HỮU
Mỗi phòng được GHIM vào đúng một node `game-server` (`room:{code}:owner` trong Redis, TTL renew bằng heartbeat). Mọi thao tác phòng đi qua node đó → không có tranh chấp ghi, không cần khoá phân tán cho từng thao tác. Node chết → owner key hết hạn → một node khác nhận phòng và khôi phục từ Redis hash; nếu trận đang chạy thì khôi phục từ snapshot + log input trong Postgres.

GHẾ
`seats: Array<{ index, occupant: {kind:'human'|'bot', ref} | null, ready: boolean, locked: boolean, color: number }>`
- Chủ phòng chỉnh: game, biến thể (variant), đồng hồ, số ghế, thêm/bớt bot (kèm chọn mức), khoá ghế, đá người.
- Đổi cấu hình khi có người đã sẵn sàng → mọi cờ ready bị xoá. Chống trò "đổi luật lúc người khác vừa bấm sẵn sàng".
- Bắt đầu được khi: số ghế có người ∈ [spec.minSeats, spec.maxSeats], tất cả ghế có người đều ready, chủ phòng bấm Bắt đầu.
- Phòng riêng mặc định KHÔNG tính elo (bạn bè hay cố tình nhường điểm). Có công tắc "tính điểm" nhưng chỉ bật được khi cả hai bên chưa từng đấu nhau quá 10 trận trong 24h.

MỜI BẠN
Deep link `hago://room/AB3K7Q` + universal link `https://hago.vn/r/AB3K7Q` (web mở được trang xem trước có nút mở app / tải app, giữ nguyên mã). Nút chia sẻ nhắm thẳng vào Zalo và Messenger — thị trường VN, Zalo là kênh chính. Kèm ảnh preview (OG image) sinh động theo game để link dán vào nhóm chat trông ra gì.

CHỦ PHÒNG THOÁT
- Trước khi bắt đầu: quyền chủ chuyển cho người vào sớm nhất còn lại. Nếu không còn người thật nào → phòng đóng, bot bị dọn.
- Đang trong trận: chủ phòng thoát CHỈ là mất kết nối bình thường. Trận không bao giờ kết thúc vì chủ phòng bỏ đi. Ghế đó đi theo đúng quy trình reconnect/timeout như mọi ghế khác. Quyền chủ vẫn chuyển ngay để người còn lại điều khiển được phòng chờ sau trận.
- Sau trận: cả phòng quay về phòng chờ, giữ nguyên ghế và cấu hình, có nút "Đấu lại" — đây là vòng lặp giữ chân quan trọng nhất của chơi với bạn bè, phải mượt tuyệt đối, không được bắt tạo phòng lại.

KHÁN GIẢ
Phòng cho phép tối đa 20 khán giả nhận `view(state, null)`. Với game thông tin ẩn (cờ úp, cờ tỷ phú), view khán giả bị làm mờ GIỐNG HỆT view người chơi — nếu không, một người có thể mở tài khoản phụ làm khán giả để đọc bài. Chat khán giả tách riêng khỏi chat người chơi và người chơi không thấy được, cùng lý do.

### Mỹ thuật riêng từng game
RANH GIỚI: VỎ CHUNG vs MẶT GAME
- `apps/mobile/app/` là VỎ: thanh điều hướng, sảnh, màn ghép cặp, phòng chờ, hồ sơ, bạn bè, cửa hàng, cài đặt, màn kết quả. Một bộ token duy nhất (`@hago/ui-tokens`), một bộ chữ, một ngôn ngữ chuyển động. Người dùng luôn biết mình đang ở trong Hago.
- `apps/mobile/games/<gameId>/` là MẶT GAME: chỉ tồn tại từ lúc vào bàn tới lúc rời bàn. Trong vùng này, gói game được quyền định nghĩa gần như mọi thứ về thị giác.

HỢP ĐỒNG MỖI GÓI GAME PHẢI XUẤT RA
  export default {
    Renderer: React.FC<{ view: V; me: Seat|null; onIntent(a: A): void;
                         pending: A|null; events: GameEvent[]; theme: ThemePack }>,
    theme:    ThemePack,        // bảng màu bàn cờ, texture, sprite quân, font BÀN CỜ
    sfx:      SoundPack,        // đặt quân, ăn quân, xúc xắc, chiếu, thắng, thua
    tutorial: TutorialScript,   // dạy chơi tương tác 60 giây
    rules:    { vi: string },   // trang luật đọc được trong app, theo từng biến thể
    haptics:  HapticMap,
  }
`onIntent` chỉ được phát ra ý định. Gói game KHÔNG được import gì từ `game-server`, KHÔNG được tự quyết nước nào hợp lệ để rồi hiển thị khác server. Nó gọi `engine.legalActions()` từ gói engine dùng chung — cùng hàm server dùng — nên tô sáng luôn khớp.

HAI NGUYÊN THỂ BÀN CỜ PHỦ CẢ 9 GAME
Đây là phát hiện thiết kế then chốt, nó giữ cho `@hago/game-kit` nhỏ:
- `LatticeBoard` — lưới điểm/ô + đồ thị cạnh tuỳ chọn. Phủ 6 game: cờ caro, cờ vua (ô), cờ tướng, cờ úp, cờ vây, cờ gánh (5×5 giao điểm CÓ đường chéo — chính vì vậy mà cần đồ thị cạnh chứ không chỉ toạ độ). Nó lo: ánh xạ toạ độ ↔ pixel, thu phóng/kéo, chạm-kéo-thả với vùng chạm nới rộng (ngón tay to hơn giao điểm cờ vây rất nhiều), tô sáng ô đích, vẽ mũi tên nước vừa đi.
- `CircuitBoard` — đồ thị đường đi có nút. Phủ 3 game: cá ngựa (vòng 56 ô + 4 nhánh về đích), cờ tỷ phú (vòng 40 ô), ô ăn quan (vòng 12 ô + 2 ô quan). Nó lo: quân di chuyển theo đường (animation đi từng ô một chứ không teleport — rất quan trọng cho cảm giác cá ngựa và ô ăn quan), vẽ nhiều quân chồng trên một nút, thẻ thông tin nút.
Mọi game đều vẽ trên React Native Skia canvas. HUD (đồng hồ, avatar, nút đầu hàng, chat) là RN view thường, do VỎ vẽ, và giống hệt nhau ở cả 9 game.

MỖI GAME MỘT LINH HỒN RIÊNG — cụ thể
- co-tuong / co-up: gỗ mít, quân tròn khắc chữ Hán đỏ-đen, sông kẻ nét bút lông, tiếng gỗ đặt xuống mặt bàn. Cờ úp thêm hiệu ứng lật quân có độ trễ và tiếng riêng — khoảnh khắc lật là cảm xúc cốt lõi của game này, phải làm thật đã.
- co-vua: thiết kế quốc tế hiện đại, quân vector phẳng, bàn hai tông trung tính, chuyển động tối giản. Khác hẳn cờ tướng một cách có chủ ý.
- co-vay: giấy dó, bàn kẻ mảnh, quân men bóng có bóng đổ mềm, gần như không âm thanh. Không gian tĩnh.
- co-ganh / o-an-quan: mỹ thuật dân gian — giấy điệp Đông Hồ, sỏi thật có vân, nền chiếu cói. Đây là hai game bản địa nhất, làm đúng chất sẽ là điểm khác biệt lớn nhất của Hago so với app quốc tế.
- co-caro: bảng kẻ ô vở học trò, X-O nét bút bi, giấy có gân. Vui, trẻ, nhẹ.
- co-ca-ngua: nhựa màu tươi, ngựa 3/4 view, xúc xắc rơi có vật lý thật, âm thanh lạch cạch. Đây là game gia đình, phải ồn ào và vui.
- co-ty-phu: bàn cờ thành phố Việt Nam (tên phố có thật, ai cũng nhận ra), thẻ tài sản, hoạt hình tiền bay. Nhiều chi tiết nhất trong 9 game.

PHÂN PHỐI ASSET — vấn đề rất thật ở VN
Nhồi mỹ thuật 9 game vào APK sẽ cho ra file 250MB+. Người dùng VN nhạy cảm với dung lượng cài và dung lượng 4G. Giải pháp: APK gốc chỉ chứa VỎ + game co-caro (~35MB). Mỗi bộ mỹ thuật là một gói tải thêm (zip có manifest + checksum) lấy từ CDN có PoP tại VN (Bunny/CloudFront + edge VN), tải lần đầu vào game đó với màn hình tiến trình, lưu cache trên máy, xoá được trong Cài đặt. Mỗi gói 8–25MB. Logic game (gói engine) thì LUÔN nằm trong binary — không bao giờ tải luật chơi qua mạng, vì phiên bản engine phải khớp tuyệt đối với server.

QUY TRÌNH THIẾT KẾ
Figma: một file design system cho VỎ (token xuất thẳng ra `ui-tokens`), và chín file riêng cho chín mặt game, mỗi file do một hướng nghệ thuật riêng dẫn dắt. Cố tình KHÔNG ép chín game dùng chung bảng màu — nếu ép, sẽ ra chín game trông như nhau, mất hết cái hay của việc gom cờ Việt và cờ quốc tế vào một chỗ. Cái thống nhất là VỎ và ngôn ngữ tương tác (chạm ở đâu, kéo thế nào, nút đầu hàng ở đâu), không phải màu sắc.

### Rủi ro
- Cờ tỷ phú sẽ CƯỠNG ÉP hạt nhân, không vừa vặn tự nhiên. Mô hình `Awaiting` sinh ra cho game lượt. Đấu giá realtime nhiều người cùng ra giá, đàm phán ba bên nhiều vòng, và đồng hồ đếm ngược liên tục sẽ đẩy nó tới giới hạn: `mode:'all'` và `Awaiting.tick` là hai thứ tôi thêm vào CHỈ vì cờ tỷ phú, và tôi chưa chứng minh được chúng đủ. Khả năng thực tế: cờ tỷ phú sẽ tuân thủ khoảng 80%, 20% còn lại phải có mã đặc thù trong game-server. GIẢM THIỂU: làm cờ tỷ phú cuối cùng (M9) để không kéo theo tám game kia; nếu tới M9 mà thấy phải sửa hạt nhân, thì thêm khái niệm mới (ví dụ `Awaiting.concurrent` có phiếu kín) chứ TUYỆT ĐỐI không cho cờ tỷ phú tự giữ trạng thái ngoài engine — đó là con đường một chiều tới chỗ không replay được.
- Log input đầy đủ tốn ghi và tốn kho, và cờ tỷ phú làm nó nặng gấp bội. 9 game × hàng nghìn trận đồng thời × mọi input. Với cờ tỷ phú tick 100ms, một trận 30 phút là 18.000 tick. GIẢM THIỂU: chỉ ghi input có `changed=true` (tick không đổi gì thì không ghi — đây là lý do cờ `changed` tồn tại trong `Reduced`); gộp INSERT theo lô 50ms; partition theo tháng; đẩy sang Parquet trên S3 sau 90 ngày. Nhưng phải nói thẳng: chi phí DB của kiến trúc này cao hơn kiểu 'chỉ lưu kết quả' khoảng 20-40 lần. Đó là cái giá mua khả năng kiểm toán và khôi phục sau sự cố.
- Dùng chung engine TS giữa client và server là con dao hai lưỡi. Nếu client cài bản engine mới hơn server (hoặc ngược lại, do người dùng không cập nhật app), dự đoán phía client sẽ lệch và người chơi thấy 'nước này hợp lệ mà server bảo sai'. GIẢM THIỂU: client gửi `engineVersion` trong tay bắt tay và trong RESUME; server từ chối bản không tương thích và ép cập nhật; client CHỈ dùng engine để tô sáng nước hợp lệ và chạy animation, KHÔNG BAO GIỜ để quyết định kết quả; bất kỳ lệch nào phát hiện được thì client im lặng đồng bộ lại từ view của server. Nhưng vẫn sẽ có một cửa sổ khó chịu mỗi lần lên phiên bản engine, và người dùng Android không cập nhật app là chuyện thường ngày ở VN.
- Bot JavaScript sẽ KHÔNG đủ mạnh cho cờ tướng ở mức người chơi giỏi. Minimax trong JS chậm hơn C khoảng 5-10 lần. Trong ngân sách 800ms, cờ tướng đạt depth 6-7 thay vì depth 10 của engine native — chênh lệch này tương đương vài trăm elo. GIẢM THIỂU: chấp nhận bot yếu ở giai đoạn đầu (đa số người chơi là phổ thông và sẽ không nhận ra); đo tỉ lệ thắng thua theo mức bot trên dữ liệu thật; chỉ khi có bằng chứng thì mới chuyển sang sidecar native. KHÔNG hứa hẹn bot 2400 elo bằng JS — đó là nói dối chính mình.
- Cờ vây là một dự án riêng đội lốt một mốc phát triển. Engine (superko, chấm điểm, chết-sống) khó, và bot thì thuộc về một họ thuật toán khác hẳn tám game còn lại — không tái sử dụng được một dòng nào của khung alpha-beta. Ước lượng 4-6 tuần có thể lệch gấp đôi. GIẢM THIỂU: đẩy xuống M8; cho phép ra mắt cờ vây chỉ-PvP nếu bot chưa đạt; giới hạn 9×9 trước. Cân nhắc nghiêm túc việc BỎ cờ vây khỏi phiên bản 1 — cộng đồng cờ vây VN nhỏ và khắt khe, làm nửa vời sẽ bị chê thẳng và không bù lại được bằng lượng người chơi.
- Bốn game Việt đều có dị bản theo vùng, và người chơi sẽ nói 'sai luật'. Cá ngựa, cờ gánh, ô ăn quan, cờ tỷ phú mỗi nơi chơi một kiểu. Đây không phải rủi ro kỹ thuật mà là rủi ro niềm tin — bình luận một sao đầu tiên sẽ là về luật, không phải về lag. GIẢM THIỂU: `variant` + `ruleHash` có từ ngày đầu trong MatchConfig và trong bảng matches; trang luật đọc được trong app cho từng biến thể; phòng riêng cho chọn biến thể. NHƯNG mỗi biến thể nhân đôi bề mặt test và bề mặt bot. Giới hạn cứng 2 biến thể/game trong năm đầu, và nói công khai biến thể nào đang được hỗ trợ.
- Hạ tầng một vùng Singapore là đủ cho cờ, hơi chật cho cờ tỷ phú, và WebSocket trên 4G Việt Nam hay rớt. RTT 30-50ms không thành vấn đề với game lượt nhưng đấu giá đếm ngược sẽ có cảm giác trễ. NAT của nhà mạng di động cắt kết nối nhàn rỗi sau 30-60 giây, buộc phải heartbeat 20s — tốn pin và tốn data, hai thứ người dùng VN để ý. GIẢM THIỂU: heartbeat nhẹ (2 byte), tạm dừng khi app xuống nền rồi RESUME khi quay lại (đây là lý do RESUME phải làm từ M1); chuẩn bị sẵn node tại VN nhưng chỉ triển khai khi số liệu đòi hỏi.
- Phát hiện dùng máy hỗ trợ bằng thống kê CÓ dương tính giả, và đó là chi phí nhân sự vĩnh viễn. Một kỳ thủ cờ tướng mạnh thật sẽ bị gắn cờ. Cấm nhầm một người giỏi là mất họ vĩnh viễn và mất uy tín trên mạng xã hội. GIẢM THIỂU: ngưỡng cao, luôn có người duyệt, có đường khiếu nại, không bao giờ bêu tên công khai. Nhưng phải thừa nhận: đây là một khoản chi định kỳ, không phải một tính năng làm xong là hết. Nếu không có ngân sách cho đội fair-play thì đừng bật chế độ xếp hạng cho cờ vua và cờ tướng.
- Cơ chế cam kết-hé lộ gần như không ai kiểm, nên đừng bán nó như một tính năng tin cậy. Giá trị thật của nó nằm ở chỗ nó trói chính chúng ta, và ở chỗ nó cho một câu trả lời kiểm chứng được khi có cáo buộc. Nếu marketing quảng bá quá đà ('xúc xắc minh bạch tuyệt đối!') thì người chơi thua vẫn sẽ không tin, và ta còn mang thêm tiếng khoác lác.
- RỦI RO KINH DOANH LỚN NHẤT, và nó nằm ở chính lập trường của tôi: 'làm chậm để không phải sửa nền' nghĩa là 6-9 tháng mới đủ 9 game. Một đối thủ ghép 9 game trung bình bằng template trong 3 tháng sẽ chiếm thị phần trước. Kiến trúc này chỉ SINH LỜI từ game thứ tư trở đi (M6 là mốc thu hoạch đầu tiên); trước đó nó thuần là chi phí. GIẢM THIỂU: ra mắt mềm từ M3 với MỘT game (cờ caro), coi tám game còn lại là các đợt nội dung phát hành dần, để có doanh thu và số liệu người dùng chạy song song với việc xây. Nếu ban lãnh đạo không chấp nhận được lộ trình này thì phải nói rõ ngay từ đầu rằng kiến trúc này sai với ràng buộc kinh doanh — chứ đừng cắt góc giữa chừng, vì cắt góc ở đây (bỏ log input, cho client giữ trạng thái, nhét bot vào game-server) sẽ phá đúng những thứ khiến nó đáng làm.

## Phương án: Một reducer, chín bàn cờ — trọng tài tập trung, bot ở ngoài tiến trình

**Luận điểm.** Đổi sự thanh lịch lấy tốc độ: một contract engine đủ mỏng (reducer thuần + RNG tiêm vào + hàm view) để 8/9 game nhét vừa, cố tình chấp nhận cờ tỷ phú sẽ phá contract và được cấp phép đi đường riêng, nhằm đưa 3 game lên tay người thật trong 8 tuần thay vì xây framework hoàn hảo trong 6 tháng.

### Stack
**Client: React Native + Expo (TypeScript), react-native-skia cho bàn cờ, Reanimated cho chuyển động quân.**
Lý do chọn RN chứ không phải Flutter/Unity: engine luật phải chạy **giống hệt nhau** ở server (trọng tài) và ở client (phản hồi tức thì khi chạm). RN cho phép dùng chung đúng một file TypeScript. Flutter buộc viết luật hai lần (Dart + TS) — với 9 game đó là 9 cặp bug lệch nhau. Unity/Phaser thì thừa: đây là cờ, không phải platformer, và Unity đội app lên 60-80MB — với thị trường VN (Android rẻ, 2-3GB RAM, mạng 4G chập chờn) đó là mất khách ngay ở bước tải.
Skia chứ không phải View thường: bàn cờ vây 19x19 = 361 giao điểm, bàn tỷ phú 40 ô + overlay — nếu dựng bằng View sẽ tụt khung hình trên máy yếu. Một renderer Skia dùng chung cho cả 9 game.

**Server: Node 20 + TypeScript, Fastify (HTTP) + `ws` (WebSocket), không dùng Colyseus.**
Lý do dùng Node: chung ngôn ngữ với engine. Đây là lý do duy nhất nhưng là lý do quyết định — nó xoá cả một lớp đồng bộ luật.
Lý do không dùng Colyseus: nó áp đặt mô hình state-sync riêng (schema, patch tự động) tối ưu cho game realtime; 8/9 game của ta là turn-based, mỗi lượt vài trăm byte. Tự viết vòng lặp phòng mất 3 ngày và ta kiểm soát hoàn toàn chuyện reconnect/replay.
Lý do không dùng Go/Elixir dù chúng hợp hơn về concurrency: engine sẽ phải viết lại. Không đáng ở giai đoạn này. Khi nào >20k CCU thì bàn lại — và lúc đó chỉ cần viết lại **gateway**, không phải engine.

**DB: PostgreSQL 16** (dữ liệu bền: user, ván đấu, nước đi, điểm). **Redis 7** (hàng chờ ghép cặp, phòng, presence, định tuyến room→node, hàng đợi bot qua BullMQ).
Không dùng MongoDB: dữ liệu ở đây quan hệ rõ (user–match–seat–move), và ta cần transaction khi cập nhật điểm.

**Bot: tiến trình riêng `bot-worker`, dùng `piscina` (pool worker_threads).** Chi tiết ở phần botModel.

**Hạ tầng: AWS ap-southeast-1 (Singapore) trước, không phải VN.**
Ping VN→SG ~25-40ms qua các nhà mạng chính — thừa tốt cho game lượt. Đặt máy trong nước (Viettel IDC/VNG) giảm được ~20ms nhưng đổi lấy vận hành thủ công và thiếu managed service. Chỉ chuyển về VN khi cờ tỷ phú realtime chứng minh là 40ms có vấn đề, hoặc khi yêu cầu pháp lý về lưu trữ dữ liệu bắt buộc.

**Monorepo: pnpm workspaces + Turborepo.** Bắt buộc, vì `packages/game-*` được import bởi cả mobile lẫn server.

### Hợp đồng engine
```ts
/* packages/engine-core/src/contract.ts
 * Một contract cho 9 game. Không phụ thuộc Node, không phụ thuộc React Native.
 * Nguyên tắc: engine là REDUCER THUẦN. Không giữ thời gian, không giữ socket,
 * không biết người chơi là ai. Server bơm ngẫu nhiên vào, server giữ đồng hồ.
 */

export type Seat = 0 | 1 | 2 | 3;

export type GameId =
  | 'co-caro' | 'co-ganh' | 'o-an-quan' | 'co-tuong' | 'co-up'
  | 'co-vua'  | 'co-ca-ngua' | 'co-vay'  | 'co-ty-phu';

/** Nguồn ngẫu nhiên DUY NHẤT. Server gieo hạt (seed) và ghi vào bảng matches.
 *  Replay = decode(seed) + phát lại danh sách action => ra đúng từng bit.
 *  Math.random() bị eslint chặn trong mọi package game-*. */
export interface Rng {
  int(n: number): number;         // trả [0, n)
  shuffle<T>(xs: T[]): T[];       // Fisher-Yates tại chỗ
  readonly cursor: number;        // đã rút bao nhiêu lần — assert khi replay
}

/** Ai đi tiếp.
 *  'auto' = engine còn việc tự làm: rút thẻ Cơ hội, ăn quan dây chuyền,
 *  bỏ lượt vì đổ xúc xắc không đi được, xử lý phá sản... */
export type Turn =
  | { kind: 'move'; seat: Seat; budgetMs: number }
  | { kind: 'auto'; delayMs: number }   // delayMs: gợi ý client chạy animation trước
  | { kind: 'over' };

export interface Ended {
  draw: boolean;
  ranking: Seat[][];              // hạng 1 trước; game 2 người: [[thắng],[thua]]
  reason: 'normal' | 'resign' | 'timeout' | 'abandon' | 'agreement';
  scores?: Partial<Record<Seat, number>>;   // ô ăn quan: dân+quan; cờ vây: điểm sau komi
}

/** Sự kiện engine phát cho client chạy hiệu ứng/âm thanh.
 *  BẤT BIẾN: cái gì lọt vào đây là công khai với mọi người. Không nhét bí mật. */
export type Ev = { t: string; seat?: Seat; [k: string]: unknown };

export interface Step<S> { state: S; events: Ev[] }

export interface Engine<S, A, V> {
  readonly id: GameId;
  readonly seats: { min: number; max: number };
  readonly chance: boolean;       // có xúc xắc / rút thẻ
  readonly hidden: boolean;       // có thông tin ẩn

  create(o: { seats: number; variant?: string; rng: Rng }): S;
  turn(s: S): Turn;

  /** Toàn bộ nước hợp lệ — SỰ THẬT của trọng tài. Bot KHÔNG dùng hàm này để tỉa nhánh. */
  legal(s: S, seat: Seat): A[];
  /** Kiểm tra rẻ cho đường nóng của server. Bắt buộc tương đương legal().some(eq(a)). */
  isLegal(s: S, seat: Seat, a: A): boolean;

  apply(s: S, seat: Seat, a: A, rng: Rng): Step<S>;
  /** Chạy MỘT bước tự động khi turn().kind === 'auto'. null = hết việc.
   *  Server gọi lặp, chặn cứng 64 vòng để một engine lỗi không treo phòng. */
  step(s: S, rng: Rng): Step<S> | null;

  onTimeout(s: S, seat: Seat): A;
  ended(s: S): Ended | null;

  /** THỨ DUY NHẤT được phép serialize ra khỏi tiến trình server.
   *  Bot cũng chỉ nhận V — bot không được biết nhiều hơn người. */
  view(s: S, who: Seat | 'spectator'): V;

  encode(s: S): string;
  decode(x: string): S;
  /** Khoá trạng thái: bắt lặp nước (cờ tướng/vây), transposition table của bot. */
  key(s: S): string;
}

/** Bot tách hẳn khỏi Engine, và CHỈ nhận View. */
export interface Bot<V, A> {
  readonly id: GameId;
  readonly maxLevel: number;
  pick(v: V, seat: Seat, level: number, budgetMs: number, abort: AbortSignal): Promise<A>;
}


/* ══════════ 1. GAME LƯỢT THUẦN — CỜ VUA ══════════
 * chance=false, hidden=false. view() trả chính nó. step() luôn null. */

export type ChessAction =
  | { t: 'move'; from: number; to: number; promo?: 'q' | 'r' | 'b' | 'n' }
  | { t: 'resign' } | { t: 'draw-offer' } | { t: 'draw-accept' };

export interface ChessState {
  board: Int8Array;               // 64 ô
  side: 0 | 1;
  castle: number; ep: number;     // quyền nhập thành, ô bắt tốt qua đường
  half: number; full: number;     // luật 50 nước
  reps: Record<string, number>;   // đếm lặp 3 lần
  offer: Seat | null;
  over: Ended | null;
}

export const coVua: Engine<ChessState, ChessAction, ChessState> = {
  id: 'co-vua', seats: { min: 2, max: 2 }, chance: false, hidden: false,

  create: () => fromFen(START_FEN),
  turn: s => s.over ? { kind: 'over' }
                    : { kind: 'move', seat: s.side as Seat, budgetMs: 0 },

  legal: (s, seat) => seat !== s.side ? offersOnly(s, seat)
                                      : [...genLegal(s), { t: 'resign' } as ChessAction],
  isLegal: (s, seat, a) =>
    a.t === 'resign' ? !s.over
    : a.t === 'draw-accept' ? s.offer !== null && s.offer !== seat
    : seat === s.side && pseudoLegal(s, a) && !leavesKingInCheck(s, a),

  apply(s, seat, a) {
    if (a.t === 'resign')
      return { state: { ...s, over: { draw: false, ranking: [[1 - seat as Seat], [seat]],
                                      reason: 'resign' } }, events: [{ t: 'resign', seat }] };
    const n = makeMove(s, a);
    const k = this.key(n);
    n.reps = { ...n.reps, [k]: (n.reps[k] ?? 0) + 1 };
    n.over = adjudicate(n);         // chiếu bí / hết nước / 50 nước / lặp 3
    return { state: n, events: evsOf(s, a) };
  },

  step: () => null,                 // cờ vua không có bước tự động — đây là ca đơn giản nhất
  onTimeout: () => ({ t: 'resign' }),
  ended: s => s.over,
  view: s => s,                     // thông tin hoàn hảo: bản chiếu chính là trạng thái
  encode: toFenPlus, decode: fromFenPlus,
  key: s => `${toFen(s)}`,
};


/* ══════════ 2. GAME XÚC XẮC, 2-4 NGƯỜI, CÓ LƯỢT THÊM — CÁ NGỰA ══════════
 * Điểm mấu chốt: "đổ xúc xắc" là một ACTION của người chơi, không phải chance node
 * lộ ra ngoài protocol. rng bị tiêu THỰC SỰ bên trong apply(), nên client không đoán được,
 * và replay vẫn khớp vì seed được ghi lại.
 * step() lo ca "đổ ra rồi nhưng không có nước nào đi được -> mất lượt". */

export type NguaAction = { t: 'roll' } | { t: 'move'; piece: number };

export interface NguaState {
  n: number;                      // số ghế đang chơi (2..4)
  cur: Seat;
  dice: number | null;            // null = chưa đổ
  sixes: number;                  // đổ 6 ba lần liên tiếp thì mất lượt (luật nhà)
  pos: Int8Array;                 // 16 quân: -1 chuồng, 0..55 vòng ngoài, 100+ đường về
  done: Seat[];
  over: Ended | null;
}

export const caNgua: Engine<NguaState, NguaAction, NguaState> = {
  id: 'co-ca-ngua', seats: { min: 2, max: 4 }, chance: true, hidden: false,

  create: ({ seats }) => ({ n: seats, cur: 0, dice: null, sixes: 0,
                            pos: new Int8Array(16).fill(-1), done: [], over: null }),

  turn(s) {
    if (s.over) return { kind: 'over' };
    if (s.dice === null) return { kind: 'move', seat: s.cur, budgetMs: 15_000 };
    return nguaMoves(s).length
      ? { kind: 'move', seat: s.cur, budgetMs: 15_000 }
      : { kind: 'auto', delayMs: 800 };        // để client kịp chiếu hiệu ứng "mất lượt"
  },

  legal: (s, seat) => seat !== s.cur ? []
    : s.dice === null ? [{ t: 'roll' }] : nguaMoves(s),
  isLegal(s, seat, a) { return this.legal(s, seat).some(x => JSON.stringify(x) === JSON.stringify(a)); },

  apply(s, seat, a, rng) {
    if (a.t === 'roll') {
      const d = rng.int(6) + 1;                 // <-- ngẫu nhiên tiêu ở đây, phía server
      const sixes = d === 6 ? s.sixes + 1 : 0;
      if (sixes === 3)                          // 3 lần 6 liên tiếp: mất lượt luôn
        return { state: { ...nextSeat(s), dice: null, sixes: 0 },
                 events: [{ t: 'rolled', seat, dice: [d] }, { t: 'log', text: 'Ba lần 6, mất lượt' }] };
      return { state: { ...s, dice: d, sixes }, events: [{ t: 'rolled', seat, dice: [d] }] };
    }
    const { pos, ate, home } = applyNguaMove(s, a.piece, s.dice!);
    const ev: Ev[] = [{ t: 'moved', seat, piece: a.piece, to: pos[a.piece] }];
    if (ate >= 0) ev.push({ t: 'captured', seat, piece: ate });
    // LƯỢT THÊM: đổ 6, hoặc ăn quân, hoặc đưa được quân về đích -> giữ nguyên s.cur
    const extra = s.dice === 6 || ate >= 0 || home;
    const base: NguaState = { ...s, pos, dice: null };
    return { state: checkWin(extra ? base : nextSeat(base)), events: ev };
  },

  step: (s) => (s.dice !== null && nguaMoves(s).length === 0)
    ? { state: { ...nextSeat(s), dice: null, sixes: 0 },
        events: [{ t: 'log', text: 'Không có nước đi hợp lệ, mất lượt' }] }
    : null,

  onTimeout: (s) => s.dice === null ? { t: 'roll' } : greedyNguaMove(s),
  ended: s => s.over,
  view: s => s,                    // xúc xắc đã đổ là công khai; không có gì để giấu
  encode: s => JSON.stringify({ ...s, pos: [...s.pos] }),
  decode: x => { const o = JSON.parse(x); return { ...o, pos: Int8Array.from(o.pos) }; },
  key: s => `${s.cur}|${s.dice}|${[...s.pos].join(',')}`,
};


/* ══════════ 3. THÔNG TIN ẨN — CỜ ÚP ══════════
 * Thiết kế quan trọng nhất của cả hệ: LẬT LƯỜI (lazy reveal).
 * KHÔNG gán danh tính quân lúc bày cờ. Quân úp đi theo vị trí xuất phát của nó
 * (đúng luật cờ úp), và chỉ khi nó đi nước đầu tiên mới RÚT danh tính từ túi.
 *
 * Ba cái lợi, đổi lấy gần như không mất gì:
 *  1. Kể cả dump bộ nhớ server trước lúc lật cũng không có đáp án — vì đáp án chưa tồn tại.
 *  2. Bot PIMC lấy mẫu đúng bằng phân phối thật, không cần hiệu chỉnh.
 *  3. Về mặt xác suất tương đương hoàn toàn với xáo trước (tính hoán vị được).
 *
 * Lưu ý luật: số quân CÒN ÚP là công khai (suy ra được từ bộ quân chuẩn trừ đi quân đã lộ).
 * Nên view() TRẢ VỀ danh sách quân còn trong túi — chỉ giấu quân nào nằm ở ô nào. */

export type UpAction = { t: 'move'; from: number; to: number } | { t: 'resign' };

export interface UpState {
  slot: Int8Array;                 // 90 ô: quân gốc theo vị trí xuất phát (-1 = trống)
  face: Int8Array;                 // danh tính thật sau khi lật; -1 = còn úp
  bag: { 0: number[]; 1: number[] };   // <<< BÍ MẬT: túi quân chưa lộ. Chỉ nằm trong S.
  side: 0 | 1;
  reps: Record<string, number>;
  over: Ended | null;
}

/** V = UpState trừ `bag`, cộng `census` (thống kê công khai của túi). */
export type UpView = Omit<UpState, 'bag'> & { census: { 0: number[]; 1: number[] } };

export const coUp: Engine<UpState, UpAction, UpView> = {
  id: 'co-up', seats: { min: 2, max: 2 }, chance: true, hidden: true,

  create: () => ({ slot: initialSlots(), face: new Int8Array(90).fill(-1),
                   bag: { 0: coveredSet(0), 1: coveredSet(1) },
                   side: 0, reps: {}, over: null }),

  turn: s => s.over ? { kind: 'over' } : { kind: 'move', seat: s.side as Seat, budgetMs: 0 },

  // Quân còn úp sinh nước theo VỊ TRÍ XUẤT PHÁT; quân đã lật sinh nước theo danh tính thật.
  legal: (s, seat) => seat !== s.side ? []
    : genUpMoves(s).concat([{ t: 'resign' }]),
  isLegal(s, seat, a) {
    return a.t === 'resign' ? !s.over
      : seat === s.side && pseudoUpLegal(s, a) && !leavesGeneralExposed(s, a);
  },

  apply(s, seat, a, rng) {
    if (a.t === 'resign')
      return { state: { ...s, over: { draw: false, ranking: [[1 - seat as Seat], [seat]],
                                      reason: 'resign' } }, events: [{ t: 'resign', seat }] };

    const face = Int8Array.from(s.face);
    const bag = { 0: [...s.bag[0]], 1: [...s.bag[1]] };
    const ev: Ev[] = [];

    if (face[a.from] === -1) {                       // <<< LẬT LƯỜI
      const b = bag[seat as 0 | 1];
      const id = b.splice(rng.int(b.length), 1)[0];  // rút đúng phân phối thật
      face[a.from] = id;
      ev.push({ t: 'revealed', at: a.from, piece: nameOf(id) });   // công khai, an toàn
    }
    const n = makeUpMove({ ...s, face, bag }, a);
    ev.push({ t: 'moved', seat, from: a.from, to: a.to });
    if (s.slot[a.to] !== -1) ev.push({ t: 'captured', seat, at: a.to });

    const k = this.key(n);
    n.reps = { ...n.reps, [k]: (n.reps[k] ?? 0) + 1 };
    n.over = adjudicateUp(n);
    return { state: n, events: ev };
  },

  step: () => null,
  onTimeout: () => ({ t: 'resign' }),
  ended: s => s.over,

  /** Hàm duy nhất được gọi trước khi ghi ra socket hoặc đẩy sang bot-worker. */
  view(s) {
    const { bag, ...pub } = s;
    return { ...pub, census: { 0: [...bag[0]].sort(), 1: [...bag[1]].sort() } };
  },

  encode: s => JSON.stringify({ ...s, slot: [...s.slot], face: [...s.face] }),
  decode: x => { const o = JSON.parse(x);
                 return { ...o, slot: Int8Array.from(o.slot), face: Int8Array.from(o.face) }; },
  key: s => `${s.side}|${[...s.slot].join('')}|${[...s.face].join('')}`,
};


/* ══════════ TESTKIT: bắt rò bí mật bằng máy, không bằng mắt ══════════
 * packages/engine-core/src/testkit.ts — chạy trong CI cho CẢ 9 game. */

const CANARY = 0xBEEF;   // trước khi test, nhồi giá trị này vào mọi trường bí mật

export function assertNoLeak<S, A, V>(e: Engine<S, A, V>, s: S) {
  for (const who of [0, 1, 2, 3, 'spectator'] as const) {
    const json = JSON.stringify(e.view(s, who as Seat | 'spectator'));
    if (json.includes(String(CANARY)))
      throw new Error(`${e.id}: view(${who}) làm rò bí mật`);
  }
}

/** Replay: chứng minh seed + danh sách action tái tạo đúng ván đấu.
 *  Đây là cái trả tiền cho toàn bộ thiết kế reducer thuần: xem lại ván miễn phí,
 *  khôi phục phòng khi node chết miễn phí, xử khiếu nại miễn phí, dữ liệu train bot miễn phí. */
export function replay<S, A, V>(
  e: Engine<S, A, V>, seed: string, seats: number, log: { seat: Seat; a: A }[],
): S {
  const rng = mulberry32(seed);
  let s = e.create({ seats, rng });
  for (const { seat, a } of log) {
    if (!e.isLegal(s, seat, a)) throw new Error(`${e.id}: log hỏng tại nước ${seat}`);
    s = e.apply(s, seat, a, rng).state;
    for (let i = 0; i < 64; i++) { const st = e.step(s, rng); if (!st) break; s = st.state; }
  }
  return s;
}
```

**Chỗ contract này sẽ gãy, nói trước:** cờ tỷ phú có *thương lượng đổi chác* — hai người chơi qua lại nhiều bước, và *đấu giá* có đồng hồ riêng. Cái đó không phải "một ghế, một action, một lượt". Cách xử lý: `S` của tỷ phú chứa một trường `pending: Auction | Trade | null`, và `turn()` trả về ghế nào đang phải phản hồi trong sub-protocol đó. Nó vừa vặn về mặt kiểu, nhưng sẽ xấu. **Không sửa contract cho tới khi game thứ 6 nói cho biết hình dạng đúng là gì.** Nếu tới lúc làm tỷ phú mà vẫn xấu — cho nó một module server riêng và đừng ép.

### Mô hình bot
**Bất biến số một, viết vào CONTRIBUTING.md: không có phép tìm kiếm nào được chạy trong tiến trình `game-server`.** Không ngoại lệ, kể cả bot cờ gánh nghĩ 3ms. Lý do không phải hiệu năng ngay hôm nay mà là foot-gun: sáu tháng nữa ai đó tăng độ sâu caro từ 6 lên 8, và 500 phòng đang chạy đứng hình. Một luật, dễ soi khi review.

**Đường đi của một nước bot:**
1. `game-server` thấy `turn().seat` là ghế bot → gọi `engine.view(state, botSeat)` → `BullMQ.add('bot', { gameId, viewJson, seat, level, budgetMs, replyTo: nodeId, matchId, ply })`. Bỏ luôn, không chờ. Vòng lặp phòng không bị chặn một micro-giây nào.
2. `bot-worker` (N replica, mỗi replica một `Piscina` pool = số core - 1) nhận job.
3. Bên trong worker thread: `bot.pick(view, seat, level, budgetMs, abort)`.
4. Worker trả action → publish lên Redis channel `node:<replyTo>` → `game-server` áp dụng qua đúng `isLegal` + `apply` như người thật. **Bot không có đường đi tắt nào vào trọng tài.**

**Ba lớp chặn deadline (một lớp là không đủ):**
- *Trong thuật toán:* iterative deepening, cứ 2048 node thì kiểm tra `Date.now()` và `abort.aborted`; hết giờ thì bỏ độ sâu đang dở và trả nước tốt nhất của độ sâu trước. Luôn có sẵn nước hợp lệ từ depth 1.
- *Ngoài worker:* `piscina.run(job, { signal: AbortSignal.timeout(budgetMs + 250) })`.
- *Cứng:* pool đặt `idleTimeout` + đếm job quá hạn; thread kẹt bị `terminate()` và tạo lại. Một thread chết không kéo theo ai.

**Hai hàng đợi tách biệt theo chi phí, đây là chỗ đã trả giá trước:**
- `bot:fast` — caro, gánh, ô ăn quan, cá ngựa, tỷ phú. Ngân sách ≤ 50ms CPU.
- `bot:heavy` — cờ tướng, cờ vua, cờ úp, cờ vây. Ngân sách 300-1500ms CPU.
Nếu chung một hàng, một ván cờ vây 19x19 đang nghĩ 1.5s sẽ làm 200 ván caro đợi. Tách từ ngày đầu vì nó tốn 10 dòng; gộp lại thì tốn một đêm sự cố.

**Bot chỉ nhận `View`, không bao giờ nhận `State`.** Điều này nghe như chuyện đạo đức nhưng thực ra là chuyện kiến trúc: `bot-worker` là tiến trình riêng, cái duy nhất đi qua ranh giới là JSON của `view()`. Không có cách nào để bot cờ úp nhìn trộm túi quân, kể cả khi lập trình viên muốn. Miễn phí, chỉ cần không phá.

**Thuật toán từng game — không dùng chung một khuôn:**
| Game | Thuật toán | Ngân sách | Nơi chạy |
|---|---|---|---|
| cờ gánh | negamax + alpha-beta, depth 10-14 (không gian bé nhất nền tảng) | 30ms | fast |
| ô ăn quan | negamax + alpha-beta + TT, depth 12+; state chỉ 12 số nguyên | 30ms | fast |
| cờ caro | negamax + alpha-beta, sinh nước chỉ quanh quân đã đặt bán kính 2, threat-space search cho VCF/VCT, depth 8-10 | 80ms | fast |
| cờ vua | negamax + AB + ID + TT + killer/history + quiescence, depth 6-9 | 800ms | heavy |
| cờ tướng | như trên, hệ số phân nhánh ~38, thêm bảng vị trí quân riêng cho tướng/sĩ/tượng | 800ms | heavy |
| cờ úp | **PIMC**: lấy K=24 mẫu xác định hoá từ `census` công khai, mỗi mẫu negamax depth 4-5, bỏ phiếu theo tần suất-trọng số; ngân sách chia đều, cắt bớt K nếu chậm | 1200ms | heavy |
| cá ngựa | expectimax 1-2 ply + heuristic tay (tiến độ, giá trị ăn, độ an toàn, chồng quân). Không cần cây sâu — nhánh xúc xắc giết hết lợi ích | 5ms | fast |
| cờ vây | **MCTS/RAVE, 9x9 thôi**, ~20k playout nhẹ. 13x13/19x19 không có bot ở bản đầu — ghi rõ "Sắp có" trong UI | 1500ms | heavy |
| cờ tỷ phú | **Không tìm kiếm cây.** Policy luật cứng: bảng quyết định mua/xây theo tỷ lệ tiền mặt-tài sản, ROI ô, vị trí đối thủ. Riêng đánh giá đề nghị đổi chác thì chạy 200 rollout Monte Carlo ngẫu nhiên tới cuối ván | 200ms | fast |

**Thời gian nghĩ giả.** Bot gánh trả lời sau 3ms sẽ khiến người chơi thấy như đang đấu với máy tính — đúng thật, nhưng làm hỏng nhịp. Server giữ nước bot lại tới khi đủ `600 + jitter(0..900)ms`, cấp cao thì lâu hơn, và lâu hơn ở thế cờ có nhiều nước hợp lệ. Cái này ở `game-server`, không ở bot.

**Lối thoát cho cờ tướng/cờ vua cấp cao (đợt 3):** negamax TypeScript 800ms rơi vào khoảng ~1700-1900 Elo. Người chơi cờ tướng Việt Nam khá mạnh, cấp "Cao thủ" sẽ bị chê. Khi đó thêm một pool tiến trình con chạy Pikafish/Fairy-Stockfish (giao thức UCI/UCCI), một tiến trình phục vụ một ván, `position fen ... / go movetime 800`. Vẫn là `bot-worker`, chỉ đổi adapter — `Bot` interface không đổi. Không làm sớm: ba cấp đầu bằng TS là đủ cho 95% người chơi, và binary native kéo theo cả một câu chuyện build/deploy.

### Ghép cặp
**Cấu trúc.** Một Redis sorted set cho mỗi tổ hợp `(gameId, mode, timeControl)`, score = điểm Glicko. Vé xếp hàng là hash `mm:t:<ticketId>` với TTL 120s.

**Vòng ghép** chạy mỗi 250ms cho từng bucket (một tiến trình `matchmaker` duy nhất, khoá bằng Redis lock để không chạy đôi):
```
window(waitSec) = min(600, 80 + 40 * floor(waitSec / 5))
```
Quét sorted set theo thứ tự, ghép hai vé liền kề nếu `|elo_a - elo_b| <= max(window_a, window_b)`. Người chờ lâu nhất được ưu tiên ghép trước (chống đói).

**Giai đoạn PENDING_ACCEPT.** Cặp ghép xong không vào trận ngay: 5 giây cho cả hai bấm "Vào trận". Ai từ chối/hết giờ thì người kia quay lại hàng với thời gian chờ được **giữ nguyên** (không bị reset — đây là chi tiết nhỏ nhưng quyết định cảm giác công bằng). Người từ chối bị cộng `declineCount`, và sau 3 lần trong 10 phút thì bị xếp sau trong hàng. Không ban, chỉ hạ ưu tiên.

**Thả bot khi chờ lâu — và thả một cách trung thực.** Ở giây thứ 12, nếu chưa ghép được, hiện sheet: *"Chưa tìm được đối thủ. Chơi với máy (Khá) nhé?"* với nút một chạm, đồng thời vẫn giữ vé trong hàng — nếu có người thật xuất hiện trước khi bấm thì huỷ sheet, vào trận người. Kèm một tuỳ chọn trong cài đặt: "Tự chơi với máy nếu chờ quá 15 giây".

Nói thẳng về đánh đổi: nhiều đối thủ trong thị trường **âm thầm** nhét bot và gắn tên/avatar giả người. Tỷ lệ chuyển đổi cao hơn thấy rõ ở tuần đầu. Tôi khuyên **không** làm, và không phải vì đạo đức suông: cộng đồng cờ tướng/caro Việt soi rất kỹ, chỉ cần một bài bóc phốt trên nhóm Facebook là mất niềm tin không lấy lại được, mà niềm tin là tài sản duy nhất của một nền tảng có xếp hạng. Ván đấu với bot được gắn nhãn rõ và **không tính điểm xếp hạng**.

**Game 4 người (cá ngựa, cờ tỷ phú) — lấp bàn theo giai đoạn:**
- T=0..8s: gom vé, cửa sổ điểm hẹp.
- T=8s: mở "bàn" với những ai đang có (tối thiểu 2), chuyển tất cả vào phòng chờ có mã, hiện `Đang chờ (2/4)` và đếm ngược 10s.
- T=8..18s: ai vào hàng sau được ném thẳng vào ghế trống của bàn này (không tạo bàn mới) — đây là mẹo quan trọng, nó gom thanh khoản thay vì xé nhỏ.
- T=18s: hiện nút **"Bắt đầu luôn"** (chơi 2-3 người) và **"Thêm máy"** cho từng ghế trống. Chủ bàn quyết. Không tự động điền bot.
- Nếu tổng số người chờ trong bucket < 4 suốt 30s thì hạ tối thiểu xuống 2 và ghép thành ván 1-1 luôn (cá ngựa 2 người vẫn vui; tỷ phú 2 người thì kém, nên tỷ phú đề xuất bot).

**Giờ cao điểm VN:** thanh khoản tập trung 20h-23h. Ngoài khung đó, nới `window` nhanh hơn (hệ số 40 → 100) và hạ ngưỡng gợi ý bot từ 12s xuống 8s. Cấu hình động qua `api`, không hardcode — con số này sẽ phải chỉnh hàng tuần trong 2 tháng đầu.

### Phòng
**Mã phòng: 6 ký tự Crockford base32 bỏ ký tự dễ nhầm (bỏ I, L, O, U).** Sinh từ `HMAC(secret, counter)` cắt lấy 30 bit rồi mã hoá — không tuần tự, không dò được bằng cách tăng dần. Va chạm thì thử lại. Phòng sống trong Redis, TTL 30 phút, gia hạn mỗi lần có hoạt động.

**Chia sẻ — thiết kế quanh Zalo, không quanh SMS.** Ở Việt Nam kênh mời bạn chơi là Zalo và Messenger. Cần:
- Universal/App Link `https://hago.vn/r/ABC123` → mở app nếu đã cài, không thì vào Play/App Store rồi **deferred deep link** vào đúng phòng sau khi cài (dùng branch.io hoặc tự làm bằng device fingerprint + cửa sổ 10 phút).
- Trang `/r/:code` sinh **OG image động**: ảnh bàn cờ của đúng game đó + mã phòng cỡ lớn + tên người mời. Trong khung chat Zalo cái này quyết định tỷ lệ bấm.
- Nút "Sao chép mã" song song với "Chia sẻ", vì rất nhiều người sẽ chỉ đọc mã qua điện thoại.

**Cấu trúc phòng:**
```ts
type Room = {
  code: string; gameId: GameId; variant?: string;
  hostId: string; createdAt: number;
  seats: { seat: Seat; occupant: null | { kind:'human'; userId:string } | { kind:'bot'; level:number }; ready: boolean }[];
  settings: { timeControl: string; rated: false; spectators: boolean };
  state: 'lobby' | 'playing' | 'ended';
  matchId?: string;
}
```
**Phòng riêng luôn `rated: false`.** Bỏ qua tranh cãi này ngay từ đầu — bạn bè cày điểm cho nhau là thứ sẽ phá bảng xếp hạng trong tuần đầu tiên và rất khó phát hiện sau đó.

**Ghế:** chủ phòng đổi chỗ được, đá người được, đặt bot vào bất cứ ghế trống nào trước khi bắt đầu (chọn cấp độ từng bot). Người vào sau tự ngồi ghế trống đầu tiên. Khán giả không giới hạn ghế, nhưng với game thông tin ẩn (cờ úp) khán giả nhận `view(s, 'spectator')` — tức là **cũng không thấy quân úp**. Nếu không làm vậy thì ba người ngồi cạnh nhau ngoài đời là xong ván.

**Sẵn sàng:** trận bắt đầu khi mọi ghế có người đều `ready` và số ghế có người ≥ `engine.seats.min`. Chủ phòng có nút bắt đầu ép sau 20s nếu ai đó treo — ghế chưa ready bị chuyển thành bot hoặc bị bỏ trống tuỳ game.

**Chủ phòng thoát:**
- *Chưa bắt đầu:* chuyển quyền chủ cho người vào sớm nhất còn lại. Không còn ai → xoá phòng.
- *Đang chơi:* quyền chủ không còn ý nghĩa; chạy đúng luồng mất kết nối bên dưới. Phòng chỉ chết khi ván kết thúc hoặc mọi ghế người đều bỏ.

Phòng chỉ được ghi xuống Postgres **khi trận bắt đầu** (thành một bản ghi `matches` với `source='room'`). Phòng trong sảnh chưa bắt đầu thì sống chết trong Redis — không cần bền, và giữ cho DB sạch.

### Mỹ thuật riêng từng game
**Ranh giới: khung app sở hữu mọi thứ trừ mặt bàn cờ. Game sở hữu mặt bàn cờ và bộ token nhuộm khung.**

Mỗi package `game-*` xuất đúng bốn thứ:
```ts
export default {
  meta:  { id, nameVi: 'Cờ tướng', seats: [2,2], tags: ['cổ điển','trí tuệ'], ageHint: 8 },
  engine,                       // luật
  bot,                          // trí tuệ
  BoardView,                    // React component, nhận { view, legal, onAction, seatOf }
  theme,                        // token
  sfx,                          // { move, capture, check, win, tick }
} satisfies GameModule;
```

`BoardView` được `MatchFrame` render vào một vùng khoá tỷ lệ ở giữa màn hình. Nó **không** được vẽ header, đồng hồ, avatar, nút đầu hàng, kết quả — tất cả là của khung. Điều này ép tính nhất quán bằng cấu trúc chứ không bằng kỷ luật: lập trình viên game không có chỗ để tự vẽ nút.

**`theme` là cơ chế "9 bộ mặt riêng" — khung tự nhuộm theo game:**
```ts
type GameTheme = {
  surface: string | Gradient;   // nền toàn màn hình
  felt: string;                 // chất liệu mặt bàn
  ink: string; inkDim: string;  // chữ trên nền đó
  accent: string;               // nút chính, viền chọn, thanh tiến trình
  boardStyle: 'wood' | 'paper' | 'lacquer' | 'cloth' | 'board-game';
  pieceStyle: 'engraved' | 'flat' | 'stone' | 'seed' | 'token';
  display: FontSpec;            // font tiêu đề riêng của game
  motion: { snap: number; settle: number };  // nhịp chuyển động quân
};
```
`ThemeProvider` bơm bộ token này vào toàn bộ `@hago/ui`, nên cùng một component `<Button>` sẽ đỏ son trên cờ tướng, xanh rêu trên cờ vây, vàng đồng trên cờ tỷ phú. **Bố cục giống hệt nhau, cảm giác khác hẳn.** Người dùng học một lần, dùng được cả 9 game — nhưng vào cờ vây thì thấy mình đang ở trong một thế giới khác.

**Hướng mỹ thuật từng game (đủ khác nhau để nhận ra qua ảnh chụp màn hình):**
| Game | Hướng |
|---|---|
| cờ caro | Giấy kẻ ô vở học trò, X-O vẽ bút bi, nghịch ngợm |
| cờ gánh | Sân gạch đỏ Bắc Bộ, quân sỏi trắng-đen, dân dã |
| ô ăn quan | Sân đất kẻ phấn, sỏi và quân là viên đá lớn, hiệu ứng rải sỏi từng viên |
| cờ tướng | Gỗ mít, quân khắc chữ Hán sơn son-lam, nghiêm cẩn |
| cờ úp | Cùng bàn cờ tướng nhưng tông tối hơn, mặt lưng quân có hoa văn, hiệu ứng lật là điểm nhấn |
| cờ vua | Đá cẩm thạch, tối giản, quốc tế, sạch |
| cờ vây | Gỗ kaya, đá và vỏ sò, nhiều khoảng trắng, tĩnh |
| cá ngựa | Bìa carton in màu, nhựa bóng, ồn ào vui vẻ, xúc xắc 3D nảy |
| cờ tỷ phú | Bàn board game hiện đại, thẻ bài, chip, đồ hoạ phẳng rực rỡ |

**Thực thi:**
- Một renderer Skia duy nhất (`packages/ui/BoardCanvas`) lo lưới, toạ độ, chạm, highlight, animation quân. Từng game chỉ cấp *bộ vẽ* (cách vẽ một ô, một quân) và bảng toạ độ. Bàn cờ vây 19x19 và bàn tỷ phú 40 ô dùng chung code này với hai layout khác nhau.
- Tài nguyên: SVG cho quân, WebP cho chất liệu nền. **Chỉ 3 game đầu nhúng trong app.** Từ game thứ 4 trở đi, art pack tải từ CDN lần đầu mở game (hiện tiến trình, ~2-4MB/game). Lý do: kích thước APK là chỉ số chuyển đổi thật ở thị trường Việt Nam; mục tiêu bản cài đặt < 40MB. Với 9 bộ mỹ thuật nhúng hết thì sẽ vượt gấp đôi.
- Âm thanh: khung cung cấp 5 sự kiện chuẩn (`move/capture/check/win/tick`), game cấp file. Đảm bảo có âm thanh nhất quán mà vẫn đúng chất từng game (tiếng quân gỗ vs tiếng sỏi vs tiếng xúc xắc).

### Rủi ro
- **Contract `Engine` sẽ gãy ở cờ tỷ phú, và tôi chưa biết gãy thế nào.** Thương lượng đổi chác là đối thoại nhiều bước giữa hai người chơi, đấu giá có đồng hồ riêng — không phải 'một ghế, một action'. Cách vá tạm: `S.pending: Auction | Trade | null` và `turn()` trả về ghế đang phải phản hồi. Nó vừa kiểu dữ liệu nhưng sẽ xấu. Giảm thiểu: KHÔNG sửa contract trước game thứ 6; nếu tới lúc đó vẫn xấu thì cho cờ tỷ phú module server riêng và chấp nhận trùng lặp. Trùng lặp một game rẻ hơn một lớp trừu tượng sai cho tám game.
- **Bot cờ tướng sẽ bị chê, và người chê là khách hàng quý nhất.** Negamax TypeScript 800ms rơi khoảng 1700-1900 Elo. Người chơi cờ tướng Việt Nam ở nhóm chịu tải app rất mạnh. Giảm thiểu: chỉ mở 3 cấp, cấp cao nhất đặt tên 'Khá' chứ không phải 'Cao thủ', nói thẳng trong UI. Trả nợ bằng Pikafish/Fairy-Stockfish qua UCI ở đợt 3 — adapter thay được, interface `Bot` không đổi.
- **Ba game ra mắt đầu (caro, gánh, ô ăn quan) là nhóm RẺ NHẤT chứ không phải HẤP DẪN NHẤT.** Không ai tải app vì ô ăn quan. Đây là lựa chọn có ý thức: beta kín ở tuần 8 để học về ghép cặp/mất mạng/bot với rủi ro tối thiểu, ra mắt thật ở tuần 12 khi có cờ tướng. Rủi ro thật là áp lực nội bộ sẽ đòi ra mắt công khai ở tuần 8 vì 'đã chạy được rồi'. Đừng. Chỉ số giữ chân của bản 3-game đó sẽ tệ và sẽ bị diễn giải sai là nền tảng có vấn đề.
- **NỢ KỸ THUẬT CÓ CHỦ Ý — luật lặp nước cờ tướng.** Bản đầu chỉ xử hoà khi lặp thế 3 lần. Luật châu Á thật có trường chiếu, trường bắt, và quy định bên nào phải đổi nước — phức tạp và là nguồn cãi vã kinh điển. **Phải trả trước khi có bảng xếp hạng mùa giải hoặc bất kỳ phần thưởng nào.** Ước tính 1 tuần cộng một người am hiểu luật.
- **NỢ KỸ THUẬT CÓ CHỦ Ý — không dự đoán phía client cho game thông tin ẩn.** Cờ úp phải chờ server trả lời (~60ms từ VN tới Singapore). Chấp nhận được với game lượt. Chỉ trả nợ nếu số liệu cho thấy người chơi than phiền về độ trễ — nhiều khả năng là không bao giờ.
- **NỢ KỸ THUẬT CÓ CHỦ Ý — phòng dính chặt vào một node, không di trú sống.** Node chết thì phòng dựng lại bằng replay, người chơi khựng 2-5 giây. Chấp nhận được dưới ~5.000 CCU. **Trả nợ khi vượt mốc đó**, hoặc khi cờ tỷ phú realtime khiến 5 giây khựng thành không chấp nhận được.
- **Cờ tỷ phú 40 ô trên Android 2GB RAM là chỗ React Native + Skia sẽ đau.** Nhiều lớp overlay, thẻ bài, hoạt ảnh di chuyển dài, ván 45 phút nên rò bộ nhớ sẽ tích luỹ. Giảm thiểu: đặt một spike hiệu năng 3 ngày ở đầu M7 trước khi viết logic; nếu không đạt 45fps trên máy chuẩn thì đổi sang render toàn bộ bàn trong một Skia canvas với render thủ công thay vì component cây.
- **Cờ tỷ phú trên di động có tỷ lệ bỏ ván 30-50% vì ván dài 30-45 phút.** Nếu chỉ có bản luật đầy đủ thì phòng sẽ vắng và người ở lại cũng bỏ vì bị bỏ rơi. Bắt buộc phải có chế độ rút gọn 15 phút ngay ở bản đầu, cộng với bot-thay-ghế. Nếu không đủ nguồn lực làm cả hai thì **hoãn cờ tỷ phú**, đừng ra bản nửa vời — đây là game dễ làm hỏng danh tiếng nhất.
- **Xếp hạng Glicko cho cá ngựa và cờ tỷ phú sẽ trông như bị lỗi.** Bốn người, may rủi lớn, phương sai áp đảo kỹ năng trong 50 ván đầu. Nếu dùng Elo, người chơi sẽ thấy điểm nhảy loạn và kết luận hệ thống hỏng. Đã thiết kế tránh (ladder điểm mùa vụ) nhưng rủi ro là ai đó sẽ đòi 'cho thống nhất với các game khác'. Phải giữ.
- **Thả bot vào hàng chờ là con dao hai lưỡi mà tôi chọn phía an toàn hơn — và có thể tôi sai về mặt tăng trưởng.** Âm thầm nhét bot giả người sẽ cho tỷ lệ chuyển đổi tốt hơn rõ rệt ở tuần đầu. Tôi khuyên gắn nhãn rõ và không tính điểm, chấp nhận số liệu xấu hơn, vì cộng đồng cờ Việt soi kỹ và một bài bóc phốt là mất niềm tin vĩnh viễn. Nếu ban lãnh đạo chọn ngược lại, ít nhất đừng để bot leo hạng.
- **Giấy phép G1 là rủi ro ra mắt lớn nhất và không phải rủi ro kỹ thuật.** Trò chơi có tương tác giữa người chơi qua mạng cần quyết định phê duyệt nội dung kịch bản; quy trình 2-4 tháng, và mọi hình thức chip/đặt cược sẽ kéo vào phạm vi pháp luật về cờ bạc. Giảm thiểu: nộp hồ sơ từ tuần 4, tuyệt đối không có tiền ảo quy đổi được trong 12 tháng đầu, và cho luật sư xem thiết kế kinh tế TRƯỚC khi viết dòng code nào về vật phẩm.
- **Chín engine là chín bộ luật phải đúng, và lỗi luật là loại bug đắt nhất.** Một nước cờ tướng xử sai trong ván xếp hạng thì người chơi không tha. Giảm thiểu: `perft` cho cờ vua và cờ tướng (so với số liệu chuẩn đã công bố), 10.000 ván tự chơi ngẫu nhiên cho mỗi game trong CI để bắt crash và trạng thái kẹt, và một bộ test hồi quy dựng từ chính các ván bị báo lỗi — mỗi khiếu nại thành một test case vĩnh viễn nhờ có replay.

## Giám khảo 1 — chọn: Hago — "Engine thuần, Server là chân lý, Bot ở ngoài tiến trình"

### Lỗi chết người
1. LUỒNG EVENT LÀ ĐƯỜNG RÒ BÍ MẬT THỨ HAI, KHÔNG AI CANH — cả hai đều mắc. Cả hai tuyên bố `view()` là 'cửa ải DUY NHẤT' rồi cả hai phát `events`/`Ev[]` đi thẳng ra dây, NGOÀI cửa ải đó. B còn tự chứng minh: testkit CANARY chỉ quét `view()`, không quét `events`. Ở cờ úp, một event `{t:'captured', at: X}` phát ra chỉ trong một số điều kiện, hay mang theo loại quân vừa di chuyển, là lộ bài. Ở cờ tỷ phú, event rút thẻ Khí Vận phát cho cả bàn là lộ. Ở cá ngựa thì vô hại — nên bug này sẽ sống sót qua 6 game rồi giết ở game thứ 7. SỬA: đổi chữ ký thành `view(state, seat) -> { v: V; events: Ev[] }` — events là MỘT TRƯỜNG CỦA VIEW, sinh ra sau khi lọc theo ghế, và CANARY quét cả hai.
2. KHÔNG CÓ IDEMPOTENCY THẬT CHO ACTION. B không có nonce nào cả; A có nonce nhưng bảng nonce nằm trong Redis mà A tự tuyên bố Redis KHÔNG BAO GIỜ là chân lý. Redis flush hoặc failover → action cũ được áp dụng lần hai. Ở cá ngựa đây là cheat khai thác trực tiếp: client 4G retry `{t:'roll'}` sau timeout, server đổ xúc xắc lần hai. SỬA: unique index `(match_id, seat, nonce)` trong CÙNG transaction Postgres với lệnh append input log; Redis chỉ là cache đường nhanh, không phải nơi quyết định.
3. KHÔNG CÓ BÙ TRỄ MẠNG (lag compensation) Ở CẢ HAI. Cả hai tính đồng hồ từ lúc server gửi thế cờ tới lúc nhận nước — tức là người chơi trả tiền cho RTT. Trên 4G Việt Nam, carrier NAT jitter cộng 200-800ms là chuyện thường. A còn tệ hơn ở chỗ đồng hồ nằm TRONG state và `spentMs` được ghi vào input log, nên con số SAI được công chứng vĩnh viễn. Cờ chớp sẽ đẻ ra một dòng ticket 'tôi không hết giờ, server lag của anh lag'. SỬA: đo RTT mỗi kết nối, trừ `min(rtt/2, 1000ms)` khỏi spentMs, cộng một khoảng ân hạn mỗi nước, và GHI CẢ HAI giá trị (thô và đã bù) vào log.
4. ĐẤU GIÁ TỶ PHÚ LÀ CUỘC ĐUA PING TRONG CẢ HAI THIẾT KẾ. `mode:'all'` với một deadline duy nhất của A, và `pending: Auction` của B, đều để giá đi tới theo thứ tự ĐẾN. Ai ping thấp nhất, hoặc ai viết script, luôn ra giá cuối cùng ở deadline-1ms và luôn thắng. Đó không phải đấu giá, đó là đo đường truyền. SỬA: đấu giá KÍN — server nhận cam kết giá, mở đồng loạt khi cửa sổ đóng, hoà thì phân xử bằng đồng xu gieo từ matchSeed, TUYỆT ĐỐI không bao giờ theo thời điểm nhận. Và phải thêm `Awaiting.sealed` vào hạt nhân NGAY TỪ ĐẦU, không phải 'nếu tới M9 thấy cần' — nhét một nguyên thể đồng thời vào một log thuần lượt về sau chính là cái cửa một chiều mà A tự cảnh báo.
5. META-ACTION BỊ CÀI LẠI 9 LẦN TRONG CẢ HAI, VÀ SẼ LỆCH NHAU. Đầu hàng, hết giờ, mất kết nối, cầu hoà, bỏ trận, bot tiếp quản — ngữ nghĩa giống hệt nhau ở cả 9 game, nhưng cả hai contract đều bắt từng engine tự xử. B chứng minh luôn tại chỗ: `coVua.isLegal` cho `draw-offer` đi qua, rồi `coVua.apply` không có nhánh nào bắt nó và rơi thẳng vào `makeMove(s, a)` — crash ở đúng ví dụ đơn giản nhất. Nhân cái đó với 9 engine × 6 meta-action = 54 chỗ để sai lặng lẽ. SỬA: một wrapper `withStandardMeta(engine)` sở hữu toàn bộ 6 input đó cho cả 9 game; engine chỉ nhìn thấy nước đi game.
6. 'REPLAY TÁI LẬP BIT-BY-BIT' LÀ SAI NGAY KHI CÓ BOT NGỒI GHẾ — mà đó là phần lớn trận 4 người. A có log `botSeed` (tốt hơn B, vốn không log gì), nhưng tìm kiếm của bot bị chặn bằng ĐỒNG HỒ TƯỜNG qua iterative deepening: cùng một seed, trên máy đang tải nặng, depth hoàn tất khác nhau → NƯỚC ĐI KHÁC. Toàn bộ giá trị kiểm toán và khôi phục sau sự cố tan biến ở đúng nhóm trận có nhiều tranh chấp nhất. SỬA: ghi vào input log CHÍNH NƯỚC BOT ĐÃ CHỌN, không chỉ seed; coi bot là một nguồn input bên ngoài giống người, đúng như hai tài liệu đã nói về mặt cổng vào nhưng quên làm về mặt log.
7. XẾP HẠNG GLICKO ÁP LÊN CẢ 9 GAME. Cả hai đều dùng rating Glicko-2 làm score hàng chờ cho mọi game. Ở cá ngựa và cờ tỷ phú — 4 người, xúc xắc, may rủi áp đảo — 50 ván đầu là nhiễu thuần tuý, điểm sẽ nhảy loạn và người chơi kết luận hệ thống hỏng. B có nhận ra rủi ro này nhưng vẫn giữ Glicko. SỬA: rating thật chỉ cho 6 game thông tin hoàn hảo; cá ngựa và tỷ phú dùng thang điểm mùa vụ cộng dồn, và nói rõ trong UI vì sao khác.
8. CHỐNG DÙNG MÁY HỖ TRỢ: A có một đoạn văn, B hoàn toàn im lặng. Đây là cheat giết chết mọi nền tảng cờ có xếp hạng, và dữ liệu để phát hiện thì KHÔNG BACKFILL ĐƯỢC. SỬA, tối thiểu, từ ngày đầu: ghi telemetry thời gian mỗi nước và độ lệch centipawn theo từng ván (chỉ ghi, chưa cần phân tích); chặn xem trực tiếp ván rated của chính mình từ tài khoản khác cùng deviceId; và nếu không có ngân sách cho một người duyệt fair-play thì ĐỪNG BẬT chế độ xếp hạng cho cờ vua và cờ tướng — đúng như A đã nói, và B nên nghe.

### Nên ghép thêm
- LẬT LƯỜI (lazy reveal) cho cờ úp — ý hay nhất của cả hai tài liệu. Không gán danh tính quân lúc bày cờ; rút từ túi đúng lúc quân đi nước đầu, qua `resolveChance({kind:'uniform', max: bag.length})` với matchSeed đã cam kết. Được ba thứ: dump RAM server trước lúc lật cũng không có đáp án, PIMC lấy mẫu đúng phân phối thật không cần hiệu chỉnh, VÀ nó xoá luôn cái bug deal `i % 16` của A.
- `Turn.auto` + `step()` với guard vòng lặp — nhập vào A thành `Awaiting.auto{delayMs}` để `drive()` lặp trên CẢ `chance` lẫn `auto`. A hiện không có cách diễn đạt 'engine còn việc tự làm' ngoài việc nhồi hết vào một reduce() khổng lồ. `delayMs` là thứ client cần để chạy animation trước khi state nhảy.
- TÁCH HAI HÀNG ĐỢI BOT theo chi phí: `bot:fast` (caro, gánh, ô ăn quan, cá ngựa, tỷ phú — ≤50ms) và `bot:heavy` (vua, tướng, úp, vây — 300-1500ms). A chỉ có một lane NATS với giới hạn in-flight; một ván cờ vây 19x19 nghĩ 1.5s sẽ làm 200 ván caro xếp hàng. Tốn 10 dòng bây giờ, tốn một đêm sự cố nếu gộp.
- PHÒNG RIÊNG LUÔN `rated: false`, vô điều kiện. Công tắc 'tính điểm khi chưa đấu nhau quá 10 trận/24h' của A là lỗ cày điểm — 10 trận rated mỗi ngày mỗi cặp là quá đủ để bơm một tài khoản lên top.
- TESTKIT CÓ MÃ THẬT: `assertNoLeak` với giá trị CANARY nhồi vào mọi trường bí mật, cộng hàm `replay()` chạy trong CI cho cả 9 engine. A NÓI về replay nhưng không có bộ khung test nào; B có code chạy được. (Mở rộng CANARY để quét cả `events`, xem phần lỗi chết người.)
- PENDING_ACCEPT 5 giây với thời gian chờ được GIỮ NGUYÊN cho người không từ chối, và `declineCount` hạ ưu tiên thay vì cooldown cứng 30s/2ph/10ph của A. Cooldown cứng trừng phạt người rớt 4G, mà ở VN đó là đa số.
- LẤP BÀN 4 NGƯỜI DO CHỦ BÀN QUYẾT: nút 'Bắt đầu luôn' và 'Thêm máy' cho từng ghế, thay vì A tự thả bot ở giây 25. Tự nhét bot vào bàn cờ tỷ phú 4 người là cách nhanh nhất để người ta thoát ở phút thứ 3.
- SỔ NỢ KỸ THUẬT CÓ CHỦ Ý viết ra giấy, và GIẤY PHÉP G1 — A không có một dòng nào về pháp lý. Trò chơi có tương tác giữa người chơi qua mạng cần quyết định phê duyệt nội dung kịch bản, quy trình 2-4 tháng. Nộp từ tuần 1, không phải sau khi code xong.
- Cấu hình ghép cặp ĐỘNG qua API (nới cửa sổ nhanh hơn ngoài khung 20h-23h, hạ ngưỡng gợi ý bot), không hardcode `T_bot` per-game như A. Con số này sẽ phải chỉnh hàng tuần trong 2 tháng đầu.
- Đặt tên cấp bot cao nhất là 'Khá' chứ không phải 'Cao thủ'. Rẻ, và chặn trước đúng cái bình luận một sao mà A dự đoán.

### Chốt
TRƯỚC HẾT: task nói "3 phương án" nhưng chỉ có 2 phương án tới tay tôi. Phần so sánh dưới đây là 2 chiều; nếu có phương án thứ ba thì nó chưa được chấm.

CHỌN A LÀM XƯƠNG SỐNG, LẤY LỊCH CỦA B. Lý do dứt khoát, theo đúng tiêu chí đã đặt ra ("sống sót khi có kẻ cố gian lận"): A có BỐN biên giới mà B không có — `parseAction` chặn payload bẩn, `nonce` chặn gửi lặp, `spentMs` trong state nên đồng hồ kiểm toán được, và ChanceDraw được GHI LOG nên sửa bug không làm mất replay lịch sử. Bốn thứ đó là thứ phải có trước nước đi đầu tiên, không phải thứ vá sau. B thủng cả bốn, và lỗ số hai (không nonce) là cheat đổ-lại-xúc-xắc khai thác được từ ngày ra mắt bằng cách tắt-bật 4G.

NHƯNG PHẢI GIẢI ĐỘC LUẬN ĐIỂM CỦA A TRƯỚC. A tự nhận rủi ro lớn nhất là "6-9 tháng thay vì 3 tháng". Đó là so sánh sai, và nó là thứ sẽ làm ban lãnh đạo chọn nhầm. Hạt nhân của A — kernel, drive, log, resume — là 3-4 tuần công việc. Cái ngốn thời gian là 9 BỘ LUẬT ĐÚNG + 9 BOT + 9 HƯỚNG MỸ THUẬT, và khoản đó B phải trả y hệt. Chênh lệch thật giữa A và B là khoảng 4-6 tuần hạ tầng, không phải 4 tháng. Đổi 5 tuần lấy việc không bao giờ phải đập nền là món hời. Đừng để A tự bán rẻ mình bằng một con số phóng đại.

HÌNH DẠNG CỤ THỂ CỦA NỀN:
1. Kernel = `EngineInput`/`Awaiting`/`ChanceRequest` của A, cộng `Awaiting.auto{delayMs}` lấy từ `step()` của B (drive() lặp trên cả chance lẫn auto), cộng `Awaiting.sealed` — ba nguyên thể, chốt NGAY, trước game thứ hai. `sealed` phải có từ đầu vì cả roll-off "ai đi trước" của cá ngựa lẫn đấu giá tỷ phú đều cần nó, và nhét nguyên thể đồng thời vào log thuần lượt về sau là cửa một chiều.
2. Một cửa ải duy nhất và nó phải NUỐT CẢ EVENT: `view(state, seat) -> { v: V; events: Ev[] }`. CANARY quét cả hai. Đây là lỗi nghiêm trọng nhất chung của hai phương án.
3. `withStandardMeta(engine)` sở hữu đầu hàng/hết giờ/cầu hoà/rớt mạng/bỏ trận/bot tiếp quản cho cả 9 game. Engine chỉ thấy nước đi.
4. Input log Postgres append-only với unique `(match_id, seat, nonce)` trong cùng transaction. Redis là cache, không bao giờ là trọng tài.
5. Đồng hồ trong state (A) nhưng `spentMs` đã trừ `min(rtt/2, 1000ms)`, ghi cả số thô lẫn số bù.
6. Cờ úp dùng LẬT LƯỜI của B, rút từ túi bằng matchSeed đã commit — vừa mạnh hơn vừa xoá luôn bug `i % 16` trong code mẫu của A.
7. Bot: kiến trúc A (ngoài tiến trình, view-only, determinize trong contract, botSeed có log) + hai hàng đợi fast/heavy của B + GHI NƯỚC BOT ĐÃ CHỌN vào log, không chỉ seed.
8. Phòng riêng luôn unrated, vô điều kiện. Rating thật chỉ cho 6 game thông tin hoàn hảo; cá ngựa và tỷ phú dùng thang điểm mùa.

LỊCH LẤY CỦA B, NHƯNG SỬA THỨ TỰ GAME. B tự thú "3 game đầu là nhóm RẺ NHẤT chứ không phải HẤP DẪN NHẤT" rồi vẫn giữ caro + gánh + ô ăn quan. Không ai tải app vì ô ăn quan, và số liệu giữ chân của bản đó sẽ bị diễn giải nhầm là nền tảng hỏng. Thứ tự đúng: caro (chứng minh đường ống end-to-end) → CỜ TƯỚNG (game kéo lượt tải ở VN, và là game bắt kernel phải nghiêm túc) → gánh + ô ăn quan (rẻ, và là điểm khác biệt duy nhất so với app quốc tế) → cờ vua → cờ úp → cá ngựa (game 4 người đầu tiên, để hạ tầng bàn-4-ghế có một game thử trước) → cờ tỷ phú, BẮT BUỘC có chế độ rút gọn 15 phút và bot-thay-ghế ngay bản đầu, không có thì hoãn. Cờ vây: cắt khỏi v1, hoặc ra mắt chỉ-PvP 9×9. Cộng đồng cờ vây VN nhỏ và khắt khe, làm nửa vời bị chê thẳng mà không bù lại được bằng người chơi.

Beta kín tuần 8 với caro + cờ tướng, ra mắt thật tuần 12-14, mỗi game sau là một đợt nội dung. Hồ sơ G1 nộp TUẦN 1 — A không có một dòng nào về pháp lý và đó là rủi ro ra mắt lớn hơn mọi thứ trong tài liệu kỹ thuật.

MỘT ĐIỀU KIỆN KHÔNG THƯƠNG LƯỢNG: nếu cắt góc, cắt ở mỹ thuật, cắt ở số lượng game, cắt ở độ mạnh bot. ĐỪNG cắt ở input log, ở nonce, ở `view()` một cửa, hay cho một game giữ trạng thái ngoài engine. Đó đúng là bốn thứ khiến kiến trúc này đáng làm, và là bốn thứ không vá lại được sau khi đã có 50.000 trận trong DB.

## Giám khảo 2 — chọn: B — "Một reducer, chín bàn cờ"

### Lỗi chết người
1. **CHỈ CÓ 2 PHƯƠNG ÁN ĐƯỢC CUNG CẤP, KHÔNG PHẢI 3.** Đề bài nói 'dưới đây là 3 phương án' nhưng chỉ có 'Hago — Engine thuần' và 'Một reducer, chín bàn cờ'. Phương án thứ ba bị mất khi ghép prompt. Mọi kết luận dưới đây chỉ so hai cái có thật; nếu phương án #3 là hướng khác hẳn (ví dụ Go/Elixir server + engine WASM, hoặc mua nền tảng sẵn) thì bảng điểm này chưa trả lời nó.
2. **Vị trí con trỏ RNG không nằm trong `encode(state)` ở CẢ HAI.** A: `chanceCounter` sống trong `DriveCtx`, ngoài `S`. B: `Rng.cursor` sống trong object rng, và `encode()` của cả cờ úp lẫn cá ngựa đều không serialize nó. Hệ quả giống hệt nhau và im lặng: khôi phục phòng từ snapshot (node chết — kịch bản mà CẢ HAI đều bán như tính năng chủ lực) sẽ tiếp tục rút seed từ sai vị trí, xúc xắc và túi quân cờ úp lệch khỏi dòng đã cam kết, replay đêm ra kết quả khác trận thật. B có `cursor` để assert nhưng assert xong thì đã hỏng rồi. Sửa: con trỏ rng là MỘT PHẦN CỦA STATE, hoặc snapshot phải luôn kèm `(cursor, ply)` và chỉ được resume bằng cách phát lại draw đã ghi log chứ không tái sinh.
3. **`events[]` là cửa hậu đi vòng qua `view()`, và không phương án nào canh nó.** Cả hai tuyên bố 'view() là cửa ải DUY NHẤT dữ liệu rời server' rồi ngay sau đó broadcast một mảng event GLOBAL, không cắt theo ghế. B tự viết bất biến 'không nhét bí mật vào Ev' rồi viết `assertNoLeak` chỉ quét `e.view(s, who)` — CANARY không bao giờ chạm tới `apply().events`. A thì không có test rò rỉ nào cả. Cờ úp còn sống sót vì lật quân vốn công khai, nhưng thương lượng riêng của cờ tỷ phú và bất kỳ 'bạn được xem lén X' nào thì không có chỗ nào để đi. Sửa: `events: Partial<Record<Seat|'spectator', Ev[]>>` hoặc `redactEvent(ev, seat)`, và CANARY phải quét cả hai đường ra.
4. **Luận điểm 'viết luật MỘT LẦN bằng TypeScript' — thứ biện minh cho toàn bộ stack ở cả hai — chết đúng chỗ nó quan trọng nhất.** Cả hai đều dùng nó để loại Flutter, loại Go, loại Elixir. Rồi cả hai đều thừa nhận cờ tướng và cờ vây phải chuyển sang native (A: sidecar Rust; B: Pikafish/Fairy-Stockfish qua UCI). Mà engine native MANG THEO BỘ LUẬT RIÊNG. Nghĩa là ở đúng hai game khó nhất, bạn có HAI bản luật — TS làm trọng tài, C++ làm bot — và không ai lên kế hoạch đối chiếu. Chiếu mãi/đuổi mãi, lặp thế, superko, chấm điểm sống-chết: đây chính xác là những chỗ hai bản sẽ lệch, và lệch theo kiểu 'bot đề xuất một nước mà server bảo phạm luật'. Sửa: coi engine native là một Bot adapter phải ĐI QUA `isLegal` của TS (cả hai đều nói vậy — tốt) VÀ chạy một job đối chiếu perft/luật lặp giữa hai bản trong CI, tính từ ngày cắm native, không phải sau.
5. **`GameId` là union đóng trong package lõi ở cả hai** (`engine-core/contract.ts` của B, `kernel/src/types.ts` của A). Game thứ 10 sửa file lõi, rồi kéo theo mọi `switch` exhaustive ở matchmaker, DB enum, art registry, bot dispatcher. Đây đúng là bài test đề bài đặt ra và CẢ HAI cùng trượt ở mức hạ tầng. Sửa rẻ và phải làm từ commit đầu: `type GameId = string`, một `registry.register(module)` chạy lúc khởi động, mỗi package game tự khai `meta`; lõi không bao giờ biết tên 9 game.
6. **Cả hai bán '9 game' trong khi cả hai tự thú game #8 và #9 có thể không ra được.** A: 'cân nhắc nghiêm túc việc BỎ cờ vây khỏi bản 1', 'cờ tỷ phú tuân thủ khoảng 80%'. B: 'nếu không đủ nguồn lực thì hoãn cờ tỷ phú', 'cờ vây 9x9 thôi, 13/19 ghi Sắp có'. Lời hứa thương hiệu được chốt ở ngày 1 (tên app, store listing, ảnh chụp màn hình) nhưng hàng giao là 7/9. Đây không phải rủi ro kỹ thuật, đây là cơ chế sinh ra bài bóc phốt mà chính cả hai đều sợ. Sửa: định vị là 'nền tảng cờ Việt + cờ quốc tế', công bố lộ trình từng game công khai trong app, KHÔNG in số 9 lên bất cứ đâu cho tới khi game thứ 9 lên store.
7. **Không contract nào biểu diễn được `view tại ply N`, nên reconnect là băng dính ở tầng transport.** A vá bằng ring buffer 500 event trong Redis; B không nói gì cả. Không method nào trả về `ply` hay version của view. Với cờ tỷ phú 30-45 phút trên 4G Việt Nam — nơi NAT nhà mạng cắt kết nối nhàn rỗi sau 30-60s, điều A nêu đúng — đây là code path bị chạm nhiều nhất trong toàn hệ và nó không có mặt trong hợp đồng engine. Sửa: `S` mang `ply: number`, `view()` trả `{ply, ...}`, RESUME = client gửi `(matchId, ply, viewHash)`, server hoặc phát tiếp từ ply đó hoặc ép full resync. Làm từ M1, cả hai đều nói vậy nhưng không ai đưa vào contract.
8. **LỖI RIÊNG CỦA A, và là lý do chính nó thua: `Awaiting` chỉ được trả ra từ `init()` và `reduce()`, không bao giờ tính được từ `S`.** `GameEngine` có `outcome(s)` nhưng KHÔNG có `awaiting(s)`. Nên sau khi `decode(snapshot)` — tức đúng lúc node chết và phòng phải dựng lại, đúng kịch bản A thiết kế cả hệ thống để phục vụ — bạn có state nhưng không biết đang chờ gì. Khán giả vào giữa trận: không biết chờ gì. `BotDriver` đăng ký nghe: không biết chờ gì. Cách duy nhất là lưu `Awaiting` ra ngoài engine (Redis), tức là giữ trạng thái trận đấu bên ngoài engine — chính xác thứ A tuyên bố 'TUYỆT ĐỐI không cho phép, đó là con đường một chiều tới chỗ không replay được'. A vi phạm bất biến của chính A ở dòng thứ nhất của interface. `turn(s)` của B là hình dạng đúng.
9. **LỖI RIÊNG CỦA B: `legal()` và `isLegal()` là HAI bản cài đặt luật riêng biệt, nhân 9 game.** Trong chính đoạn code cờ vua của B: `legal` gọi `genLegal(s)`, còn `isLegal` gọi `pseudoLegal(s,a) && !leavesKingInCheck(s,a)` — hai đường code khác nhau cho cùng một câu hỏi, và trọng tài dùng đường thứ hai. Đây là công thức kinh điển sinh ra 'nước này hợp lệ trên máy tôi'. testkit của B không có property test nào ép `legal().some(eq(a)) === isLegal(a)`. Thêm nữa `isLegal` của cá ngựa so sánh bằng `JSON.stringify` — phụ thuộc thứ tự key, vỡ ngay khi ai đó đổi thứ tự field trong `NguaAction`. Sửa: `isLegal` mặc định = `legal().some(deepEq)`; engine nào muốn fast path phải kèm một fuzz test 10k state so hai hàm, chạy trong CI cùng bộ 10.000 ván tự chơi mà B đã có.

### Nên ghép thêm
- `engineVersion` + `ruleHash` của A, ghép NGAY — không phải sau. Không có nó, `replay()` của B ném 'log hỏng' đúng ngày bạn sửa luật lặp cờ tướng (mà chính B đã lên lịch sửa ở nợ kỹ thuật), và toàn bộ lý do tồn tại của reducer thuần bốc hơi. Đóng cứng `{engineVersion, ruleHash, variant}` vào hàng `matches`, giữ code engine cũ trong `packages/game-co-tuong/src/v1|v2`, registry trả engine theo version. Đây là graft QUAN TRỌNG NHẤT.
- Commit-reveal seed của A (`seedCommit = SHA256(serverSeed||matchId)` công bố trước, client gửi clientSeed, seed cuối = HMAC). Tốn nửa ngày. B có seed nhưng không cam kết ⇒ không có gì để trả lời khi người chơi cá ngựa/tỷ phú tố xúc xắc gian. A nói đúng là gần như không ai kiểm, nhưng giá trị nằm ở chỗ nó TRÓI CHÍNH MÌNH và cho một câu trả lời kiểm chứng được.
- Chance là first-class NHƯNG chỉ dạng năng lực TÙY CHỌN, không ép hai pha toàn kernel: thêm `enumerateChance?(s): {draw, p}[]` + `applyChance?(s, draw)` vào `Engine`, chỉ cá ngựa và tỷ phú cài. Giải đúng lỗi của B (bot phải giả lập rng và đoán thứ tự rút để ép được mặt xúc xắc) mà không kéo theo `secret: null` và `phase:'rolling'` vào 3/9 engine.
- `spec` gom thành một object metadata của A (`minSeats/maxSeats/usesChance/hiddenInfo/realtime/defaultClock`) thay vì rải thành field lẻ như B. Lý do thực dụng: sảnh và màn cấu hình phòng phải render được cho game thứ 10 mà KHÔNG sửa code — nó đọc `spec`. `defaultClock` phải nằm trong engine, không nằm trong config server.
- Kỷ luật `variant` của A: cap cứng 2 biến thể/game năm đầu, `variant` đi vào `ruleHash`, trang luật trong app theo từng biến thể. B khai `variant?: string` trong `create()` rồi quên luôn — đây là chỗ 4 game Việt (cá ngựa, cờ gánh, ô ăn quan, tỷ phú) sinh comment một sao đầu tiên, và B không có gì chống.
- Matchmaker shard bằng consistent hash của A, thay cho 'một tiến trình duy nhất + Redis lock' của B. Một process + lock là vừa SPOF vừa trần thông lượng, và Lua script nguyên tử 'đọc → chọn → ZREM tất cả' của A là cách đúng để khỏi ghép trùng mà không retry storm.
- Mã phòng sinh bằng HMAC(secret, counter) của A — không bao giờ va chạm, khỏi vòng thử lại của B. 5 dòng.
- Bước xác nhận 'bạn có 30 phút không?' trước khi vào bàn tỷ phú 4 người, của A. B nhận diện đúng vấn đề bỏ ván 30-50% nhưng chỉ chữa bằng chế độ rút gọn; chặn ở cửa vào rẻ hơn nhiều.
- `changed: boolean` trong kết quả reduce của A — giữ lại kể cả khi bỏ tick, vì nó cũng dùng để lọc ghi log và để quyết định có broadcast hay không.

### Chốt
Lấy contract của B làm nền, ghép lớp kiểm toán của A vào, và sửa 5 thứ TRƯỚC KHI viết engine thứ hai.

Lý do chọn B gọn trong một câu: B để meta-action (resign, draw, pass) nằm trong kiểu `A` của từng game, còn A nhét chúng vào `EngineInput` của kernel. Cái đó quyết định thẳng câu hỏi đề bài — với B, game thứ 10 là một thư mục `packages/game-<id>/` mới cộng một dòng `registry.register()`; với A, game thứ 10 nào có meta-action lạ đều bắt bạn mở `kernel/types.ts` rồi chạy theo mọi `switch` exhaustive trong server, bot driver và client. Cộng thêm: `turn(s)` thuần của B khôi phục được từ snapshot còn `Awaiting` của A thì không, và rng tiêm thẳng giúp 3 engine có xúc xắc ngắn hơn rõ rệt mà không đẻ ra state bất hợp lệ lúc `init()`.

**Hợp đồng chốt (`packages/engine-core/contract.ts`), lấy B rồi sửa đúng 6 điểm:**
1. `GameId = string`. Registry đăng ký lúc khởi động. Lõi không biết tên game nào.
2. Thêm `readonly spec: GameSpec` (gom kiểu A, kèm `defaultClock`) — sảnh và màn cấu hình phòng render từ đây, không hardcode.
3. Bỏ `isLegal` khỏi interface bắt buộc; mặc định `legal().some(deepEq)`. Engine nào cần fast path thì khai `isLegalFast?` và PHẢI kèm fuzz test 10k state đối chiếu hai hàm trong CI.
4. `S` mang `ply` và `rngCursor`. `encode()` serialize cả hai. `view()` trả `ply`.
5. `events` cắt theo ghế: `Partial<Record<Seat|'spectator', Ev[]>>`. `assertNoLeak` quét CẢ `view()` lẫn mọi nhánh event.
6. Năng lực tùy chọn `enumerateChance?/applyChance?` — chỉ cá ngựa và tỷ phú cài, để bot expectimax không phải giả lập rng.

**Hạ tầng:** `matches` lưu `{seed, seedCommit, engineVersion, ruleHash, variant}` từ hàng đầu tiên. Giữ engine cũ theo thư mục version. Matchmaker shard bằng consistent hash + Lua nguyên tử, không phải một process + lock. Hai hàng bot `fast`/`heavy` (giữ nguyên của B) + ba lớp deadline. Bot chỉ nhận `view`. Mã phòng HMAC-counter.

**Thứ tự viết engine — và đây là chỗ quyết định nền có đúng hay không:** đừng bắt đầu bằng cờ caro. Viết **cờ vua** (lượt thuần, mốc đúng-sai rõ nhờ perft) rồi **cá ngựa** (xúc xắc, 4 ghế, lượt thêm, auto-skip) NGAY thứ hai. Cá ngựa ở vị trí thứ hai là bài kiểm tra rẻ nhất cho toàn bộ trục chance/nhiều ghế; nếu contract sai, bạn biết ở tuần 3 với 2 engine phải sửa, không phải ở tuần 20 với 8 engine. Sau đó ô ăn quan, cờ gánh, caro (rẻ, lấp nội dung), cờ tướng, cờ úp. Giữ kỷ luật của B: **không sửa contract trước game thứ 6.**

**Cờ vây và cờ tỷ phú: cắt khỏi bản 1, công khai ngay từ đầu.** Cả hai phương án đều tự thú hai game này có thể không ra được, rồi vẫn giữ trong lời hứa 9 game. Cờ vây là dự án thuật toán riêng không tái dùng một dòng nào của khung alpha-beta; cờ tỷ phú là game duy nhất bẻ được contract và là game dễ phá danh tiếng nhất (bỏ ván 30-50%). Ra mắt 7 game làm tử tế, lộ trình công khai trong app cho 2 game còn lại. Khi làm tỷ phú: cứ cho nó module server riêng nếu cần — **một game trùng lặp rẻ hơn một lớp trừu tượng sai cho tám game**, đây là câu đúng nhất trong cả hai tài liệu và nó không thuộc về phương án thắng một cách tình cờ.