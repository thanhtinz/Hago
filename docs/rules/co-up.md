# Cờ Úp — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-up`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | True |
| Thông tin ẩn | True |
| Độ khó cài đặt | 3/5 |

# CỜ ÚP (Mystery Xiangqi / 揭棋 jieqi) — đặc tả luật đầy đủ để cài engine

## 0. NGUỒN THAM KHẢO VÀ CHỖ CÁC NGUỒN MÂU THUẪN

Egress proxy của môi trường chặn WebFetch tới vi.wikipedia.org, gamevh.net, zigavn.com, vn.xiangqi.com, kyvuong.mobi, zh.wikipedia.org — nên phần dưới được tổng hợp từ **nội dung tóm tắt của kết quả tìm kiếm** trên các nguồn đó, không phải từ bản đầy đủ. Đã đối chiếu ≥2 nguồn cho từng điểm.

Nguồn đã dùng:
- (VN1) Wikipedia tiếng Việt "Cờ úp"
- (VN2) gamevh.net — "Hướng dẫn chơi cờ úp"
- (VN3) zigavn.com/co-up/huong-dan-luat-choi + zigavn.com/cotuong/luat-co-tuong
- (VN4) vn.xiangqi.com, kyvuong.mobi/co-up/luat-co-up, thuthuatchoi.com, xtmobile.vn, thegioididong.com
- (CN1) Wikipedia tiếng Trung "揭棋"
- (CN2) image.qqchess.qq.com — trang luật揭棋 của Thiên Thiên Tượng Kỳ (Tencent)
- (CN3) blog.csdn.net/qq_36591160/article/details/147163413 — "揭棋玩法详细介绍"
- (CN4) jieqiguize.cam, jingyan.baidu.com
- (EN1) arXiv 2112.02989 "On the complexity of Dark Chinese Chess"; GitHub hefengfan0615/AB-JChess (engine NNUE揭棋); GitHub universe-st/Jieqi

### Bốn chỗ các nguồn MÂU THUẪN NHAU — phải chốt bằng config, không được đoán:

**(M1) Thứ tự "đi rồi lật" vs "lật rồi đi".**
- Đa số và chuẩn thi đấu (VN1, VN2, CN1, CN2, CN3): **đi trước theo luật của Ô mà quân đang đứng, đi xong mới bắt buộc lật ngửa**. VN1 nguyên văn: *"Với nước đi đầu tiên, các quân cờ đang úp phải di chuyển đúng theo vị trí mà nó đang chiếm giữ… Quân cờ đó sẽ được lật ngửa để xem thực tế quân đó là quân gì."* CN3: *"暗子走子完毕后，必须翻开成为明子"*.
- Thiểu số (VN4 — xtmobile, thuthuatchoi): *"người chơi lựa chọn quân cờ nào thì sẽ lật lên xem quân cờ đó tên gì và đi theo cách đi thông thường của nó"* — tức **lật trước rồi đi theo quân thật**. Đây là biến thể sai lệch, phổ biến ở bài viết SEO chép lại nhau.
- → Mặc định `revealTiming = 'move-then-reveal'`. Có flag cho biến thể kia vì khác biệt rất lớn về chiến thuật.

**(M2) Sĩ/Tượng sau khi lật có còn bị giới hạn cung/sông không.**
- VN3, VN4, CN1, CN2, CN3 đều thống nhất: **KHÔNG còn bị giới hạn**. Nguyên văn CN: *"揭棋的相（象）和仕（士）允许过河"*, *"象不受河界限制，可以走田脚各个位置"*, *"士…可以过河，只要是一格的邻方都可以走"*. Bản VN: *"sĩ và tượng sau khi lật đi tự do toàn bàn — không bị cung/sông giới hạn"*.
- Có luật nhà (house rule) ở vài chiếu cờ VN giữ nguyên hạn chế → Sĩ lật ra ngoài cung thành quân chết. Không nguồn online nào dùng.
- → Mặc định `freeAdvisorElephant = true`.

**(M3) Quân úp bị ăn thì ai được nhìn danh tính.** Ba đáp án khác nhau:
- (a) **Không ai nhìn**: CN1/CN3 — *"暗子被吃后，吃子方需要将该暗子背面朝上放置，被吃子的一方不能翻看"*.
- (b) **Chỉ bên ăn nhìn được**: CN2 (Thiên Thiên Tượng Kỳ) — *"A吃掉B的暗子，暗子对A可见对B不可见"*.
- (c) **Cả hai nhìn được**: phần lớn app VN (Ziga, Kỳ Vương) hiển thị khay quân bị ăn có danh tính.
- → `capturedHiddenVisibility: 'none' | 'captor' | 'both'`, mặc định `'captor'` (theo nền tảng đông người chơi nhất). Đây là quyết định **có ảnh hưởng trực tiếp tới `view()`** và tới độ mạnh của bot.

**(M4) Số nước hoà không ăn quân.** CN2 (揭棋): 40 hồi hợp. Luật cờ tướng VN (VN3): 60 hồi hợp cờ chậm, 50 cờ nhanh. → `noProgressLimitPlies` config, mặc định 120 ply (60 hồi hợp), đồng thời **reset khi lật quân** (xem §7.5) — cờ úp có thêm "tiến triển" mà cờ tướng không có.

**(M5) Quân úp có chiếu tướng được không.** Không nguồn nào nói thẳng câu này, nhưng mọi nguồn đều nói *"暗子按其所在位置的棋子走法走子、吃子"* (quân úp **ăn quân** theo luật của ô nó đứng). Ăn Tướng cũng là ăn quân ⇒ quân úp chiếu được. Các engine jieqi (AB-JChess, universe-st/Jieqi) đều cài như vậy. → Đặc tả này chốt: **CÓ, quân úp chiếu theo `homeRole`**. Đây là suy luận từ luật ăn quân, đã đánh dấu rõ; nên xác nhận lại với chủ sản phẩm vì đây là nguồn bug số 1.

---

## 1. BÀN CỜ VÀ TOẠ ĐỘ

Dùng nguyên bàn cờ tướng: **9 cột × 10 hàng** giao điểm.
- `r` = 0..9 từ trên xuống. `c` = 0..8 từ trái sang (theo góc nhìn Đỏ).
- Ô đơn: `sq = r * 9 + c`, `sq` ∈ [0, 89].
- **Đỏ** ngồi dưới, ở `r` = 5..9, đi về phía `r` giảm. **Đen** ở `r` = 0..4, đi về phía `r` tăng.
- **Sông** nằm giữa `r=4` và `r=5`. "Đã qua sông" với Đỏ nghĩa là `r ≤ 4`; với Đen là `r ≥ 5`.
- **Cung Đỏ**: `r ∈ [7,9]`, `c ∈ [3,5]`. **Cung Đen**: `r ∈ [0,2]`, `c ∈ [3,5]`.

## 2. QUÂN CỜ VÀ THIẾT LẬP BAN ĐẦU

Mỗi bên đúng 16 quân như cờ tướng: 1 Tướng (K), 2 Xe (R), 2 Mã (N), 2 Pháo (C), 2 Sĩ (A), 2 Tượng (B), 5 Tốt (P).

**Chỉ hai quân Tướng để ngửa.** 15 quân còn lại của mỗi bên bị **úp mặt** và **trộn ngẫu nhiên** rồi đặt vào đúng 15 ô xuất phát của cờ tướng. Không ai — kể cả chủ nhân — biết quân úp của mình là gì (VN1, VN4, CN1: *"玩家连自己的子是什么都不知道"*).

Sơ đồ ô xuất phát (vai trò theo ô = `homeRole`):

```
Đen: r0 → c0:R c1:N c2:B c3:A c4:K(ngửa) c5:A c6:B c7:N c8:R
     r2 → c1:C  c7:C
     r3 → c0:P c2:P c4:P c6:P c8:P
Đỏ:  r6 → c0:P c2:P c4:P c6:P c8:P
     r7 → c1:C  c7:C
     r9 → c0:R c1:N c2:B c3:A c4:K(ngửa) c5:A c6:B c7:N c8:R
```

**Thuật toán khởi tạo (bắt buộc dùng `rng` của server):**
1. Với mỗi bên, lập multiset danh tính `pool = [R,R,N,N,B,B,C,C,A,A,P,P,P,P,P]` (15 phần tử).
2. Fisher–Yates shuffle `pool` **chỉ bằng `rng`**, không dùng `Math.random`.
3. Gán `pool[i]` làm `trueRole` cho ô thứ `i` trong danh sách 15 ô xuất phát (thứ tự duyệt ô phải cố định và có tài liệu, để replay tái lập được).
4. `homeRole` của mỗi quân = vai trò chuẩn của ô nó đang đứng (bảng trên). Vì quân úp **không bao giờ di chuyển mà vẫn úp**, `homeRole` luôn = vai trò của ô hiện tại ⇒ đây là **thông tin công khai**, client tự suy ra được.
5. `trueRole` **tuyệt đối không được lọt vào `view()`** khi quân còn úp.
6. Ghi `deckCommit = sha256(deckSalt || serialize(trueRoles))`, công bố `deckCommit` ngay đầu ván, công bố `deckSalt` + toàn bộ `trueRoles` khi ván kết thúc ⇒ người chơi tự kiểm chứng server không "nắn bài".

**Lưu ý về mô hình ngẫu nhiên:** có thể cài "gieo lười" (lấy mẫu danh tính từ pool còn lại đúng lúc lật). Về phân phối là **tương đương hoàn toàn** (tính khả hoán). Nhưng gieo-lúc-init đơn giản hơn, cho phép commit-reveal, và cho phép trả lời được câu hỏi "quân bị ăn là gì" ở config `capturedHiddenVisibility='captor'`. **Chọn gieo-lúc-init.**

**Đỏ đi trước.** Ghép cặp nên random bên cầm quân bằng `rng`.

## 3. QUÂN CÒN ÚP ĐI THẾ NÀO

Quân úp đi **đúng theo luật cờ tướng của `homeRole`, giữ nguyên MỌI hạn chế gốc**:

| `homeRole` | Nước đi khi còn úp |
|---|---|
| **R (Xe)** | Ngang/dọc bao nhiêu ô cũng được, không nhảy qua quân nào (úp hay ngửa, bên nào cũng chắn). |
| **N (Mã)** | Đi 1 ô thẳng + 1 ô chéo tiếp theo (8 hướng). **Bị cản chân**: nếu ô kề theo hướng thẳng có bất kỳ quân nào thì không đi được hướng đó. |
| **C (Pháo)** | Di chuyển như Xe khi **không ăn**. Khi **ăn** phải có **đúng 1 quân làm ngòi** giữa ô đi và ô đến; ngòi là quân bất kỳ của bên nào, úp hay ngửa. |
| **A (Sĩ)** | Chéo đúng 1 ô, **BẮT BUỘC ở trong cung của bên mình**. Từ (9,3) chỉ có 1 ô đích là (8,4). Từ (9,5) chỉ có (8,4). Từ (0,3)/(0,5) chỉ có (1,4). ⇒ Đầu ván, 2 quân úp ở vị trí Sĩ **tranh nhau đúng 1 ô**; ai đi trước thì quân kia **tạm thời không còn nước đi nào**. |
| **B (Tượng)** | Chéo đúng 2 ô (±2,±2), **KHÔNG được qua sông**. Bị chặn nếu ô giữa (±1,±1) có quân ("mắt tượng"/"塞象眼"). Từ (9,2) → (7,0) hoặc (7,4); từ (9,6) → (7,4) hoặc (7,8). |
| **P (Tốt)** | Chỉ **tiến thẳng 1 ô** (Đỏ: r−1; Đen: r+1). **Không đi ngang**, vì ô xuất phát của Tốt (r6 Đỏ / r3 Đen) luôn ở sân nhà, chưa qua sông. |

Quân úp **ăn quân được** và **bị ăn được** (CN3: *"暗子可以吃子，也可以被吃"*).
Quân úp **làm ngòi pháo, cản chân mã, che mắt tượng, chắn đường Xe, chắn thế tướng-đối-mặt** y như quân thường — vì các luật đó chỉ phụ thuộc **có quân hay không**, không phụ thuộc quân gì.

### 3.1 LẬT QUÂN LÀ BẮT BUỘC VÀ TỰ ĐỘNG
Ngay sau khi quân úp hoàn tất nước đi (kể cả nước ăn quân), **server lật ngửa quân đó**, công bố `trueRole` cho cả hai bên và khán giả. **Không có action "lật"**; không được lật mà không đi; không được đi mà giữ úp. Việc lật không tốn nước đi.

`trueRole` đã được gieo từ `init`, việc lật chỉ là **công bố**, không phải gieo mới.

### 3.2 TÍNH HỢP LỆ KHÔNG PHỤ THUỘC DANH TÍNH ẨN — tính chất quan trọng nhất của engine
Việc một nước có hợp lệ hay không **chỉ phụ thuộc thông tin công khai**: vị trí các quân, quân nào đã ngửa (và ngửa ra là gì), quân nào còn úp (và `homeRole` của nó — suy được từ ô).

Chứng minh ngắn: nước đi hợp lệ ⇔ (a) đúng luật di chuyển của `homeRole`/`trueRole` của quân mình — cả hai đều công khai; và (b) sau nước đi, Tướng mình không bị chiếu — việc bị chiếu chỉ do **quân đối phương** tấn công, mà vai trò tấn công của quân đối phương cũng là công khai. Danh tính ẩn của **chính quân mình vừa đi** không thể tự chiếu Tướng mình.

⇒ **Sinh nước đi và kiểm tra hợp lệ chạy được hoàn toàn trên `view()`**. Bot không cần biết gì thêm để chơi đúng luật. Đây là lý do bot có thể chạy ở client mà không lộ thông tin (dù vẫn nên chạy ở server).

## 4. QUÂN ĐÃ LẬT ĐI THẾ NÀO

Từ lúc lật trở đi, quân đi theo `trueRole`, luật cờ tướng chuẩn, **trừ hai ngoại lệ đặc trưng của cờ úp**:

| Quân | Nước đi sau khi lật |
|---|---|
| **Tướng (K)** | Luôn ngửa. 1 ô ngang hoặc dọc, **chỉ trong cung** (Tướng không bao giờ bị úp nên không có ngoại lệ). |
| **Xe (R)** | Ngang/dọc tuỳ ý, không nhảy. |
| **Mã (N)** | Như §3, có cản chân. |
| **Pháo (C)** | Như §3, ăn phải có ngòi. |
| **Sĩ (A)** | ⚠️ **NGOẠI LỆ CỜ ÚP**: chéo 1 ô, **đi khắp bàn, không bị nhốt trong cung**. (Lưu ý toán học: nước (±1,±1) bảo toàn `(r+c) mod 2` ⇒ Sĩ vĩnh viễn chỉ tới được 45/90 ô.) |
| **Tượng (B)** | ⚠️ **NGOẠI LỆ CỜ ÚP**: chéo 2 ô, **được qua sông, đi khắp bàn**. **Vẫn bị mắt tượng.** (Nước (±2,±2) bảo toàn cả `r mod 2` lẫn `c mod 2` ⇒ Tượng chỉ tới được ~25 ô trong 1 lưới con.) |
| **Tốt (P)** | Tiến thẳng 1 ô về phía đối phương. **Nếu đang ở nửa sân đối phương** (Đỏ: `r ≤ 4`; Đen: `r ≥ 5`) thì **thêm** nước đi ngang 1 ô. **Không bao giờ lùi.** Ở hàng tận cùng (Đỏ `r=0`, Đen `r=9`) chỉ còn nước ngang. |

**Trạng thái "qua sông" của Tốt tính theo `r` HIỆN TẠI, không theo lịch sử.** Một quân úp ở ô Xe chạy sang `r=2` rồi lật ra là Tốt thì **lập tức** được đi ngang, dù nó chưa từng "vượt sông" theo nghĩa đi bộ.

## 5. ĂN QUÂN

- Di chuyển tới ô có quân **đối phương** ⇒ ăn quân đó, quân bị ăn rời bàn.
- Không được đi vào ô có quân **của mình**.
- Pháo (úp ở ô Pháo hoặc đã lật ra Pháo) chỉ ăn được khi có **đúng một** ngòi.
- **Ăn quân úp**: được. Quân úp bị ăn **giữ nguyên trạng thái úp**; ai nhìn thấy danh tính nó phụ thuộc `capturedHiddenVisibility` (§0 M3).
- **Không có bắt Tốt qua đường (en passant).** Cờ tướng không có luật này.
- Ăn Tướng không xảy ra trong ván hợp lệ vì chiếu phải được đỡ; nhưng engine vẫn nên coi "Tướng bị ăn" là kết thúc thắng (dùng làm điều kiện dừng trong tìm kiếm của bot).

## 6. CHIẾU, ĐỠ CHIẾU, VÀ CÁC RÀNG BUỘC HỢP LỆ

### 6.1 Tập ô bị tấn công
Bên X **đang tấn công** ô `s` nếu tồn tại quân của X có thể đi tới `s` theo luật, trong đó:
- quân **đã lật** tấn công theo `trueRole`;
- quân **còn úp** tấn công theo `homeRole` (xem §0 M5).

Tướng của bên Y **bị chiếu** ⇔ ô Tướng Y đang bị X tấn công.

### 6.2 Tướng đối mặt (cấm)
Hai Tướng **không được đứng cùng cột mà giữa chúng không còn quân nào**. Nước đi tạo ra thế đó là **bất hợp lệ**. Quân úp vẫn tính là chắn. Cách cài gọn: coi Tướng như có thêm nước đi kiểu Xe **chỉ để ăn Tướng đối phương**; nếu nước đó tồn tại thì thế cờ bất hợp lệ.

### 6.3 Quy tắc hợp lệ của một nước
Một nước `(from → to)` hợp lệ ⇔ tất cả:
1. `from` có quân của bên đến lượt.
2. `to` đúng tập nước đi của `homeRole` (nếu úp) hoặc `trueRole` (nếu đã lật), thoả mọi ràng buộc chặn/ngòi/mắt/cung/sông tương ứng.
3. `to` không phải quân của mình.
4. Sau khi thực hiện (bao gồm cả việc lật, nếu có), **Tướng của bên đi không bị chiếu** và **hai Tướng không đối mặt**.

Bắt buộc phải đỡ chiếu: ăn quân chiếu / chắn đường chiếu / chạy Tướng. Không có nước "bỏ qua lượt".

### 6.4 Trạng thái chiếu tính SAU khi lật
Quân úp đi xong thì lật ngay; xem bên kia có bị chiếu hay không **phải dùng `trueRole` sau khi lật**, không dùng `homeRole`. Ví dụ kinh điển: quân úp ở ô Sĩ đi vào tâm cung, lật ra là Xe ⇒ có thể chiếu thẳng cột giữa. Đây là nguồn bug thứ 2 sau §0 M5.

## 7. KẾT THÚC VÁN

Xét theo thứ tự ưu tiên sau mỗi nước đi:

### 7.1 Chiếu bí (thắng)
Bên đến lượt **đang bị chiếu** và **không còn nước hợp lệ nào** ⇒ **thua**.

### 7.2 Hết nước đi / bí quân (困斃) — THUA, KHÔNG PHẢI HOÀ
Bên đến lượt **không bị chiếu** nhưng **không còn nước hợp lệ nào** ⇒ **THUA**. Đây là khác biệt lớn nhất so với cờ vua (cờ vua xử hoà). `stalemateIsLoss = true` mặc định, có flag vì vài nền tảng xử hoà.

Trong cờ úp tình huống này hiếm nhưng có thật: ví dụ bên còn Tướng + vài Sĩ/Tượng đã lật bị vây kín.

### 7.3 Đầu hàng, mất kết nối, hết giờ
- `resign` ⇒ thua ngay.
- Hết `mainMs` hoặc vượt `moveCapMs` ⇒ thua (§ timeControl).
- Mất kết nối quá `disconnectGraceMs` (mặc định 60s, đồng hồ vẫn chạy) ⇒ xử như hết giờ.

### 7.4 Chiếu mãi (長將) — bên chiếu THUA
Nếu một bên chiếu **liên tục** và vị trí lặp lại, bên chiếu **thua**. Cài đặt thực dụng:
- Đếm `checkStreak[side]`: tăng khi nước vừa đi tạo chiếu, reset về 0 khi không chiếu.
- Nếu `checkStreak[side] ≥ perpetualCheckThreshold` (mặc định **6 hồi hợp = 12 ply**, theo CN2: *"同一棋子不能连续捉对方帅、将超过6回合"*) **và** vị trí hiện tại đã xuất hiện ≥ 3 lần ⇒ bên chiếu thua.
- **Trung thực về giới hạn**: luật 長打 châu Á đầy đủ (長捉/長兌/長獻/長攔/長跟, phân biệt "捉" thật với doạ giả) là một bộ luật hàng chục trang, **không nên cài đủ**. Đặc tả này chỉ cài **長將 = thua**; mọi kiểu đuổi bắt lặp khác **xử hoà theo luật lặp vị trí**. Phải ghi rõ điều này trong mục "Luật" hiển thị cho người chơi để tránh khiếu nại.

### 7.5 Lặp vị trí 3 lần ⇒ hoà
Khoá vị trí `positionKey` gồm: bên đến lượt + trạng thái đủ 90 ô, mỗi ô mã hoá `(bên, úp?homeRole : trueRole)`. **Bắt buộc gồm cả cờ úp/ngửa**, nếu chỉ hash vị trí quân sẽ báo hoà sai.
Vị trí lặp lần thứ `repetitionDrawCount` (mặc định 3) ⇒ hoà (trừ khi rơi vào §7.4 thì xử thua bên chiếu trước).

### 7.6 Luật không tiến triển ⇒ hoà
`noProgressPlies` tăng mỗi ply, **reset về 0 khi có ăn quân HOẶC khi có quân được lật** (`resetNoProgressOnReveal = true`). Đạt `noProgressLimitPlies` (mặc định 120 ply = 60 hồi hợp; CN2 dùng 80 ply = 40 hồi hợp) ⇒ hoà.
Việc reset khi lật là đúng bản chất: lật là **hành động không thể đảo ngược**, tối đa 30 lần cả ván, nên không gây kéo dài vô hạn.

### 7.7 Không đủ lực chiếu bí ⇒ hoà
Hoà ngay nếu cả hai bên **chỉ còn Tướng**. Tuỳ chọn `insufficientMaterialDraw`: hoà nếu cả hai bên không còn quân nào trong {R, N, C, P} (Sĩ/Tượng tự do trong cờ úp **vẫn có thể chiếu bí** trong một số thế, nên đừng mở rộng luật này quá tay — cấu hình mặc định để `false` cho an toàn).

### 7.8 Thoả thuận hoà
`offer_draw` → `respond_draw{accept:true}` ⇒ hoà. Lời mời hết hiệu lực khi bên mời đi nước tiếp theo. Chống spam: tối đa 3 lần mời/ván/bên và không được mời lại trong 10 ply.

### 7.9 Công bố sau ván
Khi `finished`, server công bố `deckSalt` + toàn bộ `trueRole` của **mọi** quân chưa lật (kể cả quân đã bị ăn khi còn úp) để người chơi kiểm tra `deckCommit`.

## 8. NHỮNG LUẬT CỜ VUA **KHÔNG** CÓ TRONG CỜ ÚP (nêu rõ theo yêu cầu)

- **Không có nhập thành.** Tướng luôn đi 1 ô trong cung, không có nước đôi với Xe.
- **Không có bắt Tốt qua đường (en passant).** Tốt không bao giờ đi 2 ô nên tình huống này không tồn tại.
- **Không có phong hậu / phong cấp.** Tốt tới hàng cuối **không** biến thành quân khác; nó chỉ còn nước đi ngang và mãi mãi là Tốt. Cơ chế "thăng cấp" duy nhất của cờ úp là **việc lật quân** — một Tốt-vị-trí có thể lật ra là Xe, nhưng đó là công bố danh tính có sẵn, không phải phong cấp.
- **Hết nước đi (stalemate) là THUA, không phải hoà** (ngược cờ vua) — §7.2.
- **Luật lặp 3 lần**: có, nhưng khoá vị trí phải gồm trạng thái úp/ngửa; và **chiếu mãi bị xử thua** thay vì hoà như cờ vua.
- **Luật 50 nước** của cờ vua tương ứng ở đây là luật 60 hồi hợp (120 ply) không ăn quân **và** không lật quân — §7.6.
- **Không có tấn phong, không có bàn cờ 8×8, không có màu ô sáng/tối.** Quân đứng trên **giao điểm**, không đứng trong ô.

## 9. KHÁI NIỆM CHIẾN THUẬT CẦN HỖ TRỢ Ở UI (theo VN1, VN3)

- **Cấm úp / khống úp**: chặn không cho quân úp đối phương lật an toàn (mọi ô đích của nó đều bị mình ăn lại có lời). UI nên đánh dấu quân úp "không lật an toàn được".
- **Cứu úp / cứu hàng**: tìm cách lật quân úp đang bị cấm mà không mất quân.
- **Quân chết**: quân úp bị cấm úp hoàn toàn, coi như mất giá trị.
- Kinh nghiệm phổ biến: ưu tiên mở quân tuyến Tốt trước, tuyến sau sau; không tuỳ tiện ăn quân đang nằm ở ô đã bị "cấm".

## Mô hình trạng thái

```ts
type Side = 'red' | 'black';
type Role = 'K' | 'R' | 'N' | 'C' | 'A' | 'B' | 'P';
// K Tướng, R Xe, N Mã, C Pháo, A Sĩ, B Tượng, P Tốt
type HiddenRole = Exclude<Role, 'K'>;
type Square = number;      // 0..89 ; sq = r*9 + c ; r 0..9 (0 = hàng cuối Đen), c 0..8
type PieceId = number;     // 0..31 cố định suốt ván, dùng cho animation phía client

interface Piece {
  id: PieceId;
  side: Side;
  sq: Square | null;            // null nếu đã bị ăn
  hidden: boolean;              // true = còn úp
  homeRole: HiddenRole;         // vai trò theo Ô XUẤT PHÁT; CÔNG KHAI (suy được từ sq khi còn úp)
  trueRole: Role;               // ⚠ BÍ MẬT khi hidden=true — KHÔNG ĐƯỢC LỌT VÀO view()
  revealedAtPly: number | null;
  capturedAtPly: number | null;
  capturedBy: Side | null;
}

interface ClockState {
  mainMs: number;               // quỹ thời gian còn lại của cả ván
  moveCapMs: number;            // trần thời gian cho 1 nước
  incrementMs: number;          // Fischer, cộng sau khi đi (0 nếu không dùng)
  moveElapsedMs: number;        // đã dùng cho nước hiện tại (chỉ bên đến lượt khác 0)
}

interface MoveRecord {
  ply: number;
  side: Side;
  from: Square;
  to: Square;
  pieceId: PieceId;
  movedAsRole: HiddenRole | Role;   // homeRole nếu lúc đó còn úp
  revealedRole: Role | null;        // != null nếu nước này làm lật quân
  capturedId: PieceId | null;
  capturedWasHidden: boolean;
  capturedTrueRole: Role | null;    // ⚠ lọc theo capturedHiddenVisibility trong view()
  gaveCheck: boolean;
  timeUsedMs: number;
  clientMoveId?: string;            // idempotency
}

interface CoUpConfig {
  revealTiming: 'move-then-reveal' | 'reveal-then-move';   // mặc định 'move-then-reveal'
  freeAdvisorElephant: boolean;                            // mặc định true
  hiddenPiecesGiveCheck: boolean;                          // mặc định true (xem M5)
  capturedHiddenVisibility: 'none' | 'captor' | 'both';    // mặc định 'captor'
  stalemateIsLoss: boolean;                                // mặc định true
  repetitionDrawCount: number;                             // mặc định 3
  perpetualCheckRule: 'loss' | 'draw' | 'off';             // mặc định 'loss'
  perpetualCheckThresholdPly: number;                      // mặc định 12
  noProgressLimitPlies: number;                            // mặc định 120
  resetNoProgressOnReveal: boolean;                        // mặc định true
  insufficientMaterialDraw: boolean;                       // mặc định false
  onMoveCapExceeded: 'loss' | 'forceRandomMove';           // mặc định 'loss'
  disconnectGraceMs: number;                               // mặc định 60000
  timeControl: { mainMs: number; moveCapMs: number; incrementMs: number };
  botLevel?: 'easy' | 'medium' | 'hard';                   // chỉ khi có ghế bot
}

interface GameResult {
  winner: Side | null;            // null = hoà
  reason:
    | 'checkmate' | 'stalemate_loss' | 'resign' | 'timeout' | 'move_cap'
    | 'disconnect' | 'perpetual_check' | 'repetition' | 'no_progress'
    | 'agreement' | 'insufficient_material';
  finalMaterial: Record<Side, number>;   // điểm quân còn lại, cho chế độ tính điểm cược
}

interface CoUpState {
  version: 1;
  phase: 'playing' | 'finished';
  turn: Side;
  ply: number;                                   // số nửa nước đã đi
  pieces: Piece[];                               // 32 phần tử, index === id
  board: (PieceId | null)[];                     // length 90, dẫn xuất từ pieces (giữ để tra O(1))
  seatBySide: Record<Side, string>;              // playerId; bot dùng id dạng "bot:hard"
  config: CoUpConfig;

  deckCommit: string;                            // sha256(deckSalt + serialize(trueRoles)) — công khai từ đầu
  deckSalt: string;                              // ⚠ BÍ MẬT tới khi finished

  // Trạng thái trọng tài
  inCheck: Record<Side, boolean>;
  checkStreak: Record<Side, number>;             // số ply liên tiếp bên này CHIẾU đối phương
  noProgressPlies: number;                       // reset khi ăn quân hoặc lật quân
  positionKey: string;                           // khoá 90 ô + lượt đi, CÓ tính cờ úp/ngửa
  repetition: Record<string, number>;            // positionKey -> số lần xuất hiện

  clocks: Record<Side, ClockState>;
  turnStartedAtMs: number;                       // epoch ms server, mốc để tick() trừ giờ
  connected: Record<Side, boolean>;
  disconnectedSinceMs: Record<Side, number | null>;

  drawOffer: { by: Side; atPly: number } | null;
  drawOfferCount: Record<Side, number>;

  history: MoveRecord[];
  result: GameResult | null;
}

// Cấu trúc view() trả về (KHÔNG phải state)
interface CoUpView extends Omit<CoUpState, 'pieces' | 'deckSalt'> {
  viewerSide: Side | null;                       // null = khán giả
  pieces: Array<Omit<Piece, 'trueRole'> & { trueRole: Role | null }>;
  unknownPool: Record<HiddenRole, number>;       // số lượng từng loại còn trong tập chưa lộ, TÍNH RIÊNG CHO NGƯỜI XEM NÀY
  legalMoves?: Array<{ from: Square; to: Square }>;  // chỉ gửi khi viewerSide === turn
  deckSalt?: string;                             // chỉ có khi phase === 'finished'
}

// Ghi chú cài đặt nóng cho hiệu năng bot: bên trong engine nên có bản mirror
// dạng Int8Array(90) cho occupancy/role và Uint8Array(90) cho cờ hidden,
// tái tạo từ CoUpState khi vào search, để make/unmake không allocate object.
```

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `move` | { from: number, to: number, clientMoveId?: string } | phase==='playing'; playerId là chủ ghế của state.turn (từ chối nếu là ghế bot và request đến từ client). from,to ∈ [0,89] và from!==to. board[from]!==null và pieces[board[from]].side===turn. board[to]===null hoặc quân ở to thuộc bên đối phương. Nước đi phải nằm trong generateLegalMoves(state, turn): sinh theo homeRole nếu quân còn úp (giữ nguyên hạn chế cung/sông/ngòi/cản chân/mắt tượng), theo trueRole nếu đã lật (Sĩ/Tượng bỏ hạn chế cung/sông nếu freeAdvisorElephant). Sau khi thử áp dụng, Tướng bên đi KHÔNG được bị chiếu và hai Tướng KHÔNG được đối mặt — nếu vi phạm thì lỗi ILLEGAL_MOVE_SELF_CHECK. Nếu đang bị chiếu mà nước đi không giải chiếu: ILLEGAL_MOVE_MUST_ANSWER_CHECK. Kiểm tra đồng hồ TRƯỚC khi áp dụng: nếu now-turnStartedAtMs > mainMs còn lại hoặc > moveCapMs thì không nhận nước, chuyển sang xử thua giờ. clientMoveId trùng với nước cuối trong history thì trả về kết quả cũ (idempotent), không áp dụng lại. Lỗi: NOT_YOUR_TURN, GAME_FINISHED, BAD_SQUARE, EMPTY_FROM, OWN_PIECE_AT_TO, ILLEGAL_MOVE_PATTERN, ILLEGAL_MOVE_BLOCKED, ILLEGAL_MOVE_NO_SCREEN, ILLEGAL_MOVE_OUT_OF_PALACE, ILLEGAL_MOVE_CROSSES_RIVER, ILLEGAL_MOVE_SELF_CHECK, ILLEGAL_MOVE_FLYING_GENERAL, ILLEGAL_MOVE_MUST_ANSWER_CHECK, TIME_EXPIRED. |
| `resign` | {} | phase==='playing'; playerId là một trong hai người chơi (được phép đầu hàng cả khi không tới lượt). Ghế bot không gửi được action này. Kết quả: đối phương thắng, reason='resign'. Không có xác nhận hai bước ở phía engine — UI tự lo hộp thoại xác nhận. |
| `offer_draw` | {} | phase==='playing'; playerId là người chơi; drawOffer===null hoặc drawOffer.by!==bên này; drawOfferCount[bên này] < 3; ply - (lời mời trước của bên này) >= 10 để chống spam. Lời mời tự huỷ khi chính bên mời thực hiện action 'move'. Lỗi: DRAW_OFFER_PENDING, DRAW_OFFER_LIMIT, DRAW_OFFER_TOO_SOON. |
| `respond_draw` | { accept: boolean } | phase==='playing'; drawOffer!==null và drawOffer.by!==bên của playerId. accept===true ⇒ hoà, reason='agreement'. accept===false ⇒ xoá drawOffer, ván tiếp tục. Lỗi: NO_DRAW_OFFER, CANNOT_ANSWER_OWN_OFFER. |
| `claim_timeout` | {} | phase==='playing'; playerId là người chơi hoặc hệ thống. Chỉ dùng làm ĐƯỜNG LUI khi nền tảng không gọi tick() cho game không realtime. Server tự tính lại đồng hồ theo đồng hồ server (KHÔNG tin timestamp client): nếu bên đối phương đã vượt mainMs hoặc moveCapMs thì kết thúc ván (reason='timeout'/'move_cap'); nếu chưa, trả về lỗi NOT_EXPIRED kèm số ms còn lại. Chống spam: tối đa 1 lần / 2 giây / người chơi. |
| `claim_draw` | { reason: 'repetition' | 'no_progress' } | phase==='playing'; playerId là người chơi. reason==='repetition' ⇒ repetition[positionKey] >= config.repetitionDrawCount. reason==='no_progress' ⇒ noProgressPlies >= config.noProgressLimitPlies. Nếu điều kiện chưa đạt: lỗi CLAIM_NOT_AVAILABLE kèm số còn thiếu. GHI CHÚ: engine đã TỰ ĐỘNG xử hoà khi đạt ngưỡng ở cuối mỗi apply(), nên action này chỉ cần thiết ở chế độ 'phải xin mới hoà' (giải đấu). Nếu chạy chế độ tự động thì action này luôn trả CLAIM_NOT_AVAILABLE. |
| `set_connection` | { connected: boolean } | Chỉ server/lobby gọi được, không nhận từ client. connected=false ⇒ ghi disconnectedSinceMs[side]=now; đồng hồ VẪN CHẠY. connected=true ⇒ xoá mốc. tick() sẽ xử thua reason='disconnect' nếu (now - disconnectedSinceMs) > config.disconnectGraceMs VÀ bên đó đang tới lượt. Không được dùng để dừng đồng hồ — nếu không sẽ bị lợi dụng để rút phích khi sắp thua. |

## Kết thúc ván

Sau MỖI lần apply() thành công và MỖI lần tick(), xét theo đúng thứ tự ưu tiên sau (dừng ở điều kiện đầu tiên khớp):

1. HẾT GIỜ — bên đến lượt có clocks[side].mainMs <= 0 ⇒ bên đó THUA, reason='timeout'. Hoặc moveElapsedMs > moveCapMs ⇒ THUA, reason='move_cap' (hoặc ép đi nước ngẫu nhiên nếu onMoveCapExceeded='forceRandomMove').
2. MẤT KẾT NỐI QUÁ HẠN — bên đến lượt mất kết nối > disconnectGraceMs ⇒ THUA, reason='disconnect'.
3. ĐẦU HÀNG — reason='resign', đối phương thắng.
4. CHIẾU MÃI (nếu perpetualCheckRule='loss') — checkStreak[bênVừaĐi] >= perpetualCheckThresholdPly VÀ repetition[positionKey] >= 3 ⇒ BÊN CHIẾU THUA, reason='perpetual_check'. Xét TRƯỚC luật lặp, nếu không thế cờ chiếu mãi sẽ bị xử hoà oan.
5. CHIẾU BÍ — bên đến lượt inCheck=true và generateLegalMoves() rỗng ⇒ THUA, reason='checkmate'.
6. HẾT NƯỚC ĐI (困斃) — bên đến lượt inCheck=false và generateLegalMoves() rỗng ⇒ THUA, reason='stalemate_loss' (mặc định stalemateIsLoss=true; nếu đổi thành false thì HOÀ). Khác cờ vua.
7. LẶP VỊ TRÍ — repetition[positionKey] >= repetitionDrawCount (3) ⇒ HOÀ, reason='repetition'.
8. KHÔNG TIẾN TRIỂN — noProgressPlies >= noProgressLimitPlies (120) ⇒ HOÀ, reason='no_progress'. noProgressPlies reset về 0 khi ăn quân HOẶC khi lật quân.
9. KHÔNG ĐỦ LỰC — cả hai chỉ còn Tướng ⇒ HOÀ, reason='insufficient_material'. (Nếu bật insufficientMaterialDraw thì mở rộng: không bên nào còn R/N/C/P. Mặc định TẮT vì Sĩ+Tượng tự do trong cờ úp vẫn chiếu bí được ở một số thế.)
10. THOẢ THUẬN HOÀ — reason='agreement'.

finished(state) === (state.phase === 'finished'), tương đương state.result !== null.

results(state) trả về đúng 2 phần tử, sắp theo place tăng dần:
  Thắng/thua: [{playerId: winner, place: 1, score: 1}, {playerId: loser, place: 2, score: 0}]
  Hoà:        [{playerId: red, place: 1, score: 0.5}, {playerId: black, place: 1, score: 0.5}]  (cùng place=1)

TÍNH ĐIỂM CUỐI (dùng cho bảng xếp hạng / chế độ cược điểm, ghi kèm trong result.finalMaterial):
  Giá trị quân cờ úp (đơn vị Tốt-chưa-qua-sông = 100):
    Xe 1000 | Pháo 480 | Mã 440 | Tượng 260 | Sĩ 240 | Tốt 100 (220 nếu đã qua sông, 150 nếu ở hàng tận cùng)
    Quân CÒN ÚP: tính bằng kỳ vọng của tập chưa lộ tại thời điểm kết thúc (đầu ván = 5340/15 ≈ 356).
  finalMaterial[side] = tổng giá trị quân còn trên bàn của bên đó.
  Điểm cược (nếu phòng bật): delta = clamp((finalMaterial[thắng] - finalMaterial[thua]) / 1000, 0.5, 3) * tiền cược cơ bản; hoà ⇒ hoàn cược.
  ELO: dùng score 1 / 0.5 / 0, KHÔNG dùng finalMaterial (chênh quân trong cờ úp nhiễu vì phụ thuộc may rủi lật quân).

QUAN TRỌNG: khi phase chuyển sang 'finished', engine phải đồng thời (a) ghi deckSalt và toàn bộ trueRole của mọi quân còn úp vào state để view() công bố, (b) đóng băng đồng hồ, (c) từ chối mọi action tiếp theo với lỗi GAME_FINISHED.

## Che thông tin ẩn

CÓ THÔNG TIN ẨN, và đặc thù của cờ úp là **cả hai người chơi đều mù như nhau** — không ai biết quân úp của chính mình là gì (khác Stratego, khác cờ tướng thường). Chỉ server biết.

## Cái gì phải che

1. **`piece.trueRole` của mọi quân có `hidden === true`** — che khỏi CẢ HAI người chơi và khán giả. Trong `view()` trả `trueRole: null`. Đây là điều duy nhất thực sự bí mật.

2. **`state.deckSalt`** — che khỏi tất cả cho tới khi `phase === 'finished'`. Nếu lộ sớm cùng `deckCommit`, người chơi brute-force được toàn bộ bàn cờ (15! hoán vị nhưng multiset chỉ 15!/(2!^5·5!) ≈ 756.756 khả năng — máy tính thử hết trong mili-giây). **deckCommit phải commit cả salt đủ entropy (≥128 bit) nếu không commit-reveal vô nghĩa.**

3. **`MoveRecord.capturedTrueRole`** khi quân bị ăn lúc còn úp — lọc theo `config.capturedHiddenVisibility`:
   - `'none'`: che khỏi tất cả.
   - `'captor'` (mặc định): chỉ bên ĂN nhìn thấy. Bên bị ăn và khán giả thấy `null`. ⚠ Đây là chỗ duy nhất hai người chơi có **tập thông tin khác nhau** — `view()` phải thật sự tính riêng cho từng người, không được cache chung một payload.
   - `'both'`: lộ cho tất cả.

4. **`unknownPool` phải tính RIÊNG CHO TỪNG NGƯỜI XEM**, không phải một giá trị chung. Công thức: `unknownPool(viewer) = poolĐầyĐủ(15 quân/bên) − {quân đã lật} − {quân úp bị ăn mà viewer này được phép biết}`. Với `capturedHiddenVisibility='captor'`, người ăn có pool hẹp hơn đối thủ ⇒ lợi thế suy luận thật sự, đúng luật. Nếu gửi pool chung là **rò rỉ hoặc bớt quyền** tuỳ hướng.

5. **Trạng thái nội bộ của `rng`** (seed, counter) — không bao giờ ra khỏi server. Nếu client biết seed + thuật toán, nó tái tạo được nguyên bàn cờ.

6. **Kết quả suy nghĩ của bot** (đánh giá thế cờ, nước dự kiến, danh sách xác định hoá). Nếu hiển thị "độ mạnh" cho người chơi thì phải lượng tử hoá thô (≤5 mức), vì eval chính xác rò rỉ thông tin bot suy ra được.

## Cái gì KHÔNG cần che (hay bị che nhầm)

- **`piece.homeRole` của quân úp là CÔNG KHAI.** Quân úp không bao giờ di chuyển mà vẫn úp, nên `homeRole` luôn bằng vai trò chuẩn của ô nó đang đứng — client tự suy ra được từ bàn cờ. Cứ gửi thẳng, che nó chỉ làm client phải tự tính lại.
- **Danh sách nước đi hợp lệ là công khai** (xem §3.2 của rules: tính hợp lệ độc lập với danh tính ẩn). Gửi `legalMoves` cho bên đến lượt là tiện lợi, không phải rò rỉ. Nhưng **không gửi legalMoves của đối phương** — không phải vì bí mật mà vì tốn băng thông và dễ bị dùng làm oracle đo thời gian.
- **Số lượng quân úp còn lại của mỗi bên** — công khai, đếm trên bàn.
- **Toàn bộ lịch sử nước đi và danh tính các quân ĐÃ LẬT** — công khai.

## Khán giả (spectator)

Khán giả nhận view nghiêm ngặt nhất: `viewerSide = null`, mọi `trueRole` của quân úp = null, mọi `capturedTrueRole` của quân úp bị ăn = null (kể cả khi config là `'captor'` — khán giả không phải người ăn), không có `legalMoves`, không có `deckSalt`.
Tuỳ chọn `spectatorDelayMs` (mặc định 0 cho cờ úp vì không có kênh chat ngoài; bật 30–60s nếu có giải đấu để chống người ngoài mách nước).
Chế độ **xem lại (replay)**: sau khi ván kết thúc mới cho bật "chế độ thượng đế" hiển thị toàn bộ danh tính từ đầu — đây chính là giá trị giải trí lớn nhất của cờ úp, đừng bỏ.

## Chống rò rỉ qua kênh phụ

- **Chuẩn hoá payload**: `view()` của hai người chơi phải có **cùng tập khoá JSON và cùng thứ tự khoá**; chỗ bị che điền `null` chứ không xoá khoá. Nếu không, độ dài payload hoặc số field tiết lộ trạng thái.
- **Chuẩn hoá thời gian trả lời**: đừng để đường xử lý "quân úp" nhanh/chậm khác "quân ngửa" một cách đo được. Thực tế với Node và ván cờ chậm, rủi ro này thấp — nhưng ít nhất đừng làm việc nặng (như chạy bot) đồng bộ trong cùng request của người chơi.
- **Log/telemetry**: cấm log `trueRole`, `deckSalt`, state đầy đủ ra hệ thống log dùng chung. Đây là đường rò thực tế hay xảy ra nhất (dev bật debug log rồi quên tắt).
- **Bot phải được nuôi bằng `view()`**, không phải `state`. Vì tính hợp lệ độc lập với thông tin ẩn (§3.2 rules), bot chơi đúng luật hoàn toàn bằng `view()` — nên không có lý do kỹ thuật nào để đưa `state` cho bot. Nếu ai đó đưa `state` vào bot, bot sẽ biết trước mọi quân úp và chơi như thần: **viết unit test khẳng định hàm bot chỉ nhận kiểu `CoUpView`**, và test đối kháng: chạy 200 ván bot-vs-bot, tỉ lệ bot ăn trúng quân úp giá trị cao phải khớp thống kê ngẫu nhiên (χ²).

## Tính giờ

## Mô hình đồng hồ: "quỹ tổng + trần mỗi nước" (kiểu cờ tướng/cờ úp online Việt Nam), không phải Fischer thuần

Theo zigavn.com, các phòng cờ úp VN dùng **hai đồng hồ song song**:
- `mainMs` — quỹ thời gian cho **cả ván** của một bên.
- `moveCapMs` — **trần cứng cho một nước**. Vượt trần là thua ngay dù quỹ tổng còn nhiều.

Đây là điểm khác cờ vua online và **phải cài đúng**, người chơi VN quen cách này.

### Preset (đề xuất cho lobby)
| Chế độ | mainMs | moveCapMs | incrementMs |
|---|---|---|---|
| Cờ chậm | 15 phút | 2 phút | 0 |
| Cờ nhanh | 10 phút | 90 giây | 0 |
| Cờ chớp (mặc định phòng thường) | 8 phút | 60 giây | 0 |
| Siêu chớp | 3 phút | 20 giây | +2 giây/nước |
| Đấu bot | 10 phút | 60 giây | 0 — **bot không bị trừ giờ thật**, xem dưới |

### Công thức trừ giờ (server là nguồn sự thật duy nhất)
```
elapsed = now - state.turnStartedAtMs
```
Khi `apply(move)` thành công:
```
clocks[turn].mainMs -= elapsed
clocks[turn].mainMs += incrementMs
clocks[turn].moveElapsedMs = 0
state.turnStartedAtMs = now
```
**Không bao giờ tin timestamp do client gửi.** Client chỉ hiển thị đồng hồ nội suy từ `turnStartedAtMs` + `mainMs` server gửi, và tự động tái đồng bộ mỗi khi nhận state mới.

### Bù trễ mạng (chống khiếu nại)
Trừ `min(elapsed, elapsed - rttEstimate/2)` với `rttEstimate` đo bằng ping ứng dụng, chặn trên 300ms. Hoặc đơn giản hơn và công bằng hơn: **ân hạn cố định `lagGraceMs = 250ms` mỗi nước**, không trừ vào quỹ. Chọn cách ân hạn cố định, ít gây tranh cãi.

### `realtime = false` nhưng VẪN CẦN tick() — đọc kỹ
Luật cờ úp thuần theo lượt, `tick()` **không tạo ra nước đi nào**. Nhưng **không có `tick()` thì không xử được thua giờ khi người chơi ngồi im**. Vậy:

- Nền tảng **phải gọi `tick(state, now, rng)` khoảng 2–4 lần/giây** cho mọi ván cờ úp đang chạy, kể cả khi `realtime === false`. `tick()` chỉ làm 3 việc: cập nhật `clocks[turn].moveElapsedMs`, kiểm tra hết giờ / vượt trần / mất kết nối quá hạn, và kết thúc ván nếu cần. `tick()` **phải idempotent theo `now`** (gọi hai lần cùng `now` không được trừ hai lần) và **không được dùng `rng`** — trừ đúng một trường hợp: `onMoveCapExceeded='forceRandomMove'` thì mới gieo nước ngẫu nhiên.
- Nếu nền tảng **không** hỗ trợ tick cho game không realtime: bắt buộc dùng đường lui bằng hai cơ chế cộng lại — (a) hẹn giờ một lần (`setTimeout`) đúng `min(mainMs, moveCapMs)` khi đổi lượt, huỷ khi có nước đi; (b) action `claim_timeout` để đối thủ giục kiểm tra. Cả hai cùng gọi vào một hàm `evaluateClocks(state, now)` duy nhất để không lệch logic.

### Xử lý khi hết giờ
- `mainMs <= 0` ⇒ **thua ngay**, `reason='timeout'`. Không có luật "không đủ lực chiếu bí thì hoà" — cờ tướng VN xử thua giờ thẳng. (Bật `insufficientMaterialDraw` nếu muốn mềm hơn; mặc định tắt.)
- `moveElapsedMs > moveCapMs` ⇒ `reason='move_cap'`, thua. Cảnh báo UI ở mốc 50% và 80% trần bằng `sfx_tick_low_time`.
- Mất kết nối: **đồng hồ vẫn chạy**. Quá `disconnectGraceMs` (60s) mà đang tới lượt ⇒ thua `reason='disconnect'`. Không cho tạm dừng — nếu không sẽ bị rút mạng khi sắp thua.
- Tạm dừng (pause) chỉ dành cho giải đấu có trọng tài, mặc định tắt.

### Đồng hồ của bot
Bot **không** được trừ vào quỹ người chơi và không nên trừ vào quỹ của chính nó theo thời gian tính toán thật (người chơi sẽ thấy bot "gian lận thời gian"). Cài: bot có `mainMs` hiển thị giảm theo một **độ trễ giả lập** `simulatedThinkMs = clamp(gauss(μ, σ), 400ms, moveCapMs*0.6)` với μ phụ thuộc mức khó (Dễ 700ms, Vừa 1400ms, Khó 2200ms) — vừa che thời gian tính thật (chống đoán độ sâu tìm kiếm), vừa làm bot có nhịp như người. Thời gian **tính toán thật** luôn bị chặn cứng ở 1 giây (xem botApproach).

## Bot

## Minimax CÓ khả thi — nhưng phải là PIMC (Perfect-Information Monte Carlo), không phải minimax thuần

Cờ úp là trò **thông tin không hoàn hảo** với không gian tập thông tin rất lớn (arXiv 2112.02989 "On the complexity of Dark Chinese Chess" đo được hệ số phân nhánh và số information set khổng lồ). Nhưng nó có một tính chất cứu cánh mà cờ vây / cờ tỷ phú không có:

> **Tính hợp lệ của nước đi hoàn toàn được quyết định bởi thông tin công khai** (xem §3.2 của `rules`). Ẩn số chỉ ảnh hưởng tới **năng lực tương lai** của quân, không ảnh hưởng tới tập nước đi hiện tại.

⇒ Có thể dùng alpha-beta bình thường trên **một mẫu xác định hoá** (determinization) của bàn cờ, rồi lấy trung bình qua nhiều mẫu. Đây là PIMC, chạy tốt trong Node thuần.

### Kiến trúc đề xuất

```
chooseMove(view, level, deadlineMs, rng):
  1. legal = generateLegalMoves(view)            // chỉ từ thông tin công khai
     nếu legal.length === 1 → trả về ngay (0ms)
  2. Với i = 1..N (N = số xác định hoá theo mức khó):
       a. sample_i = gán ngẫu nhiên (bằng rng) multiset `unknownPool` cho
          các quân úp CỦA CẢ HAI BÊN còn trên bàn.
          — pool phải khớp ràng buộc: đúng số lượng từng loại còn chưa lộ.
          — quân úp đã bị ăn cũng chiếm chỗ trong pool (đừng quên, sai chỗ này
            làm phân phối lệch nặng về cuối ván).
       b. score_i[m] = alphaBeta(applyMove(sample_i, m), depth D, -inf, +inf)
          cho mọi m ∈ legal, dùng iterative deepening + chia sẻ bảng
          history/killer GIỮA các xác định hoá (tăng tốc ~2x).
  3. Tổng hợp: value(m) = mean_i(score_i[m]) - λ · stddev_i(score_i[m])
     với λ = 0 (Dễ), 0.15 (Vừa), 0.30 (Khó) — phạt phương sai để tránh
     "strategy fusion" (xem botPitfalls).
  4. Tie-break bằng rng của server (để replay tái lập được).
```

### Ngân sách thời gian và độ sâu thực tế trong Node

Movegen cờ tướng viết bằng TypeScript với `Int8Array(90)` + make/unmake không cấp phát object đạt khoảng **300k–800k node/giây** trên một core máy chủ phổ thông. Với hạn cứng **700ms tính toán** (chừa 300ms cho serialize/IO trong ngân sách 1s):

| Mức | N (xác định hoá) | Ngân sách/mẫu | Độ sâu đạt được | Thời gian thực |
|---|---|---|---|---|
| **Dễ** | 1 | 60ms | depth 2 + qsearch | ~60ms |
| **Vừa** | 4 | 80ms | depth 4 + qsearch | ~320ms |
| **Khó** | 8–12 | 60ms | depth 5–6 (7–8 ở tàn cuộc) | ~700ms |

Alpha-beta với sắp xếp tốt cho hiệu quả ≈ `b^(d/2)`; với `b ≈ 40` ở trung cuộc cờ úp, depth 5 ≈ 10k–30k node ⇒ vừa khít 60ms/mẫu. **Iterative deepening bắt buộc** để luôn có nước hợp lệ khi hết giờ.

### Kỹ thuật tìm kiếm cần có (theo thứ tự đáng làm)
1. **Iterative deepening + kiểm tra deadline mỗi 2048 node** (`if ((nodes & 2047) === 0 && Date.now() > deadline) throw TIMEOUT`). Không bao giờ dựa vào độ sâu để kiểm soát thời gian — hệ số phân nhánh cờ úp đầu ván dao động rất mạnh.
2. **Transposition table** dùng Zobrist hash, key **phải gồm cả cờ úp/ngửa và danh tính đã gán trong mẫu này** — TT phải reset hoặc gắn thẻ theo từng xác định hoá, nếu không sẽ trộn kết quả của các bàn cờ khác nhau.
3. **MVV-LVA + killer moves + history heuristic** (history chia sẻ giữa các mẫu).
4. **Quiescence search** chỉ mở rộng nước ăn quân và nước thoát chiếu, giới hạn 6 ply, nếu không sẽ nổ ở cờ úp vì có rất nhiều nước ăn.
5. **Null-move pruning**: bật khi tổng giá trị quân của bên đi > 1500 (tránh zugzwang tàn cuộc cờ tướng), R = 2.
6. **Check extension** +1 ply, giới hạn tổng 3 lần mở rộng/đường.
7. **Tích hợp luật trọng tài vào tìm kiếm**: lặp vị trí trong cây ⇒ điểm 0; chiếu mãi ⇒ điểm **thua** cho bên chiếu. Nếu không, bot sẽ hí hửng tìm ra "chiếu mãi thắng" rồi bị xử thua ngoài đời.

### Hàm lượng giá (đây là chỗ quyết định độ mạnh, quan trọng hơn độ sâu)

```
eval = material + mobility + kingSafety + hiddenValue + coUpTerms
```

**1. material** (đơn vị Tốt=100, dùng cho quân ĐÃ LẬT trong mẫu):
`Xe 1000 | Pháo 480 | Mã 440 | Tượng 260 | Sĩ 240 | Tốt 100`
⚠ **Sĩ và Tượng đáng giá gấp ~1.2–1.3 lần cờ tướng thường** vì được đi khắp bàn. Đừng bê nguyên bảng giá cờ tướng sang, bot sẽ thí Sĩ/Tượng bừa bãi.
Tốt: +120 khi đã qua sông; −50 khi kẹt ở hàng tận cùng; +8 mỗi hàng tiến sâu.

**2. hiddenValue** — giá trị kỳ vọng của quân còn úp:
`E[pool] = Σ(count_r × value_r) / |pool|` — đầu ván = 5340/15 ≈ **356**.
Hiệu chỉnh theo ô đứng (giá trị quyền chọn, `optionValue`):
- ở ô Xe (r9c0/c8): ×1.15 — nước mở đầu tiên đi xa, dễ chiếm thế
- ở ô Mã / Pháo: ×1.05
- ở ô Tốt: ×0.95
- ở ô Tượng: ×0.85 — chỉ 2 ô đích, không qua sông được
- ở ô Sĩ: ×0.70 — chỉ 1 ô đích (tâm cung), và hai quân Sĩ tranh nhau 1 ô

**3. coUpTerms** — các hạng mục ĐẶC TRƯNG, không có ở cờ tướng:
- `+40` mỗi quân úp của MÌNH có ít nhất một nước lật **an toàn** (SEE ≥ 0 ở ô đích).
- `−90` mỗi quân úp của mình **bị cấm úp** (mọi nước lật đều mất quân) — khái niệm "cấm úp"/"quân chết" mà người chơi VN dùng.
- `+90` mỗi quân úp của ĐỐI PHƯƠNG bị mình cấm úp.
- `−E[pool]×0.8` nếu một quân úp của mình đang bị ăn không có quân đỡ (mất quân úp = mất kỳ vọng, mà kỳ vọng 356 lớn hơn cả Mã).
- `+25` mỗi quân úp của đối phương nằm trong tầm ăn của mình mà mình ăn được có lời theo SEE.

**4. mobility**: `+3` mỗi nước hợp lệ cho quân đã lật; **quân úp tính mobility theo `homeRole`** (đúng luật) — quân úp ở ô Sĩ có mobility ≤ 1, phản ánh đúng sự bất lực của nó.

**5. kingSafety**: đếm quân địch tấn công 9 ô cung, `−35` mỗi quân; `−120` nếu cột Tướng trống hẳn (nguy cơ Tướng đối mặt và Xe/Pháo chiếu dọc); `+30` mỗi Sĩ/Tượng đã lật còn ở trong/gần cung.

### Ba mức khó — hạ cấp bằng gì

**DỄ** — đối tượng: người mới, phải cảm giác thắng được.
- N=1 xác định hoá, depth 2 + qsearch, ~60ms.
- Lượng giá **chỉ material + hiddenValue**, bỏ toàn bộ `coUpTerms`, `mobility`, `kingSafety`.
- Nhiễu: `score += uniform(-180, +180)` (bằng ~½ giá trị Mã) bằng `rng` server.
- **20% số nước** chọn ngẫu nhiên trong top-5 thay vì top-1.
- **Bỏ qua** nước ăn quân của đối phương ở độ sâu 1 với xác suất 15% (mô phỏng "nhìn sót").
- Không bao giờ chọn nước làm mất Tướng ngay lập tức (giữ mức tối thiểu để không vô lý).

**VỪA** — đối tượng: người chơi biết luật, chơi vài chục ván.
- N=4, depth 4 + qsearch, λ=0.15, ~320ms.
- Lượng giá đầy đủ nhưng `coUpTerms` nhân hệ số 0.5 (chơi đúng nhưng chưa "hiểu cấm úp").
- Nhiễu `uniform(-40, +40)`; 5% số nước chọn nước tốt thứ 2.

**KHÓ** — đối tượng: người chơi khá.
- N=8–12 (giảm N nếu số quân úp còn lại < 8, vì phương sai giảm), iterative deepening tới depth 5–6, λ=0.30, hạn cứng 700ms.
- Lượng giá đầy đủ, hệ số 1.0, không nhiễu.
- Bổ sung: **sổ khai cuộc nhẹ** — 3 nước đầu tra bảng "4 thế cờ úp khai cuộc phổ biến" (nguồn vn.xiangqi.com "Cờ úp khai cuộc"), chọn bằng `rng` để không lặp ván.
- Bổ sung: đếm nước bằng **"số lần xếp hạng 1 qua các mẫu"** làm tie-break thứ hai sau `mean − λ·std` — nước thắng trong 10/12 mẫu ổn định hơn nước có mean cao nhờ 1 mẫu may mắn.

### Trung thực về trần độ mạnh
Bot TypeScript thuần theo kiến trúc trên đạt khoảng **trình độ người chơi khá của phòng cờ online**, không phải cao thủ. Engine cờ úp mạnh thật sự hiện nay (AB-JChess) dùng **NNUE + IS-MCTS** biên dịch native — không thể đạt được trong 1 giây bằng JS thuần. Nếu sau này cần bot mức "thách đấu", hướng đi là biên dịch engine C++ sang **WASM** và gọi từ Node, giữ nguyên giao diện `chooseMove(view, level, deadline, rng)` — nên **thiết kế lớp bot có thể thay thế được ngay từ đầu**.

### Chỗ bot dễ hỏng

**1. Strategy fusion — cái bẫy đặc trưng của PIMC và là lỗi nặng nhất.** Trong mỗi xác định hoá, bot "biết" mọi quân úp là gì, nên nó lập kế hoạch kiểu "đi quân này vào đó rồi lật ra Xe là thắng". Ngoài đời nó không biết. Triệu chứng: bot lao quân úp vào giữa bàn một cách phi lý, hoặc nhất quyết không ăn quân an toàn vì "biết" quân đó là Tốt. Cách giảm: phạt phương sai `mean − λ·std`, tie-break bằng "số mẫu xếp hạng 1", và tăng N ở mức Khó. Không chữa dứt được — đây là giới hạn lý thuyết của PIMC.

**2. Non-locality — bot không suy luận ngược từ nước đi của đối thủ.** Người giỏi suy ra "đối thủ không lật quân đó chắc vì nó là Sĩ". PIMC lấy mẫu đều từ pool nên không có khả năng này. Chấp nhận ở v1; nếu muốn nâng, đánh trọng số mẫu theo mô hình hành vi đơn giản (quân đối phương liên tục không lật dù có nước an toàn ⇒ giảm xác suất nó là Xe/Pháo).

**3. Quên rằng quân úp bị ăn vẫn chiếm chỗ trong pool.** Nếu `unknownPool` chỉ trừ quân đã lật mà không tính quân úp đã bị ăn, thì đến tàn cuộc bot tin rằng 3 quân úp còn lại "chắc chắn có 2 Xe" trong khi 2 Xe đó đã bị ăn từ lâu. Sai lệch tích luỹ và làm bot chơi càng về cuối càng ngu. Phải kiểm bằng invariant: `Σ unknownPool = số quân úp trên bàn + số quân úp đã bị ăn mà viewer không biết`.

**4. Bot được cho ăn `state` thay vì `view()` — bot gian lận.** Lỗi tích hợp kinh điển và cực khó phát hiện bằng mắt (bot chỉ "mạnh lạ"). Bắt buộc: chữ ký hàm bot chỉ nhận `CoUpView`, và test thống kê 200 ván (tỉ lệ lật trúng Xe phải ≈ 2/15, χ² p>0.05).

**5. Quên quân úp CÓ chiếu tướng (theo `homeRole`).** Nếu movegen/detect-check của bot bỏ sót, bot sẽ (a) đi vào thế bị chiếu ⇒ engine trả `ILLEGAL_MOVE` ⇒ bot hết nước đi ⇒ **crash hoặc thua giờ**; (b) không nhìn thấy cơ hội chiếu bí bằng quân úp. Phải dùng **chung một hàm movegen** với engine trọng tài, không viết lại bản riêng cho bot.

**6. Quên bỏ hạn chế cung/sông cho Sĩ/Tượng đã lật.** Bot sinh thiếu nước ⇒ đánh giá sai và bỏ lỡ nước thắng. Ngược lại, quên GIỮ hạn chế cho quân úp ở ô Sĩ/Tượng ⇒ sinh nước bất hợp lệ ⇒ engine từ chối ⇒ treo vòng lặp "thử lại". Mọi vòng lặp chọn nước phải có lối thoát: nếu nước bot chọn bị engine từ chối, **fallback sang nước hợp lệ đầu tiên và ghi log lỗi nghiêm trọng**, không được retry vô hạn.

**7. Treo vì không kiểm tra deadline trong vòng tìm kiếm.** Đầu ván cờ úp có ~40–50 nước hợp lệ; một `depth 6` vô tư có thể chạy hàng chục giây và **chặn event loop của Node**, làm đứng toàn bộ các ván khác trên cùng process. Phải: kiểm `Date.now()` mỗi 2048 node, ném exception khi quá hạn, và **chạy bot trong `worker_threads`** (một pool worker) chứ không trong luồng chính. Đây là lỗi làm sập cả server, không chỉ làm bot yếu.

**8. Null-move pruning ở tàn cuộc ít quân ⇒ bot thí quân vô lý.** Cờ tướng có zugzwang thật. Tắt null-move khi giá trị quân bên đi < 1500.

**9. Bot tìm ra "chiếu mãi thắng" rồi bị xử thua.** Nếu luật `perpetualCheckRule='loss'` mà tìm kiếm không mô hình hoá, bot sẽ chọn đúng đường tự thua. Phải đưa `checkStreak` vào node state của search và trả điểm −MATE cho bên chiếu khi vượt ngưỡng.

**10. Zobrist key thiếu cờ úp/ngửa ⇒ TT trộn thế cờ khác nhau.** Hai bàn cờ giống hệt về vị trí nhưng một bên quân đã lật, một bên còn úp là **hai thế cờ hoàn toàn khác**. Thiếu bit này gây điểm số sai ngẫu nhiên, rất khó debug. Tương tự với `positionKey` dùng cho luật lặp.

**11. TT dùng chung giữa các xác định hoá mà không gắn thẻ.** Mỗi mẫu là một bàn cờ khác nhau (cùng vị trí, khác danh tính ẩn). Chia sẻ TT thẳng = trộn bậy. Chia sẻ `history`/`killer` thì được và có lợi; chia sẻ TT thì phải thêm `sampleId` vào key hoặc dùng TT riêng.

**12. Bot dùng `Math.random()` thay vì `rng` server ⇒ replay không tái lập được.** Mọi nhiễu, tie-break, lấy mẫu xác định hoá, chọn khai cuộc đều phải qua `rng`. Nếu không, khiếu nại "bot gian lận" không kiểm chứng được.

**13. Bot trả lời tức thì ⇒ lộ thông tin và phá trải nghiệm.** Nước 1 tính xong trong 5ms thì người chơi biết ngay "thế này bot không nghĩ gì" và đoán được thế cờ đơn giản. Luôn chèn độ trễ giả lập (xem `timeControl`), và **tính toán bot phải bất đồng bộ với đồng hồ hiển thị**.

**14. Đánh giá quân úp bằng giá trị cố định thay vì kỳ vọng động.** Nếu hardcode "quân úp = 350" mà không cập nhật theo pool, thì đến khi cả 4 Xe đã lật, bot vẫn định giá quân úp như thể còn Xe ⇒ thí quân sai. `E[pool]` phải tính lại mỗi nước, rẻ thôi (một vòng lặp 6 phần tử).

**15. Mức Dễ quá yếu tới mức vô lý.** Nhiễu ±180 có thể khiến bot tự thí Xe không lý do, người mới vẫn thấy chán vì "máy ngu quá". Ràng buộc mềm: dù ở mức Dễ, không chọn nước làm mất quân có giá trị ≥ 480 mà không được đền bù (một lần kiểm SEE, rẻ). Mục tiêu tỉ lệ thắng của người mới trước mức Dễ là ~60–65%, không phải 95%.

## Cạm bẫy khi cài đặt

- QUÂN ÚP CÓ CHIẾU TƯỚNG, theo homeRole. Đây là bug số 1. Hàm isAttacked() phải cộng cả đòn tấn công của quân còn úp tính theo vai trò của ô nó đứng. Bỏ sót thì có thế cờ 'chiếu bí mà không ai biết', người chơi đi nước để Tướng bị bắt, và engine cho đó là hợp lệ. Nguồn không nói thẳng điều này — nó suy ra từ '暗子按其所在位置的棋子走法走子、吃子' — nên hãy chốt lại với chủ sản phẩm trước khi code.
- Trạng thái chiếu phải tính SAU khi lật, bằng trueRole, không bằng homeRole. Quân úp ở ô Sĩ đi vào tâm cung rồi lật ra Xe thì chiếu dọc cột giữa. Nếu kiểm tra chiếu trước khi lật sẽ bỏ sót hoàn toàn lớp nước chiếu này.
- Sĩ và Tượng SAU KHI LẬT bỏ hạn chế cung và sông (đi khắp bàn), nhưng quân CÒN ÚP ở ô Sĩ/Tượng thì GIỮ NGUYÊN hạn chế. Hai luật ngược nhau trên cùng một loại quân, rất dễ cài nhầm một trong hai chiều. Viết 4 test riêng: sĩ-úp-trong-cung, sĩ-lật-ngoài-cung, tượng-úp-không-qua-sông, tượng-lật-qua-sông. Tượng đã lật VẪN bị mắt tượng.
- Quân úp ở ô Sĩ đầu ván chỉ có ĐÚNG MỘT ô đích (tâm cung). Hai quân Sĩ của cùng một bên tranh nhau ô đó; ai đi trước thì quân kia tạm thời KHÔNG CÒN NƯỚC ĐI NÀO. Code giả định 'mọi quân luôn có ít nhất một nước' sẽ chia cho 0 hoặc lỗi index. Cũng đừng nhầm 'một quân hết nước' với 'cả bên hết nước đi'.
- Hết nước đi mà không bị chiếu là THUA, không phải hoà. Ngược hẳn cờ vua. Nếu team dùng chung một khung engine cho cả cờ vua và cờ úp, cờ mặc định stalemate=draw sẽ lặng lẽ áp sai cho cờ úp.
- Khoá vị trí dùng cho luật lặp 3 lần PHẢI mã hoá cả trạng thái úp/ngửa và homeRole. Hai bàn cờ có quân ở cùng vị trí nhưng khác trạng thái lật là hai thế cờ khác nhau. Thiếu bit này gây hoà sai — và vì lật là hành động không đảo ngược, bug này lại rất hiếm khi lộ ra trong test ngắn.
- noProgressPlies phải reset khi LẬT QUÂN, không chỉ khi ăn quân. Lật là tiến triển không thể đảo ngược (tối đa 30 lần cả ván). Nếu chỉ reset khi ăn quân thì một pha mở quân dài hoàn toàn hợp lệ sẽ bị xử hoà oan.
- deckSalt phải có ≥128 bit entropy và KHÔNG được lộ trước khi ván kết thúc. Tập danh tính chỉ có 15!/(2!^5·5!) ≈ 756.756 khả năng — brute-force xong trong mili-giây nếu biết salt. Commit-reveal không có salt mạnh là commit-reveal giả.
- view() phải tính RIÊNG cho từng người xem khi capturedHiddenVisibility='captor': người ăn biết danh tính quân úp mình vừa ăn, người bị ăn không biết, khán giả không biết. Cache chung một payload cho cả phòng là rò rỉ thông tin. Và mọi payload phải có cùng tập khoá JSON (chỗ bị che điền null) để độ dài gói tin không tiết lộ gì.
- Tướng đối mặt là bất hợp lệ và quân ÚP vẫn tính là quân chắn. Dễ quên khi viết isLegal vì quân úp không có 'role thật'. Cũng nhớ: nước đi làm quân chắn rời khỏi cột giữa hai Tướng là tự phơi Tướng ⇒ bất hợp lệ.
- Tốt đã lật: trạng thái 'qua sông' tính theo hàng HIỆN TẠI, không theo lịch sử. Một quân úp ở ô Xe chạy sang sân đối phương rồi lật ra là Tốt thì ĐƯỢC ĐI NGANG NGAY, dù nó chưa từng đi bộ qua sông. Ngược lại, Tốt không bao giờ lùi và ở hàng tận cùng chỉ còn nước ngang — có thể bị kẹt cứng nếu hai bên đều là quân mình.
- Quân úp bị ăn vẫn phải nằm trong unknownPool. Nếu pool chỉ trừ quân đã lật, thì về tàn cuộc cả UI lẫn bot đều tin rằng những quân úp còn lại 'chắc chắn là quân to'. Bất biến cần kiểm liên tục: tổng unknownPool = số quân úp trên bàn + số quân úp đã bị ăn mà người xem này không được biết.
- Luật 長打 đầy đủ của châu Á (長捉 / 長兌 / 長獻 / 長攔 / 長跟) KHÔNG nên cài. Đó là bộ luật hàng chục trang với phân biệt 'bắt thật' và 'doạ giả'. Đặc tả này chỉ cài 長將 (chiếu mãi = thua) và xử mọi kiểu lặp khác thành hoà. Phải ghi rõ lựa chọn này ở màn hình Luật trong game, nếu không sẽ có khiếu nại từ người chơi trình độ cao.
- Xét chiếu mãi TRƯỚC luật lặp 3 lần. Một thế cờ chiếu mãi cũng lặp vị trí 3 lần; nếu xét luật lặp trước thì bên chiếu mãi được hoà thay vì thua, và họ sẽ lạm dụng nó để thoát thế thua.
- tick() vẫn bắt buộc dù realtime=false. Không có tick (hoặc setTimeout tương đương) thì người chơi ngồi im mãi không bao giờ bị xử thua giờ. Phải xác nhận nền tảng có gọi tick cho game turn-based hay không; nếu không, cài setTimeout mỗi lượt cộng action claim_timeout, cả hai gọi chung một hàm evaluateClocks().
- Mất kết nối KHÔNG được dừng đồng hồ. Nếu dừng, người chơi sắp thua sẽ rút mạng. Đồng hồ chạy tiếp, quá disconnectGraceMs thì xử thua.
- Bot phải chạy trong worker_threads. Một lần alpha-beta depth 6 không kiểm deadline sẽ chặn event loop Node và làm đứng TẤT CẢ các ván khác trên cùng process — đây là sự cố cấp server, không phải sự cố của một ván.
- Đừng bê nguyên bảng giá quân cờ tướng sang. Sĩ và Tượng trong cờ úp đi khắp bàn nên đáng giá hơn ~25%, và quân còn úp có giá trị kỳ vọng ≈356 (lớn hơn cả Mã). Bot dùng bảng giá cờ tướng sẽ thí quân úp và Sĩ/Tượng một cách vô lý, người chơi nhận ra ngay.
- Không được log trueRole, deckSalt hay state đầy đủ ra hệ thống log dùng chung. Đây là đường rò thực tế hay xảy ra nhất: dev bật debug log lúc phát triển rồi quên tắt khi lên production.

## Mỹ thuật riêng của game này

## "SƠN MÀI ĐÊM — KHẢM TRAI" (Night Lacquer & Mother-of-Pearl)

**Ý tưởng cốt lõi:** cờ úp là trò chơi của **bóng tối và khoảnh khắc loé sáng**. Toàn bộ mỹ thuật phải phục vụ một nhịp duy nhất: mặt bàn tối, trầm, im lặng — rồi một quân lật lên và **loé cầu vồng xà cừ**. Mọi thứ khác nhường chỗ cho khoảnh khắc đó.

Chất liệu chủ đạo lấy từ nghề **sơn mài khảm trai Việt Nam** (Chuyên Mỹ, Hạ Thái): vóc sơn ta màu chàm đen sâu hun hút, các đường kẻ bàn cờ **khảm bằng vỏ trai óng ánh** thay vì vẽ mực, điểm vàng quỳ ở các giao điểm trọng yếu. Đây là chất liệu **không trùng với bất kỳ game nào khác trong nền tảng** — cờ tướng nên là gỗ mít + giấy dó ban ngày; cờ vây là kaya + đá slate/clamshell trắng; cờ vua là đá cẩm thạch; cờ gánh và ô ăn quan là sân gạch/đất nện dân gian; cá ngựa và cờ tỷ phú là giấy in màu tươi kiểu board game. Cờ úp giữ riêng góc **tối, sang, huyền bí**.

### Bảng màu (token, có cả chế độ sáng)

**Chế độ tối (mặc định — đây là chế độ "thật" của game):**
```
--bg-deep        #080E14   nền ngoài bàn, gần như đen
--board-lacquer  #0E1A24   vóc sơn mài chàm
--board-grain    #13232F   vân sơn mài, noise rất nhẹ
--river          #102B36   dải sông, tối hơn một chút, có gradient xà cừ mờ
--inlay-nacre    #9FE3D6   đường kẻ khảm trai (opacity 0.55)
--gold-leaf      #C8A24A   vàng quỳ: viền quân, giao điểm, khung UI
--gold-bright    #E7C46B   vàng nhấn: đang tới lượt, chiếu tướng
--red-cinnabar   #B3341E   quân Đỏ đã lật: chữ son
--red-field      #EFE3C8   nền ngà của quân Đỏ đã lật
--black-ink      #1A242C   quân Đen đã lật: chữ mực
--black-field    #C6D6CB   nền ngọc bích nhạt của quân Đen đã lật
--hint-jade      #7FD6C4   ô có thể đi tới
--threat-ember   #E2703A   ô bị đe doạ / quân đang bị ăn
--check-crimson  #FF4D3D   viền cung khi bị chiếu (đập nhịp)
--text-primary   #EDE3D0
--text-muted     #8A9AA5
```

**Chế độ sáng ("sơn mài son" — cho người chơi ban ngày ngoài trời):**
```
--board-lacquer  #8C2B1B   vóc sơn son đỏ trầm
--inlay-nacre    #FFF6E6   khảm trai trên nền son
--gold-leaf      #D9B15C
```
Không làm chế độ sáng kiểu "trắng tinh" — sẽ mất hết bản sắc.

### Quân cờ

- **Hình dáng:** đĩa tròn dày, cạnh vát, đường kính 88px @1x. Không phải quân gỗ tròn phẳng như cờ tướng — quân cờ úp nên có **độ dày thấy rõ** (đổ bóng cạnh 3px) để cảm giác "lật được" là hợp lý về vật lý.
- **Mặt úp (thấy nhiều nhất, phải đẹp nhất):** nền gradient xuyên tâm `#1B2B38 → #0A141C`, phủ một lớp **vân xà cừ iridescent** đổi màu theo góc (dải `#7FD6C4 → #C9A0DC → #E7C46B`), viền vàng quỳ 2px. Ở giữa là một hoa văn khảm chìm rất mờ — gợi ý **hoa sen cách điệu** cho Đỏ, **mây xoắn** cho Đen — để phân biệt bên mà không tiết lộ gì. Mặt úp phải **hơi khác nhau ngẫu nhiên** giữa các quân (xoay vân 0–360°, seed từ pieceId) để bàn cờ không trông như dán tem.
- **Mặt đã lật:** nền ngà/ngọc bích phẳng, chữ Hán **khắc chìm** (inner shadow) chứ không in nổi, kiểu chữ **lệ thư**. Có công tắc "chữ Việt" thay bằng Tướng/Sĩ/Tượng/Mã/Xe/Pháo/Tốt — bắt buộc phải có, nhiều người chơi VN trẻ không đọc chữ Hán.
- **Phân biệt Sĩ/Tượng đã lật:** vì hai quân này được tự do đi khắp bàn (khác cờ tướng), thêm một **vòng cung vàng mảnh quanh viền** để người chơi nhớ "quân này giờ bay được". Chi tiết nhỏ này giải quyết được nguồn nhầm lẫn lớn nhất của người mới.

### Khoảnh khắc anh hùng: animation LẬT QUÂN (420ms)

Đây là thứ phải làm kỹ nhất trong toàn bộ game. Chuỗi 4 pha:
1. **0–120ms** — quân trượt tới ô đích (ease-out-cubic), mặt vẫn úp, kéo theo một vệt mờ màu `--inlay-nacre`.
2. **120–260ms** — lật 3D quanh trục Y, `scaleX: 1 → 0 → 1`, kèm **nâng lên 8px + bóng đổ giãn ra** để cảm giác quân nhấc khỏi mặt bàn.
3. **260–340ms** — đúng lúc mặt ngửa lộ ra: một **dải sheen cầu vồng xà cừ quét ngang** quân (mask gradient chạy), đồng thời **bung ~14 hạt bụi vàng** bay lên rồi tan (sprite, không phải particle system — giữ nhẹ cho máy yếu).
4. **340–420ms** — quân hạ xuống, bóng co lại, chữ nét dần rõ (blur 2px → 0).

Nếu quân lật ra là **Xe** (quân mạnh nhất), tăng cường: sheen sáng gấp đôi, thêm một vòng sóng vàng lan ra 1 ô, rung nhẹ camera 2px. Người chơi phải **cảm thấy** mình vừa trúng số.

**Bắt buộc có nút "giảm hiệu ứng"** (prefers-reduced-motion): rút xuống fade 120ms, không hạt bụi, không rung.

### Âm thanh

Nhạc cụ dân tộc, không dùng synth chung chung:
- `sfx_move_click` — tiếng quân gỗ chạm mặt sơn mài, khô, ngắn 60ms.
- `sfx_flip` — tiếng **gảy một dây đàn tranh** nhẹ, cao vút, 300ms. Cao độ **thay đổi theo giá trị quân lật ra**: Tốt nốt thấp, Xe nốt cao nhất. Người chơi lâu năm sẽ nghe ra ngay mình lật được gì trước khi nhìn — chi tiết này gây nghiện.
- `sfx_capture` — tiếng va gỗ trầm + một tiếng "khảy" tắt.
- `sfx_check` — tiếng **chiêng nhỏ**, 800ms, có đuôi ngân.
- `sfx_win` — một câu **đàn bầu** ngắn 2 giây.
- Nền: im lặng. Tuỳ chọn tiếng mưa đêm rất nhỏ. Không nhạc nền.

### Typography & UI chrome

- Mặt chữ quân: **Nôm Na Tống** hoặc *Ma Shan Zheng* (kiểu khắc mộc bản).
- UI: **Be Vietnam Pro** (600 cho tiêu đề, 400 cho nội dung) — dấu tiếng Việt chuẩn, cần thiết.
- Số đồng hồ: font đẳng chiều (tabular figures), màu `--gold-bright`, chuyển sang `--threat-ember` khi còn <20% quỹ hoặc <30% trần/nước.
- Khung UI: 9-slice viền khảm trai mảnh, bo góc 6px (không bo tròn kiểu app hiện đại — giữ cảm giác đồ mỹ nghệ).

### Hai thành phần UI đặc thù cờ úp (không game nào khác có)

1. **Khay "Quân còn ẩn"** đặt hai bên bàn: 7 ô icon với số đếm còn lại trong pool (`unknownPool` của chính người xem). Khi một quân lật ra, con số tương ứng **giảm kèm animation đếm ngược**. Đây là công cụ suy luận chính của người chơi — đừng giấu nó vào menu.
2. **Thanh xác suất khi hover quân úp:** rê vào một quân úp, hiện thanh ngang 7 màu thể hiện xác suất nó là từng loại (tính từ pool). Kèm nhãn "Kỳ vọng: ~356" theo giá trị quân. Ở mức người mới, bật mặc định; người chơi khá có thể tắt để tăng độ khó.
3. **Dấu "cấm úp":** quân úp nào của mình không thể lật an toàn thì viền chuyển sang `--threat-ember` mờ + icon ổ khoá nhỏ. Dạy người mới khái niệm chiến thuật quan trọng nhất của cờ úp mà không cần đọc hướng dẫn.

### Chế độ xem lại "Thượng đế"

Sau khi ván kết thúc, một nút vàng lớn: **"Lật hết bàn cờ"**. Toàn bộ quân úp lật đồng loạt theo hiệu ứng sóng lan từ giữa bàn ra, 900ms. Người chơi xem lại được mình đã bỏ lỡ con Xe nào. Đây là khoảnh khắc chia sẻ mạng xã hội — thêm nút xuất GIF 3 giây của pha này.

### Asset tối thiểu

- board_lacquer_9x10.webp — vóc sơn mài chàm #0E1A24 kèm vân noise, 1536×1706 @1x và @2x; đường kẻ khảm trai đã nướng sẵn vào texture
- board_river_overlay.webp — dải sông với gradient xà cừ mờ + hai chữ 楚河/漢界 khắc vàng quỳ (kèm bản 'SÔNG' tiếng Việt cho chế độ chữ Việt)
- board_theme_light_son.webp — biến thể sơn son đỏ #8C2B1B cho chế độ sáng
- piece_back_red.webp / piece_back_black.webp — mặt úp 176px (@2x), gradient xuyên tâm + hoa văn sen (Đỏ) / mây xoắn (Đen) khảm chìm, viền vàng 2px
- piece_back_nacre_tile.webp — dải vân xà cừ iridescent lặp ngang, dùng làm lớp phủ xoay ngẫu nhiên theo pieceId để không quân nào giống quân nào
- piece_face_atlas_red_han.webp / piece_face_atlas_black_han.webp — atlas 7 mặt chữ Hán lệ thư khắc chìm (帥仕相馬車炮兵 / 將士象馬車砲卒)
- piece_face_atlas_red_viet.webp / piece_face_atlas_black_viet.webp — atlas 7 mặt chữ Việt (Tướng/Sĩ/Tượng/Mã/Xe/Pháo/Tốt), BẮT BUỘC có, không phải tuỳ chọn
- piece_free_ring.svg — vòng cung vàng mảnh gắn lên Sĩ/Tượng đã lật, đánh dấu 'quân này đi tự do toàn bàn'
- piece_edge_shadow.webp — gờ cạnh + bóng đổ, tách lớp để animate riêng lúc nhấc quân
- fx_flip_sheen_mask.png — mask gradient quét ngang tạo ánh cầu vồng xà cừ lúc lật (dùng với blend mode screen)
- fx_gold_dust.png — sprite sheet 8×4, 256px/frame, bụi vàng bung khi lật
- fx_reveal_bigpiece_ring.png — sóng vàng lan 1 ô, chỉ dùng khi lật ra Xe
- fx_capture_sink.json — Lottie/Rive: quân bị ăn chìm xuống mặt sơn mài, 260ms
- anim_godmode_wave.rive — sóng lật đồng loạt toàn bàn cho chế độ xem lại 'Thượng đế', 900ms
- ui_frame_khamtrai.9.png — khung 9-slice viền khảm trai cho panel, bo 6px
- ui_pool_tray_icons.svg — 7 icon quân cho khay 'Quân còn ẩn', nét mảnh 1.5px, màu --gold-leaf
- ui_probability_bar.svg — thanh 7 màu hiển thị xác suất danh tính khi hover quân úp
- ui_locked_badge.svg — icon ổ khoá nhỏ đánh dấu quân 'bị cấm úp'
- ui_hint_dot.svg + ui_hint_capture_ring.svg — chấm ngọc #7FD6C4 cho ô đi được, vòng #E2703A cho ô ăn được
- ui_check_palace_glow.png — vầng #FF4D3D đập nhịp quanh cung khi bị chiếu
- avatar_frame_gold.webp + turn_indicator_glow.png — khung avatar và vầng sáng 'đang tới lượt'
- sfx_move_click.ogg (60ms) · sfx_capture_wood.ogg · sfx_check_gong.ogg (chiêng nhỏ, 800ms) · sfx_win_danbau.ogg (đàn bầu, 2s) · sfx_lose_soft.ogg · sfx_tick_low_time.ogg
- sfx_flip_dantranh_p.ogg / _a.ogg / _b.ogg / _n.ogg / _c.ogg / _r.ogg — 6 cao độ đàn tranh, cao dần theo giá trị quân lật ra (Tốt thấp nhất, Xe cao nhất)
- amb_night_rain_loop.ogg — nền mưa đêm rất nhỏ, mặc định TẮT
- font: NomNaTong hoặc MaShanZheng (mặt chữ Hán) + BeVietnamPro 400/600 (UI) — subset theo ký tự thực dùng để giảm dung lượng
- share_gif_template.json — khung xuất GIF 3 giây cho pha 'Lật hết bàn cờ'

## Ước lượng công sức

Trung bình khá — nhưng có một cái bẫy chi phí ẩn.

**So tương đối với các game khác trong nền tảng** (lấy cờ caro = 1 làm mốc):
- cờ caro 1× · cờ gánh 1.3× · ô ăn quan 1.5× · cá ngựa 2× · cờ vua 3× · **cờ tướng 3.2×** · **cờ úp ≈ 4.5×** · cờ vây ≈ 6× · cờ tỷ phú ≈ 8×

**Quy ra người-ngày (1 dev full-stack quen game turn-based):**
| Hạng mục | Từ đầu | Nếu đã có engine cờ tướng |
|---|---|---|
| Movegen + luật + trọng tài (lặp/chiếu mãi/không tiến triển) | 4 ngày | 1.5 ngày |
| Lớp thông tin ẩn: init/rng/commit-reveal, `view()` per-viewer, `unknownPool`, chống rò rỉ | 2 ngày | 2 ngày |
| Đồng hồ (quỹ + trần/nước), tick watchdog, mất kết nối | 1 ngày | 0.3 ngày |
| Bot 3 mức (PIMC + eval + worker pool + tuning) | 5 ngày | 4 ngày |
| Test: perft (đếm nước theo độ sâu), 300 ván bot-vs-bot, test chống rò rỉ | 2 ngày | 1.5 ngày |
| UI + mỹ thuật + animation lật quân | 4 ngày | 4 ngày |
| **Tổng** | **~18 người-ngày** | **~13 người-ngày** |

**Ba điều cần nói thẳng:**

1. **Cờ úp KHÔNG phải "cờ tướng + một cái cờ boolean".** Nếu đã có cờ tướng, phần luật chỉ tốn thêm ~40%, nhưng **lớp `view()` per-viewer là code hoàn toàn mới** mà cờ tướng/cờ vua/cờ caro không hề có — và là chỗ dễ để lọt bug bảo mật nhất. Hãy làm cờ úp **sau** cờ tướng để tái dùng movegen, nhưng đừng ước lượng nó như một biến thể nhỏ.

2. **Bot tốn công gấp ~2 lần bot cờ tướng cùng độ mạnh cảm nhận.** Cùng một hàm lượng giá, bot cờ tướng chỉ cần alpha-beta; bot cờ úp cần thêm lấy mẫu xác định hoá, pool động, `coUpTerms`, và tuning λ — lại còn khó đo độ mạnh vì phương sai giữa các ván rất cao (phải chạy ≥300 ván mới phân biệt được hai cấu hình). **Dành riêng 1 ngày chỉ để làm harness đo độ mạnh**, nếu không sẽ tune mù.

3. **Nhưng phần thưởng cao.** Cờ úp là game **dễ ghép cặp nhất** trong danh sách: chênh lệch trình độ được yếu tố may rủi san bằng, nên người mới vẫn thắng được người khá — tốt cho retention hơn hẳn cờ tướng/cờ vua. Và replay "chế độ thượng đế" (xem lại toàn bộ danh tính sau ván) là tính năng viral gần như miễn phí, chỉ tốn ~0.5 ngày vì dữ liệu đã có sẵn trong `deckSalt`. **Ưu tiên cờ úp cao hơn cờ vây và cờ tỷ phú trong lộ trình.**
