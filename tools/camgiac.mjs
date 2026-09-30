/**
 * Cảm giác bàn cờ: dấu nước vừa đi, âm thanh, rung, và mức máy nhớ được.
 *
 * Bốn thứ nhỏ mà thiếu cái nào cũng thấy:
 *
 * 1. Cờ gánh và ô ăn quan **không đánh dấu nước vừa đi**. Cờ caro có chấm
 *    chì từ đầu; hai bàn kia thì liếc đi một giây là mất dấu, mà ở cờ gánh
 *    nước vừa đi chính là thứ quyết định mình có bị vây không.
 * 2. Không có âm thanh nào trong toàn bộ app.
 * 3. Không có rung.
 * 4. Mức máy reset về Vừa mỗi lần mở màn.
 *
 * Âm thanh không chụp ảnh được, nên bài này kiểm nó theo cách duy nhất
 * đúng: xem app có **thật sự gọi Web Audio** không, bằng cách đặt bẫy lên
 * `AudioContext` trước khi trang chạy.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const P = await openPage(browser, 'P');

// Bẫy `AudioContext`: đếm số dao động được tạo. Đặt trước khi trang chạy
// nên nó bắt được cả tiếng phát ở nước đi đầu tiên.
await P.addInitScript(() => {
  const w = /** @type {any} */ (window);
  w.__osc = 0;
  const Real = w.AudioContext || w.webkitAudioContext;
  if (!Real) return;
  class Spy extends Real {
    createOscillator() {
      w.__osc += 1;
      return super.createOscillator();
    }
  }
  w.AudioContext = Spy;
  w.webkitAudioContext = Spy;
});
await P.goto(`${BASE}/play/co-ganh`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1800);

// ---- cờ gánh: dấu nước vừa đi -----------------------------------------

console.log('Cờ gánh: đi một nước rồi xem có vệt nước vừa đi không');
await shot(P, '96-ganh-truoc-khi-di');
// Vệt nước vừa đi mang `testID` riêng, nên đếm thẳng nó thay vì đếm số
// nét trên bàn — số nét còn phụ thuộc hoạ tiết nền và mũi tên gợi ý.
//
// Ở bàn này máy đi trước, nên **đã có** một vệt sẵn lúc mở màn. Đo bằng
// toạ độ của chính vệt đó: đi một nước thì vệt phải chuyển sang chỗ khác.
const trailAt = async () => {
  const g = P.locator('[data-testid="ganh-vet-nuoc-vua-di"] line');
  if ((await g.count()) === 0) return null;
  return `${await g.getAttribute('x1')},${await g.getAttribute('y1')},${await g.getAttribute('x2')},${await g.getAttribute('y2')}`;
};
const trailBefore = await trailAt();
// Nhấc một quân của mình rồi đi vào ô trống — đúng hai chạm người chơi bấm.
await P.getByLabel('Điểm hàng 5 cột 1').click();
await P.waitForTimeout(500);
await P.getByLabel('Điểm hàng 4 cột 2, trống').click();
await P.waitForTimeout(1200);
await shot(P, '97-ganh-dau-nuoc-vua-di');

// Vệt được vẽ bằng SVG nên đo bằng số phần tử <line> trên bàn: trước khi
// đi có đúng bộ nét phấn cố định, sau khi đi phải nhiều hơn một nét.
const trail = await trailAt();
console.log(`  toạ độ vệt nước vừa đi: ${trailBefore ?? '(chưa có)'} → ${trail ?? '(chưa có)'}`);

// ---- âm thanh ----------------------------------------------------------

const osc = await P.evaluate(() => /** @type {any} */ (window).__osc ?? 0);
console.log(`  số tiếng đã phát: ${osc}`);

// ---- mức máy nhớ được --------------------------------------------------

console.log('Đổi mức máy sang Khó, rồi mở lại màn — phải nhớ');
await P.getByLabel('Đổi mức máy').click();
await P.waitForTimeout(600);
await P.getByText('Khó', { exact: true }).click();
await P.waitForTimeout(900);
await shot(P, '98-da-chon-muc-kho');

await P.goto(`${BASE}/play/co-ganh`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1600);
const keptLevel = (await P.getByLabel('Đổi mức máy').innerText()).includes('Khó');
console.log(`  mở lại vẫn là mức Khó: ${keptLevel}`);

// Mức máy là một cài đặt của **ván với máy**, nên nó sống trong màn ván
// chứ không trên sảnh — sảnh không còn chế độ đấu máy nào để nói về. Ở
// đây chỉ kiểm nó vẫn nhớ sau khi rời trang hẳn.
await P.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1200);
await P.goto(`${BASE}/play/co-caro`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1600);
await shot(P, '99-nho-muc-may-qua-lan-mo');
const lobbySays = (await P.getByLabel('Đổi mức máy').innerText()).includes('Khó');
console.log(`  mở lại app vẫn nhớ mức: ${lobbySays}`);

// ---- ô ăn quan: dấu ô vừa bốc ------------------------------------------

console.log('Ô ăn quan: bốc một ô rồi xem có khoanh dấu ô đó không');
await P.goto(`${BASE}/play/o-an-quan`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1800);
const dashedBefore = await P.locator('[data-testid="quan-o-vua-boc"]').count();
await P.getByLabel(/^Ô của bạn số/).first().click();
await P.waitForTimeout(700);
// Chọn ô xong còn phải chọn chiều rải.
const dirs = P.getByLabel(/Rải sang/);
if (await dirs.count()) await dirs.first().click();
await P.waitForTimeout(1500);
await shot(P, '100-quan-dau-o-vua-boc');
const dashedAfter = await P.locator('[data-testid="quan-o-vua-boc"]').count();
console.log(`  khoanh ô vừa bốc: ${dashedBefore} → ${dashedAfter}`);

// ---- tắt âm thanh được -------------------------------------------------

console.log('Công tắc âm thanh và rung nằm trong Cài đặt');
// Thẻ Cài đặt chỉ có khi đã đăng nhập, nên đăng ký một tài khoản trước.
await P.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1400);
await signUp(P, `An ${String(Date.now()).slice(-5)}`, 'cg');
await P.goto(`${BASE}/me?tab=cai-dat`, { waitUntil: 'networkidle' });
await P.waitForTimeout(1800);
const hasToggle = (await P.getByLabel('Âm thanh').count()) > 0 && (await P.getByLabel('Rung').count()) > 0;
await shot(P, '101-cong-tac-am-thanh');
console.log(`  có công tắc âm thanh và rung: ${hasToggle}`);

await browser.close();
finish([
  [trail !== null && trail !== trailBefore, 'Bàn cờ gánh không vẽ vệt nước vừa đi, hoặc vệt không đổi sau nước đi.'],
  [osc > 0, 'Đi một nước mà không phát tiếng nào.'],
  [keptLevel, 'Mức máy không nhớ qua lần mở màn sau.'],
  [lobbySays, 'Mở lại app thì mất mức máy đang nhớ.'],
  [dashedAfter > dashedBefore, 'Ô ăn quan không khoanh ô vừa bốc.'],
  [hasToggle, 'Không có công tắc tắt âm thanh và rung.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nBàn cờ có dấu nước vừa đi, có tiếng, và nhớ mức máy.');
