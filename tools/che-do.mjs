/**
 * Chọn chế độ, danh mục bộ môn, và hai làn đánh thường / xếp hạng.
 *
 * Sảnh cũ đổ cả mười ba bộ môn ra ngoài và không có chỗ nào tên là "chế
 * độ" — chế độ suy ra từ việc bấm ô nào. Bài này đi đúng đường người dùng
 * đi sau khi tách: sảnh gọn, một nút vào chơi, ba nhóm chế độ, và danh mục
 * bộ môn nằm ở màn riêng.
 *
 * Kèm điều dễ làm sai nhất của cả tính năng, và là một **lỗi im lặng**:
 * hai người bấm hai làn khác nhau mà bị ghép vào nhau thì ván tính điểm
 * cho một bên và không tính cho bên kia, không ai nhận được lỗi gì.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const A = await signUp(await openPage(browser, 'A'), `An ${tag}`, 'ca');
const B = await signUp(await openPage(browser, 'B'), `Bình ${tag}`, 'cb');

console.log('Sảnh không được đổ cả mười ba bộ môn ra ngoài');
await A.waitForTimeout(800);
await shot(A, '124-sanh-gon');
// Lưới mười ba thẻ đã chuyển vào danh mục; sảnh chỉ giữ ba bộ môn đã mở.
const khongCoCoTuong = (await A.getByLabel('Xem luật Cờ Tướng, chưa mở').count()) === 0;
const coVaoChoi = (await A.getByLabel('Vào chơi').count()) > 0;
console.log(`  sảnh không còn thẻ bộ môn chưa mở: ${khongCoCoTuong} · có nút Vào chơi: ${coVaoChoi}`);

console.log('Màn chọn chế độ có đủ ba nhóm');
await A.getByLabel('Vào chơi').click();
await A.waitForTimeout(1400);
await shot(A, '125-chon-che-do');
const duNhom =
  (await A.getByText('Đấu với người', { exact: true }).count()) > 0 &&
  (await A.getByText('Một mình', { exact: true }).count()) > 0 &&
  (await A.getByText('Với bạn', { exact: true }).count()) > 0;
const duCheDo =
  (await A.getByLabel('Đấu xếp hạng').count()) > 0 &&
  (await A.getByLabel('Đánh thường').count()) > 0 &&
  (await A.getByLabel('Vượt ải').count()) > 0;
console.log(`  đủ ba nhóm: ${duNhom} · đủ chế độ xếp hạng, thường, vượt ải: ${duCheDo}`);

console.log('Làn xếp hạng không cho chọn mức thời gian, và nói rõ vì sao');
await A.getByLabel('Đấu xếp hạng').click();
await A.waitForTimeout(900);
await shot(A, '126-chon-bo-mon-xep-hang');
const xhKhongCoChip = (await A.getByLabel('Mức Cờ chớp').count()) === 0;
const xhNoiRo = (await A.getByText(/Mức thời gian theo bộ môn/).count()) > 0;
console.log(`  không có chip mức giờ: ${xhKhongCoChip} · nói rõ vì sao: ${xhNoiRo}`);

console.log('Hai làn khác nhau thì KHÔNG được ghép vào nhau');
await A.getByLabel('Cờ Caro', { exact: true }).click();
await A.waitForTimeout(1500);
await B.getByLabel('Vào chơi').click();
await B.waitForTimeout(1200);
await B.getByLabel('Đánh thường').click();
await B.waitForTimeout(900);
const thuongCoChip = (await B.getByLabel('Mức Cờ chớp').count()) > 0;
await B.getByLabel('Cờ Caro', { exact: true }).click();
await B.waitForTimeout(3000);
const aConCho = (await A.getByText(/Đang tìm đối|đang chờ/i).count()) > 0 || (await A.getByLabel('Xin thua').count()) === 0;
const bConCho = (await B.getByLabel('Xin thua').count()) === 0;
console.log(`  làn thường có chip mức giờ: ${thuongCoChip} · A vẫn chờ: ${aConCho} · B vẫn chờ: ${bConCho}`);
await shot(A, '127-hai-lan-khong-ghep-cheo');

console.log('Cùng làn thì ghép ngay, và ván xếp hạng phải tính điểm');
await B.goto(`${BASE}/online/quick?game=co-caro&lan=xh`, { waitUntil: 'networkidle' });
await B.waitForTimeout(3000);
const vaoBan = (await B.getByLabel('Xin thua').count()) > 0 && (await A.getByLabel('Xin thua').count()) > 0;
const tinhDiem = (await A.getByText('Xếp hạng').count()) > 0;
console.log(`  cả hai vào bàn: ${vaoBan} · ván ghi là xếp hạng: ${tinhDiem}`);
await shot(A, '128-van-xep-hang');

console.log('Danh mục bộ môn chia bốn nhóm thể loại');
const C = await openPage(browser, 'C');
await C.getByLabel('Bộ môn', { exact: true }).click();
await C.waitForTimeout(1500);
await shot(C, '129-danh-muc-bo-mon');
const duTheLoai =
  (await C.getByText('Cờ dân gian Việt').count()) > 0 &&
  (await C.getByText('Cờ quân').count()) > 0 &&
  (await C.getByText('Cờ nối hàng').count()) > 0 &&
  (await C.getByText('Cờ chiếm ô').count()) > 0;
// Đếm thẻ bộ môn **chưa mở**: sảnh vẫn nằm dưới trong ngăn xếp điều
// hướng nên ba thẻ đã mở của nó cũng có trong DOM, còn mười thẻ chưa mở
// thì chỉ danh mục mới có.
const duThe = (await C.getByLabel(/^Xem luật .*, chưa mở$/).count()) === 10;
console.log(`  đủ bốn nhóm thể loại: ${duTheLoai} · đủ mười bộ môn chưa mở: ${duThe}`);

await browser.close();
finish(
  [
    [khongCoCoTuong, 'Sảnh vẫn đổ cả mười ba bộ môn ra ngoài.'],
    [coVaoChoi, 'Sảnh không có nút Vào chơi.'],
    [duNhom, 'Màn chọn chế độ thiếu nhóm.'],
    [duCheDo, 'Màn chọn chế độ thiếu một trong ba chế độ chính.'],
    [xhKhongCoChip, 'Làn xếp hạng vẫn cho chọn mức thời gian, mà máy chủ thì bỏ qua lựa chọn đó.'],
    [xhNoiRo, 'Không nói vì sao làn xếp hạng không chọn được mức giờ.'],
    [thuongCoChip, 'Làn đánh thường mất luôn hàng chip mức giờ.'],
    [aConCho && bConCho, 'Hai làn khác nhau mà bị ghép vào nhau.'],
    [vaoBan, 'Cùng làn xếp hạng mà không ghép được.'],
    [tinhDiem, 'Ván ghép cặp xếp hạng không ghi là xếp hạng.'],
    [duTheLoai, 'Danh mục thiếu nhóm thể loại.'],
    [duThe, 'Danh mục không đủ mười ba bộ môn.'],
    [errors.length === 0, 'Có lỗi trên trang.'],
  ],
  // B cố tình gõ một đường dẫn đang ở trong hàng chờ nên máy chủ trả một
  // lần rời hàng; đó là hành vi cố ý của bài kiểm.
  (e) => e.includes('WebSocket'),
);
console.log('\nChọn chế độ đủ ba nhóm, hai làn không ghép chéo, và danh mục bộ môn nằm riêng.');
