// Tệp sinh tự động bởi scripts/fetch-sheep-fight.mjs — đừng sửa tay.
// Art: TomoSheepFight của Do Trung Kien (MIT), xem assets/sheep-fight/CREDITS.md.

export interface SheepStrip {
  /** Bề ngang một khung. */
  readonly w: number;
  /** Chiều cao một khung. */
  readonly h: number;
  /** Số khung trong strip. */
  readonly count: number;
  readonly src: number;
}

export const SHEEP_STRIPS: Record<string, SheepStrip> = {
  'sheep-1-w-walk': { w: 34, h: 42, count: 6, src: require('../../assets/sheep-fight/sheep-1-w-walk.png') },
  'sheep-1-w-push': { w: 34, h: 42, count: 6, src: require('../../assets/sheep-fight/sheep-1-w-push.png') },
  'sheep-1-b-walk': { w: 37, h: 43, count: 6, src: require('../../assets/sheep-fight/sheep-1-b-walk.png') },
  'sheep-1-b-push': { w: 34, h: 42, count: 6, src: require('../../assets/sheep-fight/sheep-1-b-push.png') },
  'sheep-2-w-walk': { w: 50, h: 47, count: 6, src: require('../../assets/sheep-fight/sheep-2-w-walk.png') },
  'sheep-2-w-push': { w: 49, h: 47, count: 6, src: require('../../assets/sheep-fight/sheep-2-w-push.png') },
  'sheep-2-b-walk': { w: 50, h: 50, count: 6, src: require('../../assets/sheep-fight/sheep-2-b-walk.png') },
  'sheep-2-b-push': { w: 50, h: 47, count: 6, src: require('../../assets/sheep-fight/sheep-2-b-push.png') },
  'sheep-3-w-walk': { w: 56, h: 59, count: 6, src: require('../../assets/sheep-fight/sheep-3-w-walk.png') },
  'sheep-3-w-push': { w: 56, h: 59, count: 6, src: require('../../assets/sheep-fight/sheep-3-w-push.png') },
  'sheep-3-b-walk': { w: 53, h: 60, count: 6, src: require('../../assets/sheep-fight/sheep-3-b-walk.png') },
  'sheep-3-b-push': { w: 56, h: 57, count: 6, src: require('../../assets/sheep-fight/sheep-3-b-push.png') },
  'sheep-4-w-walk': { w: 61, h: 72, count: 6, src: require('../../assets/sheep-fight/sheep-4-w-walk.png') },
  'sheep-4-w-push': { w: 61, h: 72, count: 6, src: require('../../assets/sheep-fight/sheep-4-w-push.png') },
  'sheep-4-b-walk': { w: 61, h: 72, count: 6, src: require('../../assets/sheep-fight/sheep-4-b-walk.png') },
  'sheep-4-b-push': { w: 61, h: 72, count: 6, src: require('../../assets/sheep-fight/sheep-4-b-push.png') },
  'sheep-5-w-walk': { w: 82, h: 84, count: 6, src: require('../../assets/sheep-fight/sheep-5-w-walk.png') },
  'sheep-5-w-push': { w: 82, h: 84, count: 6, src: require('../../assets/sheep-fight/sheep-5-w-push.png') },
  'sheep-5-b-walk': { w: 83, h: 83, count: 6, src: require('../../assets/sheep-fight/sheep-5-b-walk.png') },
  'sheep-5-b-push': { w: 83, h: 80, count: 6, src: require('../../assets/sheep-fight/sheep-5-b-push.png') },
};

export const SHEEP_STILLS: Record<string, number> = {
  'lvl1W': require('../../assets/sheep-fight/lvl1W.png'),
  'lvl1B': require('../../assets/sheep-fight/lvl1B.png'),
  'lvl2W': require('../../assets/sheep-fight/lvl2W.png'),
  'lvl2B': require('../../assets/sheep-fight/lvl2B.png'),
  'lvl3W': require('../../assets/sheep-fight/lvl3W.png'),
  'lvl3B': require('../../assets/sheep-fight/lvl3B.png'),
  'lvl4W': require('../../assets/sheep-fight/lvl4W.png'),
  'lvl4B': require('../../assets/sheep-fight/lvl4B.png'),
  'lvl5W': require('../../assets/sheep-fight/lvl5W.png'),
  'lvl5B': require('../../assets/sheep-fight/lvl5B.png'),
  'sheep-ready': require('../../assets/sheep-fight/sheep-ready.png'),
  'push-effect': require('../../assets/sheep-fight/push-effect.png'),
  'grass-effect': require('../../assets/sheep-fight/grass-effect.png'),
};

export type SheepTier = 1 | 2 | 3 | 4 | 5;
/** 'w' = đàn cừu trắng (nhìn từ sau lưng), 'b' = đàn cừu đen (nhìn chính diện). */
export type SheepTeam = 'w' | 'b';
export type SheepAnim = 'walk' | 'push';

export function sheepStrip(tier: number, team: SheepTeam, anim: SheepAnim): SheepStrip {
  const t = Math.max(1, Math.min(5, Math.round(tier)));
  return SHEEP_STRIPS[`sheep-${t}-${team}-${anim}`];
}

/** Icon cấp dùng trong hàng chờ. */
export function sheepBadge(tier: number, team: SheepTeam): number {
  const t = Math.max(1, Math.min(5, Math.round(tier)));
  return SHEEP_STILLS[`lvl${t}${team === 'w' ? 'W' : 'B'}`];
}
