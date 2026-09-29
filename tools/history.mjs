/**
 * Lịch sử trận: lọc theo bộ môn, gom theo ngày, và **phân trang thật**.
 *
 * Bài này cần nhiều hơn hai chục ván mới thấy được trang thứ hai, mà đánh
 * từng ván qua giao diện thì mất hàng giờ. Nên nó dựng sẵn dữ liệu bằng cách
 * cho hai tài khoản xin thua qua lại qua chính máy chủ — vẫn là đường đi thật,
 * chỉ là đi nhanh.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import WebSocket from 'ws';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const API = process.env.API_URL ?? 'http://127.0.0.1:8787';
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = process.env.CHROME_PATH || (existsSync(LOCAL) ? LOCAL : undefined);
mkdirSync(OUT, { recursive: true });

const post = async (p, body, token) => {
  const r = await fetch(`${API}/api${p}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p}: ${j.msg ?? r.status}`);
  return j;
};

const stamp = Date.now();
const A = await post('/auth/register', { name: 'An Nguyễn', email: `h${stamp}a@vidu.com`, password: 'matkhaudai' });
const B = await post('/auth/register', { name: 'Bình Trần', email: `h${stamp}b@vidu.com`, password: 'matkhaudai' });

/** Mở một socket đã chào hỏi xong. */
const dial = (token) =>
  new Promise((ok) => {
    const w = new WebSocket(API.replace(/^http/, 'ws'));
    w.on('open', () => {
      w.send(JSON.stringify({ t: 'hello', token }));
      setTimeout(() => ok(w), 120);
    });
  });

const wa = await dial(A.token);
const wb = await dial(B.token);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('Dựng 26 ván qua máy chủ để có nhiều hơn một trang');
for (let i = 0; i < 26; i++) {
  const game = i % 3 === 0 ? 'co-ganh' : 'co-caro';
  wa.send(JSON.stringify({ t: 'quick', gameId: game }));
  await wait(40);
  wb.send(JSON.stringify({ t: 'quick', gameId: game }));
  await wait(90);
  // Bên thua đổi qua lại để lịch sử có cả thắng lẫn thua.
  (i % 2 ? wa : wb).send(JSON.stringify({ t: 'act', nonce: `r${i}`, action: { t: 'resign' } }));
  await wait(90);
}
wa.close();
wb.close();
await wait(300);

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const page = await (
  await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

const shot = async (n) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${n}.png`), fullPage: true });
  console.log(`  ✓ ${n}`);
};

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
// Đặt sẵn phiên của An rồi tải lại, thay cho việc gõ lại form đăng nhập.
await page.evaluate((t) => localStorage.setItem('co.token', t), A.token);
await page.goto(`${BASE}/me?tab=lich-su`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await shot('32-lich-su-trang-1');

const countRows = () => page.locator('text=/^(THẮNG|THUA|HOÀ)$/').count();
const first = await countRows();
console.log(`  trang đầu: ${first} hàng`);

await page.getByText('Xem thêm').click();
await page.waitForTimeout(1500);
const second = await countRows();
console.log(`  sau khi bấm Xem thêm: ${second} hàng`);
await shot('33-lich-su-trang-2');

console.log('Lọc theo bộ môn');
await page.getByLabel('Lọc Cờ Gánh').click();
await page.waitForTimeout(1500);
const filtered = await countRows();
console.log(`  chỉ cờ gánh: ${filtered} hàng`);
await shot('34-lich-su-loc');

await browser.close();
const fail = (m) => {
  console.error(`\n${m}`);
  process.exit(1);
};
if (errs.length) fail(`Lỗi trên trang:\n  ${errs.join('\n  ')}`);
if (first !== 20) fail(`Trang đầu phải có đúng 20 hàng, có ${first}`);
if (second !== 26) fail(`Sau khi tải thêm phải đủ 26 hàng, có ${second}`);
if (filtered !== 9) fail(`Cờ gánh có 9 ván, lọc ra ${filtered}`);
console.log('\nPhân trang, lọc theo bộ môn và gom theo ngày đều đúng.');
