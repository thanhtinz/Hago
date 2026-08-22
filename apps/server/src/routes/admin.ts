import { Router } from 'express';
import { GAME_TYPES } from '@hago/shared';
import { requireAdmin } from '../auth';
import { db, nowMs } from '../db';
import { nid } from '../util';
import { audit, mutateCurrency } from '../services/economy';
import { notify } from '../services/notifications';
import { activeMatches } from '../realtime/match';
import { allRooms, toRoomView } from '../realtime/rooms';
import { queueSizes } from '../realtime/matchmaking';
import { toPublicUser } from '../services/users';
import { upsertGuildQuest } from '../services/guildQuests';
import { TOURNAMENT_SIZES, createTournament } from '../services/tournaments';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const DAY = 86_400_000;

adminRouter.get('/dashboard', (_req, res) => {
  const now = nowMs();
  const count = (sql: string, ...params: any[]) =>
    (db.prepare(sql).get(...params) as { c: number }).c;

  const dau = count('SELECT COUNT(DISTINCT user_id) AS c FROM analytics_events WHERE created_at > ?', now - DAY);
  const mau = count('SELECT COUNT(DISTINCT user_id) AS c FROM analytics_events WHERE created_at > ?', now - 30 * DAY);

  const retention = (days: number) => {
    const cohort = db
      .prepare('SELECT id FROM users WHERE created_at BETWEEN ? AND ?')
      .all(now - (days + 1) * DAY, now - days * DAY) as { id: string }[];
    if (!cohort.length) return 0;
    const back = cohort.filter(
      (u) =>
        count('SELECT COUNT(*) AS c FROM analytics_events WHERE user_id = ? AND created_at > ?', u.id, now - DAY) > 0,
    ).length;
    return Math.round((back / cohort.length) * 100);
  };

  res.json({
    users: {
      total: count('SELECT COUNT(*) AS c FROM users'),
      active: count("SELECT COUNT(*) AS c FROM users WHERE status = 'active'"),
      banned: count("SELECT COUNT(*) AS c FROM users WHERE status = 'banned'"),
      newToday: count('SELECT COUNT(*) AS c FROM users WHERE created_at > ?', now - DAY),
    },
    engagement: { dau, mau, d1: retention(1), d7: retention(7) },
    matches: {
      total: count('SELECT COUNT(*) AS c FROM matches'),
      today: count('SELECT COUNT(*) AS c FROM matches WHERE started_at > ?', now - DAY),
      live: activeMatches().filter((m) => !m.finished).length,
      activeRooms: allRooms().length,
      queues: queueSizes(),
    },
    moderation: { openReports: count("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'") },
    byGame: GAME_TYPES.map((g) => ({
      gameType: g,
      matches: count('SELECT COUNT(*) AS c FROM matches WHERE game_type = ?', g),
      today: count('SELECT COUNT(*) AS c FROM matches WHERE game_type = ? AND started_at > ?', g, now - DAY),
    })),
  });
});

adminRouter.get('/users', (req, res) => {
  const q = String(req.query.q ?? '');
  const rows = db
    .prepare(
      `SELECT u.*, p.avatar_seed, p.avatar_style FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.username LIKE ? OR u.display_name LIKE ? OR u.id = ?
       ORDER BY u.created_at DESC LIMIT 100`,
    )
    .all(`%${q}%`, `%${q}%`, q) as any[];
  res.json({
    users: rows.map((r) => ({
      ...toPublicUser(r),
      coin: r.coin,
      diamond: r.diamond,
      email: r.email,
      isAdmin: !!r.is_admin,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      banReason: r.ban_reason,
      muteUntil: r.mute_until,
    })),
  });
});

adminRouter.post('/users/:id/status', (req, res) => {
  const { status, reason, days } = req.body ?? {};
  if (!['active', 'suspended', 'banned'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });
  const until = status === 'suspended' ? nowMs() + Number(days ?? 3) * DAY : null;
  db.prepare('UPDATE users SET status = ?, ban_reason = ?, ban_until = ? WHERE id = ?').run(
    status,
    reason ?? null,
    until,
    req.params.id,
  );
  if (status !== 'active') db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ?').run(nowMs(), req.params.id);
  audit(req.auth!.sub, `user_${status}`, req.params.id, { reason, days });
  notify(req.params.id, 'system', 'Trạng thái tài khoản thay đổi', reason ?? status);
  res.json({ ok: true });
});

adminRouter.post('/users/:id/mute', (req, res) => {
  const minutes = Number(req.body?.minutes ?? 60);
  const until = nowMs() + minutes * 60_000;
  db.prepare('UPDATE users SET mute_until = ? WHERE id = ?').run(until, req.params.id);
  audit(req.auth!.sub, 'user_mute', req.params.id, { minutes });
  res.json({ ok: true, until });
});

adminRouter.post('/users/:id/currency', (req, res) => {
  const { currency, amount, reason } = req.body ?? {};
  if (!['coin', 'diamond', 'seasonToken'].includes(currency) || !Number.isInteger(amount))
    return res.status(400).json({ error: 'VALIDATION' });
  const result = mutateCurrency(req.params.id, currency, amount, 'admin_adjust', reason ?? null);
  audit(req.auth!.sub, 'currency_adjust', req.params.id, { currency, amount, reason });
  notify(req.params.id, 'reward', 'Điều chỉnh từ hệ thống', `${amount > 0 ? '+' : ''}${amount} ${currency}`);
  res.json({ ok: true, ...result });
});

adminRouter.get('/reports', (req, res) => {
  const status = String(req.query.status ?? 'open');
  const rows = db
    .prepare(
      `SELECT r.*, ru.display_name AS reporter_name, tu.display_name AS target_name
       FROM reports r LEFT JOIN users ru ON ru.id = r.reporter_id LEFT JOIN users tu ON tu.id = r.target_id
       WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200`,
    )
    .all(status);
  res.json({ reports: rows });
});

adminRouter.post('/reports/:id/resolve', (req, res) => {
  db.prepare("UPDATE reports SET status = ?, handled_by = ?, handled_at = ? WHERE id = ?").run(
    String(req.body?.status ?? 'resolved'),
    req.auth!.sub,
    nowMs(),
    req.params.id,
  );
  audit(req.auth!.sub, 'report_resolve', req.params.id, req.body ?? {});
  res.json({ ok: true });
});

adminRouter.get('/items', (_req, res) => {
  res.json({ items: db.prepare('SELECT * FROM items ORDER BY type, name').all() });
});

adminRouter.post('/items', (req, res) => {
  const b = req.body ?? {};
  const id = b.id || `item_${nid().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO items (id, name, type, rarity, payload, description, status)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, rarity=excluded.rarity,
       payload=excluded.payload, description=excluded.description, status=excluded.status`,
  ).run(
    id,
    b.name,
    b.type,
    b.rarity ?? 'common',
    JSON.stringify(b.payload ?? {}),
    b.description ?? '',
    b.status ?? 'active',
  );
  audit(req.auth!.sub, 'item_upsert', id, b);
  res.json({ ok: true, id });
});

adminRouter.get('/quests', (_req, res) => {
  res.json({ quests: db.prepare('SELECT * FROM quests ORDER BY type, id').all() });
});

adminRouter.post('/quests', (req, res) => {
  const b = req.body ?? {};
  const id = b.id || `quest_${nid().slice(0, 8)}`;
  /**
   * Nhiệm vụ gắn vào sự kiện thì lấy luôn khung thời gian của sự kiện: quên đặt
   * ngày kết thúc là nhiệm vụ sống dai hơn cả sự kiện sinh ra nó.
   */
  const eventId = b.eventId || null;
  const event = eventId
    ? (db.prepare('SELECT start_at, end_at FROM events WHERE id = ?').get(eventId) as
        | { start_at: number; end_at: number }
        | undefined)
    : undefined;
  db.prepare(
    `INSERT INTO quests (id, type, title, description, metric, target, reward_coin, reward_xp, reward_diamond, game_type, event_id, start_at, end_at, active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET type=excluded.type, title=excluded.title, description=excluded.description,
       metric=excluded.metric, target=excluded.target, reward_coin=excluded.reward_coin, reward_xp=excluded.reward_xp,
       reward_diamond=excluded.reward_diamond, game_type=excluded.game_type, event_id=excluded.event_id,
       start_at=excluded.start_at, end_at=excluded.end_at, active=excluded.active`,
  ).run(
    id,
    b.type ?? (eventId ? 'event' : 'daily'),
    b.title,
    b.description ?? '',
    b.metric ?? 'play_match',
    Number(b.target ?? 1),
    Number(b.rewardCoin ?? 0),
    Number(b.rewardXp ?? 0),
    Number(b.rewardDiamond ?? 0),
    b.gameType ?? null,
    eventId,
    b.startAt ?? event?.start_at ?? null,
    b.endAt ?? event?.end_at ?? null,
    b.active === false ? 0 : 1,
  );
  audit(req.auth!.sub, 'quest_upsert', id, b);
  res.json({ ok: true, id });
});

/** Nhiệm vụ bang: mục tiêu chung cả tuần, vận hành đặt từ đây. */
adminRouter.get('/guild-quests', (_req, res) => {
  res.json({ quests: db.prepare('SELECT * FROM guild_quests ORDER BY target').all() });
});

adminRouter.post('/guild-quests', (req, res) => {
  const b = req.body ?? {};
  if (!b.title) return res.status(400).json({ error: 'VALIDATION' });
  const id = b.id || `gq_${nid().slice(0, 8)}`;
  upsertGuildQuest({ ...b, id });
  audit(req.auth!.sub, 'guild_quest_upsert', id, b);
  res.json({ ok: true, id });
});

adminRouter.get('/events', (_req, res) => {
  res.json({ events: db.prepare('SELECT * FROM events ORDER BY start_at DESC').all() });
});

adminRouter.post('/events', (req, res) => {
  const b = req.body ?? {};
  const id = b.id || `event_${nid().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO events (id, title, description, banner, kind, start_at, end_at, active) VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, banner=excluded.banner,
       kind=excluded.kind, start_at=excluded.start_at, end_at=excluded.end_at, active=excluded.active`,
  ).run(id, b.title, b.description ?? '', b.banner ?? '', b.kind ?? 'seasonal', Number(b.startAt ?? nowMs()), Number(b.endAt ?? nowMs() + 7 * DAY), b.active === false ? 0 : 1);
  audit(req.auth!.sub, 'event_upsert', id, b);
  res.json({ ok: true, id });
});

/* ------------------------------- giải đấu ------------------------------- */

/**
 * Giải chung do admin mở. Trả về cả giải của bang để còn nhìn thấy chúng, nhưng
 * đánh dấu rõ — quản trị không mở hay huỷ giải của bang, đó là việc chủ bang.
 */
adminRouter.get('/tournaments', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, g.name AS guild_name,
              (SELECT COUNT(*) FROM tournament_players tp WHERE tp.tournament_id = t.id) AS players
       FROM tournaments t LEFT JOIN guilds g ON g.id = t.guild_id
       ORDER BY t.created_at DESC LIMIT 40`,
    )
    .all() as any[];
  res.json({
    sizes: TOURNAMENT_SIZES,
    tournaments: rows.map((t) => ({
      id: t.id,
      name: t.name,
      gameType: t.game_type,
      size: t.size,
      players: t.players,
      entryCoin: t.entry_coin,
      basePrize: t.base_prize,
      status: t.status,
      startAt: t.start_at,
      noShowMs: t.no_show_ms,
      createdAt: t.created_at,
      guildName: t.guild_name ?? null,
    })),
  });
});

adminRouter.post('/tournaments', (req, res) => {
  try {
    const t = createTournament(req.body ?? {});
    audit(req.auth!.sub, 'tournament_create', t.id, req.body ?? {});
    res.json({ ok: true, tournament: t });
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? 'BAD_REQUEST' });
  }
});

/** Huỷ giải chung khi chưa khai mạc; hoàn lệ phí cho người đã đăng ký. */
adminRouter.post('/tournaments/:id/cancel', (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'TOURNAMENT_NOT_FOUND' });
  if (t.guild_id) return res.status(400).json({ error: 'GUILD_TOURNAMENT' });
  if (t.status !== 'open') return res.status(400).json({ error: 'TOURNAMENT_STARTED' });

  const players = db.prepare('SELECT user_id FROM tournament_players WHERE tournament_id = ?').all(t.id) as any[];
  for (const p of players) {
    if (t.entry_coin > 0) mutateCurrency(p.user_id, 'coin', t.entry_coin, 'tournament_refund', t.id);
    notify(p.user_id, 'event', 'Giải đấu bị huỷ', `${t.name} đã huỷ, lệ phí đã hoàn lại`, {});
  }
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(t.id);
  audit(req.auth!.sub, 'tournament_cancel', t.id, { refunded: players.length });
  res.json({ ok: true, refunded: players.length });
});

adminRouter.post('/announce', (req, res) => {
  const { title, body } = req.body ?? {};
  if (!title) return res.status(400).json({ error: 'VALIDATION' });
  const users = db.prepare("SELECT id FROM users WHERE status = 'active'").all() as { id: string }[];
  users.forEach((u) => notify(u.id, 'system', String(title), String(body ?? '')));
  audit(req.auth!.sub, 'announce', null, { title, recipients: users.length });
  res.json({ ok: true, recipients: users.length });
});

adminRouter.get('/matches', (_req, res) => {
  res.json({
    live: activeMatches()
      .filter((m) => !m.finished)
      .map((m) => ({
        id: m.id,
        gameType: m.gameType,
        mode: m.mode,
        players: m.players.map((p) => p.name),
        version: m.version,
        startedAt: m.startedAt,
        disconnected: [...m.disconnected.keys()],
      })),
    rooms: allRooms().map(toRoomView),
    recent: db.prepare('SELECT * FROM matches ORDER BY started_at DESC LIMIT 50').all(),
  });
});

adminRouter.get('/transactions', (_req, res) => {
  res.json({
    transactions: db
      .prepare(
        `SELECT t.*, u.username FROM transactions t LEFT JOIN users u ON u.id = t.user_id
         ORDER BY t.created_at DESC LIMIT 200`,
      )
      .all(),
  });
});

adminRouter.get('/audit', (_req, res) => {
  res.json({ log: db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all() });
});

adminRouter.get('/analytics', (req, res) => {
  const days = Math.min(30, Number(req.query.days ?? 7));
  const since = nowMs() - days * DAY;
  res.json({
    funnel: db
      .prepare(
        `SELECT name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS users
         FROM analytics_events WHERE created_at > ? GROUP BY name ORDER BY count DESC`,
      )
      .all(since),
    daily: db
      .prepare(
        `SELECT date(created_at/1000,'unixepoch') AS day, COUNT(DISTINCT user_id) AS users, COUNT(*) AS events
         FROM analytics_events WHERE created_at > ? GROUP BY day ORDER BY day`,
      )
      .all(since),
  });
});
