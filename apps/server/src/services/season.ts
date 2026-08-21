import {
  PLACEMENT_MATCHES,
  SEASON_PREMIUM_PRICE,
  SEASON_REWARDS,
  SEASON_TIERS,
  SeasonReward,
  SeasonTrack,
  SeasonView,
  seasonTierFromXp,
  softResetRating,
} from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';
import { mutateCurrency } from './economy';
import { notify } from './notifications';

/**
 * Battle Pass theo mùa.
 *
 * Mùa dài 60 ngày và tự gối nhau: hết mùa cũ thì `currentSeason()` mở mùa mới,
 * không cần cron. Tiến độ không chuyển sang mùa sau — đó là điểm của battle
 * pass — nên phần thưởng chưa nhận sẽ mất, client phải báo trước hạn.
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

function progress(userId: string, seasonId: string): { xp: number; premium: number } {
  const row = db
    .prepare('SELECT xp, premium FROM user_season WHERE user_id = ? AND season_id = ?')
    .get(userId, seasonId) as any;
  return row ?? { xp: 0, premium: 0 };
}

export function seasonView(userId: string): SeasonView {
  const s = currentSeason();
  const p = progress(userId, s.id);
  const { tier, into, need } = seasonTierFromXp(p.xp);
  const claimed = (
    db.prepare('SELECT tier, track FROM season_claims WHERE user_id = ? AND season_id = ?').all(userId, s.id) as any[]
  ).map((r) => `${r.track}:${r.tier}`);
  return {
    id: s.id,
    name: s.name,
    startAt: s.start_at,
    endAt: s.end_at,
    xp: p.xp,
    tier,
    into,
    need,
    premium: !!p.premium,
    premiumPrice: SEASON_PREMIUM_PRICE,
    tiers: SEASON_REWARDS,
    claimed,
  };
}

/** Cộng XP mùa. Gọi sau mỗi trận và mỗi lần nhận nhiệm vụ. */
export function addSeasonXp(userId: string, xp: number): void {
  if (xp <= 0) return;
  const s = currentSeason();
  const before = seasonTierFromXp(progress(userId, s.id).xp).tier;
  db.prepare(
    `INSERT INTO user_season (user_id, season_id, xp, premium) VALUES (?,?,?,0)
     ON CONFLICT(user_id, season_id) DO UPDATE SET xp = xp + ?`,
  ).run(userId, s.id, xp, xp);
  const after = seasonTierFromXp(progress(userId, s.id).xp).tier;
  if (after > before) {
    notify(userId, 'reward', `Lên mốc ${after} Battle Pass`, 'Vào nhận thưởng mùa nhé', { tier: after });
  }
}

export function buyPremium(userId: string): SeasonView {
  const s = currentSeason();
  if (progress(userId, s.id).premium) throw new Error('ALREADY_OWNED');
  mutateCurrency(userId, 'diamond', -SEASON_PREMIUM_PRICE, 'season_premium', s.id);
  db.prepare(
    `INSERT INTO user_season (user_id, season_id, xp, premium) VALUES (?,?,0,1)
     ON CONFLICT(user_id, season_id) DO UPDATE SET premium = 1`,
  ).run(userId, s.id);
  return seasonView(userId);
}

function grant(userId: string, reward: SeasonReward, ref: string): void {
  if (reward.kind === 'item') {
    db.prepare(
      'INSERT OR IGNORE INTO inventory (user_id, item_id, quantity, equipped, acquired_at) VALUES (?,?,1,0,?)',
    ).run(userId, reward.itemId, nowMs());
    return;
  }
  mutateCurrency(userId, reward.kind, reward.amount, 'season_reward', ref);
}

export function claimTier(userId: string, tier: number, track: SeasonTrack): { reward: SeasonReward; view: SeasonView } {
  if (!Number.isInteger(tier) || tier < 1 || tier > SEASON_TIERS) throw new Error('BAD_TIER');
  if (track !== 'free' && track !== 'premium') throw new Error('BAD_TRACK');

  const s = currentSeason();
  const p = progress(userId, s.id);
  const reached = seasonTierFromXp(p.xp).tier;
  if (tier > reached) throw new Error('TIER_LOCKED');
  if (track === 'premium' && !p.premium) throw new Error('PREMIUM_REQUIRED');

  const reward = SEASON_REWARDS.find((t) => t.tier === tier)?.[track];
  if (!reward) throw new Error('NO_REWARD');

  // Chèn trước rồi mới phát: khoá chính chặn nhận trùng kể cả khi bấm hai lần
  // cùng lúc, còn nếu phát thưởng lỗi thì transaction cuốn lại cả dòng claim.
  const tx = db.transaction(() => {
    try {
      db.prepare(
        'INSERT INTO season_claims (user_id, season_id, tier, track, created_at) VALUES (?,?,?,?,?)',
      ).run(userId, s.id, tier, track, nowMs());
    } catch {
      throw new Error('ALREADY_CLAIMED');
    }
    grant(userId, reward, `${s.id}:${track}:${tier}`);
  });
  tx();

  return { reward, view: seasonView(userId) };
}

/** Nhận hết những mốc đã mở mà chưa lấy — nút "nhận tất". */
export function claimAll(userId: string): { rewards: SeasonReward[]; view: SeasonView } {
  const s = currentSeason();
  const p = progress(userId, s.id);
  const reached = seasonTierFromXp(p.xp).tier;
  const done = new Set(
    (db.prepare('SELECT tier, track FROM season_claims WHERE user_id = ? AND season_id = ?').all(userId, s.id) as any[])
      .map((r) => `${r.track}:${r.tier}`),
  );

  const rewards: SeasonReward[] = [];
  for (const row of SEASON_REWARDS) {
    if (row.tier > reached) break;
    for (const track of ['free', 'premium'] as SeasonTrack[]) {
      if (track === 'premium' && !p.premium) continue;
      if (!row[track] || done.has(`${track}:${row.tier}`)) continue;
      rewards.push(claimTier(userId, row.tier, track).reward);
    }
  }
  return { rewards, view: seasonView(userId) };
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
