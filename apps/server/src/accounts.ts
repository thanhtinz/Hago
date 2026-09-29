import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';
import { pairOf, type User } from './db.js';

export interface GameStat {
  gameId: string;
  win: number;
  draw: number;
  loss: number;
  rating: number;
  best: number;
}

export interface MatchRow {
  id: number;
  gameId: string;
  opponent: string;
  opponentId: string | null;
  result: 'win' | 'draw' | 'loss';
  reason: string;
  rated: boolean;
  delta: number;
  at: number;
}

/**
 * Elo, một thang riêng cho mỗi bộ môn.
 *
 * `K` lớn trong 30 ván đầu để điểm bò tới đúng mức nhanh, rồi nhỏ lại để
 * người đã ổn định không nhảy loạn sau một ván xui. Đây là cách mọi liên đoàn
 * cờ làm, và lý do là cùng một lý do: điểm phải vừa nhạy lúc chưa biết gì về
 * người chơi, vừa lì lúc đã biết.
 */
export function eloDelta(mine: number, theirs: number, score: number, played: number): number {
  const k = played < 30 ? 40 : played < 100 ? 24 : 16;
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  return Math.round(k * (score - expected));
}

/**
 * Tài khoản, phiên đăng nhập, bạn bè, chặn.
 *
 * Tách khỏi tầng HTTP để test bằng cách gọi hàm. Không hàm nào ở đây biết gì
 * về request, response hay header.
 */

const SESSION_DAYS = 60;

/**
 * Bao nhiêu ván mới được vào bảng xếp hạng.
 *
 * Elo của người mới nhảy 40 điểm một ván (K=40 dưới 30 ván), nên không có
 * ngưỡng thì thắng một ván là leo lên trên người đã đánh hai trăm ván.
 */
export const MIN_RANKED = 5;

/** Đổi tên một lần mỗi ngày. */
const RENAME_EVERY = 24 * 60 * 60 * 1000;
const DAY = 86_400_000;

/**
 * Băm mật khẩu bằng **scrypt** với muối riêng từng người.
 *
 * Không dùng SHA-256 thẳng: hàm băm nhanh là thứ làm rò cơ sở dữ liệu trở
 * thành rò mật khẩu. scrypt tốn bộ nhớ nên GPU không nhân được lên hàng tỉ
 * lần thử mỗi giây. `N=16384` là mức chuẩn, tốn ~40ms một lần trên máy chủ
 * bình thường — đủ chậm cho kẻ dò, không đủ chậm để người dùng thấy.
 *
 * **Bản bất đồng bộ, không phải `scryptSync`.** Node chỉ có một luồng chạy
 * JavaScript: 40ms đồng bộ mỗi lần đăng nhập nghĩa là khoảng 25 yêu cầu mỗi
 * giây đóng băng toàn bộ máy chủ — `setInterval(tick, 250)` không chạy, đồng
 * hồ mọi ván đứng lại, mọi nước đi treo. Một vòng lặp `curl` đánh sập cả nền
 * tảng mà không cần đoán đúng một mật khẩu nào. Bản bất đồng bộ chạy trên
 * threadpool của libuv nên vòng lặp sự kiện vẫn quay.
 */
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1 } as const;

async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64, PARAMS);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const key = Buffer.from(keyB64, 'base64');
  const got = await scryptAsync(pw, Buffer.from(saltB64, 'base64'), key.length, PARAMS);
  // So sánh theo thời gian cố định: `===` trả lời sớm ở byte đầu khác nhau,
  // và thời gian trả lời đó đo được qua mạng.
  return timingSafeEqual(key, got);
}

/**
 * Một bản băm giả để đốt thời gian khi email không tồn tại.
 *
 * Không có nó thì "email chưa đăng ký" trả lời sau chưa tới một mili giây
 * còn "sai mật khẩu" trả lời sau bốn mươi — hai câu trả lời **giống hệt
 * nhau về chữ** nhưng khác nhau về thời gian, và thời gian thì đo được qua
 * mạng. Đó vẫn là một công cụ dò xem email nào đã có tài khoản.
 */
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(64).toString('base64')}`;

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
  bio: string | null;
  renamed_at: number | null;
}

const toUser = (r: Row): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  googleId: r.google_id,
  avatar: r.avatar,
  createdAt: r.created_at,
  bio: r.bio ?? null,
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

  async register(nameRaw: string, emailRaw: string, password: string): Promise<Session> {
    const name = cleanName(nameRaw);
    const email = checkEmail(emailRaw);
    checkPassword(password);
    if (this.byEmail(email)) throw new AuthError('EMAIL_TAKEN', 'Email này đã có tài khoản');
    const hash = await hashPassword(password);
    // Kiểm lại sau khi băm: băm mất mấy chục mili giây, đủ để hai lần đăng ký
    // cùng một email chen nhau qua được cửa kiểm ở trên.
    if (this.byEmail(email)) throw new AuthError('EMAIL_TAKEN', 'Email này đã có tài khoản');
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO users (id, name, email, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, email, hash, Date.now());
    return this.openSession(id);
  }

  async login(emailRaw: string, password: string): Promise<Session> {
    const row = this.byEmail(checkEmail(emailRaw));
    // Cùng một lời báo lỗi cho "không có email này" và "sai mật khẩu". Phân
    // biệt hai câu là cho không một công cụ dò xem email nào đã đăng ký —
    // và **thời gian trả lời cũng là một câu trả lời**, nên email không tồn
    // tại vẫn phải đốt đúng chừng ấy thời gian băm.
    const wrong = new AuthError('BAD_LOGIN', 'Email hoặc mật khẩu không đúng');
    const ok = await verifyPassword(password, row?.pass_hash ?? DUMMY_HASH);
    if (!row?.pass_hash || !ok) throw wrong;
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

  /**
   * Đổi tên hiển thị.
   *
   * Hai chốt chặn, cả hai đều có lý do cụ thể:
   *
   * - **Không trùng tên người khác.** Danh sách bạn, bảng xếp hạng và lịch
   *   sử trận đều nhận nhau bằng tên; hai người cùng tên thì rủ nhầm, kết
   *   bạn nhầm, và tin nhắn gửi nhầm.
   * - **Một lần mỗi ngày.** Đổi tên xoành xoạch là cách né danh tiếng xấu
   *   mà vẫn giữ nguyên bạn bè, điểm và lịch sử.
   */
  rename(id: string, nameRaw: string, now = Date.now()): User {
    const name = cleanName(nameRaw);
    const cur = this.user(id);
    if (!cur) throw new AuthError('NO_USER', 'Không có tài khoản này');
    if (cur.name === name) return cur;

    const taken = this.db.prepare('SELECT id FROM users WHERE name = ? AND id <> ?').get(name, id);
    if (taken) throw new AuthError('NAME_TAKEN', 'Tên này đã có người dùng');

    const row = this.db.prepare('SELECT renamed_at FROM users WHERE id = ?').get(id) as unknown as { renamed_at: number | null };
    const last = row?.renamed_at ?? 0;
    if (now - last < RENAME_EVERY) {
      const hours = Math.ceil((RENAME_EVERY - (now - last)) / 3_600_000);
      throw new AuthError('TOO_SOON', `Mỗi ngày chỉ đổi tên được một lần. Thử lại sau ${hours} giờ.`);
    }
    this.db.prepare('UPDATE users SET name = ?, renamed_at = ? WHERE id = ?').run(name, now, id);
    const u = this.user(id);
    if (!u) throw new AuthError('NO_USER', 'Không có tài khoản này');
    return u;
  }

  /** Một dòng tự giới thiệu. Rỗng thì xoá hẳn, không lưu chuỗi trắng. */
  setBio(id: string, raw: string): User {
    const bio = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 140);
    this.db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio || null, id);
    const u = this.user(id);
    if (!u) throw new AuthError('NO_USER', 'Không có tài khoản này');
    return u;
  }

  /**
   * Đổi mật khẩu.
   *
   * Đòi mật khẩu cũ kể cả khi đã đăng nhập: một cái máy để quên ở quán cà
   * phê không được biến thành quyền chiếm tài khoản vĩnh viễn.
   *
   * Tài khoản đăng nhập bằng Google chưa có mật khẩu nào thì đây là lần
   * **đặt** mật khẩu đầu tiên, và lần đó không đòi mật khẩu cũ.
   */
  async changePassword(id: string, oldPw: string, newPw: string): Promise<void> {
    const row = this.db.prepare('SELECT pass_hash FROM users WHERE id = ?').get(id) as unknown as { pass_hash: string | null } | undefined;
    if (!row) throw new AuthError('NO_USER', 'Không có tài khoản này');
    if (row.pass_hash) {
      const ok = await verifyPassword(oldPw, row.pass_hash);
      if (!ok) throw new AuthError('BAD_PASSWORD', 'Mật khẩu hiện tại không đúng');
    }
    checkPassword(newPw);
    this.db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(await hashPassword(newPw), id);
  }

  /** Người này đã đặt mật khẩu chưa. Tài khoản Google thuần thì chưa. */
  hasPassword(id: string): boolean {
    const row = this.db.prepare('SELECT pass_hash FROM users WHERE id = ?').get(id) as unknown as { pass_hash: string | null } | undefined;
    return !!row?.pass_hash;
  }

  /**
   * Toàn bộ dữ liệu của một người, để tải về.
   *
   * Không phải một tính năng trang trí: người dùng có quyền cầm dữ liệu
   * của mình đi, và một nền tảng không cho họ làm thế thì cũng không có gì
   * để nói khi họ hỏi mình đang giữ những gì.
   */
  exportAll(id: string): unknown {
    const u = this.user(id);
    if (!u) throw new AuthError('NO_USER', 'Không có tài khoản này');
    return {
      taiKhoan: u,
      thanhTich: this.stats(id),
      lichSuTran: this.history(id, { limit: 10_000 }).rows,
      banBe: this.friends(id).map((f) => ({ ten: f.user.name, trangThai: f.status, denTuHo: f.incoming })),
      daChan: this.blocked(id).map((x) => x.name),
      phienDangMo: this.sessions(id),
      xuatLuc: new Date().toISOString(),
    };
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

  /**
   * Xoá tài khoản, không hoàn lại được.
   *
   * Khoá ngoại lo phần dọn: phiên, thành tích, bạn bè, chặn đều đi theo. Riêng
   * `matches` để `ON DELETE SET NULL` và đã chép sẵn tên — lịch sử của **đối
   * thủ** không được biến mất chỉ vì mình xoá tài khoản.
   */
  deleteUser(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  setAvatar(id: string, avatar: string | null): User {
    this.db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id);
    const u = this.user(id);
    if (!u) throw new AuthError('NO_USER', 'Không có tài khoản này');
    return u;
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

  /**
   * Dọn phiên đã hết hạn.
   *
   * `bearer` chỉ xoá đúng hàng nó vừa đụng tới, nên phiên của một người
   * không bao giờ quay lại thì nằm lại vĩnh viễn. Sáu mươi ngày một phiên,
   * mỗi lần đăng nhập một hàng mới — bảng chỉ có một chiều là lớn lên.
   */
  sweepSessions(now = Date.now()): number {
    const r = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    return Number(r.changes ?? 0);
  }

  /**
   * Những phiên đang mở của một người, mới nhất trước.
   *
   * Token **không bao giờ trả ra ngoài** — chỉ trả sáu ký tự cuối để người
   * dùng nhận ra phiên nào là cái máy đang cầm trên tay. Trả cả token là
   * biến trang "quản lý thiết bị" thành trang phát chìa khoá.
   */
  sessions(userId: string): { id: string; createdAt: number; expiresAt: number }[] {
    return this.db
      .prepare('SELECT token, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId)
      .map((r) => {
        const row = r as unknown as { token: string; created_at: number; expires_at: number };
        return { id: row.token.slice(-6), createdAt: row.created_at, expiresAt: row.expires_at };
      });
  }

  /** Đăng xuất mọi nơi trừ phiên đang dùng. */
  logoutOthers(userId: string, keep: string): number {
    const r = this.db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(userId, keep);
    return Number(r.changes ?? 0);
  }

  // ---- thành tích, điểm và lịch sử -----------------------------------

  private statRow(userId: string, gameId: string): { win: number; draw: number; loss: number; rating: number; best: number } {
    this.db.prepare('INSERT OR IGNORE INTO stats (user_id, game_id) VALUES (?, ?)').run(userId, gameId);
    return this.db.prepare('SELECT win, draw, loss, rating, best FROM stats WHERE user_id = ? AND game_id = ?').get(userId, gameId) as unknown as {
      win: number;
      draw: number;
      loss: number;
      rating: number;
      best: number;
    };
  }

  /**
   * Ghi một ván đã kết thúc: thành tích, điểm, và một hàng lịch sử.
   *
   * Cả ba đi cùng nhau trong **một transaction**. Cộng thành tích xong mà ngã
   * trước khi ghi lịch sử là để lại một hồ sơ tự mâu thuẫn — 13 trận trong ô
   * tổng nhưng 12 dòng trong danh sách — và không có cách nào biết dòng nào
   * thiếu.
   */
  recordMatch(m: {
    gameId: string;
    code: string;
    seats: [string | null, string | null];
    names: [string, string];
    winner: number | null;
    reason: string;
    rated: boolean;
    /** Log input của ván, dạng JSON, để phát lại. */
    log?: string;
    /** Điểm đổi bao nhiêu cho từng ghế. Trả ra để tầng ngoài báo cho người chơi. */
  }): { delta: [number, number] } {
    const [a, b] = m.seats;
    let dA = 0;
    let dB = 0;
    if (m.rated && a && b) {
      const ra = this.statRow(a, m.gameId).rating;
      const rb = this.statRow(b, m.gameId).rating;
      const sa = m.winner === null ? 0.5 : m.winner === 0 ? 1 : 0;
      dA = eloDelta(ra, rb, sa, this.played(a, m.gameId));
      dB = eloDelta(rb, ra, 1 - sa, this.played(b, m.gameId));
    }

    const tx = () => {
      for (const [seat, id] of [a, b].entries()) {
        if (!id) continue;
        const r = m.winner === null ? 'draw' : m.winner === seat ? 'win' : 'loss';
        const d = seat === 0 ? dA : dB;
        this.statRow(id, m.gameId);
        this.db
          .prepare(
            `UPDATE stats SET ${r} = ${r} + 1, rating = rating + ?, best = MAX(best, rating + ?)
             WHERE user_id = ? AND game_id = ?`,
          )
          .run(d, d, id, m.gameId);
      }
      this.db
        .prepare(
          `INSERT INTO matches (game_id, code, a_id, b_id, a_name, b_name, winner, reason, rated, delta_a, delta_b, log, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(m.gameId, m.code, a, b, m.names[0], m.names[1], m.winner, m.reason, m.rated ? 1 : 0, dA, dB, m.log ?? null, Date.now());
    };
    this.db.exec('BEGIN');
    try {
      tx();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return { delta: [dA, dB] };
  }

  private played(userId: string, gameId: string): number {
    const r = this.statRow(userId, gameId);
    return r.win + r.draw + r.loss;
  }

  /**
   * Bảng xếp hạng.
   *
   * **Ngưỡng năm ván** để có tên: không có ngưỡng thì người mới đăng ký
   * thắng đúng một ván đã leo lên trên người đã đánh hai trăm ván, vì
   * Elo của họ nhảy 40 điểm từ mốc 1200 trong khi K của người kia còn 16.
   * Một bảng xếp hạng mà đứng đầu là người chơi một ván thì không ai tin
   * nó lần thứ hai.
   *
   * `gameId` rỗng là bảng **tổng**: cộng phần điểm vượt mốc 1200 của mọi
   * bộ môn đã đủ ngưỡng. Định nghĩa này có một lý do: nó thưởng cho việc
   * giỏi ở nhiều bộ môn thay vì cày một bộ môn, mà đó đúng là điều một
   * nền tảng mười ba bộ môn muốn khuyến khích. Cộng thẳng Elo thì người
   * chơi ba bộ môn ở mức trung bình vẫn hơn người xuất sắc một bộ môn chỉ
   * vì 1200 × 3 > 1400.
   */
  leaderboard(gameId: string | null, limit = 50): { user: User; rating: number; played: number; win: number }[] {
    const rows = gameId
      ? (this.db
          .prepare(
            `SELECT s.user_id, s.rating AS rating, s.win + s.draw + s.loss AS played, s.win AS win
             FROM stats s WHERE s.game_id = ? AND s.win + s.draw + s.loss >= ?
             ORDER BY rating DESC, played DESC LIMIT ?`,
          )
          .all(gameId, MIN_RANKED, limit) as unknown as { user_id: string; rating: number; played: number; win: number }[])
      : (this.db
          .prepare(
            `SELECT s.user_id, SUM(s.rating - 1200) AS rating, SUM(s.win + s.draw + s.loss) AS played, SUM(s.win) AS win
             FROM stats s WHERE s.win + s.draw + s.loss >= ?
             GROUP BY s.user_id ORDER BY rating DESC, played DESC LIMIT ?`,
          )
          .all(MIN_RANKED, limit) as unknown as { user_id: string; rating: number; played: number; win: number }[]);
    const out: { user: User; rating: number; played: number; win: number }[] = [];
    if (!rows.length) return out;
    // Một câu cho tất cả người dùng, không hỏi từng người một.
    const ids = rows.map((r) => r.user_id);
    const users = new Map<string, User>();
    for (const u of this.db.prepare(`SELECT * FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)) {
      const row = u as unknown as Row;
      users.set(row.id, toUser(row));
    }
    for (const r of rows) {
      const u = users.get(r.user_id);
      if (u) out.push({ user: u, rating: r.rating, played: r.played, win: r.win });
    }
    return out;
  }

  /**
   * Hạng của một người, đếm từ 1. `null` nếu chưa đủ ngưỡng để có tên.
   *
   * Tách khỏi `leaderboard` vì hạng của mình phải hiện **kể cả khi mình
   * đứng thứ ba trăm** — đó mới là con số người ta mở bảng ra để xem.
   */
  rankOf(userId: string, gameId: string | null): { rank: number; rating: number; played: number } | null {
    if (gameId) {
      const mine = this.db
        .prepare('SELECT rating, win + draw + loss AS played FROM stats WHERE user_id = ? AND game_id = ?')
        .get(userId, gameId) as unknown as { rating: number; played: number } | undefined;
      if (!mine || mine.played < MIN_RANKED) return null;
      const above = this.db
        .prepare('SELECT COUNT(*) AS n FROM stats WHERE game_id = ? AND win + draw + loss >= ? AND rating > ?')
        .get(gameId, MIN_RANKED, mine.rating) as unknown as { n: number };
      return { rank: above.n + 1, rating: mine.rating, played: mine.played };
    }
    const mine = this.db
      .prepare('SELECT SUM(rating - 1200) AS rating, SUM(win + draw + loss) AS played FROM stats WHERE user_id = ? AND win + draw + loss >= ?')
      .get(userId, MIN_RANKED) as unknown as { rating: number | null; played: number | null };
    if (mine?.rating === null || mine?.played === null || mine === undefined) return null;
    const above = this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM (
           SELECT user_id, SUM(rating - 1200) AS r FROM stats WHERE win + draw + loss >= ? GROUP BY user_id
         ) WHERE r > ?`,
      )
      .get(MIN_RANKED, mine.rating) as unknown as { n: number };
    return { rank: above.n + 1, rating: mine.rating, played: mine.played };
  }

  stats(userId: string): GameStat[] {
    const rows = this.db
      .prepare('SELECT game_id, win, draw, loss, rating, best FROM stats WHERE user_id = ? ORDER BY game_id')
      .all(userId) as unknown as { game_id: string; win: number; draw: number; loss: number; rating: number; best: number }[];
    return rows
      .filter((r) => r.win + r.draw + r.loss > 0)
      .map((r) => ({ gameId: r.game_id, win: r.win, draw: r.draw, loss: r.loss, rating: r.rating, best: r.best }));
  }

  /**
   * Lịch sử trận, mới nhất trước, đã xoay về góc nhìn của người đang xem.
   *
   * Phân trang theo **con trỏ `before`**, không theo số trang. Danh sách này
   * mọc thêm ở đầu mỗi khi người ta đánh xong một ván, nên `OFFSET 20` sẽ trả
   * lại một hàng đã thấy ở trang trước — lỗi kinh điển của phân trang theo số
   * trang trên dữ liệu đang chạy. `id` tăng đều nên `id < before` thì luôn
   * đúng, dù có bao nhiêu ván chen vào giữa hai lần bấm.
   */
  history(userId: string, opts: { limit?: number; before?: number; gameId?: string } = {}): { rows: MatchRow[]; more: boolean; total: number } {
    const limit = Math.min(Math.max(1, opts.limit ?? 20), 100);
    const where: string[] = ['(a_id = ? OR b_id = ?)'];
    const args: (string | number)[] = [userId, userId];
    if (opts.gameId) {
      where.push('game_id = ?');
      args.push(opts.gameId);
    }
    const filter = where.join(' AND ');

    const total = (this.db.prepare(`SELECT COUNT(*) AS n FROM matches WHERE ${filter}`).get(...args) as unknown as { n: number }).n;

    const page = [...args];
    let cursor = '';
    if (opts.before !== undefined) {
      cursor = ' AND id < ?';
      page.push(opts.before);
    }
    // Lấy dư một hàng để biết còn trang sau hay không, thay vì đếm lần nữa.
    const raw = this.db
      .prepare(
        `SELECT id, game_id, a_id, b_id, a_name, b_name, winner, reason, rated, delta_a, delta_b, created_at
         FROM matches WHERE ${filter}${cursor} ORDER BY id DESC LIMIT ?`,
      )
      .all(...page, limit + 1) as unknown as {
      id: number;
      game_id: string;
      a_id: string | null;
      b_id: string | null;
      a_name: string;
      b_name: string;
      winner: number | null;
      reason: string;
      rated: number;
      delta_a: number;
      delta_b: number;
      created_at: number;
    }[];

    const more = raw.length > limit;
    const rows = raw.slice(0, limit).map((r) => {
      const mine = r.a_id === userId ? 0 : 1;
      return {
        id: r.id,
        gameId: r.game_id,
        opponent: mine === 0 ? r.b_name : r.a_name,
        opponentId: (mine === 0 ? r.b_id : r.a_id) ?? null,
        result: r.winner === null ? ('draw' as const) : r.winner === mine ? ('win' as const) : ('loss' as const),
        reason: r.reason,
        rated: r.rated === 1,
        delta: mine === 0 ? r.delta_a : r.delta_b,
        at: r.created_at,
      };
    });
    return { rows, more, total };
  }

  /**
   * Chuỗi hiện tại: **liên tiếp cùng một kết quả**, tính từ ván gần nhất.
   *
   * Hoà cắt chuỗi. Coi hoà là "không phá chuỗi thắng" thì một người hoà mười
   * ván giữa hai ván thắng vẫn được ghi chuỗi 2 — con số đó không mô tả gì.
   */
  streak(userId: string): { kind: 'win' | 'draw' | 'loss'; n: number } | null {
    const h = this.history(userId, { limit: 50 }).rows;
    const first = h[0];
    if (!first) return null;
    let n = 0;
    for (const m of h) {
      if (m.result !== first.result) break;
      n++;
    }
    return { kind: first.result, n };
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

  /**
   * Báo cáo một người dùng.
   *
   * Một lần mỗi người mỗi ngày: báo cáo mười lần một người không làm việc
   * xử lý nhanh hơn, chỉ làm hàng đợi của người xử lý dài ra — và biến
   * chính nó thành một công cụ quấy rối.
   */
  report(me: string, target: string, reason: string, note: string, now = Date.now()): void {
    if (me === target) throw new AuthError('SELF', 'Không tự báo cáo mình được');
    if (!this.user(target)) throw new AuthError('NO_USER', 'Không có người chơi này');
    const kinds = ['quay-roi', 'gian-lan', 'ten-xau', 'khac'];
    if (!kinds.includes(reason)) throw new AuthError('BAD_REASON', 'Lý do không hợp lệ');
    const recent = this.db
      .prepare('SELECT 1 AS n FROM reports WHERE reporter = ? AND target = ? AND created_at > ?')
      .get(me, target, now - 24 * 3_600_000);
    if (recent) throw new AuthError('ALREADY', 'Bạn đã báo cáo người này hôm nay rồi');
    const clean = note.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500);
    this.db
      .prepare('INSERT INTO reports (reporter, target, reason, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(me, target, reason, clean, now);
  }

  /**
   * Một ván đã đánh, kèm log để phát lại.
   *
   * Ai đăng nhập cũng xem được — cùng lý lẽ với bảng xếp hạng: xem lại ván
   * của người giỏi là cách học cờ, và giấu nó đi chẳng bảo vệ ai. Không trả
   * về id người chơi thì cũng chẳng để làm gì, nên trả cả tên.
   */
  match(id: number): {
    id: number;
    gameId: string;
    names: [string, string];
    ids: [string | null, string | null];
    winner: number | null;
    reason: string;
    rated: boolean;
    at: number;
    log: string | null;
  } | null {
    const r = this.db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as unknown as
      | {
          id: number;
          game_id: string;
          a_id: string | null;
          b_id: string | null;
          a_name: string;
          b_name: string;
          winner: number | null;
          reason: string;
          rated: number;
          log: string | null;
          created_at: number;
        }
      | undefined;
    if (!r) return null;
    return {
      id: r.id,
      gameId: r.game_id,
      names: [r.a_name, r.b_name],
      ids: [r.a_id, r.b_id],
      winner: r.winner,
      reason: r.reason,
      rated: !!r.rated,
      at: r.created_at,
      log: r.log,
    };
  }

  /** Hàng đợi báo cáo, mới nhất trước. Chỉ tầng quản trị gọi. */
  reports(limit = 100): { id: number; reporter: string; target: string; targetName: string; reason: string; note: string; at: number }[] {
    const rows = this.db
      .prepare(
        `SELECT r.id, r.reporter, r.target, COALESCE(u.name, '(đã xoá)') AS target_name, r.reason, r.note, r.created_at
         FROM reports r LEFT JOIN users u ON u.id = r.target ORDER BY r.id DESC LIMIT ?`,
      )
      .all(limit) as unknown as { id: number; reporter: string; target: string; target_name: string; reason: string; note: string; created_at: number }[];
    return rows.map((r) => ({
      id: r.id,
      reporter: r.reporter,
      target: r.target,
      targetName: r.target_name,
      reason: r.reason,
      note: r.note,
      at: r.created_at,
    }));
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
