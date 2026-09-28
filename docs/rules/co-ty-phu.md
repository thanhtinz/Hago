# Cờ Tỷ Phú — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-ty-phu`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–4 |
| Thời gian thực | True |
| Có ngẫu nhiên | True |
| Thông tin ẩn | True |
| Độ khó cài đặt | 5/5 |

CỜ TỶ PHÚ (Monopoly bản Việt Nam) — đặc tả luật đầy đủ để cài engine.

Bản dùng làm chuẩn: luật Monopoly quốc tế bản 2008+ (Hasbro), tên ô đổi sang địa danh Việt Nam đúng như các bộ cờ tỷ phú bán ở VN (40 ô: 28 ô tài sản = 22 ô đất + 4 nhà ga + 2 công ty tiện ích, 3 ô Cơ Hội, 3 ô Khí Vận, 4 ô góc, 16 thẻ Cơ Hội, 16 thẻ Khí Vận, 32 nhà, 12 khách sạn). Các "luật rừng" phổ biến ở VN (tiền phạt dồn vào Bãi Đậu Xe, bỏ đấu giá, nhận đúp lương khi dừng đúng ô Xuất Phát) KHÔNG bật mặc định nhưng được đưa vào config vì người chơi VN hay đòi.

════════════════════════════════════════
A. BÀN CỜ — 40 Ô, THỨ TỰ CỐ ĐỊNH
════════════════════════════════════════
Ký hiệu: giá mua | thuê(0 nhà / 1 / 2 / 3 / 4 / khách sạn) | giá 1 nhà | giá trị thế chấp.
Thế chấp luôn = giá mua / 2 (nhà ga 100, tiện ích 75).

0  Xuất Phát (GO) — đi qua hoặc dừng: nhận 200
1  Chợ Nổi Cái Răng      NÂU    60 | 2/10/30/90/160/250     | nhà 50  | TC 30
2  Khí Vận
3  Bến Ninh Kiều         NÂU    60 | 4/20/60/180/320/450    | nhà 50  | TC 30
4  Thuế Thu Nhập — trả 200
5  Ga Hà Nội             NHÀ GA 200 | 25/50/100/200 (theo số ga sở hữu) | TC 100
6  Mũi Cà Mau            LƠ    100 | 6/30/90/270/400/550    | nhà 50  | TC 50
7  Cơ Hội
8  Núi Bà Đen            LƠ    100 | 6/30/90/270/400/550    | nhà 50  | TC 50
9  Biển Vũng Tàu         LƠ    120 | 8/40/100/300/450/600   | nhà 50  | TC 60
10 Trại Giam / Thăm Tù (ô góc, có 2 vùng: "trong tù" và "ghé thăm")
11 Bà Nà Hills           HỒNG  140 | 10/50/150/450/625/750  | nhà 100 | TC 70
12 Nhà Máy Điện          TIỆN ÍCH 150 | 4x hoặc 10x tổng nút xúc xắc | TC 75
13 Phong Nha – Kẻ Bàng   HỒNG  140 | 10/50/150/450/625/750  | nhà 100 | TC 70
14 Cố Đô Huế             HỒNG  160 | 12/60/180/500/700/900  | nhà 100 | TC 80
15 Ga Sài Gòn            NHÀ GA 200 | như trên | TC 100
16 Phố Cổ Hội An         CAM   180 | 14/70/200/550/750/950  | nhà 100 | TC 90
17 Khí Vận
18 Cao Nguyên Mộc Châu   CAM   180 | 14/70/200/550/750/950  | nhà 100 | TC 90
19 Ruộng Bậc Thang Sa Pa CAM   200 | 16/80/220/600/800/1000 | nhà 100 | TC 100
20 Bãi Đậu Xe (mặc định KHÔNG có tác dụng gì)
21 Biển Nha Trang        ĐỎ    220 | 18/90/250/700/875/1050 | nhà 150 | TC 110
22 Cơ Hội
23 Thác Bản Giốc         ĐỎ    220 | 18/90/250/700/875/1050 | nhà 150 | TC 110
24 Hồ Ba Bể              ĐỎ    240 | 20/100/300/750/925/1100| nhà 150 | TC 120
25 Ga Đà Nẵng            NHÀ GA 200 | như trên | TC 100
26 Chợ Bến Thành         VÀNG  260 | 22/110/330/800/975/1150| nhà 150 | TC 130
27 Nhà Thờ Đức Bà        VÀNG  260 | 22/110/330/800/975/1150| nhà 150 | TC 130
28 Nhà Máy Nước          TIỆN ÍCH 150 | 4x/10x | TC 75
29 Dinh Độc Lập          VÀNG  280 | 24/120/360/850/1025/1200| nhà 150| TC 140
30 Vào Tù (Go To Jail) — đi thẳng về ô 10, trạng thái trong tù
31 Hồ Xuân Hương Đà Lạt  LÁ    300 | 26/130/390/900/1100/1275| nhà 200| TC 150
32 Hang Sơn Đoòng        LÁ    300 | 26/130/390/900/1100/1275| nhà 200| TC 150
33 Khí Vận
34 Tháp Rùa – Hồ Gươm    LÁ    320 | 28/150/450/1000/1200/1400| nhà 200| TC 160
35 Ga Hải Phòng          NHÀ GA 200 | như trên | TC 100
36 Cơ Hội
37 Vịnh Hạ Long          CHÀM  350 | 35/175/500/1100/1300/1500| nhà 200| TC 175
38 Thuế Xa Xỉ — trả 100
39 Hoàng Thành Thăng Long CHÀM 400 | 50/200/600/1400/1700/2000| nhà 200| TC 200

Nhóm màu và số ô: NÂU {1,3}, LƠ {6,8,9}, HỒNG {11,13,14}, CAM {16,18,19}, ĐỎ {21,23,24}, VÀNG {26,27,29}, LÁ {31,32,34}, CHÀM {37,39}, NHÀ GA {5,15,25,35}, TIỆN ÍCH {12,28}.

════════════════════════════════════════
B. KHỞI TẠO — init(players, config, rng)
════════════════════════════════════════
1. Mỗi người nhận startCash = 1500 (config).
2. Tất cả quân đứng ô 0, inJail=false.
3. Thứ tự đi: xáo trộn danh sách người chơi bằng rng (Fisher–Yates dùng rng). KHÔNG dùng thứ tự ghế client gửi lên. Có thể render hiệu ứng "đổ xúc xắc chọn người đi đầu" ở client nhưng kết quả phải do server quyết.
4. Xáo bộ Cơ Hội (16 lá) và Khí Vận (16 lá) riêng biệt bằng rng. Mỗi bộ là mảng id lá bài, phần tử [0] là lá trên cùng.
5. bankHouses = 32, bankHotels = 12.
6. Mọi ô tài sản: owner=null, houses=0, mortgaged=false.
7. phase = 'PRE_ROLL', turnIdx = 0, round = 1, freeParkingPot = 0.
8. Đặt turnDeadlineMs = now + cfg.turnMs.

════════════════════════════════════════
C. MÁY TRẠNG THÁI MỘT LƯỢT
════════════════════════════════════════
Phase hợp lệ: PRE_ROLL → (AWAIT_BUY | AUCTION | AWAIT_DEBT | POST_ROLL) → PRE_ROLL của người kế / hoặc PRE_ROLL của chính mình nếu đổ đúp.

PRE_ROLL (người đang tới lượt):
  Được làm không giới hạn số lần, theo thứ tự tuỳ ý: BUILD_HOUSE, SELL_HOUSE, MORTGAGE, UNMORTGAGE, PROPOSE_TRADE.
  Nếu đang trong tù: thêm PAY_JAIL_FINE, USE_JAIL_CARD.
  Kết thúc bằng ROLL_DICE (bắt buộc; hết giờ thì server tự ROLL_DICE).

POST_ROLL (đã giải quyết xong ô đáp):
  Vẫn được BUILD/SELL/MORTGAGE/UNMORTGAGE/TRADE.
  Kết thúc bằng END_TURN. Nếu vừa đổ đúp (và không bị vào tù) thì END_TURN chuyển về PRE_ROLL của CHÍNH người đó, doublesCount đã +1.

AWAIT_BUY: chỉ người đang tới lượt được BUY_PROPERTY / DECLINE_PROPERTY.
AUCTION: người đang tới lượt KHÔNG còn quyền ưu tiên; mọi người chơi chưa phá sản (kể cả người vừa từ chối) đều là người ra giá.
AWAIT_TRADE_REPLY: chỉ người nhận đề nghị được RESPOND_TRADE; người đề nghị được CANCEL_TRADE.
AWAIT_DEBT: chỉ con nợ được hành động (SELL_HOUSE / MORTGAGE / PROPOSE_TRADE / DECLARE_BANKRUPTCY). Không ai khác được đi.

Quy tắc chung: apply() phải từ chối mọi action không thuộc phase hiện tại hoặc không phải chủ thể hợp lệ, trả lỗi có mã (WRONG_PHASE, NOT_YOUR_TURN, ...), KHÔNG được sửa state.

════════════════════════════════════════
D. XÚC XẮC, DI CHUYỂN, ĐỔ ĐÚP
════════════════════════════════════════
1. ROLL_DICE: d1 = rng.int(1,6), d2 = rng.int(1,6). total = d1+d2. isDouble = (d1===d2).
2. NẾU ĐANG TRONG TÙ → xem mục H.
3. NẾU KHÔNG TRONG TÙ:
   a. Nếu isDouble: consecutiveDoubles += 1. Nếu consecutiveDoubles === 3 → đi thẳng vào tù NGAY LẬP TỨC, KHÔNG di chuyển, KHÔNG giải quyết ô nào, KHÔNG nhận 200. Lượt kết thúc. (Đây là lỗi hay gặp: nhiều bản cài sai bằng cách vẫn cho đi rồi mới bắt vào tù.)
   b. Nếu không: pos = (pos + total) % 40. Nếu vòng qua hoặc dừng đúng ô 0 → nhận goSalary = 200 (cộng 1 lần cho mỗi lần vượt qua ô 0; một nước đi tối đa 12 ô nên tối đa 1 lần).
   c. Giải quyết hiệu ứng ô đáp (mục E).
   d. Nếu isDouble và không bị vào tù → sau khi END_TURN, người này đi tiếp (PRE_ROLL, consecutiveDoubles giữ nguyên).
   e. Nếu không đúp → consecutiveDoubles = 0, chuyển lượt.
4. Lưu lastDice = [d1,d2] và diceForUtility = total (dùng cho tiền thuê tiện ích). Khi tới tiện ích bằng thẻ Cơ Hội thì diceForUtility là kết quả GIEO LẠI (mục G).

════════════════════════════════════════
E. HIỆU ỨNG TỪNG LOẠI Ô
════════════════════════════════════════
• Ô 0 Xuất Phát: đã cộng 200 ở bước di chuyển. Dừng đúng ô 0 vẫn chỉ 200 (config doubleGoSalary bật thì 400 — luật nhà VN).
• Ô đất / nhà ga / tiện ích VÔ CHỦ: phase = AWAIT_BUY (mục F).
• Ô có chủ là CHÍNH MÌNH: không làm gì.
• Ô có chủ khác, KHÔNG thế chấp: tự động trừ tiền thuê (mục G). Nếu không đủ tiền mặt → AWAIT_DEBT.
  Chủ đất ĐANG NGỒI TÙ VẪN THU ĐƯỢC TIỀN THUÊ.
• Ô có chủ khác, ĐANG THẾ CHẤP: không trả gì.
• Ô 4 Thuế Thu Nhập: trả 200 (incomeTaxMode='fixed'). Nếu config 'choice' thì người chơi chọn 200 hoặc 10% tổng tài sản (làm tròn xuống), phải chọn TRƯỚC khi biết kết quả tính — thêm action CHOOSE_TAX_MODE.
• Ô 38 Thuế Xa Xỉ: trả 100.
• Ô 10 khi đi tới bình thường: "ghé thăm", không tác dụng.
• Ô 20 Bãi Đậu Xe: mặc định KHÔNG gì cả. Nếu cfg.freeParkingPotEnabled thì nhận toàn bộ freeParkingPot rồi reset về 0 (mọi khoản thuế/phạt trả cho Ngân hàng được cộng vào pot).
• Ô 30 Vào Tù: pos = 10, inJail = true, jailTurns = 0, consecutiveDoubles = 0, KHÔNG nhận 200 dù đi qua ô 0 về mặt hình ảnh. Lượt kết thúc ngay kể cả vừa đổ đúp.
• Ô 2/17/33 Khí Vận, 7/22/36 Cơ Hội: rút lá trên cùng của bộ tương ứng, thi hành ngay, bỏ lá xuống đáy bộ (mục I).

════════════════════════════════════════
F. MUA ĐẤT VÀ ĐẤU GIÁ
════════════════════════════════════════
1. Dừng ở ô tài sản vô chủ → AWAIT_BUY.
2. BUY_PROPERTY: hợp lệ khi cash >= price. Trừ price, owner = playerId. → POST_ROLL.
   Không được thế chấp/bán nhà để gom đủ tiền RỒI mua trong cùng một hành động, nhưng ĐƯỢC làm các hành động đó trước khi bấm mua (chúng hợp lệ trong phase AWAIT_BUY — cho phép MORTGAGE/SELL_HOUSE ngay trong AWAIT_BUY).
3. DECLINE_PROPERTY hoặc hết giờ, hoặc BUY khi không đủ tiền → nếu cfg.auctionOnDecline thì phase = AUCTION; nếu tắt thì ô vẫn vô chủ, → POST_ROLL.
4. ĐẤU GIÁ (English auction, công khai):
   - Người tham gia: tất cả người chơi chưa phá sản, KỂ CẢ người vừa từ chối.
   - highBid khởi đầu = 0, highBidder = null, minIncrement = 10 (config).
   - Lần lượt theo thứ tự ghế bắt đầu từ người đang tới lượt. Mỗi người có auctionStepMs (10s) để AUCTION_BID hoặc AUCTION_PASS. Hết giờ = PASS.
   - AUCTION_BID{amount}: hợp lệ khi amount >= highBid + minIncrement VÀ amount <= cash của người đó (KHÔNG cho thế chấp giữa chừng để đơn giản; nếu muốn cho thì phải cho phép MORTGAGE trong phase AUCTION và tính lại giới hạn — nêu rõ chọn nào trong config raiseFundsDuringAuction).
   - Người đã PASS bị loại khỏi vòng đấu giá đó.
   - Kết thúc khi chỉ còn 1 người chưa PASS và người đó đang giữ highBid, hoặc tất cả đều PASS.
   - Nếu tất cả PASS mà highBidder === null → ô vẫn vô chủ.
   - Người thắng trả đúng highBid cho Ngân hàng, nhận quyền sở hữu.
   - CHỐNG TREO: giới hạn cứng 200 lượt ra giá cho một phiên đấu giá; vượt thì chốt ngay cho highBidder hiện tại.

════════════════════════════════════════
G. TÍNH TIỀN THUÊ — CÔNG THỨC CHÍNH XÁC
════════════════════════════════════════
Cho ô p có chủ o ≠ người đáp, p.mortgaged === false:

(1) Ô ĐẤT (lot):
   - houses === 0:
       base = rent[0]
       Nếu chủ o sở hữu TẤT CẢ các ô cùng nhóm màu → base × 2.
       Quy ước (config mortgagedCountsForSetBonus = true): việc một ô khác trong nhóm đang bị thế chấp KHÔNG phá vỡ điều kiện "sở hữu đủ bộ"; chỉ ô đang bị thế chấp là không thu được tiền của chính nó.
   - houses 1..4: rent[houses]
   - houses === 5 (khách sạn): rent[5]
   - KHÔNG nhân đôi khi đã có nhà.

(2) NHÀ GA: n = số nhà ga mà o sở hữu (tính cả ga đang thế chấp, theo cùng quy ước trên).
   n=1 → 25, n=2 → 50, n=3 → 100, n=4 → 200.

(3) TIỆN ÍCH: k = số tiện ích o sở hữu.
   k=1 → 4 × diceForUtility; k=2 → 10 × diceForUtility.
   diceForUtility = tổng nút của cú đổ đưa người chơi tới đây. Nếu tới bằng thẻ "Tiến đến công ty tiện ích gần nhất" thì phải GIEO LẠI 2 xúc xắc (qua rng) và LUÔN trả 10× bất kể chủ sở hữu 1 hay 2 tiện ích.

(4) Thẻ "Tiến đến nhà ga gần nhất": nếu có chủ → trả GẤP ĐÔI mức của bảng (1) ở trên, tức 50/100/200/400.

(5) Chủ đất đang ngồi tù vẫn thu tiền bình thường.
(6) Engine tự động trừ tiền — không có luật "quên đòi thì mất" như bàn cờ giấy.

════════════════════════════════════════
H. NHÀ TÙ
════════════════════════════════════════
VÀO TÙ khi: (a) dừng ô 30, (b) rút thẻ "Vào tù", (c) đổ đúp 3 lần liên tiếp.
Vào tù: pos=10, inJail=true, jailTurns=0, consecutiveDoubles=0, KHÔNG nhận 200, lượt kết thúc ngay.

Ở trong tù, ĐẦU LƯỢT, người chơi chọn 1 trong 3:
 (A) PAY_JAIL_FINE: trả 50 → inJail=false. Sau đó ROLL_DICE và đi bình thường; đổ đúp ĐƯỢC đi thêm lượt như thường.
 (B) USE_JAIL_CARD: tiêu 1 thẻ "Ra Tù Miễn Phí" (thẻ được trả xuống đáy bộ bài đã rút ra nó) → inJail=false. Sau đó ROLL_DICE bình thường, đúp được đi thêm.
 (C) ROLL_DICE ngay:
     - Nếu ĐÚP: ra tù, di chuyển đúng total đó, giải quyết ô đáp, NHƯNG lượt KẾT THÚC — KHÔNG được đi thêm dù là đúp. consecutiveDoubles = 0.
     - Nếu không đúp: jailTurns += 1.
        · jailTurns < 3 → ở lại tù, lượt kết thúc (không di chuyển).
        · jailTurns === 3 (tức lần gieo hỏng thứ 3) → BẮT BUỘC trả 50 (nếu không đủ tiền mặt → AWAIT_DEBT, có thể phá sản), rồi di chuyển đúng total vừa gieo, giải quyết ô đáp, lượt kết thúc.
Trong tù VẪN được: xây nhà, bán nhà, thế chấp, chuộc, giao dịch, THU tiền thuê.
Có thể giữ nhiều hơn 1 thẻ Ra Tù Miễn Phí (tối đa 2: một của mỗi bộ). Thẻ được đem ra giao dịch.

════════════════════════════════════════
I. BỘ THẺ — 16 CƠ HỘI, 16 KHÍ VẬN
════════════════════════════════════════
Cơ chế bộ bài: rút lá [0], thi hành, đẩy xuống ĐÁY cùng bộ. Riêng thẻ Ra Tù Miễn Phí bị rút khỏi bộ, người chơi giữ; khi dùng (hoặc khi người giữ phá sản về tay Ngân hàng) thì trả xuống ĐÁY bộ gốc. KHÔNG xáo lại giữa ván (trừ khi bộ rỗng vì cả 2 thẻ ra tù đang bị giữ — vẫn còn 15 lá nên không bao giờ rỗng).

CƠ HỘI (16 lá, id CH01..CH16):
CH01 Tiến tới ô Xuất Phát, nhận 200.
CH02 Tiến tới Tháp Rùa – Hồ Gươm (ô 34). Nếu vượt qua ô 0, nhận 200.
CH03 Tiến tới Bà Nà Hills (ô 11). Nếu vượt qua ô 0, nhận 200.
CH04 Tiến tới Hoàng Thành Thăng Long (ô 39). (Từ ô 7/22/36 đều không vượt ô 0 → không nhận 200.)
CH05 Tiến tới NHÀ GA gần nhất. Vô chủ → được mua theo giá niêm yết (từ chối thì đấu giá). Có chủ → trả GẤP ĐÔI tiền thuê nhà ga. Từ ô 7→ga 15, ô 22→ga 25, ô 36→ga 5 (VƯỢT QUA Ô 0, NHẬN 200).
CH06 (bản sao của CH05 — bộ chuẩn có 2 lá này.)
CH07 Tiến tới CÔNG TY TIỆN ÍCH gần nhất. Vô chủ → được mua. Có chủ → gieo lại 2 xúc xắc, trả 10× tổng nút. Từ ô 7→12, ô 22→28, ô 36→12 (VƯỢT QUA Ô 0, NHẬN 200).
CH08 Ngân hàng trả cổ tức: nhận 50.
CH09 Thẻ RA TÙ MIỄN PHÍ — giữ hoặc đem giao dịch.
CH10 Lùi lại 3 ô. (Ô 7→4 Thuế Thu Nhập, trả 200. Ô 22→19 Sa Pa, xử lý như đáp bình thường. Ô 36→33 Khí Vận, PHẢI RÚT TIẾP MỘT THẺ KHÍ VẬN. Lùi qua ô 0 KHÔNG bị trừ 200.)
CH11 Vào tù ngay. Không qua ô Xuất Phát, không nhận 200.
CH12 Sửa chữa toàn bộ bất động sản: trả 25 / mỗi nhà, 100 / mỗi khách sạn đang sở hữu.
CH13 Phạt vượt tốc độ: trả 15.
CH14 Đi Ga Hà Nội (ô 5). Nếu vượt qua ô 0, nhận 200.
CH15 Bạn được bầu làm Chủ tịch HĐQT: trả cho MỖI người chơi khác 50. (Nếu không đủ tiền → AWAIT_DEBT, chủ nợ là từng người theo thứ tự ghế.)
CH16 Khoản vay xây dựng đáo hạn: nhận 150.

KHÍ VẬN (16 lá, id KV01..KV16):
KV01 Tiến tới ô Xuất Phát, nhận 200.
KV02 Ngân hàng nhầm lẫn có lợi cho bạn: nhận 200.
KV03 Phí khám bệnh: trả 50.
KV04 Bán cổ phiếu: nhận 50.
KV05 Thẻ RA TÙ MIỄN PHÍ.
KV06 Vào tù ngay. Không qua ô Xuất Phát, không nhận 200.
KV07 Quỹ nghỉ dưỡng đáo hạn: nhận 100.
KV08 Hoàn thuế thu nhập: nhận 20.
KV09 Sinh nhật bạn: MỖI người chơi khác tặng bạn 10.
KV10 Bảo hiểm nhân thọ đáo hạn: nhận 100.
KV11 Viện phí: trả 100.
KV12 Học phí: trả 50.
KV13 Nhận phí tư vấn: 25.
KV14 Bạn bị đánh giá phí sửa đường: trả 40 / mỗi nhà, 115 / mỗi khách sạn.
KV15 Giải nhì cuộc thi sắc đẹp: nhận 10.
KV16 Bạn được thừa kế: nhận 100.

Lưu ý cài đặt cho thẻ di chuyển: sau khi dời quân theo thẻ, PHẢI chạy lại toàn bộ logic "giải quyết ô đáp" (có thể dẫn tới mua đất, trả thuê, rút thẻ tiếp). Giới hạn đệ quy 5 tầng để chống vòng lặp bệnh lý.

════════════════════════════════════════
J. XÂY NHÀ VÀ KHÁCH SẠN
════════════════════════════════════════
Điều kiện BUILD_HOUSE{pos}:
 1. pos là ô đất (không phải ga/tiện ích).
 2. Người chơi sở hữu TẤT CẢ ô trong nhóm màu.
 3. KHÔNG ô nào trong nhóm đang thế chấp.
 4. LUẬT XÂY ĐỀU: sau khi xây, chênh lệch số nhà giữa mọi ô trong nhóm ≤ 1. Tức chỉ được xây lên ô đang có số nhà NHỎ NHẤT (hoặc bằng nhỏ nhất) trong nhóm.
 5. houses hiện tại < 5.
 6. Nếu houses sẽ thành 1..4: cần bankHouses >= 1 → bankHouses -= 1.
 7. Nếu houses đang là 4 → mua KHÁCH SẠN: cần bankHotels >= 1; trả nhà cũ về kho (bankHouses += 4), bankHotels -= 1, houses = 5.
 8. Trả houseCost của nhóm (50/50/100/100/150/150/200/200 theo nhóm nâu→chàm).
 9. Chỉ 1 khách sạn / ô, không có "nhà chọc trời".
Được xây bất kỳ lúc nào mình đang ở phase PRE_ROLL / POST_ROLL / AWAIT_BUY / AWAIT_DEBT của chính mình. KHÔNG được xây trong lượt người khác (đây là khác biệt so với bàn cờ giấy — nêu rõ để tránh tranh cãi).

KHAN HIẾM NHÀ: tổng nhà trên bàn ≤ 32, khách sạn ≤ 12. Khi bankHouses === 0, không ai xây được nhà mới cho tới khi có người bán nhà về kho. Mặc định cfg.houseShortageAuction = false → ai bấm trước được trước. Bản luật quốc tế yêu cầu Ngân hàng đấu giá số nhà còn lại khi nhiều người muốn mua — nếu bật flag này phải làm một phiên đấu giá con, khá rối, khuyến nghị để tắt ở bản đầu.

BÁN NHÀ — SELL_HOUSE{pos}:
 - Bán lại cho Ngân hàng với giá BẰNG MỘT NỬA giá mua.
 - Phải BÁN ĐỀU: sau khi bán, chênh lệch trong nhóm ≤ 1 (chỉ bán từ ô có số nhà lớn nhất).
 - Bán khách sạn: houses 5 → 4, nhận houseCost/2, cần bankHouses >= 4 (bankHouses -= 4, bankHotels += 1).
   Nếu bankHouses < 4 (gọi k = bankHouses): được phá khách sạn xuống còn k nhà và nhận houseCost/2 + (4−k) × houseCost/2, bankHouses = 0, bankHotels += 1.
 - Bán nhà thường: houses -= 1, nhận houseCost/2, bankHouses += 1.

════════════════════════════════════════
K. THẾ CHẤP VÀ CHUỘC
════════════════════════════════════════
MORTGAGE{pos}:
 - owner === playerId, mortgaged === false.
 - Với ô đất: KHÔNG ô nào trong CẢ NHÓM MÀU còn nhà/khách sạn (phải bán sạch công trình cả nhóm trước).
 - Nhận mortgageValue (= price/2).
 - mortgaged = true. Ô này không thu tiền thuê nữa.
UNMORTGAGE{pos}:
 - Chi phí = mortgageValue + Math.ceil(mortgageValue / 10)  (lãi 10%, làm tròn LÊN).
   Ví dụ: 30 → 33; 100 → 110; 175 → 175 + 18 = 193.
 - Cần đủ tiền mặt. mortgaged = false.
CHUYỂN NHƯỢNG Ô ĐANG THẾ CHẤP (qua giao dịch hoặc phá sản):
 - Người nhận PHẢI trả ngay lãi 10% = Math.ceil(mortgageValue/10) cho Ngân hàng, ô vẫn ở trạng thái thế chấp.
 - Nếu sau đó muốn chuộc thì trả thêm mortgageValue + 10% nữa (tức tổng cộng đã trả 2 lần lãi). Đúng luật Hasbro.
 - Nếu người nhận không đủ tiền trả lãi → chuyển họ vào AWAIT_DEBT với chủ nợ là BANK.
 - Config mortgageTransferInterest = false để tắt quy tắc này nếu muốn đơn giản.

════════════════════════════════════════
L. GIAO DỊCH GIỮA NGƯỜI CHƠI
════════════════════════════════════════
Đơn giản hoá bắt buộc cho server turn-based: CHỈ người đang tới lượt được PROPOSE_TRADE, và chỉ gửi cho MỘT người nhận, tối đa cfg.maxTradeOffersPerTurn = 1 đề nghị mỗi lượt.
 - Nội dung: tiền mặt, danh sách ô tài sản, số thẻ Ra Tù Miễn Phí, cả hai chiều.
 - HỢP LỆ khi: hai bên thực sự sở hữu thứ mình đưa; KHÔNG ô nào trong đề nghị còn nhà/khách sạn trên BẤT KỲ ô nào của nhóm màu chứa nó (phải bán sạch công trình cả nhóm trước); tiền đưa ≤ cash của bên đưa.
 - phase = AWAIT_TRADE_REPLY, hẹn giờ cfg.tradeReplyMs = 20s; hết giờ = từ chối.
 - Chấp nhận → hoán đổi nguyên tử; các ô thế chấp được chuyển sẽ kích hoạt luật lãi ở mục K.
 - Không cho phép giao dịch "nợ tương lai" hay "miễn tiền thuê" — engine không mô hình hoá được.
 - Trong AWAIT_DEBT, con nợ ĐƯỢC phép PROPOSE_TRADE (đây là lối thoát hợp pháp duy nhất ngoài bán/thế chấp).

════════════════════════════════════════
M. NỢ, THANH LÝ, PHÁ SẢN
════════════════════════════════════════
Khi một khoản phải trả (tiền thuê / thuế / phạt / thẻ / lãi) lớn hơn cash:
 1. Trừ hết cash hiện có? KHÔNG — giữ nguyên cash, ghi debt = { debtor, creditor, amount, reason }, phase = AWAIT_DEBT, hẹn giờ cfg.debtMs = 60s.
 2. Con nợ được SELL_HOUSE, MORTGAGE, PROPOSE_TRADE để gom tiền. Mỗi khi cash >= amount, engine TỰ ĐỘNG thanh toán và thoát AWAIT_DEBT.
 3. DECLARE_BANKRUPTCY, hoặc hết giờ, hoặc engine tính ra netLiquidValue < amount (netLiquidValue = cash + Σ houses×houseCost/2 + Σ mortgageValue của ô chưa thế chấp) → PHÁ SẢN.
 4. Xử lý phá sản:
    a. Bán mọi nhà/khách sạn về Ngân hàng với nửa giá (trả nhà về kho).
    b. Nếu chủ nợ là NGƯỜI CHƠI: chuyển toàn bộ cash + toàn bộ thẻ đất (giữ nguyên trạng thái thế chấp) + thẻ Ra Tù Miễn Phí cho chủ nợ. Chủ nợ phải trả ngay lãi 10% cho mỗi ô thế chấp nhận được (mục K); nếu không đủ, chủ nợ vào AWAIT_DEBT với BANK.
    c. Nếu chủ nợ là NGÂN HÀNG: mọi tài sản về Ngân hàng, thẻ Ra Tù Miễn Phí trả xuống đáy bộ, và từng ô được ĐẤU GIÁ ngay lập tức theo thứ tự pos tăng dần (config bankruptcyAuction; tắt thì các ô đơn giản trở về vô chủ, chưa thế chấp).
    d. player.bankrupt = true, thêm vào eliminationOrder.
 5. Nếu người phá sản đang là người tới lượt → chuyển lượt cho người kế tiếp còn sống.

════════════════════════════════════════
N. KẾT THÚC VÁN — finished() / results()
════════════════════════════════════════
finished(state) === true khi:
 (1) Chỉ còn 1 người chưa phá sản, HOẶC
 (2) round > cfg.maxRounds (mặc định 100 vòng), HOẶC
 (3) now − startedAtMs > cfg.maxGameMs (mặc định 60 phút), HOẶC
 (4) Tất cả người còn lại đều RESIGN / rời phòng.

XẾP HẠNG:
 - Trường hợp (1): người sống sót đứng nhất; những người phá sản xếp theo NGƯỢC thứ tự bị loại (bị loại sau cùng thì hạng cao hơn).
 - Trường hợp (2)(3): người còn sống xếp theo TỔNG TÀI SẢN giảm dần; người đã phá sản xếp sau, theo ngược thứ tự bị loại.
 - TỔNG TÀI SẢN (net worth) = cash
     + Σ (ô chưa thế chấp: giá mua)
     + Σ (ô đang thế chấp: mortgageValue)
     + Σ (số nhà × houseCost của nhóm)
     + Σ (khách sạn × 5 × houseCost của nhóm).
 - Hoà tổng tài sản → so tiền mặt → so số ô sở hữu → so thứ tự ghế (deterministic, không dùng rng).
 - score trả về = netWorth (người phá sản: 0).

════════════════════════════════════════
O. LÀM TRÒN VÀ QUY ƯỚC SỐ
════════════════════════════════════════
 - Mọi số tiền là số nguyên. Không có xu.
 - Lãi thế chấp: Math.ceil(mortgageValue / 10).
 - 10% tổng tài sản (nếu bật incomeTaxMode='choice'): Math.floor(netWorth * 0.1).
 - Bán nhà nửa giá: houseCost là số chẵn (50/100/150/200) nên luôn chia hết.
 - Ngân hàng KHÔNG BAO GIỜ hết tiền (không mô hình hoá tiền mặt của bank).

════════════════════════════════════════
P. LUẬT NHÀ VIỆT NAM (config, mặc định TẮT)
════════════════════════════════════════
 - freeParkingPotEnabled: mọi thuế + phạt trả cho Ngân hàng dồn vào giữa bàn, ai dừng ô 20 lấy hết. (Rất phổ biến ở VN, nhưng kéo dài ván rất lâu — cảnh báo trong UI.)
 - doubleGoSalary: dừng ĐÚNG ô 0 nhận 400.
 - auctionOnDecline = false: bỏ đấu giá, không mua thì ô vẫn vô chủ. (Làm ván dài hơn nhiều, nhưng dễ hiểu cho người mới — nhiều bản cờ tỷ phú mobile VN làm vậy.)
 - freeHouseBeforeSet: cho xây nhà khi chưa đủ bộ — KHÔNG khuyến nghị, phá vỡ cân bằng.
 - quickMode: startCash 2500, maxRounds 40, mọi giá đất giảm không đổi nhưng lương ô 0 = 300 — dùng cho phòng "chơi nhanh 20 phút".


## Mô hình trạng thái

// ═══ HẰNG SỐ TĨNH (nằm trong cfg, KHÔNG thay đổi trong ván) ═══
type PlayerId = string;
type Pos = number;               // 0..39
type Group = 'brown'|'lightblue'|'pink'|'orange'|'red'|'yellow'|'green'|'blue'|'rail'|'utility';
type SpaceKind = 'go'|'lot'|'rail'|'utility'|'chance'|'chest'|'tax'|'jail'|'freeparking'|'gotojail';

interface SpaceDef {
  pos: Pos;
  kind: SpaceKind;
  name: string;                  // "Vịnh Hạ Long"
  group?: Group;
  price?: number;                // ô mua được
  rent?: [number,number,number,number,number,number]; // 0,1,2,3,4 nhà, khách sạn (chỉ lot)
  houseCost?: number;            // 50|100|150|200
  mortgage?: number;             // price/2
  taxAmount?: number;            // ô 4 = 200, ô 38 = 100
}

interface Config {
  board: SpaceDef[];             // đúng 40 phần tử
  startCash: number;             // 1500
  goSalary: number;              // 200
  jailFine: number;              // 50
  maxJailTurns: number;          // 3
  minAuctionIncrement: number;   // 10
  auctionOnDecline: boolean;     // true
  bankruptcyAuction: boolean;    // true
  houseShortageAuction: boolean; // false
  freeParkingPotEnabled: boolean;// false
  doubleGoSalary: boolean;       // false
  incomeTaxMode: 'fixed'|'choice';
  incomeTaxFixed: number;        // 200
  luxuryTax: number;             // 100
  doubleRentOnFullSet: boolean;  // true
  mortgagedCountsForSetBonus: boolean; // true
  mortgageTransferInterest: boolean;   // true
  raiseFundsDuringAuction: boolean;    // false
  maxHouses: number;             // 32
  maxHotels: number;             // 12
  tradesEnabled: boolean;        // true
  maxTradeOffersPerTurn: number; // 1
  turnMs: number;                // 30000
  timeBankMs: number;            // 60000
  auctionStepMs: number;         // 10000
  tradeReplyMs: number;          // 20000
  debtMs: number;                // 60000
  maxRounds: number;             // 100
  maxGameMs: number;             // 3600000
  maxTimeoutStrikes: number;     // 3
}

// ═══ TRẠNG THÁI ĐỘNG ═══
interface PropertyState {
  owner: PlayerId | null;
  houses: 0|1|2|3|4|5;           // 5 = khách sạn
  mortgaged: boolean;
}

interface PlayerState {
  id: PlayerId;
  seat: number;                  // 0..3, cố định, dùng phá hoà deterministic
  cash: number;
  pos: Pos;
  inJail: boolean;
  jailTurns: 0|1|2|3;
  jailCards: number;             // 0..2
  bankrupt: boolean;
  eliminatedAtRound: number|null;
  consecutiveDoubles: 0|1|2;
  tradeOffersThisTurn: number;
  timeBankMs: number;            // quỹ giờ dự phòng còn lại
  timeoutStrikes: number;        // 3 lần liên tiếp -> chuyển bot / xử thua
  connected: boolean;
  isBot: boolean;
  botLevel?: 'easy'|'normal'|'hard';
}

type Phase =
  | 'PRE_ROLL'           // chờ người tới lượt đổ xúc xắc (có thể xây/bán/giao dịch trước)
  | 'AWAIT_BUY'          // dừng ô vô chủ, chờ mua/từ chối
  | 'AUCTION'            // đang đấu giá
  | 'AWAIT_TRADE_REPLY'  // chờ bên kia trả lời đề nghị
  | 'AWAIT_DEBT'         // con nợ đang phải xoay tiền
  | 'AWAIT_TAX_CHOICE'   // chỉ khi incomeTaxMode='choice'
  | 'POST_ROLL'          // đã giải quyết ô đáp, chờ END_TURN
  | 'GAME_OVER';

interface AuctionState {
  pos: Pos;
  highBid: number;               // 0 nếu chưa ai ra giá
  highBidder: PlayerId | null;
  participants: PlayerId[];      // thứ tự ghế, bắt đầu từ người tới lượt
  passed: Set<PlayerId>;         // serialize thành mảng khi gửi qua mạng
  turnIdx: number;               // chỉ số trong participants
  bidCount: number;              // chống treo, cap 200
  deadlineMs: number;
  reason: 'declined'|'bankruptcy'|'shortage';
}

interface TradeOffer {
  id: string;
  from: PlayerId;
  to: PlayerId;
  giveCash: number;  giveProps: Pos[];  giveJailCards: number;
  wantCash: number;  wantProps: Pos[];  wantJailCards: number;
  deadlineMs: number;
}

interface DebtState {
  debtor: PlayerId;
  creditor: PlayerId | 'BANK';
  amount: number;
  reason: 'rent'|'tax'|'card'|'jailfine'|'repair'|'mortgageInterest'|'chairman';
  queue?: Array<{ to: PlayerId|'BANK'; amount: number }>; // thẻ CH15 trả nhiều người
  deadlineMs: number;
}

interface GameState {
  cfg: Config;

  // --- CHE KHỎI CLIENT ---
  seed: string;
  rngCursor: number;
  chanceDeck: string[];          // ['CH07','CH12',...] phần tử [0] là lá trên cùng
  chestDeck: string[];
  // -----------------------

  players: PlayerState[];
  order: PlayerId[];             // thứ tự đi, sinh bằng rng lúc init
  turnIdx: number;               // chỉ số trong order
  round: number;                 // +1 khi quay lại người đầu tiên còn sống
  turnCount: number;             // tổng số lượt đã đi
  phase: Phase;

  properties: Record<Pos, PropertyState>;  // chỉ 28 ô mua được
  bankHouses: number;            // 0..32
  bankHotels: number;            // 0..12
  freeParkingPot: number;

  lastDice: [number,number] | null;
  lastRollWasDouble: boolean;
  diceForUtility: number | null; // tổng nút dùng tính thuê tiện ích (khác lastDice khi tới bằng thẻ)
  pendingCard: { deck: 'chance'|'chest'; id: string } | null; // để client làm animation
  cardResolveDepth: number;      // chống đệ quy thẻ -> ô thẻ, cap 5

  pendingBuyPos: Pos | null;
  auction: AuctionState | null;
  trade: TradeOffer | null;
  debt: DebtState | null;

  startedAtMs: number;
  turnDeadlineMs: number;        // deadline của phase hiện tại
  eliminationOrder: PlayerId[];  // theo thứ tự phá sản
  winner: PlayerId | null;
  seq: number;                   // số thứ tự action, client dùng để chống replay
}

// Sự kiện trả về từ apply() — client dùng để dựng animation, replay dùng để tua lại
type GameEvent =
  | { t:'ROLLED'; p:PlayerId; d:[number,number]; isDouble:boolean }
  | { t:'MOVED'; p:PlayerId; from:Pos; to:Pos; passedGo:boolean }
  | { t:'CASH'; p:PlayerId; delta:number; reason:string; balance:number }
  | { t:'BOUGHT'; p:PlayerId; pos:Pos; price:number }
  | { t:'AUCTION_START'; pos:Pos } | { t:'BID'; p:PlayerId; amount:number }
  | { t:'AUCTION_PASS'; p:PlayerId } | { t:'AUCTION_WON'; p:PlayerId; pos:Pos; amount:number }
  | { t:'RENT'; from:PlayerId; to:PlayerId; pos:Pos; amount:number }
  | { t:'CARD'; p:PlayerId; deck:'chance'|'chest'; id:string; text:string }
  | { t:'BUILT'; p:PlayerId; pos:Pos; houses:number } | { t:'SOLD_BUILDING'; p:PlayerId; pos:Pos; houses:number }
  | { t:'MORTGAGED'; p:PlayerId; pos:Pos } | { t:'UNMORTGAGED'; p:PlayerId; pos:Pos; cost:number }
  | { t:'JAILED'; p:PlayerId; cause:'space'|'card'|'triple_double' }
  | { t:'FREED'; p:PlayerId; how:'fine'|'card'|'double'|'forced' }
  | { t:'TRADE_PROPOSED'; offer:TradeOffer } | { t:'TRADE_RESULT'; id:string; accepted:boolean }
  | { t:'DEBT'; p:PlayerId; amount:number; creditor:PlayerId|'BANK' }
  | { t:'BANKRUPT'; p:PlayerId; creditor:PlayerId|'BANK' }
  | { t:'TURN'; p:PlayerId; round:number }
  | { t:'GAME_OVER'; ranking:Array<{playerId:PlayerId; place:number; score:number}> };


## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `ROLL_DICE` | {} | phase ∈ {PRE_ROLL}; playerId === order[turnIdx]; !player.bankrupt. Nếu inJail thì đi nhánh luật tù (mục H). Nếu không inJail và consecutiveDoubles sẽ thành 3 thì vào tù ngay, KHÔNG di chuyển. Gieo bằng rng.int(1,6) hai lần, không bao giờ nhận số từ client. |
| `BUY_PROPERTY` | {} | phase === AWAIT_BUY; playerId === order[turnIdx]; pendingBuyPos != null; properties[pendingBuyPos].owner === null; cash >= board[pendingBuyPos].price. Trả lỗi NOT_ENOUGH_CASH nếu thiếu (không tự thế chấp hộ). |
| `DECLINE_PROPERTY` | {} | phase === AWAIT_BUY; playerId === order[turnIdx]. Nếu cfg.auctionOnDecline → mở AUCTION với participants = mọi người chưa phá sản (kể cả người vừa từ chối); nếu tắt → POST_ROLL. |
| `AUCTION_BID` | { amount: number } | phase === AUCTION; playerId === auction.participants[auction.turnIdx]; !auction.passed.has(playerId); Number.isInteger(amount); amount >= auction.highBid + cfg.minAuctionIncrement; amount <= player.cash (nếu cfg.raiseFundsDuringAuction=false); auction.bidCount < 200. |
| `AUCTION_PASS` | {} | phase === AUCTION; playerId là người đang tới lượt ra giá. Thêm vào auction.passed. Nếu chỉ còn ≤1 người chưa pass → chốt phiên. |
| `BUILD_HOUSE` | { pos: number } | playerId === order[turnIdx] và phase ∈ {PRE_ROLL, POST_ROLL, AWAIT_BUY, AWAIT_DEBT}; board[pos].kind === 'lot'; owner === playerId; sở hữu đủ nhóm màu; KHÔNG ô nào trong nhóm mortgaged; houses < 5; LUẬT XÂY ĐỀU: houses[pos] === min(houses của nhóm); nếu houses<4 cần bankHouses>=1, nếu houses===4 cần bankHotels>=1; cash >= houseCost. |
| `SELL_HOUSE` | { pos: number } | owner === playerId; houses > 0; LUẬT BÁN ĐỀU: houses[pos] === max(houses của nhóm); nếu houses===5 thì cần xử lý kho nhà (bankHouses>=4 → thành 4 nhà; ngược lại phá xuống k=bankHouses nhà và hoàn tiền bù). Cho phép ở mọi phase mà playerId được hành động, kể cả AWAIT_DEBT. |
| `MORTGAGE` | { pos: number } | owner === playerId; !mortgaged; nếu là lot thì MỌI ô trong nhóm màu phải có houses === 0. Nhận board[pos].mortgage. Cho phép trong AWAIT_DEBT và AWAIT_BUY. |
| `UNMORTGAGE` | { pos: number } | owner === playerId; mortgaged === true; cash >= mortgage + Math.ceil(mortgage/10). KHÔNG cho phép trong AWAIT_DEBT (đang nợ mà đi chuộc là vô nghĩa) — trả lỗi ILLEGAL_WHILE_IN_DEBT. |
| `PAY_JAIL_FINE` | {} | phase === PRE_ROLL; playerId === order[turnIdx]; inJail === true; cash >= cfg.jailFine. Sau khi trả: inJail=false, jailTurns=0; người chơi VẪN phải ROLL_DICE trong lượt này và đổ đúp thì được đi thêm. |
| `USE_JAIL_CARD` | {} | phase === PRE_ROLL; playerId === order[turnIdx]; inJail === true; jailCards >= 1. Trả thẻ xuống ĐÁY bộ bài gốc đã phát ra nó (cần lưu nguồn thẻ trong PlayerState nếu giữ 2 thẻ khác bộ). |
| `CHOOSE_TAX_MODE` | { mode: 'fixed' | 'percent' } | phase === AWAIT_TAX_CHOICE; playerId === order[turnIdx]; chỉ tồn tại khi cfg.incomeTaxMode === 'choice'. 'fixed' → trả 200; 'percent' → trả Math.floor(netWorth*0.1). Phải chọn trước khi server tiết lộ số tiền của phương án kia. |
| `PROPOSE_TRADE` | { to: PlayerId, giveCash: number, giveProps: number[], giveJailCards: number, wantCash: number, wantProps: number[], wantJailCards: number } | cfg.tradesEnabled; playerId === order[turnIdx] (hoặc playerId === debt.debtor khi phase===AWAIT_DEBT); phase ∈ {PRE_ROLL, POST_ROLL, AWAIT_DEBT}; trade === null; tradeOffersThisTurn < cfg.maxTradeOffersPerTurn; to là người chưa phá sản và ≠ playerId; mọi pos trong giveProps thuộc sở hữu người đề nghị, wantProps thuộc sở hữu người nhận; MỌI ô trong mọi nhóm màu liên quan phải có houses === 0; giveCash <= cash người đề nghị, wantCash <= cash người nhận; giveJailCards <= jailCards; đề nghị không được rỗng cả hai chiều. |
| `RESPOND_TRADE` | { tradeId: string, accept: boolean } | phase === AWAIT_TRADE_REPLY; playerId === trade.to; tradeId === trade.id. Khi accept phải KIỂM TRA LẠI toàn bộ điều kiện hợp lệ (tiền/tài sản có thể đã đổi nếu cho phép hành động xen kẽ) — nếu không còn hợp lệ thì huỷ giao dịch với lỗi TRADE_STALE. Hoán đổi phải nguyên tử. Ô thế chấp chuyển đi kích hoạt lãi 10% cho bên nhận. |
| `CANCEL_TRADE` | { tradeId: string } | phase === AWAIT_TRADE_REPLY; playerId === trade.from; tradeId === trade.id. |
| `END_TURN` | {} | phase === POST_ROLL; playerId === order[turnIdx]; debt === null; auction === null; trade === null. Nếu lastRollWasDouble && !inJail && consecutiveDoubles < 3 → giữ nguyên turnIdx, phase = PRE_ROLL (đi tiếp). Ngược lại → consecutiveDoubles = 0, chuyển turnIdx sang người còn sống kế tiếp, tăng round nếu vòng lại người đầu. |
| `DECLARE_BANKRUPTCY` | {} | phase === AWAIT_DEBT; playerId === debt.debtor. Cũng cho phép khi phase ∈ {PRE_ROLL, POST_ROLL} và người chơi muốn bỏ cuộc — khi đó chủ nợ là BANK. Thực thi đúng quy trình mục M. |
| `RESIGN` | {} | playerId là người chơi chưa phá sản bất kỳ, ở bất kỳ phase nào ngoài GAME_OVER. Xử lý giống phá sản với chủ nợ BANK, xếp hạng theo thứ tự bị loại. Nếu chỉ còn 1 người → GAME_OVER. |
| `REQUEST_BOT_TAKEOVER` | {} | playerId chưa phá sản; đặt isBot = true, botLevel = 'normal'. Cũng được server tự gọi khi timeoutStrikes >= cfg.maxTimeoutStrikes. Không đảo ngược được trừ khi người chơi kết nối lại và gửi lại action này với payload {} ở lượt của mình. |

## Kết thúc ván

ĐIỀU KIỆN KẾT THÚC (finished(state) === true khi bất kỳ điều nào đúng):
1. Chỉ còn ĐÚNG 1 người chơi chưa bankrupt → người đó thắng tuyệt đối.
2. round > cfg.maxRounds (mặc định 100 vòng, tức ~25 lượt/người với 4 người).
3. now − startedAtMs > cfg.maxGameMs (mặc định 60 phút; phòng "chơi nhanh" 20 phút).
4. Mọi người chơi còn lại đã RESIGN hoặc bị xử thua do timeout.

CÁCH TÍNH ĐIỂM CUỐI — netWorth(player):
  netWorth = cash
           + Σ (mỗi ô sở hữu chưa thế chấp: board[pos].price)
           + Σ (mỗi ô sở hữu đang thế chấp: board[pos].mortgage)    // = price/2
           + Σ (houses 1..4: houses × board[pos].houseCost)
           + Σ (khách sạn: 5 × board[pos].houseCost)
  Thẻ Ra Tù Miễn Phí KHÔNG tính điểm.
  Người đã phá sản: netWorth = 0.

XẾP HẠNG results(state) → [{ playerId, place, score }]:
• Trường hợp 1 (còn 1 người sống):
    place 1 = người sống sót, score = netWorth của họ.
    Các người phá sản xếp theo NGƯỢC eliminationOrder: người bị loại SAU CÙNG được place 2, người bị loại ĐẦU TIÊN nhận place cuối. score = 0.
• Trường hợp 2/3 (hết vòng hoặc hết giờ):
    Nhóm còn sống xếp trước, sắp giảm dần theo netWorth. Nhóm đã phá sản xếp sau, theo ngược eliminationOrder.
• PHÁ HOÀ (deterministic, tuyệt đối không dùng rng):
    (a) netWorth lớn hơn thắng;
    (b) bằng nhau → cash lớn hơn thắng;
    (c) bằng nữa → sở hữu nhiều ô hơn thắng;
    (d) bằng nữa → tổng số nhà+khách sạn nhiều hơn thắng;
    (e) bằng nữa → seat nhỏ hơn thắng.
• place là số nguyên liên tục 1..n, KHÔNG có đồng hạng (hệ thống xếp hạng của nền tảng cần thứ tự cứng để tính điểm ELO/MMR).
• Trả kèm trong event GAME_OVER để client dựng bảng tổng kết: netWorth từng người, số ô, số nhà, tổng tiền thuê đã thu, tổng tiền thuê đã trả, số lần vào tù — các số liệu này nên được tích luỹ trong state (trường thống kê phụ) vì tính lại từ log rất đắt.

LƯU Ý CÔNG BẰNG: nếu ván kết thúc do hết giờ/hết vòng, phải thông báo cho người chơi từ vòng 90 trở đi (event WARNING) — nếu không, người đang ôm tiền mặt chờ ăn tiền thuê sẽ bị thiệt oan so với người vừa đổ hết tiền vào xây nhà.

## Che thông tin ẩn

CÓ thông tin ẩn, nhưng ít và tập trung ở bộ bài.

view(state, viewerId) phải XOÁ HOÀN TOÀN (không gửi, không gửi dạng hash, không gửi độ dài mảng gốc theo cách suy ra được):
1. state.seed và state.rngCursor — nếu lộ, client dự đoán được mọi cú xúc xắc và mọi lá bài còn lại của cả ván. Đây là rò rỉ nghiêm trọng nhất.
2. state.chanceDeck và state.chestDeck (thứ tự các lá còn trong bộ). Thay bằng:
     chanceRemaining: number, chestRemaining: number,
     chanceSeen: string[]   // các lá ĐÃ được lật công khai trong ván này, theo thứ tự lật
     chestSeen: string[]
   Người chơi thật ngồi bàn cờ giấy CÓ quyền nhớ các lá đã ra, nên chanceSeen/chestSeen là thông tin công khai hợp lệ. Nhưng các lá CHƯA ra phải được giấu — nếu gửi cả mảng deck thì người chơi biết chính xác lá tiếp theo, hỏng game.
3. Nội dung nội bộ của bot (bảng lượng giá, kết quả Monte Carlo) nếu có lưu trong state — tách sang bộ nhớ ngoài state hoặc xoá trong view.

KHÔNG cần che (công khai cho mọi người chơi VÀ người xem):
• Tiền mặt của từng người. (Bản Monopoly chuẩn để tiền úp — nhưng bản online mọi nền tảng đều hiện công khai, vì che tiền mặt biến đấu giá thành trò đoán mò và bot sẽ chơi rất tệ. Chọn công khai, ghi rõ trong luật phòng.)
• Toàn bộ sở hữu, số nhà, trạng thái thế chấp, số thẻ Ra Tù Miễn Phí của mỗi người.
• Đấu giá: dùng English auction CÔNG KHAI — mọi mức giá, mọi lần pass đều nhìn thấy. (Nếu sau này đổi sang đấu giá kín một vòng thì phải che bid cho tới khi chốt — lúc đó view phải lọc auction.bids theo viewerId.)
• Nội dung đề nghị giao dịch đang treo: công khai cho cả phòng. Giấu chỉ làm người xem mất vui và không tăng chiều sâu chiến thuật.
• lastDice, diceForUtility, pendingCard.

NGƯỜI XEM (spectator, viewerId = null): nhận đúng view như người chơi, trừ chanceDeck/chestDeck/seed vẫn bị che. Không cần delay chống gian lận vì không có thông tin riêng tư nào của người chơi.

RECONNECT: khi người chơi vào lại, gửi view đầy đủ + N event gần nhất để dựng lại animation; không được gửi lại state chưa che.

KIỂM THỬ BẮT BUỘC: viết một test khẳng định JSON.stringify(view(s, anyPlayer)) không chứa chuỗi seed và không chứa mảng deck — dễ vỡ nhất khi ai đó thêm trường debug rồi quên lọc.

## Tính giờ

Cờ tỷ phú KHÔNG dùng đồng hồ kiểu cờ vua (không có tổng quỹ giờ cho cả ván) vì số lượt mỗi người rất chênh lệch và có nhiều phase mà người không tới lượt vẫn phải hành động (đấu giá, trả lời giao dịch). Dùng đồng hồ THEO PHASE + quỹ giờ dự phòng.

ĐỒNG HỒ THEO PHASE (mặc định):
• PRE_ROLL / POST_ROLL: 30 giây cho người đang tới lượt.
• AWAIT_BUY: 15 giây.
• AUCTION: 10 giây cho MỖI lượt ra giá; deadline reset mỗi khi có người bid.
• AWAIT_TRADE_REPLY: 20 giây cho bên nhận.
• AWAIT_DEBT: 60 giây (cần nhiều thao tác bán/thế chấp).
• AWAIT_TAX_CHOICE: 10 giây.

QUỸ GIỜ DỰ PHÒNG (time bank): mỗi người có 60 giây cho cả ván. Khi đồng hồ phase về 0, tự động rút từ quỹ, 5 giây một lần, kèm event cảnh báo. Quỹ cạn thì mới tính là timeout. Điều này tránh xử thua oan người đang tính toán một vụ thế chấp phức tạp.

HÀNH VI KHI HẾT GIỜ (server tự thực hiện, KHÔNG treo ván):
• PRE_ROLL: nếu inJail → nếu có thẻ ra tù thì dùng thẻ, nếu không thì ROLL_DICE. Nếu không inJail → ROLL_DICE.
• AWAIT_BUY: coi như DECLINE_PROPERTY (→ đấu giá nếu bật).
• AUCTION: coi như AUCTION_PASS.
• AWAIT_TRADE_REPLY: coi như từ chối.
• AWAIT_DEBT: chạy trình thanh lý tự động (bán nhà đều từ nhóm rẻ nhất, rồi thế chấp theo thứ tự giá trị tăng dần) cho tới khi đủ tiền; nếu vẫn không đủ → phá sản.
• POST_ROLL: END_TURN.
• AWAIT_TAX_CHOICE: chọn phương án RẺ HƠN cho người chơi (thiện chí, không phạt người mất mạng).

CHỐNG AFK: timeoutStrikes tăng mỗi lần phải tự động hoá ở phase của chính người đó; reset về 0 khi họ tự gửi một action. Đạt 3 → chuyển sang bot 'normal' điều khiển, có thông báo cho cả phòng. Người chơi kết nối lại được giành quyền điều khiển ở đầu lượt kế tiếp.

MẤT KẾT NỐI: giữ ghế 90 giây với đồng hồ vẫn chạy nhưng auto-play thiện chí (không mua, không bid, không chấp nhận giao dịch — chỉ roll và end turn). Quá 90 giây → bot tiếp quản.

GIỚI HẠN VÁN: maxRounds 100 vòng và maxGameMs 60 phút. Phòng "chơi nhanh": startCash 2500, goSalary 300, maxRounds 40, maxGameMs 20 phút, turnMs 20s. Đây là điểm sống còn của trải nghiệm — cờ tỷ phú tiêu chuẩn có thể kéo 2–4 giờ, không ai chơi hết trên nền tảng online.

TICK: tick(state, now, rng) cần được gọi ~2 lần/giây. Không phải game realtime theo nghĩa vật lý, nhưng BẮT BUỘC có tick vì ba deadline (đấu giá, trả lời giao dịch, nợ) không gắn với đồng hồ của một người chơi duy nhất — không thể suy ra hết giờ chỉ từ action kế tiếp. tick phải là hàm thuần và idempotent theo now: gọi tick hai lần với cùng now không được sinh hai lần auto-action.

## Bot

NÓI THẲNG: MINIMAX KHÔNG DÙNG ĐƯỢC cho cờ tỷ phú, và lý do khác với cờ vây.
• Nhánh ngẫu nhiên: mỗi lượt có 21 tổ hợp xúc xắc phân biệt (36 kết quả), nhân thêm 16 khả năng rút thẻ → hệ số nhánh cơ hội ~100–300 mỗi ply, trước cả nhánh quyết định.
• Không gian hành động rời rạc nhưng khổng lồ: tập các tổ hợp xây/bán/thế chấp trong một lượt là tổ hợp trên 28 ô; tập đề nghị giao dịch là tích Descartes của hai tập con tài sản × tiền mặt liên tục.
• Chân trời quá xa: một ván quyết định ở vòng 20–40, tức 80–160 ply. Minimax sâu 4 ply không nhìn thấy gì có ý nghĩa.
• Không có khái niệm "chiếu hết" để cắt tỉa; hàm lượng giá phải dự báo dòng tiền tương lai chứ không phải thế trận tức thời.
→ Dùng HEURISTIC DỰA TRÊN KỲ VỌNG XÁC SUẤT, tuỳ chọn thêm Monte Carlo rollout cho mức Khó.

════ NỀN TẢNG: BẢNG XÁC SUẤT ĐÁP Ô (tính 1 lần lúc khởi động server) ════
Dựng xích Markov trên không gian trạng thái 40 ô × 4 trạng thái tù (tự do, tù-lượt-1, tù-lượt-2, tù-lượt-3), mô hình đủ: phân phối tổng 2 xúc xắc, luật đổ đúp 3 lần, ô 30 Vào Tù, 6 thẻ di chuyển của Cơ Hội và 2 thẻ di chuyển của Khí Vận (dùng xác suất 1/16 mỗi lá). Giải vector riêng dừng bằng power iteration 500 vòng (mất <20ms một lần duy nhất).
Kết quả P[pos] = xác suất một lượt bất kỳ của đối thủ kết thúc ở ô pos. Các giá trị đặc trưng cần khớp để tự kiểm tra: ô 10 (tù/thăm tù) cao nhất ~5,9%; ô 24 Hồ Ba Bể ~3,19% (cao nhất trong các ô mua được); ô 19 Sa Pa ~3,06%; nhóm CAM và ĐỎ nổi bật vì nằm 6–9 ô sau nhà tù; ô 30 = 0%; ô 37/39 nhóm CHÀM chỉ ~2,6%/2,4% nên đắt mà ít ăn.
Lưu bảng này thành hằng số biên dịch sẵn — bot tra O(1).

════ HÀM LƯỢNG GIÁ ════
EV_rent(pos, level) = P[pos] × rent(pos, level) × (số đối thủ còn sống)
   → doanh thu kỳ vọng mỗi VÒNG từ ô đó.
ROI_build(pos) = (EV_rent(pos, h+1) − EV_rent(pos, h)) / houseCost(nhóm)
   → dùng xếp hạng mọi nước xây khả dĩ. Nhóm CAM/ĐỎ/LƠ luôn nổi lên đầu, đúng với lý thuyết Monopoly.
Value(pos) cho quyết định mua/đấu giá:
   base   = EV_rent(pos, 0) × K            // K = số vòng còn lại ước tính, dùng min(20, maxRounds − round)
   setBonus: nếu mua xong ta ĐỦ BỘ    → × 3,0 (giá trị thật nằm ở quyền xây nhà)
             nếu mua xong ta còn thiếu 1 ô → × 1,6
   blockBonus: nếu đối thủ chỉ còn thiếu ĐÚNG ô này để đủ bộ → + 0,8 × (chi phí kỳ vọng ta phải trả nếu họ xây đủ khách sạn)
   railBonus: ga thứ 3, thứ 4 → × 1,4 (rent nhảy 100→200)
   utilPenalty: tiện ích → × 0,6 (thu nhập thấp, chỉ mua để chặn hoặc khi rẻ)
   Value cuối cùng bị chặn trên bởi (cash − reserve).
reserve(player) = 1,2 × (tiền thuê lớn nhất ta có thể phải trả trong 2 lượt tới, tính bằng quét 12 ô phía trước theo P có điều kiện) + 100.
   Đây là tham số quan trọng nhất: đặt quá thấp bot tự phá sản, quá cao bot không bao giờ xây.

════ QUYẾT ĐỊNH THEO TỪNG PHASE ════
MUA (AWAIT_BUY): mua khi Value(pos) ≥ price VÀ cash − price ≥ reserve. Ngoại lệ cứng: LUÔN mua ô hoàn tất bộ của mình nếu còn đủ tiền sau khi thế chấp được; LUÔN mua ô chặn bộ của đối thủ đang dẫn.
ĐẤU GIÁ: định giá V = Value(pos). Bid tăng dần theo bước minIncrement khi highBid < V × hệ số hiếu chiến; pass ngay khi highBid ≥ min(V × hệ số, cash − reserve). Thêm nhiễu ±8% để hai bot không luôn dừng ở cùng con số (tránh ván nào cũng giống ván nào).
XÂY: giải bài toán ba lô tham lam — lặp chọn nước xây có ROI_build cao nhất còn hợp lệ (đủ bộ, không thế chấp, đúng luật xây đều, còn nhà trong kho) trong khi cash − cost ≥ reserve. Ưu tiên đưa cả nhóm lên 3 NHÀ trước khi lên 4 hay khách sạn (bước nhảy tiền thuê lớn nhất là từ 2→3 nhà).
TÙ: pha đầu ván (còn > 40% ô vô chủ) → trả 50 ra ngay để đi mua đất. Pha cuối (đối thủ đã có nhiều khách sạn) → NGỒI LẠI TÙ, gieo cầu may 3 lượt, không trả tiền. Đây là chiến thuật đúng và bot ngu thường làm ngược.
THẾ CHẤP / TRẢ NỢ: khi nợ, chạy trình thanh lý tham lam theo tỉ số (tiền thu được / tổn thất EV), ưu tiên: bán nhà nhóm ROI thấp → thế chấp tiện ích → thế chấp ô lẻ không thuộc bộ nào → thế chấp nhà ga → cuối cùng mới đụng vào bộ hoàn chỉnh. KHÔNG dùng tìm kiếm vét cạn (2^28 tổ hợp).
GIAO DỊCH: chỉ mức Vừa/Khó. Đánh giá ΔValue của cả hai bên bằng cùng hàm Value; đề nghị khi ΔValue_mình > 1,25 × ΔValue_đối_thủ và cả hai đều dương (đề nghị "cùng có lợi nhưng mình lợi hơn" mới có xác suất được chấp nhận). Chấp nhận đề nghị khi ΔValue_mình > 0 và không giúp đối thủ đủ bộ mạnh hơn bộ mình nhận.

════ BA MỨC KHÓ ════
DỄ  (~0,1ms/nước):
  Không dùng bảng Markov. Mua với xác suất 0,7 nếu cash ≥ price + 150. Đấu giá tối đa = giá niêm yết, bid ngẫu nhiên có/không. Xây ngẫu nhiên 40% số tiền dư mỗi lượt, không tính ROI. Luôn trả tiền ra tù. Từ chối mọi giao dịch. reserve cố định 100. Có 12% xác suất mỗi lượt bỏ qua một nước tốt rõ ràng (để người mới có cảm giác thắng được).
VỪA (~1ms/nước):
  Toàn bộ heuristic ở trên, hệ số hiếu chiến đấu giá 1,0. Chấp nhận giao dịch có lợi nhưng không chủ động đề nghị. Chiến thuật tù theo pha. reserve động. Đây là mức mặc định cho bot lấp chỗ trống trong phòng ghép cặp.
KHÓ (~200–400ms/nước, vẫn dưới 1 giây rất xa):
  Heuristic + Monte Carlo rollout CHỈ cho 3 loại quyết định đắt tiền: mua/không mua, mức giá trần khi đấu giá, và gói xây nhà cuối lượt.
  Cách làm: từ state hiện tại, với mỗi phương án ứng viên (tối đa 6 phương án), chạy 120–250 lần mô phỏng nhanh. Mô phỏng dùng chính engine nhưng TẮT giao dịch, mọi người chơi (kể cả mình) dùng policy mức Vừa, xúc xắc và thẻ gieo bằng rng riêng của bot (KHÔNG đụng vào rng của ván). Cắt sau 30 vòng mô phỏng hoặc khi còn 1 người. Điểm của một rollout = netWorth của mình chia tổng netWorth toàn bàn (chuẩn hoá về 0..1), cộng thưởng 0,35 nếu mình là người duy nhất còn sống.
  Chọn phương án có điểm trung bình cao nhất. Một rollout 30 vòng × 4 người ≈ 120 lượt mô phỏng; với engine viết gọn (không tạo object mới mỗi bước, dùng typed array cho bàn cờ) khoảng 0,6–1,2ms → 250 rollout × 6 phương án vẫn nằm trong ~400ms. Nếu đo thực tế vượt ngân sách, giảm số rollout theo thời gian còn lại (anytime): chạy vòng lặp có kiểm tra Date.now() và dừng khi tiêu hết 300ms.
  Thêm: chủ động đề nghị giao dịch mỗi 3 lượt một lần, ưu tiên đổi lấy ô hoàn tất bộ CAM/ĐỎ/LƠ.

════ ĐO LƯỜNG ════
Bắt buộc có kịch bản tự đấu: 2000 ván Khó vs Vừa vs Vừa vs Dễ. Kỳ vọng tỉ lệ thắng xấp xỉ 40% / 25% / 25% / 10%. Nếu Khó không vượt 33% thì hàm Value hoặc reserve đang sai. Nếu tỉ lệ ván kéo dài hết maxRounds > 25% thì bot đang quá thận trọng, giảm reserve.

### Chỗ bot dễ hỏng

CHỖ BOT DỄ CHƠI NGU:
1. Ôm tiền mặt không xây nhà. Đây là lỗi kinh điển: bot mua đủ bộ rồi để đó vì reserve đặt quá cao. Kết quả là ván nào cũng chạy hết 100 vòng rồi xử theo tài sản, người xem chán. Phải có luật cứng: nếu ta sở hữu ít nhất một bộ hoàn chỉnh và cash > 2 × reserve thì BẮT BUỘC xây ít nhất một nhà mỗi lượt.
2. Không hiểu giá trị của việc chặn bộ. Bot chỉ tính EV_rent sẽ bỏ qua ô cuối cùng của bộ CHÀM (giá 400, P thấp) và để đối thủ có Hoàng Thành + Hạ Long với khách sạn — thua ngay. Phải có blockBonus.
3. Ra tù sai thời điểm. Bot luôn trả 50 để ra tù sẽ tự lao vào bãi mìn khách sạn ở cuối ván; bot luôn ngồi tù sẽ không mua được đất ở đầu ván.
4. Định giá tiện ích quá cao. EV của Nhà Máy Điện/Nước rất thấp nhưng công thức nhân 4x/10x làm bot naive tưởng ngon. Phải có utilPenalty.
5. Thanh lý sai thứ tự: bán nhà của bộ mạnh nhất để trả một khoản nợ nhỏ. Phải sắp theo tổn thất EV, không theo giá tiền.
6. Bot Dễ mà vẫn thắng người thật. Nếu chỉ "ngẫu nhiên hoá quyết định" thì bot Dễ vẫn mạnh vì cờ tỷ phú phần lớn là may rủi. Phải cho bot Dễ mắc lỗi CÓ HỆ THỐNG (không xây khách sạn, không chặn bộ) chứ không chỉ nhiễu.

CHỖ DỄ TREO MÁY / LỖI NGHIÊM TRỌNG:
7. VÒNG LẶP ĐẤU GIÁ VÔ TẬN. Hai bot cùng định giá V, cùng tăng minIncrement, mà điều kiện dừng viết là "<" thay vì "≤" → bid qua lại tới khi tràn số. Bắt buộc: bidCount cap 200 trong engine (không tin bot), và bot phải chặn trên bằng cash.
8. VÒNG LẶP ĐỀ NGHỊ GIAO DỊCH. Bot A đề nghị, bot B từ chối, bot A đề nghị lại y hệt. Engine đã giới hạn 1 đề nghị/lượt; bot còn phải nhớ tập các đề nghị đã bị từ chối trong 5 lượt gần nhất và không gửi lại đề nghị tương đương.
9. RETRY VÔ HẠN KHI ACTION BỊ TỪ CHỐI. Bot tính sai luật xây đều hoặc quên kiểm tra bankHouses, engine trả lỗi, bot gửi lại đúng action đó. Phải: bot tự validate TRƯỚC khi gửi bằng cùng hàm isLegal() của engine (export ra để dùng chung), và runner của bot phải có bộ đếm — 3 lần lỗi liên tiếp thì fallback về END_TURN.
10. MÔ PHỎNG MONTE CARLO KHÔNG BAO GIỜ KẾT THÚC. Trong rollout, nếu policy nội bộ không chịu xây thì không ai phá sản, vòng lặp chạy mãi. Bắt buộc cap cứng số vòng mô phỏng (30) và cap số action mỗi lượt mô phỏng (50).
11. BOT DÙNG NHẦM RNG CỦA VÁN. Nếu rollout gọi rng của state, con xúc xắc thật của ván sẽ bị "tiêu" và kết quả không tái lập được khi replay. Bot PHẢI có rng riêng, seed từ hash(state.seq + playerId).
12. BOT KHÔNG PHẢN HỒI KHI KHÔNG PHẢI LƯỢT CỦA MÌNH. Bot viết theo kiểu `if (state.currentPlayer !== me) return;` sẽ đứng im trong phase AUCTION và AWAIT_TRADE_REPLY → cả bàn chờ hết giờ mỗi lượt, ván dài gấp ba. Điểm vào của bot phải nhận cả phase, không chỉ currentPlayer.
13. ĐỆ QUY THẺ BÀI. Thẻ CH10 "lùi 3 ô" từ ô 36 rơi vào ô 33 Khí Vận → rút thẻ tiếp → có thể là thẻ di chuyển. Nếu bot mô phỏng lại logic này mà không có cap độ sâu thì tràn stack. Engine đã có cardResolveDepth cap 5; mô phỏng của bot phải dùng chung engine chứ đừng viết lại.
14. TÍNH netWorth TRONG ROLLOUT BẰNG CÁCH DUYỆT LẠI CẢ BÀN CỜ MỖI BƯỚC. O(40) × 120 bước × 250 rollout × 6 phương án = 7,2 triệu phép duyệt, đủ để vượt ngân sách 1 giây. Duy trì netWorth theo kiểu incremental.
15. BẢNG MARKOV TÍNH LẠI MỖI NƯỚC. Power iteration 500 vòng trên ma trận 160×160 mất ~20ms; nhân với mỗi nước đi của mỗi bot là hết ngân sách. Tính đúng một lần lúc boot, đóng băng thành hằng số.

## Cạm bẫy khi cài đặt

- Đổ đúp lần thứ 3: phải vào tù NGAY, KHÔNG di chuyển, KHÔNG giải quyết ô đáp. Rất nhiều bản cài sai bằng cách cho đi rồi mới bắt vào tù — làm người chơi có thể cố tình ăn một ô tốt rồi mới vào tù.
- Ra tù bằng cách gieo đúp thì KẾT THÚC LƯỢT, không được đi thêm dù là đúp. Nhưng ra tù bằng cách TRẢ 50 hoặc DÙNG THẺ thì sau đó gieo đúp VẪN được đi thêm. Hai nhánh khác nhau, dễ viết lẫn.
- Lần gieo hỏng thứ 3 trong tù: phải trả 50 VÀ VẪN DI CHUYỂN theo số vừa gieo. Nhiều bản quên phần di chuyển, để người chơi đứng yên ở ô 10.
- Thẻ CH10 'lùi 3 ô' từ ô 36 rơi vào ô 33 là ô KHÍ VẬN — phải rút tiếp một thẻ Khí Vận và thi hành. Từ ô 7 lùi về ô 4 là Thuế Thu Nhập, phải trả 200. Cần cap độ sâu đệ quy 5 tầng.
- Thẻ CH05/CH06 'tới nhà ga gần nhất' từ ô 36 sẽ đi tới ô 5 và VƯỢT QUA Ô 0 → phải nhận 200. Tương tự CH07 'tới tiện ích gần nhất' từ ô 36 đi tới ô 12, cũng nhận 200. Quên chỗ này là bug hay gặp nhất của toàn bộ hệ thẻ.
- Tới tiện ích bằng thẻ CH07 thì phải GIEO LẠI xúc xắc và LUÔN trả 10x, bất kể chủ sở hữu 1 hay 2 tiện ích. Không được dùng lại tổng nút của cú đổ trước.
- Tới nhà ga bằng thẻ CH05/CH06 thì trả GẤP ĐÔI bảng thuê (50/100/200/400), không phải bảng thường.
- Ô 30 'Vào Tù': không nhận 200 dù đường đi hình ảnh có đi qua ô 0, và lượt kết thúc ngay kể cả vừa đổ đúp.
- Nhân đôi tiền thuê khi đủ bộ CHỈ áp dụng khi ô đó có 0 nhà. Có 1 nhà trở lên thì dùng thẳng bảng, không nhân đôi nữa.
- Ô đang thế chấp không thu tiền thuê CỦA CHÍNH NÓ, nhưng vẫn tính vào 'sở hữu đủ bộ' để nhân đôi các ô khác trong nhóm, và vẫn tính vào số nhà ga sở hữu. Phải quyết định dứt khoát và ghi vào config (mortgagedCountsForSetBonus), đừng để mỗi chỗ xử lý một kiểu.
- Luật XÂY ĐỀU và BÁN ĐỀU: chênh lệch số nhà trong nhóm luôn ≤ 1. Chỉ được xây lên ô có số nhà nhỏ nhất, chỉ được bán từ ô có số nhà lớn nhất. Quên luật này là lỗ hổng chiến thuật lớn (dồn 4 nhà lên một ô rẻ).
- Kho nhà chỉ có 32 và khách sạn chỉ có 12. Khi hết nhà thì không ai xây được nữa — đây là chiến thuật thật sự (mua khách sạn để rút nhà khỏi kho, chặn đối thủ). Đừng để bankHouses âm hoặc bỏ qua kiểm tra.
- Bán khách sạn khi kho nhà không đủ 4: phải cho phép phá xuống k nhà và hoàn tiền nửa giá cho (4−k) nhà không lấy được. Nếu không xử lý, người chơi kẹt cứng không thanh lý được và bị phá sản oan.
- Thế chấp ô đất yêu cầu CẢ NHÓM MÀU không còn nhà nào, không chỉ riêng ô đó. Tương tự khi đem ô vào giao dịch.
- Lãi chuộc 10%: 175 (Vịnh Hạ Long) không chia hết cho 10. Phải chốt công thức Math.ceil(mortgage/10) và dùng thống nhất ở cả chuộc, chuyển nhượng, và phá sản. Số lẻ 17,5 là nguồn gốc của sai lệch 1 đồng khiến test flaky.
- Chuyển nhượng ô đang thế chấp: người nhận phải trả ngay 10% lãi. Nếu người nhận không đủ tiền (đặc biệt trong phá sản dây chuyền) thì chính họ rơi vào trạng thái nợ — phải xử lý được phá sản dây chuyền A→B→C trong cùng một lần apply.
- Thẻ CH15 'trả mỗi người chơi 50': nếu không đủ tiền cho tất cả, phải trả theo thứ tự ghế và mỗi chủ nợ là một khoản nợ riêng, không gộp thành một khoản nợ với BANK.
- Người chơi đã phá sản không được tính vào các thẻ 'mỗi người chơi' (CH15, KV09) và không tham gia đấu giá.
- Khi người tới lượt phá sản giữa chừng, phải chuyển lượt đúng cách và xử lý trường hợp order[turnIdx] không còn hợp lệ. Bug phổ biến: turnIdx trỏ vào người đã bị loại, ván treo.
- Đấu giá phải bao gồm cả người vừa từ chối mua. Và phải có cap cứng số lần bid trong engine — không tin bot cũng không tin client.
- Chủ đất ĐANG NGỒI TÙ vẫn thu tiền thuê bình thường. Đừng dùng cùng một cờ 'inactive' cho cả việc bị tù và bị loại.
- tick() phải idempotent theo tham số now: gọi hai lần với cùng now không được sinh hai lần auto-action. Nếu không, tình trạng tick trùng trong cluster sẽ gieo xúc xắc hai lần cho một người.
- view() phải che seed, rngCursor và cả hai mảng deck. Có test khẳng định chuỗi JSON của view không chứa seed và không chứa mảng bài chưa lật.
- Nếu bật luật nhà freeParkingPot thì mọi khoản trả cho Ngân hàng (thuế, phạt, phí sửa nhà, lãi chuộc) đều phải dồn vào pot — nếu chỉ dồn thuế mà quên phạt thì cân bằng lệch và người chơi sẽ khiếu nại.
- Số tiền luôn là số nguyên. Đừng để lọt phép chia lẻ nào (nửa giá nhà, 10% tài sản) mà không làm tròn tường minh, kèm chú thích hướng làm tròn.

## Mỹ thuật riêng của game này

CHẤT LIỆU: "Áp phích du lịch Việt Nam in lụa thập niên 1960–1980". Không dùng gỗ, không dùng đá, không dùng giấy dó, không dùng ngà — để tách hẳn khỏi cờ tướng/cờ vua/cờ vây/ô ăn quan/cờ gánh vốn sẽ đi hướng vật liệu truyền thống. Cờ tỷ phú là game duy nhất trong bộ mang tinh thần ĐỒ HOẠ IN ẤN chứ không phải đồ vật thủ công.

Cụ thể:
• Mỗi ô đất là một MINH HOẠ IN LỤA phẳng, 3–4 lớp mực chồng nhau, viền lệch tông cố ý 1–2px như lỗi canh bản in, có lưới chấm halftone thưa (kích thước chấm 2px) ở vùng chuyển sắc. Không đổ bóng mềm, không gradient mượt, không glassmorphism.
• Nền bàn cờ: giấy kraft ngà có vân sợi và vết ố nhẹ, in chìm hoa văn trống đồng Đông Sơn ở giữa bàn với độ mờ 6%.
• Tiền trong game thiết kế như GIẤY BẠC: khung guilloche xoắn, số mệnh giá kiểu chữ serif hẹp, hình chìm là các địa danh nhỏ, mỗi mệnh giá một màu mực riêng. Đây là điểm nhận diện mạnh nhất — animation tiền bay khi trả thuê phải thấy rõ tờ giấy bạc.
• Quân cờ là các VẬT THỂ NHỎ minh hoạ phẳng theo phong cách cùng bộ: chiếc xe cúp, nón lá, con trâu, ấm trà, xích lô, chiếc thuyền thúng. Render 2D phẳng, không 3D.
• Nhà = khối nhà ống phố cổ ba tầng, mặt tiền hẹp, mái ngói đỏ. Khách sạn = toà nhà bảy tầng có biển hiệu chữ ghép ánh sáng. Cả hai in phẳng, nhìn từ góc 3/4 giả lập.
• Thẻ Cơ Hội in mực đỏ son trên nền ngà, thẻ Khí Vận in mực chàm trên nền ngà, cả hai có khung kép và một biểu tượng in lụa lớn (Cơ Hội: bánh xe may mắn cách điệu; Khí Vận: bàn tay nâng đồng xu).

BẢNG MÀU (chốt cứng, dùng đúng mã):
  Giấy kraft ngà      #F2E6CE   nền chính
  Mực chàm đậm        #163A5F   chữ, viền, UI chính
  Đỏ son              #C8362B   nhấn, Cơ Hội, cảnh báo
  Vàng nghệ           #E0A03C   tiền, nhấn phụ
  Xanh ngọc rêu       #2E7D6E   trạng thái tích cực, nhận tiền
  Nâu mực             #3B2A1C   bóng đổ cứng, viền ngoài
  Xám giấy cũ         #C9BCA3   ô bị thế chấp, trạng thái tắt
Dải màu 8 nhóm đất (đổi khỏi bảng Monopoly gốc để không đụng bản quyền thị giác và hợp tông in lụa):
  Nâu đất #7A5230 · Lơ biển #6FA8C4 · Hồng sen #D4718C · Cam gạch #D97B32
  Đỏ son #C8362B · Vàng nghệ #E0A03C · Lá mạ #4E9B52 · Chàm sâu #2A4B7C
Chế độ tối: KHÔNG đảo màu. Dùng nền mực chàm rất tối #0E1E2E với giấy chuyển thành #E8DCC4 ở độ sáng 88%, giữ nguyên tông mực — như xem áp phích dưới đèn vàng.

ĐỘNG: quân cờ nhảy từng ô một theo nhịp 90ms, có squash nhẹ khi chạm ô, không trượt mượt. Xúc xắc lăn 700ms rồi dừng cứng, mặt xúc xắc là số chấm in mực đỏ trên khối ngà. Khi mua đất, thẻ sở hữu lật vào panel bên như xếp một xấp giấy tờ. Khi thế chấp, thẻ xoay 180 độ và chuyển sang mặt xám giấy cũ có dấu mộc "ĐÃ THẾ CHẤP" nghiêng 12 độ.

CHỮ: tiêu đề dùng một font sans condensed có sức nặng kiểu biển hiệu bao cấp (Be Vietnam Pro ExtraBold nén ngang 92%, hoặc Bandeins Strange nếu mua được); số tiền dùng font mono tabular để cột tiền không nhảy; thân chữ dùng Be Vietnam Pro Regular. Tuyệt đối không dùng font thư pháp — đó là phần của cờ tướng và ô ăn quan.

ÂM: tiếng xúc xắc gỗ lắc trong ống tre, tiếng đóng dấu mộc khi mua đất, tiếng đếm tiền giấy sột soạt, tiếng chuông xe đạp khi tới lượt. Không dùng nhạc nền liên tục — chỉ một đoạn nhạc chờ kiểu đàn bầu + guitar phím lõm ở màn ghép cặp.

### Asset tối thiểu

- Bàn cờ nền: texture giấy kraft ngà 2048x2048 có vân sợi + hoa văn trống đồng chìm 6%
- 40 minh hoạ ô in lụa (28 địa danh + Xuất Phát + Trại Giam + Bãi Đậu Xe + Vào Tù + 2 ô thuế + 3 Cơ Hội + 3 Khí Vận), mỗi ô 512x512 PNG trong suốt
- 8 dải màu nhóm đất dạng thanh ngang có vân halftone (SVG, tô màu theo biến CSS)
- 6 quân cờ minh hoạ phẳng (xe cúp, nón lá, con trâu, ấm trà, xích lô, thuyền thúng), mỗi quân 4 hướng nhìn + 1 frame squash, 256x256
- Sprite nhà ống phố cổ (1 mẫu) và khách sạn 7 tầng (1 mẫu), mỗi loại 3 biến thể màu mái, 128x128
- 28 thẻ sở hữu (title deed) dựng bằng template SVG: khung kép, dải màu nhóm, bảng giá thuê 6 dòng, mặt sau mộc ĐÃ THẾ CHẤP
- 2 mặt lưng thẻ bài (Cơ Hội đỏ son, Khí Vận chàm) + template mặt trước SVG có chỗ đổ 32 nội dung thẻ
- Bộ tiền giấy 7 mệnh giá (1, 5, 10, 20, 50, 100, 500) thiết kế guilloche, mỗi tờ 512x256, kèm sprite sheet animation tiền bay 8 frame
- Xúc xắc: 6 mặt khối ngà chấm đỏ, sprite sheet lăn 24 frame hoặc mô hình 2.5D quay
- Icon UI bộ 24 cái nét in lụa 2px: mua, đấu giá, búa đấu giá, thế chấp, chuộc, xây nhà, bán nhà, giao dịch, tù, chìa khoá ra tù, xúc xắc, đồng hồ, cảnh báo phá sản, cờ trắng đầu hàng
- Con dấu mộc: ĐÃ THẾ CHẤP, PHÁ SẢN, ĐÃ BÁN, TRÚNG ĐẤU GIÁ — PNG có alpha, nghiêng 12 độ, mực đỏ son loang
- Avatar khung: 4 khung ngồi bàn kiểu tem phiếu, có chỗ hiện tiền mặt, số ô sở hữu, đồng hồ đếm ngược dạng vòng cung
- Màn đấu giá: nền tối mờ + búa đấu giá + bảng số giá kiểu bảng lật cơ khí (flip-board), font mono
- Màn giao dịch: hai khay giấy tờ trái/phải, vùng kéo thả thẻ đất, thanh trượt tiền mặt kiểu con lăn
- Bảng tổng kết ván: poster dọc tổng kết theo phong cách áp phích, xếp hạng 1-4 kèm tổng tài sản và huy hiệu
- Font: Be Vietnam Pro (Regular, Bold, ExtraBold) + một font mono tabular cho số tiền (JetBrains Mono hoặc IBM Plex Mono)
- Âm thanh: xúc xắc lắc ống tre, đóng mộc, đếm tiền, chuông xe đạp báo lượt, còi tàu khi mua nhà ga, tiếng cửa sắt khi vào tù, fanfare đàn bầu khi thắng (7 file ogg + mp3)
- Nhạc chờ ghép cặp: 1 vòng lặp 40 giây đàn bầu + guitar phím lõm
- Lottie/JSON animation: quân nhảy ô, tiền bay từ người này sang người kia, nhà mọc lên, khách sạn thay 4 nhà, thẻ bài lật

## Ước lượng công sức

Đây là game TỐN CÔNG NHẤT trong cả 9 game của nền tảng, và không phải hơn một chút. Nói thẳng con số tương đối, lấy cờ caro làm đơn vị 1:

• cờ caro ≈ 1
• cờ gánh ≈ 1,5
• ô ăn quan ≈ 2
• cá ngựa ≈ 2,5
• cờ úp ≈ 4 (kế thừa được cờ tướng)
• cờ vua ≈ 4,5 (engine luật nhiều ngóc ngách, nhưng bot có sẵn lý thuyết minimax chuẩn)
• cờ tướng ≈ 4,5
• cờ vây ≈ 6 (engine luật ĐƠN GIẢN, nhưng bot mạnh thì gần như không làm nổi nếu không nhúng mạng nơ-ron)
• CỜ TỶ PHÚ ≈ 9–10

Ước lượng tuyệt đối cho một lập trình viên quen TypeScript, làm nghiêm túc có test:
• Engine luật thuần (init/apply/tick/view/finished/results) đầy đủ 40 ô, 32 thẻ, đấu giá, thế chấp, xây đều, nợ, phá sản: 7–9 ngày.
• Bộ test luật (cần ít nhất 120 ca, xem phần cạm bẫy): 3–4 ngày.
• Bot 3 mức + bảng Markov + rollout + tự đấu 2000 ván hiệu chỉnh: 4–5 ngày.
• UI riêng (bàn cờ 40 ô, animation quân đi, panel tài sản, màn đấu giá thời gian thực, màn giao dịch kéo thả, bảng tổng kết): 6–8 ngày. Riêng màn giao dịch đã bằng cả một game caro.
→ Tổng ~20–26 ngày-người. So với cờ caro làm xong trong 2–3 ngày kể cả UI.

Lý do khách quan khiến nó nặng, không phải do làm quá:
1. Đây là game DUY NHẤT trong bộ có hành động của người KHÔNG tới lượt (đấu giá, trả lời giao dịch). Máy trạng thái của nền tảng nếu thiết kế theo giả định "chỉ current player được apply" sẽ phải sửa lại vì game này.
2. Game duy nhất cần tick() thật sự để xử lý deadline không gắn với một người chơi.
3. Game duy nhất có kinh tế học: một sai số nhỏ trong công thức tiền thuê hay thứ tự thanh lý làm hỏng cân bằng cả ván mà test đơn vị không bắt được — phải test bằng mô phỏng thống kê.
4. Bot không có lý thuyết chuẩn để sao chép. Cờ vua/cờ tướng/caro copy minimax là xong; cờ tỷ phú phải tự dựng mô hình xác suất và tự hiệu chỉnh.
5. Số ca biên nhiều gấp bội: riêng phá sản dây chuyền (A phá sản chuyển ô thế chấp cho B, B không đủ tiền trả lãi nên B cũng vào nợ) đã là một hệ thống con.

KHUYẾN NGHỊ LỘ TRÌNH: đừng làm cờ tỷ phú đầu tiên và cũng đừng làm cuối cùng. Làm caro + cờ gánh trước để chốt khung nền tảng, rồi làm cờ tỷ phú NGAY SAU ĐÓ — vì nó là game duy nhất buộc khung phải hỗ trợ hành động ngoài lượt và tick; phát hiện muộn sẽ phải viết lại tầng phòng chơi. Nếu cần cắt phạm vi cho bản 1: tắt giao dịch (cfg.tradesEnabled=false) và tắt đấu giá (auctionOnDecline=false) — bớt được khoảng 6 ngày, ván vẫn chơi được, bật lại sau.
