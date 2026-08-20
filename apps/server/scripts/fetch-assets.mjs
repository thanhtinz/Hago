#!/usr/bin/env node
/**
 * Tải bộ asset chibi từ googlefonts/noto-emoji (Apache 2.0) về repo.
 * Chạy một lần: node scripts/fetch-assets.mjs
 *
 * Dùng Noto Emoji vì nét tròn, mềm, mặt dễ thương — hợp tông chibi của Hago,
 * và quan trọng là hiển thị GIỐNG NHAU trên mọi thiết bị, khác với emoji hệ thống.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg';
const OUT = path.join(import.meta.dirname, '..', 'assets', 'chibi');

/** name → codepoint(s) của Noto Emoji. */
const ASSETS = {
  // Nhận diện từng game
  'game-caro': '2b55',
  'game-caro-x': '274c',
  'game-battleship': '1f6a2',
  'game-oanquan': '1faa8',
  'game-sheep': '1f411',
  'game-monopoly': '1f3e6',
  'game-ludo': '1f434',
  'game-werewolf': '1f43a',

  // Quân cờ & vật thể trong trận
  sheep: '1f411',
  'sheep-golden': '1f40f',
  horse: '1f434',
  wolf: '1f43a',
  dice: '1f3b2',
  anchor: '2693',
  ship: '1f6a2',
  explosion: '1f4a5',
  fire: '1f525',
  droplet: '1f4a7',
  house: '1f3e0',
  'flag-finish': '1f3c1',
  'flag-red': '1f6a9',
  target: '1f3af',
  police: '1f694',
  parking: '1f17f',
  receipt: '1f9fe',
  question: '2753',
  rock: '1faa8',
  runner: '1f3c3',
  farmer: '1f9d1_200d_1f33e',

  // Ma sói
  moon: '1f319',
  sun: '2600',
  ballot: '1f5f3',
  skull: '1f480',
  shield: '1f6e1',
  crystal: '1f52e',
  potion: '1f9ea',
  bow: '1f3f9',
  smile: '1f642',

  // Kinh tế & tiến trình
  coin: '1fa99',
  gem: '1f48e',
  trophy: '1f3c6',
  'medal-1': '1f947',
  'medal-2': '1f948',
  'medal-3': '1f949',
  crown: '1f451',
  star: '2b50',
  sparkles: '2728',
  party: '1f389',
  gift: '1f381',
  bolt: '26a1',
  clipboard: '1f4cb',
  bell: '1f514',
  shop: '1f6cd',
  chick: '1f425',
  'speech-bubble': '1f4ac',
  joystick: '1f579',
  gamepad: '1f3ae',
  door: '1f6aa',
  key: '1f511',
  lock: '1f512',
  handshake: '1f91d',
  wave: '1f44b',
  chart: '1f4c8',
  circus: '1f3aa',
  backpack: '1f392',
  frame: '1f5bc',
  label: '1f3f7',
  seedling: '1f331',
};

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const manifest = {};
  let ok = 0;
  let failed = 0;

  for (const [name, code] of Object.entries(ASSETS)) {
    const file = path.join(OUT, `${name}.svg`);
    try {
      const res = await fetch(`${BASE}/emoji_u${code}.svg`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = await res.text();
      if (!svg.includes('<svg')) throw new Error('không phải SVG');
      await fs.writeFile(file, svg, 'utf8');
      manifest[name] = { file: `${name}.svg`, codepoint: code };
      ok++;
    } catch (e) {
      console.error(`✗ ${name} (${code}): ${e.message}`);
      failed++;
    }
  }

  await fs.writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(
      {
        source: 'https://github.com/googlefonts/noto-emoji',
        license: 'Apache-2.0',
        note: 'Tải bằng apps/server/scripts/fetch-assets.mjs',
        assets: manifest,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`✅ ${ok} asset chibi đã tải về ${OUT}${failed ? ` (${failed} lỗi)` : ''}`);
}

main();
