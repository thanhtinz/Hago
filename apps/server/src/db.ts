import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Kho dữ liệu lâu dài: tài khoản, bạn bè, tin nhắn.
 *
 * **SQLite qua `node:sqlite`**, không phải Postgres, và đây là lựa chọn có ý
 * thức. Hồ sơ người chơi, danh sách bạn và tin nhắn là dữ liệu quan hệ nhỏ,
 * đọc nhiều ghi ít, một máy chủ phục vụ. SQLite làm đúng việc đó mà không cần
 * dựng thêm một dịch vụ nào, không thêm một dependency nào (`node:sqlite` nằm
 * sẵn trong Node 22), và tệp `.db` sao lưu bằng cách chép một tệp.
 *
 * **Chỗ nó sẽ hết cửa, nói trước:** một tiến trình ghi tại một thời điểm. Khi
 * nào cần chạy nhiều tiến trình máy chủ thì phải đổi sang Postgres. Mọi câu
 * lệnh ở đây là SQL chuẩn nên đường đổi là đổi driver, không phải viết lại.
 *
 * **Trận đấu KHÔNG nằm ở đây.** Ván đang chạy vẫn sống trong bộ nhớ của
 * `Rooms` như cũ. Trộn hai thứ vào một chỗ là biến mỗi nước cờ thành một lần
 * ghi đĩa.
 */

export interface User {
  id: string;
  /** Tên hiển thị, đổi được. Không phải khoá. */
  name: string;
  /** Email đăng nhập, hoặc null nếu chỉ đăng nhập bằng Google. */
  email: string | null;
  /** `sub` của Google, hoặc null. */
  googleId: string | null;
  avatar: string | null;
  createdAt: number;
  /** Một dòng tự giới thiệu, hoặc null. */
  bio: string | null;
}

export interface UserRow extends User {
  passHash: string | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  google_id  TEXT UNIQUE,
  pass_hash  TEXT,
  avatar     TEXT,
  created_at INTEGER NOT NULL,
  -- Một dòng tự giới thiệu. Ngắn cố ý: chỗ này là hồ sơ người chơi cờ,
  -- không phải trang blog.
  bio        TEXT,
  -- Lần đổi tên gần nhất, để chặn đổi tên liên tục. Đổi tên xoành xoạch là
  -- cách né danh tiếng xấu mà vẫn giữ nguyên bạn bè và lịch sử.
  renamed_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- Thành tích, cộng dồn theo bộ môn. Tách khỏi users để thêm bộ môn không
-- phải thêm cột.
CREATE TABLE IF NOT EXISTS stats (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  win     INTEGER NOT NULL DEFAULT 0,
  draw    INTEGER NOT NULL DEFAULT 0,
  loss    INTEGER NOT NULL DEFAULT 0,
  -- Elo, mỗi bộ môn một thang riêng. Mạnh cờ caro không nói gì về cờ vây.
  rating  INTEGER NOT NULL DEFAULT 1200,
  best    INTEGER NOT NULL DEFAULT 1200,
  PRIMARY KEY (user_id, game_id)
);

-- Lịch sử trận. Một hàng một ván, hai người cùng đọc một hàng.
--
-- Đây là thứ làm trang cá nhân có nội dung thật: "thắng 12 thua 3" là con số
-- chết, còn "hôm qua thắng Bình 3 ván cờ gánh liên tiếp" là thứ người ta mở
-- app ra xem. Cũng là nguồn duy nhất tính được chuỗi thắng.
CREATE TABLE IF NOT EXISTS matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id    TEXT NOT NULL,
  code       TEXT NOT NULL,
  a_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  b_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- Tên chép lại lúc kết thúc: người kia xoá tài khoản thì lịch sử của mình
  -- vẫn đọc được, thay vì thành một hàng trống.
  a_name     TEXT NOT NULL,
  b_name     TEXT NOT NULL,
  -- 0, 1, hoặc NULL nếu hoà.
  winner     INTEGER,
  reason     TEXT NOT NULL,
  rated      INTEGER NOT NULL,
  -- Điểm Elo đổi bao nhiêu cho ghế 0 (ghế 1 đổi ngược dấu khi không hoà).
  delta_a    INTEGER NOT NULL DEFAULT 0,
  delta_b    INTEGER NOT NULL DEFAULT 0,
  -- Log input của ván, dạng JSON, để phát lại. Không lưu state: state chỉ
  -- là kết quả phát lại log, mà log thì nhỏ hơn nhiều lần và còn dùng
  -- được để xử tranh chấp.
  log        TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS matches_a ON matches(a_id, id);
CREATE INDEX IF NOT EXISTS matches_b ON matches(b_id, id);

-- Quan hệ bạn bè lưu **một hàng cho một cặp**, với a < b theo thứ tự chuỗi.
-- Lưu hai chiều là mời hai hàng lệch nhau: một bên thấy bạn, bên kia không.
CREATE TABLE IF NOT EXISTS friends (
  a          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  b          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'pending' thì "by" là người gửi lời mời; 'accepted' thì "by" vô nghĩa.
  status     TEXT NOT NULL,
  by         TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (a, b),
  CHECK (a < b)
);

-- Tìm bạn của một người phải quét cả bảng nếu không có chỉ mục này: khoá
-- chính là (a, b) nên tra riêng theo cột b không dùng được nó.
CREATE INDEX IF NOT EXISTS friends_b ON friends(b);

-- Chặn thì **một chiều**: tôi chặn anh không có nghĩa anh chặn tôi.
CREATE TABLE IF NOT EXISTS blocks (
  blocker    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker, blocked)
);

-- Tin nhắn. "channel" là nơi nhắn:
--   'chung'        sảnh chung
--   'rieng:<a>|<b>' nhắn riêng, hai id sắp xếp nên hai bên cùng một kênh
--   'phong:<mã>'    trong một phòng đấu
--   'he-thong'      thông báo hệ thống cho tất cả
-- "to" khác null là thông báo hệ thống gửi riêng một người.
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  channel    TEXT NOT NULL,
  from_id    TEXT,
  to_id      TEXT,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_channel ON messages(channel, id);
CREATE INDEX IF NOT EXISTS messages_to ON messages(to_id, id);
-- Đếm tin chưa đọc quét theo người gửi trong từng kênh; không có chỉ mục
-- này thì mỗi lần mở app là một lần quét toàn bộ bảng tin nhắn.
CREATE INDEX IF NOT EXISTS messages_from ON messages(from_id, id);

-- Báo cáo người dùng.
--
-- Không có bảng này thì "chặn" là công cụ duy nhất người dùng có, mà chặn
-- chỉ giấu một người khỏi mắt mình: kẻ quấy rối vẫn đi quấy rối người tiếp
-- theo. Một nền tảng có nhắn tin mà không có đường báo cáo là một nền tảng
-- đẩy hết việc xử lý sang phía nạn nhân.
CREATE TABLE IF NOT EXISTS reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'quay-roi' | 'gian-lan' | 'ten-xau' | 'khac'
  reason     TEXT NOT NULL,
  note       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reports_target ON reports(target, id);

-- Đã đọc tới đâu, cho mỗi người mỗi kênh. Một hàng thay cho một cờ "đã đọc"
-- trên từng tin: chưa đọc = đếm tin có id lớn hơn mốc này, một câu truy vấn.
CREATE TABLE IF NOT EXISTS reads (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,
  last_id    INTEGER NOT NULL,
  PRIMARY KEY (user_id, channel)
);
`;

export function openDb(file = process.env.DB_FILE ?? 'data/co.db'): DatabaseSync {
  if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  // WAL cho đọc song song với ghi; foreign_keys phải bật tay ở SQLite, mặc
  // định nó **im lặng bỏ qua** mọi ràng buộc khoá ngoại khai ở trên.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * Thêm cột vào bảng đã có dữ liệu.
 *
 * `CREATE TABLE IF NOT EXISTS` chỉ chạy lần đầu, nên thêm cột vào câu lệnh
 * ở trên **không** đụng tới tệp `.db` đã tồn tại — máy chủ đang chạy thật
 * sẽ báo "no such column" ở đúng câu truy vấn mới. Chạy từng `ALTER` một
 * và bỏ qua lỗi "đã có cột này" là cách di trú rẻ nhất mà vẫn đúng cho một
 * kho SQLite một tiến trình.
 */
function migrate(db: DatabaseSync): void {
  const add = [
    'ALTER TABLE users ADD COLUMN bio TEXT',
    'ALTER TABLE users ADD COLUMN renamed_at INTEGER',
    // Log input của ván, dạng JSON. Đây là thứ duy nhất cần để dựng lại
    // toàn bộ ván: state không phải nguồn chân lý, log mới là (R1).
    'ALTER TABLE matches ADD COLUMN log TEXT',
  ];
  for (const sql of add) {
    try {
      db.exec(sql);
    } catch {
      // Đã có cột rồi. Đây là đường chạy bình thường ở lần mở thứ hai trở đi.
    }
  }
}

/** Cặp bạn bè luôn lưu theo thứ tự chuỗi, để một cặp chỉ có một hàng. */
export function pairOf(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

/** Kênh nhắn riêng giữa hai người — cùng một tên với cả hai bên. */
export function dmChannel(x: string, y: string): string {
  const [a, b] = pairOf(x, y);
  return `rieng:${a}|${b}`;
}
