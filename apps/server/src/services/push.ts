import { db, nowMs } from '../db';
import { CONFIG } from '../config';

/**
 * Push notification qua **Expo Push Service**.
 *
 * App chạy bằng Expo nên không nói chuyện thẳng với FCM/APNs: client lấy
 * ExponentPushToken rồi server đẩy qua `exp.host`, Expo lo phần chuyển tiếp
 * sang FCM và APNs. Nhờ vậy server không phải giữ khoá của Google và Apple —
 * hai khoá đó khai báo một lần trong dự án Expo lúc phát hành.
 *
 * Push chỉ là bản sao của thông báo trong app: mọi thứ vẫn chạy bình thường
 * nếu push hỏng hoặc bị tắt, nên mọi lỗi ở đây đều nuốt và ghi log, không bao
 * giờ làm hỏng request đang phục vụ người chơi.
 */

const EXPO_API = 'https://exp.host/--/api/v2/push/send';
/** Expo nhận tối đa 100 tin một lần gửi. */
const BATCH = 100;

const isExpoToken = (t: string) => /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);

export function registerPushToken(userId: string, token: string, platform = 'unknown'): void {
  if (!isExpoToken(token)) throw new Error('BAD_PUSH_TOKEN');
  // Cùng một máy có thể đổi tài khoản, nên token luôn thuộc về người đăng ký sau cùng.
  db.prepare(
    `INSERT INTO push_tokens (token, user_id, platform, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform,
       updated_at = excluded.updated_at`,
  ).run(token, userId, platform, nowMs());
}

export function unregisterPushToken(token: string): void {
  db.prepare('DELETE FROM push_tokens WHERE token = ?').run(token);
}

export function tokensOf(userIds: string[]): { token: string; userId: string }[] {
  if (!userIds.length) return [];
  const marks = userIds.map(() => '?').join(',');
  return (
    db.prepare(`SELECT token, user_id FROM push_tokens WHERE user_id IN (${marks})`).all(...userIds) as any[]
  ).map((r) => ({ token: r.token, userId: r.user_id }));
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  channelId: 'default';
}

/**
 * Gửi thật. Trả về số tin Expo nhận; token chết thì xoá khỏi DB ngay để lần
 * sau không gửi lại nữa.
 */
async function deliver(messages: PushMessage[]): Promise<number> {
  let accepted = 0;
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH);
    try {
      const res = await fetch(EXPO_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.warn(`[push] Expo trả ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      (json.data ?? []).forEach((r, k) => {
        if (r.status === 'ok') return accepted++;
        // Máy đã gỡ app hoặc tắt thông báo: token vô dụng vĩnh viễn, dọn luôn.
        if (r.details?.error === 'DeviceNotRegistered') unregisterPushToken(chunk[k].to);
      });
    } catch (e: any) {
      console.warn(`[push] gửi hỏng: ${e.message}`);
    }
  }
  return accepted;
}

/**
 * Đẩy một thông báo tới mọi thiết bị của một người. Không await ở nơi gọi —
 * hàm này tự chạy nền, người chơi không phải chờ mạng của Expo.
 */
export function sendPush(userId: string, title: string, body: string, data: Record<string, unknown> = {}): void {
  if (!CONFIG.pushEnabled) return;
  const targets = tokensOf([userId]);
  if (!targets.length) return;
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
    channelId: 'default',
  }));
  void deliver(messages);
}
