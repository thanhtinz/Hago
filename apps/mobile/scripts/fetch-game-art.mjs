#!/usr/bin/env node
/**
 * Tải bộ art dùng trong trận từ kho game-icons.net (github.com/game-icons/icons).
 *
 * Vì sao chọn nguồn này: 4000+ icon game do hoạ sĩ vẽ, cùng một khung 512×512,
 * cùng ngôn ngữ tạo hình silhouette nên xếp cạnh nhau là ăn khớp — thứ mà tự vẽ
 * từng cái rất khó giữ đồng bộ. Giấy phép CC BY 3.0 (một số CC0), ghi công trong
 * assets/game-icons/CREDITS.md.
 *
 * Chạy:  node apps/mobile/scripts/fetch-game-art.mjs
 *
 * Script làm 2 việc:
 *   1. Tải SVG gốc về apps/mobile/assets/game-icons/<tác giả>/<tên>.svg (giữ
 *      nguyên file gốc để tuân thủ giấy phép và để đổi asset không cần mạng).
 *   2. Sinh apps/mobile/src/art/gameArt.ts — dữ liệu vector đã bỏ nền đen và
 *      đánh dấu chỗ nào ăn màu theo ngữ cảnh, để <Art> vẽ bằng react-native-svg.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const RAW = 'https://raw.githubusercontent.com/game-icons/icons/master';
const OUT_SVG = path.join(ROOT, 'assets/game-icons');
const OUT_TS = path.join(ROOT, 'src/art/gameArt.ts');

/** tên dùng trong app -> đường dẫn icon trong kho game-icons */
export const ART = {
  // mark của 7 game
  'game-caro': 'delapouite/tic-tac-toe',
  'game-battleship': 'delapouite/ship-bow',
  'game-oanquan': 'delapouite/abacus',
  'game-sheep': 'delapouite/sheep',
  'game-monopoly': 'delapouite/house',
  'game-ludo': 'skoll/chess-knight',
  'game-werewolf': 'lorc/wolf-head',

  // quân cờ trong trận
  sheep: 'delapouite/sheep',
  knight: 'skoll/chess-knight',
  meeple: 'delapouite/meeple',
  'mark-o': 'badges/blank',
  'mark-x': 'badges/multiply',
  stone: 'lorc/stone-sphere',
  quan: 'delapouite/stone-stack',
  ship: 'delapouite/cargo-ship',
  hit: 'lorc/spiky-explosion',
  sunk: 'delapouite/sinking-ship',
  miss: 'sbed/water-drop',

  // xúc xắc
  'die-1': 'delapouite/dice-six-faces-one',
  'die-2': 'delapouite/dice-six-faces-two',
  'die-3': 'delapouite/dice-six-faces-three',
  'die-4': 'delapouite/dice-six-faces-four',
  'die-5': 'delapouite/dice-six-faces-five',
  'die-6': 'delapouite/dice-six-faces-six',

  // Ma sói
  'role-werewolf': 'lorc/wolf-head',
  'role-seer': 'lorc/third-eye',
  'role-guard': 'delapouite/templar-shield',
  'role-witch': 'lorc/potion-ball',
  'role-hunter': 'carl-olsen/crossbow',
  'role-villager': 'delapouite/farmer',
  'seat-alive': 'lorc/cowled',
  'seat-dead': 'lorc/tombstone',
  vote: 'delapouite/vote',
  moon: 'lorc/moon',
  sun: 'lorc/sun',

  // ô trên bàn Cờ tỷ phú
  'tile-house': 'delapouite/house',
  'tile-chance': 'badges/question',
  'tile-jail': 'delapouite/prisoner',
  'tile-tax': 'delapouite/bank',
  'tile-start': 'delapouite/star-flag',
  'tile-park': 'delapouite/park-bench',
  'tile-gotojail': 'lorc/handcuffs',

  // icon lớn của vỏ giao diện (ô hành động, banner, tab bar)
  'ui-quick': 'badges/bolt',
  'ui-find': 'lorc/magnifying-glass',
  'ui-create': 'lorc/key',
  'ui-shop': 'delapouite/shopping-bag',
  'ui-gift': 'delapouite/present',
  'ui-coins': 'delapouite/two-coins',
  'ui-gem': 'lorc/emerald',
  'ui-home': 'delapouite/house',
  'ui-games': 'delapouite/gamepad',
  'ui-chat': 'delapouite/chat-bubble',
  'ui-profile': 'delapouite/person',
  'ui-calendar': 'delapouite/calendar',
  'ui-friends': 'delapouite/team-idea',

  // kết quả trận + sticker chat
  win: 'lorc/trophy',
  draw: 'lorc/laurels',
  lose: 'badges/sad',
  sad: 'badges/sad',
  happy: 'badges/happy',
  love: 'badges/heart',
  fire: 'badges/fire',
  skull: 'badges/skull',
  crown: 'badges/crown',
  star: 'badges/star',
  gem: 'badges/diamond',
  paw: 'badges/paw',
};

/** Nền đen full-bleed của game-icons — bỏ đi để icon trong suốt. */
const BG_PATH = /^M0 0h\d+v\d+H0z$/;

/** Đọc thuộc tính của một thẻ SVG thành object. */
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/**
 * Chuyển SVG gốc thành danh sách node với 2 sentinel màu:
 *   '@' — tông chính (prop `color` của <Art>)
 *   '#' — tông nổi (prop `hi`, mặc định trắng)
 *
 * game-icons vẽ hình trắng trên nền đen. Icon thường: bỏ nền, hình trắng thành
 * tông chính. Icon dạng huy hiệu (thư mục badges): giữ đĩa nền làm tông chính,
 * hình trắng bên trong thành tông nổi — đúng như huy hiệu thật.
 */
function parse(svg, name) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 512 512';
  const raw = [];
  for (const m of svg.matchAll(/<(path|circle|ellipse|rect|polygon|polyline)\b([^>]*)\/?>/g)) {
    const a = attrs(m[0]);
    if (m[1] === 'path' && a.d && BG_PATH.test(a.d.trim())) continue; // nền vuông: bỏ hẳn
    if (m[1] === 'path' && (a.d ?? '').trim().length < 4) continue; // path rỗng của badges
    delete a.xmlns;
    raw.push({ tag: m[1], a });
  }
  // Node không khai báo màu nào = đĩa nền của huy hiệu.
  const badge = raw.filter((n) => !n.a.fill && !n.a.stroke);
  const white = badge.length ? '#' : '@';
  const nodes = raw.map((n) => {
    const a = { ...n.a };
    if (!a.fill && !a.stroke) a.fill = '@';
    // Node chỉ có stroke: SVG mặc định tô đen ruột — trong bản gốc nó nằm trên
    // nền đen nên không ai thấy, bỏ nền đi thì phải nói rõ là không tô.
    if (a.stroke && !a.fill) a.fill = 'none';
    for (const k of ['fill', 'stroke']) if (a[k] === '#fff') a[k] = white;
    return { tag: n.tag, a };
  });
  if (!nodes.length) throw new Error(`Không tách được hình cho ${name}`);
  return { viewBox, nodes, badge: badge.length > 0 };
}

const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

async function main() {
  const credits = ['# Nguồn art trong trận', '', 'Toàn bộ icon dưới đây lấy từ [game-icons.net](https://github.com/game-icons/icons),', 'giấy phép **CC BY 3.0** (một số tác giả phát hành CC0). Không chỉnh sửa hình,', 'chỉ bỏ nền đen và tô màu theo ngữ cảnh.', '', '| Tên trong app | Icon | Tác giả |', '|---|---|---|'];
  const out = {};
  let n = 0;
  for (const [name, src] of Object.entries(ART)) {
    const res = await fetch(`${RAW}/${src}.svg`);
    if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
    const svg = await res.text();
    const file = path.join(OUT_SVG, `${src}.svg`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, svg);
    out[name] = parse(svg, name);
    const [author, icon] = src.split('/');
    credits.push(`| \`${name}\` | ${icon} | ${author} |`);
    n++;
  }

  const body = Object.entries(out)
    .map(([name, { viewBox, nodes, badge }]) => {
      const items = nodes
        .map(({ tag, a }) => {
          const props = Object.entries(a)
            .map(([k, v]) => `${JSON.stringify(camel(k))}: ${JSON.stringify(v)}`)
            .join(', ');
          return `{ tag: ${JSON.stringify(tag)}, props: { ${props} } }`;
        })
        .join(',\n      ');
      return `  ${JSON.stringify(name)}: {\n    viewBox: ${JSON.stringify(viewBox)},\n    badge: ${badge},\n    nodes: [\n      ${items},\n    ],\n  }`;
    })
    .join(',\n');

  const ts = `// Tệp sinh tự động bởi scripts/fetch-game-art.mjs — đừng sửa tay.
// Nguồn: game-icons.net (CC BY 3.0), xem assets/game-icons/CREDITS.md.
// '@' = tông chính (<Art color>), '#' = tông nổi (<Art hi>, mặc định trắng).

export interface ArtNode {
  readonly tag: string;
  readonly props: Readonly<Record<string, string>>;
}

export interface ArtShape {
  readonly viewBox: string;
  readonly nodes: readonly ArtNode[];
  /** Hình dạng huy hiệu: có đĩa nền, ruột là ký hiệu. */
  readonly badge: boolean;
}

export const GAME_ART = {
${body},
} as const;

export type ArtName = keyof typeof GAME_ART;
`;

  await fs.mkdir(path.dirname(OUT_TS), { recursive: true });
  await fs.writeFile(OUT_TS, ts);
  await fs.writeFile(path.join(OUT_SVG, 'CREDITS.md'), credits.join('\n') + '\n');
  console.log(`Đã tải ${n} asset -> ${path.relative(ROOT, OUT_SVG)} và sinh ${path.relative(ROOT, OUT_TS)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
