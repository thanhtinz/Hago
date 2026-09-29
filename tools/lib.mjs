/**
 * Phần dùng chung của mọi bài kiểm giao diện.
 *
 * Bảy bài harness trước đây mỗi bài chép lại y hệt: mở Chromium ở kích thước
 * điện thoại, bắt lỗi console, đăng ký một tài khoản, chụp ảnh vào đúng thư
 * mục. Bảy bản chép nghĩa là sửa một chỗ thì sáu chỗ còn lại vẫn sai — và đã
 * xảy ra đúng thế khi màn đăng ký đổi nhãn nút.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'docs/screenshots');
export const BASE = process.env.APP_URL ?? 'http://localhost:8080';

const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = process.env.CHROME_PATH || (existsSync(LOCAL) ? LOCAL : undefined);

/** Lỗi console và lỗi trang gom về một chỗ; có lỗi là bài kiểm trượt. */
export const errors = [];

export async function launch() {
  mkdirSync(OUT, { recursive: true });
  return chromium.launch(CHROME ? { executablePath: CHROME } : {});
}

/** Một cửa sổ riêng — context riêng nên localStorage riêng, đúng như hai máy. */
export async function openPage(browser, label) {
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const note = (t) => {
    errors.push(`[${label}] ${t}`);
    console.error(`  ! [${label}] ${String(t).split('\n')[0]}`);
  };
  page.on('console', (m) => m.type() === 'error' && note(m.text()));
  page.on('pageerror', (e) => note(e.stack || e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return page;
}

/** Đăng ký một tài khoản mới, đi đúng đường người dùng đi. */
export async function signUp(page, name, tag) {
  await page.getByLabel('Đăng nhập').first().click();
  await page.waitForTimeout(800);
  await page.getByText('Chưa có tài khoản? Đăng ký').click();
  await page.waitForTimeout(300);
  await page.getByLabel('Tên hiển thị').fill(name);
  await page.getByLabel('Email').fill(`${tag}${Date.now()}@vidu.com`);
  await page.getByLabel('Mật khẩu').fill('matkhaudai');
  await page.getByText('Đăng ký', { exact: true }).click();
  await page.waitForTimeout(1800);
  return page;
}

export async function shot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}`);
}

/** Kết bài: in lỗi nếu có, và thoát khác 0 để CI bắt được. */
export function finish(checks) {
  let bad = errors.length > 0;
  if (errors.length) {
    console.error('\nLỗi trên trang:');
    for (const e of errors) console.error('  ' + e);
  }
  for (const [ok, why] of checks) {
    if (ok) continue;
    console.error('\n' + why);
    bad = true;
  }
  if (bad) process.exit(1);
}
