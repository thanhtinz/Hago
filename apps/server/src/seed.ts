import { db, nowMs } from './db';
import { hashPassword } from './auth';
import { AVATAR_STYLES } from './avatar';
import { nid } from './util';

const DAY = 86_400_000;

/** Cosmetic dùng CSS gradient/emoji nên không phụ thuộc asset nhị phân nào. */
const ITEMS = [
  // Frames
  { id: 'frame_sakura', name: 'Khung Hoa Anh Đào', type: 'frame', rarity: 'rare', payload: { from: '#FFB7C5', to: '#FF6F91', glow: '#FFD9E3' }, description: 'Viền hồng chibi rực rỡ' },
  { id: 'frame_mint', name: 'Khung Bạc Hà', type: 'frame', rarity: 'common', payload: { from: '#9BF6C5', to: '#3AC48A', glow: '#D6FFEB' }, description: 'Xanh mát dịu mắt' },
  { id: 'frame_royal', name: 'Khung Hoàng Gia', type: 'frame', rarity: 'epic', payload: { from: '#C86DFF', to: '#6C5CE7', glow: '#EBD9FF' }, description: 'Dành cho cao thủ' },
  { id: 'frame_dragon', name: 'Khung Rồng Vàng', type: 'frame', rarity: 'legendary', payload: { from: '#FFD36E', to: '#FF8A3D', glow: '#FFF0C7' }, description: 'Hiếm nhất mùa này' },
  // Titles
  { id: 'title_newbie', name: 'Tân Binh Vui Vẻ', type: 'title', rarity: 'common', payload: { text: 'Tân Binh Vui Vẻ', color: '#39C77F' }, description: 'Danh hiệu khởi đầu' },
  { id: 'title_caro_king', name: 'Vua Caro', type: 'title', rarity: 'epic', payload: { text: 'Vua Caro', color: '#7C6BFF' }, description: 'Bậc thầy 5 quân' },
  { id: 'title_wolf', name: 'Sói Đầu Đàn', type: 'title', rarity: 'rare', payload: { text: 'Sói Đầu Đàn', color: '#E9556D' }, description: 'Không ai soi ra bạn' },
  // Backgrounds
  { id: 'bg_beach', name: 'Nền Biển Chiều', type: 'background', rarity: 'rare', payload: { from: '#FFD3A5', to: '#FD6585' }, description: 'Hoàng hôn Phú Quốc' },
  { id: 'bg_night', name: 'Nền Đêm Sao', type: 'background', rarity: 'epic', payload: { from: '#5B4B8A', to: '#1F1B3A' }, description: 'Trời đêm lấp lánh' },
  { id: 'bg_bamboo', name: 'Nền Rừng Trúc', type: 'background', rarity: 'common', payload: { from: '#B5EAD7', to: '#4FA37A' }, description: 'Yên bình chibi' },
  // Chat bubbles
  { id: 'bubble_cloud', name: 'Bong Bóng Mây', type: 'bubble', rarity: 'common', payload: { bg: '#E8F1FF', text: '#2B3A67' }, description: 'Mềm như mây' },
  { id: 'bubble_candy', name: 'Bong Bóng Kẹo', type: 'bubble', rarity: 'rare', payload: { bg: '#FFE1F0', text: '#B33771' }, description: 'Ngọt ngào' },
  // Emotes
  { id: 'emote_pack_cute', name: 'Gói Emote Chibi', type: 'emote', rarity: 'rare', payload: { stickers: 'wave,smile,party,handshake,fire,trophy' }, description: '6 sticker biểu cảm' },
  { id: 'emote_pack_troll', name: 'Gói Emote Cà Khịa', type: 'emote', rarity: 'epic', payload: { stickers: 'smile,skull,sheep,moon,star,crystal' }, description: 'Cà khịa nhẹ nhàng' },
  // Victory / entry effects
  { id: 'fx_confetti', name: 'Hiệu Ứng Pháo Giấy', type: 'victory', rarity: 'rare', payload: { kind: 'confetti', color: '#FFD36E' }, description: 'Ăn mừng rực rỡ' },
  { id: 'fx_fireworks', name: 'Hiệu Ứng Pháo Hoa', type: 'victory', rarity: 'legendary', payload: { kind: 'fireworks', color: '#FF6F91' }, description: 'Bùng nổ cả màn hình' },
  { id: 'fx_entry_star', name: 'Hiệu Ứng Vào Phòng Sao', type: 'entry', rarity: 'rare', payload: { kind: 'stars', color: '#7C6BFF' }, description: 'Xuất hiện thật ngầu' },
  // Board themes
  { id: 'board_wood', name: 'Bàn Gỗ Truyền Thống', type: 'boardtheme', rarity: 'common', payload: { from: '#E8C39E', to: '#B9825A', line: '#8C5A32' }, description: 'Cho Caro & Ô ăn quan' },
  { id: 'board_neon', name: 'Bàn Neon', type: 'boardtheme', rarity: 'epic', payload: { from: '#2B2B5A', to: '#101033', line: '#5AE0FF' }, description: 'Phong cách hiện đại' },
];

const QUESTS = [
  { id: 'q_daily_play3', type: 'daily', title: 'Chơi 3 trận', description: 'Hoàn thành 3 trận bất kỳ', metric: 'play_match', target: 3, rewardCoin: 120, rewardXp: 80, rewardDiamond: 0, gameType: null },
  { id: 'q_daily_win1', type: 'daily', title: 'Thắng 1 trận', description: 'Giành chiến thắng 1 trận', metric: 'win_match', target: 1, rewardCoin: 100, rewardXp: 60, rewardDiamond: 1, gameType: null },
  { id: 'q_daily_caro', type: 'daily', title: 'Cao thủ Caro', description: 'Chơi 2 trận Caro', metric: 'play_match', target: 2, rewardCoin: 80, rewardXp: 50, rewardDiamond: 0, gameType: 'caro' },
  { id: 'q_daily_chat', type: 'daily', title: 'Giao lưu', description: 'Chơi cùng bạn bè 1 trận', metric: 'play_with_friend', target: 1, rewardCoin: 90, rewardXp: 70, rewardDiamond: 0, gameType: null },
  { id: 'q_weekly_play20', type: 'weekly', title: 'Cày cuốc tuần này', description: 'Chơi 20 trận trong tuần', metric: 'play_match', target: 20, rewardCoin: 600, rewardXp: 400, rewardDiamond: 5, gameType: null },
  { id: 'q_weekly_win8', type: 'weekly', title: 'Chuỗi thắng', description: 'Thắng 8 trận trong tuần', metric: 'win_match', target: 8, rewardCoin: 800, rewardXp: 500, rewardDiamond: 8, gameType: null },
  { id: 'q_weekly_chess', type: 'weekly', title: 'Chiếu tướng', description: 'Thắng 3 ván Cờ Vua trong tuần', metric: 'win_match', target: 3, rewardCoin: 400, rewardXp: 300, rewardDiamond: 3, gameType: 'chess' },

  // Nhiệm vụ của sự kiện: cùng bảng `quests`, chỉ khác là có `eventId` nên
  // chúng hiện trong thẻ sự kiện chứ không trộn vào màn Nhiệm vụ. Khung thời
  // gian lấy theo sự kiện, đặt trong ensureSeed().
  { id: 'q_ev_login_3', type: 'event', title: 'Điểm danh 3 ngày', description: 'Điểm danh 3 ngày trong thời gian sự kiện', metric: 'checkin', target: 3, rewardCoin: 400, rewardXp: 250, rewardDiamond: 3, gameType: null, eventId: 'ev_login' },
  { id: 'q_ev_login_7', type: 'event', title: 'Điểm danh 7 ngày', description: 'Điểm danh đủ 7 ngày để nhận phần lớn', metric: 'checkin', target: 7, rewardCoin: 1000, rewardXp: 600, rewardDiamond: 10, gameType: null, eventId: 'ev_login' },
  { id: 'q_ev_streak_win5', type: 'event', title: 'Thắng 5 trận', description: 'Giành 5 chiến thắng trong thời gian sự kiện', metric: 'win_match', target: 5, rewardCoin: 700, rewardXp: 450, rewardDiamond: 6, gameType: null, eventId: 'ev_streak' },
  { id: 'q_ev_streak_play15', type: 'event', title: 'Chơi 15 trận', description: 'Chơi 15 trận bất kỳ trong thời gian sự kiện', metric: 'play_match', target: 15, rewardCoin: 500, rewardXp: 350, rewardDiamond: 4, gameType: null, eventId: 'ev_streak' },
  { id: 'q_ev_tour_caro', type: 'event', title: 'Khởi động Caro', description: 'Chơi 5 ván Caro để làm nóng trước giải', metric: 'play_match', target: 5, rewardCoin: 450, rewardXp: 300, rewardDiamond: 3, gameType: 'caro', eventId: 'ev_tournament' },
];

const ACHIEVEMENTS = [
  // Bỏ Battle Pass rồi thì đây là nguồn cosmetic duy nhất, nên danh sách phải
  // phủ hết 19 món — mỗi thành tựu tặng một món, khó dần thì hiếm dần.
  { id: 'ach_first_win', title: 'Chiến Thắng Đầu Tiên', description: 'Thắng trận đầu tiên', metric: 'wins', target: 1, rewardCoin: 200, rewardXp: 150, rewardItem: 'title_newbie', art: 'star' },
  { id: 'ach_win_5', title: 'Bắt Nhịp', description: 'Thắng 5 trận', metric: 'wins', target: 5, rewardCoin: 300, rewardXp: 220, rewardItem: 'bubble_cloud', art: 'happy' },
  { id: 'ach_win_10', title: 'Tay Chơi Cứng', description: 'Thắng 10 trận', metric: 'wins', target: 10, rewardCoin: 500, rewardXp: 350, rewardItem: 'frame_mint', art: 'flame' },
  { id: 'ach_win_25', title: 'Có Số Có Má', description: 'Thắng 25 trận', metric: 'wins', target: 25, rewardCoin: 900, rewardXp: 600, rewardItem: 'board_wood', art: 'medal-3' },
  { id: 'ach_win_50', title: 'Sát Thủ Bàn Cờ', description: 'Thắng 50 trận', metric: 'wins', target: 50, rewardCoin: 1600, rewardXp: 1100, rewardItem: 'fx_confetti', art: 'medal-2' },
  { id: 'ach_win_100', title: 'Huyền Thoại', description: 'Thắng 100 trận', metric: 'wins', target: 100, rewardCoin: 3000, rewardXp: 2000, rewardItem: 'fx_fireworks', art: 'crown' },
  { id: 'ach_win_250', title: 'Bất Khả Chiến Bại', description: 'Thắng 250 trận', metric: 'wins', target: 250, rewardCoin: 7000, rewardXp: 4500, rewardItem: 'title_caro_king', art: 'medal-1' },
  { id: 'ach_win_500', title: 'Tượng Đài', description: 'Thắng 500 trận', metric: 'wins', target: 500, rewardCoin: 15000, rewardXp: 9000, rewardItem: 'frame_dragon', art: 'trophy' },

  { id: 'ach_match_10', title: 'Làm Quen Sân Chơi', description: 'Chơi 10 trận', metric: 'matches', target: 10, rewardCoin: 250, rewardXp: 180, rewardItem: 'bg_bamboo', art: 'dice' },
  { id: 'ach_match_50', title: 'Khách Quen', description: 'Chơi 50 trận', metric: 'matches', target: 50, rewardCoin: 800, rewardXp: 550, rewardItem: 'bubble_candy', art: 'ui-chat' },
  { id: 'ach_match_100', title: '100 Trận Đấu', description: 'Chơi 100 trận', metric: 'matches', target: 100, rewardCoin: 1500, rewardXp: 1000, rewardItem: 'bg_beach', art: 'target' },
  { id: 'ach_match_250', title: 'Cày Không Ngừng', description: 'Chơi 250 trận', metric: 'matches', target: 250, rewardCoin: 3500, rewardXp: 2400, rewardItem: 'frame_sakura', art: 'flame' },
  { id: 'ach_match_500', title: 'Ở Lì Trong Game', description: 'Chơi 500 trận', metric: 'matches', target: 500, rewardCoin: 7000, rewardXp: 5000, rewardItem: 'bg_night', art: 'moon' },
  { id: 'ach_match_1000', title: '1000 Trận Đấu', description: 'Chơi 1000 trận', metric: 'matches', target: 1000, rewardCoin: 12000, rewardXp: 8000, rewardItem: 'board_neon', art: 'trophy' },

  { id: 'ach_friends_1', title: 'Người Bạn Đầu Tiên', description: 'Kết bạn với 1 người', metric: 'friends', target: 1, rewardCoin: 150, rewardXp: 100, rewardItem: 'fx_entry_star', art: 'handshake' },
  { id: 'ach_friends_5', title: 'Bạn Bè Bốn Phương', description: 'Kết bạn với 5 người', metric: 'friends', target: 5, rewardCoin: 300, rewardXp: 200, rewardItem: 'emote_pack_cute', art: 'users' },
  { id: 'ach_friends_15', title: 'Giao Thiệp Rộng', description: 'Kết bạn với 15 người', metric: 'friends', target: 15, rewardCoin: 900, rewardXp: 650, rewardItem: 'emote_pack_troll', art: 'ui-friends' },
  { id: 'ach_friends_30', title: 'Trùm Quan Hệ', description: 'Kết bạn với 30 người', metric: 'friends', target: 30, rewardCoin: 2000, rewardXp: 1400, rewardItem: 'title_wolf', art: 'ui-friends' },
  { id: 'ach_friends_50', title: 'Ai Cũng Biết Bạn', description: 'Kết bạn với 50 người', metric: 'friends', target: 50, rewardCoin: 4000, rewardXp: 2800, rewardItem: 'frame_royal', art: 'crown' },

  // Điểm danh: 19 món cosmetic đã chia hết cho các mốc trên, nên hai mốc này
  // thưởng Coin/XP thôi. Thêm món mới thì gắn vào đây trước.
  { id: 'ach_checkin_7', title: 'Chăm Chỉ', description: 'Điểm danh 7 ngày', metric: 'checkin', target: 7, rewardCoin: 400, rewardXp: 300, rewardItem: null, art: 'star' },
  { id: 'ach_checkin_30', title: 'Ngày Nào Cũng Ghé', description: 'Điểm danh 30 ngày', metric: 'checkin', target: 30, rewardCoin: 2000, rewardXp: 1500, rewardItem: null, art: 'medal-1' },
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
    `INSERT INTO items (id, name, type, rarity, payload, description)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, payload=excluded.payload, description=excluded.description`,
  );
  ITEMS.forEach((i) => upsertItem.run(i.id, i.name, i.type, i.rarity, JSON.stringify(i.payload), i.description));

  const upsertQuest = db.prepare(
    `INSERT INTO quests (id, type, title, description, metric, target, reward_coin, reward_xp, reward_diamond, game_type, event_id, start_at, end_at, active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, target=excluded.target, event_id=excluded.event_id,
       start_at=excluded.start_at, end_at=excluded.end_at`,
  );

  const upsertAch = db.prepare(
    `INSERT INTO achievements (id, title, description, metric, target, reward_coin, reward_xp, reward_item, art)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, reward_item=excluded.reward_item, art=excluded.art`,
  );
  ACHIEVEMENTS.forEach((a) =>
    upsertAch.run(a.id, a.title, a.description, a.metric, a.target, a.rewardCoin, a.rewardXp, a.rewardItem, a.art),
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

  // Chạy sau khi có sự kiện: nhiệm vụ sự kiện mượn luôn khung thời gian của sự
  // kiện sinh ra nó, không thì sự kiện hết mà nhiệm vụ vẫn còn.
  const eventWindow = db.prepare('SELECT start_at, end_at FROM events WHERE id = ?');
  QUESTS.forEach((q) => {
    const ev = (q as any).eventId
      ? (eventWindow.get((q as any).eventId) as { start_at: number; end_at: number } | undefined)
      : undefined;
    upsertQuest.run(
      q.id,
      q.type,
      q.title,
      q.description,
      q.metric,
      q.target,
      q.rewardCoin,
      q.rewardXp,
      q.rewardDiamond,
      q.gameType,
      (q as any).eventId ?? null,
      ev?.start_at ?? null,
      ev?.end_at ?? null,
    );
  });

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
    [
      'frame_sakura',
      'title_newbie',
      'bubble_candy',
      'bg_beach',
      'board_wood',
      'fx_confetti',
      'fx_entry_star',
      'emote_pack_cute',
      // Mỗi món một loại khác nhau nên trang bị được hết cùng lúc; cờ equipped
      // ở đây phải khớp với các cột trên hồ sơ ngay bên dưới.
    ].forEach((itemId) =>
      db.prepare('INSERT OR IGNORE INTO inventory (user_id, item_id, quantity, equipped, acquired_at) VALUES (?,?,1,1,?)').run(
        demoId,
        itemId,
        nowMs(),
      ),
    );
    db.prepare(
      `UPDATE profiles SET frame_id = 'frame_sakura', title_id = 'title_newbie',
         background_id = 'bg_beach', bubble_id = 'bubble_candy', board_id = 'board_wood',
         victory_id = 'fx_confetti', entry_id = 'fx_entry_star', emote_id = 'emote_pack_cute'
       WHERE user_id = ?`,
    ).run(demoId);

    // Hai giải mở sẵn để màn Giải đấu có cái mà xem ngay lần chạy đầu.
    [
      { name: 'Cúp Cờ Caro Mùa Hè', game: 'caro', size: 8, entry: 100, prize: 1000 },
      { name: 'Giải Cờ Vua Chớp Nhoáng', game: 'chess', size: 4, entry: 0, prize: 600 },
    ].forEach((c, ci) => {
      const tid = nid();
      db.prepare(
        `INSERT INTO tournaments (id, name, game_type, size, entry_coin, base_prize, status, created_at)
         VALUES (?,?,?,?,?,?,'open',?)`,
      ).run(tid, c.name, c.game, c.size, c.entry, c.prize, nowMs());
      // Đăng ký sẵn vài người, nhưng chừa chỗ để demo bấm được nút đăng ký.
      others.slice(ci, ci + c.size - 2).forEach((u) =>
        db.prepare('INSERT OR IGNORE INTO tournament_players (tournament_id, user_id, seed, joined_at) VALUES (?,?,0,?)').run(
          tid,
          u.id,
          nowMs(),
        ),
      );
    });

    // Vài bang sẵn có để màn Bang hội không trống trơn lúc mới cài.
    const GUILDS = [
      { name: 'Hội Cừu Vui Vẻ', tag: 'CUU', emblem: 'crown', color: '#7C6BFF', policy: 'open', xp: 2400 },
      { name: 'Liên Minh Chibi', tag: 'CHIBI', emblem: 'star', color: '#FF6B8A', policy: 'request', xp: 1150 },
      { name: 'Bến Cảng Bắn Tàu', tag: 'TAU', emblem: 'fire', color: '#2FA9F5', policy: 'open', xp: 480 },
    ];
    GUILDS.forEach((g, i) => {
      const gid = nid();
      // Mỗi bang một chủ khác nhau, lấy lần lượt từ danh sách người chơi demo.
      const owner = others[i % others.length];
      db.prepare(
        `INSERT INTO guilds (id, name, tag, description, emblem, color, owner_id, join_policy, min_level, xp, created_at)
         VALUES (?,?,?,?,?,?,?,?,1,?,?)`,
      ).run(
        gid,
        g.name,
        g.tag,
        'Bang vui vẻ, chơi là chính. Vào chào nhau một câu nhé!',
        g.emblem,
        g.color,
        owner.id,
        g.policy,
        g.xp,
        nowMs(),
      );
      db.prepare("INSERT INTO channels (id, kind, ref_id, created_at) VALUES (?,'guild',?,?)").run(
        `guild:${gid}`,
        gid,
        nowMs(),
      );
      // Chủ bang cộng thêm vài người nữa cho danh sách thành viên có cái mà xem.
      others.slice(i, i + 3).forEach((m, k) => {
        db.prepare(
          'INSERT OR IGNORE INTO guild_members (guild_id, user_id, role, points, joined_at) VALUES (?,?,?,?,?)',
        ).run(gid, m.id, k === 0 ? 'owner' : k === 1 ? 'officer' : 'member', Math.round(g.xp / (k + 2)), nowMs());
        db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?,?)').run(`guild:${gid}`, m.id);
      });
    });

    console.log(`Seeded users: admin/admin123 (id=${adminId}), demo/demo123 (id=${demoId}), +${others.length} demo players`);
  }
}

if (require.main === module) {
  ensureSeed();
  console.log('Seed complete');
}
