/**
 * Bộ mặt của cờ gánh: **sân gạch**.
 *
 * Cờ gánh là cờ chơi ngoài sân: các cụ vạch bàn cờ bằng phấn hoặc gạch non
 * lên nền sân gạch Thanh Hà, quân là vỏ nghêu vỏ sò và hòn sỏi. Nên bàn cờ ở
 * đây không phải một tấm gỗ đánh vecni — nó là mặt sân, có mạch vữa, có vết
 * sờn, và nét kẻ là nét phấn chứ không phải đường vector.
 *
 * Đối lập có chủ đích với caro: caro phẳng tuyệt đối trên giấy, cờ gánh thì
 * thô ráp và có khối. Hai game cạnh nhau trong cùng một app phải nhìn ra
 * ngay là hai thế giới khác nhau.
 */
export const ganhTheme = {
  courtLit: '#E9D6BE',
  court: '#DCC4A6',
  courtDark: '#BFA184',
  mortar: '#B59175',
  chalk: '#F8F2E6',
  chalkSoft: '#EADBC4',

  /** Quân đất nung của bên dưới. */
  redFace: '#C05A3C',
  redDeep: '#6A2413',
  redRim: '#E8B089',
  /** Quân vỏ nghêu của bên trên. */
  paleFace: '#F8EFDF',
  paleDeep: '#CBB394',
  paleRim: '#FFF3DF',

  /** Vòng chọn quân và chấm gợi nước đi. */
  pick: '#E3BC72',
  hint: '#5FB37C',
  /** Ô bị ép phải đi vào — đỏ son, màu của mệnh lệnh. */
  forced: '#D9523F',
  flip: '#FFD27A',
} as const;
