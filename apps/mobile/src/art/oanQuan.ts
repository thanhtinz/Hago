// Tệp sinh tự động bởi scripts/slice-oanquan-art.py — đừng sửa tay.
// Cắt từ bản vẽ assets/oanquan/source/oanquan-sheet.png.

/** Bàn cờ đã ghép lại còn 5 cột, giữ nguyên nét vẽ gốc. */
export const OAN_QUAN_BOARD = require('../../assets/oanquan/board.png');

/** Toạ độ trên bàn, ghi theo tỉ lệ 0..1 nên co giãn cỡ nào cũng đúng. */
export const OAN_QUAN_LAYOUT = {
  "boardW": 1095,
  "boardH": 353,
  "pitXs": [
    0.24018,
    0.36986,
    0.49954,
    0.62922,
    0.7589
  ],
  "rowTop": 0.13314,
  "rowBottom": 0.84136,
  "pitW": 0.10868,
  "pitH": 0.26629,
  "quanLeft": {
    "cx": 0.08539,
    "cy": 0.49858,
    "w": 0.15616,
    "h": 0.95184
  },
  "quanRight": {
    "cx": 0.91461,
    "cy": 0.5,
    "w": 0.15616,
    "h": 0.95467
  }
} as const;

export type SeedColor = 'white' | 'black' | 'green' | 'red' | 'gold' | 'blue';

/** Sáu màu hạt dân. */
export const SEED_ART: Record<SeedColor, number> = {
  white: require('../../assets/oanquan/seed-white.png'),
  black: require('../../assets/oanquan/seed-black.png'),
  green: require('../../assets/oanquan/seed-green.png'),
  red: require('../../assets/oanquan/seed-red.png'),
  gold: require('../../assets/oanquan/seed-gold.png'),
  blue: require('../../assets/oanquan/seed-blue.png'),
};

export const SEED_COLORS: SeedColor[] = ['white', 'black', 'green', 'red', 'gold', 'blue'];

/** Quan còn trên bàn (chibi) và quan đã bị ăn (nắp úp). */
export const QUAN_ART = {
  blue: require('../../assets/oanquan/quan-blue.png'),
  red: require('../../assets/oanquan/quan-red.png'),
};

export const QUAN_LID_ART = {
  blue: require('../../assets/oanquan/lid-blue.png'),
  red: require('../../assets/oanquan/lid-red.png'),
};

/** Chi tiết rời: hoa văn và lá trang trí. */
export const OAN_QUAN_DECOR = {
  flower: require('../../assets/oanquan/flower.png'),
  leaf: require('../../assets/oanquan/leaf.png'),
};

/** Tỉ lệ khung của từng mảnh (rộng / cao) để đặt kích thước không méo. */
export const OAN_QUAN_RATIO: Record<string, number> = {
  "seed-white": 0.8108,
  "seed-black": 0.8108,
  "seed-green": 0.8219,
  "seed-red": 0.8,
  "seed-gold": 0.7895,
  "seed-blue": 0.8052,
  "quan-blue": 0.8116,
  "quan-red": 0.8077,
  "lid-blue": 1.1,
  "lid-red": 1.1,
  "flower": 1.0323,
  "leaf": 1.1667
};
