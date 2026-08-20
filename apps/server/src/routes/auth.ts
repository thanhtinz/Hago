import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, issueToken, requireAuth, verifyPassword } from '../auth';
import { db, nowMs } from '../db';
import { nid, RateLimiter } from '../util';
import { AVATAR_STYLES } from '../avatar';
import { findUser, findUserByLogin, toProfile } from '../services/users';
import { track } from '../services/analytics';
import { notify } from '../services/notifications';

export const authRouter = Router();
const loginLimiter = new RateLimiter(60_000, 12);

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'USERNAME_INVALID'),
  password: z.string().min(6).max(72),
  displayName: z.string().min(1).max(30).optional(),
  email: z.string().email().optional(),
});

authRouter.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
  const { username, password, displayName, email } = parsed.data;
  if (findUserByLogin(username)) return res.status(409).json({ error: 'USERNAME_TAKEN' });
  if (email && findUserByLogin(email)) return res.status(409).json({ error: 'EMAIL_TAKEN' });

  const id = nid();
  const now = nowMs();
  const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, username, display_name, email, password_hash, created_at, last_seen_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(id, username, displayName ?? username, email ?? null, hashPassword(password), now, now);
    db.prepare('INSERT INTO profiles (user_id, avatar_seed, avatar_style) VALUES (?,?,?)').run(id, username, style);
  })();

  const { token } = issueToken(id, false, String(req.headers['user-agent'] ?? 'unknown'));
  track(id, 'login_success', { method: 'register' });
  notify(id, 'system', 'Chào mừng đến Hago! 🎉', 'Nhận 500 Coin và 20 Diamond khởi đầu. Chơi ván đầu để nhận thưởng nhé!');
  res.json({ token, profile: toProfile(findUser(id)!) });
});

authRouter.post('/login', (req, res) => {
  const ip = req.ip ?? 'unknown';
  if (!loginLimiter.take(ip)) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
  const { login, password } = req.body ?? {};
  if (typeof login !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'VALIDATION' });
  const row = findUserByLogin(login);
  if (!row) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  const hash = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(row.id) as { password_hash: string };
  if (!verifyPassword(password, hash.password_hash)) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  if (row.status === 'banned') return res.status(403).json({ error: 'ACCOUNT_BANNED' });

  const { token } = issueToken(row.id, !!row.is_admin, String(req.headers['user-agent'] ?? 'unknown'));
  track(row.id, 'login_success', { method: 'password' });
  res.json({ token, profile: toProfile(row) });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(nowMs(), req.auth!.sid);
  res.json({ ok: true });
});

authRouter.get('/sessions', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT id, device, created_at, revoked_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.auth!.sub);
  res.json({ sessions: rows, current: req.auth!.sid });
});

authRouter.delete('/sessions/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ?').run(
    nowMs(),
    req.params.id,
    req.auth!.sub,
  );
  res.json({ ok: true });
});
