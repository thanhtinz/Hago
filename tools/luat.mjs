/**
 * Trang luật chơi của từng bộ môn.
 *
 * Mười ba bản đặc tả luật nằm trong `docs/rules/`, nhưng đó là tài liệu
 * viết cho người cài engine. Người chơi mở app lên thì không có chỗ nào
 * đọc được luật — họ phải đoán từ chính bàn cờ.
 *
 * Bài này đi đúng ba đường mà người ta thực sự đi: bấm nút "Luật" trên thẻ
 * ở sảnh, chạm vào một thẻ bộ môn **chưa mở**, và bấm dấu hỏi ngay trong
 * ván đang đánh. Kèm một điều dễ làm sai: nút "Đấu với máy" chỉ được hiện
 * ở bộ môn đã có engine — mời người ta vào một ván không tồn tại thì tệ
 * hơn là không mời.
 */
import { errors, finish, launch, openPage, shot, BASE } from './lib.mjs';

const browser = await launch();
const page = await openPage(browser, 'L');

console.log('Mở luật từ nút trên thẻ ở sảnh');
await page.getByLabel('Luật Cờ Gánh').click();
await page.waitForTimeout(1400);
await shot(page, '112-luat-co-ganh');

const ganhTitle = (await page.getByText('Luật Cờ Gánh').count()) > 0;
// Câu tóm tắt là thứ phân biệt cờ gánh với mọi bộ môn khác: quân không bị
// nhấc khỏi bàn mà đổi màu.
const ganhSum = (await page.getByText(/quân bị ăn chỉ/).count()) > 0;
const ganhBlocks =
  (await page.getByText('Cách đi', { exact: true }).count()) > 0 &&
  (await page.getByText('Thắng thế nào', { exact: true }).count()) > 0;
// Nhắm theo nút, không theo chữ: chữ "Đấu với máy" còn nằm ở sảnh và ở
// dòng giải thích các chế độ chơi.
const playBtn = page.getByRole('button', { name: 'Đấu với máy — Cờ Gánh' });
const ganhPlay = (await playBtn.count()) > 0;
console.log(`  tiêu đề: ${ganhTitle} · tóm tắt đúng bộ môn: ${ganhSum} · đủ khối: ${ganhBlocks} · mời đấu máy: ${ganhPlay}`);

console.log('Nút "Đấu với máy" phải vào được ván thật');
await playBtn.click();
await page.waitForTimeout(2000);
// Sảnh vẫn nằm dưới trong ngăn xếp điều hướng nên nhãn "Luật Cờ Gánh" có
// hai cái; cái sau cùng là của màn đang mở.
const intoMatch = (await page.getByLabel('Đổi mức máy').count()) > 0;
console.log(`  vào ván đấu máy: ${intoMatch}`);

console.log('Bấm dấu hỏi ngay trong ván');
await page.getByLabel('Luật Cờ Gánh').last().click();
await page.waitForTimeout(1400);
await shot(page, '113-luat-mo-tu-trong-van');
const fromMatch = (await page.getByText(/quân bị ăn chỉ/).count()) > 0;
console.log(`  mở được từ trong ván: ${fromMatch}`);

console.log('Thẻ bộ môn chưa mở cũng phải trả lời được "đang chờ cái gì"');
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
await page.getByLabel('Xem luật Cờ Vây, chưa mở').click();
await page.waitForTimeout(1600);
await shot(page, '114-luat-bo-mon-chua-mo');
const vayRules = (await page.getByText(/Vây đất/).count()) > 0;
const saysPending = (await page.getByText(/Bộ môn này chưa mở/).count()) > 0;
// Không có engine thì không có ván. Nút mời đấu máy ở đây là một lời hứa suông.
const noPlay = (await page.getByRole('button', { name: /^Đấu với máy —/ }).count()) === 0;
console.log(`  có luật: ${vayRules} · nói rõ chưa mở: ${saysPending} · không mời đấu máy: ${noPlay}`);

await browser.close();
finish([
  [ganhTitle, 'Trang luật không có tiêu đề bộ môn.'],
  [ganhSum, 'Tóm tắt luật cờ gánh không hiện.'],
  [ganhBlocks, 'Thiếu khối "Cách đi" hoặc "Thắng thế nào".'],
  [ganhPlay, 'Bộ môn đã mở mà không mời đấu với máy.'],
  [intoMatch, 'Nút "Đấu với máy" không vào được ván.'],
  [fromMatch, 'Dấu hỏi trong ván không mở được trang luật.'],
  [vayRules, 'Bộ môn chưa mở không có luật để đọc.'],
  [saysPending, 'Không nói rõ bộ môn còn chưa mở.'],
  [noPlay, 'Bộ môn chưa có engine mà vẫn mời đấu với máy.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nLuật chơi đọc được từ sảnh, từ trong ván, và cả ở bộ môn chưa mở.');
