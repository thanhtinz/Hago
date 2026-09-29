/**
 * Khung app: **gỗ tre và vàng kim**.
 *
 * Bản trước lấy tông trung tính gần như đen với một chút vàng đồng xỉn. Nó
 * không sai về kỹ thuật nhưng sai về cảm giác: chín bộ môn này là cờ gỗ, chơi
 * trên chiếu, trên bàn trà, trong quán — thứ ấm và có tuổi. Nền đen trung tính
 * là ngôn ngữ của app công cụ, không phải của bàn cờ.
 *
 * Nên khung app giờ là mặt gỗ sẫm ám đỏ, mọi tấm panel đều là gỗ có vát cạnh,
 * và màu thương hiệu là vàng kim **có chuyển sắc** chứ không phải một mã màu
 * phẳng. Vàng phẳng trông như nhựa; vàng có chuyển từ sáng xuống sẫm mới ra
 * kim loại.
 */
export const A = {
  /** Nền sâu nhất, gần mép màn hình. */
  bg: '#1A1008',
  bgWarm: '#2B1A0C',
  bgDeep: '#120B05',

  /** Mặt gỗ của panel, từ sáng xuống sẫm. */
  wood: '#3B2512',
  woodLit: '#5A3818',
  panel: '#33200F',
  panelHi: '#462C14',
  panelLo: '#201308',

  /** Cạnh vát: một nét sáng trên đỉnh, một nét tối dưới đáy. */
  bevel: '#7A5326',
  bevelDark: '#150D06',

  line: '#5A3B1B',
  lineSoft: '#3A2410',

  ink: '#F7E9CE',
  inkSoft: '#CBAF85',
  /**
   * Chữ phụ. Sáng hơn bản đầu (`#9B8160`) vì bản đó chỉ đạt 4,5:1 khi nằm
   * thẳng trên nền sâu nhất — mà gần như chỗ nào trong app cũng có một tấm
   * gỗ ở dưới, và trên mặt gỗ nó tụt xuống 3,5:1. Màu này đạt 4,62:1 ngay
   * trên tấm sáng nhất (`panelHi`), tức là đạt ở mọi chỗ.
   */
  inkFaint: '#B4966F',
  /** Chữ đặt trên nền vàng kim. */
  onGold: '#3A2408',

  gold: '#E3BC72',
  goldLit: '#FBEDC3',
  goldDeep: '#A87A2E',
  goldDark: '#6B4614',
  goldSoft: '#40290F',

  /** Đỏ son, màu dấu triện — dùng cho nhấn mạnh và cảnh báo. */
  seal: '#B3231E',
  sealLit: '#D9523F',
  sealSoft: '#3A1410',

  /** Xanh ngọc, dùng cho trạng thái đang sống. */
  jade: '#5FB37C',
  jadeSoft: '#16301F',
  info: '#8FB8D8',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 } as const;
export const R = { sm: 8, md: 14, lg: 20, xl: 26, pill: 999 } as const;

/** Bóng đổ cho tấm gỗ nổi trên mặt bàn. */
export const lift = (o = 0.45, r = 14, y = 6) => ({
  shadowColor: '#000',
  shadowOpacity: o,
  shadowRadius: r,
  shadowOffset: { width: 0, height: y },
  elevation: 6,
});

/** Quầng sáng vàng quanh nút chính — thứ duy nhất trong màn tự phát sáng. */
export const glow = (o = 0.4, r = 18) => ({
  shadowColor: A.goldDeep,
  shadowOpacity: o,
  shadowRadius: r,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
});

/** Tên hai bộ chữ. Chữ hiển thị là serif, chữ giao diện là sans Việt. */
export const F = {
  display: 'Playfair',
  displayHeavy: 'PlayfairHeavy',
  body: 'BeVietnam',
  bodySemi: 'BeVietnamSemi',
  bodyBold: 'BeVietnamBold',
} as const;
