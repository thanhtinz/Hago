/**
 * Chụp màn hình app thật để kiểm chứng giao diện.
 *
 * Không dùng ảnh dựng tay hay mô tả bằng lời: build web thật, mở bằng
 * Chromium ở đúng kích thước điện thoại, bấm đúng như người dùng bấm. Cách
 * duy nhất để biết cái mình viết có thật sự hiện ra như mình nghĩ không.
 *
 *   npm run build -w @co/mobile     # expo export --platform web
 *   npx serve -l 8080 -s apps/mobile/dist
 *   node tools/screenshot.mjs
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const URL_BASE = process.env.APP_URL ?? 'http://localhost:8080';
/**
 * Chromium cài sẵn trong máy ảnh; không tải thêm. Máy nào không có sẵn (CI,
 * máy của người khác) thì để trống và dùng bản Playwright tự quản — đường dẫn
 * cứng là lý do một bộ kiểm giao diện chỉ chạy được trên đúng một cái máy.
 */
const LOCAL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// `CHROME_PATH=` (rỗng) nghĩa là "đừng dùng đường dẫn cứng", nên phải lọc
// chuỗi rỗng — `??` chỉ bắt null/undefined và sẽ truyền '' xuống Playwright.
const CHROME = process.env.CHROME_PATH || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

const shot = async (name) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('  ✓', name);
};
const tap = async (text, { exact = true } = {}) => {
  await page.getByText(text, { exact }).first().click();
  await page.waitForTimeout(700);
};

console.log('Sảnh');
await page.goto(`${URL_BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await shot('01-sanh');

// Lưới 13 bộ môn đã rời sảnh sang danh mục riêng, nên đây là một màn
// khác chứ không còn là một lần cuộn.
console.log('Danh mục bộ môn');
await page.getByLabel('Bộ môn', { exact: true }).click();
await page.waitForTimeout(1200);
await shot('02-sanh-bo-mon');

// Danh mục dài hơn một màn hình, nên phải chụp cả nửa dưới — nếu không
// thì sáu bộ môn cuối không bao giờ được nhìn tận mắt.
console.log('Danh mục: nửa dưới');
await page.mouse.move(215, 600);
await page.mouse.wheel(0, 1700);
await page.waitForTimeout(900);
await shot('02b-sanh-bo-mon-duoi');

console.log('Về sảnh rồi mở màn chọn chế độ');
await page.goBack();
await page.waitForTimeout(1200);
await page.getByLabel('Vào chơi').click();
await page.waitForTimeout(1200);
await shot('02c-chon-che-do');
await page.goBack();
await page.waitForTimeout(1200);

console.log('Đăng nhập và trang cá nhân');
await page.getByLabel('Đăng nhập').first().click();
await page.waitForTimeout(900);
await shot('16-dang-nhap');
await page.getByText('Chưa có tài khoản? Đăng ký').click();
await page.waitForTimeout(400);
await shot('17-dang-ky');
await page.getByLabel('Tên hiển thị').fill('Người Chơi Thử');
await page.getByLabel('Email').fill(`shot${Date.now()}@vidu.com`);
await page.getByLabel('Mật khẩu').fill('matkhaudai');
await page.getByText('Đăng ký', { exact: true }).click();
await page.waitForTimeout(1800);
await page.getByLabel('Tôi').first().click();
await page.waitForTimeout(1200);
await shot('27-trang-ca-nhan-moi');
await page.goto(`${URL_BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('Bàn cờ caro');
// Sảnh không còn nút "Đấu với máy" cứng vào cờ caro; giờ vào bằng chính
// thẻ bộ môn ở dải ngang.
await page.getByLabel('Chơi Cờ Caro').click();
await page.waitForTimeout(1400);
await shot('03-caro-ban-trong');

/** Bấm vào một ô của bàn cờ theo toạ độ (hàng, cột), 0-indexed. */
const cell = async (r, c) => {
  await page.getByLabel(`Ô hàng ${r + 1} cột ${c + 1}`).click();
  // Chờ máy đi xong: bot có nhịp trễ 420ms cho người kịp nhìn nước mình đi.
  await page.waitForTimeout(900);
};

console.log('Đánh vài nước với máy');
for (const [r, c] of [
  [7, 7],
  [7, 8],
  [6, 6],
  [8, 9],
]) {
  await cell(r, c);
}
await shot('04-caro-dang-danh');

console.log('Lùi lại ở bàn caro: bỏ cả nước mình lẫn nước máy đáp lại');
await page.getByText('Lùi lại 5', { exact: false }).first().click();
await page.waitForTimeout(800);
await shot('04a-caro-lui-lai');

console.log('Gợi ý ở bàn caro');
await page.getByText('Gợi ý 3', { exact: false }).first().click();
await page.waitForTimeout(900);
await shot('04b-caro-goi-y');

/** Mức máy nằm sau một tấm chọn, không chiếm chỗ thường trực dưới bàn cờ. */
const openLevels = async () => {
  await page.getByLabel('Đổi mức máy').click();
  await page.waitForTimeout(500);
};
const setLevel = async (name) => {
  await openLevels();
  await page.getByText(name, { exact: true }).first().click();
  await page.waitForTimeout(600);
};

console.log('Tấm chọn mức máy');
await openLevels();
await shot('05-caro-chon-muc');
await page.getByText('Khó', { exact: true }).first().click();
await page.waitForTimeout(600);

/**
 * Đánh tới khi ra kết quả, để xem vệt dạ quang đánh dấu chuỗi thắng và tấm
 * kết quả.
 *
 * Không gọi thẳng vào engine: bấm đúng như người dùng bấm, ô nào máy đã
 * chiếm thì bỏ qua. Chụp ảnh mà đi đường tắt qua giao diện thì ảnh không
 * chứng minh được gì.
 */
console.log('Đánh tới khi ra kết quả (mức Dễ)');
await page.getByLabel('Ván mới').click();
await page.waitForTimeout(600);
await setLevel('Dễ');

const status = async () => (await page.locator('body').innerText()).match(/Bạn thắng|Bạn thua|Hoà/)?.[0] ?? null;
// Vài đường tấn công: hết đường này thì sang đường khác.
const lines = [
  [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9], [6, 3],
  [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9], [9, 3],
  [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9], [11, 3],
  [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 3],
];
let done = null;
for (const [r, c] of lines) {
  const box = page.getByLabel(`Ô hàng ${r + 1} cột ${c + 1}`);
  if (await box.isDisabled()) continue;
  await box.click();
  await page.waitForTimeout(820);
  done = await status();
  if (done) break;
}
console.log('  kết quả:', done ?? 'chưa xong');
await shot('06-caro-ket-qua');

console.log('Cờ gánh: vào bàn, chọn quân, đi một nước');
await page.goto(`${URL_BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.getByLabel('Chơi Cờ Gánh').click();
await page.waitForTimeout(1200);
await shot('07-ganh-ban-dau');

// Chọn một quân của mình rồi đi: bấm đúng như người chơi bấm, không gọi
// thẳng vào engine.
await page.getByLabel('Điểm hàng 5 cột 1').click();
await page.waitForTimeout(400);
await shot('08-ganh-chon-quan');
await page.getByLabel('Điểm hàng 4 cột 2, trống').click();
await page.waitForTimeout(1400);
await shot('09-ganh-da-di');

console.log('Gợi ý: ba lần mỗi ván');
await page.getByText('Gợi ý 3', { exact: false }).first().click();
await page.waitForTimeout(900);
await shot('10-ganh-goi-y');

console.log('Ô ăn quan: vào bàn, chọn ô, rải một nước');
await page.goto(`${URL_BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.getByLabel('Chơi Ô Ăn Quan').click();
await page.waitForTimeout(1400);
await shot('11-quan-ban-dau');

await page.getByLabel(/^Ô của bạn số 3/).click();
await page.waitForTimeout(500);
await shot('12-quan-chon-o');
await page.getByLabel('Rải sang phải').click();
await page.waitForTimeout(1800);
await shot('13-quan-da-rai');

console.log('Lùi lại nước vừa đi');
await page.getByText('Lùi lại 5', { exact: false }).first().click();
await page.waitForTimeout(900);
await shot('14-quan-lui-lai');

if (problems.length) {
  console.log('\nLỖI TRÊN TRANG:');
  for (const p of problems.slice(0, 10)) console.log(' -', p);
  process.exitCode = 1;
} else {
  console.log('\nKhông có lỗi nào trên trang.');
}
await browser.close();
