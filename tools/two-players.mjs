/**
 * Hai người thật đánh nhau qua máy chủ.
 *
 * Mở **hai cửa sổ trình duyệt riêng** (hai context, hai localStorage, nên hai
 * `playerId` khác nhau — đúng như hai cái điện thoại). Một bên mở phòng, đọc
 * mã trên màn hình, bên kia gõ mã vào. Rồi đánh thật cho tới khi có kết quả.
 *
 * Đây là bài kiểm duy nhất chứng minh được đường dây chạy: engine ở máy chủ,
 * `view` cắt theo ghế, nước đi đi qua dây, cả hai màn hình cùng đổi.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ghepCap, taoPhong } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = process.env.CHROME_PATH || (existsSync(LOCAL) ? LOCAL : undefined);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const errors = [];
const open = async (label) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const note = (t) => {
    errors.push(`[${label}] ${t}`);
    console.error(`  ! [${label}] ${t.split('\n')[0]}`);
  };
  page.on('console', (m) => m.type() === 'error' && note(m.text()));
  page.on('pageerror', (e) => note(e.stack || e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Ba chế độ online cần tài khoản. Đi đúng đường người dùng đi: bấm vào thẻ
  // người chơi, đăng ký một tài khoản thật, rồi mới vào phòng.
  await page.getByLabel('Đăng nhập').first().click();
  await page.waitForTimeout(800);
  await page.getByText('Chưa có tài khoản? Đăng ký').click();
  await page.waitForTimeout(300);
  await page.getByLabel('Tên hiển thị').fill(label === 'A' ? 'An Nguyễn' : 'Bình Trần');
  await page.getByLabel('Email').fill(`${label.toLowerCase()}${Date.now()}@vidu.com`);
  await page.getByLabel('Mật khẩu').fill('matkhaudai');
  await page.getByText('Đăng ký', { exact: true }).click();
  await page.waitForTimeout(1800);
  return page;
};
const shot = async (page, name) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}`);
};

const A = await open('A');
const B = await open('B');

console.log('A mở phòng cờ caro');
await taoPhong(A, 'Cờ Caro', { wait: 1500 });
await shot(A, '20-online-cho-ma');

const code = (await A.locator('text=/^[A-Z0-9]{5}$/').first().innerText()).trim();
console.log(`  mã phòng: ${code}`);

console.log('B vào bằng mã');
await B.getByLabel('Vào mã').click();
await B.waitForTimeout(400);
await B.getByLabel('Mã phòng').fill(code);
await B.getByText('Vào phòng').click();
await B.waitForTimeout(2000);
await shot(A, '21-online-ghe-0');
await shot(B, '22-online-ghe-1');

/**
 * Đặt một quân caro trong ván online: **hai chạm**.
 *
 * Ô của bàn 15×15 trên điện thoại chỉ khoảng 23 điểm, bằng nửa mức chạm tối
 * thiểu, nên chạm lần đầu chỉ ướm quân và chạm lại đúng ô đó mới đặt thật.
 * Máy chủ là trọng tài và không có hoàn tác, nên đặt nhầm là mất nước đi.
 */
const play = async (page, r, c) => {
  await page.getByLabel(`Ô hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(200);
  await page.getByLabel(`Đặt vào hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(650);
};

console.log('Đánh thật: ghế 0 xây chuỗi năm, ghế 1 đi chỗ khác');
for (let i = 0; i < 5; i++) {
  await play(A, 7, 3 + i);
  if (i < 4) await play(B, 12, 3 + i);
}
await A.waitForTimeout(900);
await shot(A, '23-online-ket-qua-ghe-0');
await shot(B, '24-online-ket-qua-ghe-1');

const won = await A.getByText('Bạn thắng').count();
const lost = await B.getByText('Bạn thua').count();
console.log(`  A thấy "Bạn thắng": ${won > 0} · B thấy "Bạn thua": ${lost > 0}`);

// Đường thứ hai: ghép cặp tự động, và một bộ môn khác — chứng minh cả hai
// lối vào lẫn bàn cờ thứ hai chạy qua cùng một màn chơi online.
console.log('Ghép cặp cờ gánh');
for (const p of [A, B]) {
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await ghepCap(p, 'Cờ Gánh');
}
await B.waitForTimeout(1500);
await shot(A, '25-online-ganh-ghep-cap');

const ganhOk = (await A.getByText('Cờ Gánh').count()) > 0 && (await A.getByLabel('Xin thua').count()) > 0;
console.log(`  vào được bàn cờ gánh: ${ganhOk}`);

// Ván ghép cặp vừa xong phải hiện trong trang cá nhân. Đây là chỗ nối giữa
// máy chủ và hồ sơ người chơi, và nó im lặng hỏng rất dễ.
console.log('Trang cá nhân ghi nhận ván vừa đánh');
await A.getByLabel('Xin thua').click();
await A.waitForTimeout(600);
// Xin thua hỏi lại trước khi kết thúc ván — bấm nút đỏ trong hộp xác nhận.
await A.getByText('Xin thua', { exact: true }).last().click();
await A.waitForTimeout(900);
await A.getByText('Về sảnh').click();
await A.waitForTimeout(1500);
await shot(A, '25b-sau-khi-ve-sanh');
await A.getByLabel('Tôi').click();
await A.waitForTimeout(1500);
await shot(A, '26-trang-ca-nhan');
const hasStats = (await A.getByText('Cờ Gánh').count()) > 0;
console.log(`  thành tích cờ gánh hiện ra: ${hasStats}`);

// Ba thẻ của trang cá nhân, chụp cả ba để soi tay.
await A.getByLabel('Thẻ Lịch sử').click();
await A.waitForTimeout(700);
await shot(A, '28-lich-su-tran');
const hasHistory = (await A.getByText('Bình Trần').count()) > 0;
console.log(`  trận vừa đánh hiện trong lịch sử: ${hasHistory}`);
await A.getByLabel('Thẻ Cài đặt').click();
await A.waitForTimeout(700);
await shot(A, '29-cai-dat');

await browser.close();
if (errors.length) {
  console.error('\nLỗi trên trang:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
if (!hasHistory) {
  console.error('\nLịch sử trận không ghi lại ván vừa đánh.');
  process.exit(1);
}
if (!hasStats) {
  console.error('\nVán ghép cặp không vào sổ thành tích.');
  process.exit(1);
}
if (!ganhOk) {
  console.error('\nGhép cặp cờ gánh không vào được bàn.');
  process.exit(1);
}
if (!won || !lost) {
  console.error('\nVán không kết thúc đúng ở cả hai màn hình.');
  process.exit(1);
}
console.log('\nHai màn hình cùng nhận đúng kết quả.');
