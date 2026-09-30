/**
 * Vượt ải — mười ải đánh với máy.
 *
 * **Một ải là dữ liệu, không phải mã.** Ba engine đều nhận `config` ở
 * `init(seats, config, rng)`, và bot nhận `level`. Hai núm đó cộng một hạt
 * giống cố định là toàn bộ thứ cần để dựng một ải: không engine mới, không
 * thế cờ dựng sẵn, không nhánh riêng cho từng bộ môn.
 *
 * `hat` **bắt buộc phải cố định**. Engine cờ gánh và ô ăn quan bốc người đi
 * trước bằng `rng`, nên không ghim hạt thì cùng một ải mỗi lần vào một
 * khác — và câu "Máy đi trước" trong `moTa` sẽ đúng lúc này sai lúc kia.
 *
 * **Vượt ải không nối vào gì cả**: không cộng kinh nghiệm, không đổi Elo,
 * không cộng thông thạo, không vào lịch sử trận, không lên bảng xếp hạng.
 * Ván chạy hoàn toàn trên máy người dùng và máy chủ không có một dòng mã
 * bot nào, nên máy chủ **không chứng minh được** bên kia là máy chứ không
 * phải chính người chơi tự đi hai tay. Sao là lời khai của client, và nó
 * **được phép** là lời khai đúng vì nó không mua được gì. Ngày nào vượt ải
 * được nối vào kinh nghiệm là ngày cấp độ mất nghĩa.
 */

export interface Ai {
  /**
   * Khoá của ải. Là chuỗi chứ không phải số thứ tự: đổi thứ tự ải về sau
   * không được xoá tiến độ của người đã qua.
   */
  id: string;
  chuong: number;
  gameId: string;
  ten: string;
  /** Một câu, dạy đúng một ý, và nói rõ ai đi trước. */
  moTa: string;
  /** Đưa thẳng vào `engine.init`. */
  config: Record<string, unknown>;
  /** Mức máy, 1 tới 3. */
  muc: 1 | 2 | 3;
  /** Hạt giống cố định của ải. */
  hat: string;
}

export interface Chuong {
  so: number;
  ten: string;
  gameId: string;
}

export const CHUONG: Chuong[] = [
  { so: 1, ten: 'Vỡ lòng', gameId: 'co-caro' },
  { so: 2, ten: 'Đường làng', gameId: 'co-ganh' },
  { so: 3, ten: 'Mùa rải quan', gameId: 'o-an-quan' },
];

/**
 * Mười ải.
 *
 * Mỗi ải đổi **ít nhất một khoá config so với ải trước**, và khoá đó phải
 * khác giá trị mặc định — trừ ải cuối mỗi chương, cố ý là luật đủ. Một ải
 * chỉ khai lại giá trị mặc định là một ải đổi tên chứ không đổi ván.
 *
 * Mười chứ không phải ba mươi: mười ải là số ải một người dựng và **chơi
 * thử hết** được trong một buổi, và nội dung không chơi thử là nội dung
 * đoán.
 */
export const CHIEN_DICH: Ai[] = [
  {
    id: 'caro-1',
    chuong: 1,
    gameId: 'co-caro',
    ten: 'Bàn chín ô',
    moTa: 'Bàn nhỏ, máy đi yếu. Bạn đi trước. Xếp năm quân liền nhau là qua ải.',
    config: { size: 9 },
    muc: 1,
    hat: 'ai-c1',
  },
  {
    id: 'caro-2',
    chuong: 1,
    gameId: 'co-caro',
    ten: 'Mở giữa bàn',
    moTa: 'Nước đầu bắt buộc đặt giữa bàn. Bạn đi trước.',
    config: { size: 11, centerOpening: true },
    muc: 2,
    hat: 'ai-c2',
  },
  {
    id: 'caro-3',
    chuong: 1,
    gameId: 'co-caro',
    ten: 'Không có sáu',
    moTa: 'Ải này tắt luật sáu quân: chỉ chuỗi đúng năm mới thắng. Bạn đi trước.',
    config: { size: 13, overlineWins: false },
    muc: 2,
    hat: 'ai-c3',
  },
  {
    id: 'caro-4',
    chuong: 1,
    gameId: 'co-caro',
    ten: 'Bàn mười lăm',
    moTa: 'Luật đủ, bàn đủ, máy mạnh nhất. Bạn đi trước.',
    config: {},
    muc: 3,
    hat: 'ai-c4',
  },
  {
    id: 'ganh-1',
    chuong: 2,
    gameId: 'co-ganh',
    ten: 'Học gánh',
    moTa: 'Ải này tắt luật mở, nên không lượt nào bị ép. Bạn đi trước.',
    config: { forcedOpenCapture: false },
    muc: 1,
    hat: 'ai-ganh-1-6',
  },
  {
    id: 'ganh-2',
    chuong: 2,
    gameId: 'co-ganh',
    ten: 'Vây từng quân',
    moTa: 'Ải này vây tính theo từng quân chứ không theo cụm. Bạn đi trước.',
    config: { vayScope: 'single' },
    muc: 2,
    hat: 'ai-g2',
  },
  {
    id: 'ganh-3',
    chuong: 2,
    gameId: 'co-ganh',
    ten: 'Luật đủ',
    moTa: 'Gánh, vây theo cụm và luật mở, đủ cả. Bạn đi trước.',
    config: {},
    muc: 3,
    hat: 'ai-g3',
  },
  {
    id: 'quan-1',
    chuong: 3,
    gameId: 'o-an-quan',
    ten: 'Ba dân mỗi ô',
    moTa: 'Mỗi ô chỉ ba dân nên nước rải ngắn, dễ đếm trước. Bạn đi trước.',
    config: { danPerCell: 3 },
    muc: 1,
    hat: 'ai-quan-1-1',
  },
  {
    id: 'quan-2',
    chuong: 3,
    gameId: 'o-an-quan',
    ten: 'Chốt một chiều',
    moTa: 'Ải này không cho chọn chiều rải. Bạn đi trước.',
    config: { freeDirection: false },
    muc: 2,
    hat: 'ai-q2',
  },
  {
    id: 'quan-3',
    chuong: 3,
    gameId: 'o-an-quan',
    ten: 'Ván đủ',
    moTa: 'Luật đủ, năm dân mỗi ô, máy mạnh nhất. Máy đi trước.',
    config: {},
    muc: 3,
    hat: 'ai-q3',
  },
];

export const TONG_SAO = CHIEN_DICH.length * 3;

export function aiOf(id: string): Ai | null {
  return CHIEN_DICH.find((a) => a.id === id) ?? null;
}

/** Các ải của một chương, theo thứ tự. */
export function aiCuaChuong(chuong: number): Ai[] {
  return CHIEN_DICH.filter((a) => a.chuong === chuong);
}

/**
 * Ải này đã mở chưa.
 *
 * Trong một chương, ải sau mở khi ải trước có **từ một sao**. Không bắt ba
 * sao: bắt ba sao là bắt người chơi cày lại ải cũ để đi tiếp, và họ bỏ.
 * Giữa các chương thì không khoá gì — người tới vì cờ gánh không phải đánh
 * xong bốn ải cờ caro.
 */
export function daMo(id: string, sao: Record<string, number>): boolean {
  const ai = aiOf(id);
  if (!ai) return false;
  const trong = aiCuaChuong(ai.chuong);
  const i = trong.findIndex((a) => a.id === id);
  if (i <= 0) return true;
  return (sao[trong[i - 1]!.id] ?? 0) >= 1;
}

/**
 * Chấm sao cho một lần chơi. Ba điều kiện lồng nhau nên một con số là đủ.
 *
 * Không có sao theo **số nước**. Chạy thử trên chính ba engine đã dịch cho
 * thấy không có ngưỡng nào đặt được: cờ caro mức 2 và mức 3 đấu nhau kín
 * bàn không ai thắng, còn ô ăn quan kết thúc trong khoảng hai tới ba mươi
 * bảy nước nên mọi ngưỡng đều không bao giờ sai được. Một điều kiện không
 * đo được là một điều kiện đặt bằng cách đoán.
 */
export function chamSao(o: { thang: boolean; dungGoiY: boolean; dungLuiLai: boolean }): number {
  if (!o.thang) return 0;
  if (o.dungGoiY) return 1;
  if (o.dungLuiLai) return 2;
  return 3;
}
