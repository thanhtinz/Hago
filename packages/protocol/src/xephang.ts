/**
 * Danh hiệu, cấp độ và thông thạo — ba con số nói ba điều khác nhau.
 *
 * Cả máy chủ lẫn app cùng đọc tệp này. Hai bản chép là hai bản lệch nhau
 * ngay lần chỉnh đầu tiên, và lúc đó bảng xếp hạng với hồ sơ người chơi sẽ
 * nói hai câu khác nhau về cùng một người.
 *
 * Ba con số cố ý **không** đo cùng một thứ:
 *
 * - **Danh hiệu** đo mạnh yếu. Dẫn ra từ Elo, chỉ tính ván xếp hạng.
 * - **Cấp độ** đo số ván đã đánh ở đây, cả thường lẫn xếp hạng. Nó không
 *   nói ai mạnh hơn ai.
 * - **Thông thạo** đo mức gắn bó với **một bộ môn**, và cố tình không cộng
 *   thêm cho ván thắng.
 *
 * Trộn ba thứ đó vào một con số là thứ làm mọi bảng điểm trong game trở
 * thành một cái Elo thứ hai yếu hơn.
 */

/** Số ván xếp hạng tối thiểu để có danh hiệu và có tên trên bảng. */
export const VAN_DINH_HANG = 5;

export interface Bac {
  id: string;
  ten: string;
  /** Thứ tự từ thấp lên cao, 1..6. */
  bac: number;
  eloTu: number;
  eloDen: number;
}

/**
 * Sáu bậc, dải 150 điểm, không bậc con.
 *
 * Với K = 40 dưới 30 ván, một ván thắng đi gần trọn một dải 50 điểm — một
 * cái thang nhảy bậc mỗi ván chỉ là bảng điểm có thêm chữ. Dải 150 nghĩa
 * là khoảng bốn ván thắng mới đổi bậc.
 *
 * Mốc xuất phát 1200 nằm **chính giữa** bậc Kỳ thủ, cách hai mép 75 điểm.
 * Quy ra tỉ lệ thắng trước mặt bằng 1200: Nhập môn dưới 22%, Tay cờ 22-35%,
 * Kỳ thủ 35-65%, Cao thủ 65-80%, Kiện tướng 80-89%, Đại kiện tướng trên 89%.
 *
 * "Cao thủ" là chữ dân gian; "Kiện tướng" và "Đại kiện tướng" là danh hiệu
 * có thật của làng cờ Việt. Mượn chữ thật thì nó mang sẵn sức nặng mà
 * "Bạch kim" không bao giờ có trên một bàn cờ gánh.
 */
export const THANG: Bac[] = [
  { id: 'nhap-mon', ten: 'Nhập môn', bac: 1, eloTu: 0, eloDen: 974 },
  { id: 'tay-co', ten: 'Tay cờ', bac: 2, eloTu: 975, eloDen: 1124 },
  { id: 'ky-thu', ten: 'Kỳ thủ', bac: 3, eloTu: 1125, eloDen: 1274 },
  { id: 'cao-thu', ten: 'Cao thủ', bac: 4, eloTu: 1275, eloDen: 1424 },
  { id: 'kien-tuong', ten: 'Kiện tướng', bac: 5, eloTu: 1425, eloDen: 1574 },
  { id: 'dai-kien-tuong', ten: 'Đại kiện tướng', bac: 6, eloTu: 1575, eloDen: 99_999 },
];

/**
 * Danh hiệu của một người ở **một bộ môn**, hoặc null khi chưa định hạng.
 *
 * Hai tham số chứ không một: không có `ranked` thì một tài khoản vừa đăng
 * ký đọc ra "Kỳ thủ" ngay lập tức, vì 1200 nằm trong dải đó. Mỗi con số
 * hiện ra phải đến từ một ván có thật.
 *
 * Danh hiệu luôn đi kèm tên bộ môn — Elo tính riêng từng bộ môn nên một
 * danh hiệu đứng một mình là một con số bịa.
 */
export function danhHieuOf(rating: number, ranked: number): Bac | null {
  if (ranked < VAN_DINH_HANG) return null;
  return THANG.find((b) => rating >= b.eloTu && rating <= b.eloDen) ?? THANG[0]!;
}

/** Còn mấy ván nữa thì có danh hiệu. 0 là đã đủ. */
export function conMayVan(ranked: number): number {
  return Math.max(0, VAN_DINH_HANG - ranked);
}

// ---- cấp độ ---------------------------------------------------------------

/** Trần cứng. */
export const CAP_TOI_DA = 30;

export interface HangThanhTich {
  win: number;
  draw: number;
  loss: number;
  ranked: number;
}

/**
 * Kinh nghiệm cộng dồn, **dẫn xuất từ `stats`**, không lưu cột riêng.
 *
 * Quy ra từng ván: ván xếp hạng thắng 20 / hoà 16 / thua 14; ván thường
 * thắng 10 / hoà 6 / thua 4. Hàng `stats` không phân biệt được ván thắng
 * nào là ván xếp hạng, nên phần thưởng của xếp hạng là một khoản cộng
 * phẳng `ranked * 10` — đó là lý do công thức có hình dạng này chứ không
 * phải sáu hằng số rời.
 *
 * Thua vẫn có kinh nghiệm. Bỏ kinh nghiệm của ván thua là dạy người ta
 * thoát trận khi thấy sắp thua.
 *
 * Đấu với máy và vượt ải cho **0**: máy chủ không làm trọng tài cho ván
 * chạy trên máy người dùng, nên mọi điểm trả cho nó là điểm tự cấp được
 * bằng một lời gọi mạng.
 *
 * Dẫn xuất chứ không lưu, vì thế nó **hồi tố**: người đã đánh tám mươi ván
 * mở app lên thấy cấp 11 ngay thay vì bắt đầu lại từ 0. Giá phải trả nói
 * thẳng — đổi trọng số là viết lại cấp của tất cả mọi người trong im lặng,
 * nên bốn con số dưới đây coi như đóng băng từ ngày lên bản.
 */
export function xpCua(rows: HangThanhTich[]): number {
  let xp = 0;
  for (const r of rows) xp += r.win * 10 + r.draw * 6 + r.loss * 4 + r.ranked * 10;
  return xp;
}

/** Kinh nghiệm cần để đi từ cấp `n` lên cấp `n + 1`. */
export function xpLenCap(n: number): number {
  return 40 + 20 * (n - 1);
}

/** Kinh nghiệm tích luỹ để **đạt** cấp `L`. Cấp 1 là 0. */
export function tongXp(L: number): number {
  return (L - 1) * (10 * L + 20);
}

/**
 * Cấp từ tổng kinh nghiệm.
 *
 * Trần 30 chứ không phải 50: cấp 50 là khoảng một nghìn năm trăm ván, một
 * trần không ai chạm tới thì mọi cấp dưới nó đều đọc thành "còn xa lắm".
 * Năm cấp đầu rất rẻ (40, 60, 80, 100, 120) là cố ý — buổi tối đầu tiên
 * phải thấy con số nhúc nhích ba bốn lần.
 */
export function capDoOf(xp: number): number {
  let cap = 1;
  while (cap < CAP_TOI_DA && xp >= tongXp(cap + 1)) cap++;
  return cap;
}

/** Cấp hiện tại, và đoạn đường tới cấp sau. `toi` là null khi đã kịch trần. */
export function capChiTiet(xp: number): { cap: number; trong: number; toi: number | null } {
  const cap = capDoOf(xp);
  if (cap >= CAP_TOI_DA) return { cap, trong: 0, toi: null };
  const day = tongXp(cap);
  return { cap, trong: xp - day, toi: tongXp(cap + 1) - day };
}

// ---- thông thạo -----------------------------------------------------------

export const NGUONG_THONG_THAO = [5, 20, 60, 150, 320];
export const TEN_THONG_THAO = ['Làm quen', 'Quen tay', 'Thạo nước', 'Nhuần nhuyễn', 'Lão luyện'];

/**
 * Thông thạo một bộ môn: **số ván đã đánh**, không phải mạnh yếu.
 *
 * Ván thường 1 điểm, ván xếp hạng 2 điểm. Thắng, hoà, thua **bằng nhau** —
 * đây là chỗ dễ làm sai nhất của cả hệ. Một con số vừa thưởng cho việc
 * thắng vừa tự xưng là không đo trình độ thì nó là một cái Elo thứ hai yếu
 * hơn, và nó đứng ngay cạnh Elo thật trong cùng một hàng. Ván xếp hạng ăn
 * đôi vì nó là một ván đánh hết sức, không phải vì nó là một ván thắng.
 *
 * Dưới ngưỡng đầu tiên thì trả `nac: 0` và màn hình **không hiện gì cả**:
 * một nhãn rỗng trên mười ba thẻ là mười ba nhãn rỗng, và mắt học rất
 * nhanh cách bỏ qua chúng.
 */
export function thongThaoOf(row: HangThanhTich): { nac: number; ten: string | null; diem: number; toi: number | null } {
  const diem = row.win + row.draw + row.loss + row.ranked;
  let nac = 0;
  for (const n of NGUONG_THONG_THAO) if (diem >= n) nac++;
  return {
    nac,
    ten: nac > 0 ? (TEN_THONG_THAO[nac - 1] ?? null) : null,
    diem,
    toi: nac < NGUONG_THONG_THAO.length ? (NGUONG_THONG_THAO[nac] ?? null) : null,
  };
}
