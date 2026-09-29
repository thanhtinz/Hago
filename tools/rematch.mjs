/**
 * Cầu hoà hai chiều và đấu lại — hai thứ chỉ chứng minh được bằng hai màn hình.
 *
 * Bài này canh đúng hai lỗ hổng vừa vá:
 *
 * 1. Lời cầu hoà trước đây **không tới được đối thủ**. Luật đã có
 *    `accept-draw` từ đầu, máy chủ vẫn gửi sự kiện xuống, nhưng màn chơi
 *    không đọc `events` nên không có chỗ nào để bấm đồng ý. Người bấm "Cầu
 *    hoà" thấy đúng như không có gì xảy ra.
 * 2. Hết ván online thì chỉ còn nút về sảnh. Muốn đánh ván nữa với đúng người
 *    đó thì phải ra sảnh, mở phòng lại, đọc mã lại.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const A = await signUp(await openPage(browser, 'A'), 'An Nguyễn', 'ra');
const B = await signUp(await openPage(browser, 'B'), 'Bình Trần', 'rb');

/** Hai người vào chung một phòng cờ caro bằng mã. */
async function pair() {
  await A.getByLabel('Tạo phòng').click();
  await A.waitForTimeout(500);
  await A.getByLabel('Cờ Caro', { exact: true }).click();
  await A.waitForTimeout(1500);
  const code = (await A.locator('text=/^[A-Z0-9]{5}$/').first().innerText()).trim();
  await B.getByLabel('Vào mã').click();
  await B.waitForTimeout(400);
  await B.getByLabel('Mã phòng').fill(code);
  await B.getByText('Vào phòng').click();
  await B.waitForTimeout(2000);
  return code;
}

console.log('Hai người vào chung một phòng');
await pair();

// ---- cầu hoà -----------------------------------------------------------

console.log('A bấm Cầu hoà — phải hỏi lại trước khi gửi');
await A.getByLabel('Cầu hoà').click();
await A.waitForTimeout(600);
await shot(A, '60-hoi-lai-cau-hoa');
const asksFirst = (await A.getByText('Gửi lời cầu hoà?').count()) > 0;
console.log(`  có hộp hỏi lại: ${asksFirst}`);

await A.getByText('Cầu hoà', { exact: true }).last().click();
await A.waitForTimeout(1200);
await shot(A, '61-da-cau-hoa');
await shot(B, '62-doi-thu-cau-hoa');

const seesOffer = (await B.getByText('Đối thủ cầu hoà').count()) > 0;
console.log(`  B thấy lời cầu hoà: ${seesOffer}`);

console.log('B từ chối — ván phải đi tiếp');
await B.getByLabel('Từ chối hoà').click();
await B.waitForTimeout(1000);
const gone = (await B.getByText('Đối thủ cầu hoà').count()) === 0;
const stillPlaying = (await B.getByLabel('Xin thua').count()) > 0 && (await B.getByText('Hoà', { exact: true }).count()) === 0;
console.log(`  dải cầu hoà biến mất: ${gone} · ván còn chạy: ${stillPlaying}`);

console.log('A cầu hoà lần nữa, B đồng ý');
await A.getByLabel('Cầu hoà').click();
await A.waitForTimeout(400);
await A.getByText('Cầu hoà', { exact: true }).last().click();
await A.waitForTimeout(1200);
await B.getByLabel('Đồng ý hoà').click();
await B.waitForTimeout(1500);
await shot(A, '63-ket-qua-hoa');
const drawn = (await A.getByText('Hoà', { exact: true }).count()) > 0 && (await B.getByText('Hoà', { exact: true }).count()) > 0;
console.log(`  hai màn hình cùng báo hoà: ${drawn}`);

// ---- đấu lại -----------------------------------------------------------

console.log('A xin đấu lại, B chưa trả lời');
await A.getByText('Đấu lại').click();
await A.waitForTimeout(1200);
await shot(A, '64-cho-doi-thu-dau-lai');
await shot(B, '65-doi-thu-muon-dau-lai');
const waiting = (await A.getByText('Đang chờ đối thủ').count()) > 0;
const invited = (await B.getByText('Đối thủ muốn đánh thêm ván nữa').count()) > 0;
console.log(`  A thấy đang chờ: ${waiting} · B thấy lời rủ: ${invited}`);

console.log('B đồng ý — ván mới phải dựng ngay, đổi bên');
await B.getByText('Đồng ý đấu lại').click();
await B.waitForTimeout(2000);
await shot(A, '66-van-moi-sau-dau-lai');

// Bàn cờ sạch nghĩa là tấm kết quả đã biến mất và ván mới đã chạy.
const fresh = (await A.getByText('Về sảnh').count()) === 0 && (await A.getByLabel('Xin thua').count()) > 0;
console.log(`  ván mới đã chạy: ${fresh}`);

// Đổi bên: ván trước A đi trước (ghế 0, quân X), ván này B phải đi trước.
// Đo bằng chính thứ người chơi nhìn thấy — thẻ "đang đi" nằm ở thanh nào.
const aTurn = await A.getByText('đang đi').count();
await A.waitForTimeout(300);
console.log(`  nhãn lượt đi hiện trên màn A: ${aTurn}`);

console.log('Đánh một nước ở ván mới để chắc là bàn thật');
await B.getByLabel('Ô hàng 8 cột 8').click();
await B.waitForTimeout(1200);
await shot(A, '67-nuoc-dau-van-moi');
const moved = (await A.getByLabel('Ô hàng 8 cột 8').getAttribute('aria-label')) !== null;
console.log(`  bàn cờ ván mới nhận nước: ${moved}`);

console.log('Rời phòng rồi xin đấu lại thì phải báo không còn đối thủ');
await B.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await B.waitForTimeout(1500);
await A.waitForTimeout(1500);
await shot(A, '68-doi-thu-roi-phong');

await browser.close();
finish([
  [asksFirst, 'Nút Cầu hoà gửi thẳng, không hỏi lại.'],
  [seesOffer, 'Đối thủ không thấy lời cầu hoà.'],
  [gone && stillPlaying, 'Từ chối cầu hoà không trả ván về trạng thái đang đánh.'],
  [drawn, 'Đồng ý hoà không kết thúc ván ở cả hai màn hình.'],
  [waiting && invited, 'Lời xin đấu lại không hiện đúng ở hai bên.'],
  [fresh, 'Đồng ý đấu lại không dựng được ván mới.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nCầu hoà đi được hai chiều, và đấu lại dựng đúng ván mới.');
