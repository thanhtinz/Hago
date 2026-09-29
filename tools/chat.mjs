/**
 * Hệ thống chat: nút nổi kéo được, ba mục, và chat phòng khi vào ván.
 *
 * Bốn điều cần chứng minh, không bài test đơn vị nào với tới được:
 *  1. Nút nổi **kéo được** và dính mép.
 *  2. Sảnh chung: A gõ, B thấy ngay dù đang ở màn khác.
 *  3. Thông báo hệ thống hiện ra và **không gõ vào được**.
 *  4. Vào ván thì nút đổi sang chat phòng và **không xem được chat ngoài**.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const API = process.env.API_URL ?? 'http://127.0.0.1:8787';
const ADMIN = process.env.ADMIN_TOKEN ?? 'bimat-quan-tri';
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
  await page.getByLabel('Email').fill(`c${stamp}${label}@vidu.com`);
  await page.getByLabel('Mật khẩu').fill('matkhaudai');
  await page.getByText('Đăng ký', { exact: true }).click();
  await page.waitForTimeout(1800);
  return page;
};
const shot = async (p, n) => {
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, `${n}.png`) });
  console.log(`  ✓ ${n}`);
};

const A = await open('a', 'An Kiem');
const B = await open('b', 'Binh Tuong');

console.log('Nút nổi kéo được và dính mép');
const bubble = A.getByLabel(/Mở chat/);
const before = await bubble.boundingBox();
// Kéo từ mép phải sang mép trái rồi thả: phải dính về mép trái.
await A.mouse.move(before.x + 27, before.y + 27);
await A.mouse.down();
await A.mouse.move(60, before.y - 160, { steps: 12 });
await A.mouse.up();
await A.waitForTimeout(900);
const after = await bubble.boundingBox();
const dragged = after.x < before.x - 100 && Math.abs(after.y - before.y) > 60;
console.log(`  từ x=${Math.round(before.x)} sang x=${Math.round(after.x)} · kéo được: ${dragged}`);
await shot(A, '47-nut-chat-noi');

console.log('Sảnh chung');
await A.getByLabel(/Mở chat/).click();
await A.waitForTimeout(1500);
await shot(A, '47b-tam-chat');
await A.getByLabel('Ô nhắn tin').fill('Có ai đánh cờ gánh không');
await A.getByText('Gửi').click();
await A.waitForTimeout(1000);
await shot(A, '48-chat-chung');

await B.getByLabel(/Mở chat/).click();
await B.waitForTimeout(1200);
const sawLobby = (await B.getByText('Có ai đánh cờ gánh không').count()) > 0;
console.log(`  B thấy tin sảnh chung: ${sawLobby}`);

console.log('Thông báo hệ thống');
const r = await fetch(`${API}/api/admin/notice`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN}` },
  body: JSON.stringify({ body: 'Máy chủ bảo trì lúc 2 giờ sáng mai' }),
});
console.log(`  phát thông báo: ${r.status}`);
await B.getByLabel(/Hệ thống/).click();
await B.waitForTimeout(1200);
const sawNotice = (await B.getByText('Máy chủ bảo trì lúc 2 giờ sáng mai').count()) > 0;
const readOnly = (await B.getByText('Kênh này chỉ để đọc.').count()) > 0;
console.log(`  thấy thông báo: ${sawNotice} · không gõ vào được: ${readOnly}`);
await shot(B, '49-thong-bao-he-thong');

// Khoá quản trị sai thì không phát được.
const bad = await fetch(`${API}/api/admin/notice`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer sai-be-bet' },
  body: JSON.stringify({ body: 'giả danh máy chủ' }),
});
console.log(`  khoá sai bị từ chối: ${bad.status === 401}`);

console.log('Vào ván: nút đổi sang chat phòng');
await B.getByLabel('Đóng', { exact: true }).click();
await B.waitForTimeout(400);
for (const p of [A, B]) {
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  await p.getByLabel('Ghép cặp').click();
  await p.waitForTimeout(500);
  await p.getByLabel('Cờ Caro', { exact: true }).click();
  await p.waitForTimeout(1200);
}
await B.waitForTimeout(1500);

await A.getByLabel(/Mở chat/).click();
await A.waitForTimeout(1000);
const roomOnly = (await A.getByText('Đang trong ván nên chỉ thấy tin của phòng này.').count()) > 0;
const noLobbyTab = (await A.getByLabel('Chung').count()) === 0;
const hidesLobby = (await A.getByText('Có ai đánh cờ gánh không').count()) === 0;
console.log(`  chỉ chat phòng: ${roomOnly} · không còn mục Chung: ${noLobbyTab} · không thấy tin ngoài: ${hidesLobby}`);

await A.getByLabel('Ô nhắn tin').fill('Chúc đánh vui');
await A.getByText('Gửi').click();
await A.waitForTimeout(1000);
await shot(A, '50-chat-trong-phong');

await B.getByLabel(/Mở chat/).click();
await B.waitForTimeout(1200);
const sawRoom = (await B.getByText('Chúc đánh vui').count()) > 0;
console.log(`  đối thủ nhận được tin trong phòng: ${sawRoom}`);
await shot(B, '51-chat-phong-ghe-1');

await browser.close();
const fail = (m) => {
  console.error(`\n${m}`);
  process.exit(1);
};
if (errs.length) fail(`Lỗi trên trang:\n  ${errs.join('\n  ')}`);
if (!dragged) fail('Nút nổi không kéo được hoặc không dính mép.');
if (!sawLobby) fail('Tin sảnh chung không tới người khác.');
if (!sawNotice) fail('Không thấy thông báo hệ thống.');
if (!readOnly) fail('Kênh thông báo vẫn gõ vào được.');
if (bad.status !== 401) fail('Khoá quản trị sai vẫn phát được thông báo.');
if (!roomOnly || !noLobbyTab || !hidesLobby) fail('Vào ván mà vẫn xem được chat ngoài.');
if (!sawRoom) fail('Chat trong phòng không tới đối thủ.');
console.log('\nNút nổi, sảnh chung, thông báo hệ thống và chat phòng đều đúng.');
