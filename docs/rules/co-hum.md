# Cờ Hùm — đặc tả luật

> **Nguồn chân lý về luật** cho engine `co-hum`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2 |
| Thời gian thực | Không |
| Có ngẫu nhiên | Không |
| Thông tin ẩn | Không |
| Độ khó cài đặt | 2/5 |

Nguồn đối chiếu: mô tả trò chơi dân gian "cờ hùm" (còn gọi cờ cọp, cờ hổ) trên
các trang trò chơi dân gian Việt Nam, và họ trò chơi săn mồi cùng kiểu đã được
mô tả kỹ ở nước ngoài: Bagh-Chal (Nepal), Sher-bakar, Lambs and tigers
(Ấn Độ), Main tapal empat (Mã Lai).

## 0. TỔNG QUAN
Game **bất đối xứng**: hai bên chơi hai luật khác nhau, thắng theo hai cách
khác nhau. Đây là game duy nhất trong bộ như vậy, và nó là lý do chính để làm.

- **Bên Hùm**: 2 con hùm, có sẵn trên bàn. Thắng bằng cách **ăn đủ 5 con dê**.
- **Bên Dê**: 12 con dê, thả dần vào bàn. Thắng bằng cách **chặn cho cả hai con
  hùm không còn nước đi nào**.

## 1. BÀN CỜ — DÙNG LẠI HÌNH CỜ GÁNH
25 điểm = giao điểm lưới 5×5. Đường kẻ: 5 ngang, 5 dọc, 2 đường chéo lớn, 4
đường nối trung điểm các cạnh. Đây là đồ thị **Alquerque**, **giống hệt cờ
gánh**, 56 cạnh.

Quy tắc kề (chép nguyên từ `docs/rules/co-ganh.md`, và engine **dùng chung
module `board.ts` của `@co/game-co-ganh`** — hai game khác luật nhưng cùng một
tấm bàn, nhân bản bảng kề là cách chắc chắn nhất để hai game lệch nhau về sau):
- Kề ngang/dọc: luôn có.
- Kề chéo: **chỉ khi `(r + c)` chẵn**.

Đánh số `i = r*5 + c`. Điểm giữa là `12`.

## 2. THẾ XUẤT PHÁT
- Hùm ở **4 góc**? **Không** — đó là Bagh-Chal với 4 hùm. Cờ hùm Việt chỉ có
  **2 hùm**, đặt ở hai điểm: `0` (góc trên trái) và `24` (góc dưới phải).
- 12 dê **chưa có trên bàn**, nằm ngoài chờ thả.
- 21 điểm còn lại trống.
- **Bên Dê đi trước** (ghế 0 = Dê, ghế 1 = Hùm).

## 3. HAI GIAI ĐOẠN CỦA BÊN DÊ
### Giai đoạn thả (còn dê ngoài bàn)
Nước đi của bên Dê là **thả một con dê xuống một điểm trống bất kỳ**. Bên Dê
**không được di chuyển** dê đã ở trên bàn khi vẫn còn dê chưa thả.

### Giai đoạn đi (đã thả hết 12 dê)
Nước đi của bên Dê là **dời một con dê sang một điểm kề đang trống**. Dê
**không ăn được gì, không nhảy được**.

Phân biệt hai giai đoạn bằng `s.goatsInHand > 0`, không bằng đếm số nước đã đi —
vì dê bị ăn không làm dê trong tay mọc lại.

## 4. NƯỚC ĐI CỦA HÙM
Mỗi lượt, một con hùm làm **một trong hai**:
- **Đi**: sang một điểm kề đang trống.
- **Ăn**: nhảy qua **đúng một con dê** ở điểm kề, đáp xuống điểm **ngay sau nó
  trên cùng một đường thẳng**, điểm đó phải trống. Con dê bị nhảy qua bị **nhấc
  khỏi bàn** (khác cờ gánh: ở đây quân chết thật).

Điều kiện hình học của nước ăn — chỗ dễ sai nhất:
`hùm ở a`, `dê ở b`, `đáp xuống c`. Phải có **`a`, `b`, `c` thẳng hàng, cách
đều, và cả `a–b` lẫn `b–c` đều là cạnh của đồ thị Alquerque**. Không đủ nếu chỉ
kiểm `c = 2b − a`: ở lưới này có những bộ ba thẳng hàng cách đều mà đoạn giữa
**không có đường kẻ** (ví dụ đi chéo từ một điểm lẻ). Cách cài đúng và rẻ: dựng
sẵn bảng `JUMP[a] = [{ over, to }]` một lần lúc khởi động, từ chính bảng kề.

Ba khác biệt so với Bagh-Chal, ghi rõ để không ai "sửa" theo bản quốc tế:
- **Ăn không bắt buộc.** Hùm được quyền đi nước thường dù đang ăn được.
- **Không ăn liên hoàn.** Ăn một con là hết lượt.
- **Chỉ 2 hùm, ăn 5 dê là thắng** (Bagh-Chal: 4 hùm, 20 dê, ăn 5 thắng).

## 5. KẾT THÚC VÁN
- **Hùm thắng** khi đã ăn **5 dê**.
- **Dê thắng** khi tới lượt Hùm mà **không con hùm nào có nước đi hợp lệ nào**
  (cả đi lẫn ăn).
- **Hoà**:
  - Hai bên thoả thuận.
  - **Lặp thế 3 lần** cùng bên đi. Cần thật, vì hai con hùm qua lại giữa hai
    điểm là thế hoà tự nhiên hay gặp nhất ở game này.
  - Sau giai đoạn thả, **40 nước liên tiếp của cả hai bên** không ăn được con dê
    nào → hoà.

Lưu ý bên Dê **không** thua vì hết dê: ăn con dê thứ 5 là hùm thắng ngay, lúc
đó trên bàn vẫn còn dê.

## 6. CÂN BẰNG — VÌ SAO 2 HÙM / 12 DÊ / ĂN 5
Con số này quyết định game có chơi được không, nên phải đo chứ không chọn theo
cảm giác. Kế hoạch: sau khi engine chạy, cho bot mức khó self-play **2 000 ván**
với từng bộ tham số và xem tỉ lệ thắng hai bên.

| Bộ | Hùm | Dê | Ăn để thắng | Dự đoán |
|---|---|---|---|---|
| A (mặc định) | 2 | 12 | 5 | ? |
| B | 2 | 10 | 5 | Hùm mạnh hơn |
| C | 3 | 15 | 6 | Hùm mạnh hơn nhiều (3 hùm phối hợp) |

Nếu bộ A lệch quá 60–40, đổi **số dê** trước (dễ hiểu với người chơi nhất), rồi
mới tới số dê phải ăn. **Không** đổi số hùm — "hai ông hùm" là cái tên và cái
hình của trò chơi.

Ván thường đổi bên sau mỗi ván, và tỉ số phiên tính theo cặp ván, vì chơi một
bên một ván thì bên nào mạnh hơn cũng không nói lên điều gì.

## 7. ĐÁNH GIÁ THẾ CỜ CHO BOT
Bất đối xứng nên **hàm đánh giá cũng bất đối xứng** — một hàm dùng chung cho cả
hai bên sẽ chơi dở ở ít nhất một bên.

Bên Hùm:
1. Số dê đã ăn (áp đảo).
2. Số nước đi khả dụng của hùm — **bị vây là thua**, nên đây gần như là điểm sống.
3. Số nước ăn đang sẵn (đe doạ).
4. Hùm đứng ở điểm **bậc 8** (các điểm `(r+c)` chẵn, có 8 hướng) tốt hơn điểm bậc 4.

Bên Dê:
1. Số nước đi khả dụng của **đối phương**, càng ít càng tốt (đảo dấu của mục 2 ở trên).
2. Số dê **đang bị đe doạ ăn** — điểm âm nặng, dê mất là không quay lại.
3. Dê đứng **thành khối liền** (mỗi cặp dê kề nhau là một điểm) — dê lẻ loi là mồi.
4. Trong giai đoạn thả: **đừng thả cạnh hùm**. Bot dễ nhất cũng phải biết điều này,
   không thì nó thua trong 6 nước và người chơi nghĩ game hỏng.
