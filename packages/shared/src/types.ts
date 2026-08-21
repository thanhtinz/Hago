/** Core domain types shared between server, mobile client and admin panel. */

export type GameType =
  | 'caro'
  | 'battleship'
  | 'oanquan'
  | 'sheep'
  | 'chess'
  | 'flappy'
  | 'werewolf';

export type GameMode = 'normal' | 'ranked' | 'custom';

export const GAME_TYPES: GameType[] = [
  'caro',
  'battleship',
  'oanquan',
  'sheep',
  'chess',
  'flappy',
  'werewolf',
];

export interface GameMeta {
  id: GameType;
  name: string;
  nameEn: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  category: string;
  modes: GameMode[];
  /** Pastel chibi theme colours used by the client. */
  colors: [string, string];
  /** Tên asset chibi đại diện cho game (không dùng emoji). */
  art: string;
  avgMinutes: number;
  /**
   * Game chơi một mình: không có đối thủ nên không tính thắng/thua và không đổi
   * rating, chỉ lấy điểm cao nhất xếp bảng xếp hạng.
   */
  solo?: boolean;
}

/** Game một người thì xếp hạng theo điểm cao nhất, không theo Elo. */
export const isSolo = (game: GameType) => GAME_CATALOG[game].maxPlayers === 1;

export const GAME_CATALOG: Record<GameType, GameMeta> = {
  caro: {
    id: 'caro',
    name: 'Cờ Caro',
    nameEn: 'Gomoku',
    tagline: 'Năm quân thẳng hàng là thắng',
    minPlayers: 2,
    maxPlayers: 2,
    category: 'Board strategy',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#7C6BFF', '#B9AFFF'],
    art: 'game-caro',
    avgMinutes: 5,
  },
  battleship: {
    id: 'battleship',
    name: 'Bắn Tàu',
    nameEn: 'Battleship',
    tagline: 'Giấu hạm đội, bắn chìm đối thủ',
    minPlayers: 2,
    maxPlayers: 2,
    category: 'Turn-based strategy',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#2FA9F5', '#9BDCFF'],
    art: 'game-battleship',
    avgMinutes: 8,
  },
  oanquan: {
    id: 'oanquan',
    name: 'Ô Ăn Quan',
    nameEn: 'Mandarin Square',
    tagline: 'Cờ dân gian Việt Nam',
    minPlayers: 2,
    maxPlayers: 2,
    category: 'Board strategy',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#F2994A', '#FFD79B'],
    art: 'game-oanquan',
    avgMinutes: 7,
  },
  sheep: {
    id: 'sheep',
    name: 'Sheep Battle',
    nameEn: 'Sheep Fight',
    tagline: 'Cừu nhỏ trừ nhiều máu, cừu to đẩy khoẻ — lùa cừu qua sân địch',
    minPlayers: 2,
    maxPlayers: 2,
    category: 'Realtime lane battle',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#39C77F', '#A9F0CB'],
    art: 'game-sheep',
    avgMinutes: 3,
  },
  chess: {
    id: 'chess',
    name: 'Cờ Vua',
    nameEn: 'Chess',
    tagline: 'Luật đủ: nhập thành, bắt tốt qua đường, phong cấp',
    minPlayers: 2,
    maxPlayers: 2,
    category: 'Board strategy',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#5F5A8C', '#B6B1D8'],
    art: 'game-chess',
    avgMinutes: 12,
  },
  flappy: {
    id: 'flappy',
    name: 'Flappy Bird',
    nameEn: 'Flappy Bird',
    tagline: 'Luồn qua thật nhiều ống, ghi điểm lên bảng xếp hạng',
    minPlayers: 1,
    maxPlayers: 1,
    category: 'Arcade một người',
    modes: ['normal'],
    colors: ['#2FA9F5', '#A9DEFF'],
    art: 'game-flappy',
    avgMinutes: 2,
    solo: true,
  },
  werewolf: {
    id: 'werewolf',
    name: 'Ma Sói',
    nameEn: 'Werewolf',
    tagline: 'Suy luận, thuyết phục, sống sót',
    minPlayers: 4,
    maxPlayers: 16,
    category: 'Social deduction',
    modes: ['normal', 'custom'],
    colors: ['#6C5CE7', '#3A2E6E'],
    art: 'game-werewolf',
    avgMinutes: 20,
  },
};

/* ------------------------------------------------------------------ */
/* Account & profile                                                    */
/* ------------------------------------------------------------------ */

export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  avatarStyle: string;
  frameId: string | null;
  titleId: string | null;
  level: number;
  xp: number;
  rating: number;
  rank: RankTier;
  status: AccountStatus;
  online?: boolean;
  playing?: GameType | null;
}

export interface UserProfile extends PublicUser {
  bio: string;
  coin: number;
  diamond: number;
  seasonToken: number;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  createdAt: number;
  perGame: Record<string, GameStat>;
  isAdmin?: boolean;
}

export interface GameStat {
  gameType: GameType;
  matches: number;
  wins: number;
  losses: number;
  rating: number;
}

export type RankTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master';

export interface RankInfo {
  tier: RankTier;
  min: number;
  max: number;
  color: string;
  /** Tên asset chibi của bậc rank. */
  art: string;
}

export const RANKS: RankInfo[] = [
  { tier: 'Bronze', min: 0, max: 999, color: '#C4854B', art: 'medal-3' },
  { tier: 'Silver', min: 1000, max: 1499, color: '#A9B4C2', art: 'medal-2' },
  { tier: 'Gold', min: 1500, max: 1999, color: '#F2C14E', art: 'medal-1' },
  { tier: 'Platinum', min: 2000, max: 2499, color: '#55D6C2', art: 'gem' },
  { tier: 'Diamond', min: 2500, max: 2999, color: '#6FC3FF', art: 'gem' },
  { tier: 'Master', min: 3000, max: Number.MAX_SAFE_INTEGER, color: '#C86DFF', art: 'crown' },
];

export function rankOf(rating: number): RankInfo {
  return RANKS.find((r) => rating >= r.min && rating <= r.max) ?? RANKS[0];
}

/** Số trận xếp hạng phải đá xong trong mùa mới hiện rank. */
export const PLACEMENT_MATCHES = 5;

/**
 * Điểm rank đầu mùa mới, kéo mềm về mốc 1000.
 *
 * Đưa hẳn về 1000 thì cao thủ phải leo lại từ đầu mỗi mùa, còn giữ nguyên thì
 * bảng xếp hạng mùa nào cũng y hệt mùa trước. Kéo một nửa khoảng cách là mức
 * quen thuộc: thứ tự cũ vẫn còn, mà khoảng cách thì hẹp lại.
 */
export function softResetRating(rating: number): number {
  return Math.round(1000 + (rating - 1000) * 0.5);
}

/** Total XP required to reach a given level (quadratic curve). */
export function xpForLevel(level: number): number {
  return Math.round(60 * (level - 1) + 12 * Math.pow(level - 1, 2));
}

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  while (level < 200 && xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, need: next - base };
}

/* ------------------------------------------------------------------ */
/* Bang hội                                                             */
/* ------------------------------------------------------------------ */

export type GuildRole = 'owner' | 'officer' | 'member';
export type GuildJoinPolicy = 'open' | 'request' | 'closed';

/** Số thành viên tối đa theo cấp bang — lên cấp thì mở thêm chỗ. */
export const GUILD_SLOTS_BASE = 20;
export const GUILD_SLOTS_PER_LEVEL = 5;
export const GUILD_MAX_LEVEL = 20;

/**
 * Bang lên cấp theo tổng điểm đóng góp của thành viên. Mốc tăng dần chứ không
 * tuyến tính, để bang đông không lên cấp quá nhanh so với bang nhỏ chăm chỉ.
 */
export function guildXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= level; i++) total += 400 + (i - 2) * 260;
  return total;
}

export function guildLevelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  while (level < GUILD_MAX_LEVEL && xp >= guildXpForLevel(level + 1)) level++;
  const base = guildXpForLevel(level);
  const next = level >= GUILD_MAX_LEVEL ? base : guildXpForLevel(level + 1);
  return { level, into: xp - base, need: Math.max(1, next - base) };
}

export const guildSlots = (level: number) => GUILD_SLOTS_BASE + (level - 1) * GUILD_SLOTS_PER_LEVEL;

export interface GuildSummary {
  id: string;
  name: string;
  tag: string;
  description: string;
  emblem: string;
  color: string;
  joinPolicy: GuildJoinPolicy;
  minLevel: number;
  xp: number;
  level: number;
  /** Điểm đã vào cấp hiện tại và điểm cần để lên cấp — cho thanh tiến độ. */
  into: number;
  need: number;
  members: number;
  slots: number;
}

export interface GuildMemberRow {
  user: PublicUser;
  role: GuildRole;
  points: number;
  joinedAt: number;
}

/* ------------------------------------------------------------------ */
/* Social                                                               */
/* ------------------------------------------------------------------ */

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendEdge {
  user: PublicUser;
  status: FriendStatus;
  direction: 'incoming' | 'outgoing' | 'mutual';
  since: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  body: string;
  kind: 'text' | 'sticker' | 'system';
  createdAt: number;
  filtered?: boolean;
}

/* ------------------------------------------------------------------ */
/* Rooms & matches                                                      */
/* ------------------------------------------------------------------ */

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomPlayer {
  user: PublicUser;
  seat: number;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomView {
  id: string;
  code: string;
  gameType: GameType;
  mode: GameMode;
  status: RoomStatus;
  hostId: string;
  isPrivate: boolean;
  hasPassword: boolean;
  maxPlayers: number;
  players: RoomPlayer[];
  matchId: string | null;
  createdAt: number;
  config: Record<string, unknown>;
}

export interface MatchResultRow {
  userId: string;
  result: 'win' | 'lose' | 'draw';
  score: number;
  ratingDelta: number;
  xpGain: number;
  coinGain: number;
  place: number;
}

export interface MatchSummary {
  matchId: string;
  gameType: GameType;
  mode: GameMode;
  startedAt: number;
  endedAt: number;
  rows: MatchResultRow[];
}

/* ------------------------------------------------------------------ */
/* Economy                                                              */
/* ------------------------------------------------------------------ */

export type ItemType =
  | 'avatar'
  | 'frame'
  | 'background'
  | 'title'
  | 'bubble'
  | 'emote'
  | 'victory'
  | 'entry'
  | 'boardtheme';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Cosmetic. Không mua bán — chỉ kiếm được qua Battle Pass, thành tựu và phần
 * thưởng sự kiện, nên không có giá.
 */
export interface CosmeticItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  payload: Record<string, string>;
  status: 'active' | 'hidden';
  description: string;
}

export interface InventoryEntry {
  item: CosmeticItem;
  quantity: number;
  equipped: boolean;
  acquiredAt: number;
}

export type CurrencyKind = 'coin' | 'diamond' | 'seasonToken';

export interface TransactionRow {
  id: string;
  userId: string;
  type: string;
  currency: CurrencyKind;
  amount: number;
  balanceAfter: number;
  status: string;
  ref: string | null;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Quest, achievement, event                                            */
/* ------------------------------------------------------------------ */

export type QuestType = 'daily' | 'weekly' | 'event';

export interface QuestDef {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  metric: string;
  target: number;
  rewardCoin: number;
  rewardXp: number;
  rewardDiamond: number;
  gameType: GameType | null;
  startAt: number | null;
  endAt: number | null;
  active: boolean;
}

export interface UserQuest {
  quest: QuestDef;
  progress: number;
  claimed: boolean;
  completed: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  rewardCoin: number;
  rewardXp: number;
  /** Cosmetic tặng kèm khi mở khoá, nếu có. */
  rewardItem: string | null;
  /** Tên asset chibi của thành tựu. */
  art: string;
}

export interface UserAchievement {
  achievement: AchievementDef;
  progress: number;
  unlockedAt: number | null;
}

export interface EventDef {
  id: string;
  title: string;
  description: string;
  banner: string;
  startAt: number;
  endAt: number;
  kind: 'login' | 'winstreak' | 'seasonal' | 'tournament';
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Notification                                                         */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'room_invite'
  | 'match_found'
  | 'match_result'
  | 'quest_complete'
  | 'guild'
  | 'reward'
  | 'event'
  | 'system';

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: number | null;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Realtime protocol                                                    */
/* ------------------------------------------------------------------ */

export interface GameActionEnvelope {
  actionId: string;
  matchId: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface GameStatePacket {
  matchId: string;
  gameType: GameType;
  version: number;
  view: unknown;
  finished: boolean;
  deadline: number | null;
}

export interface GameEventPacket {
  matchId: string;
  version: number;
  events: GameEvent[];
}

export interface GameEvent {
  type: string;
  payload?: Record<string, unknown>;
  /** When set, only this player receives the event. */
  to?: string;
}
