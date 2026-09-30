/**
 * Xem ván người khác đang đánh.
 *
 * Nền tảng có phát lại ván đã xong từ lâu, nhưng không có cách nào xem một
 * ván **đang chạy**. Với một sảnh cờ thì đó là thiếu một nửa: cách học cờ cũ
 * nhất là đứng sau lưng người đang đánh.
 *
 * Ba người thật ở ba cửa sổ riêng. Hai người đánh, người thứ ba mở sảnh,
 * thấy ván trong danh sách "Đang đánh", bấm vào xem, và phải thấy nước đi
 * hiện ra trên màn mình ngay khi người kia đặt quân — không phải sau khi
 * tải lại trang.
 *
 * Kèm hai điều dễ làm sai: khán giả bấm vào bàn cờ thì **không được** đi
 * nước nào, và hai người đang đánh phải biết có người đang xem.
 */
import { ghepCap, errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const NA = `An ${tag}`;
const NB = `Bình ${tag}`;
const A = await signUp(await openPage(browser, 'A'), NA, 'ka');
const B = await signUp(await openPage(browser, 'B'), NB, 'kb');
const C = await signUp(await openPage(browser, 'C'), `Cường ${tag}`, 'kc');

/** Đặt một quân caro: hai chạm, vì ô chỉ ~23 điểm. */
const play = async (page, r, c) => {
  await page.getByLabel(`Ô hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(180);
  await page.getByLabel(`Đặt vào hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(520);
};

console.log('Hai người vào một ván ghép cặp');
for (const p of [A, B]) {
  await ghepCap(p, 'Cờ Caro');
}
await A.waitForTimeout(1200);
await play(A, 7, 7);

console.log('Người thứ ba mở trang Ván đấu từ thanh dưới, thẻ "Đang đánh"');
await C.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await C.waitForTimeout(1800);
await C.getByLabel('Ván đấu').click();
await C.waitForTimeout(1200);
await C.getByLabel(/^Thẻ Đang đánh/).click();
await C.waitForTimeout(900);
await shot(C, '115-van-dau-dang-danh');
const listed = (await C.getByText(`${NA} — ${NB}`).count()) > 0;
console.log(`  thẻ liệt kê ván của hai người kia: ${listed}`);

console.log('Bấm vào để xem');
await C.getByLabel(`Xem ván ${NA} với ${NB}`).click();
await C.waitForTimeout(2000);
await shot(C, '116-dang-xem-van');
const saysWatching = (await C.getByText(/Bạn đang xem/).count()) > 0;
// Nước A vừa đi trước khi C vào: vào giữa ván là phải thấy cả thế cờ cũ.
const sawFirst = (await C.getByLabel('Ô hàng 8 cột 8').count()) > 0;
const bothNames = (await C.getByText(NA).count()) > 0 && (await C.getByText(NB).count()) > 0;
console.log(`  nói rõ đang xem: ${saysWatching} · thấy thế cờ có sẵn: ${sawFirst} · có tên hai bên: ${bothNames}`);

console.log('Hai người đang đánh phải biết có người xem');
await A.waitForTimeout(900);
const aSeesFan = (await A.getByLabel('1 người đang xem').count()) > 0;
await shot(A, '117-nguoi-choi-thay-so-khan-gia');
console.log(`  người chơi thấy số khán giả: ${aSeesFan}`);

console.log('Nước mới phải tới thẳng màn khán giả, không cần tải lại');
await play(B, 12, 3);
await C.waitForTimeout(900);
await shot(C, '118-nuoc-moi-toi-man-khan-gia');
const live = (await C.getByLabel('Ô hàng 13 cột 4, quân O').count()) > 0;
console.log(`  nước mới hiện trên màn khán giả: ${live}`);

console.log('Khán giả không đi được nước nào — ô cờ phải tắt hẳn, không chỉ im lặng');
// Tắt hẳn chứ không để bấm rồi bỏ qua: một cái nút bấm được mà không có gì
// xảy ra thì người ta bấm lại, và lần thứ ba họ nghĩ app hỏng.
const stayedOut = await C.getByLabel('Ô hàng 5 cột 5').isDisabled();
await C.waitForTimeout(500);
// Và bàn cờ của người đang đánh cũng không đổi.
const boardClean = (await A.getByLabel('Ô hàng 5 cột 5, quân X').count()) === 0;
console.log(`  ô cờ tắt với khán giả: ${stayedOut} · bàn của người chơi sạch: ${boardClean}`);

console.log('Rời màn xem thì số khán giả về lại 0');
await C.getByLabel('Về sảnh').last().click();
await C.waitForTimeout(1500);
await A.waitForTimeout(900);
const gone = (await A.getByLabel('1 người đang xem').count()) === 0 && (await C.getByText(/Bạn đang xem/).count()) === 0;
console.log(`  thôi xem được, và người chơi thấy số khán giả về 0: ${gone}`);

await browser.close();
finish([
  [listed, 'Thẻ "Đang đánh" không liệt kê ván đang chạy.'],
  [saysWatching, 'Màn xem không nói rõ mình đang ở vai khán giả.'],
  [sawFirst, 'Vào giữa ván mà không thấy thế cờ đã có.'],
  [bothNames, 'Màn xem không hiện tên hai người đang đánh.'],
  [aSeesFan, 'Người chơi không biết có người đang xem.'],
  [live, 'Nước mới không tới màn khán giả.'],
  [stayedOut, 'Ô cờ vẫn bấm được với khán giả.'],
  [boardClean, 'Chạm của khán giả lọt vào ván thật.'],
  [gone, 'Rời màn xem không thoát ra được.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nXem được ván đang đánh, nước tới thẳng màn, và khán giả không chen vào ván.');
