import type { IncomingMessage, ServerResponse } from 'node:http';
import type { User } from './db.js';
import { Accounts, AuthError } from './accounts.js';
import { googleConfigured, verifyGoogleIdToken } from './google.js';
import { Avatars, MAX_BYTES, UP, UploadError, isUpload, uploadName } from './uploads.js';

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

  try {
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
