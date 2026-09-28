# Ô Ăn Quan — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `o-an-quan`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | False |
| Thông tin ẩn | False |
| Độ khó cài đặt | 2/5 |

# Ô ĂN QUAN — LUẬT ĐẦY ĐỦ (biến thể phổ biến miền Bắc / Wikipedia tiếng Việt)

Game 2 người, thông tin hoàn hảo, HOÀN TOÀN TẤT ĐỊNH. Không có xúc xắc, không có bài úp.
`rng` chỉ được gọi ĐÚNG MỘT LẦN trong `init()` để bốc thăm ai đi trước (và gán ghế). `apply()` và `tick()` KHÔNG BAO GIỜ gọi `rng`. Vẫn phải lưu seed để replay bit-perfect.

---
## A. BÀN CỜ VÀ ĐÁNH SỐ Ô (bắt buộc dùng đúng đánh số này)

Bàn là một VÒNG TRÒN 12 ô, đánh số 0..11, đi theo chiều tăng chỉ số là một vòng khép kín (`next = (i + dir + 12) % 12`).

```
            ô 11   ô 10   ô 9    ô 8    ô 7        <- hàng dân của GHẾ 1 (đọc phải->trái)
  ô 0  (   )                                      (   )  ô 6
  QUAN TÂY                                        QUAN ĐÔNG
            ô 1    ô 2    ô 3    ô 4    ô 5        <- hàng dân của GHẾ 0 (đọc trái->phải)
```

- Ô 0 và ô 6: **ô quan** (hình bán nguyệt), KHÔNG thuộc quyền kiểm soát của ai.
- Ô 1,2,3,4,5: 5 **ô dân** của **ghế 0**.
- Ô 7,8,9,10,11: 5 **ô dân** của **ghế 1**.
- Vòng lặp chỉ số tăng: `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 0`. Đây là vòng đi liên tục quanh bàn, đúng hình học thật (rải hết hàng dưới thì vào quan Đông, rồi sang hàng trên đi ngược lại, rồi vào quan Tây).
- `dir = +1` gọi là **chiều xuôi**, `dir = -1` gọi là **chiều ngược**. Người chơi TỰ CHỌN chiều ở MỖI nước đi, không cần cố định cả ván (đây là luật chuẩn VN: "có thể rải ngược hay xuôi chiều kim đồng hồ tùy ý").

## B. THIẾT LẬP BAN ĐẦU

- Mỗi ô dân (1..5, 7..11): **5 quân dân**. Tổng 50 dân.
- Mỗi ô quan (0 và 6): **1 quân quan**, **0 dân**.
- Quan có giá trị quy đổi = **10 dân** (mặc định; `config.quanValue`, biến thể khác dùng 5).
- Tổng giá trị toàn ván = 50 + 2×10 = **70 điểm**. Thắng khi > 35.
- Người đi trước: `rng.int(0,1)` trong `init()`.

**Cấu trúc một ô**: `{ kind: 'dan' | 'quan', dan: number, quan: 0|1 }`.
Ô dân luôn có `quan === 0`. Ô quan CÓ THỂ tích lũy `dan > 0` (quân dân được rải vào đó) — đây là cơ chế "nuôi quan", cực kỳ quan trọng, đừng bỏ.
**"Ô có chứa quân"** = `dan > 0 || quan > 0`. **"Ô rỗng"** = `dan === 0 && quan === 0`.

## C. NƯỚC ĐI HỢP LỆ

Người đến lượt chọn `(cell, dir)` với:
- `cell` phải thuộc 5 ô dân của chính mình (ghế 0: 1..5; ghế 1: 7..11). **Không được chọn ô quan. Không được chọn ô của đối phương.**
- `cells[cell].dan >= 1`.
- `dir ∈ {+1, -1}`.

Nếu còn bất kỳ ô dân nào của mình có quân thì LUÔN tồn tại nước đi hợp lệ. Trường hợp cả 5 ô trống xử lý ở mục G (tự động, không phải nước đi).

## D. THUẬT TOÁN RẢI QUÂN — VIẾT ĐÚNG TỪNG BƯỚC

```
applySow(seat, startCell, dir):
  hand = cells[startCell].dan
  cells[startCell].dan = 0            // BỐC SẠCH ô xuất phát
  cur = startCell
  guard = 0

  VÒNG_CHÍNH:
  while true:
    // (D1) Rải: mỗi ô 1 quân, BẮT ĐẦU TỪ Ô KẾ TIẾP (không rải lại vào ô vừa bốc)
    while hand > 0:
      cur = (cur + dir + 12) % 12
      cells[cur].dan += 1              // RẢI CẢ VÀO Ô QUAN, không skip ô quan
      hand--
      emit {t:'drop', cell:cur}
      if (++guard > 5000) throw ENGINE_LOOP   // chốt an toàn, xem mục K5

    // (D2) Xét ô liền sau ô vừa đặt quân cuối
    next = (cur + dir + 12) % 12

    // (D2a) Ô dân CÒN QUÂN  -> RẢI TIẾP (relay), lượt chưa kết thúc
    if cells[next].kind === 'dan' && cells[next].dan > 0:
      hand = cells[next].dan
      cells[next].dan = 0
      cur  = next
      emit {t:'relay', cell:next, count:hand}
      continue VÒNG_CHÍNH

    // (D2b) Ô QUAN mà CÒN QUÂN (còn quan HOẶC còn dân) -> MẤT LƯỢT ngay
    if cells[next].kind === 'quan' && (cells[next].dan > 0 || cells[next].quan > 0):
      emit {t:'lose_turn', reason:'quan_occupied', cell:next}
      break

    // (D2c) Tới đây ô `next` CHẮC CHẮN RỖNG (không phân biệt ô quan hay ô dân)
    target = (next + dir + 12) % 12
    if isEmpty(cells[target]):
      emit {t:'lose_turn', reason:'two_empty'}   // 2 ô trống liên tiếp
      break

    // (D2d) ĂN QUÂN + ĂN DÂY CHUYỀN
    while true:
      if cells[target].kind === 'quan':
        if !config.allowEatQuan: emit{t:'lose_turn',reason:'quan_protected'}; break
        if config.quanNonThreshold > 0 && cells[target].quan > 0
           && cells[target].dan < config.quanNonThreshold:
              emit {t:'lose_turn', reason:'quan_non'}; break     // luật "quan non"

      capturedDan[seat]  += cells[target].dan
      capturedQuan[seat] += cells[target].quan
      if cells[target].quan > 0: quanConqueror[target===0?0:1] = seat
      emit {t:'capture', cell:target, dan:cells[target].dan, quan:cells[target].quan}
      cells[target].dan = 0; cells[target].quan = 0
      pliesSinceCapture = 0

      // xét ăn tiếp: liền sau ô vừa ăn là 1 ô trống, rồi đến 1 ô có quân
      n2 = (target + dir + 12) % 12
      t2 = (n2     + dir + 12) % 12
      if isEmpty(cells[n2]) && !isEmpty(cells[t2]): target = t2; continue
      break
    break

  // Lượt LUÔN kết thúc sau khi ra khỏi VÒNG_CHÍNH. Ăn quân KHÔNG cho đi thêm lượt.
  turn = 1 - seat; ply++; pliesSinceCapture++ (nếu lượt này không ăn gì)
  normalize(state)                      // xem mục G + H
```

### Tóm tắt 4 kết cục của một lượt (học thuộc, đây là toàn bộ logic)
Sau khi đặt quân cuối cùng xuống ô `cur`, xét ô `next`:
1. `next` là **ô dân còn quân** → bốc hết ô đó rải tiếp, lặp lại.
2. `next` là **ô quan còn quân** (còn quan hoặc còn dân) → **mất lượt**. Không được ăn, không được rải tiếp. Đây là lý do "nuôi quan" an toàn.
3. `next` **rỗng** và ô sau nó **có quân** → **ăn hết** ô sau nó (kể cả ô quan → gọi là "ăn quan"), rồi xét ăn dây chuyền, rồi hết lượt.
4. `next` **rỗng** và ô sau nó cũng **rỗng** (2 ô trống trở lên) → **mất lượt**.

## E. ĂN QUAN

Ăn quan là trường hợp riêng của luật 3: ô trống rồi đến ô quan **còn quân**. Khi ăn, lấy **cả quân quan lẫn toàn bộ dân đã tích trong ô quan đó**. Ví dụ ô quan Đông đang có 1 quan + 14 dân → ăn được 14 + 10 = 24 điểm trong một nước. Đây là nước quyết định ván đấu, nên eval của bot phải đánh giá đúng nó.

Biến thể tùy chọn **"quan non"** (`config.quanNonThreshold`, mặc định 0 = tắt): nếu bật = 5 thì không được ăn ô quan có ít hơn 5 dân, rơi vào tình huống đó thì mất lượt. Luật này kéo dài ván và ép chiến thuật nuôi quan. Nên để phòng tùy chọn.

## F. MẤT LƯỢT ≠ THUA. Chỉ đơn giản là chuyển lượt cho đối phương, không phạt gì.

## G. HẾT QUÂN BÊN MÌNH — RẢI LẠI VÀ VAY QUÂN (tự động, KHÔNG phải action)

Chạy trong `normalize()` ngay ĐẦU lượt của mỗi người (tức là cuối `apply()` của đối phương, và trong `init()`):

```
if cả 5 ô dân của người sắp đi đều rỗng:
   need = 5
   take   = min(need, capturedDan[seat]);        capturedDan[seat] -= take
   borrow = min(need - take, capturedDan[other]) // VAY của đối phương
   capturedDan[other] -= borrow;  debt[seat] += borrow
   total = take + borrow
   if total === 0:
       // Cả hai bên đều không còn dân đã ăn -> không rải lại được
       emit {t:'pass', seat}; consecutivePasses++; turn = 1 - seat
       if consecutivePasses >= 2: kết thúc ván, endReason='stalemate'
       chạy lại normalize cho người kia (giới hạn 4 vòng lặp)
   else:
       // rải 1 quân/ô theo THỨ TỰ CHỈ SỐ TĂNG DẦN của ô mình (ghế0: 1,2,3,4,5 / ghế1: 7,8,9,10,11)
       // cho tới khi hết `total`. Nếu total < 5 thì các ô cuối bị bỏ trống.
       emit {t:'refill', seat, from_own:take, borrowed:borrow, cells:[...]}
   consecutivePasses = 0 (khi rải được)
```

**Nợ (`debt`) chỉ trả khi tính điểm cuối ván**, không trả trong ván. `debt[seat]` = tổng số dân seat đã vay của đối phương.
Lưu ý: chỉ vay/rải bằng **quân dân đã ăn**, KHÔNG được dùng quân quan đã ăn để rải.

## H. KẾT THÚC VÁN

`normalize()` kiểm tra theo đúng thứ tự này:

1. **"Hết quan"** — `cells[0].quan === 0 && cells[6].quan === 0` (cả hai quan đã bị ăn) → kết thúc, `endReason = 'het_quan'`. Đây là cách kết thúc chuẩn.
2. `pliesSinceCapture >= config.noCaptureLimit` (mặc định 60 nửa nước) → `endReason = 'no_capture_limit'` (chống lặp vô hạn, xem K5).
3. `ply >= config.maxPlies` (mặc định 400) → `endReason = 'ply_limit'`.
4. Hai lần pass liên tiếp ở mục G → `endReason = 'stalemate'`.
5. `resign` / hết giờ → `endReason = 'resign' | 'timeout'`.

### "Hết quan, tàn dân, thu quân, kéo về" — thu quân khi kết thúc
- Toàn bộ dân còn trong 5 ô dân của ai thì thuộc về người ấy: `capturedDan[s] += Σ cells[own].dan`, rồi set các ô về 0.
- Dân còn sót trong **ô quan**: theo `config.leftoverQuanCellDan`, mặc định `'conqueror'` — dân trong ô quan `i` thuộc về người đã **ăn con quan ở ô đó** (`quanConqueror[i]`). Đây là **luật nhà** phải chốt vì luật dân gian không nói rõ; đã cân nhắc và chọn phương án này vì trực quan ("ai chiếm ô quan thì hưởng ô đó") và tất định. Hai phương án khác cần expose trong config: `'split'` (chia đôi, lẻ 1 quân thì bỏ) và `'discard'` (bỏ hết).
- Nếu ván kết thúc bằng `stalemate/no_capture_limit/ply_limit/timeout` mà một ô quan **vẫn còn quan trên bàn**: con quan đó KHÔNG tính điểm cho ai; dân trong ô đó chia đôi, lẻ 1 quân thì bỏ.

## I. TÍNH ĐIỂM

```
score[s] = capturedDan[s] - debt[s] + debt[1-s] + capturedQuan[s] * config.quanValue
```
(Nợ triệt tiêu lẫn nhau nên tổng dân luôn bảo toàn = 50.)

- Điểm cao hơn → thắng (`place 1`), người kia `place 2`.
- Bằng điểm → **hoà**, cả hai `place 1`.
- `resign`: người xin thua luôn `place 2`, đối thủ `place 1`; `score` vẫn ghi theo công thức trên (đã thu quân) để làm thống kê/ELO.
- Hết giờ: xử như resign của người hết giờ.

## J. BIẾN THỂ ĐƯỢC HỖ TRỢ QUA CONFIG (đưa hết vào phòng tùy chỉnh)
| key | mặc định | ý nghĩa |
|---|---|---|
| `quanValue` | 10 | 1 quan = 10 dân (biến thể khác: 5) |
| `danPerCell` | 5 | số dân mỗi ô lúc đầu |
| `freeDirection` | true | false = phải chốt 1 chiều cho cả ván |
| `allowEatQuan` | true | false = không bao giờ ăn được quan (ván kết bằng limit) |
| `quanNonThreshold` | 0 | 5 = bật luật "quan non" |
| `leftoverQuanCellDan` | 'conqueror' | 'split' \| 'discard' |
| `noCaptureLimit` | 60 | nửa nước không ăn thì hoà kỹ thuật |
| `maxPlies` | 400 | trần an toàn |

## K. TÌNH HUỐNG BIÊN — ĐỌC KỸ PHẦN NÀY

**K1.** Rải **CÓ** đi qua và **CÓ** bỏ quân vào ô quan. Đừng skip ô quan (nhiều bản cài sai chỗ này, làm hỏng toàn bộ chiến thuật nuôi quan).
**K2.** Rải **CÓ** đi qua ô của đối phương và bỏ quân vào đó. Đừng chặn.
**K3.** Khi hand nhiều hơn 12 quân, vòng rải **CÓ** quay lại và bỏ quân vào chính ô xuất phát (lúc đó đã rỗng). Không có luật skip ô gốc.
**K4.** Ô quan **không bao giờ** bị bốc lên để rải tiếp (D2b chặn). Quân trong ô quan chỉ ra khỏi ô bằng cách bị ăn.
**K5.** *Vòng rải relay có dừng không?* Có. Mỗi vòng quanh bàn 12 ô sẽ nhét 2 quân vào 2 ô quan, mà ô quan không bao giờ được bốc lên trong cùng một lượt → số quân còn "lưu thông" giảm nghiêm ngặt. Tối đa ~26 vòng ≈ vài trăm bước. Vẫn phải để `guard > 5000 → throw`, vì bug rải sai một dòng sẽ treo cả process Node.
**K6.** Chuỗi ăn dây chuyền tối đa 6 nhịp (nhảy 2 ô/nhịp trên vòng 12). Điều kiện dừng là `t2` rỗng — luôn đúng vì mỗi nhịp làm rỗng thêm một ô.
**K7.** Ăn quân **không** cho đi thêm lượt. Lượt luôn kết thúc sau khi rải xong.
**K8.** Ô rỗng ở bước D2c **không phân biệt** ô quan hay ô dân — ô quan đã bị ăn sạch thì là ô trống bình thường, nhảy qua được.
**K9.** Ăn được ô quan **rỗng quan nhưng còn dân** (đã bị ăn quan trước đó, sau đó lại tích dân) — vẫn ăn bình thường bằng luật 3, chỉ ăn được phần dân.
**K10.** Refill 5 quân phải chạy **trước** khi client thấy state, tức cuối `apply()` của đối phương, không phải đầu `apply()` của mình. Nếu không client sẽ hiển thị hàng rỗng và người chơi không bấm được gì.
**K11.** Refill khi `total < 5`: rải theo thứ tự chỉ số tăng, ô cuối bỏ trống. Phải tất định, không được rải ngẫu nhiên.
**K12.** Vay quân: trừ thẳng `capturedDan[other]`, cộng `debt[seat]`. Đừng quên trừ lại khi tính điểm, nếu không tổng dân sẽ ≠ 50 và có bug tiền ảo.
**K13.** Ván có thể kết thúc **ngay giữa chuỗi ăn dây chuyền** (ăn nốt con quan thứ hai). Vẫn phải chạy hết chuỗi rồi mới `normalize()` và kết thúc.
**K14.** Người chơi có thể đang thắng điểm nhưng bị ép ăn nốt con quan cuối (kết thúc ván) trong khi đối phương còn nhiều dân trên bàn — "thu quân" có thể lật ngược kết quả. Đây là luật đúng, không phải bug; UI nên hiện "điểm dự kiến nếu thu quân ngay" để người chơi không bị bất ngờ.
**K15.** Hai người có thể hoà 35–35. Phải xử lý `place 1` cho cả hai, đừng giả định luôn có winner.
**K16.** `apply` phải reject: sai lượt, `cell` ngoài sở hữu, `cell` là ô quan, ô rỗng, `dir` không thuộc {1,-1}, ván đã `finished`, và `dir` sai chiều đã chốt khi `freeDirection=false`.
**K17.** Vì game tất định và thông tin hoàn hảo, `view()` trả về state y hệt cho cả 2 người chơi lẫn khán giả — chỉ strip field nội bộ (`rngSeedUsed` giữ lại được, không nhạy cảm). Đừng viết logic che giấu, sẽ thừa.

## Mô hình trạng thái

```ts
type Seat = 0 | 1;
type Dir = 1 | -1;
type CellKind = 'dan' | 'quan';

interface Cell {
  kind: CellKind;       // index 0 và 6 là 'quan', còn lại 'dan'
  dan: number;          // số quân dân trong ô (ô quan CŨNG tích dân được)
  quan: 0 | 1;          // chỉ ô 0 và 6 mới có thể = 1
}

interface OAQConfig {
  quanValue: number;              // mặc định 10
  danPerCell: number;             // mặc định 5
  freeDirection: boolean;         // mặc định true
  allowEatQuan: boolean;          // mặc định true
  quanNonThreshold: number;       // 0 = tắt; 5 = bật luật "quan non"
  leftoverQuanCellDan: 'conqueror' | 'split' | 'discard';  // mặc định 'conqueror'
  noCaptureLimit: number;         // mặc định 60 (nửa nước)
  maxPlies: number;               // mặc định 400
  clock: { initialMs: number; incrementMs: number; perMoveCapMs: number;
           onTimeout: 'lose' | 'automove'; disconnectGraceMs: number } | null;
}

type EndReason =
  | 'het_quan' | 'stalemate' | 'no_capture_limit' | 'ply_limit'
  | 'resign' | 'timeout' | 'agreed_draw' | 'abandon';

interface MoveRecord {
  seat: Seat; cell: number; dir: Dir;
  drops: number[];                       // thứ tự ô được đặt quân, để animate
  relays: { cell: number; count: number }[];
  captures: { cell: number; dan: number; quan: 0 | 1 }[];
  endedBy: 'capture' | 'quan_occupied' | 'two_empty' | 'quan_non' | 'quan_protected';
}

interface OAQState {
  v: 1;                                   // schema version, để migrate replay
  config: OAQConfig;
  seats: [string, string];                // seats[0], seats[1] = playerId
  cells: Cell[];                          // LUÔN dài 12, index 0..11

  turn: Seat;
  ply: number;                            // số nửa nước đã đi
  phase: 'playing' | 'finished';

  capturedDan:  [number, number];         // dân đã ăn, CÓ THỂ dùng để rải lại
  capturedQuan: [number, number];         // số con quan đã ăn (0..2)
  debt:         [number, number];         // số dân đã VAY của đối phương
  quanConqueror: [Seat | null, Seat | null];  // ai ăn quan ở ô 0 / ô 6

  pliesSinceCapture: number;
  consecutivePasses: number;
  lockedDir: Dir | null;                  // chỉ dùng khi config.freeDirection = false

  lastMove: MoveRecord | null;
  history: MoveRecord[];                  // để replay / review, có thể cắt bớt trong view

  clock: { remainingMs: [number, number]; turnStartedAtMs: number } | null;

  endReason: EndReason | null;
  finalScore: [number, number] | null;    // chỉ set khi phase='finished'
  winner: Seat | 'draw' | null;

  rngSeedUsed: string;                    // seed đã dùng ở init, để replay bit-perfect
}

// Event stream trả về từ apply(), client dùng để animate
type OAQEvent =
  | { t: 'game_start'; first: Seat; seed: string }
  | { t: 'drop';       cell: number }
  | { t: 'relay';      cell: number; count: number }
  | { t: 'capture';    seat: Seat; cell: number; dan: number; quan: 0 | 1 }
  | { t: 'lose_turn';  seat: Seat; reason: 'quan_occupied' | 'two_empty' | 'quan_non' | 'quan_protected'; cell?: number }
  | { t: 'refill';     seat: Seat; fromOwn: number; borrowed: number; cells: number[] }
  | { t: 'pass';       seat: Seat }
  | { t: 'turn';       seat: Seat }
  | { t: 'collect';    seat: Seat; dan: number }          // thu quân cuối ván
  | { t: 'game_end';   reason: EndReason; score: [number, number]; winner: Seat | 'draw' };

// Kích thước state đầy đủ < 2KB (bỏ history). Có thể snapshot mỗi nước thoải mái.
```

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `sow` | { cell: number, dir: 1 | -1 } | phase==='playing'; state.turn === seatOf(playerId); cell là số nguyên; cell thuộc 5 ô dân của ghế đó (ghế0: 1..5, ghế1: 7..11) — reject nếu là ô quan 0/6 hoặc ô của đối phương; cells[cell].dan >= 1; dir ∈ {1,-1}; nếu config.freeDirection===false và state.lockedDir!==null thì dir phải === lockedDir. Mọi vi phạm trả lỗi có mã: NOT_YOUR_TURN, GAME_FINISHED, CELL_OUT_OF_RANGE, NOT_YOUR_CELL, CELL_IS_QUAN, CELL_EMPTY, BAD_DIRECTION, DIRECTION_LOCKED. |
| `resign` | {} | phase==='playing'; playerId là một trong 2 ghế (khán giả bị reject: NOT_A_PLAYER). Không cần đúng lượt — được xin thua bất cứ lúc nào. Kết thúc ván với endReason='resign', người xin thua place 2. |
| `offer_draw` | {} | phase==='playing'; là người chơi; chưa có lời đề nghị hoà đang treo của chính mình; rate-limit tối đa 1 lần / 10 nửa nước để tránh spam (mã DRAW_OFFER_TOO_SOON). Lời đề nghị tự huỷ khi người kia đi nước tiếp theo. |
| `respond_draw` | { accept: boolean } | phase==='playing'; đang có lời đề nghị hoà treo từ ĐỐI PHƯƠNG (NO_PENDING_OFFER); người phản hồi không phải người đã đề nghị. accept=true → kết thúc ván endReason='agreed_draw', cả hai place 1, score vẫn tính bằng thu quân. |
| `claim_timeout` | { seat: 0 | 1 } | CHỈ SERVER được phát action này (kiểm tra nguồn gọi, reject nếu đến từ socket client: SERVER_ONLY_ACTION). Yêu cầu config.clock !== null; tính remainingMs[seat] - (now - turnStartedAtMs) <= 0; seat === state.turn. Nếu onTimeout==='lose' → endReason='timeout', seat đó place 2. Nếu onTimeout==='automove' → engine tự đi nước bot mức Dễ và trừ hết tăng giờ; lần timeout thứ hai của cùng một người thì xử thua. |
| `abandon` | { seat: 0 | 1 } | CHỈ SERVER. Phát sau khi seat mất kết nối quá config.clock.disconnectGraceMs (mặc định 45s) và không reconnect. endReason='abandon', seat đó place 2. |

## Kết thúc ván

## Điều kiện kết thúc (kiểm tra theo ĐÚNG thứ tự này trong normalize())

1. **`het_quan`** — `cells[0].quan === 0 && cells[6].quan === 0`. Cả hai con quan đã bị ăn. Đây là cách kết thúc chuẩn, chiếm ~95% số ván.
2. **`no_capture_limit`** — `pliesSinceCapture >= 60`. Hoà kỹ thuật chống lặp.
3. **`ply_limit`** — `ply >= 400`. Trần an toàn cho server.
4. **`stalemate`** — hai lượt liên tiếp đều phải pass vì không ai còn dân đã ăn để rải lại.
5. **`resign` / `timeout` / `abandon` / `agreed_draw`** — kết thúc ngay, bỏ qua các mục trên.

## Thu quân ("hết quan, tàn dân, thu quân, kéo về")
Chạy ở MỌI kiểu kết thúc, kể cả resign/timeout (để có số liệu thống kê nhất quán):
- `capturedDan[s] += Σ cells[i].dan` với i thuộc 5 ô dân của ghế s; rồi set các ô đó về 0.
- Dân còn trong ô quan `k` (k=0 hoặc 6):
  - nếu con quan ở ô đó ĐÃ bị ăn → toàn bộ dân về `quanConqueror[k]` (mặc định `'conqueror'`).
  - nếu con quan VẪN còn trên bàn (ván kết bằng limit/resign) → con quan không tính cho ai; dân chia đôi `floor(n/2)` mỗi bên, lẻ 1 quân thì bỏ.

## Công thức điểm cuối
```
score[s] = capturedDan[s] - debt[s] + debt[1-s] + capturedQuan[s] * config.quanValue
```
Kiểm tra bất biến sau mỗi ván: `score[0] + score[1] === 50 + capturedQuan_total * quanValue`
(bằng đúng 70 khi cả hai quan được ăn với quanValue=10). Viết assert này vào test, nó bắt được hầu hết bug tính điểm và bug vay quân.

## Xếp hạng
- `score[0] > score[1]` → ghế 0 place 1, ghế 1 place 2.
- `score[0] < score[1]` → ngược lại.
- Bằng nhau → **HOÀ**, cả hai `place: 1` (phải hỗ trợ, tỉ lệ hoà thực tế ~3-5%).
- `resign`/`timeout`/`abandon`: người vi phạm luôn `place: 2` bất kể điểm; `score` vẫn ghi giá trị thật.

```ts
results(state) => [
  { playerId: state.seats[0], place: p0, score: state.finalScore[0] },
  { playerId: state.seats[1], place: p1, score: state.finalScore[1] },
]
```

## Che thông tin ẩn

**Không có thông tin ẩn.** Ô ăn quan là game thông tin hoàn hảo, tất định — hai người chơi và khán giả đều nhìn thấy đúng một bàn cờ.

`view(state, viewerId)` chỉ cần làm 3 việc, không cần che gì:
1. Trả về `cells`, `turn`, `capturedDan`, `capturedQuan`, `debt`, `quanConqueror`, `clock`, `lastMove` nguyên vẹn cho MỌI viewer (kể cả spectator và replay công khai).
2. Strip các field runtime nội bộ không thuộc luật: bộ nhớ đệm của bot, transposition table, đối tượng `rng` (giữ lại `rngSeedUsed` dạng string — không nhạy cảm vì rng chỉ dùng cho việc bốc thăm đi trước đã xảy ra rồi).
3. Cắt `history` xuống N nước gần nhất (ví dụ 20) cho payload realtime; bản đầy đủ chỉ gửi khi client mở tab "Xem lại".

Cảnh báo ngược lại: vì không có gì để giấu, **đừng** cài client-side prediction cho phần rải quân rồi tin kết quả client gửi lên. Client hoàn toàn đủ dữ liệu để tự tính nước đi trước — điều đó bình thường (như cờ vua) — nhưng server vẫn phải chạy lại `apply()` và coi mọi state do client gửi lên là rác. Client chỉ được gửi `{cell, dir}`.

## Tính giờ

Game thuần theo lượt (`realtime: false`). `tick()` KHÔNG chứa logic luật; nó chỉ là chỗ cho server đối chiếu đồng hồ, và có thể để rỗng nếu hệ thống matchmaking đã có clock service riêng.

## Thể thức đồng hồ đề xuất
Một nước ô ăn quan cần suy nghĩ để đếm ô, nhưng animation rải quân mất 1–3 giây (có nước rải relay dài 30+ quân). **Đồng hồ phải dừng trong lúc animate** — nếu không người chơi bị ăn cắp giờ ở chính nước mình vừa đi. Cụ thể: `turnStartedAtMs` của người tiếp theo chỉ được set SAU khi server ước lượng animation kết thúc (`drops.length * 90ms + 400ms`, cap 4000ms), và gửi kèm `animMs` cho client.

| Chế độ | Ngân giờ | Cộng thêm | Ghi chú |
|---|---|---|---|
| Nhanh (mặc định) | 3:00 | +5s/nước | ván trung bình 40–70 nửa nước, vừa đủ |
| Thường | 6:00 | +8s/nước | phòng đấu xếp hạng |
| Chớp | 1:30 | +3s/nước | giải đấu |
| Thong thả | 10:00 | +15s/nước | phòng tự tạo, chơi với người lạ |

Thêm `perMoveCapMs = 45000`: dù còn nhiều ngân giờ cũng không được nghĩ quá 45s một nước, tránh treo phòng.

## Hết giờ
- `onTimeout: 'lose'` (mặc định cho phòng xếp hạng): hết ngân giờ → thua ngay, `endReason='timeout'`, người hết giờ `place 2`. Vẫn chạy thu quân để ghi `score` thật.
- `onTimeout: 'automove'` (mặc định cho phòng thường/đấu bot): lần đầu hết giờ, engine tự đi bằng bot mức **Dễ**, nạp lại 20s vào ngân giờ, và đánh dấu `timeoutStrikes[seat]++`. Strike thứ 2 thì xử thua. Cách này giữ ván vui cho người chơi casual bị rớt mạng chốc lát.
- Mất kết nối: ân hạn `disconnectGraceMs = 45000`, đồng hồ VẪN chạy trong thời gian ân hạn (chống lợi dụng disconnect để nghĩ thêm). Hết ân hạn mà chưa reconnect → `abandon`.
- Cả ván có trần cứng `maxPlies = 400`; kèm `noCaptureLimit = 60` nửa nước không ăn → hoà kỹ thuật. Hai chốt này quan trọng hơn ở đây so với các game khác vì ô ăn quan có thể lâm vào trạng thái hai bên đẩy qua đẩy lại 1–2 quân giữa hàng mà không bao giờ chạm tới ô quan.

## Đấu bot
Bot phải có độ trễ giả lập `600–1400ms` (random theo rng của phòng, không phải `Math.random`) để không "bắn" nước đi tức thì làm người chơi khó chịu; mức Khó có thể để trễ thật bằng thời gian nghĩ. Đồng hồ của bot không cần trừ thật, nhưng vẫn hiển thị để UI đối xứng.

## Bot

## Minimax HOÀN TOÀN khả thi — đây là game dễ nhất để làm bot mạnh trong cả 9 game của nền tảng

Lý do: trạng thái chỉ 12 số nguyên + 6 biến đếm, phân nhánh ≤ 10 (5 ô × 2 chiều), thực tế trung bình **6–7** vì các ô rỗng bị loại. `apply()` một nước tốn trung bình ~30–60 phép tăng/giảm (rải + relay), tức **~1–3 µs** trong TS với `Int32Array`. Không cần WASM, không cần worker pool.

### Ngân sách thực đo (Node 20, 1 vCPU tầm trung)
- ~300k–800k node/giây nếu `apply` dùng `Int32Array(12)` và make/unmake bằng snapshot 12 số (rẻ hơn undo-log vì state bé).
- Alpha-beta + move ordering: hệ số phân nhánh hiệu dụng ~2.6 → **độ sâu 12–14 trong 400ms**. Độ sâu 16 khi bàn đã thưa quân.
- Kết luận: đặt ngân sách **350ms**, thừa an toàn dưới mốc 1 giây kể cả khi server bận gấp 2 lần.

### Kiến trúc
1. **Iterative deepening** từ depth 2, dừng khi hết `budgetMs` (`Date.now()` check mỗi 2048 node, đừng check mỗi node).
2. **Negamax + alpha-beta**, fail-soft.
3. **Transposition table** — Zobrist hash trên: 12 ô (số dân, clamp 0..63) + 2 bit quan còn/mất + bên đi + `capturedDan[0]` và `capturedDan[1]` (clamp 0..63). **BẮT BUỘC phải đưa `capturedDan` vào khoá hash** — nó quyết định được luật rải lại 5 quân ở mục G; bỏ qua sẽ cho eval sai và bot đi ngu ở tàn cuộc. Bảng 2^20 entry, thay thế theo depth-preferred.
4. **Move ordering**: (a) nước ăn được quan, (b) nước ăn nhiều dân nhất (tính bằng cách chạy thử `apply` — rẻ), (c) killer move, (d) history heuristic.
5. **Extension**: +1 ply cho nước ăn quan (nước quyết định ván). Không cần quiescence riêng, thay bằng: nếu ở nút lá mà đối phương có nước ăn ≥ 8 điểm thì tìm sâu thêm 2 ply.
6. **Endgame chính xác**: khi tổng dân còn trên bàn ≤ 14 và cả hai quan đã bị ăn, giải vét cạn (chắc chắn xong < 20ms).

### Hàm lượng giá (đơn vị = điểm dân, để so sánh trực tiếp với điểm thật)
```
eval(s, me) =
    1.00 * (score(me) - score(opp))                       // điểm đã ăn, quan = 10
  + 0.55 * (danTrongÔCủaMình - danTrongÔĐốiPhương)        // dân trên bàn là tài nguyên, không phải điểm
  + THREAT
  - 0.45 * bestImmediateCaptureFor(opp)                   // mình đang hớ bao nhiêu
  + 0.30 * bestImmediateCaptureFor(me)
  + 0.10 * (soÔCủaMìnhCóQuân - soÔĐốiPhươngCóQuân)        // cơ động, tránh bị ép rải lại
  + QUAN_RACE

THREAT / QUAN_RACE: với mỗi ô quan k còn quan:
   v = 10 + cells[k].dan                    // giá trị nếu ăn được
   d = khoảngCáchNướcĐiTớiCóThểĂn(k, me)    // 0 nếu ăn được ngay, 1 nếu dọn 1 nước là ăn, else 2
   nếu me ăn được ngay:  + 0.75 * v
   nếu opp ăn được ngay: - 0.85 * v         // bất đối xứng: mình đi sau nên phải sợ hơn
   ngoài ra:             + 0.06 * v * (dMe < dOpp ? 1 : -1)
```
Hai chi tiết quyết định sức mạnh bot, đừng bỏ:
- **Hệ số 0.55 cho dân trên bàn**, không phải 1.0. Dân trên bàn chưa phải điểm và dễ bị đối phương ăn lại.
- **`+ cells[k].dan` trong giá trị ô quan** — nó dạy bot chiến thuật "nuôi quan": không ăn quan non 10 điểm, mà thả thêm dân vào ô quan rồi ăn một mẻ 25 điểm. Bot không có term này sẽ luôn ăn quan sớm và thua bot có term này ~65/35.

### Ba mức khó
| | Ngân sách | Độ sâu | Eval | Nhiễu |
|---|---|---|---|---|
| **Dễ** | 40ms | 2 ply cứng | chỉ term 1 (điểm đã ăn) + term dân hệ số 0.3 | 35% chọn ngẫu nhiên đều trong các nước hợp lệ; trong 65% còn lại, nếu có nước ăn quan thì 50% bỏ qua nó |
| **Vừa** | 120ms | ~8–9 ply | eval đầy đủ nhưng bỏ QUAN_RACE và bỏ hệ số bất đối xứng (0.85 → 0.75) | chọn ngẫu nhiên trong top-3 nước với trọng số 60/25/15 |
| **Khó** | 350ms | 12–14 ply, endgame vét cạn | eval đầy đủ + TT + killer/history + extension | không nhiễu; chỉ random khi nhiều nước bằng điểm tuyệt đối |

**Nhiễu phải lấy từ một PRNG riêng của bot có seed từ `rng` của phòng** (ví dụ `rng.fork('bot:'+seat)`), KHÔNG dùng `Math.random`, để replay tái hiện được y hệt.

Mức Dễ phải thật sự dễ: người mới chơi cần thắng được ~60% ván, nếu không họ bỏ game. Cách hạ cấp bằng "giảm độ sâu" một mình là KHÔNG đủ — depth 2 trong ô ăn quan vẫn đánh khá tốt vì nước ăn lớn thường nhìn thấy trong 2 ply. Bắt buộc phải có nhiễu 35% và luật "bỏ qua nước ăn quan".

### Chỗ bot dễ hỏng

**1. Bot và server dùng hai bản `apply` khác nhau.** Lỗi phổ biến nhất và tốn thời gian debug nhất. Bot PHẢI gọi đúng hàm `applySow` của engine (bản `Int32Array` tối ưu chỉ được là wrapper có test so khớp 100k nước ngẫu nhiên với bản chuẩn). Nếu bot mô phỏng luật riêng, nó sẽ đề xuất nước mà server reject → phòng treo.

**2. Treo process vì vòng rải relay không có chốt.** Một dòng sai `dir` trong vòng rải làm nó chạy vô hạn. Trong search, bot gọi `apply` hàng trăm nghìn lần → chỉ cần 1 nút bị loop là toàn bộ Node event loop đứng, cả server chết chứ không riêng phòng đó. Bắt buộc `guard > 5000 → throw`, và bọc lời gọi bot trong try/catch để rơi về nước ngẫu nhiên hợp lệ thay vì crash.

**3. Quên `capturedDan` trong khoá Zobrist.** Hai thế cờ giống hệt nhau trên bàn nhưng khác kho dân đã ăn sẽ cho nước rải-lại khác nhau ở tàn cuộc. Bot sẽ đọc nhầm entry trong TT và đi nước vô nghĩa ở đúng lúc quyết định.

**4. Bot tham ăn quan sớm.** Không có term `+ cells[k].dan` trong giá trị ô quan, bot ăn con quan 10 điểm trần trụi ngay nước 6, kết thúc ván khi mình đang dẫn 12–3 nhưng đối phương còn 28 dân trên bàn → thu quân xong thua ngược. Rất phản cảm với người chơi vì trông như bot tự sát. Phải test riêng kịch bản này.

**5. Bot không nhìn thấy "thu quân" ở nút lá.** Khi ván sắp kết thúc (một quan đã mất), eval phải cộng ước lượng thu quân, nếu không bot đánh giá sai hoàn toàn 10 nước cuối. Cách rẻ: khi `capturedQuan_total === 1`, tăng hệ số dân trên bàn từ 0.55 lên 0.9; khi state đã `finished`, trả thẳng `±(1e6 + chênh lệch điểm thật)` để bot ưu tiên thắng nhanh.

**6. Mức Dễ vẫn quá mạnh.** Depth 2 + eval điểm ăn đã đủ đánh bại đa số người chơi lần đầu. Phải đo thực tế tỉ lệ thắng của người mới, mục tiêu 55–65% cho họ. Chỉ giảm depth là không đủ.

**7. Lãng phí thời gian vào bàn cờ đối xứng ở nước đầu.** Thế mở đầu đối xứng hoàn toàn → 10 nước đi có giá trị chỉ còn 3 lớp tương đương. Nên hard-code opening book 2–3 nước đầu (bảng 20 dòng) thay vì search, tiết kiệm và tránh bot chọn nước lạ mỗi ván.

**8. Không cắt search khi bot là bên sắp thua chắc.** Alpha-beta với eval trả `-1e6` ở mọi nhánh sẽ chọn nước đầu tiên trong danh sách → trông như bot bỏ cuộc một cách kỳ quặc. Thêm `-depth` vào điểm thua để bot "kéo dài" và `+depth` trừ vào điểm thắng để bot kết thúc nhanh.

**9. Nhiễu bằng `Math.random`.** Làm replay không tái hiện được và phá luôn chức năng "xem lại ván đấu" của nền tảng. Dùng PRNG fork từ `rng` của phòng.

**10. Timer check quá dày.** `Date.now()` mỗi node ăn 15–25% thời gian search. Check mỗi 2048 node.

**11. Bot đi ngay lập tức.** Không có `600–1400ms` delay giả lập thì người chơi thấy như đang bấm vào máy, mất hết cảm giác đối thủ. Đây là lỗi UX chứ không phải lỗi thuật toán nhưng ảnh hưởng retention rõ rệt.

## Cạm bẫy khi cài đặt

- SKIP Ô QUAN KHI RẢI — lỗi chí mạng số 1. Rải PHẢI bỏ quân vào ô quan như mọi ô khác. Bỏ qua ô quan là phá vỡ toàn bộ chiến thuật 'nuôi quan', biến game thành một thứ khác hẳn và người chơi Việt sẽ nhận ra ngay.
- Nhầm giữa 'ô quan còn quân thì mất lượt' và 'không bao giờ ăn được quan'. Hai luật khác nhau: ô quan là ô KẾ TIẾP sau quân cuối → mất lượt; ô quan là ô THỨ HAI (sau một ô trống) → ĂN ĐƯỢC, và đó chính là cách duy nhất kết thúc ván.
- Ô quan đã bị ăn sạch phải được coi là Ô TRỐNG BÌNH THƯỜNG — nhảy qua được để ăn ô sau nó. Nhiều bản cài hard-code 'ô 0 và 6 luôn chặn' là sai.
- Ô quan đã mất con quan vẫn tích dân tiếp và vẫn ĂN ĐƯỢC phần dân đó. Đừng đóng băng ô quan sau khi quan bị ăn.
- Quên chốt an toàn cho vòng rải relay. Một dấu sai trong `dir` làm vòng lặp chạy vô hạn và TREO CẢ PROCESS NODE — không riêng phòng đó. Bắt buộc guard > 5000 → throw + try/catch ở tầng gọi.
- Chạy refill (rải lại 5 quân) ở ĐẦU apply của người sắp đi thay vì CUỐI apply của đối phương. Hậu quả: client hiển thị hàng rỗng, người chơi tưởng bị treo, bấm gì cũng bị reject.
- Quên trừ nợ khi tính điểm cuối. Công thức phải là capturedDan[s] - debt[s] + debt[1-s] + quan*10. Thiếu vế nợ → tổng dân khác 50 → điểm ảo, leaderboard sai.
- Dùng quân QUAN đã ăn để rải lại khi hết quân. Chỉ được dùng quân DÂN. Quan đã ăn là chiến lợi phẩm, không quay lại bàn.
- Không định nghĩa dân còn sót trong ô quan thuộc về ai khi thu quân. Luật dân gian im lặng ở đây. Phải chốt luật nhà (đề xuất: về tay người đã ăn con quan ở ô đó) và ghi rõ trong màn hình luật, nếu không sẽ có report 'ăn gian điểm'.
- Giả định luôn có người thắng. Hoà 35–35 xảy ra thật (~3–5% ván). results() phải trả place 1 cho cả hai.
- Chuỗi ăn dây chuyền bị cắt giữa chừng khi ván kết thúc (ăn nốt con quan thứ hai ở nhịp 1, còn nhịp 2 ăn tiếp). Phải chạy HẾT chuỗi rồi mới normalize và kết thúc — bỏ sót sẽ thiếu điểm của người thắng.
- Không có chốt chống lặp. Hai bên có thể đẩy qua đẩy lại 1–2 quân giữa hàng vĩnh viễn mà không chạm ô quan. Cần noCaptureLimit = 60 nửa nước và maxPlies = 400.
- Đồng hồ vẫn chạy trong lúc animate nước rải dài. Nước rải 40 quân mất ~4 giây — ăn cắp giờ của chính người vừa đi. Đồng hồ của người tiếp theo chỉ bắt đầu sau khi animation ước lượng kết thúc.
- Tin state do client gửi lên. Ô ăn quan không có thông tin ẩn nên client tính được mọi thứ — đừng vì thế mà để client gửi state. Client chỉ được gửi {cell, dir}; server chạy lại apply.
- Đánh số ô không khép kín thành vòng đúng hình học. Phải là 0→1→2→3→4→5→6→7→8→9→10→11→0 với hàng trên đọc NGƯỢC (7 ở gần quan Đông, 11 ở gần quan Tây). Đánh số hàng trên cùng chiều với hàng dưới là sai và làm mọi ván lệch.
- Quên rằng khi hand > 12, vòng rải quay lại và bỏ quân vào chính ô xuất phát. Không có luật skip ô gốc như một số biến thể mancala khác.
- hasDice = false nhưng init() VẪN gọi rng để bốc thăm đi trước. Seed bắt buộc phải được lưu vào bản ghi ván đấu, nếu không replay sẽ đổi người đi trước và lệch toàn bộ.

## Mỹ thuật riêng của game này

## "SÂN GẠCH TRƯA HÈ" — phấn trắng trên sân gạch nung, sỏi cuội thật

**Ý tưởng cốt lõi:** không làm bàn cờ gỗ sang trọng. Ô ăn quan là trò trẻ con vẽ bằng phấn trên sân gạch sau đình làng, chơi bằng sỏi nhặt ở bờ ao vào trưa hè. Giữ nguyên cái đó: **vật liệu thô, ánh sáng gắt, bóng đổ dài, nét vẽ run tay.** Đây là game duy nhất trong nền tảng có mỹ thuật "ngoài trời, ban ngày, tuổi thơ" — mọi game còn lại đều là mặt bàn trong nhà.

### Bảng màu
| Vai trò | Hex | Ghi chú |
|---|---|---|
| Nền sân gạch | `#B0472C` | gạch nung Bát Tràng, có noise hạt và mạch vữa `#8C3A24` |
| Gạch vùng sáng (nắng) | `#C9603C` | vệt nắng chéo 18° cắt ngang bàn |
| Nét phấn | `#F6F1E4` | opacity 0.88, viền nhoè, độ dày không đều |
| Bụi phấn (particle) | `#FFFDF6` | |
| Sỏi dân | `#9AA6A8` → `#7E8C8F` | gradient nhẹ, highlight lệch trên-trái |
| Sỏi dân (bên đối thủ) | `#C4B49A` → `#A6947A` | sỏi nâu bờ ao, phân biệt bằng CHẤT LIỆU chứ không bằng màu bão hoà |
| Quan | `#3E4A3A` đá xanh rêu, viền `#6F8259` | to gấp 2.4 lần sỏi dân, có vệt rêu |
| Nhấn / lượt đi | `#E8B33C` vàng nắng | vòng phấn vàng nhấp nháy chậm quanh ô chọn được |
| Ăn quân | `#D9452F` | chớp đỏ gạch rất ngắn (120ms) |
| Chữ UI | `#F6F1E4` trên panel `#5C2A1C` opacity 0.82 | |
| Chế độ tối | nền `#3A1A12`, nắng tắt, phấn `#EDE6D6`, thêm ánh đèn vàng ấm `#E8B33C` 12% | "chơi lúc chạng vạng" |

### Chất liệu
- **Sân gạch**: một texture tile 512×512 (gạch + rêu + vết nứt), lặp; phủ một lớp grain tĩnh 4% và một lớp vệt nắng gradient chéo.
- **Nét vẽ bàn cờ**: KHÔNG dùng `stroke` SVG đều tăm tắp. Dùng path có jitter (mỗi đoạn lệch ±1.5px, độ dày dao động 3–6px), texture phấn alpha-mask hạt thô. Hai ô quan là bán nguyệt vẽ tay, hơi lệch nhau một chút.
- **Sỏi**: sprite PNG thật (ảnh sỏi chụp trên nền trắng, cắt nền), 6 biến thể hình dạng, xoay ngẫu nhiên theo seed của ô để bàn không trông lặp. Bóng đổ mềm offset xuống-phải 3px, blur 4px, alpha 0.28 — ánh nắng chính diện trên cao.
- **Sắp xếp sỏi trong ô**: KHÔNG xếp lưới. Dùng poisson-disk seeded để rải tự nhiên. Khi > 12 quân thì xếp chồng 2 lớp và hiện số đếm bằng phấn. Ô quan đầy sỏi phải trông "phình ra", căng — đó là tín hiệu thị giác của chiến thuật nuôi quan.

### Chữ
- Số đếm quân trong ô: một face viết tay phấn (kiểu `Caveat` / `Patrick Hand`), màu phấn trắng, hơi nghiêng.
- UI (điểm, tên, nút): `Be Vietnam Pro` — bắt buộc vì phải hiển thị đủ dấu tiếng Việt, và nó "sạch" để cân lại phần bàn cờ rất thô.
- Không dùng font serif cổ điển. Đó là địa hạt của cờ tướng/cờ vua.

### Chuyển động
- Sỏi bay theo **cung parabol thấp** từ ô này sang ô kế, 90ms/quân, xoay nhẹ trong không trung, nảy 1 nhịp nhỏ khi tiếp đất (`cubic-bezier(.34,1.56,.64,1)`).
- Chuỗi relay: tăng tốc dần — 5 quân đầu 90ms, sau đó rút xuống 45ms, có nút "tua nhanh" và tuỳ chọn "bỏ animation".
- **Ăn quân**: sỏi bị hút về khay điểm của người ăn theo đường cong, kèm một **puff bụi phấn** ở ô vừa bị ăn và tiếng sỏi va lạch cạch.
- **Ăn quan**: khoảnh khắc lớn nhất của game. Camera zoom nhẹ 4%, nắng loé, con quan xanh rêu bay chậm hơn toàn bộ đám sỏi dân đi cùng, hiện số điểm cộng bằng chữ phấn to. Phải hoành tráng vì nó thường quyết định ván.
- **Mất lượt**: nét phấn quanh ô đó tối đi và rung nhẹ 2 lần, không có âm thanh tiêu cực.

### Âm
Tiếng sỏi va nhau thật (3–4 mẫu, pitch random ±8%), tiếng phấn quẹt khi vẽ bàn lúc vào phòng, nền là tiếng ve và gió lá xa xa ở âm lượng rất thấp (có nút tắt). Không nhạc nền.

### Tránh trùng với game khác trong nền tảng
Cờ vua = đá cẩm thạch/gỗ óc chó trong nhà. Cờ tướng = sơn mài đỏ-đen, chữ triện. Cờ vây = gỗ kaya vàng + vỏ sò/đá đen, tối giản Nhật. Cờ caro = giấy kẻ ô vở học sinh, mực xanh. Cá ngựa = nhựa màu tươi, đồ chơi. Cờ tỷ phú = art-deco, bàn 3D nghiêng. Cờ gánh = tre nứa + chàm. Cờ úp = tối, bí ẩn.
**Ô ăn quan giữ riêng: gạch nung đỏ + phấn trắng + sỏi thật + nắng trưa.** Không game nào khác được dùng nền đỏ gạch.

### Asset tối thiểu

- brick_floor_tile.webp — texture sân gạch nung 512×512 tileable (gạch + mạch vữa + rêu + vết nứt), kèm bản @2x
- sunlight_overlay.webp — lớp vệt nắng chéo 18° dạng gradient alpha, phủ toàn bàn, dùng blend mode screen
- chalk_stroke_mask.webp — alpha-mask hạt phấn 256×256 tileable, dùng để mask mọi nét vẽ bàn cờ
- board_lines.svg — 12 ô vẽ tay có jitter: 10 ô vuông + 2 bán nguyệt, mỗi đường là path riêng để animate 'vẽ phấn' lúc vào phòng
- pebble_dan_grey_01..06.webp — 6 biến thể sỏi dân xám (bên ghế 0), ~48×48, nền trong, đã có highlight
- pebble_dan_brown_01..06.webp — 6 biến thể sỏi dân nâu bờ ao (bên ghế 1)
- pebble_quan_mossy.webp — con quan đá xanh rêu, ~112×112, có vệt rêu và highlight mạnh hơn
- pebble_shadow.webp — bóng đổ mềm dùng chung, scale theo kích thước sỏi
- chalk_dust_puff.json + atlas — sprite sheet hạt bụi phấn 12 frame, phát khi ăn quân
- sun_flare_quan.webp — loé nắng dùng cho khoảnh khắc ăn quan
- score_tray.svg — khay điểm hai bên, vẽ bằng nét phấn, có ô riêng cho dân và cho quan
- font Caveat (hoặc Patrick Hand) subset Latin+Vietnamese — chữ số đếm quân kiểu phấn
- font Be Vietnam Pro 400/600/700 subset Vietnamese — toàn bộ UI
- sfx_pebble_drop_01..04.ogg — tiếng sỏi rơi, pitch-random ±8%
- sfx_pebble_scoop.ogg — tiếng bốc cả nắm sỏi (bắt đầu rải / relay)
- sfx_capture.ogg — tiếng hút sỏi về khay + xoạt bụi phấn
- sfx_capture_quan.ogg — phiên bản dài và trầm hơn cho nước ăn quan
- sfx_chalk_draw.ogg — tiếng quẹt phấn khi bàn cờ được vẽ ra lúc vào phòng
- amb_summer_noon.ogg — nền ve kêu + gió lá, loop 40s, mặc định âm lượng 12%, có nút tắt
- icon_direction_cw.svg / icon_direction_ccw.svg — hai nút chọn chiều rải, vẽ kiểu mũi tên phấn
- tutorial_frames_01..08.webp — 8 khung minh hoạ luật (rải, rải tiếp, ăn quân, ăn dây chuyền, mất lượt vì ô quan, mất lượt vì 2 ô trống, ăn quan, thu quân cuối ván)
- og_cover_oanquan.webp — ảnh bìa 1200×630 cho lobby và chia sẻ link phòng

## Ước lượng công sức

**Đây là game RẺ NHẤT trong 9 game của nền tảng. Nên làm nó ĐẦU TIÊN để chạy thử khung engine/matchmaking/replay.**

Ước lượng (1 dev có kinh nghiệm, đơn vị ngày-người):
- Engine + luật đầy đủ (kể cả vay quân, thu quân, các chốt an toàn): **0.75 ngày**, khoảng 350–450 dòng TS.
- Test (unit theo từng tình huống biên K1–K17 + 100k ván random tự chơi để kiểm bất biến tổng điểm = 70): **0.5 ngày**.
- Bot 3 mức (alpha-beta + TT + eval): **0.75 ngày**, khoảng 250 dòng.
- UI + animation rải quân (phần tốn công nhất, ~55% tổng effort của game này): **1.25 ngày**.
- **Tổng ≈ 3.25 ngày.**

So sánh tương đối với các game còn lại trong nền tảng (hệ số so với ô ăn quan = 1.0):
| Game | Hệ số | Ghi chú |
|---|---|---|
| Cờ caro | 0.9 | luật đơn giản hơn nhưng bot threat-space search tốn hơn |
| **Ô ăn quan** | **1.0** | mốc chuẩn |
| Cờ gánh | 1.3 | luật gánh/vây và xử lý thế bí |
| Cá ngựa | 2.0 | rng server, 4 người, nhiều animation |
| Cờ úp | 3.5 | = cờ tướng + thông tin ẩn + rng bốc quân |
| Cờ tướng | 3.5 | sinh nước đi, chiếu bí, luật chiếu tướng lặp |
| Cờ vua | 4.0 | nhập thành, bắt tốt qua đường, phong hậu, 3 lần lặp, 50 nước, FIDE tie-break |
| Cờ vây | 6.0 | ko/superko, chấm điểm lãnh thổ, bot phải là MCTS, không dùng minimax được |
| Cờ tỷ phú | 8.0 | ~40 ô luật riêng, thương lượng, thế chấp, đấu giá, nhà/khách sạn, phá sản 3 kiểu, 4–6 người, bot không thể minimax |

Cụ thể: **cờ tỷ phú tốn gấp ~8 lần và cờ vây gấp ~6 lần ô ăn quan**. Đừng lên kế hoạch cho 9 game như 9 đơn vị công việc bằng nhau — riêng hai game đó đã bằng 14 game ô ăn quan cộng lại.

Rủi ro duy nhất đáng kể của ô ăn quan là **animation rải quân**: chuỗi relay có thể dài 40+ lần thả quân, cần một hệ thống phát lại event stream có thể tua nhanh/bỏ qua, và phải đồng bộ với đồng hồ (xem mục timeControl). Nếu làm ẩu chỗ này, người chơi sẽ ngồi xem 8 giây mỗi nước và bỏ game.
