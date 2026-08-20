import { customAlphabet } from 'nanoid';

export const nid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);
export const roomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Dictionary-based profanity filter, cấu hình được từ Admin ở phase sau. */
const BAD_WORDS = [
  'dm', 'dmm', 'vcl', 'vl', 'cc', 'clm', 'dcm', 'ngu', 'óc chó', 'oc cho',
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt',
];

export function filterProfanity(text: string): { body: string; filtered: boolean } {
  let filtered = false;
  const body = text
    .split(/(\s+)/)
    .map((token) => {
      const bare = token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      if (bare && BAD_WORDS.includes(bare)) {
        filtered = true;
        return '*'.repeat(Math.max(2, token.length));
      }
      return token;
    })
    .join('');
  return { body, filtered };
}

/** Sliding-window rate limiter dùng chung cho REST và WebSocket. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private windowMs: number, private max: number) {}

  take(key: string): boolean {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }

  sweep(): void {
    const now = Date.now();
    for (const [k, arr] of this.hits) {
      const keep = arr.filter((t) => now - t < this.windowMs);
      if (keep.length) this.hits.set(k, keep);
      else this.hits.delete(k);
    }
  }
}
