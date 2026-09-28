# Cờ Nhật (Shogi) — đặc tả luật

> **Nguồn chân lý về luật** cho engine `co-nhat`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2 |
| Thời gian thực | Không |
| Có ngẫu nhiên | Không |
| Thông tin ẩn | Không |
| Độ khó cài đặt | 4/5 |

Luật của Liên đoàn Shogi Nhật Bản (NSR). Game nặng nhất trong bộ sau cờ vây.

## 0. TỔNG QUAN
Bàn 9×9, mỗi bên 20 quân. Thắng = **chiếu bí Vua** đối phương.

Điểm làm shogi khác mọi game cờ khác: **quân ăn được đổi chủ**. Quân bạn ăn vào
tay bạn, và bạn **thả** nó xuống bàn làm quân của mình ở một lượt sau. Vì vậy
lực lượng trên bàn **không bao giờ giảm**, và **hoà gần như không tồn tại** —
khoảng 1–2% số ván, so với ~50% ở cờ vua trình độ cao.

## 1. BÀN VÀ TOẠ ĐỘ
9×9 = 81 ô, không màu. Ô `(r, c)`, `r` = 0..8 từ phía đối phương xuống, `c` =
0..8. Ký hiệu chuẩn Nhật là cột 9→1 từ phải sang và hàng 一→九, UI hiển thị
kiểu đó, engine dùng số.

Ghế 0 (**Tiên thủ**, đi trước) ở dưới, tiến theo `r` giảm. Ghế 1 (**Hậu thủ**)
ở trên, tiến theo `r` tăng. Quân hai bên **cùng hình dạng**, phân biệt bằng
**hướng quay** của quân — trong bản số hoá thì bằng màu và hướng chữ.

**Vùng phong** của một bên là **3 hàng cuối phía đối phương**: hàng 0,1,2 với
ghế 0; hàng 6,7,8 với ghế 1.

## 2. QUÂN VÀ NƯỚC ĐI
Tám loại. Cột "phong" là quân sau khi lật.

| Quân | Ký tự | Đi | Phong thành | Đi sau phong |
|---|---|---|---|---|
| Vua | 王/玉 | 1 ô mọi hướng (8) | — | — |
| Phi xa | 飛 | trượt ngang dọc tuỳ ý | Long vương 龍 | + 1 ô chéo |
| Giác hành | 角 | trượt chéo tuỳ ý | Long mã 馬 | + 1 ô ngang dọc |
| Kim tướng | 金 | 1 ô: 6 hướng (mọi hướng trừ 2 chéo lùi) | — | — |
| Ngân tướng | 銀 | 1 ô: 4 chéo + thẳng tiến | Thành ngân 成銀 | như Kim tướng |
| Quế mã | 桂 | nhảy chữ L **chỉ về phía trước**, 2 hướng | Thành quế 成桂 | như Kim tướng |
| Hương xa | 香 | trượt **thẳng tiến** tuỳ ý | Thành hương 成香 | như Kim tướng |
| Tốt | 歩 | 1 ô **thẳng tiến** | Thổ kim と | như Kim tướng |

Chú ý bốn chỗ hay sai:
- **Quế mã nhảy qua đầu quân khác** (như mã cờ vua), khác hẳn mã cờ tướng có
  chân mã. Và nó **chỉ đi tiến**, không bao giờ lùi.
- **Hương xa không lùi được**, kể cả một ô.
- Năm quân phong (Ngân, Quế, Hương, Tốt) đều phong thành **cùng một thứ**: đi
  như Kim tướng. Không cần bốn bảng nước đi, chỉ cần một.
- **Vua và Kim tướng không phong.**

### Xếp quân đầu ván (ghế 0, hàng dưới; ghế 1 đối xứng)
```
hàng 8:  香 桂 銀 金 王 金 銀 桂 香
hàng 7:      飛             角
hàng 6:  歩 歩 歩 歩 歩 歩 歩 歩 歩
```
Phi xa ở `(7,1)`, Giác hành ở `(7,7)` — **không** đối xứng gương, và đây là chỗ
nhiều bản cài sai.

## 3. PHONG QUÂN
Khi một nước đi **xuất phát từ, đi vào, hoặc đi trong** vùng phong, quân được
**tuỳ chọn** lật thành quân phong. Lật rồi thì không lật lại; quân bị ăn thì trở
về dạng chưa phong khi vào tay.

**Phong bắt buộc** khi quân sẽ không còn nước đi nào nữa:
- Tốt và Hương xa vào **hàng cuối cùng**.
- Quế mã vào **hai hàng cuối**.

Nên `legal()` ở shogi trả về **hai action riêng** cho một nước đi có chọn phong:
`{ from, to, promote: false }` và `{ from, to, promote: true }`. Gộp thành một
rồi hỏi người chơi ở tầng UI là sai kiến trúc — trọng tài phải nhận đủ thông tin
để tái lập ván.

## 4. THẢ QUÂN — LUẬT LÀM NÊN SHOGI
Quân ăn được vào **tay** (`hand`) của người ăn, ở dạng **chưa phong**. Thay vì
đi một nước trên bàn, người chơi có thể **thả** một quân trong tay xuống **bất
kỳ ô trống nào**. Quân thả xuống luôn ở dạng **chưa phong** và không được phong
ngay ở nước thả.

Bốn hạn chế, tất cả đều bắt buộc:
1. **Không thả vào ô đã có quân.**
2. **Không thả vào ô mà quân đó sẽ không có nước đi nào**: Tốt/Hương xa vào hàng
   cuối, Quế mã vào hai hàng cuối.
3. **Nhị bộ (二歩)**: **không được thả Tốt vào cột đã có Tốt chưa phong của
   mình**. Tốt đã phong (Thổ kim) không tính. Vi phạm là **thua ngay** trong
   giải đấu; ở đây engine đơn giản là không liệt kê nước đó.
4. **Đả bộ chiếu bí (打ち歩詰め)**: **không được thả Tốt để chiếu bí**. Thả Tốt
   để **chiếu** thì được; chỉ cấm khi nước thả đó là chiếu **bí**. Chiếu bí bằng
   Tốt **đã ở trên bàn** thì hoàn toàn hợp lệ.

Luật 4 là luật khó cài nhất trong cả bảy game: muốn biết một nước thả Tốt có
hợp lệ không thì phải **sinh toàn bộ nước đi của đối phương sau nước đó**. Đừng
tối ưu: chỉ kiểm khi nước đang xét đúng là "thả Tốt và có chiếu", tức là vài lần
mỗi ván.

## 5. KẾT THÚC VÁN
- **Chiếu bí** (詰み): đến lượt, Vua đang bị chiếu, và không có nước hợp lệ nào
  thoát. Bên bị chiếu bí **thua**.
- **Hết nước đi** (ステイルメイト): đến lượt mà không có nước hợp lệ nào, kể cả
  khi Vua không bị chiếu → bên đó **thua** (khác cờ vua, ở đó là hoà). Thế này
  gần như không xảy ra vì luôn thả được quân.
- **Cấm lặp (千日手)**: **cùng một thế**, cùng bên đi, cùng quân trong tay, lặp
  **4 lần** → **hoà**. Nhưng nếu trong chuỗi lặp đó một bên **chiếu liên tục**,
  thì **bên chiếu thua**. Đây là đối trọng của shogi với "chiếu mãi là hoà" ở
  cờ vua, và nó đổi hẳn cách chơi tàn cuộc.
- **Nhập ngọc (入玉)**: hai Vua đều vào được vùng phong của đối phương thì không
  ai chiếu bí ai được. Tính điểm 27: Phi xa và Giác hành (kể cả đã phong) 5
  điểm, các quân khác 1 điểm, tính cả quân trong tay và quân trong vùng phong.
  Cả hai bên ≥ 24 điểm → hoà; một bên < 24 → bên đó thua.
  **Bản đầu chỉ cài phần hoà theo thoả thuận**, nhập ngọc đầy đủ để sau, và ghi
  rõ trong app là chưa có — thế cờ này chiếm dưới 1% số ván nghiệp dư.
- Đầu hàng (投了) là cách kết thúc thường gặp nhất trong thực tế.

## 6. PERFT — MỐC KIỂM CHỨNG
Số thế từ thế xuất phát chuẩn. Đây là con số **đã được công bố và kiểm chéo
độc lập** giữa nhiều engine shogi, nên là mốc đúng-sai thật:

| Độ sâu | Số thế |
|---|---|
| 1 | 30 |
| 2 | 900 |
| 3 | 25 470 |
| 4 | 719 731 |
| 5 | 19 861 490 |

Độ sâu 1 = 30 là bài test rẻ nhất và bắt được nhiều lỗi nhất: 20 nước Tốt? Không
— 9 Tốt + 2 Ngân + 2 Quế + 2 Hương + 2 Kim + Giác + Phi xa. Đếm sai ở đây là
bảng nước đi sai.

Engine sai một con số nào trong bảng là **sai luật**, không phải chậm.

## 7. ĐÁNH GIÁ THẾ CỜ CHO BOT
Không dùng lại được hàm đánh giá của cờ vua, vì ba lý do:
1. **Quân trong tay có giá trị riêng**, thường cao hơn cùng quân đó trên bàn —
   nó thả được vào bất kỳ đâu.
2. **Không có tàn cuộc đơn giản.** Lực lượng không giảm, nên không có giai đoạn
   ít quân để chuyển hàm đánh giá.
3. **An toàn của Vua áp đảo.** Thế thủ (囲い — mái nhà chữ kim, mái hang gấu)
   đáng giá hơn cả một quân. Bot không biết xây thế thủ sẽ bị chiếu bí ở nước 30.

Giá trị quân tham khảo (Tốt = 100): Hương 430, Quế 450, Ngân 640, Kim 690,
Giác 890, Phi xa 1 040. Quân phong cộng thêm 20–30%. Quân trong tay nhân ~1.1.
Đây là bộ số khởi điểm để self-play tinh chỉnh, không phải chân lý.
