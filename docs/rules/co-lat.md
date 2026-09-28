# Cờ Lật (Othello) — đặc tả luật

> **Nguồn chân lý về luật** cho engine `co-lat`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2 |
| Thời gian thực | Không |
| Có ngẫu nhiên | Không |
| Thông tin ẩn | Không |
| Độ khó cài đặt | 1/5 |

Nguồn: luật Othello của World Othello Federation. Đây là game **duy nhất** trong
bộ có một bộ luật quốc tế thống nhất, không dị bản — nên mục "biến thể" ở đây
trống, và đó là tin tốt.

## 0. TỔNG QUAN
Bàn 8×8 = 64 ô. 64 quân hai mặt, một mặt đen một mặt trắng. Đặt quân để **kẹp**
quân đối phương giữa hai quân mình, quân bị kẹp **lật** sang màu mình. Hết bàn
thì ai nhiều quân hơn thắng.

Giống cờ gánh ở một điểm cốt lõi: **không quân nào bị nhấc khỏi bàn**, chỉ đổi
màu. Khác ở chỗ số quân trên bàn **tăng dần**, không cố định.

## 1. BÀN VÀ TOẠ ĐỘ
Ô `(r, c)`, `r` = 0..7 từ trên xuống, `c` = 0..7 từ trái sang. Ký hiệu chuẩn
quốc tế là cột `a`–`h` và hàng `1`–`8`, engine dùng số nhưng UI hiển thị ký hiệu
chuẩn để người chơi đọc được biên bản ván.

## 2. THẾ XUẤT PHÁT
Bốn quân ở bốn ô giữa, xếp **chéo nhau**:

```
      d4 = trắng   e4 = đen
      d5 = đen     e5 = trắng
```

Theo `(r,c)`: `(3,3)` trắng, `(3,4)` đen, `(4,3)` đen, `(4,4)` trắng.
**Đen đi trước.** Ghế 0 = đen.

## 3. NƯỚC ĐI HỢP LỆ
Đặt một quân màu mình xuống một ô **trống**. Nước đó hợp lệ khi và chỉ khi nó
**lật được ít nhất một quân**.

Lật thế nào: từ ô vừa đặt, xét cả **8 hướng** (4 thẳng + 4 chéo). Theo một
hướng, nếu gặp **một dãy liên tục ≥ 1 quân đối phương** rồi **ngay sau đó là
một quân của mình**, thì toàn bộ dãy ở giữa bị lật. Gặp ô trống hoặc gặp mép
bàn trước khi gặp quân mình thì hướng đó không lật gì.

Ba chỗ hay cài sai:
- Phải xét **cả 8 hướng** và lật **tất cả** các hướng thoả, không dừng ở hướng đầu tiên.
- Dãy ở giữa phải **toàn** quân đối phương, không được có ô trống chen vào.
- Quân vừa lật **không** kích hoạt lật dây chuyền. Chỉ nước đặt mới lật.

## 4. BỎ LƯỢT
Đến lượt mà **không có nước hợp lệ nào** thì bên đó **bắt buộc bỏ lượt**, quyền
đi chuyển sang đối phương. Bỏ lượt **không phải là một lựa chọn** — nếu còn
nước đi thì không được bỏ.

Trong kiến trúc này, bỏ lượt là chuyện của `turn()`: `turn(s)` nhìn thế cờ và
trả về ghế **thật sự** đi được, chứ engine không phát ra một action `pass`. Bỏ
qua điểm này thì client sẽ hiện "chờ đối thủ" vĩnh viễn ở những thế không có
nước đi.

## 5. KẾT THÚC VÁN
Ván kết thúc khi **cả hai bên liên tiếp không có nước hợp lệ**. Thường là khi
bàn đầy 64 quân, nhưng cũng có thể sớm hơn (một bên bị ăn sạch, hoặc thế cờ
khoá).

Tính điểm: **đếm quân trên bàn**. Nhiều hơn thì thắng. Bằng nhau (32–32) thì hoà.

Giải đấu tính hiệu số quân làm hệ số phụ; ở đây kết quả chỉ là thắng/hoà/thua,
nhưng `Outcome.reason` **phải ghi tỉ số** (ví dụ `"38–26"`) vì đó là thứ người
chơi muốn thấy.

## 6. NHỮNG GÌ KHÔNG PHẢI LUẬT
Hai hiểu lầm phổ biến, ghi ra để không ai "sửa" engine theo chúng:
- **Không** có luật "phải đặt cạnh một quân đã có". Nước hợp lệ được định nghĩa
  duy nhất bằng "có lật được không".
- **Không** có luật hết quân thì thua. Bàn có đúng 64 quân dùng chung, bên nào
  hết quân trong hộp thì mượn của bên kia (luật thật của Othello). Trong bản số
  hoá, điều này không có ý nghĩa gì — bỏ qua.

## 7. PERFT — MỐC KIỂM CHỨNG
Số lá của cây trò chơi từ thế xuất phát. Đây là các con số **đã được công bố
rộng rãi và kiểm chéo độc lập**, nên bảng này là mốc đúng-sai thật, không phải
tự sinh:

| Độ sâu | Số thế |
|---|---|
| 1 | 4 |
| 2 | 12 |
| 3 | 56 |
| 4 | 244 |
| 5 | 1 396 |
| 6 | 8 200 |
| 7 | 55 092 |
| 8 | 390 216 |
| 9 | 3 005 288 |
| 10 | 24 571 056 |

Engine sai một con số nào trong đây là sai luật, không phải sai tối ưu.

## 8. ĐÁNH GIÁ THẾ CỜ CHO BOT
Cờ lật là game mà **trực giác của người mới sai gần như hoàn toàn**: ăn nhiều
quân ở giữa ván là **xấu**. Bot phải biết điều đó từ đầu, nếu không nó yếu hơn
cả người chơi lần đầu.

1. **Góc** (a1, a8, h1, h8) — không bao giờ bị lật, giá trị áp đảo mọi thứ khác.
2. **Ô X** (b2, b7, g2, g7) và **ô C** (a2, b1, ...) — đặt vào đó là dâng góc cho đối phương. Điểm **âm** nặng.
3. **Tính cơ động** (số nước hợp lệ của mình trừ của đối phương) — quan trọng hơn số quân suốt 50 nước đầu.
4. **Quân ổn định** (không thể bị lật bởi bất kỳ nước nào về sau) — đây mới là thứ đáng đếm, không phải số quân hiện tại.
5. **Số quân** chỉ có trọng số đáng kể ở ~12 nước cuối, và ở 4 nước cuối thì tìm kiếm vét cạn tới cuối ván luôn.

Ba mức bot: mức dễ dùng số quân (và do đó chơi sai một cách tự nhiên, giống
người mới — đúng cái người chơi cần ở mức dễ), mức vừa dùng cơ động + góc, mức
khó thêm quân ổn định và vét cạn 14 nước cuối.
