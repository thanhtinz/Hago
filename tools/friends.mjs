/**
 * Bạn bè và tỷ thí, qua đúng đường người dùng đi.
 *
 * Hai cửa sổ riêng: A tìm B theo tên rồi gửi lời mời, B đồng ý, A rủ B một
 * ván cờ gánh, B nhận lời, **cả hai cùng vào bàn**. Rồi A xoá bạn và chặn.
 *
 * Bài này là bài duy nhất chứng minh được dây nối dùng chung hoạt động: lời
 * rủ tới khi người nhận đang đứng ở màn danh sách bạn, không phải đang trong
 * một ván — mà trước đây socket chỉ mở lúc đang đánh.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = process.env.CHROME_PATH || (existsSync(LOCAL) ? LOCAL : undefined);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const errs = [];
const stamp = Date.now();

const open = async (label, name) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`[${label}] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`[${label}] ${m.text()}`));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.getByLabel('Đăng nhập').first().click();
  await page.waitForTimeout(700);
  await page.getByText('Chưa có tài khoản? Đăng ký').click();
  await page.waitForTimeout(300);
  await page.getByLabel('Tên hiển thị').fill(name);
  await page.getByLabel('Email').fill(`f${stamp}${label}@vidu.com`);
  await page.getByLabel('Mật khẩu').fill('matkhaudai');
  await page.getByText('Đăng ký', { exact: true }).click();
  await page.waitForTimeout(1800);
  return page;
};

const shot = async (page, n) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${n}.png`) });
  console.log(`  ✓ ${n}`);
};

// Tên riêng biệt để tìm kiếm ra đúng một người.
const NA = `Anh Kiem ${stamp % 10000}`;
const NB = `Binh Tuong ${stamp % 10000}`;
const A = await open('a', NA);
const B = await open('b', NB);

console.log('A mở danh sách bạn và tìm B');
await A.getByLabel('Bạn bè').click();
await A.waitForTimeout(1200);
await A.getByLabel('Tìm người chơi').fill(NB);
await A.waitForTimeout(1400);
await shot(A, '35-tim-ban');
await A.getByLabel('Kết bạn').first().click();
await A.waitForTimeout(1200);

console.log('B thấy lời mời và đồng ý');
await B.getByLabel('Bạn bè').click();
await B.waitForTimeout(1500);
await shot(B, '36-loi-moi-den');
const hasInvite = (await B.getByText('Lời mời kết bạn').count()) > 0;
await B.getByLabel('Đồng ý').first().click();
await B.waitForTimeout(1500);
await shot(B, '37-da-ket-ban');

// Trực tuyến phải hiện đúng: cả hai đang mở app.
await A.reload({ waitUntil: 'networkidle' });
await A.waitForTimeout(2000);
const onlineShown = (await A.getByText('Đang trực tuyến').count()) > 0;
console.log(`  A thấy B đang trực tuyến: ${onlineShown}`);
await shot(A, '38-danh-sach-ban');

console.log('A rủ B một ván cờ gánh');
await A.getByLabel('Tỷ thí').first().click();
await A.waitForTimeout(600);
await A.getByLabel('Rủ Cờ Gánh').click();
await A.waitForTimeout(1200);
await shot(A, '39-dang-cho-tra-loi');

const gotChallenge = (await B.getByText('rủ bạn một ván').count()) > 0;
console.log(`  B nhận được lời rủ: ${gotChallenge}`);
await shot(B, '40-loi-ru-dau');

await B.getByText('Vào ngay').click();
await B.waitForTimeout(2500);
const aInMatch = (await A.getByLabel('Xin thua').count()) > 0;
const bInMatch = (await B.getByLabel('Xin thua').count()) > 0;
console.log(`  cả hai vào bàn: A=${aInMatch} B=${bInMatch}`);
await shot(A, '41-ty-thi-ghe-0');
await shot(B, '42-ty-thi-ghe-1');

console.log('Nhắn tin riêng');
await A.getByLabel('Xin thua').click();
await A.waitForTimeout(700);
// Hộp xác nhận: nút đỏ trong hộp mang đúng chữ "Xin thua".
await A.getByText('Xin thua', { exact: true }).last().click();
await A.waitForTimeout(900);
await A.getByText('Về sảnh').click();
await A.waitForTimeout(1200);
await A.getByLabel('Bạn bè').click();
await A.waitForTimeout(1500);
await A.getByLabel('Nhắn tin').first().click();
await A.waitForTimeout(1500);
await A.getByLabel('Ô nhắn tin').fill('Ván vừa rồi hay đấy');
await A.getByText('Gửi').click();
await A.waitForTimeout(1200);
await shot(A, '44-nhan-tin');

// B đang ở màn khác: phải thấy chấm chưa đọc mà không cần tải lại trang.
await B.getByText('Về sảnh').click();
await B.waitForTimeout(1200);
await B.getByLabel('Bạn bè').click();
await B.waitForTimeout(1800);
const unread = (await B.getByLabel(/Nhắn tin, \d+ tin chưa đọc/).count()) > 0;
console.log(`  B thấy chấm chưa đọc: ${unread}`);
await shot(B, '45-chua-doc');

await B.getByLabel(/Nhắn tin/).first().click();
await B.waitForTimeout(1500);
const gotMsg = (await B.getByText('Ván vừa rồi hay đấy').count()) > 0;
console.log(`  B đọc được tin: ${gotMsg}`);
await B.getByLabel('Ô nhắn tin').fill('Ừ, mai đánh tiếp');
await B.getByText('Gửi').click();
await B.waitForTimeout(1200);
// A vẫn đang mở đúng cuộc trò chuyện đó: tin phải tới ngay, không cần tải lại.
const live2 = (await A.getByText('Ừ, mai đánh tiếp').count()) > 0;
console.log(`  A nhận tin ngay trên màn đang mở: ${live2}`);
await shot(A, '46-nhan-tin-hai-chieu');
await A.getByLabel('Quay lại').click();
await A.waitForTimeout(1200);

console.log('Chặn: cắt luôn quan hệ bạn');
await A.getByLabel('Thêm lựa chọn').first().click();
await A.waitForTimeout(600);
await A.getByText('Chặn người này').click();
await A.waitForTimeout(1600);
const blocked = (await A.getByText('Đã chặn').count()) > 0;
const noFriends = (await A.getByText('Chưa có ai. Tìm theo tên ở ô trên để gửi lời mời.').count()) > 0;
console.log(`  vào mục đã chặn: ${blocked} · không còn là bạn: ${noFriends}`);
await shot(A, '43-da-chan');

await browser.close();
const fail = (m) => {
  console.error(`\n${m}`);
  process.exit(1);
};
if (errs.length) fail(`Lỗi trên trang:\n  ${errs.join('\n  ')}`);
if (!hasInvite) fail('B không thấy lời mời kết bạn.');
if (!onlineShown) fail('Không hiện được trạng thái trực tuyến.');
if (!gotChallenge) fail('B không nhận được lời rủ đấu khi đang ở màn bạn bè.');
if (!aInMatch || !bInMatch) fail('Nhận lời rủ nhưng không phải cả hai đều vào bàn.');
if (!unread) fail('Không hiện được số tin chưa đọc khi đang ở màn khác.');
if (!gotMsg) fail('B không đọc được tin A gửi.');
if (!live2) fail('Tin không tới ngay trên cuộc trò chuyện đang mở.');
if (!blocked || !noFriends) fail('Chặn không cắt được quan hệ bạn.');
console.log('\nKết bạn, trực tuyến, tỷ thí và chặn đều đúng.');
