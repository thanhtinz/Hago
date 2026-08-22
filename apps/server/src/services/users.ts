import { GAME_TYPES, GameStat, PublicUser, UserProfile, levelFromXp, rankOf } from '@hago/shared';
import { db, nowMs } from '../db';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  is_admin: number;
  level: number;
  xp: number;
  rating: number;
  coin: number;
  diamond: number;
  season_token: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: number;
  last_seen_at: number;
  avatar_seed?: string;
  avatar_style?: string;
  frame_id?: string | null;
  title_id?: string | null;
  background_id?: string | null;
  bubble_id?: string | null;
  board_id?: string | null;
  victory_id?: string | null;
  entry_id?: string | null;
  emote_id?: string | null;
  bio?: string;
}

const SELECT_USER = `
  SELECT u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id, p.background_id,
         p.bubble_id, p.board_id, p.victory_id, p.entry_id, p.emote_id, p.bio
  FROM users u LEFT JOIN profiles p ON p.user_id = u.id`;

export function findUser(id: string): UserRow | undefined {
  return db.prepare(`${SELECT_USER} WHERE u.id = ?`).get(id) as UserRow | undefined;
}

export function findUserByLogin(login: string): UserRow | undefined {
  return db
    .prepare(`${SELECT_USER} WHERE lower(u.username) = lower(?) OR lower(u.email) = lower(?) OR u.phone = ?`)
    .get(login, login, login) as UserRow | undefined;
}

export function searchUsers(q: string, limit = 20): UserRow[] {
  return db
    .prepare(`${SELECT_USER} WHERE u.username LIKE ? OR u.display_name LIKE ? ORDER BY u.rating DESC LIMIT ?`)
    .all(`%${q}%`, `%${q}%`, limit) as UserRow[];
}

/** Online = có hoạt động trong 90 giây gần nhất (được realtime layer refresh). */
export function isOnline(row: UserRow): boolean {
  return nowMs() - row.last_seen_at < 90_000;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarSeed: row.avatar_seed ?? row.username,
    avatarStyle: row.avatar_style ?? 'adventurer',
    frameId: row.frame_id ?? null,
    titleId: row.title_id ?? null,
    // Nền và bong bóng chat hiện ở chỗ người khác nhìn thấy nên nằm trong hồ sơ
    // công khai; mấy món chỉ ảnh hưởng màn hình của chính chủ thì không.
    backgroundId: row.background_id ?? null,
    bubbleId: row.bubble_id ?? null,
    level: levelFromXp(row.xp).level,
    xp: row.xp,
    rating: row.rating,
    rank: rankOf(row.rating).tier,
    status: row.status as PublicUser['status'],
    online: isOnline(row),
  };
}

export function gameStats(userId: string): Record<string, GameStat> {
  const rows = db.prepare('SELECT * FROM game_stats WHERE user_id = ?').all(userId) as any[];
  const out: Record<string, GameStat> = {};
  for (const t of GAME_TYPES) {
    const r = rows.find((x) => x.game_type === t);
    out[t] = {
      gameType: t,
      matches: r?.matches ?? 0,
      wins: r?.wins ?? 0,
      losses: r?.losses ?? 0,
      rating: r?.rating ?? 1000,
    };
  }
  return out;
}

export function toProfile(row: UserRow): UserProfile {
  return {
    ...toPublicUser(row),
    bio: row.bio ?? '',
    boardId: row.board_id ?? null,
    victoryId: row.victory_id ?? null,
    entryId: row.entry_id ?? null,
    emoteId: row.emote_id ?? null,
    coin: row.coin,
    diamond: row.diamond,
    seasonToken: row.season_token,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    matches: row.wins + row.losses + row.draws,
    createdAt: row.created_at,
    perGame: gameStats(row.id),
    isAdmin: !!row.is_admin,
  };
}

export function publicUserById(id: string): PublicUser | null {
  const row = findUser(id);
  return row ? toPublicUser(row) : null;
}

export function touch(userId: string): void {
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(nowMs(), userId);
}
