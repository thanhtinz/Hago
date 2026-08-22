import { GuildQuestDef, GuildQuestState } from '@hago/shared';
import { db, isoWeek } from '../db';
import { mutateCurrency } from './economy';
import { notify } from './notifications';
import { logGuild } from './guildLog';

/**
 * Nhiệm vụ bang: mục tiêu **chung**, mọi thành viên cùng góp vào một thanh tiến
 * độ, xong thì ai cũng vào nhận phần của mình.
 *
 * Không dùng lại bảng `quests` như nhiệm vụ sự kiện, vì ở đây tiến độ thuộc về
 * bang chứ không thuộc về một người — khoá, cách cộng và cách nhận đều khác.
 * Chu kỳ là tuần ISO, sang tuần là làm lại từ đầu.
 *
 * File này cố ý **không** nhập `guilds.ts`: `guilds.ts` đã nhập file này (để
 * điểm danh bang cộng tiến độ), nhập ngược lại là thành vòng.
 */

function mapQuest(r: any): GuildQuestDef {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    metric: r.metric,
    target: r.target,
    rewardCoin: r.reward_coin,
    rewardXp: r.reward_xp,
    rewardGuildPoints: r.reward_guild_points,
    active: !!r.active,
  };
}

export function activeGuildQuests(): GuildQuestDef[] {
  return (db.prepare('SELECT * FROM guild_quests WHERE active = 1 ORDER BY target').all() as any[]).map(mapQuest);
}

function guildIdOf(userId: string): string | null {
  const m = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(userId) as any;
  return m?.guild_id ?? null;
}

/** Tiến độ tuần này của một bang, kèm trạng thái nhận thưởng của người đang xem. */
export function guildQuestStates(guildId: string, viewerId: string | null): GuildQuestState[] {
  const period = isoWeek();
  return activeGuildQuests().map((quest) => {
    const row = db
      .prepare('SELECT progress FROM guild_quest_progress WHERE guild_id = ? AND quest_id = ? AND period = ?')
      .get(guildId, quest.id, period) as { progress: number } | undefined;
    const progress = row?.progress ?? 0;
    const claimedBy = (
      db
        .prepare('SELECT COUNT(*) AS n FROM guild_quest_claims WHERE guild_id = ? AND quest_id = ? AND period = ?')
        .get(guildId, quest.id, period) as any
    ).n;
    const claimed = viewerId
      ? !!db
          .prepare(
            'SELECT 1 AS x FROM guild_quest_claims WHERE guild_id = ? AND quest_id = ? AND period = ? AND user_id = ?',
          )
          .get(guildId, quest.id, period, viewerId)
      : false;
    return {
      quest,
      progress: Math.min(progress, quest.target),
      completed: progress >= quest.target,
      claimed,
      claimedBy,
    };
  });
}

/**
 * Cộng tiến độ cho bang của người này. Gọi từ chỗ kết toán trận và từ điểm danh
 * bang — cùng một đường với nhiệm vụ cá nhân, chỉ khác đích đến.
 */
export function progressGuildQuests(userId: string, metric: string, delta = 1): void {
  const guildId = guildIdOf(userId);
  if (!guildId) return;
  const period = isoWeek();
  for (const quest of activeGuildQuests()) {
    if (quest.metric !== metric) continue;
    db.prepare(
      `INSERT INTO guild_quest_progress (guild_id, quest_id, period, progress) VALUES (?,?,?,?)
       ON CONFLICT(guild_id, quest_id, period) DO UPDATE SET progress = progress + excluded.progress`,
    ).run(guildId, quest.id, period, delta);

    const row = db
      .prepare('SELECT progress, paid FROM guild_quest_progress WHERE guild_id = ? AND quest_id = ? AND period = ?')
      .get(guildId, quest.id, period) as { progress: number; paid: number };
    // Vừa cán đích trong lần cộng này: thưởng kho bang một lần, rồi gọi cả bang
    // vào nhận phần riêng.
    if (row.progress >= quest.target && !row.paid) {
      db.prepare(
        'UPDATE guild_quest_progress SET paid = 1 WHERE guild_id = ? AND quest_id = ? AND period = ?',
      ).run(guildId, quest.id, period);
      if (quest.rewardGuildPoints) {
        db.prepare('UPDATE guilds SET xp = xp + ? WHERE id = ?').run(quest.rewardGuildPoints, guildId);
      }
      logGuild(guildId, 'quest', { detail: quest.title });
      for (const m of db.prepare('SELECT user_id FROM guild_members WHERE guild_id = ?').all(guildId) as any[]) {
        notify(m.user_id, 'guild', 'Bang hoàn thành nhiệm vụ', `${quest.title} — vào nhận thưởng nhé`, {
          guildId,
          questId: quest.id,
        });
      }
    }
  }
}

export function claimGuildQuest(userId: string, questId: string): { coin: number; xp: number } {
  const guildId = guildIdOf(userId);
  if (!guildId) throw new Error('NOT_IN_GUILD');
  const quest = activeGuildQuests().find((q) => q.id === questId);
  if (!quest) throw new Error('QUEST_NOT_FOUND');
  const period = isoWeek();

  const row = db
    .prepare('SELECT progress FROM guild_quest_progress WHERE guild_id = ? AND quest_id = ? AND period = ?')
    .get(guildId, questId, period) as { progress: number } | undefined;
  if (!row || row.progress < quest.target) throw new Error('QUEST_INCOMPLETE');

  // Khoá chính của bảng claim chặn nhận hai lần, kể cả khi hai request cùng lúc.
  const res = db
    .prepare(
      'INSERT OR IGNORE INTO guild_quest_claims (guild_id, quest_id, period, user_id) VALUES (?,?,?,?)',
    )
    .run(guildId, questId, period, userId);
  if (res.changes === 0) throw new Error('ALREADY_CLAIMED');

  if (quest.rewardCoin) mutateCurrency(userId, 'coin', quest.rewardCoin, 'guild_quest', `${questId}#${period}`);
  if (quest.rewardXp) db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(quest.rewardXp, userId);
  return { coin: quest.rewardCoin, xp: quest.rewardXp };
}

/** Dùng cho seed và admin. */
export function upsertGuildQuest(q: {
  id: string;
  title: string;
  description?: string;
  metric: string;
  target: number;
  rewardCoin?: number;
  rewardXp?: number;
  rewardGuildPoints?: number;
  active?: boolean;
}): void {
  db.prepare(
    `INSERT INTO guild_quests (id, title, description, metric, target, reward_coin, reward_xp, reward_guild_points, active)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, metric=excluded.metric,
       target=excluded.target, reward_coin=excluded.reward_coin, reward_xp=excluded.reward_xp,
       reward_guild_points=excluded.reward_guild_points, active=excluded.active`,
  ).run(
    q.id,
    q.title,
    q.description ?? '',
    q.metric,
    Math.max(1, Number(q.target)),
    Number(q.rewardCoin ?? 0),
    Number(q.rewardXp ?? 0),
    Number(q.rewardGuildPoints ?? 0),
    q.active === false ? 0 : 1,
  );
}
