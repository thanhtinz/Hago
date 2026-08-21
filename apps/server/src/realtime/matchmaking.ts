import { GAME_CATALOG, GameMode, GameType } from '@hago/shared';
import { db } from '../db';
import { track } from '../services/analytics';

export interface QueueEntry {
  userId: string;
  gameType: GameType;
  mode: GameMode;
  rating: number;
  region: string;
  joinedAt: number;
}

const queues = new Map<string, QueueEntry[]>();

const key = (g: GameType, m: GameMode, region: string) => `${g}:${m}:${region}`;

export function enqueue(entry: Omit<QueueEntry, 'joinedAt' | 'rating'>): QueueEntry {
  const row = db.prepare('SELECT rating FROM users WHERE id = ?').get(entry.userId) as
    | { rating: number }
    | undefined;
  const full: QueueEntry = { ...entry, rating: row?.rating ?? 1000, joinedAt: Date.now() };
  dequeue(entry.userId);
  const k = key(entry.gameType, entry.mode, entry.region);
  const list = queues.get(k) ?? [];
  list.push(full);
  queues.set(k, list);
  track(entry.userId, 'match_queue', { game_type: entry.gameType, mode: entry.mode });
  return full;
}

export function dequeue(userId: string): void {
  for (const [k, list] of queues) {
    const next = list.filter((e) => e.userId !== userId);
    if (next.length) queues.set(k, next);
    else queues.delete(k);
  }
}

export function queuePosition(userId: string): { position: number; size: number; waitMs: number } | null {
  for (const list of queues.values()) {
    const i = list.findIndex((e) => e.userId === userId);
    if (i >= 0) return { position: i + 1, size: list.length, waitMs: Date.now() - list[i].joinedAt };
  }
  return null;
}

export function queueSizes(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, list] of queues) out[k] = list.length;
  return out;
}

/**
 * Ghép trận theo game + mode + region. Ranked dùng cửa sổ rating nới dần theo
 * thời gian chờ (skill-based matchmaking cơ bản); Normal ghép theo thứ tự vào hàng.
 */
/** Chờ tối đa ngần này để gom đủ bàn cho game nhiều người rồi mới mở trận. */
const FILL_WAIT_MS = 15_000;

export function findMatches(): { gameType: GameType; mode: GameMode; entries: QueueEntry[] }[] {
  const results: { gameType: GameType; mode: GameMode; entries: QueueEntry[] }[] = [];
  const now = Date.now();

  for (const [k, list] of queues) {
    const [gameType, mode] = k.split(':') as [GameType, GameMode];
    const meta = GAME_CATALOG[gameType];
    if (!meta) continue;
    const need = meta.minPlayers;
    let pool = [...list].sort((a, b) => a.joinedAt - b.joinedAt);

    while (pool.length >= need) {
      const anchor = pool[0];
      const waited = now - anchor.joinedAt;
      // Cửa sổ rating: ±150 ban đầu, mỗi 5 giây nới thêm 100, tối đa ±1500.
      const window = mode === 'ranked' ? Math.min(1500, 150 + Math.floor(waited / 5000) * 100) : Infinity;
      const candidates = pool.filter(
        (e) => e.userId === anchor.userId || Math.abs(e.rating - anchor.rating) <= window,
      );
      if (candidates.length < need) break;
      const chosen = candidates.slice(0, Math.min(meta.maxPlayers, candidates.length));
      /**
       * Game nhiều người (Cá Ngựa, Cờ Tỷ Phú, Ma Sói) chơi hay nhất khi đủ bàn,
       * nên chờ thêm một lúc để gom cho đủ `maxPlayers`. Quá thời gian chờ mà
       * vẫn chưa đủ thì mở trận với số người đang có, miễn không dưới mức tối
       * thiểu — thà bàn thiếu người còn hơn bắt chờ mãi.
       */
      const wantFull = meta.maxPlayers > need && waited < FILL_WAIT_MS;
      const want = wantFull ? meta.maxPlayers : need;
      if (chosen.length < want) break;
      const take = chosen.slice(0, Math.min(meta.maxPlayers, chosen.length));
      if (take.length < need) break;
      results.push({ gameType, mode, entries: take });
      const takenIds = new Set(take.map((e) => e.userId));
      pool = pool.filter((e) => !takenIds.has(e.userId));
    }
    if (pool.length) queues.set(k, pool);
    else queues.delete(k);
  }
  return results;
}
