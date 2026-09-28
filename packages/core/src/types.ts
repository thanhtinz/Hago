/**
 * Hợp đồng engine — xem `docs/ARCHITECTURE.md` mục 3.
 *
 * Mọi luật chơi sống trong hàm thuần. Không I/O, không đồng hồ tường, không
 * `Math.random`. Máy chủ là trọng tài duy nhất; client chỉ gửi ý định.
 */

/**
 * Lõi **không biết tên game nào** (ràng buộc R3). Đây là `string` chứ không
 * phải union đóng, để game thứ 10 là một thư mục mới cộng một dòng
 * `registry.register()`, không phải một lần sửa file lõi rồi chạy theo mọi
 * `switch` exhaustive trong matchmaker, enum DB và bot dispatcher.
 */
export type GameId = string;

/** Chỗ ngồi, đánh số từ 0. Người hay bot ngồi đều được. */
export type Seat = number;

export interface ClockSpec {
  /** Tổng quỹ thời gian mỗi bên, tính bằng mili giây. */
  initialMs: number;
  /**
   * **Mức hoàn tối đa sau mỗi nước.** 0 là không hoàn.
   *
   * Không phải Fischer chuẩn: trọng tài hoàn lại nhiều nhất bằng đúng phần
   * vừa bị trừ, nên quỹ thời gian không bao giờ vượt `initialMs`. Fischer cộng
   * đủ bất kể nghĩ nhanh hay chậm, mà ở đây đã có `graceMs` rồi — cộng thêm
   * nữa thì bấm nhanh là in ra thời gian. Xem `Rooms.chargeClock`.
   */
  incrementMs: number;
  /**
   * Ân hạn mỗi nước, không trừ vào quỹ. Đây là chỗ bù trễ mạng: trên 4G Việt
   * Nam jitter 200–800ms là chuyện thường, không có ân hạn thì người chơi trả
   * tiền cho đường truyền.
   */
  graceMs: number;
}

/**
 * Bản mô tả game. Sảnh và màn cấu hình phòng render **từ đây**, nên thêm game
 * mới không phải sửa giao diện.
 */
export interface GameSpec {
  id: GameId;
  nameVi: string;
  nameEn: string;
  /** Một câu mô tả cho sảnh. */
  taglineVi: string;
  minSeats: number;
  maxSeats: number;
  /** Có gieo ngẫu nhiên không. Quyết định engine có phải cài `*Chance` không. */
  usesChance: boolean;
  /** Có thông tin phải che khỏi đối thủ không. Quyết định độ gắt của test rò rỉ. */
  hiddenInfo: boolean;
  /** Cần `step()` chạy theo thời gian thực hay thuần lượt. */
  realtime: boolean;
  /** Đồng hồ mặc định thuộc **engine**, không thuộc config server. */
  defaultClock: ClockSpec;
  /** Biến thể luật. Đi vào `ruleHash`. Cap cứng 2 biến thể mỗi game. */
  variant?: string;
}

/**
 * Engine đang chờ gì — **tính được từ state** (ràng buộc R5).
 *
 * Không được chỉ trả ra từ `reduce()`. Sau `decode(snapshot)` — đúng lúc node
 * chết và phòng phải dựng lại — vẫn phải biết đang chờ ai. Khán giả vào giữa
 * trận, bot đăng ký nghe, reconnect: tất cả đều hỏi câu này.
 */
export type Turn =
  /** Chờ một người ở ghế này đi. */
  | { kind: 'seat'; seat: Seat }
  /** Chờ server gieo ngẫu nhiên. */
  | { kind: 'chance' }
  /** Engine còn việc tự làm; `delayMs` để client kịp chạy hoạt hoạ. */
  | { kind: 'auto'; delayMs: number }
  /**
   * Thu kín rồi mở đồng loạt.
   *
   * Thêm vào **chỉ vì** cá ngựa và cờ tỷ phú, mà hai game đó đã bị bỏ khỏi lộ
   * trình — nên hiện **không bộ môn nào dùng**. Giữ lại vì gỡ một nguyên thể
   * khỏi hợp đồng rồi lắp lại là cửa một chiều: log cũ mất khả năng phát lại.
   * Để giá đi tới theo thứ tự đến thì đó không phải
   * đấu giá, đó là đo đường truyền.
   */
  | { kind: 'sealed'; seats: Seat[]; closesAt: number }
  | { kind: 'over' };

export interface Placement {
  seat: Seat;
  /** 1 là nhất. Hoà thì cùng số. */
  place: number;
  score: number;
}

export interface Outcome {
  /** Ghế thắng, hoặc null nếu hoà / không có người thắng. */
  winner: Seat | null;
  reason: string;
  placements: Placement[];
}

/**
 * Mọi state engine đều mang hai trường này.
 *
 * `rngCursor` **phải** nằm trong state (ràng buộc R2). Nếu con trỏ sống ngoài
 * state thì khôi phục phòng từ snapshot sẽ rút seed từ sai vị trí: xúc xắc
 * lệch khỏi dòng đã cam kết, replay ra kết quả khác trận thật. Lỗi này im
 * lặng hoàn toàn cho tới lúc có người soi.
 */
export interface BaseState {
  /** Số nước đã áp dụng. Client reconnect bằng `(matchId, ply)` — R7. */
  ply: number;
  rngCursor: number;
}

/**
 * Thứ rời khỏi máy chủ. **Một cửa ải duy nhất** cho cả state lẫn event
 * (ràng buộc R1) — phát `events` thẳng ra dây là mở đường rò thứ hai mà không
 * ai canh.
 */
export interface SeatView<V, Ev> {
  ply: number;
  v: V;
  events: Ev[];
}

export type Viewer = Seat | 'spectator';

export interface Rng {
  /** Số thực [0, 1). */
  next(): number;
  /** Số nguyên [0, n). */
  int(n: number): number;
  /** Xúc xắc [1, sides]. */
  die(sides: number): number;
  /** Xáo trộn tại chỗ, trả về chính mảng đó. */
  shuffle<T>(xs: T[]): T[];
  /** Vị trí hiện tại trong dòng. Engine phải ghi lại vào state. */
  readonly cursor: number;
}

/**
 * Một khả năng ngẫu nhiên và xác suất của nó. Chỉ game có xúc xắc cài, để bot
 * expectimax không phải tự giả lập rng và đoán thứ tự rút.
 */
export interface ChanceOutcome {
  draw: unknown;
  p: number;
}

export interface Engine<S extends BaseState, A, V, Ev> {
  readonly spec: GameSpec;
  /**
   * Tăng khi luật đổi. Ghi vào hàng `matches` **từ hàng đầu tiên** — không có
   * nó thì ngày đầu tiên sửa luật là ngày mọi replay cũ hỏng.
   */
  readonly version: number;
  /** Bằm của bản luật đang cài. Đổi luật mà quên đổi số này là tự lừa mình. */
  readonly ruleHash: string;

  init(seats: Seat[], config: unknown, rng: Rng): S;
  turn(s: S): Turn;
  /** Mọi nước hợp lệ của một ghế. Nguồn chân lý về tính hợp lệ. */
  legal(s: S, seat: Seat): A[];
  /**
   * Đường nhanh tuỳ chọn. Cài cái này thì **bắt buộc** kèm fuzz test đối chiếu
   * với `legal()` (ràng buộc R6) — hai đường mã trả lời cùng một câu hỏi là
   * công thức đẻ ra "nước này hợp lệ trên máy tôi".
   */
  isLegalFast?(s: S, seat: Seat, a: A): boolean;
  reduce(s: S, seat: Seat, a: A, rng: Rng): S;
  /** Chỉ game có `Turn.auto` mới cần. */
  step?(s: S, rng: Rng): S;
  view(s: S, viewer: Viewer): SeatView<V, Ev>;
  outcome(s: S): Outcome | null;
  /** Phải gồm cả `ply` và `rngCursor`. */
  encode(s: S): string;
  decode(x: string): S;

  /** Năng lực tuỳ chọn — sau khi bỏ cá ngựa và cờ tỷ phú thì chỉ còn cờ úp cài. */
  enumerateChance?(s: S): ChanceOutcome[];
  applyChance?(s: S, draw: unknown): S;
}

/** Engine với kiểu đã xoá, dùng ở chỗ lõi không cần biết kiểu cụ thể. */
export type AnyEngine = Engine<BaseState, unknown, unknown, unknown>;
