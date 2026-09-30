/**
 * Phòng đang chờ người thứ hai, nhìn thấy từ sảnh.
 *
 * "Tạo phòng" trước đây chỉ dùng được với bạn bè: mở phòng xong chỉ còn
 * cách đọc mã năm ký tự qua điện thoại, và người lạ không có đường nào tìm
 * ra một ván đang thiếu đúng một người.
 *
 * Bài này mở một phòng bằng người thật, rồi để một người **lạ** ở cửa sổ
 * khác tìm thấy nó ở sảnh và vào thẳng — không gõ mã. Kèm hai điều dễ làm
 * sai: phòng khoá mật khẩu không được lên danh sách, và phòng đã đủ người
 * phải rời danh sách ngay.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const NA = `An ${tag}`;
const A = await signUp(await openPage(browser, 'A'), NA, 'pa');
const B = await signUp(await openPage(browser, 'B'), `Bình ${tag}`, 'pb');

console.log('A mở một phòng thường, mức cờ chớp');
await A.getByLabel('Tạo phòng').click();
await A.waitForTimeout(800);
// Chọn mức thời gian **trước**: chạm vào tên bộ môn là mở phòng luôn.
await A.getByLabel('Mức Cờ chớp').click();
await A.waitForTimeout(300);
await A.getByLabel('Cờ Caro', { exact: true }).click();
await A.waitForTimeout(2200);

console.log('B mở trang Ván đấu từ thanh dưới — thẻ "Đang chờ" mở sẵn');
await B.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await B.waitForTimeout(1800);
await B.getByLabel('Ván đấu').click();
await B.waitForTimeout(1400);
await shot(B, '119-van-dau-dang-cho');
const listed = (await B.getByLabel(`Vào phòng của ${NA}`).count()) > 0;
// Người lạ phải biết mình sắp đánh mức thời gian nào trước khi bấm vào.
const saysClock = (await B.getByText(/Cờ Caro · Cờ chớp/).count()) > 0;
console.log(`  phòng của A hiện ở thẻ đang chờ: ${listed} · nói rõ mức thời gian: ${saysClock}`);

console.log('B bấm vào, không gõ mã');
await B.getByLabel(`Vào phòng của ${NA}`).click();
await B.waitForTimeout(2500);
await shot(B, '120-vao-thang-tu-danh-sach');
const inRoom = (await B.getByLabel('Xin thua').count()) > 0;
console.log(`  vào thẳng bàn cờ: ${inRoom}`);

console.log('Phòng đã đủ người phải rời thẻ "Đang chờ" và sang thẻ "Đang đánh"');
const C = await signUp(await openPage(browser, 'C'), `Cường ${tag}`, 'pc');
await C.getByLabel('Ván đấu').click();
await C.waitForTimeout(1400);
const gone = (await C.getByLabel(`Vào phòng của ${NA}`).count()) === 0;
await C.getByLabel(/^Thẻ Đang đánh/).click();
await C.waitForTimeout(900);
const nowLive = (await C.getByLabel(`Xem ván ${NA} với Bình ${tag}`).count()) > 0;
console.log(`  rời thẻ đang chờ: ${gone} · sang thẻ đang đánh: ${nowLive}`);

console.log('Phòng có mật khẩu không được lên sảnh');
await A.getByLabel('Về sảnh').click();
await A.waitForTimeout(600);
await A.getByText('Rời ván', { exact: true }).click();
await A.waitForTimeout(1800);
await A.getByLabel('Tạo phòng').click();
await A.waitForTimeout(800);
await A.getByLabel('Mật khẩu phòng (không bắt buộc)').fill('bimat');
await A.getByLabel('Cờ Caro', { exact: true }).click();
await A.waitForTimeout(2200);
await C.getByLabel(/^Thẻ Đang chờ/).click();
await C.waitForTimeout(1200);
await shot(C, '121-phong-khoa-khong-len-danh-sach');
const hidden = (await C.getByLabel(`Vào phòng của ${NA}`).count()) === 0;
console.log(`  phòng khoá không lên danh sách: ${hidden}`);

await browser.close();
finish([
  [listed, 'Thẻ "Đang chờ" không liệt kê phòng của A.'],
  [saysClock, 'Danh sách không nói mức thời gian của phòng.'],
  [inRoom, 'Bấm vào phòng ở sảnh không vào được bàn cờ.'],
  [gone, 'Phòng đã đủ người vẫn nằm ở thẻ đang chờ.'],
  [nowLive, 'Phòng đủ người không sang thẻ đang đánh.'],
  [hidden, 'Phòng có mật khẩu bị phát ra danh sách.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nNgười lạ tìm được phòng đang chờ ở trang Ván đấu và vào thẳng, không cần mã.');
