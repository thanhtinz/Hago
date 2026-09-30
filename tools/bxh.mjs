/**
 * Bảng xếp hạng, đo bằng ván đánh thật.
 *
 * Nền tảng này tính điểm Elo từ ngày đầu nhưng không có chỗ nào nhìn thấy
 * điểm của người khác, nên điểm chỉ là một con số nằm trong cơ sở dữ liệu.
 *
 * Bài này đánh **đủ năm ván thật** giữa hai tài khoản mới để vượt ngưỡng
 * có tên trong bảng, rồi kiểm ba điều: bảng có tên, hạng của chính mình
 * hiện ở đáy màn kể cả khi nằm ngoài danh sách, và bảng của bộ môn chưa ai
 * đánh thì nói rõ vì sao trống.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const NA = `An ${tag}`;
const NB = `Bình ${tag}`;
const A = await signUp(await openPage(browser, 'A'), NA, 'ba');
const B = await signUp(await openPage(browser, 'B'), NB, 'bb');

/** Ghép cặp hai người vào một ván cờ caro tính xếp hạng. */
async function pair() {
  for (const p of [A, B]) {
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    await p.getByLabel('Ghép cặp').click();
    await p.waitForTimeout(400);
    await p.getByLabel('Cờ Caro', { exact: true }).click();
    await p.waitForTimeout(1200);
  }
  await A.waitForTimeout(1200);
}

/** Đặt một quân: hai chạm, vì ô chỉ ~23 điểm. */
const play = async (page, r, c) => {
  await page.getByLabel(`Ô hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(180);
  await page.getByLabel(`Đặt vào hàng ${r + 1} cột ${c + 1}`).click();
  await page.waitForTimeout(520);
};

console.log('Đánh năm ván ghép cặp để vượt ngưỡng có tên trong bảng');
for (let v = 0; v < 5; v++) {
  await pair();
  // Ai ngồi ghế 0 thì người đó đi trước; ghép cặp đưa người vào hàng trước
  // lên ghế 0, và ở đây luôn là A.
  for (let i = 0; i < 5; i++) {
    await play(A, 7, 3 + i);
    if (i < 4) await play(B, 12, 3 + i);
  }
  await A.waitForTimeout(700);
  console.log(`  ván ${v + 1}/5 xong`);
}

console.log('Mở bảng xếp hạng từ thanh dưới');
await A.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await A.waitForTimeout(1500);
await A.getByLabel('Xếp hạng').click();
await A.waitForTimeout(1800);
await shot(A, '80-bang-xep-hang-tong');

const hasMe = (await A.getByText(NA).count()) > 0;
const hasRank = (await A.getByText(/Bạn đang hạng/).count()) > 0;
// Bảng Tổng là tổng phần điểm vượt mốc của nhiều bộ môn, không phải một
// thang Elo — gắn danh hiệu lên nó là đọc một con số bằng cái thước của
// con số khác.
const tongKhongCoBac = (await A.getByTestId('danh-hieu').count()) === 0;
console.log(`  có tên mình trong bảng: ${hasMe} · có hạng của mình ở đáy: ${hasRank} · bảng Tổng không gắn danh hiệu: ${tongKhongCoBac}`);

console.log('Đổi sang bảng riêng của cờ caro');
await A.getByLabel('Bảng Cờ Caro').click();
await A.waitForTimeout(1500);
await shot(A, '81-bang-xep-hang-caro');
const caroHasMe = (await A.getByText(NA).count()) > 0;
// Năm ván xếp hạng là vừa đủ định hạng, nên cả hai người phải có danh hiệu.
const soBac = await A.getByTestId('danh-hieu').count();
const coBacChu = (await A.getByText(/Kỳ thủ|Cao thủ|Tay cờ|Kiện tướng|Nhập môn/).count()) > 0;
console.log(`  bảng cờ caro có tên mình: ${caroHasMe} · số thẻ danh hiệu: ${soBac} · đọc ra chữ: ${coBacChu}`);

console.log('Bảng của bộ môn chưa ai đánh phải nói rõ vì sao trống');
await A.getByLabel('Bảng Ô Ăn Quan').click();
await A.waitForTimeout(1500);
await shot(A, '82-bang-trong');
const explains = (await A.getByText('Chưa ai đủ điều kiện').count()) > 0;
console.log(`  nói rõ vì sao trống: ${explains}`);

// Người chưa đánh ván nào phải được nói thẳng là chưa có hạng, không phải
// nhìn một khoảng trống rồi tự đoán.
console.log('Người chưa đủ ván thì đáy màn nói thẳng còn thiếu bao nhiêu');
const C = await signUp(await openPage(browser, 'C'), `Cường ${tag}`, 'bc');
await C.getByLabel('Xếp hạng').click();
await C.waitForTimeout(1600);
await shot(C, '83-chua-co-hang');
const tellsNewcomer = (await C.getByText(/Bạn chưa có hạng/).count()) > 0;
const noiRoXepHang = (await C.getByText(/ván đấu xếp hạng/).count()) > 0;
console.log(`  nói thẳng với người mới: ${tellsNewcomer} · nói rõ phải là ván xếp hạng: ${noiRoXepHang}`);

console.log('Trang cá nhân phải có cấp và danh hiệu, và nói rõ cấp không đo mạnh yếu');
await A.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
await A.waitForTimeout(1800);
await shot(A, '122-ho-so-co-cap-va-danh-hieu');
const coCap = (await A.getByText(/^Cấp \d+$/).count()) > 0;
const coTienDo = (await A.getByText(/kinh nghiệm tới cấp/).count()) > 0;
const noiRoCap = (await A.getByText(/Nó không nói bạn mạnh cỡ nào/).count()) > 0;
const hoSoCoBac = (await A.getByTestId('danh-hieu').count()) > 0;
const coThongThao = (await A.getByTestId('thong-thao').count()) > 0;
console.log(`  cấp: ${coCap} · tiến độ: ${coTienDo} · nói rõ cấp là gì: ${noiRoCap} · danh hiệu: ${hoSoCoBac} · thông thạo: ${coThongThao}`);

console.log('Người chưa đánh ván nào thì không có vạch tiến độ và không có nhãn thông thạo');
await C.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
await C.waitForTimeout(1600);
await shot(C, '123-ho-so-chua-danh-van-nao');
const moiTinh = (await C.getByText(/kinh nghiệm tới cấp/).count()) === 0 && (await C.getByTestId('thong-thao').count()) === 0;
console.log(`  chưa có gì thì nói thẳng là chưa có gì: ${moiTinh}`);

await browser.close();
finish([
  [hasMe, 'Bảng tổng không có tên người vừa đánh năm ván.'],
  [hasRank, 'Không hiện hạng của chính mình ở đáy màn.'],
  [caroHasMe, 'Bảng riêng của cờ caro không có tên.'],
  [explains, 'Bảng trống không nói vì sao trống.'],
  [tellsNewcomer, 'Người chưa đủ ván không được nói là chưa có hạng.'],
  [noiRoXepHang, 'Không nói rõ ngưỡng đếm ván đấu xếp hạng.'],
  [tongKhongCoBac, 'Bảng Tổng gắn danh hiệu, mà nó không phải một thang Elo.'],
  [soBac >= 2 && coBacChu, 'Bảng từng bộ môn không hiện danh hiệu.'],
  [coCap && coTienDo && noiRoCap, 'Hồ sơ thiếu cấp, thiếu tiến độ, hoặc không nói cấp đo cái gì.'],
  [hoSoCoBac && coThongThao, 'Hồ sơ thiếu danh hiệu hoặc thiếu nhãn thông thạo.'],
  [moiTinh, 'Người chưa đánh ván nào vẫn bị vẽ vạch tiến độ hoặc nhãn thông thạo.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nBảng xếp hạng chỉ đếm ván xếp hạng, và danh hiệu, cấp, thông thạo đều đọc từ ván thật.');
