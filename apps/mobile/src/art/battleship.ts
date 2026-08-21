// Tệp sinh tự động bởi scripts/slice-battleship-art.py — đừng sửa tay.
// Cắt từ bản vẽ assets/battleship/source/battleship-sheet.png.

/** Một ô nước cắt từ lòng bàn, đã có sẵn vạch lưới ở mép — lát ra thành biển. */
export const BS_SEA = {
  a: require('../../assets/battleship/sea-a.png'),
  b: require('../../assets/battleship/sea-b.png'),
};

/** Hình trong ô, đã bỏ nền xanh — chồng thẳng lên mặt biển. */
export const BS_ICON = {
  island: require('../../assets/battleship/icon-island.png'),
  rock: require('../../assets/battleship/icon-rock.png'),
  cloud: require('../../assets/battleship/icon-cloud.png'),
  miss: require('../../assets/battleship/icon-miss.png'),
  hit: require('../../assets/battleship/icon-hit.png'),
  sunk: require('../../assets/battleship/icon-sunk.png'),
};

export const BS_TILE = {
  water: require('../../assets/battleship/tile-water.png'),
  waterAlt: require('../../assets/battleship/tile-water-alt.png'),
  island: require('../../assets/battleship/tile-island.png'),
  rock: require('../../assets/battleship/tile-rock.png'),
  cloud: require('../../assets/battleship/tile-cloud.png'),
  miss: require('../../assets/battleship/tile-miss.png'),
  hit: require('../../assets/battleship/tile-hit.png'),
  sunk: require('../../assets/battleship/tile-sunk.png'),
};

export type ShipKind = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'corvette';

/** Tàu nhìn từ trên — đặt lên bàn của mình. */
export const BS_SHIP_TOP: Record<ShipKind, number> = {
  carrier: require('../../assets/battleship/carrier-top.png'),
  battleship: require('../../assets/battleship/battleship-top.png'),
  cruiser: require('../../assets/battleship/cruiser-top.png'),
  submarine: require('../../assets/battleship/submarine-top.png'),
  corvette: require('../../assets/battleship/corvette-top.png'),
};

/** Tàu nhìn ngang — dùng cho bảng hạm đội. */
export const BS_SHIP_SIDE: Record<ShipKind, number> = {
  carrier: require('../../assets/battleship/carrier-side.png'),
  battleship: require('../../assets/battleship/battleship-side.png'),
  cruiser: require('../../assets/battleship/cruiser-side.png'),
  submarine: require('../../assets/battleship/submarine-side.png'),
  corvette: require('../../assets/battleship/corvette-side.png'),
};

/** Số ô của từng loại tàu, khớp với hạm đội mặc định [5,4,3,3,2]. */
export const BS_SHIP_LEN: Record<ShipKind, number> = {
  carrier: 5,
  battleship: 4,
  cruiser: 3,
  submarine: 3,
  corvette: 2,
};

/**
 * Chọn loại tàu theo độ dài. Hạm đội có hai tàu 3 ô nên tàu thứ hai lấy hình
 * tàu ngầm cho khỏi trùng.
 */
export function shipKind(len: number, nth = 0): ShipKind {
  const same = (Object.keys(BS_SHIP_LEN) as ShipKind[]).filter((k) => BS_SHIP_LEN[k] === len);
  if (!same.length) return 'corvette';
  return same[Math.min(nth, same.length - 1)];
}

/** Vòng ngắm và cờ. */
export const BS_MARK = {
  targetBlue: require('../../assets/battleship/target-blue.png'),
  targetRed: require('../../assets/battleship/target-red.png'),
  flagRed: require('../../assets/battleship/flag-red.png'),
  flagWhite: require('../../assets/battleship/flag-white.png'),
};

/** Tỉ lệ khung của từng mảnh (rộng / cao) để đặt kích thước không méo. */
export const BS_RATIO: Record<string, number> = {
  "sea-a": 1.0,
  "sea-b": 1.0,
  "tile-water": 0.9279,
  "icon-water": 10.2,
  "tile-water-alt": 0.973,
  "icon-water-alt": 2.2553,
  "tile-island": 0.964,
  "icon-island": 0.9727,
  "tile-rock": 0.964,
  "icon-rock": 1.2738,
  "tile-cloud": 0.973,
  "icon-cloud": 1.1134,
  "tile-sunk": 0.8288,
  "icon-sunk": 0.9012,
  "tile-miss": 0.8468,
  "icon-miss": 0.9551,
  "tile-hit": 0.8739,
  "icon-hit": 0.9535,
  "carrier-top": 3.5714,
  "carrier-side": 1.8689,
  "battleship-top": 4.05,
  "battleship-side": 2.2577,
  "cruiser-top": 3.6364,
  "cruiser-side": 2.2614,
  "submarine-top": 6.027,
  "submarine-side": 3.0294,
  "corvette-top": 3.2955,
  "corvette-side": 2.0735,
  "target-blue": 0.987,
  "target-red": 1.025,
  "flag-red": 0.9551,
  "flag-white": 1.0244
};
