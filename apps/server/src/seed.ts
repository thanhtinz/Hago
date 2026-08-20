import { db, nowMs } from './db';
import { hashPassword } from './auth';
import { AVATAR_STYLES } from './avatar';
import { nid } from './util';

const DAY = 86_400_000;

/** Cosmetic dùng CSS gradient/emoji nên không phụ thuộc asset nhị phân nào. */
const ITEMS = [
  // Frames
  { id: 'frame_sakura', name: 'Khung Hoa Anh Đào', type: 'frame', rarity: 'rare', priceCoin: 1200, priceDiamond: null, payload: { from: '#FFB7C5', to: '#FF6F91', glow: '#FFD9E3' }, description: 'Viền hồng chibi rực rỡ' },
  { id: 'frame_mint', name: 'Khung Bạc Hà', type: 'frame', rarity: 'common', priceCoin: 600, priceDiamond: null, payload: { from: '#9BF6C5', to: '#3AC48A', glow: '#D6FFEB' }, description: 'Xanh mát dịu mắt' },
  { id: 'frame_royal', name: 'Khung Hoàng Gia', type: 'frame', rarity: 'epic', priceCoin: null, priceDiamond: 120, payload: { from: '#C86DFF', to: '#6C5CE7', glow: '#EBD9FF' }, description: 'Dành cho cao thủ' },
  { id: 'frame_dragon', name: 'Khung Rồng Vàng', type: 'frame', rarity: 'legendary', priceCoin: null, priceDiamond: 380, payload: { from: '#FFD36E', to: '#FF8A3D', glow: '#FFF0C7' }, description: 'Hiếm nhất mùa này' },
  // Titles
  { id: 'title_newbie', name: 'Tân Binh Vui Vẻ', type: 'title', rarity: 'common', priceCoin: 300, priceDiamond: null, payload: { text: 'Tân Binh Vui Vẻ', color: '#39C77F' }, description: 'Danh hiệu khởi đầu' },
  { id: 'title_caro_king', name: 'Vua Caro', type: 'title', rarity: 'epic', priceCoin: 3000, priceDiamond: null, payload: { text: 'Vua Caro', color: '#7C6BFF' }, description: 'Bậc thầy 5 quân' },
  { id: 'title_wolf', name: 'Sói Đầu Đàn', type: 'title', rarity: 'rare', priceCoin: null, priceDiamond: 90, payload: { text: 'Sói Đầu Đàn', color: '#E9556D' }, description: 'Không ai soi ra bạn' },
  // Backgrounds
  { id: 'bg_beach', name: 'Nền Biển Chiều', type: 'background', rarity: 'rare', priceCoin: 1500, priceDiamond: null, payload: { from: '#FFD3A5', to: '#FD6585' }, description: 'Hoàng hôn Phú Quốc' },
  { id: 'bg_night', name: 'Nền Đêm Sao', type: 'background', rarity: 'epic', priceCoin: null, priceDiamond: 150, payload: { from: '#5B4B8A', to: '#1F1B3A' }, description: 'Trời đêm lấp lánh' },
  { id: 'bg_bamboo', name: 'Nền Rừng Trúc', type: 'background', rarity: 'common', priceCoin: 700, priceDiamond: null, payload: { from: '#B5EAD7', to: '#4FA37A' }, description: 'Yên bình chibi' },
  // Chat bubbles
  { id: 'bubble_cloud', name: 'Bong Bóng Mây', type: 'bubble', rarity: 'common', priceCoin: 450, priceDiamond: null, payload: { bg: '#E8F1FF', text: '#2B3A67' }, description: 'Mềm như mây' },
  { id: 'bubble_candy', name: 'Bong Bóng Kẹo', type: 'bubble', rarity: 'rare', priceCoin: 1100, priceDiamond: null, payload: { bg: '#FFE1F0', text: '#B33771' }, description: 'Ngọt ngào' },
  // Emotes
  { id: 'emote_pack_cute', name: 'Gói Emote Chibi', type: 'emote', rarity: 'rare', priceCoin: 900, priceDiamond: null, payload: { stickers: 'wave,smile,party,handshake,fire,trophy' }, description: '6 sticker biểu cảm' },
  { id: 'emote_pack_troll', name: 'Gói Emote Cà Khịa', type: 'emote', rarity: 'epic', priceCoin: null, priceDiamond: 80, payload: { stickers: 'smile,skull,sheep,moon,star,crystal' }, description: 'Cà khịa nhẹ nhàng' },
  // Victory / entry effects
  { id: 'fx_confetti', name: 'Hiệu Ứng Pháo Giấy', type: 'victory', rarity: 'rare', priceCoin: 1300, priceDiamond: null, payload: { kind: 'confetti', color: '#FFD36E' }, description: 'Ăn mừng rực rỡ' },
  { id: 'fx_fireworks', name: 'Hiệu Ứng Pháo Hoa', type: 'victory', rarity: 'legendary', priceCoin: null, priceDiamond: 300, payload: { kind: 'fireworks', color: '#FF6F91' }, description: 'Bùng nổ cả màn hình' },
  { id: 'fx_entry_star', name: 'Hiệu Ứng Vào Phòng Sao', type: 'entry', rarity: 'rare', priceCoin: 1000, priceDiamond: null, payload: { kind: 'stars', color: '#7C6BFF' }, description: 'Xuất hiện thật ngầu' },
  // Board themes
  { id: 'board_wood', name: 'Bàn Gỗ Truyền Thống', type: 'boardtheme', rarity: 'common', priceCoin: 800, priceDiamond: null, payload: { from: '#E8C39E', to: '#B9825A', line: '#8C5A32' }, description: 'Cho Caro & Ô ăn quan' },
  { id: 'board_neon', name: 'Bàn Neon', type: 'boardtheme', rarity: 'epic', priceCoin: null, priceDiamond: 130, payload: { from: '#2B2B5A', to: '#101033', line: '#5AE0FF' }, description: 'Phong cách hiện đại' },
];

const QUESTS = [
  { id: 'q_daily_play3', type: 'daily', title: 'Chơi 3 trận', description: 'Hoàn thành 3 trận bất kỳ', metric: 'play_match', target: 3, rewardCoin: 120, rewardXp: 80, rewardDiamond: 0, gameType: null },
  { id: 'q_daily_win1', type: 'daily', title: 'Thắng 1 trận', description: 'Giành chiến thắng 1 trận', metric: 'win_match', target: 1, rewardCoin: 100, rewardXp: 60, rewardDiamond: 1, gameType: null },
  { id: 'q_daily_caro', type: 'daily', title: 'Cao thủ Caro', description: 'Chơi 2 trận Caro', metric: 'play_match', target: 2, rewardCoin: 80, rewardXp: 50, rewardDiamond: 0, gameType: 'caro' },
  { id: 'q_daily_chat', type: 'daily', title: 'Giao lưu', description: 'Chơi cùng bạn bè 1 trận', metric: 'play_with_friend', target: 1, rewardCoin: 90, rewardXp: 70, rewardDiamond: 0, gameType: null },
  { id: 'q_weekly_play20', type: 'weekly', title: 'Cày cuốc tuần này', description: 'Chơi 20 trận trong tuần', metric: 'play_match', target: 20, rewardCoin: 600, rewardXp: 400, rewardDiamond: 5, gameType: null },
  { id: 'q_weekly_win8', type: 'weekly', title: 'Chuỗi thắng', description: 'Thắng 8 trận trong tuần', metric: 'win_match', target: 8, rewardCoin: 800, rewardXp: 500, rewardDiamond: 8, gameType: null },
  { id: 'q_weekly_shop', type: 'weekly', title: 'Tín đồ thời trang', description: 'Mua 1 món cosmetic', metric: 'buy_item', target: 1, rewardCoin: 200, rewardXp: 120, rewardDiamond: 0, gameType: null },
];

const ACHIEVEMENTS = [
  { id: 'ach_first_win', title: 'Chiến Thắng Đầu Tiên', description: 'Thắng trận đầu tiên', metric: 'wins', target: 1, rewardCoin: 200, rewardXp: 150, art: 'star' },
  { id: 'ach_win_10', title: 'Tay Chơi Cứng', description: 'Thắng 10 trận', metric: 'wins', target: 10, rewardCoin: 500, rewardXp: 350, art: 'flame' },
  { id: 'ach_win_100', title: 'Huyền Thoại', description: 'Thắng 100 trận', metric: 'wins', target: 100, rewardCoin: 3000, rewardXp: 2000, art: 'crown' },
  { id: 'ach_match_100', title: '100 Trận Đấu', description: 'Chơi 100 trận', metric: 'matches', target: 100, rewardCoin: 1500, rewardXp: 1000, art: 'target' },
  { id: 'ach_match_1000', title: '1000 Trận Đấu', description: 'Chơi 1000 trận', metric: 'matches', target: 1000, rewardCoin: 12000, rewardXp: 8000, art: 'trophy' },
  { id: 'ach_friends_5', title: 'Bạn Bè Bốn Phương', description: 'Kết bạn với 5 người', metric: 'friends', target: 5, rewardCoin: 300, rewardXp: 200, art: 'handshake' },
];

const DEMO_USERS = [
  { username: 'linhchibi', displayName: 'Linh Chibi', rating: 1780, coin: 4200, diamond: 65 },
  { username: 'minhcaro', displayName: 'Minh Caro', rating: 2140, coin: 8900, diamond: 130 },
  { username: 'bopbo', displayName: 'Bống Bơ', rating: 1320, coin: 1500, diamond: 12 },
  { username: 'soigia', displayName: 'Sói Già', rating: 2620, coin: 15000, diamond: 420 },
  { username: 'tomcute', displayName: 'Tôm Cute', rating: 1050, coin: 800, diamond: 5 },
  { username: 'nhimxu', displayName: 'Nhím Xù', rating: 1610, coin: 3300, diamond: 40 },
  { username: 'meomap', displayName: 'Mèo Mập', rating: 1930, coin: 6100, diamond: 88 },
  { username: 'cunbong', displayName: 'Cún Bông', rating: 1450, coin: 2100, diamond: 22 },
];

function createUser(opts: {
  username: string;
  displayName: string;
  password: string;
  isAdmin?: boolean;
  rating?: number;
  coin?: number;
  diamond?: number;
}): string {
  const id = nid();
  const now = nowMs();
  db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, is_admin, rating, coin, diamond, created_at, last_seen_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    opts.username,
    opts.displayName,
    hashPassword(opts.password),
    opts.isAdmin ? 1 : 0,
    opts.rating ?? 1000,
    opts.coin ?? 500,
    opts.diamond ?? 20,
    now - Math.floor(Math.random() * 30) * DAY,
    now,
  );
  const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  db.prepare('INSERT INTO profiles (user_id, avatar_seed, avatar_style, bio) VALUES (?,?,?,?)').run(
    id,
    opts.username,
    style,
    'Chơi game vui là chính',
  );
  return id;
}

export function ensureSeed(): void {
  const upsertItem = db.prepare(
    `INSERT INTO items (id, name, type, rarity, price_coin, price_diamond, payload, description)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, payload=excluded.payload, description=excluded.description`,
  );
  ITEMS.forEach((i) =>
    upsertItem.run(i.id, i.name, i.type, i.rarity, i.priceCoin, i.priceDiamond, JSON.stringify(i.payload), i.description),
  );

  const upsertQuest = db.prepare(
    `INSERT INTO quests (id, type, title, description, metric, target, reward_coin, reward_xp, reward_diamond, game_type, active)
     VALUES (?,?,?,?,?,?,?,?,?,?,1)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, target=excluded.target`,
  );
  QUESTS.forEach((q) =>
    upsertQuest.run(q.id, q.type, q.title, q.description, q.metric, q.target, q.rewardCoin, q.rewardXp, q.rewardDiamond, q.gameType),
  );

  const upsertAch = db.prepare(
    `INSERT INTO achievements (id, title, description, metric, target, reward_coin, reward_xp, art)
     VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, art=excluded.art`,
  );
  ACHIEVEMENTS.forEach((a) =>
    upsertAch.run(a.id, a.title, a.description, a.metric, a.target, a.rewardCoin, a.rewardXp, a.art),
  );

  const now = nowMs();
  db.prepare(
    `INSERT INTO events (id, title, description, banner, kind, start_at, end_at, active) VALUES
     ('ev_login','Điểm Danh Mùa Hè','Đăng nhập mỗi ngày nhận Coin và Diamond','#FF8A3D','login',?,?,1)
     ON CONFLICT(id) DO UPDATE SET end_at=excluded.end_at`,
  ).run(now - DAY, now + 20 * DAY);
  db.prepare(
    `INSERT INTO events (id, title, description, banner, kind, start_at, end_at, active) VALUES
     ('ev_streak','Chuỗi Thắng Vàng','Thắng liên tiếp để nhận khung Rồng Vàng','#7C6BFF','winstreak',?,?,1)
     ON CONFLICT(id) DO UPDATE SET end_at=excluded.end_at`,
  ).run(now - DAY, now + 10 * DAY);
  db.prepare(
    `INSERT INTO events (id, title, description, banner, kind, start_at, end_at, active) VALUES
     ('ev_tournament','Giải Caro Mở Rộng','Bracket 16 người, giải thưởng 5000 Diamond','#2FA9F5','tournament',?,?,1)
     ON CONFLICT(id) DO UPDATE SET end_at=excluded.end_at`,
  ).run(now, now + 5 * DAY);

  const userCount = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const adminId = createUser({
      username: 'admin',
      displayName: 'Quản Trị Viên',
      password: 'admin123',
      isAdmin: true,
      rating: 1500,
      coin: 99999,
      diamond: 9999,
    });
    const demoId = createUser({
      username: 'demo',
      displayName: 'Người Chơi Demo',
      password: 'demo123',
      rating: 1680,
      coin: 5400,
      diamond: 96,
    });
    const others = DEMO_USERS.map((u) => ({ id: createUser({ ...u, password: 'demo123' }), ...u }));

    // Demo có sẵn bạn bè để màn Social không trống.
    const addFriend = db.prepare(
      "INSERT OR IGNORE INTO friends (user_id, friend_id, status, created_at) VALUES (?,?,'accepted',?)",
    );
    others.slice(0, 5).forEach((o) => {
      addFriend.run(demoId, o.id, nowMs());
      addFriend.run(o.id, demoId, nowMs());
    });
    // Một lời mời kết bạn đang chờ.
    db.prepare("INSERT OR IGNORE INTO friends (user_id, friend_id, status, created_at) VALUES (?,?,'pending',?)").run(
      others[6].id,
      demoId,
      nowMs(),
    );
    // Vài món cosmetic sẵn có cho demo.
    ['frame_sakura', 'title_newbie', 'bubble_cloud'].forEach((itemId, i) =>
      db.prepare('INSERT OR IGNORE INTO inventory (user_id, item_id, quantity, equipped, acquired_at) VALUES (?,?,1,?,?)').run(
        demoId,
        itemId,
        i === 0 ? 1 : 0,
        nowMs(),
      ),
    );
    db.prepare("UPDATE profiles SET frame_id = 'frame_sakura' WHERE user_id = ?").run(demoId);

    console.log(`Seeded users: admin/admin123 (id=${adminId}), demo/demo123 (id=${demoId}), +${others.length} demo players`);
  }
}

if (require.main === module) {
  ensureSeed();
  console.log('Seed complete');
}
