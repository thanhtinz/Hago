/**
 * Vượt ải: chơi thật một ải tới thắng, rồi kiểm sao và mở khoá.
 *
 * Ải ghim hạt giống nên **cả ván là xác định**: máy mức 1 đáp lại đúng một
 * cách mỗi lần. Nhờ thế một chuỗi nước tìm sẵn bằng mô phỏng chạy lại được
 * trong trình duyệt, và bài này chơi hết ải chứ không chỉ mở màn ra xem.
 *
 * Kèm ba điều dễ làm sai: ải chưa mở phải bấm không được, trong ải không
 * được đổi mức máy (mức là một phần luật của ải), và tiến độ phải sống qua
 * một lần tải lại trang kể cả khi chưa đăng nhập.
 */
import { errors, finish, launch, openPage, shot, BASE } from './lib.mjs';

const browser = await launch();
const page = await openPage(browser, 'V');

console.log('Mở danh sách ải từ sảnh');
await page.getByLabel('Vượt ải').click();
await page.waitForTimeout(1500);
await shot(page, '130-danh-sach-ai');
const coChuong = (await page.getByText(/Chương 1 · Vỡ lòng/).count()) > 0;
const coSao = (await page.getByText('0/30 sao').count()) > 0;
// Ải sau phải khoá cho tới khi qua ải trước.
const aiHaiKhoa = await page.getByLabel(/^Ải Mở giữa bàn, chưa mở$/).isDisabled();
console.log(`  có chương: ${coChuong} · đếm sao: ${coSao} · ải hai còn khoá: ${aiHaiKhoa}`);

console.log('Vào ải một');
await page.getByLabel(/^Ải Bàn chín ô/).click();
await page.waitForTimeout(2000);
await shot(page, '131-trong-ai');
// Bàn chín ô: hàng 10 không tồn tại. Đây là bằng chứng ải áp đúng cấu hình
// riêng của nó chứ không dùng bàn mặc định mười lăm.
const banChinO = (await page.getByLabel('Ô hàng 9 cột 9').count()) > 0 && (await page.getByLabel('Ô hàng 10 cột 1').count()) === 0;
// Mức máy là một phần luật của ải nên không được đổi giữa chừng.
const anNutMuc = (await page.getByLabel('Đổi mức máy').count()) === 0;
console.log(`  bàn chín ô: ${banChinO} · giấu nút đổi mức máy: ${anNutMuc}`);

console.log('Đánh hết ải cho tới khi thắng');
// Không chép một chuỗi nước cố định: máy mức 1 chỉ chặn với xác suất một
// nửa, nên cùng một hạt giống vẫn ra hai ván khác nhau. Bài này **chơi
// thật**, và thua thì **đánh lại** — đường đánh lại cũng là một đường cần
// kiểm.
//
// Quét hàng từ trái sang phải thì thua sạch: máy mức 1 không chỉ chặn, nó
// còn tự nối, và nó đủ năm quân trước. Nên bài kiểm phải biết đúng hai
// việc của một người chơi cờ caro: **chặn khi đối thủ sắp đủ**, và **nối
// vào chuỗi dài nhất của mình**.

const N = 9;
const HUONG = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** Đọc cả bàn cờ ra một mảng: '' trống, 'X' của mình, 'O' của máy. */
async function docBan() {
  const nhan = await page.getByLabel(/^Ô hàng \d+ cột \d+/).evaluateAll((els) =>
    els.map((e) => e.getAttribute('aria-label') ?? ''),
  );
  const ban = Array.from({ length: N }, () => Array.from({ length: N }, () => ''));
  for (const l of nhan) {
    const m = /^Ô hàng (\d+) cột (\d+)(?:, quân ([XO]))?$/.exec(l);
    if (!m) continue;
    const r = Number(m[1]) - 1;
    const c = Number(m[2]) - 1;
    if (r < N && c < N) ban[r][c] = m[3] ?? '';
  }
  return ban;
}

/** Đặt thử quân `q` vào (r,c) thì chuỗi dài nhất qua ô đó là bao nhiêu. */
function chuoiQua(ban, r, c, q) {
  let dai = 0;
  for (const [dr, dc] of HUONG) {
    let n = 1;
    for (const s of [1, -1]) {
      for (let k = 1; k < N; k++) {
        const y = r + dr * k * s;
        const x = c + dc * k * s;
        if (y < 0 || y >= N || x < 0 || x >= N || ban[y][x] !== q) break;
        n++;
      }
    }
    dai = Math.max(dai, n);
  }
  return dai;
}

/** Nước tiếp theo: đủ năm thì đặt, máy sắp đủ thì chặn, còn lại thì nối. */
function chonNuoc(ban) {
  let tot = null;
  let diem = -1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (ban[r][c] !== '') continue;
      const cua = chuoiQua(ban, r, c, 'X');
      const cuaMay = chuoiQua(ban, r, c, 'O');
      // Đủ năm là thắng ngay; chặn đứng trước mọi nước nối.
      const d =
        (cua >= 5 ? 1_000_000 : 0) +
        (cuaMay >= 5 ? 100_000 : 0) +
        cua * 100 +
        cuaMay * 90 -
        (Math.abs(r - 4) + Math.abs(c - 4));
      if (d > diem) {
        diem = d;
        tot = [r + 1, c + 1];
      }
    }
  }
  return tot;
}

const xong = async () => {
  if ((await page.getByText(/Qua ải Bàn chín ô/).count()) > 0) return 'thang';
  if ((await page.getByText(/Chưa qua ải/).count()) > 0) return 'thua';
  return null;
};

async function choiMotVan() {
  for (let i = 0; i < N * N; i++) {
    const nuoc = chonNuoc(await docBan());
    if (!nuoc) break;
    const o = page.getByLabel(new RegExp(`^Ô hàng ${nuoc[0]} cột ${nuoc[1]}$`));
    if ((await o.count()) === 0 || (await o.isDisabled())) break;
    await o.click();
    await page.waitForTimeout(500);
    const kq = await xong();
    if (kq) return kq;
  }
  return (await xong()) ?? 'chua-xong';
}

let thang = false;
for (let van = 1; van <= 6 && !thang; van++) {
  const kq = await choiMotVan();
  if (kq === 'thang') {
    thang = true;
    break;
  }
  console.log(`  ván ${van}: ${kq}, đánh lại`);
  const lai = page.getByLabel('Đánh lại ải này');
  if ((await lai.count()) === 0) break;
  await lai.click();
  await page.waitForTimeout(1500);
}
console.log(`  thắng được ải: ${thang}`);
await shot(page, '132-cham-sao');
const quaAi = (await page.getByText(/Qua ải Bàn chín ô/).count()) > 0;
const duDieuKien =
  (await page.getByText('Thắng ván').count()) > 0 &&
  (await page.getByText('Không dùng gợi ý').count()) > 0 &&
  (await page.getByText('Không lùi lại nước nào').count()) > 0;
const moAiSau = (await page.getByLabel(/^Ải sau · Mở giữa bàn$/).count()) > 0;
console.log(`  qua ải: ${quaAi} · nói rõ ba điều kiện: ${duDieuKien} · mời vào ải sau: ${moAiSau}`);

console.log('Về danh sách: sao đã ghi và ải hai đã mở');
await page.getByLabel('Về danh sách ải').click();
await page.waitForTimeout(1600);
await shot(page, '133-da-mo-ai-sau');
const daCoSao = (await page.getByText(/[1-3]\/30 sao/).count()) > 0;
// Phải khớp dạng '… , N sao', không phải '… , chưa mở' — hai chuỗi
// cùng bắt đầu bằng 'Ải Mở giữa bàn, '.
const aiHaiDaMo = (await page.getByLabel(/^Ải Mở giữa bàn, \d sao$/).count()) > 0;
console.log(`  đã cộng sao: ${daCoSao} · ải hai đã mở: ${aiHaiDaMo}`);

console.log('Tải lại trang: tiến độ phải còn, kể cả khi chưa đăng nhập');
await page.goto(`${BASE}/vuot-ai`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const conSau = (await page.getByText(/[1-3]\/30 sao/).count()) > 0;
console.log(`  tiến độ sống qua lần tải lại: ${conSau}`);

await browser.close();
finish([
  [coChuong && coSao, 'Danh sách ải thiếu chương hoặc thiếu số sao.'],
  [aiHaiKhoa, 'Ải chưa mở vẫn bấm được.'],
  [banChinO, 'Ải không áp cấu hình riêng — vẫn dùng bàn mặc định.'],
  [anNutMuc, 'Trong ải vẫn đổi được mức máy, mà mức là một phần luật của ải.'],
  [quaAi, 'Đánh thắng mà không qua ải.'],
  [duDieuKien, 'Tấm chấm sao không nói rõ từng điều kiện.'],
  [moAiSau, 'Qua ải rồi mà không mời vào ải sau.'],
  [daCoSao && aiHaiDaMo, 'Sao không được ghi, hoặc ải sau không mở.'],
  [conSau, 'Tiến độ mất sau khi tải lại trang.'],
  [errors.length === 0, 'Có lỗi trên trang.'],
]);
console.log('\nVượt ải chơi được hết một ải, chấm đúng sao, và mở ải sau.');
