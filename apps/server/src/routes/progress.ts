import { Router } from 'express';
import { GAME_CATALOG, GAME_TYPES } from '@hago/shared';
import { requireAuth } from '../auth';
import { db, nowMs } from '../db';
import { claimQuest, userAchievements, userQuests } from '../services/quests';
import { listNotifications, markRead, unreadCount } from '../services/notifications';
import { balanceOf } from '../services/economy';
import { track } from '../services/analytics';
import { matchHistory } from '../realtime/match';
import { listPublicRooms, toRoomView } from '../realtime/rooms';

export const progressRouter = Router();

progressRouter.get('/quests', requireAuth, (req, res) => {
  res.json({ quests: userQuests(req.auth!.sub), balance: balanceOf(req.auth!.sub) });
});

progressRouter.post('/quests/:id/claim', requireAuth, (req, res) => {
  try {
    const reward = claimQuest(req.auth!.sub, req.params.id);
    res.json({ ok: true, reward, balance: balanceOf(req.auth!.sub) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

progressRouter.get('/achievements', requireAuth, (req, res) => {
  res.json({ achievements: userAchievements(req.auth!.sub) });
});

progressRouter.get('/notifications', requireAuth, (req, res) => {
  res.json({ notifications: listNotifications(req.auth!.sub), unread: unreadCount(req.auth!.sub) });
});

progressRouter.post('/notifications/read', requireAuth, (req, res) => {
  markRead(req.auth!.sub, Array.isArray(req.body?.ids) ? req.body.ids : null);
  res.json({ ok: true, unread: unreadCount(req.auth!.sub) });
});

progressRouter.get('/events', (_req, res) => {
  const now = nowMs();
  const rows = db
    .prepare('SELECT * FROM events WHERE active = 1 AND start_at <= ? AND end_at >= ? ORDER BY start_at')
    .all(now, now) as any[];
  res.json({
    events: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      banner: r.banner,
      kind: r.kind,
      startAt: r.start_at,
      endAt: r.end_at,
      active: !!r.active,
    })),
  });
});

progressRouter.get('/games', (_req, res) => {
  res.json({ games: GAME_TYPES.map((t) => GAME_CATALOG[t]) });
});

progressRouter.get('/rooms', requireAuth, (req, res) => {
  const gameType = req.query.gameType ? (String(req.query.gameType) as any) : undefined;
  res.json({ rooms: listPublicRooms(gameType).map(toRoomView) });
});

progressRouter.get('/home', requireAuth, (req, res) => {
  const userId = req.auth!.sub;
  const now = nowMs();
  const friendsOnline = db
    .prepare(
      `SELECT u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id
       FROM friends f JOIN users u ON u.id = f.friend_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE f.user_id = ? AND f.status = 'accepted' AND u.last_seen_at > ?
       ORDER BY u.last_seen_at DESC LIMIT 12`,
    )
    .all(userId, now - 90_000) as any[];
  const hot = db
    .prepare(
      `SELECT game_type, COUNT(*) AS c FROM matches WHERE started_at > ? GROUP BY game_type ORDER BY c DESC`,
    )
    .all(now - 24 * 3600_000) as any[];
  const events = db
    .prepare('SELECT * FROM events WHERE active = 1 AND start_at <= ? AND end_at >= ? ORDER BY start_at LIMIT 5')
    .all(now, now) as any[];

  track(userId, 'app_open', {});
  res.json({
    friendsOnline: friendsOnline.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      username: r.username,
      avatarSeed: r.avatar_seed,
      avatarStyle: r.avatar_style,
      level: r.level,
      rating: r.rating,
    })),
    hotGames: hot.map((h) => ({ gameType: h.game_type, matches: h.c })),
    events: events.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      banner: r.banner,
      kind: r.kind,
      startAt: r.start_at,
      endAt: r.end_at,
    })),
    quests: userQuests(userId).slice(0, 4),
    recent: matchHistory(userId, 5),
    unread: unreadCount(userId),
    balance: balanceOf(userId),
    openRooms: listPublicRooms().slice(0, 8).map(toRoomView),
  });
});

progressRouter.post('/analytics', requireAuth, (req, res) => {
  const { name, props } = req.body ?? {};
  if (typeof name !== 'string') return res.status(400).json({ error: 'VALIDATION' });
  track(req.auth!.sub, name.slice(0, 60), typeof props === 'object' && props ? props : {});
  res.json({ ok: true });
});
