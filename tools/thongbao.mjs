/**
 * Thông báo riêng, và chặn / báo cáo từ hồ sơ bất kỳ.
 *
 * Hai lỗ hổng bài này canh:
 *
 * 1. **Chuông đỏ dẫn tới chỗ trống.** Mục "Hệ thống" mở đúng kênh chung
 *    `he-thong`, trong khi chấm đỏ trên mục lại đếm cả kênh riêng
 *    `he-thong:<id>`. Một thông báo gửi riêng cho mình làm nổi số đỏ, bấm
 *    vào thì không thấy gì, và số đỏ không bao giờ tắt vì không ai đánh
 *    dấu đã đọc kênh riêng. Máy chủ có sẵn `systemFeed()` gộp hai kênh từ
 *    đầu; app chưa từng gọi tới nó.
 * 2. **Không sự kiện nào của người chơi sinh ra thông báo.** Kênh thông
 *    báo chỉ nhận thứ quản trị viên gõ tay, nên trên thực tế chuông không
 *    bao giờ sáng vì một việc thật.
 *
 * Và chặn / báo cáo trước đây chỉ có trong danh sách bạn — mà kẻ quấy rối
 * thì hiếm khi là bạn bè.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const NA = `An ${tag}`;
const NB = `Bình ${tag}`;
const A = await signUp(await openPage(browser, 'A'), NA, 'na');
const B = await signUp(await openPage(browser, 'B'), NB, 'nb');

const openSystem = async (page) => {
  await page.getByLabel(/Mở chat/).click();
  await page.waitForTimeout(700);
  await page.getByLabel(/Hệ thống/).click();
  await page.waitForTimeout(1400);
};

// ---- lời mời kết bạn sinh thông báo riêng ------------------------------

console.log('A gửi lời mời kết bạn — B phải nhận được một thông báo riêng');
await A.getByLabel('Bạn bè').click();
await A.waitForTimeout(1200);
await A.getByLabel('Tìm người chơi').fill(NB);
await A.waitForTimeout(1400);
await A.getByLabel('Kết bạn').first().click();
await A.waitForTimeout(1500);

await openSystem(B);
await shot(B, '90-thong-bao-rieng');
const gotNotice = (await B.getByText(new RegExp(`${NA} muốn kết bạn`)).count()) > 0;
console.log(`  B thấy thông báo riêng: ${gotNotice}`);

// Đọc rồi thì chấm đỏ phải tắt — trước đây nó không bao giờ tắt.
await B.getByLabel('Đóng', { exact: true }).click();
await B.waitForTimeout(1200);
await B.getByLabel(/Mở chat/).click();
await B.waitForTimeout(900);
await shot(B, '91-cham-do-da-tat');
const stillRed = (await B.getByLabel(/Hệ thống, \d+ chưa đọc/).count()) > 0;
console.log(`  chấm đỏ đã tắt sau khi đọc: ${!stillRed}`);
await B.getByLabel('Đóng', { exact: true }).click();
await B.waitForTimeout(600);

// ---- kết quả ván xếp hạng sinh thông báo riêng -------------------------

console.log('B nhận lời, rồi hai người đánh một ván ghép cặp');
await B.getByLabel('Bạn bè').click();
await B.waitForTimeout(1200);
await B.getByLabel('Đồng ý').first().click();
await B.waitForTimeout(1200);

for (const p of [A, B]) {
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.getByLabel('Ghép cặp').click();
  await p.waitForTimeout(400);
  await p.getByLabel('Cờ Caro', { exact: true }).click();
  await p.waitForTimeout(1200);
}
await A.waitForTimeout(1200);

const play = async (page, r, c) => {
  await page.getByLabel(`Ô hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(180);
  await page.getByLabel(`Đặt vào hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(520);
};
for (let i = 0; i < 5; i++) {
  await play(A, 7, 3 + i);
  if (i < 4) await play(B, 12, 3 + i);
}
await A.waitForTimeout(1200);

console.log('Kết quả ván xếp hạng phải vào hộp thông báo, kèm điểm');
await A.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await A.waitForTimeout(1500);
await openSystem(A);
await shot(A, '92-thong-bao-ket-qua-van');
const gotResult = (await A.getByText(/Thắng .* ở Cờ Caro\. Điểm \+\d+\./).count()) > 0;
console.log(`  A thấy kết quả kèm điểm: ${gotResult}`);
await A.getByLabel('Đóng', { exact: true }).click();
await A.waitForTimeout(600);

// ---- chặn và báo cáo từ hồ sơ bất kỳ -----------------------------------

console.log('Chặn và báo cáo đứng được ở hồ sơ, không chỉ trong danh sách bạn');
const C = await signUp(await openPage(browser, 'C'), `Cường ${tag}`, 'nc');
await C.getByLabel('Bạn bè').click();
await C.waitForTimeout(1200);
await C.getByLabel('Tìm người chơi').fill(NB);
await C.waitForTimeout(1500);
// Vào hồ sơ người lạ qua kết quả tìm kiếm.
await C.getByLabel(`Xem hồ sơ ${NB}`).click();
await C.waitForTimeout(1600);
await shot(C, '93-ho-so-nguoi-la');
const canReport = (await C.getByLabel('Chặn hoặc báo cáo').count()) > 0;
console.log(`  hồ sơ người lạ có đường chặn/báo cáo: ${canReport}`);

let reported = false;
if (canReport) {
  await C.getByLabel('Chặn hoặc báo cáo').click();
  await C.waitForTimeout(800);
  await shot(C, '94-chan-hoac-bao-cao');
  await C.getByText('Báo cáo người này', { exact: true }).click();
  await C.waitForTimeout(600);
  await C.getByLabel('Chuyện gì đã xảy ra').fill('Nhắn tin khó chịu trong sảnh chung');
  await C.getByText('Quấy rối').click();
  await C.waitForTimeout(1500);
  await shot(C, '95-da-bao-cao');
  reported = (await C.getByText('Đã gửi báo cáo. Cảm ơn bạn.').count()) > 0;
}
console.log(`  gửi được báo cáo: ${reported}`);

// Báo cáo phải vào được hàng đợi quản trị.
const res = await fetch('http://127.0.0.1:8787/api/admin/reports', {
  headers: { authorization: `Bearer ${process.env.ADMIN_TOKEN ?? 'bimat-quan-tri'}` },
});
const queue = res.ok ? await res.json() : { reports: [] };
const inQueue = (queue.reports ?? []).some((r) => r.note === 'Nhắn tin khó chịu trong sảnh chung');
console.log(`  báo cáo vào hàng đợi quản trị: ${inQueue}`);

await browser.close();
finish([
  [gotNotice, 'Thông báo riêng không hiện trong mục Hệ thống.'],
  [!stillRed, 'Đọc thông báo rồi mà chấm đỏ vẫn sáng.'],
  [gotResult, 'Kết quả ván xếp hạng không vào hộp thông báo.'],
  [canReport && reported, 'Không chặn/báo cáo được từ hồ sơ người lạ.'],
  [inQueue, 'Báo cáo không vào hàng đợi quản trị.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nThông báo riêng tới nơi, chấm đỏ tắt đúng lúc, và báo cáo vào hàng đợi.');
