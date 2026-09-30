/**
 * Mức thời gian, và phòng có mật khẩu.
 *
 * Trước batch này, mọi ván đều dùng đúng một đồng hồ: đồng hồ mặc định của
 * bộ môn. Không chọn được cờ chớp hay cờ dài, và hàng chờ không tách theo
 * mức nên hai thứ đó cũng không thể tồn tại.
 *
 * Phòng riêng thì chỉ có lớp bảo vệ duy nhất là mã năm ký tự, mà không
 * gian mã chỉ có 32 mũ 5 — đoán mò vài nghìn lần là chen được vào ván
 * riêng của hai người lạ.
 */
import { ghepCap, taoPhong, moVaoMa, errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const A = await signUp(await openPage(browser, 'A'), `An ${tag}`, 'da');
const B = await signUp(await openPage(browser, 'B'), `Bình ${tag}`, 'db');

/** Rời bàn đang đánh: mũi tên quay lại, rồi xác nhận. */
async function leaveMatch(page) {
  await page.getByLabel('Về sảnh').last().click();
  await page.waitForTimeout(600);
  const ok = page.getByText('Rời ván', { exact: true });
  if (await ok.count()) await ok.click();
  await page.waitForTimeout(1400);
}

// ---- chọn mức thời gian ------------------------------------------------

console.log('Tấm chọn bộ môn của làn ĐÁNH THƯỜNG phải có hàng mức thời gian');
// Chỉ làn đánh thường mới chọn được mức: làn xếp hạng ghim một mức duy
// nhất để không chia đôi một đám đông vốn đã mỏng.
await A.getByLabel('Đổi chế độ', { exact: true }).click();
await A.waitForTimeout(900);
await A.getByLabel('Chế độ Đánh thường', { exact: true }).click();
await A.waitForTimeout(800);
await shot(A, '107-chon-muc-thoi-gian');
const hasClocks =
  (await A.getByLabel('Mức Cờ chớp').count()) > 0 &&
  (await A.getByLabel('Mức Cờ dài').count()) > 0 &&
  (await A.getByLabel('Mức Theo bộ môn').count()) > 0;
console.log(`  có đủ các mức: ${hasClocks}`);

console.log('Hai người chọn cùng mức cờ chớp — phải ghép được, và đồng hồ phải là 3 phút');
await A.getByLabel('Mức Cờ chớp').click();
await A.waitForTimeout(300);
await A.getByLabel('Cờ Caro', { exact: true }).click();
await A.waitForTimeout(500);
await A.getByLabel('VÀO TRẬN').click();
await A.waitForTimeout(1200);

await ghepCap(B, 'Cờ Caro', { lan: 'thuong', clock: 'Cờ chớp', wait: 2400 });
await shot(A, '108-van-co-chop');

const blitz = (await A.getByText('3:00').count()) > 0;
const labelled = (await A.getByText('Cờ chớp').count()) > 0;
console.log(`  đồng hồ 3 phút: ${blitz} · có nhãn mức: ${labelled}`);

// Mức nhớ qua lần mở sau — đo bằng **hành vi**, không bằng một thuộc tính
// ARIA: react-native-web bỏ `aria-selected` khi vai trò là button.
await leaveMatch(A);
await A.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await A.waitForTimeout(1600);
// Không chạm vào hàng mức: nếu nhớ được thì chính chip chế độ trên sảnh
// phải nói "Cờ chớp", và lớp phủ hàng chờ cũng thế.
const remembered = (await A.getByLabel('Đổi chế độ', { exact: true }).innerText()).includes('Cờ chớp');
await A.getByLabel('VÀO TRẬN').click();
await A.waitForTimeout(1600);
await shot(A, '108b-nho-muc-da-chon');
const rememberedCho = (await A.getByText(/Cờ chớp/).count()) > 0;
console.log(`  nhớ mức đã chọn: ${remembered} · hàng chờ nói đúng mức: ${rememberedCho}`);
await A.getByLabel('Huỷ', { exact: true }).click();
await A.waitForTimeout(1200);
await B.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await B.waitForTimeout(1400);

// ---- phòng có mật khẩu -------------------------------------------------

console.log('A mở phòng có mật khẩu');
await taoPhong(A, 'Cờ Caro', { pass: 'mo-cua', wait: 2000 });
await shot(A, '109-phong-co-khoa');
const locked = (await A.getByText('phòng có khoá', { exact: false }).count()) > 0;
const code = (await A.locator('text=/^[A-Z0-9]{5}$/').first().innerText()).trim();
console.log(`  phòng báo là có khoá: ${locked} · mã: ${code}`);

console.log('B vào bằng mã nhưng không có mật khẩu — phải bị chặn');
await moVaoMa(B);
await B.getByLabel('Mã phòng').fill(code);
await B.getByText('Vào phòng').click();
await B.waitForTimeout(2000);
await shot(B, '110-thieu-mat-khau');
const blocked = (await B.getByText(/mật khẩu chưa đúng/).count()) > 0;
const canRetry = (await B.getByLabel('Mật khẩu phòng').count()) > 0;
console.log(`  bị chặn: ${blocked} · gõ lại được ngay tại chỗ: ${canRetry}`);

console.log('Gõ đúng mật khẩu ngay tại màn chờ — phải vào được');
await B.getByLabel('Mật khẩu phòng').fill('mo-cua');
await B.getByText('Thử lại').click();
await B.waitForTimeout(2500);
await shot(B, '111-vao-duoc-phong-khoa');
const inRoom = (await B.getByLabel('Xin thua').count()) > 0;
const aInRoom = (await A.getByLabel('Xin thua').count()) > 0;
console.log(`  cả hai vào bàn: A=${aInRoom} B=${inRoom}`);

await browser.close();
finish(
  [
    [hasClocks, 'Tấm chọn bộ môn không có hàng mức thời gian.'],
    [blitz && labelled, 'Chọn cờ chớp mà đồng hồ không phải 3 phút.'],
    [remembered && rememberedCho, 'Không nhớ mức thời gian đã chọn.'],
    [locked, 'Phòng có mật khẩu mà không báo là có khoá.'],
    [blocked && canRetry, 'Vào phòng khoá mà không có mật khẩu thì không bị chặn, hoặc không gõ lại được.'],
    [inRoom && aInRoom, 'Gõ đúng mật khẩu vẫn không vào được phòng.'],
    [errors.length === 0, 'Có lỗi trên trang.'],
  ],
  // Bài này **cố ý** vào phòng khoá mà thiếu mật khẩu một lần.
  (e) => e.includes('400'),
);
console.log('\nChọn được mức thời gian, và phòng khoá chỉ mở bằng đúng mật khẩu.');
