# Cờ Hex — đặc tả luật

> **Nguồn chân lý về luật** cho engine `co-hex`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2 |
| Thời gian thực | Không |
| Có ngẫu nhiên | Không |
| Thông tin ẩn | Không |
| Độ khó cài đặt | 2/5 |

Luật do Piet Hein (1942) và John Nash (1948) đặt ra độc lập, và không đổi từ đó.
Không có dị bản nào ngoài kích thước bàn.

## 0. TỔNG QUAN
Bàn hình thoi lát ô lục giác, **11×11**. Hai bên thay nhau đặt quân xuống ô
trống. **Quân đã đặt không bao giờ di chuyển, không bao giờ bị ăn.** Thắng =
nối được hai cạnh bàn của mình bằng một dải quân liền nhau.

Luật ngắn nhất trong bảy game — đúng một đoạn. Nhưng chiều sâu chiến thuật
ngang cờ vây, và nó có một tính chất mà không game nào khác trong bộ có:
**không bao giờ hoà**.

## 1. BÀN VÀ TOẠ ĐỘ
Hình thoi 11×11 ô lục giác. Lưu trong mảng `(r, c)`, `r`, `c` = 0..10, dùng
toạ độ **"axial"**: ô `(r, c)` kề với 6 ô

```
(r, c−1)  (r, c+1)
(r−1, c)  (r−1, c+1)
(r+1, c−1) (r+1, c)
```

(trong phạm vi bàn). **Không** phải 8 hướng như lưới vuông, và **không** phải 4.
Sáu hướng đó — bỏ sót `(r−1, c+1)` và `(r+1, c−1)` là lỗi cài đặt kinh điển,
nó biến Hex thành một game khác và người chơi sẽ thấy hai dải rõ ràng chạm nhau
mà máy bảo chưa nối.

Vẽ: mỗi hàng lệch sang phải nửa ô so với hàng trên, nên bàn ra hình thoi
nghiêng, không phải hình chữ nhật.

## 2. MỤC TIÊU HAI BÊN
- **Ghế 0 (Đỏ)** nối cạnh **trên** với cạnh **dưới** (hàng 0 tới hàng 10).
- **Ghế 1 (Xanh)** nối cạnh **trái** với cạnh **phải** (cột 0 tới cột 10).

Dải nối phải gồm các ô **kề nhau theo 6 hướng ở trên** và **toàn màu mình**.
Bốn ô góc thuộc về cả hai cạnh giao nhau ở đó — không có ô nào là "trung lập".

## 3. NƯỚC ĐI
Đặt một quân màu mình xuống **một ô trống bất kỳ**. Hết. Không có nước đi nào
khác, không bỏ lượt, không ăn quân. Ghế 0 đi trước.

`legal(s)` = danh sách ô trống. Ở bàn trống là 121 nước.

## 4. LUẬT ĐỔI (SWAP) — BẮT BUỘC PHẢI CÓ
Đi trước ở Hex là **lợi thế thắng ép** (xem mục 5). Không cân bằng thì ván đầu
là ván chết.

Luật đổi, còn gọi là luật bánh và dao: sau **nước đi đầu tiên** của ghế 0, ghế 1
được chọn một trong hai:
- **Đổi**: nhận lấy nước vừa đi đó làm của mình. Cụ thể: quân trên bàn đổi
  thành màu của ghế 1, và **ghế 0 đi tiếp**. (Cài bằng cách đổi màu quân chứ
  không đổi ghế — đổi ghế làm hỏng log, đồng hồ và cả biên bản ván.)
- **Không đổi**: chơi tiếp bình thường.

Nhờ luật này, ghế 0 buộc phải mở một nước **không quá mạnh cũng không quá yếu**,
và ván cờ cân. Không có luật đổi thì mọi ván đều là "ghế 0 chiếm ô giữa rồi
thắng".

Luật đổi chỉ áp dụng **đúng một lần**, ngay sau nước đầu.

## 5. KHÔNG BAO GIỜ HOÀ — VÀ ĐIỀU ĐÓ CÓ NGHĨA GÌ CHO ENGINE
**Định lý Hex** (Nash): khi bàn đã đầy, **luôn có đúng một** bên nối được hai
cạnh của mình. Không thể cả hai cùng nối, không thể không bên nào nối.

Hệ quả thực tế:
- **Không có nước hoà.** Không cần luật lặp thế, không cần luật 50 nước. Cầu
  hoà vẫn phải có (hai người thoả thuận là chuyện của người, không phải của
  luật cờ), nhưng engine **không bao giờ** tự tuyên hoà.
- **Không có thế bí.** Luôn còn nước đi cho tới khi có người thắng hoặc bàn đầy,
  và bàn đầy thì đã có người thắng rồi.
- Bằng lập luận chiến lược ăn cắp, **bên đi trước có chiến lược thắng** — chỉ
  là không ai biết nó là gì ở bàn 11×11. Đó là lý do mục 4 tồn tại.

Kiểm tra thắng: sau mỗi nước, chạy **union-find** từ ô vừa đặt. Hai nút ảo cho
hai cạnh của mỗi bên (4 nút ảo tổng cộng); nối được hai nút ảo cùng bên là
thắng. Union-find tăng dần, không quét lại cả bàn — nước nào cũng gần như O(1),
và vì quân không bao giờ bị nhấc lên nên không cần union-find có hoàn tác.

## 6. KIỂM CHỨNG
Perft ở Hex là chuyện tầm thường (`121!/(121−n)!` trừ các nhánh kết thúc sớm,
mà không nhánh nào kết thúc trước nước thứ 21) nên **không dùng perft làm mốc**.
Mốc đúng-sai ở đây là **hàm kiểm thắng**:

1. Bàn 11×11 điền ngẫu nhiên đầy, 100 000 lần: **luôn có đúng một** bên thắng.
   Đây là định lý Hex, và nó là bài test mạnh nhất có thể viết cho game này —
   bảng kề sai 1 hướng là tỉ lệ "không bên nào thắng" nhảy lên ngay.
2. Bàn nhỏ 3×3 và 4×4: giải vét cạn, bên đi trước **luôn thắng** nếu đi đúng.
3. Dải chéo dài đúng bằng bàn nhưng lệch một ô: **không** được tính là nối.

## 7. ĐÁNH GIÁ THẾ CỜ CHO BOT
Hex là game mà alpha-beta cổ điển **chơi dở** — hệ số phân nhánh 121 và không có
hàm đánh giá vật chất nào (không ăn quân, không chênh lệch quân). Dùng:

- **Mạch điện trở** (Shannon): coi ô trống là điện trở 1, ô của mình là dây dẫn
  0, ô của đối phương là hở mạch. Giải mạch, so điện trở hai bên. Rẻ, và mạnh
  hơn hẳn mọi heuristic đếm ô.
- **MCTS** cho mức khó, vì Hex là game mà MCTS mạnh một cách bất thường: ván
  ngẫu nhiên tới cuối **luôn** cho kết quả thắng thua rõ ràng (mục 5), không
  bao giờ cho hoà — nên tín hiệu rollout sạch hơn mọi game khác trong bộ.
- **Mẫu cầu** (bridge): hai quân cách nhau đúng một nhịp chéo, với hai ô trống
  nối giữa, là **nối chắc chắn** — đối phương chiếm một ô thì mình chiếm ô kia.
  Bot phải biết mẫu này, nếu không nó phí nước nối những chỗ đã nối rồi.
