#!/usr/bin/env node
/**
 * Tải art của Sheep Battle từ kho TomoSheepFight (MIT, © 2019 Do Trung Kien):
 * https://github.com/dotrungkien/TomoSheepFight/tree/master/sheep-fight
 *
 * Bộ này có đúng thứ game cần: 5 giống cừu theo bậc hợp thể (cừu non không sừng
 * → cừu chúa sừng vàng), hai phe trắng/đen, mỗi con có animation đi và animation
 * húc, kèm icon cấp và hiệu ứng.
 *
 * Chạy:  node apps/mobile/scripts/fetch-sheep-fight.mjs
 *
 * Script tải PNG về apps/mobile/assets/sheep-fight/ và sinh
 * src/art/sheepFight.ts. Kích thước từng khung đọc thẳng từ file .meta của
 * Unity đi kèm sprite, không phải đoán bằng cách chia đều chiều ngang — vài
 * strip lẻ 1–2px nên chia đều là lệch khung.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const RAW = 'https://raw.githubusercontent.com/dotrungkien/TomoSheepFight/master/sheep-fight/Assets/Sprites/sheep-fight-sprites';
const OUT_IMG = path.join(ROOT, 'assets/sheep-fight');
const OUT_TS = path.join(ROOT, 'src/art/sheepFight.ts');

const TIERS = [1, 2, 3, 4, 5];
const TEAMS = ['w', 'b'];
const ANIMS = ['walk', 'push'];

/** Ảnh tĩnh: icon cấp trong hàng chờ, cụm cỏ, dấu sẵn sàng. */
const STILLS = [...TIERS.flatMap((t) => [`lvl${t}W`, `lvl${t}B`]), 'sheep-ready', 'grass-effect', 'map', 'map_up', 'map_down'];

/** Hiệu ứng có nhiều khung, cắt theo .meta giống sprite cừu. */
const EFFECTS = ['push-effect', 'lane-effect'];

async function download(rel, dest) {
  const res = await fetch(`${RAW}/${rel}`);
  if (!res.ok) throw new Error(`${rel}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf;
}

/** Đọc rect của các khung trong file .meta Unity. */
async function frames(rel) {
  const res = await fetch(`${RAW}/${rel}.meta`);
  if (!res.ok) throw new Error(`${rel}.meta: HTTP ${res.status}`);
  const meta = await res.text();
  const rects = meta
    .split('rect:')
    .slice(1)
    .map((block) => ({
      w: Number(/width: (\d+)/.exec(block)?.[1]),
      h: Number(/height: (\d+)/.exec(block)?.[1]),
    }))
    .filter((r) => r.w && r.h);
  if (!rects.length) throw new Error(`${rel}: .meta không có khung nào`);
  return { w: rects[0].w, h: rects[0].h, count: rects.length };
}

async function main() {
  await fs.mkdir(OUT_IMG, { recursive: true });
  const strips = {};

  for (const tier of TIERS) {
    for (const team of TEAMS) {
      for (const anim of ANIMS) {
        const name = `sheep-${tier}-${team}-${anim}`;
        await download(`sheep/${name}.png`, path.join(OUT_IMG, `${name}.png`));
        strips[name] = await frames(`sheep/${name}.png`);
        console.log(`${name}.png  ${strips[name].count} khung ${strips[name].w}×${strips[name].h}`);
      }
    }
  }

  for (const name of EFFECTS) {
    await download(`${name}.png`, path.join(OUT_IMG, `${name}.png`));
    strips[name] = await frames(`${name}.png`);
    console.log(`${name}.png  ${strips[name].count} khung ${strips[name].w}×${strips[name].h}`);
  }

  for (const name of STILLS) {
    await download(`${name}.png`, path.join(OUT_IMG, `${name}.png`));
    console.log(`${name}.png`);
  }

  const stripEntries = Object.entries(strips)
    .map(
      ([name, f]) =>
        `  '${name}': { w: ${f.w}, h: ${f.h}, count: ${f.count}, src: require('../../assets/sheep-fight/${name}.png') },`,
    )
    .join('\n');
  const stillEntries = STILLS.map(
    (name) => `  '${name}': require('../../assets/sheep-fight/${name}.png'),`,
  ).join('\n');

  const ts = `// Tệp sinh tự động bởi scripts/fetch-sheep-fight.mjs — đừng sửa tay.
// Art: TomoSheepFight của Do Trung Kien (MIT), xem assets/sheep-fight/CREDITS.md.

export interface SheepStrip {
  /** Bề ngang một khung. */
  readonly w: number;
  /** Chiều cao một khung. */
  readonly h: number;
  /** Số khung trong strip. */
  readonly count: number;
  readonly src: number;
}

export const SHEEP_STRIPS: Record<string, SheepStrip> = {
${stripEntries}
};

export const SHEEP_STILLS: Record<string, number> = {
${stillEntries}
};

export type SheepTier = 1 | 2 | 3 | 4 | 5;
/** 'w' = đàn cừu trắng (nhìn từ sau lưng), 'b' = đàn cừu đen (nhìn chính diện). */
export type SheepTeam = 'w' | 'b';
export type SheepAnim = 'walk' | 'push';

export function sheepStrip(tier: number, team: SheepTeam, anim: SheepAnim): SheepStrip {
  const t = Math.max(1, Math.min(5, Math.round(tier)));
  return SHEEP_STRIPS[\`sheep-\${t}-\${team}-\${anim}\`];
}

/** Icon cấp dùng trong hàng chờ. */
export function sheepBadge(tier: number, team: SheepTeam): number {
  const t = Math.max(1, Math.min(5, Math.round(tier)));
  return SHEEP_STILLS[\`lvl\${t}\${team === 'w' ? 'W' : 'B'}\`];
}
`;

  await fs.mkdir(path.dirname(OUT_TS), { recursive: true });
  await fs.writeFile(OUT_TS, ts);

  const credits = `# Art của Sheep Battle

Nguồn: [TomoSheepFight](https://github.com/dotrungkien/TomoSheepFight) — game
Sheep Fight của **Do Trung Kien**, phát hành theo giấy phép **MIT**
(© 2019 Do Trung Kien). Giữ nguyên thông báo bản quyền trong \`LICENSE-MIT.txt\`.

| Tệp | Nội dung |
|---|---|
| \`sheep-{1..5}-{w,b}-{walk,push}.png\` | 5 giống cừu theo bậc hợp thể × 2 phe × 2 animation, mỗi strip 6 khung |
| \`lvl{1..5}{W,B}.png\` | Icon cấp cừu cho hàng chờ |
| \`sheep-ready.png\` | Dấu cừu sẵn sàng |
| \`push-effect.png\` | Hiệu ứng bụi khi hai con húc nhau, 8 khung |
| \`lane-effect.png\` | Vệt sáng chạy dọc làn khi thả cừu, 4 khung |
| \`grass-effect.png\` | Cụm cỏ trên sân |
| \`map.png\` | Sàn đấu: 5 làn cỏ ngăn bằng hàng rào, nông trại phía xa, đồng hoa dưới chân |
| \`map_up.png\`, \`map_down.png\` | Dải trên và dải dưới của sàn |

Bậc cừu: 1 cừu non chưa có sừng · 2 nhú sừng · 3 sừng xoắn · 4 đeo băng đầu
· 5 cừu chúa sừng vàng, mặt dữ. Phe trắng nhìn từ sau lưng (đi lên), phe đen
nhìn chính diện (đi xuống) — đúng bố cục sân dọc của game.

Tải lại bằng \`node apps/mobile/scripts/fetch-sheep-fight.mjs\`.
`;
  await fs.writeFile(path.join(OUT_IMG, 'CREDITS.md'), credits);

  const lic = await fetch('https://raw.githubusercontent.com/dotrungkien/TomoSheepFight/master/LICENSE');
  if (lic.ok) await fs.writeFile(path.join(OUT_IMG, 'LICENSE-MIT.txt'), await lic.text());

  console.log(`\nXong: ${Object.keys(strips).length} strip + ${STILLS.length} ảnh tĩnh -> ${path.relative(ROOT, OUT_IMG)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
