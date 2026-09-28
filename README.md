# Nền tảng cờ online

Chơi cờ với người thật hoặc với bot, ghép cặp tự động hoặc tự mở phòng mời bạn.
Mười ba bộ môn, **tất cả đều là cờ hai người**: cờ caro, cờ gánh, ô ăn quan,
cờ đam, cờ lật, cờ hùm, cờ ba quân, cờ Hex, cờ vua, cờ tướng, cờ úp, cờ Nhật,
cờ vây. Mỗi game có bộ mặt mỹ thuật riêng trên một khung app chung.

> **Trạng thái:** đang dựng nền. Xem [Lộ trình](#lộ-trình) để biết cái gì đã
> chạy được và cái gì chưa. Không in con số bộ môn lên store cho tới khi bộ
> môn cuối cùng thật sự chạy.

### Vì sao chỉ cờ hai người

Cá ngựa và cờ tỷ phú đã bị **bỏ khỏi lộ trình**. Chúng là hai game duy nhất
cần nhiều hơn hai ghế, và chúng kéo theo ba thứ mà mười ba game còn lại không
cần: bàn 4 ghế, ghép cặp phải chờ đủ người, và bot phải thay ghế người bỏ
trận. Cờ tỷ phú còn cần đồng hồ đếm ngược thời gian thực và đấu giá đồng thời
— chính tài liệu thẩm định kiến trúc đã dự đoán nó sẽ "cưỡng ép" hợp đồng
engine khoảng 20%.

Bỏ hai game đó, mọi bàn đều là 1v1: hàng chờ ghép được ngay khi có hai người,
người bỏ trận là xử thua chứ không cần bot chen vào giữa ván, và không còn
game nào cần `realtime`. Đổi lại, số bộ môn tăng từ 9 lên 13.

## Ý tưởng trung tâm

Luật chơi sống trong **hàm thuần**. Không I/O, không đồng hồ tường, không
`Math.random`. Máy chủ là trọng tài duy nhất; client chỉ gửi ý định và nhận về
đúng phần nó được phép thấy.

Nhờ vậy ba việc khó đều thành cùng một cơ chế: khôi phục sau sự cố, phát lại
để xử tranh chấp, và cho bot chơi — bot chỉ là một nguồn input bên ngoài đi
qua đúng cổng như người.

## Cây thư mục

```
packages/
  core/                 hợp đồng engine, RNG có con trỏ, registry,
                        lớp bọc meta-action, bộ kiểm hợp đồng
  game-co-caro/         engine + bot cờ caro
  game-co-ganh/         engine + bot cờ gánh
  game-o-an-quan/       engine + bot ô ăn quan
  protocol/             giao thức client ↔ máy chủ — hai bên cùng dùng một bản
apps/
  mobile/               app Expo: sảnh + màn chơi, mỗi game một bộ mặt
  server/               máy chủ trọng tài: phòng, ghép cặp, đồng hồ, WebSocket,
                        tài khoản và bạn bè (SQLite)
tools/
  screenshot.mjs        chụp màn hình app thật để kiểm chứng giao diện
  two-players.mjs       hai cửa sổ trình duyệt đánh nhau qua máy chủ thật
docs/
  ARCHITECTURE.md       hợp đồng ràng buộc — đọc cái này trước
  architecture-review.md biên bản thẩm định kiến trúc
  rules/*.md            đặc tả luật từng game, là nguồn chân lý về luật
```

## Chạy thử

```bash
npm install
npm run build      # biên dịch packages/
npm test           # 82 test: hợp đồng engine + luật ba game + bot + máy chủ

npm run web        # đóng gói app cho web để xem thử
npm run serve      # mở ở http://localhost:8080
npm run shot       # chụp màn hình thật vào docs/screenshots/
```

Ảnh trong `docs/screenshots/` **luôn chụp từ app chạy thật**, bằng Chromium ở
đúng kích thước điện thoại, bấm đúng như người dùng bấm — kể cả ván thắng ở
ảnh cuối cũng là bấm từng ô cho tới khi thắng thật. Ảnh dựng tay thì không
chứng minh được gì.

## Chín ràng buộc

`docs/ARCHITECTURE.md` liệt kê chín ràng buộc bắt buộc. Chúng không phải sở
thích phong cách: mỗi cái sửa một lỗi mà **hai kiến trúc dựng độc lập đều
mắc**, và tất cả đều là lỗi *im lặng* — không làm sập gì, chỉ âm thầm sai cho
tới lúc quá muộn.

Vài cái đắt nhất:

- **`events` phải đi chung một cửa với `view`.** Tuyên bố `view()` là cửa duy
  nhất rồi phát `events[]` thẳng ra dây là mở đường rò thứ hai. Ở cá ngựa thì
  vô hại; ở cờ úp một event mang theo quân vừa lật là lộ bài. Bug kiểu này
  sống sót qua sáu game rồi giết ở game thứ bảy.
- **Con trỏ RNG nằm trong state.** Nếu nó sống ngoài state, phòng khôi phục từ
  snapshot sẽ rút seed từ sai vị trí. Xúc xắc lệch, replay ra kết quả khác
  trận thật, và không có lỗi nào nổ ra.
- **`GameId` là `string`.** Union đóng trong package lõi biến game thứ mười
  thành một lần sửa file lõi rồi chạy theo mọi `switch` exhaustive trong
  matchmaker, enum DB và bot dispatcher.

`npm test` biên dịch lại **toàn bộ** (`tsc --build --force`) chứ không dựa
vào bản dựng tăng dần. Đã có lần bản dựng tăng dần bỏ sót một file test vừa
sửa, và bộ test chạy bản cũ rồi báo xanh — một bộ test âm thầm không chạy
bài mới thì còn tệ hơn không có bộ test.

Tài liệu không chặn được lỗi im lặng; chỉ test mới chặn được. Nên mỗi engine
phải gọi `runEngineConformance()`, và bản thân bộ kiểm cũng có test chứng minh
nó **bắt được** ba lỗi trên (`packages/core/src/testkit.test.ts`) — một bộ kiểm
không bao giờ đỏ thì chỉ là trang trí.

## Thêm một game

1. Viết `docs/rules/<id>.md` trước. Luật chốt ở tài liệu, không chốt trong đầu.
2. `packages/game-<id>/` — cài `Engine<S, A, V, Ev>`. `S` phải mang `ply` và
   `rngCursor`.
3. Test gọi `runEngineConformance()`. Không xanh thì chưa xong. Game cờ thì
   viết thêm **perft**: đếm toàn bộ cây nước đi tới vài tầng rồi đối chiếu
   với bảng trong `docs/rules/`. Sai bất kỳ chỗ nào trong luật cũng làm lệch
   con số, và nó chỉ ra luôn tầng nào bắt đầu sai.
4. `registry.register(withStandardMeta(engine))`. Lõi không cần biết tên game.

Không sửa file nào trong `packages/core` để thêm game. Phải sửa nghĩa là hợp
đồng thiếu một chỗ — sửa hợp đồng cho mọi bộ môn, đừng đặc cách một game.

## Lộ trình

| Hạng mục | Trạng thái |
|---|---|
| Khảo sát luật 13 bộ môn | ✅ `docs/rules/` |
| Thẩm định kiến trúc | ✅ `docs/architecture-review.md` |
| Hợp đồng engine + bộ kiểm | ✅ `packages/core` |
| Cờ caro (engine + bot) | ✅ |
| Cờ gánh (engine + bot, perft khớp bảng chuẩn) | ✅ |
| Ô ăn quan (engine + bot) | ✅ |
| App di động + sảnh + ba bàn cờ chơi với máy: gợi ý, lùi lại, tỉ số phiên | ✅ |
| Máy chủ: phòng, ghép cặp, đồng hồ, chống gửi lặp | ✅ `apps/server` |
| App nối máy chủ: ghép cặp, tạo phòng, vào mã — chơi với người thật | ✅ |
| Tài khoản: đăng ký, đăng nhập, Google | ✅ `apps/server/src/accounts.ts` |
| Trang cá nhân: điểm Elo từng bộ môn, lịch sử trận, chuỗi, con dấu, xoá tài khoản | ✅ |
| Bạn bè: kết bạn, tỷ thí, xoá, chặn | ⏳ API xong, chưa có giao diện |
| Nhắn tin: chung, riêng, trong phòng, thông báo hệ thống | ⏳ |
| Hàng đợi bot chạy trên máy chủ | ⏳ |
| Cờ lật, cờ ba quân, cờ Hex (luật gọn, làm trước) | ⏳ |
| Cờ hùm (dùng lại bàn Alquerque của cờ gánh) | ⏳ |
| Cờ đam | ⏳ |
| Cờ vua, cờ tướng, cờ úp | ⏳ |
| Cờ Nhật (shogi) | ⏳ |
| Cờ vây | ⏳ tốn công gấp nhiều lần phần còn lại |
