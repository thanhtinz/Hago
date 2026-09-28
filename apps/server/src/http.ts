import type { IncomingMessage, ServerResponse } from 'node:http';
import type { User } from './db.js';
import { Accounts, AuthError } from './accounts.js';
import { googleConfigured, verifyGoogleIdToken } from './google.js';

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
  /** Đổi tên thì mọi phòng người đó đang ngồi phải thấy tên mới ngay. */
  onRename?: (u: User) => void;
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

/** Người chơi công khai: **không bao giờ** kèm email hay bất cứ gì riêng tư. */
export const publicUser = (u: User) => ({ id: u.id, name: u.name, avatar: u.avatar, createdAt: u.createdAt });

/**
 * Trả `true` nếu đã xử lý xong; `false` để nhường cho tầng khác (trang /health).
 */
export async function handleApi(req: IncomingMessage, res: ServerResponse, ctx: Ctx): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://x');
  const p = url.pathname;
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

  try {
    const body = req.method === 'POST' || req.method === 'DELETE' ? await readJson(req) : {};

    // ---- tài khoản ---------------------------------------------------
    if (p === '/api/auth/config') {
      return json(res, 200, { google: googleConfigured() }), true;
    }
    if (p === '/api/auth/register' && req.method === 'POST') {
      const s = ctx.accounts.register(str(body.name), str(body.email), str(body.password));
      return json(res, 200, { token: s.token, user: s.user }), true;
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      const s = ctx.accounts.login(str(body.email), str(body.password));
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
    if (p === '/api/me') {
      const u = need();
      return json(res, 200, { user: u, stats: ctx.accounts.stats(u.id) }), true;
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

    // ---- bạn bè --------------------------------------------------------
    if (p === '/api/friends' && req.method === 'GET') {
      const u = need();
      const list = ctx.accounts.friends(u.id).map((f) => ({ user: publicUser(f.user), status: f.status, incoming: f.incoming }));
      return json(res, 200, { friends: list, blocked: ctx.accounts.blocked(u.id).map(publicUser) }), true;
    }
    if (p === '/api/friends/request' && req.method === 'POST') {
      return json(res, 200, { status: ctx.accounts.requestFriend(need().id, str(body.id)) }), true;
    }
    if (p === '/api/friends/accept' && req.method === 'POST') {
      ctx.accounts.acceptFriend(need().id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/friends/remove' && req.method === 'POST') {
      ctx.accounts.removeFriend(need().id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/friends/block' && req.method === 'POST') {
      ctx.accounts.block(need().id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }
    if (p === '/api/friends/unblock' && req.method === 'POST') {
      ctx.accounts.unblock(need().id, str(body.id));
      return json(res, 200, { ok: true }), true;
    }

    json(res, 404, { code: 'NO_ROUTE', msg: 'Không có đường dẫn này' });
    return true;
  } catch (e) {
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
