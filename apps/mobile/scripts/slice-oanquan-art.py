#!/usr/bin/env python3
"""Cắt bảng thiết kế Ô Ăn Quan thành từng mảnh dùng được trong app.

Đầu vào  : apps/mobile/assets/oanquan/source/oanquan-sheet.png (bản vẽ gốc)
Đầu ra   : apps/mobile/assets/oanquan/*.png + src/art/oanQuan.ts

Chạy:  python3 apps/mobile/scripts/slice-oanquan-art.py

Cách làm:
1. Nền của bản vẽ là màu gần trắng (kèm ô caro nhạt). Tô loang từ bốn cạnh để
   biết đâu là nền — không cắt bằng ngưỡng màu, vì hạt trắng cũng gần trắng và
   sẽ bị thủng ruột.
2. Gán nhãn từng vùng liền nhau rồi lấy khung bao. Vị trí trên bản vẽ quyết định
   đó là mảnh gì (hàng hạt, hàng quan, hàng chi tiết).
3. Bàn cờ gốc vẽ 6 ô mỗi hàng, game chỉ dùng 5. Cắt bàn thành nắp trái, một cột
   ô, nắp phải rồi ghép lại thành bàn 5 cột — nhờ vậy giữ nguyên nét vẽ gốc thay
   vì co ảnh cho vừa.
4. Dò tâm từng lòng ô trên bàn đã ghép để app biết chấm hạt vào đâu; toạ độ ghi
   ra manifest dưới dạng tỉ lệ nên co giãn theo màn hình nào cũng đúng.
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
SRC = os.path.join(ROOT, "assets/oanquan/source/oanquan-sheet.png")
OUT_IMG = os.path.join(ROOT, "assets/oanquan")
OUT_TS = os.path.join(ROOT, "src/art/oanQuan.ts")

# Thứ tự hạt trên bản vẽ, trái sang phải.
SEED_NAMES = ["white", "black", "green", "red", "gold", "blue"]


def alpha_mask(rgb):
    """Mặt nạ 'không phải nền', lấy bằng cách tô loang từ viền ảnh."""
    a = rgb.astype(int)
    mx, mn = a.max(2), a.min(2)
    bgish = (mn > 200) & ((mx - mn) < 18)
    lbl, _ = ndimage.label(bgish)
    edge = set(lbl[0]) | set(lbl[-1]) | set(lbl[:, 0]) | set(lbl[:, -1])
    edge.discard(0)
    outside = np.isin(lbl, list(edge))
    return ndimage.binary_closing(~outside, np.ones((3, 3)))


def cutout(im, mask, box):
    """Cắt một mảnh kèm kênh alpha, viền được làm mềm một chút cho đỡ răng cưa."""
    x0, y0, x1, y1 = box
    piece = im.crop(box).convert("RGBA")
    a = Image.fromarray((mask[y0:y1, x0:x1] * 255).astype("uint8"), "L")
    piece.putalpha(a.filter(ImageFilter.GaussianBlur(0.6)))
    return piece


FEATHER = 14


def blend_paste(canvas, tile, x):
    """Dán một cột vào bàn, mép trái chuyển dần để không lộ vệt nối vân gỗ."""
    w, h = tile.size
    base = np.array(canvas.crop((x, 0, x + w, h)), dtype=float)
    new = np.array(tile, dtype=float)
    ramp = np.ones(w)
    ramp[:FEATHER] = np.linspace(0, 1, FEATHER)
    # Chỉ pha ở chỗ nền cũ đã có hình, còn vùng trống thì lấy nguyên cột mới.
    ramp = np.where(base[:, :, 3].max(0) > 0, ramp, 1.0)
    out = base * (1 - ramp)[None, :, None] + new * ramp[None, :, None]
    canvas.paste(Image.fromarray(out.astype("uint8"), "RGBA"), (x, 0))


def components(mask, min_area=2000):
    lbl, _ = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lbl)):
        if sl is None:
            continue
        area = int((lbl[sl] == i + 1).sum())
        if area < min_area:
            continue
        out.append(
            {
                "x": sl[1].start,
                "y": sl[0].start,
                "w": sl[1].stop - sl[1].start,
                "h": sl[0].stop - sl[0].start,
                "area": area,
            }
        )
    return out


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Không thấy bản vẽ gốc: {SRC}")
    os.makedirs(OUT_IMG, exist_ok=True)

    im = Image.open(SRC).convert("RGB")
    rgb = np.array(im)
    mask = alpha_mask(rgb)

    parts = components(mask)
    parts.sort(key=lambda p: (p["y"], p["x"]))

    board = max(parts, key=lambda p: p["area"])
    rest = [p for p in parts if p is not board]

    # Hàng hạt: sáu mảnh nhỏ cùng cỡ, nằm cao hơn nửa dưới bản vẽ.
    seeds = sorted([p for p in rest if 2000 < p["area"] < 5000 and p["y"] < 900], key=lambda p: p["x"])
    if len(seeds) != len(SEED_NAMES):
        sys.exit(f"Đếm được {len(seeds)} hạt, cần {len(SEED_NAMES)} — bản vẽ đổi bố cục rồi")

    mid = [p for p in rest if p["area"] >= 5000 and p["y"] < 900]
    mid.sort(key=lambda p: p["x"])
    chibis = [p for p in mid if p["h"] > 180][:2]
    lids = [p for p in mid if p["h"] <= 180][:2]
    if len(chibis) != 2 or len(lids) != 2:
        sys.exit("Không tách được hai quan và hai nắp quan")

    low = sorted([p for p in rest if p["y"] >= 900 and p["area"] >= 4000], key=lambda p: p["x"])
    if len(low) != 4:
        sys.exit(f"Hàng dưới có {len(low)} mảnh, cần 4 (ô dân, ô quan, hoa, lá)")
    _pit, _quan_pit, flower, leaf = low

    saved = {}

    def save(name, part):
        box = (part["x"], part["y"], part["x"] + part["w"], part["y"] + part["h"])
        cutout(im, mask, box).save(os.path.join(OUT_IMG, f"{name}.png"))
        saved[name] = (part["w"], part["h"])

    for name, part in zip(SEED_NAMES, seeds):
        save(f"seed-{name}", part)
    save("quan-blue", chibis[0])
    save("quan-red", chibis[1])
    save("lid-blue", lids[0])
    save("lid-red", lids[1])
    # pit / quan_pit chỉ để đối chiếu vị trí, lòng ô đã nằm sẵn trong ảnh bàn.
    save("flower", flower)
    save("leaf", leaf)

    # ---- Bàn cờ: gốc 6 cột, ghép lại còn 5 ----
    bx, by, bw, bh = board["x"], board["y"], board["w"], board["h"]
    bimg = cutout(im, mask, (bx, by, bx + bw, by + bh))
    barr = np.array(im.crop((bx, by, bx + bw, by + bh))).astype(int)

    holes = ndimage.binary_opening(barr[:, :, 0] < 185, np.ones((7, 7)))
    lbl, _ = ndimage.label(holes)
    round_pits = []
    ovals = []
    for i, sl in enumerate(ndimage.find_objects(lbl)):
        if sl is None:
            continue
        h = sl[0].stop - sl[0].start
        w = sl[1].stop - sl[1].start
        if (lbl[sl] == i + 1).sum() < 4000:
            continue
        if h > 250:
            ovals.append((sl[1].start, sl[0].start, w, h))
        elif 60 < h < 160 and 80 < w < 160:
            round_pits.append((sl[1].start, sl[0].start, w, h))
    if len(ovals) != 2:
        sys.exit(f"Tìm thấy {len(ovals)} ô Quan, cần 2")

    cols = sorted({round(p[0] / 5) * 5 for p in round_pits})
    if len(cols) < 6:
        sys.exit(f"Chỉ thấy {len(cols)} cột ô dân, bản vẽ gốc có 6")
    pitch = round((cols[-1] - cols[0]) / (len(cols) - 1))
    pit_w = round(sum(p[2] for p in round_pits) / len(round_pits))
    # Mép trái của cột đầu, chừa đúng nửa khoảng hở giữa hai ô.
    tile_x0 = cols[0] - (pitch - pit_w) // 2
    tile_x1 = tile_x0 + pitch
    right_x0 = tile_x0 + pitch * len(cols)

    lanes = 5
    new_w = tile_x0 + pitch * lanes + (bw - right_x0)
    canvas = Image.new("RGBA", (new_w, bh), (0, 0, 0, 0))
    canvas.paste(bimg.crop((0, 0, tile_x0, bh)), (0, 0))
    tile = bimg.crop((tile_x0, 0, tile_x1, bh))
    for i in range(lanes):
        blend_paste(canvas, tile, tile_x0 + i * pitch)
    blend_paste(canvas, bimg.crop((right_x0, 0, bw, bh)), tile_x0 + pitch * lanes)
    canvas.save(os.path.join(OUT_IMG, "board.png"))

    ys = sorted({round(p[1] / 5) * 5 for p in round_pits})
    top_y = min(ys)
    bottom_y = max(ys)
    pit_h = round(sum(p[3] for p in round_pits) / len(round_pits))
    row_top = (top_y + pit_h / 2) / bh
    row_bottom = (bottom_y + pit_h / 2) / bh
    pit_xs = [(tile_x0 + i * pitch + pitch / 2) / new_w for i in range(lanes)]

    left_oval, right_oval = sorted(ovals)
    quan_left = {
        "cx": (left_oval[0] + left_oval[2] / 2) / new_w,
        "cy": (left_oval[1] + left_oval[3] / 2) / bh,
        "w": left_oval[2] / new_w,
        "h": left_oval[3] / bh,
    }
    shift = new_w - bw
    quan_right = {
        "cx": (right_oval[0] + shift + right_oval[2] / 2) / new_w,
        "cy": (right_oval[1] + right_oval[3] / 2) / bh,
        "w": right_oval[2] / new_w,
        "h": right_oval[3] / bh,
    }

    layout = {
        "boardW": new_w,
        "boardH": bh,
        "pitXs": [round(v, 5) for v in pit_xs],
        "rowTop": round(row_top, 5),
        "rowBottom": round(row_bottom, 5),
        "pitW": round(pit_w / new_w, 5),
        "pitH": round(pit_h / bh, 5),
        "quanLeft": {k: round(v, 5) for k, v in quan_left.items()},
        "quanRight": {k: round(v, 5) for k, v in quan_right.items()},
    }

    seed_lines = "\n".join(f"  {n}: require('../../assets/oanquan/seed-{n}.png')," for n in SEED_NAMES)
    ts = f"""// Tệp sinh tự động bởi scripts/slice-oanquan-art.py — đừng sửa tay.
// Cắt từ bản vẽ assets/oanquan/source/oanquan-sheet.png.

/** Bàn cờ đã ghép lại còn 5 cột, giữ nguyên nét vẽ gốc. */
export const OAN_QUAN_BOARD = require('../../assets/oanquan/board.png');

/** Toạ độ trên bàn, ghi theo tỉ lệ 0..1 nên co giãn cỡ nào cũng đúng. */
export const OAN_QUAN_LAYOUT = {json.dumps(layout, ensure_ascii=False, indent=2)} as const;

export type SeedColor = {" | ".join(f"'{n}'" for n in SEED_NAMES)};

/** Sáu màu hạt dân. */
export const SEED_ART: Record<SeedColor, number> = {{
{seed_lines}
}};

export const SEED_COLORS: SeedColor[] = [{", ".join(f"'{n}'" for n in SEED_NAMES)}];

/** Quan còn trên bàn (chibi) và quan đã bị ăn (nắp úp). */
export const QUAN_ART = {{
  blue: require('../../assets/oanquan/quan-blue.png'),
  red: require('../../assets/oanquan/quan-red.png'),
}};

export const QUAN_LID_ART = {{
  blue: require('../../assets/oanquan/lid-blue.png'),
  red: require('../../assets/oanquan/lid-red.png'),
}};

/** Chi tiết rời: hoa văn và lá trang trí. */
export const OAN_QUAN_DECOR = {{
  flower: require('../../assets/oanquan/flower.png'),
  leaf: require('../../assets/oanquan/leaf.png'),
}};

/** Tỉ lệ khung của từng mảnh (rộng / cao) để đặt kích thước không méo. */
export const OAN_QUAN_RATIO: Record<string, number> = {json.dumps({k: round(v[0] / v[1], 4) for k, v in saved.items()}, indent=2)};
"""
    os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
    with open(OUT_TS, "w", encoding="utf-8") as f:
        f.write(ts)

    print(f"Bàn cờ: {new_w}×{bh} ({lanes} cột, bước {pitch}px)")
    for name, (w, h) in saved.items():
        print(f"  {name}.png  {w}×{h}")
    print(f"-> {os.path.relpath(OUT_IMG, ROOT)} và {os.path.relpath(OUT_TS, ROOT)}")


if __name__ == "__main__":
    main()
