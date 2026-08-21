#!/usr/bin/env python3
"""Cắt bảng thiết kế Cờ Cá Ngựa thành từng mảnh dùng được trong app.

Đầu vào  : apps/mobile/assets/ludo/source/ludo-sheet.png
Đầu ra   : apps/mobile/assets/ludo/*.png + src/art/ludo.ts

Chạy:  python3 apps/mobile/scripts/slice-ludo-art.py

Nền bảng là màu trắng nên tách hình bằng cách tô loang từ bốn cạnh, giống bảng
Ô Ăn Quan; alpha ở mép lấy theo độ đậm của pixel để mép mượt.

Bàn cờ trong bản vẽ được vẽ tay nên các ô không đều tăm tắp — không lấy cả tấm
làm nền rồi chấm quân lên được. Thay vào đó chỉ cắt **từng mảnh** (bốn bức
tranh ngựa ở góc, hoa văn giữa, quân, ô xuất phát, ô an toàn, số ô về chuồng)
rồi dựng lại bàn bằng lưới 15x15 đều đặn trong app.
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
SRC = os.path.join(ROOT, "assets/ludo/source/ludo-sheet.png")
OUT_IMG = os.path.join(ROOT, "assets/ludo")
OUT_TS = os.path.join(ROOT, "src/art/ludo.ts")

# Bàn cờ nằm ở góc trái bản vẽ.
BOARD = (9, 9, 953, 958)
# Lưới 15x15 bên trong bàn: gốc và bước ô đo theo các ô màu của cầu về chuồng.
GRID_ORIGIN = 31.0
GRID_CELL = 59.75

# Bốn bức tranh ngựa: đúng ô 6x6 ở bốn góc, thu vào một chút cho khỏi dính cột ô bên cạnh.
YARD_INSET = 8
YARDS = {"blue": (0, 0), "red": (9, 0), "green": (9, 9), "yellow": (0, 9)}

# Hoa văn bốn cánh: lấy ngay trên bàn chứ đừng lấy con dấu trong bảng chú thích
# — con dấu chỉ 74x57 và có khung thẻ bao quanh, phóng lên cỡ ô là vừa nhoè vừa
# lòi ra cái viền đen. Bản trên bàn to hơn và nằm gọn trên nền kem, cắt đặc luôn
# vì nền kem trùng với nền bàn trong app.
CENTER_BOX = (410, 426, 528, 549)

# Mảnh rời trong bảng chú thích bên phải (toạ độ trên bản vẽ gốc).
PIECES = {
    "horse-blue": (974, 75, 1041, 191),
    "horse-red": (1274, 75, 1345, 192),
    "horse-yellow": (974, 214, 1041, 330),
    "horse-green": (1276, 213, 1345, 330),
    "start-blue": (968, 662, 1029, 727),
    "start-red": (1034, 662, 1095, 727),
    "start-yellow": (1100, 662, 1161, 727),
    "start-green": (1166, 662, 1227, 727),
    "safe-blue": (968, 831, 1031, 895),
    "safe-red": (1032, 831, 1094, 895),
    "safe-yellow": (1095, 831, 1157, 895),
    "safe-green": (1158, 831, 1221, 895),
    "cup": (1248, 428, 1517, 597),
}

# Cột "số ô về chuồng": mỗi màu một dải dọc gồm 6 ô, đánh số 6 ở trên xuống 1 ở dưới.
LANE_STRIPS = {"blue": (1254, 699, 1305, 967), "red": (1315, 699, 1367, 967),
               "yellow": (1379, 699, 1430, 967), "green": (1442, 699, 1494, 967)}

BG_LEVEL = 250.0
INK_LEVEL = 205.0
EDGE_BAND = 2


def alpha_mask(rgb):
    """Mặt nạ 'không phải nền', lấy bằng cách tô loang từ viền ảnh."""
    a = rgb.astype(int)
    mx, mn = a.max(2), a.min(2)
    bgish = (mn > 210) & ((mx - mn) < 18)
    lbl, _ = ndimage.label(bgish)
    edge = set(lbl[0]) | set(lbl[-1]) | set(lbl[:, 0]) | set(lbl[:, -1])
    edge.discard(0)
    return ndimage.binary_closing(~np.isin(lbl, list(edge)), np.ones((3, 3)))


def cutout(im, mask, box):
    """Cắt một mảnh kèm alpha mềm bám theo nét chống răng cưa của bản vẽ."""
    x0, y0, x1, y1 = box
    piece = im.crop(box).convert("RGBA")
    sub = np.array(im.crop(box)).astype(float)
    darkness = np.clip((BG_LEVEL - sub.min(2)) / (BG_LEVEL - INK_LEVEL), 0, 1)

    m = mask[y0:y1, x0:x1]
    core = ndimage.binary_erosion(m, np.ones((3, 3)), iterations=EDGE_BAND)
    reach = ndimage.binary_dilation(m, np.ones((3, 3)), iterations=EDGE_BAND)
    a = np.where(core, 1.0, darkness)
    a = np.where(reach, a, 0.0)
    piece.putalpha(Image.fromarray((a * 255).astype("uint8"), "L"))
    return piece


def restamp(base, donor):
    """Thay chữ số trên một ô bằng chữ số của ô khác cùng cỡ.

    Chữ số là nét trắng nằm giữa ô, nền là mảng màu đặc. Xoá chữ cũ bằng cách
    tô lại màu nền, rồi vẽ nét trắng lấy từ ô mẫu (đã co về đúng cỡ).
    """
    out = base.convert("RGBA")
    a = np.array(out).astype(float)
    rgb, alpha = a[:, :, :3], a[:, :, 3]

    inside = alpha > 200
    glyph = inside & (rgb.min(2) > 190)
    fill = np.median(rgb[inside & ~glyph], 0) if (inside & ~glyph).any() else np.array([230, 170, 30])
    rgb[glyph] = fill

    d = np.array(donor.convert("RGBA").resize(out.size, Image.LANCZOS)).astype(float)
    dmask = np.clip((d[:, :, :3].min(2) - 170) / 60, 0, 1) * (d[:, :, 3] / 255)
    for c in range(3):
        rgb[:, :, c] = rgb[:, :, c] * (1 - dmask) + 255 * dmask

    a[:, :, :3] = rgb
    return Image.fromarray(a.astype("uint8"), "RGBA")


def cell_box(col, row, cols=1, rows=1, inset=0):
    """Khung pixel của một vùng ô trên bàn, tính theo lưới 15x15."""
    x0 = BOARD[0] + GRID_ORIGIN + col * GRID_CELL + inset
    y0 = BOARD[1] + GRID_ORIGIN + row * GRID_CELL + inset
    return (
        int(round(x0)),
        int(round(y0)),
        int(round(x0 + cols * GRID_CELL - inset * 2)),
        int(round(y0 + rows * GRID_CELL - inset * 2)),
    )


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Không thấy bản vẽ gốc: {SRC}")
    os.makedirs(OUT_IMG, exist_ok=True)

    im = Image.open(SRC).convert("RGB")
    mask = alpha_mask(np.array(im))
    saved = {}

    def save(name, img):
        img.save(os.path.join(OUT_IMG, f"{name}.png"))
        saved[name] = img.size

    for color, (col, row) in YARDS.items():
        save(f"yard-{color}", im.crop(cell_box(col, row, 6, 6, YARD_INSET)))

    save("center", im.crop(CENTER_BOX))

    for name, box in PIECES.items():
        save(name, cutout(im, mask, box))

    # Mỗi dải chia đều 6 ô; bản vẽ xếp số 6 ở trên nên đảo lại cho 1 nằm đầu.
    lane_tiles = {}
    for color, (x0, y0, x1, y1) in LANE_STRIPS.items():
        step = (y1 - y0) / 6
        for k in range(6):
            top = int(round(y0 + (5 - k) * step))
            bottom = int(round(y0 + (6 - k) * step))
            lane_tiles[(color, k + 1)] = cutout(im, mask, (x0, top, x1, bottom))

    # Bản vẽ gốc đánh nhầm cột vàng: đọc từ trên xuống là 6, 6, 4, 3, 2, 1 —
    # thiếu hẳn số 5. Dựng lại ô đó: lấy nền vàng của một ô cùng cột, xoá chữ cũ
    # rồi in chữ 5 lấy từ ô cùng số của màu khác (chữ số vẽ giống hệt nhau).
    lane_tiles[("yellow", 5)] = restamp(lane_tiles[("yellow", 5)], lane_tiles[("blue", 5)])

    for (color, k), img in lane_tiles.items():
        save(f"lane-{color}-{k}", img)

    colors = list(YARDS)
    lane_entries = "\n".join(
        f"  {c}: [" + ", ".join(f"require('../../assets/ludo/lane-{c}-{k}.png')" for k in range(1, 7)) + "],"
        for c in colors
    )
    ts = f"""// Tệp sinh tự động bởi scripts/slice-ludo-art.py — đừng sửa tay.
// Cắt từ bản vẽ assets/ludo/source/ludo-sheet.png.

export type LudoColor = {" | ".join(f"'{c}'" for c in colors)};

/** Bốn bức tranh ngựa ở góc bàn, đúng khổ 6x6 ô. */
export const LUDO_YARD: Record<LudoColor, number> = {{
{chr(10).join(f"  {c}: require('../../assets/ludo/yard-{c}.png')," for c in colors)}
}};

/** Quân ngựa. */
export const LUDO_HORSE: Record<LudoColor, number> = {{
{chr(10).join(f"  {c}: require('../../assets/ludo/horse-{c}.png')," for c in colors)}
}};

/** Ô xuất phát và ô an toàn trên đường chạy. */
export const LUDO_START: Record<LudoColor, number> = {{
{chr(10).join(f"  {c}: require('../../assets/ludo/start-{c}.png')," for c in colors)}
}};

export const LUDO_SAFE: Record<LudoColor, number> = {{
{chr(10).join(f"  {c}: require('../../assets/ludo/safe-{c}.png')," for c in colors)}
}};

/** Sáu ô cầu về chuồng của từng màu, chỉ số 0 là ô gần đường chạy nhất. */
export const LUDO_LANE: Record<LudoColor, number[]> = {{
{lane_entries}
}};

/** Hoa văn bốn cánh ở giữa bàn và cốc xúc xắc. */
export const LUDO_CENTER = require('../../assets/ludo/center.png');
export const LUDO_CUP = require('../../assets/ludo/cup.png');

/** Tỉ lệ khung của từng mảnh (rộng / cao). */
export const LUDO_RATIO: Record<string, number> = {json.dumps({k: round(w / h, 4) for k, (w, h) in saved.items()}, indent=2)};
"""
    os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
    with open(OUT_TS, "w", encoding="utf-8") as f:
        f.write(ts)

    for name, (w, h) in saved.items():
        print(f"  {name}.png  {w}×{h}")
    print(f"-> {os.path.relpath(OUT_IMG, ROOT)} và {os.path.relpath(OUT_TS, ROOT)}")


if __name__ == "__main__":
    main()
