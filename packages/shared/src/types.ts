/** Core domain types shared between server, mobile client and admin panel. */

export type GameType =
  | 'caro'
  | 'battleship'
  | 'oanquan'
  | 'sheep'
  | 'monopoly'
  | 'ludo'
  | 'werewolf';

export type GameMode = 'normal' | 'ranked' | 'custom';

export const GAME_TYPES: GameType[] = [
  'caro',
  'battleship',
  'oanquan',
  'sheep',
  'monopoly',
  'ludo',
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
}

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
    tagline: 'Thả cừu, dồn sức đẩy đàn địch về sân nhà',
    minPlayers: 2,
    maxPlayers: 2,
    category: 'Realtime lane battle',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#39C77F', '#A9F0CB'],
    art: 'game-sheep',
    avgMinutes: 3,
  },
  monopoly: {
    id: 'monopoly',
    name: 'Cờ Tỷ Phú',
    nameEn: 'Monopoly',
    tagline: 'Mua đất, thu tô, làm giàu',
    minPlayers: 2,
    maxPlayers: 4,
    category: 'Board / economy',
    modes: ['normal', 'custom'],
    colors: ['#E9556D', '#FFB3BF'],
    art: 'game-monopoly',
    avgMinutes: 15,
  },
  ludo: {
    id: 'ludo',
    name: 'Cờ Cá Ngựa',
    nameEn: 'Ludo',
    tagline: 'Tung xúc xắc, đua ngựa về đích',
    minPlayers: 2,
    maxPlayers: 4,
    category: 'Board casual',
    modes: ['normal', 'ranked', 'custom'],
    colors: ['#FF8A3D', '#FFD0AC'],
    art: 'game-ludo',
    avgMinutes: 10,
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

export interface ShopItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  priceCoin: number | null;
  priceDiamond: number | null;
  payload: Record<string, string>;
  status: 'active' | 'hidden';
  description: string;
}

export interface InventoryEntry {
  item: ShopItem;
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
