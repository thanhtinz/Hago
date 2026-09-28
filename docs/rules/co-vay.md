# Cờ Vây — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-vay`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | False |
| Thông tin ẩn | False |
| Độ khó cài đặt | 5/5 |

# CỜ VÂY (Go / Weiqi / Baduk) — đặc tả luật đủ để viết engine

## 0. LƯU Ý ĐỊNH HƯỚNG TRƯỚC KHI ĐỌC

Luật ĐI QUÂN của cờ vây đơn giản nhất trong 9 game của nền tảng (~200 dòng code). Toàn bộ độ khó nằm ở **pha đếm điểm** và **bot**. Đừng đánh giá thấp.

Có hai bộ luật lớn, khác nhau ở cách tính điểm:
- **Luật Nhật Bản (JP, đếm đất / territory scoring)** — phổ biến nhất ở Việt Nam, hầu hết giải đấu trong nước dùng luật này. Điểm = đất vây được + tù binh.
- **Luật Trung Quốc (CN, đếm diện tích / area scoring)** — điểm = số quân còn trên bàn + đất vây được, KHÔNG tính tù binh.

**KHUYẾN NGHỊ KỸ THUẬT (đọc kỹ):** Cài **CN/area scoring làm lõi tính điểm nội bộ** vì nó xác định hoàn toàn bằng thuật toán, không cần thương lượng. Cài JP như một chế độ hiển thị/tính điểm bổ sung. Bản v1 nên ship CN trước. Xem mục 13.

Cả hai luật đều: cấm tự sát, Đen đi trước, hai pass liên tiếp thì hết ván.

---

## 1. BÀN CỜ, TỌA ĐỘ, QUÂN

- Bàn là lưới **giao điểm**, kích thước `size × size`, `size ∈ {9, 13, 19}`. Quân đặt **trên giao điểm**, không đặt trong ô. (Đây là khác biệt thị giác quan trọng với cờ caro.)
- Nội bộ engine dùng mảng phẳng: `idx = y * size + x`, với `x, y ∈ [0, size-1]`, gốc `(0,0)` ở **góc trên-trái**.
- Hiển thị/ghi kỳ phổ (GTP): cột `A B C D E F G H J K L M N O P Q R S T` (**bỏ chữ I**), hàng đánh số từ **1 ở dưới cùng** lên. Tức `A1` = góc dưới-trái = `idx` của `(x=0, y=size-1)`.
- Xuất SGF: SGF dùng chữ cái `a..s` cho cả hai trục, gốc **trên-trái**, nên `SGF[x] = 'a'+x`, `SGF[y] = 'a'+y` — trùng khớp trực tiếp với `idx` nội bộ. Phải viết 2 hàm chuyển đổi riêng và test chúng, đây là chỗ sai kinh điển.
- Mỗi giao điểm có 1 trong 3 trạng thái: `0` trống, `1` Đen, `2` Trắng.
- Kề nhau = **4 hướng** (trên, dưới, trái, phải). **Không tính đường chéo.** Đường chéo chỉ dùng trong một chỗ duy nhất: kiểm tra "mắt đơn giản" của bot (mục 12.4).

## 2. LƯỢT ĐI

- **Đen đi trước.** Ngoại lệ: ván chấp — Đen đặt hết quân chấp rồi **Trắng đi nước đầu tiên**.
- Mỗi lượt, người đi chọn đúng một trong:
  1. **Đặt quân** (`place`) lên một giao điểm **đang trống**, hợp lệ theo mục 3–5.
  2. **Bỏ lượt** (`pass`) — luôn hợp lệ.
  3. **Xin thua** (`resign`) — luôn hợp lệ, kết thúc ván ngay.
- Quân đã đặt **không bao giờ di chuyển**. Chỉ biến mất khi bị ăn.

## 3. CHUỖI VÀ KHÍ

- **Chuỗi** (nhóm, chain): tập tối đại các quân **cùng màu** liên thông theo 4 hướng.
- **Khí** (liberty) của một chuỗi: số giao điểm **trống** kề 4 hướng với **bất kỳ** quân nào của chuỗi, **đếm không trùng lặp**. Ví dụ một quân lẻ ở giữa bàn có 4 khí, ở biên 3 khí, ở góc 2 khí.
- Chuỗi có **0 khí** thì bị nhấc khỏi bàn.

## 4. GIẢI QUYẾT MỘT NƯỚC ĐẶT QUÂN — THỨ TỰ BẮT BUỘC

Đây là phần dễ cài sai nhất. Thứ tự **phải đúng như sau**:

```
apply place(p) bởi màu C:
  a. Nếu p nằm ngoài bàn      -> lỗi ILLEGAL_OFF_BOARD
  b. Nếu board[p] != 0        -> lỗi ILLEGAL_OCCUPIED
  c. Nếu p == koPoint         -> lỗi ILLEGAL_KO
  d. board[p] = C                                   // đặt tạm
  e. captured = []
     với mỗi ô q kề 4 hướng của p có board[q] == đối(C):
        nếu chuỗi chứa q có 0 khí -> gom toàn bộ chuỗi đó vào captured
     nhấc mọi quân trong captured khỏi bàn (board = 0)
     captures[C] += captured.length
  f. nếu chuỗi chứa p có 0 khí  -> TỰ SÁT -> rollback toàn bộ (d,e) -> lỗi ILLEGAL_SUICIDE
  g. tính hash thế cờ mới; nếu vi phạm superko (mục 5.2) -> rollback -> lỗi ILLEGAL_SUPERKO
  h. cập nhật koPoint (mục 5.1), passStreak = 0, moveNumber++, đổi lượt
```

**Hệ quả quan trọng của thứ tự e-trước-f:** nước đặt vào một điểm mà bản thân nó không có khí **vẫn hợp lệ nếu nó ăn được quân địch**, vì ăn quân xảy ra trước khi xét tự sát. Ví dụ điển hình: điền vào mắt cuối cùng của nhóm địch đang bị vây.

**Tự sát bị cấm** ở cả luật Nhật lẫn luật Trung, bao gồm cả tự sát nhiều quân (nhóm ≥2 quân của mình mất khí cuối). Luật New Zealand và luật Ing cho phép tự sát — **ta không dùng**, đặt `allowSelfCapture = false` cứng.

## 5. LUẬT KIẾP (KO) VÀ CHỐNG LẶP

### 5.1 Kiếp đơn (basic ko) — luật chính thức

Định nghĩa luật: **cấm nước đi tái tạo lại thế cờ toàn bàn giống hệt thế cờ ngay trước nước đi vừa rồi của đối phương.** Tức không được ăn lại ngay quân vừa ăn mình.

Cài đặt thực dụng (chính xác tương đương, mọi engine đều dùng) — sau bước `e` ở mục 4:

```
nếu  captured.length === 1
 và  chuỗi chứa p có đúng 1 quân (chính là p)
 và  chuỗi chứa p có đúng 1 khí
thì  koPoint = captured[0]
ngược lại  koPoint = -1
```

- `koPoint` bị **xoá về -1 sau MỌI nước**, kể cả sau một nước `pass`. Nghĩa là: nếu đối phương pass, bạn được ăn lại kiếp ngay.
- Ba điều kiện trên loại đúng trường hợp **snapback** (ăn ngược): snapback ăn 1 quân nhưng nhóm vừa đặt có >1 quân hoặc >1 khí → không phải kiếp → hợp lệ.
- Người bị cấm ở `koPoint` phải đi chỗ khác trước (**đòn kiếp / ko threat**), rồi lượt sau mới được ăn lại.

### 5.2 Superko — chốt chặn phía server

Kiếp đơn **không** chặn được tam kiếp (triple ko), kiếp kép tuần hoàn, trường sinh (eternal life) — những thế này làm ván online lặp vô hạn.

- `superko: 'positional'` (**mặc định**): cấm nước tạo ra **thế cờ toàn bàn** (chỉ màu các quân, không tính bên đi) đã từng xuất hiện trong ván. Gọi tắt PSK, là mặc định của các bộ luật Trung Quốc hiện đại.
- `superko: 'situational'` (SSK): cấm lặp cặp `(thế cờ, bên sắp đi)`. Khác biệt với PSK chỉ xảy ra trong những thế cực hiếm; chọn PSK vì đơn giản hơn.
- `superko: 'none'`: đúng luật Nhật chính thống (luật Nhật KHÔNG có superko). Khi đó phải bật `repetitionOutcome`: nếu một thế cờ xuất hiện lần thứ 3 và cả hai bên không chịu nhượng bộ → ván **"vô hiệu" (no result / 無勝負)**, không ai thắng, đánh lại. Hoặc cấu hình thành hoà.
- `pass` **không bao giờ** bị superko chặn.
- Hash dùng **Zobrist 64-bit**. Bảng Zobrist phải được sinh từ **một hằng seed cố định biên dịch vào code** (ví dụ xorshift64 với seed `0x9E3779B97F4A7C15n`), **KHÔNG được sinh từ `rng` của ván** — nếu không, state serialize ra rồi load ở process khác sẽ vỡ.

## 6. KẾT THÚC PHA CHƠI

Pha chơi (`phase: 'playing'`) kết thúc khi xảy ra một trong:

1. **Hai `pass` liên tiếp** (`passStreak === 2`) → chuyển sang `phase: 'scoring'`.
   - `passStreak` reset về 0 ngay khi có bất kỳ nước đặt quân nào.
   - Luật Nhật và luật Trung: `pass` **không** mất điểm, không phải nộp quân. (Luật AGA có "pass stone" — ta **không** dùng, nói rõ để lập trình viên không lẫn.)
2. **`resign`** → `phase: 'finished'`, đối phương thắng ngay, không đếm điểm.
3. **Hết giờ** → `phase: 'finished'`, thua (mục timeControl).
4. **`moveNumber >= config.maxMoves`** (chốt chặn kỹ thuật, mặc định `size*size*4`) → ép vào `phase: 'scoring'`. Ván thật không bao giờ chạm mốc này (19×19 thường 200–300 nước).
5. **Không còn nước hợp lệ nào** cho bên đi (cực hiếm, về lý thuyết gần như không xảy ra vì cấm tự sát nên mắt không thể bị lấp): engine chỉ cho phép action `pass`.

## 7. PHA ĐẾM ĐIỂM (`phase: 'scoring'`) — PHẦN KHÓ NHẤT

Ở cờ vây, cuối ván hai bên phải **thống nhất quân nào đã chết** (quân nằm trong vùng địch, không thể sống, nhưng chưa bị ăn thật). Đây là pha **thương lượng** — không game nào khác trong nền tảng có thứ tương tự.

### 7.1 Luồng

1. Khi vào pha này, engine chạy **auto-score** (mục 8) tạo `autoProposal: boolean[]` đánh dấu quân chết, gán vào `scoring.dead`. Gửi cho cả hai kèm điểm số dự kiến.
2. Mỗi người có thể gửi `mark_dead(idx)`: **toggle** trạng thái sống/chết của **toàn bộ chuỗi** chứa `idx`. (UX tốt hơn: toggle luôn các chuỗi cùng màu nằm trong cùng vùng bao — nhưng bắt buộc tối thiểu là toggle theo chuỗi.)
3. **Mỗi lần toggle, reset `scoringAccepted` của CẢ HAI về false.** Nếu không, một bên có thể accept rồi bên kia đổi dấu để ăn gian.
4. Khi **cả hai** `accept_score` với cùng tập `dead` → tính điểm (mục 9) → `phase: 'finished'`.
5. Bất kỳ bên nào có thể gửi `request_resume`: quay lại `phase: 'playing'` để **đánh tiếp chứng minh sống chết**.
   - `toMove` = bên kế tiếp theo thứ tự bình thường sau lần pass thứ hai. Cụ thể: nếu Đen pass (#1) rồi Trắng pass (#2) thì khi resume **Đen đi**.
   - Reset `passStreak = 0`, `koPoint = -1`. **Giữ nguyên `positionKeys`** (superko vẫn áp dụng xuyên suốt).
   - Giới hạn `config.maxResumes` (mặc định **3**) mỗi ván để chống câu giờ. Vượt quá → từ chối, buộc phải accept hoặc resign.
6. **Chống câu giờ:** `scoring.deadlineMs`. Nếu quá hạn (mặc định 60s, hoặc 120s cho ván dài) mà một bên chưa phản hồi → **tự động chấp nhận trạng thái `dead` hiện tại** và tính điểm. Đây là cách OGS làm, và bắt buộc phải có, nếu không đối thủ bỏ đi là ván treo vĩnh viễn.
7. Trong pha scoring, **đồng hồ ván KHÔNG chạy** (không ai bị thua vì hết giờ ở đây). Chỉ có `scoring.deadlineMs`.

### 7.2 Quy tắc bất biến

Điểm chính thức **luôn** được tính từ tập `dead` đã được hai bên chấp nhận (hoặc auto-accept khi hết hạn). Kết quả auto-score **chỉ là đề xuất**, không bao giờ là nguồn sự thật.

## 8. AUTO-SCORE: XÁC ĐỊNH QUÂN CHẾT TỰ ĐỘNG

Bắt buộc phải có (dùng cho đề xuất, cho auto-accept, và cho bot). Ba tầng, chạy theo thứ tự:

### 8.1 Tầng 1 — Thuật toán Benson (sống vô điều kiện, chính xác 100%, không heuristic)

Xác định các chuỗi **pass-alive** — không thể bị ăn dù đối phương được đi liên tiếp bao nhiêu nước tuỳ ý. Những chuỗi này **chắc chắn sống**, không bao giờ được đánh dấu chết.

Với màu M:
- `X` = tập mọi chuỗi màu M.
- Một **vùng bị M bao** (M-enclosed region) `r` = thành phần liên thông 4 hướng của các ô **không phải M** (ô trống hoặc ô địch), sao cho mọi ô kề `r` mà không thuộc `r` đều là quân M. `R` = tập mọi vùng như vậy.
- Vùng `r` là **sinh tử (vital)** với chuỗi `c ∈ X` nếu **mọi giao điểm TRỐNG của `r`** đều là khí của `c`.
- Lặp đến khi không thay đổi:
  1. Loại khỏi `X` mọi chuỗi có **< 2** vùng sinh tử trong `R`.
  2. Loại khỏi `R` mọi vùng có ít nhất một quân biên thuộc chuỗi **không còn** trong `X`.
- `X` còn lại = tập chuỗi sống vô điều kiện.

Độ phức tạp thấp, chạy vài chục microsecond. Chạy cho cả hai màu.

### 8.2 Tầng 2 — Thống kê quyền sở hữu bằng playout

Với phần bàn cờ chưa được Benson kết luận:
- Chạy `N` playout (mặc định `N = 400`, mỗi playout dùng chính bộ sinh nước rollout của bot ở mục 12, có luật "không tự lấp mắt", chơi đến khi cả hai pass hoặc quá `2*size*size` nước).
- Với mỗi giao điểm, đếm tỉ lệ số playout mà cuối cùng nó thuộc Đen / thuộc Trắng (theo area scoring Tromp–Taylor).
- Ô nào thuộc một màu ≥ **70%** số playout → coi màu đó **sở hữu** ô đó.
- Chuỗi nào có ≥ **70%** số quân nằm trong vùng do **đối phương** sở hữu → đánh dấu **CHẾT**.
- Đây chính là cách `score-estimator` của OGS hoạt động.

### 8.3 Tầng 3 — Không hội tụ

Nếu tỉ lệ nằm trong khoảng 30–70% (thế cờ còn tranh chấp thật sự) → **để nguyên là SỐNG** và trông cậy vào người chơi toggle thủ công. Không bao giờ đoán bừa ở tầng này — đoán sai làm người chơi mất điểm oan.

## 9. TÍNH ĐIỂM

Bước chung trước tiên: **nhấc mọi quân bị đánh dấu chết khỏi bàn.**

### 9.1 Luật Nhật Bản (JP, đếm đất) — mặc định cho Việt Nam

```
prisonersB = số quân Trắng Đen đã ăn trong ván  +  số quân Trắng bị đánh dấu chết
prisonersW = số quân Đen Trắng đã ăn trong ván  +  số quân Đen bị đánh dấu chết
```

**Tính đất:**
- Flood-fill 4 hướng các giao điểm **trống** (sau khi đã nhấc quân chết) thành các vùng.
- Một vùng là **đất của màu M** nếu **tất cả** giao điểm biên (các ô có quân, kề vùng) đều là quân màu M.
- Vùng có biên cả hai màu = **dame** (điểm trung lập) → 0 điểm cho cả hai.

**SEKI (song hoạt) — đặc thù luật Nhật:** đất tiếp giáp với nhóm đang ở thế song hoạt **KHÔNG được tính điểm**. Song hoạt là thế hai nhóm hai màu sống chung, không nhóm nào có hai mắt, ai đi vào khí chung thì tự chết.

Cách phát hiện thực dụng (heuristic sát thực tế, đủ dùng cho 99,5% ván):
```
chuỗi c ở thế seki  <=>  c KHÔNG bị đánh dấu chết
                      && c KHÔNG pass-alive theo Benson
                      && c có ít nhất 1 khí là dame (khí chung với một chuỗi sống màu đối phương)
Mọi vùng trống kề một chuỗi seki -> 0 điểm cho cả hai.
```
Nói thẳng: những ca seki kỳ dị (seki có mắt giả, seki nhiều màu chồng lấn) heuristic này có thể sai. Phải có nút để hai người chơi **toggle thủ công vùng seki**, và cho phép trọng tài can thiệp ở giải đấu. Đây là lý do chính khiến JP scoring tốn công.

```
scoreB = territoryB + prisonersB
scoreW = territoryW + prisonersW + komi
```

**Quân chấp:** trong JP scoring, quân chấp không bị trừ gì; `komi` mặc định `0.5` khi có chấp.

### 9.2 Luật Trung Quốc (CN, đếm diện tích)

```
scoreB = (số quân Đen còn trên bàn) + (số giao điểm trống chỉ do Đen bao)
scoreW = (số quân Trắng còn trên bàn) + (số giao điểm trống chỉ do Trắng bao) + komi
```
- **Tù binh KHÔNG tính.** Dame = 0 điểm cho cả hai.
- **Không cần xử lý seki riêng:** mắt trong seki vẫn tính bình thường nếu chỉ do một màu bao; khí chung vẫn là dame. Đây là lý do CN đơn giản hơn JP rất nhiều về mặt code.
- **Quân chấp:** Đen đặt thêm `H` quân → Đen tự nhiên có thêm `H` điểm diện tích. Phải bù cho Trắng. Quy ước KGS/AGA (khuyến nghị dùng): `komi hiệu dụng cho Trắng = H + 0.5`. Đặt thành config vì các liên đoàn có công thức khác nhau đôi chút.

### 9.3 Giá trị komi mặc định

| Bàn | JP | CN |
|---|---|---|
| 19×19 | 6.5 | 7.5 |
| 13×13 | 6.5 | 7.5 |
| 9×9 | 6.5 (nhiều nơi dùng 7) | 7.5 |
| Ván chấp (mọi bàn) | 0.5 | H + 0.5 |

Komi lẻ `.5` ⇒ **không bao giờ hoà**. Chỉ cho phép hoà (`jigo`) khi cấu hình komi nguyên.

### 9.4 Chênh lệch giữa hai luật

Cùng một ván đánh giống nhau, JP và CN thường lệch nhau 0–1 điểm (do Đen/Trắng đi số nước khác nhau, và do seki). Rất hiếm khi đổi người thắng. Nhưng **phải chốt luật từ lúc tạo phòng** và hiển thị rõ trên UI — không được đổi giữa chừng.

## 10. VÁN CHẤP (HANDICAP)

- `H ∈ [2..9]` với 19×19, `[2..5]` với 13×13, `[2..4]` với 9×9.
- Đen đặt `H` quân trước, **Trắng đi nước đầu tiên**.

**Điểm sao (hoshi):**
- 19×19: giao của các cột `D, K, Q` với các hàng `4, 10, 16` (cột: A B C D E F G H J K L M N O P Q R S T — bỏ I, nên D=4, K=10, Q=16). Tổng 9 điểm.
- 13×13: `D4, K4, D10, K10, G7` (cột A..N bỏ I: D=4, G=7, K=10).
- 9×9: `C3, G3, C7, G7, E5`.

**Thứ tự đặt cố định (`handicapPlacement: 'fixed'`), chuẩn quốc tế, 19×19:**
```
H=2: Q16, D4
H=3: Q16, D4, Q4
H=4: Q16, D4, Q4, D16
H=5: 4 góc + K10
H=6: 4 góc + D10, Q10        (bỏ thiên nguyên)
H=7: 4 góc + D10, Q10 + K10
H=8: 4 góc + D10, Q10, K4, K16
H=9: cả 9 điểm sao
```
13×13: `H=2: K10, D4` → `H=3: +K4` → `H=4: +D10` → `H=5: +G7`.
9×9: `H=2: G7, C3` → `H=3: +G3` → `H=4: +C7`.

Ở chế độ `fixed`, server đặt hết quân chấp ngay trong `init()`, `phase` bắt đầu thẳng ở `'playing'` với `toMove = Trắng`.

**Chế độ tự do (`handicapPlacement: 'free'`, phổ biến ở Trung Quốc và trên mạng):** `phase` bắt đầu ở `'handicap'`. Đen gửi `H` action `place_handicap`, mỗi lần 1 quân vào **ô trống bất kỳ**. Trong pha này: không ăn quân, không kiểm tra kiếp/superko, không kiểm tra tự sát (quân chấp luôn rời rạc trên bàn trống nên không thể tự sát). Đặt đủ `H` quân → `phase = 'playing'`, `toMove = Trắng`.

## 11. CÁC TÌNH HUỐNG BIÊN PHẢI XỬ LÝ (checklist)

1. Đặt vào ô đã có quân → lỗi, không đổi lượt, không trừ giờ thêm.
2. Đặt ngoài bàn / index sai kiểu → lỗi.
3. Tự sát 1 quân và tự sát cả nhóm → đều cấm.
4. Đặt vào ô 0 khí **nhưng ăn được quân** → **HỢP LỆ** (thứ tự ăn-trước-xét-tự-sát).
5. **Snapback** → hợp lệ, không bị luật kiếp chặn (điều kiện ba vế ở 5.1 tự loại).
6. **Kiếp kép, tam kiếp, trường sinh, tam tam kiếp** → PSK chặn. Với `superko:'none'` → `no_result`.
7. Đen `pass` ngay nước 1 → hợp lệ.
8. Cả hai `pass` ở nước 1 và 2 → ván kết thúc, 0 vs komi, Trắng thắng. Hợp lệ, không được cấm.
9. `pass` **xoá `koPoint`** → đối phương được ăn lại kiếp ngay ở lượt sau.
10. Bàn không còn nước hợp lệ → engine chỉ cho phép `pass`.
11. `resign` ở bất kỳ pha nào (kể cả `scoring`) → hợp lệ, kết thúc ngay.
12. Ăn quân làm nhóm mình từ 0 khí thành có khí → hợp lệ (đã bao trong mục 4).
13. **Mắt giả (false eye)** → engine luật không cần biết; chỉ Benson và playout quan tâm.
14. **Undo:** KHÔNG hỗ trợ trong ván xếp hạng. Nếu làm cho ván thường: phải là action riêng cần đối thủ đồng ý, và phải khôi phục **cả `positionKeys`** (lưu stack snapshot hash, không chỉ pop mảng), nếu không superko sẽ sai.
15. Mất kết nối giữa pha `scoring` → deadline vẫn chạy → auto-accept. Đừng để ván treo.
16. Serialize `board`: dùng `Uint8Array` trong RAM nhưng serialize thành base64 hoặc chuỗi `"0120021..."` để state là JSON thuần. 19×19 = 361 byte, không đáng lo.
17. Hai người cùng gửi `mark_dead` gần như đồng thời → xử lý tuần tự theo thứ tự server nhận, mỗi lần đều reset `scoringAccepted` cả hai.
18. `request_resume` khi đã `accept_score` một lần rồi → vẫn cho, miễn chưa đủ hai accept và chưa vượt `maxResumes`.

## 12. GHI CHÚ VỀ NGẪU NHIÊN

Cờ vây **không có yếu tố ngẫu nhiên trong luật chơi**. `rng` của server chỉ dùng ở đúng 2 chỗ:
1. **`init()` — chọn màu (nigiri):** khi `handicap === 0`, rút ngẫu nhiên ai cầm Đen. Khi có chấp, người yếu hơn (rank thấp hơn) cầm Đen, không cần rng.
2. **Seed con cho bot:** ở đầu mỗi nước của bot, gọi `rng()` **đúng 1 lần** để lấy seed con, ghi vào log, rồi bot dùng PRNG cục bộ nhanh với seed đó. Lý do: MCTS gọi ngẫu nhiên hàng triệu lần/nước, đi qua interface `rng` của server sẽ chậm gấp hàng chục lần. Cách này vẫn **replay được 100%**.

Client **tuyệt đối không** được gieo gì.

## 13. KHUYẾN NGHỊ LỘ TRÌNH (đọc nếu muốn ship nhanh)

**v1 — chỉ luật Trung Quốc (CN / area scoring), bàn 9×9 và 13×13:**
- Bỏ hoàn toàn pha thương lượng sống/chết. Với area scoring, người chơi có thể **"đánh tới cùng"**: ăn hết quân chết thật sự trên bàn rồi mới pass. Điểm số không đổi dù có lấp dame hay không (khác JP — ở JP lấp dame làm mất điểm).
- Vẫn nên có auto-score làm đề xuất + nút accept, nhưng nếu hai bên không đồng ý thì chỉ cần resume đánh tiếp — không cần trọng tài, không cần logic seki.
- Bỏ được: phát hiện seki, tính đất kiểu JP, phần lớn state machine của pha scoring.

**v2 — thêm luật Nhật + bàn 19×19 + pha thương lượng đầy đủ.** Đây mới là phần chiếm quá nửa công sức.

## Mô hình trạng thái

```ts
// ===== KIỂU CƠ BẢN =====
type Stone = 0 | 1 | 2;          // 0 = trống, 1 = Đen, 2 = Trắng
type Color = 1 | 2;
type Idx   = number;             // 0 .. size*size-1 ; idx = y*size + x, gốc (0,0) ở trên-trái
const opp = (c: Color): Color => (c === 1 ? 2 : 1);

// ===== CẤU HÌNH VÁN =====
interface TimeSettings {
  mode: 'byoyomi' | 'canadian' | 'fischer' | 'absolute' | 'none';
  mainMs: number;            // giờ chính
  periodMs: number;          // độ dài 1 hiệp byo-yomi / 1 block Canadian
  periods: number;           // số hiệp byo-yomi
  movesPerPeriod: number;    // chỉ Canadian (vd 20 nước / 5 phút)
  incrementMs: number;       // chỉ Fischer
  maxThinkMsBot: number;     // trần suy nghĩ của bot, mặc định 800
}

interface GoConfig {
  size: 9 | 13 | 19;
  ruleset: 'JP' | 'CN';                  // JP = đếm đất (mặc định VN), CN = đếm diện tích
  komi: number;                          // 6.5 / 7.5 / 0.5(JP chấp) / H+0.5(CN chấp)
  handicap: number;                      // 0..9
  handicapPlacement: 'fixed' | 'free';
  superko: 'none' | 'positional' | 'situational';   // mặc định 'positional'
  repetitionOutcome: 'no_result' | 'draw';          // chỉ dùng khi superko === 'none'
  allowSelfCapture: false;               // LUÔN false cho JP/CN
  drawAllowed: boolean;                  // chỉ true khi komi nguyên
  time: TimeSettings;
  scoringTimeoutMs: number;              // mặc định 60_000
  maxResumes: number;                    // mặc định 3
  maxMoves: number;                      // mặc định size*size*4
  scoreEstimateEnabled: boolean;         // false ở ván xếp hạng (là TRỢ GIÚP, không phải info ẩn)
  spectatorDelayMs: number;              // 0 thường, >0 cho giải đấu chống chỉ điểm
}

// ===== ĐỒNG HỒ MỖI NGƯỜI =====
interface TimeBank {
  mainMs: number;            // giờ chính còn lại
  inByoyomi: boolean;
  periodsLeft: number;       // số hiệp còn (byoyomi)
  periodMs: number;          // độ dài hiệp hiện tại
  movesLeftInBlock: number;  // chỉ Canadian
  blockMsLeft: number;       // chỉ Canadian
}

// ===== NGƯỜI CHƠI =====
interface GoPlayer {
  playerId: string;
  color: Color;
  isBot: boolean;
  botLevel?: 'easy' | 'medium' | 'hard';
  time: TimeBank;
  capturedByMe: number;      // số quân ĐỐI PHƯƠNG mà người này đã ăn trong pha chơi
  scoringAccepted: boolean;
  resumeRequests: number;
  disconnectedSinceMs: number | null;
}

// ===== PHA ĐẾM ĐIỂM =====
interface ScoringState {
  dead: boolean[];            // length = size*size; dead[idx] = quân tại idx bị đánh dấu chết
  autoProposal: boolean[];    // đề xuất ban đầu của auto-score, giữ lại để so sánh/log
  deadlineMs: number;         // epoch ms; quá hạn -> auto accept
  lastToggleBy: string | null;
  toggleCount: number;        // log chống spam
}

// ===== KẾT QUẢ =====
interface ScoreBreakdown {
  territoryB: number; territoryW: number;   // chỉ JP có nghĩa; CN gộp vào area
  stonesOnBoardB: number; stonesOnBoardW: number;  // chỉ CN
  prisonersB: number; prisonersW: number;   // chỉ JP
  deadRemovedB: number; deadRemovedW: number;
  dame: number;
  sekiPoints: number;                        // số điểm bị loại do seki (JP)
  komi: number;
  scoreB: number; scoreW: number;
}
interface GoResult {
  kind: 'score' | 'resign' | 'timeout' | 'no_result' | 'forfeit';
  winner: Color | null;                      // null = hoà hoặc no_result
  margin: number;                            // |scoreB - scoreW|; 999 cho resign/timeout
  breakdown: ScoreBreakdown | null;          // null khi resign/timeout/no_result
  notation: string;                          // 'B+7.5' | 'W+R' | 'B+T' | 'Void' | 'Draw'
  endedAtMs: number;
}

// ===== LỊCH SỬ =====
interface MoveRecord {
  n: number;                 // moveNumber trước khi đi
  color: Color;
  type: 'move' | 'pass' | 'handicap';
  idx: Idx | -1;
  captured: Idx[];           // các ô bị nhấc (để undo / vẽ animation / replay)
  koAfter: Idx | -1;
  elapsedMs: number;
  clockAfter: [TimeBank, TimeBank];
  botSeed?: string;          // seed con của bot cho nước này (replay xác định)
}

// ===== STATE TỔNG =====
interface GoState {
  version: 1;
  config: GoConfig;
  players: [GoPlayer, GoPlayer];          // index 0 = Đen, index 1 = Trắng (chuẩn hoá ở init)

  phase: 'handicap' | 'playing' | 'scoring' | 'finished';

  // BÀN CỜ: trong RAM dùng Uint8Array; khi serialize -> chuỗi base64 hoặc chuỗi số "0120..."
  board: string;                          // độ dài size*size sau khi decode
  toMove: Color;
  moveNumber: number;
  passStreak: 0 | 1 | 2;
  koPoint: Idx | -1;
  handicapRemaining: number;              // chỉ mode 'free'

  // CHỐNG LẶP
  positionKeys: string[];                 // hex 64-bit Zobrist; Set<string> khi chạy, array khi serialize
  repetitionCount: Record<string, number>;// chỉ cần khi superko === 'none'

  history: MoveRecord[];
  lastActionAtMs: number;                 // epoch ms của action hợp lệ gần nhất -> mốc tính giờ
  scoring: ScoringState | null;
  result: GoResult | null;
  rngCallCount: number;                   // đếm lần gọi rng để verify replay
}
```

**Ghi chú cài đặt quan trọng:**

- **Cấu trúc phụ trợ (KHÔNG serialize, dựng lại từ `board` mỗi lần load):** union-find cho chuỗi, mảng `libertyCount` và `libertyHash` (XOR các idx khí) per-chain. Cho phép ăn quân/đếm khí O(α(n)) thay vì flood-fill mỗi nước. Bắt buộc nếu muốn bot chạy nhanh.
- **Bảng Zobrist:** `zob[color][idx]`, sinh từ **hằng seed biên dịch trong code** (`0x9E3779B97F4A7C15n` + xorshift64), KHÔNG từ `rng` của ván. PSK hash chỉ gồm màu các quân; SSK thì XOR thêm `zobSideToMove` khi `toMove === 2`.
- **Kích thước state:** 19×19 với 300 nước ≈ 361B board + 300 × ~80B history + 300 × 16B hash ≈ **40 KB**. Hoàn toàn ổn để lưu JSON mỗi nước. Nếu cần nhẹ hơn: lưu **chỉ history** và replay để dựng board (replay 300 nước < 1ms).
- `players[0]` luôn là Đen sau `init()`. Nhưng vẫn lưu `color` tường minh để code đọc dễ và chống lỗi khi refactor.
- Không lưu bất kỳ state nào của bot (cây MCTS) trong `GoState`. Cây sống trong worker, chết sau mỗi nước (hoặc cache theo `gameId` trong worker, nhưng phải chịu được mất cache).

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `place` | { x: number, y: number }  (hoặc { idx: number } — chọn MỘT dạng và giữ nhất quán toàn hệ thống; khuyến nghị {x,y} vì dễ debug) | phase === 'playing'; playerId là người đang có lượt (toMove); 0 <= x,y < size; board[idx] === 0; idx !== koPoint; sau khi đặt-và-ăn thì chuỗi chứa idx phải có >= 1 khí (không tự sát); hash thế cờ mới không vi phạm superko theo config. Sai bất kỳ điều kiện nào -> trả lỗi có mã (ILLEGAL_NOT_YOUR_TURN | ILLEGAL_WRONG_PHASE | ILLEGAL_OFF_BOARD | ILLEGAL_OCCUPIED | ILLEGAL_KO | ILLEGAL_SUICIDE | ILLEGAL_SUPERKO), KHÔNG đổi lượt, KHÔNG thay đổi state, nhưng VẪN trừ thời gian đã trôi (chống spam nước sai để câu giờ). Events phát ra: StonePlaced{idx,color}, StonesCaptured{idxs,byColor} nếu có ăn, KoSet{idx}|KoCleared, TurnChanged{toMove}, ClockUpdated. |
| `pass` | {} | phase === 'playing'; đúng lượt. LUÔN hợp lệ về mặt luật. Hiệu ứng: passStreak++; koPoint = -1; moveNumber++; đổi lượt; ghi history type='pass'. Nếu passStreak === 2 -> chạy auto-score, chuyển phase='scoring', đặt scoring.deadlineMs = now + config.scoringTimeoutMs, dừng đồng hồ ván. Events: Passed{color}, nếu kết thúc thì ScoringStarted{autoProposal, estimatedScore}. |
| `resign` | {} | phase ∈ {'handicap','playing','scoring'}; playerId là một trong hai người chơi (KHÔNG cần đúng lượt — xin thua được bất cứ lúc nào). Hiệu ứng: phase='finished'; result = { kind:'resign', winner: opp(color), margin: 999, breakdown: null, notation: 'B+R'|'W+R' }. Events: Resigned{color}, GameEnded{result}. |
| `place_handicap` | { x: number, y: number } | config.handicapPlacement === 'free'; phase === 'handicap'; playerId là Đen; handicapRemaining > 0; 0 <= x,y < size; board[idx] === 0. KHÔNG kiểm tra ăn quân, kiếp, superko, tự sát (bàn trống, quân chấp rời rạc). Hiệu ứng: board[idx]=1; handicapRemaining--; nếu về 0 -> phase='playing', toMove=2 (Trắng), ghi positionKeys thế cờ ban đầu, khởi động đồng hồ. Events: HandicapPlaced{idx}, nếu xong thì GameStarted{toMove:2}. |
| `mark_dead` | { x: number, y: number } | phase === 'scoring'; playerId là một trong hai người chơi (cả hai đều được đánh dấu, không theo lượt); board[idx] !== 0 (phải click vào một quân, không phải ô trống). Hiệu ứng: toggle scoring.dead[] cho TOÀN BỘ chuỗi chứa idx; reset scoringAccepted = false cho CẢ HAI người (bắt buộc, chống gian lận); scoring.lastToggleBy = playerId; gia hạn scoring.deadlineMs = now + config.scoringTimeoutMs; tính lại điểm dự kiến. Nếu chuỗi đó pass-alive theo Benson thì VẪN cho toggle (người chơi có quyền thoả thuận bất kỳ), nhưng gửi kèm cảnh báo trên UI. Events: DeadMarksChanged{dead, provisionalScore, by}. |
| `accept_score` | { deadHash: string }  // hash của tập dead mà client đang thấy | phase === 'scoring'; playerId là một trong hai; deadHash phải KHỚP hash của scoring.dead hiện tại trên server (chống race: client accept một tập dead cũ vừa bị đối phương toggle) — không khớp thì trả lỗi STALE_DEAD_MARKS kèm state mới. Hiệu ứng: player.scoringAccepted = true. Nếu CẢ HAI đã accepted -> tính điểm theo config.ruleset (mục 9), phase='finished', result đầy đủ breakdown. Events: ScoreAccepted{by}, nếu đủ hai thì GameEnded{result}. |
| `request_resume` | {} | phase === 'scoring'; playerId là một trong hai; player.resumeRequests < config.maxResumes (nếu vượt -> lỗi RESUME_LIMIT_REACHED). Hiệu ứng: player.resumeRequests++; phase='playing'; scoring=null; passStreak=0; koPoint=-1; GIỮ NGUYÊN positionKeys; toMove = bên kế tiếp theo thứ tự bình thường sau lần pass thứ hai (Đen pass #1, Trắng pass #2 -> Đen đi); khởi động lại đồng hồ ván với quỹ giờ còn nguyên như lúc vào scoring; reset scoringAccepted cả hai. Events: GameResumed{toMove, by}. |
| `claim_timeout` | {} | phase ∈ {'playing','scoring'}; playerId là một trong hai (hoặc gọi nội bộ từ scheduler). Chỉ là yêu cầu server KIỂM TRA, không tự quyết. Server gọi đúng logic của tick(state, Date.now(), rng): nếu đối phương thực sự đã hết giờ -> kết thúc như tick; nếu chưa -> trả lỗi NO_TIMEOUT kèm thời gian còn lại. Action này để client không phải chờ scheduler và để chống trường hợp scheduler trễ. Events: giống tick. |
| `offer_draw / respond_draw` | offer: {} | respond: { accept: boolean } | TUỲ CHỌN, rất ít dùng trong cờ vây vì komi lẻ .5 đã loại hoà. Chỉ bật khi config.drawAllowed === true (komi nguyên). offer: phase==='playing', đúng lượt, chưa có offer đang treo, cách offer trước >= 10 nước (chống spam). respond: có offer đang treo và playerId là bên nhận. accept=true -> phase='finished', result.kind='score', winner=null, notation='Draw'. Offer tự huỷ khi người đề nghị đi nước tiếp theo. Events: DrawOffered{by}, DrawResponded{accept}. |
| `request_undo / respond_undo` | offer: {} | respond: { accept: boolean } | TUỲ CHỌN, CHỈ cho ván thường (config phải bật, mặc định TẮT; ván xếp hạng luôn cấm). request: phase==='playing', history.length > 0, chưa có yêu cầu treo. respond bởi đối phương. Nếu accept: pop MoveRecord cuối, khôi phục board bằng cách đặt lại quân captured và xoá quân vừa đặt, KHÔI PHỤC koPoint từ record trước, và BẮT BUỘC pop positionKeys tương ứng (nếu không superko sẽ sai vĩnh viễn), khôi phục clock từ record.clockAfter của nước trước đó, moveNumber--, passStreak khôi phục. Events: UndoRequested{by}, UndoApplied{n} | UndoRejected. |

## Kết thúc ván

## ĐIỀU KIỆN KẾT THÚC

Ván kết thúc (`finished(state) === true` khi `state.phase === 'finished'`) trong đúng 5 trường hợp:

**1. Đếm điểm (`kind: 'score'`)** — hai bên đã thống nhất tập quân chết (cả hai `accept_score`), hoặc hết `scoring.deadlineMs` → auto-accept trạng thái hiện tại.

- **Luật Nhật (JP):**
  `scoreB = đấtB + tùBinhB` , `scoreW = đấtW + tùBinhW + komi`
  trong đó `tùBinh = quân địch đã ăn trong ván + quân địch bị đánh dấu chết`; đất tiếp giáp nhóm **seki không được tính**.
- **Luật Trung (CN):**
  `scoreB = quânĐenTrênBàn + đấtChỉĐenBao` , `scoreW = quânTrắngTrênBàn + đấtChỉTrắngBao + komi`
  tù binh **không** tính; seki **không** cần xử lý riêng.
- Thắng: `scoreB > scoreW` → Đen thắng, ký hiệu `B+{scoreB-scoreW}`; ngược lại `W+{...}`.
- **Hoà (jigo):** chỉ khi `scoreB === scoreW`, tức chỉ có thể xảy ra khi `komi` là số nguyên. Với komi `.5` (mặc định) **không bao giờ hoà**.

**2. Xin thua (`kind: 'resign'`)** — người xin thua thua ngay, không đếm điểm. Ký hiệu `B+R` / `W+R`. Đây là cách kết thúc phổ biến nhất trong cờ vây thực tế.

**3. Hết giờ (`kind: 'timeout'`)** — người hết giờ **thua bất kể thế cờ trên bàn**, đúng như luật thi đấu Nhật Bản và các giải Việt Nam. Ký hiệu `B+T` / `W+T`. (Một số giải nghiệp dư áp dụng "hết giờ vẫn đếm điểm" — **ta không dùng**, đặt cứng.)

**4. Vô hiệu (`kind: 'no_result'`, 無勝負)** — chỉ xảy ra khi `config.superko === 'none'` (chế độ đúng luật Nhật chính thống) và thế cờ lặp lần thứ 3 do tam kiếp / trường sinh mà không bên nào chịu nhượng. **Không ai thắng, không ai thua.** Ván được coi như chưa diễn ra; ở giải đấu thì đánh lại. Với `superko: 'positional'` (mặc định) trường hợp này không tồn tại vì nước lặp bị chặn từ đầu.

**5. Xử thua kỹ thuật (`kind: 'forfeit'`)** — mất kết nối quá `disconnectGraceMs` và đã dùng hết quyền tạm dừng, hoặc vi phạm (gửi hàng loạt action bất hợp lệ để DoS). Xử như thua. Nếu **cả hai** cùng rơi vào trạng thái này → `no_result`.

---

## HÀM `results(state)`

```ts
results(state) -> [{ playerId, place, score }]
```

Quy ước (phải ghi rõ trong tài liệu để hệ thống xếp hạng dùng đúng):

| Tình huống | place người thắng | place người thua | `score` |
|---|---|---|---|
| Đếm điểm, có thắng thua | 1 | 2 | `score` = **margin** (chênh lệch điểm) theo góc nhìn từng người: `+7.5` cho người thắng, `-7.5` cho người thua |
| Đếm điểm, hoà (jigo) | 1 | 1 | `0` cho cả hai |
| Xin thua | 1 | 2 | `+999` / `-999` (sentinel "thắng không tính điểm") |
| Hết giờ | 1 | 2 | `+999` / `-999` |
| Xử thua kỹ thuật | 1 | 2 | `+999` / `-999` |
| Vô hiệu (no_result) | 1 | 1 | `0` cho cả hai — hệ xếp hạng **phải bỏ qua ván này**, không tính Elo |

`score` là **margin** chứ không phải điểm tuyệt đối, vì Elo chỉ quan tâm ai thắng và cách biệt bao nhiêu. Điểm tuyệt đối (`scoreB`, `scoreW`) và toàn bộ chi tiết (đất, tù binh, dame, seki, komi) vẫn được lưu đầy đủ trong `state.result.breakdown` để hiển thị bảng kết quả và xuất SGF.

**Cảnh báo cho hệ xếp hạng:** đừng dùng `margin` làm trọng số Elo trong cờ vây. Thắng 0.5 điểm và thắng 50 điểm trong cờ vây chỉ khác nhau về phong cách kết thúc, không phản ánh chênh lệch trình độ tuyến tính. Chỉ dùng thắng/thua/hoà, cộng thêm hiệu chỉnh theo số quân chấp (`config.handicap`) nếu có.

## Che thông tin ẩn

**Không có thông tin ẩn.** Cờ vây là game thông tin hoàn hảo tuyệt đối: toàn bộ bàn cờ, số quân đã ăn, lịch sử nước đi đều công khai cho cả hai người chơi và người xem. `view(state, viewerId)` về cơ bản là hàm đồng nhất.

Tuy vậy `view()` vẫn **phải làm 4 việc**, nếu không sẽ có lỗ hổng:

**1. Cắt state nội bộ của server (không phải bí mật, nhưng không được lộ và vô ích với client):**
- `positionKeys[]` và `repetitionCount` — mảng hash Zobrist, client không cần. Thay bằng `superkoForbidden: Idx[]` (danh sách ô bị superko cấm ở lượt hiện tại) để client tô mờ — tối đa vài ô, tính rẻ.
- `rngCallCount`, `history[].botSeed` — lộ seed con của bot cho phép người chơi mô phỏng lại chính xác bot sẽ đi gì. **Phải cắt trong ván đang diễn ra**, chỉ mở khi ván kết thúc (để replay/kiểm chứng).
- `players[].botLevel` — tuỳ chính sách; nên hiện (người chơi có quyền biết đang đấu bot mức nào), nhưng không được lộ các tham số nội bộ như số playout, ngưỡng resign.

**2. Chặn trợ giúp ở ván xếp hạng — đây mới là rủi ro thật.** Cờ vây không có info ẩn, nhưng có **info trợ giúp**:
- **Ước lượng điểm (score estimate):** nếu `config.scoreEstimateEnabled === false` (mặc định cho ván xếp hạng), `view()` **không được** trả `provisionalScore`, bản đồ sở hữu ô, hay kết quả auto-score trong `phase: 'playing'`. Chỉ trả khi đã sang `phase: 'scoring'`.
- **Bản đồ sống/chết theo Benson:** cũng là trợ giúp. Chỉ trả ở pha scoring.
- **Danh sách nước hợp lệ đầy đủ:** vô hại, client tự tính được. Nhưng đánh dấu "nước này ăn được N quân" thì là trợ giúp nhẹ — cho phép, vì client tự tính cũng ra.
- Nói thẳng: chống gian lận bằng AI ngoài (người chơi mở KataGo bên cạnh) là **không thể giải quyết ở tầng engine**. Phải xử lý bằng phân tích hành vi sau ván (so khớp nước đi với AI, phân bố thời gian suy nghĩ) ở tầng dịch vụ riêng.

**3. Người xem (spectator):**
- Ván thường: thấy mọi thứ như người chơi, kèm ước lượng điểm nếu muốn (người xem không đấu nên không sao). Nhưng khung chat người xem **phải tách riêng** khỏi chat người chơi, nếu không người xem sẽ chỉ điểm.
- Giải đấu: áp `config.spectatorDelayMs` (ví dụ 3–10 phút). `view()` cho `viewerId` không thuộc hai người chơi phải trả về **state đã tua lùi** tới nước cuối cùng có `timestamp <= now - spectatorDelayMs` (replay từ `history`, rẻ). Đây là cơ chế duy nhất trong game này thực sự cần "che".

**4. Pha đếm điểm là hợp tác, không che gì:** cả hai bên thấy chung một tập `scoring.dead` và cùng một điểm dự kiến. Che một bên ở đây sẽ làm thương lượng vô nghĩa.

Tóm lại: `view()` = `state` trừ `{positionKeys, repetitionCount, rngCallCount, botSeed}`, cộng `{superkoForbidden}`, và **có điều kiện** lược bỏ nhóm trợ giúp ở ván xếp hạng, cộng tua lùi cho người xem ở giải đấu.

## Tính giờ

## HỆ GIỜ

**Byo-yomi (đếm giây kiểu Nhật) là chuẩn của cờ vây** — không dùng Fischer increment như cờ vua. Lý do: cờ vây có những nước cần nghĩ rất lâu ở giữa ván và rất nhiều nước chiếu lệ ở cuối ván; byo-yomi cho phép tiêu hết giờ chính rồi vẫn đánh tiếp với nhịp ổn định.

### Gói giờ đề xuất theo bàn

| Chế độ | Bàn | Giờ chính | Đếm giây |
|---|---|---|---|
| Chớp | 9×9 | 3 phút | 3 hiệp × 20s |
| Nhanh | 9×9 / 13×13 | 5 phút | 3 hiệp × 30s |
| Tiêu chuẩn | 13×13 | 10 phút | 5 hiệp × 30s |
| Tiêu chuẩn | 19×19 | 20 phút | 5 hiệp × 30s |
| Dài | 19×19 | 45 phút | 5 hiệp × 60s hoặc Canadian 5 phút/20 nước |
| Thư tín | mọi bàn | Fischer: 3 ngày + 12h/nước, trần 7 ngày |

### Luật byo-yomi — cài đặt chính xác

```
elapsed = now - state.lastActionAtMs   // tính cho bên đang có lượt

nếu !inByoyomi:
    nếu elapsed <= mainMs:
        mainMs -= elapsed ; kết thúc
    ngược lại:
        over = elapsed - mainMs ; mainMs = 0 ; inByoyomi = true
        xử lý `over` như nhánh dưới

nếu inByoyomi:
    nếu over > periodsLeft * periodMs  ->  HẾT GIỜ, THUA
    periodsLost = ceil(over / periodMs) - 1
    periodsLeft -= periodsLost
    // hiệp hiện tại luôn được NẠP LẠI ĐẦY sau mỗi nước đi kịp
```

Ba điểm dễ sai:
1. **Đi kịp trong hiệp thì KHÔNG mất hiệp, và hiệp được nạp lại đầy.** Đây là bản chất byo-yomi: có thể đánh 200 nước liên tiếp mỗi nước 29s với hiệp 30s mà không mất hiệp nào.
2. **Một nước có thể ăn nhiều hiệp cùng lúc.** Nghĩ 75s với hiệp 30s → mất 2 hiệp (`ceil(75/30)-1 = 2`), còn lại vẫn đang trong hiệp thứ 3.
3. **Hết hiệp cuối cùng mà chưa đi → thua ngay**, không có ân hạn.

### Canadian overtime (tuỳ chọn, cho bàn 19×19 dài)
Sau khi hết giờ chính: phải đi đủ `movesPerPeriod` nước (vd 20) trong `periodMs` (vd 5 phút). Đi đủ → block được nạp lại đầy. Không đi đủ → thua. Ưu điểm: cho phép dồn thời gian vào nước khó. Cài đặt: theo dõi `blockMsLeft` và `movesLeftInBlock`, mỗi nước giảm cả hai; `movesLeftInBlock === 0` → nạp lại `blockMsLeft = periodMs`, `movesLeftInBlock = movesPerPeriod`.

### Quy tắc chung
- **`pass` cũng tốn giờ** như nước đi bình thường.
- **Nước bất hợp lệ vẫn bị trừ thời gian đã trôi** (chống spam nước sai để câu giờ), nhưng không đổi lượt và không tiêu hiệp.
- **Pha `scoring` KHÔNG chạy đồng hồ ván.** Không ai thua vì hết giờ ở pha này. Thay vào đó dùng `scoring.deadlineMs` riêng (60s), quá hạn → auto-accept, không phải xử thua.
- **Khi `request_resume`:** quỹ giờ được khôi phục **nguyên vẹn như lúc vào pha scoring**, không bị trừ thời gian đã ngồi thương lượng.
- **Bot cũng có đồng hồ thật** để không bao giờ treo ván. Bot luôn trả nước trong `config.time.maxThinkMsBot` (mặc định 800ms) bất kể quỹ giờ còn bao nhiêu — không cho bot "nghĩ lâu" theo quỹ giờ, vì nó chỉ tốn CPU server chứ không mạnh thêm bao nhiêu.
- **Ngắt kết nối:** cho mỗi người `pauseCredits` (mặc định 2 lần, tổng 5 phút) để tạm dừng đồng hồ khi mất mạng. Hết credit → đồng hồ chạy tiếp bình thường → thua vì hết giờ. Đây là cách duy nhất chống việc "rút mạng để khỏi thua".

### `tick(state, now, rng)`

**Quan trọng:** tôi đặt `realtime: false` vì **trạng thái bàn cờ không tự biến đổi theo thời gian** — không có tick nào làm thay đổi quân cờ. NHƯNG **đồng hồ thì có**, nên `tick()` **BẮT BUỘC phải được scheduler gọi**, nếu không sẽ không ai bao giờ thua vì hết giờ. Đừng bỏ qua vì thấy `realtime === false`.

```
tick(state, now, rng) -> state
  - phase === 'playing': tính quỹ giờ còn của toMove. Nếu <= 0
        -> phase='finished', result={kind:'timeout', winner:opp(toMove), margin:999}
  - phase === 'scoring': nếu now >= scoring.deadlineMs
        -> auto-accept tập dead hiện tại, tính điểm, phase='finished'
  - phase khác: no-op
  - KHÔNG dùng rng. Hoàn toàn idempotent: gọi 100 lần cùng `now` cho cùng kết quả.
```

Lịch gọi khuyến nghị: gọi `tick()` **lười** (lazy) ở đầu mỗi `apply()` và mỗi `view()`, **cộng thêm** một timer đặt đúng tại thời điểm deadline của bên đang đi (đặt lại timer sau mỗi nước). Không cần polling mỗi giây cho mọi ván — với vài nghìn ván đồng thời thì polling là lãng phí. Chỉ polling mỗi giây cho những ván đang ở byo-yomi ≤ 10s để UI đếm ngược chính xác (và phần đếm ngược đó client tự chạy được, server chỉ là trọng tài).

## Bot

## NÓI THẲNG TRƯỚC: MINIMAX KHÔNG DÙNG ĐƯỢC CHO CỜ VÂY

Đừng tái sử dụng khung alpha-beta của cờ vua/cờ tướng/caro. Hai lý do, lý do thứ hai mới là lý do chí mạng:

1. **Độ rộng nhánh**: ~250 nước hợp lệ mỗi lượt ở 19×19 (so với ~35 ở cờ vua), độ sâu ván ~250 nước.
2. **KHÔNG TỒN TẠI hàm lượng giá tĩnh đáng tin cậy.** Ở cờ vua, "đếm quân" đã cho ước lượng khá tốt. Ở cờ vây, giá trị một thế cờ phụ thuộc hoàn toàn vào **nhóm nào sống, nhóm nào chết** — mà đó lại chính là một bài toán tìm kiếm sâu. Alpha-beta depth 4 với hàm lượng giá thủ công ở cờ vây chơi **tệ hơn người mới học một tuần**. Đây là sự thật đã được ngành computer Go xác nhận suốt 30 năm (1970–2006) trước khi MCTS xuất hiện.

**Phương án: MCTS (Monte Carlo Tree Search) với UCT + RAVE + playout có tri thức.** Điểm mấu chốt: MCTS **không cần hàm lượng giá** — nó đánh giá thế cờ bằng cách chơi ngẫu nhiên tới hết ván rồi đếm ai thắng.

---

## 1. NỀN TẢNG HIỆU NĂNG (làm trước, nếu không mọi thứ vô nghĩa)

MCTS mạnh tỉ lệ thuận với số playout. Phải tối ưu bàn cờ:

- `Int8Array` phẳng cho bàn, **union-find** cho chuỗi, mỗi chuỗi lưu `(size, libertyCount, libertyHashXOR)`. Ăn quân và đếm khí thành O(α(n)) thay vì flood-fill.
- Danh sách nước trống duy trì bằng mảng + hoán vị-với-phần-tử-cuối (swap-remove) để chọn ngẫu nhiên O(1).
- Không cấp phát object trong vòng lặp playout. Tái dùng buffer. `structuredClone` là kẻ thù.
- Trong playout: **chỉ dùng kiếp đơn, bỏ superko** (tính hash mỗi nước quá đắt). Giới hạn độ dài playout `2*size*size` nước, vượt thì chấm điểm ngay.
- Chấm điểm playout bằng **area scoring (Tromp–Taylor)**: đếm quân trên bàn + ô trống chỉ do một màu chạm tới. Không cần biết sống/chết, chạy O(n), và **không thiên lệch**.

**Mục tiêu thông lượng trên 1 core Node thường (JS chậm hơn C ~3–5×):**
- 9×9: **30.000–60.000 playout/giây**
- 13×13: **10.000–20.000/giây**
- 19×19: **3.000–8.000/giây**

Nếu không đạt các con số này, quay lại tối ưu trước khi tinh chỉnh thuật toán.

## 2. VÒNG LẶP MCTS

**Selection — UCT kết hợp RAVE:**
```
β(n)  = sqrt( k / (3*n + k) )          với k ≈ 1000, n = số lượt thăm nút con
value = (1-β) * Q_uct + β * Q_rave
      + c * sqrt( ln(N_parent) / n )   với c ≈ 0.7  (thử nghiệm 0.5–1.0)
      + prior / (n + 1)
```
RAVE (Rapid Action Value Estimation, còn gọi AMAF) là **cải tiến quan trọng nhất**: thay vì chỉ cập nhật nút con đã chọn, cập nhật thống kê cho **mọi nước đã xuất hiện trong playout**. Vì gần nửa số ô được đánh ít nhất một lần trong mỗi playout, RAVE thu thập thống kê nhanh hơn UCT thuần hàng chục lần. Trên 9×9, UCT+RAVE thắng UCT thuần khoảng **73%**.

**Prior (tri thức tiên nghiệm) — cộng vào nút con khi mở rộng:**
- +0.5 nếu gần nước vừa đi (khoảng cách Manhattan ≤ 3) — cờ vây có tính cục bộ mạnh.
- +0.3 nếu bắt được quân địch / cứu được nhóm mình đang bị bắt (atari).
- −0.8 nếu đi vào dòng 1 trong 40 nước đầu (nước gần như luôn dở giai đoạn đầu).
- +0.4 nếu khớp mẫu 3×3 tốt (xem dưới).

**Expansion:** chỉ mở nút sau khi nó được thăm ≥ **8** lần. Tiết kiệm bộ nhớ đáng kể.

**Backpropagation:** cập nhật `Q_uct` cho đường đã đi, `Q_rave` cho mọi nước xuất hiện trong playout (theo màu).

**Chọn nước cuối cùng: nhánh có SỐ LƯỢT THĂM lớn nhất**, không phải win-rate cao nhất. Win-rate cao với ít lượt thăm là nhiễu.

## 3. PLAYOUT CÓ TRI THỨC (heuristic rollout)

Playout hoàn toàn ngẫu nhiên cho kết quả rất nhiễu. Thứ tự ưu tiên chọn nước trong rollout (kiểu MoGo):

1. **Cứu/bắt tại chỗ**: nếu nước trước tạo ra atari (nhóm còn 1 khí), xét các nước cứu nhóm mình hoặc ăn nhóm địch trong vùng 3×3 quanh nước trước.
2. **Khớp mẫu 3×3**: bảng tra sẵn 3^8 = 6561 cấu hình 8 ô quanh nước trước (mã hoá base-3, precompute lúc khởi động). Chọn ô khớp mẫu "tốt" nếu có.
3. **Bắt quân**: nếu có nhóm địch còn đúng 1 khí trên toàn bàn, ăn nó (xác suất ~0.9, không phải 1.0, để giữ tính đa dạng).
4. **Ngẫu nhiên đều** trên các nước hợp lệ còn lại.
5. Không còn nước → `pass`. Hai `pass` → kết thúc playout.

**LUẬT SỐNG CÒN — KHÔNG TỰ LẤP MẮT.** Rollout phải loại các nước lấp mắt thật của chính mình, nếu không mọi nhóm sống đều "chết" trong mô phỏng và đánh giá sai hoàn toàn. Kiểm tra "mắt đơn giản" cho màu C tại ô trống `p`:
```
- Mọi ô kề 4 hướng CÒN TỒN TẠI của p đều là quân màu C.
- Đếm `bad` = số ô CHÉO của p thuộc màu đối phương.
- Nếu p ở biên hoặc góc (có ít nhất 1 ô chéo nằm ngoài bàn): yêu cầu bad === 0.
- Nếu p ở giữa bàn (đủ 4 ô chéo):                              yêu cầu bad <= 1.
```
Điều kiện biên/góc **khác** giữa bàn — đây là bug kinh điển, phải viết unit test riêng cho cả 4 góc và 4 cạnh.

## 4. NGẪU NHIÊN & TÍNH XÁC ĐỊNH

MCTS gọi ngẫu nhiên hàng **triệu** lần mỗi nước. Gọi thẳng `rng` của server qua interface sẽ chậm gấp hàng chục lần và làm hỏng bộ đếm replay.

**Giải pháp bắt buộc:** đầu mỗi nước của bot, gọi `rng()` **đúng một lần** để lấy `seed64`, ghi `seed64` vào `history[n].botSeed`, rồi bot dùng **xorshift128+ hoặc PCG32 cục bộ** khởi tạo từ `seed64`. Vẫn replay chính xác 100%, chỉ tốn 1 lần gọi `rng`. Client vẫn không tự gieo gì.

Lưu ý: tính xác định chỉ giữ được nếu bot chạy **single-thread mỗi ván** (nhiều thread cùng chia sẻ một cây MCTS thì thứ tự cập nhật không xác định). Chấp nhận: 1 worker xử lý 1 nước, không parallel MCTS.

## 5. NGÂN SÁCH & CHỐNG TREO

- Trần cứng **800ms** (chừa 200ms cho serialize/mạng của giới hạn 1s).
- Kiểm tra `Date.now()` mỗi **256 playout** (kiểm tra mỗi playout thì chính `Date.now()` trở thành nút thắt).
- **Bắt buộc có thêm trần theo SỐ playout**, không chỉ theo thời gian — máy chủ bị quá tải có thể làm trần thời gian bị vượt ngay trước khi kiểm tra.
- **BẮT BUỘC chạy bot trong `worker_threads`** (một pool cỡ `os.cpus().length - 1`). 800ms tính toán thuần chặn event loop sẽ làm **mọi ván khác trên cùng process đứng hình**. Không có ngoại lệ. Nếu vì lý do nào đó phải chạy trên main thread, phải chia nhỏ bằng `setImmediate` mỗi 20ms — chậm hơn ~15% nhưng không chặn.

## 6. BA MỨC ĐỘ KHÓ

Hạ cấp **không** bằng cách cho bot đi bừa ngẫu nhiên hoàn toàn (người chơi nhận ra ngay và thấy nhàm). Hạ cấp bằng **ngân sách + tắt tri thức + nhiễu có kiểm soát**:

| | **DỄ** | **VỪA** | **KHÓ** |
|---|---|---|---|
| Ngân sách | 1.500 playout / 80ms | 12.000 playout / 350ms | trần đầy 800ms (≥40k ở 9×9) |
| RAVE | tắt | bật | bật |
| Heuristic bắt quân trong rollout | tắt | bật | bật |
| Mẫu 3×3 | tắt | tắt | bật |
| Prior | tắt | chỉ prior khoảng cách | đầy đủ |
| Nhiễu chọn nước | ε = 0.30, chọn ngẫu nhiên trong top-10 | ε = 0.08, top-5 | ε = 0 |
| "Quên" nước bắt quân hiển nhiên | xác suất 0.15 | 0 | 0 |
| Progressive widening | tắt | tắt | bật |
| Ngưỡng xin thua | không bao giờ xin thua | win-rate < 8% | win-rate < 10% |

**Sức mạnh kỳ vọng (thẳng thắn):**
- 9×9: Dễ ~25–20 kyu · Vừa ~12–8 kyu · Khó ~5–1 kyu
- 13×13: Dễ ~25 kyu · Vừa ~15–12 kyu · Khó ~8–5 kyu
- **19×19: Khó chỉ khoảng 12–8 kyu.** Đủ vui cho người mới, **không đủ** cho người chơi trung cấp trở lên. MCTS thuần không mở rộng tốt lên 19×19.

Ngoài ra nên cho bot **chấp quân** ở mức Dễ: bot cầm Trắng, người chơi cầm Đen với 4–9 quân chấp. Đây là cách cân bằng tự nhiên của cờ vây và tốt hơn nhiều so với làm bot chơi ngu.

## 7. NẾU MUỐN MẠNH THẬT Ở 19×19

Phải dùng **mạng nơ-ron (policy + value)**. Không có đường tắt nào khác.

Phương án thực tế nhất: nhúng một mạng nhỏ (KataGo `b6c96` hoặc `b10c128`, cỡ 5–20MB) chạy qua `onnxruntime-node` trên CPU. Một lần forward ~5–15ms → MCTS chỉ **50–150 nút mỗi nước** vẫn mạnh hơn nhiều so với 40.000 playout thuần, và ở 19×19 có thể đạt mức ~3–5 dan nghiệp dư.

Nhưng khi đó bot **không còn là hàm TypeScript thuần** nữa (có native binding, có model file, có yêu cầu RAM). **Khuyến nghị kiến trúc:** tách bot thành microservice riêng, engine chỉ gọi qua interface `botMove(publicState, level, deadlineMs) -> Action`. Engine luật vẫn thuần và vẫn là nguồn sự thật — bot chỉ đề xuất action, engine vẫn validate như với người thường. Làm vậy thì sau này thay bot MCTS bằng bot neural không cần đụng vào engine.

## 8. BOT Ở PHA ĐẾM ĐIỂM

Bot cũng phải biết đánh dấu quân chết và biết khi nào không nên chấp nhận:
- Chạy Benson + 300 playout thống kê sở hữu (mục 8 phần luật) → tập `dead` của riêng bot.
- Bot `accept_score` **chỉ khi** điểm theo tập `dead` của đối phương **không tệ hơn** ước lượng của chính nó quá **2 điểm**.
- Nếu tệ hơn → `request_resume` **một lần** và đánh tiếp để chứng minh. Không resume lần hai (tránh làm phiền người chơi).
- Nếu đã resume rồi mà vẫn bất đồng → `accept_score`. Thà thua vài điểm còn hơn treo ván.

### Chỗ bot dễ hỏng

**1. Bot pass sớm và thua oan — lỗi nghiêm trọng nhất.** MCTS tối ưu **xác suất thắng**, không tối ưu số điểm. Khi đang thắng chắc, mọi nước đều cho win-rate ~0.99 nên bot chọn bừa, kể cả `pass` hoặc nước phá đất của chính nó. Ở luật Nhật (đếm đất) những nước bừa đó **mất điểm thật** và có thể lật ngược ván. Khắc phục bắt buộc: (a) chạy Benson, **cấm bot đi vào vùng đất mà nhóm mình đã pass-alive**; (b) chỉ cho `pass` khi `số dame còn lại === 0` **hoặc** `winrate(pass) >= winrate(best) - 0.02`; (c) khi win-rate > 0.95, đổi tiêu chí chọn nước sang "tối đa hoá điểm trung bình" thay vì "tối đa hoá win-rate".

**2. Bot tự lấp mắt trong rollout → đánh giá sai toàn bộ.** Không có kiểm tra mắt thì mọi nhóm sống đều bị "ăn" trong mô phỏng, giá trị thế cờ trở thành rác. Và điều kiện mắt ở **biên/góc khác ở giữa bàn** (góc chỉ cho phép 0 ô chéo địch, giữa bàn cho phép 1) — sai chỗ này bot sẽ chơi rất lạ ở 4 góc. Phải có unit test riêng cho cả 4 góc, 4 cạnh, và tâm bàn.

**3. Playout chạy vô hạn → treo worker → treo ván.** Hai bên ăn qua lại trong kiếp mãi không dừng. Bắt buộc: luật kiếp đơn có hiệu lực trong rollout, **và** trần cứng `2*size*size` nước cho mỗi playout (vượt thì chấm điểm ngay tại chỗ, không bỏ playout).

**4. Nổ bộ nhớ cây MCTS.** Mỗi nút giữ mảng con tới 362 phần tử; 40.000 playout ở 19×19 dễ ngốn hàng trăm MB, và với 500 ván đồng thời thì server chết. Bắt buộc: `struct-of-arrays` bằng `Int32Array`/`Float32Array` thay vì object JS; pool tái sử dụng giữa các nước; ngưỡng expansion ≥ 8. Việc tái dùng cây giữa các nước cho thêm ~20–30% sức mạnh nhưng nếu RAM căng thì **bỏ đi, đừng tiếc**.

**5. Chặn event loop Node.** 800ms tính toán đồng bộ trên main thread làm đứng hình **mọi ván khác** trên cùng process, kể cả ván người-với-người. Đây là lỗi kiến trúc, không phải lỗi tinh chỉnh. `worker_threads` là bắt buộc, không thương lượng.

**6. Gọi `rng` của server hàng triệu lần.** Chậm gấp hàng chục lần, và làm `rngCallCount` phình khiến replay/kiểm chứng không dùng được. Bắt buộc rút một seed con mỗi nước (xem mục 4 của botApproach).

**7. Mức "Dễ" vẫn quá mạnh nếu chỉ giảm playout.** MCTS 1.500 playout ở bàn 9×9 đã cỡ ~15 kyu — thừa sức thắng người mới, làm hỏng trải nghiệm onboarding. Phải kèm **tắt heuristic + nhiễu ε + "quên" nước bắt quân** như bảng ở botApproach, và **phải test với người thật**, đừng tin ước lượng trên giấy.

**8. Bot không hiểu seki và tự phá seki của mình.** Vì rollout chấm điểm theo area scoring, bot không phân biệt "đi vào khí chung của seki" là nước tự sát chiến lược. Ở luật Nhật, một nước như vậy làm chết cả nhóm mình. Khắc phục: phát hiện seki bằng Benson + khí chung, **đánh dấu các khí chung đó là nước bị cấm cho bot** trong 50 nước cuối ván; và khi không còn nước nào tăng diện tích thì ép bot `pass`.

**9. Bot đánh dấu sống/chết sai ở pha đếm điểm và tự chấp nhận thua.** Đối thủ không trung thực có thể đánh dấu cả một nhóm sống của bot là "chết" rồi bấm accept, và bot cũng accept theo. Đây là **lỗ hổng gian lận thật, không phải lỗi bot chơi dở**. Bắt buộc: bot phải chạy auto-score của riêng nó và chỉ accept khi chênh lệch ≤ 2 điểm, ngược lại `request_resume`. Cũng nên: engine **từ chối** (hoặc cảnh báo đỏ trên UI) việc đánh dấu chết một chuỗi **pass-alive theo Benson** — chuỗi đó chắc chắn sống về mặt toán học.

**10. Bot ở ván chấp chơi như ván bình thường.** Khi cầm Trắng và bị chấp 9 quân, MCTS thấy win-rate ~5% ngay từ nước 1 và bắt đầu chơi bừa hoặc xin thua sớm. Khắc phục: **tắt logic resign khi `config.handicap >= 4`**, và dời điểm neo đánh giá (thay vì so với 0.5, so với win-rate kỳ vọng của thế chấp đó) để bot vẫn chọn nước tốt nhất tương đối.

**11. Bot chơi quá nhanh làm người chơi khó chịu.** MCTS ở 9×9 mức Dễ trả lời trong 80ms — cảm giác như bot không nghĩ. Thêm **delay nhân tạo**: `max(0, 600ms + rand(0..900ms) - thời_gian_thực_tế)`, và delay dài hơn ở những nước có nhiều lựa chọn gần ngang nhau (giả lập "nghĩ lâu"). Delay này ở tầng dịch vụ, **không** ở trong engine thuần.

**12. Không có bộ test đối chứng.** Cờ vây có nhiều bug âm thầm (kiếp sai, khí đếm sai ở góc, superko sai sau undo) mà bot vẫn chơi được nên không ai phát hiện. Bắt buộc: (a) bộ test luật từ các file SGF thật — replay 1.000 ván chuyên nghiệp, mọi nước phải hợp lệ; (b) test đối xứng — xoay/lật bàn 8 cách, engine phải cho cùng kết quả; (c) test đếm điểm — lấy 200 ván có kết quả đã biết từ SGF, điểm engine tính phải khớp; (d) cho bot tự đánh với chính nó 5.000 ván, không được có ván nào crash, treo, hay kết thúc bằng `no_result` khi đang bật superko.

## Cạm bẫy khi cài đặt

- THỨ TỰ GIẢI QUYẾT NƯỚC ĐI: phải ăn quân địch TRƯỚC rồi mới xét tự sát của mình. Làm ngược lại sẽ cấm nhầm nước 'đặt vào ô không khí nhưng ăn được quân' — nước này hoàn toàn hợp lệ và xuất hiện thường xuyên (điền mắt cuối của nhóm địch).
- ĐẾM KHÍ TRÙNG LẶP: khí của một chuỗi phải đếm SỐ GIAO ĐIỂM TRỐNG DUY NHẤT, không phải tổng số cặp (quân, ô trống kề). Một ô trống kề 3 quân trong cùng chuỗi chỉ tính 1 khí. Bug này làm nhóm không bao giờ bị ăn.
- koPoint PHẢI ĐƯỢC XOÁ SAU MỌI NƯỚC, kể cả sau một nước pass. Quên xoá sau pass là bug âm thầm: đối phương pass xong mà mình vẫn bị cấm ăn lại kiếp.
- SNAPBACK bị cấm nhầm: nếu chỉ kiểm tra 'ăn đúng 1 quân' mà bỏ hai điều kiện còn lại (nhóm vừa đặt có đúng 1 quân VÀ đúng 1 khí) thì snapback sẽ bị chặn sai. Phải đủ cả ba vế.
- BẢNG ZOBRIST SINH TỪ rng CỦA VÁN: state serialize ra rồi load ở process khác sẽ có bảng khác -> superko sai hoàn toàn và không ai phát hiện cho tới khi có tranh chấp. Bảng Zobrist phải sinh từ hằng seed biên dịch cứng trong code.
- UNDO KHÔNG POP positionKeys: undo mà chỉ khôi phục bàn cờ, quên pop mảng hash, sẽ làm superko cấm nhầm những nước hợp lệ suốt phần còn lại của ván.
- ĐIỀU KIỆN MẮT Ở BIÊN/GÓC khác ở giữa bàn: giữa bàn cho phép 1 ô chéo thuộc địch, biên/góc phải 0. Sai chỗ này thì rollout của bot hỏng ở 4 góc và bot chơi rất lạ. Bắt buộc unit test riêng cho 4 góc, 4 cạnh, tâm bàn.
- SEKI Ở LUẬT NHẬT: quên loại đất kề nhóm song hoạt sẽ tính dư điểm cho một bên và lật ngược kết quả ván. Đây là lỗi tính điểm phổ biến nhất khi cài JP scoring. (Luật Trung không có vấn đề này -- một lý do nữa để ship CN trước.)
- reset scoringAccepted KHI TOGGLE: nếu một bên accept rồi bên kia toggle mà không reset accept của bên đầu, ván sẽ kết thúc với tập dead mà bên đầu chưa từng đồng ý. Đây là lỗ hổng GIAN LẬN THẬT, không phải lỗi cosmetic.
- accept_score KHÔNG KIỂM deadHash: race condition khi hai người thao tác gần đồng thời -- client accept một tập dead vừa bị đối phương đổi. Phải so hash và trả STALE_DEAD_MARKS.
- KHÔNG CÓ TIMEOUT Ở PHA SCORING: đối thủ đóng trình duyệt ở pha đếm điểm sẽ treo ván vĩnh viễn. Bắt buộc phải có auto-accept theo deadline.
- ĐỒNG HỒ VÁN CHẠY TRONG PHA SCORING: người chơi bị xử thua hết giờ trong lúc đang thương lượng -- cực kỳ ức chế và hoàn toàn sai luật. Phải đóng băng đồng hồ ván, chỉ chạy scoring deadline.
- QUỸ GIỜ KHÔNG ĐƯỢC KHÔI PHỤC KHI RESUME: sau khi thương lượng 60s rồi resume, nếu trừ 60s đó vào giờ người chơi thì họ bị phạt vì đối phương không đồng ý. Phải khôi phục nguyên vẹn.
- BYO-YOMI TRỪ NHẦM HIỆP KHI ĐI KỊP: đi 29s trong hiệp 30s thì KHÔNG mất hiệp và hiệp được nạp lại đầy. Cài sai thành 'mỗi nước mất 1 hiệp' là phá hoàn toàn cơ chế byo-yomi.
- BYO-YOMI KHÔNG XỬ LÝ MẤT NHIỀU HIỆP MỘT LÚC: nghĩ 75s với hiệp 30s phải mất đúng 2 hiệp (ceil(75/30)-1), không phải 1 và cũng không phải thua ngay.
- NHẦM TỌA ĐỘ GTP / SGF / NỘI BỘ: GTP bỏ chữ I và đánh số hàng từ dưới lên; SGF dùng a..s gốc trên-trái. Ba hệ tọa độ khác nhau. Import SGF sai trục y là bug im lặng -- ván vẫn replay 'được' nhưng lật ngược bàn cờ. Phải test round-trip.
- THỨ TỰ ĐẶT QUÂN CHẤP SAI: H=5 và H=7 có thiên nguyên (K10), H=6 và H=8 thì KHÔNG. Đặt sai không gây crash nhưng người chơi biết cờ sẽ nhận ra ngay và mất niềm tin.
- KOMI Ở VÁN CHẤP THEO LUẬT TRUNG: quên bù H điểm cho Trắng làm Đen được lợi kép (vừa có quân chấp vừa có thêm H điểm diện tích). Luật Nhật thì không cần bù.
- CHẠY BOT TRÊN MAIN THREAD: 800ms tính toán đồng bộ làm đứng hình MỌI ván khác trên cùng process, kể cả ván người-với-người. Lỗi kiến trúc, phát hiện muộn thì phải viết lại tầng dịch vụ.
- CÂY MCTS KHÔNG GIỚI HẠN BỘ NHỚ: 500 ván đồng thời × cây 19×19 không nén = OOM. Dùng struct-of-arrays + ngưỡng expansion + pool tái sử dụng.
- PLAYOUT KHÔNG CÓ TRẦN ĐỘ DÀI: hai bên ăn qua lại trong kiếp mãi -> worker treo -> ván treo. Trần cứng 2*size*size nước cho mỗi playout.
- KHÔNG CÓ maxMoves: dù rất hiếm, phải có chốt chặn cứng để ván không bao giờ chạy vô hạn.
- LỘ ƯỚC LƯỢNG ĐIỂM Ở VÁN XẾP HẠNG: cờ vây không có thông tin ẩn nhưng score estimate là TRỢ GIÚP. Bật mặc định ở ván xếp hạng là sai về mặt thể thao.
- KHÔNG CÓ BỘ TEST ĐỐI CHỨNG SGF: cờ vây có rất nhiều bug âm thầm (kiếp sai, khí sai ở góc, superko sai sau undo) mà ván vẫn chơi được nên không ai phát hiện tới khi có tranh chấp xếp hạng. Bắt buộc: replay 1000 ván SGF thật (mọi nước phải hợp lệ), test bất biến khi xoay/lật bàn 8 cách, và 200 ván có kết quả biết trước để đối chiếu điểm.

## Mỹ thuật riêng của game này

## "SƯƠNG SỚM TRÊN MẶT HỒ" — tối giản thiền Á Đông đương đại

Đây là game **trầm nhất, tĩnh nhất, ít màu nhất** của cả nền tảng. Nguyên tắc chỉ đạo: **giảm đi, đừng thêm vào.** Mọi game khác trong nền tảng đều có thể ồn ào; cờ vây thì không. Người chơi cờ vây nhìn bàn cờ liên tục 30–60 phút — bất kỳ chi tiết thừa nào cũng thành gai mắt.

### Chất liệu
- **Mặt bàn: gỗ kaya nhạt**, gần như màu giấy ngà. Vân gỗ **dọc, cực mảnh, độ tương phản < 4%** — chỉ thấy khi zoom, ở cỡ bình thường trông như giấy mịn. Tuyệt đối không phải gỗ nâu đỏ bóng loáng (đó là địa hạt của cờ tướng).
- **Đường kẻ: nét mực nho hairline**, dày đúng `1px` ở 1× (dùng `0.5px` ở 2×, vẽ bằng canvas/SVG chứ không phải ảnh, để sắc nét mọi DPI). Màu mực **loãng, không đen tuyền**. Lưới phải "gần như tan biến" — đây là điểm phân biệt thị giác quan trọng nhất với cờ caro (caro dùng lưới đậm, ô vuông rõ, giấy kẻ ô học sinh).
- **Quân đen: đá slate mài mờ**, không bóng gương. Highlight lệch 30° rất nhẹ.
- **Quân trắng: vỏ sò clamshell**, ngà ấm, có **vân sọc cong cực mảnh** (3–4 biến thể để bàn cờ không trông như copy-paste).
- **Đổ bóng: rất mềm, blur lớn, opacity thấp, offset gần bằng 0.** Quân phải trông như **đặt lên mặt bàn**, không phải **nổi lên trên** nó. Đây là chi tiết tinh tế nhưng quyết định toàn bộ cảm giác cao cấp.
- **Hũ đựng quân: gốm men celadon** (xanh ngọc nhạt) ở hai góc dưới, hé nắp, hiển thị số quân đã ăn.

### Bảng màu

**Chế độ sáng**
```
Mặt bàn            #EFE3CC   (kaya nhạt)
Viền bàn           #D9C7A5
Đường kẻ           #6B5B4A @ 55%
Điểm sao (hoshi)   #4A3C2E   chấm r = 2.5px
Quân đen           gradient #2B2B2E -> #16161A ; highlight #4A4A52 @ 25%
Quân trắng         gradient #FCFAF4 -> #E6DFD2 ; viền trong #CFC6B4
Nền ngoài bàn      gradient sương #F6F2EA -> #E9E4DA + vignette rất nhẹ
Nhấn nước vừa đi   vòng tròn rỗng 1.5px, màu tương phản với quân (trắng trên đen, đen trên trắng)
Đất của Đen        phủ #2B2B2E @ 12%
Đất của Trắng      phủ #FCFAF4 @ 55% + viền mảnh #CFC6B4
Dame (trung lập)   gạch chéo #6B5B4A @ 20%
Quân chết          dấu X mảnh #8A7A66 + quân giảm opacity còn 40%
Cảnh báo byo-yomi  #3A5F7D (xanh mực) -- KHÔNG dùng đỏ
```

**Chế độ tối** — không phải "đảo màu", mà là đổi chất liệu sang **đá phiến**
```
Mặt bàn            #262A2E   (slate)
Đường kẻ           #8A8F96 @ 40%
Quân trắng         giữ nguyên sáng (#FCFAF4)
Quân đen           #0D0F12 + viền sáng 1px #4A5058 để tách khỏi nền
Nền ngoài           #14171A
```

### Chuyển động — tối đa 300ms, không bao giờ nảy
- **Đặt quân:** scale `0.85 → 1.0` trong **120ms ease-out**, kèm **một gợn sóng tròn** lan ra 300ms, opacity `0.18 → 0`. Một gợn, không phải ba.
- **Ăn quân:** quân mờ dần và **trôi nhẹ về phía hũ đựng** của người ăn, 220ms ease-in. Không nổ, không hạt, không rung màn hình.
- **Chuyển lượt:** hũ quân của bên đang đi sáng nhẹ lên (glow 4px, 400ms). Không có mũi tên, không có chữ "Lượt của bạn" nhấp nháy.
- **Byo-yomi:** khi còn ≤ 5s, số giây **thở nhẹ** (scale 1.0 ↔ 1.06, chu kỳ 1s). Không đổi màu đỏ, không rung.

### Âm thanh
- Tiếng **"cạch" gỗ khô** khi đặt quân — 3 mẫu ngẫu nhiên, pitch lệch ±5%, để 200 nước không nghe như máy.
- Tiếng **hạt cờ rơi vào bát sứ** khi ăn quân (nhiều quân → nhiều tiếng xen kẽ 30ms).
- Tiếng **mõ gỗ nhỏ** cho byo-yomi ≤ 5s, một tiếng mỗi giây.
- Không nhạc nền. Nếu có, chỉ tiếng nước/gió rất nhỏ, mặc định TẮT.

### Chữ
- Số nước, tọa độ, điểm số: **serif thanh** (Noto Serif / Source Han Serif), cỡ nhỏ, `letter-spacing` rộng.
- Tên người chơi, nút, menu: **sans nhẹ** (Be Vietnam Pro 400/500) — đảm bảo dấu tiếng Việt đẹp.
- **Cấp bậc (kyu/dan): con dấu triện vuông mực đỏ son** `#A93226` — **đây là chi tiết đỏ DUY NHẤT** trong toàn bộ game, chính vì hiếm nên nó đắt giá. (Đỏ diện rộng dành cho cờ tướng.)

### PHÂN BIỆT RÕ VỚI CÁC GAME KHÁC TRONG NỀN TẢNG
- **vs cờ caro** (cũng là lưới): caro chơi **trong ô**, cờ vây chơi **trên giao điểm**. Caro = giấy kẻ ô xanh lam + nét bút bi, lưới đậm. Cờ vây = gỗ + mực, lưới hairline gần như vô hình. Hai game phải nhận ra ngay từ ảnh thumbnail.
- **vs cờ tướng**: cờ tướng dùng đỏ-vàng-nâu đậm, quân tròn khắc chữ Hán. Cờ vây **không dùng đỏ** (trừ con dấu triện), **không có chữ trên quân**.
- **vs ô ăn quan**: ô ăn quan là đất nện, sỏi, sân gạch quê — chất liệu **thô, ấm, dân dã**. Cờ vây là gỗ mài, đá mài, gốm men — chất liệu **mịn, lạnh, tinh xảo**.
- **vs cá ngựa / cờ tỷ phú**: hai game đó rực rỡ, nhiều màu, nhựa bóng. Cờ vây là game **duy nhất dưới 6 màu** trên toàn bộ màn hình.
- **vs cờ vua**: cờ vua dùng đá marble tương phản cao, ô vuông đen-trắng rõ. Cờ vây gần như đơn sắc ngà, không có ô.

### Asset tối thiểu

- Texture gỗ kaya tileable 2048×2048 WebP (+PNG fallback) — vân dọc cực mảnh, tương phản <4%; kèm biến thể slate tối cho dark mode
- Sprite quân ĐEN slate 512px PNG alpha — 1 base + 3 biến thể vân/highlight nhẹ (tránh bàn cờ trông như copy-paste)
- Sprite quân TRẮNG clamshell 512px PNG alpha — 4 biến thể vân sọc vỏ sò
- Soft shadow radial 256px alpha PNG (một file dùng chung cho cả hai màu quân, tint bằng CSS)
- Lưới bàn cờ: KHÔNG dùng ảnh — vẽ bằng Canvas2D/SVG từ config {size, lineWidth, lineColor, hoshiRadius} để sắc nét mọi DPI và mọi kích thước bàn 9/13/19
- Hũ đựng quân gốm men celadon (thân + nắp hé) 512px, 2 biến thể góc trái/phải
- Marker SVG: vòng tròn nước vừa đi, dấu X quân chết, ô vuông nhỏ đánh dấu đất, gạch chéo dame, số thứ tự nước (dùng khi ôn tập ván)
- Bộ chữ/số overlay lên quân cho chế độ review và bài tập tsumego (A-Z, 1-999, hai màu tương phản)
- Hiệu ứng ripple: một vòng tròn SVG + keyframe CSS (không cần asset ảnh, không dùng particle system)
- Âm thanh stone_place_1/2/3.ogg+m4a — tiếng gõ gỗ khô, 3 mẫu, ~120ms
- Âm thanh stone_capture_1/2.ogg+m4a — hạt cờ rơi vào bát sứ
- Âm thanh byoyomi_tick.ogg (mõ gỗ nhỏ), period_lost.ogg, pass.ogg, game_end.ogg, resign.ogg
- Font: Noto Serif (latin-ext + vietnamese) 400/600 cho số & tọa độ; Be Vietnam Pro 400/500 cho UI — subset chỉ ký tự cần dùng
- Huy hiệu cấp bậc: con dấu triện vuông mực son #A93226, 20 biến thể (30 kyu → 9 dan), SVG
- Nền sương: 2 file gradient-mesh SVG (sáng/tối) + vignette overlay
- Icon UI SVG (nét mảnh 1.5px, đồng bộ một bộ): pass, resign, đếm điểm, ước lượng điểm, tua lại/tiến tới, xuất SGF, chấp quân, tạm dừng, cài đặt
- 5 diagram hướng dẫn SVG sinh tự động từ SGF: khí, ăn quân, hai mắt, kiếp (ko), song hoạt (seki)
- Bộ SGF mẫu: 20 ván 9×9 và 10 ván 19×19 đã chú giải, dùng cho tutorial và cho bộ test đối chứng engine
- Bộ tsumego (bài tập sống-chết) khởi điểm: 60 bài 9×9 ba mức, định dạng SGF có đáp án — dùng cho chế độ luyện tập ngoài đấu
- Ảnh thumbnail/cover game 1200×630 — phải nhìn thấy rõ GIAO ĐIỂM và quân đá/vỏ sò để không bị nhầm với cờ caro trong danh sách game

## Ước lượng công sức

**Cờ vây là game TỐN CÔNG NHẤT trong 9 game của nền tảng.** Khoảng **gấp 2,5–3 lần** cờ vua/cờ tướng, **gấp 5–8 lần** cờ caro/ô ăn quan/cờ gánh. Tôi nói điều này thẳng vì nếu lập kế hoạch sai ở đây thì cả nền tảng trượt lịch.

Điều nghịch lý: **luật đi quân của cờ vây đơn giản nhất trong 9 game** (~200 dòng, không có nhập thành, không có phong hậu, không có 16 loại quân). Công sức nằm ở 4 chỗ mà **không game nào khác có**:

1. **Pha thương lượng sống/chết** (~30% công sức). Một state machine riêng với toggle, reset accept chéo, timeout auto-accept, resume-về-pha-chơi, giới hạn chống lạm dụng, cộng một màn UI hoàn toàn riêng. Không có game nào khác trong nền tảng có pha "hai người phải đồng ý về một thứ" — kể cả cờ vua chỉ có offer draw đơn giản.
2. **Auto-score** (~15%). Benson + playout thống kê sở hữu + phát hiện seki. Đây là một module thuật toán độc lập, không tái dùng được gì.
3. **Bot MCTS + 3 mức + worker pool** (~35%). **Không tái dùng được một dòng nào** từ minimax của cờ vua/cờ tướng/caro. Phải viết lại từ đầu: bàn cờ tối ưu union-find, UCT+RAVE, rollout có tri thức, bảng mẫu 3×3, quản lý bộ nhớ cây, worker pool.
4. **Byo-yomi** (~10%). Hệ giờ phức tạp hơn mọi game khác (Fischer/absolute của cờ vua là 20 dòng; byo-yomi có nạp-lại-hiệp, mất-nhiều-hiệp-một-nước, đóng băng khi scoring, khôi phục khi resume).

**Ước lượng chi tiết (1 lập trình viên full-stack quen việc):**

| Hạng mục | Ngày-người |
|---|---|
| Engine luật (bàn, chuỗi, khí, ăn, tự sát, kiếp, superko Zobrist) | 2–3 |
| Ván chấp + SGF import/export + bộ test đối chứng SGF | 2 |
| Pha scoring: state machine + Benson + auto-score + seki + tính điểm JP & CN | 3–4 |
| Byo-yomi + Canadian + tick + tạm dừng khi mất kết nối | 1,5–2 |
| Bot MCTS: bàn tối ưu, UCT+RAVE, rollout, 3 mức, worker pool, tuning | 5–7 |
| UI bàn cờ (giao điểm, zoom, đặt quân chính xác trên mobile, review/tua ván) | 3–4 |
| UI pha đếm điểm (đánh dấu chết, hiển thị đất, dame, seki, đồng thuận) | 1,5–2 |
| **Tổng** | **18–24 ngày-người** |

**Cách cắt xuống còn 8–10 ngày (khuyến nghị mạnh cho v1):**
- Chỉ ship **luật Trung Quốc (area scoring)** + bàn **9×9 và 13×13**.
- Với area scoring, người chơi **đánh tới cùng** (ăn hết quân chết thật sự rồi mới pass) nên **bỏ được toàn bộ pha thương lượng sống/chết**, **bỏ được logic seki**, **bỏ được cả nửa module auto-score**. Nếu hai bên không đồng ý → chỉ cần resume đánh tiếp, không cần trọng tài.
- Bot MCTS ở 9×9/13×13 vừa **mạnh hơn đáng kể** (MCTS mở rộng tốt trên bàn nhỏ) vừa **rẻ CPU hơn** ~5 lần so với 19×19.
- 9×9 là bàn nhập môn tốt nhất cho người Việt mới chơi, ván 10–15 phút, hợp với nền tảng casual.

**v2** mới thêm luật Nhật + bàn 19×19 + pha thương lượng đầy đủ. Phần này chiếm quá nửa tổng công sức và nên được lên lịch như một milestone riêng, không nhét chung với 8 game kia.

**Rủi ro lịch lớn nhất:** tuning bot. Code MCTS chạy được trong 3 ngày, nhưng để 3 mức khó **thực sự khác nhau và đúng như quảng cáo** thì phải chơi hàng trăm ván thử với người thật. Hãy dành riêng 2–3 ngày cho việc này và đừng cắt.
