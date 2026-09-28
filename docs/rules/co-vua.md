# Cờ Vua — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-vua`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | False |
| Thông tin ẩn | False |
| Độ khó cài đặt | 3/5 |

CỜ VUA (Chess) — theo Luật Cờ Vua FIDE có hiệu lực từ 01/01/2023, bản dịch của Liên đoàn Cờ Việt Nam (QĐ 71/LĐCVN ngày 06/10/2023). Việt Nam KHÔNG có biến thể riêng cho cờ vua: luật thi đấu trong nước là luật FIDE nguyên bản. Chỉ khác ở thuật ngữ và ở vài quy ước nền tảng online, sẽ ghi rõ bên dưới.

════════ 1. BÀN CỜ VÀ TỌA ĐỘ ════════
Bàn 8x8. Cột (file) a..h từ trái sang phải theo mắt bên Trắng. Hàng (rank) 1..8 từ phía Trắng lên phía Đen.
Ô a1 là ô TỐI, ô h1 là ô SÁNG (quy tắc kiểm tra: "ô sáng nằm ở góc phải dưới của người cầm Trắng").
Chỉ số nội bộ khuyến nghị: sq = rank*8 + file, với a1=0, b1=1, ..., h1=7, a8=56, ..., h8=63.
file = sq & 7; rank = sq >> 3.
Trắng tiến theo chiều rank tăng (+8), Đen tiến theo chiều rank giảm (-8).

════════ 2. BỐ TRÍ BAN ĐẦU ════════
FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
Trắng: Xe a1, Mã b1, Tượng c1, Hậu d1, Vua e1, Tượng f1, Mã g1, Xe h1; Tốt a2..h2.
Đen: Xe a8, Mã b8, Tượng c8, Hậu d8, Vua e8, Tượng f8, Mã g8, Xe h8; Tốt a7..h7.
Kiểm tra nhanh: Hậu đứng trên ô cùng màu với mình (Hậu Trắng ở d1 — ô sáng; Hậu Đen ở d8 — ô tối).
Trắng đi trước. Hai bên đi luân phiên, KHÔNG có nước bỏ lượt (pass).

Thuật ngữ tiếng Việt dùng trong UI: Vua (K), Hậu (Q), Xe (R), Tượng (B), Mã (N), Tốt (P). Nhập thành gần / nhập thành xa. Bắt tốt qua đường. Phong cấp (dân gian gọi là "phong hậu"). Chiếu. Chiếu hết (chiếu bí). Pat (hết nước đi). Hòa.

════════ 3. NƯỚC ĐI CỦA TỪNG QUÂN (chưa xét ràng buộc chiếu) ════════
Nguyên tắc chung: không quân nào được đứng vào ô đang có quân CÙNG màu. Ăn quân = đi vào ô có quân KHÁC màu và nhấc quân đó ra khỏi bàn. Trừ Mã, mọi quân đều bị chặn bởi quân bất kỳ nằm trên đường đi.

• XE: đi số ô tùy ý theo hàng ngang hoặc cột dọc, dừng ở ô trống hoặc ô có quân địch (ăn), không nhảy qua quân.
• TƯỢNG: đi số ô tùy ý theo đường chéo. Tượng vĩnh viễn giữ nguyên màu ô.
• HẬU: hợp của Xe và Tượng (8 hướng, số ô tùy ý, không nhảy).
• MÃ: đi hình chữ L — offset (±1,±2) và (±2,±1) theo (file,rank), tối đa 8 ô đích. Mã NHẢY qua mọi quân; chỉ ô đích mới quan trọng. Khi cài bằng mảng 64 ô phải chặn wrap-around: kiểm tra |Δfile| ∈ {1,2} và |Δrank| = 3-|Δfile|.
• VUA: đi 1 ô theo 8 hướng; cộng thêm nước nhập thành (mục 6).
• TỐT: bốn khả năng, tất cả đều theo chiều tiến của màu mình, TỐT KHÔNG BAO GIỜ ĐI LÙI.
  (a) Tiến 1 ô nếu ô đó TRỐNG.
  (b) Từ hàng xuất phát (rank 2 với Trắng, rank 7 với Đen) tiến 2 ô nếu CẢ HAI ô (ô giữa và ô đích) đều TRỐNG. Đây là điều kiện hay sai: nhiều bản cài chỉ kiểm tra ô đích.
  (c) Ăn chéo tiến 1 ô, chỉ khi ô chéo đó CÓ quân địch. Tốt KHÔNG ăn được theo hướng đi thẳng, và không "đứng yên ăn".
  (d) Bắt tốt qua đường (mục 4).
  Tốt tới hàng cuối thì bắt buộc phong cấp (mục 5).

════════ 4. BẮT TỐT QUA ĐƯỜNG (en passant) ════════
Điều kiện ĐỦ, cả 4 phải đồng thời đúng:
 (a) Nước NGAY TRƯỚC của đối phương là một nước tốt đi 2 ô từ hàng xuất phát.
 (b) Tốt đó dừng ở ô nằm CÙNG HÀNG và KỀ CỘT (|Δfile| = 1) với một tốt của ta.
 (c) Ta đi tốt của mình chéo tiến 1 ô vào ô mà tốt địch vừa ĐI QUA (ô "qua đường").
 (d) Ta thực hiện NGAY ở nước kế tiếp. Không dùng là mất quyền vĩnh viễn với nước tốt 2 ô đó.
Ví dụ: Đen đi d7-d5; ô qua đường là d6. Tốt Trắng ở c5 hoặc e5 có thể đi tới d6, và tốt Đen ở d5 bị nhấc ra.
CÀI ĐẶT: quân bị ăn nằm ở ô KHÁC ô đích của nước đi. Ô bị xóa = (file của ô đích, rank của ô xuất phát). Đây là nước đi duy nhất trong cờ vua có tính chất đó — mọi hàm makeMove viết kiểu "board[to] = board[from]; board[from] = 0" đều sai ở đây.
BẪY KINH ĐIỂN: nước bắt tốt qua đường rời HAI quân khỏi cùng một hàng ngang cùng lúc, nên có thể để lộ vua mình trước Xe/Hậu địch trên hàng đó. Ví dụ FEN: 8/8/8/K2pP2q/8/8/8/7k w - d6 0 1 — nước exd6 e.p. là BẤT HỢP LỆ vì sau đó Hh5 chiếu Va5 dọc hàng 5. Bộ lọc "thử đi rồi kiểm tra vua bị chiếu" xử lý đúng ca này; bộ lọc bằng bitmask ghim (pin) thủ công thì thường bỏ sót.
LƯU TRỮ: epSquare = ô "qua đường" (d6 trong ví dụ), null nếu không có.
QUY ƯỚC BẮT BUỘC: chỉ set epSquare khi THỰC SỰ tồn tại ít nhất một nước bắt qua đường HỢP LỆ (đã lọc chiếu). Lý do: epSquare nằm trong khóa so sánh "cùng thế cờ" khi đếm lặp 3 lần (điều 9.2.3.1). Nếu set bừa mỗi lần tốt đi 2 ô, việc đếm lặp sẽ sai. Đây cũng là cách lichess/python-chess sinh FEN.

════════ 5. PHONG CẤP ════════
• Khi tốt đi tới hàng cuối cùng (rank 8 với Trắng, rank 1 với Đen) — bằng nước tiến hoặc nước ăn chéo — nó PHẢI được thay ngay trong cùng nước đi bằng Hậu, Xe, Tượng hoặc Mã CÙNG MÀU, theo lựa chọn của người chơi. Không được giữ nguyên tốt, không được chọn Vua, không được chọn quân màu địch.
• Không phụ thuộc vào số quân đã bị bắt: có thể tồn tại 9 Hậu, 10 Xe...
• Quân mới có hiệu lực NGAY LẬP TỨC — có thể chiếu hoặc chiếu hết ngay trong nước đó.
• Phong cấp thấp (underpromotion) là hợp lệ và đôi khi là nước duy nhất thắng/hòa (phong Mã để chiếu đôi; phong Xe để tránh pat). Bộ sinh nước PHẢI sinh đủ 4 biến thể cho mỗi nước tốt tới hàng cuối, nếu không perft sẽ sai và bot sẽ bỏ lỡ nước.
• PROTOCOL: action `move` bắt buộc có field `promotion` khi quân đi là tốt và ô đích ở hàng cuối. Thiếu field → server TỪ CHỐI action. Server KHÔNG tự mặc định Hậu (mặc định là việc của UI, để tránh mất nước phong Mã do lỗi truyền tin).
• halfmoveClock reset về 0 (vì đây là nước tốt), kể cả khi phong cấp không ăn quân.

════════ 6. NHẬP THÀNH ════════
Là nước đi kép của Vua và một Xe cùng màu, tính là MỘT nước đi của VUA (quan trọng khi cài: xử lý như nước vua, không phải nước xe).
• Nhập thành gần (cánh Vua, ký hiệu O-O): Trắng Vua e1→g1 và Xe h1→f1. Đen Vua e8→g8 và Xe h8→f8.
• Nhập thành xa (cánh Hậu, ký hiệu O-O-O): Trắng Vua e1→c1 và Xe a1→d1. Đen Vua e8→c8 và Xe a8→d8.

SÁU điều kiện, tất cả phải đúng:
 1. Vua chưa TỪNG rời ô xuất phát trong suốt ván (đi ra rồi quay về vẫn mất quyền).
 2. Xe tương ứng chưa TỪNG rời ô xuất phát và vẫn còn trên bàn.
 3. Mọi ô GIỮA Vua và Xe đều trống. Gần: f1, g1. Xa: b1, c1, d1 — NHỚ Ô b1, đây là lỗi bỏ sót phổ biến nhất.
 4. Vua KHÔNG đang bị chiếu.
 5. Ô Vua ĐI QUA không bị quân địch tấn công. Gần: f1. Xa: d1.
 6. Ô Vua ĐẾN không bị quân địch tấn công. Gần: g1. Xa: c1.

VẪN ĐƯỢC PHÉP nhập thành dù:
 • Xe đang bị tấn công.
 • Ô mà XE đi qua hoặc đến đang bị tấn công. Cụ thể: ô b1 bị tấn công VẪN nhập thành xa được (chỉ cần b1 trống). Đây là lỗi thứ hai hay gặp.

MẤT QUYỀN VĨNH VIỄN:
 • Vua đi bất kỳ nước nào (kể cả chính nước nhập thành) → mất cả hai bên của màu đó.
 • Xe đi → mất bên của xe đó.
 • Xe BỊ ĂN ngay tại ô gốc (a1/h1/a8/h8) → mất bên đó. CÀI ĐẶT: sau mỗi nước, AND castling mask theo CẢ ô `from` LẪN ô `to`. Bảng mask: a1→xóa bit Q, e1→xóa K|Q, h1→xóa K, a8→xóa q, e8→xóa k|q, h8→xóa k. Chỉ xử lý theo `from` là bug (bắt xe ở góc vẫn giữ quyền nhập thành → sinh ra nước ma).
 Lưu ý phân biệt: điều kiện 1–2 là MẤT QUYỀN (vĩnh viễn); điều kiện 3–6 là TẠM THỜI BỊ CẢN — khi quân cản đi chỗ khác hoặc quân tấn công biến mất thì lại nhập thành được.

MÃ HÓA NƯỚC: dùng UCI kiểu "vua đi hai ô" — e1g1, e1c1, e8g8, e8c8. Ghi rõ trong protocol để client không gửi "e1h1". Trong move object nội bộ nên có field `castle: 'K'|'Q'|null` riêng, để sau này nếu thêm Chess960 (quy ước "vua ăn xe") chỉ đổi lớp mã hóa mà không phải sửa engine.

════════ 7. CHIẾU VÀ TÍNH HỢP LỆ CỦA NƯỚC ĐI ════════
• Vua bị CHIẾU khi ô của nó bị ít nhất một quân địch tấn công.
• Một nước đi là HỢP LỆ khi và chỉ khi: nó là nước đi giả hợp lệ theo mục 3–6, VÀ sau khi thực hiện, vua của BÊN VỪA ĐI không bị chiếu. Không cần cài riêng khái niệm "quân bị ghim không được đi" — điều kiện trên đã bao trùm ghim tuyệt đối, ghim tương đối khi đi lệch tia, và ca bắt tốt qua đường ở mục 4.
• Vua không được đi vào ô bị tấn công, kể cả ô kề vua địch. Hệ quả: hai vua không bao giờ đứng kề nhau.
• BẪY: khi kiểm tra ô đích của vua có bị tấn công không, phải TẠM NHẤC VUA khỏi bàn khi dò tia của Xe/Hậu/Tượng. Nếu không, nước "vua lùi thẳng ra sau dọc theo tia đang chiếu" sẽ bị coi là hợp lệ — bug này lọt qua hầu hết test thủ công nhưng perft depth 3–4 sẽ bắt được.
• Không bắt buộc thoát chiếu theo cách nào: đi vua, chắn tia, hoặc ăn quân đang chiếu đều được, miễn thỏa điều kiện trên.
• Không được đi nước để lộ vua mình ra chiếu (tự sát) — cũng là hệ quả của cùng một điều kiện.
• Không có nước bỏ lượt. Nếu không còn nước hợp lệ nào thì ván kết thúc (mục 8).

════════ 8. KẾT THÚC VÁN ════════
Thứ tự kiểm tra sau MỖI nước đi hợp lệ (quan trọng, đúng thứ tự này):
 (1) Chiếu hết → thắng. (2) Pat → hòa. (3) Thế cờ chết → hòa. (4) 75 nước → hòa. (5) Lặp lần thứ 5 → hòa. (6) Cập nhật cờ "được phép claim" cho lặp 3 lần / 50 nước.

8.1 THẮNG
 • CHIẾU HẾT: bên đến lượt đang bị chiếu VÀ không có nước hợp lệ nào. Bên chiếu thắng.
 • ĐẦU HÀNG: bên kia thắng ngay lập tức, bất kể vật liệu còn lại.
 • HẾT GIỜ: xem 8.4.
 • BỎ CUỘC / MẤT KẾT NỐI quá hạn: xem 8.6.

8.2 HÒA TỰ ĐỘNG (engine tự kết thúc, không ai phải yêu cầu)
 • PAT: bên đến lượt KHÔNG bị chiếu VÀ không có nước hợp lệ nào.
 • THẾ CỜ CHẾT / KHÔNG ĐỦ LỰC LƯỢNG: xem 8.3.
 • LẶP 5 LẦN (điều 9.6.1): cùng một thế cờ xuất hiện lần thứ 5.
 • 75 NƯỚC (điều 9.6.2): 75 nước liên tiếp của MỖI bên (= 150 ply, halfmoveClock ≥ 150) không ăn quân và không đi tốt. NGOẠI LỆ ghi rõ trong luật: nếu nước cuối cùng đó là CHIẾU HẾT thì chiếu hết được tính trước.

8.3 THẾ CỜ CHẾT (dead position, điều 5.2.2)
Định nghĩa FIDE: thế cờ mà từ đó KHÔNG THỂ chiếu hết bằng bất kỳ chuỗi nước hợp lệ nào, kể cả khi đối phương cố tình hợp tác. Trường hợp tổng quát không tầm thường (còn gồm cả thế tốt bị khóa cứng), nên dùng danh sách vật liệu sau — nó đúng theo định nghĩa và bao phủ thực tế:
 TỰ ĐỘNG HÒA khi vật liệu còn lại (không còn Tốt, Xe, Hậu nào của cả hai bên) thuộc một trong:
  • V vs V
  • V + Tượng vs V
  • V + Mã vs V
  • Chỉ còn Tượng của cả hai bên và TẤT CẢ tượng còn lại đều nằm trên ô CÙNG MÀU (bao gồm V+T vs V+T cùng màu ô; và cả các trường hợp nhiều tượng cùng màu ô).
 KHÔNG tự hòa (vẫn tồn tại chuỗi nước dẫn tới chiếu hết): V+M+M vs V, V+T+M vs V, V+Tốt vs V, V+X vs V, V+H vs V, V+T vs V+M, V+T vs V+T khác màu ô.
 Nếu muốn giống chess.com thì có thể thêm V+M+M vs V vào danh sách tự hòa, nhưng đó là SAI so với FIDE. Khuyến nghị: theo FIDE, và ghi rõ trên trang luật của nền tảng.

8.4 HẾT GIỜ (điều 6.9)
 • Cờ rơi → bên còn giờ THẮNG, TRỪ KHI bên còn giờ không thể chiếu hết bằng bất kỳ chuỗi nước hợp lệ nào — khi đó HÒA.
 • Cài đặt thực tế khuyến nghị (nhất quán với 8.3): hòa khi bên CÒN GIỜ chỉ còn V, hoặc V+T, hoặc V+M (không còn Tốt/Xe/Hậu). Ngoài ra thắng. Nghĩa là V+M+M vs V hết giờ → THẮNG cho bên có 2 Mã (đúng FIDE, khác lichess/chess.com — phải ghi trong trang luật).
 • ƯU TIÊN: nếu nước vừa đi là CHIẾU HẾT thì tính chiếu hết, dù đồng hồ rơi cùng lúc.
 • Thuật toán server-authoritative: khi nhận action tại thời điểm `now`, TRƯỚC HẾT tính `elapsed = now - clock.turnStartedAt` (có bù lag, mục timeControl). Nếu `remainingMs[turn] - elapsed <= 0` → cờ rơi, kết thúc theo 8.4, KHÔNG áp dụng nước đi. Ngược lại: áp dụng nước, rồi trừ elapsed và cộng increment.

8.5 HÒA THEO YÊU CẦU (claim)
 • THỎA THUẬN HÒA: A gửi `offer_draw`, B gửi `accept_draw` → hòa. Lời mời hết hiệu lực khi B `decline_draw`, hoặc khi B thực hiện một nước đi. Chống spam: mỗi bên chỉ có tối đa 1 lời mời chưa trả lời, và sau khi bị từ chối phải chờ ít nhất 5 nước của chính mình mới được mời lại.
 • LẶP 3 LẦN (điều 9.2): khi một thế cờ xuất hiện lần thứ 3 (không nhất thiết do lặp nước liên tiếp), bên có quyền yêu cầu hòa. FIDE cho phép người ĐANG CÓ LƯỢT yêu cầu, gồm cả trường hợp "tôi tuyên bố nước X và nước X sẽ tạo ra thế lần thứ 3". Đơn giản hóa cho online (khuyến nghị): chỉ hỗ trợ trường hợp thế cờ HIỆN TẠI đã xuất hiện lần thứ 3, và cho phép CẢ HAI bên `claim_draw` bất cứ lúc nào counter ≥ 3 — tránh tranh cãi UX. Nền tảng bật nút "Xin hòa (lặp 3 lần)" khi điều kiện thỏa.
 • 50 NƯỚC (điều 9.3): khi halfmoveClock ≥ 100 (tức 50 nước của mỗi bên không ăn quân, không đi tốt) → cho phép `claim_draw`.
 • Nếu không ai claim, ván tiếp tục cho tới ngưỡng tự động ở 8.2 (5 lần / 75 nước).

 ĐỊNH NGHĨA "CÙNG MỘT THẾ CỜ" (điều 9.2.3) — dùng cho cả lặp 3 lần và lặp 5 lần:
 Hai thế cờ là như nhau khi và chỉ khi: cùng bên đến lượt đi; các quân cùng loại và cùng màu đứng trên đúng cùng các ô; VÀ mọi nước đi khả dĩ của cả hai bên là như nhau — nghĩa là cùng tập quyền nhập thành CÒN HIỆU LỰC và cùng khả năng bắt tốt qua đường.
 Cụ thể theo 9.2.3.1 / 9.2.3.2: hai thế KHÁC nhau nếu ở thế đầu có một tốt có thể bị bắt qua đường mà thế sau không; hoặc nếu vua còn quyền nhập thành ở thế đầu nhưng đã mất quyền đó ở thế sau.
 CÀI ĐẶT: khóa lặp = 4 trường đầu của FEN (piece placement + side to move + castling + ep square), KHÔNG gồm halfmove/fullmove. Kết hợp với quy ước ở mục 4 (epSquare chỉ set khi bắt qua đường thật sự hợp lệ) thì khóa này khớp đúng định nghĩa FIDE.
 PHẢI đếm cả THẾ BAN ĐẦU vào bảng đếm (count của thế khởi đầu = 1 ngay sau init).

8.6 HỦY VÁN VÀ MẤT KẾT NỐI
 • ABORT: khi ply < 2 (chưa đủ mỗi bên đi 1 nước), bất kỳ bên nào cũng được `abort` → ván không tính, không tính Elo.
 • Nếu Trắng không đi nước đầu trong 20s (cờ chớp) / 30s (cờ nhanh trở lên) → tự động abort.
 • Mất kết nối: đồng hồ VẪN CHẠY. Thêm hạn "bỏ cuộc" riêng (mặc định 60s với cờ chớp, 120s với cờ nhanh); quá hạn, đối thủ được gọi `claim_abandon` → xử như đầu hàng, có áp dụng luật lực lượng ở 8.4 (nếu bên còn lại không đủ lực lượng chiếu hết → hòa).

════════ 9. GHI BIÊN BẢN ════════
 • Nguồn sự thật để tái lập ván: dãy nước UCI (from, to, promotion). Server lưu cái này.
 • SAN chỉ để hiển thị và xuất PGN: Nf3, exd5, e8=Q+, O-O, O-O-O, Qh4#, dxc6 (bắt tốt qua đường ghi như nước ăn thường, có thể thêm hậu tố "e.p."). Phân biệt quân trùng (disambiguation) theo thứ tự: cột trước (Nbd2), nếu vẫn trùng thì hàng (R1a3), nếu vẫn trùng thì cả hai (Qh4e1). Nhập thành viết bằng chữ O hoa, không phải số 0.
 • Xuất PGN + FEN từng nước để phát lại và phân tích.

════════ 10. NGẪU NHIÊN ════════
Ván cờ hoàn toàn tất định. `rng` do server giữ chỉ dùng:
 • MỘT lần trong `init` để bốc màu khi config.colorAssignment = 'random'. Các chế độ khác: 'creator_white', 'alternate' (luân phiên khi đấu lại), 'by_rating'. Giá trị bốc được ghi vào state để audit.
 • Bot dùng cho tie-break và cho nước sai có kiểm soát ở mức Dễ. Bot BẮT BUỘC nhận rng từ server, tuyệt đối không gọi Math.random, nếu không ván sẽ không tái lập được từ log.
Bảng Zobrist của bot phải là hằng số sinh từ seed CỐ ĐỊNH hard-code trong source, KHÔNG sinh từ rng runtime — nếu không, khóa băm đổi sau mỗi lần khởi động server và state khôi phục từ DB sẽ sai.

## Mô hình trạng thái

```ts
// === kiểu cơ sở ===
type Color = 0 | 1;              // 0 = Trắng, 1 = Đen (dùng làm index mảng)
type Piece = number;             // 0 trống; +1..+6 Trắng; -1..-6 Đen
                                 // 1 Tốt, 2 Mã, 3 Tượng, 4 Xe, 5 Hậu, 6 Vua
type Square = number;            // 0..63, sq = rank*8 + file, a1=0 ... h8=63
type EncodedMove = number;       // 32-bit: from(0..5) | to(6..11) | promo(12..14) | flags(15..20)
                                 // flags: 1=capture 2=doublePush 4=epCapture 8=castleK 16=castleQ 32=promotion

interface PlayerSlot {
  playerId: string;
  isBot: boolean;
  botLevel?: 'easy' | 'normal' | 'hard';
  rating?: number;               // Elo hiển thị, engine không dùng
  connected: boolean;
}

interface ChessState {
  v: 1;                          // version của schema, để migrate
  gameId: string;
  players: [PlayerSlot, PlayerSlot];   // index = Color. players[0] cầm Trắng.

  // ---- vị trí (đủ để tái lập, tương đương FEN) ----
  board: Piece[];                // độ dài 64. Dùng number[] chứ KHÔNG dùng Int8Array
                                 // vì state phải JSON-serialize được để lưu DB/gửi qua socket.
                                 // Bot tự chuyển sang Int8Array trong bộ nhớ khi search.
  turn: Color;
  castling: number;              // bitmask: 1=K(Trắng gần) 2=Q(Trắng xa) 4=k 8=q
  epSquare: Square | null;       // ô "qua đường"; CHỈ set khi tồn tại nước bắt qua đường HỢP LỆ
  halfmoveClock: number;         // ply kể từ lần ăn quân / đi tốt gần nhất.
                                 // >=100 -> được claim 50 nước; >=150 -> tự động hòa
  fullmoveNumber: number;        // bắt đầu 1, tăng sau mỗi nước của Đen

  // ---- cache dẫn xuất: BẮT BUỘC tái tạo được 100% từ `board`;
  //      phải có hàm rebuildDerived(state) và gọi sau khi khôi phục từ DB ----
  kingSq: [Square, Square];
  material: {                    // đếm quân để kiểm tra "không đủ lực lượng" trong O(1)
    P: [number, number]; N: [number, number]; B: [number, number];
    R: [number, number]; Q: [number, number];
    bishopSquareColor: [number, number]; // bitmask 1=có tượng ô sáng, 2=có tượng ô tối
  };
  inCheck: boolean;              // bên `turn` có đang bị chiếu không
  legalMoveCount: number;        // 0 + inCheck -> chiếu hết; 0 + !inCheck -> pat

  // ---- lịch sử ----
  history: EncodedMove[];        // nguồn sự thật để phát lại
  undoStack: {                   // chỉ cần trong bộ nhớ khi search; KHÔNG lưu DB
    captured: Piece; prevCastling: number;
    prevEp: Square | null; prevHalfmove: number;
  }[];
  sanHistory: string[];          // chỉ để hiển thị/PGN, không dùng cho logic
  timePerPly: number[];          // ms đã dùng cho từng ply, để vẽ biểu đồ thời gian

  // ---- đếm lặp thế cờ ----
  repetition: Record<string, number>;  // key = 4 trường đầu FEN
                                       // "rnbq.../8 w KQkq d6". Đếm CẢ thế ban đầu.
  posKey: string;                      // key của thế hiện tại (cache)
  canClaim: { threefold: boolean; fiftyMove: boolean };  // cache cho UI

  // ---- đồng hồ ----
  clock: {
    initialMs: number;
    incrementMs: number;         // Fischer, cộng SAU khi hoàn tất nước đi
    delayMs: number;             // 0 nếu dùng Fischer thuần (khuyến nghị 0)
    remainingMs: [number, number];
    turnStartedAt: number;       // epoch ms của server, thời điểm bắt đầu tính giờ cho `turn`
    lastTickAt: number;          // để tick() idempotent, không trừ giờ hai lần
    firstMoveDeadline: number | null;  // hạn abort tự động cho nước đầu
    lagCompensationMs: number;   // trần bù lag mỗi nước, mặc định 150
  };

  // ---- trạng thái phụ ----
  drawOffer: { from: Color; atPly: number } | null;
  drawOfferNextAllowedPly: [number, number];   // chống spam xin hòa
  disconnect: Partial<Record<Color, { since: number; deadline: number }>>;

  status: 'waiting' | 'playing' | 'finished' | 'aborted';
  result: null | {
    winner: Color | null;        // null = hòa
    reason:
      | 'checkmate' | 'resign' | 'timeout' | 'abandon'          // có người thắng
      | 'stalemate' | 'insufficient_material' | 'agreement'
      | 'threefold' | 'fivefold' | 'fifty_move' | 'seventyfive_move'
      | 'timeout_insufficient'                                   // hết giờ nhưng bên kia không đủ lực lượng
      | 'abort';
    endedAt: number;
    finalFen: string;
  };

  config: {
    colorAssignment: 'random' | 'creator_white' | 'alternate' | 'by_rating';
    rated: boolean;
    allowTakeback: false;        // KHÔNG hỗ trợ đi lại — đơn giản hóa và tránh lỗ hổng
    autoQueenHint: boolean;      // chỉ là gợi ý cho UI, server vẫn đòi field promotion
    abandonTimeoutMs: number;
  };

  audit: { colorDrawValue: number; seedNote: string };  // ghi lại giá trị rng đã bốc
}
```
GHI CHÚ CÀI ĐẶT:
1. `board` là `number[]` chứ không phải TypedArray để JSON round-trip an toàn. Nếu cần tối ưu, thêm hàm `toFen(state)` / `fromFen(fen)` và lưu FEN vào DB, phục hồi bằng `fromFen` + `rebuildDerived`.
2. `repetition` dùng khóa chuỗi FEN-prefix chứ không dùng Zobrist, vì Zobrist phụ thuộc bảng ngẫu nhiên và làm state khó kiểm tra/khó debug khi khôi phục từ DB. Zobrist chỉ dùng BÊN TRONG bộ tìm kiếm của bot (transposition table), sinh từ seed hằng số hard-code.
3. `undoStack` chỉ tồn tại trong bộ nhớ khi bot search. Engine luật chơi cho người dùng có thể dùng kiểu bất biến (copy state) vì tần suất thấp; bot BẮT BUỘC dùng make/unmake tại chỗ vì lý do hiệu năng.
4. Kích thước state đầy đủ ~5–15 KB JSON cho ván dài. Nếu quá lớn, nén `history` thành chuỗi base64 của Uint16Array (mỗi nước 16 bit là đủ: from 6 + to 6 + promo 2 + special 2).

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `move` | { from: number (0..63), to: number (0..63), promotion?: 'q'|'r'|'b'|'n', ply: number, clientMoveId?: string } | 1) status === 'playing'. 2) playerId phải khớp players[state.turn].playerId, nếu không trả lỗi NOT_YOUR_TURN. 3) payload.ply phải bằng state.history.length — chống gửi trùng do mạng chập chờn và chống race khi client gửi lại; nếu ply < history.length và clientMoveId trùng nước đã nhận thì trả về kết quả cũ (idempotent), nếu khác thì lỗi STALE_PLY. 4) TRƯỚC KHI xét nước đi: tính elapsed = now - clock.turnStartedAt (trừ đi min(lagCompensationMs, latency ước lượng)); nếu remainingMs[turn] - elapsed <= 0 thì kết thúc ván theo mục 8.4, KHÔNG áp dụng nước. 5) from phải có quân của state.turn. 6) Nước phải nằm trong tập nước HỢP LỆ sinh bởi generateLegalMoves(state) — so khớp cả from, to VÀ promotion; tuyệt đối không tin client, không tự suy ra kiểu nước. 7) Nếu board[from] là tốt và rank(to) là hàng cuối thì promotion BẮT BUỘC có mặt và thuộc {q,r,b,n}; thiếu -> PROMOTION_REQUIRED; thừa (không phải nước phong cấp) -> INVALID_PROMOTION. 8) Áp dụng: di chuyển quân; nếu là bắt tốt qua đường thì xóa quân ở ô (file(to), rank(from)); nếu nhập thành thì dời cả xe; nếu phong cấp thì thay quân. 9) Cập nhật castling bằng mask theo CẢ from LẪN to. 10) epSquare = ô qua đường CHỈ khi vừa đi tốt 2 ô VÀ tồn tại nước bắt qua đường hợp lệ cho đối phương, ngược lại null. 11) halfmoveClock = 0 nếu ăn quân hoặc đi tốt, ngược lại +1. 12) fullmoveNumber +1 nếu vừa đi là Đen. 13) turn đảo. 14) Cập nhật repetition[posKey]++ và kiểm tra kết thúc theo đúng thứ tự ở mục 8. 15) Trừ giờ: remainingMs[mover] -= elapsed; sau đó += incrementMs (chỉ khi ván chưa kết thúc và ply >= 2 nếu chọn quy ước không tặng increment cho nước đầu). turnStartedAt = now. 16) Hủy drawOffer nếu lời mời là của đối phương (người đi đã ngầm từ chối). Events phát ra: MOVE_MADE{uci,san,fen,clocks}, CHECK, CAPTURE, CASTLE, PROMOTION, GAME_OVER{reason,winner}. |
| `resign` | {} | status === 'playing'; playerId là một trong hai người chơi (được đầu hàng cả khi không đến lượt mình). Kết thúc ngay: winner = đối phương, reason 'resign'. KHÔNG áp dụng luật thiếu lực lượng ở đây — đầu hàng luôn là thua. Yêu cầu client xác nhận hai bước ở UI; nếu ply < 2 thì gợi ý dùng abort thay vì resign. |
| `offer_draw` | { ply: number } | status === 'playing'; ply phải bằng history.length (lời mời gắn với thế cờ hiện tại, tránh mời rồi thế đã đổi); state.history.length >= 2 (không cho mời hòa trước khi mỗi bên đi 1 nước); drawOffer phải là null hoặc thuộc về chính người này (mời lại = no-op); history.length >= drawOfferNextAllowedPly[color], nếu không trả DRAW_OFFER_COOLDOWN. Tác dụng: set drawOffer = {from: color, atPly}. Event DRAW_OFFERED. |
| `accept_draw` | {} | status === 'playing'; drawOffer !== null; drawOffer.from !== color của người gửi. Kết thúc: winner = null, reason 'agreement'. Nếu drawOffer đã hết hiệu lực (đối phương đã đi thêm nước sau khi mời, tức drawOffer.atPly < history.length trong trường hợp chính người mời lại đi) thì trả OFFER_EXPIRED. |
| `decline_draw` | {} | status === 'playing'; drawOffer !== null; drawOffer.from !== color của người gửi. Tác dụng: drawOffer = null; drawOfferNextAllowedPly[bên vừa bị từ chối] = history.length + 10 (tương đương 5 nước của chính họ). Event DRAW_DECLINED. |
| `claim_draw` | { kind: 'threefold' | 'fifty_move' } | status === 'playing'. Với 'threefold': repetition[posKey] >= 3, nếu không trả CLAIM_NOT_AVAILABLE kèm count hiện tại. Với 'fifty_move': halfmoveClock >= 100. Cho phép CẢ HAI bên claim bất kể đến lượt ai (nới lỏng so với FIDE 9.2/9.3 vốn chỉ cho bên có lượt, để tránh tranh cãi UX trên nền tảng online; phải ghi rõ trong trang luật). Server tự kiểm tra lại điều kiện từ state, không tin cờ canClaim gửi lên. Kết thúc: winner = null, reason 'threefold' hoặc 'fifty_move'. |
| `abort` | {} | status === 'playing' VÀ history.length < 2. Bất kỳ bên nào cũng gọi được. Kết thúc: status = 'aborted', result.reason = 'abort', winner = null, rated bị ép về false. results() trả về cả hai place 1, score 0, và kèm cờ để hệ thống xếp hạng bỏ qua ván này. |
| `flag` | {} | status === 'playing'; người gửi phải là bên KHÔNG đến lượt (gọi cờ rơi của đối thủ), hoặc là hệ thống nội bộ. Tính elapsed = now - clock.turnStartedAt; nếu remainingMs[turn] - elapsed > 0 thì trả NOT_FLAGGED (kèm ms còn lại) và không thay đổi state. Nếu <= 0: áp dụng mục 8.4 — bên còn giờ thắng, TRỪ KHI bên còn giờ chỉ còn V / V+T / V+M thì hòa với reason 'timeout_insufficient'. Hành động này chỉ là lối thoát khi tick không chạy; tick() mới là cơ chế chính. |
| `claim_abandon` | {} | status === 'playing'; đối phương có state.disconnect[đối phương] và now >= deadline. Xử như đầu hàng của bên mất kết nối, reason 'abandon', nhưng CÓ áp dụng luật thiếu lực lượng: nếu bên còn lại chỉ còn V / V+T / V+M thì hòa. Nếu đối phương đã kết nối lại thì trả OPPONENT_CONNECTED. |
| `add_time` | { ms: 15000 | 30000 | 60000 } | Tính năng tùy chọn, chỉ bật khi config cho phép. status === 'playing'; chỉ được TẶNG giờ cho ĐỐI PHƯƠNG, không bao giờ cho mình; ms thuộc tập cho phép; tối đa 5 lần mỗi ván mỗi người (chống lạm dụng kéo dài ván vô hạn); không dùng được ở chế độ xếp hạng. remainingMs[đối phương] += ms. Event TIME_ADDED. |

## Kết thúc ván

ĐIỀU KIỆN KẾT THÚC (kiểm tra theo đúng thứ tự này sau mỗi nước hợp lệ):
 1. Chiếu hết → bên vừa đi THẮNG. reason 'checkmate'. Ưu tiên cao nhất, đứng trên cả 75 nước và lặp 5 lần.
 2. Pat → HÒA, reason 'stalemate'.
 3. Thế cờ chết (V vs V; V+T vs V; V+M vs V; chỉ còn tượng và mọi tượng cùng màu ô) → HÒA, reason 'insufficient_material'.
 4. halfmoveClock >= 150 → HÒA, reason 'seventyfive_move'.
 5. repetition[posKey] >= 5 → HÒA, reason 'fivefold'.
Ngoài luồng nước đi:
 6. Đầu hàng → đối phương thắng, reason 'resign'. Không xét lực lượng.
 7. Hết giờ → bên còn giờ thắng, reason 'timeout'; nếu bên còn giờ chỉ còn V / V+T / V+M thì HÒA, reason 'timeout_insufficient'.
 8. Bỏ cuộc quá hạn → như 7 nhưng reason 'abandon'.
 9. Thỏa thuận hòa → 'agreement'. Claim lặp 3 lần → 'threefold'. Claim 50 nước → 'fifty_move'.
 10. Abort (ply < 2) → ván không tính, reason 'abort'.

finished(state) = state.status === 'finished' || state.status === 'aborted'.

TÍNH ĐIỂM — results(state):
 • Có người thắng: [{playerId: winner, place: 1, score: 1}, {playerId: loser, place: 2, score: 0}].
 • Hòa: cả hai {place: 1, score: 0.5}. Dùng place bằng nhau (không phải 1 và 2) để hệ thống xếp hạng hiểu là đồng hạng.
 • Abort: cả hai {place: 1, score: 0}, kèm meta {rated: false} để bỏ qua khi tính Elo.
 Score 1 / 0.5 / 0 là chuẩn cờ vua và cắm thẳng được vào công thức Elo: Rnew = Rold + K*(S - E), với E = 1/(1 + 10^((Ropp - Rold)/400)). K khuyến nghị: 40 khi < 30 ván, 20 khi rating < 2400, 10 khi >= 2400. Cờ chớp và cờ nhanh nên có bảng Elo RIÊNG (Elo cờ chớp không dùng chung với cờ nhanh) — đây là quy ước của cả FIDE lẫn mọi nền tảng online.
 • Đấu với bot: mặc định không tính Elo (rated: false), hoặc tính vào một bảng "Elo luyện tập" riêng biệt để không làm loãng bảng xếp hạng người thật.

## Che thông tin ẩn

KHÔNG CÓ thông tin ẩn. Cờ vua là trò chơi thông tin hoàn hảo: toàn bộ bàn cờ, lịch sử nước đi và đồng hồ của cả hai bên đều công khai với cả hai người chơi lẫn khán giả. view(state, viewerId) về cơ bản trả về nguyên state.

Tuy vậy view() vẫn phải LỌC BỎ 5 thứ, không phải vì luật chơi mà vì chống gian lận và vệ sinh dữ liệu:
 1. `undoStack` và mọi cấu trúc nội bộ của bot (transposition table, principal variation, điểm lượng giá, độ sâu đã tìm, sách khai cuộc đang dùng). Nếu lộ điểm lượng giá của bot thì người chơi biết được nước nào bot coi là mạnh — vừa hỏng trải nghiệm vừa là kênh phân tích miễn phí.
 2. `audit.colorDrawValue` và mọi dấu vết trạng thái rng — không bao giờ gửi ra client, kể cả sau khi ván kết thúc, vì cùng một rng stream có thể còn dùng cho ván sau trong cùng phòng.
 3. `players[*].playerId` thô — thay bằng userId công khai / nickname. Không để lộ id nội bộ hay email.
 4. Với KHÁN GIẢ (viewerId không phải người chơi): thêm độ trễ phát sóng 15–30 giây trong chế độ có tính Elo hoặc giải đấu. Đây là biện pháp chống "tuồn nước đi từ engine qua bạn ngồi xem" — cần thiết vì bàn cờ không có gì để che nên kênh gian lận duy nhất là độ trễ. Ngoài ra ẩn `canClaim`, đồng hồ chỉ hiển thị làm tròn tới giây.
 5. `disconnect` của đối phương: có thể ẩn hoặc hiển thị chậm, vì biết đối thủ mất mạng sẽ khuyến khích hành vi câu giờ chờ đối thủ rớt.

Riêng `drawOffer`: KHÔNG che, cả hai bên đều phải thấy có lời mời hòa đang treo. Nhưng không được để lộ cho khán giả biết ai đã từ chối hòa bao nhiêu lần.

Premove (nước đi đặt trước) là thuần client-side, KHÔNG được gửi lên server trước khi đến lượt — nếu gửi sớm thì server sẽ giữ một nước đi chưa công bố, tạo ra thông tin ẩn không cần thiết và mở ra lỗ hổng. Client giữ premove trong bộ nhớ và chỉ bắn action `move` khi nhận được event MOVE_MADE của đối phương.

## Tính giờ

ĐỒNG HỒ FISCHER (cộng thêm) là mặc định — đây là chuẩn của mọi nền tảng online và của FIDE hiện nay, vì nó loại bỏ hoàn toàn trò "câu giờ thắng trong thế thua".

BỘ THỜI GIAN ĐỀ XUẤT (tên tiếng Việt theo cách gọi của cộng đồng cờ Việt Nam):
 • Cờ siêu chớp (bullet): 1+0, 1+1, 2+1
 • Cờ chớp (blitz): 3+0, 3+2, 5+0, 5+3   ← phổ biến nhất ở Việt Nam, nên đặt 3+2 và 5+0 làm mặc định của sảnh ghép cặp
 • Cờ nhanh (rapid): 10+0, 10+5, 15+10
 • Cờ tiêu chuẩn (classical): 30+20, 45+45
 • Không giới hạn (chơi thư giãn / đấu bot): initialMs = null, bỏ qua toàn bộ logic đồng hồ.
Ký hiệu "M+S" = M phút ban đầu, S giây cộng sau mỗi nước.

CÁCH TÍNH:
 1. Đồng hồ của Trắng bắt đầu chạy ngay khi ván bắt đầu (đúng theo FIDE). Kèm `firstMoveDeadline` = start + 20s (chớp) / 30s (nhanh trở lên): quá hạn thì tự abort, ván không tính — tránh treo bàn khi có người ghép cặp rồi bỏ đi.
 2. Increment được cộng SAU KHI nước đi hoàn tất, và chỉ khi ván chưa kết thúc bằng nước đó. Quy ước khuyến nghị: KHÔNG cộng increment cho nước đầu tiên của mỗi bên (giống lichess) — nếu cộng thì 1+1 thực chất là 1 phút 1 giây, gây khác biệt nhỏ khi thi đấu.
 3. Bù lag: elapsed = now - turnStartedAt - min(lagCompensationMs, ewmaLatency[player]). lagCompensationMs mặc định 150ms, không quá 300ms. ewmaLatency tính từ ping do server đo (round-trip / 2), KHÔNG lấy từ timestamp client gửi lên. Tuyệt đối không bao giờ tin bất kỳ mốc thời gian nào do client cung cấp — đó là lỗ hổng gian lận số một của cờ online.
 4. Chỉ dùng đồng hồ đơn điệu của server (`process.hrtime.bigint()` hoặc `performance.now()` quy đổi) để đo khoảng cách, `Date.now()` chỉ để ghi log. Lý do: NTP nhảy giờ sẽ làm mất hoặc tặng thêm vài giây cho người chơi.

VỀ tick() — ĐỌC KỸ:
Đã đặt `realtime: false` vì cờ vua thuần lượt: không có mô phỏng liên tục, không hành động đồng thời, state chỉ đổi khi có action. NHƯNG engine VẪN PHẢI xuất tick(state, now, rng) làm ĐỒNG HỒ CANH (watchdog) để kết thúc ván khi cờ rơi, vì nếu bên đang bị thua chỉ cần im lặng không gửi gì thì ván sẽ treo vĩnh viễn. Nền tảng phải:
 • Đặt một setTimeout đúng bằng `remainingMs[turn] + lagCompensationMs` sau mỗi nước đi; khi nó nổ thì gọi tick(). Đây là cách đúng — KHÔNG dùng vòng lặp quét toàn bộ bàn cờ mỗi 100ms, với vài nghìn bàn đồng thời nó sẽ đốt CPU vô ích.
 • Gọi tick() thêm ở đầu mỗi apply() và mỗi view() như một lớp phòng thủ.
 • tick() phải IDEMPOTENT: dùng clock.lastTickAt để không trừ giờ hai lần nếu bị gọi liên tiếp; nếu status !== 'playing' thì trả nguyên state.
 • tick() không dùng rng.

HẾT GIỜ: xem mục 8.4 của `rules`. Tóm tắt: bên còn giờ thắng, trừ khi bên còn giờ chỉ còn Vua, hoặc Vua+Tượng, hoặc Vua+Mã thì hòa. Chiếu hết luôn được tính TRƯỚC cờ rơi khi hai việc xảy ra cùng lúc.

CẢNH BÁO SẮP HẾT GIỜ: gửi event LOW_TIME khi remainingMs < max(10000, initialMs*0.1) để client đổi màu đồng hồ và bật tiếng tích tắc. Đây chỉ là gợi ý hiển thị, không ảnh hưởng logic.

BOT: khi đối thủ là bot, bot phải "tiêu" một lượng thời gian hợp lý trên đồng hồ chính nó (bot cũng có đồng hồ, cũng có thể thua vì hết giờ về mặt lý thuyết) và phải có ĐỘ TRỄ NHÂN TẠO: không trả lời trong 20ms, vì đi tức thì gây cảm giác khó chịu và không tự nhiên. Khuyến nghị: delay ngẫu nhiên (từ rng của server) 350–1400ms ở mức Dễ/Vừa, 600–2500ms ở mức Khó, có tương quan với độ phức tạp thế cờ (số nước hợp lệ). Ở bộ thời gian bullet 1+0 thì rút xuống 120–400ms để bot không tự hại mình.

## Bot

MINIMAX HOÀN TOÀN KHẢ THI với cờ vua — đây là bài toán kinh điển nhất của tìm kiếm cây trò chơi, khác hẳn cờ vây hay cờ tỷ phú. Kiến trúc: negamax + cắt tỉa alpha-beta + đào sâu lặp (iterative deepening) + tìm kiếm tĩnh (quiescence).

── HIỆU NĂNG THỰC TẾ TRONG NODE ──
TypeScript thuần, không WASM, không BigInt. Dùng biểu diễn mailbox 0x88 hoặc mảng 64 ô Int8Array với make/unmake tại chỗ. KHÔNG dùng bitboard bằng BigInt — chậm gấp 10–30 lần vì cấp phát heap cho mỗi phép toán. Nếu muốn bitboard thì tách mỗi bàn cờ thành 2 số 32-bit (lo/hi), nhưng mailbox đủ dùng và dễ debug hơn nhiều.
Tốc độ đạt được trên một vCPU server thường (~3GHz): 700k – 1.5M nút/giây nếu mã hóa nước đi thành số nguyên 32-bit và tái dùng mảng nước đi cấp phát sẵn (move list pool theo ply, tránh tạo object). Ngân sách 800ms → khoảng 600k–1.2M nút → độ sâu 7–9 ply ở trung cuộc với bộ cắt tỉa đầy đủ, 10–14 ply ở tàn cuộc. Sức chơi ước lượng ~2000–2200 Elo. Quá thừa để thắng đa số người chơi giải trí.

── HÀM LƯỢNG GIÁ (tapered, nội suy giữa trung cuộc và tàn cuộc) ──
 1. Vật liệu: Tốt 100, Mã 320, Tượng 330, Xe 500, Hậu 900, Vua 0. (Vua không có giá trị vật liệu — chiếu hết xử lý riêng bằng điểm mate.)
 2. Bảng điểm theo ô (piece-square table): 6 bảng x 64 ô cho pha trung cuộc + 6 bảng cho pha tàn cuộc. Dùng bộ PeSTO có sẵn công khai hoặc tự chỉnh. Bảng Vua là quan trọng nhất: trung cuộc thưởng vua nấp sau tường tốt ở góc, tàn cuộc thưởng vua tiến vào trung tâm. Nếu chỉ dùng một bảng vua duy nhất, bot sẽ giấu vua trong góc suốt tàn cuộc và không bao giờ thắng được tàn cuộc tốt.
 3. Hệ số pha: phase = (N*1 + B*1 + R*2 + Q*4) của cả hai bên, chuẩn hóa về [0,1]; eval = mg*phase + eg*(1-phase).
 4. Cấu trúc tốt: tốt chồng -15, tốt cô lập -12, tốt thông +[0,10,20,35,60,100,150] theo hàng đã tiến (nhân đôi nếu không có quân cản), tốt lạc hậu -8. Cache theo bảng băm tốt riêng (pawn hash) vì phần này tốn nhất và ít thay đổi.
 5. Cặp tượng +30. Mã bị trừ nhẹ khi bàn cờ thoáng, Xe cộng khi mở cột.
 6. Xe: cột mở +20, cột nửa mở +10, xe hàng 7 +20.
 7. An toàn vua: đếm số quân địch tấn công vùng 3x3 quanh vua, tra bảng lũy tiến (0, 5, 20, 50, 90, 140, 190...); trừ điểm khi tường tốt thủng (mỗi ô tốt thiếu trước vua -12). Đây là thành phần làm bot "biết sợ" và tạo ra thế công đẹp mắt.
 8. Cơ động: đếm số nước hợp lệ của Mã/Tượng/Xe/Hậu, mỗi nước +2..+4 tùy quân. Tính kèm lúc sinh nước để không tốn thêm.
 9. Tempo +10 cho bên có lượt.
 10. Tàn cuộc đặc biệt (bắt buộc, nếu không bot sẽ hòa những ván đang thắng chắc): khi bên mạnh có V+H hoặc V+X đấu V trơ trọi, thêm thành phần "ép vua địch ra biên và kéo vua mình lại gần": bonus = 4.7*centerDistance(vuaYếu) + 1.6*(14 - manhattanDistance(hai vua)). Không có cái này thì bot đi lòng vòng tới luật 50 nước.
 11. Contempt: khi bot đang HƠN vật liệu, gán điểm cho hòa là -25 thay vì 0 (bot né hòa); khi đang kém, +25 (bot chấp nhận hòa). Ngăn tình trạng bot đang thắng lại tự lặp nước ba lần.

── BỘ TÌM KIẾM ──
 • Đào sâu lặp từ depth 1 tăng dần, luôn giữ nước tốt nhất của độ sâu ĐÃ HOÀN TẤT gần nhất. Hết giờ thì trả nước đó.
 • Kiểm tra thời gian mỗi 2048 nút (nodes & 2047) === 0, dùng cờ `stopped` và unwind ngay; KHÔNG kiểm tra Date.now() ở mọi nút (syscall làm chậm ~15%). Phải kiểm tra CẢ TRONG quiescence — đây là chỗ hay quên nhất và là nguyên nhân số một của tình trạng bot vượt quá 1 giây.
 • Bảng chuyển vị (transposition table): khóa Zobrist 64-bit tách thành 2 số 32-bit, bảng cố định 2^20 ô (~16MB), thay thế theo depth-preferred. Lưu {key32High, depth, flag(EXACT/LOWER/UPPER), score, bestMove}. BẮT BUỘC: nước lấy từ TT phải được kiểm tra tính hợp lệ trước khi dùng (va chạm băm xảy ra thật), nếu không engine sẽ crash hoặc sinh nước ma.
 • Sắp xếp nước đi theo thứ tự: (1) nước từ TT, (2) nước ăn quân theo MVV-LVA, (3) nước phong Hậu, (4) 2 killer move của ply, (5) nước còn lại theo bảng history heuristic. Sắp xếp tốt quyết định 80% hiệu quả của alpha-beta — làm đúng cái này trước khi tối ưu bất cứ thứ gì khác.
 • Tìm kiếm tĩnh (quiescence) ở nút lá: chỉ mở rộng nước ăn quân và phong Hậu, cộng nước thoát chiếu nếu đang bị chiếu. Có stand-pat + delta pruning (bỏ qua nước ăn nếu eval + giá trị quân bị ăn + 200 < alpha). KHÔNG CÓ quiescence thì bot sẽ thí Hậu để ăn Tốt ở ngay biên độ sâu — lỗi chí mạng và dễ nhận ra nhất.
 • Cắt tỉa nước rỗng (null move): R = 2 + depth/6, chỉ khi không bị chiếu, depth >= 3 và bên đi còn quân nặng (tránh zugzwang trong tàn cuộc chỉ có tốt).
 • Giảm nước đi muộn (LMR): từ nước thứ 4 trở đi, nước không ăn quân, không chiếu, depth >= 3 → giảm 1 ply (2 ply nếu ngoài top 8); nếu kết quả vượt alpha thì tìm lại đủ độ sâu.
 • Mở rộng khi bị chiếu: +1 ply, giới hạn tổng mở rộng để không nổ cây.
 • Điểm chiếu hết phải TRỪ theo ply: MATE - ply. Nếu không, bot thấy chiếu hết ở ply 7 và ply 1 là ngang nhau nên sẽ trêu đùa mãi không kết liễu, rồi dính luật 50 nước.
 • Lặp và luật 50 nước PHẢI nằm trong cây tìm kiếm: giữ mảng khóa vị trí theo đường đi hiện tại, gặp lặp lần 2 trong cây thì trả ngay điểm hòa (có contempt). Nếu không, bot sẽ "thắng" bằng một chuỗi lặp mà thực tế là hòa.

── BA MỨC ĐỘ KHÓ ──
Nguyên tắc: hạ cấp bằng cách làm bot MẮC LỖI CÓ KIỂM SOÁT, không phải bằng cách làm nó chậm hoặc ngu một cách ngẫu nhiên. Một bot random hoàn toàn thì buồn chán; một bot đi vài nước hay rồi thỉnh thoảng mất quân mới giống người mới chơi.

 • DỄ (~900–1100 Elo, cho người mới):
   - Độ sâu cố định 2 ply + quiescence chỉ 1 tầng ăn quân. Ngân sách 80ms.
   - Lượng giá rút gọn: chỉ vật liệu + bảng điểm theo ô. Bỏ an toàn vua, cấu trúc tốt, cơ động.
   - Nước sai có kiểm soát: với xác suất 30% (lấy từ rng server), bỏ qua nước tốt nhất và chọn ngẫu nhiên trong các nước nằm trong khoảng 250 centipawn kém hơn. Với xác suất 8% nữa, chọn hoàn toàn ngẫu nhiên trong các nước hợp lệ KHÔNG mất Hậu ngay lập tức.
   - Chốt chặn nhân đạo: luôn đi nước chiếu hết trong 1 nếu có (người mới rất nản nếu bot bỏ lỡ), và không bao giờ đi nước để bị chiếu hết trong 1 khi còn lựa chọn khác.
 • VỪA (~1500–1700 Elo):
   - Ngân sách 200ms, đào sâu lặp, thường đạt 5–6 ply.
   - Lượng giá đầy đủ trừ bảng an toàn vua lũy tiến (dùng bản đơn giản: chỉ tính tường tốt).
   - Nước sai: xác suất 8% chọn ngẫu nhiên trong các nước kém hơn nước tốt nhất không quá 80 centipawn. Không có nước thí quân vô cớ.
   - Chọn ngẫu nhiên khi nhiều nước điểm bằng nhau (tie-break bằng rng), để bot không đi giống hệt nhau mọi ván.
 • KHÓ (~2000–2200 Elo):
   - Ngân sách 700–900ms cứng, đầy đủ mọi kỹ thuật ở trên.
   - Sách khai cuộc nhỏ: 150–400 vị trí, độ sâu 8–12 nước, phủ các khai cuộc phổ biến (Ý, Ruy Lopez, Sicilian, Phòng thủ Pháp, Caro-Kann, Gambit Hậu, Ấn Độ mới). Lưu dạng Record<fenPrefix, {uci, weight}[]>, chọn theo trọng số bằng rng server. Sách khai cuộc là cách RẺ NHẤT để bot có vẻ mạnh và đỡ nhàm: 2KB dữ liệu đáng giá hơn 300 dòng tối ưu tìm kiếm.
   - Tri thức tàn cuộc: thành phần lượng giá đặc biệt cho VH-V, VX-V, VTT-V, tàn cuộc vua-tốt (quy tắc ô vuông, đối mặt vua).
   - Tie-break vẫn dùng rng để tránh lặp ván.

── VẬN HÀNH TRÊN SERVER ──
 • CHẠY BOT TRONG WORKER THREAD, không chạy trên event loop chính. Một lượt search 800ms là 800ms mà Node không phục vụ được bất kỳ bàn cờ nào khác. Một pool 2–4 worker, xếp hàng các yêu cầu, là bắt buộc nếu muốn phục vụ trên vài chục bàn đấu bot đồng thời.
 • Ngân sách thời gian là cứng ở phía server: đặt thêm một timeout ngoài (1200ms) hủy worker và trả nước tốt nhất đã có, phòng khi vòng lặp search bị kẹt.
 • Bot phải nhận rng từ server và mọi quyết định ngẫu nhiên đi qua đó → ván đấu bot tái lập được 100% từ log, cực kỳ quan trọng khi người chơi khiếu nại "bot đi nước không hợp lệ".
 • Bảng Zobrist sinh từ một PRNG với seed HẰNG SỐ hard-code trong source, không phải rng runtime.

### Chỗ bot dễ hỏng

1. THIẾU TÌM KIẾM TĨNH (quiescence) — bot thí Hậu ăn Tốt ngay ở biên độ sâu vì không thấy nước ăn lại. Đây là lỗi hiển nhiên nhất với người chơi và cũng là lỗi hay bị bỏ qua nhất khi "làm nhanh cho xong". Bot có quiescence ở depth 4 chơi mạnh hơn bot không có ở depth 6.

2. SAI DẤU TRONG NEGAMAX — quên đảo dấu eval theo bên đi, hoặc quên `-negamax(-beta, -alpha)`. Triệu chứng: bot đi nước tự sát, thí quân liên tục. Kiểm tra bằng bất biến: eval(state) === -eval(state_đảo_màu_và_lật_bàn).

3. KHÔNG KIỂM TRA THỜI GIAN TRONG QUIESCENCE — bot vượt 1 giây, đôi khi tới 10 giây ở thế cờ nhiều quân ăn nhau. Phải truyền cờ `stopped` xuống cả quiescence và unwind ngay lập tức, đồng thời VỨT BỎ kết quả của độ sâu đang dở (dùng nước của độ sâu hoàn tất trước đó), vì kết quả dở dang có thể là nước tệ nhất.

4. ĐIỂM CHIẾU HẾT KHÔNG TRỪ THEO PLY — bot thấy mate-in-1 và mate-in-9 điểm bằng nhau nên cứ đẩy qua đẩy lại, rồi chính nó dính luật 50 nước hoặc lặp 3 lần khi đang thắng trắng. Dùng MATE - ply khi trả về và điều chỉnh lại khi lưu/đọc transposition table (cộng/trừ ply hiện tại) — bước điều chỉnh này rất hay bị quên và gây ra điểm mate sai lệch khắp cây.

5. LẶP 3 LẦN KHÔNG CÓ TRONG CÂY TÌM KIẾM — bot đánh giá một chuỗi lặp là "+8.0 đang thắng" trong khi thực tế đó là hòa. Phải giữ mảng khóa vị trí dọc đường đi và trả điểm hòa khi gặp lại. Ngược lại, thiếu CONTEMPT thì bot đang hơn Hậu lại vui vẻ lặp nước để hòa.

6. PAT — hàm lượng giá trả về "bên kia không có nước đi = tôi thắng". Sai. Không có nước hợp lệ + KHÔNG bị chiếu = hòa 0 điểm, + bị chiếu = mate. Bot mạnh không phân biệt được hai thứ này sẽ pat đối thủ ở tàn cuộc V+H đấu V — vừa mất ván thắng, vừa làm người chơi cười.

7. MAKE/UNMAKE KHÔNG KHÔI PHỤC ĐỦ — khôi phục board nhưng quên epSquare, castling, halfmoveClock hoặc khóa Zobrist. Triệu chứng: bot chơi bình thường 20 nước rồi đột nhiên sinh nước không hợp lệ và server văng. Cách bắt: chạy perft ở các vị trí chuẩn và so đúng số nút (xem `pitfalls`), rồi thêm assert so khớp Zobrist tính tăng dần với Zobrist tính lại từ đầu, bật ở chế độ dev.

8. NƯỚC TỪ TRANSPOSITION TABLE KHÔNG ĐƯỢC KIỂM TRA HỢP LỆ — va chạm băm 32-bit xảy ra thật ở hàng triệu nút. Nước rác từ TT được "thực hiện" sẽ làm hỏng bàn cờ. Luôn validate TT move nằm trong danh sách nước sinh ra trước khi dùng.

9. TẠO OBJECT CHO MỖI NƯỚC ĐI — `{from, to, piece, captured}` nhân vài trăm nghìn nút mỗi giây làm GC của V8 chiếm 30–50% thời gian. Mã hóa nước thành một số nguyên 32-bit và dùng mảng cấp phát sẵn theo ply (move buffer pool). Đây là khác biệt giữa 200k nút/giây và 1M nút/giây.

10. CHẠY BOT TRÊN EVENT LOOP CHÍNH — một lượt search 800ms đóng băng toàn bộ server: mọi bàn cờ khác treo, đồng hồ của người chơi thật vẫn chạy nhưng nước đi của họ không được xử lý, dẫn đến thua oan vì hết giờ. Bắt buộc dùng worker_threads.

11. BOT KHÔNG ĐI NƯỚC CHIẾU HẾT TRONG 1 Ở MỨC DỄ — logic "chơi ngẫu nhiên" áp dụng mù quáng làm bot bỏ lỡ mate hiển nhiên. Người mới chơi thấy vậy sẽ nghĩ game bị lỗi chứ không nghĩ là bot dễ. Luôn ưu tiên mate-in-1 ở mọi mức.

12. MỨC DỄ RANDOM HOÀN TOÀN — không ai học được gì và không ai thấy vui. Hạ cấp phải là "chơi khá rồi thỉnh thoảng mất một quân", không phải "đi bừa".

13. BOT KHÔNG CÓ SÁCH KHAI CUỘC — mỗi ván bot đi giống hệt nhau từ nước 1 (vì tìm kiếm tất định), người chơi thuộc lòng sau 5 ván. Chỉ cần tie-break bằng rng ở các nước điểm gần bằng nhau là đã đỡ nhiều; có sách khai cuộc thì tốt hơn hẳn.

14. BOT TRẢ LỜI TRONG 15ms — cảm giác như đang chơi với máy tính tiền, phá hoàn toàn nhịp trận đấu. Phải có độ trễ nhân tạo tương quan với độ phức tạp thế cờ.

15. DÙNG Math.random THAY VÌ rng CỦA SERVER — ván đấu bot không tái lập được, không debug được khiếu nại, và khi chạy nhiều tiến trình thì không kiểm toán được.

16. ĐỆ QUY KHÔNG GIỚI HẠN ĐỘ SÂU — mở rộng khi bị chiếu cộng dồn trong thế cờ chiếu liên tục làm tràn ngăn xếp của Node (mặc định ~10k khung). Đặt trần MAX_PLY = 64 và kiểm tra trước mỗi lần đệ quy.

17. BẢNG ĐIỂM THEO Ô CHỈ CÓ MỘT PHA — bot giữ vua trong góc suốt tàn cuộc, không bao giờ thắng được tàn cuộc vua-tốt. Bắt buộc phải có bảng vua riêng cho tàn cuộc.

18. BOT KHÔNG BIẾT LUẬT 50 NƯỚC — không đưa halfmoveClock vào lượng giá nên ở tàn cuộc V+H đấu V nó đi lòng vòng tới nước 50 rồi hòa. Đã có thành phần "ép vua ra biên" thì hiếm khi xảy ra, nhưng nên thêm phạt nhẹ khi halfmoveClock cao mà bot đang thắng.

19. BẢNG ZOBRIST SINH TỪ rng RUNTIME — server khởi động lại, khóa đổi, transposition table cũ (nếu có persist) sai hoàn toàn; tệ hơn là nếu đem Zobrist đi làm khóa đếm lặp thì logic hòa của cả ván hỏng.

20. PHONG CẤP THẤP KHÔNG ĐƯỢC SINH — bộ sinh nước chỉ sinh phong Hậu. Perft sai, và bot bỏ lỡ những nước phong Mã chiếu đôi hoặc phong Xe tránh pat. Hiếm nhưng khi xảy ra thì nhìn rất ngớ ngẩn.

## Cạm bẫy khi cài đặt

- Bắt tốt qua đường: quân bị ăn KHÔNG nằm ở ô đích. Phải xóa ô (file của to, rank của from). Mọi hàm makeMove viết kiểu 'board[to]=board[from]; board[from]=0' đều sai ở nước này.
- Bắt tốt qua đường có thể để lộ vua mình trước Xe/Hậu địch trên cùng hàng ngang, vì hai quân cùng rời hàng đó một lúc. Test bắt buộc: FEN 8/8/8/K2pP2q/8/8/8/7k w - d6 0 1 — exd6 e.p. phải BỊ TỪ CHỐI.
- Quyền bắt tốt qua đường chỉ tồn tại đúng một nước. Và epSquare chỉ nên được set khi thực sự tồn tại nước bắt qua đường HỢP LỆ, nếu không việc đếm lặp 3 lần sẽ sai (điều 9.2.3.1).
- Nhập thành xa cần ô b1/b8 TRỐNG. Rất hay bị bỏ sót vì chỉ kiểm tra hai ô mà vua đi qua.
- Nhập thành: ô b1/b8 bị TẤN CÔNG thì vẫn nhập thành xa được. Chỉ ba ô của VUA (ô đứng, ô đi qua, ô đến) mới cần không bị tấn công. Xe được phép bị tấn công và được phép đi qua ô bị tấn công.
- Mất quyền nhập thành khi xe BỊ ĂN tại ô góc, không chỉ khi xe tự đi. Phải AND castling mask theo cả ô `from` lẫn ô `to` sau mỗi nước.
- Vua đi ra rồi quay về e1 vẫn mất quyền nhập thành vĩnh viễn. Không được suy quyền nhập thành từ vị trí quân hiện tại, phải lưu bitmask riêng.
- Khi kiểm tra ô đích của vua có bị tấn công không, phải tạm nhấc vua khỏi bàn lúc dò tia Xe/Hậu/Tượng. Nếu không, nước 'vua lùi thẳng ra sau dọc theo tia đang chiếu' sẽ bị coi là hợp lệ.
- Tốt đi 2 ô cần CẢ HAI ô (ô giữa và ô đích) đều trống, không phải chỉ ô đích.
- Mã trên mảng 64 ô: phải chặn wrap-around qua cạnh bàn bằng kiểm tra |Δfile| và |Δrank|, không chỉ kiểm tra chỉ số trong [0,63].
- Phong cấp phải sinh đủ BỐN lựa chọn (H/X/T/M). Chỉ sinh Hậu làm perft sai và bot bỏ lỡ nước phong Mã chiếu đôi hoặc phong Xe tránh pat.
- Server phải ĐÒI field promotion, không tự mặc định Hậu. Mặc định là việc của UI. Nếu server tự mặc định thì người chơi mất khả năng phong Mã khi UI lỗi.
- Phân biệt chiếu hết và pat: cùng là 'không còn nước hợp lệ', khác nhau ở chỗ vua có đang bị chiếu hay không. Nhầm hai cái này là bug chết người.
- halfmoveClock phải reset về 0 khi ăn quân HOẶC đi tốt — bao gồm cả bắt tốt qua đường và cả nước phong cấp không ăn quân.
- 50 nước = 100 ply, không phải 50 ply. 75 nước = 150 ply. Nếu nước thứ 150 là chiếu hết thì tính chiếu hết (điều 9.6.2 ghi rõ ngoại lệ này).
- Khóa so sánh lặp thế cờ phải gồm bên đi + vị trí quân + quyền nhập thành còn hiệu lực + khả năng bắt tốt qua đường; KHÔNG gồm halfmove/fullmove. Chỉ so vị trí quân là sai.
- Phải đếm CẢ thế cờ ban đầu vào bảng lặp (count = 1 ngay sau init), nếu không sẽ cần 4 lần lặp thật mới đạt ngưỡng 3.
- Hết giờ mà bên còn giờ chỉ có Vua / Vua+Tượng / Vua+Mã thì HÒA chứ không thắng (điều 6.9). Bỏ sót điều này là khiếu nại thường gặp nhất của người chơi có kinh nghiệm.
- Chiếu hết ưu tiên hơn cờ rơi khi xảy ra cùng lúc. Server phải kiểm tra đồng hồ TRƯỚC khi áp dụng nước đi, dùng mốc thời gian nhận được ở server, không phải mốc do client gửi.
- Thế cờ chết theo FIDE là 'không thể chiếu hết bằng bất kỳ chuỗi nước hợp lệ nào', nên Vua+2Mã đấu Vua KHÔNG tự động hòa (tồn tại helpmate). Chọn theo FIDE hay theo chess.com đều được, nhưng phải ghi rõ trên trang luật và nhất quán giữa mục thế cờ chết và mục hết giờ.
- Tuyệt đối không tin mốc thời gian do client gửi lên. Đồng hồ tính bằng đồng hồ đơn điệu của server, bù lag có trần cứng 150–300ms.
- Client gửi trùng action `move` khi mạng chập chờn. Bắt buộc có field `ply` (và tùy chọn clientMoveId) để idempotent, nếu không người chơi sẽ mất hai nước liền.
- PHẢI chạy perft trước khi làm bất cứ thứ gì khác. Số chuẩn: thế ban đầu d1=20, d2=400, d3=8902, d4=197281, d5=4865609, d6=119060324. Kiwipete (r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -) d1=48, d2=2039, d3=97862, d4=4085603. Vị trí 3 (8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -) d3=2812, d4=43238, d5=674624, d6=11030083. Vị trí 4 (r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -) d3=9467, d4=422333. Vị trí 5 (rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8) d3=62379, d4=2103487. Lệch một nút là có bug, và bug đó gần như luôn nằm ở nhập thành hoặc bắt tốt qua đường.
- Ký hiệu SAN: phân biệt quân trùng theo thứ tự cột trước (Nbd2), rồi hàng (R1a3), rồi cả hai (Qh4e1). Nhập thành viết bằng chữ O hoa, không phải số 0 — PGN dùng số 0 sẽ không parse được ở nhiều phần mềm.
- Bàn cờ phải xoay 180 độ khi người chơi cầm Đen, nhưng nhãn tọa độ và mã hóa nước đi thì KHÔNG đổi. Lỗi lật tọa độ ở client là bug UI phổ biến nhất của cờ online.
- Premove phải hoàn toàn nằm ở client, không gửi lên server trước lượt. Gửi sớm tạo ra thông tin ẩn không cần thiết và mở lỗ hổng.
- Không hỗ trợ đi lại (takeback) trong chế độ xếp hạng. Nếu bật cho chế độ thư giãn thì phải là hai bước đồng ý và phải hoàn nguyên cả đồng hồ, cả bảng đếm lặp — rất dễ làm hỏng state, nên khuyến nghị không làm.
- Ván hòa do lặp và ván hòa do 50 nước là theo YÊU CẦU chứ không tự động ở ngưỡng 3 lần / 50 nước. Nếu nền tảng chọn tự động hòa ở ngưỡng 3 lần (khác FIDE) thì phải ghi rõ, vì nó thay đổi chiến thuật tàn cuộc.
- Lời mời hòa phải gắn với ply cụ thể và tự hết hiệu lực khi đối phương đi một nước, nếu không sẽ có trò mời hòa rồi chờ đối thủ bấm nhầm ở thế sắp thua.

## Mỹ thuật riêng của game này

HƯỚNG: "PHÒNG ĐẤU ĐÁ VÀ ĐỒNG" — đá cẩm thạch nguội, đồng thau đánh xước, nỉ xanh rêu. Không khí một câu lạc bộ cờ châu Âu về đêm: tối, tĩnh, sang, tập trung. Cờ vua là game duy nhất trong nền tảng nên đi theo hướng KHOÁNG VẬT và KIM LOẠI; toàn bộ chất liệu gỗ, tre, giấy dó, sơn mài, hoa văn Á Đông phải được để dành cho cờ tướng, cờ vây, cờ gánh, cờ up và ô ăn quan, còn màu sắc tươi vui kiểu board game giấy bìa để dành cho cờ tỷ phú và cá ngựa. Nhìn thoáng qua ảnh chụp màn hình phải nhận ra ngay đây là cờ vua, không lẫn với bàn nào khác.

BẢNG MÀU (chế độ tối là mặc định — cờ vua chơi buổi tối nhiều nhất):
 • Nền phòng: #12171C (xanh đen khói) → #1B2229, gradient hướng tâm rất nhẹ như ánh đèn bàn rọi xuống.
 • Ô sáng: #E4DCC9 (ngà đá, có vân cẩm thạch mờ 6% opacity).
 • Ô tối: #43596B (xanh đá phiến, vân đậm hơn 10%).
   Cặp màu này CỐ TÌNH tránh nâu gỗ cổ điển (trùng cờ tướng) và tránh xanh lá kiểu chess.com. Độ tương phản ô sáng/ô tối đo được 2.9:1 — đủ phân biệt mà không chói khi nhìn lâu.
 • Viền bàn: đồng thau #B8955A với bevel 2px, nhãn tọa độ khắc chìm màu #8A7346.
 • Quân Trắng: #F2EDE2 với bóng đổ mềm, highlight #FFFFFF ở cạnh trên.
 • Quân Đen: #232B31 với highlight #4E5D68 ở cạnh trên (KHÔNG dùng đen tuyệt đối — quân đen trên ô tối sẽ biến mất).
 • Nhấn chính (accent): đồng #C8A45C. Dùng cho nút chính, viền avatar người đang đi, đồng hồ đang chạy.
 • Nước vừa đi: phủ #C8A45C ở 22% opacity trên cả ô đi lẫn ô đến.
 • Ô đích hợp lệ: chấm tròn đặc đường kính 28% ô, màu #0F1418 ở 24% opacity trên ô sáng và #E4DCC9 ở 22% trên ô tối.
 • Ô đích có quân ăn được: vòng khuyên dày 4px viền theo mép ô thay cho chấm tròn.
 • Vua bị chiếu: gradient tỏa tròn từ tâm ô, #E0563F → trong suốt, có nhịp thở 1.2s.
 • Premove: #7A6BD8 (tím lam) ở 30% — cố ý khác hẳn màu vàng đồng để không nhầm với nước thật.
 • Cảnh báo hết giờ: #E0563F trên nền đồng hồ, kèm rung nhẹ 2px khi dưới 10 giây.
 • Chế độ sáng: nền #F4F1EA, ô sáng #F0E9D8, ô tối #6E8395, accent đồng đậm #96703A. Giữ nguyên cấu trúc, chỉ đảo độ sáng.

QUÂN CỜ: Staunton dựng lại theo hướng phẳng-có-khối — bóng đổ một hướng, một điểm highlight, không outline. Không dùng quân 3D render đầy đủ (nặng, khó đọc ở kích thước nhỏ trên điện thoại), cũng không dùng biểu tượng phẳng hoàn toàn (mất chất). Vector SVG, tỉ lệ đầu quân chiếm 62% chiều cao ô để dễ nhận dạng ở màn 360px. Cung cấp thêm một bộ "cổ điển Staunton mảnh" để người chơi lâu năm đổi — đây là tùy chỉnh mà cộng đồng cờ vua rất coi trọng.

CHỮ: tiêu đề và tên người chơi dùng serif có chân khắc (Cormorant Garamond hoặc Playfair Display) — gợi cảm giác bảng khắc và sách cờ. Biên bản nước đi và đồng hồ dùng mono (JetBrains Mono hoặc IBM Plex Mono), căn cột, đánh số nước như một cuốn sổ ghi ván. Sự đối lập serif/mono chính là chữ ký nhận diện của game này.

CHUYỂN ĐỘNG:
 • Quân trượt theo đường thẳng, 170ms, ease-out. Mã cũng trượt thẳng (không đi theo hình chữ L) nhưng nâng lên 6px kèm bóng đổ lớn hơn trong lúc bay — gợi ý nó nhảy qua quân.
 • Ăn quân: quân bị ăn thu nhỏ về 0.7 và mờ dần trong 120ms, đồng thời bay về khay quân bị bắt ở cạnh bàn.
 • Nhập thành: vua và xe chạy đồng thời, xe trễ pha 60ms.
 • Phong cấp: tốt nở sáng thành một vòng tròn đồng, bánh xe chọn quân hiện ra tại chỗ (không phải modal giữa màn hình — người chơi cờ chớp cần nó ngay dưới con trỏ).
 • Chiếu hết: bàn cờ tối đi 40%, hai ô vua và quân chiếu giữ nguyên sáng, một tia nối hai ô vẽ ra trong 400ms. Không confetti — cờ vua không phải game hội hè.

ÂM THANH: quân đá gõ xuống đá, khô và ngắn (~80ms). Ăn quân có thêm tiếng va chạm trầm hơn. Chiếu: một nốt kim loại ngân ngắn. Hết giờ: tiếng chuông đồng hồ cơ. Đồng hồ dưới 10 giây: tiếng tích tắc đều. Nước không hợp lệ: tiếng gõ đục, không có tiếng "buzz" điện tử.

BỐ CỤC: bàn cờ luôn là hình vuông và luôn là trọng tâm tuyệt đối. Trên điện thoại dọc: bàn cờ chiếm toàn bộ chiều rộng, thông tin người chơi + đồng hồ trên và dưới, biên bản nước đi thu thành một dải cuộn ngang một dòng. Trên máy tính: bàn cờ bên trái, cột phải chứa biên bản dạng hai cột số nước + nút hành động. Khay quân bị bắt và chênh lệch điểm vật liệu (+3, +5) hiển thị ngay cạnh tên — người chơi cờ vua nhìn con số này liên tục.

### Asset tối thiểu

- Bộ quân chính 'Staunton phẳng có khối': 12 file SVG (Vua/Hậu/Xe/Tượng/Mã/Tốt x Trắng/Đen), viewBox 45x45, tối ưu còn dưới 3KB mỗi file
- Bộ quân phụ 'Staunton cổ điển mảnh': 12 SVG nữa, cho người chơi đổi trong phần cài đặt
- Texture ô sáng cẩm thạch ngà, tileable 256x256 PNG, 6% cường độ vân
- Texture ô tối đá phiến xanh, tileable 256x256 PNG, 10% cường độ vân
- Khung viền bàn cờ bằng đồng thau: 9-slice PNG hoặc CSS border-image, kèm bevel
- Nhãn tọa độ a-h và 1-8 dạng SVG khắc chìm, 2 biến thể màu cho ô sáng và ô tối
- Lớp phủ ô: ô đang chọn, chấm tròn ô đích trống, vòng khuyên ô đích có quân, 2 ô nước vừa đi, ô premove, ô gợi ý (hint) — 6 SVG, mỗi loại 2 biến thể cho ô sáng/ô tối
- Hiệu ứng vua bị chiếu: gradient tỏa tròn đỏ dạng SVG radialGradient + keyframe nhịp thở
- Bánh xe chọn phong cấp: 4 ô chứa quân H/X/T/M trên nền đồng bán trong suốt, kèm nút hủy
- Khay quân bị bắt: 12 icon quân thu nhỏ 20x20 + nhãn chênh lệch điểm vật liệu
- Đồng hồ: component số mono + 3 trạng thái (nghỉ / đang chạy / sắp hết giờ) + icon tăng thời gian
- Icon hành động: đầu hàng (cờ trắng), xin hòa (bắt tay), hủy ván, xin hòa lặp 3 lần, xin hòa 50 nước, đổi bên, lật bàn, tăng giờ cho đối thủ — 8 SVG line-icon nét 1.5px
- Icon 3 mức bot: Dễ / Vừa / Khó — dùng ẩn dụ số quân cờ hoặc số vạch đồng, KHÔNG dùng icon robot chung chung
- Khung avatar hình lục giác viền đồng, 3 trạng thái: đang đi / chờ / mất kết nối
- Huy hiệu Elo và nhãn loại cờ (Chớp / Nhanh / Tiêu chuẩn) — 3 biến thể màu
- Âm thanh: move.ogg, capture.ogg, castle.ogg, check.ogg, promote.ogg, illegal.ogg, game-start.ogg, game-win.ogg, game-lose.ogg, game-draw.ogg, low-time-tick.ogg, draw-offer.ogg — mỗi file dưới 20KB, chuẩn hóa -16 LUFS
- Font: Cormorant Garamond (400/600) và JetBrains Mono (400/500), subset Latin + Việt (đủ dấu tiếng Việt, kiểm tra kỹ các ký tự ế ộ ữ ẩ ị)
- Màn hình kết thúc ván: 3 bố cục (thắng / thua / hòa) với hiệu ứng làm tối bàn cờ và tia nối ô chiếu hết
- Ảnh nền sảnh chờ ghép cặp: bàn cờ đá chụp góc nghiêng, làm mờ và tối, 1920x1080 WebP dưới 120KB
- Ảnh thu nhỏ (thumbnail) của game trong danh sách sảnh: 400x300, quân Hậu đá trên nền xanh đá phiến
- Hoạt ảnh loading khi ghép cặp: quân Mã nhảy vòng quanh bàn theo nước đi của Mã, SVG + CSS, dưới 4KB
- Bảng màu bàn cờ thay thế: ít nhất 3 bộ (Đá & Đồng mặc định, Mực & Ngọc trai, Than & Hổ phách) — mỗi bộ chỉ là 6 biến CSS, không cần asset mới
- Sprite biểu tượng cảm xúc nhanh trong ván: 6 emoji tối giản khắc kiểu con dấu đồng (chào, hay lắm, tiếc quá, nghĩ đã, chúc mừng, ván hay) — cố ý hạn chế số lượng để chống quấy rối

## Ước lượng công sức

Ước lượng 6–8 ngày-người cho một lập trình viên có kinh nghiệm, chia ra: 2 ngày cho bộ sinh nước đi + luật đầy đủ cho tới khi perft khớp chính xác ở 5 vị trí chuẩn; 1 ngày cho luật kết thúc ván (lặp, 50/75 nước, thế cờ chết, đồng hồ, claim); 1 ngày cho tầng action/view/results và chống gian lận thời gian; 2–3 ngày cho bot ba mức đạt yêu cầu dưới 1 giây; 1 ngày cho SAN/PGN/FEN và bộ test.

SO SÁNH TRUNG THỰC VỚI CÁC GAME KHÁC TRONG NỀN TẢNG:
 • Gấp khoảng 4–5 lần cờ caro (caro chỉ cần bàn cờ, luật thắng 5 quân và một bot threat-space search — khoảng 1,5 ngày).
 • Gấp khoảng 3 lần ô ăn quan và cờ gánh.
 • Gấp khoảng 2 lần cá ngựa (cá ngựa đơn giản về luật, phức tạp chủ yếu ở hoạt ảnh và xử lý xúc xắc công bằng).
 • Xấp xỉ BẰNG cờ tướng, lệch khoảng 10–15%. Cờ vua phức tạp hơn ở nhập thành, bắt tốt qua đường và phong cấp; cờ tướng phức tạp hơn ở luật cấm chiếu lặp/đuổi bắt của luật Việt Nam và Trung Quốc, vốn khó cài hơn cả nhập thành. Nên làm hai game này LIỀN NHAU và dùng chung khung sườn: đồng hồ, đếm lặp thế cờ, giao thức UCI-like, cấu trúc tìm kiếm negamax, transposition table, worker pool — tái sử dụng được khoảng 60% mã. Làm cờ vua trước vì có bộ test perft chuẩn để bắt lỗi khung sườn.
 • Chỉ bằng khoảng 40% cờ vây (cờ vây cần bắt nhóm/khí, luật ko/superko, đếm điểm cuối ván, và bot BẮT BUỘC dùng MCTS vì minimax vô dụng với hệ số phân nhánh 250).
 • Chỉ bằng khoảng 40–50% cờ tỷ phú (tỷ phú ít thuật toán nhưng cực nhiều nội dung: ~40 ô, thẻ bài, đấu giá, thế chấp, giao dịch nhiều bên, phá sản dây chuyền — công sức nằm ở số lượng ca biên chứ không ở độ khó kỹ thuật).

ĐIỂM CẦN LƯU Ý VỀ CHI PHÍ: phần LUẬT của cờ vua là bài toán đã được giải hoàn toàn, có bộ test perft công khai với đáp án chính xác tới từng nút, nên rủi ro thấp và tiến độ dự đoán được. Phần đắt và khó ước lượng là BOT: khoảng cách giữa "bot chạy được" và "bot chơi ra hồn, đúng 3 mức, không bao giờ vượt 1 giây, không chặn event loop" là 2–3 ngày làm việc thật. Nếu áp lực tiến độ, có thể ra mắt trước với bot mức Dễ/Vừa (depth cố định, không TT, không LMR — làm được trong 1 ngày) và bổ sung mức Khó sau; cả ba mức đều dùng chung một hàm lượng giá nên nâng cấp không phải viết lại.
Việc KHÔNG nên làm để tiết kiệm: đừng dùng thư viện chess.js làm engine chính thức phía server. Nó tiện cho bản demo nhưng bạn sẽ mất quyền kiểm soát biểu diễn state, không nhét được đồng hồ và luật claim vào đúng chỗ, và tốc độ của nó (~100k nút/giây) không đủ cho bot mức Khó. Dùng nó làm ORACLE ĐỐI CHỨNG trong test thì rất đáng: fuzz 100k ván ngẫu nhiên, so từng nước hợp lệ giữa engine của bạn và chess.js.
