# Cờ Cá Ngựa — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-ca-ngua`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–4 |
| Thời gian thực | False |
| Có ngẫu nhiên | True |
| Thông tin ẩn | False |
| Độ khó cài đặt | 3/5 |

══════════════════════════════════════════
PHẦN 0 — NGUỒN VÀ CÁC CHỖ NGUỒN MÂU THUẪN
══════════════════════════════════════════
Cờ cá ngựa KHÔNG có luật chuẩn quốc gia. Đã đối chiếu các nguồn tiếng Việt: Wikipedia tiếng Việt (mục Cờ cá ngựa), FPT Shop, Thế Giới Di Động, Hoàng Hà Mobile, Điện Máy Chợ Lớn, Ziga, sevenlucky (bản 1 xúc xắc), cocanguavn, gifgo, mytour, luatchoi.edu.vn, voer.edu.vn. Nhiều nguồn tự nói rõ "luật thay đổi theo vùng, nên thống nhất trước khi chơi". Dưới đây là các điểm mâu thuẫn ĐÃ XÁC NHẬN và lựa chọn chuẩn của spec này:

M1. SỐ XÚC XẮC. Nguồn chia hai phe. Phe 1 xúc xắc (sevenlucky, voer, một phần Wikipedia): ra quân khi tung 1 hoặc 6. Phe 2 xúc xắc (FPT Shop, Thế Giới Di Động, cocanguavn): ra quân khi tung được cặp 1-6 hoặc bất kỳ cặp đôi nào (1-1, 2-2, 3-3, 4-4, 5-5, 6-6). => CHỌN MẶC ĐỊNH: 1 XÚC XẮC. Lý do kỹ thuật ở M6. Chế độ 2 xúc xắc là config, không phải mặc định.

M2. SỐ Ô VÒNG ĐUA. Con số hay gặp nhất là 56 ô (4 cạnh x 14). Nhưng nhiều nguồn nói thẳng "số ô vòng đua ngoài không giống nhau giữa các bộ cờ, nên đếm trực tiếp trên bàn của mình". => CHỌN: trackLength là CONFIG, mặc định 56, bắt buộc chia hết cho 4.

M3. CÁCH LEO BẬC TRONG CHUỒNG ĐÍCH. Cách hiểu A (phổ biến nhất, FPT Shop, Hoàng Hà, Ziga): phải tung ĐÚNG số bước còn lại, tung dư thì quân đứng yên; ví dụ còn 2 bước thì phải tung đúng 2. Cách hiểu B (một số bài viết diễn đạt lệch): "phải tung đúng số 1 để lên một bậc" hoặc "tung số nhỏ hơn bậc đang đứng thì không đi được". Cách hiểu B thực chất chỉ là cách A viết lại vụng (từ bậc 3 lên bậc 4 đúng là cần tung 1), riêng vế "tung nhỏ hơn bậc đang đứng thì không được đi" là một luật khác hẳn và chỉ thấy ở một nguồn. => CHỌN CÁCH A: khoảng cách chính xác, tung dư thì đứng yên. Bỏ vế lạ của cách B.

M4. Ô AN TOÀN. Một số nguồn: "quân đứng ở ô cùng màu với nó thì không bị đá". Nguồn khác không nhắc, tức là đá được ở mọi ô. Tất cả đều thống nhất: quân trong chuồng xuất phát và quân trong chuồng đích thì an toàn tuyệt đối. => CHỌN MẶC ĐỊNH: KHÔNG có ô an toàn trên vòng đua (safeCells = []). Lý do: biến thể ô an toàn tạo ra thế khoá vĩnh viễn nếu không thêm ngoại lệ (xem mục 8.4). Biến thể vẫn để trong config.

M5. CHỒNG QUÂN CÙNG MÀU. Một số nơi cho 2 quân cùng màu chồng lên một ô và coi đó là ô an toàn; nơi khác coi quân phía trước là vật cản. => CHỌN: KHÔNG CHO CHỒNG QUÂN. Mỗi ô tối đa 1 quân. Đây cũng là cách hiểu khớp với luật cản ở M7.

M6. LUẬT CẢN (không nhảy qua quân). Nhiều nguồn tiếng Việt khẳng định rõ: "nếu phía trước có quân đứng chắn và số điểm lớn hơn khoảng cách tới nó thì không được nhảy qua", và "quân bị cản là khi có quân khác — của mình hoặc của đối phương — đứng trước nó ở khoảng cách nhỏ hơn kết quả tung". Đây là điểm KHÁC BIỆT LỚN so với Ludo quốc tế (Ludo cho nhảy qua thoải mái). => CHỌN: BẬT LUẬT CẢN (blocking = true) làm mặc định, vì đó là nét đặc trưng của cá ngựa Việt Nam. Có config để tắt.

M7. LƯỢT THÊM. 1 xúc xắc: tung 6 được gieo lại. 2 xúc xắc: tung 1-6 hoặc cặp đôi thì được gieo lại "cho tới khi ra kết quả khác". Không nguồn nào đặt trần. => CHỌN: thêm trần kỹ thuật maxRollsPerTurn = 3. Đây là quy ước của spec, KHÔNG có trong nguồn, phải ghi rõ trong bảng luật hiển thị cho người chơi.

M8. "SẬP HẦM Ô SỐ 1". Một nguồn mô tả: quân lọt vào ô số 1 trong chuồng thì bị "sập hầm", phải chung phạt cho cả làng. Đây là luật của lối chơi ăn tiền. => LOẠI BỎ khỏi nền tảng. Bậc 1 chỉ là bậc bình thường không tính vào điều kiện thắng.

M9. RA QUÂN CÓ TIÊU THỤ GIÁ TRỊ XÚC XẮC KHÔNG. Các nguồn không nói rõ quân mới ra có được đi thêm 1 hoặc 6 bước nữa không. => CHỌN: ra quân TIÊU THỤ TRỌN giá trị viên xúc xắc; quân mới đặt tại ô xuất phát và dừng ở đó.

M10. ĐÁ QUÂN CÓ ĐƯỢC ĐI THÊM LƯỢT KHÔNG. Không nguồn nào nói có. => CHỌN: KHÔNG. Lượt thêm chỉ do giá trị xúc xắc quyết định.

══════════════════════════════════════════
PHẦN 1 — THÀNH PHẦN
══════════════════════════════════════════
1.1. Bàn cờ hình vuông, giữa là 4 chuồng đích chụm về tâm.
1.2. Một vòng đua khép kín gồm L ô (L = config.trackLength, mặc định 56), đánh số tuyệt đối 0 .. L-1 theo CHIỀU KIM ĐỒNG HỒ. Mọi người chơi đi cùng một chiều trên cùng một vòng — đây là lý do quân các màu gặp và đá nhau.
1.3. Bốn ghế (seat) 0,1,2,3 tương ứng 4 màu: đỏ, vàng, xanh, tím.
1.4. Ô xuất phát của ghế s: startCell[s] = s * (L / 4). Với L = 56 thì lần lượt là ô 0, 14, 28, 42. Trên bàn thật ô này được tô đúng màu của ghế đó.
1.5. Mỗi người có 4 quân ngựa, ban đầu đều nằm trong CHUỒNG XUẤT PHÁT (stable) — khu chờ bên ngoài vòng đua, không phải một ô của vòng đua.
1.6. Mỗi người có một CHUỒNG ĐÍCH (home lane) gồm 6 bậc đánh số 1..6, bậc 1 nông nhất (sát vòng đua), bậc 6 sâu nhất (sát tâm bàn). Chuồng đích là làn một chiều, chỉ quân của chủ nhân mới vào được.
1.7. CỬA CHUỒNG của ghế s là ô vòng đua ngay TRƯỚC ô xuất phát của chính ghế đó theo chiều đi: gateCell[s] = (startCell[s] + L - 1) mod L. Tức là quân phải đi trọn một vòng rồi mới rẽ vào chuồng đích của mình.
1.8. Xúc xắc: 1 viên (mặc định) hoặc 2 viên (config).

══════════════════════════════════════════
PHẦN 2 — HỆ TOẠ ĐỘ (BẮT BUỘC DÙNG ĐÚNG)
══════════════════════════════════════════
Đây là chỗ sai nhiều nhất khi cài đặt. Dùng hai hệ, tách bạch tên biến:

2.1. steps (TƯƠNG ĐỐI, riêng từng người): số bước quân đã đi kể từ ô xuất phát của CHÍNH CHỦ.
   - Quân trên vòng đua: steps ∈ [0, L-1]. steps = 0 nghĩa là đang đứng trên ô xuất phát của mình. steps = L-1 nghĩa là đang đứng ở cửa chuồng.
   - Quân trong chuồng đích bậc k: steps = (L-1) + k, tức steps ∈ [L, L+5].
   - steps tối đa của một quân = L+5 (với L=56 là 61).
   - Quân trong chuồng xuất phát: quy ước steps = -1.

2.2. absCell (TUYỆT ĐỐI, dùng chung cả bàn): chỉ số ô trên vòng đua.
   toAbs(seat, steps) = (startCell[seat] + steps) mod L, CHỈ hợp lệ khi 0 ≤ steps ≤ L-1.

2.3. QUY TẮC VÀNG: mọi phép kiểm tra va chạm, luật cản, đá quân đều so trên absCell. Mọi phép tính tiến độ, vào chuồng, thắng thua đều tính trên steps. Viết đúng một hàm toAbs và dùng chung, không rải công thức mod khắp code.

2.4. Bảng chiếm chỗ (occupancy) là Map<absCell, {seat, horseId}> dựng lại từ toàn bộ quân đang ở zone 'track' của cả 4 người. Có thể cache nhưng phải dựng lại sau mỗi nước.

══════════════════════════════════════════
PHẦN 3 — THỨ TỰ LƯỢT VÀ SỐ NGƯỜI
══════════════════════════════════════════
3.1. Lượt đi theo chiều tăng của seat, vòng tròn: 0 → 1 → 2 → 3 → 0. Bỏ qua ghế trống và ghế của người đã về đích.
3.2. Người đi trước được xác định ở init bằng rng (không cho gieo tranh lượt, tốn thời gian online).
3.3. 4 người: dùng cả 4 ghế.
3.4. 2 người: BẮT BUỘC dùng ghế 0 và ghế 2 (đối diện nhau). Dùng ghế kề nhau làm quãng đường đuổi bắt lệch hẳn và một bên bất lợi rõ rệt.
3.5. 3 người: dùng ghế 0, 1, 2. Lưu ý ghế 1 bị kẹp giữa và hơi thiệt; nên chỉ tính xếp hạng ở phòng 2 và 4 người.
3.6. Biến thể (config.colorsPerPlayer = 2) cho phép 2 người mỗi người cầm 2 màu đối diện — không bật mặc định.

══════════════════════════════════════════
PHẦN 4 — GIEO XÚC XẮC
══════════════════════════════════════════
4.1. Chỉ server gieo, qua rng. Client gửi action ROLL không kèm dữ liệu. Mọi ROLL có kèm trường giá trị đều bị từ chối cứng.
4.2. Chế độ 1 XÚC XẮC (mặc định): sinh r ∈ {1..6} đều nhau.
4.3. Chế độ 2 XÚC XẮC: sinh (a, b), mỗi viên 1..6 độc lập. Hai viên được xử lý như HAI NƯỚC ĐI ĐỘC LẬP, thực hiện lần lượt theo thứ tự người chơi tự chọn, có thể dùng cho cùng một quân hoặc hai quân khác nhau. KHÔNG hỗ trợ "cộng tổng đi một nước" như một khái niệm riêng — vì đi a rồi đi b bằng cùng một quân đã tương đương cộng tổng, mà lại tự động xử lý đúng luật cản ở ô trung gian. Đây là cách khử sạch mâu thuẫn "cộng tổng hay chia đôi" giữa các nguồn.
4.4. LƯỢT THÊM: sau khi đã dùng hết xúc xắc của lần gieo (hoặc xác định không có nước nào dùng được), nếu kết quả gieo thoả điều kiện lượt thêm thì người đó được gieo lại trong cùng lượt.
   - 1 xúc xắc: điều kiện là r === 6.
   - 2 xúc xắc: điều kiện là a === b, hoặc {a,b} === {1,6}.
4.5. TRẦN LƯỢT THÊM: tối đa config.maxRollsPerTurn = 3 lần gieo trong một lượt. Đạt trần thì chuyển lượt dù có ra 6. (Quy ước kỹ thuật, không có trong luật dân gian — phải hiển thị cho người chơi.)
4.6. Lượt thêm được cấp KỂ CẢ khi không có nước đi hợp lệ nào. Nếu không, người chơi bị cản sẽ mất tempo một cách vô lý.

══════════════════════════════════════════
PHẦN 5 — RA QUÂN (XUẤT CHUỒNG)
══════════════════════════════════════════
5.1. Điều kiện giá trị:
   - 1 xúc xắc: r ∈ {1, 6}.
   - 2 xúc xắc: chỉ được ra quân khi CẢ CẶP thoả {a,b} = {1,6} hoặc a === b. Khi đó việc ra quân tiêu thụ MỘT viên do người chơi chỉ định, viên còn lại vẫn dùng để đi bình thường. (Điều kiện xét trên cặp, không xét trên từng viên — đây là cách đọc khớp với mọi nguồn phe 2 xúc xắc.)
5.2. Quân ra được đặt tại steps = 0, tức absCell = startCell[seat].
5.3. Ra quân TIÊU THỤ TRỌN viên xúc xắc. Quân mới KHÔNG đi thêm bước nào.
5.4. Nếu ô xuất phát đang có quân CÙNG MÀU: không được ra quân (không chồng quân). Phải dùng xúc xắc cho việc khác hoặc mất lượt.
5.5. Nếu ô xuất phát đang có quân ĐỐI THỦ: ĐÁ nó về chuồng xuất phát của nó, rồi đặt quân mình vào. (Xem ngoại lệ bắt buộc ở 8.4 nếu bật biến thể ô an toàn.)
5.6. Người chơi có quyền chọn: khi tung 1 hoặc 6 mà đang có cả quân trong stable lẫn quân trên bàn, người chơi TỰ CHỌN ra quân mới hay đi quân cũ. Không ép.
5.7. Quân bị đá quay về stable và phải tung lại 1 hoặc 6 mới ra được — mất toàn bộ tiến độ.

══════════════════════════════════════════
PHẦN 6 — DI CHUYỂN QUÂN TRÊN VÒNG ĐUA
══════════════════════════════════════════
6.1. Đi đúng số bước bằng giá trị xúc xắc, không hơn không kém, luôn theo chiều kim đồng hồ. Không có nước lùi.
6.2. Cho quân ở steps = s và giá trị d: target = s + d.
6.3. Nếu target > L + 5 → NƯỚC KHÔNG HỢP LỆ (tung dư). Quân đứng yên, KHÔNG dội ngược. Đây là khác biệt quan trọng với Ludo phương Tây.
6.4. Nếu target ≤ L - 1 → quân dừng trên vòng đua tại absCell = toAbs(seat, target).
6.5. Nếu L ≤ target ≤ L + 5 → quân vào chuồng đích bậc k = target - (L - 1). Xem Phần 9.

══════════════════════════════════════════
PHẦN 7 — LUẬT CẢN (KHÔNG NHẢY QUA QUÂN)
══════════════════════════════════════════
7.1. Khi config.blocking = true (mặc định): quân KHÔNG được đi qua mặt bất kỳ quân nào, kể cả quân CỦA CHÍNH MÌNH.
7.2. Thuật toán kiểm tra: với mọi i từ s+1 đến target - 1 (các ô TRUNG GIAN, không tính ô đích):
   - Nếu i ≤ L-1: gọi c = toAbs(seat, i). Nếu occupancy có c → BỊ CẢN, nước không hợp lệ.
   - Nếu i ≥ L: bậc chuồng k' = i - (L-1). Nếu chuồng đích của chính seat này có quân ở bậc k' → BỊ CẢN.
7.3. Ô ĐÍCH (i = target) xử lý riêng ở Phần 8 và Phần 9, không nằm trong vòng kiểm tra cản.
7.4. Hệ quả quan trọng: với luật cản bật, một quân chỉ có thể đá quân đối thủ khi quân đó là quân ĐẦU TIÊN trong tầm và khoảng cách đúng bằng giá trị xúc xắc. Không bao giờ có chuyện "bay qua đầu 2 quân rồi đá quân thứ 3".
7.5. Nếu config.blocking = false (biến thể kiểu Ludo quốc tế): bỏ toàn bộ kiểm tra ở 7.2, chỉ kiểm tra ô đích. Ghi rõ biến thể này cho người chơi biết trước khi vào phòng.
7.6. Chuồng đích luôn áp dụng luật cản bất kể config.blocking, vì làn một chiều và không thể vượt nhau về mặt vật lý.

══════════════════════════════════════════
PHẦN 8 — ĐÁ QUÂN
══════════════════════════════════════════
8.1. Đá xảy ra KHI VÀ CHỈ KHI quân của bạn DỪNG ĐÚNG trên ô đang có quân đối thủ. Đi quá hay chưa tới đều không tính.
8.2. Quân bị đá trở về CHUỒNG XUẤT PHÁT (stable) của nó, steps = -1, mất toàn bộ tiến độ, phải tung 1 hoặc 6 mới ra lại được. KHÔNG phải đặt lại lên ô xuất phát của nó.
8.3. Không bao giờ đá được quân cùng màu. Ô đích có quân cùng màu → nước không hợp lệ.
8.4. Ô AN TOÀN (config.safeCells, MẶC ĐỊNH RỖNG): nếu bật biến thể "ô xuất phát là ô an toàn" thì quân đứng trên các ô startCell[0..3] không bị đá. NGOẠI LỆ BẮT BUỘC: chủ nhân của ô xuất phát VẪN ĐÁ ĐƯỢC quân đối thủ đang chiếm ô xuất phát CỦA CHÍNH MÌNH khi ra quân. Không có ngoại lệ này thì một quân đối thủ đậu lì sẽ khoá người đó vĩnh viễn và ván treo. Đây là lỗi thiết kế, không phải lựa chọn.
8.5. Quân trong chuồng đích và quân trong chuồng xuất phát AN TOÀN TUYỆT ĐỐI, mọi nguồn đều thống nhất.
8.6. Đá quân KHÔNG cho lượt thêm (config.kickGrantsExtraTurn = false mặc định).
8.7. Một nước chỉ đá được tối đa 1 quân (vì mỗi ô tối đa 1 quân).

══════════════════════════════════════════
PHẦN 9 — CHUỒNG ĐÍCH (VỀ ĐÍCH)
══════════════════════════════════════════
9.1. Chuồng đích có 6 bậc, đánh số 1..6, bậc 6 sâu nhất. Chỉ quân chủ nhân vào được.
9.2. Quân ở steps = s trên vòng đua, tung d: nếu s + d ≥ L thì vào bậc k = s + d - (L - 1).
   Ví dụ L = 56: quân ở cửa chuồng (s = 55) tung 1 → bậc 1; tung 6 → bậc 6. Quân ở s = 52 tung 6 → k = 52+6-55 = 3.
9.3. PHẢI ĐÚNG SỐ: nếu k > 6 (tức s + d > L + 5) thì nước không hợp lệ, quân đứng yên. Không dội ngược, không "về đích gần đúng".
9.4. Quân đã ở trong chuồng bậc k, tung d: đích là bậc k + d, hợp lệ khi k + d ≤ 6 VÀ mọi bậc từ k+1 đến k+d đều trống. Bậc đích có quân của mình → không hợp lệ.
9.5. Quân trong chuồng không bao giờ lùi ra và không bao giờ bị đá.
9.6. BẬC 1 VÀ BẬC 2 KHÔNG TÍNH VÀO ĐIỀU KIỆN THẮNG. Chúng chỉ là bậc đi qua. Một quân đậu ở bậc 2 sẽ chặn đứng các quân sau cho tới khi nó tung được đúng số để tiến sâu hơn — đây là tình huống biên phải test kỹ.
9.7. Bỏ hoàn toàn luật "sập hầm ô số 1 phải chung phạt cả làng" (luật ăn tiền, xem M8).

══════════════════════════════════════════
PHẦN 10 — MẤT LƯỢT VÀ BẾ TẮC
══════════════════════════════════════════
10.1. Sau khi gieo, server TỰ TÍNH toàn bộ tập nước hợp lệ. Nếu rỗng → phát event blocked_no_move, bỏ giá trị xúc xắc đó, xét lượt thêm theo 4.4, rồi chuyển lượt nếu không có lượt thêm.
10.2. Người chơi KHÔNG được phép bỏ lượt tuỳ ý khi vẫn còn nước hợp lệ. Nếu cho phép, người ta sẽ đứng yên chặn cửa chuồng đối thủ vô thời hạn.
10.3. Với 2 xúc xắc: nếu chỉ dùng được một viên, viên còn lại bị bỏ; nếu thứ tự dùng ảnh hưởng tới việc dùng được mấy viên, người chơi tự chọn thứ tự (engine không ép dùng tối đa).
10.4. CHỐNG BẾ TẮC (quy ước kỹ thuật, không có trong nguồn): đếm staleTurns = số lượt liên tiếp mà không quân nào tăng steps và không có cú đá nào. Khi staleTurns > config.maxStaleTurns (mặc định 300) thì kết thúc ván và xếp hạng theo tiến độ (Phần 11). Cần thiết vì kết hợp luật cản + phải đúng số có thể kéo ván rất dài.

══════════════════════════════════════════
PHẦN 11 — THẮNG VÀ XẾP HẠNG
══════════════════════════════════════════
11.1. Một người VỀ ĐÍCH khi cả 4 quân của họ đứng đúng ở bậc 3, 4, 5 và 6 của chuồng đích.
11.2. Vì chuồng là làn một chiều và không chồng quân, điều kiện 11.1 tương đương: cả 4 quân đều ở zone 'home' VÀ bậc nông nhất trong 4 quân là bậc 3.
11.3. Người về đích đầu tiên nhận hạng 1, người thứ hai hạng 2, v.v.
11.4. Ván kết thúc khi chỉ còn ĐÚNG MỘT người chưa về đích (config.endWhenOneRemains = true, mặc định). Người còn lại nhận hạng cuối. Nếu đặt false thì ván kết thúc ngay khi có người hạng 1 — nhanh hơn nhưng không xếp hạng đủ, chỉ nên dùng cho chế độ chơi nhanh.
11.5. Người về đích rồi thì bị bỏ qua trong vòng lượt; quân của họ ở trong chuồng đích nên không còn ảnh hưởng tới vòng đua.
11.6. Người đầu hàng hoặc bị xử bỏ cuộc: quân được NHẤC KHỎI BÀN ngay lập tức (đưa về stable và đánh dấu bất động). Bắt buộc, vì nếu để quân trên vòng đua với luật cản bật thì chúng thành vật cản chết và có thể khoá cứng ván của 3 người còn lại.

══════════════════════════════════════════
PHẦN 12 — GIẢ MÃ THAM CHIẾU
══════════════════════════════════════════
function legalMoves(state, seat, d) {
  const L = state.config.trackLength, out = [];
  const p = state.players.find(x => x.seat === seat);
  const occ = buildOccupancy(state);            // Map<absCell, {seat,horseId}>
  for (const h of p.horses) {
    // --- ra quân ---
    if (h.pos.zone === 'stable') {
      if (!state.config.deployRolls.includes(d)) continue;
      const c = startCell(seat, L);
      const on = occ.get(c);
      if (on && on.seat === seat) continue;                  // chồng quân cùng màu
      if (on && isSafe(state, c) && !isOwnStart(seat, c, L)) continue; // 8.4
      out.push({ kind: 'DEPLOY', horseId: h.id, kick: on ?? null });
      continue;
    }
    // --- đi quân ---
    const s = stepsOf(h);                       // 0..L+5
    const target = s + d;
    if (target > L + 5) continue;               // 6.3 tung dư
    let blocked = false;
    if (state.config.blocking || target >= L) {
      for (let i = s + 1; i < target; i++) {
        if (i <= L - 1) {
          if (state.config.blocking && occ.has(toAbs(seat, i, L))) { blocked = true; break; }
        } else {
          if (homeSlotOccupied(p, i - (L - 1)))  { blocked = true; break; }
        }
      }
    }
    if (blocked) continue;                      // 7.2
    if (target >= L) {                          // vào / đi trong chuồng đích
      const k = target - (L - 1);
      if (k > 6 || homeSlotOccupied(p, k)) continue;
      out.push({ kind: 'MOVE', horseId: h.id, toHomeSlot: k, kick: null });
    } else {
      const c = toAbs(seat, target, L);
      const on = occ.get(c);
      if (on && on.seat === seat) continue;     // 8.3
      if (on && isSafe(state, c)) continue;     // 8.4
      out.push({ kind: 'MOVE', horseId: h.id, toSteps: target, kick: on ?? null });
    }
  }
  return out;
}

Lưu ý giả mã: stepsOf trả -1 cho stable, s cho track, (L-1)+slot cho home. isOwnStart(seat,c,L) đúng khi c === startCell(seat,L) — dùng cho ngoại lệ 8.4. Với 2 xúc xắc, gọi legalMoves riêng cho từng viên chưa dùng.

══════════════════════════════════════════
PHẦN 13 — BẢNG CONFIG ĐẦY ĐỦ (GIÁ TRỊ MẶC ĐỊNH)
══════════════════════════════════════════
trackLength: 56          // chia hết cho 4
diceCount: 1             // 1 hoặc 2
deployRolls: [1, 6]      // chế độ 1 xúc xắc
extraTurnRolls: [6]      // chế độ 1 xúc xắc
maxRollsPerTurn: 3       // quy ước kỹ thuật
blocking: true           // nét đặc trưng cá ngựa VN
safeCells: []            // tắt ô an toàn (xem M4)
kickGrantsExtraTurn: false
homeSlots: 6
winSlots: [3, 4, 5, 6]
endWhenOneRemains: true
autoMoveWhenForced: true // chỉ 1 nước thì server tự đi
moveTimeMs: 15000
reserveMs: 90000
maxStaleTurns: 300
colorsPerPlayer: 1

## Mô hình trạng thái

// ═══ KIỂU CƠ BẢN ═══
type Seat = 0 | 1 | 2 | 3;
type HorseId = 0 | 1 | 2 | 3;          // chỉ số quân TRONG một người chơi
type HomeSlot = 1 | 2 | 3 | 4 | 5 | 6;

type HorsePos =
  | { zone: 'stable' }                        // chưa ra quân, hoặc vừa bị đá về
  | { zone: 'track'; steps: number }          // steps ∈ [0, L-1], TƯƠNG ĐỐI theo chủ
  | { zone: 'home';  slot: HomeSlot };        // trong chuồng đích

interface Horse {
  id: HorseId;
  pos: HorsePos;
  frozen: boolean;      // true khi chủ đã bỏ cuộc — quân bị nhấc khỏi bàn (mục 11.6)
}

// ═══ NGƯỜI CHƠI ═══
interface PlayerState {
  playerId: string;
  seat: Seat;
  color: 'red' | 'yellow' | 'green' | 'purple';
  horses: [Horse, Horse, Horse, Horse];
  finishedRank: number | null;   // 1..4, gán khi 4 quân chiếm đúng bậc 3,4,5,6
  resigned: boolean;
  connected: boolean;
  autoPlay: boolean;             // bot mức Vừa đang đánh thay
  timeoutStrikes: number;        // số lần HẾT GIỜ LIÊN TIẾP, reset khi tự đi
  clockMs: number;               // quỹ giờ dự trữ còn lại (ms)
  botLevel?: 'easy' | 'normal' | 'hard';  // chỉ có ở ghế bot
}

// ═══ CẤU HÌNH (bất biến sau init) ═══
interface Config {
  trackLength: number;        // 56, BẮT BUỘC chia hết cho 4
  diceCount: 1 | 2;           // 1
  deployRolls: number[];      // [1, 6]
  extraTurnRolls: number[];   // [6]
  maxRollsPerTurn: number;    // 3
  blocking: boolean;          // true — không nhảy qua quân, kể cả quân mình
  safeCells: number[];        // [] — absCell được coi là ô an toàn
  kickGrantsExtraTurn: boolean; // false
  homeSlots: number;          // 6
  winSlots: number[];         // [3,4,5,6]
  endWhenOneRemains: boolean; // true
  autoMoveWhenForced: boolean;// true
  moveTimeMs: number;         // 15000 — cho MỖI quyết định (gieo và đi tính riêng)
  reserveMs: number;          // 90000
  maxStaleTurns: number;      // 300
  colorsPerPlayer: 1 | 2;     // 1
}

type Phase = 'awaiting_roll' | 'awaiting_move' | 'finished';

// ═══ XÚC XẮC ĐANG CHỜ DÙNG ═══
interface PendingDie {
  value: number;   // 1..6
  used: boolean;
}

// ═══ STATE TỔNG ═══
interface GameState {
  gameId: string;
  config: Config;                  // đóng băng, không sửa giữa ván
  players: PlayerState[];          // sắp theo seat tăng dần

  turnSeat: Seat;
  phase: Phase;
  pendingDice: PendingDie[];       // KẾT QUẢ ĐÃ GIEO CÒN CHƯA DÙNG — bắt buộc
                                   // nằm trong state để reconnect giữa lượt không
                                   // cho người chơi gieo thêm lần nữa
  rolledThisTurn: number;          // đếm để áp trần maxRollsPerTurn
  lastRoll: number[] | null;       // để client phát hoạt hình xúc xắc

  turnCount: number;
  staleTurns: number;              // số lượt liên tiếp không có tiến độ và không có cú đá
  deadlineAt: number;              // epoch ms, hạn của quyết định hiện tại; tick() so với nó
  finishedOrder: Seat[];           // thứ tự về đích, dùng để gán place

  rollHistory: number[];           // kiểm toán và phát lại; CHỈ gửi phần đã xảy ra
  eventLog: GameEvent[];           // append-only

  // ═══ CHỈ SERVER — view() PHẢI XOÁ TRẮNG ═══
  seed: string | null;             // null trong mọi view cho tới khi finished
  rngCursor: number | null;        // null trong mọi view cho tới khi finished
}

// ═══ SỰ KIỆN (engine trả mảng có thứ tự, client phát lần lượt) ═══
type GameEvent =
  | { t: 'rolled';          seat: Seat; dice: number[] }
  | { t: 'deployed';        seat: Seat; horseId: HorseId; toCell: number }
  | { t: 'moved';           seat: Seat; horseId: HorseId; fromSteps: number; toSteps: number; path: number[] }
  | { t: 'kicked';          bySeat: Seat; victimSeat: Seat; victimHorse: HorseId; lostSteps: number; atCell: number }
  | { t: 'entered_home';    seat: Seat; horseId: HorseId; slot: HomeSlot }
  | { t: 'advanced_home';   seat: Seat; horseId: HorseId; fromSlot: HomeSlot; toSlot: HomeSlot }
  | { t: 'blocked_no_move'; seat: Seat; dice: number[] }
  | { t: 'extra_turn';      seat: Seat; rollIndex: number }
  | { t: 'turn_passed';     fromSeat: Seat; toSeat: Seat }
  | { t: 'player_finished'; seat: Seat; rank: number }
  | { t: 'timeout_auto';    seat: Seat; action: 'roll' | 'move'; strikes: number }
  | { t: 'autoplay_on';     seat: Seat; reason: 'timeout' | 'disconnect' | 'request' }
  | { t: 'player_resigned'; seat: Seat }
  | { t: 'game_over';       reason: 'normal' | 'stale' | 'all_resigned' };

// ═══ GHI CHÚ HIỆN THỰC ═══
// 1. occupancy KHÔNG lưu trong state — dựng lại bằng buildOccupancy(state) sau
//    mỗi nước. Nếu cache thì phải invalidate ở đúng một chỗ.
// 2. path trong event 'moved' là mảng absCell đi qua, để client chạy hoạt hình
//    nhảy từng ô. Engine tính sẵn, client KHÔNG tự suy diễn.
// 3. Cho bot: nén state thành Int8Array(16) với giá trị = steps (-1 = stable),
//    thứ tự seat*4 + horseId. Playout dùng apply/undo trên mảng này, không clone.
// 4. TOÀN BỘ state phải serialize được bằng JSON.stringify (không Map, không Set,
//    không Date) để lưu Redis và phát lại. Occupancy là Map nên mới không lưu.

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `ROLL` | {} — không tham số. Client chỉ xin server gieo, không gửi kết quả. | Bắt buộc: state.phase === 'awaiting_roll'; state.players[state.turnSeat].playerId === playerId; !finished(state); state.rolledThisTurn < config.maxRollsPerTurn. Server gieo bằng rng: với diceCount=1 sinh 1 số 1..6, với diceCount=2 sinh 2 số. Ghi vào pendingDice, tăng rolledThisTurn, đẩy vào rollHistory, phát event 'rolled'. Sau khi gieo, server TỰ TÍNH legalMoves(state, turnSeat, pendingDice). Nếu rỗng: phát 'blocked_no_move', xoá pendingDice, và nếu kết quả gieo nằm trong config.extraTurnRolls và rolledThisTurn < maxRollsPerTurn thì giữ phase='awaiting_roll' (được gieo lại), ngược lại chuyển lượt. Nếu legalMoves có đúng 1 phần tử và config.autoMoveWhenForced thì server tự áp dụng luôn. Ngược lại phase='awaiting_move', đặt deadlineAt = now + moveTimeMs. LỖI nếu client gửi kèm bất kỳ trường 'dice', 'value', 'result' nào — đó là dấu hiệu client cố tự gieo, phải từ chối cứng (mã E_CLIENT_ROLL) và ghi log chống gian lận. |
| `MOVE` | { horseId: 0|1|2|3, dieIndex?: 0|1 } — horseId là chỉ số quân trong 4 quân của chính người chơi. dieIndex chỉ dùng khi config.diceCount === 2, chỉ ra dùng viên nào trong pendingDice; khi diceCount === 1 phải bỏ trống hoặc = 0. | phase === 'awaiting_move'; đúng lượt; pendingDice không rỗng; dieIndex hợp lệ và pendingDice[dieIndex] chưa dùng; horseId trong 0..3. Gọi isLegalMove(state, seat, horseId, d) với d = pendingDice[dieIndex]: (a) quân không ở zone 'stable' (stable phải dùng DEPLOY); (b) target = steps + d <= trackLength + 5, nếu vượt thì LỖI E_OVERSHOOT; (c) nếu config.blocking, mọi ô trung gian i thuộc (steps, target) phải trống theo quy tắc mục 7 của rules, nếu vướng thì LỖI E_BLOCKED; (d) ô đích không được có quân CÙNG MÀU (E_OWN_OCCUPIED); (e) nếu ô đích có quân đối thủ: ô đó không được nằm trong config.safeCells (E_TARGET_SAFE), đích phải nằm trên track chứ không phải trong chuồng đích. Khi hợp lệ: áp dụng, nếu có quân đối thủ ở đích thì đưa nó về zone 'stable' và phát 'kicked' kèm số bước tiến độ nó mất. Xoá viên xúc xắc đã dùng khỏi pendingDice. Nếu pendingDice còn viên và còn nước hợp lệ thì giữ phase='awaiting_move'; nếu hết thì xét extra turn. Reset staleTurns về 0 khi có tiến độ hoặc có cú đá. |
| `DEPLOY` | { horseId: 0|1|2|3, dieIndex?: 0|1 } — ra quân từ chuồng xuất phát lên ô xuất phát của mình. | phase === 'awaiting_move'; đúng lượt; quân horseId phải ở zone 'stable'; giá trị pendingDice[dieIndex] phải thuộc config.deployRolls (mặc định [1,6] khi 1 xúc xắc). Với diceCount=2, điều kiện ra quân xét trên CẢ CẶP đã gieo (cặp {1,6} hoặc đôi a===b) chứ không xét từng viên — xem rules mục 5.2; khi đủ điều kiện thì hành động DEPLOY tiêu thụ một viên do client chỉ định. Ô xuất phát startCell[seat]: nếu đang có quân cùng màu -> E_OWN_OCCUPIED; nếu có quân đối thủ và ô không safe -> đá nó về stable; nếu có quân đối thủ và config.safeCells chứa startCell thì áp dụng NGOẠI LỆ BẮT BUỘC ở rules mục 8.4 (chủ nhà vẫn được đá trên ô xuất phát của chính mình) để tránh khoá vĩnh viễn. Quân mới đặt tại { zone:'track', steps: 0 } và KHÔNG đi thêm d bước (giá trị xúc xắc bị tiêu thụ hoàn toàn bởi nước ra quân). |
| `PASS` | {} — bỏ lượt, chỉ dùng để client xác nhận khi bế tắc. | phase === 'awaiting_move' hoặc 'awaiting_roll'; đúng lượt; legalMoves(state, seat, pendingDice) phải RỖNG. Nếu còn nước hợp lệ -> LỖI E_MOVE_AVAILABLE (không cho bỏ lượt tuỳ ý, tránh câu giờ và tránh chiến thuật đứng yên chặn cửa vô hạn). Thực chất server đã tự chuyển lượt ở ROLL; action này chỉ tồn tại để client cũ hoặc client mất gói có thể đồng bộ lại, và phải idempotent. |
| `RESIGN` | {} — bỏ cuộc / rời phòng. | !finished(state); playerId là một người chơi trong ván (KHÔNG cần đúng lượt). Đặt player.finishedRank = null, player.resigned = true, đưa toàn bộ 4 quân của người đó ra khỏi bàn (về stable và đánh dấu bất động) để không làm vật cản chết cho 3 người còn lại — đây là điểm khác cờ 2 người, bỏ quân lại trên bàn sẽ phá ván. Người bỏ cuộc nhận hạng thấp nhất trong số những người chưa về đích tại thời điểm bỏ. Nếu chỉ còn 1 người chưa về đích thì kết thúc ván. |
| `SET_AUTOPLAY` | { enabled: boolean } — bật/tắt cho bot đánh thay mình. | !finished(state); playerId là người chơi trong ván. Đặt player.autoPlay = enabled và reset player.timeoutStrikes = 0 khi tắt. Khi enabled và tới lượt người đó, tick() hoặc vòng lặp phòng sẽ tự sinh ROLL/MOVE bằng bot mức Vừa. Server cũng tự bật cờ này khi timeoutStrikes >= 3 hoặc mất kết nối > 60s; người chơi quay lại có thể tự tắt. |

## Kết thúc ván

ĐIỀU KIỆN VỀ ĐÍCH CỦA MỘT NGƯỜI
Một người chơi hoàn thành khi cả 4 quân của họ đứng đúng ở bậc 3, 4, 5, 6 trong chuồng đích. Do chuồng là làn một chiều và không cho chồng quân, điều kiện này tương đương với: cả 4 quân đều ở zone 'home' và bậc nông nhất là bậc 3. Bậc 1 và bậc 2 chỉ là bậc đi qua, quân đậu ở đó KHÔNG tính là về đích và còn chặn các quân sau.

ĐIỀU KIỆN KẾT THÚC VÁN — finished(state) trả true khi một trong bốn:
 A. Số người chưa về đích và chưa bỏ cuộc còn ≤ 1 (mặc định, config.endWhenOneRemains = true).
 B. Có người về đích đầu tiên, NẾU config.endWhenOneRemains = false (chế độ chơi nhanh).
 C. staleTurns > config.maxStaleTurns — chống bế tắc, kết thúc và xếp hạng theo tiến độ.
 D. Số người chưa bỏ cuộc còn ≤ 1.

XẾP HẠNG (place) — thuật toán theo đúng thứ tự này:
 1. Những người đã về đích: xếp theo finishedOrder, nhận place = 1, 2, 3 ... theo thứ tự hoàn thành.
 2. Những người CHƯA về đích và KHÔNG bỏ cuộc: xếp tiếp sau, sắp giảm dần theo progress. Đồng progress thì ưu tiên người có ÍT quân trong stable hơn; vẫn hoà thì ưu tiên seat nhỏ hơn (để kết quả tất định, phát lại giống hệt).
 3. Những người ĐÃ BỎ CUỘC: luôn xếp sau tất cả những người còn chơi, theo thứ tự bỏ cuộc muộn hơn thì hạng cao hơn.
 4. place là số nguyên liên tục 1..N, không có đồng hạng.

ĐỊNH NGHĨA progress
 progress(player) = Σ stepsOf(h) trên 4 quân, với stepsOf: stable = 0 (KHÔNG phải -1 khi tính điểm), track = steps, home bậc k = (L-1) + k.
 maxProgress = 4 * (L + 5). Với L = 56 thì maxProgress = 244.

ĐIỂM (score) — thang thiết kế sao cho mọi người về đích luôn hơn mọi người chưa về đích:
 - Người đã về đích: score = 1000 - 100 * (place - 1). Tức hạng 1 = 1000, hạng 2 = 900, hạng 3 = 800.
 - Người chưa về đích (kể cả kết thúc do bế tắc): score = round(700 * progress / maxProgress), nằm trong [0, 700].
 - Người bỏ cuộc: score = round(350 * progress / maxProgress), tức bị chia đôi, nằm trong [0, 350]. Phạt này cần thiết để người ta không bỏ ván khi thấy sắp thua trong phòng xếp hạng.

KHÔNG CÓ HOÀ. Kể cả khi kết thúc do bế tắc, quy tắc phá hoà ở bước 2 (progress → số quân trong stable → seat) luôn cho ra thứ tự duy nhất. Điều này là cố ý: hệ thống ghép cặp và tính elo của nền tảng cần một thứ tự chặt.

results(state) trả về mảng [{ playerId, place, score }] sắp theo place tăng dần, và phải TẤT ĐỊNH: gọi hai lần trên cùng một state phải cho kết quả giống hệt nhau, không phụ thuộc thứ tự duyệt object hay Math.random.

## Che thông tin ẩn

Không có thông tin ẩn giữa người chơi. Cá ngựa là trò thông tin hoàn hảo về mặt thế cờ: vị trí 16 quân, số quân trong chuồng, kết quả xúc xắc vừa gieo — tất cả đều công khai cho cả 4 người chơi và cho người xem. `view(state, viewerId)` KHÔNG cần che gì về thế cờ, kể cả với khán giả.

NHƯNG phải che ba thứ liên quan tới ngẫu nhiên, và đây mới là chỗ dễ làm lộ:

1. TRẠNG THÁI NỘI BỘ CỦA rng. Tuyệt đối không serialize `state.seed`, con trỏ/bộ đếm của rng, hay bất kỳ trường nào cho phép suy ra chuỗi ngẫu nhiên tiếp theo. Nếu client biết seed và thuật toán PRNG thì nó tính được toàn bộ xúc xắc còn lại của ván và game hỏng hoàn toàn. `view()` phải xoá trắng các trường này (đặt `seed: null`, `rngState: null`) cho MỌI viewer kể cả người chơi, và chỉ đính kèm seed vào gói kết quả SAU khi `finished(state) === true` để phục vụ phát lại và kiểm toán công bằng.

2. KHÔNG ĐƯỢC GIEO TRƯỚC. Cấm thiết kế kiểu "sinh sẵn mảng 500 kết quả xúc xắc lúc init rồi lấy dần" — mảng đó nằm trong state và sẽ rò ra ngoài qua bất kỳ chỗ log, snapshot, hay bug serialize nào. Chỉ gọi `rng()` đúng tại thời điểm xử lý action ROLL.

3. GIÁ TRỊ XÚC XẮC PHẢI ĐI CÙNG KẾT QUẢ, KHÔNG ĐI TRƯỚC HOẠT HÌNH. Server trả kết quả gieo ngay trong response của ROLL; client chỉ được phát hoạt hình lăn xúc xắc rồi dừng đúng mặt server đã trả. Không có API nào kiểu "xin trước để chạy animation". Nếu client gửi ROLL kèm trường `dice`/`value`/`result`, engine phải từ chối cứng và ghi log chống gian lận, vì đó là dấu hiệu client đã bị sửa.

Ngoài ra, một dạng rò rỉ tinh vi cần chặn: tập nước hợp lệ (`legalMoves`) chỉ được tính và gửi cho NGƯỜI ĐANG TỚI LƯỢT. Gửi legalMoves của người khác thì không lộ thông tin ẩn nhưng cho phép client dựng bot phân tích hộ, và quan trọng hơn là làm lộ ý định nếu sau này thêm biến thể có thông tin ẩn (ví dụ thẻ bài may mắn). Cứ giới hạn từ đầu cho rẻ.

## Tính giờ

MÔ HÌNH ĐỒNG HỒ — hai tầng, hợp với game may rủi 4 người (không dùng kiểu cờ vua Fischer vì ở đây phần lớn nước đi là hiển nhiên):

 1. ĐỒNG HỒ TỪNG QUYẾT ĐỊNH: config.moveTimeMs = 15000 ms. Quan trọng: gieo xúc xắc và chọn quân là HAI quyết định riêng, mỗi cái 15s. Một lượt có lượt thêm có thể gồm tới 3 lần gieo + 3 lần chọn quân = 6 quyết định, nhưng thực tế người chơi bấm rất nhanh.
 2. QUỸ DỰ TRỮ: config.reserveMs = 90000 ms cho cả ván mỗi người. Khi một quyết định vượt quá 15s, phần vượt bị trừ dần vào quỹ dự trữ. Quỹ không hồi lại.
 3. state.deadlineAt = thời điểm bắt đầu quyết định + min(moveTimeMs + clockMs_còn_lại, moveTimeMs + clockMs). Client hiện đồng hồ đếm ngược và cảnh báo ở mốc 5s.

HẾT GIỜ THÌ LÀM GÌ — KHÔNG XỬ THUA. Đây là quyết định thiết kế quan trọng: xử thua một người trong ván 4 người sẽ phá hỏng ván của 3 người còn lại (quân biến mất, cân bằng lệch, người còn lại mất hứng). Thay vào đó:
 - phase = 'awaiting_roll' mà hết giờ → server tự gieo (đúng qua rng như bình thường), phát event timeout_auto với action 'roll'.
 - phase = 'awaiting_move' mà hết giờ → server tự chọn nước bằng bot mức DỄ (không phải mức Khó — người vắng mặt không nên được chơi hộ giỏi hơn), phát timeout_auto với action 'move'.
 - Mỗi lần hết giờ tăng player.timeoutStrikes. Người đó tự thao tác một lần thì reset về 0.
 - timeoutStrikes >= 3 LIÊN TIẾP → bật player.autoPlay = true, từ đó bot mức VỪA đánh thay tới hết ván. UI phải hiện rõ biểu tượng bot trên khung tên để 3 người kia biết.
 - Mất kết nối > 60s cũng bật autoPlay. Người chơi quay lại có thể gửi SET_AUTOPLAY{enabled:false} để lấy lại quyền điều khiển ngay lập tức.
 - Người chơi chủ động RESIGN thì theo mục 11.6 của rules: nhấc quân khỏi bàn ngay.

VAI TRÒ CỦA tick() — ĐỌC KỸ CHỖ NÀY
Tôi khai báo realtime = false vì trạng thái ván KHÔNG tự tiến triển theo thời gian: không có quân nào tự di chuyển, không có bộ đếm nào chạy trong logic game. Ván chỉ đổi khi có action.
NHƯNG ĐỒNG HỒ THÌ CẦN tick(). Nền tảng BẮT BUỘC phải hẹn giờ đánh thức phòng tại đúng state.deadlineAt và gọi tick(state, now, rng) khi đó. Nếu bạn đọc realtime = false rồi bỏ hẳn vòng tick, đồng hồ sẽ không bao giờ kích hoạt và một người rớt mạng sẽ treo phòng vĩnh viễn. Cách đúng là hẹn giờ theo sự kiện (setTimeout tới deadlineAt, huỷ và đặt lại mỗi khi có action), KHÔNG cần vòng lặp tick 60Hz.

HỢP ĐỒNG CỦA tick(state, now, rng):
 - Nếu state.phase === 'finished' hoặc now < state.deadlineAt → trả về state NGUYÊN VẸN (cùng tham chiếu hoặc bản sao bằng giá trị), không sinh event.
 - Nếu now >= state.deadlineAt → thực hiện đúng MỘT hành động tự động (auto-roll hoặc auto-move), trừ giờ vào clockMs, cập nhật deadlineAt mới, trả state mới kèm event.
 - Nếu người đang tới lượt có autoPlay = true → tick cũng là chỗ bot đi, nhưng phải tôn trọng độ trễ giả tối thiểu 600ms để 3 người kia kịp nhìn.
 - PHẢI IDEMPOTENT VÀ ĐƠN ĐIỆU: gọi tick hai lần với cùng now chỉ được sinh một hành động (kiểm tra bằng cách so deadlineAt đã dịch chưa); gọi với now lùi về quá khứ phải là no-op. Nếu server bị nghẽn và tick tới muộn 3 giây, tick chỉ thực hiện một hành động rồi đặt deadline mới từ now — KHÔNG được "trả nợ" nhiều hành động một lúc, vì như thế người chơi vừa reconnect sẽ thấy 4 nước bay qua trong một frame.

CHỐNG KÉO DÀI VÁN: ngoài đồng hồ, còn staleTurns (mục 10.4 của rules). Hai cơ chế này độc lập: đồng hồ chống người chơi câu giờ, staleTurns chống thế cờ tự nó không tiến triển.

THAM SỐ THEO CHẾ ĐỘ PHÒNG:
 - Phòng thường: moveTimeMs 15s, reserveMs 90s.
 - Phòng nhanh: moveTimeMs 8s, reserveMs 30s, và bật endWhenOneRemains = false.
 - Phòng xếp hạng: moveTimeMs 20s, reserveMs 120s, tắt autoPlay tự động ở 3 strikes mà nâng lên 5 strikes (giảm oan cho người mạng chập chờn).

## Bot

MINIMAX KHÔNG PHẢI CÔNG CỤ ĐÚNG Ở ĐÂY — nói thẳng. Cá ngựa là trò 4 người có nút ngẫu nhiên (chance node) và có lượt thêm. Expectiminimax đầy đủ 4 người: mỗi nút chance 6 nhánh (1 xúc xắc), mỗi nút quyết định 2–8 nhánh, một "vòng" là 4 ply nên chỉ nhìn trước 1 vòng đã là (6x8)^4 ≈ 5.3 triệu lá, chưa kể chuỗi lượt thêm khi ra 6 làm cây phình vô hạn cục bộ. Không đáng và không cần: yếu tố may rủi lấn át, nhìn sâu 3 vòng gần như không tăng tỉ lệ thắng. Thay bằng lượng giá 1 ply + mô phỏng Monte Carlo phẳng.

HÀM LƯỢNG GIÁ eval(state, seat) — tính trên state SAU nước đi, đơn vị "bước tương đương":
  1. advance = Σ steps của 4 quân, hệ số 1.0. (steps = số bước đã đi, quân trong chuồng bậc k có steps = L-1+k)
  2. deployed = số quân đã ra khỏi chuồng xuất phát, hệ số +18 mỗi quân. BẮT BUỘC phải có và phải đủ lớn, nếu không bot sẽ luôn đẩy quân cũ thay vì ra quân mới khi tung 1/6 — mọi nguồn chiến thuật tiếng Việt đều nói ra đủ 4 quân sớm là ưu tiên số một.
  3. homeBonus = +25 mỗi quân đã vào chuồng đích, cộng thêm +6 x (bậc) để bot thích bậc sâu.
  4. homeLaneFit = −40 nếu có quân đậu ở bậc 1 hoặc bậc 2 trong khi còn bậc 3–6 trống. Thiếu số hạng này bot sẽ tự khoá chuồng của chính nó và không bao giờ về đích được.
  5. kickRisk = − Σ (p_bị_đá(quân i) x steps_i x 1.2). Tính p rẻ: với mỗi quân đối thủ đứng cách quân i đúng d ô (1 ≤ d ≤ 6, theo chiều đi chung, và đường đi không bị cản) thì đối thủ đó đá được nếu tung ra d. Gom các d khác nhau của cùng một đối thủ thành tập D, p_đối_thủ = |D|/6, rồi p_tổng = 1 − Π(1 − p_đối_thủ). Nhân thêm 7/6 để tính lượt gieo lại khi ra 6. Đây là số hạng quan trọng thứ hai sau advance.
  6. kickGain = nếu nước này đá được: +15 + steps_của_nạn_nhân x 1.0, nhân hệ số 1.5 nếu nạn nhân là người đang dẫn đầu. Không có hệ số này bot sẽ đá con gần nhất thay vì con nguy hiểm nhất.
  7. blockValue = +8 mỗi quân của mình đứng trong 6 ô ngay trước cửa chuồng của một đối thủ (chỉ có ý nghĩa khi config.blocking = true).
  8. clusterPenalty = −5 cho mỗi cặp quân của mình đứng cách nhau ≤ 3 ô trong vùng có đối thủ phía sau (dễ bị đá dây chuyền).
  9. leaderAwareness (chỉ 4 người): trừ 0.35 x (advance của người dẫn đầu khác mình). Biến bot từ "chạy đua với chính mình" thành "biết cản người dẫn".

BA MỨC KHÓ:
  DỄ — chọn ngẫu nhiên đều trong tập nước hợp lệ, nhưng lọc bỏ hai loại nước tự sát hiển nhiên: nước đưa quân vào đúng tầm 1–3 ô trước mũi một quân đối thủ khi có lựa chọn khác, và nước đẩy quân vào bậc chuồng 1/2 khi bậc sâu còn trống. Thực tế: 70% ngẫu nhiên thuần, 30% chọn nước có eval cao nhất. Thêm độ trễ giả 500–1100ms để không bấm nhanh như máy. Chi phí < 1ms.
  VỪA — greedy 1 ply: liệt kê mọi nước hợp lệ, áp dụng, chấm eval đầy đủ (gồm cả kickRisk tính sau nước đi), chọn cao nhất, hoà thì bốc thăm. Khi diceCount = 2 thì duyệt cả hai thứ tự dùng xúc xắc và chọn chuỗi 2 nước tốt nhất. Chi phí thực đo khoảng 1–4ms. Đây là mức mặc định cho bot đánh thay người mất kết nối.
  KHÓ — Monte Carlo phẳng có ngân sách thời gian. Với mỗi nước hợp lệ ở gốc (tối đa 8, sau khi khử trùng lặp bằng transposition key), chạy N ván mô phỏng tới hết bằng chính sách playout = mức VỪA rút gọn (chỉ dùng số hạng 1,2,3,4 của eval, bỏ kickRisk cho nhanh). Điểm của một playout = 1.0 nếu mình về nhất, 0.55 nhì, 0.25 ba, 0.0 bét, và nếu playout chạm trần lượt thì cho điểm nội suy theo tiến độ. Chọn nước có điểm trung bình cao nhất. Ngân sách CỨNG 600ms: kiểm tra Date.now() mỗi 32 playout, dừng ngay khi hết giờ và trả nước tốt nhất đang có; N thực tế đạt được khoảng 400–1200 playout tuỳ giai đoạn ván. Cộng thêm một luật cứng đè lên kết quả MC: nếu có nước đá được quân của người đang dẫn đầu và quân đó đã đi hơn 60% vòng thì luôn chọn nước đó. Nếu server yếu, hạ ngân sách xuống 250ms hoặc rơi về mức VỪA — bot vẫn chơi ổn vì may rủi lấn át.

HIỆN THỰC: viết apply/undo trên một Int8Array 16 phần tử (4 người x 4 quân, giá trị = steps, −1 = trong chuồng xuất phát) thay vì structuredClone; toàn bộ playout không cấp phát đối tượng mới. Với cách này một playout tới hết ván tốn khoảng 0.3–0.6ms.

### Chỗ bot dễ hỏng

1. DÙNG NHẦM rng CỦA SERVER TRONG PLAYOUT — lỗi nặng nhất và dễ mắc nhất. Bot mức Khó gieo hàng chục nghìn lần trong mô phỏng; nếu nó gọi cùng đối tượng rng mà engine dùng cho ván thật thì chuỗi ngẫu nhiên của ván bị tiêu thụ, ván không phát lại được, và tệ hơn là số quân bot mô phỏng ảnh hưởng tới xúc xắc người chơi nhận được — vừa sai vừa trông như gian lận. Bot PHẢI tự tạo PRNG riêng (xorshift32 seed từ hash của state) và engine nên truyền rng vào bot dưới dạng chỉ-đọc hoặc không truyền gì cả.

2. PLAYOUT KHÔNG BAO GIỜ KẾT THÚC. Với luật cản bật và luật vào chuồng phải đúng số, một thế cờ có thể quay vòng rất lâu; chính sách playout ngẫu nhiên còn tệ hơn vì nó hay đẩy quân vào bậc chuồng 1/2 rồi kẹt. Bắt buộc có trần cứng maxPlayoutTurns (đề xuất 600 lượt) và chấm điểm nội suy theo tiến độ khi chạm trần. Không có trần này bot sẽ treo server.

3. BOT KHÔNG CHỊU RA QUÂN. Nếu eval chỉ tối đa hoá tổng steps thì tung được 1 hoặc 6 bot sẽ luôn đẩy con đã ra thêm 1 hoặc 6 bước thay vì ra con mới, vì ra quân cho steps = 0. Kết quả là bot chơi cả ván với 1–2 con và thua sạch. Phải có thưởng deployed đủ lớn (>= 18 bước tương đương).

4. BOT TỰ KHOÁ CHUỒNG CỦA CHÍNH NÓ. Đưa quân vào bậc 1 hoặc bậc 2 là hợp lệ nhưng không tính thắng, và vì chuồng một chiều không vượt nhau nên một quân đậu ở bậc 2 chặn đứng mọi quân sau. Bot tham lam sẽ làm việc này suốt vì bậc chuồng cho homeBonus. Phải có phạt homeLaneFit, và ở tàn cuộc nên chuyển sang lượng giá chuyên biệt: ưu tiên tuyệt đối đưa quân xa nhất vào bậc SÂU NHẤT còn trống.

5. BOT ĐÁ BỪA. Cú đá gần nhất thường là cú đá rẻ nhất về giá trị. Phải cân giá trị cú đá theo tiến độ của nạn nhân và theo việc nạn nhân có đang dẫn đầu không. Trong ván 4 người, đá người đang bét là hành động có hại cho chính bot vì nó chỉ giúp người dẫn đầu.

6. BỎ QUÊN NGUY CƠ BỊ ĐÁ SAU NƯỚC ĐI. Lượng giá phải chấm trên thế cờ SAU nước đi, không phải trước. Rất nhiều bản cài đặt tính kickRisk trên state hiện tại rồi chọn nước, thành ra bot tự đưa đầu vào tầm 1–6 ô của đối thủ.

7. QUÊN LƯỢT THÊM KHI TUNG 6. Trong mô phỏng, nếu bỏ qua luật gieo lại thì phân phối tiến độ lệch rõ và bot đánh giá sai giá trị của việc đứng ở khoảng cách 6 so với đối thủ. Ngược lại nếu mô phỏng cho gieo lại vô hạn thì có nhánh không dừng — phải áp đúng maxRollsPerTurn.

8. NỔ SỐ NHÁNH KHI diceCount = 2. Với 2 xúc xắc và 2 nước con, số chuỗi là (số quân x 2 thứ tự) bình phương. Phải khử trùng lặp bằng khoá state sau chuỗi (hai thứ tự khác nhau thường ra cùng một thế), nếu không mức Khó sẽ vượt ngân sách 1 giây.

9. CLONE STATE BẰNG structuredClone TRONG VÒNG LẶP. Với 800 playout x 600 lượt là gần nửa triệu lần clone — chắc chắn quá 1 giây và làm GC của Node giật. Dùng Int8Array + apply/undo.

10. BOT ĐÁNH QUÁ NHANH TRÔNG NHƯ MÁY. Mức Dễ tính xong trong 0.2ms; nếu trả ngay lập tức người chơi thấy khó chịu và nghi bot biết trước xúc xắc. Thêm độ trễ giả ngẫu nhiên 500–1100ms ở tầng phòng, KHÔNG phải trong engine.

11. BOT ĐÁNH THAY NGƯỜI MẤT KẾT NỐI PHẢI DÙNG MỨC VỪA, KHÔNG PHẢI MỨC KHÓ. Dùng mức Khó là bot chơi hay hơn hẳn người vừa rớt mạng, gây cảm giác bất công cho 3 người còn lại. Dùng mức Dễ thì người rớt mạng bị thiệt. Mức Vừa là lựa chọn duy nhất chấp nhận được, và UI phải hiện rõ biểu tượng bot trên khung tên người đó.

12. KHÔNG CÓ NƯỚC HỢP LỆ NHƯNG BOT VẪN TRẢ VỀ MỘT NƯỚC. Trạng thái bế tắc (tất cả quân bị cản, hoặc tung dư không vào chuồng được) xảy ra thường xuyên trong cá ngựa hơn người ta tưởng. Bot phải trả về null và tầng phòng phải xử lý là bỏ lượt, chứ không được trả nước bất kỳ rồi để engine ném lỗi.

## Cạm bẫy khi cài đặt

- ĐỘ DÀI VÒNG ĐUA KHÔNG PHẢI HẰNG SỐ PHỔ QUÁT. Nhiều nguồn tiếng Việt nói thẳng là số ô vòng ngoài khác nhau giữa các bộ cờ và khuyên người chơi tự đếm trên bàn của mình. Đừng hard-code 56 rải rác trong code; đặt trackLength vào config, bắt buộc chia hết cho 4, và viết test với ít nhất hai giá trị (48 và 56) để lộ ra mọi chỗ bạn lỡ giả định.
- QUÂN BỊ ĐÁ VỀ CHUỒNG XUẤT PHÁT, KHÔNG PHẢI VỀ Ô XUẤT PHÁT. Nhiều nguồn viết tắt là 'về vị trí xuất phát' khiến người cài đặt tưởng quân được đặt lại lên ô số 0 của mình. Sai. Quân bị đá trở lại trạng thái chưa ra quân và phải tung lại 1 hoặc 6 mới ra được. Hai cách hiểu này làm lệch hoàn toàn độ khốc liệt của game.
- Ô SỐ 1 VÀ SỐ 2 TRONG CHUỒNG LÀ BẪY CHẾT. Điều kiện thắng là 4 quân xếp đúng bậc 3-4-5-6, tức là bậc 1 và 2 chỉ để đi qua. Vì chuồng một chiều và không vượt nhau, một quân đậu ở bậc 2 chặn đứng ba quân còn lại vĩnh viễn cho tới khi nó tung được đúng số để tiến. Phải test riêng thế cờ 4 quân ở bậc 1-2-3-4 và xác nhận engine vẫn cho nó thoát ra được.
- VÀO CHUỒNG PHẢI ĐÚNG SỐ, TUNG DƯ LÀ ĐỨNG YÊN, KHÔNG PHẢI DỘI NGƯỢC. Một số game Ludo phương Tây cho quân dội ngược lại khi tung dư. Cá ngựa Việt Nam thì không: tung dư thì quân đó không đi được, phải chọn quân khác hoặc mất lượt. Cài nhầm luật dội ngược là sai luật nặng và người chơi sẽ phát hiện ngay.
- LUẬT CẢN ÁP DỤNG CHO CẢ QUÂN CỦA CHÍNH MÌNH. Đây là điểm dễ sai nhất. Nguồn tiếng Việt nói rõ: quân bị cản là khi có quân khác 'của mình hoặc của đối phương' đứng chắn phía trước ở khoảng cách nhỏ hơn kết quả xúc xắc. Nếu bạn chỉ chặn bởi quân đối thủ thì người chơi sẽ tự xếp hàng 4 quân liền nhau và chạy thoải mái — phá vỡ hoàn toàn cân bằng.
- NẾU BẬT Ô AN TOÀN LÀ Ô XUẤT PHÁT THÌ BẮT BUỘC PHẢI CÓ NGOẠI LỆ CHO CHỦ NHÀ. Một quân đối thủ đậu lì trên ô xuất phát của bạn mà không đá được nghĩa là bạn không bao giờ ra quân được nữa — khoá vĩnh viễn, ván treo. Luôn cho chủ ô xuất phát đá quân đối thủ đang chiếm ô đó khi ra quân. Mặc định của spec này là tắt hẳn ô an toàn để né bẫy, nhưng nếu ai đó bật biến thể thì ngoại lệ này là bắt buộc, không phải tuỳ chọn.
- LƯỢT THÊM KHÔNG ĐƯỢC PHÉP VÔ HẠN. Luật dân gian nói tung 6 (hoặc cặp đôi với 2 xúc xắc) thì được gieo lại 'cho tới khi ra kết quả khác'. Trên bàn thật điều đó vô hại; trên server thì đó là vòng lặp không chặn trên, có thể kéo dài rất lâu và làm người khác hết kiên nhẫn. Phải có maxRollsPerTurn (đề xuất 3). Đây là quy ước kỹ thuật tôi thêm vào, không có trong nguồn — phải ghi rõ trong luật hiển thị cho người chơi.
- PHẢI PHÂN BIỆT 'KHÔNG CÓ NƯỚC HỢP LỆ' VỚI 'KHÔNG MUỐN ĐI'. Cá ngựa có rất nhiều thế bế tắc thật (bị cản hết, tung dư không vào chuồng được). Server phải tự tính legalMoves và tự chuyển lượt, tuyệt đối không cho client tuỳ ý PASS khi vẫn còn nước — nếu không người chơi sẽ đứng yên chặn cửa chuồng đối thủ vô thời hạn.
- NGƯỜI BỎ CUỘC PHẢI ĐƯỢC NHẤC QUÂN KHỎI BÀN. Khác cờ 2 người, khi một trong 4 người rời phòng mà quân vẫn nằm trên vòng đua thì chúng trở thành vật cản chết vĩnh viễn với luật blocking, và có thể khoá cứng ván đấu của 3 người còn lại. Xoá quân của người bỏ cuộc (hoặc chuyển sang bot đánh thay) — đừng để nguyên.
- VÁN 2 NGƯỜI PHẢI DÙNG GHẾ ĐỐI DIỆN. Xếp 2 người vào ghế 0 và 1 (hai cạnh kề) làm quãng đường đuổi nhau lệch hẳn và một bên bị bất lợi lớn. Phải là ghế 0 và 2. Với 3 người, ghế 0-1-2 là chấp nhận được nhưng ghế 1 bị kẹp giữa và hơi thiệt — nên cân nhắc chỉ mở phòng 2 và 4 người cho xếp hạng.
- CHỈ SỐ Ô TUYỆT ĐỐI VÀ SỐ BƯỚC TƯƠNG ĐỐI RẤT DỄ LẪN. Va chạm và luật cản phải so trên Ô TUYỆT ĐỐI của vòng đua dùng chung; tiến độ, vào chuồng và thắng thua phải tính trên SỐ BƯỚC TƯƠNG ĐỐI của từng người. Trộn hai hệ toạ độ là nguồn bug số một của mọi bản cài Ludo. Đặt tên biến rạch ròi (absCell và steps) và viết hàm toAbs(seat, steps) dùng ở đúng một chỗ.
- TỐC ĐỘ HỘI TỤ TÀN CUỘC VỚI 2 XÚC XẮC RẤT TỆ. Nếu chơi 2 xúc xắc theo kiểu cộng tổng, xác suất tung đúng tổng 2 chỉ là 1/36, mà tàn cuộc cá ngựa toàn cần các bước nhỏ và chính xác. Ván sẽ lê thê một cách khó chịu. Nếu bắt buộc làm chế độ 2 xúc xắc thì phải cho dùng từng viên riêng lẻ như hai nước độc lập, đừng chỉ cho cộng tổng.
- VÁN CÓ THỂ KÉO DÀI BẤT THƯỜNG — PHẢI CÓ CHỐNG BẾ TẮC. Kết hợp luật cản, phải đúng số khi vào chuồng và điều kiện ra quân 1/6 tạo ra những ván rất dài. Cần đếm staleTurns (số lượt liên tiếp không có quân nào tiến và không có cú đá nào) và kết thúc theo tiến độ khi vượt ngưỡng. Nếu không, phòng sẽ treo và tốn tài nguyên server.
- ĐỪNG LÀM LUẬT 'SẬP HẦM Ô SỐ 1 PHẢI CHUNG PHẠT CẢ LÀNG'. Luật này có thật trong cách chơi ăn tiền ở một số nơi, nhưng nó là luật cá cược. Đưa vào nền tảng online là tự rước rủi ro pháp lý về cờ bạc. Giữ bậc 1 chỉ là một bậc bình thường không tính thắng.
- HOẠT HÌNH VÀ STATE PHẢI TÁCH RỜI. Một nước đi có thể sinh chuỗi sự kiện dài (đi qua 6 ô, đá 1 quân, quân đó bay về chuồng, vào bậc chuồng, người chơi về đích, chuyển lượt). Engine phải trả về mảng events có thứ tự để client phát lần lượt, và state trả về phải là state CUỐI. Nếu client tự suy diễn hoạt hình từ chênh lệch state, nó sẽ bỏ sót cú đá và người chơi không hiểu tại sao quân mình biến mất.
- RECONNECT PHẢI KHÔI PHỤC ĐƯỢC GIỮA LƯỢT. Trạng thái 'đã gieo xong, chưa chọn quân' (phase awaiting_move với pendingDice đã có) là trạng thái rất dễ mất khi người chơi rớt mạng đúng lúc đó. pendingDice bắt buộc nằm trong state được lưu, không được để trong biến tạm của tầng phòng, nếu không người chơi vào lại sẽ được gieo thêm một lần nữa.

## Mỹ thuật riêng của game này

HƯỚNG: "Hội chợ Tết – sơn mài và giấy dó". Cố tình KHÔNG dùng vân gỗ tự nhiên (đã dành cho cờ tướng), đá cẩm thạch (cờ vua), gỗ kaya + sỏi slate/vỏ sò (cờ vây), giấy kẻ ô vở học trò (cờ caro), đất nện/tre (ô ăn quan, cờ gánh), hay nhựa bóng hiện đại (cờ tỷ phú). Cá ngựa là game ồn ào, may rủi, gia đình tụ tập — nên chất liệu phải là đồ chơi thủ công rực rỡ chứ không phải cổ vật trang nghiêm.

CHẤT LIỆU: mặt bàn là tấm sơn mài đen ánh nâu (#1B1410) có vệt cẩn vỏ trứng lấm tấm và viền dát vàng lá (#D4A03C) hơi xước, không bóng gương mà mờ satin. Các ô trên vòng đua là những thẻ giấy dó màu kem (#F4E7CE) dán nổi lên mặt sơn mài, mép hơi cong và sờn, có bóng đổ mềm 2px. Đường ray nối các ô vẽ bằng nét bút lông đỏ son mảnh, run tay, không thẳng máy.

BẢNG MÀU 4 NGƯỜI (lấy từ tranh Đông Hồ và giấy điều Tết, độ bão hoà cao nhưng hơi ngả đục để không chói):
- Seat 0 Đỏ son: #C8102E (đậm #8E0A20, nhạt #E8566E)
- Seat 1 Vàng nghệ: #F2A900 (đậm #B87A00, nhạt #FFD36B)
- Seat 2 Xanh cổ vịt: #0F8A8D (đậm #0A5E60, nhạt #4FBFC0)
- Seat 3 Tím cà: #6B3FA0 (đậm #48286E, nhạt #9E7BD0)
Màu nền/trung tính: sơn mài #1B1410, giấy dó #F4E7CE, vàng lá #D4A03C, mực nho #2A211C. Bốn ô xuất phát tô đúng màu chủ, bốn chuồng đích là 6 bậc thang thu nhỏ dần về tâm, bậc 6 sâu nhất có viền vàng lá dày nhất.

QUÂN NGỰA: tượng ngựa gỗ sơn mài kiểu chibi — thân tròn mập, chân ngắn, đầu to, bờm và đuôi vẽ bằng nét xoắn dân gian Đông Hồ màu vàng lá trên nền màu chủ. Nhìn 3/4 từ trên xuống, luôn quay mặt theo hướng đi. Có một chấm sáng specular nhỏ ở trán để trông như đồ sơn mài thật. Không dùng ngựa tả thực, không dùng low-poly 3D.

XÚC XẮC: viên xúc xắc sứ trắng ngà (#FAF3E2), chấm 1 và chấm 4 màu ĐỎ, các chấm còn lại đen — đúng quy ước xúc xắc Việt/Hoa, đây là chi tiết nhận diện quan trọng, đừng dùng xúc xắc casino phương Tây toàn chấm đen. Gieo trong một cái bát sứ men trắng vẽ chỉ lam.

CAMERA & BỐ CỤC: nhìn từ trên xuống nghiêng 12–15 độ, bàn cờ chiếm 82% chiều rộng khung, 4 khung tên người chơi nằm ở 4 góc theo đúng hướng ngồi, mỗi khung là một thẻ giấy điều đỏ có tua rua.

CHUYỂN ĐỘNG: ngựa đi từng ô một bằng cú nhảy cóc hình vòng cung (arc cao 18px, 110ms/ô, ease-out-back nhẹ), mỗi lần chạm đất bung một hạt bụi giấy nhỏ. Cú ĐÁ QUÂN là khoảnh khắc ăn tiền của game: ngựa đá hất nạn nhân bay theo parabol về chuồng trong 600ms, kèm chùm sao vàng kiểu truyện tranh và rung màn hình 4px. Vào được bậc chuồng: pháo giấy kim tuyến bung ra từ bậc đó. Về đích đủ 4 quân: cả bàn nháy vàng lá một nhịp.

ÂM THANH: tiếng xúc xắc lạch cạch trong bát sứ, tiếng móng ngựa gõ gỗ cho mỗi ô, tiếng ngựa hí ngắn khi đá quân, một nhịp trống hội khi ai đó về đích, nhạc nền đàn bầu + trống cơm tiết tấu chậm, có thể tắt.

TYPO: tên người chơi và số bậc chuồng dùng một font serif Việt có chân dày (kiểu chữ biển hiệu cũ), số trên xúc xắc không dùng chữ số mà dùng chấm. Tránh font sans hiện đại — để dành cho cờ tỷ phú.

### Asset tối thiểu

- Mặt bàn sơn mài 4 người: 1 ảnh nền 2048x2048 (PNG hoặc WebP) + phiên bản @0.5x cho mobile; có sẵn lớp alpha riêng cho viền vàng lá để nháy sáng
- Thẻ ô giấy dó: 1 sprite ô trống + 4 sprite ô màu xuất phát (đỏ/vàng/xanh/tím), mỗi cái 96x96
- Bậc chuồng đích: 6 sprite bậc thang x 4 màu = 24 sprite, hoặc 6 sprite xám + tint theo màu chủ (khuyên dùng cách tint để giảm asset)
- Quân ngựa chibi: 4 màu x 4 hướng quay (bắc/đông/nam/tây) = 16 sprite tĩnh 128x128, cộng 1 sprite bóng đổ dùng chung
- Animation ngựa nhảy: sheet 6 frame x 4 màu (dùng chung 1 hướng rồi lật/xoay), 128x128
- Animation ngựa bị đá: sheet 8 frame (thân xoay + chân giơ) x 4 màu
- Xúc xắc sứ: 6 mặt render sẵn 256x256 + sheet lăn 12 frame; chấm 1 và 4 phải đỏ
- Bát sứ gieo xúc xắc: 1 sprite 512x512 + animation rung 4 frame
- Hiệu ứng hạt: bụi giấy (8 frame), chùm sao vàng khi đá (10 frame), pháo kim tuyến vào chuồng (14 frame)
- Khung tên người chơi: 1 sprite thẻ giấy điều có tua rua, 9-slice để co giãn, + 4 biến thể tint màu
- Chỉ báo lượt: vòng nhũ vàng xoay (sprite tròn 256x256, xoay bằng code)
- Chỉ báo nước đi hợp lệ: chấm tròn phát sáng màu chủ + mũi tên cung nét bút lông chỉ đường đi dự kiến
- Icon UI: gieo xúc xắc, bỏ lượt, bật bot đánh thay, đầu hàng, bật/tắt âm — 5 icon nét bút lông 64x64
- Âm thanh: dice_shake.ogg, dice_land.ogg, hoof_step.ogg (4 biến thể pitch), horse_neigh_kick.ogg, home_enter.ogg, victory_drum.ogg, turn_warning_tick.ogg, bgm_dan_bau_loop.ogg
- Ảnh đại diện bot 3 mức: 3 chân dung ngựa chibi đội nón khác nhau (Dễ: nón lá nghiêng, Vừa: khăn xếp, Khó: mũ tướng) 256x256
- Bảng kết quả cuối ván: 1 khung cuốn thư giấy dó + 4 huy hiệu hạng 1-2-3-4
- Ảnh thumbnail game trong sảnh chọn game: 1 ảnh 800x450 lấy cận cảnh 2 con ngựa và viên xúc xắc, phải phân biệt được ngay với thumbnail cờ tướng/cờ vua

## Ước lượng công sức

Trung bình trong nền tảng, nhưng ĐỪNG ước lượng thấp vì nghĩ "nó chỉ là Ludo". Ước lượng thực tế: engine thuần + test luật khoảng 2–2.5 ngày-người; bot 3 mức khoảng 1 ngày-người; quản lý 4 người, lượt thêm, đồng hồ, bot đánh thay, reconnect khoảng 1.5 ngày-người; UI + hoạt hình 4 màu + xúc xắc + hiệu ứng đá quân khoảng 4–5 ngày-người. TỔNG khoảng 8–10 ngày-người.

So sánh tương đối trong đúng bộ game của nền tảng này:
- Cờ caro: ~2 ngày (engine 3 giờ, bot minimax + bảng mẫu 1 ngày). Cá ngựa đắt gấp ~4 lần, gần như toàn bộ chênh lệch nằm ở mỹ thuật và tầng 4 người chứ không phải luật.
- Cờ gánh: ~3 ngày. Cá ngựa đắt gấp ~3 lần.
- Ô ăn quan: ~3.5 ngày. Engine hai game xấp xỉ nhau, nhưng cá ngựa gấp đôi về mỹ thuật và hơn hẳn về hạ tầng nhiều người.
- Cờ up: ~5–6 ngày (có thông tin ẩn, phải làm redaction cẩn thận). Cá ngựa xấp xỉ hoặc nhỉnh hơn chút.
- Cờ tướng / cờ vua: ~14–18 ngày mỗi game (sinh nước đi đúng 100%, chiếu bí, lặp 3 lần, 50 nước, bot cần alpha-beta + bảng khai cuộc + tàn cuộc mới ra hồn). Cá ngựa chỉ bằng ~0.6 lần.
- Cờ vây: ~25–30 ngày (luật ko/superko, chấm điểm lãnh thổ và quân chết cần thoả thuận, bot buộc phải MCTS + mạng nơ-ron mới không bị chê là ngu). Cá ngựa bằng ~0.3 lần.
- Cờ tỷ phú: ~30 ngày (state khổng lồ, đấu giá, giao dịch nhiều bên, thế chấp, thẻ cơ hội, đàm phán bất đồng bộ, bot rất khó làm cho hợp lý). Cá ngựa bằng ~0.3 lần.

BA CHỖ TỐN CÔNG BẤT NGỜ, nói thẳng để đừng vỡ kế hoạch:
(a) Chốt luật tốn nhiều thời gian hơn viết code. Cá ngựa gần như không có luật chuẩn quốc gia; mỗi vùng, mỗi nhà một kiểu. Bạn sẽ mất 0.5–1 ngày chỉ để quyết và viết config, và sẽ còn phải sửa sau khi người chơi phản hồi "nhà tôi không chơi thế".
(b) Đây là game NHIỀU NGƯỜI đầu tiên trong bộ (4 người thay vì 2). Toàn bộ hạ tầng phòng, xếp hạng, xử lý người rớt giữa chừng, bot thay người, chia tiền/điểm cho 4 hạng — nếu nền tảng chưa có sẵn thì chi phí này là chi phí hạ tầng chung, hãy tính riêng chứ đừng đổ hết vào cá ngựa.
(c) Hoạt hình là phần đắt nhất. Khác với cờ tướng/cờ vua chỉ cần trượt quân, cá ngựa sống nhờ cảm giác nhảy từng ô và cú đá quân. Làm qua loa thì game mất hết chất. Nếu phải cắt scope, cắt bot mức Khó trước, đừng cắt hoạt hình đá quân.
