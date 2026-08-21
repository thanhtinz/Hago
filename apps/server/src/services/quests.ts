import { AchievementDef, QuestDef, UserAchievement, UserQuest } from '@hago/shared';
import { db, isoWeek, nowMs, today } from '../db';
import { mutateCurrency } from './economy';
import { addSeasonXp } from './season';
import { notify } from './notifications';

function periodFor(type: string): string {
  return type === 'weekly' ? isoWeek() : type === 'daily' ? today() : 'global';
}

function mapQuest(r: any): QuestDef {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    metric: r.metric,
    target: r.target,
    rewardCoin: r.reward_coin,
    rewardXp: r.reward_xp,
    rewardDiamond: r.reward_diamond,
    gameType: r.game_type,
    startAt: r.start_at,
    endAt: r.end_at,
    active: !!r.active,
  };
}

export function activeQuests(): QuestDef[] {
  const now = nowMs();
  return (
    db
      .prepare(
        `SELECT * FROM quests WHERE active = 1
         AND (start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?)
         ORDER BY type, id`,
      )
      .all(now, now) as any[]
  ).map(mapQuest);
}

export function userQuests(userId: string): UserQuest[] {
  return activeQuests().map((quest) => {
    const period = periodFor(quest.type);
    const row = db
      .prepare('SELECT progress, claimed FROM user_quests WHERE user_id = ? AND quest_id = ? AND period = ?')
      .get(userId, quest.id, period) as { progress: number; claimed: number } | undefined;
    const progress = row?.progress ?? 0;
    return {
      quest,
      progress: Math.min(progress, quest.target),
      claimed: !!row?.claimed,
      completed: progress >= quest.target,
    };
  });
}

/** Cộng tiến độ cho mọi quest đang chạy khớp metric (và game type nếu có). */
export function progressQuests(
  userId: string,
  metric: string,
  delta = 1,
  gameType: string | null = null,
): QuestDef[] {
  const completed: QuestDef[] = [];
  for (const quest of activeQuests()) {
    if (quest.metric !== metric) continue;
    if (quest.gameType && quest.gameType !== gameType) continue;
    const period = periodFor(quest.type);
    db.prepare(
      `INSERT INTO user_quests (user_id, quest_id, period, progress, claimed) VALUES (?,?,?,?,0)
       ON CONFLICT(user_id, quest_id, period) DO UPDATE SET progress = progress + excluded.progress`,
    ).run(userId, quest.id, period, delta);
    const row = db
      .prepare('SELECT progress, claimed FROM user_quests WHERE user_id = ? AND quest_id = ? AND period = ?')
      .get(userId, quest.id, period) as { progress: number; claimed: number };
    if (row.progress >= quest.target && row.progress - delta < quest.target && !row.claimed) {
      completed.push(quest);
      notify(userId, 'quest_complete', 'Nhiệm vụ hoàn thành', quest.title, { questId: quest.id });
    }
  }
  return completed;
}

export function claimQuest(userId: string, questId: string): { coin: number; xp: number; diamond: number } {
  const quest = activeQuests().find((q) => q.id === questId);
  if (!quest) throw new Error('QUEST_NOT_FOUND');
  const period = periodFor(quest.type);
  const row = db
    .prepare('SELECT progress, claimed FROM user_quests WHERE user_id = ? AND quest_id = ? AND period = ?')
    .get(userId, questId, period) as { progress: number; claimed: number } | undefined;
  if (!row || row.progress < quest.target) throw new Error('QUEST_INCOMPLETE');
  if (row.claimed) throw new Error('ALREADY_CLAIMED');
  db.prepare('UPDATE user_quests SET claimed = 1 WHERE user_id = ? AND quest_id = ? AND period = ?').run(
    userId,
    questId,
    period,
  );
  if (quest.rewardCoin) mutateCurrency(userId, 'coin', quest.rewardCoin, 'quest_reward', questId);
  if (quest.rewardDiamond) mutateCurrency(userId, 'diamond', quest.rewardDiamond, 'quest_reward', questId);
  if (quest.rewardXp) db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(quest.rewardXp, userId);
  // Nhiệm vụ cũng đẩy Battle Pass, nếu không thì mùa chỉ lên được bằng cày trận.
  addSeasonXp(userId, quest.rewardXp);
  return { coin: quest.rewardCoin, xp: quest.rewardXp, diamond: quest.rewardDiamond };
}

function mapAchievement(r: any): AchievementDef {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    metric: r.metric,
    target: r.target,
    rewardCoin: r.reward_coin,
    rewardXp: r.reward_xp,
    art: r.art,
  };
}

export function userAchievements(userId: string): UserAchievement[] {
  const defs = (db.prepare('SELECT * FROM achievements ORDER BY target').all() as any[]).map(mapAchievement);
  return defs.map((achievement) => {
    const row = db
      .prepare('SELECT progress, unlocked_at FROM user_achievements WHERE user_id = ? AND achievement_id = ?')
      .get(userId, achievement.id) as { progress: number; unlocked_at: number | null } | undefined;
    return {
      achievement,
      progress: Math.min(row?.progress ?? 0, achievement.target),
      unlockedAt: row?.unlocked_at ?? null,
    };
  });
}

export function progressAchievements(userId: string, metric: string, delta = 1): AchievementDef[] {
  const defs = (db.prepare('SELECT * FROM achievements WHERE metric = ?').all(metric) as any[]).map(
    mapAchievement,
  );
  const unlocked: AchievementDef[] = [];
  for (const a of defs) {
    db.prepare(
      `INSERT INTO user_achievements (user_id, achievement_id, progress) VALUES (?,?,?)
       ON CONFLICT(user_id, achievement_id) DO UPDATE SET progress = progress + excluded.progress`,
    ).run(userId, a.id, delta);
    const row = db
      .prepare('SELECT progress, unlocked_at FROM user_achievements WHERE user_id = ? AND achievement_id = ?')
      .get(userId, a.id) as { progress: number; unlocked_at: number | null };
    if (row.progress >= a.target && !row.unlocked_at) {
      db.prepare('UPDATE user_achievements SET unlocked_at = ? WHERE user_id = ? AND achievement_id = ?').run(
        nowMs(),
        userId,
        a.id,
      );
      if (a.rewardCoin) mutateCurrency(userId, 'coin', a.rewardCoin, 'achievement', a.id);
      if (a.rewardXp) db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(a.rewardXp, userId);
      notify(userId, 'reward', 'Thành tựu mới', a.title, { achievementId: a.id });
      unlocked.push(a);
    }
  }
  return unlocked;
}
