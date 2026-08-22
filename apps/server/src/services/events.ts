import { CheckinReward, CheckinState, EventWithQuests, UserQuest } from '@hago/shared';
import { db, nowMs, today } from '../db';
import { mutateCurrency } from './economy';
import { notify } from './notifications';
import { progressAchievements, progressQuests, userQuests } from './quests';
import { track } from './analytics';

/**
 * Điểm danh hằng ngày và sự kiện giới hạn thời gian.
 *
 * Điểm danh chạy theo vòng 7 mốc: mốc càng cuối thưởng càng đậm, đứt một ngày
 * là quay lại mốc 1. Chuỗi ngày được ghi thẳng vào dòng của ngày đó chứ không
 * suy lại từ toàn bộ lịch sử mỗi lần đọc — đọc nhanh, và về sau đổi luật cũng
 * không làm sai lệch chuỗi mà người chơi đã tích được.
 *
 * Sự kiện thì tái dùng nguyên bảng `quests`: nhiệm vụ nào có `event_id` thì
 * thuộc sự kiện đó, không hiện ở màn Nhiệm vụ mà hiện trong thẻ sự kiện. Nhờ
 * vậy tiến độ, chống nhận trùng và phần thưởng đi chung một đường với nhiệm vụ
 * thường, không phải viết lại lần nữa.
 */

/** Vòng 7 mốc. Mốc 7 là mốc đáng để giữ chuỗi: diamond gấp nhiều lần. */
export const CHECKIN_REWARDS: CheckinReward[] = [
  { slot: 1, coin: 100, xp: 40, diamond: 0 },
  { slot: 2, coin: 150, xp: 50, diamond: 0 },
  { slot: 3, coin: 200, xp: 60, diamond: 1 },
  { slot: 4, coin: 250, xp: 80, diamond: 0 },
  { slot: 5, coin: 320, xp: 100, diamond: 2 },
  { slot: 6, coin: 400, xp: 120, diamond: 0 },
  { slot: 7, coin: 600, xp: 200, diamond: 5 },
];

const CYCLE = CHECKIN_REWARDS.length;

function dayString(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

interface CheckinRow {
  day: string;
  streak: number;
  slot: number;
}

function lastCheckin(userId: string): CheckinRow | undefined {
  return db.prepare('SELECT day, streak, slot FROM checkins WHERE user_id = ? ORDER BY day DESC LIMIT 1').get(userId) as
    | CheckinRow
    | undefined;
}

export function checkinState(userId: string): CheckinState {
  const last = lastCheckin(userId);
  const claimedToday = last?.day === today();
  // Chuỗi chỉ còn sống nếu lần cuối là hôm nay hoặc hôm qua.
  const alive = last && (last.day === today() || last.day === dayString(-1));
  const streak = alive ? last!.streak : 0;
  const best = (db.prepare('SELECT MAX(streak) AS m FROM checkins WHERE user_id = ?').get(userId) as { m: number | null })
    .m;
  const recent = db
    .prepare('SELECT day FROM checkins WHERE user_id = ? ORDER BY day DESC LIMIT 14')
    .all(userId) as { day: string }[];

  return {
    streak,
    bestStreak: best ?? 0,
    claimedToday,
    nextSlot: claimedToday ? last!.slot : (streak % CYCLE) + 1,
    rewards: CHECKIN_REWARDS,
    recentDays: recent.map((r) => r.day),
  };
}

export function claimCheckin(userId: string): { reward: CheckinReward; streak: number } {
  const last = lastCheckin(userId);
  if (last?.day === today()) throw new Error('ALREADY_CLAIMED');

  const continued = last?.day === dayString(-1);
  const streak = continued ? last!.streak + 1 : 1;
  const slot = ((streak - 1) % CYCLE) + 1;
  const reward = CHECKIN_REWARDS[slot - 1];

  db.prepare('INSERT INTO checkins (user_id, day, streak, slot, created_at) VALUES (?,?,?,?,?)').run(
    userId,
    today(),
    streak,
    slot,
    nowMs(),
  );
  if (reward.coin) mutateCurrency(userId, 'coin', reward.coin, 'checkin', `${today()}#${slot}`);
  if (reward.diamond) mutateCurrency(userId, 'diamond', reward.diamond, 'checkin', `${today()}#${slot}`);
  if (reward.xp) db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(reward.xp, userId);

  // Sự kiện có thể ra nhiệm vụ "điểm danh N ngày"; thành tựu theo chuỗi cũng
  // ăn theo mốc này.
  progressQuests(userId, 'checkin', 1);
  progressAchievements(userId, 'checkin', 1);
  track(userId, 'checkin', { streak, slot });
  notify(
    userId,
    'reward',
    `Điểm danh ngày ${slot}`,
    `+${reward.coin} Coin · +${reward.xp} XP${reward.diamond ? ` · +${reward.diamond} Diamond` : ''}`,
    { streak, slot },
  );
  return { reward, streak };
}

function mapEvent(r: any, quests: UserQuest[]): EventWithQuests {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    banner: r.banner,
    kind: r.kind,
    startAt: r.start_at,
    endAt: r.end_at,
    active: !!r.active,
    quests,
  };
}

/** Sự kiện đang chạy, kèm nhiệm vụ riêng và tiến độ của người đang xem. */
export function activeEvents(userId: string | null): EventWithQuests[] {
  const now = nowMs();
  const rows = db
    .prepare('SELECT * FROM events WHERE active = 1 AND start_at <= ? AND end_at >= ? ORDER BY start_at')
    .all(now, now) as any[];
  return rows.map((r) => mapEvent(r, userId ? userQuests(userId, r.id) : []));
}
