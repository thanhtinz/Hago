#!/usr/bin/env python3
"""Generate 2D chibi PNG sprites for Hago game boards."""
from __future__ import annotations
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path("/workspace/apps/mobile/assets/chibi")

def new(size=128, bg=None):
    im = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def save(im: Image.Image, rel: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    print("wrote", path.relative_to(ROOT.parent.parent.parent))

def circle(d, xy, r, fill, outline=None, width=2):
    x, y = xy
    d.ellipse([x-r, y-r, x+r, y+r], fill=fill, outline=outline, width=width if outline else 0)

def soft_ellipse(d, box, fill, outline=None, width=2):
    d.ellipse(box, fill=fill, outline=outline, width=width if outline else 0)

def rounded_rect(d, box, r, fill, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width if outline else 0)

# ---------- SHARED ----------
def make_dice(face: int):
    im, d = new(96)
    rounded_rect(d, [8, 8, 88, 88], 16, (255, 255, 255, 255), (46, 37, 69, 255), 4)
    # soft bottom shadow already via outline
    dots = {
        1: [(48, 48)],
        2: [(32, 32), (64, 64)],
        3: [(32, 32), (48, 48), (64, 64)],
        4: [(32, 32), (64, 32), (32, 64), (64, 64)],
        5: [(32, 32), (64, 32), (48, 48), (32, 64), (64, 64)],
        6: [(32, 28), (64, 28), (32, 48), (64, 48), (32, 68), (64, 68)],
    }
    for x, y in dots[face]:
        circle(d, (x, y), 7, (46, 37, 69, 255))
    save(im, f"shared/dice_{face}.png")

def make_arrow(name, pts):
    im, d = new(96)
    rounded_rect(d, [10, 10, 86, 86], 20, (255, 255, 255, 255), (240, 227, 214, 255), 3)
    d.polygon(pts, fill=(47, 169, 245, 255))
    save(im, f"shared/arrow_{name}.png")

def make_timer():
    im, d = new(96)
    circle(d, (48, 52), 32, (255, 241, 204, 255), (255, 197, 61, 255), 4)
    circle(d, (48, 52), 24, (255, 255, 255, 255), (255, 197, 61, 255), 3)
    d.line([(48, 52), (48, 36)], fill=(46, 37, 69, 255), width=4)
    d.line([(48, 52), (60, 52)], fill=(46, 37, 69, 255), width=3)
    rounded_rect(d, [40, 14, 56, 24], 4, (255, 197, 61, 255))
    save(im, "shared/timer.png")

def make_live():
    im, d = new(96, (0,0,0,0))
    rounded_rect(d, [8, 28, 88, 68], 20, (57, 199, 127, 255))
    circle(d, (28, 48), 8, (255, 255, 255, 255))
    save(im, "shared/live_dot.png")

def make_trophy():
    im, d = new(128)
    # cup
    soft_ellipse(d, [28, 28, 100, 90], (255, 197, 61, 255), (214, 156, 19, 255), 3)
    soft_ellipse(d, [40, 38, 88, 78], (255, 241, 204, 255))
    # handles
    d.arc([12, 40, 40, 80], 90, 270, fill=(214, 156, 19, 255), width=5)
    d.arc([88, 40, 116, 80], 270, 90, fill=(214, 156, 19, 255), width=5)
    # stem
    rounded_rect(d, [54, 82, 74, 100], 4, (214, 156, 19, 255))
    rounded_rect(d, [40, 98, 88, 112], 8, (255, 197, 61, 255), (214, 156, 19, 255), 2)
    # star
    d.polygon([(64, 44), (68, 54), (78, 54), (70, 60), (73, 70), (64, 64), (55, 70), (58, 60), (50, 54), (60, 54)], fill=(255, 122, 89, 255))
    save(im, "shared/trophy.png")

def make_draw_handshake():
    im, d = new(128)
    # two round hands
    soft_ellipse(d, [18, 40, 70, 92], (255, 214, 180, 255), (230, 170, 130, 255), 3)
    soft_ellipse(d, [58, 40, 110, 92], (255, 214, 180, 255), (230, 170, 130, 255), 3)
    save(im, "shared/draw.png")

def make_loss_cloud():
    im, d = new(128)
    soft_ellipse(d, [20, 40, 70, 80], (180, 190, 210, 255))
    soft_ellipse(d, [45, 30, 100, 78], (200, 208, 225, 255))
    soft_ellipse(d, [30, 55, 95, 95], (170, 180, 200, 255))
    # sad drop
    d.polygon([(64, 70), (56, 95), (72, 95)], fill=(47, 169, 245, 200))
    save(im, "shared/loss.png")

# ---------- CARO ----------
def make_caro_o():
    """Chibi peach blob character as O."""
    im, d = new(128)
    # body shadow
    soft_ellipse(d, [28, 88, 100, 112], (0, 0, 0, 30))
    # round body
    soft_ellipse(d, [18, 18, 110, 100], (255, 170, 120, 255), (232, 95, 60, 255), 4)
    soft_ellipse(d, [30, 28, 98, 88], (255, 210, 180, 255))
    # eyes
    circle(d, (48, 55), 7, (46, 37, 69, 255))
    circle(d, (80, 55), 7, (46, 37, 69, 255))
    circle(d, (50, 53), 2, (255, 255, 255, 255))
    circle(d, (82, 53), 2, (255, 255, 255, 255))
    # blush
    soft_ellipse(d, [30, 62, 46, 74], (255, 122, 89, 90))
    soft_ellipse(d, [82, 62, 98, 74], (255, 122, 89, 90))
    # smile
    d.arc([48, 58, 80, 82], 20, 160, fill=(232, 95, 60, 255), width=3)
    save(im, "caro/piece_o.png")

def make_caro_x():
    """Chibi blue star/cross character as X."""
    im, d = new(128)
    soft_ellipse(d, [28, 88, 100, 112], (0, 0, 0, 30))
    # X arms as rounded bars
    for ang in (0, 1):
        # draw thick X with polygons
        pass
    # body circle
    soft_ellipse(d, [22, 22, 106, 106], (165, 220, 255, 255), (47, 169, 245, 255), 4)
    soft_ellipse(d, [34, 34, 94, 94], (220, 240, 255, 255))
    # X mark
    d.line([(42, 42), (86, 86)], fill=(47, 169, 245, 255), width=10)
    d.line([(86, 42), (42, 86)], fill=(47, 169, 245, 255), width=10)
    # eyes on top of X
    circle(d, (48, 52), 6, (46, 37, 69, 255))
    circle(d, (80, 52), 6, (46, 37, 69, 255))
    circle(d, (50, 50), 2, (255, 255, 255, 255))
    circle(d, (82, 50), 2, (255, 255, 255, 255))
    soft_ellipse(d, [32, 64, 46, 74], (255, 122, 89, 80))
    soft_ellipse(d, [82, 64, 96, 74], (255, 122, 89, 80))
    save(im, "caro/piece_x.png")

def make_board_wood():
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rounded_rect(d, [0, 0, 255, 255], 28, (246, 223, 194, 255), (216, 180, 138, 255), 6)
    # wood grain lines
    for y in range(40, 220, 28):
        d.line([(20, y), (236, y)], fill=(216, 180, 138, 80), width=2)
    save(im, "caro/board_bg.png")

# ---------- BATTLESHIP ----------
def make_ship(size_label: str, length_hint: int):
    w, h = 160, 64
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # hull
    d.rounded_rectangle([8, 28, w - 8, h - 8], radius=14, fill=(94, 107, 128, 255), outline=(62, 74, 96, 255), width=3)
    # deck
    d.rounded_rectangle([18, 18, w - 30, 40], radius=8, fill=(180, 190, 205, 255))
    # cabin
    d.rounded_rectangle([w // 2 - 16, 6, w // 2 + 20, 28], radius=6, fill=(255, 255, 255, 255), outline=(94, 107, 128, 255), width=2)
    # portholes
    for i in range(length_hint):
        x = 28 + i * ((w - 50) // max(length_hint, 1))
        circle(d, (x, 42), 5, (207, 235, 255, 255), (62, 74, 96, 255), 2)
    # chibi face on cabin
    circle(d, (w // 2 + 2, 16), 3, (46, 37, 69, 255))
    circle(d, (w // 2 + 12, 16), 3, (46, 37, 69, 255))
    save(im, f"battleship/ship_{size_label}.png")

def make_water_tile():
    im, d = new(64)
    rounded_rect(d, [2, 2, 62, 62], 10, (234, 247, 255, 255), (182, 221, 245, 255), 2)
    d.arc([10, 20, 30, 36], 0, 180, fill=(143, 203, 240, 255), width=2)
    d.arc([34, 28, 54, 44], 0, 180, fill=(143, 203, 240, 255), width=2)
    save(im, "battleship/water.png")

def make_hit():
    im, d = new(64)
    # explosion burst
    for i in range(8):
        ang = i * math.pi / 4
        x = 32 + math.cos(ang) * 22
        y = 32 + math.sin(ang) * 22
        d.polygon([(32, 32), (32 + math.cos(ang - 0.2) * 10, 32 + math.sin(ang - 0.2) * 10), (x, y),
                   (32 + math.cos(ang + 0.2) * 10, 32 + math.sin(ang + 0.2) * 10)], fill=(255, 122, 89, 255))
    circle(d, (32, 32), 12, (255, 197, 61, 255))
    circle(d, (32, 32), 6, (255, 255, 255, 255))
    save(im, "battleship/hit.png")

def make_miss():
    im, d = new(64)
    soft_ellipse(d, [16, 20, 48, 48], (143, 203, 240, 200))
    soft_ellipse(d, [22, 26, 42, 42], (234, 247, 255, 255))
    save(im, "battleship/miss.png")

def make_sunk():
    im, d = new(64)
    # big boom
    soft_ellipse(d, [8, 8, 56, 56], (255, 122, 89, 255))
    soft_ellipse(d, [16, 16, 48, 48], (255, 197, 61, 255))
    soft_ellipse(d, [24, 24, 40, 40], (255, 255, 255, 255))
    save(im, "battleship/sunk.png")

def make_anchor():
    im, d = new(128)
    # ring
    d.ellipse([44, 12, 84, 52], outline=(62, 74, 96, 255), width=8)
    # shaft
    d.rectangle([58, 40, 70, 90], fill=(62, 74, 96, 255))
    # arms
    d.arc([24, 60, 104, 116], 0, 180, fill=(62, 74, 96, 255), width=8)
    d.polygon([(30, 95), (24, 110), (42, 100)], fill=(62, 74, 96, 255))
    d.polygon([(98, 95), (104, 110), (86, 100)], fill=(62, 74, 96, 255))
    # cute eyes on ring
    circle(d, (56, 32), 4, (46, 37, 69, 255))
    circle(d, (72, 32), 4, (46, 37, 69, 255))
    save(im, "battleship/anchor.png")

# ---------- OANQUAN ----------
def make_seed():
    im, d = new(48)
    soft_ellipse(d, [6, 8, 42, 40], (160, 100, 50, 255), (110, 65, 30, 255), 2)
    soft_ellipse(d, [12, 12, 28, 26], (200, 150, 90, 180))
    # tiny eye sparkle
    circle(d, (22, 22), 2, (255, 255, 255, 180))
    save(im, "oanquan/seed.png")

def make_quan():
    im, d = new(96)
    soft_ellipse(d, [12, 16, 84, 80], (232, 177, 77, 255), (185, 138, 46, 255), 4)
    soft_ellipse(d, [24, 24, 72, 64], (255, 220, 140, 255))
    # face
    circle(d, (40, 44), 5, (107, 68, 35, 255))
    circle(d, (56, 44), 5, (107, 68, 35, 255))
    d.arc([40, 48, 56, 62], 20, 160, fill=(107, 68, 35, 255), width=2)
    save(im, "oanquan/quan.png")

def make_quan_empty():
    im, d = new(96)
    soft_ellipse(d, [12, 16, 84, 80], (216, 207, 194, 255), (180, 170, 155, 255), 4)
    soft_ellipse(d, [28, 28, 68, 64], (240, 235, 228, 255))
    save(im, "oanquan/quan_empty.png")

def make_oanquan_board():
    im = Image.new("RGBA", (320, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rounded_rect(d, [0, 0, 319, 159], 24, (239, 217, 184, 255), (201, 156, 107, 255), 5)
    save(im, "oanquan/board_bg.png")

# ---------- LUDO ----------
COLORS = [
    ("orange", (255, 122, 89), (232, 95, 60)),
    ("blue", (47, 169, 245), (30, 130, 200)),
    ("mint", (57, 199, 127), (36, 155, 96)),
    ("sun", (255, 197, 61), (214, 156, 19)),
]

def make_horse(name, fill, outline):
    im, d = new(96)
    soft_ellipse(d, [20, 70, 76, 90], (0, 0, 0, 35))
    # body
    soft_ellipse(d, [18, 36, 78, 78], fill + (255,), outline + (255,), 3)
    # head
    soft_ellipse(d, [48, 10, 88, 50], fill + (255,), outline + (255,), 3)
    # ear
    d.polygon([(70, 14), (78, 2), (84, 18)], fill=outline + (255,))
    d.polygon([(62, 14), (66, 4), (74, 18)], fill=fill + (255,))
    # mane
    soft_ellipse(d, [44, 18, 58, 40], outline + (255,))
    # eye
    circle(d, (70, 28), 5, (46, 37, 69, 255))
    circle(d, (72, 26), 2, (255, 255, 255, 255))
    # snout
    soft_ellipse(d, [72, 32, 90, 46], (255, 220, 200, 255), outline + (255,), 2)
    # legs
    d.rectangle([28, 70, 36, 86], fill=outline + (255,))
    d.rectangle([58, 70, 66, 86], fill=outline + (255,))
    save(im, f"ludo/horse_{name}.png")

def make_flag():
    im, d = new(64)
    d.rectangle([12, 10, 18, 56], fill=(140, 100, 60, 255))
    d.polygon([(18, 12), (52, 22), (18, 34)], fill=(255, 122, 89, 255))
    save(im, "ludo/flag.png")

# ---------- MONOPOLY ----------
TOKENS = [
    ("hat", lambda d: (rounded_rect(d, [20, 40, 108, 80], 12, (255, 122, 89, 255), (200, 70, 50, 255), 3),
                       soft_ellipse(d, [30, 20, 98, 50], (255, 160, 130, 255), (200, 70, 50, 255), 3),
                       circle(d, (52, 48), 5, (46, 37, 69, 255)),
                       circle(d, (76, 48), 5, (46, 37, 69, 255)))),
    ("car", lambda d: (rounded_rect(d, [16, 48, 112, 78], 14, (47, 169, 245, 255), (30, 120, 190, 255), 3),
                       rounded_rect(d, [36, 28, 92, 55], 10, (165, 220, 255, 255), (30, 120, 190, 255), 2),
                       circle(d, (40, 78), 12, (46, 37, 69, 255)),
                       circle(d, (88, 78), 12, (46, 37, 69, 255)),
                       circle(d, (40, 78), 5, (200, 200, 200, 255)),
                       circle(d, (88, 78), 5, (200, 200, 200, 255)),
                       circle(d, (52, 40), 4, (46, 37, 69, 255)),
                       circle(d, (72, 40), 4, (46, 37, 69, 255)))),
    ("dog", lambda d: (soft_ellipse(d, [24, 40, 100, 90], (214, 170, 110, 255), (160, 110, 60, 255), 3),
                       soft_ellipse(d, [70, 18, 110, 58], (214, 170, 110, 255), (160, 110, 60, 255), 3),
                       d.polygon([(78, 22), (70, 6), (90, 18)], fill=(160, 110, 60, 255)),
                       d.polygon([(100, 22), (112, 6), (108, 28)], fill=(160, 110, 60, 255)),
                       circle(d, (88, 36), 4, (46, 37, 69, 255)),
                       circle(d, (100, 36), 4, (46, 37, 69, 255)),
                       soft_ellipse(d, [96, 42, 112, 54], (255, 200, 180, 255)))),
    ("boot", lambda d: (rounded_rect(d, [36, 20, 80, 70], 10, (124, 90, 60, 255), (90, 60, 40, 255), 3),
                        rounded_rect(d, [20, 60, 100, 92], 14, (124, 90, 60, 255), (90, 60, 40, 255), 3),
                        circle(d, (52, 40), 4, (46, 37, 69, 255)),
                        circle(d, (68, 40), 4, (46, 37, 69, 255)))),
]

def make_tokens():
    for name, drawer in TOKENS:
        im, d = new(128)
        drawer(d)
        save(im, f"monopoly/token_{name}.png")

def make_house():
    im, d = new(64)
    d.polygon([(32, 8), (56, 28), (8, 28)], fill=(255, 122, 89, 255))
    rounded_rect(d, [14, 28, 50, 56], 4, (255, 230, 210, 255), (200, 100, 70, 255), 2)
    rounded_rect(d, [26, 38, 38, 56], 2, (140, 100, 70, 255))
    save(im, "monopoly/house.png")

def make_bank():
    im, d = new(128)
    rounded_rect(d, [20, 48, 108, 108], 8, (255, 241, 204, 255), (214, 156, 19, 255), 3)
    d.polygon([(16, 52), (64, 16), (112, 52)], fill=(255, 197, 61, 255), outline=(214, 156, 19, 255))
    for x in (36, 56, 76):
        d.rectangle([x, 60, x + 12, 100], fill=(255, 255, 255, 255), outline=(214, 156, 19, 255))
    # face on pediment
    circle(d, (56, 40), 4, (46, 37, 69, 255))
    circle(d, (72, 40), 4, (46, 37, 69, 255))
    save(im, "monopoly/bank.png")

def make_mono_icons():
    # chance
    im, d = new(64)
    soft_ellipse(d, [8, 8, 56, 56], (255, 197, 61, 255), (214, 156, 19, 255), 3)
    d.text((22, 14), "?", fill=(90, 60, 0, 255))  # fallback; redraw as shapes
    # better question mark
    im2, d2 = new(64)
    soft_ellipse(d2, [8, 8, 56, 56], (255, 197, 61, 255), (214, 156, 19, 255), 3)
    soft_ellipse(d2, [22, 14, 42, 34], (255, 255, 255, 255))
    soft_ellipse(d2, [26, 18, 38, 30], (255, 197, 61, 255))
    d2.rectangle([30, 28, 34, 42], fill=(255, 255, 255, 255))
    circle(d2, (32, 48), 3, (255, 255, 255, 255))
    save(im2, "monopoly/chance.png")

    im, d = new(64)
    soft_ellipse(d, [8, 8, 56, 56], (238, 90, 90, 255), (180, 50, 50, 255), 3)
    rounded_rect(d, [20, 18, 44, 46], 4, (255, 255, 255, 255))
    d.line([(24, 26), (40, 26)], fill=(238, 90, 90, 255), width=2)
    d.line([(24, 32), (40, 32)], fill=(238, 90, 90, 255), width=2)
    save(im, "monopoly/tax.png")

    im, d = new(64)
    rounded_rect(d, [12, 16, 52, 52], 6, (100, 110, 140, 255), (60, 70, 100, 255), 3)
    rounded_rect(d, [20, 24, 44, 40], 3, (200, 210, 230, 255))
    d.rectangle([28, 40, 36, 52], fill=(60, 70, 100, 255))
    save(im, "monopoly/jail.png")

    im, d = new(64)
    soft_ellipse(d, [8, 8, 56, 56], (57, 199, 127, 255), (36, 155, 96, 255), 3)
    rounded_rect(d, [22, 22, 42, 42], 4, (255, 255, 255, 255))
    save(im, "monopoly/park.png")

    im, d = new(64)
    soft_ellipse(d, [8, 8, 56, 56], (255, 122, 89, 255), (200, 70, 50, 255), 3)
    d.polygon([(32, 14), (46, 40), (18, 40)], fill=(255, 255, 255, 255))
    save(im, "monopoly/start.png")

# ---------- SHEEP ----------
def make_sheep(golden=False):
    im, d = new(96)
    soft_ellipse(d, [22, 70, 74, 88], (0, 0, 0, 30))
    wool = (255, 220, 140, 255) if golden else (255, 255, 255, 255)
    outline = (200, 150, 60, 255) if golden else (200, 200, 210, 255)
    # fluffy body
    soft_ellipse(d, [12, 28, 84, 78], wool, outline, 3)
    soft_ellipse(d, [8, 36, 36, 64], wool)
    soft_ellipse(d, [60, 36, 88, 64], wool)
    soft_ellipse(d, [28, 18, 68, 48], wool)
    # head
    soft_ellipse(d, [30, 34, 66, 68], (255, 220, 200, 255), (220, 170, 140, 255), 2)
    if golden:
        # horns
        d.arc([14, 22, 40, 50], 200, 40, fill=(180, 120, 40, 255), width=5)
        d.arc([56, 22, 82, 50], 140, 340, fill=(180, 120, 40, 255), width=5)
    # eyes
    circle(d, (40, 48), 5, (46, 37, 69, 255))
    circle(d, (56, 48), 5, (46, 37, 69, 255))
    circle(d, (41, 46), 2, (255, 255, 255, 255))
    circle(d, (57, 46), 2, (255, 255, 255, 255))
    # legs
    d.rectangle([30, 72, 38, 86], fill=(46, 37, 69, 255))
    d.rectangle([58, 72, 66, 86], fill=(46, 37, 69, 255))
    save(im, "sheep/sheep_gold.png" if golden else "sheep/sheep.png")

def make_farmer(seat: int, fill, outline):
    im, d = new(96)
    soft_ellipse(d, [24, 74, 72, 90], (0, 0, 0, 30))
    # body
    rounded_rect(d, [30, 52, 66, 82], 12, fill + (255,), outline + (255,), 3)
    # head
    soft_ellipse(d, [26, 16, 70, 60], (255, 220, 190, 255), (220, 170, 140, 255), 3)
    # hat
    soft_ellipse(d, [20, 10, 76, 32], fill + (255,), outline + (255,), 2)
    rounded_rect(d, [32, 4, 64, 22], 6, fill + (255,), outline + (255,), 2)
    # eyes
    circle(d, (40, 36), 5, (46, 37, 69, 255))
    circle(d, (56, 36), 5, (46, 37, 69, 255))
    circle(d, (41, 34), 2, (255, 255, 255, 255))
    circle(d, (57, 34), 2, (255, 255, 255, 255))
    # smile
    d.arc([40, 40, 56, 54], 20, 160, fill=(200, 100, 80, 255), width=2)
    # blush
    soft_ellipse(d, [28, 42, 38, 50], (255, 122, 89, 80))
    soft_ellipse(d, [58, 42, 68, 50], (255, 122, 89, 80))
    save(im, f"sheep/farmer_{seat}.png")

def make_pen(seat: int, fill, outline):
    im, d = new(96)
    rounded_rect(d, [12, 36, 84, 84], 10, fill + (80,), outline + (255,), 3)
    # house roof
    d.polygon([(20, 40), (48, 12), (76, 40)], fill=fill + (255,))
    rounded_rect(d, [28, 40, 68, 72], 6, (255, 255, 255, 220), outline + (255,), 2)
    rounded_rect(d, [42, 52, 54, 72], 3, outline + (255,))
    save(im, f"sheep/pen_{seat}.png")

def make_grass_bg():
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rounded_rect(d, [0, 0, 255, 255], 24, (222, 247, 231, 255), (168, 226, 193, 255), 6)
    for x, y in [(40, 50), (120, 80), (200, 40), (60, 160), (180, 180), (140, 140)]:
        d.polygon([(x, y), (x - 4, y + 12), (x + 4, y + 12)], fill=(120, 200, 140, 180))
        d.polygon([(x + 6, y + 2), (x + 2, y + 14), (x + 10, y + 14)], fill=(100, 180, 120, 160))
    save(im, "sheep/arena_bg.png")

# ---------- WEREWOLF ----------
def make_role_werewolf():
    im, d = new(128)
    soft_ellipse(d, [20, 24, 108, 108], (90, 70, 110, 255), (60, 40, 80, 255), 4)
    # ears
    d.polygon([(30, 40), (20, 8), (50, 30)], fill=(90, 70, 110, 255), outline=(60, 40, 80, 255))
    d.polygon([(98, 40), (108, 8), (78, 30)], fill=(90, 70, 110, 255), outline=(60, 40, 80, 255))
    soft_ellipse(d, [34, 28, 48, 42], (255, 180, 200, 255))
    soft_ellipse(d, [80, 28, 94, 42], (255, 180, 200, 255))
    # snout
    soft_ellipse(d, [44, 60, 84, 92], (200, 180, 210, 255))
    circle(d, (56, 78), 4, (46, 37, 69, 255))
    circle(d, (72, 78), 4, (46, 37, 69, 255))
    # eyes glowing
    soft_ellipse(d, [36, 48, 54, 62], (255, 197, 61, 255))
    soft_ellipse(d, [74, 48, 92, 62], (255, 197, 61, 255))
    circle(d, (45, 55), 4, (46, 37, 69, 255))
    circle(d, (83, 55), 4, (46, 37, 69, 255))
    save(im, "werewolf/role_werewolf.png")

def make_role_seer():
    im, d = new(128)
    soft_ellipse(d, [24, 28, 104, 108], (230, 220, 255, 255), (124, 107, 255, 255), 4)
    # crystal ball
    soft_ellipse(d, [40, 48, 88, 96], (180, 160, 255, 255), (124, 107, 255, 255), 3)
    soft_ellipse(d, [50, 56, 72, 78], (255, 255, 255, 180))
    # hat
    d.polygon([(40, 40), (64, 8), (88, 40)], fill=(124, 107, 255, 255))
    circle(d, (64, 16), 6, (255, 197, 61, 255))
    # eyes
    circle(d, (50, 50), 5, (46, 37, 69, 255))
    circle(d, (78, 50), 5, (46, 37, 69, 255))
    save(im, "werewolf/role_seer.png")

def make_role_guard():
    im, d = new(128)
    soft_ellipse(d, [24, 36, 104, 108], (200, 230, 255, 255), (47, 169, 245, 255), 4)
    # shield
    d.polygon([(64, 20), (100, 40), (92, 90), (64, 108), (36, 90), (28, 40)], fill=(47, 169, 245, 255), outline=(30, 120, 190, 255))
    soft_ellipse(d, [48, 44, 80, 84], (255, 255, 255, 255))
    circle(d, (56, 60), 4, (46, 37, 69, 255))
    circle(d, (72, 60), 4, (46, 37, 69, 255))
    d.arc([54, 64, 74, 80], 20, 160, fill=(47, 169, 245, 255), width=2)
    save(im, "werewolf/role_guard.png")

def make_role_witch():
    im, d = new(128)
    soft_ellipse(d, [24, 36, 104, 108], (200, 255, 220, 255), (57, 199, 127, 255), 4)
    # hat
    d.polygon([(34, 48), (64, 4), (94, 48)], fill=(57, 199, 127, 255))
    # potion
    soft_ellipse(d, [48, 56, 80, 96], (180, 255, 200, 255), (36, 155, 96, 255), 3)
    soft_ellipse(d, [54, 62, 74, 82], (120, 255, 180, 200))
    rounded_rect(d, [58, 48, 70, 60], 3, (36, 155, 96, 255))
    # eyes
    circle(d, (50, 52), 4, (46, 37, 69, 255))
    circle(d, (78, 52), 4, (46, 37, 69, 255))
    save(im, "werewolf/role_witch.png")

def make_role_hunter():
    im, d = new(128)
    soft_ellipse(d, [24, 28, 104, 108], (255, 220, 190, 255), (255, 138, 61, 255), 4)
    # hat
    soft_ellipse(d, [28, 16, 100, 44], (255, 138, 61, 255), (200, 100, 40, 255), 3)
    # bow
    d.arc([70, 50, 110, 100], 270, 90, fill=(140, 90, 50, 255), width=5)
    d.line([(90, 52), (90, 98)], fill=(200, 180, 140, 255), width=2)
    # eyes
    circle(d, (48, 58), 6, (46, 37, 69, 255))
    circle(d, (68, 58), 6, (46, 37, 69, 255))
    circle(d, (50, 56), 2, (255, 255, 255, 255))
    circle(d, (70, 56), 2, (255, 255, 255, 255))
    save(im, "werewolf/role_hunter.png")

def make_role_villager():
    im, d = new(128)
    soft_ellipse(d, [24, 40, 104, 108], (220, 230, 240, 255), (142, 150, 168, 255), 4)
    # body overalls
    rounded_rect(d, [40, 78, 88, 110], 8, (100, 160, 220, 255))
    # head
    soft_ellipse(d, [36, 28, 92, 84], (255, 220, 190, 255), (220, 170, 140, 255), 3)
    # straw hat
    soft_ellipse(d, [20, 18, 108, 48], (232, 177, 77, 255), (185, 138, 46, 255), 3)
    rounded_rect(d, [40, 10, 88, 32], 8, (232, 177, 77, 255), (185, 138, 46, 255), 2)
    # eyes
    circle(d, (52, 56), 6, (46, 37, 69, 255))
    circle(d, (76, 56), 6, (46, 37, 69, 255))
    circle(d, (54, 54), 2, (255, 255, 255, 255))
    circle(d, (78, 54), 2, (255, 255, 255, 255))
    d.arc([54, 62, 74, 78], 20, 160, fill=(200, 100, 80, 255), width=2)
    save(im, "werewolf/role_villager.png")

def make_phase_icons():
    # night
    im, d = new(128)
    soft_ellipse(d, [16, 16, 112, 112], (58, 46, 110, 255))
    soft_ellipse(d, [36, 28, 96, 88], (255, 241, 204, 255))
    soft_ellipse(d, [52, 28, 112, 88], (58, 46, 110, 255))
    for x, y in [(30, 30), (90, 40), (40, 90), (85, 85)]:
        circle(d, (x, y), 2, (255, 255, 255, 200))
    save(im, "werewolf/phase_night.png")

    im, d = new(128)
    soft_ellipse(d, [16, 16, 112, 112], (255, 217, 160, 255))
    soft_ellipse(d, [36, 36, 92, 92], (255, 197, 61, 255), (214, 156, 19, 255), 3)
    soft_ellipse(d, [48, 48, 80, 80], (255, 241, 204, 255))
    # rays
    for i in range(8):
        ang = i * math.pi / 4
        x1 = 64 + math.cos(ang) * 48
        y1 = 64 + math.sin(ang) * 48
        x0 = 64 + math.cos(ang) * 38
        y0 = 64 + math.sin(ang) * 38
        d.line([(x0, y0), (x1, y1)], fill=(255, 197, 61, 255), width=4)
    save(im, "werewolf/phase_day.png")

    im, d = new(128)
    rounded_rect(d, [28, 40, 100, 100], 12, (255, 180, 162, 255), (230, 100, 80, 255), 3)
    rounded_rect(d, [40, 28, 88, 52], 6, (255, 255, 255, 255), (230, 100, 80, 255), 2)
    d.polygon([(64, 20), (76, 40), (52, 40)], fill=(230, 100, 80, 255))
    save(im, "werewolf/phase_vote.png")

    im, d = new(128)
    soft_ellipse(d, [16, 16, 112, 112], (200, 182, 255, 255))
    # checkered flag vibe
    for r in range(2):
        for c in range(2):
            if (r + c) % 2 == 0:
                rounded_rect(d, [36 + c * 28, 40 + r * 28, 60 + c * 28, 64 + r * 28], 4, (46, 37, 69, 255))
            else:
                rounded_rect(d, [36 + c * 28, 40 + r * 28, 60 + c * 28, 64 + r * 28], 4, (255, 255, 255, 255))
    save(im, "werewolf/phase_result.png")

def make_face_alive():
    im, d = new(96)
    soft_ellipse(d, [12, 12, 84, 84], (255, 220, 190, 255), (220, 170, 140, 255), 3)
    circle(d, (36, 42), 6, (46, 37, 69, 255))
    circle(d, (60, 42), 6, (46, 37, 69, 255))
    circle(d, (38, 40), 2, (255, 255, 255, 255))
    circle(d, (62, 40), 2, (255, 255, 255, 255))
    soft_ellipse(d, [22, 52, 34, 62], (255, 122, 89, 90))
    soft_ellipse(d, [62, 52, 74, 62], (255, 122, 89, 90))
    d.arc([36, 50, 60, 70], 20, 160, fill=(200, 100, 80, 255), width=3)
    save(im, "werewolf/face_alive.png")

def make_face_dead():
    im, d = new(96)
    soft_ellipse(d, [12, 12, 84, 84], (220, 220, 225, 255), (160, 160, 170, 255), 3)
    # X eyes
    d.line([(28, 34), (42, 48)], fill=(100, 100, 110, 255), width=4)
    d.line([(42, 34), (28, 48)], fill=(100, 100, 110, 255), width=4)
    d.line([(54, 34), (68, 48)], fill=(100, 100, 110, 255), width=4)
    d.line([(68, 34), (54, 48)], fill=(100, 100, 110, 255), width=4)
    soft_ellipse(d, [38, 58, 58, 72], (160, 160, 170, 255))
    save(im, "werewolf/face_dead.png")

def make_village_win():
    im, d = new(128)
    soft_ellipse(d, [16, 40, 112, 108], (222, 247, 231, 255), (57, 199, 127, 255), 4)
    d.polygon([(30, 60), (64, 20), (98, 60)], fill=(255, 122, 89, 255))
    rounded_rect(d, [40, 60, 88, 100], 6, (255, 255, 255, 255), (57, 199, 127, 255), 2)
    save(im, "werewolf/win_village.png")

def make_wolves_win():
    im, d = new(128)
    soft_ellipse(d, [16, 16, 112, 112], (90, 70, 110, 255))
    d.polygon([(30, 40), (20, 10), (50, 32)], fill=(90, 70, 110, 255))
    d.polygon([(98, 40), (108, 10), (78, 32)], fill=(90, 70, 110, 255))
    soft_ellipse(d, [36, 48, 54, 62], (255, 197, 61, 255))
    soft_ellipse(d, [74, 48, 92, 62], (255, 197, 61, 255))
    save(im, "werewolf/win_wolves.png")

def main():
    for i in range(1, 7):
        make_dice(i)
    make_arrow("up", [(48, 24), (68, 52), (28, 52)])
    make_arrow("down", [(28, 44), (68, 44), (48, 72)])
    make_arrow("left", [(24, 48), (52, 28), (52, 68)])
    make_arrow("right", [(44, 28), (72, 48), (44, 68)])
    make_timer()
    make_live()
    make_trophy()
    make_draw_handshake()
    make_loss_cloud()

    make_caro_o()
    make_caro_x()
    make_board_wood()

    for label, length in [("2", 2), ("3", 3), ("4", 4), ("5", 5)]:
        make_ship(label, length)
    make_water_tile()
    make_hit()
    make_miss()
    make_sunk()
    make_anchor()

    make_seed()
    make_quan()
    make_quan_empty()
    make_oanquan_board()

    for name, fill, outline in COLORS:
        make_horse(name, fill, outline)
    make_flag()

    make_tokens()
    make_house()
    make_bank()
    make_mono_icons()

    make_sheep(False)
    make_sheep(True)
    for i, (name, fill, outline) in enumerate(COLORS):
        make_farmer(i, fill, outline)
        make_pen(i, fill, outline)
    make_grass_bg()

    make_role_werewolf()
    make_role_seer()
    make_role_guard()
    make_role_witch()
    make_role_hunter()
    make_role_villager()
    make_phase_icons()
    make_face_alive()
    make_face_dead()
    make_village_win()
    make_wolves_win()

    print("done")

if __name__ == "__main__":
    main()
