/**
 * Khung app dùng chung một tông trung tính ấm. Mỗi game tự mang màu và chất
 * liệu riêng của nó vào màn chơi — khung chỉ là cái khay đựng, không tranh
 * màu với bàn cờ.
 */
export const A = {
  bg: '#14110E',
  surface: '#1F1B16',
  surfaceAlt: '#2A241D',
  line: '#3A322A',
  ink: '#F5EFE4',
  inkSoft: '#B5AA98',
  inkFaint: '#7E7566',
  gold: '#D8A657',
  goldSoft: '#4A3A1E',
  danger: '#D66A5B',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const R = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
