/**
 * Khung app dùng một tông trung tính tối. Mỗi game tự mang màu và chất liệu
 * riêng vào thẻ của nó và vào màn chơi — khung chỉ là cái khay đựng, không
 * tranh màu với bàn cờ.
 *
 * Nền tối vì đây là app chơi lúc rảnh, phần lớn là buổi tối và trong nhà; và
 * vì bàn cờ của chín bộ môn đều sáng màu (giấy, gỗ, gạch, sỏi) nên nền tối
 * làm chúng nổi lên như vật thật đặt trên mặt bàn.
 */
export const A = {
  bg: '#12100D',
  /** Nền thẻ. Sáng hơn nền chính vừa đủ để thấy mép mà không cần viền đậm. */
  surface: '#1C1915',
  surfaceAlt: '#262119',
  surfaceHigh: '#332C22',
  line: '#3A322A',
  lineSoft: '#2B251E',

  ink: '#F7F1E6',
  inkSoft: '#B9AE9B',
  inkFaint: '#7C7263',

  /** Màu thương hiệu: vàng đồng, gợi quân cờ gỗ và huy chương. */
  gold: '#E0A94E',
  goldDeep: '#B8863A',
  goldSoft: '#3A2D16',

  live: '#4FBF7B',
  liveSoft: '#16301F',
  danger: '#DD6B5B',
  dangerSoft: '#3A1C18',
  info: '#6FA8DC',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 } as const;
export const R = { sm: 8, md: 14, lg: 20, xl: 26, pill: 999 } as const;

/** Bóng đổ nhẹ cho thẻ nổi trên nền tối. */
export const lift = (o = 0.35, r = 14, y = 6) => ({
  shadowColor: '#000',
  shadowOpacity: o,
  shadowRadius: r,
  shadowOffset: { width: 0, height: y },
  elevation: 6,
});
