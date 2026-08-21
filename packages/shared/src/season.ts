/**
 * Battle Pass theo mùa.
 *
 * Bảng phần thưởng nằm ở đây (dùng chung client và server) chứ không nằm trong
 * DB: client cần vẽ trước cả những mốc chưa mở để người chơi thấy đường còn dài
 * bao nhiêu, mà mốc thưởng thì cả mùa không đổi. Tiến độ của từng người mới
 * lưu DB.
 */

export type SeasonRewardKind = 'coin' | 'diamond' | 'seasonToken' | 'item';
export type SeasonTrack = 'free' | 'premium';

export interface SeasonReward {
  kind: SeasonRewardKind;
  /** Số lượng với tiền tệ; với vật phẩm thì luôn là 1. */
  amount: number;
  /** Chỉ có với `kind = 'item'`. */
  itemId?: string;
  label: string;
  /** Tên asset minh hoạ, không dùng emoji. */
  art: string;
}

export interface SeasonTier {
  tier: number;
  free?: SeasonReward;
  premium?: SeasonReward;
}

export const SEASON_TIERS = 30;
/** Giá mở nhánh cao cấp, tính bằng kim cương. */
export const SEASON_PREMIUM_PRICE = 250;

/**
 * XP cần cho mỗi mốc tăng dần nhẹ: mốc đầu nhanh cho người mới thấy tiến độ,
 * mốc cuối chậm lại để cả mùa vẫn còn việc để làm.
 */
export function seasonXpForTier(tier: number): number {
  if (tier <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= tier; i++) total += 300 + (i - 2) * 25;
  return total;
}

export function seasonTierFromXp(xp: number): { tier: number; into: number; need: number } {
  let tier = 1;
  while (tier < SEASON_TIERS && xp >= seasonXpForTier(tier + 1)) tier++;
  const base = seasonXpForTier(tier);
  const next = tier >= SEASON_TIERS ? base : seasonXpForTier(tier + 1);
  return { tier, into: xp - base, need: Math.max(1, next - base) };
}

const coin = (amount: number): SeasonReward => ({ kind: 'coin', amount, label: `${amount} Coin`, art: 'ui-coins' });
const gem = (amount: number): SeasonReward => ({ kind: 'diamond', amount, label: `${amount} Kim cương`, art: 'ui-gem' });
const token = (amount: number): SeasonReward => ({
  kind: 'seasonToken',
  amount,
  label: `${amount} Season Token`,
  art: 'star',
});
const item = (itemId: string, label: string, art = 'ui-gift'): SeasonReward => ({
  kind: 'item',
  amount: 1,
  itemId,
  label,
  art,
});

/**
 * 30 mốc. Nhánh miễn phí có thưởng ở phần lớn các mốc để ai cũng nhận được gì
 * đó; nhánh cao cấp có ở mọi mốc và giữ toàn bộ cosmetic hiếm.
 */
export const SEASON_REWARDS: SeasonTier[] = [
  { tier: 1, free: coin(200), premium: token(20) },
  { tier: 2, premium: coin(300) },
  { tier: 3, free: coin(250), premium: token(20) },
  { tier: 4, free: token(10), premium: gem(20) },
  { tier: 5, free: coin(300), premium: item('bubble_candy', 'Bong Bóng Kẹo Ngọt', 'ui-chat') },
  { tier: 6, premium: coin(400) },
  { tier: 7, free: token(15), premium: token(30) },
  { tier: 8, free: coin(350), premium: gem(25) },
  { tier: 9, premium: coin(450) },
  { tier: 10, free: gem(15), premium: item('frame_mint', 'Khung Bạc Hà', 'ui-gift') },
  { tier: 11, free: coin(400), premium: token(30) },
  { tier: 12, premium: coin(500) },
  { tier: 13, free: token(20), premium: gem(30) },
  { tier: 14, free: coin(450), premium: token(35) },
  { tier: 15, free: gem(20), premium: item('bg_night', 'Nền Đêm Sao', 'ui-gift') },
  { tier: 16, premium: coin(550) },
  { tier: 17, free: coin(500), premium: token(40) },
  { tier: 18, free: token(25), premium: gem(35) },
  { tier: 19, premium: coin(600) },
  { tier: 20, free: gem(25), premium: item('fx_confetti', 'Hiệu Ứng Pháo Giấy', 'win') },
  { tier: 21, free: coin(550), premium: token(45) },
  { tier: 22, premium: gem(40) },
  { tier: 23, free: token(30), premium: coin(700) },
  { tier: 24, free: coin(600), premium: token(50) },
  { tier: 25, free: gem(30), premium: item('title_caro_king', 'Danh Hiệu Vua Caro', 'crown') },
  { tier: 26, premium: coin(800) },
  { tier: 27, free: coin(700), premium: gem(50) },
  { tier: 28, free: token(40), premium: token(60) },
  { tier: 29, premium: coin(900) },
  { tier: 30, free: gem(50), premium: item('frame_dragon', 'Khung Rồng Vàng', 'ui-gift') },
];

export interface SeasonView {
  id: string;
  name: string;
  startAt: number;
  endAt: number;
  xp: number;
  tier: number;
  into: number;
  need: number;
  premium: boolean;
  premiumPrice: number;
  tiers: SeasonTier[];
  /** Mốc đã nhận, dạng `"free:3"` / `"premium:3"`. */
  claimed: string[];
}
