import { LiveMatchInfo } from '@hago/shared';
import { db } from '../db';
import { activeMatches, getMatch, type MatchRuntime } from '../realtime/match';
import { areFriends, isBlocked } from './social';

/**
 * Xem trận trực tiếp. Người xem không ngồi ghế nào: họ chỉ nhận `view(state,
 * null)` — đúng cái state đã lọc sạch thông tin ẩn — nên vào xem không thể
 * thành đường rò bài cho người trong trận.
 *
 * Không mở cho cả thiên hạ: chỉ bạn bè, người cùng bang và admin xem được, và
 * ai đã chặn nhau thì không. Trận công khai vô điều kiện là mời người ta lập
 * nick phụ ngồi xem bài của đối thủ rồi mách nước qua chat ngoài.
 */

export type SpectateReason = 'friend' | 'guild' | 'admin';

function guildIdOf(userId: string): string | null {
  const row = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(userId) as
    | { guild_id: string }
    | undefined;
  return row?.guild_id ?? null;
}

function isAdmin(userId: string): boolean {
  const row = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId) as { is_admin: number } | undefined;
  return !!row?.is_admin;
}

/** Vì sao được xem trận này, hoặc null nếu không được. */
export function spectateReason(userId: string, match: MatchRuntime): SpectateReason | null {
  if (match.players.some((p) => p.id === userId)) return null;
  // Bị một người trong trận chặn thì không vào xem được, kể cả là bạn của người kia.
  if (match.players.some((p) => isBlocked(p.id, userId) || isBlocked(userId, p.id))) return null;
  if (match.players.some((p) => areFriends(userId, p.id))) return 'friend';
  const guild = guildIdOf(userId);
  if (guild && match.players.some((p) => guildIdOf(p.id) === guild)) return 'guild';
  if (isAdmin(userId)) return 'admin';
  return null;
}

export class SpectateError extends Error {}

export function joinSpectate(userId: string, matchId: string): MatchRuntime {
  const match = getMatch(matchId);
  if (!match) throw new SpectateError('MATCH_NOT_FOUND');
  if (match.finished) throw new SpectateError('MATCH_OVER');
  if (match.players.some((p) => p.id === userId)) throw new SpectateError('ALREADY_PLAYING');
  if (!spectateReason(userId, match)) throw new SpectateError('SPECTATE_NOT_ALLOWED');
  match.spectators.add(userId);
  return match;
}

export function leaveSpectate(userId: string, matchId?: string): void {
  for (const m of activeMatches()) {
    if (matchId && m.id !== matchId) continue;
    m.spectators.delete(userId);
  }
}

export function spectatingMatch(userId: string): MatchRuntime | undefined {
  return activeMatches().find((m) => !m.finished && m.spectators.has(userId));
}

/** Danh sách trận đang chạy mà người này xem được, mới nhất trước. */
export function liveMatchesFor(userId: string, limit = 20): LiveMatchInfo[] {
  const out: LiveMatchInfo[] = [];
  for (const match of activeMatches()) {
    if (match.finished) continue;
    const reason = spectateReason(userId, match);
    if (!reason) continue;
    out.push({
      matchId: match.id,
      gameType: match.gameType,
      mode: match.mode,
      startedAt: match.startedAt,
      spectators: match.spectators.size,
      reason,
      players: match.players.map((p) => {
        const row = db
          .prepare(
            `SELECT u.display_name, u.level, p.avatar_seed, p.avatar_style
             FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
          )
          .get(p.id) as any;
        return {
          id: p.id,
          name: row?.display_name ?? p.name,
          avatarSeed: row?.avatar_seed ?? p.id,
          avatarStyle: row?.avatar_style ?? 'adventurer',
          level: row?.level ?? 1,
        };
      }),
    });
  }
  return out.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
}
