import { NotificationRow, NotificationType } from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';
import { sendPush } from './push';

type Emitter = (userId: string, row: NotificationRow) => void;
let emitter: Emitter = () => {};

/** Ai đang mở app thì gateway báo về đây, để khỏi bắn push cho người đang xem. */
type Presence = (userId: string) => boolean;
let isOnline: Presence = () => false;
export function bindPresenceCheck(fn: Presence): void {
  isOnline = fn;
}

export function bindNotificationEmitter(fn: Emitter): void {
  emitter = fn;
}

export function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  payload: Record<string, unknown> = {},
): NotificationRow {
  const row: NotificationRow = {
    id: nid(),
    type,
    title,
    body,
    payload,
    readAt: null,
    createdAt: nowMs(),
  };
  db.prepare(
    'INSERT INTO notifications (id, user_id, type, title, body, payload, read_at, created_at) VALUES (?,?,?,?,?,?,NULL,?)',
  ).run(row.id, userId, type, title, body, JSON.stringify(payload), row.createdAt);
  emitter(userId, row);
  // Người đang mở app đã thấy thông báo trong app rồi, bắn push nữa là phiền.
  if (!isOnline(userId)) sendPush(userId, title, body, { ...payload, type, notificationId: row.id });
  return row;
}

export function listNotifications(userId: string, limit = 50): NotificationRow[] {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    payload: JSON.parse(r.payload),
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

export function markRead(userId: string, ids: string[] | null): void {
  if (ids && ids.length) {
    const stmt = db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND id = ?');
    const tx = db.transaction(() => ids.forEach((id) => stmt.run(nowMs(), userId, id)));
    tx();
  } else {
    db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(nowMs(), userId);
  }
}

export function unreadCount(userId: string): number {
  const r = db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .get(userId) as { c: number };
  return r.c;
}
