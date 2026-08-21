#!/usr/bin/env node
/**
 * Tải bộ quân cờ vua **rhosgfx** từ kho lichess (github.com/lichess-org/lila).
 *
 * Vì sao bộ này: bàn cờ vẽ 2.5D nên quân phải là hình nhìn nghiêng, khối mập,
 * viền dày mới nổi trên cả ô sáng lẫn ô tối và hợp tông chibi của app. Bộ
 * silhouette một màu của game-icons dùng tạm trước đó nhìn bẹt và thô.
 *
 * Giấy phép: **CC0 1.0** (RhosGFX) — thoáng nhất trong các bộ lichess có, quan
 * trọng vì app có shop nên các bộ CC BY-NC-SA dùng không được, còn cburnett và
 * merida là GPL nên sẽ kéo theo cả repo.
 *
 * Chạy:  node apps/mobile/scripts/fetch-chess-pieces.mjs
 *
 * Script tải 12 file SVG gốc về apps/mobile/assets/chess/ (giữ nguyên để tuân
 * thủ giấy phép và đổi bộ không cần mạng) rồi sinh src/art/chessPieces.ts —
 * danh sách path kèm màu gốc, để <ChessBoard> vẽ thẳng vào cảnh 2.5D.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SET = 'rhosgfx';
const RAW = `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${SET}`;
const OUT_SVG = path.join(ROOT, 'assets/chess');
const OUT_TS = path.join(ROOT, 'src/art/chessPieces.ts');

/** wK = vua trắng, bP = tốt đen... Chữ hoa/thường khớp cách engine ghi bàn cờ. */
const PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

/**
 * Đáy hình của mọi quân trong bộ này đều nằm ở 0,938 chiều cao khung — đo bằng
 * cách dựng ảnh rồi lấy hộp bao của phần có mực. Nhờ chung một đường chân,
 * chỉ cần một hằng số là đặt được quân đứng đúng trên mặt bàn, mà chiều cao
 * tương đối giữa tốt và vua vẫn giữ nguyên như bản gốc.
 */
const BASE = 0.938;

/** Tách "fill:#abc;opacity:.5" thành từng cặp thuộc tính. */
function declarations(css, into) {
  for (const rule of css.split(';')) {
    const [k, v] = rule.split(':').map((s) => s?.trim());
    if (k && v) into[k] = v;
  }
  return into;
}

/**
 * Đọc bảng class trong <defs><style>. Một số file của bộ này để màu ở CSS
 * (`.cls-1{fill:#9c3d29}`) chứ không ghi thẳng vào thẻ path — bỏ qua chỗ này
 * thì path mất fill, SVG mặc định tô đen, quân hoá ra loang lổ đen kịt.
 */
function styleSheet(svg) {
  const table = {};
  for (const block of svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const rule of block[1].matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
      table[rule[1]] = declarations(rule[2], {});
    }
  }
  return table;
}

/** Đọc thuộc tính của một thẻ SVG, gộp cả class và style="fill:..." vào. */
function attrs(tag, sheet) {
  const out = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  // Thứ tự đè: class trước, style trong thẻ sau — đúng như CSS.
  if (out.class) {
    for (const name of out.class.split(/\s+/)) Object.assign(out, sheet[name] ?? {});
    delete out.class;
  }
  if (out.style) {
    declarations(out.style, out);
    delete out.style;
  }
  delete out['data-name'];
  delete out.id;
  return out;
}

const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

async function main() {
  const shapes = {};
  for (const name of PIECES) {
    const res = await fetch(`${RAW}/${name}.svg`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const svg = await res.text();
    await fs.mkdir(OUT_SVG, { recursive: true });
    await fs.writeFile(path.join(OUT_SVG, `${name}.svg`), svg);

    const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 72 72';
    const sheet = styleSheet(svg);
    const nodes = [];
    // Không chỉ <path>: đầu quân tốt là <circle>, đế vua là <rect>. Đọc thiếu
    // thì phần đó rơi mất và mảng silhouette đen bên dưới lộ ra.
    for (const m of svg.matchAll(/<(path|circle|ellipse|rect|polygon|polyline)\b([^>]*?)\/?>/g)) {
      const a = attrs(m[0], sheet);
      delete a.xmlns;
      nodes.push({ tag: m[1], ...a });
    }
    if (!nodes.length) throw new Error(`Không tách được hình cho ${name}`);
    shapes[name] = { viewBox, nodes };
  }

  const body = Object.entries(shapes)
    .map(([name, { viewBox, nodes }]) => {
      const items = nodes
        .map(({ tag, ...a }) => {
          const props = Object.entries(a)
            .map(([k, v]) => `${JSON.stringify(camel(k))}: ${JSON.stringify(v)}`)
            .join(', ');
          return `{ tag: ${JSON.stringify(tag)}, props: { ${props} } }`;
        })
        .join(',\n      ');
      return `  ${JSON.stringify(name)}: {\n    viewBox: ${JSON.stringify(viewBox)},\n    nodes: [\n      ${items},\n    ],\n  }`;
    })
    .join(',\n');

  const ts = `// Tệp sinh tự động bởi scripts/fetch-chess-pieces.mjs — đừng sửa tay.
// Bộ quân ${SET} của RhosGFX, lấy từ kho lichess, giấy phép CC0 1.0.
// Xem assets/chess/CREDITS.md.

export interface ChessPieceNode {
  /** path | circle | ellipse | rect | polygon | polyline */
  readonly tag: string;
  readonly props: Readonly<Record<string, string>>;
}

export interface ChessPieceShape {
  readonly viewBox: string;
  readonly nodes: readonly ChessPieceNode[];
}

/**
 * Đáy hình của mọi quân nằm ở tỉ lệ này của chiều cao khung — đặt quân đứng
 * trên mặt bàn thì lấy mốc đó làm chân.
 */
export const CHESS_PIECE_BASE = ${BASE};

export const CHESS_PIECES = {
${body},
} as const;

export type ChessPieceKey = keyof typeof CHESS_PIECES;
`;

  await fs.mkdir(path.dirname(OUT_TS), { recursive: true });
  await fs.writeFile(OUT_TS, ts);
  await fs.writeFile(
    path.join(OUT_SVG, 'CREDITS.md'),
    [
      '# Bộ quân cờ vua',
      '',
      `Bộ **${SET}** của [RhosGFX](https://rhosgfx.itch.io/), lấy từ kho`,
      '[lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece),',
      'giấy phép **CC0 1.0** (hiến tặng công cộng, không ràng buộc gì).',
      '',
      'File SVG gốc giữ nguyên trong thư mục này; `src/art/chessPieces.ts` chỉ là',
      'bản chuyển sang dữ liệu path để vẽ bằng react-native-svg.',
      '',
      `Tải lại: \`node apps/mobile/scripts/fetch-chess-pieces.mjs\``,
      '',
    ].join('\n'),
  );
  console.log(`Đã tải ${PIECES.length} quân -> ${path.relative(ROOT, OUT_SVG)} và sinh ${path.relative(ROOT, OUT_TS)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
