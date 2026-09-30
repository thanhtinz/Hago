import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAP_TOI_DA,
  NGUONG_THONG_THAO,
  THANG,
  VAN_DINH_HANG,
  capChiTiet,
  capDoOf,
  conMayVan,
  danhHieuOf,
  thongThaoOf,
  tongXp,
  xpCua,
  xpLenCap,
} from './xephang.js';

const day = { win: 0, draw: 0, loss: 0, ranked: 0 };

test('thang danh hiệu phủ kín, không hở và không chồng', () => {
  for (const [i, b] of THANG.entries()) {
    assert.ok(b.eloTu <= b.eloDen, `${b.id} có dải ngược`);
    const truoc = THANG[i - 1];
    if (truoc) assert.equal(b.eloTu, truoc.eloDen + 1, `hở hoặc chồng giữa ${truoc.id} và ${b.id}`);
    assert.equal(b.bac, i + 1, 'bac là thứ tự từ thấp lên cao');
  }
  assert.equal(THANG[0]!.eloTu, 0, 'bậc đáy phải nhận cả điểm rất thấp');
});

test('biên từng dải rơi đúng bậc', () => {
  const at = (r: number) => danhHieuOf(r, VAN_DINH_HANG)!.id;
  assert.equal(at(974), 'nhap-mon');
  assert.equal(at(975), 'tay-co');
  assert.equal(at(1124), 'tay-co');
  assert.equal(at(1125), 'ky-thu');
  assert.equal(at(1200), 'ky-thu', 'mốc xuất phát nằm giữa bậc Kỳ thủ');
  assert.equal(at(1274), 'ky-thu');
  assert.equal(at(1275), 'cao-thu');
  assert.equal(at(1424), 'cao-thu');
  assert.equal(at(1425), 'kien-tuong');
  assert.equal(at(1574), 'kien-tuong');
  assert.equal(at(1575), 'dai-kien-tuong');
  assert.equal(at(9999), 'dai-kien-tuong', 'bậc trên cùng mở trần');
});

test('chưa đủ ván xếp hạng thì chưa có danh hiệu', () => {
  // Không có tham số này thì một tài khoản vừa đăng ký đọc ra "Kỳ thủ"
  // ngay lập tức, vì 1200 nằm trong dải đó.
  assert.equal(danhHieuOf(1200, 0), null);
  assert.equal(danhHieuOf(1200, 4), null);
  assert.ok(danhHieuOf(1200, 5));
  assert.equal(conMayVan(0), 5);
  assert.equal(conMayVan(4), 1);
  assert.equal(conMayVan(5), 0);
  assert.equal(conMayVan(99), 0);
});

test('kinh nghiệm: ván xếp hạng hơn ván thường, ván thua vẫn có', () => {
  assert.equal(xpCua([{ ...day, win: 1 }]), 10, 'thắng ván thường');
  assert.equal(xpCua([{ ...day, loss: 1 }]), 4, 'thua ván thường vẫn có điểm');
  assert.equal(xpCua([{ ...day, draw: 1 }]), 6);
  assert.equal(xpCua([{ ...day, win: 1, ranked: 1 }]), 20, 'thắng ván xếp hạng');
  assert.equal(xpCua([{ ...day, loss: 1, ranked: 1 }]), 14, 'thua ván xếp hạng');
  // Cộng dồn qua nhiều bộ môn.
  assert.equal(xpCua([{ ...day, win: 2, ranked: 2 }, { ...day, loss: 1 }]), 44);
  assert.equal(xpCua([]), 0);
});

test('đường cong cấp khớp nhau ở mọi cấp, và dừng ở trần', () => {
  assert.equal(tongXp(1), 0);
  assert.equal(tongXp(2), 40);
  assert.equal(tongXp(10), 1080);
  assert.equal(tongXp(CAP_TOI_DA), 9280);
  for (let L = 1; L < CAP_TOI_DA; L++) {
    assert.equal(tongXp(L + 1) - tongXp(L), xpLenCap(L), `hai công thức lệch nhau ở cấp ${L}`);
  }
  for (let L = 1; L <= CAP_TOI_DA; L++) {
    assert.equal(capDoOf(tongXp(L)), L, `đúng mốc cấp ${L} mà không lên cấp`);
    if (L > 1) assert.equal(capDoOf(tongXp(L) - 1), L - 1, `thiếu một điểm mà đã lên cấp ${L}`);
  }
  assert.equal(capDoOf(0), 1, 'chưa đánh ván nào là cấp 1, không phải cấp 0');
  assert.equal(capDoOf(1_000_000), CAP_TOI_DA, 'không vượt trần');
});

test('kịch trần thì không còn thanh tiến độ', () => {
  // Một thanh không bao giờ đầy là một thanh nói dối.
  assert.deepEqual(capChiTiet(tongXp(CAP_TOI_DA)), { cap: CAP_TOI_DA, trong: 0, toi: null });
  assert.deepEqual(capChiTiet(tongXp(3) + 10), { cap: 3, trong: 10, toi: xpLenCap(3) });
});

test('thông thạo đếm số ván, không đếm thắng thua', () => {
  const thang = thongThaoOf({ ...day, win: 10 });
  const thua = thongThaoOf({ ...day, loss: 10 });
  assert.equal(thang.diem, thua.diem, 'thắng mười ván và thua mười ván phải bằng nhau');
  assert.equal(thang.ten, thua.ten);
  // Ván xếp hạng ăn đôi vì nó là ván đánh hết sức, không vì nó là ván thắng.
  assert.equal(thongThaoOf({ ...day, loss: 3, ranked: 3 }).diem, 6);
});

test('dưới ngưỡng đầu thì không có nhãn nào để hiện', () => {
  const it = thongThaoOf({ ...day, win: 4 });
  assert.equal(it.nac, 0);
  assert.equal(it.ten, null, 'chưa tới nấc thì màn hình không hiện gì');
  assert.equal(it.toi, NGUONG_THONG_THAO[0]);

  const vua = thongThaoOf({ ...day, win: 5 });
  assert.equal(vua.nac, 1);
  assert.equal(vua.ten, 'Làm quen');
});

test('nấc thông thạo lên đúng từng ngưỡng, và dừng ở nấc cuối', () => {
  for (const [i, n] of NGUONG_THONG_THAO.entries()) {
    assert.equal(thongThaoOf({ ...day, win: n - 1 }).nac, i, `chưa tới ${n} mà đã lên nấc`);
    assert.equal(thongThaoOf({ ...day, win: n }).nac, i + 1, `tới ${n} mà chưa lên nấc`);
  }
  const het = thongThaoOf({ ...day, win: 99_999 });
  assert.equal(het.nac, NGUONG_THONG_THAO.length);
  assert.equal(het.ten, 'Lão luyện');
  assert.equal(het.toi, null, 'nấc cuối thì không còn đích nào phía trước');
});
