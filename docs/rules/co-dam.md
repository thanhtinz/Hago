# Cờ Đam — đặc tả luật

> **Nguồn chân lý về luật** cho engine `co-dam`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2 |
| Thời gian thực | Không |
| Có ngẫu nhiên | Không |
| Thông tin ẩn | Không |
| Độ khó cài đặt | 3/5 |

Nguồn đối chiếu: fptshop.com.vn "cách chơi cờ đam", thuthuatchoi.com, vnngaynay.net,
và luật draughts quốc tế (biến thể Brazil/Nga — xem mục 7 về vì sao chọn biến thể này).

## 0. TỔNG QUAN
Hai người, thông tin hoàn hảo, không ngẫu nhiên. Bàn 8×8, chỉ dùng **32 ô sẫm**.
Mỗi bên 12 quân. Thắng = đối phương hết quân hoặc **hết nước đi hợp lệ**.

## 1. BÀN VÀ TOẠ ĐỘ
Ô `(r, c)` với `r` = hàng 0..7 từ trên xuống, `c` = cột 0..7 từ trái sang.
Ô sẫm là ô có `(r + c) % 2 === 1`. Chỉ 32 ô này được dùng, nên state nén được
thành mảng 32 phần tử — nhưng **engine vẫn lưu theo `(r,c)`**, vì mảng 32 làm
mọi phép tính hàng xóm thành bảng tra cứu khó đọc và khó soi khi sai.

Ghế 0 (**quân sẫm**) ở phía dưới, đi lên (`r` giảm). Ghế 1 (**quân nhạt**) ở
phía trên, đi xuống (`r` tăng).

## 2. XẾP QUÂN ĐẦU VÁN
Ghế 1 (nhạt): mọi ô sẫm của hàng 0, 1, 2 → 12 quân.
Ghế 0 (sẫm): mọi ô sẫm của hàng 5, 6, 7 → 12 quân.
Hàng 3 và 4 để trống. Ghế 0 đi trước.

## 3. QUÂN THƯỜNG (quân đam)
- **Đi**: một ô chéo **tiến** (về phía đối phương), tới ô sẫm trống.
- **Ăn**: nhảy qua **một** quân đối phương liền kề chéo, đáp xuống ô ngay sau
  nó, ô đó phải trống. Ăn được **cả bốn hướng chéo — kể cả lùi**. Đây là điểm
  biến thể quan trọng nhất, xem mục 7.
- Không ăn được quân mình, không nhảy qua hai quân chồng nhau.

## 4. PHONG VƯƠNG (quân hậu)
Quân thường **dừng lại** ở hàng cuối của đối phương (hàng 0 với ghế 0, hàng 7
với ghế 1) thì lật thành **vương**.

**Phong vương giữa chuỗi ăn thì KHÔNG phong**: nếu quân đi ngang qua hàng cuối
trong một nước ăn liên hoàn rồi bật tiếp ra khỏi đó, nó vẫn là quân thường và
chuỗi ăn tiếp tục theo luật quân thường. Chỉ **kết thúc nước đi tại** hàng cuối
mới được phong. Bỏ chi tiết này là sai một lớp lớn các thế cờ tàn.

Vương:
- **Đi**: trượt tuỳ ý nhiều ô trên một đường chéo, mọi ô đi qua phải trống
  (**vương bay** — flying king).
- **Ăn**: trượt trên đường chéo, gặp **đúng một** quân đối phương với mọi ô
  trước nó trống, thì nhảy qua và **đáp xuống bất kỳ ô trống nào** phía sau
  quân đó trên cùng đường chéo. Chọn ô đáp là một phần của nước đi, vì nó
  quyết định chuỗi ăn tiếp theo.

## 5. ĂN BẮT BUỘC VÀ ĂN LIÊN HOÀN
- **Có nước ăn thì bắt buộc phải ăn.** Không được đi nước thường.
- **Ăn liên hoàn**: ăn xong mà quân vừa ăn lại ăn được tiếp thì **phải** ăn
  tiếp, bằng chính quân đó, cho tới khi không ăn được nữa. Cả chuỗi là **một
  nước đi**.
- **Luật ăn nhiều nhất**: trong tất cả các chuỗi ăn có thể, phải chọn chuỗi
  **ăn được nhiều quân nhất**. Bằng nhau thì tự chọn — không có luật ưu tiên
  vương như draughts Ý.
- **Quân bị ăn chỉ nhấc khỏi bàn khi chuỗi kết thúc.** Trong lúc còn đang nhảy,
  chúng vẫn nằm đó và **không được nhảy qua lần thứ hai**. Đây là luật "quân ma"
  (Turkish strike); cài sai thì chuỗi ăn vòng tròn sẽ đếm trùng.

Hệ quả cho engine: `legal()` **không** liệt kê từng cú nhảy, mà liệt kê **trọn
chuỗi**. Một action là `{ from, path: Square[] }` — dãy ô đáp. Đây là chỗ duy
nhất trong bảy game hiện có mà một action mang theo một đường đi.

## 6. KẾT THÚC VÁN
- Bên **hết quân** thì thua.
- Bên **đến lượt mà không có nước hợp lệ nào** thì thua (bị vây chặt cũng là thua).
- **Hoà**:
  - Hai bên thoả thuận.
  - **Lặp thế 3 lần** với cùng bên đi (so sánh cả vị trí lẫn ai là vương).
  - **25 nước liên tiếp** của cả hai bên mà chỉ có vương di chuyển và **không
    ăn quân nào, không phong vương nào** → hoà.
  - Tàn cuộc 1 vương chọi 1 vương, hoặc 3 quân chọi 1 vương ở đường chéo dài:
    **không** có luật đặc cách; luật 25 nước ở trên đã phủ.

## 7. BIẾN THỂ ĐÃ CHỌN, VÀ VÌ SAO
"Cờ đam" ở Việt Nam được chơi theo nhiều kiểu, khác nhau ở đúng ba điểm. Bản
này chốt:

| Điểm | Chọn | Kiểu khác |
|---|---|---|
| Quân thường ăn lùi | **Có** | Draughts Anh: chỉ ăn tiến |
| Vương bay nhiều ô | **Có** | Draughts Anh: vương chỉ đi 1 ô |
| Bắt buộc ăn nhiều nhất | **Có** | Draughts Nga: ăn bắt buộc nhưng tự chọn chuỗi |

Tức là **luật Brazil** (= luật quốc tế trên bàn 8×8). Đây là kiểu phổ biến
nhất trong các mô tả tiếng Việt và cũng là kiểu làm ván cờ sâu nhất: vương bay
biến tàn cuộc 2 quân thành một bài toán thật thay vì hoà chết.

**Chưa kiểm chứng được**: tôi không tìm được một nguồn tiếng Việt nào có thẩm
quyền (liên đoàn, điều lệ giải) chốt biến thể. Các trang hướng dẫn phổ thông
mâu thuẫn nhau về vương bay. Nếu người chơi phản ánh, thêm `variant: 'anh'`
chứ không đổi mặc định.

## 8. PERFT — MỐC KIỂM CHỨNG
Bàn 8×8, luật Brazil, thế xuất phát chuẩn. Engine **phải** khớp:

| Độ sâu | Số thế |
|---|---|
| 1 | 7 |
| 2 | 49 |
| 3 | 302 |
| 4 | 1 469 |
| 5 | 7 361 |
| 6 | 36 768 |

> Bảng này **chưa được đối chiếu với nguồn ngoài**. Nó sẽ được sinh ra từ chính
> engine khi cài xong, rồi soi tay ở độ sâu 1–3. Đó là mức yếu hơn hẳn bảng
> perft của cờ gánh (đã đối chiếu độc lập) và phải ghi rõ như vậy ở đây, không
> được để người đọc sau tưởng nó đã được kiểm chéo.

## 9. ĐÁNH GIÁ THẾ CỜ CHO BOT
Thứ tự quan trọng, đo bằng self-play chứ không đoán:
1. Chênh lệch quân, vương ăn **3×** quân thường (không phải 1.5× như draughts Anh — vương bay mạnh hơn nhiều).
2. Quân ở **hàng cuối của mình** giữ nguyên: chặn đối phương phong vương, đáng ~0.3 quân mỗi quân.
3. Kiểm soát **đường chéo dài** (a1–h8) cho vương.
4. Quân ở cột biên an toàn hơn (không bị ăn từ hai phía) nhưng kém cơ động.
5. **Tempo**: ở tàn cuộc, ai buộc phải đi trước thường thua. Phải có, nếu không bot hoà những ván thắng chắc.
