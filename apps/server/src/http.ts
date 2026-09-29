import type { IncomingMessage, ServerResponse } from 'node:http';
import type { User } from './db.js';
import { Accounts, AuthError, MIN_RANKED } from './accounts.js';
import { googleConfigured, verifyGoogleIdToken } from './google.js';
import type { Chat } from './chat.js';
import { Avatars, MAX_BYTES, UP, UploadError, isUpload, uploadName } from './uploads.js';
import { RULES, type Limiter, type Rule } from './limit.js';

/**
 * API HTTP: tài khoản, hồ sơ, bạn bè.
 *
 * Những thứ **không cần thời gian thực** đi đường HTTP; ván cờ và tin nhắn đi
 * đường WebSocket. Đăng nhập qua socket thì mỗi lần rớt mạng lại phải làm lại
 * cả nghi thức, mà rớt mạng là chuyện thường.
 */

const MAX_BODY = 64 * 1024;

export interface Ctx {
  accounts: Accounts;
  avatars: Avatars;
  chat: Chat;
  /** Phát một thông báo hệ thống tới người đang mở app. */
  notify: (body: string, to?: string) => void;
  /** Đổi tên thì mọi phòng người đó đang ngồi phải thấy tên mới ngay. */
  onRename?: (u: User) => void;
  /**
   * Quan hệ bạn bè của những người này vừa đổi.
   *
   * Không có đường này thì chấm đỏ "có lời mời kết bạn" ở sảnh đứng chết
   * cho tới khi người dùng mở lại màn — ai gửi lời mời lúc họ đang ngồi ở
   * sảnh thì không có gì nhúc nhích.
   */
  onFriendChange?: (...ids: string[]) => void;
  /** Bộ đếm tần suất. Bỏ trống thì không giới hạn — chỉ dùng trong test. */
  limiter?: Limiter;
}

/** Lỗi khi gõ quá nhanh. Mang mã riêng để app nói được "thử lại sau N giây". */
export class RateError extends Error {
  constructor(readonly waitMs: number) {
    super(`Bạn thao tác hơi nhanh, thử lại sau ${Math.ceil(waitMs / 1000)} giây`);
  }
}

/**
 * Địa chỉ của người gọi.
 *
 * Đọc `x-forwarded-for` trước vì máy chủ này chạy sau một proxy trong hầu
 * hết cách triển khai; lấy **phần tử đầu**, là địa chỉ khách thật. Không có
 * proxy thì rơi về địa chỉ socket.
 */
function callerKey(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return (first ?? req.socket.remoteAddress ?? 'khong-ro').trim();
}

const json = (res: ServerResponse, code: number, body: unknown) => {
  const s = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(s),
    // App web chạy ở cổng khác máy chủ nên bắt buộc phải mở CORS. Để `*` vì
    // xác thực đi bằng header Authorization chứ không bằng cookie — không có
    // cookie thì không có CSRF, và không cần danh sách origin để bảo trì.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  });
  res.end(s);
};

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const c of req) {
    n += (c as Buffer).length;
    if (n > MAX_BODY) throw new AuthError('TOO_BIG', 'Nội dung gửi lên quá lớn');
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
  } catch {
    throw new AuthError('BAD_JSON', 'Không đọc được dữ liệu gửi lên');
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Đọc thân yêu cầu dạng nhị phân, có trần để một tệp khổng lồ không nuốt hết bộ nhớ. */
async function readBytes(req: IncomingMessage, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const c of req) {
    n += (c as Buffer).length;
    if (n > max) throw new UploadError('TOO_BIG', `Ảnh phải nhỏ hơn ${Math.round(max / 1024)} KB`);
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

/** Người chơi công khai: **không bao giờ** kèm email hay bất cứ gì riêng tư. */
export const publicUser = (u: User) => ({ id: u.id, name: u.name, avatar: u.avatar, createdAt: u.createdAt });

/**
 * Trả `true` nếu đã xử lý xong; `false` để nhường cho tầng khác (trang /health).
 */
export async function handleApi(req: IncomingMessage, res: ServerResponse, ctx: Ctx): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://x');
  const p = url.pathname;

  // Phát ảnh đại diện. Kiểu nội dung do **máy chủ** quyết theo dấu nhận dạng
  // đã đọc lúc lưu, cộng `nosniff`, nên trình duyệt không tự đoán lại thành
  // HTML. Tên tệp mang vân tay nội dung nên nhớ đệm được vĩnh viễn.
  if (p.startsWith('/avatars/')) {
    const f = ctx.avatars.read(p.slice('/avatars/'.length));
    if (!f) {
      res.writeHead(404);
      res.end();
      return true;
    }
    res.writeHead(200, {
      'content-type': f.mime,
      'content-length': f.buf.length,
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*',
    });
    res.end(f.buf);
    return true;
  }

  if (!p.startsWith('/api/')) return false;

  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return true;
  }

  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const me = token ? ctx.accounts.bearer(token) : null;
  const need = (): User => {
    if (!me) throw new AuthError('NO_AUTH', 'Phải đăng nhập');
    return me;
  };

  /**
   * Đếm theo **người đăng nhập nếu có, không thì theo địa chỉ**.
   *
   * Đếm thuần theo địa chỉ thì cả một quán net hay cả một nhà mạng di động
   * dùng chung NAT sẽ chặn lẫn nhau. Đếm thuần theo tài khoản thì cửa đăng
   * nhập không đếm được gì, vì lúc đó chưa có tài khoản nào.
   */
  const ip = callerKey(req);
  const gate = (rule: Rule, scope: string, byUser = true) => {
    if (!ctx.limiter) return;
    const who = byUser && me ? `u:${me.id}` : `ip:${ip}`;
    const wait = ctx.limiter.take(`${scope}|${who}`, rule);
    if (wait > 0) throw new RateError(wait);
  };
  try {
    // Đọc thì rộng tay, nhưng vẫn có trần: một vòng lặp gọi /api/users?q=
    // cũng đủ làm SQLite quét bảng liên tục. Đặt **trong** try để lỗi quá
    // tần suất đi ra bằng đúng đường 429 phía dưới.
    if (req.method === 'GET') gate(RULES.read, 'read');
    else if (!p.startsWith('/api/auth/')) gate(RULES.write, 'write');

    /**
     * Tải ảnh đại diện lên. Thân yêu cầu là **chính tệp ảnh**, không phải
     * multipart: app đã vẽ lại ảnh thành ô vuông 256 điểm trước khi gửi, nên
     * chỉ có đúng một tệp và không cần một bộ phân tích multipart nữa.
     */
    if (p === '/api/me/avatar/upload' && req.method === 'POST') {
      const u = need();
      const name = ctx.avatars.save(await readBytes(req, MAX_BYTES + 1024));
      if (isUpload(u.avatar)) ctx.avatars.remove(uploadName(u.avatar));
      const next = ctx.accounts.setAvatar(u.id, UP + name);
      ctx.onRename?.(next);
      return json(res, 200, { user: next }), true;
    }

    // Mọi đường còn lại nhận thân dạng JSON. Đọc ở đây, **sau** nhánh nhị
    // phân ở trên: `readJson` nuốt cả luồng, nên đặt nó trước là tệp ảnh bị
    // đem đi phân tích thành JSON và hỏng trước khi tới đúng nhánh.
    const reqBody = req.method === 'POST' || req.method === 'DELETE' ? await readJson(req) : {};
    const body = reqBody;

    // ---- tài khoản ---------------------------------------------------
    if (p === '/api/auth/config') {
      return json(res, 200, { google: googleConfigured() }), true;
    }
    if (p === '/api/auth/register' && req.method === 'POST') {
      gate(RULES.register, 'register', false);
      const s = await ctx.accounts.register(str(body.name), str(body.email), str(body.password));
      return json(res, 200, { token: s.token, user: s.user }), true;
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      // Đếm theo **địa chỉ và theo email**: chỉ đếm theo địa chỉ thì một
      // mạng chung bị khoá oan, chỉ đếm theo email thì dò danh sách email
      // khác nhau vẫn chạy tẹt ga.
      const mailKey = `login-mail:${str(body.email).trim().toLowerCase()}`;
      gate(RULES.login, 'login', false);
      gate(RULES.login, mailKey, false);
      const s = await ctx.accounts.login(str(body.email), str(body.password));
      // Đăng nhập được rồi thì xoá dấu **cả hai bộ đếm**: người gõ sai hai
      // lần rồi gõ đúng không đáng bị tính tiếp trong năm phút sau.
      ctx.limiter?.clear(`login|ip:${ip}`);
      ctx.limiter?.clear(`${mailKey}|ip:${ip}`);
      return json(res, 200, { token: s.token, user: s.user }), true;
    }
    if (p === '/api/auth/google' && req.method === 'POST') {
      const prof = await verifyGoogleIdToken(str(body.idToken));
      const s = ctx.accounts.upsertGoogle(prof.sub, prof.email, prof.name, prof.picture);
      return json(res, 200, { token: s.token, user: s.user }), true;
    }
    if (p === '/api/auth/logout' && req.method === 'POST') {
      if (token) ctx.accounts.logout(token);
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/me' && req.method === 'GET') {
      const u = need();
      return (
        json(res, 200, {
          user: u,
          stats: ctx.accounts.stats(u.id),
          history: ctx.accounts.history(u.id, { limit: 20 }),
          streak: ctx.accounts.streak(u.id),
          friends: ctx.accounts.friends(u.id).filter((f) => f.status === 'accepted').length,
          requests: ctx.accounts.friends(u.id).filter((f) => f.incoming).length,
        }),
        true
      );
    }
    /**
     * Một trang lịch sử. `before` là `id` của hàng cuối trang trước.
     *
     * Lọc theo bộ môn đi cùng đường này chứ không lọc ở client: người đánh
     * nghìn ván thì tải hết về rồi lọc trong app là tải nghìn hàng để hiện hai
     * mươi.
     */
    if (p === '/api/me/history' && req.method === 'GET') {
      const u = need();
      const before = Number(url.searchParams.get('before'));
      const page = ctx.accounts.history(u.id, {
        limit: Number(url.searchParams.get('limit')) || 20,
        ...(Number.isFinite(before) && before > 0 ? { before } : {}),
        ...(url.searchParams.get('game') ? { gameId: url.searchParams.get('game')! } : {}),
      });
      return json(res, 200, page), true;
    }
    if (p === '/api/me/avatar' && req.method === 'POST') {
      const me0 = need();
      // Đổi về con dấu thì **xoá tệp cũ**. Không xoá là để lại rác trên đĩa,
      // và để lại một ảnh vẫn tải về được ở một đường dẫn không ai quản nữa.
      if (isUpload(me0.avatar)) ctx.avatars.remove(uploadName(me0.avatar));
      const u = ctx.accounts.setAvatar(me0.id, str(body.avatar) || null);
      ctx.onRename?.(u);
      return json(res, 200, { user: u }), true;
    }
    /**
     * Xoá tài khoản. Đòi gõ lại **đúng tên hiển thị** để xác nhận.
     *
     * Một nút "xoá" kèm hộp thoại "bạn chắc chứ" thì người ta bấm Có theo phản
     * xạ. Gõ lại tên buộc phải dừng một nhịp, và đây là thao tác không hoàn
     * lại được.
     */
    if (p === '/api/me' && req.method === 'DELETE') {
      const u = need();
      if (str(body.confirm).trim() !== u.name) throw new AuthError('BAD_CONFIRM', 'Gõ đúng tên hiển thị để xác nhận xoá');
      if (isUpload(u.avatar)) ctx.avatars.remove(uploadName(u.avatar));
      ctx.accounts.deleteUser(u.id);
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/me/name' && req.method === 'POST') {
      const u = ctx.accounts.rename(need().id, str(body.name));
      ctx.onRename?.(u);
      return json(res, 200, { user: u }), true;
    }

    // ---- hồ sơ người khác ---------------------------------------------
    if (p.startsWith('/api/users/') && req.method === 'GET') {
      const id = p.slice('/api/users/'.length);
      const u = ctx.accounts.user(id);
      if (!u) return json(res, 404, { code: 'NO_USER', msg: 'Không có người chơi này' }), true;
      const viewer = me?.id;
      return (
        json(res, 200, {
          user: publicUser(u),
          stats: ctx.accounts.stats(u.id),
          history: ctx.accounts.history(u.id, { limit: 10 }),
          streak: ctx.accounts.streak(u.id),
          friend: viewer ? ctx.accounts.areFriends(viewer, u.id) : false,
          blocked: viewer ? ctx.accounts.isBlockedEither(viewer, u.id) : false,
        }),
        true
      );
    }
    if (p === '/api/users' && req.method === 'GET') {
      const u = need();
      return json(res, 200, { users: ctx.accounts.search(url.searchParams.get('q') ?? '', u.id).map(publicUser) }), true;
    }

    // ---- nhắn tin ------------------------------------------------------
    if (p === '/api/chat/conversations' && req.method === 'GET') {
      const u = need();
      return json(res, 200, { rows: ctx.chat.conversations(u.id) }), true;
    }
    if (p === '/api/chat/system' && req.method === 'GET') {
      const u = need();
      return json(res, 200, { rows: ctx.chat.systemFeed(u.id) }), true;
    }

    /**
     * Phát một thông báo hệ thống.
     *
     * Bảo vệ bằng `ADMIN_TOKEN` trong biến môi trường, và **tắt hẳn khi chưa
     * đặt biến đó**. Một đường phát thông báo cho toàn bộ người dùng mà để mở
     * là món quà cho bất kỳ ai tìm thấy nó.
     */
    if (p === '/api/admin/notice' && req.method === 'POST') {
      const admin = process.env.ADMIN_TOKEN;
      if (!admin) throw new AuthError('NO_ADMIN', 'Chưa bật đường quản trị');
      if (token !== admin) throw new AuthError('NO_AUTH', 'Sai khoá quản trị');
      const body = str(reqBody.body).trim();
      if (!body) throw new AuthError('EMPTY', 'Nội dung rỗng');
      ctx.notify(body, str(reqBody.to) || undefined);
      return json(res, 200, { ok: true }), true;
    }

    /**
     * Bảng xếp hạng. Không cần đăng nhập để **xem** — nhưng đã đăng nhập
     * thì trả kèm hạng của chính mình, vì đó là con số người ta mở bảng ra
     * để xem, và nó thường nằm ngoài năm mươi hàng đầu.
     */
    if (p === '/api/leaderboard' && req.method === 'GET') {
      const game = url.searchParams.get('game');
      const gameId = game && game !== 'tong' ? game : null;
      const rows = ctx.accounts.leaderboard(gameId, 50).map((r, i) => ({
        rank: i + 1,
        user: publicUser(r.user),
        rating: r.rating,
        played: r.played,
        win: r.win,
      }));
      const mine = me ? ctx.accounts.rankOf(me.id, gameId) : null;
      return json(res, 200, { rows, me: mine, minRanked: MIN_RANKED }), true;
    }

    // ---- bạn bè --------------------------------------------------------
    if (p === '/api/friends' && req.method === 'GET') {
      const u = need();
      const list = ctx.accounts.friends(u.id).map((f) => ({ user: publicUser(f.user), status: f.status, incoming: f.incoming }));
      return json(res, 200, { friends: list, blocked: ctx.accounts.blocked(u.id).map(publicUser) }), true;
    }
    // Mỗi thay đổi quan hệ đều đụng tới **hai** người, nên báo cho cả hai:
    // người gửi thấy nút đổi trạng thái, người nhận thấy chấm đỏ.
    if (p === '/api/friends/request' && req.method === 'POST') {
      const u = need();
      const status = ctx.accounts.requestFriend(u.id, str(body.id));
      ctx.onFriendChange?.(u.id, str(body.id));
      return json(res, 200, { status }), true;
    }
    if (p === '/api/friends/accept' && req.method === 'POST') {
      const u = need();
      ctx.accounts.acceptFriend(u.id, str(body.id));
      ctx.onFriendChange?.(u.id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/friends/remove' && req.method === 'POST') {
      const u = need();
      ctx.accounts.removeFriend(u.id, str(body.id));
      ctx.onFriendChange?.(u.id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/friends/block' && req.method === 'POST') {
      const u = need();
      ctx.accounts.block(u.id, str(body.id));
      ctx.onFriendChange?.(u.id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/friends/unblock' && req.method === 'POST') {
      const u = need();
      ctx.accounts.unblock(u.id, str(body.id));
      ctx.onFriendChange?.(u.id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }

    json(res, 404, { code: 'NO_ROUTE', msg: 'Không có đường dẫn này' });
    return true;
  } catch (e) {
    if (e instanceof RateError) {
      // 429 kèm `retry-after` là câu trả lời chuẩn; app đọc số giây từ đó.
      res.setHeader('retry-after', String(Math.ceil(e.waitMs / 1000)));
      json(res, 429, { code: 'TOO_FAST', msg: e.message, waitMs: e.waitMs });
      return true;
    }
    if (e instanceof UploadError) {
      json(res, 400, { code: e.code, msg: e.message });
      return true;
    }
    if (e instanceof AuthError) {
      json(res, e.code === 'NO_AUTH' ? 401 : 400, { code: e.code, msg: e.message });
      return true;
    }
    // Lỗi không lường trước: ghi log đầy đủ ở máy chủ, trả ra ngoài một câu
    // chung. Ném nguyên thông điệp lỗi ra ngoài là rò đường dẫn tệp và tên bảng.
    console.error('API lỗi:', e);
    json(res, 500, { code: 'SERVER', msg: 'Máy chủ gặp lỗi' });
    return true;
  }
}
