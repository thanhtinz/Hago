#!/usr/bin/env python3
"""Cắt bảng thiết kế Bắn Tàu thành từng mảnh dùng được trong app.

Đầu vào  : apps/mobile/assets/battleship/source/battleship-sheet.png
Đầu ra   : apps/mobile/assets/battleship/*.png + src/art/battleship.ts

Chạy:  python3 apps/mobile/scripts/slice-battleship-art.py

Khác với bảng Ô Ăn Quan (nền gần trắng, tách bằng tô loang), bảng này nằm trên
nền chuyển màu tối. Nền đó mượt và không có nét, nên chỗ nào lệch nhiều so với
bản làm mờ mạnh chính là hình. Alpha lấy theo độ lệch ấy chứ không cắt bằng mặt
nạ nhị phân — cắt nhị phân thì mép răng cưa.

Mấy ô vuông (nước, sóng, nổ, dấu X) vốn đã có nền xanh riêng nên cắt thẳng
thành ảnh đặc, không cần alpha.
"""
import json
import os
import sys

try:
    from PIL import Image, ImageFilter
    import numpy as np
    from scipy import ndimage
except ImportError as e:  # pragma: no cover
    sys.exit(f"Thiếu thư viện: {e}. Cài bằng: pip install pillow numpy scipy")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "assets/battleship/source/battleship-sheet.png")
OUT_IMG = os.path.join(ROOT, "assets/battleship")
OUT_TS = os.path.join(ROOT, "src/art/battleship.ts")

# Mặt biển: lòng bàn "BẢN ĐỒ CỦA BẠN" nằm ở x 72..472, y 95..495, mỗi ô đúng
# 40px và vạch lưới vẽ sẵn ở mép trái/trên của từng ô. Cắt lấy **một ô** ở giữa
# bàn (chỗ không có đảo đá) rồi lát ra là được lưới liền mạch với cỡ bàn bất kỳ,
# thay vì kéo giãn cả tấm 10x10 rồi lệch vạch khi bàn đổi kích thước.
SEA_CELLS = {
    "sea-a": (232, 255, 272, 295),
    "sea-b": (152, 335, 192, 375),
}

# Ô vuông trên bảng thiết kế: đo theo mép khung xanh, y chung cho cả hàng.
TILE_Y = (537, 648)
TILES = {
    "water": (21, 124),
    "water-alt": (137, 245),
    "island": (259, 366),
    "rock": (381, 488),
    "cloud": (505, 613),
    "sunk": (648, 740),
    "miss": (758, 852),
    "hit": (868, 965),
}

# Tàu: mỗi loại có hình nhìn từ trên (đặt lên bàn) và hình nhìn ngang (bảng hạm đội).
# Khung bao đo bằng bản làm mờ, xem chú thích đầu tệp.
SHIPS = {
    "carrier": {"len": 5, "top": (1009, 55, 1259, 125), "side": (1284, 16, 1512, 138)},
    "battleship": {"len": 4, "top": (1011, 184, 1254, 244), "side": (1288, 149, 1507, 246)},
    "cruiser": {"len": 3, "top": (1011, 309, 1211, 364), "side": (1297, 276, 1496, 364)},
    "submarine": {"len": 3, "top": (1013, 427, 1236, 464), "side": (1296, 397, 1502, 465)},
    "corvette": {"len": 2, "top": (1027, 525, 1172, 569), "side": (1325, 496, 1466, 564)},
}

# Vòng ngắm và cờ, cắt kèm alpha.
MARKS = {
    "target-blue": (1316, 585, 1392, 662),
    "target-red": (1429, 583, 1511, 663),
    "flag-red": (1014, 583, 1099, 672),
    "flag-white": (1133, 584, 1217, 666),
}

# Ngưỡng dựng alpha: lệch so với nền <= LO coi như nền, >= HI coi như hình đặc.
DIFF_LO = 10.0
DIFF_HI = 34.0
# Ngưỡng tách hình khỏi nền xanh của một ô, tính bằng khoảng cách màu.
ICON_LO = 26.0
ICON_HI = 62.0
EDGE_BAND = 2


def soft_cutout(im, diff, box):
    """Cắt một mảnh kèm alpha mềm dựa trên độ lệch so với nền."""
    x0, y0, x1, y1 = box
    piece = im.crop(box).convert("RGBA")
    d = diff[y0:y1, x0:x1]

    solid = ndimage.binary_fill_holes(d > DIFF_HI)
    core = ndimage.binary_erosion(solid, np.ones((3, 3)), iterations=EDGE_BAND)
    reach = ndimage.binary_dilation(solid, np.ones((3, 3)), iterations=EDGE_BAND)

    ramp = np.clip((d - DIFF_LO) / (DIFF_HI - DIFF_LO), 0, 1)
    a = np.where(core, 1.0, ramp)
    a = np.where(reach, a, 0.0)
    piece.putalpha(Image.fromarray((a * 255).astype("uint8"), "L"))
    return piece


def tile_icon(tile):
    """Bỏ nền xanh của một ô, chỉ giữ hình bên trong.

    Nền ô là một mảng xanh khá đều, nên lấy màu trung vị của viền ngoài làm nền
    rồi tính alpha theo khoảng cách màu. Cắt tiếp về đúng khung bao của hình cho
    khỏi thừa mép.
    """
    a = np.array(tile.convert("RGB")).astype(float)
    h, w, _ = a.shape
    ring = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    bg = np.median(ring, 0)
    dist = np.sqrt(((a - bg) ** 2).sum(2))

    solid = ndimage.binary_fill_holes(dist > ICON_HI)
    solid = ndimage.binary_opening(solid, np.ones((3, 3)))
    # Viền và vệt sáng của chính ô cũng lệch màu; bỏ mọi mảng vụn, chỉ giữ hình
    # chính và những mảng đáng kể quanh nó.
    lbl, n = ndimage.label(solid)
    if n:
        areas = ndimage.sum(solid, lbl, range(1, n + 1))
        keep = {i + 1 for i, ar in enumerate(areas) if ar >= areas.max() * 0.08}
        solid = np.isin(lbl, list(keep))
    core = ndimage.binary_erosion(solid, np.ones((3, 3)), iterations=EDGE_BAND)
    reach = ndimage.binary_dilation(solid, np.ones((3, 3)), iterations=EDGE_BAND)
    ramp = np.clip((dist - ICON_LO) / (ICON_HI - ICON_LO), 0, 1)
    alpha = np.where(core, 1.0, ramp)
    alpha = np.where(reach, alpha, 0.0)

    out = tile.convert("RGBA")
    out.putalpha(Image.fromarray((alpha * 255).astype("uint8"), "L"))
    return out.crop(out.getbbox() or (0, 0, w, h))


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Không thấy bản vẽ gốc: {SRC}")
    os.makedirs(OUT_IMG, exist_ok=True)

    im = Image.open(SRC).convert("RGB")
    arr = np.array(im).astype(float)
    # Nền chuyển màu rất mượt nên làm mờ mạnh là ra gần đúng nền.
    bg = np.array(im.filter(ImageFilter.GaussianBlur(45))).astype(float)
    diff = np.abs(arr - bg).max(2)

    saved = {}

    def note(name, w, h):
        saved[name] = (w, h)

    for name, box in SEA_CELLS.items():
        cellimg = im.crop(box)
        cellimg.save(os.path.join(OUT_IMG, f"{name}.png"))
        note(name, *cellimg.size)

    for name, (x0, x1) in TILES.items():
        box = (x0, TILE_Y[0], x1, TILE_Y[1])
        tile = im.crop(box)
        tile.save(os.path.join(OUT_IMG, f"tile-{name}.png"))
        note(f"tile-{name}", *tile.size)
        # Bản chỉ có hình, bỏ nền xanh của ô — dùng để chồng lên mặt biển.
        icon = tile_icon(tile)
        icon.save(os.path.join(OUT_IMG, f"icon-{name}.png"))
        note(f"icon-{name}", *icon.size)

    for name, spec in SHIPS.items():
        for view in ("top", "side"):
            box = spec[view]
            piece = soft_cutout(im, diff, box)
            piece.save(os.path.join(OUT_IMG, f"{name}-{view}.png"))
            note(f"{name}-{view}", *piece.size)

    for name, box in MARKS.items():
        piece = soft_cutout(im, diff, box)
        piece.save(os.path.join(OUT_IMG, f"{name}.png"))
        note(name, *piece.size)

    ratios = {k: round(w / h, 4) for k, (w, h) in saved.items()}
    by_len = {}
    for name, spec in SHIPS.items():
        by_len.setdefault(spec["len"], []).append(name)

    ts = f"""// Tệp sinh tự động bởi scripts/slice-battleship-art.py — đừng sửa tay.
// Cắt từ bản vẽ assets/battleship/source/battleship-sheet.png.

/** Một ô nước cắt từ lòng bàn, đã có sẵn vạch lưới ở mép — lát ra thành biển. */
export const BS_SEA = {{
  a: require('../../assets/battleship/sea-a.png'),
  b: require('../../assets/battleship/sea-b.png'),
}};

/** Hình trong ô, đã bỏ nền xanh — chồng thẳng lên mặt biển. */
export const BS_ICON = {{
  island: require('../../assets/battleship/icon-island.png'),
  rock: require('../../assets/battleship/icon-rock.png'),
  cloud: require('../../assets/battleship/icon-cloud.png'),
  miss: require('../../assets/battleship/icon-miss.png'),
  hit: require('../../assets/battleship/icon-hit.png'),
  sunk: require('../../assets/battleship/icon-sunk.png'),
}};

export const BS_TILE = {{
  water: require('../../assets/battleship/tile-water.png'),
  waterAlt: require('../../assets/battleship/tile-water-alt.png'),
  island: require('../../assets/battleship/tile-island.png'),
  rock: require('../../assets/battleship/tile-rock.png'),
  cloud: require('../../assets/battleship/tile-cloud.png'),
  miss: require('../../assets/battleship/tile-miss.png'),
  hit: require('../../assets/battleship/tile-hit.png'),
  sunk: require('../../assets/battleship/tile-sunk.png'),
}};

export type ShipKind = {" | ".join(f"'{k}'" for k in SHIPS)};

/** Tàu nhìn từ trên — đặt lên bàn của mình. */
export const BS_SHIP_TOP: Record<ShipKind, number> = {{
{chr(10).join(f"  {k}: require('../../assets/battleship/{k}-top.png')," for k in SHIPS)}
}};

/** Tàu nhìn ngang — dùng cho bảng hạm đội. */
export const BS_SHIP_SIDE: Record<ShipKind, number> = {{
{chr(10).join(f"  {k}: require('../../assets/battleship/{k}-side.png')," for k in SHIPS)}
}};

/** Số ô của từng loại tàu, khớp với hạm đội mặc định [5,4,3,3,2]. */
export const BS_SHIP_LEN: Record<ShipKind, number> = {{
{chr(10).join(f"  {k}: {v['len']}," for k, v in SHIPS.items())}
}};

/**
 * Chọn loại tàu theo độ dài. Hạm đội có hai tàu 3 ô nên tàu thứ hai lấy hình
 * tàu ngầm cho khỏi trùng.
 */
export function shipKind(len: number, nth = 0): ShipKind {{
  const same = (Object.keys(BS_SHIP_LEN) as ShipKind[]).filter((k) => BS_SHIP_LEN[k] === len);
  if (!same.length) return 'corvette';
  return same[Math.min(nth, same.length - 1)];
}}

/** Vòng ngắm và cờ. */
export const BS_MARK = {{
  targetBlue: require('../../assets/battleship/target-blue.png'),
  targetRed: require('../../assets/battleship/target-red.png'),
  flagRed: require('../../assets/battleship/flag-red.png'),
  flagWhite: require('../../assets/battleship/flag-white.png'),
}};

/** Tỉ lệ khung của từng mảnh (rộng / cao) để đặt kích thước không méo. */
export const BS_RATIO: Record<string, number> = {json.dumps(ratios, indent=2)};
"""
    os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
    with open(OUT_TS, "w", encoding="utf-8") as f:
        f.write(ts)

    for name, (w, h) in saved.items():
        print(f"  {name}.png  {w}×{h}")
    print(f"-> {os.path.relpath(OUT_IMG, ROOT)} và {os.path.relpath(OUT_TS, ROOT)}")


if __name__ == "__main__":
    main()
