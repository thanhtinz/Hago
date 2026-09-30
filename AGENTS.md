# Quy ước làm việc trong repo này

> Tài liệu này dành cho **người và cho agent**. `CLAUDE.md` trỏ về đây, nên chỉ
> có một nơi phải sửa. Cấu trúc mượn của [affaan-m/ecc](https://github.com/affaan-m/ecc)
> — tách "luật luôn nạp" ra khỏi mã nguồn thì luật mới sống lâu hơn một phiên
> làm việc.

## 0. Ba điều không thương lượng

1. **Tác giả là thanhtinz.** Mọi commit đi bằng
   `git -c user.name=thanhtinz -c user.email=thanhtinz23072003@gmail.com`.
   Không có dòng đồng tác giả, không nhắc tới công cụ nào trong commit, PR,
   hay mã nguồn.
2. **Đẩy thẳng lên `main`.** Không tạo nhánh.
3. **Không dùng emoji** ở bất cứ đâu trong giao diện. Biểu tượng vẽ bằng SVG
   trong `apps/mobile/src/ui/Icon.tsx`.

## 1. Nguồn chân lý

| Câu hỏi | Trả lời ở đâu |
|---|---|
| Luật một bộ môn chơi thế nào | `docs/rules/<game>.md` — **sửa ở đây trước, rồi mới sửa mã** |
| Hợp đồng engine, chín ràng buộc R1–R9 | `docs/ARCHITECTURE.md` |
| Vì sao hợp đồng có hình dạng đó | `docs/architecture-review.md` — **biên bản lịch sử, không sửa cho khớp hiện tại** |
| Cái gì đã chạy, cái gì chưa | `README.md`, mục Lộ trình |

## 2. Vòng làm việc

```
đọc luật -> viết test -> cài engine -> perft -> ảnh chụp thật -> đẩy main
```

- **Làm xong cái nào đẩy cái đó.** Không gom năm việc vào một lần đẩy.
- **Mọi khẳng định về giao diện phải có ảnh chụp app thật**, chụp bằng
  `node tools/screenshot.mjs`. Không mô tả bằng lời, không ảnh dựng tay.
- Báo cáo đúng sự thật: test đỏ thì nói đỏ kèm log; bỏ qua bước nào thì nói rõ.

## 3. Engine — bốn luật cứng

1. **Hàm thuần.** Không I/O, không đồng hồ tường, không `Math.random`.
   Ngẫu nhiên đi qua `makeRng(seed, cursor)`, và **con trỏ nằm trong state**
   (ràng buộc R2 — `applyChecked` sẽ ném lỗi nếu quên).
2. **Perft là mốc đúng-sai của luật**, không phải test viết tay. Bảng perft
   nằm trong `docs/rules/<game>.md`. Perft đã bắt được một lỗi luật cờ gánh mà
   không bài test tay nào thấy, và nó chỉ đúng **độ sâu** nơi bắt đầu lệch.
3. **Dữ liệu ra khỏi máy chủ chỉ qua `view(state, seat)`**, kể cả `events`.
   Phát `events` thẳng ra dây là đường rò bí mật thứ hai (R1).
4. **Bộ kiểm hợp đồng** `runEngineConformance()` chạy cho mọi engine. Nó đã
   phát hiện một lỗi trong lõi mà hai game khác giấu suốt nhiều tuần.

## 4. Test

```bash
npm test        # tsc --build --force + toàn bộ test
```

- `--force` là bắt buộc. Biên dịch tăng dần đã **hai lần** làm một bài test mới
  im lặng không chạy trong khi suite vẫn báo xanh.
- Thêm một package thì **phải thêm tham chiếu vào `tsconfig.json` gốc**, nếu
  không `npm test` sẽ chạy trên bản dịch cũ.
- CI chạy cả hai việc trên GitHub Actions: `luat` (kiểu + test) và `giao-dien`
  (build web thật, bấm như người dùng, thoát khác 0 nếu có lỗi console).
- Bài kiểm giao diện dùng chung `tools/lib.mjs` (mở trình duyệt, đăng ký, chụp
  ảnh, kết bài). Đừng chép lại — bảy bản chép thì sửa một chỗ vẫn sai sáu chỗ.
- **Tên ảnh chụp là khoá toàn cục.** Hai harness đặt trùng số thì bài chạy sau
  ghi đè bài chạy trước và cả hai vẫn báo xanh.

## 5. Giao diện

- Tiếng Việt, ưu tiên điện thoại, một khung app chung nhưng **mỗi bộ môn một
  bộ mặt riêng** (`apps/mobile/src/games/faces.tsx`).
- **Mọi thứ có mép nhìn thấy quanh bàn cờ đều bị đọc thành "cái khung".** Lỗi
  này đã lặp lại sáu lần với sáu nguyên nhân khác nhau: khung ảnh cao cố định
  không khớp tỉ lệ, `box-shadow` trên phần tử chưa bo góc, vệt sáng quét, quầng
  mặt trời, đốm tô phẳng độ mờ thấp, và hoạ tiết dừng lại ở khung bao của SVG.
  Cách chữa: khớp `aspectRatio`, đặt `borderRadius` lên đúng phần tử mang bóng
  đổ, và dùng gradient tắt hẳn về 0 ở ngoài khung nhìn.
- Bàn cờ nào **là vật thật** (tờ giấy cờ caro trên bàn) thì giữ mép và bóng đổ.
  Bàn cờ nào **vẽ lên mặt nền** (cờ gánh, ô ăn quan) thì tuyệt đối không có mép.
- **Soi ảnh chụp ở mức phóng to** trước khi báo xong. `tools/crop.mjs`.
- Thứ không chụp ảnh được (âm thanh, rung) thì kiểm bằng cách khác: đặt bẫy
  lên `AudioContext` trước khi trang chạy rồi đếm số dao động. Thứ chụp được
  nhưng khó đếm (một vệt trong SVG) thì gắn `testID` và đếm thẳng nó — đếm
  số thẻ `<line>` là đếm cả hoạ tiết nền.
- **Vùng chạm 44 điểm, chữ từ 11 điểm trở lên.** Nút nào bố cục không cho
  cao 44 thì thêm `hitSlop={SLOP}` — trừ khi nó đứng sát nút khác trên cùng
  một hàng, vì hitSlop của hai nút cạnh nhau chồng lên nhau và hệ điều hành
  tự chọn hộ. Ô bàn cờ 15×15 không thể đạt 44: ở ván không hoàn tác được thì
  chạm lần đầu chỉ **ướm**, chạm lại mới đặt.
- **Mọi `Pressable` tự dựng đều dùng `press` từ `parts.tsx`.** Không phản hồi
  khi chạm là lỗi cảm giác lớn nhất trên di động, và đã có ba mươi tám chỗ
  vi phạm chính luật viết trong tệp đó.
- **Tấm dán đáy màn có ô nhập thì phải có `KeyboardAvoidingView`.** iOS không
  bao giờ tự co màn hộ.
- **Nút quay lại cứng của Android**: mọi lớp phủ gọi `useBackClose`. Hộp thoại
  ở đây là state chứ không phải màn của router, nên hệ điều hành không biết
  chúng tồn tại — và Chromium thì không có nút đó, nên **ảnh chụp không bao
  giờ bắt được lỗi này**.
- **Nút chat nổi trên mọi màn.** Màn nào có nút dán sát mép phải thì chừa
  `CHAT_SPACE` — nằm dưới nút nổi thì bấm không được mà nhìn thì vẫn thấy.
  Đã dính ba lần ở ba màn khác nhau, và cả ba lần chỉ lộ ra khi bài kiểm
  Playwright báo "subtree intercepts pointer events", không lộ ra khi nhìn ảnh.
- **Việc có hạn giờ phải nổi lên ở mọi màn.** Lời rủ đấu hết hạn sau hai
  phút; để nó thành một chấm đỏ mà người dùng phải đoán ra rồi đi tìm đúng
  màn thì phần lớn lời rủ chết già.
- **Nền mờ phải nằm cạnh tấm, không bọc quanh tấm.** Bọc quanh thì chạm vào
  tiêu đề hay khoảng trống bên trong cũng rơi xuống phần tử cha và tấm tự đóng.
- Hộp thoại dùng `Sheet` và `Confirm` ở `src/ui/Sheet.tsx`, không dựng tay.
  Ba bản chép trước đây lệch nhau độ mờ nền, bo góc, và chỉ một trong ba chừa
  vùng an toàn dưới đáy.
- **Việc không lùi lại được thì phải hỏi lại**: xin thua, xoá bạn, xoá tài
  khoản. Nút đồng ý mang màu của việc sắp làm (đỏ son cho mất mát) và nằm bên
  phải; tay quen bấm góc phải nên màu là thứ duy nhất kịp chặn lại.

## 6. Máy chủ

- `apps/server/src/rooms.ts` **không biết gì về WebSocket**, và nhận `now` từ
  ngoài (`tick(now)`) để test tua đồng hồ trong một phần nghìn giây.
- **Chặn gửi lặp nonce trước khi kiểm luật.** Nước đã đánh không còn hợp lệ
  nữa, kiểm luật trước là mỗi lần client mất mạng retry đều nhận `ILLEGAL`.
- `flag` và `abandon` chỉ máy chủ phát được. Nhận từ client là mở đường cho ai
  cũng tự tuyên bố đối thủ hết giờ.
- **Mọi dữ liệu ngoài đi vào máy chủ phải qua `parse.ts`.** `ClientMsg` là
  kiểu TypeScript và kiểu biến mất sau khi biên dịch: ép `JSON.parse(...) as
  ClientMsg` rồi đưa thẳng vào `Rooms` thì `{t:'join',code:5}` chạy tới
  `code.toUpperCase()`, ném, thoát ra thành `uncaughtException`, và **xoá
  sạch mọi ván đang chạy của mọi người** vì chúng chỉ sống trong bộ nhớ.
- **Đừng băm mật khẩu đồng bộ.** `scryptSync` tốn ~40ms và Node chỉ có một
  luồng: 25 yêu cầu đăng nhập mỗi giây là đóng băng cả máy chủ, đồng hồ mọi
  ván đứng lại. Dùng bản bất đồng bộ, và có giới hạn tần suất ở cửa.
- **Lời báo lỗi giống nhau chưa đủ — thời gian trả lời cũng là câu trả lời.**
  Đăng nhập với email không tồn tại vẫn phải băm một bản giả.
- **Đồng hồ do máy chủ phát nhịp, client không tự đếm.** Client tự đếm thì
  phải đoán cả phần ân hạn, và hai máy đoán ra hai con số khác nhau — con số
  người chơi nhìn và con số máy chủ dùng để xử hết giờ phải là một. Nhịp chỉ
  gửi khi **chữ số giây** đổi, không phải mỗi 250ms.
- **Đừng gửi lại ý định trong đường dẫn khi máy chủ vừa nối lại ghế cũ.**
  `quick` và `create` ở máy chủ đều rời phòng hiện tại trước, nên gửi lại
  sau khi bấm F5 giữa ván **là tự bỏ trận**. `welcome` mang theo `inRoom`,
  và cờ đó dùng **một lần** — màn nào mở ra trước thì tiêu thụ nó.
- **Luật có một nước thì giao diện phải có chỗ bấm nước đó.** Lớp meta có
  `accept-draw` từ ngày đầu và máy chủ vẫn phát sự kiện cầu hoà xuống, nhưng
  màn chơi không đọc `events`, nên suốt thời gian đó mọi lời cầu hoà trong
  ván với người thật rơi vào hư không mà không báo lỗi ở đâu cả.

## 7. Tài khoản và dữ liệu lâu dài

- **Lưu log input, không lưu thế cờ.** Xem lại một ván là tải vài trăm byte
  log về rồi dựng lại bằng chính engine đã đánh ván đó (`replayFrames`).
  Không có ảnh chụp thế cờ nào phải giữ đồng bộ, và ván xem lại không thể
  khác ván đã đánh. Đây là chỗ ràng buộc R1 trả công.

- **Thêm cột thì phải thêm vào `migrate()` trong `db.ts`.** `CREATE TABLE IF
  NOT EXISTS` chỉ chạy lần đầu, nên sửa câu lệnh tạo bảng **không** đụng tới
  tệp `.db` đã có — máy chủ đang chạy thật sẽ báo "no such column" ở đúng
  câu truy vấn mới, còn test với `:memory:` thì xanh.

- Kho là **SQLite qua `node:sqlite`** (`apps/server/src/db.ts`), không thêm
  dịch vụ nào. Nó sẽ hết cửa khi cần chạy nhiều tiến trình máy chủ; mọi câu
  lệnh là SQL chuẩn nên đường đổi sang Postgres là đổi driver.
- **Trận đang chạy không nằm trong cơ sở dữ liệu.** `Rooms` vẫn giữ trong bộ
  nhớ. Ghi mỗi nước cờ xuống đĩa là biến ván cờ thành hàng đợi I/O.
- Mật khẩu băm bằng **scrypt** có muối riêng từng người. Không bao giờ dùng
  một hàm băm nhanh: rò cơ sở dữ liệu sẽ thành rò mật khẩu.
- "Email chưa đăng ký" và "sai mật khẩu" trả **cùng một lời báo lỗi**. Khác
  nhau là cho không một công cụ dò xem email nào đã có tài khoản.
- Đăng nhập Google: máy chủ **tự kiểm chữ ký** ID token, và phải kiểm cả `aud`
  — không kiểm `aud` thì token Google cấp cho ứng dụng bất kỳ khác cũng vào
  được. Không bao giờ nhận `sub` client gửi thẳng.
- **Không có tài khoản khách.** Ba chế độ online đòi đăng nhập thật; đấu với
  máy thì không đòi gì. Tài khoản khách chỉ sống trên đúng một trình duyệt,
  nên mọi thành tích nó ghi được đều sẽ mất, và người chơi chỉ phát hiện ra
  sau vài chục ván.
- **Điểm Elo tính riêng từng bộ môn.** Mạnh cờ caro không nói gì về cờ vây.
  `K` lớn trong 30 ván đầu rồi nhỏ lại.
- **`Outcome.reason` phải trung lập**, không đứng về bên nào. "đối thủ đầu
  hàng" chỉ đúng với bên thắng; cùng chuỗi đó trong lịch sử bên thua thành
  "THUA · đối thủ đầu hàng", tự mâu thuẫn trên một dòng.
- Lịch sử trận **chép sẵn tên hai bên**. Đối thủ xoá tài khoản thì lịch sử của
  mình vẫn đọc được, thay vì thành một hàng trống.
- Chỉ **ván ghép cặp** vào sổ thành tích. Phòng riêng mở bằng mã thì không:
  hai người quen nhau thay nhau xin thua là bơm điểm xong.
- `PRAGMA foreign_keys = ON` phải bật tay. SQLite mặc định **im lặng bỏ qua**
  mọi ràng buộc khoá ngoại.

## 8. Trang cá nhân

Nguyên tắc: **mỗi con số phải đến từ một ván có thật**. Không huy hiệu trang
trí, không thanh tiến độ tới một cấp bậc không tồn tại, không biểu đồ cho ba
điểm dữ liệu. Chưa đánh ván nào thì nói thẳng là chưa có gì, chứ không bày một
bộ khung rỗng trông như đang hỏng.

Ảnh đại diện: **tải ảnh lên, hoặc chọn một trong mười bốn con dấu** (quân cờ
tướng, chữ triện). Bản đầu tôi vẽ thêm sen, tre, nón, rồng bằng nét SVG; ở cỡ
46 điểm chúng đọc ra thành dấu thăng, tam giác cảnh báo và một nét nguệch
ngoạc. Chữ khắc thì cỡ nào cũng sắc.

Nhận tệp của người lạ rồi phát lại cho người lạ khác là chỗ dễ hỏng nhất trong
máy chủ. Sáu quy tắc trong `apps/server/src/uploads.ts`, mỗi cái một lý do:
đọc dấu nhận dạng trong tệp chứ không tin `Content-Type`; **từ chối SVG** (SVG
chạy được JavaScript — phát nó từ cùng tên miền là XSS lưu trữ); tên tệp do máy
chủ sinh; phát kèm `X-Content-Type-Options: nosniff`; có trần dung lượng; và
xoá tệp cũ khi đổi ảnh. App cắt vuông, thu về 256 điểm và mã hoá lại thành JPEG
**trước khi gửi** — việc vẽ lại qua canvas cũng xoá sạch EXIF, trong đó có toạ
độ GPS nơi chụp.

Chọn ảnh mới chạy trên web. Bản gói cho iOS/Android cần `expo-image-picker`;
chưa cài thì nút nói thẳng là chỉ chạy trên web, không mở một hộp thoại không
bao giờ hiện ra.

**Lịch sử trận phân trang theo con trỏ `before`, không theo số trang.** Danh
sách mọc thêm ở đầu mỗi khi đánh xong một ván, nên `OFFSET 20` sẽ trả lại một
hàng đã thấy ở trang trước. Có test dựng đúng tình huống đó: lấy trang một,
đánh thêm một ván, rồi lấy trang hai.

**Một dây nối cho cả app** (`src/net/live.ts`), mở khi đăng nhập ở
`app/_layout.tsx`. Trước đây mỗi màn chơi tự mở một socket rồi đóng khi rời
màn — cách đó không nhận được gì khi người dùng đang ở sảnh hay danh sách
bạn, mà lời rủ đấu và tin nhắn thì đến đúng lúc đó.

Hàng đợi ý định trong `GameClient` là **mảng**, không phải một ô: dây chung có
thể nhận "theo dõi danh sách bạn" và "vào hàng chờ" trước khi socket mở xong,
và giữ mỗi cái cuối là im lặng đánh rơi cái đầu.

**Chỉ bạn bè mới rủ nhau được**, và `Rooms` không tự biết điều đó — nó không
đọc cơ sở dữ liệu. Câu hỏi đó trả lời qua `mayChallenge` ở `index.ts`.

**Tên kênh nhắn tin quyết định ai đọc được** (`apps/server/src/chat.ts`):
`chung`, `rieng:<a>|<b>` (hai id **sắp xếp**, nếu không thì A nhắn vào `A|B`
còn B nhắn vào `B|A` và hai người nhìn hai cuộc trò chuyện khác nhau),
`phong:<mã>`, `he-thong`. Máy chủ **luôn kiểm lại quyền vào kênh**: id người
dùng nằm ngay trong đường dẫn hồ sơ, không phải bí mật, nên không kiểm là ai
gõ đúng tên kênh cũng đọc được cuộc trò chuyện của hai người lạ.

Chưa đọc lưu bằng **một mốc `last_id` mỗi người mỗi kênh**, không phải một cờ
trên từng tin: chưa đọc = đếm tin có id lớn hơn mốc, một câu truy vấn. Mốc chỉ
tiến, không lùi — tin cũ tới muộn không được làm tin đã đọc thành chưa đọc.

**Trong ván, nút chat chỉ mở chat phòng** và không hiện số chưa đọc của bên
ngoài — một con số dẫn tới chỗ không có gì còn tệ hơn không có con số nào.

**Gửi một tin là đã đọc cả kênh.** Trả lời xong mà vẫn còn chấm đỏ trên chính
cuộc trò chuyện mình vừa gõ vào là thứ người dùng thấy sai ngay lập tức.

Kênh `he-thong` **đọc được nhưng không gửi vào được**: một người dùng gửi được
vào kênh hệ thống là một người dùng giả danh được máy chủ. Phát thông báo đi
qua `POST /api/admin/notice` có `ADMIN_TOKEN`, và **tắt hẳn khi chưa đặt biến
đó** — một đường phát thông báo cho toàn bộ người dùng mà để mở là món quà cho
bất kỳ ai tìm thấy nó.

Nút nổi kéo được dùng **mốc thời gian** để phân biệt kéo với bấm, không dùng
cờ đúng/sai: cú kéo trên web sinh ra một `click` ngay sau khi thả, và một cờ
chỉ đặt lại lúc bắt đầu cử chỉ sau thì giữ nguyên `true` qua mọi cú bấm —
nút không bao giờ mở được nữa sau lần kéo đầu tiên.

**Ô chưa chọn phải có mặt thật.** Thẻ, chip và hàng lựa chọn dùng
`src/ui/Tabs.tsx`; ô chưa chọn nền `A.panel`, viền `A.line`, chữ `A.inkSoft`.
Bản đầu để nền trong suốt với viền `A.lineSoft` và chữ `A.inkFaint`: trên nền
gỗ tối cả ba gần như cùng một màu, ô chưa chọn tan vào nền, và người dùng chỉ
thấy đúng một ô đang chọn trôi lơ lửng chứ không đọc ra đây là một hàng bấm
được. Tương phản giữa hai trạng thái vẫn còn nguyên nhờ nền vàng và chữ đậm.

## 9. Điều hướng trong app

Khôi phục phiên đăng nhập nằm ở **lớp ngoài cùng** (`app/_layout.tsx`), không
ở sảnh. Để trong sảnh thì mở thẳng `/me`, `/online/...`, hay chỉ bấm F5 khi
đang ở trang cá nhân, sẽ không bao giờ chạy tới nó — màn hình trắng trơn,
không báo lỗi gì để lần theo.

Về sảnh thì dùng `backToLobby(router)` (`src/nav.ts`), **không** dùng
`router.replace('/')`. `replace` từ một màn được `push` lên trên sảnh chỉ thay
màn trên cùng, sảnh cũ vẫn nằm dưới, và app có hai sảnh cùng gắn vào cây: mọi
nút có hai bản, mỗi màn chơi online mở thêm một socket. Đã mắc lỗi này ở cả ba
màn cùng lúc.

## 10. `registry.get` ném, không trả về `undefined`

`registry.get(id)` **ném** khi bộ môn chưa đăng ký. Viết
`const e = registry.get(id); if (!e) …` là một cái chốt không bao giờ đóng:
nhánh xử lý nằm sau chỗ đã ném, nên người dùng nhận "máy chủ gặp lỗi" thay
cho câu đúng. Hỏi `registry.has(id)` trước. Lỗi này từng nằm cùng lúc ở bốn
chỗ — hai chỗ trong `rooms.ts`, một trong `serve.ts`, một ở màn xem lại.

Mười ba bộ môn có mặt trong `faces.ts` và trong `src/games/rules.ts`, nhưng
chỉ ba bộ có engine. Mọi màn đọc theo tên bộ môn phải chạy được cho **cả
mười ba**, kể cả mười bộ chưa mở.

## 11. Khán giả

Khán giả nhận **đúng hai thông điệp người chơi nhận** — `room` và `state` —
chỉ khác `yourSeat: null`. Không đắp một đường dữ liệu riêng cho khán giả:
đường thứ hai là đường không ai canh, và nó sẽ rò đúng thứ mà
`view(state, seat)` sinh ra để che.

Khán giả nhìn bàn qua **con mắt của ghế 0**. Chỉ hợp lệ vì `spectate()` chặn
bộ môn có `spec.hiddenInfo`. Khi có bộ môn giấu bài, cái chặn đó là chỗ duy
nhất phải nhớ — không phải rải điều kiện khắp `pushState`.

Ba cửa `spectate()` phải qua: phòng có mật khẩu thì không (khoá cửa rồi mà
vẫn phát tên hai người ra sảnh thì cái khoá chỉ khoá nước đi), bộ môn giấu
bài thì không, và người **đang có ván của mình** thì không — đổi một ván
đang đánh lấy một ghế ngồi xem là cú bấm nhầm không gỡ lại được.

`Player.fanOf` tách hẳn khỏi `Player.code`. Dùng chung một trường thì khán
giả rời chỗ sẽ chạy qua `leave()`, mà `leave()` xoá lời xin đấu lại và tuyên
bố bỏ trận. Một người ngồi xem không có ghế để bỏ.

## 12. Sảnh phải nói phòng nào đang chờ

`join()` phải gọi `pushLobby()` ở cuối. Vào phòng là đổi **cả hai** danh
sách cùng lúc: phòng đó rời mục "đang chờ" và, nếu đã đủ người, nhảy sang
mục "đang đánh". Thiếu dòng đó thì cả hai mục đứng sai cho tới lúc tình cờ
có ai vào hoặc ra — và bài test đọc thông điệp `lobby` cuối cùng sẽ thấy
một ảnh chụp từ trước lúc join.

Mọi trường mới trong `lobby` phải đọc bằng `?? []` ở client. Máy chủ cũ hơn
app một bản thì trường đó vắng mặt, và một màn sảnh trắng vì
`undefined.length` là cách tệ nhất để nói "máy chủ chưa cập nhật". Đã dính
đúng lỗi này ngay lần chạy đầu của `phong-cho.mjs`.

## 13. Ba con số nói ba điều khác nhau

`packages/protocol/src/xephang.ts` giữ cả ba, và cả máy chủ lẫn app cùng
đọc từ đó. Hai bản chép là hai bản lệch nhau ngay lần chỉnh đầu tiên.

- **Danh hiệu** đo mạnh yếu, dẫn từ Elo, và chỉ có nghĩa **kèm tên bộ môn** —
  Elo tính riêng từng bộ môn nên một danh hiệu đứng một mình là số bịa.
  `danhHieuOf` nhận **hai** tham số: không có `ranked` thì tài khoản vừa
  đăng ký đọc ra "Kỳ thủ" ngay, vì 1200 nằm giữa dải đó.
- **Cấp độ** đo số ván đã đánh, dẫn xuất từ `stats`, **không lưu cột**. Nhờ
  thế nó hồi tố. Giá phải trả: đổi trọng số là viết lại cấp của mọi người
  trong im lặng, nên bốn con số đó coi như đóng băng.
- **Thông thạo** đo mức gắn bó với một bộ môn và **không cộng thêm cho ván
  thắng**. Một con số vừa thưởng thắng vừa tự xưng không đo trình độ thì nó
  là một cái Elo thứ hai yếu hơn, đứng ngay cạnh Elo thật.

Bảng **Tổng** không gắn danh hiệu: nó là `SUM(rating - 1200)` của nhiều bộ
môn, không phải một thang Elo.

`stats.ranked` là cột duy nhất thêm mới. Ngưỡng lên bảng và đầu vào K của
`eloDelta` đều đếm cột này, không đếm `win+draw+loss` — không tách thì năm
ván tự xin thua với một tài khoản phụ là đủ lên bảng xếp hạng.

## 14. Đổ lại dữ liệu cũ: một hàm riêng, chốt bằng bảng `meta`

Thêm cột thì phải sửa **cả** `SCHEMA` lẫn mảng `migrate()`. Thêm **bảng**
thì chỉ `SCHEMA` — `db.exec(SCHEMA)` chạy mỗi lần mở nên
`CREATE TABLE IF NOT EXISTS` tạo được bảng trên kho đã có, còn `migrate()`
thì không tạo bảng được.

Đổ lại dữ liệu cho cột mới **không được** nằm chung `try` với `ALTER`:
`ALTER` ném ngay ở lần mở thứ hai, `catch` nuốt lỗi, không ai gọi
`ROLLBACK`, và kết nối kẹt trong transaction suốt đời tiến trình —
`recordMatch` nhận "cannot start a transaction within a transaction" và
**mọi ván kết thúc đều không ghi được**. Tách thành `backfill()` riêng,
chốt bằng bảng `meta`.

Bài kiểm di trú phải chạy trên **tệp thật** (`apps/server/src/db.test.ts`):
kho `:memory:` luôn mới tinh nên nó nuốt trôi mọi câu `ALTER` và mọi bài
test đều xanh trong khi máy chủ thật báo "no such column".

## 15. `ScrollView` ngang trong một cột flex phải có `flexGrow: 0`

Không có nó thì khi danh sách bên dưới ngắn, hàng thẻ nở ra ăn hết chỗ
trống và bốn cái thẻ bị kéo cao gần nửa màn hình. Lỗi này nấp rất lâu vì
bảng trong lúc kiểm luôn có nhiều hàng; nó chỉ lộ ra ở đúng cảnh một nền
tảng mới có hai người — tức là cảnh thật.
