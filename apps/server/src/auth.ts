import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { CONFIG } from './config';
import { db, nowMs } from './db';
import { nid } from './util';

export interface TokenPayload {
  sub: string;
  sid: string;
  admin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return bcrypt.compareSync(pw, hash);
}

export function issueToken(userId: string, isAdmin: boolean, device = 'unknown'): { token: string; sessionId: string } {
  const sid = nid();
  db.prepare('INSERT INTO sessions (id, user_id, device, created_at) VALUES (?,?,?,?)').run(
    sid,
    userId,
    device,
    nowMs(),
  );
  const token = jwt.sign({ sub: userId, sid, admin: isAdmin } satisfies TokenPayload, CONFIG.jwtSecret, {
    expiresIn: CONFIG.accessTtl,
  } as jwt.SignOptions);
  return { token, sessionId: sid };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, CONFIG.jwtSecret) as TokenPayload;
    const session = db
      .prepare('SELECT revoked_at FROM sessions WHERE id = ?')
      .get(payload.sid) as { revoked_at: number | null } | undefined;
    if (!session || session.revoked_at) return null;
    const user = db.prepare('SELECT status, ban_until FROM users WHERE id = ?').get(payload.sub) as
      | { status: string; ban_until: number | null }
      | undefined;
    if (!user) return null;
    if (user.status === 'banned') return null;
    if (user.status === 'suspended' && (user.ban_until ?? 0) > nowMs()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  req.auth = payload;
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(nowMs(), payload.sub);
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.auth?.admin) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }
    next();
  });
}
