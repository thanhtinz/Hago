import type { ClientMsg } from '@co/protocol';

/**
 * Kiểm thông điệp của client **lúc chạy**.
 *
 * `ClientMsg` là kiểu TypeScript, và kiểu biến mất sau khi biên dịch. Trước
 * file này, tầng truyền tải ép `JSON.parse(...) as ClientMsg` rồi đưa thẳng
 * các trường vào `Rooms` — nên `{t:'join',code:5}` chạy tới `code.toUpperCase()`
 * và ném TypeError, `{t:'watch',ids:5}` ném ở `ids.slice`, `{t:'chat-open',
 * channel:5}` ném ở `channel.startsWith`. Ngoại lệ trong handler `message`
 * của `ws` thoát ra thành `uncaughtException`, và vì mọi ván đang chạy chỉ
 * sống trong bộ nhớ, **một khách đã đăng nhập xoá sạch ván của tất cả mọi
 * người bằng một dòng**.
 *
 * Nên chỗ duy nhất dữ liệu ngoài đi vào máy chủ phải có một cánh cửa, và
 * cánh cửa đó trả về `null` thay vì ném: thông điệp rác là chuyện thường
 * ngày của một cổng mở ra Internet, không phải sự cố.
 */

/** Trần cho mọi chuỗi client gửi lên. Dài hơn là cắt từ chối, không cắt ngắn. */
const MAX_STR = 4096;
/** Danh sách theo dõi trực tuyến: nhiều hơn số bạn bè hợp lý là rác. */
const MAX_IDS = 500;

const str = (x: unknown, max = MAX_STR): x is string => typeof x === 'string' && x.length <= max;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * Trả về thông điệp đã kiểm, hoặc `null` nếu không dùng được.
 *
 * Kiểm **từng trường một**, không kiểm theo kiểu "có đủ khoá là được": một
 * trường sai kiểu giữa những trường đúng là đúng cái đi lọt qua cách kiểm
 * hời hợt và ném ở tầng dưới.
 */
export function parseClientMsg(raw: unknown): ClientMsg | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  switch (m.t) {
    case 'hello':
      return str(m.token, 512) ? { t: 'hello', token: m.token } : null;
    case 'create':
      // `config` là dữ liệu của engine, mỗi bộ môn một hình dạng — engine tự
      // kiểm lấy. Ở đây chỉ chặn thứ không phải object, vì mọi engine đều
      // đọc nó như object.
      if (!str(m.gameId, 64)) return null;
      if (m.config !== undefined && (typeof m.config !== 'object' || m.config === null)) return null;
      return m.config === undefined ? { t: 'create', gameId: m.gameId } : { t: 'create', gameId: m.gameId, config: m.config };
    case 'join':
      return str(m.code, 16) ? { t: 'join', code: m.code } : null;
    case 'quick':
      return str(m.gameId, 64) ? { t: 'quick', gameId: m.gameId } : null;
    case 'leave':
      return { t: 'leave' };
    case 'rematch':
      return bool(m.want) ? { t: 'rematch', want: m.want } : null;
    case 'act':
      // `action` đi qua `JSON.stringify` để so với danh sách nước hợp lệ, nên
      // hình dạng của nó do engine quyết định. Chỉ chặn `undefined`.
      if (!str(m.nonce, 64) || m.action === undefined) return null;
      return { t: 'act', nonce: m.nonce, action: m.action };
    case 'challenge':
      return str(m.to, 64) && str(m.gameId, 64) ? { t: 'challenge', to: m.to, gameId: m.gameId } : null;
    case 'challenge-answer':
      return str(m.id, 64) && bool(m.accept) ? { t: 'challenge-answer', id: m.id, accept: m.accept } : null;
    case 'challenge-cancel':
      return str(m.id, 64) ? { t: 'challenge-cancel', id: m.id } : null;
    case 'watch': {
      if (!Array.isArray(m.ids) || m.ids.length > MAX_IDS) return null;
      if (!m.ids.every((x) => str(x, 64))) return null;
      return { t: 'watch', ids: m.ids as string[] };
    }
    case 'chat-open':
      return str(m.channel, 128) ? { t: 'chat-open', channel: m.channel } : null;
    case 'chat-send':
      // Thân tin dài quá thì `Chat.clean` cắt bớt — đó là hành vi cố ý và
      // đúng. Trần ở đây chỉ chặn gói tin khổng lồ, không phải chặn tin dài.
      return str(m.channel, 128) && str(m.body) ? { t: 'chat-send', channel: m.channel, body: m.body } : null;
    case 'chat-more':
      return str(m.channel, 128) && num(m.before) ? { t: 'chat-more', channel: m.channel, before: m.before } : null;
    case 'chat-read':
      return str(m.channel, 128) && num(m.lastId) ? { t: 'chat-read', channel: m.channel, lastId: m.lastId } : null;
    default:
      return null;
  }
}
