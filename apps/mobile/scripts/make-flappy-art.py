#!/usr/bin/env python3
"""
Sinh bộ sprite pixel cho Flappy Bird.

Vì sao vẽ bằng script chứ không tải về: con chim của bản Flappy Bird gốc là art
có bản quyền của Dong Nguyen, các kho "flappy bird assets" trên mạng đều là bản
trích xuất từ game gốc nên không dùng được. Kho game-icons.net thì không có con
chim thân tròn nhìn nghiêng nào đúng chất. Nên bộ này vẽ theo đúng phong cách
pixel của thể loại — thân tròn vàng, mỏ cam chìa trước, mắt to, ba khung vỗ
cánh — nhưng từng điểm ảnh là của dự án.

Lưới vẽ bằng ASCII cho dễ sửa: mỗi ký tự là một điểm ảnh, tra bảng PALETTE ra
màu. Ảnh xuất ra phóng to nguyên lần (nearest neighbour) nên giữ nguyên cạnh
răng cưa đặc trưng của pixel art.

Chạy:  python3 apps/mobile/scripts/make-flappy-art.py
"""
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_IMG = os.path.join(ROOT, "assets/flappy")
OUT_TS = os.path.join(ROOT, "src/art/flappy.ts")

#: Phóng to ngần này lần khi xuất PNG, để trên màn hình mật độ cao vẫn nét.
SCALE = 8

PALETTE = {
    ".": None,                  # trong suốt
    "K": (0x53, 0x3B, 0x20),    # nét viền nâu sẫm
    "Y": (0xF7, 0xCF, 0x33),    # thân vàng
    "S": (0xD8, 0xA1, 0x22),    # bóng đổ dưới thân
    "H": (0xFF, 0xE9, 0x7A),    # bắt sáng trên lưng
    "C": (0xFD, 0xF4, 0xD4),    # bụng kem
    "W": (0xFF, 0xFF, 0xFF),    # lòng trắng mắt
    "P": (0x33, 0x2A, 0x24),    # con ngươi
    "B": (0xF6, 0x8B, 0x25),    # mỏ cam
    "D": (0xD4, 0x60, 0x15),    # mỏ phần dưới, sẫm hơn
    "R": (0xE8, 0x53, 0x3A),    # yếm đỏ dưới mỏ
    "G": (0xE8, 0xE2, 0xD2),    # cánh, xám kem
    "N": (0xC2, 0xB6, 0xA0),    # viền dưới cánh
}

#: Thân chim, chưa có cánh. 20 cột × 15 hàng, nhìn nghiêng, quay sang phải.
BODY = [
    "......KKKKKKK.......",
    "....KKYYYYYYYKK.....",
    "...KHHYYYYYKWWWK....",
    "..KHHHYYYYKWWWWWK...",
    "..KHHYYYYYKWWPPWK...",
    ".KYYYYYYYYKWWPPWKKKK",
    ".KYYYYYYYYKWWWWKBBBB",
    ".KYYYYYYYYYKWWKBBBBK",
    ".KYYYYYYYYYYKKKDDDK.",
    ".KSYYYYYYYYYYKRRRK..",
    "..KSSYYYYYYYYKKKK...",
    "..KCSSSYYYYYYK......",
    "...KCCCCCCCCK.......",
    "....KKCCCCCK........",
    "......KKKKK.........",
]

#: Cánh ở ba nhịp: giơ lên, ngang, hạ xuống. Ghi đè lên thân theo toạ độ (x, y).
WINGS = {
    "up": (
        2,
        1,
        [
            "..GGGG..",
            ".GGGGGG.",
            "KGGGGGGK",
            ".KNNNNK.",
            "..KKKK..",
        ],
    ),
    "mid": (
        2,
        5,
        [
            "KGGGGGGK",
            "GGGGGGGG",
            "KNNNNNNK",
            "..KKKK..",
        ],
    ),
    "down": (
        2,
        7,
        [
            "..KKKK..",
            ".KGGGGK.",
            "KGGGGGGK",
            ".GGGGGG.",
            "..NNNN..",
        ],
    ),
}


def stamp(px, grid, ox=0, oy=0):
    """Vẽ một lưới ASCII lên ảnh, bỏ qua ký tự trong suốt."""
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            color = PALETTE[ch]
            if color is not None:
                px[ox + x, oy + y] = (*color, 255)


def frame(wing):
    w = max(len(r) for r in BODY)
    im = Image.new("RGBA", (w, len(BODY)), (0, 0, 0, 0))
    px = im.load()
    stamp(px, BODY)
    if wing:
        ox, oy, grid = WINGS[wing]
        stamp(px, grid, ox, oy)
    return im.resize((w * SCALE, len(BODY) * SCALE), Image.NEAREST)


def main():
    os.makedirs(OUT_IMG, exist_ok=True)
    saved = {}
    for name in ("up", "mid", "down"):
        im = frame(name)
        im.save(os.path.join(OUT_IMG, f"bird-{name}.png"))
        saved[f"bird-{name}"] = im.size

    ratio = round(saved["bird-mid"][0] / saved["bird-mid"][1], 4)
    ts = f"""// Tệp sinh tự động bởi scripts/make-flappy-art.py — đừng sửa tay.
// Pixel art của dự án, vẽ theo phong cách thể loại (xem chú thích đầu script).

/** Ba nhịp vỗ cánh; client đảo qua lại theo vận tốc dọc của chim. */
export const FLAPPY_BIRD = {{
  up: require('../../assets/flappy/bird-up.png'),
  mid: require('../../assets/flappy/bird-mid.png'),
  down: require('../../assets/flappy/bird-down.png'),
}};

/** Tỉ lệ khung của sprite chim (rộng / cao), để đặt kích thước không méo. */
export const FLAPPY_BIRD_RATIO = {ratio};
"""
    os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
    with open(OUT_TS, "w", encoding="utf-8") as f:
        f.write(ts)

    for name, (w, h) in saved.items():
        print(f"  {name}.png  {w}×{h}")
    print(f"-> {os.path.relpath(OUT_IMG, ROOT)} và {os.path.relpath(OUT_TS, ROOT)}")


if __name__ == "__main__":
    main()
