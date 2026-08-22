import { Router } from 'express';
import { requireAuth } from '../auth';
import { mutateCurrency, balanceOf } from '../services/economy';
import {
  GUILD_COST,
  createGuild,
  guildCheckin,
  guildCheckinState,
  setNotice,
  guildLeaderboard,
  guildMembers,
  guildOf,
  joinGuild,
  kickMember,
  leaveGuild,
  listGuilds,
  pendingRequests,
  reviewRequest,
  setRole,
  toGuildSummary,
  updateGuild,
} from '../services/guilds';
import { guildLogs } from '../services/guildLog';
import { claimGuildQuest, guildQuestStates } from '../services/guildQuests';
import { db } from '../db';
import { track } from '../services/analytics';

export const guildsRouter = Router();

/** Đổi lỗi nghiệp vụ thành 400 kèm mã, giống các route khác. */
const fail = (res: any, e: any) => res.status(400).json({ error: e.message ?? 'BAD_REQUEST' });

guildsRouter.get('/', requireAuth, (req, res) => {
  res.json({ guilds: listGuilds(String(req.query.q ?? '')), cost: GUILD_COST });
});

guildsRouter.get('/leaderboard', (_req, res) => {
  res.json({ guilds: guildLeaderboard() });
});

/** Bang của chính mình, kèm thành viên và danh sách chờ nếu có quyền duyệt. */
guildsRouter.get('/me', requireAuth, (req, res) => {
  const mine = guildOf(req.auth!.sub);
  if (!mine) return res.json({ guild: null, cost: GUILD_COST, balance: balanceOf(req.auth!.sub) });
  const canReview = mine.role === 'owner' || mine.role === 'officer';
  res.json({
    guild: mine,
    role: mine.role,
    members: guildMembers(mine.id),
    requests: canReview ? pendingRequests(mine.id) : [],
    quests: guildQuestStates(mine.id, req.auth!.sub),
    logs: guildLogs(mine.id, 30),
    checkin: guildCheckinState(req.auth!.sub),
    cost: GUILD_COST,
    balance: balanceOf(req.auth!.sub),
  });
});

/** Thông báo ghim của bang — chỉ chủ và phó bang đặt được. */
guildsRouter.put('/:id/notice', requireAuth, (req, res) => {
  try {
    res.json({ guild: setNotice(req.auth!.sub, req.params.id, String(req.body?.notice ?? '')) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.get('/:id/logs', requireAuth, (req, res) => {
  res.json({ logs: guildLogs(req.params.id, Math.min(100, Number(req.query.limit ?? 40))) });
});

guildsRouter.post('/checkin', requireAuth, (req, res) => {
  try {
    const out = guildCheckin(req.auth!.sub);
    track(req.auth!.sub, 'guild_checkin', {});
    const mine = guildOf(req.auth!.sub)!;
    res.json({ ok: true, ...out, guild: mine, quests: guildQuestStates(mine.id, req.auth!.sub) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.post('/quests/:questId/claim', requireAuth, (req, res) => {
  try {
    const reward = claimGuildQuest(req.auth!.sub, req.params.questId);
    res.json({ ok: true, reward, balance: balanceOf(req.auth!.sub) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.get('/:id', requireAuth, (req, res) => {
  const g = db.prepare('SELECT * FROM guilds WHERE id = ?').get(req.params.id) as any;
  if (!g) return res.status(404).json({ error: 'GUILD_NOT_FOUND' });
  res.json({ guild: toGuildSummary(g), members: guildMembers(g.id) });
});

guildsRouter.post('/', requireAuth, (req, res) => {
  try {
    // Trừ tiền trước rồi mới lập: nếu tên trùng thì hoàn lại ngay bên dưới.
    mutateCurrency(req.auth!.sub, 'coin', -GUILD_COST, 'guild_create');
    try {
      const guild = createGuild(req.auth!.sub, req.body ?? {});
      track(req.auth!.sub, 'guild_create', { guildId: guild.id });
      res.json({ guild, balance: balanceOf(req.auth!.sub) });
    } catch (e) {
      mutateCurrency(req.auth!.sub, 'coin', GUILD_COST, 'guild_create_refund');
      throw e;
    }
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.post('/:id/join', requireAuth, (req, res) => {
  try {
    const out = joinGuild(req.auth!.sub, req.params.id);
    res.json({ ok: true, ...out, guild: guildOf(req.auth!.sub) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.post('/leave', requireAuth, (req, res) => {
  try {
    leaveGuild(req.auth!.sub);
    res.json({ ok: true });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.patch('/:id', requireAuth, (req, res) => {
  try {
    res.json({ guild: updateGuild(req.auth!.sub, req.params.id, req.body ?? {}) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.post('/:id/requests/:userId', requireAuth, (req, res) => {
  try {
    reviewRequest(req.auth!.sub, req.params.id, req.params.userId, !!req.body?.accept);
    res.json({ ok: true, requests: pendingRequests(req.params.id), members: guildMembers(req.params.id) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.post('/:id/kick/:userId', requireAuth, (req, res) => {
  try {
    kickMember(req.auth!.sub, req.params.id, req.params.userId);
    res.json({ ok: true, members: guildMembers(req.params.id) });
  } catch (e: any) {
    fail(res, e);
  }
});

guildsRouter.post('/:id/role/:userId', requireAuth, (req, res) => {
  try {
    setRole(req.auth!.sub, req.params.id, req.params.userId, req.body?.role);
    res.json({ ok: true, members: guildMembers(req.params.id) });
  } catch (e: any) {
    fail(res, e);
  }
});
