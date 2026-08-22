import { Router } from 'express';
import { requireAuth } from '../auth';
import { db, nowMs } from '../db';
import { RateLimiter, nid } from '../util';
import {
  acceptFriend,
  blockUser,
  channelHistory,
  channelsOf,
  directChannel,
  friendList,
  markChannelRead,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from '../services/social';
import { track } from '../services/analytics';
import { findUser, toPublicUser } from '../services/users';
import { MAX_IMAGE_BYTES, UploadError, saveDataUrl } from '../services/uploads';

export const socialRouter = Router();

/** Ảnh nặng hơn tin nhắn nhiều nên có hạn mức riêng, chặt hơn rate limit chat. */
const uploadLimiter = new RateLimiter(60_000, 10);

/**
 * Tải ảnh cho chat. Trả về đường dẫn tương đối; muốn gửi thì đẩy tiếp đường dẫn
 * đó qua `chat.send` với `kind: 'image'`.
 */
socialRouter.post('/upload', requireAuth, (req, res) => {
  if (!uploadLimiter.take(req.auth!.sub)) return res.status(429).json({ error: 'RATE_LIMITED' });
  try {
    const out = saveDataUrl(String(req.body?.data ?? ''));
    track(req.auth!.sub, 'chat_upload', { bytes: out.bytes });
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(400).json({ error: e instanceof UploadError ? e.message : 'BAD_IMAGE' });
  }
});

socialRouter.get('/upload/limit', (_req, res) => res.json({ maxBytes: MAX_IMAGE_BYTES }));

socialRouter.get('/friends', requireAuth, (req, res) => {
  res.json({ friends: friendList(req.auth!.sub) });
});

socialRouter.post('/friends/:id/request', requireAuth, (req, res) => {
  try {
    const result = sendFriendRequest(req.auth!.sub, req.params.id);
    track(req.auth!.sub, 'friend_request', { target_id: req.params.id });
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

socialRouter.post('/friends/:id/accept', requireAuth, (req, res) => {
  try {
    acceptFriend(req.auth!.sub, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

socialRouter.delete('/friends/:id', requireAuth, (req, res) => {
  removeFriend(req.auth!.sub, req.params.id);
  res.json({ ok: true });
});

socialRouter.post('/block/:id', requireAuth, (req, res) => {
  blockUser(req.auth!.sub, req.params.id);
  res.json({ ok: true });
});

socialRouter.delete('/block/:id', requireAuth, (req, res) => {
  unblockUser(req.auth!.sub, req.params.id);
  res.json({ ok: true });
});

socialRouter.get('/blocks', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT blocked_id FROM blocks WHERE user_id = ?').all(req.auth!.sub) as {
    blocked_id: string;
  }[];
  res.json({
    blocked: rows.map((r) => findUser(r.blocked_id)).filter(Boolean).map((r) => toPublicUser(r!)),
  });
});

socialRouter.get('/channels', requireAuth, (req, res) => {
  res.json({ channels: channelsOf(req.auth!.sub) });
});

socialRouter.get('/channels/:id/messages', requireAuth, (req, res) => {
  markChannelRead(req.params.id, req.auth!.sub);
  res.json({ messages: channelHistory(req.params.id, Math.min(100, Number(req.query.limit ?? 50))) });
});

socialRouter.post('/channels/direct/:userId', requireAuth, (req, res) => {
  const channelId = directChannel(req.auth!.sub, req.params.userId);
  res.json({ channelId, messages: channelHistory(channelId) });
});

socialRouter.post('/reports', requireAuth, (req, res) => {
  const { targetId, targetType, reason, evidence } = req.body ?? {};
  if (!targetId || !reason) return res.status(400).json({ error: 'VALIDATION' });
  db.prepare(
    'INSERT INTO reports (id, reporter_id, target_id, target_type, reason, evidence, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(nid(), req.auth!.sub, String(targetId), String(targetType ?? 'user'), String(reason).slice(0, 300), evidence ? String(evidence).slice(0, 1000) : null, nowMs());
  track(req.auth!.sub, 'report_submit', { target_type: targetType, reason });
  res.json({ ok: true });
});
