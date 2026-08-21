// Tệp sinh tự động bởi scripts/slice-ludo-art.py — đừng sửa tay.
// Cắt từ bản vẽ assets/ludo/source/ludo-sheet.png.

export type LudoColor = 'blue' | 'red' | 'green' | 'yellow';

/** Bốn bức tranh ngựa ở góc bàn, đúng khổ 6x6 ô. */
export const LUDO_YARD: Record<LudoColor, number> = {
  blue: require('../../assets/ludo/yard-blue.png'),
  red: require('../../assets/ludo/yard-red.png'),
  green: require('../../assets/ludo/yard-green.png'),
  yellow: require('../../assets/ludo/yard-yellow.png'),
};

/** Quân ngựa. */
export const LUDO_HORSE: Record<LudoColor, number> = {
  blue: require('../../assets/ludo/horse-blue.png'),
  red: require('../../assets/ludo/horse-red.png'),
  green: require('../../assets/ludo/horse-green.png'),
  yellow: require('../../assets/ludo/horse-yellow.png'),
};

/** Ô xuất phát và ô an toàn trên đường chạy. */
export const LUDO_START: Record<LudoColor, number> = {
  blue: require('../../assets/ludo/start-blue.png'),
  red: require('../../assets/ludo/start-red.png'),
  green: require('../../assets/ludo/start-green.png'),
  yellow: require('../../assets/ludo/start-yellow.png'),
};

export const LUDO_SAFE: Record<LudoColor, number> = {
  blue: require('../../assets/ludo/safe-blue.png'),
  red: require('../../assets/ludo/safe-red.png'),
  green: require('../../assets/ludo/safe-green.png'),
  yellow: require('../../assets/ludo/safe-yellow.png'),
};

/** Sáu ô cầu về chuồng của từng màu, chỉ số 0 là ô gần đường chạy nhất. */
export const LUDO_LANE: Record<LudoColor, number[]> = {
  blue: [require('../../assets/ludo/lane-blue-1.png'), require('../../assets/ludo/lane-blue-2.png'), require('../../assets/ludo/lane-blue-3.png'), require('../../assets/ludo/lane-blue-4.png'), require('../../assets/ludo/lane-blue-5.png'), require('../../assets/ludo/lane-blue-6.png')],
  red: [require('../../assets/ludo/lane-red-1.png'), require('../../assets/ludo/lane-red-2.png'), require('../../assets/ludo/lane-red-3.png'), require('../../assets/ludo/lane-red-4.png'), require('../../assets/ludo/lane-red-5.png'), require('../../assets/ludo/lane-red-6.png')],
  green: [require('../../assets/ludo/lane-green-1.png'), require('../../assets/ludo/lane-green-2.png'), require('../../assets/ludo/lane-green-3.png'), require('../../assets/ludo/lane-green-4.png'), require('../../assets/ludo/lane-green-5.png'), require('../../assets/ludo/lane-green-6.png')],
  yellow: [require('../../assets/ludo/lane-yellow-1.png'), require('../../assets/ludo/lane-yellow-2.png'), require('../../assets/ludo/lane-yellow-3.png'), require('../../assets/ludo/lane-yellow-4.png'), require('../../assets/ludo/lane-yellow-5.png'), require('../../assets/ludo/lane-yellow-6.png')],
};

/** Hoa văn bốn cánh ở giữa bàn và cốc xúc xắc. */
export const LUDO_CENTER = require('../../assets/ludo/center.png');
export const LUDO_CUP = require('../../assets/ludo/cup.png');

/** Tỉ lệ khung của từng mảnh (rộng / cao). */
export const LUDO_RATIO: Record<string, number> = {
  "yard-blue": 1.0,
  "yard-red": 1.0,
  "yard-green": 1.0,
  "yard-yellow": 1.0,
  "center": 1.2982,
  "horse-blue": 0.5776,
  "horse-red": 0.6068,
  "horse-yellow": 0.5776,
  "horse-green": 0.5897,
  "start-blue": 0.9385,
  "start-red": 0.9385,
  "start-yellow": 0.9385,
  "start-green": 0.9385,
  "safe-blue": 0.9844,
  "safe-red": 0.9688,
  "safe-yellow": 0.9688,
  "safe-green": 0.9844,
  "cup": 1.5917,
  "lane-blue-1": 1.1333,
  "lane-blue-2": 1.1591,
  "lane-blue-3": 1.1333,
  "lane-blue-4": 1.1333,
  "lane-blue-5": 1.1591,
  "lane-blue-6": 1.1333,
  "lane-red-1": 1.1556,
  "lane-red-2": 1.1818,
  "lane-red-3": 1.1556,
  "lane-red-4": 1.1556,
  "lane-red-5": 1.1818,
  "lane-red-6": 1.1556,
  "lane-yellow-1": 1.1333,
  "lane-yellow-2": 1.1591,
  "lane-yellow-3": 1.1333,
  "lane-yellow-4": 1.1333,
  "lane-yellow-5": 1.1591,
  "lane-yellow-6": 1.1333,
  "lane-green-1": 1.1556,
  "lane-green-2": 1.1818,
  "lane-green-3": 1.1556,
  "lane-green-4": 1.1556,
  "lane-green-5": 1.1818,
  "lane-green-6": 1.1556
};
