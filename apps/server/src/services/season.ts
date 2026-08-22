import { PLACEMENT_MATCHES, softResetRating } from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';

/**
 * Mùa giải.
 *
 * Mùa chỉ còn phục vụ **rank theo mùa**: đánh dấu mốc chốt sổ điểm và mở giai
 * đoạn định hạng mới. Mùa dài 60 ngày và tự gối nhau — hết mùa cũ thì lần gọi
 * `currentSeason()` tiếp theo đóng nó lại và mở mùa mới, không cần cron.
 */

const SEASON_DAYS = 60;

/** Mùa đang chạy; hết hạn thì đóng mùa cũ và mở mùa mới ngay tại đây. */
export function currentSeason(): { id: string; name: string; start_at: number; end_at: number } {
  const now = nowMs();
  const live = db
    .prepare('SELECT * FROM seasons WHERE active = 1 AND start_at <= ? AND end_at > ? ORDER BY start_at DESC LIMIT 1')
    .get(now, now) as any;
  if (live) return live;

  const ending = db.prepare('SELECT id FROM seasons WHERE active = 1 AND end_at <= ?').all(now) as any[];
  db.prepare('UPDATE seasons SET active = 0 WHERE end_at <= ?').run(now);
  ending.forEach((e) => closeSeasonRanks(e.id));

  const n = (db.prepare('SELECT COUNT(*) AS n FROM seasons').get() as any).n + 1;
  const id = nid();
  const end = now + SEASON_DAYS * 86400_000;
  db.prepare('INSERT INTO seasons (id, name, start_at, end_at, active) VALUES (?,?,?,?,1)').run(
    id,
    `Mùa ${n}`,
    now,
    end,
  );
  return { id, name: `Mùa ${n}`, start_at: now, end_at: end };
}

/* ------------------------------ Rank theo mùa ------------------------------ */

/**
 * Chốt sổ rank của mùa vừa hết: lưu điểm cuối rồi kéo mềm điểm của mọi người
 * về mốc 1000 cho mùa sau. Chạy đúng một lần, ngay tại lúc đóng mùa.
 */
function closeSeasonRanks(seasonId: string): void {
  const rows = db.prepare('SELECT id, rating FROM users').all() as any[];
  const tx = db.transaction(() => {
    for (const u of rows) {
      db.prepare(
        `INSERT INTO season_ranks (season_id, user_id, rating_start, rating_end, peak, ranked_played)
         VALUES (?,?,?,?,?,0)
         ON CONFLICT(season_id, user_id) DO UPDATE SET rating_end = excluded.rating_end,
           peak = max(peak, excluded.rating_end)`,
      ).run(seasonId, u.id, u.rating, u.rating, u.rating);
      db.prepare('UPDATE users SET rating = ? WHERE id = ?').run(softResetRating(u.rating), u.id);
    }
  });
  tx();
}

/**
 * Ghi nhận một trận xếp hạng của mùa hiện tại. Trả về số trận đã đá để nơi gọi
 * biết người này còn trong giai đoạn định hạng hay không.
 */
export function recordRankedMatch(userId: string, ratingAfter: number): number {
  const s = currentSeason();
  db.prepare(
    `INSERT INTO season_ranks (season_id, user_id, rating_start, rating_end, peak, ranked_played)
     VALUES (?,?,?,?,?,1)
     ON CONFLICT(season_id, user_id) DO UPDATE SET
       rating_end = excluded.rating_end,
       peak = max(peak, excluded.rating_end),
       ranked_played = ranked_played + 1`,
  ).run(s.id, userId, ratingAfter, ratingAfter, ratingAfter);
  return (
    db.prepare('SELECT ranked_played FROM season_ranks WHERE season_id = ? AND user_id = ?').get(s.id, userId) as any
  ).ranked_played;
}

/** Tình trạng xếp hạng mùa này của một người. */
export function rankStatus(userId: string): {
  seasonId: string;
  played: number;
  placement: number;
  placed: boolean;
  peak: number;
} {
  const s = currentSeason();
  const row = db
    .prepare('SELECT ranked_played, peak FROM season_ranks WHERE season_id = ? AND user_id = ?')
    .get(s.id, userId) as any;
  const played = row?.ranked_played ?? 0;
  return {
    seasonId: s.id,
    played,
    placement: PLACEMENT_MATCHES,
    placed: played >= PLACEMENT_MATCHES,
    peak: row?.peak ?? 0,
  };
}

/** Lịch sử rank các mùa trước, mới nhất trước. */
export function rankHistory(userId: string, limit = 6) {
  return (
    db
      .prepare(
        `SELECT sr.rating_end, sr.peak, sr.ranked_played, s.name, s.end_at
         FROM season_ranks sr JOIN seasons s ON s.id = sr.season_id
         WHERE sr.user_id = ? AND s.active = 0
         ORDER BY s.end_at DESC LIMIT ?`,
      )
      .all(userId, limit) as any[]
  ).map((r) => ({ season: r.name, endedAt: r.end_at, rating: r.rating_end, peak: r.peak, played: r.ranked_played }));
}
