/**
 * Bảo mật tài khoản: đổi mật khẩu, thiết bị đang đăng nhập, giới thiệu.
 *
 * Trước batch này, trang cài đặt chỉ có ảnh đại diện, tên, đăng xuất và
 * xoá tài khoản. Không có đường đổi mật khẩu nào cả — mật khẩu đặt lúc
 * đăng ký là mật khẩu vĩnh viễn — và không nhìn thấy mình đang đăng nhập
 * ở đâu, nên một cái máy để quên ở quán cà phê là quyền chiếm tài khoản
 * không giới hạn thời gian.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const NAME = `An ${tag}`;
const MAIL = `tk${tag}@vidu.com`;

// Đăng ký thẳng bằng email biết trước, để lát nữa đăng nhập lại được.
const A = await openPage(browser, 'A');
await A.getByLabel('Đăng nhập').first().click();
await A.waitForTimeout(800);
await A.getByText('Chưa có tài khoản? Đăng ký').click();
await A.waitForTimeout(300);
await A.getByLabel('Tên hiển thị').fill(NAME);
await A.getByLabel('Email').fill(MAIL);
await A.getByLabel('Mật khẩu').fill('matkhaudai');
await A.getByText('Đăng ký', { exact: true }).click();
await A.waitForTimeout(1800);

const openSettings = async (page) => {
  await page.goto(`${BASE}/me?tab=cai-dat`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
};

console.log('Mở thẻ Cài đặt');
await openSettings(A);
await shot(A, '84-cai-dat-day-du');

const hasPw = (await A.getByText('Đổi mật khẩu').count()) > 0;
const hasDevices = (await A.getByText('Thiết bị đang đăng nhập').count()) > 0;
const hasExport = (await A.getByText('Tải dữ liệu về').count()) > 0;
const hasBio = (await A.getByText('Giới thiệu', { exact: true }).count()) > 0;
console.log(`  đổi mật khẩu: ${hasPw} · thiết bị: ${hasDevices} · tải dữ liệu: ${hasExport} · giới thiệu: ${hasBio}`);

// ---- giới thiệu --------------------------------------------------------

console.log('Lưu một dòng giới thiệu và xem nó hiện trên hồ sơ');
await A.getByLabel('Giới thiệu', { exact: true }).fill('Thích cờ gánh và cà phê đá');
await A.waitForTimeout(300);
await A.getByText('Lưu giới thiệu').click();
await A.waitForTimeout(1400);
await A.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
await A.waitForTimeout(1600);
await shot(A, '85-ho-so-co-gioi-thieu');
const bioShown = (await A.getByText('Thích cờ gánh và cà phê đá').count()) > 0;
console.log(`  giới thiệu hiện trên hồ sơ: ${bioShown}`);

// ---- đổi mật khẩu ------------------------------------------------------

console.log('Đăng nhập thêm một phiên nữa ở cửa sổ khác');
const B = await openPage(browser, 'B');
await B.getByLabel('Đăng nhập').first().click();
await B.waitForTimeout(800);
await B.getByLabel('Email').fill(MAIL);
await B.getByLabel('Mật khẩu').fill('matkhaudai');
await B.getByText('Đăng nhập', { exact: true }).last().click();
await B.waitForTimeout(1800);

await openSettings(A);
const twoDevices = (await A.getByText(/Đăng xuất \d+ thiết bị khác/).count()) > 0;
await shot(A, '86-hai-thiet-bi');
console.log(`  thấy có thiết bị khác đang đăng nhập: ${twoDevices}`);

// Ảnh của đúng phần vừa thêm: mật khẩu, thiết bị, dữ liệu.
await A.getByText('Thiết bị đang đăng nhập').scrollIntoViewIfNeeded();
await A.waitForTimeout(400);
await shot(A, '86b-bao-mat-tai-khoan');

console.log('Đổi mật khẩu — mật khẩu cũ sai thì phải bị từ chối');
await A.getByText('Đổi mật khẩu').last().click();
await A.waitForTimeout(500);
await A.getByLabel('Mật khẩu hiện tại').fill('sai-be-bet');
await A.getByLabel('Mật khẩu mới', { exact: true }).fill('matkhaumoihon');
await A.getByLabel('Gõ lại mật khẩu mới').fill('matkhaumoihon');
await A.getByText('Đổi mật khẩu', { exact: true }).last().click();
await A.waitForTimeout(1500);
await shot(A, '87-mat-khau-cu-sai');
const rejected = (await A.getByText('Mật khẩu hiện tại không đúng').count()) > 0;
console.log(`  từ chối mật khẩu cũ sai: ${rejected}`);

console.log('Gõ đúng mật khẩu cũ — phải đổi được và đá phiên kia ra');
await A.getByLabel('Mật khẩu hiện tại').fill('matkhaudai');
await A.getByText('Đổi mật khẩu', { exact: true }).last().click();
await A.waitForTimeout(2000);
await shot(A, '88-da-doi-mat-khau');
const changed = (await A.getByText(/Đã đổi mật khẩu/).count()) > 0;
console.log(`  đổi được: ${changed}`);

// Phiên kia phải chết hẳn: tải lại trang là về màn chưa đăng nhập.
await B.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
await B.waitForTimeout(2000);
await shot(B, '89-phien-kia-bi-da-ra');
const kicked = (await B.getByText('Chưa đăng nhập').count()) > 0 || (await B.getByText('Đăng nhập để giữ thành tích').count()) > 0;
console.log(`  phiên kia bị đá ra: ${kicked}`);

// Và mật khẩu mới dùng được thật.
console.log('Mật khẩu mới phải đăng nhập được');
await B.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await B.waitForTimeout(1400);
await B.getByLabel('Email').fill(MAIL);
await B.getByLabel('Mật khẩu').fill('matkhaumoihon');
await B.getByText('Đăng nhập', { exact: true }).last().click();
await B.waitForTimeout(2000);
const backIn = (await B.getByText(NAME).count()) > 0;
console.log(`  vào lại bằng mật khẩu mới: ${backIn}`);

await browser.close();
finish(
  [
  [hasPw && hasDevices && hasExport && hasBio, 'Thẻ Cài đặt thiếu mục.'],
  [bioShown, 'Giới thiệu không hiện trên hồ sơ.'],
  [twoDevices, 'Không thấy thiết bị khác đang đăng nhập.'],
  [rejected, 'Đổi mật khẩu không đòi đúng mật khẩu cũ.'],
  [changed, 'Không đổi được mật khẩu.'],
  [kicked, 'Đổi mật khẩu xong mà thiết bị kia vẫn đăng nhập được.'],
  [backIn, 'Mật khẩu mới không đăng nhập được.'],
  ],
  // Bài này **cố ý** gõ sai mật khẩu một lần (400) và cố ý làm chết một
  // phiên (401). Hai mã đó là kết quả mong muốn, không phải lỗi trang.
  (e) => e.includes('400') || e.includes('401'),
);
console.log('\nĐổi mật khẩu, quản lý thiết bị và giới thiệu đều chạy thật.');
