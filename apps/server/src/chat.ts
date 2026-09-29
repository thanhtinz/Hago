import type { DatabaseSync } from 'node:sqlite';
import { dmChannel } from './db.js';

/**
 * Tin nhắn.
 *
 * Kênh là một chuỗi, và **tên kênh quyết định ai đọc được**:
 *
 *   `chung`           sảnh chung, ai đăng nhập cũng đọc
 *   `rieng:<a>|<b>`   nhắn riêng, hai id sắp xếp nên hai bên cùng một tên
 *   `phong:<mã>`      trong một phòng đấu
 *   `he-thong`        thông báo hệ thống cho tất cả
 *
 * Sắp xếp hai id trong kênh riêng là chỗ nhỏ mà quan trọng: nếu ghép theo
 * thứ tự người gửi thì A nhắn B vào kênh `A|B` còn B nhắn A vào `B|A`, và hai
 * người ngồi nhìn hai cuộc trò chuyện khác nhau.
 *
 * Lớp này **không biết ai đang nối dây**. Nó ghi và đọc; việc đẩy tin tới
 * người đang mở app là của `Rooms`.
 */

export interface ChatMsg {
  id: number;
  channel: string;
  fromId: string | null;
  fromName: string;
  body: string;
  at: number;
}

/** Trần độ dài một tin. Dài hơn thì cắt, không từ chối. */
export const MAX_BODY = 1000;

export class ChatError extends Error {
  constructor(
    readonly code: string,
    msg: string,
  ) {
    super(msg);
  }
}

export const dm = dmChannel;
export const roomChannel = (code: string) => `phong:${code}`;
export const LOBBY = 'chung';
export const SYSTEM = 'he-thong';
/** Kênh thông báo riêng của một người. Chỉ họ đọc được. */
export const systemFor = (userId: string) => `he-thong:${userId}`;
export const isSystem = (channel: string) => channel === SYSTEM || channel.startsWith('he-thong:');

/** Hai người trong một kênh riêng. Không phải kênh riêng thì trả null. */
export function dmPair(channel: string): [string, string] | null {
  if (!channel.startsWith('rieng:')) return null;
  const [a, b] = channel.slice('rieng:'.length).split('|');
  return a && b ? [a, b] : null;
}

export class Chat {
  constructor(private readonly db: DatabaseSync) {}

  /**
   * Gọn một tin trước khi ghi: bỏ ký tự điều khiển, gộp dòng trống, cắt dài.
   *
   * Cắt chứ không từ chối: người vừa dán một đoạn dài mà bị báo lỗi thì mất
   * cả đoạn vừa gõ, còn cắt thì họ thấy ngay phần thừa và tự sửa.
   */
  static clean(raw: string): string {
    const t = raw
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return t.slice(0, MAX_BODY);
  }

  /** Ghi một tin và trả về nó kèm id. `fromId` null là thông báo hệ thống. */
  post(channel: string, fromId: string | null, fromName: string, raw: string, toId?: string): ChatMsg {
    const body = Chat.clean(raw);
    if (!body) throw new ChatError('EMPTY', 'Tin nhắn rỗng');
    const at = Date.now();
    const r = this.db
      .prepare('INSERT INTO messages (channel, from_id, to_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(channel, fromId, toId ?? null, body, at);
    const id = Number(r.lastInsertRowid);
    // **Gửi được là đã đọc.** Không đánh dấu ở đây thì trả lời xong vẫn còn
    // chấm đỏ trên chính cuộc trò chuyện mình vừa gõ vào.
    if (fromId) this.markRead(fromId, channel, id);
    return { id, channel, fromId, fromName, body, at };
  }

  /**
   * Một trang tin, **cũ nhất trước** trong trang nhưng lấy từ mới nhất về.
   *
   * Cuộn lên trong khung chat là đi ngược thời gian, nên con trỏ `before` đi
   * lùi; nhưng khi vẽ thì phải xuôi, nên đảo lại trước khi trả.
   */
  page(channel: string, opts: { limit?: number; before?: number } = {}): { rows: ChatMsg[]; more: boolean } {
    const limit = Math.min(Math.max(1, opts.limit ?? 40), 100);
    const args: (string | number)[] = [channel];
    let cursor = '';
    if (opts.before !== undefined) {
      cursor = ' AND m.id < ?';
      args.push(opts.before);
    }
    const raw = this.db
      .prepare(
        `SELECT m.id, m.channel, m.from_id, m.body, m.created_at, COALESCE(u.name, 'Hệ thống') AS name
         FROM messages m LEFT JOIN users u ON u.id = m.from_id
         WHERE m.channel = ?${cursor} ORDER BY m.id DESC LIMIT ?`,
      )
      .all(...args, limit + 1) as unknown as {
      id: number;
      channel: string;
      from_id: string | null;
      body: string;
      created_at: number;
      name: string;
    }[];
    const more = raw.length > limit;
    const rows = raw
      .slice(0, limit)
      .map((r) => ({ id: r.id, channel: r.channel, fromId: r.from_id, fromName: r.name, body: r.body, at: r.created_at }))
      .reverse();
    return { rows, more };
  }

  /** Đánh dấu đã đọc tới tin mới nhất của kênh. */
  markRead(userId: string, channel: string, lastId: number): void {
    this.db
      .prepare(
        `INSERT INTO reads (user_id, channel, last_id) VALUES (?, ?, ?)
         ON CONFLICT (user_id, channel) DO UPDATE SET last_id = MAX(last_id, ?)`,
      )
      .run(userId, channel, lastId, lastId);
  }

  /** Số tin chưa đọc trong một kênh. */
  unread(userId: string, channel: string): number {
    const r = this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM messages
         WHERE channel = ? AND from_id IS NOT ? AND id > COALESCE((SELECT last_id FROM reads WHERE user_id = ? AND channel = ?), 0)`,
      )
      .get(channel, userId, userId, channel) as unknown as { n: number };
    return r.n;
  }

  /**
   * Danh sách cuộc nhắn riêng, mới nhất trước, kèm tin cuối và số chưa đọc.
   *
   * Một câu truy vấn cho cả danh sách. Lấy từng cuộc rồi hỏi tin cuối của
   * từng cuộc là N+1 lần gọi để vẽ một màn hình.
   */
  conversations(userId: string, limit = 50): { withId: string; withName: string; withAvatar: string | null; last: ChatMsg; unread: number }[] {
    const rows = this.db
      .prepare(
        `SELECT m.id, m.channel, m.from_id, m.body, m.created_at, COALESCE(u.name, 'Người đã rời') AS name
         FROM messages m
         LEFT JOIN users u ON u.id = m.from_id
         JOIN (SELECT channel, MAX(id) AS top FROM messages WHERE channel LIKE 'rieng:%' AND instr(channel, ?) > 0 GROUP BY channel) t
           ON t.channel = m.channel AND t.top = m.id
         ORDER BY m.id DESC LIMIT ?`,
      )
      .all(userId, limit) as unknown as {
      id: number;
      channel: string;
      from_id: string | null;
      body: string;
      created_at: number;
      name: string;
    }[];
    const unread = this.unreadDms(userId);
    // Tên và ảnh của **người kia**, không phải của người gửi tin cuối — tin
    // cuối có thể là của chính mình, và lúc đó hàng sẽ mang tên mình.
    //
    // Lấy hết trong **một** câu. Hỏi từng người một là N+1 lần chạm đĩa để
    // vẽ một màn hình, và danh sách trò chuyện thì mở ra rất nhiều lần.
    const others = new Map<string, string>();
    for (const r of rows) {
      const pair = dmPair(r.channel);
      if (!pair) continue;
      others.set(r.channel, pair[0] === userId ? pair[1] : pair[0]);
    }
    const ids = [...new Set(others.values())];
    const who = new Map<string, { name: string; avatar: string | null }>();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      for (const u of this.db.prepare(`SELECT id, name, avatar FROM users WHERE id IN (${marks})`).all(...ids)) {
        const row = u as unknown as { id: string; name: string; avatar: string | null };
        who.set(row.id, { name: row.name, avatar: row.avatar });
      }
    }
    const out: { withId: string; withName: string; withAvatar: string | null; last: ChatMsg; unread: number }[] = [];
    for (const r of rows) {
      const other = others.get(r.channel);
      if (!other) continue;
      const u = who.get(other);
      out.push({
        withId: other,
        withName: u?.name ?? 'Người đã rời',
        withAvatar: u?.avatar ?? null,
        last: { id: r.id, channel: r.channel, fromId: r.from_id, fromName: r.name, body: r.body, at: r.created_at },
        unread: unread[other] ?? 0,
      });
    }
    return out;
  }

  /** Số tin chưa đọc ở hai kênh thông báo hệ thống của một người. */
  unreadSystem(userId: string): number {
    return this.unread(userId, SYSTEM) + this.unread(userId, systemFor(userId));
  }

  /**
   * Thông báo hệ thống: kênh chung và kênh riêng gộp làm một dòng thời gian.
   *
   * Người dùng không phân biệt "thông báo cho tất cả" với "thông báo cho
   * riêng tôi" — với họ đó chỉ là thông báo. Gộp ở đây để giao diện không
   * phải ghép hai danh sách rồi tự sắp xếp lại.
   */
  systemFeed(userId: string, limit = 40): ChatMsg[] {
    const rows = this.db
      .prepare(
        `SELECT id, channel, from_id, body, created_at FROM messages
         WHERE channel = ? OR channel = ? ORDER BY id DESC LIMIT ?`,
      )
      .all(SYSTEM, systemFor(userId), limit) as unknown as {
      id: number;
      channel: string;
      from_id: string | null;
      body: string;
      created_at: number;
    }[];
    return rows
      .map((r) => ({ id: r.id, channel: r.channel, fromId: r.from_id, fromName: 'Hệ thống', body: r.body, at: r.created_at }))
      .reverse();
  }

  /**
   * Chưa đọc ở mọi cuộc nhắn riêng của một người, gom theo người kia.
   *
   * Một câu truy vấn cho cả danh sách bạn. Hỏi từng người một là N lần gọi
   * cơ sở dữ liệu để vẽ một màn hình.
   */
  unreadDms(userId: string): Record<string, number> {
    const rows = this.db
      .prepare(
        `SELECT m.channel, COUNT(*) AS n FROM messages m
         WHERE m.channel LIKE 'rieng:%' AND instr(m.channel, ?) > 0 AND m.from_id IS NOT ?
           AND m.id > COALESCE((SELECT last_id FROM reads r WHERE r.user_id = ? AND r.channel = m.channel), 0)
         GROUP BY m.channel`,
      )
      .all(userId, userId, userId) as unknown as { channel: string; n: number }[];
    const out: Record<string, number> = {};
    for (const r of rows) {
      const pair = dmPair(r.channel);
      if (!pair) continue;
      const other = pair[0] === userId ? pair[1] : pair[0];
      out[other] = r.n;
    }
    return out;
  }
}
