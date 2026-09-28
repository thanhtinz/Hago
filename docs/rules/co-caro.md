# Cờ Caro — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-caro`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | False |
| Thông tin ẩn | False |
| Độ khó cài đặt | 1/5 |

# CỜ CARO (Gomoku / Năm quân liên tiếp) — biến thể Việt Nam

## 0. Tóm tắt biến thể chọn làm mặc định
Bàn 15×15, X đi trước, thắng khi có **5 quân liên tiếp** ngang/dọc/chéo, **có áp dụng LUẬT CHẶN 2 ĐẦU** (đặc trưng Việt Nam), **chuỗi ≥6 quân luôn thắng** kể cả bị chặn 2 đầu. Không có luật cấm 3-3/4-4 (Renju) theo mặc định.

## 1. Bàn cờ và toạ độ
- Bàn vuông N×N ô. `N = config.boardSize`, mặc định **15**. Cho phép 15, 17, 19, 20. Chơi trên Ô (cell), không chơi trên giao điểm (khác cờ vây).
- Toạ độ `(r, c)` 0-indexed. `r` = 0 là hàng trên cùng, `c` = 0 là cột trái nhất.
- Chỉ số phẳng `idx = r * N + c`. **Bắt buộc kiểm tra biên theo (r, c) chứ không theo idx** (xem Pitfall #5).
- Ký hiệu hiển thị cho người dùng: cột A..O (bỏ chữ I nếu muốn, nhưng khuyên giữ đủ A..O cho 15), hàng 1..15 đếm từ dưới lên hoặc từ trên xuống — **chọn một và ghi vào biên bản ván**, dùng nhất quán cho replay.

## 2. Quân cờ và lượt đi
- Hai màu: `X` (quy ước "đen", **đi trước**) và `O` (quy ước "trắng", đi sau).
- Gán màu ở `init`:
  - Phòng tự tạo: chủ phòng chọn, hoặc chủ phòng mặc định cầm X.
  - Ghép cặp xếp hạng: gán ngẫu nhiên qua `rng` server. **Kết quả gán được ghi thẳng vào `state.players[i].color`**, nên replay không cần seed (xem mục hasDice).
  - Đấu bot: người chơi chọn màu, mặc định người cầm X.
- Đi lần lượt, **không được bỏ lượt**, không được "pass".
- Mỗi lượt: đặt **đúng 1 quân của mình vào 1 ô trống bất kỳ** trên bàn.
- Quân đã đặt **không bao giờ di chuyển, không bao giờ bị ăn, không bao giờ bị lấy ra**. Trạng thái bàn cờ là đơn điệu tăng.

## 3. Điều kiện thắng — ĐẦY ĐỦ, GỒM LUẬT CHẶN 2 ĐẦU

Sau mỗi nước hợp lệ tại ô `p = (r, c)` của màu `m`, chạy `checkWin(board, N, r, c, m, config)`.

### 3.1. Bốn hướng cần xét
`DIRS = [ (0,1) ngang, (1,0) dọc, (1,1) chéo xuôi \, (1,-1) chéo ngược / ]`
Mỗi hướng là một **đường thẳng hai chiều**; ta đếm cả hai phía từ `p`.

### 3.2. Thuật toán chính xác (pseudocode, chép thẳng được)
```
function inBoard(r, c, N) { return r >= 0 && r < N && c >= 0 && c < N }

function checkWin(board, N, r, c, color, cfg):
  const W = cfg.winLength           // = 5
  for (const [dr, dc] of DIRS):
    // đếm về phía ÂM
    let back = 0, rr = r - dr, cc = c - dc
    while (inBoard(rr, cc, N) && board[rr*N + cc] === color) { back++; rr -= dr; cc -= dc }
    // (rr, cc) = ĐẦU A: hoặc ngoài bàn, hoặc ô trống, hoặc quân đối phương

    // đếm về phía DƯƠNG
    let fwd = 0, r2 = r + dr, c2 = c + dc
    while (inBoard(r2, c2, N) && board[r2*N + c2] === color) { fwd++; r2 += dr; c2 += dc }
    // (r2, c2) = ĐẦU B

    const len = back + 1 + fwd

    if (len > W) {                                   // chuỗi 6 quân trở lên ("trường xà")
      if (cfg.overlineWins) return makeLine(r, c, dr, dc, back, fwd)   // THẮNG, kể cả chặn 2 đầu
      else continue                                  // chỉ khi bật cấu hình Renju
    }

    if (len === W) {                                 // đúng 5 quân
      if (!cfg.blockedEndsRule) return makeLine(...)  // luật tự do: thắng ngay
      const openA = inBoard(rr, cc, N) && board[rr*N + cc] === EMPTY
      const openB = inBoard(r2, c2, N) && board[r2*N + c2] === EMPTY
      if (openA || openB) return makeLine(...)        // còn ít nhất 1 đầu hở -> THẮNG
      // else: chuỗi 5 "chết", KHÔNG thắng -> xét hướng kế tiếp
    }
  return null                                         // chưa thắng
```

### 3.3. Định nghĩa "bị chặn" (mấu chốt của luật Việt Nam)
Một đầu của chuỗi được coi là **BỊ CHẶN** khi:
1. Ô liền kề ngoài chuỗi **chứa quân đối phương**, HOẶC
2. Ô liền kề ngoài chuỗi **nằm ngoài bàn cờ (mép bàn)**.

Một đầu là **HỞ** khi và chỉ khi ô liền kề ngoài chuỗi **nằm trong bàn và đang trống**.

Hệ quả cụ thể (`X` = quân ta, `O` = quân địch, `.` = trống, `|` = mép bàn):
| Thế cờ | Kết quả |
|---|---|
| `. X X X X X .` | **THẮNG** (hở 2 đầu) |
| `O X X X X X .` | **THẮNG** (hở 1 đầu) |
| `. X X X X X O` | **THẮNG** (hở 1 đầu) |
| `O X X X X X O` | **KHÔNG THẮNG** (chặn 2 đầu) |
| `\| X X X X X O` | **KHÔNG THẮNG** (mép bàn tính là chặn) |
| `\| X X X X X .` | **THẮNG** (đầu phải hở) |
| `\| X X X X X \|` | **KHÔNG THẮNG** (chỉ xảy ra khi N = 5) |
| `O X X X X X X O` | **THẮNG** (6 quân, overline luôn thắng) |

### 3.4. Chuỗi ≥ 6 quân (overline / "trường xà")
`config.overlineWins = true` theo mặc định Việt Nam: **6 quân trở lên LUÔN thắng**, bất kể hai đầu bị chặn hay không. Đây chính là lý do luật chặn 2 đầu không tạo ra bế tắc: khi chuỗi 5 bị chặn 2 đầu, nó "chết" vĩnh viễn (không thể nối dài thêm) và ván tiếp tục bình thường.

**Đây là điểm khác Renju:** trong Renju quốc tế, overline là **nước cấm** của bên đen. Ở caro Việt Nam thì ngược lại — overline là thắng. Đừng chép nhầm code Renju.

### 3.5. Một nước tạo nhiều chuỗi
Phải quét **đủ cả 4 hướng**, không được `return` sớm ở hướng đầu tiên chỉ vì hướng đó không thắng. Ví dụ: nước đi vừa tạo chuỗi ngang 5 bị chặn 2 đầu (không thắng) vừa tạo chuỗi chéo 5 hở 1 đầu (thắng) → **kết quả là THẮNG**.

### 3.6. Chỉ cần kiểm tra quanh ô vừa đặt
Chứng minh: mọi chuỗi mới xuất hiện sau nước `p` bắt buộc phải chứa `p`. Và vì chuỗi 5 hở-một-đầu thắng **ngay lập tức** khi hình thành, không tồn tại trạng thái "chuỗi 5 chờ được công nhận". Đối phương đặt quân cũng không thể biến chuỗi 5 chết thành thắng. ⇒ `checkWin` quanh `p` là đủ và đúng, O(1) mỗi nước.

## 4. Không có các luật cờ vua/cờ tướng tương ứng — nói rõ để khỏi hỏi lại
Đặc tả phải nêu cụ thể, nên liệt kê rõ ràng những luật **KHÔNG TỒN TẠI** trong cờ caro:
- **Không có nhập thành.** Không có quân nào di chuyển.
- **Không có bắt tốt qua đường (en passant).** Không có ăn quân dưới bất kỳ hình thức nào.
- **Không có phong cấp / phong hậu.** Quân không đổi loại.
- **Không có luật lặp nước ba lần.** Bất khả thi về mặt toán học: bàn cờ đơn điệu tăng, mỗi thế cờ chỉ xuất hiện đúng một lần trong một ván. Không cần lưu hash lịch sử để phát hiện lặp.
- **Không có luật 50 nước.** Mỗi nước đều tăng số quân, nên ván tự chấm dứt sau tối đa `N*N` = 225 nước (bàn 15×15).
- **Không có chiếu / chiếu bí / hết nước đi (stalemate).** Luôn còn nước đi hợp lệ chừng nào còn ô trống.
- **Không có thế cờ thiếu lực (insufficient material).**

## 5. Hoà cờ — đầy đủ các trường hợp
1. **Bàn đầy**: `emptyCount === 0` sau một nước hợp lệ mà `checkWin` trả `null` → **HOÀ**. (Thực tế cực hiếm trên 15×15 vì X có lợi thế lớn, nhưng vẫn phải cài.)
2. **Thoả thuận hoà**: một bên gửi `offer_draw`, bên kia gửi `respond_draw {accept: true}` → HOÀ. Lời đề nghị hết hiệu lực khi: bên đề nghị đi một nước mới, bên kia từ chối, hoặc quá `offerTtlMs` (mặc định 30.000 ms). Chỉ cho phép tối đa 3 lần đề nghị hoà mỗi bên mỗi ván (chống spam).
3. **Không có hoà do hết giờ cả hai** — đồng hồ chỉ chạy cho bên đang đến lượt, nên chỉ một bên có thể hết giờ.

## 6. Luật khai cuộc (`config.openingRule`)
X có lợi thế đi trước rất mạnh (ở caro tự do đã được chứng minh là thắng ép). Ba mức:

### 6.1. `'free'` (mặc định cho phòng thường)
X đặt nước đầu ở ô trống bất kỳ. Đơn giản nhất, cân bằng kém nhất.

### 6.2. `'center'`
**Nước 1 của X bắt buộc đặt tại ô tâm** `(⌊N/2⌋, ⌊N/2⌋)`. Nước 2 trở đi tự do. Hạn chế nhẹ lợi thế của X, chi phí cài đặt gần bằng 0.

### 6.3. `'swap2'` (khuyên dùng cho xếp hạng)
Giao thức cân bằng chuẩn quốc tế, tỉ lệ thắng của bên đi trước còn ~52%. Phức tạp hơn vì có nhiều pha.

Gọi A = người mở bàn, B = người phản hồi.
- **Pha 1 — `swap2_place3` (A đi):** A đặt **3 quân cùng lúc** theo thứ tự đen, trắng, đen (2 đen + 1 trắng). Ràng buộc khuyến nghị: cả 3 quân nằm trong vùng trung tâm bán kính 4 quanh tâm bàn (tránh mở bàn vô nghĩa ở góc). Sau pha này bàn có 2 đen, 1 trắng ⇒ **lượt kế tiếp thuộc về TRẮNG**.
- **Pha 2 — `swap2_respond` (B đi), chọn 1 trong 3:**
  - **(a) `take_black`**: B nhận màu đen, A nhận trắng. Bàn có 2Đ/1T ⇒ **A đi tiếp** (đặt quân trắng thứ 2). Chuyển `phase = 'playing'`.
  - **(b) `take_white_and_move`**: B nhận màu trắng và **đặt ngay 1 quân trắng** (nước 4). A nhận đen. Bàn thành 2Đ/2T ⇒ **A đi tiếp** (quân đen thứ 3). Chuyển `phase = 'playing'`.
  - **(c) `place_two`**: B đặt thêm **2 quân**, 1 trắng (nước 4) rồi 1 đen (nước 5), **chưa nhận màu**. Bàn thành 3Đ/2T. Chuyển `phase = 'swap2_pick_color'`.
- **Pha 3 — `swap2_pick_color` (A đi, chỉ khi B chọn (c)):** A chọn `'black'` hoặc `'white'`, B nhận màu còn lại. Bàn 3Đ/2T ⇒ **bên cầm TRẮNG đi tiếp**. Chuyển `phase = 'playing'`.

**Quy tắc bất biến cần assert:** sau mọi pha swap2, *bên đi tiếp luôn là bên đang có ÍT quân hơn trên bàn*. Dùng assert này làm test.

Đồng hồ trong swap2: **không trừ giờ ván chính**, mỗi pha có timer riêng `swap2PhaseMs` (mặc định 30.000 ms). Quá giờ pha 1 → tự đặt bộ 3 quân theo book mặc định (tâm + 2 ô kề). Quá giờ pha 2/3 → tự chọn phương án `take_black` / `'black'`.

## 7. Luật cấm Renju (`config.renjuForbidden`, MẶC ĐỊNH **false**)
Không phải luật Việt Nam. Chỉ bật cho chế độ "Renju chuyên nghiệp". Nếu bật thì `blockedEndsRule` phải = false và `overlineWins` phải = false (hai luật này xung khắc nhau về ý nghĩa).

Khi bật, **chỉ bên đen (X, đi trước)** bị cấm; trắng tự do hoàn toàn và trắng được thắng bằng overline.
- **Trùng ba (3-3)**: nước đi tạo đồng thời ≥ 2 "ba mở". "Ba mở" = hàng 3 quân có thể trở thành "bốn mở" bằng đúng 1 nước, gồm dạng liền `. X X X .` và dạng đứt `. X X . X .`, `. X . X X .` — với điều kiện có đủ chỗ trống hai đầu.
- **Trùng bốn (4-4)**: nước đi tạo đồng thời ≥ 2 "bốn" (bốn = hàng có thể thành đúng 5 bằng 1 nước, tính cả bốn bị chặn và bốn đứt), kể cả 2 "bốn" nằm trên cùng một đường.
- **Trường (overline)**: tạo chuỗi ≥ 6 quân là nước cấm.
- **Ngoại lệ tối thượng**: nếu nước đó **đồng thời tạo đúng 5 quân**, đó là nước thắng — luật cấm **không** áp dụng.
- **Điểm cấm đệ quy**: khi đếm "ba mở", một cái ba chỉ được tính nếu nước biến nó thành bốn mở **không phải là một điểm cấm khác**. Phải cài đệ quy có giới hạn độ sâu (thường 8) + memo, nếu không sẽ sai luật hoặc lặp vô hạn.
- Đen đi nước cấm → **đen thua ngay** (`reason: 'forbidden'`).

**Cảnh báo chi phí:** bật cờ này nâng `implComplexity` của game từ 1 lên khoảng 3. Khuyên phát hành bản Việt Nam trước, Renju để sau.

## 8. Nước đi không hợp lệ và xử lý lỗi
`apply` trả lỗi (không đổi state, **không trừ giờ, không cộng increment**) khi:
- `E_NOT_YOUR_TURN` — `playerId` không phải bên đang đi.
- `E_GAME_OVER` — `state.phase === 'finished'`.
- `E_WRONG_PHASE` — gửi `place` khi đang ở pha swap2, hoặc ngược lại.
- `E_OUT_OF_BOARD` — `r`/`c` không nguyên, hoặc ngoài `[0, N-1]`.
- `E_OCCUPIED` — ô đã có quân.
- `E_OPENING_CONSTRAINT` — vi phạm ràng buộc khai cuộc (`center` hoặc vùng trung tâm swap2).
- `E_FORBIDDEN_MOVE` — chỉ khi bật Renju (thực ra vẫn `apply` được và xử thua đen; chọn một, khuyên xử thua).
- `E_NO_PENDING_OFFER` — trả lời hoà/đi lại khi không có đề nghị treo.

Chống spam: đếm `invalidCount[playerId]`. Quá 20 nước sai liên tiếp trong 10 giây → xử thua kỹ thuật `reason: 'forfeit'`. Không phạt thời gian cho nước sai lẻ tẻ (phần lớn là do lag client hoặc double-tap).

## 9. Xin đi lại (`allowUndoRequest`, mặc định **true** ở phòng thường, **false** ở xếp hạng)
Thói quen phổ biến của app caro Việt Nam. Luật:
- Chỉ bên **vừa đi xong** mới được xin, và chỉ khi đối phương **chưa đi** nước tiếp theo, hoặc đã đi (tuỳ chọn `undoDepth`: 1 = rút 1 nước, 2 = rút 2 nước về đúng lượt mình).
- Đối phương phải `respond_undo {accept: true}`.
- Khi chấp nhận: gỡ `undoDepth` nước cuối khỏi `history`, xoá quân khỏi `board`, `emptyCount += undoDepth`, khôi phục `turnColor`, và **hoàn lại đồng hồ theo snapshot lưu trong `history[i].clockSnapshot`** (đừng tính ngược, sẽ lệch).
- Tối đa 3 lần/ván/người.

## 10. Sự kiện `apply` phát ra (`events`)
```
{ t: 'stone_placed',  r, c, color, ply }
{ t: 'win',           playerId, color, reason, line: [{r,c} ×len] }
{ t: 'draw',          reason: 'board_full' | 'agreement' }
{ t: 'draw_offered',  byPlayerId, expiresAt }
{ t: 'draw_declined', byPlayerId }
{ t: 'undo_requested',byPlayerId, depth }
{ t: 'undo_applied',  depth, restoredPly }
{ t: 'undo_declined', byPlayerId }
{ t: 'swap2_stones',  stones: [{r,c,color}] }
{ t: 'swap2_choice',  byPlayerId, choice }
{ t: 'color_assigned',assignments: [{playerId, color}] }
{ t: 'clock_update',  remainingMs: {playerId: ms}, turnDeadlineAt }
{ t: 'timeout',       playerId }
{ t: 'resigned',      playerId }
```
`events` phải đủ để client dựng animation mà không cần diff state.

## Mô hình trạng thái

```ts
// ===== Hằng =====
const EMPTY = 0, X = 1, O = 2;
type Cell  = 0 | 1 | 2;
type Color = 1 | 2;                     // 1 = X (đen, đi trước), 2 = O (trắng)

type Phase =
  | 'swap2_place3'        // chờ A đặt 3 quân
  | 'swap2_respond'       // chờ B chọn 1 trong 3 phương án
  | 'swap2_pick_color'    // chờ A chọn màu (chỉ khi B chọn place_two)
  | 'playing'
  | 'finished';

// ===== Cấu hình (bất biến trong 1 ván, lưu kèm state để replay đúng) =====
interface CaroConfig {
  boardSize: number;              // mặc định 15; cho phép 15 | 17 | 19 | 20
  winLength: number;              // mặc định 5 (để mở rộng, KHÔNG hardcode số 5 trong code)
  blockedEndsRule: boolean;       // true = luật VN "chặn 2 đầu không thắng". Mặc định true
  overlineWins: boolean;          // true = chuỗi >= 6 luôn thắng. Mặc định true
  openingRule: 'free' | 'center' | 'swap2';   // mặc định 'free'
  swap2CenterRadius: number;      // mặc định 4 (ràng buộc vùng đặt 3 quân mở)
  renjuForbidden: boolean;        // mặc định false (xung khắc với blockedEndsRule)
  clock: {
    initialMs: number;            // mặc định 300_000 (5 phút)
    incrementMs: number;          // mặc định 3_000 (Fischer)
    perMoveCapMs: number | null;  // mặc định 60_000; null = không giới hạn từng nước
    disconnectGraceMs: number;    // mặc định 60_000, quỹ riêng, không trừ vào giờ ván
    swap2PhaseMs: number;         // mặc định 30_000
    lagCompMs: number;            // mặc định 200, bù trễ mạng mỗi nước
  };
  onPerMoveTimeout: 'lose' | 'autoMove';  // mặc định 'lose'
  allowUndoRequest: boolean;      // phòng thường true, xếp hạng false
  undoDepth: 1 | 2;               // mặc định 2 (rút về đúng lượt người xin)
  allowDrawOffer: boolean;        // mặc định true
  offerTtlMs: number;             // mặc định 30_000
  maxDrawOffersPerPlayer: number; // mặc định 3
  maxUndoRequestsPerPlayer: number; // mặc định 3
}

interface CaroPlayer {
  playerId: string;
  seat: 0 | 1;                    // ghế trong phòng, cố định
  color: Color | null;            // null trong lúc swap2 chưa chốt màu
  isBot: boolean;
  botLevel?: 'easy' | 'medium' | 'hard';
  connected: boolean;
  disconnectLeftMs: number;       // quỹ ân hạn còn lại
  drawOffersUsed: number;
  undoRequestsUsed: number;
  invalidStreak: number;          // chống spam nước sai
}

interface MoveRecord {
  r: number;
  c: number;
  color: Color;
  ply: number;                    // 1-based
  atMs: number;                   // server timestamp
  thinkMs: number;                // thời gian suy nghĩ thực tế đã trừ
  clockSnapshot: [number, number];// remainingMs của 2 ghế NGAY TRƯỚC nước này (để undo)
}

interface CaroState {
  v: 1;                           // version schema, bắt buộc để migrate
  gameId: string;
  config: CaroConfig;
  phase: Phase;

  // Bàn cờ: number[] để JSON hoá thẳng. Độ dài N*N. idx = r*N + c.
  // (Trong bot, convert sang Uint8Array; trong state giữ number[] cho dễ persist.)
  board: Cell[];
  emptyCount: number;

  players: [CaroPlayer, CaroPlayer];
  turnColor: Color;               // màu đang đến lượt (ở pha swap2 dùng turnSeat)
  turnSeat: 0 | 1;                // ghế đang đến lượt — nguồn sự thật duy nhất
  ply: number;                    // số quân đã đặt

  history: MoveRecord[];
  lastMove: { r: number; c: number } | null;

  clock: {
    remainingMs: [number, number];   // theo seat
    turnStartedAt: number;           // ms epoch, server
    turnDeadlineAt: number;          // = turnStartedAt + min(remaining, perMoveCap)
    phaseDeadlineAt: number | null;  // dùng cho các pha swap2
  };

  swap2: {
    openerSeat: 0 | 1;
    responderSeat: 0 | 1;
    stonesPlaced: Array<{ r: number; c: number; color: Color }>;
    responderChoice: 'take_black' | 'take_white_and_move' | 'place_two' | null;
  } | null;

  pendingOffer: {
    kind: 'draw' | 'undo';
    bySeat: 0 | 1;
    depth?: 1 | 2;                   // cho undo
    expiresAt: number;
  } | null;

  result: {
    kind: 'win' | 'draw';
    winnerSeat?: 0 | 1;
    winnerColor?: Color;
    reason: 'five' | 'overline' | 'resign' | 'timeout' | 'disconnect'
          | 'forfeit' | 'forbidden' | 'board_full' | 'agreement';
    winningLine: Array<{ r: number; c: number }> | null;  // đúng len ô, theo thứ tự
    endedAt: number;
  } | null;

  // Trường nội bộ — KHÔNG gửi cho client, view() phải strip
  _internal?: {
    botScratch?: unknown;           // cache/TT của bot, không thuộc luật chơi
    rngSeedUsed?: string;           // chỉ để audit việc bốc màu ở init
  };
}
```

**Kích thước state:** bàn 15×15 = 225 số + history tối đa 225 bản ghi ≈ 25–40 KB JSON. Thoải mái để lưu nguyên vẹn mỗi nước vào Redis/Postgres, không cần event sourcing. Nếu muốn nén: mã hoá `board` thành chuỗi 225 ký tự `.xo` (~225 byte) và dựng lại `history` từ log nước đi.

**Bất biến cần assert sau mỗi `apply`:**
- `board.filter(c => c !== EMPTY).length === ply`
- `emptyCount === N*N - ply`
- `phase === 'playing'` ⇒ cả hai `players[i].color` đều khác null và khác nhau
- `turnColor === players[turnSeat].color`
- `result !== null` ⟺ `phase === 'finished'`

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `place` | { r: number; c: number } | phase==='playing'; playerId là players[turnSeat].playerId; r,c là số nguyên trong [0, N-1]; board[r*N+c]===EMPTY; nếu openingRule==='center' và ply===0 thì bắt buộc r===c===floor(N/2). Sau khi đặt: ply++, emptyCount--, ghi clockSnapshot, trừ giờ (now - turnStartedAt - lagCompMs, clamp>=0), cộng incrementMs, chạy checkWin. Nếu thắng -> result.kind='win', reason='five' (len===winLength) hoặc 'overline' (len>winLength). Nếu emptyCount===0 và không thắng -> result.kind='draw', reason='board_full'. Nếu chưa kết thúc: đổi turnSeat/turnColor, đặt turnStartedAt=now, turnDeadlineAt=now+min(remainingMs[next], perMoveCapMs ?? Infinity). Mọi pendingOffer kiểu 'draw' bị huỷ. |
| `resign` | {} | phase!=='finished'; playerId thuộc 1 trong 2 ghế (KHÔNG cần đúng lượt — được đầu hàng bất cứ lúc nào, kể cả trong pha swap2). Kết quả: đối phương thắng, reason='resign'. Không hỏi lại ở server; việc xác nhận 'Bạn chắc chắn?' là việc của client. |
| `offer_draw` | {} | config.allowDrawOffer===true; phase==='playing'; playerId thuộc ván; chưa có pendingOffer nào đang treo; players[seat].drawOffersUsed < maxDrawOffersPerPlayer; ply>=10 (chặn xin hoà spam ngay đầu ván). Tạo pendingOffer{kind:'draw', bySeat, expiresAt: now+offerTtlMs}, tăng drawOffersUsed. Đồng hồ VẪN CHẠY cho bên đang đến lượt trong lúc chờ trả lời. |
| `respond_draw` | { accept: boolean } | pendingOffer!==null && pendingOffer.kind==='draw'; playerId là ghế ĐỐI DIỆN pendingOffer.bySeat; now < pendingOffer.expiresAt (quá hạn -> tự huỷ, trả E_NO_PENDING_OFFER). accept=true -> result.kind='draw', reason='agreement', phase='finished'. accept=false -> xoá pendingOffer, phát draw_declined, ván tiếp tục, đồng hồ không đổi. |
| `request_undo` | {} | config.allowUndoRequest===true; phase==='playing'; chưa có pendingOffer treo; players[seat].undoRequestsUsed < maxUndoRequestsPerPlayer; history.length >= undoDepth; và nước cuối cùng trong history phải do CHÍNH người xin đi (kiểm tra history[last].color === players[seat].color) — không cho xin rút nước của đối phương. Tạo pendingOffer{kind:'undo', bySeat, depth: config.undoDepth, expiresAt}. |
| `respond_undo` | { accept: boolean } | pendingOffer!==null && kind==='undo'; playerId là ghế đối diện; chưa quá hạn. accept=true -> pop `depth` bản ghi cuối khỏi history, set board[idx]=EMPTY cho từng ô, ply-=depth, emptyCount+=depth, lastMove = history mới nhất hoặc null, khôi phục clock.remainingMs = clockSnapshot của bản ghi ĐẦU TIÊN bị gỡ (KHÔNG tính ngược bằng phép trừ), turnSeat/turnColor về đúng bên đã đi bản ghi đó, turnStartedAt=now, tính lại turnDeadlineAt. accept=false -> xoá pendingOffer. |
| `swap2_place3` | { stones: [{r,c},{r,c},{r,c}] } | config.openingRule==='swap2'; phase==='swap2_place3'; playerId là ghế swap2.openerSeat; đúng 3 toạ độ, tất cả trong bàn, ĐÔI MỘT KHÁC NHAU, và mỗi ô đang trống; mỗi ô nằm trong hình vuông bán kính swap2CenterRadius quanh tâm bàn. Gán màu theo thứ tự mảng: stones[0]=X, stones[1]=O, stones[2]=X. ply=3, emptyCount-=3. phase='swap2_respond', turnSeat=responderSeat, phaseDeadlineAt=now+swap2PhaseMs. |
| `swap2_respond` | { choice: 'take_black' | 'take_white_and_move' | 'place_two'; move?: {r,c}; moves?: [{r,c},{r,c}] } | phase==='swap2_respond'; playerId là ghế swap2.responderSeat; now < phaseDeadlineAt. choice==='take_black' -> responder.color=X, opener.color=O, ply vẫn 3, phase='playing', turnSeat=openerSeat (bên cầm TRẮNG đi). choice==='take_white_and_move' -> BẮT BUỘC có `move` hợp lệ (trong bàn, ô trống); đặt 1 quân O tại move; responder.color=O, opener.color=X; ply=4; phase='playing'; turnSeat=openerSeat (bên cầm ĐEN đi). choice==='place_two' -> BẮT BUỘC có `moves` đúng 2 toạ độ khác nhau, đều là ô trống; đặt moves[0]=O (nước 4) rồi moves[1]=X (nước 5); ply=5; màu vẫn null cả hai; phase='swap2_pick_color'; turnSeat=openerSeat; phaseDeadlineAt=now+swap2PhaseMs. ASSERT bất biến: sau mỗi nhánh, bên đi tiếp phải là bên có ÍT quân hơn trên bàn. |
| `swap2_pick_color` | { color: 'black' | 'white' } | phase==='swap2_pick_color'; playerId là ghế swap2.openerSeat; now < phaseDeadlineAt. Gán opener.color theo lựa chọn (black=X, white=O), responder nhận màu còn lại. phase='playing'. Bàn đang 3 đen / 2 trắng -> turnSeat = ghế của bên cầm TRẮNG (O). Khởi động đồng hồ ván chính: remainingMs=[initialMs, initialMs], turnStartedAt=now, turnDeadlineAt tính theo perMoveCapMs. |
| `claim_timeout` | {} | phase!=='finished'; playerId thuộc ván và KHÔNG phải bên đang đến lượt; serverNow >= clock.turnDeadlineAt (hoặc >= phaseDeadlineAt nếu đang ở pha swap2). Cho phép client chủ động đòi xử giờ khi hệ thống tick trễ. Kết quả giống hệt tick(): bên đang đến lượt thua, reason='timeout'. Nếu chưa quá hạn -> lỗi E_NOT_TIMED_OUT, không đổi state. Đây là hành động idempotent: gọi nhiều lần cho cùng một timeout chỉ có tác dụng một lần. |
| `set_connection` | { connected: boolean } | Do lớp phòng (room) gọi, không phải client gửi trực tiếp. phase!=='finished'. connected=false -> ghi disconnectAt, bắt đầu tiêu quỹ disconnectLeftMs trong tick(). connected=true -> dừng tiêu quỹ, KHÔNG hoàn lại phần đã tiêu. Khi disconnectLeftMs<=0 -> đối phương thắng, reason='disconnect'. LƯU Ý: đồng hồ ván chính vẫn chạy song song nếu người mất kết nối đang đến lượt — bên nào cạn trước thì xử theo bên đó. |

## Kết thúc ván

## Điều kiện kết thúc và cách tính điểm

### Thắng (`result.kind = 'win'`)
| `reason` | Kích hoạt bởi | Ghi chú |
|---|---|---|
| `'five'` | `checkWin` trả chuỗi đúng `winLength` (5) hợp lệ | Có ít nhất 1 đầu hở khi `blockedEndsRule=true` |
| `'overline'` | `checkWin` trả chuỗi ≥ 6 và `overlineWins=true` | Thắng kể cả chặn 2 đầu |
| `'resign'` | action `resign` | Được đầu hàng ở mọi pha, kể cả swap2 |
| `'timeout'` | `tick()` hoặc `claim_timeout` | Hết giờ tổng, hoặc hết giờ nước (khi `onPerMoveTimeout='lose'`) |
| `'disconnect'` | `tick()` khi `disconnectLeftMs <= 0` | Quỹ ân hạn riêng, mặc định 60s |
| `'forfeit'` | > 20 nước sai liên tiếp trong 10s | Chống client lỗi/spam |
| `'forbidden'` | Chỉ khi `renjuForbidden=true`, đen đi nước cấm | Đen thua ngay |

### Hoà (`result.kind = 'draw'`)
| `reason` | Kích hoạt |
|---|---|
| `'board_full'` | `emptyCount === 0` sau một nước không thắng. Trên 15×15 gần như không xảy ra |
| `'agreement'` | `offer_draw` + `respond_draw{accept:true}` |

**Không tồn tại:** hoà do lặp nước, hoà do 50 nước, hoà do thiếu lực, hoà do hết nước đi (stalemate). Xem mục 4 của `rules`.

### `finished(state)`
```ts
finished = (s) => s.phase === 'finished'   // tương đương s.result !== null
```

### `results(state)` — mảng 2 phần tử, sắp theo `place` tăng dần
```ts
// THẮNG / THUA
[{ playerId: winner, place: 1, score: 1 },
 { playerId: loser,  place: 2, score: 0 }]

// HOÀ — cùng hạng 1
[{ playerId: a, place: 1, score: 0.5 },
 { playerId: b, place: 1, score: 0.5 }]
```

`score` dùng đúng thang cờ chuẩn 1 / 0.5 / 0 để nạp thẳng vào Elo/Glicko-2 mà không cần chuyển đổi. Gợi ý K-factor: 40 cho < 30 ván, 20 cho 30–200 ván, 10 cho > 200 ván hoặc Elo > 2100.

### Metadata kèm theo cho tầng ngoài (không nằm trong `results`, đọc từ `state.result`)
- `reason` — để hiển thị "Thắng do hết giờ" vs "Thắng do 5 quân".
- `winningLine: {r,c}[]` — **bắt buộc trả về đúng thứ tự dọc theo hướng**, độ dài đúng bằng chiều dài chuỗi thắng (5 hoặc ≥6). Client dùng để vẽ vệt highlight. Nếu nước đi tạo nhiều chuỗi thắng, trả chuỗi **dài nhất**; nếu bằng nhau, trả chuỗi của hướng đầu tiên theo thứ tự `DIRS`.
- `ply` khi kết thúc và `history` đầy đủ — để phát lại ván.

### Phần thưởng (tuỳ nền tảng, ngoài engine)
- Không nên thưởng theo "thắng nhanh": ở caro, thắng dưới 12 nước gần như chỉ xảy ra khi đối thủ bỏ cuộc hoặc mất kết nối → dễ bị lợi dụng cày điểm.
- Ván kết thúc do `disconnect` trước ply 10: khuyên **không tính Elo**, chỉ ghi nhận thắng phòng, để tránh farm bằng cách rời trận.

## Che thông tin ẩn

**Không có thông tin ẩn.** Cờ caro là game thông tin hoàn hảo (perfect information): cả hai người chơi và mọi khán giả đều thấy toàn bộ bàn cờ tại mọi thời điểm.

`view(state, viewerId)` vì thế gần như là hàm đồng nhất, nhưng vẫn **phải làm 3 việc**:

1. **Xoá `state._internal`** — chứa `botScratch` (bảng transposition, cache đánh giá, nước đi dự tính của bot) và `rngSeedUsed`. Nếu rò `botScratch` ra client thì người chơi đọc được nước bot định đi, và tệ hơn là đọc được điểm đánh giá của mọi nước → biến thành phần mềm gian lận miễn phí. Đây là rủi ro rò rỉ thật duy nhất của game này.

2. **Xoá trường điều khiển nội bộ của đối phương**: `players[i].invalidStreak`, `players[i].disconnectLeftMs` (chỉ gửi dạng rút gọn `opponentReconnectingSecondsLeft` khi đối phương thực sự mất kết nối), `players[i].botLevel` nếu phòng cấu hình "bot ẩn danh".

3. **Chuẩn hoá đồng hồ theo thời điểm gửi**: thay vì gửi `turnStartedAt` thô, gửi thêm `serverNowMs` để client tự nội suy đồng hồ đếm lùi mà không bị lệch do trôi giờ máy khách. Không được để client tự tính thời gian đã tiêu.

**Trường hợp DUY NHẤT phát sinh thông tin ẩn tạm thời: pha `swap2_place3`.** Trong lúc người mở bàn đang chọn 3 quân, các toạ độ chưa chốt **không được** stream từng quân một cho đối thủ — phải gửi nguyên bộ 3 khi `apply` thành công. Nếu client gửi từng quân một qua kênh preview, server phải chặn. Ngoài pha đó ra, không có gì để che.

**Khán giả (spectator):** thấy đúng bằng người chơi, cộng thêm quyền xem lại lịch sử. Không có chế độ "che bàn cờ với khán giả". Nếu nền tảng có tính năng phân tích/gợi ý nước đi cho khán giả, phải **tắt hoàn toàn khi ván đang diễn ra** và chỉ bật sau khi `finished(state)` — nếu không, khán giả có thể nhắn nước đi cho người chơi.

## Tính giờ

## `realtime = false` nhưng VẪN PHẢI gọi `tick()` — đọc kỹ mục này

Cờ caro là game **thuần lượt**: không có mô phỏng vật lý, không có gì thay đổi theo thời gian ngoài **đồng hồ**. Vì vậy `realtime = false`.

**Nhưng nếu nền tảng hiểu `realtime=false` là "không bao giờ gọi tick" thì đồng hồ sẽ không bao giờ hết giờ** và ván treo vĩnh viễn khi một bên bỏ đi. Hai cách xử lý, chọn một:

- **(Khuyên dùng) Hẹn giờ theo deadline:** mỗi khi `apply` thành công, lớp phòng đặt một `setTimeout` đến `state.clock.turnDeadlineAt` (và `phaseDeadlineAt` trong swap2). Khi timer nổ, gọi `tick(state, Date.now(), rng)`. Huỷ timer cũ mỗi lần có nước mới. Chi phí: 0 CPU khi rảnh, độ chính xác cao. Với nhiều instance, lưu deadline vào Redis sorted-set và có một worker quét.
- **(Đơn giản hơn) Tick chậm:** gọi `tick()` mỗi 1000 ms cho mọi ván đang chạy. 1000 ván đồng thời × 1 lần/giây = không đáng kể vì `tick` chỉ là vài phép so sánh số. Độ trễ xử giờ tối đa 1 s — chấp nhận được.

`tick` phải **idempotent** và **thuần**: gọi lại sau khi ván đã `finished` thì trả nguyên state.

## Các mốc thời gian
```ts
clock: {
  initialMs: 300_000,      // 5 phút mỗi bên
  incrementMs: 3_000,      // Fischer: +3 giây sau mỗi nước hợp lệ
  perMoveCapMs: 60_000,    // trần 60 giây cho MỘT nước, kể cả còn nhiều giờ
  disconnectGraceMs: 60_000,
  swap2PhaseMs: 30_000,
  lagCompMs: 200
}
```

### Ba preset đề xuất
| Chế độ | initial | increment | perMoveCap | Dùng cho |
|---|---|---|---|---|
| **Chớp** | 3 phút | +2 s | 30 s | Ghép cặp nhanh, mặc định mobile |
| **Nhanh** (mặc định) | 5 phút | +3 s | 60 s | Phòng thường, xếp hạng |
| **Thong thả** | 10 phút | +5 s | 120 s | Phòng bạn bè, đấu bot Khó |
| **Không giờ** | ∞ | — | 10 phút | Chỉ phòng riêng. `perMoveCap` vẫn bắt buộc để tránh ván treo |

`perMoveCapMs` là chi tiết rất hợp với thói quen app caro Việt Nam (đồng hồ đếm lùi từng nước) và **bắt buộc phải có** cho mọi chế độ, kể cả "không giờ" — nó là van an toàn chống ván zombie.

## Công thức trừ giờ trong `apply` (chính xác từng bước)
```ts
const seat = state.turnSeat;
const elapsed = Math.max(0, serverNow - state.clock.turnStartedAt - cfg.clock.lagCompMs);

// 1. Ghi snapshot TRƯỚC khi trừ (phục vụ undo)
move.clockSnapshot = [...state.clock.remainingMs];

// 2. Trừ
state.clock.remainingMs[seat] = Math.max(0, state.clock.remainingMs[seat] - elapsed);

// 3. Nếu vừa chạm 0 -> đây là nước "cứu giờ sát nút". Chính sách: CHẤP NHẬN nước đi
//    (người chơi đã gửi trước deadline, chỉ là gói tin đến chậm), rồi cộng increment.
//    Nếu serverNow > turnDeadlineAt + lagCompMs thì TỪ CHỐI và xử thua giờ.

// 4. Cộng increment — CHỈ cho nước HỢP LỆ, không cộng cho nước bị từ chối
state.clock.remainingMs[seat] += cfg.clock.incrementMs;

// 5. Đặt deadline cho bên kế tiếp
const next = 1 - seat;
state.clock.turnStartedAt  = serverNow;
state.clock.turnDeadlineAt = serverNow + Math.min(
  state.clock.remainingMs[next],
  cfg.clock.perMoveCapMs ?? Infinity
);
```

## Logic `tick(state, now, rng)`
```
if (state.phase === 'finished') return state;

// A. Pha swap2
if (phase bắt đầu bằng 'swap2' && now >= clock.phaseDeadlineAt) {
   swap2_place3  -> tự đặt bộ 3 theo book: tâm (X), kề phải tâm (O), kề trên tâm (X)
   swap2_respond -> tự chọn 'take_black'
   swap2_pick_color -> tự chọn 'black'
   // KHÔNG xử thua ở pha khai cuộc — quá khắt khe, người mới sẽ bỏ game
   return state đã tiến pha;
}

// B. Ván chính
if (phase === 'playing' && now >= clock.turnDeadlineAt) {
   const overflow = now - clock.turnDeadlineAt;
   const seat = turnSeat;
   const hitTotal   = remainingMs[seat] <= (now - clock.turnStartedAt);
   const hitPerMove = !hitTotal;   // deadline bị chặn bởi perMoveCap

   if (hitTotal) -> đối phương THẮNG, reason='timeout'
   else if (cfg.onPerMoveTimeout === 'lose') -> đối phương THẮNG, reason='timeout'
   else /* 'autoMove' */ {
       // Phòng thường/đấu bot: tự đi hộ bằng bot 'easy' để ván không treo.
       // KHÔNG dùng rng thuần để chọn ô — sẽ ra nước rác ở góc bàn.
       // Đánh dấu move.auto = true để không tính vào thống kê người chơi.
       // Quá 3 lần autoMove liên tiếp -> xử thua, reason='timeout'.
   }
}

// C. Mất kết nối (chạy SONG SONG với B)
for each seat có connected === false:
   disconnectLeftMs -= (now - lastTickAt)
   if (disconnectLeftMs <= 0) -> đối phương THẮNG, reason='disconnect'
```

## Hết giờ trong cờ caro = thua ngay, không có ngoại lệ
Khác cờ vua (đối thủ thiếu lực chiếu hết thì xử hoà), ở cờ caro **bên còn quân luôn có khả năng thắng về mặt lý thuyết** chừng nào còn ≥ 5 ô trống thẳng hàng. Nên **không cần luật "insufficient material"**. Trường hợp duy nhất phải cẩn thận: nếu `emptyCount === 0` thì ván đã kết thúc hoà từ nước trước, `tick` không bao giờ thấy trạng thái đó.

## Bù trễ mạng
- `lagCompMs = 200` trừ thẳng khỏi thời gian suy nghĩ mỗi nước. Với mạng 4G Việt Nam (RTT 60–150 ms) là đủ và không bị lạm dụng.
- Client hiển thị đồng hồ **đếm lùi cục bộ**, đồng bộ lại với `serverNowMs` mỗi lần nhận event. Nếu lệch > 2 s thì snap thẳng, không tween.
- Khi còn < 10 s: client đổi màu đồng hồ + tick âm thanh mỗi giây. Đây là lúc rớt mạng gây ức chế nhất — hiển thị rõ "đang mất kết nối, còn Ns" thay vì im lặng.

## Đồng hồ khi bot đi
Bot **vẫn tiêu giờ thật** (không miễn giờ, để công bằng cảm giác), nhưng phải có độ trễ tối thiểu nhân tạo: `max(botThinkMs, 600ms)` ở mức Dễ/Vừa và `max(botThinkMs, 400ms)` ở mức Khó — đi ngay tức khắc gây cảm giác khó chịu và lộ là máy.

## Bot

## Minimax + Alpha-Beta hoàn toàn khả thi. Đây là game DỄ làm bot nhất trong 9 game của nền tảng.

Khác cờ vây (không gian trạng thái quá lớn, phải dùng MCTS + mạng nơ-ron) và cờ tỷ phú (ngẫu nhiên + nhiều người, phải dùng heuristic/expectimax), cờ caro có hệ số nhánh **thực tế** rất nhỏ nếu sinh nước đúng cách, và hàm lượng giá theo mẫu (pattern) cực kỳ hiệu quả. Một bot TypeScript thuần chạy Node đạt trình độ trên trung bình khá trong **< 300 ms/nước**.

---

## 1. Sinh nước ứng viên (quan trọng nhất về hiệu năng)
Không bao giờ duyệt cả 225 ô.
- Chỉ xét ô trống có **ít nhất một quân trong bán kính Chebyshev ≤ 2**. Duy trì một `Set<number>` `candidates` cập nhật tăng dần (mỗi nước thêm tối đa 24 ô lân cận, xoá ô vừa chiếm). Không quét lại bàn.
- Ở độ sâu ≥ 4, thu hẹp về **bán kính 1** để giảm nhánh (mất rất ít chất lượng, nhanh gấp ~3).
- **Cắt còn top-K** sau khi chấm điểm heuristic tĩnh: K = 12 ở gốc, K = 8 ở độ sâu 1–3, K = 5 ở độ sâu ≥ 4.
- Hệ số nhánh thực tế sau lọc: ~8. Depth 8 ⇒ 8^8 ≈ 16M nút thô, nhưng alpha-beta với move ordering tốt cắt xuống ~√(8^8) ≈ 4000 nút. Thừa sức trong 1 s.

## 2. Ba bước tắt trước khi gọi search (giải quyết 80% số nước)
```
1. Nếu có nước THẮNG NGAY  -> đi luôn.        (dùng chính engine.checkWin, không dùng pattern)
2. Nếu đối phương có nước THẮNG NGAY -> chặn. Nếu có ≥2 điểm thắng khác nhau -> thua chắc,
   chọn điểm tạo được "bốn" của mình để kéo dài (hoặc để bot Dễ thì đi bừa vào 1 điểm).
3. Nếu bàn trống -> đi tâm. Nếu ply===1 -> đi kề tâm theo book. (Không search, tiết kiệm cả giây.)
```

## 3. Hàm lượng giá (pattern-based)
Quét **4 hướng × mọi đường thẳng**, nhưng chỉ tính **incremental**: lưu `lineScore[dir][lineIndex]` và chỉ tính lại 4 đường đi qua ô vừa thay đổi. Chi phí đánh giá O(1) thay vì O(N²).

### Bảng điểm mẫu (đơn vị tương đối, đã tune cho gomoku 5-in-row)
| Mẫu | Ký hiệu (`X`=ta, `.`=trống, `O`/`\|`=chặn) | Điểm |
|---|---|---|
| Năm (thắng) | `XXXXX` hợp lệ | 10 000 000 |
| Bốn mở | `.XXXX.` | 1 000 000 |
| Bốn chặn | `OXXXX.` / `.XXXXO` | 100 000 |
| Bốn đứt | `XX.XX`, `X.XXX`, `XXX.X` | 100 000 |
| Ba mở | `.XXX.` (có chỗ hai đầu) | 20 000 |
| Ba mở đứt | `.XX.X.`, `.X.XX.` | 15 000 |
| Ba chặn | `OXXX.` | 2 000 |
| Hai mở | `..XX..` | 800 |
| Hai mở đứt | `.X.X.` | 500 |
| Hai chặn | `OXX..` | 100 |
| Một mở | `..X..` | 20 |

```
eval(state, me) = Σ pattern(me) − DEF × Σ pattern(opp)
DEF = 1.15   // hơi thiên phòng thủ; 1.0 = cân bằng, 1.4 = bot "lì", khó thắng nhưng chậm hoà
```
Điểm số phải **giảm dần theo độ sâu** cho nước thắng (`FIVE − depth`) để bot chọn đường thắng NGẮN NHẤT, nếu không nó sẽ kéo dài vô nghĩa.

### ⚠️ Điều chỉnh BẮT BUỘC cho luật chặn 2 đầu Việt Nam
Đây là chỗ mọi code gomoku copy từ mạng sẽ SAI. Ba sửa đổi:
1. `XXXXX` bị chặn cả hai đầu **không phải là năm** — điểm = **0** (chuỗi chết), không phải 10 000 000.
2. "Bốn chặn" `OXXXX.` chỉ là mối đe doạ **nếu ô sau ô trống đó không bị chặn**. Phải nhìn **2 ô** ra ngoài: `OXXXX.O` → lấp vào `.` được `OXXXXXO` = chuỗi 5 chặn 2 đầu = **KHÔNG thắng**. Mẫu này đáng giá gần 0, không phải 100 000.
3. Tương tự với bốn đứt: `OXX.XXO` — lấp gap được `OXXXXXO`, **không thắng**. Phải kiểm tra.

**Giải pháp an toàn và đơn giản:** đừng nhận diện "nước thắng" bằng pattern. Với mỗi ô ứng viên, **đặt thử rồi gọi đúng `engine.checkWin(board, N, r, c, color, cfg)`**, sau đó gỡ ra. Chi phí O(1), và bot dùng **cùng một hàm luật** với engine ⇒ không bao giờ lệch luật. Pattern chỉ dùng cho điểm heuristic ở nút lá, còn điều kiện thắng/thua luôn hỏi engine.

## 4. Khung tìm kiếm
- **Negamax + alpha-beta**, fail-soft.
- **Iterative deepening**: depth 2, 4, 6, 8… Giữ `bestMove` của **độ sâu hoàn tất gần nhất**. Kiểm tra deadline mỗi 1024 nút (`if ((nodes & 1023) === 0 && Date.now() > deadline) throw TIMEOUT`).
- **Ngân sách thời gian**: `budget = min(600ms, remainingMs/25)`. Cứng ở 700 ms để chừa chỗ cho serialize + mạng.
- **Move ordering** (quyết định tất cả): 1) nước thắng ngay, 2) chặn thắng của đối thủ, 3) nước từ transposition table, 4) killer moves (2 cái/ply), 5) history heuristic, 6) điểm heuristic tĩnh giảm dần.
- **Transposition table**: Zobrist 64-bit (dùng 2×`Uint32Array` hoặc `BigInt`; khuyên 2 nhánh 32-bit cho tốc độ V8). Key phải gồm **cả bên đang đi**. Dung lượng 2^20 entry (~16 MB) là dư. **Xoá TT giữa các ván có `config` khác nhau** (bàn khác kích thước hoặc `blockedEndsRule` khác ⇒ cùng thế cờ khác giá trị).
- **Quiescence (chống hiệu ứng chân trời)**: ở nút lá, nếu bên đi còn "bốn" chưa giải quyết thì **mở rộng thêm** chỉ theo các nước bốn/chặn-bốn cho tới khi lặng. Không có bước này, bot sẽ bỏ qua đòn nối bốn và thua những ván tưởng như đang thắng.
- **VCF (Victory by Continuous Four)**: tìm chuỗi ép bằng các nước "bốn" liên tục, độ sâu 12–16. Không gian nhánh rất hẹp (mỗi nước bốn chỉ có 1–2 cách đáp) nên chạy < 50 ms. Chạy VCF **cho mình trước** mỗi nước; nếu tìm thấy → đi luôn, bỏ qua search. Rồi chạy VCF **cho đối thủ**; nếu đối thủ có VCF → phải phá.

---

## 5. Ba mức khó

### DỄ — "người mới tập"
- Không search. Chỉ `eval` tĩnh depth-1 trên ~10 ô ứng viên (bán kính 1).
- Luôn đi nước thắng ngay nếu có (nếu không thì bot quá tệ, mất vui).
- **Chỉ chặn "bốn"**, cố ý **bỏ qua "ba mở"** của đối thủ với xác suất 70%. Đây chính là cách người mới thua — đúng chất "dễ".
- Nhiễu: chọn ngẫu nhiên trong top-4 nước theo trọng số `[0.45, 0.25, 0.20, 0.10]`, gieo bằng `rng` của server.
- Thời gian: < 5 ms. Thêm delay nhân tạo 600–1100 ms cho tự nhiên.
- Mục tiêu Elo: ~800–1000. Người chơi lần đầu phải thắng được sau 2–3 ván.

### VỪA — "biết chơi"
- Alpha-beta cố định **depth 4**, không iterative deepening (đủ nhanh, đơn giản).
- Bán kính ứng viên 2, top-8.
- Có bước tắt thắng-ngay/chặn-ngay, **có** chặn ba mở, **không** có VCF, **không** có quiescence.
- Nhiễu nhẹ: 12% chọn nước tốt thứ hai nếu chênh điểm < 15%.
- `DEF = 1.0` (cân bằng công thủ).
- Thời gian: 30–80 ms/nước. Delay nhân tạo lên 600 ms.
- Mục tiêu Elo: ~1400–1600.

### KHÓ — "cao thủ phòng"
- Đủ bộ: VCF cả hai chiều → iterative deepening tới depth 8–10 trong 600 ms → quiescence trên nước bốn → TT + killer + history.
- Bán kính 2 ở depth ≤ 3, bán kính 1 ở depth ≥ 4. Top-12/8/5.
- `DEF = 1.15`.
- Sách khai cuộc nhỏ: 20–30 thế mở đầu 4 nước đầu (lấy từ ván thắng đã lưu, hoặc tự sinh). Tránh việc mọi ván đều mở giống hệt nhau — rất chán.
- Không nhiễu.
- Thời gian: 200–600 ms/nước, **bảo đảm < 1 s** nhờ deadline cứng.
- Mục tiêu Elo: ~2000+. Đánh bại được đa số người chơi thường.

## 6. Thư viện và hiệu năng trong Node
- **Không cần** thư viện ngoài. TypeScript thuần + `Uint8Array` cho bàn cờ + `Int32Array` cho TT.
- Dùng **`Uint8Array` phẳng** trong bot (chuyển từ `number[]` của state một lần ở đầu `chooseMove`). Tránh `Array<Array<number>>` — V8 chậm hơn ~4×.
- **Không dùng `structuredClone`/`JSON.parse(JSON.stringify())` trong vòng lặp search.** Dùng make/unmake: `board[idx] = color; ...; board[idx] = EMPTY`.
- Nếu một process Node phục vụ nhiều ván đồng thời: bot Khó **phải chạy trong `worker_threads`** (pool 2–4 worker), nếu không 600 ms tính toán sẽ chặn event loop và làm treo mọi ván khác. Bot Dễ/Vừa chạy inline thoải mái.
- Đo thật trước khi phát hành: 1000 nước ngẫu nhiên × bot Khó, ghi p50/p95/p99 thời gian. Nếu p99 > 900 ms thì hạ `budget` xuống 400 ms.

### Chỗ bot dễ hỏng

**1. Bot dùng pattern-matching để nhận diện nước thắng thay vì gọi `engine.checkWin` → SAI LUẬT VIỆT NAM.** Đây là lỗi nghiêm trọng nhất và chắc chắn xảy ra nếu copy code gomoku từ GitHub. Code chuẩn quốc tế coi `OXXXXXO` là thắng; luật Việt Nam thì không. Hậu quả: bot tưởng mình đã thắng nên ngừng phòng thủ, hoặc lao vào tạo chuỗi 5 chặn 2 đầu vô dụng. **Bắt buộc bot và engine dùng chung một hàm `checkWin`.**

**2. Không nhìn 2 ô ra ngoài khi đánh giá "bốn chặn".** `O X X X X . O` trông giống một mối đe doạ chết người (điểm 100 000) nhưng lấp vào ô trống chỉ được `OXXXXXO` = chuỗi chết = vô giá trị. Bot sẽ lãng phí nước đi tạo thế này, và tệ hơn: bot sẽ **hoảng loạn đi chặn** thế này của đối thủ trong khi đối thủ đang có ba mở thật ở chỗ khác. Mọi đánh giá mối đe doạ phải chạy qua kiểm tra hợp lệ theo `blockedEndsRule`.

**3. Sinh nước quá rộng → vượt 1 giây.** Duyệt cả 225 ô ở depth 6 là 225^6, treo máy. Phải lọc theo bán kính lân cận + top-K ngay từ đầu, và duy trì tập ứng viên **tăng dần** chứ không quét lại bàn mỗi nút.

**4. Bán kính ứng viên = 1 quá hẹp ở gốc.** Bot sẽ không bao giờ tìm thấy nước nối hai cụm cách nhau 2 ô — một đòn tấn công cơ bản. Gốc và các độ sâu nông phải dùng bán kính 2.

**5. Không có quiescence → hiệu ứng chân trời.** Bot dừng search đúng lúc đối phương đang có "bốn" treo, chấm điểm thế cờ là "ổn", rồi thua ngay nước sau. Triệu chứng nhận biết: bot chơi hay 20 nước rồi đột ngột thua trong 2 nước. Phải mở rộng qua các nước bốn/chặn-bốn cho tới khi lặng.

**6. Không chặn "song ba" (double open three).** Đối thủ tạo hai ba mở giao nhau → không chặn được cả hai → thua ép. Bot depth-2 hoàn toàn mù với đòn này. Depth tối thiểu để thấy là 4. Nếu bot Vừa vẫn hay thua kiểu này, thêm luật cứng: "nếu một ô ứng viên của đối thủ tạo ≥ 2 ba mở thì cộng điểm phòng thủ lớn cho ô đó".

**7. Không có iterative deepening → hết giờ giữa chừng trả nước rác.** Nếu search bị cắt ở giữa depth 8, `bestMove` mới chỉ duyệt được 2/8 nhánh đầu và có thể là nước tệ nhất. Phải giữ kết quả của **độ sâu hoàn tất gần nhất** và chỉ thay khi độ sâu mới hoàn tất trọn vẹn.

**8. Zobrist key thiếu "bên đang đi".** Cùng một thế bàn nhưng khác lượt có giá trị hoàn toàn khác. Thiếu bit này → TT trả sai giá trị → bot đi những nước vô lý không giải thích được. Cũng phải xoá/đổi namespace TT khi `config` đổi (`boardSize`, `blockedEndsRule`, `overlineWins`).

**9. Nước đầu tiên trên bàn trống tốn cả giây tính toán vô ích.** Mọi ô đối xứng, search không phân biệt được, mà bảng ứng viên lại rỗng (không có quân nào để lấy lân cận) → hoặc crash, hoặc duyệt 225 ô. Hardcode: bàn trống → đi tâm. `ply === 1` → đi một trong 8 ô kề tâm chọn theo `rng`.

**10. Bot "Dễ" ngu sai cách.** Nếu làm dễ bằng cách chọn ô hoàn toàn ngẫu nhiên, bot sẽ rải quân khắp bàn và ở góc — trông như phần mềm hỏng, không như người yếu. Người yếu vẫn đi **gần** quân đang có, chỉ là không thấy đòn kép. Cách đúng: giữ nguyên bộ sinh nước lân cận + eval tĩnh, rồi (a) chọn ngẫu nhiên trong top-4 và (b) cố ý bỏ qua "ba mở" của đối thủ 70% số lần. Kết quả trông tự nhiên và thua được.

**11. Bot chặn event loop.** 600 ms search đồng bộ trong process phục vụ 200 ván ⇒ mọi ván khác đứng hình 600 ms, đồng hồ nhảy giật, websocket timeout. Bot Khó **phải** ở `worker_threads`. Tối thiểu: nếu chạy inline thì phải `await new Promise(setImmediate)` mỗi 8192 nút để nhả event loop (chậm hơn ~15%, nhưng an toàn).

**12. Bot không biết chơi swap2.** Nếu không cài riêng, bot sẽ (a) đặt 3 quân mở bàn ở vị trí vô nghĩa và (b) chọn màu bừa → thua ngay từ khai cuộc, người chơi phát hiện và farm điểm. Cách xử lý tối thiểu: bot dùng **book cố định 5–8 bộ 3 quân** cho pha 1; ở pha 2/3 chạy `eval` tĩnh cho cả hai màu và chọn màu có điểm cao hơn. Nếu không kịp làm, **tắt swap2 cho phòng đấu bot**.

**13. Bot đi tức thì làm hỏng cảm giác chơi.** Bot Dễ tính xong trong 3 ms và đặt quân ngay khi tay người chơi còn chưa rời màn hình. Phải có delay nhân tạo 600–1100 ms, và delay nên **biến thiên** (không phải hằng số) — dài hơn ở thế cờ phức tạp, ngắn hơn khi chặn hiển nhiên.

**14. Bot tiêu giờ mà quên trừ.** Nếu bot được miễn đồng hồ nhưng người chơi thì không, sẽ tạo cảm giác bất công. Và nếu quên hoàn toàn việc set `turnDeadlineAt` sau nước của bot, `tick` sẽ xử thua người chơi nhầm hoặc treo ván.

**15. Chia sẻ mutable state giữa các ván.** `candidates`, `history heuristic`, `killer moves` là per-search. Nếu để module-level và dùng chung cho nhiều ván song song, bot sẽ đi nước của ván khác. Đóng gói toàn bộ scratch vào một object tạo mới mỗi lần `chooseMove`, hoặc reset tường minh.

**16. Điểm thắng không giảm theo độ sâu.** Nếu `FIVE` là hằng số, bot thấy "thắng ở depth 2" và "thắng ở depth 8" bằng điểm nhau, sẽ chọn bừa → nó cứ kéo dài, và nếu có nhiễu thì có thể **vuột mất** nước thắng. Dùng `FIVE − depth`.

## Cạm bẫy khi cài đặt

- LUẬT CHẶN 2 ĐẦU — MÉP BÀN TÍNH LÀ CHẶN. Chuỗi 5 sát biên với đầu kia bị quân địch chặn (`|XXXXXO`) KHÔNG thắng. Rất nhiều bản cài chỉ kiểm tra 'ô liền kề có quân địch không' và quên trường hợp ô đó nằm ngoài bàn — dẫn tới công nhận thắng sai ở rìa bàn cờ. Viết test riêng cho cả 4 cạnh và 4 góc.
- CHUỖI ≥ 6 QUÂN LUÔN THẮNG KỂ CẢ CHẶN 2 ĐẦU. Nếu chỉ viết `if (len === 5)` thì chuỗi 6 sẽ rơi vào nhánh else và không ai thắng — ván treo mãi. Nếu chép nhầm code Renju thì chuỗi 6 lại thành nước CẤM, ngược hoàn toàn với luật Việt Nam. Điều kiện đúng: `len > 5 && overlineWins -> thắng ngay`; `len === 5 -> kiểm tra hai đầu`.
- MỘT NƯỚC TẠO NHIỀU CHUỖI — PHẢI QUÉT ĐỦ 4 HƯỚNG. Không được `return false` ở hướng đầu tiên không thắng. Ca kinh điển: nước đi tạo chuỗi ngang 5 bị chặn 2 đầu (không thắng) VÀ chuỗi chéo 5 hở một đầu (thắng) → kết quả phải là THẮNG. Chỉ `return` khi tìm thấy chuỗi thắng, còn lại thì `continue`.
- ĐẾM CHUỖI PHẢI ĐI CẢ HAI PHÍA TỪ Ô VỪA ĐẶT. Lỗi hay gặp: chỉ đếm về phía dương rồi lấy `1 + fwd`. Khi quân mới đặt nằm GIỮA chuỗi (lấp gap, ví dụ `XX_XX` đặt vào `_`), cách đếm một phía cho ra 3 thay vì 5 → bỏ lỡ nước thắng. Phải `back + 1 + fwd`.
- KIỂM TRA BIÊN THEO (r,c), TUYỆT ĐỐI KHÔNG THEO CHỈ SỐ PHẲNG. Với mảng phẳng `idx = r*N + c`, đi theo hướng ngang từ `c = 0` sang trái cho `idx - 1` vẫn nằm trong `[0, N*N)` nhưng thực chất đã nhảy sang CUỐI HÀNG TRÊN. Bug này tạo ra 'chuỗi thắng' đi xuyên qua mép bàn và cực kỳ khó nhìn ra khi debug. Luôn `inBoard(r, c, N)` trước khi đọc.
- HƯỚNG CHÉO NGƯỢC (1,-1) HAY BỊ QUÊN HOẶC SAI DẤU. Nhiều bản chỉ cài 3 hướng, hoặc cài `(-1,-1)` (trùng với `(1,1)` vì ta đã đếm hai phía). Đúng là 4 hướng độc lập: `(0,1) (1,0) (1,1) (1,-1)`. Test: dựng chuỗi 5 trên đường chéo `/` ở cả góc trên-phải lẫn góc dưới-trái.
- HOÀ DO BÀN ĐẦY BỊ BỎ SÓT. Hiếm nhưng có thật, nhất là trên bàn 15×15 với luật chặn 2 đầu (nhiều chuỗi chết tích tụ). Phải kiểm `emptyCount === 0` SAU khi checkWin trả null. Nếu quên, `apply` sẽ cố đổi lượt cho một bên không còn nước đi hợp lệ và ván treo vĩnh viễn.
- SWAP2 — XÁC ĐỊNH SAI AI ĐI TIẾP. Ba nhánh cho ra ba kết quả khác nhau, rất dễ lẫn. Bất biến để assert: sau mọi pha, bên đi tiếp là bên có ÍT QUÂN HƠN trên bàn. `take_black` → 2Đ/1T → trắng (= opener) đi. `take_white_and_move` → 2Đ/2T → đen (= opener) đi. `place_two` + chọn màu → 3Đ/2T → bên cầm trắng đi. Sai một nhánh là toàn bộ ván lệch màu.
- ĐỒNG HỒ: CỘNG INCREMENT CHO NƯỚC BỊ TỪ CHỐI. Nếu `apply` trả lỗi (ô đã có quân, sai lượt…) mà vẫn chạy nhánh cộng giờ, người chơi có thể spam nước sai để cày thêm giờ vô hạn. Chỉ trừ-và-cộng giờ trên đường thành công, và `return` lỗi TRƯỚC khi chạm vào `clock`.
- UNDO KHÔI PHỤC ĐỒNG HỒ BẰNG PHÉP TRỪ NGƯỢC → LỆCH GIỜ. Phải đọc `clockSnapshot` đã lưu trong `MoveRecord` của nước bị gỡ. Tính ngược (`remaining += thinkMs - increment`) tích luỹ sai số qua nhiều lần undo và bị lợi dụng để kéo dài giờ.
- `apply` MUTATE STATE ĐẦU VÀO. Yêu cầu là hàm thuần. `board` là mảng tham chiếu — `newState = {...state}` là shallow copy, `newState.board[i] = X` sẽ sửa luôn state cũ, phá replay, phá undo, phá bot (bot đang search trên cùng mảng). Phải `board: [...state.board]` (hoặc `.slice()`), và clone cả `players`, `history`, `clock.remainingMs`.
- `tick` KHÔNG IDEMPOTENT. Nếu hạ tầng gọi tick hai lần cho cùng một deadline (timer + polling cùng chạy, hoặc hai instance cùng xử lý), ván sẽ bị 'kết thúc hai lần' và phát hai event thắng, cộng điểm Elo hai lần. Đầu `tick`: `if (state.phase === 'finished') return state;` và mọi nhánh kết thúc phải kiểm `result === null` trước khi ghi.
- MẤT KẾT NỐI VÀ HẾT GIỜ CHẠY SONG SONG, XỬ NHẦM BÊN. Người chơi A đang đến lượt thì rớt mạng. Cả `disconnectLeftMs` của A lẫn `turnDeadlineAt` của A đều đang đếm. Phải xác định rõ cái nào chạm 0 trước và chỉ xử một lần. Đừng để A vừa bị xử thua giờ vừa bị xử thua mất kết nối rồi ghi hai bản ghi kết quả.
- `view` LÀM LỘ `_internal.botScratch`. Vì game không có thông tin ẩn nên lập trình viên hay viết `view = (s) => s`. Nhưng scratch của bot chứa điểm đánh giá mọi ô và nước bot định đi — gửi ra client là tặng luôn phần mềm gian lận. Phải strip tường minh, và viết test khẳng định `JSON.stringify(view(s)).includes('botScratch') === false`.
- RECONNECT CHỈ GỬI DELTA. Khi client kết nối lại giữa ván, nó cần TOÀN BỘ `board`, `history`, `clock` + `serverNowMs`, `lastMove`, `winningLine`. Nếu kênh chỉ phát event tăng dần, người rớt mạng sẽ thấy bàn cờ trống. Phải có một message `full_state` gửi ngay sau khi reconnect.
- KHÔNG HIỂN THỊ LUẬT ĐANG ÁP DỤNG TRƯỚC VÁN. `blockedEndsRule` bật/tắt tạo ra hai game khác nhau. Người chơi tạo chuỗi 5 bị chặn 2 đầu, thấy không thắng, và báo lỗi. Phải in rõ trong phòng chờ: 'Luật chặn 2 đầu: BẬT — hàng 5 bị chặn cả hai đầu không tính thắng, hàng 6 trở lên luôn thắng.' Và ghi `config` vào bản replay.
- BÀN 15×15 VỚI LUẬT CHẶN 2 ĐẦU LÀM VÁN DÀI HƠN ĐÁNG KỂ. Nhiều chuỗi 5 chết tích tụ, ván trung bình dài hơn ~30% so với luật tự do. Nếu đặt `initialMs` theo kinh nghiệm gomoku quốc tế thì sẽ có quá nhiều ván kết thúc bằng hết giờ thay vì bằng thế cờ. Đo thời lượng ván thật rồi mới chốt preset đồng hồ.
- TOẠ ĐỘ HIỂN THỊ KHÔNG NHẤT QUÁN GIỮA CLIENT, LOG VÀ REPLAY. Hàng đếm từ trên xuống hay từ dưới lên, cột có bỏ chữ I hay không — chọn MỘT quy ước và ghi vào tài liệu. Lẫn lộn ở đây khiến mọi biên bản ván và mọi báo cáo bug trở nên vô dụng.

## Mỹ thuật riêng của game này

## Ý tưởng chủ đạo: "VỞ Ô LY HỌC TRÒ" — mực bút bi trên giấy kẻ ô

Đây là ký ức thật và rất riêng của người Việt: cờ caro được chơi trên **giấy ô ly**, bằng **bút bi xanh và bút bi đỏ**, trong giờ ra chơi. Không game nào khác trong nền tảng có thể lấy chất liệu này, và nó đối lập rõ rệt với mọi game còn lại.

### Vì sao không đụng hàng
| Game | Chất liệu đã chiếm | Cờ caro tránh bằng cách |
|---|---|---|
| Cờ vây | Gỗ kaya, quân sứ/đá đen-trắng, thiền tịnh | Caro dùng **giấy + mực**, phẳng hoàn toàn, không khối, không bóng |
| Cờ tướng / Cờ úp | Gỗ nâu, chữ triện đỏ-đen, quân tròn dày | Caro **không có quân vật lý**, chỉ có nét viết |
| Cờ vua | Đá cẩm thạch / gỗ, quân 3D, trắng-đen | Caro **2D tuyệt đối**, phối màu xanh-đỏ-kem |
| Cờ tỷ phú | Nhựa bóng, màu bão hoà cao, sặc sỡ | Caro **giảm bão hoà**, chỉ 2 màu mực |
| Cá ngựa | Nhựa bóng, 4 màu tươi, xúc xắc | (như trên) |
| Cờ gánh / Ô ăn quan | Sân gạch, sỏi đá, đất nung, dân gian ngoài trời | Caro là **dân gian TRONG LỚP HỌC**, giấy chứ không phải đất |

---

### Bảng màu — chế độ SÁNG ("trang vở")
| Token | Hex | Dùng cho |
|---|---|---|
| `--paper` | `#FBF8EF` | Nền giấy, hơi ngả kem (không bao giờ dùng `#FFFFFF`) |
| `--paper-shade` | `#F1ECDE` | Bóng mép trang, vùng lõm |
| `--grid` | `#A9BEDD` | Nét kẻ ô ly, xanh tím nhạt, dày 1px |
| `--grid-major` | `#8AA6CE` | Nét đậm mỗi 5 ô (giúp đếm chuỗi bằng mắt) |
| `--margin-red` | `#E0736F` | Đường kẻ lề dọc, hồng đỏ nhạt |
| `--ink-blue` | `#25428F` | Quân X — mực bút bi xanh |
| `--ink-blue-soft` | `#4A63A8` | Bóng mực loang của X |
| `--ink-red` | `#C4342F` | Quân O — mực bút bi đỏ |
| `--ink-red-soft` | `#D4605B` | Bóng mực loang của O |
| `--pencil` | `#6E6A60` | Chữ phụ, nhãn toạ độ, ghi chú chì |
| `--marker` | `#FFE066` | Bút dạ quang đánh dấu chuỗi thắng (blend `multiply`) |
| `--eraser` | `#E8E2D2` | Vết tẩy — dùng cho ô undo |

### Bảng màu — chế độ TỐI ("bảng đen phấn trắng")
Không tối-hoá trang giấy (sẽ thành xám bẩn). Đổi hẳn ẩn dụ sang **bảng đen lớp học**:
| Token | Hex |
|---|---|
| `--paper` | `#1E2A26` (xanh rêu đen của bảng) |
| `--grid` | `#3D504A` |
| `--grid-major` | `#4F665E` |
| `--ink-blue` (X) | `#EFEAE0` (phấn trắng) |
| `--ink-red` (O) | `#F2C75C` (phấn vàng) |
| `--marker` | `#7FD1AE` với blend `screen` |
| Hạt bụi phấn | overlay noise 4% |

---

### Chất liệu và kết cấu
- **Nền giấy:** texture sợi giấy tileable, độ nổi rất nhẹ (opacity 6–8%). Thêm một gradient rất mờ ở mép để gợi trang giấy hơi cong.
- **Nét kẻ ô ly:** vẽ bằng CSS `repeating-linear-gradient`, không dùng ảnh — sắc nét ở mọi DPI. Ô vuông cạnh 34–40 px trên desktop, 22–26 px trên mobile.
- **Đường kẻ lề đỏ** chạy dọc bên trái bàn cờ, và **vài lỗ gáy vở** ở mép — chi tiết nhỏ nhưng lập tức nhận ra là vở ô ly.
- **Quân cờ là NÉT VIẾT, không phải icon.** Mỗi X gồm 2 đường SVG hơi cong và **không giao nhau hoàn hảo** ở tâm; mỗi O là một đường ellipse **hở một chút** ở điểm bắt đầu và hơi chờm lên khi khép. Chuẩn bị **3 biến thể wobble** cho mỗi ký hiệu, chọn ngẫu nhiên theo hash toạ độ (không dùng `rng` của engine) — để không có hai quân nào giống hệt nhau.
- **Độ dày nét** biến thiên nhẹ dọc theo đường (dùng `stroke-linecap: round` + nhiều path chồng với opacity khác nhau) để giả áp lực bút.
- **Loang mực:** một vệt blur rất nhẹ cùng màu, opacity 12%, lệch 0.5 px — bút bi trên giấy luôn loang một chút.

### Chuyển động
- **Đặt quân:** vẽ nét bằng `stroke-dasharray` + `stroke-dashoffset` từ 100% về 0. X: hai nét nối tiếp, tổng 180 ms, easing `cubic-bezier(.2,.8,.3,1)`. O: một nét 200 ms. **Không dùng scale/bounce** — bút không nảy.
- **Chuỗi thắng:** vệt bút dạ quang quét ngang 5 ô, 420 ms, đầu vệt hơi tù và cuối vệt hơi nhạt dần như dạ quang thật. Blend `multiply` (sáng) / `screen` (tối).
- **Nước cuối:** chấm tròn nhỏ màu chì ở góc trên-trái ô, pulse rất nhẹ 2 s/chu kỳ.
- **Rê chuột:** hiện ký hiệu của mình ở dạng **nét chì mờ 22%** — đúng cảm giác "ướm bút trước khi viết".
- **Undo được chấp nhận:** vết tẩy — ký hiệu mờ dần kèm một vệt `--eraser` quét qua, 260 ms, để lại một chút "bẩn giấy" 5% opacity vĩnh viễn trên ô đó. Chi tiết này khiến bàn cờ kể được câu chuyện của ván đấu.
- **Hết giờ sắp cạn:** trang giấy rung rất khẽ (±1 px) và đồng hồ đổi sang `--margin-red`.

### Chữ
- Giao diện (nút, tên người chơi, đồng hồ): **Be Vietnam Pro** 400/600/700 — bộ dấu tiếng Việt đầy đủ, hình khối hiện đại, cân bằng với nền giấy hoài niệm.
- Số đồng hồ: Be Vietnam Pro với `font-variant-numeric: tabular-nums` (bắt buộc, nếu không số sẽ nhảy ngang).
- Nhãn toạ độ A–O / 1–15: Be Vietnam Pro 500, màu `--pencil`, cỡ nhỏ.
- **Cảnh báo thực tế:** phần lớn font viết tay trên Google Fonts (Patrick Hand, Caveat…) **thiếu dấu tiếng Việt** (ơ, ư, ệ, ỗ…). Đừng dùng cho chuỗi có dấu — chỉ dùng cho nhãn thuần Latin, hoặc tốt hơn: **vẽ chữ viết tay bằng SVG path** cho vài nhãn cố định (tiêu đề "Cờ Caro", nút "Đầu hàng") và dùng Be Vietnam Pro cho mọi nội dung động.

### Bố cục và khung cảnh
- Bàn cờ nằm trên **mặt bàn học sinh gỗ nhạt** (chỉ thấy viền mỏng xung quanh trang giấy), có bóng đổ mềm để trang giấy như đang nằm trên bàn.
- Hai người chơi hiển thị như **tem dán / nhãn vở** ở hai mép, có viền răng cưa.
- Đồng hồ vẽ như **con dấu tròn** đóng bằng mực, viền không đều.
- Chat trong phòng: bong bóng dạng **giấy nhớ (sticky note)** màu vàng nhạt, hơi nghiêng 1–2°.
- Chiến thắng: **vụn giấy confetti** (hình chữ nhật nhỏ, 3 màu: kem, xanh mực, đỏ mực) rơi có xoay, kèm một con dấu "THẮNG" đóng lệch ở giữa bàn.

### Âm thanh
Tất cả đều nhẹ, ngắn, không nhạc nền trong ván.
- Đặt quân: tiếng đầu bút bi chạm giấy (3 biến thể luân phiên), 60 ms.
- Rê chuột qua ô hợp lệ: gần như im lặng, chỉ một tiếng sột rất khẽ.
- Chuỗi thắng: tiếng dạ quang quẹt qua giấy.
- Hết giờ: chuông đồng hồ lớp học ngắn.
- Undo: tiếng tẩy chì.
- Vào phòng: tiếng lật trang vở.

### Khả năng tiếp cận
- Xanh mực và đỏ mực là cặp màu **nguy hiểm cho người mù màu đỏ-xanh lá**, nhưng cặp **xanh lam / đỏ** thì phân biệt được về độ sáng (L* ≈ 30 vs 45). Vẫn phải thêm lớp bảo hiểm: **hình dạng X và O đã khác nhau hoàn toàn** — đó chính là lớp bảo vệ chính, không phụ thuộc màu.
- Bật tuỳ chọn "nét đậm" tăng `stroke-width` 40% và tăng độ tương phản nét kẻ ô.
- Chuỗi thắng ngoài vệt dạ quang phải có thêm **viền nét đứt** quanh 5 ô — không chỉ dựa vào màu.
- Tôn trọng `prefers-reduced-motion`: bỏ hiệu ứng vẽ nét, quân hiện ngay; bỏ confetti; giữ vệt thắng nhưng không animate.
- Vùng chạm tối thiểu 44×44 px trên mobile: nếu ô nhỏ hơn, dùng **kính lúp ngón tay** (phóng to vùng quanh ngón) thay vì phóng to cả bàn.

### Asset tối thiểu

- Texture giấy ô ly tileable 512×512 PNG, sợi giấy nổi nhẹ (~25 KB) + biến thể bảng đen cho chế độ tối
- Nét kẻ ô ly + kẻ lề đỏ: KHÔNG dùng ảnh, sinh bằng CSS repeating-linear-gradient (sắc nét mọi DPI, 0 byte)
- SVG path quân X: 3 biến thể wobble, mỗi biến thể 2 đường nét, viewBox 100×100, có sẵn stroke-dasharray để animate vẽ nét
- SVG path quân O: 3 biến thể wobble, mỗi biến thể 1 đường ellipse hở đầu, viewBox 100×100
- SVG vệt bút dạ quang đánh dấu chuỗi thắng: 1 path co giãn được theo chiều dài 5..N ô, đầu tù cuối nhạt, dùng cho cả 4 hướng qua transform
- SVG vệt tẩy (undo) + texture 'bẩn giấy' còn lại sau khi tẩy, opacity 5%
- Chấm chì đánh dấu nước cuối (SVG 16×16)
- Ảnh nền mặt bàn học sinh gỗ nhạt 1920×1080 WebP, làm mờ nhẹ, dùng cho vùng ngoài trang giấy (~60 KB)
- Khung avatar dạng tem dán viền răng cưa (SVG mask, 2 kích cỡ)
- Con dấu tròn cho đồng hồ + con dấu 'THẮNG' / 'HOÀ' (SVG, mực lem không đều)
- Bộ icon nét vẽ tay 24×24 SVG: đầu hàng (cờ trắng), xin hoà (bắt tay), xin đi lại (mũi tên vòng), đồng hồ, âm thanh bật/tắt, thoát phòng, xem lại ván
- Sprite vụn giấy confetti: 3 màu (kem/xanh mực/đỏ mực) × 3 hình dạng, dùng canvas particle không cần ảnh
- Font Be Vietnam Pro 400/600/700 (Google Fonts, subset vietnamese+latin, woff2, ~45 KB tổng)
- SVG chữ viết tay dựng sẵn cho tiêu đề 'Cờ Caro' và 2-3 nhãn cố định (vì font viết tay thiếu dấu tiếng Việt)
- Con trỏ chuột hình đầu bút bi: PNG 32×32 @1x và 64×64 @2x, hotspot ở đầu ngòi
- Âm thanh (OGG + M4A, mono 44.1 kHz, mỗi file < 12 KB): đầu bút chạm giấy ×3, sột giấy rê chuột, quẹt dạ quang, chuông hết giờ, tẩy chì, lật trang vào phòng, reo mừng thắng ngắn
- File token màu JSON (light + dark) để chia sẻ giữa web và mobile, đặt tên theo bảng trong artDirection
- Ảnh thumbnail game 512×512 cho sảnh chọn game: trang vở với một chuỗi 5 quân xanh bị vệt dạ quang quét qua
- Sprite sheet trạng thái kết nối: 'đối thủ đang mất kết nối' + đồng hồ đếm lùi ân hạn (SVG animate)
- 3 ảnh minh hoạ luật trong màn hình hướng dẫn: (1) chuỗi 5 hở đầu = thắng, (2) chuỗi 5 chặn 2 đầu = KHÔNG thắng, (3) chuỗi 6 chặn 2 đầu = thắng — bắt buộc phải có vì luật chặn 2 đầu hay gây khiếu nại

## Ước lượng công sức

**Dễ nhất trong cả 9 game của nền tảng. Nên làm game này ĐẦU TIÊN để thông đường ống (matchmaking, phòng, đồng hồ, replay, bot worker) rồi mới làm các game khác.**

Ước lượng cho 1 lập trình viên full-stack, đã có sẵn khung nền tảng (phòng, websocket, xác thực):

| Hạng mục | Công sức |
|---|---|
| Engine luật (init/apply/view/finished/results + checkWin + luật chặn 2 đầu) | **0.5 ngày** |
| Đồng hồ + tick + timeout + mất kết nối | 0.5 ngày |
| Test (bảng ca kiểm tra checkWin, bất biến, fuzz 10k ván ngẫu nhiên) | 0.5 ngày |
| Bot 3 mức (alpha-beta + eval pattern + VCF + worker) | **1.5 ngày** |
| UI bàn cờ + animation mực + responsive | 1 ngày |
| Xin hoà / đầu hàng / xin đi lại / replay | 0.5 ngày |
| **Tổng** | **≈ 4.5 ngày** (engine+bot lõi: **2 ngày**) |

Nếu bật `openingRule: 'swap2'`: **+1 ngày** (3 pha, bot phải biết chọn màu, UI riêng cho pha mở bàn). Khuyên ra mắt bản `'free'` trước.
Nếu bật `renjuForbidden`: **+2 ngày** (điểm cấm đệ quy rất dễ sai, cần bộ test riêng). Không khuyến nghị cho bản đầu.

### So sánh tương đối với 8 game còn lại
| Game | Bội số so với cờ caro |
|---|---|
| **Cờ caro** | **1×** (mốc chuẩn) |
| Cờ gánh | ~1.5× (luật gánh/vây chẹt, bàn nhỏ, bot minimax dễ) |
| Ô ăn quan | ~2× (rải quân, ăn dây chuyền, luật "dân vay quan" rắc rối) |
| Cờ vua | ~4× (nhập thành, bắt tốt qua đường, phong cấp, lặp 3 lần, 50 nước, hoà thiếu lực — mỗi thứ là một ổ bug) |
| Cờ tướng | ~4× (thêm luật chiếu tướng đối mặt, cấm chiếu bí lặp/chiếu đuổi — phần cấm chiếu đuổi là ác mộng) |
| Cờ úp | ~5× (= cờ tướng + thông tin ẩn + phải gieo `rng` server + `view` phải che thật kỹ) |
| Cá ngựa | ~3× (xúc xắc, nhiều người, luật đá quân/về chuồng nhiều biến thể vùng miền) |
| Cờ tỷ phú | ~8× (kinh tế, đấu giá, thế chấp, giao dịch giữa người chơi, thẻ cơ hội, tù, phá sản dây chuyền — nhiều luật nhất) |
| **Cờ vây** | **~10×** (chấm điểm lãnh thổ, luật ko/superko, tự sát, đếm khí, và **bot là bài toán nghiên cứu** — minimax vô dụng, phải MCTS, muốn mạnh thì cần mạng nơ-ron) |

### Nói thẳng về rủi ro
Rủi ro duy nhất của cờ caro **không nằm ở engine mà ở bot và ở việc thống nhất luật**:
1. **Luật chặn 2 đầu không phải chuẩn toàn cầu.** Người Việt mặc định có, đa số nền tảng quốc tế mặc định không. Phải **hiển thị luật đang áp dụng ngay trong phòng trước khi vào ván**, và ghi vào biên bản replay. Nếu không, sẽ có khiếu nại "tôi thắng rồi mà máy không tính" mỗi ngày.
2. **Bot Khó mà yếu quá thì người chơi chán sau 3 ngày; mạnh quá thì người mới bỏ.** Phải đo Elo bot bằng cách cho 3 mức đánh với nhau + đánh với người thật 200 ván, rồi tune `DEF`, độ sâu và tỉ lệ nhiễu. Khoản tune này dễ tốn thêm 1 ngày nữa mà không ai dự trù.
3. **X đi trước có lợi thế rất lớn ở luật `free`.** Ở xếp hạng, nếu không có swap2 hoặc ít nhất là **đổi màu luân phiên giữa các ván trong cùng cặp đấu**, bảng xếp hạng sẽ phản ánh may mắn bốc màu nhiều hơn kỹ năng.
