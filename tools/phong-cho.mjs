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

console.log('B mở sảnh — phòng của A phải nằm ở mục "Phòng đang chờ"');
await B.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await B.waitForTimeout(1800);
await B.getByText('Phòng đang chờ', { exact: true }).scrollIntoViewIfNeeded();
await shot(B, '119-sanh-co-phong-dang-cho');
const listed = (await B.getByLabel(`Vào phòng của ${NA}`).count()) > 0;
// Người lạ phải biết mình sắp đánh mức thời gian nào trước khi bấm vào.
const saysClock = (await B.getByText(/Cờ Caro · Cờ chớp/).count()) > 0;
console.log(`  phòng của A hiện ở sảnh: ${listed} · nói rõ mức thời gian: ${saysClock}`);

console.log('B bấm vào, không gõ mã');
await B.getByLabel(`Vào phòng của ${NA}`).click();
await B.waitForTimeout(2500);
await shot(B, '120-vao-thang-tu-sanh');
const inRoom = (await B.getByLabel('Xin thua').count()) > 0;
console.log(`  vào thẳng bàn cờ: ${inRoom}`);

console.log('Phòng đã đủ người phải rời danh sách');
const C = await signUp(await openPage(browser, 'C'), `Cường ${tag}`, 'pc');
await C.waitForTimeout(1500);
const gone = (await C.getByLabel(`Vào phòng của ${NA}`).count()) === 0;
// Và nó phải nhảy sang mục "Đang đánh" — đủ người là ván chạy ngay.
const nowLive = (await C.getByText('Đang đánh', { exact: true }).count()) > 0;
console.log(`  rời mục đang chờ: ${gone} · nhảy sang mục đang đánh: ${nowLive}`);

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
await C.waitForTimeout(1200);
await shot(C, '121-phong-khoa-khong-len-sanh');
const hidden = (await C.getByLabel(`Vào phòng của ${NA}`).count()) === 0;
console.log(`  phòng khoá không lên sảnh: ${hidden}`);

await browser.close();
finish([
  [listed, 'Sảnh không liệt kê phòng đang chờ.'],
  [saysClock, 'Danh sách không nói mức thời gian của phòng.'],
  [inRoom, 'Bấm vào phòng ở sảnh không vào được bàn cờ.'],
  [gone, 'Phòng đã đủ người vẫn nằm ở mục đang chờ.'],
  [nowLive, 'Phòng đủ người không nhảy sang mục đang đánh.'],
  [hidden, 'Phòng có mật khẩu bị phát ra sảnh.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nNgười lạ tìm được phòng đang chờ ở sảnh và vào thẳng, không cần mã.');
