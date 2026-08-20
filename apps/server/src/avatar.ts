import { createAvatar } from '@dicebear/core';
import {
  adventurer,
  adventurerNeutral,
  bigSmile,
  funEmoji,
  micah,
  miniavs,
  notionists,
  openPeeps,
  personas,
  thumbs,
} from '@dicebear/collection';

/**
 * Chibi avatar được render server-side từ bộ sưu tập DiceBear (MIT, github.com/dicebear/dicebear).
 * Client chỉ cần <Image source={{uri}} /> nên chạy được cả native lẫn web.
 */
const STYLES: Record<string, any> = {
  adventurer,
  'adventurer-neutral': adventurerNeutral,
  'big-smile': bigSmile,
  'fun-emoji': funEmoji,
  micah,
  miniavs,
  notionists,
  'open-peeps': openPeeps,
  personas,
  thumbs,
};

export const AVATAR_STYLES = Object.keys(STYLES);

const CHIBI_BG = ['ffd5dc', 'd1f4e0', 'd6e4ff', 'ffe9c7', 'ecd9ff', 'cdf5f6'];

const cache = new Map<string, string>();

export function renderAvatar(style: string, seed: string, size = 160): string {
  const key = `${style}:${seed}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const collection = STYLES[style] ?? adventurer;
  const svg = createAvatar(collection, {
    seed,
    size,
    radius: 50,
    backgroundColor: CHIBI_BG,
    backgroundType: ['gradientLinear', 'solid'],
    scale: 105,
  }).toString();
  if (cache.size > 4000) cache.clear();
  cache.set(key, svg);
  return svg;
}
