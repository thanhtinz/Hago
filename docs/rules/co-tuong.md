# Cờ Tướng — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-tuong`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | False |
| Thông tin ẩn | False |
| Độ khó cài đặt | 4/5 |

CỜ TƯỚNG (Xiangqi) — ĐẶC TẢ LUẬT ĐẦY ĐỦ, biến thể thi đấu Việt Nam (theo Luật Cờ Tướng của Liên đoàn Cờ Việt Nam, kết hợp cách phân xử lặp thế đơn giản hoá của Luật châu Á vốn được mọi phần mềm cờ tướng dùng).

════════ 1. BÀN CỜ VÀ TOẠ ĐỘ ════════
Bàn cờ có 9 ĐƯỜNG DỌC và 10 ĐƯỜNG NGANG. Quân đặt trên GIAO ĐIỂM, không đặt trong ô. Tổng 90 giao điểm.

Quy ước toạ độ tuyệt đối dùng cho engine (cố định, không phụ thuộc người xem):
- index = r * 9 + c, với r = 0..9 tính từ TRÊN xuống, c = 0..8 tính từ TRÁI sang.
- r = 0..4 là nửa bàn của ĐEN. r = 5..9 là nửa bàn của ĐỎ.
- Sông (Hà) nằm giữa r = 4 và r = 5.
- Cung (九宮 / cửu cung) của ĐEN: r ∈ {0,1,2} và c ∈ {3,4,5} (9 giao điểm).
- Cung của ĐỎ: r ∈ {7,8,9} và c ∈ {3,4,5}.
- ĐỎ tiến là r GIẢM. ĐEN tiến là r TĂNG.
Ký hiệu chuỗi (ICCS, dùng cho log/replay): cột a..i tương ứng c = 0..8, hàng 0..9 tính từ phía ĐỎ lên (hàng ICCS = 9 − r). Ví dụ ô (r=9, c=4) là "e0" (Tướng Đỏ).

Thế khởi đầu (cố định, không có ngẫu nhiên):
- r=0 (ĐEN): c0 Xe, c1 Mã, c2 Tượng, c3 Sĩ, c4 Tướng, c5 Sĩ, c6 Tượng, c7 Mã, c8 Xe
- r=2 (ĐEN): c1 Pháo, c7 Pháo
- r=3 (ĐEN): c0, c2, c4, c6, c8 Tốt (5 Tốt)
- r=6 (ĐỎ): c0, c2, c4, c6, c8 Tốt
- r=7 (ĐỎ): c1 Pháo, c7 Pháo
- r=9 (ĐỎ): c0 Xe, c1 Mã, c2 Tượng, c3 Sĩ, c4 Tướng, c5 Sĩ, c6 Tượng, c7 Mã, c8 Xe
Mỗi bên 16 quân: 1 Tướng, 2 Sĩ, 2 Tượng, 2 Mã, 2 Xe, 2 Pháo, 5 Tốt.

ĐỎ ĐI TRƯỚC. Hai bên luân phiên, mỗi lượt đi đúng một nước, KHÔNG được bỏ lượt (không có nước "pass"). Đây là điểm quan trọng: vì không được bỏ lượt và hết nước đi là thua, cờ tướng có zugzwang thật.

Ngẫu nhiên: trong khi chơi KHÔNG có bất kỳ yếu tố ngẫu nhiên nào. `rng` của server chỉ dùng MỘT LẦN trong init() để bốc thăm ai cầm Đỏ (Đỏ có lợi thế tiên khoảng 55/45 nên không được để client tự chọn). Seed phải ghi vào state để replay và để người chơi kiểm chứng sau ván.

════════ 2. CÁCH ĐI VÀ CÁCH ĂN CỦA TỪNG QUÂN ════════
Nguyên tắc chung cho mọi quân: ăn quân bằng cách đi vào đúng giao điểm của quân địch, quân địch bị nhấc khỏi bàn. Không được đi vào ô có quân MÌNH. Không có quân nào nhảy qua quân khác trừ Mã (nhảy nhưng bị cản) và Pháo (chỉ khi ĂN).

【TƯỚNG / SOÁI】 (帥 Đỏ / 將 Đen) — ký hiệu K
- Đi 1 giao điểm theo phương NGANG hoặc DỌC. KHÔNG đi chéo.
- BẮT BUỘC ở trong cung của mình (9 giao điểm). Không bao giờ ra khỏi cung.
- Ăn quân địch đứng ở giao điểm kề trong cung.
- Tướng Đỏ chỉ ở {(7..9) x (3..5)}, Tướng Đen chỉ ở {(0..2) x (3..5)}.

【SĨ】 (仕 / 士) — ký hiệu A
- Đi 1 giao điểm theo đường CHÉO, và bắt buộc ở trong cung.
- Hệ quả: Sĩ chỉ có đúng 5 vị trí khả dĩ trên cả ván cờ.
  Sĩ Đỏ: (9,3) (9,5) (8,4) (7,3) (7,5). Sĩ Đen: (0,3) (0,5) (1,4) (2,3) (2,5).
- Sĩ ở tâm cung (8,4)/(1,4) đi được 4 hướng; Sĩ ở góc cung chỉ đi về tâm cung.

【TƯỢNG】 (相 / 象) — ký hiệu B
- Đi CHÉO ĐÚNG 2 giao điểm (nước "điền", hình chữ 田).
- BỊ CẢN: nếu giao điểm GIỮA (gọi là "mắt tượng" / 象眼) có bất kỳ quân nào — của mình hay của địch — thì nước đó BỊ CẤM. Mắt tượng là ((r1+r2)/2, (c1+c2)/2).
- KHÔNG ĐƯỢC QUA SÔNG. Tượng Đỏ chỉ ở r ∈ 5..9; Tượng Đen chỉ ở r ∈ 0..4.
- Hệ quả: mỗi bên chỉ có đúng 7 điểm Tượng khả dĩ.
  Đỏ: (9,2) (9,6) (7,0) (7,4) (7,8) (5,2) (5,6). Đen: (0,2) (0,6) (2,0) (2,4) (2,8) (4,2) (4,6).
- Hai ràng buộc (mắt tượng, không qua sông) là ĐỘC LẬP, phải kiểm tra cả hai.

【MÃ】 (傌 / 馬) — ký hiệu N
- Đi 1 giao điểm thẳng (ngang hoặc dọc) rồi tiếp 1 giao điểm chéo cùng chiều — nước "nhật" (日), tương đương (±2,±1) và (±1,±2). Tối đa 8 nước.
- BỊ CẢN CHÂN (蹩馬腿 / "cản mã"): giao điểm THẲNG KỀ theo bước đi đầu tiên phải TRỐNG. Cụ thể:
  * nước (dr = ±2, dc = ±1) → ô cản là (r + sign(dr), c)
  * nước (dr = ±1, dc = ±2) → ô cản là (r, c + sign(dc))
  Ô cản tính CẢ quân của mình lẫn quân địch. Đây là ô THẲNG, không phải ô chéo — cài sai hướng là bug phổ biến nhất.
- Mã KHÔNG bị ràng buộc sông hay cung, đi khắp bàn.

【XE】 (俥 / 車) — ký hiệu R
- Đi và ăn theo đường NGANG hoặc DỌC, số giao điểm tuỳ ý.
- Đường đi phải hoàn toàn TRỐNG. Gặp quân đầu tiên thì dừng: nếu là quân địch thì ăn được, nếu là quân mình thì không tới được ô đó.
- Không ràng buộc sông hay cung. Đây là quân mạnh nhất.

【PHÁO】 (炮 / 砲) — ký hiệu C — QUÂN CÓ LUẬT ĐẶC BIỆT NHẤT
- KHI KHÔNG ĂN: đi giống hệt Xe — ngang/dọc, đường phải hoàn toàn trống (0 quân chắn). KHÔNG được nhảy khi chỉ di chuyển.
- KHI ĂN: bắt buộc phải có ĐÚNG MỘT quân nằm giữa Pháo và quân bị ăn, trên cùng hàng hoặc cùng cột. Quân trung gian đó gọi là NGÒI (hoặc "đài", 炮架). Ngòi có thể là quân của bên nào cũng được, loại gì cũng được.
- Mục tiêu bị ăn là quân ĐỊCH ĐẦU TIÊN nằm sau ngòi theo hướng đó. Nếu quân đầu tiên sau ngòi là quân MÌNH thì không ăn được gì theo hướng đó.
- Nếu có 0 quân chắn: KHÔNG ăn được (kể cả quân địch đứng kề ngay). Nếu có từ 2 quân chắn trở lên: KHÔNG ăn được.
- Hệ quả quan trọng cho lượng giá: Pháo yếu đi rõ rệt khi bàn cờ trống ("pháo mất ngòi").

【TỐT / BINH】 (兵 Đỏ / 卒 Đen) — ký hiệu P
- TRƯỚC KHI QUA SÔNG: chỉ được TIẾN 1 giao điểm thẳng về phía đối phương. Không đi ngang, không lùi.
- SAU KHI QUA SÔNG: được TIẾN 1 giao điểm HOẶC đi NGANG 1 giao điểm (trái/phải). VẪN KHÔNG BAO GIỜ ĐƯỢC LÙI.
- Ranh giới qua sông: Tốt Đỏ đã qua sông khi r <= 4. Tốt Đen đã qua sông khi r >= 5.
- Ăn quân theo đúng hướng đi của nó (không có kiểu ăn chéo như cờ vua).
- KHÔNG CÓ PHONG CẤP. Tốt tới hàng cuối của đối phương (Đỏ tới r = 0, Đen tới r = 9) thì chỉ còn đi ngang được, mãi mãi. Không biến thành quân khác. Đây là điểm khác cờ vua, không được copy logic phong hậu.

════════ 3. LUẬT LỘ MẶT TƯỚNG (TƯỚNG ĐỐI MẶT) ════════
Hai Tướng KHÔNG ĐƯỢC đứng trên CÙNG MỘT CỘT mà giữa chúng không có bất kỳ quân nào. Mọi nước đi dẫn tới thế đó đều BẤT HỢP LỆ.

Cài đặt đúng: coi Tướng như một quân Xe CHỈ TẤN CÔNG THEO CỘT, và đưa nó vào hàm isAttacked(). Khi đó luật lộ mặt tướng tự động đúng trong cả ba tình huống:
(a) Ta di chuyển Tướng mình vào cột đối mặt → sau nước đi Tướng ta "bị Tướng địch tấn công" → nước bất hợp lệ.
(b) Ta di chuyển một quân đang chắn giữa hai Tướng ra khỏi cột → tương tự, bất hợp lệ (nước đi tự lộ mặt).
(c) Ta di chuyển một quân đang chắn giữa hai Tướng ra, làm Tướng ĐỊCH bị "chiếu" bởi Tướng ta → đây là một nước CHIẾU hợp lệ, thậm chí có thể chiếu bí. Rất nhiều thế cờ tàn cuộc Việt Nam thắng bằng đúng đòn này.
Nếu chỉ cài lộ mặt tướng như một lần kiểm tra rời sau nước đi mà không đưa vào isAttacked, sẽ mất trường hợp (c).

Ghi chú biến thể: một số bàn cờ đường phố ở Việt Nam chơi kiểu "bay tướng ăn tướng" (cho phép Tướng ăn Tướng theo cột thông). ĐÂY KHÔNG PHẢI LUẬT THI ĐẤU. Mặc định nền tảng phải là BẤT HỢP LỆ. Nếu muốn chiều người chơi thì đặt sau cờ config.flyingGeneralCapture = false và chỉ bật ở phòng tự do, không bao giờ ở xếp hạng.

════════ 4. NƯỚC ĐI HỢP LỆ ════════
Một nước đi hợp lệ khi thoả ĐỦ 4 điều:
1. Đúng quy tắc di chuyển của loại quân (mục 2), kể cả các ràng buộc cản/cung/sông.
2. Ô đích trống hoặc chứa quân ĐỊCH.
3. Sau nước đi, Tướng của bên vừa đi KHÔNG bị chiếu.
4. Sau nước đi, hai Tướng KHÔNG lộ mặt nhau.
(Điều 3 và 4 hợp nhất được nếu Tướng đã nằm trong isAttacked như mục 3.)

CHIẾU (chiếu tướng): sau nước đi của ta, Tướng đối phương bị ít nhất một quân của ta tấn công (kể cả tấn công bằng lộ mặt tướng). Không bắt buộc phải hô "chiếu" trong cờ online — server tự phát sự kiện CHECK.

Bên bị chiếu BẮT BUỘC phải gỡ chiếu ở nước tiếp theo bằng một trong ba cách: chạy Tướng, ăn quân đang chiếu, hoặc chắn đường chiếu (chỉ chắn được với Xe/Pháo/lộ mặt tướng; không chắn được Mã bằng cách chắn đường chiếu — nhưng chắn được bằng cách chặn CHÂN Mã, đây là một cách gỡ chiếu hợp lệ và hay bị bỏ sót). Nếu không còn nước hợp lệ nào → chiếu bí.

════════ 5. KẾT THÚC VÁN ════════
THẮNG / THUA:
(a) CHIẾU BÍ (chiếu hết): bên bị chiếu không còn nước hợp lệ nào → bên đó THUA.
(b) HẾT NƯỚC ĐI (bị vây chặt, "bí nước"): đến lượt một bên, bên đó KHÔNG bị chiếu nhưng cũng KHÔNG còn nước hợp lệ nào → bên đó THUA. ĐÂY LÀ KHÁC BIỆT CỐT LÕI VỚI CỜ VUA (cờ vua xử hoà). Luật Việt Nam xử THUA.
(c) XIN THUA (đầu hàng) bất cứ lúc nào.
(d) HẾT GIỜ: bên hết giờ THUA, TRỪ KHI bên còn lại không còn đủ lực chiếu bí → HOÀ (xem mục 7).
(e) VI PHẠM LUẬT CHIẾU MÃI hoặc ĐUỔI MÃI mà không đổi nước → bên vi phạm THUA (xem mục 6).
(f) BỎ CUỘC / MẤT KẾT NỐI quá thời gian ân hạn → THUA (quy tắc nền tảng, không phải luật cờ).

HOÀ:
(g) Hai bên THOẢ THUẬN hoà. Lưu ý: theo luật Việt Nam, bên đang bị chiếu bí hoặc đang hết nước đi KHÔNG được đề nghị hoà, bên đó chỉ được chịu thua.
(h) 60 NƯỚC MỖI BÊN (= 120 nửa-nước) liên tiếp KHÔNG có nước ăn quân nào → HOÀ. Bộ đếm halfmoveClock CHỈ reset khi có quân bị ăn. Khác cờ vua: nước Tốt KHÔNG reset bộ đếm, nước chiếu KHÔNG reset. Trong thi đấu trực tiếp điều này do một bên yêu cầu và trọng tài kiểm tra; trên nền tảng online thì server TỰ ÁP khi clock chạm 120, và nên hiện cảnh báo đếm ngược từ nước thứ 100.
(i) KHÔNG BÊN NÀO ĐỦ LỰC CHIẾU BÍ: cả hai bên đều không còn quân tấn công nào (không còn Xe, Pháo, Mã, Tốt — chỉ còn Tướng, Sĩ, Tượng) → HOÀ NGAY LẬP TỨC. Dùng đúng định nghĩa đơn giản này cho online; đừng cố cài bảng tàn cuộc lý thuyết (Pháo + Sĩ vs Tướng + Sĩ...) vì sẽ sai.
(j) LẶP THẾ mà không bên nào vi phạm chiếu mãi / đuổi mãi → HOÀ (xem mục 6).
(k) Hai bên đều không chịu đổi nước trong thế lặp và cả hai cùng vi phạm cùng một loại → HOÀ.
(l) GIỚI HẠN CỨNG chống ván vô hạn: mặc định 300 nước mỗi bên → HOÀ. Đây là quy tắc nền tảng, không phải luật cờ, nhưng cần có.

Chú ý thứ tự xét kết thúc trong apply(): sau khi thực hiện nước đi, xét theo thứ tự (1) đối phương hết nước hợp lệ → chiếu bí hoặc hết nước đi, (2) lặp thế lần 3 → phân xử mục 6, (3) halfmoveClock >= 120 → hoà, (4) cả hai không đủ lực → hoà, (5) giới hạn cứng. Xét sai thứ tự sẽ ra kết quả sai ở các thế biên (ví dụ vừa chiếu bí vừa chạm mốc 120 nước → phải là THẮNG, không phải hoà).

════════ 6. LUẬT CẤM CHIẾU MÃI VÀ ĐUỔI MÃI (phần khó nhất) ════════
Cờ tướng KHÔNG cho phép lặp vô hạn để cầu hoà như cờ vua. Bên cố tình lặp bằng cách chiếu liên tục hoặc đuổi bắt liên tục sẽ BỊ XỬ THUA.

KÍCH HOẠT PHÂN XỬ: server giữ Zobrist hash của MỖI thế cờ (bàn cờ + BÊN ĐI). Khi một nước đi tạo ra lần xuất hiện THỨ BA của cùng một thế, chạy adjudicateRepetition(). Luôn CHẤP NHẬN nước đi rồi mới phân xử — không được từ chối nước đi. Nên cảnh báo trên UI ngay ở lần lặp thứ HAI.

DỮ LIỆU CẦN LƯU: với mỗi nửa-nước i, lưu (hash_i, side_i, gaveCheck_i, chaseTargetId_i). Chu kỳ lặp là đoạn các nước từ lần xuất hiện đầu tiên của hash hiện tại đến nay.

【6.1 CHIẾU MÃI (chiếu dai)】 — đơn giản, bắt buộc phải có
Trong chu kỳ lặp, xét riêng từng bên:
- redPerpetualCheck = MỌI nước của Đỏ trong chu kỳ đều là nước chiếu.
- blackPerpetualCheck = tương tự cho Đen.
Phân xử:
- Chỉ Đỏ chiếu mãi → ĐỎ THUA. Chỉ Đen chiếu mãi → ĐEN THUA.
- Cả hai cùng chiếu mãi → HOÀ.
- Không bên nào → chuyển sang 6.2.
Quy tắc phụ: dùng một quân chiếu mãi hay nhiều quân thay nhau chiếu mãi đều bị xử như nhau. Nước vừa chiếu vừa bắt quân được tính là NƯỚC CHIẾU (ưu tiên chiếu).

【6.2 ĐUỔI MÃI (đuổi dai / bắt quân liên tục)】 — phức tạp, nên làm sau
Định nghĩa "nước đuổi": nước đi tạo ra một đe doạ MỚI sẽ ăn một quân cụ thể của đối phương ở nước sau, mà việc ăn đó CÓ LỢI cho bên đuổi.

Định nghĩa căn:
- "CÓ CĂN": quân bị đuổi được một quân khác cùng bên bảo vệ.
- "CĂN THẬT": nếu quân đó bị ăn, quân bảo vệ ĂN LẠI ĐƯỢC NGAY bằng một nước HỢP LỆ (không bị ghim, không bị cản, ăn lại không làm lộ mặt tướng).
- "CĂN GIẢ": có quân bảo vệ trên danh nghĩa nhưng thực tế không ăn lại được (bị ghim, bị cản chân, hoặc ăn lại thì tự lộ mặt tướng).

Phân xử (khi không bên nào chiếu mãi):
- Chỉ một bên đuổi mãi CÙNG MỘT quân suốt chu kỳ → bên đuổi THUA.
- Cả hai cùng đuổi mãi → HOÀ.
- Không bên nào → HOÀ.
- MỘT BÊN CHIẾU MÃI, MỘT BÊN ĐUỔI MÃI → BÊN CHIẾU MÃI THUA (chiếu mãi nặng hơn).

Các NGOẠI LỆ (không tính là vi phạm, xử hoà):
(E1) TƯỚNG đuổi bắt mãi bất kỳ quân nào → không vi phạm.
(E2) TỐT đuổi bắt mãi bất kỳ quân nào → không vi phạm.
(E3) Đuổi bắt mãi một TỐT CHƯA QUA SÔNG → không vi phạm.
(E4) Đuổi bắt mãi quân có CĂN THẬT → không vi phạm. NHƯNG có ngoại lệ của ngoại lệ (E4b).
(E4b) MÃ hoặc PHÁO đuổi bắt mãi XE — dù Xe có căn thật — VẪN XỬ THUA bên đuổi, vì đổi Mã/Pháo lấy Xe là có lợi rõ ràng.
(E5) Trong chu kỳ, mỗi vòng lại đe doạ một quân KHÁC NHAU ("một quân lần lượt đuổi bắt nhiều quân") → HOÀ, không tính đuổi mãi.

Các trường hợp VẪN TÍNH LÀ VI PHẠM (thua):
(V1) Đuổi bắt mãi quân có CĂN GIẢ.
(V2) Quân bị đuổi có căn thật nhưng đang BỊ GHIM nên không di chuyển được → vẫn tính là bắt mãi.
(V3) MÃ đuổi bắt mãi một MÃ đang BỊ CẢN CHÂN (không chạy được) → vẫn tính là bắt mãi.

【6.3 KHUYẾN NGHỊ TRIỂN KHAI THỰC TẾ — đọc kỹ】
Cài đầy đủ 6.2 rất tốn công (cần mô phỏng thêm một lớp nước để xác định căn thật / căn giả, có cả bài báo học thuật viết riêng về việc cài đặt đúng luật này). Đề xuất một cờ cấu hình ba mức:
- chaseRule = 'off' (MẶC ĐỊNH CHO BẢN 1): chỉ cài 6.1. Mọi lặp thế không phải chiếu mãi đều xử HOÀ. Đúng với khoảng 95% ván thực tế, không ai phàn nàn, tiết kiệm 2–4 ngày công.
- chaseRule = 'simple': thêm 6.2 nhưng chỉ xét quân bị đuổi KHÔNG CÓ CĂN, cộng ngoại lệ E1, E2, E3 và E4b. Bỏ toàn bộ phần căn thật / căn giả. Đủ dùng cho xếp hạng.
- chaseRule = 'asian': đầy đủ 6.2 kể cả căn thật / căn giả, V1, V2, V3. Chỉ làm khi mở giải đấu.
Mức nào cũng phải cài 6.1 — chiếu mãi là bắt buộc, không thoả hiệp.

Đơn giản hoá được chấp nhận trong cả ba mức: chỉ tính một nước là "đuổi" khi nó tạo đe doạ MỚI và quân vừa đi KHÔNG đang bị tấn công (tức là không phải nước chạy trốn). Luật thi đấu trực tiếp có nhiều phán đoán tinh tế hơn về "tránh đòn", nhưng phán đoán đó cần trọng tài người, không cài được vào engine.

════════ 7. ĐỦ LỰC CHIẾU BÍ ════════
Định nghĩa dùng cho luật hết giờ và luật hoà tự động: một bên ĐỦ LỰC nếu còn ít nhất một trong: Xe, Pháo, Mã, Tốt. Chỉ còn Tướng + Sĩ + Tượng là KHÔNG ĐỦ LỰC. Định nghĩa này đơn giản, an toàn, không bao giờ xử sai theo hướng thiệt cho người chơi. Đừng cố phân biệt các thế lý thuyết kiểu "Pháo đơn không thắng được Tướng trơ" — sai một lần là mất uy tín.

════════ 8. KÝ HIỆU NƯỚC ĐI TIẾNG VIỆT ════════
Nền tảng nên hiển thị ký hiệu Việt bên cạnh toạ độ. Quy tắc:
- Cột đánh số 1..9 từ PHẢI sang TRÁI theo góc nhìn của CHÍNH bên đi. Nên số cột của Đỏ và của Đen ngược nhau: cột c của Đỏ là số (9 − c), cột c của Đen là số (c + 1).
- Dạng: <Tên quân> <số cột xuất phát> <động từ> <số>.
- Động từ: "tấn"/"tiến" (đi về phía đối phương), "thoái"/"thối" (lùi về), "bình" (đi ngang).
- Với "bình": số cuối là SỐ CỘT ĐÍCH. Với "tấn"/"thoái" của Xe, Pháo, Tốt, Tướng: số cuối là SỐ BƯỚC. Với Mã, Tượng, Sĩ (đi chéo): số cuối là SỐ CỘT ĐÍCH.
- Khi hai quân CÙNG LOẠI đứng trên CÙNG MỘT CỘT: thay số cột xuất phát bằng "tiền" (quân gần đối phương hơn) hoặc "hậu". Ví dụ "Tiền pháo tấn 2".
- Khi có từ BA Tốt trở lên cùng một cột: đếm "nhất, nhị, tam, tứ, ngũ" từ phía đối phương về.
Ví dụ: Pháo 2 bình 5 (nước khai cuộc Pháo đầu phổ biến nhất ở Việt Nam), Mã 2 tấn 3 (Bình phong mã), Xe 1 bình 2.

════════ 9. GIAO DIỆN ENGINE ════════
init(players, config, rng):
- players là 2 phần tử. Dùng rng MỘT LẦN: nếu config.redSeat không được chỉ định thì bốc thăm ai cầm Đỏ. Ghi seedUsed vào state.
- Dựng bàn cờ khởi đầu, turn = 'red', ply = 0, halfmoveClock = 0, repCount = { hash0: 1 }, status = 'waiting' (chờ READY) hoặc 'playing' nếu đấu bot.

apply(state, playerId, action, rng):
- rng chỉ dùng cho nước đi của BOT ở mức Dễ/Vừa (chọn ngẫu nhiên trong top-K). Nước của người chơi không dùng rng.
- Trả về { state, events }. Events gồm: MOVED {from, to, piece, captured?}, CHECK {side}, CHECKMATE, STALEMATE_LOSS, REPETITION_WARNING {type, count}, REPETITION_ADJUDICATED {type, loser|null}, SIXTY_MOVE_DRAW, DRAW_OFFERED, DRAW_DECLINED, GAME_END {winner, reason}, CLOCK {red, black}.
- Mọi lỗi trả về dạng { error: CODE } chứ không throw — để server log được và client hiển thị đúng thông báo.

tick(state, now, rng):
- Cờ tướng THUẦN LƯỢT, không cần tick để tiến trò chơi. Nhưng VẪN CẦN tick nhẹ (1 Hz là đủ) chỉ để: (a) trừ đồng hồ và phát hiện hết giờ, (b) hết hạn lời đề nghị hoà, (c) hết hạn ân hạn mất kết nối. tick() KHÔNG BAO GIỜ thay đổi thế cờ. rng không dùng trong tick.
- tick phải là hàm thuần: mọi tính toán thời gian dùng `now` truyền vào, không gọi Date.now().

view(state, viewerId): xem mục hiddenInfoRedaction. Gần như trả nguyên state.

finished(state): state.status === 'finished'.

results(state): trả [{playerId, place, score}]. Thắng: place 1, score 1. Thua: place 2, score 0. Hoà: cả hai place 1, score 0.5. (Nếu hệ thống xếp hạng dùng Elo thì score chính là điểm ván chuẩn của Elo.)

════════ 10. NGUỒN THAM KHẢO ════════
- [Luật Cờ Tướng Việt Nam – Liên đoàn Cờ Việt Nam](https://vnchess.com.vn/luat-co-tuong-viet-nam/)
- [Luật Cờ Tướng chính thức của Việt Nam – Ziga](https://zigavn.com/cotuong/luat-co-tuong) và [bản PDF tài liệu tập huấn trọng tài quốc gia 2015](https://zigavn.com/base/luat_co_tuong.pdf)
- [Luật chơi cờ tướng online – vn.xiangqi.com](https://www.vn.xiangqi.com/articles/luat-choi-co-tuong)
- [Các thế cờ hoà trong cờ tướng – vn.xiangqi.com](https://www.vn.xiangqi.com/articles/cac-the-co-hoa-trong-co-tuong)
- [Asian Chinese Chess Rules – clubxiangqi.com](https://www.clubxiangqi.com/rules/asiarule.htm) (phần lặp thế, chiếu mãi, đuổi mãi dùng cho phần mềm)
- [Xiangqi Move Limits – xiangqi.com](https://www.xiangqi.com/help/limits)
- [Complete Implementation of WXF Chinese Chess Rules (arXiv)](https://arxiv.org/pdf/2412.17334) — bằng chứng rằng luật đuổi mãi thực sự khó, đủ để có một bài báo riêng
- [Chinese Chess – Chessprogramming wiki](https://www.chessprogramming.org/Chinese_Chess)
- [Vì sao vua hết nước đi trong cờ vua thì hoà, còn cờ tướng xử thắng – Tuổi Trẻ](https://tuoitre.vn/vi-sao-vua-het-nuoc-di-trong-co-vua-thi-lai-hoa-trong-khi-co-tuong-duoc-xu-thang-20251108091340279.htm)

## Mô hình trạng thái

```ts
type Side = 'red' | 'black';                 // Đỏ đi trước
type PieceType = 'K' | 'A' | 'B' | 'N' | 'R' | 'C' | 'P';
// K Tướng/Soái, A Sĩ, B Tượng, N Mã, R Xe, C Pháo, P Tốt

// Mã hoá ô trên bàn: 0 = trống. Khác 0 = (side === 'red' ? 8 : 16) | typeIdx
// typeIdx: K=1 A=2 B=3 N=4 R=5 C=6 P=7  → giá trị 9..15 (Đỏ), 17..23 (Đen)
type Cell = number;

interface XiangqiConfig {
  timeControl: TimeControl;
  chaseRule: 'off' | 'simple' | 'asian';     // mặc định 'off' cho bản 1
  flyingGeneralCapture: false;               // luôn false ở xếp hạng
  sixtyMoveHalfPlies: number;                // mặc định 120 (60 nước mỗi bên)
  hardMoveCap: number;                       // mặc định 600 nửa-nước
  allowTakeback: boolean;                    // false ở xếp hạng/ghép cặp
  maxTakebacks: number;                      // mặc định 1
  drawOfferCooldownPly: number;              // mặc định 10
  drawOfferTtlPly: number;                   // mặc định 2
  disconnectGraceMs: number;                 // mặc định 60_000
  spectatorDelayMs: number;                  // 0 thường, 30_000–60_000 ở giải
  bot?: { seat: Side; level: 'easy' | 'medium' | 'hard' };
  redSeat?: string;                          // nếu chỉ định thì init không bốc thăm
}

type TimeControl =
  // Fischer: cộng thêm incMs sau mỗi nước
  | { mode: 'fischer'; mainMs: number; incMs: number }
  // Kiểu app cờ tướng Việt Nam: mỗi nước có quỹ giờ riêng, tràn thì trừ vào quỹ tổng
  | { mode: 'moveplus'; mainMs: number; perMoveMs: number };

interface ClockState {
  mode: 'fischer' | 'moveplus';
  mainMs:    { red: number; black: number };   // quỹ giờ tổng còn lại
  perMoveMs: number;                            // 0 nếu mode fischer
  incMs:     number;                            // 0 nếu mode moveplus
  moveLeftMs: number;                           // giờ còn lại của NƯỚC hiện tại (moveplus)
  turnStartAt: number;                          // `now` lúc bắt đầu lượt hiện tại
  lastTickAt:  number;                          // `now` của lần tick gần nhất
}

interface MoveRecord {
  ply: number;                 // 0-based
  side: Side;
  from: number;                // 0..89
  to: number;                  // 0..89
  piece: Cell;                 // quân đã đi
  captured: Cell;              // 0 nếu không ăn
  gaveCheck: boolean;          // nước này có chiếu không — CẦN cho luật chiếu mãi
  chaseTargetId: number;       // -1 nếu không đuổi; ngược lại id quân bị đuổi
                               // (chỉ điền khi chaseRule !== 'off')
  hashAfter: string;           // Zobrist sau nước đi, ĐÃ GỒM bên đi
  iccs: string;                // "h2e2" — cho replay/log
  vn: string;                  // "Pháo 2 bình 5" — cho hiển thị
  spentMs: number;             // thời gian bên đó dùng cho nước này
}

type EndReason =
  | 'CHECKMATE'            // chiếu bí
  | 'STALEMATE'            // hết nước đi — LƯU Ý: đây là THUA, không phải hoà
  | 'RESIGN'
  | 'TIMEOUT'
  | 'DISCONNECT'
  | 'PERPETUAL_CHECK'      // chiếu mãi → bên vi phạm thua
  | 'PERPETUAL_CHASE'      // đuổi mãi → bên vi phạm thua
  | 'AGREEMENT'            // hoà thoả thuận
  | 'REPETITION_DRAW'      // lặp thế 3 lần, không ai vi phạm
  | 'SIXTY_MOVE_DRAW'      // 60 nước mỗi bên không ăn quân
  | 'INSUFFICIENT_MATERIAL'// cả hai không đủ lực chiếu bí
  | 'MOVE_CAP_DRAW';       // chạm giới hạn cứng của nền tảng

interface XiangqiState {
  v: 1;                                        // phiên bản schema, cho migration
  gameId: string;

  seat: { red: string; black: string };        // playerId theo từng bên
  turn: Side;
  ply: number;                                 // tổng số nửa-nước đã đi
  board: number[];                             // ĐỘ DÀI 90, index = r*9+c, r 0..9 từ trên
                                               // (r 0..4 = nửa Đen, r 5..9 = nửa Đỏ)
                                               // Lưu ý: đây là dạng LƯU TRỮ/truyền mạng.
                                               // Engine tìm kiếm nên chuyển sang
                                               // Int8Array(256) mailbox 16 cột để chạy nhanh.

  halfmoveClock: number;                       // số nửa-nước từ lần ĂN QUÂN gần nhất.
                                               // CHỈ reset khi ăn quân. Nước Tốt KHÔNG reset.
  moves: MoveRecord[];                         // toàn bộ lịch sử — nguồn sự thật để replay
  repCount: Record<string, number>;            // hash → số lần đã xuất hiện
  inCheck: boolean;                            // bên đang đi có đang bị chiếu không (cache)

  clock: ClockState;
  connection: { red: ConnState; black: ConnState };

  drawOffer:      { by: Side; atPly: number } | null;
  lastDrawOfferPly: { red: number; black: number };
  takebackRequest:{ by: Side; plies: 1 | 2 } | null;
  takebacksUsed:  { red: number; black: number };

  status: 'waiting' | 'playing' | 'finished';
  ready: { red: boolean; black: boolean };
  result?: {
    winner: Side | null;                       // null = hoà
    reason: EndReason;
    endedAtPly: number;
  };

  config: XiangqiConfig;

  // --- các trường CHỈ SERVER, view() phải xoá sạch ---
  _rngSeed: string;                            // lộ ra sau khi ván kết thúc
  _botHint?: { depth: number; score: number; pv: number[] };
  _antiCheat?: Record<string, unknown>;
}

interface ConnState {
  online: boolean;
  offlineSince: number | null;                 // `now` lúc mất kết nối
}
```

GHI CHÚ QUAN TRỌNG VỀ STATE:
1. `moves` là nguồn sự thật duy nhất. `board`, `repCount`, `halfmoveClock`, `inCheck` đều DẪN XUẤT được từ `moves`. Khi xin đi lại (takeback) hoặc khôi phục phòng sau sự cố, hãy DỰNG LẠI từ `moves` thay vì undo tại chỗ — undo tại chỗ gần như chắc chắn làm sai `repCount` và `halfmoveClock`.
2. `hashAfter` phải bao gồm BÊN ĐI. Thiếu bit này thì phát hiện lặp thế sai.
3. `gaveCheck` phải được lưu cùng lúc với nước đi, không tính lại sau — vì phân xử chiếu mãi cần biết TỪNG nước trong chu kỳ có chiếu hay không.
4. State phải serialize được sang JSON gọn (khoảng 2–6 KB cho một ván đầy đủ). `board` 90 số có thể nén thành chuỗi FEN cờ tướng khi lưu dài hạn.
5. Engine là hàm thuần: KHÔNG Date.now(), KHÔNG Math.random(), KHÔNG I/O. Toàn bộ thời gian qua tham số `now`, toàn bộ ngẫu nhiên qua `rng`.

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `MOVE` | { from: number; to: number; ply: number }  // from/to là chỉ số ô 0..89 (r*9+c). `ply` là số nửa-nước mà client tin là hiện tại, dùng để chống gửi trùng (idempotent). Tuỳ chọn: { iccs: "h2e2" } dạng chuỗi toạ độ a0..i9 cho log/replay. | 1) state.status === 'playing'. 2) playerId phải khớp state.seat[state.turn] — sai thì lỗi NOT_YOUR_TURN. 3) action.ply === state.ply, lệch thì bỏ qua im lặng nếu ply < state.ply và nước đó trùng nước vừa đi (double-submit), ngược lại lỗi STALE_PLY. 4) from, to là số nguyên 0..89 và from !== to. 5) board[from] !== 0 và quân ở from thuộc về bên đang đi. 6) board[to] === 0 hoặc là quân đối phương (cấm ăn quân mình). 7) Nước phải nằm trong tập nước sinh ra bởi generatePseudoMoves cho đúng loại quân (Tướng trong cung 9 ô; Sĩ trong cung theo chéo; Tượng chéo 2 ô, mắt tượng trống, không qua sông; Mã nước nhật, ô cản chân trống; Xe đường trống; Pháo đi đường trống / ăn đúng 1 ngòi; Tốt tiến 1, chỉ đi ngang sau khi qua sông, không lùi). 8) Sau khi thử đi, Tướng bên đi KHÔNG bị chiếu VÀ hai Tướng KHÔNG lộ mặt nhau — vi phạm thì lỗi ILLEGAL_SELF_CHECK. 9) Nếu nước đi này tạo ra lần lặp thế thứ 3 (cùng bàn cờ + cùng bên đi) thì vẫn CHẤP NHẬN nước đi, rồi chạy adjudicateRepetition() để ra kết quả thắng/thua/hoà — không được từ chối nước đi. 10) Nếu clock của bên đi đã <= 0 tại thời điểm `now` thì không nhận nước, xử hết giờ trước. |
| `RESIGN` | {} | status === 'playing'; playerId phải là một trong hai seat. Có hiệu lực bất kể có phải lượt mình hay không. Nếu config.confirmResign thì client tự xác nhận, server không cần bước hai. |
| `OFFER_DRAW` | {} | status === 'playing'; playerId là một trong hai seat; phải đang ĐẾN LƯỢT mình (theo luật VN: đề nghị hoà khi đến lượt mình đi, trước hoặc sau khi đi nhưng chưa bấm đồng hồ — online: cho phép đề nghị trong lượt mình). Không được đề nghị khi state.drawOffer đang mở. Chống spam: state.ply - (lastDrawOfferPly[side] ?? -99) >= config.drawOfferCooldownPly (mặc định 10). Nếu bên đề nghị đang bị chiếu bí hoặc hết nước đi thì từ chối (luật VN: bên đang bị chiếu hết/vây chặt không được đề nghị hoà). |
| `RESPOND_DRAW` | { accept: boolean } | status === 'playing'; state.drawOffer != null; playerId phải là bên KHÔNG đề nghị. accept=true → kết thúc hoà (reason: AGREEMENT). accept=false → xoá drawOffer, ghi lastDrawOfferPly cho bên đề nghị. Lời đề nghị tự hết hạn sau config.drawOfferTtlPly (mặc định 2 nửa-nước) hoặc khi bên đề nghị đi thêm 1 nước. |
| `CLAIM_DRAW` | { reason: 'SIXTY_MOVES' | 'REPETITION' | 'INSUFFICIENT_MATERIAL' } | status === 'playing'; playerId là một trong hai seat. SIXTY_MOVES: chỉ hợp lệ khi state.halfmoveClock >= 120 (60 nước mỗi bên không ăn quân nào). REPETITION: chỉ hợp lệ khi repCount[hash hiện tại] >= 3 VÀ adjudicateRepetition() ra kết quả DRAW (nếu ra kết quả THUA cho một bên thì áp kết quả đó, không phải hoà). INSUFFICIENT_MATERIAL: chỉ hợp lệ khi CẢ HAI bên đều không còn quân tấn công (không còn Xe/Pháo/Mã/Tốt). Sai điều kiện → lỗi CLAIM_NOT_AVAILABLE, không phạt. Ghi chú: server NÊN tự áp 3 luật này mà không chờ claim; action này chỉ để client chủ động. |
| `CLAIM_TIMEOUT` | {} | status === 'playing'; playerId là một trong hai seat. Server tính lại đồng hồ với `now`; chỉ hợp lệ nếu quỹ giờ của bên ĐANG ĐI đã <= 0. Kết quả: bên hết giờ THUA, TRỪ KHI bên còn lại không còn quân tấn công nào (Xe/Pháo/Mã/Tốt) → xử HOÀ. Thực tế tick() đã lo việc này; action chỉ là đường dự phòng khi tick bị trễ. |
| `REQUEST_TAKEBACK` | { plies: 1 | 2 } | Chỉ bật khi config.allowTakeback === true (phòng bạn bè / đấu bot; LUÔN tắt ở chế độ xếp hạng và ghép cặp). status === 'playing'; state.ply >= plies; không có takebackRequest đang mở; mỗi bên tối đa config.maxTakebacks (mặc định 1) mỗi ván. Khi đấu bot thì chấp nhận ngay không cần hỏi. |
| `RESPOND_TAKEBACK` | { accept: boolean } | Chỉ bật khi config.allowTakeback; state.takebackRequest != null; playerId là bên KHÔNG yêu cầu. accept=true → replay lại ván từ danh sách nước đi, bỏ `plies` nước cuối, khôi phục halfmoveClock/repCount/checkFlags bằng cách dựng lại từ đầu (KHÔNG undo tại chỗ — dễ sai bộ đếm lặp thế). Đồng hồ KHÔNG hoàn lại. |
| `READY` | {} | Chỉ hợp lệ khi status === 'waiting'. Đánh dấu seat sẵn sàng. Khi cả hai seat ready (hoặc một seat là bot) → status = 'playing', khởi động đồng hồ của Đỏ tại `now`. Idempotent. |

## Kết thúc ván

ĐIỀU KIỆN KẾT THÚC (xét theo đúng thứ tự này ngay sau mỗi nước đi trong apply, và trong tick cho phần đồng hồ):

BƯỚC 1 — Sinh toàn bộ nước hợp lệ cho bên SẮP đi. Nếu KHÔNG còn nước nào:
  - Nếu bên đó ĐANG BỊ CHIẾU → CHIẾU BÍ, bên đó THUA (reason CHECKMATE).
  - Nếu bên đó KHÔNG bị chiếu → HẾT NƯỚC ĐI, bên đó VẪN THUA (reason STALEMATE). Đây là điểm khác cờ vua, luật Việt Nam xử thua chứ không hoà.

BƯỚC 2 — Lặp thế. Nếu repCount[hash hiện tại] >= 3 → chạy adjudicateRepetition():
  - Đỏ chiếu mãi, Đen không → ĐỎ THUA (PERPETUAL_CHECK). Và ngược lại.
  - Cả hai chiếu mãi → HOÀ (REPETITION_DRAW).
  - Một bên chiếu mãi, một bên đuổi mãi → BÊN CHIẾU MÃI THUA.
  - Không ai chiếu mãi, chỉ một bên đuổi mãi (và chaseRule bật) → BÊN ĐUỔI THUA (PERPETUAL_CHASE).
  - Cả hai đuổi mãi, hoặc không ai vi phạm → HOÀ (REPETITION_DRAW).

BƯỚC 3 — halfmoveClock >= config.sixtyMoveHalfPlies (mặc định 120) → HOÀ (SIXTY_MOVE_DRAW).

BƯỚC 4 — Cả hai bên đều không còn quân tấn công nào (không còn Xe, Pháo, Mã, Tốt) → HOÀ (INSUFFICIENT_MATERIAL).

BƯỚC 5 — ply >= config.hardMoveCap (mặc định 600 nửa-nước) → HOÀ (MOVE_CAP_DRAW).

NGOÀI LUỒNG NƯỚC ĐI:
- RESIGN → bên xin thua THUA (RESIGN).
- Hết giờ (phát hiện trong tick hoặc CLAIM_TIMEOUT) → bên hết giờ THUA (TIMEOUT), TRỪ KHI bên còn lại không còn quân tấn công nào → HOÀ (INSUFFICIENT_MATERIAL).
- Mất kết nối quá config.disconnectGraceMs → THUA (DISCONNECT). Nếu CẢ HAI cùng mất kết nối quá hạn → HOÀ.
- Thoả thuận hoà → HOÀ (AGREEMENT).

THỨ TỰ ƯU TIÊN KHI NHIỀU ĐIỀU KIỆN CÙNG THOẢ: kết quả THẮNG/THUA luôn thắng thế trước kết quả HOÀ. Cụ thể, nếu một nước vừa chiếu bí đối phương vừa đẩy halfmoveClock lên 120 thì kết quả là CHIẾU BÍ, không phải hoà 60 nước. Tương tự, nếu một nước vừa tạo lặp thế lần 3 vừa chiếu bí thì là CHIẾU BÍ. Đây là lý do BƯỚC 1 phải chạy trước BƯỚC 2 và 3.

TÍNH ĐIỂM CUỐI — results(state) trả về mảng 2 phần tử:
- Bên THẮNG: { playerId, place: 1, score: 1 }
- Bên THUA:  { playerId, place: 2, score: 0 }
- HOÀ: cả hai { playerId, place: 1, score: 0.5 }
`score` chính là điểm ván chuẩn dùng cho công thức Elo, nên hệ thống xếp hạng dùng thẳng được không cần quy đổi.

ELO KHUYẾN NGHỊ CHO NỀN TẢNG (không phải luật cờ): K = 32 dưới 1600 điểm, K = 24 từ 1600–2000, K = 16 trên 2000. Ván đấu bot KHÔNG tính Elo. Ván có bật takeback hoặc bật gợi ý nước đi KHÔNG tính Elo. Ván thua do mất kết nối vẫn tính Elo bình thường (nếu không sẽ bị lạm dụng để né thua).

## Che thông tin ẩn

Cờ tướng là trò chơi THÔNG TIN HOÀN TOÀN MỞ: không có quân úp, không có bài trên tay, không có xúc xắc. Bàn cờ, lịch sử nước đi, đồng hồ đều công khai cho cả hai người chơi và khán giả. Vì vậy `view(state, viewerId)` gần như trả về nguyên state. Tuy nhiên vẫn phải che 6 thứ, không phải vì luật chơi mà vì công bằng và chống khai thác:

1. `rngState` / seed nội bộ — che với TẤT CẢ (kể cả hai người chơi) cho đến khi ván kết thúc. Sau khi kết thúc thì lộ ra để người chơi kiểm chứng việc bốc thăm Đỏ/Đen là công bằng.

2. Thông tin nội bộ của bot: độ sâu đang tìm, điểm lượng giá, nước dự kiến (principal variation), sổ khai cuộc đang khớp. Che tuyệt đối với người chơi và khán giả. Chỉ để lộ một cờ boolean `botThinking` và mức khó. Nếu để lộ eval, người chơi sẽ biết mình đang thua/thắng bao nhiêu và bot mất hết giá trị.

3. Gợi ý / phân tích trả phí (nếu có tính năng "gợi ý nước đi"): chỉ trả cho đúng viewerId đã mua, không đưa vào state chung, và ghi log số lần dùng để chống lạm dụng ở ván xếp hạng.

4. `drawOffer` và `takebackRequest` khi đang chờ trả lời: chỉ hiện cho hai người chơi, KHÔNG gửi cho khán giả. Lý do: lời đề nghị hoà là một tín hiệu tâm lý, khán giả (có thể là đồng đội đang nhắn tin cho người chơi) không nên biết trước.

5. Metadata chống gian lận: điểm nghi ngờ dùng engine, thời gian suy nghĩ chi tiết từng nước, dấu vân tay thiết bị — che với mọi viewer, chỉ lộ cho hệ thống quản trị.

6. Nếu triển khai "đi trước" (premove — người chơi đặt sẵn nước cho lượt sau): premove của một bên phải được che hoàn toàn khỏi bên kia và khỏi khán giả cho tới khi nó thực sự được thực thi.

Ngoài ra khán giả nên nhận state trễ một khoảng có thể cấu hình (mặc định 0, bật 30–60 giây ở giải đấu) để chống việc khán giả là đồng phạm mớm nước qua kênh ngoài. Đây là tính năng cấp nền tảng chứ không phải luật cờ.

## Tính giờ

CỜ TƯỚNG THUẦN LƯỢT, không tick game logic. Nhưng đồng hồ vẫn cần một vòng tick nhẹ (1 Hz là đủ) để phát hiện hết giờ, hết hạn đề nghị hoà và hết hạn ân hạn mất kết nối. tick() KHÔNG BAO GIỜ thay đổi thế cờ.

HAI CHẾ ĐỘ, nền tảng nên hỗ trợ cả hai:

【A. moveplus — KIỂU APP CỜ TƯỚNG VIỆT NAM, nên đặt làm MẶC ĐỊNH】
Mỗi nước có một quỹ giờ riêng `perMoveMs`. Nếu người chơi đi xong trong quỹ đó thì quỹ tổng `mainMs` KHÔNG bị trừ. Nếu vượt quá, phần vượt mới trừ vào `mainMs`. Hết cả hai là thua. Đây là mô hình quen thuộc nhất với người chơi cờ tướng Việt Nam ("10 phút mỗi ván, 30 giây mỗi nước").
Công thức trong tick(state, now):
  elapsed = now - clock.turnStartAt
  moveLeftMs = max(0, perMoveMs - elapsed)
  overflow   = max(0, elapsed - perMoveMs)
  mainLeft   = mainMs[turn] - overflow
  hết giờ khi moveLeftMs === 0 && mainLeft <= 0
Khi đi xong một nước: mainMs[turn] = max(0, mainMs[turn] - overflow); reset turnStartAt = now cho bên kia.
Gói đề xuất: Chớp 3 phút + 10 giây/nước · Nhanh 10 phút + 30 giây/nước · Tiêu chuẩn 20 phút + 60 giây/nước.

【B. fischer — cho người quen cờ vua và cho giải đấu】
Trừ thẳng vào quỹ tổng, cộng `incMs` sau MỖI nước đã hoàn thành.
  mainMs[turn] -= (now - turnStartAt); nếu > 0 thì mainMs[turn] += incMs
Gói đề xuất: 3+2 · 5+3 · 10+5 · 15+10.

QUY TẮC CHUNG:
- Đồng hồ bên Đỏ chạy ngay khi status chuyển sang 'playing'. Đồng hồ chuyển bên đúng tại thời điểm server NHẬN được nước đi hợp lệ, không phải lúc client bấm.
- Bù độ trễ mạng: trừ đi min(rtt/2, 200 ms) khỏi thời gian đã dùng của nước đó. Trần 200 ms để không ai giả lag kiếm giờ.
- Engine là hàm thuần: MỌI phép tính thời gian dùng tham số `now` truyền vào. Tuyệt đối không gọi Date.now() bên trong engine — nếu không sẽ không replay được ván khi khôi phục phòng hay khi xử lý khiếu nại.
- Nguồn thời gian chuẩn là đồng hồ SERVER. Client chỉ nội suy để hiển thị mượt và đồng bộ lại mỗi 5 giây; chênh lệch dưới 300 ms thì client tự kéo dần chứ đừng giật số.

HẾT GIỜ:
- Bên hết giờ THUA, TRỪ KHI bên còn lại không còn quân tấn công nào (không còn Xe, Pháo, Mã, Tốt) → xử HOÀ. Đây là quy định rõ trong luật Việt Nam, phải cài đúng.
- Khi còn dưới 10 giây: đổi màu đồng hồ sang đỏ, rung nhẹ thiết bị, phát tiếng tích tắc. Ở chế độ moveplus, vòng tiến trình của giờ-mỗi-nước là thành phần hiển thị chính, quỹ tổng để nhỏ bên dưới.

MẤT KẾT NỐI:
- Ân hạn mặc định 60 giây, và thời gian này VẪN TRỪ vào đồng hồ của người mất kết nối (nếu không thì rút mạng trở thành cách câu giờ).
- Quá ân hạn → xử THUA (reason DISCONNECT). Cả hai cùng quá hạn → HOÀ.
- Khi kết nối lại, dựng lại toàn bộ ván từ mảng `moves` và đồng bộ đồng hồ theo `now` của server.

ĐẤU BOT:
- Thời gian nghĩ của bot KHÔNG trừ vào đồng hồ người chơi. Bot có ngân sách CPU riêng (100 / 250 / 800 ms theo mức khó) cộng một độ trễ hiển thị 400–900 ms gieo bằng `rng` để trông tự nhiên. Nếu ở thế chỉ còn đúng một nước hợp lệ thì bỏ độ trễ giả, đi ngay.
- Đồng hồ của bot nên hiển thị nhưng không bao giờ hết giờ (hoặc ẩn hẳn, tuỳ thiết kế UI).

## Bot

MINIMAX HOÀN TOÀN KHẢ THI cho cờ tướng — đây không phải cờ vây. Hệ số phân nhánh trung bình ~38, sinh nước rẻ. Kiến trúc đề xuất: negamax + alpha-beta + iterative deepening, chạy trong worker_threads.

BIỂU DIỄN (quyết định 90% tốc độ):
- Bàn cờ là Int8Array(256) kiểu mailbox 16 cột: sq = (r + 3) * 16 + (c + 3), r 0..9, c 0..8. Có sẵn các bảng tra Uint8Array(256): IN_BOARD, IN_PALACE_RED, IN_PALACE_BLACK, IS_RED_HALF. Cách này xoá sạch kiểm tra biên trong vòng lặp.
- Mã quân: (side << 3) | type, type 1..7 = K,A,B,N,R,C,P. 0 = trống, 0xFF = ngoài bàn.
- Danh sách quân: Int8Array(32) lưu ô của từng quân (2 Tướng, 4 Sĩ, 4 Tượng, 4 Mã, 4 Xe, 4 Pháo, 10 Tốt), cập nhật tăng dần theo make/unmake.
- Nước đi đóng gói thành 1 số nguyên: from | (to << 8) | (captured << 16). Move list là một Int32Array(64 * 128) phẳng, mỗi ply một lát cắt — TUYỆT ĐỐI không tạo object/array mới trong vòng lặp tìm kiếm.
- Zobrist: hai Int32Array(16 * 256) (nửa cao + nửa thấp) để tránh BigInt. Khoá gồm cả BÊN ĐI.
- make/unmake tăng dần: cập nhật hash, danh sách quân, vật chất, giá trị PST. Không copy bàn cờ.

TỐC ĐỘ THỰC TẾ (thành thật): với cách trên, Node 20+ trên 1 core server thường (vCPU ~3GHz) đạt 0.8–2.0 triệu nút/giây. Ngân sách 800 ms → 0.6–1.6 triệu nút → độ sâu 8–10 ply ở trung cuộc, 12–16 ở tàn cuộc. Nếu dev cài kiểu "đẹp" — mỗi nước là một object { from, to }, bàn cờ là mảng 2 chiều, copy state mỗi nước — thì tụt còn 80–200 nghìn nút/giây, chỉ đạt độ sâu 5–6 và bot sẽ yếu hẳn. Đây là điểm phải chốt trước khi viết dòng code đầu tiên.

HÀM LƯỢNG GIÁ (đơn vị centi-tốt, Tốt chưa qua sông = 100):
1) Vật chất cơ bản: Xe 1000, Pháo 500, Mã 450, Sĩ 200, Tượng 200, Tốt 100; Tốt đã qua sông 200; Tốt ở 3 hàng cuối sân địch 250; Tướng 30000 (chỉ để bắt lỗi).
2) Điều chỉnh động theo cấu trúc (rất quan trọng trong cờ tướng, bỏ là bot chơi ngu):
   - Mã +30 khi tổng số quân trên bàn <= 12 (Mã mạnh tàn cuộc); Mã −25 khi bàn còn >= 26 quân và bị kẹt.
   - Pháo −10 cho mỗi quân biến mất dưới ngưỡng 20 quân (pháo mất ngòi, tối đa −120).
   - Sĩ và Tượng mỗi quân +40 nếu đối phương còn >= 1 Pháo ("khuyết tượng sợ pháo").
   - Sĩ mỗi quân +60 nếu đối phương còn >= 2 Xe ("khuyết sĩ kỵ song xe").
   - Nếu ta không còn Tốt nào và chỉ còn <= 1 quân mạnh → nhân toàn bộ điểm chênh lệch với 0.4 (xu hướng hoà tàn cuộc).
3) Bảng điểm theo ô (PST) 9x10 cho mỗi loại, viết theo góc nhìn Đỏ rồi lật chỉ số cho Đen:
   - Tốt: 0 ở hàng nhà, +10 khi tới sông, +30..+50 sau khi qua sông (cột giữa c=3,4,5 cộng thêm +15), đỉnh +70 ở hàng r=1..2; r=0 trừ −20 (hàng cuối chỉ đi ngang được, gần như vô dụng).
   - Mã: −25 ở 4 góc và cột biên, 0 ở sân nhà, +20..+40 ở các ô r=3..6 cột giữa, +55 ở các ô trực tiếp uy hiếp cung địch.
   - Xe: 0 trong góc nhà, +15 khi ra cột thoáng, +30 ở hàng 2 sân địch ("xe sang hà"), +40 ở hàng cuối/ trong cung địch.
   - Pháo: +30 ở cột giữa c=4 (pháo đầu), +20 ở hàng ngang đối diện cung địch, −15 khi trên cột/hàng không còn ngòi nào.
   - Sĩ/Tượng: gần như 0, +8 cho Tượng tâm (c=4) và Sĩ tâm cung (liên hoàn).
   - Tướng: +10 ở ô nhà (9,4); −25 nếu rời hàng cuối khi trên bàn còn >= 4 quân mạnh của đối phương.
4) Các hạng mục cấu trúc (chỉ bật ở mức Vừa/Khó):
   - Cơ động: +2 mỗi nước hợp lệ của Xe, +3 của Mã (đếm nước không bị cản chân), +1 của Pháo. Mã bị cản cả 8 hướng: −35.
   - An toàn Tướng: đếm số quân địch tấn công 9 ô cung, −12 mỗi quân; −45 nếu cột Tướng thông thoáng và đối phương có Xe/Pháo trên cột đó; −35 nếu đối phương có "pháo lồng" (2 Pháo hoặc Pháo + Xe xếp chồng) nhắm vào cột Tướng.
   - Xe đôi thông nhau (cùng hàng hoặc cùng cột, không vật cản): +25.
   - Tốt đã sang sông nằm cùng hàng với Xe/Pháo của mình: +12.
   - Tempo: +12 cho bên đang đi.
   - Đối xứng: eval(state) = điểm bên đi − điểm bên kia. Phải đối xứng tuyệt đối, viết unit test kiểm tra eval(pos) === −eval(mirror(pos)).

TÌM KIẾM:
- Iterative deepening 1..maxDepth, cửa sổ nguyện vọng ±50, mở rộng cửa sổ khi fail high/low.
- Bảng chuyển vị (TT): Int32Array 4 ô/entry, 1<<20 entry (~16 MB) DÙNG CHUNG cho cả pool bot, có trường `age` để hết ván thì không cần xoá. TUYỆT ĐỐI không cấp phát một TT 16 MB cho mỗi phòng — 200 phòng là 3.2 GB.
- Xếp thứ tự nước: (1) nước từ TT — phải kiểm tra lại tính hợp lệ vì hash có thể va chạm, (2) nước ăn theo MVV/LVA có lọc SEE, (3) 2 killer move của ply, (4) history heuristic (Int32Array(2*256*256), chia đôi định kỳ để không tràn).
- Quiescence search: chỉ nước ăn, có SEE loại nước ăn thua thiệt; khi đang bị chiếu thì sinh TOÀN BỘ nước gỡ chiếu (nếu không bot sẽ đánh giá sai các thế bị chiếu).
- Null-move pruning R=2, TẮT khi: đang bị chiếu, depth < 3, hoặc bên đi chỉ còn <= 1 quân mạnh (cờ tướng có zugzwang thật vì hết nước đi là THUA).
- Mở rộng khi bị chiếu +1 ply (giới hạn tổng mở rộng <= 8 để không nổ cây).
- LMR: giảm 1 ply cho nước thứ >= 4 không phải ăn / không phải chiếu, ở depth >= 3; nếu điểm vượt alpha thì tìm lại đủ sâu.
- Futility pruning ở depth 1–2 với biên 150 / 350.
- Kiểm tra đồng hồ mỗi 2048 nút; khi hết giờ thì DỪNG và trả nước tốt nhất của độ sâu đã HOÀN THÀNH gần nhất (không bao giờ trả về undefined).
- LUẬT LẶP THẾ TRONG SEARCH (bắt buộc, không bỏ được): giữ mảng hash theo ply và cờ "nước này có chiếu không". Khi gặp lại hash trong cây:
    * nếu chu kỳ lặp cho thấy CHÍNH BOT là bên chiếu mãi → trả −MATE + ply (bot tự biết mình sẽ bị xử thua);
    * nếu ĐỐI PHƯƠNG chiếu mãi → trả +MATE − ply;
    * ngược lại trả điểm hoà = contempt: 0 khi ngang cơ, −30 nếu bot đang hơn >= 200 centi-tốt (để bot không đi vào hoà khi đang thắng), +20 nếu đang thua.
- Ngoài ra truyền halfmoveClock vào search: khi clock > 100 nửa-nước, giảm dần điểm chênh lệch (bot biết mình sắp bị xử hoà 60 nước nên phải đổi quân/tiến Tốt).

BA MỨC KHÓ:
- DỄ (~ELO 900–1100, ngân sách 100 ms): depth cố định 2, KHÔNG quiescence (chỉ 1 lớp kiểm tra nước ăn ở nút lá bằng SEE), eval = vật chất + PST của Tốt và Mã, bỏ toàn bộ mục cơ động/an toàn Tướng. Sau khi có danh sách nước đã xếp hạng, dùng `rng` CỦA SERVER chọn ngẫu nhiên trong top-5 với trọng số [0.40, 0.25, 0.15, 0.12, 0.08]; thêm 20% khả năng chọn hoàn toàn ngẫu nhiên một nước "không thua ngay" (không bị mất Xe hoặc bị chiếu bí trong 1 nước hồi đáp). Không sổ khai cuộc. Vẫn PHẢI thấy chiếu bí trong 1 nước (nếu không sẽ ngu đến mức bực mình) nhưng chỉ nhìn thấy 60% số lần.
- VỪA (~ELO 1400–1600, ngân sách 250 ms): iterative deepening tới depth 5 hoặc hết giờ, có quiescence, TT, killer/history, KHÔNG null-move, KHÔNG LMR. Eval đầy đủ trừ mục cơ động. Sau khi search xong: 12% chọn nước hạng 2 nếu chênh <= 70 centi-tốt (gieo bằng `rng` server). Sổ khai cuộc 6 nước đầu.
- KHÓ (~ELO 1900–2100, ngân sách 800 ms, cứng 950 ms): bật toàn bộ — aspiration, null-move, LMR, futility, check extension, quiescence có SEE, TT 1<<20, eval đầy đủ. Sổ khai cuộc 12–16 nước phủ các hệ phổ biến ở Việt Nam: Pháo đầu – Bình phong mã, Pháo đầu – Phản công mã, Thuận pháo, Nghịch pháo, Tiên nhân chỉ lộ, Phi tượng cục. Thêm bảng tri thức tàn cuộc thủ công cho ~20 thế cơ bản (Xe thắng Sĩ Tượng bền; Mã + Tốt thắng Sĩ đơn; Pháo + Tốt vs Sĩ Tượng bền = hoà; Xe + Pháo thắng Xe...) để bot không đổi quân vào thế hoà. KHÔNG dùng ngẫu nhiên ngoài việc chọn giữa các nước ngang điểm tuyệt đối.

TÀI NGUYÊN SERVER: mỗi nước mức Khó tốn ~0.8 giây CPU 1 core. Chạy bot trong pool worker_threads kích thước (số core − 1), có hàng đợi. Khi hàng đợi dài, hạ ngân sách động: budget = clamp(800 / (1 + queueLen / poolSize), 120, 800) — thà bot hơi yếu còn hơn người chơi chờ 5 giây. Đo p95 thời gian nghĩ và log lại.

LỐI THOÁT NẾU CẦN MẠNH HƠN: biên dịch một engine C sẵn có (ElephantEye / Pikafish) sang WASM và gọi từ Node. Nhưng đề bài yêu cầu TypeScript thuần nên chỉ nêu như phương án B, và lưu ý engine ngoài sẽ KHÔNG hiểu luật chiếu mãi/đuổi mãi theo cách nền tảng cài — phải bọc thêm một lớp lọc nước.

### Chỗ bot dễ hỏng

1. KHÔNG cài luật chiếu mãi vào search là lỗi chết người số một. Bot sẽ vui vẻ đi vào vòng chiếu liên tục vì tưởng đó là hoà (hoặc tưởng mình đang ép), rồi bị trọng tài server xử THUA. Tệ hơn: khi bot đang thua, nó sẽ cố chiếu mãi để cầu hoà và tự thua. Bắt buộc: search phải trả −MATE cho nhánh mà chính bot chiếu mãi.

2. Hết nước đi = THUA chứ không phải hoà. Nếu code trả 0 điểm khi không sinh được nước nào (copy từ code cờ vua), bot sẽ tự chui vào thế bí và sẽ không biết ép đối thủ vào thế bí — mất một loại đòn thắng quan trọng của cờ tướng.

3. Bỏ qua "lộ mặt tướng" trong sinh nước / dò chiếu → bot thí quân vô nghĩa hoặc đi nước tự thua ngay. Phải coi Tướng như một quân Xe chỉ tấn công theo cột, tính trong CẢ isAttacked lẫn kiểm tra hợp lệ.

4. Không có quiescence → hiệu ứng chân trời rất nặng trong cờ tướng vì các dây chuyền đổi Xe/Pháo trên cột giữa rất dài. Bot sẽ "thấy" mình ăn được Xe ở ply cuối rồi bị ăn lại ở ply sau.

5. Đánh giá Pháo sai. Pháo cần ngòi. Bot không phạt "pháo mất ngòi" sẽ giữ Pháo vào tàn cuộc trống trơn rồi thua Mã. Ngược lại, không thưởng "pháo đầu" thì bot chơi khai cuộc lờ đờ.

6. Đánh giá Sĩ/Tượng như hằng số. Trong cờ tướng giá trị Sĩ/Tượng phụ thuộc quân tấn công CỦA ĐỐI PHƯƠNG (khuyết sĩ kỵ song xe, khuyết tượng sợ pháo). Bot cài cứng Sĩ=200 sẽ thí Sĩ bừa và thua các đòn Pháo cơ bản.

7. Cản chân Mã / mắt Tượng sai hướng. Ô cản Mã là ô THẲNG kề theo bước đi đầu, không phải ô chéo, và tính cả quân của chính mình. Bug này khiến bot sinh ra nước bất hợp lệ, server từ chối, bot trả nước rỗng → treo phòng.

8. Nước từ TT không được kiểm tra lại. Va chạm Zobrist (nhất là khi chỉ dùng 32 bit) sẽ đẩy một nước bất hợp lệ vào đầu danh sách, make() nó và làm hỏng bàn cờ trong cây. Luôn validate TT move.

9. Null-move pruning trong tàn cuộc thưa quân. Cờ tướng có zugzwang thật (hết nước đi là thua), null-move sẽ cho điểm sai nghiêm trọng. Phải tắt khi bên đi còn rất ít quân mạnh.

10. Cấp phát bộ nhớ trong vòng lặp. Mỗi `{from, to}` là một object; ở 1 triệu nút là 1 triệu object → GC ăn hết thời gian, tốc độ tụt 10 lần và thời gian nghĩ dao động không đoán trước được (lúc 300 ms lúc 2.5 giây vì major GC). Phải dùng số nguyên đóng gói + typed array cấp phát sẵn.

11. Không kiểm tra đồng hồ trong search → một nước nghĩ 4 giây làm nghẽn worker, người chơi tưởng treo. Và ngược lại: khi hết giờ giữa chừng của một độ sâu, KHÔNG được dùng kết quả dở dang của độ sâu đó (nó chưa duyệt hết nước, có thể tệ hơn hẳn) — phải lấy kết quả của độ sâu hoàn thành gần nhất.

12. Bot không biết bộ đếm 60 nước. Bot đang hơn Xe nhưng cứ đi lòng vòng, tới nước 120 bị xử hoà. Phải truyền halfmoveClock vào eval và giảm dần điểm ưu thế khi clock tăng, để bot chủ động đổi quân hoặc tiến Tốt.

13. Mức Dễ làm ngẫu nhiên bằng Math.random() thay vì `rng` server → ván không replay được, và mở đường cho client đoán/khai thác. Mọi ngẫu nhiên của bot phải đi qua rng do server giữ, và seed phải được ghi vào state.

14. Mức Dễ ngẫu nhiên quá tay: bot thí Xe không lý do thì người chơi thấy giả, không thấy vui. Cách đúng là bot vẫn chơi hợp lý nhưng "không nhìn xa" — depth thấp + đôi khi bỏ lỡ đòn 2 nước, chứ không phải đi nước rác.

15. Chạy bot trên main thread của Node → chặn event loop, toàn bộ socket của các phòng khác đứng hình 800 ms. Bắt buộc worker_threads.

16. Mỗi phòng một instance bot với TT riêng 16 MB → 200 phòng là 3.2 GB RAM. Dùng pool + TT chia sẻ có age.

17. Bot đi ngay tức khắc (20 ms) ở thế dễ trông rất "máy". Nên thêm độ trễ giả tối thiểu 400–900 ms có dao động theo `rng`, và trễ lâu hơn ở thế phức tạp — nhưng đừng trễ ở thế chỉ có 1 nước hợp lệ.

18. Sổ khai cuộc lưu theo chuỗi nước chứ không theo hash vị trí → chuyển vị (cùng thế, khác thứ tự nước) làm bot rơi khỏi sổ sớm. Lưu theo Zobrist.

## Cạm bẫy khi cài đặt

- HẾT NƯỚC ĐI LÀ THUA, không phải hoà. Đây là khác biệt lớn nhất với cờ vua và là lỗi số một của dev quen cờ vua. Khi đến lượt một bên mà bên đó không bị chiếu nhưng cũng không còn nước hợp lệ nào (bị vây chặt), bên đó THUA. Viết test riêng cho trường hợp này.
- LỘ MẶT TƯỚNG phải được cài như một đường TẤN CÔNG của Tướng theo cột, không phải một lần kiểm tra rời sau nước đi. Nếu chỉ kiểm tra rời, sẽ bỏ sót hai tình huống: (a) nước đi của ta MỞ cột giữa hai Tướng khiến ta tự thua (phải cấm), (b) nước đi của ta mở cột và qua đó CHIẾU Tướng đối phương (phải tính là chiếu, kể cả khi dùng để chiếu bí).
- PHÁO: nước ĐI và nước ĂN dùng hai quy tắc khác nhau. Đi thì đường phải hoàn toàn trống (0 quân chắn). Ăn thì phải có ĐÚNG 1 quân bất kỳ (ngòi) nằm giữa, và mục tiêu là quân địch ĐẦU TIÊN sau ngòi. Bug kinh điển: cho Pháo ăn quân đứng kề ngay (0 ngòi), hoặc cho Pháo đi xuyên qua ngòi, hoặc cho ăn quân thứ hai sau ngòi.
- CẢN CHÂN MÃ nằm ở ô THẲNG kề theo bước đi đầu tiên, không phải ô chéo. Với nước (dr,dc)=(±2,±1) ô cản là (r+sign(dr), c); với (±1,±2) là (r, c+sign(dc)). Ô cản tính cả quân CỦA MÌNH. Cài sai hướng cản là bug âm thầm, cờ vẫn chạy nhưng sai luật.
- TƯỢNG có HAI ràng buộc độc lập: mắt tượng (ô giữa đường chéo 2 ô) phải trống, VÀ không được qua sông. Dev hay cài một quên một. Tượng Đỏ chỉ ở r 5..9, Tượng Đen chỉ ở r 0..4; mỗi bên chỉ có đúng 7 điểm hợp lệ.
- TỐT không có phong cấp. Đừng copy logic phong hậu từ cờ vua. Tốt chỉ đi ngang SAU khi qua sông; Tốt tới hàng cuối của đối phương chỉ còn đi ngang được và không bao giờ lùi. Ranh giới qua sông khác nhau theo bên: Đỏ qua sông khi r <= 4, Đen khi r >= 5.
- BỘ ĐẾM 60 NƯỚC chỉ reset khi ĂN QUÂN. Khác cờ vua: nước Tốt KHÔNG reset, nước chiếu KHÔNG reset. Ngưỡng là 120 nửa-nước (60 nước mỗi bên).
- HASH VỊ TRÍ phải bao gồm BÊN ĐI. Thiếu bit này thì phát hiện lặp thế sai hoàn toàn (hai thế giống nhau nhưng khác lượt đi không phải là lặp).
- CHIẾU MÃI / ĐUỔI MÃI phải nằm trên SERVER và phải nằm CẢ TRONG bot search. Nếu chỉ cài ở server, bot sẽ đi vào vòng chiếu mãi rồi bị server xử thua — người chơi sẽ tưởng là lỗi.
- ĐUỔI MÃI là phần khó nhất của cả game. Phân biệt căn thật (quân bảo vệ ăn lại được ngay) và căn giả (bảo vệ trên danh nghĩa nhưng bị ghim / bị cản / ăn lại thì lộ mặt tướng) đòi hỏi mô phỏng thêm một lớp nước đi. Đừng cố làm đúng 100% ở bản đầu — bật cờ cấu hình chaseRule = 'off' | 'simple' | 'asian' và ship bản 'off' trước.
- HẾT GIỜ không phải lúc nào cũng thua. Nếu bên còn giờ KHÔNG còn quân tấn công nào (không còn Xe, Pháo, Mã, Tốt) thì ván xử HOÀ chứ không phải bên hết giờ thua.
- ĐỒNG HỒ chỉ được tính bằng tham số `now` truyền vào tick/apply. Không gọi Date.now() bên trong engine — engine phải là hàm thuần để replay bit-chính-xác khi khôi phục phòng hoặc khi điều tra khiếu nại.
- XIN ĐI LẠI (takeback) phải cài bằng cách DỰNG LẠI ván từ danh sách nước đi, không phải undo tại chỗ. Undo tại chỗ gần như chắc chắn làm sai halfmoveClock, repCount và mảng cờ chiếu — rồi luật lặp thế chạy sai ở nước thứ 40.
- GỬI TRÙNG NƯỚC ĐI (mạng chập chờn, người chơi bấm hai lần) sẽ làm đi mất hai nước. Payload của MOVE phải kèm `ply` để server bỏ qua nước lặp một cách idempotent.
- BỐC THĂM ĐỎ/ĐEN phải qua `rng` của server và seed phải ghi vào state. Đỏ đi trước nên đây là lợi thế thật (khoảng 55/45), không được để client tự quyết.
- KHÁN GIẢ không được nhận sự kiện 'đang có lời đề nghị hoà' trước khi bên kia trả lời, và tuyệt đối không nhận điểm lượng giá của bot. Nếu có chế độ giải đấu thì nên trễ luồng khán giả 30–60 giây để chống mớm nước.
- KÝ HIỆU TIẾNG VIỆT (Pháo 2 bình 5) cần chuyển đổi hai chiều với toạ độ và có các trường hợp rối: cột đánh số 1..9 từ PHẢI sang TRÁI theo góc nhìn của từng bên (nên hai bên đánh số ngược nhau); khi hai quân cùng loại đứng cùng một cột phải dùng 'tiền'/'hậu'; khi có từ ba Tốt trở lên cùng cột phải dùng 'nhất/nhị/tam...' đếm từ phía đối phương. Rất hay cài sai.
- ĐỀ NGHỊ HOÀ SPAM. Giới hạn tối thiểu 10 nửa-nước giữa hai lần đề nghị của cùng một bên, và cấm đề nghị hoà khi bên đề nghị đang bị chiếu bí hoặc đang hết nước đi (theo luật Việt Nam, bên đó chỉ được chịu thua).

## Mỹ thuật riêng của game này

HƯỚNG: "Sơn mài Việt" — chất liệu sơn mài truyền thống Bắc Bộ, không phải gỗ hương kiểu Trung Hoa mà các app cờ tướng hay dùng. Ý tưởng: bàn cờ là một tấm vóc sơn mài mài nhẵn, đặt trên chiếu cói, ánh sáng đèn dầu hắt nghiêng. Phân biệt rõ với các game khác trong nền tảng: cờ vua đi đá cẩm thạch/kính lạnh, cờ vây đi giấy dó + đá/vỏ sò, cờ gánh đi tre nứa + đất nung sân đình, ô ăn quan đi phấn trắng trên nền sân gạch, cờ úp đi nhung tím bí ẩn, cá ngựa đi nhựa màu đồ chơi, cờ tỷ phú đi bìa carton + neon đô thị. Cờ tướng giữ riêng chất SƠN MÀI + THẾP VÀNG.

BẢNG MÀU (token):
- Nền vóc sơn then: #17110E → #241A14 (gradient rất nhẹ, có hạt nhiễu 2-3% mô phỏng bụi sơn).
- Mặt bàn cờ: #3A2A1E (cánh gián) với vân sơn mài loang nhẹ, không phải vân gỗ.
- Đường kẻ bàn: #C9A227 độ mờ 55% (thếp vàng đã xỉn), nét 1.25px, các đường viền ngoài 2px.
- Đỏ (son): #C62828 nền quân, viền #8E1B1B, chữ thếp vàng #E8C34A.
- Đen: #1B1B1F nền quân, viền #3A3A42, chữ khảm trai #D8DEE6 ánh xanh lam rất nhẹ (#AFC3D6 ở highlight).
- Mặt quân: #EDE0C8 (vỏ trứng — đây là điểm nhận dạng, quân cờ là đĩa sơn mài khảm vỏ trứng, viền son hoặc viền then, chữ chìm thếp vàng/bạc).
- Nhấn phụ: ngọc lam #2E7D6F cho ô đang chọn, hổ phách #E0A93B cho nước vừa đi.
- Cảnh báo chiếu: #FF5A3C, nhịp thở 900ms.

CHI TIẾT MỸ THUẬT:
- Sông: một dải sáng hơn #4A3628, in thư pháp chìm "楚河 漢界" bằng vàng mờ 25%, kèm hiệu ứng thuỷ mặc loang rất nhẹ và 2-3 gợn nước chuyển động cực chậm (8s/chu kỳ, biên độ nhỏ, tắt được ở chế độ tiết kiệm pin).
- Cung (九宮): hai đường chéo vẽ bằng nét vàng đậm hơn 15%, bốn góc cung có chấm khảm trai nhỏ.
- Điểm đặt Pháo và Tốt: khắc ký hiệu góc vuông truyền thống (dấu "十" cách điệu) bằng nét vàng mảnh — đúng chuẩn bàn cờ tướng thật, nhiều app bỏ chi tiết này và trông rất giả.
- Quân cờ: đĩa tròn hơi vát mép, có đổ bóng 2 lớp (bóng tiếp xúc cứng 2px + bóng toả 10px), khi nhấc lên thì bóng toả rộng ra và quân nhích lên 3px. Chữ Hán khắc CHÌM (inner shadow) rồi thếp vàng, không phải in nổi.
- Chữ trên quân: Đỏ 帥 仕 相 俥 傌 炮 兵 / Đen 將 士 象 車 馬 砲 卒. BẮT BUỘC có chế độ "chữ Việt" thay bằng TƯỚNG SĨ TƯỢNG XE MÃ PHÁO TỐT (font serif có chân, ví dụ một biến thể Noto Serif) cho người mới — đây là nhu cầu rất thật của người chơi Việt.
- Chuyển động: nước đi là một đường cong bezier ngắn 160ms, ease-out, quân bay hơi cao lên rồi đáp xuống (nhấc-đặt, không trượt). Ăn quân: quân bị ăn xoay 12° và chìm xuống, mờ dần 140ms, kèm một vệt bụi vàng nhỏ. Chiếu tướng: viền cung địch phát sáng đỏ + Tướng rung nhẹ 3 lần.
- Âm thanh: tiếng đặt quân gỗ trên vóc (đục, ngắn, có tiếng vang nhỏ), tiếng ăn quân nặng hơn, tiếng chiếu là một nhịp trống chầu, thắng cuộc là chuông chùa nhỏ. Tránh nhạc nền — người chơi cờ tướng thường nghe gì đó riêng.
- Khung ván: hai bên có "khay quân bị ăn" hình khay gỗ sơn then, quân bị ăn xếp úp thành chồng.
- Chế độ sáng: nếu làm theme sáng thì dùng nền giấy ngà #F3E7CE, đường kẻ nâu #7A5A34, giữ nguyên son và then cho quân — đừng đảo màu quân.
- Bàn cờ phải xoay được 180° (người chơi Đen nhìn từ phía mình), và ở chế độ khán giả mặc định nhìn từ phía Đỏ.

### Asset tối thiểu

- Bàn cờ nền sơn mài 9x10 (SVG vector cho đường kẻ + texture PNG/WebP 2048px cho vân sơn), có lớp riêng cho: đường kẻ, cung + đường chéo, dấu điểm Pháo/Tốt, dải sông
- Thư pháp 楚河 漢界 (SVG path, để tô màu/đổi opacity được)
- 14 mặt quân = 7 loại x 2 màu, dạng SVG (đĩa + viền + chữ khắc), kèm biến thể chữ Việt (thêm 14 mặt nữa) → tổng 28 mặt quân
- 3 trạng thái phủ lên quân: bình thường / đang chọn (viền ngọc lam) / bị chiếu (viền đỏ nhịp thở)
- Chấm gợi ý nước đi (ô trống) + vòng tròn gợi ý nước ăn (ô có quân địch)
- Ô đánh dấu nước vừa đi (from + to, màu hổ phách mờ)
- Mũi tên vẽ tay để phân tích / gợi ý nước (3 màu)
- Khay quân bị ăn (sprite khay + logic xếp chồng)
- Đổ bóng quân: 2 file (bóng tiếp xúc, bóng nhấc lên) hoặc thuần CSS
- Avatar frame + badge cấp bậc (Tân thủ / Sơ cấp / Trung cấp / Cao thủ / Kỳ vương)
- Đồng hồ: khung số + vòng tiến trình giờ-mỗi-nước + trạng thái nguy cấp (<10s đổi đỏ + rung)
- Banner sự kiện: 'CHIẾU TƯỚNG!', 'CHIẾU BÍ', 'HẾT NƯỚC ĐI', 'HOÀ', 'THẮNG', 'THUA' (6 ảnh hoặc component)
- Banner cảnh báo luật: 'Cảnh báo chiếu mãi — đổi nước hoặc bị xử thua', 'Cảnh báo đuổi mãi', 'Sắp hoà theo luật 60 nước (còn N nước)'
- Icon hành động: xin hoà, xin thua, xin đi lại, lật bàn cờ, bật/tắt gợi ý, ghi chép ván
- Hiệu ứng hạt: bụi vàng khi ăn quân, tia sáng khi chiếu bí, pháo hoa nhỏ khi thắng
- Âm thanh (8 file OGG+M4A): đặt quân, ăn quân, chiếu (trống chầu), nước sai (cạch), hết giờ cảnh báo, thắng (chuông chùa), thua, hoà
- Icon 'bot đang nghĩ' (3 chấm thếp vàng) + nhãn mức khó Dễ/Vừa/Khó
- Sprite bàn cờ thu nhỏ cho danh sách phòng / replay thumbnail
- Font: 1 font serif chữ Hán (Noto Serif TC subset chỉ 14 ký tự để nhẹ) + 1 font serif Việt có dấu đầy đủ
- Bảng ký hiệu nước đi tiếng Việt (Pháo 2 bình 5) render dạng text — cần bảng tra tên cột 1-9 cho từng bên

## Ước lượng công sức

Khoảng 10–14 ngày-người cho một bản hoàn chỉnh (engine luật 3–4 ngày, bot 4–6 ngày, UI + hiệu ứng 3–4 ngày). So với các game còn lại trong nền tảng: đắt hơn cờ caro khoảng 4–5 lần, hơn cờ gánh và ô ăn quan khoảng 3 lần, hơn cá ngựa khoảng 2,5 lần. Xấp xỉ ngang cờ vua (luật biên của cờ vua — nhập thành, bắt tốt qua đường, phong cấp — nhiều hơn, nhưng cờ tướng bù lại bằng cụm luật chiếu mãi/đuổi mãi vốn khó hơn tất cả những thứ đó cộng lại). Rẻ hơn cờ vây (5) và cờ tỷ phú (5) rõ rệt. Cờ úp nên làm SAU cờ tướng vì dùng lại được 80% engine này.

THÀNH THẬT VỀ CHI PHÍ, chia theo hạng mục:
- Sinh nước + kiểm tra hợp lệ + chiếu bí + hết nước đi: 1,5 ngày. Đây là phần dễ, một dev quen cờ vua làm xong trong một ngày rưỡi.
- Đồng hồ, kết nối lại, replay, chống gửi trùng: 1 ngày.
- Bộ đếm 60 nước, lặp thế 3 lần, CHIẾU MÃI: 1 ngày. Vẫn còn dễ.
- ĐUỔI MÃI (luật cấm bắt quân liên tục, phân biệt căn thật / căn giả, các ngoại lệ Tướng–Tốt–Tốt chưa qua sông–Mã/Pháo đuổi Xe): 2–4 ngày và là cái bẫy ngân sách lớn nhất của game này. Đây là phần mà cả các ứng dụng thương mại cũng cài sai; có hẳn bài báo học thuật viết riêng về việc cài đặt đầy đủ luật này. KHUYẾN NGHỊ: phát hành bản 1 chỉ với chiếu mãi (chaseRule = 'off'), xử hoà mọi trường hợp lặp thế còn lại. Như vậy đúng với ~95% ván thực tế và cắt được 2–4 ngày. Chỉ làm đuổi mãi khi có chế độ xếp hạng nghiêm túc hoặc giải đấu.
- Bot đạt mức chơi tử tế (~1900 ELO) trong TypeScript thuần, có ba mức khó: 4–6 ngày. Riêng việc tối ưu để đạt trên 1 triệu nút/giây (typed array, không cấp phát, make/unmake tăng dần) chiếm 2 ngày trong số đó, và không thể bỏ qua nếu muốn bot mạnh.
- Giao diện sơn mài + hoạt ảnh + âm thanh: 3–4 ngày, trong đó riêng bộ 28 mặt quân (2 màu x 7 loại x chữ Hán/chữ Việt) mất 1 ngày của designer.
- Ký hiệu nước đi tiếng Việt (Pháo 2 bình 5, có tiền/hậu khi trùng cột): 0,5 ngày, dễ bị đánh giá thấp vì các trường hợp 3 Tốt cùng cột khá rối.

RỦI RO LỊCH: hai chỗ hay trượt tiến độ là (a) đuổi mãi, (b) tối ưu tốc độ bot. Nếu gấp, cắt (a) trước, đừng cắt (b) — bot yếu làm hỏng trải nghiệm rõ hơn là thiếu một luật hiếm gặp.
