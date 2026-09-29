/**
 * Biên bản nước đi, và xem lại ván đã đánh.
 *
 * Trước batch này, ván xong là mất sạch: máy chủ chỉ lưu kết quả và điểm,
 * còn log input — thứ duy nhất dựng lại được toàn bộ ván — thì vứt đi cùng
 * với phòng. Không xem lại được, không tua nước được, và không xử tranh
 * chấp được. Ngay trong ván cũng không có chỗ nào trả lời "đối thủ vừa đi
 * đâu" ngoài trí nhớ.
 *
 * Bài này đánh một ván thật, mở biên bản giữa ván, rồi vào lịch sử bấm vào
 * đúng ván đó và tua từ cuối về đầu.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const A = await signUp(await openPage(browser, 'A'), `An ${tag}`, 'ma');
const B = await signUp(await openPage(browser, 'B'), `Bình ${tag}`, 'mb');

console.log('Hai người vào một ván ghép cặp');
for (const p of [A, B]) {
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

console.log('Đi vài nước rồi mở biên bản giữa ván');
await play(A, 7, 3);
await play(B, 12, 3);
await play(A, 7, 4);
await play(B, 12, 4);
await A.waitForTimeout(600);

await A.getByLabel('Biên bản').click();
await A.waitForTimeout(900);
await shot(A, '102-bien-ban-giua-van');
// Cột là chữ cái, hàng là số: ô hàng 8 cột 4 đọc là D8.
const hasD8 = (await A.getByText('D8', { exact: true }).count()) > 0;
const hasE8 = (await A.getByText('E8', { exact: true }).count()) > 0;
const counted = (await A.getByText('4 nước đã đi').count()) > 0;
console.log(`  biên bản có D8: ${hasD8} · có E8: ${hasE8} · đếm đúng số nước: ${counted}`);
await A.getByText('Đóng').click();
await A.waitForTimeout(600);

console.log('Đánh nốt cho xong ván');
await play(A, 7, 5);
await play(B, 12, 5);
await play(A, 7, 6);
await play(B, 12, 6);
await play(A, 7, 7);
await A.waitForTimeout(1500);

console.log('Vào lịch sử rồi bấm vào chính ván vừa đánh');
await A.getByText('Về sảnh').click();
await A.waitForTimeout(1500);
await A.getByLabel('Tôi').click();
await A.waitForTimeout(1600);
await A.getByLabel('Thẻ Lịch sử').click();
await A.waitForTimeout(1400);
await shot(A, '103-lich-su-bam-duoc');
await A.getByLabel(new RegExp(`Xem lại ván với Bình ${tag}`)).first().click();
await A.waitForTimeout(2200);
await shot(A, '104-xem-lai-the-cuoi');

// Mở ra là ở thế cờ cuối: người ta bấm vào một ván để xem nó kết thúc thế nào.
const atEnd = (await A.getByText(/Nước 9 trên 9/).count()) > 0;
console.log(`  mở ra ở thế cờ cuối: ${atEnd}`);

console.log('Tua về đầu ván — bàn cờ phải trống trơn');
await A.getByLabel('Về đầu ván').click();
await A.waitForTimeout(1200);
await shot(A, '105-xem-lai-dau-van');
const atStart = (await A.getByText(/Nước 0 trên 9/).count()) > 0;
// Ở thế mở ván, mọi ô đều còn trống nên nhãn nào cũng là "Ô hàng … cột …".
const emptyBoard = (await A.getByLabel('Ô hàng 8 cột 4').count()) > 0;
console.log(`  về được đầu ván: ${atStart} · bàn cờ trống: ${emptyBoard}`);

console.log('Tới một nước — phải có đúng một quân');
await A.getByLabel('Tới một nước').click();
await A.waitForTimeout(1000);
await shot(A, '106-xem-lai-mot-nuoc');
const oneMove = (await A.getByText(/Nước 1 trên 9/).count()) > 0;
console.log(`  tới được nước 1: ${oneMove}`);

await browser.close();
finish([
  [hasD8 && hasE8 && counted, 'Biên bản giữa ván không ghi đúng nước đi.'],
  [atEnd, 'Xem lại không mở ra ở thế cờ cuối.'],
  [atStart && emptyBoard, 'Không tua về được đầu ván.'],
  [oneMove, 'Nút tới một nước không chạy.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nBiên bản chạy trong ván, và ván đã đánh xem lại được từ đầu tới cuối.');
