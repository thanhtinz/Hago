# Nền tảng cờ online

Chơi cờ với người thật hoặc với bot, ghép cặp tự động hoặc tự mở phòng mời bạn.
Chín bộ môn: cờ caro, cờ gánh, ô ăn quan, cờ vua, cờ úp, cá ngựa, cờ tướng,
cờ vây, cờ tỷ phú. Mỗi game có bộ mặt mỹ thuật riêng trên một khung app chung.

> **Trạng thái:** đang dựng nền. Xem [Lộ trình](#lộ-trình) để biết cái gì đã
> chạy được và cái gì chưa. Chưa hứa đủ chín game cho tới khi game thứ chín
> thật sự lên store.

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
apps/
  mobile/               app Expo: sảnh + màn chơi, mỗi game một bộ mặt
tools/
  screenshot.mjs        chụp màn hình app thật để kiểm chứng giao diện
docs/
  ARCHITECTURE.md       hợp đồng ràng buộc — đọc cái này trước
  architecture-review.md biên bản thẩm định kiến trúc
  rules/*.md            đặc tả luật từng game, là nguồn chân lý về luật
```

## Chạy thử

```bash
npm install
npm run build      # biên dịch packages/
npm test           # 46 test: hợp đồng engine + luật ba game + bot

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
đồng thiếu một chỗ — sửa hợp đồng cho cả chín game, đừng đặc cách một game.

## Lộ trình

| Hạng mục | Trạng thái |
|---|---|
| Khảo sát luật 9 game | ✅ `docs/rules/` |
| Thẩm định kiến trúc | ✅ `docs/architecture-review.md` |
| Hợp đồng engine + bộ kiểm | ✅ `packages/core` |
| Cờ caro (engine + bot) | ✅ |
| Cờ gánh (engine + bot, perft khớp bảng chuẩn) | ✅ |
| Ô ăn quan (engine + bot) | ✅ |
| App di động + sảnh + ba bàn cờ chơi với máy: gợi ý, lùi lại, tỉ số phiên | ✅ |
| Máy chủ: phòng, ghép cặp, hàng đợi bot | ⏳ |
| App di động | ⏳ |
| Cờ vua, cờ tướng, cờ úp, cá ngựa | ⏳ |
| Cờ vây, cờ tỷ phú | ⏳ tốn công gấp nhiều lần phần còn lại |
