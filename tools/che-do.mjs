/**
 * Chọn chế độ, danh mục bộ môn, và hai làn đánh thường / xếp hạng.
 *
 * Sảnh không còn là một danh mục: không thẻ bộ môn nào nằm trên đó, và
 * chọn chế độ là một **tấm** mở ngay trên sảnh chứ không phải một màn của
 * router. Bài này đi đúng đường người dùng đi sau khi đổi: hai chip cấu
 * hình, bốn thẻ chế độ, lưới thẻ bộ môn có tranh, rồi một nút vàng.
 *
 * Kèm điều dễ làm sai nhất của cả tính năng, và là một **lỗi im lặng**:
 * hai người bấm hai làn khác nhau mà bị ghép vào nhau thì ván tính điểm
 * cho một bên và không tính cho bên kia, không ai nhận được lỗi gì.
 */
import { errors, finish, launch, openPage, shot, signUp, BASE } from './lib.mjs';

const browser = await launch();
const tag = String(Date.now()).slice(-5);
const A = await signUp(await openPage(browser, 'A'), `An ${tag}`, 'ca');
const B = await signUp(await openPage(browser, 'B'), `Bình ${tag}`, 'cb');

console.log('Sảnh không được đổ bộ môn nào ra ngoài');
await A.waitForTimeout(800);
await shot(A, '124-sanh-gon');
// Thẻ bộ môn cũ của sảnh mang nhãn "Chơi Cờ Caro"; danh mục mang nhãn
// "Xem luật …, chưa mở". Không nhãn nào được còn trên sảnh.
const khongCoTheBoMon =
  (await A.getByLabel(/^Chơi /).count()) === 0 && (await A.getByLabel(/, chưa mở$/).count()) === 0;
const khongCoTieuDeMay = (await A.getByText('Đấu với máy').count()) === 0;
// Hai trục, hai chip, và **đúng một** nút vàng.
const haiChip = (await A.getByLabel('Đổi bộ môn', { exact: true }).count()) === 1 && (await A.getByLabel('Đổi chế độ', { exact: true }).count()) === 1;
const motNutVang =
  (await A.getByLabel('VÀO TRẬN').count()) === 1 &&
  (await A.getByLabel('Đánh lại').count()) === 0 &&
  (await A.getByLabel('Vào chơi').count()) === 0;
console.log(`  sảnh sạch thẻ bộ môn: ${khongCoTheBoMon} · hai chip: ${haiChip} · đúng một nút vàng: ${motNutVang}`);

console.log('Cụm hành động không cuộn khỏi màn');
const truoc = await A.getByLabel('VÀO TRẬN').boundingBox();
await A.mouse.wheel(0, 2000);
await A.waitForTimeout(700);
const sau = await A.getByLabel('VÀO TRẬN').boundingBox();
const neoCung = Math.abs(truoc.y - sau.y) < 2;
console.log(`  nút vàng đứng yên khi cuộn: ${neoCung} (${truoc.y} → ${sau.y})`);

console.log('Tấm chọn chế độ có đủ bốn thẻ, và thân là lưới thẻ có tranh');
await A.getByLabel('Đổi chế độ', { exact: true }).click();
await A.waitForTimeout(1200);
await shot(A, '125-chon-che-do');
const duCheDo =
  (await A.getByLabel('Chế độ Đấu hạng', { exact: true }).count()) > 0 &&
  (await A.getByLabel('Chế độ Đánh thường', { exact: true }).count()) > 0 &&
  (await A.getByLabel('Chế độ Vượt ải', { exact: true }).count()) > 0 &&
  (await A.getByLabel('Chế độ Với bạn', { exact: true }).count()) > 0;
// Mười ba thẻ, mười thẻ khoá. Đây là chỗ tấm cũ lọc mất mười bộ môn ở
// đúng luồng vào trận, và không bài nào bắt được.
const duMuoiBa = (await A.getByTestId('the-che-do').count()) === 13;
const duMuoiKhoa = (await A.getByLabel(/, chưa mở$/).count()) === 10;
// Thẻ chứ không phải hàng: mỗi thẻ phải mang một bức tranh SVG thật. Nhìn
// ảnh chụp thì một hàng có icon trông vẫn "có hình", nên phải đếm.
const soSvg = await A.getByTestId('the-che-do').evaluateAll((els) => els.filter((e) => e.querySelector('svg')).length);
const theCoTranh = soSvg === 13;
console.log(`  đủ bốn thẻ chế độ: ${duCheDo} · 13 thẻ bộ môn: ${duMuoiBa} · 10 thẻ khoá: ${duMuoiKhoa} · thẻ có tranh: ${theCoTranh} (${soSvg}/13)`);

// Hai thẻ còn lại, chụp để soi bằng mắt: chúng là chỗ duy nhất bộ hình
// CHẾ ĐỘ xuất hiện, và một bức hình hỏng thì không bài kiểm nào bắt được.
await A.getByLabel('Chế độ Vượt ải', { exact: true }).click();
await A.waitForTimeout(700);
await shot(A, '134-che-do-vuot-ai');
const coDauVoiMay = (await A.getByLabel('Đấu với máy', { exact: true }).count()) === 1;
await A.getByLabel('Chế độ Với bạn', { exact: true }).click();
await A.waitForTimeout(700);
await shot(A, '135-che-do-voi-ban');
const coTaoPhongVaoMa =
  (await A.getByLabel('Tạo phòng', { exact: true }).count()) === 1 && (await A.getByLabel('Vào mã', { exact: true }).count()) === 1;
// "Bạn bè" không phải một chế độ chơi: nó là mở danh bạ, và nó ở góc phải
// dải danh tính cùng với chấm đếm lời mời.
const khongCoBanBeODay = (await A.getByLabel(/^Bạn bè/).count()) <= 1;
console.log(`  tab vượt ải có thẻ đấu máy: ${coDauVoiMay} · tab với bạn đủ hai thẻ: ${coTaoPhongVaoMa}`);
await A.getByLabel('Chế độ Đấu hạng', { exact: true }).click();
await A.waitForTimeout(600);

console.log('Làn xếp hạng không cho chọn mức thời gian, và nói rõ vì sao');
const xhKhongCoChip = (await A.getByLabel('Mức Cờ chớp').count()) === 0;
const xhNoiRo = (await A.getByText(/Mức thời gian theo bộ môn/).count()) > 0;
console.log(`  không có chip mức giờ: ${xhKhongCoChip} · nói rõ vì sao: ${xhNoiRo}`);

console.log('Chạm một thẻ bộ môn là NẠP cấu hình, không phải vào hàng chờ');
await A.getByLabel('Cờ Gánh', { exact: true }).click();
await A.waitForTimeout(900);
const napChuBan = (await A.getByText('Đang tìm đối', { exact: true }).count()) === 0;
const chipDoiTheo = (await A.getByLabel('Đổi bộ môn', { exact: true }).innerText()).includes('Cờ Gánh');
console.log(`  không vào hàng chờ: ${napChuBan} · chip đổi theo: ${chipDoiTheo}`);
await shot(A, '126-nap-cau-hinh');

console.log('Hai làn khác nhau thì KHÔNG được ghép vào nhau');
await A.getByLabel('Đổi chế độ', { exact: true }).click();
await A.waitForTimeout(900);
await A.getByLabel('Chế độ Đấu hạng', { exact: true }).click();
await A.waitForTimeout(500);
await A.getByLabel('Cờ Caro', { exact: true }).click();
await A.waitForTimeout(600);
await A.getByLabel('VÀO TRẬN').click();
await A.waitForTimeout(1800);
// Hàng chờ là một **lớp phủ**, không phải một route: đường dẫn không đổi.
const urlKhongDoi = new URL(A.url()).pathname === '/';
const coDongHo = (await A.getByText(/^\d:\d\d$/).count()) > 0;
const soDau = await A.getByText(/^\d:\d\d$/).innerText();
await A.waitForTimeout(2500);
const soSau = await A.getByText(/^\d:\d\d$/).innerText();
const dongHoChay = soDau !== soSau;
console.log(`  hàng chờ phủ lên sảnh: ${urlKhongDoi} · đồng hồ chạy thật: ${dongHoChay} (${soDau} → ${soSau})`);
await shot(A, '127-hang-cho-phu-len-sanh');

await B.getByLabel('Đổi chế độ', { exact: true }).click();
await B.waitForTimeout(900);
await B.getByLabel('Chế độ Đánh thường', { exact: true }).click();
await B.waitForTimeout(600);
const thuongCoChip = (await B.getByLabel('Mức Cờ chớp').count()) > 0;
await B.getByLabel('Cờ Caro', { exact: true }).click();
await B.waitForTimeout(600);
await B.getByLabel('VÀO TRẬN').click();
await B.waitForTimeout(3000);
const aConCho = (await A.getByLabel('Xin thua').count()) === 0;
const bConCho = (await B.getByLabel('Xin thua').count()) === 0;
console.log(`  làn thường có chip mức giờ: ${thuongCoChip} · A vẫn chờ: ${aConCho} · B vẫn chờ: ${bConCho}`);

console.log('Huỷ tìm đối là một chạm, và không mất gì');
await A.getByLabel('Huỷ', { exact: true }).click();
await A.waitForTimeout(1500);
const conNut = await A.getByLabel('VÀO TRẬN').count();
// `exact` là bắt buộc ở đây: dòng nhịp thở của sảnh có chữ "1 đang tìm
// đối", và `getByText` khớp chuỗi con không phân biệt hoa thường.
const conCho = await A.getByText('Đang tìm đối', { exact: true }).count();
const huyVeSanh = conNut === 1 && conCho === 0;
console.log(`  huỷ xong về đúng sảnh: ${huyVeSanh} (nút=${conNut} còn-chờ=${conCho})`);

console.log('Cùng làn thì ghép ngay, và ván xếp hạng phải tính điểm');
await A.getByLabel('VÀO TRẬN').click();
await A.waitForTimeout(1200);
await B.goto(`${BASE}/online/quick?game=co-caro&lan=xh`, { waitUntil: 'networkidle' });
await B.waitForTimeout(3000);
const vaoBan = (await B.getByLabel('Xin thua').count()) > 0 && (await A.getByLabel('Xin thua').count()) > 0;
const tinhDiem = (await A.getByText('Xếp hạng').count()) > 0;
console.log(`  cả hai vào bàn: ${vaoBan} · ván ghi là xếp hạng: ${tinhDiem}`);
await shot(A, '128-van-xep-hang');

console.log('Danh mục bộ môn chia bốn nhóm thể loại');
const C = await openPage(browser, 'C');
await C.getByLabel('Bộ môn', { exact: true }).last().click();
await C.waitForTimeout(1500);
await shot(C, '129-danh-muc-bo-mon');
const duTheLoai =
  (await C.getByText('Cờ dân gian Việt').count()) > 0 &&
  (await C.getByText('Cờ quân').count()) > 0 &&
  (await C.getByText('Cờ nối hàng').count()) > 0 &&
  (await C.getByText('Cờ chiếm ô').count()) > 0;
const duThe = (await C.getByLabel(/^Xem luật .*, chưa mở$/).count()) === 10;
// Thanh điều hướng đi cùng người dùng, không chỉ mọc ở sảnh.
const coThanhTab = (await C.getByRole('tab', { name: 'Bộ môn' }).count()) === 1;
console.log(`  đủ bốn nhóm thể loại: ${duTheLoai} · đủ mười bộ môn chưa mở: ${duThe} · có thanh tab: ${coThanhTab}`);

await browser.close();
finish(
  [
    [khongCoTheBoMon, 'Sảnh vẫn đổ thẻ bộ môn ra ngoài.'],
    [khongCoTieuDeMay, 'Sảnh vẫn có khối "Đấu với máy".'],
    [haiChip, 'Sảnh thiếu một trong hai chip cấu hình.'],
    [motNutVang, 'Sảnh không có đúng một nút vàng.'],
    [neoCung, 'Cụm hành động cuộn khỏi màn.'],
    [duCheDo, 'Tấm chọn chế độ thiếu một trong bốn thẻ.'],
    [duMuoiBa, 'Tấm chọn chế độ không hiện đủ mười ba bộ môn.'],
    [duMuoiKhoa, 'Tấm chọn chế độ giấu mất bộ môn chưa mở.'],
    [theCoTranh, 'Thẻ chế độ tụt về một hàng icon, không còn tranh.'],
    [coDauVoiMay, 'Tab vượt ải thiếu thẻ Đấu với máy.'],
    [coTaoPhongVaoMa, 'Tab với bạn thiếu Tạo phòng hoặc Vào mã.'],
    [khongCoBanBeODay, 'Bạn bè bị nhét lại vào danh sách chế độ chơi.'],
    [xhKhongCoChip, 'Làn xếp hạng vẫn cho chọn mức thời gian, mà máy chủ thì bỏ qua lựa chọn đó.'],
    [xhNoiRo, 'Không nói vì sao làn xếp hạng không chọn được mức giờ.'],
    [napChuBan && chipDoiTheo, 'Chạm thẻ bộ môn không nạp cấu hình mà bắn thẳng vào hàng chờ.'],
    [urlKhongDoi, 'Hàng chờ là một màn riêng chứ không phải lớp phủ.'],
    [dongHoChay, 'Đồng hồ hàng chờ là chữ tĩnh, không đếm thật.'],
    [thuongCoChip, 'Làn đánh thường mất luôn hàng chip mức giờ.'],
    [aConCho && bConCho, 'Hai làn khác nhau mà bị ghép vào nhau.'],
    [huyVeSanh, 'Huỷ tìm đối không trả về sảnh.'],
    [vaoBan, 'Cùng làn xếp hạng mà không ghép được.'],
    [tinhDiem, 'Ván ghép cặp xếp hạng không ghi là xếp hạng.'],
    [duTheLoai, 'Danh mục thiếu nhóm thể loại.'],
    [duThe, 'Danh mục không đủ mười ba bộ môn.'],
    [coThanhTab, 'Thanh điều hướng không đi cùng người dùng sang màn khác.'],
    [errors.length === 0, 'Có lỗi trên trang.'],
  ],
  // B cố tình gõ một đường dẫn đang ở trong hàng chờ nên máy chủ trả một
  // lần rời hàng; đó là hành vi cố ý của bài kiểm.
  (e) => e.includes('WebSocket'),
);
console.log('\nSảnh không đổ danh mục, chọn chế độ là tấm bốn thẻ, và hai làn không ghép chéo.');
