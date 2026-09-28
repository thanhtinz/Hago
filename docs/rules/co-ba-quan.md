# Cờ Ba Quân — đặc tả luật

> **Nguồn chân lý về luật** cho engine `co-ba-quan`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2 |
| Thời gian thực | Không |
| Có ngẫu nhiên | Không |
| Thông tin ẩn | Không |
| Độ khó cài đặt | 1/5 |

Cùng họ với Three Men's Morris / Nine Men's Morris, và với trò "cờ ca-rô ba
quân" trẻ con Việt Nam vẫn vẽ trên nền đất.

## 0. TỔNG QUAN
Bàn nhỏ nhất trong bộ: **9 điểm**, mỗi bên **3 quân**. Ván chỉ vài chục giây.
Đây là game cố ý làm để **lấp khoảng trống một phút** — mở app lúc chờ thang
máy. Sáu game kia đều ≥ 5 phút một ván.

Thắng = xếp được **3 quân của mình thành một hàng**.

## 1. BÀN VÀ TOẠ ĐỘ
Lưới 3×3, quân đặt **trên 9 giao điểm**. Ô `i = r*3 + c`, `r`, `c` = 0..2.

Tám hàng thắng: 3 ngang, 3 dọc, 2 chéo.
```
0 1 2
3 4 5
6 7 8
```
`[0,1,2] [3,4,5] [6,7,8] [0,3,6] [1,4,7] [2,5,8] [0,4,8] [2,4,6]`

Kề (dùng ở giai đoạn 2): **ngang, dọc, và chéo qua điểm giữa**. Tức là điểm `4`
kề với cả 8 điểm; bốn góc kề 2 cạnh + điểm giữa; bốn cạnh kề 2 góc + điểm giữa.
Đường chéo **chỉ có ở hai đường chéo lớn**, không phải mọi ô.

## 2. HAI GIAI ĐOẠN
### Giai đoạn thả (6 nước đầu)
Hai bên lần lượt đặt một quân xuống một điểm trống. Ghế 0 đi trước. Xếp được 3
hàng ngay trong giai đoạn này thì thắng luôn.

### Giai đoạn đi (từ nước thứ 7)
Hết quân trong tay. Mỗi lượt **dời một quân của mình sang một điểm kề đang
trống**. Không ăn quân, không nhảy. Bàn luôn có đúng 6 quân và 3 điểm trống.

## 3. KẾT THÚC VÁN
- Xếp được 3 quân thành một hàng → **thắng ngay**.
- Đến lượt mà **không có nước đi hợp lệ** → **thua**. Hiếm nhưng có thật.
- **Hoà**: lặp thế 3 lần với cùng bên đi, hoặc 30 nước liên tiếp không ai thắng.

## 4. GAME NÀY LÀ GAME GIẢI ĐƯỢC — VÀ PHẢI XỬ LÝ CHUYỆN ĐÓ
Không gian trạng thái nhỏ tới mức **giải vét cạn được hoàn toàn** trong vài
chục mili giây. Kết quả lý thuyết: đi đúng thì **hoà**; bên đi trước có lợi thế
nhưng không thắng ép được nếu bên kia đi đúng.

Hệ quả bắt buộc cho thiết kế:
- Bot mức khó **không bao giờ thua**. Chơi với nó là chơi để hoà. Nếu không nói
  trước, người chơi sẽ nghĩ bot gian lận.
- Vì vậy **mức khó trong game này được đặt tên khác**: "Dễ", "Thường", và
  **"Không thua"** — chứ không phải "Khó". Nói thẳng ra là tôn trọng người chơi
  hơn là để họ tự phát hiện sau mười ván hoà.
- Mức "Dễ" và "Thường" **không** phải là bot khó bị làm yếu ngẫu nhiên. Chúng
  chơi tìm kiếm nông thật (2 và 4 nước), nên sai theo kiểu con người sai — bỏ
  lỡ hàng ba, không chặn hàng ba của đối phương — chứ không sai bằng cách thỉnh
  thoảng đi một nước vô nghĩa.

Bảng giải vét cạn cũng chính là **bộ test**: engine nào nói một thế là thắng mà
bảng nói hoà thì engine sai. Không cần perft ở đây — cần bảng kết quả đầy đủ.

## 5. SỐ LIỆU KIỂM CHỨNG
Từ thế xuất phát, giai đoạn thả:

| Độ sâu | Số thế |
|---|---|
| 1 | 9 |
| 2 | 72 |
| 3 | 504 |
| 4 | 3 024 |
| 5 | 15 120 |
| 6 | 60 480 |

Sáu nước đầu không ai ăn quân nên số thế đúng bằng chỉnh hợp `9!/(9−n)!` — trừ
những nhánh kết thúc sớm vì đã có người xếp được hàng ba. Bảng trên là **chưa
trừ**, nên engine sẽ ra số **nhỏ hơn** từ độ sâu 5. Con số đúng phải sinh từ
engine rồi soi tay ở độ sâu 5; ghi rõ ở đây để lần sau không ai tưởng engine sai.
