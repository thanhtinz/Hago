import { ChatMessage, FriendEdge } from '@hago/shared';
import { db, nowMs } from '../db';
import { filterProfanity, nid } from '../util';
import { findUser, toPublicUser } from './users';
import { notify } from './notifications';

export function friendList(userId: string): FriendEdge[] {
  const rows = db
    .prepare(
      `SELECT f.friend_id AS other, f.status, f.created_at, 'outgoing' AS dir FROM friends f WHERE f.user_id = ?
       UNION ALL
       SELECT f.user_id AS other, f.status, f.created_at, 'incoming' AS dir FROM friends f WHERE f.friend_id = ?`,
    )
    .all(userId, userId) as { other: string; status: string; created_at: number; dir: string }[];

  const byUser = new Map<string, FriendEdge>();
  for (const r of rows) {
    const row = findUser(r.other);
    if (!row) continue;
    const existing = byUser.get(r.other);
    const edge: FriendEdge = {
      user: toPublicUser(row),
      status: r.status as FriendEdge['status'],
      direction: existing ? 'mutual' : (r.dir as 'incoming' | 'outgoing'),
      since: r.created_at,
    };
    if (existing && existing.status === 'accepted') continue;
    byUser.set(r.other, edge);
  }
  return [...byUser.values()];
}

export function isBlocked(a: string, b: string): boolean {
  const r = db
    .prepare('SELECT 1 AS x FROM blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)')
    .get(a, b, b, a);
  return !!r;
}

export function sendFriendRequest(userId: string, targetId: string): 'sent' | 'accepted' {
  if (userId === targetId) throw new Error('CANNOT_FRIEND_SELF');
  if (isBlocked(userId, targetId)) throw new Error('BLOCKED');
  const reverse = db
    .prepare('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?')
    .get(targetId, userId) as { status: string } | undefined;
  if (reverse && reverse.status === 'pending') {
    acceptFriend(userId, targetId);
    return 'accepted';
  }
  db.prepare(
    `INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?,?,'pending',?)
     ON CONFLICT(user_id, friend_id) DO NOTHING`,
  ).run(userId, targetId, nowMs());
  const me = findUser(userId);
  notify(targetId, 'friend_request', 'Lời mời kết bạn', `${me?.display_name} muốn kết bạn với bạn`, {
    userId,
  });
  return 'sent';
}

export function acceptFriend(userId: string, requesterId: string): void {
  const row = db
    .prepare("SELECT 1 AS x FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'pending'")
    .get(requesterId, userId);
  if (!row) throw new Error('NO_PENDING_REQUEST');
  const tx = db.transaction(() => {
    db.prepare("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?").run(
      requesterId,
      userId,
    );
    db.prepare(
      `INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?,?,'accepted',?)
       ON CONFLICT(user_id, friend_id) DO UPDATE SET status='accepted'`,
    ).run(userId, requesterId, nowMs());
  });
  tx();
  const me = findUser(userId);
  notify(requesterId, 'friend_accepted', 'Đã là bạn bè', `${me?.display_name} đã chấp nhận lời mời`, {
    userId,
  });
}

export function removeFriend(userId: string, otherId: string): void {
  db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(
    userId,
    otherId,
    otherId,
    userId,
  );
}

export function blockUser(userId: string, targetId: string): void {
  removeFriend(userId, targetId);
  db.prepare('INSERT OR IGNORE INTO blocks (user_id, blocked_id, created_at) VALUES (?,?,?)').run(
    userId,
    targetId,
    nowMs(),
  );
}

export function unblockUser(userId: string, targetId: string): void {
  db.prepare('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?').run(userId, targetId);
}

/* ---------------------------- chat ---------------------------- */

export function directChannel(a: string, b: string): string {
  const id = `dm:${[a, b].sort().join(':')}`;
  const exists = db.prepare('SELECT 1 AS x FROM channels WHERE id = ?').get(id);
  if (!exists) {
    const tx = db.transaction(() => {
      db.prepare("INSERT INTO channels (id, kind, ref_id, created_at) VALUES (?,'dm',NULL,?)").run(id, nowMs());
      db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?,?)').run(id, a);
      db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?,?)').run(id, b);
    });
    tx();
  }
  return id;
}

export function roomChannel(roomId: string, memberIds: string[]): string {
  const id = `room:${roomId}`;
  db.prepare("INSERT OR IGNORE INTO channels (id, kind, ref_id, created_at) VALUES (?,'room',?,?)").run(
    id,
    roomId,
    nowMs(),
  );
  const stmt = db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?,?)');
  memberIds.forEach((m) => stmt.run(id, m));
  return id;
}

export function postMessage(channelId: string, senderId: string, rawBody: string, kind = 'text'): ChatMessage {
  const user = findUser(senderId);
  if (!user) throw new Error('USER_NOT_FOUND');
  const muted = db.prepare('SELECT mute_until FROM users WHERE id = ?').get(senderId) as
    | { mute_until: number | null }
    | undefined;
  if ((muted?.mute_until ?? 0) > nowMs()) throw new Error('MUTED');

  const trimmed = rawBody.trim().slice(0, 500);
  if (!trimmed) throw new Error('EMPTY_MESSAGE');
  const { body, filtered } = filterProfanity(trimmed);
  const msg: ChatMessage = {
    id: nid(),
    channelId,
    senderId,
    senderName: user.display_name,
    senderAvatar: `${user.avatar_style ?? 'adventurer'}/${user.avatar_seed ?? user.username}`,
    body,
    kind: kind as ChatMessage['kind'],
    createdAt: nowMs(),
    filtered,
  };
  db.prepare(
    'INSERT INTO messages (id, channel_id, sender_id, body, kind, filtered, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(msg.id, channelId, senderId, body, kind, filtered ? 1 : 0, msg.createdAt);
  return msg;
}

export function channelHistory(channelId: string, limit = 50): ChatMessage[] {
  const rows = db
    .prepare(
      `SELECT m.*, u.display_name, p.avatar_style, p.avatar_seed
       FROM messages m JOIN users u ON u.id = m.sender_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE m.channel_id = ? ORDER BY m.created_at DESC LIMIT ?`,
    )
    .all(channelId, limit) as any[];
  return rows
    .map((r) => ({
      id: r.id,
      channelId: r.channel_id,
      senderId: r.sender_id,
      senderName: r.display_name,
      senderAvatar: `${r.avatar_style ?? 'adventurer'}/${r.avatar_seed ?? 'x'}`,
      body: r.body,
      kind: r.kind,
      createdAt: r.created_at,
      filtered: !!r.filtered,
    }))
    .reverse();
}

export function channelsOf(userId: string) {
  const rows = db
    .prepare(
      `SELECT c.id, c.kind, cm.last_read,
              (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id AND m.created_at > cm.last_read AND m.sender_id <> ?) AS unread,
              (SELECT body FROM messages m WHERE m.channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_body,
              (SELECT created_at FROM messages m WHERE m.channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_at
       FROM channel_members cm JOIN channels c ON c.id = cm.channel_id
       WHERE cm.user_id = ? ORDER BY last_at DESC NULLS LAST`,
    )
    .all(userId, userId) as any[];
  return rows.map((r) => {
    let peer = null;
    if (r.kind === 'dm') {
      const otherId = r.id.replace('dm:', '').split(':').find((x: string) => x !== userId);
      const row = otherId ? findUser(otherId) : undefined;
      peer = row ? toPublicUser(row) : null;
    }
    return {
      id: r.id,
      kind: r.kind,
      unread: r.unread ?? 0,
      lastBody: r.last_body,
      lastAt: r.last_at,
      peer,
    };
  });
}

export function markChannelRead(channelId: string, userId: string): void {
  db.prepare('UPDATE channel_members SET last_read = ? WHERE channel_id = ? AND user_id = ?').run(
    nowMs(),
    channelId,
    userId,
  );
}
