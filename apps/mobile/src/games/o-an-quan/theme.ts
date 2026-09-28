/**
 * Bộ mặt của ô ăn quan: **sân gạch trưa hè**.
 *
 * Cùng họ chất liệu với cờ gánh vì cùng là cờ chơi ngoài sân, nhưng khác
 * hẳn ở quân: cờ gánh là đĩa đất nung và vỏ nghêu đặt trên giao điểm, ô ăn
 * quan là **sỏi cuội đổ đống trong lòng ô**. Mắt phân biệt hai game ngay ở
 * chỗ đó — một bên quân xếp hàng ngay ngắn, một bên sỏi nằm lộn xộn.
 */
export const quanTheme = {
  ground: '#D9C7A6',
  groundLit: '#E8D9BC',
  groundDark: '#B69B74',
  pit: '#C0AC89',
  pitDark: '#9C8763',
  chalk: '#F7F1E4',
  chalkSoft: '#D9CDB5',

  pebble: '#5E5648',
  pebbleLit: '#9E9484',
  /** Quân quan: sỏi trắng to hơn hẳn. */
  quanStone: '#F2ECDD',
  quanStoneDark: '#B6AA92',

  pick: '#E3BC72',
  hint: '#5FB37C',
  eaten: '#D9523F',
} as const;
