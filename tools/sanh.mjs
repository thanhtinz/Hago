/**
 * Sảnh sống: nhịp thở, thành tích thật, mời bạn vào đúng phòng đang chờ.
 *
 * Ba lỗ hổng bài này canh:
 *
 * 1. Sảnh không nói được có ai đang ở đó không. Máy chủ đếm sẵn số người
 *    nối, số ván chạy, số người xếp hàng — nhưng mấy con số đó chỉ ra ở
 *    `/health`, không có đường nào tới màn hình.
 * 2. Thẻ người chơi in một dòng chữ cứng "Chưa xếp hạng · đã đăng nhập"
 *    cho cả người đã đánh trăm ván, trong khi `api.me()` đã trả về đủ.
 * 3. Mở phòng xong chỉ còn cách đọc năm ký tự qua điện thoại: không sao
 *    chép được mã, không mời được bạn vào đúng phòng vừa mở.
 */
import { errors, finish, launch, openPage, shot, signUp } from './lib.mjs';

const browser = await launch();
// Tên phải **riêng cho mỗi lần chạy**: cơ sở dữ liệu sống qua nhiều lần
// chạy harness, nên tìm "Bình Trần" sẽ ra cả một danh sách người cũ và
// `.first()` bắt nhầm một tài khoản đã đóng từ lần trước.
const tag = String(Date.now()).slice(-5);
const NA = `An ${tag}`;
const NB = `Bình ${tag}`;
const A = await signUp(await openPage(browser, 'A'), NA, 'sa');
const B = await signUp(await openPage(browser, 'B'), NB, 'sb');

// ---- nhịp thở ----------------------------------------------------------

console.log('Sảnh phải nói có bao nhiêu người đang ở đây');
await A.waitForTimeout(1500);
await shot(A, '73-sanh-nhip-tho');
const pulse = await A.getByText(/\d+ người đang chơi/).count();
const pulseText = pulse ? (await A.getByText(/\d+ người đang chơi/).first().innerText()).trim() : '(không có)';
console.log(`  dòng nhịp thở: ${pulseText}`);

// ---- kết bạn để có người mà mời ---------------------------------------

console.log('A kết bạn với B để lát nữa mời vào phòng');
await A.getByLabel('Bạn bè').click();
await A.waitForTimeout(1200);
await A.getByLabel('Tìm người chơi').fill(NB);
await A.waitForTimeout(1400);
await A.getByLabel('Kết bạn').first().click();
await A.waitForTimeout(1200);

// Chấm đỏ ở sảnh của B phải nhúc nhích **mà không cần mở lại màn**.
console.log('Chấm đỏ ở sảnh của B phải tự hiện, không cần mở lại màn');
await B.waitForTimeout(1500);
await shot(B, '74-cham-do-tu-hien');
const badge = await B.getByLabel(/Bạn bè, \d+ việc chờ/).count();
console.log(`  chấm đỏ tự hiện: ${badge > 0}`);

await B.getByLabel('Bạn bè').click();
await B.waitForTimeout(1200);
await B.getByLabel('Đồng ý').first().click();
await B.waitForTimeout(1400);
await B.getByLabel('Về sảnh').first().click();
await B.waitForTimeout(1200);

// ---- thành tích thật trên thẻ -----------------------------------------

console.log('Thẻ người chơi nói đúng tình trạng, không in chữ cứng');
await A.getByLabel('Về sảnh').first().click();
await A.waitForTimeout(1500);
const honest = (await A.getByText('Chưa xếp hạng · chưa đánh ván nào').count()) > 0;
console.log(`  chưa đánh ván nào thì nói đúng thế: ${honest}`);

// ---- mời bạn vào đúng phòng -------------------------------------------

console.log('A mở phòng rồi mời thẳng B vào');
await A.getByLabel('Tạo phòng').click();
await A.waitForTimeout(600);
await A.getByLabel('Cờ Caro', { exact: true }).click();
await A.waitForTimeout(1800);
await shot(A, '75-phong-cho-moi-ban');

const copyable = (await A.getByLabel('Sao chép mã phòng').count()) > 0;
const invitable = (await A.getByLabel(`Mời ${NB} vào phòng`).count()) > 0;
console.log(`  chép được mã: ${copyable} · mời được bạn: ${invitable}`);

await A.getByLabel('Sao chép mã phòng').click();
await A.waitForTimeout(600);
await shot(A, '76-da-chep-ma');
const copied = (await A.getByText('Đã chép mã').count()) > 0;
console.log(`  báo đã chép: ${copied}`);

await A.getByLabel(`Mời ${NB} vào phòng`).click();
await A.waitForTimeout(1500);
await shot(B, '77-loi-moi-vao-phong');
const gotInvite = (await B.getByText(new RegExp(NA)).count()) > 0;
console.log(`  B nhận được lời mời: ${gotInvite}`);

await B.getByText('Vào ngay').click();
await B.waitForTimeout(2500);
await shot(A, '78-vao-dung-phong-ghe-0');
await shot(B, '79-vao-dung-phong-ghe-1');

// Cả hai phải vào **đúng một** bàn, và A vẫn là chủ phòng ngồi ghế 0 —
// trước đây nhánh nhận lời gọi leave(from) và đá chính chủ phòng ra.
const aPlaying = (await A.getByLabel('Xin thua').count()) > 0;
const bPlaying = (await B.getByLabel('Xin thua').count()) > 0;
console.log(`  cả hai vào bàn: A=${aPlaying} B=${bPlaying}`);

await browser.close();
finish([
  [pulse > 0, 'Sảnh không hiện số người đang chơi.'],
  [badge > 0, 'Chấm đỏ lời mời kết bạn không tự hiện ở sảnh.'],
  [honest, 'Thẻ người chơi không nói đúng tình trạng xếp hạng.'],
  [copyable && copied, 'Mã phòng không sao chép được.'],
  [invitable && gotInvite, 'Không mời được bạn vào phòng đang chờ.'],
  [aPlaying && bPlaying, 'Nhận lời mời không đưa được cả hai vào cùng một bàn.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nSảnh có nhịp thở, thẻ nói thật, và mời bạn vào thẳng phòng đang chờ.');
