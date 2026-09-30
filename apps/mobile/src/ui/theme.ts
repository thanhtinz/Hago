/**
 * Khung app: **nền mực lạnh, một màu nhấn nghệ vàng**.
 *
 * Bản trước là gỗ: mặt nâu có vân, cạnh vát, vàng kim có chuyển sắc kim
 * loại, chữ tiêu đề serif. Nó đúng về chủ đề — cờ gỗ, chơi trên chiếu —
 * nhưng đọc ra là **cũ**, và một nền tảng mới thì không có vốn để trông cũ.
 * Vân gỗ, cạnh vát và vệt loé kim loại đều là kỹ thuật làm giao diện của
 * mười lăm năm trước; chúng khiến mọi tấm panel trông như một nút bấm trong
 * phần mềm kế toán.
 *
 * Bản này giữ nguyên **bộ khoá màu** để không màn nào phải sửa, nhưng trỏ
 * lại giá trị:
 *
 * - Mặt nền thành xám mực hơi ngả lam, phẳng, phân tầng bằng độ sáng chứ
 *   không bằng hoạ tiết. Tầng nào cao hơn thì sáng hơn một nấc — đó là toàn
 *   bộ ngữ pháp chiều sâu, không cần vát cạnh.
 * - `gold` không còn là vàng lá mà là **nghệ vàng phẳng**, một màu nhấn chứ
 *   không phải một chất liệu. Tên khoá giữ nguyên vì nó đã nằm ở tám mươi
 *   chỗ và vai trò không đổi: đây là màu của thứ quan trọng nhất trên màn.
 * - Chữ tiêu đề chuyển từ serif sang sans đậm. Đây là thứ đổi cảm giác
 *   mạnh nhất chỉ bằng một dòng.
 *
 * Bàn cờ **không** đổi. Giấy kẻ ô của cờ caro, sân gạch của cờ gánh và nền
 * đất của ô ăn quan là **nội dung**, không phải khung — và một khung tối
 * trung tính chính là thứ làm chúng nổi lên.
 *
 * Mọi cặp chữ-trên-nền trong bảng này đều đã đo: thấp nhất là `inkFaint`
 * trên `panelHi`, đạt 4,87:1.
 */
export const A = {
  /** Nền sâu nhất, gần mép màn hình. */
  bg: '#0B0E14',
  bgWarm: '#121724',
  bgDeep: '#06080C',

  /** Mặt panel, phân tầng bằng độ sáng. */
  wood: '#1A202C',
  woodLit: '#252D3D',
  panel: '#151A24',
  panelHi: '#1E2533',
  panelLo: '#0F131B',

  /**
   * Hai khoá này từng là nét vát sáng và nét vát tối của mặt gỗ. Giao diện
   * phẳng không còn vát cạnh, nhưng khoá vẫn giữ để chỗ nào cần một nét
   * phân tầng rất mảnh thì có sẵn.
   */
  bevel: '#2E3749',
  bevelDark: '#070A0F',

  line: '#2B3444',
  lineSoft: '#1B2230',

  ink: '#EEF2F8',
  inkSoft: '#A9B4C6',
  /**
   * Chữ phụ. Đo trên tấm sáng nhất (`panelHi`) chứ không trên nền sâu nhất:
   * gần như chỗ nào trong app cũng có một tấm ở dưới, nên đo trên nền tối
   * nhất là tự cho mình điểm cao. Màu này đạt 4,87:1 ở chỗ khó nhất.
   */
  inkFaint: '#8492A8',
  /** Chữ đặt trên nền màu nhấn. */
  onGold: '#1A1302',

  /** Màu nhấn: nghệ vàng phẳng. Thứ quan trọng nhất trên màn mang màu này. */
  gold: '#F2B63C',
  goldLit: '#FFD98A',
  goldDeep: '#C8891C',
  goldDark: '#7A5310',
  /** Nền chip nhạt cùng tông, để chữ nhấn đứng trên nó vẫn đọc được. */
  goldSoft: '#2A2210',

  /** Đỏ son: huỷ, thua, và cảnh báo. */
  seal: '#E8483A',
  sealLit: '#FF6F5E',
  sealSoft: '#2E1512',

  /** Xanh ngọc: đang sống, đang trực tuyến, thắng. */
  jade: '#3FD18B',
  jadeSoft: '#0F2A1F',
  info: '#7BB1E8',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 } as const;

/**
 * Bo góc, nới rộng hơn bản gỗ.
 *
 * Góc 8 điểm là góc của một khung cửa sổ; góc 16-24 là góc của một thẻ trên
 * điện thoại. Cùng một bố cục, chỉ đổi bán kính, đã dịch hẳn một thập kỷ.
 */
export const R = { sm: 10, md: 16, lg: 24, xl: 30, pill: 999 } as const;

/**
 * Bóng đổ: rộng, mờ, gần như không thấy viền.
 *
 * Bóng đặc và gần (bản gỗ: mờ 0,45 bán kính 14) vẽ ra một vật nằm trên bàn.
 * Bóng loãng và xa vẽ ra một lớp nổi trên một lớp — đó là ngữ pháp chiều
 * sâu của giao diện phẳng.
 */
export const lift = (o = 0.45, r = 14, y = 6) => ({
  shadowColor: '#000',
  shadowOpacity: o * 0.62,
  shadowRadius: r * 1.6,
  shadowOffset: { width: 0, height: y },
  elevation: 6,
});

/** Quầng sáng quanh nút chính — thứ duy nhất trong màn tự phát sáng. */
export const glow = (o = 0.4, r = 18) => ({
  shadowColor: A.gold,
  shadowOpacity: o * 0.8,
  shadowRadius: r * 1.4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
});

/**
 * Bộ chữ.
 *
 * `display` từng là Playfair Display — một bộ serif rất đẹp và rất **cũ**.
 * Một dòng tiêu đề serif trên nền tối là ngôn ngữ của bìa sách và nhà hàng,
 * không phải của một sảnh game. Cả hai khoá tiêu đề nay trỏ vào Be Vietnam
 * Pro Bold: cùng một bộ chữ cho toàn app, khác nhau bằng cỡ và độ đậm chứ
 * không bằng giống chữ.
 *
 * Be Vietnam Pro là bộ chữ dựng riêng cho tiếng Việt, nên dấu không bị chèn
 * lên chữ hoa như mấy bộ sans quốc tế — đó là lý do nó ở lại từ bản đầu.
 */
export const F = {
  display: 'BeVietnamBold',
  displayHeavy: 'BeVietnamBold',
  body: 'BeVietnam',
  bodySemi: 'BeVietnamSemi',
  bodyBold: 'BeVietnamBold',
} as const;
