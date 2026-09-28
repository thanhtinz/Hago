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

## 6. Máy chủ

- `apps/server/src/rooms.ts` **không biết gì về WebSocket**, và nhận `now` từ
  ngoài (`tick(now)`) để test tua đồng hồ trong một phần nghìn giây.
- **Chặn gửi lặp nonce trước khi kiểm luật.** Nước đã đánh không còn hợp lệ
  nữa, kiểm luật trước là mỗi lần client mất mạng retry đều nhận `ILLEGAL`.
- `flag` và `abandon` chỉ máy chủ phát được. Nhận từ client là mở đường cho ai
  cũng tự tuyên bố đối thủ hết giờ.

## 7. Tài khoản và dữ liệu lâu dài

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
- Chỉ **ván ghép cặp** vào sổ thành tích. Phòng riêng mở bằng mã thì không:
  hai người quen nhau thay nhau xin thua là bơm điểm xong.
- `PRAGMA foreign_keys = ON` phải bật tay. SQLite mặc định **im lặng bỏ qua**
  mọi ràng buộc khoá ngoại.

## 8. Điều hướng trong app

Về sảnh thì dùng `backToLobby(router)` (`src/nav.ts`), **không** dùng
`router.replace('/')`. `replace` từ một màn được `push` lên trên sảnh chỉ thay
màn trên cùng, sảnh cũ vẫn nằm dưới, và app có hai sảnh cùng gắn vào cây: mọi
nút có hai bản, mỗi màn chơi online mở thêm một socket. Đã mắc lỗi này ở cả ba
màn cùng lúc.
