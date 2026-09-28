import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { pairOf, type User } from './db.js';

/**
 * Tài khoản, phiên đăng nhập, bạn bè, chặn.
 *
 * Tách khỏi tầng HTTP để test bằng cách gọi hàm. Không hàm nào ở đây biết gì
 * về request, response hay header.
 */

const SESSION_DAYS = 60;
const DAY = 86_400_000;

/**
 * Băm mật khẩu bằng **scrypt** với muối riêng từng người.
 *
 * Không dùng SHA-256 thẳng: hàm băm nhanh là thứ làm rò cơ sở dữ liệu trở
 * thành rò mật khẩu. scrypt tốn bộ nhớ nên GPU không nhân được lên hàng tỉ
 * lần thử mỗi giây. `N=16384` là mức chuẩn, tốn ~60ms một lần trên máy chủ
 * bình thường — đủ chậm cho kẻ dò, không đủ chậm để người dùng thấy.
 */
function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

function verifyPassword(pw: string, stored: string): boolean {
  const [alg, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const key = Buffer.from(keyB64, 'base64');
  const got = scryptSync(pw, Buffer.from(saltB64, 'base64'), key.length, { N: 16384, r: 8, p: 1 });
  // So sánh theo thời gian cố định: `===` trả lời sớm ở byte đầu khác nhau,
  // và thời gian trả lời đó đo được qua mạng.
  return timingSafeEqual(key, got);
}

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface Session {
  token: string;
  user: User;
}

interface Row {
  id: string;
  name: string;
  email: string | null;
  google_id: string | null;
  pass_hash: string | null;
  avatar: string | null;
  created_at: number;
}

const toUser = (r: Row): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  googleId: r.google_id,
  avatar: r.avatar,
  createdAt: r.created_at,
});

/** Tên hiển thị: 2–24 ký tự, không có ký tự điều khiển, không khoảng trắng thừa. */
export function cleanName(raw: string): string {
  const n = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 24) throw new AuthError('BAD_NAME', 'Tên phải từ 2 đến 24 ký tự');
  return n;
}

function checkEmail(raw: string): string {
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new AuthError('BAD_EMAIL', 'Email không hợp lệ');
  return e;
}

function checkPassword(pw: string): void {
  // Tám ký tự, không đòi ký tự đặc biệt. Quy tắc phức tạp đẩy người ta tới
  // chỗ đặt "Matkhau@123" rồi dùng lại ở mọi nơi, yếu hơn một câu dài.
  if (pw.length < 8) throw new AuthError('WEAK_PASSWORD', 'Mật khẩu phải từ 8 ký tự trở lên');
  if (pw.length > 200) throw new AuthError('WEAK_PASSWORD', 'Mật khẩu quá dài');
}

export class Accounts {
  constructor(private readonly db: DatabaseSync) {}

  // ---- tài khoản -----------------------------------------------------

  register(nameRaw: string, emailRaw: string, password: string): Session {
    const name = cleanName(nameRaw);
    const email = checkEmail(emailRaw);
    checkPassword(password);
    if (this.byEmail(email)) throw new AuthError('EMAIL_TAKEN', 'Email này đã có tài khoản');
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO users (id, name, email, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, email, hashPassword(password), Date.now());
    return this.openSession(id);
  }

  login(emailRaw: string, password: string): Session {
    const row = this.byEmail(checkEmail(emailRaw));
    // Cùng một lời báo lỗi cho "không có email này" và "sai mật khẩu". Phân
    // biệt hai câu là cho không một công cụ dò xem email nào đã đăng ký.
    const wrong = () => new AuthError('BAD_LOGIN', 'Email hoặc mật khẩu không đúng');
    if (!row?.pass_hash) throw wrong();
    if (!verifyPassword(password, row.pass_hash)) throw wrong();
    return this.openSession(row.id);
  }

  /**
   * Đăng nhập bằng Google, sau khi token đã được xác minh ở nơi khác.
   *
   * Hàm này **không tự tin vào `sub`**: nó nhận `sub` đã qua kiểm chữ ký ở
   * `google.ts`. Nhận thẳng `sub` từ client là để ai cũng đăng nhập vào tài
   * khoản người khác chỉ bằng cách gõ đúng một chuỗi số.
   */
  upsertGoogle(sub: string, email: string | null, name: string, avatar: string | null): Session {
    const found = this.db.prepare('SELECT * FROM users WHERE google_id = ?').get(sub) as unknown as Row | undefined;
    if (found) return this.openSession(found.id);

    // Đã có tài khoản email trùng thì **nối vào tài khoản đó**, không mở tài
    // khoản thứ hai. Người dùng đăng ký bằng email rồi sau bấm Google là
    // chuyện thường, và hai tài khoản trùng email là nguồn khiếu nại kinh điển.
    if (email) {
      const byMail = this.byEmail(email);
      if (byMail) {
        this.db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(sub, byMail.id);
        return this.openSession(byMail.id);
      }
    }
    const id = randomUUID();
    let display: string;
    try {
      display = cleanName(name);
    } catch {
      display = `Người chơi ${id.slice(0, 4)}`;
    }
    this.db
      .prepare('INSERT INTO users (id, name, email, google_id, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, display, email, sub, avatar, Date.now());
    return this.openSession(id);
  }

  user(id: string): User | null {
    const r = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as Row | undefined;
    return r ? toUser(r) : null;
  }

  rename(id: string, nameRaw: string): User {
    const name = cleanName(nameRaw);
    this.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
    const u = this.user(id);
    if (!u) throw new AuthError('NO_USER', 'Không có tài khoản này');
    return u;
  }

  /** Tìm người chơi theo tên, để gửi lời mời kết bạn. */
  search(q: string, exceptId: string, limit = 20): User[] {
    const term = `%${q.trim().replace(/[%_]/g, '')}%`;
    if (q.trim().length < 2) return [];
    const rows = this.db
      .prepare('SELECT * FROM users WHERE name LIKE ? AND id != ? ORDER BY name LIMIT ?')
      .all(term, exceptId, limit) as unknown as Row[];
    return rows.map(toUser);
  }

  private byEmail(email: string): Row | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as Row | undefined;
  }

  // ---- phiên ---------------------------------------------------------

  private openSession(userId: string): Session {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    this.db
      .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, userId, now, now + SESSION_DAYS * DAY);
    const user = this.user(userId);
    if (!user) throw new AuthError('NO_USER', 'Không có tài khoản này');
    return { token, user };
  }

  /** Đổi token lấy người dùng. Hết hạn thì xoá luôn hàng. */
  bearer(token: string): User | null {
    const row = this.db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as
      | { user_id: string; expires_at: number }
      | undefined;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }
    return this.user(row.user_id);
  }

  logout(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  // ---- thành tích ----------------------------------------------------

  recordResult(userId: string, gameId: string, r: 'win' | 'draw' | 'loss'): void {
    this.db
      .prepare(
        `INSERT INTO stats (user_id, game_id, ${r}) VALUES (?, ?, 1)
         ON CONFLICT (user_id, game_id) DO UPDATE SET ${r} = ${r} + 1`,
      )
      .run(userId, gameId);
  }

  stats(userId: string): { gameId: string; win: number; draw: number; loss: number }[] {
    const rows = this.db
      .prepare('SELECT game_id, win, draw, loss FROM stats WHERE user_id = ? ORDER BY game_id')
      .all(userId) as unknown as { game_id: string; win: number; draw: number; loss: number }[];
    return rows.map((r) => ({ gameId: r.game_id, win: r.win, draw: r.draw, loss: r.loss }));
  }

  // ---- bạn bè và chặn ------------------------------------------------

  /**
   * Gửi lời mời kết bạn.
   *
   * Nếu bên kia đã mời mình rồi thì **nhận luôn**, không tạo lời mời thứ hai.
   * Hai người cùng bấm kết bạn trong vài giây là chuyện rất hay xảy ra, và để
   * nó thành hai lời mời treo là bắt cả hai chờ nhau.
   */
  requestFriend(from: string, to: string): 'pending' | 'accepted' {
    if (from === to) throw new AuthError('SELF', 'Không tự kết bạn với mình được');
    if (!this.user(to)) throw new AuthError('NO_USER', 'Không có người chơi này');
    if (this.isBlockedEither(from, to)) throw new AuthError('BLOCKED', 'Không gửi được lời mời');
    const [a, b] = pairOf(from, to);
    const cur = this.db.prepare('SELECT status, by FROM friends WHERE a = ? AND b = ?').get(a, b) as
      | { status: string; by: string }
      | undefined;
    if (cur?.status === 'accepted') return 'accepted';
    if (cur?.status === 'pending') {
      if (cur.by === from) return 'pending';
      this.db.prepare("UPDATE friends SET status = 'accepted' WHERE a = ? AND b = ?").run(a, b);
      return 'accepted';
    }
    this.db
      .prepare("INSERT INTO friends (a, b, status, by, created_at) VALUES (?, ?, 'pending', ?, ?)")
      .run(a, b, from, Date.now());
    return 'pending';
  }

  acceptFriend(me: string, other: string): void {
    const [a, b] = pairOf(me, other);
    const cur = this.db.prepare('SELECT status, by FROM friends WHERE a = ? AND b = ?').get(a, b) as
      | { status: string; by: string }
      | undefined;
    if (!cur || cur.status !== 'pending') throw new AuthError('NO_REQUEST', 'Không có lời mời nào');
    // Chỉ **người nhận** mới nhận được. Không có chốt này thì người gửi tự
    // nhận lời mời của chính mình.
    if (cur.by === me) throw new AuthError('NO_REQUEST', 'Đây là lời mời bạn gửi đi');
    this.db.prepare("UPDATE friends SET status = 'accepted' WHERE a = ? AND b = ?").run(a, b);
  }

  removeFriend(me: string, other: string): void {
    const [a, b] = pairOf(me, other);
    this.db.prepare('DELETE FROM friends WHERE a = ? AND b = ?').run(a, b);
  }

  /** Bạn đã kết, kèm ai là người mời với lời mời còn treo. */
  friends(me: string): { user: User; status: 'accepted' | 'pending'; incoming: boolean }[] {
    const rows = this.db
      .prepare('SELECT a, b, status, by FROM friends WHERE a = ? OR b = ?')
      .all(me, me) as unknown as { a: string; b: string; status: 'accepted' | 'pending'; by: string }[];
    const out: { user: User; status: 'accepted' | 'pending'; incoming: boolean }[] = [];
    for (const r of rows) {
      const otherId = r.a === me ? r.b : r.a;
      const user = this.user(otherId);
      if (!user) continue;
      out.push({ user, status: r.status, incoming: r.status === 'pending' && r.by !== me });
    }
    return out.sort((x, y) => x.user.name.localeCompare(y.user.name, 'vi'));
  }

  areFriends(x: string, y: string): boolean {
    const [a, b] = pairOf(x, y);
    const r = this.db.prepare('SELECT status FROM friends WHERE a = ? AND b = ?').get(a, b) as unknown as { status: string } | undefined;
    return r?.status === 'accepted';
  }

  /**
   * Chặn: bỏ luôn quan hệ bạn bè nếu có.
   *
   * Chặn mà vẫn còn là bạn thì người bị chặn vẫn thấy mình trong danh sách
   * bạn của họ và vẫn bấm rủ tỷ thí được — tức là chặn không làm đúng việc
   * duy nhất người ta bấm nó để làm.
   */
  block(me: string, other: string): void {
    if (me === other) throw new AuthError('SELF', 'Không tự chặn mình được');
    this.removeFriend(me, other);
    this.db.prepare('INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)').run(me, other, Date.now());
  }

  unblock(me: string, other: string): void {
    this.db.prepare('DELETE FROM blocks WHERE blocker = ? AND blocked = ?').run(me, other);
  }

  blocked(me: string): User[] {
    const rows = this.db.prepare('SELECT blocked FROM blocks WHERE blocker = ?').all(me) as unknown as { blocked: string }[];
    return rows.map((r) => this.user(r.blocked)).filter((u): u is User => u !== null);
  }

  /** Một trong hai chặn bên kia. Dùng cho mọi đường gửi tin và mời. */
  isBlockedEither(x: string, y: string): boolean {
    const r = this.db
      .prepare('SELECT 1 AS n FROM blocks WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?)')
      .get(x, y, y, x);
    return r !== undefined;
  }
}
