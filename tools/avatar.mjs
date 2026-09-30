/**
 * Tải ảnh đại diện lên, qua đúng đường người dùng đi.
 *
 * Kiểm cả ba thứ mà một bài test đơn vị không với tới được: hộp thoại chọn
 * tệp có mở không, ảnh có thật sự tải về được từ máy chủ không, và máy chủ có
 * phát nó kèm đúng header không. Cộng thêm một việc dễ quên: đổi về con dấu
 * thì **tệp cũ phải bị xoá khỏi đĩa**, không để lại rác và không để lại một
 * ảnh vẫn tải về được ở một đường dẫn không ai quản nữa.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = process.env.CHROME_PATH || (existsSync(LOCAL) ? LOCAL : undefined);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const page = await (
  await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

// Ảnh thử **không vuông**, để thấy phần cắt có đúng tâm không.
const file = path.join(ROOT, 'docs/screenshots/.anh-thu.png');
{
  const p0 = await browser.newPage();
  const b64 = await p0.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 300;
    c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#2b6cb0';
    x.fillRect(0, 0, 300, 200);
    x.fillStyle = '#f6ad55';
    x.beginPath();
    x.arc(150, 100, 70, 0, 7);
    x.fill();
    x.fillStyle = '#fff';
    x.font = 'bold 48px sans-serif';
    x.textAlign = 'center';
    x.fillText('AN', 150, 118);
    return c.toDataURL('image/png').split(',')[1];
  });
  writeFileSync(file, Buffer.from(b64, 'base64'));
  await p0.close();
}

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}`);
};

console.log('Đăng ký rồi mở thẻ Cài đặt');
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.getByLabel('Đăng nhập').first().click();
await page.waitForTimeout(800);
await page.getByText('Chưa có tài khoản? Đăng ký').click();
await page.waitForTimeout(300);
await page.getByLabel('Tên hiển thị').fill('An Nguyễn');
await page.getByLabel('Email').fill(`av${Date.now()}@vidu.com`);
await page.getByLabel('Mật khẩu').fill('matkhaudai');
await page.getByText('Đăng ký', { exact: true }).click();
await page.waitForTimeout(1800);
await page.getByLabel('Tôi').last().click();
await page.waitForTimeout(1000);
await page.getByLabel('Thẻ Cài đặt').click();
await shot('30-anh-dai-dien');

console.log('Chọn một tệp ảnh 300×200');
const chooser = page.waitForEvent('filechooser');
await page.getByText('Tải ảnh lên').click();
(await chooser).setFiles(file);
await page.waitForTimeout(2500);
await shot('31-da-tai-anh');

const src = await page.locator('img[alt="Ảnh đại diện"]').first().getAttribute('src');
const res = await page.request.get(src ?? '');
const ct = res.headers()['content-type'];
const nosniff = res.headers()['x-content-type-options'];
const len = (await res.body()).length;
console.log(`  ${res.status()} · ${ct} · nosniff=${nosniff} · ${len} byte`);

console.log('Đổi về con dấu — ảnh cũ phải biến mất khỏi đĩa');
await page.getByLabel('Con dấu do-xe').click();
await page.waitForTimeout(1500);
const gone = await page.request.get(src ?? '');
console.log(`  ảnh cũ: ${gone.status()}`);

await browser.close();

const fail = (m) => {
  console.error(`\n${m}`);
  process.exit(1);
};
if (errs.length) fail(`Lỗi trên trang:\n  ${errs.join('\n  ')}`);
if (!src?.includes('/avatars/')) fail('Không thấy ảnh tải lên trong hồ sơ.');
if (ct !== 'image/jpeg') fail(`Kiểu nội dung sai: ${ct}`);
if (nosniff !== 'nosniff') fail('Thiếu X-Content-Type-Options: nosniff — trình duyệt có thể tự đoán lại thành HTML.');
if (len > 512 * 1024) fail(`Ảnh chưa được thu nhỏ: ${len} byte`);
if (gone.status() !== 404) fail('Ảnh cũ không bị xoá sau khi đổi về con dấu.');
console.log('\nTải ảnh, phát lại kèm đúng header, và dọn ảnh cũ đều đúng.');
