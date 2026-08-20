# Chibi 2D assets

Sprite PNG dùng trên các màn chơi (`apps/mobile/src/games/*`).

```
chibi/
  shared/     xúc xắc, mũi tên D-pad, timer, trophy…
  caro/       quân O/X + nền bàn
  battleship/ tàu, nước, trúng/trượt, neo
  oanquan/    dân, quan
  ludo/       ngựa 4 màu
  monopoly/   token + icon ô đặc biệt
  sheep/      cừu, nông dân, chuồng
  werewolf/   vai trò + phase
```

Tái tạo (cần Pillow):

```bash
python3 apps/mobile/scripts/gen_chibi_assets.py
```

Trong code, import qua `src/games/chibiAssets.ts` và render bằng `<ChibiImg />` — không vẽ bằng emoji/View shape trên bàn chơi.
