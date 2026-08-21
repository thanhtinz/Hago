import { EngineResultRow } from './engine';
import { GameMode, GameType, isSolo, rankOf } from './types';

export interface RewardCalc {
  userId: string;
  result: 'win' | 'lose' | 'draw';
  place: number;
  xpGain: number;
  coinGain: number;
  ratingDelta: number;
}

const BASE_XP = 40;
const BASE_COIN = 25;

/** Elo-style rating với K giảm dần theo rank để top player ổn định hơn. */
export function kFactor(rating: number): number {
  if (rating >= 2500) return 16;
  if (rating >= 2000) return 24;
  return 32;
}

export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

export interface RewardInput {
  rows: EngineResultRow[];
  ratings: Record<string, number>;
  mode: GameMode;
  gameType: GameType;
  durationMs: number;
  /** Người chơi đã nhận first-win-of-the-day chưa. */
  firstWinAvailable: Record<string, boolean>;
  /** XP đã nhận trong ngày, dùng cho anti-abuse cap. */
  dailyXp: Record<string, number>;
  dailyXpCap?: number;
}

export function computeRewards(input: RewardInput): RewardCalc[] {
  const { rows, ratings, mode, durationMs } = input;
  const cap = input.dailyXpCap ?? 3000;
  const n = rows.length;
  const avgOthers = (id: string) => {
    const others = rows.filter((r) => r.userId !== id);
    if (!others.length) return ratings[id] ?? 1000;
    return others.reduce((s, r) => s + (ratings[r.userId] ?? 1000), 0) / others.length;
  };
  // Trận quá ngắn (<30s) chỉ nhận nửa thưởng để chống farm.
  const shortMatch = durationMs < 30_000;
  const solo = isSolo(input.gameType);

  /**
   * Game một người thì không có đối thủ để so, nên thưởng tính theo điểm chứ
   * không theo thắng/thua: mỗi ống qua được là 6 XP và 4 coin, có trần để một
   * ván dài không phá vỡ nền kinh tế. Rating giữ nguyên.
   */
  if (solo) {
    return rows.map((row) => {
      const already = input.dailyXp[row.userId] ?? 0;
      let xp = Math.min(300, BASE_XP / 2 + row.score * 6);
      let coin = Math.min(200, BASE_COIN / 2 + row.score * 4);
      xp = Math.max(0, Math.min(Math.round(xp), cap - already));
      return {
        userId: row.userId,
        result: row.result,
        place: row.place,
        xpGain: xp,
        coinGain: Math.round(coin),
        ratingDelta: 0,
      };
    });
  }

  return rows.map((row) => {
    const mine = ratings[row.userId] ?? 1000;
    const actual = row.result === 'win' ? 1 : row.result === 'draw' ? 0.5 : n > 2 ? 1 - (row.place - 1) / (n - 1) : 0;
    const expected = expectedScore(mine, avgOthers(row.userId));
    const ratingDelta =
      mode === 'ranked' ? Math.round(kFactor(mine) * (actual - expected)) : 0;

    const placeBonus = n > 2 ? Math.max(0, (n - row.place) / (n - 1)) : 0;
    let xp = BASE_XP + Math.round(BASE_XP * 0.75 * placeBonus);
    let coin = BASE_COIN + Math.round(BASE_COIN * 0.6 * placeBonus);
    if (row.result === 'win') {
      xp += 35;
      coin += 30;
    }
    if (row.result === 'draw') xp += 10;
    if (mode === 'ranked') {
      xp = Math.round(xp * 1.25);
      coin = Math.round(coin * 1.15);
    }
    if (input.firstWinAvailable[row.userId] && row.result === 'win') {
      xp += 100;
      coin += 100;
    }
    if (shortMatch) {
      xp = Math.round(xp / 2);
      coin = Math.round(coin / 2);
    }
    const already = input.dailyXp[row.userId] ?? 0;
    xp = Math.max(0, Math.min(xp, cap - already));

    return {
      userId: row.userId,
      result: row.result,
      place: row.place,
      xpGain: xp,
      coinGain: coin,
      ratingDelta,
    };
  });
}

export function describeRating(rating: number): string {
  const r = rankOf(rating);
  return `${r.tier} · ${rating}`;
}
