import { db, nowMs } from '../db';
import { nid } from '../util';

/** Event tracking theo Phụ lục A của PRD. */
export function track(userId: string | null, name: string, props: Record<string, unknown> = {}): void {
  db.prepare('INSERT INTO analytics_events (id, user_id, name, props, created_at) VALUES (?,?,?,?,?)').run(
    nid(),
    userId,
    name,
    JSON.stringify(props),
    nowMs(),
  );
}

export function bumpDaily(userId: string, metric: string, delta = 1, day = new Date().toISOString().slice(0, 10)): number {
  db.prepare(
    `INSERT INTO daily_counters (user_id, day, metric, value) VALUES (?,?,?,?)
     ON CONFLICT(user_id, day, metric) DO UPDATE SET value = value + excluded.value`,
  ).run(userId, day, metric, delta);
  const r = db
    .prepare('SELECT value FROM daily_counters WHERE user_id = ? AND day = ? AND metric = ?')
    .get(userId, day, metric) as { value: number };
  return r.value;
}

export function dailyValue(userId: string, metric: string, day = new Date().toISOString().slice(0, 10)): number {
  const r = db
    .prepare('SELECT value FROM daily_counters WHERE user_id = ? AND day = ? AND metric = ?')
    .get(userId, day, metric) as { value: number } | undefined;
  return r?.value ?? 0;
}
