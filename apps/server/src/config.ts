import path from 'path';

export const CONFIG = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'hago-dev-secret-change-me',
  accessTtl: process.env.ACCESS_TTL ?? '7d',
  dbFile: process.env.DB_FILE ?? path.join(process.cwd(), 'data', 'hago.db'),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  /** Grace period cho reconnect trước khi áp luật AFK của từng game. */
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS ?? 60_000),
  tickMs: Number(process.env.TICK_MS ?? 200),
  dailyXpCap: Number(process.env.DAILY_XP_CAP ?? 3000),
  chatRateLimit: { windowMs: 10_000, max: 12 },
  actionRateLimit: { windowMs: 1_000, max: 25 },
};
