import { Router } from 'express';
import { requireAuth } from '../auth';
import { registerPushToken, unregisterPushToken } from '../services/push';

export const pushRouter = Router();

pushRouter.post('/register', requireAuth, (req, res) => {
  try {
    registerPushToken(req.auth!.sub, String(req.body?.token ?? ''), String(req.body?.platform ?? 'unknown'));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/** Gỡ token lúc đăng xuất, để máy đó không nhận push của tài khoản cũ nữa. */
pushRouter.post('/unregister', requireAuth, (req, res) => {
  unregisterPushToken(String(req.body?.token ?? ''));
  res.json({ ok: true });
});
