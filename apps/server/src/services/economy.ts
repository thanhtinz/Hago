import { CurrencyKind } from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';

const COLUMN: Record<CurrencyKind, string> = {
  coin: 'coin',
  diamond: 'diamond',
  seasonToken: 'season_token',
};

export class InsufficientFunds extends Error {
  constructor(public currency: CurrencyKind) {
    super('INSUFFICIENT_FUNDS');
  }
}

/**
 * Mọi thay đổi số dư đi qua đây: ghi transaction bất biến trước khi cập nhật
 * balance, chạy trong 1 transaction SQL nên không bao giờ lệch sổ.
 */
export const mutateCurrency = db.transaction(
  (userId: string, currency: CurrencyKind, amount: number, type: string, ref: string | null = null) => {
    const col = COLUMN[currency];
    const row = db.prepare(`SELECT ${col} AS bal FROM users WHERE id = ?`).get(userId) as
      | { bal: number }
      | undefined;
    if (!row) throw new Error('USER_NOT_FOUND');
    const next = row.bal + amount;
    if (next < 0) throw new InsufficientFunds(currency);
    db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(next, userId);
    const txId = nid();
    db.prepare(
      `INSERT INTO transactions (id, user_id, type, currency, amount, balance_after, status, ref, created_at)
       VALUES (?,?,?,?,?,?,'completed',?,?)`,
    ).run(txId, userId, type, currency, amount, next, ref, nowMs());
    return { balance: next, transactionId: txId };
  },
);

export function balanceOf(userId: string): { coin: number; diamond: number; seasonToken: number } {
  const r = db.prepare('SELECT coin, diamond, season_token FROM users WHERE id = ?').get(userId) as any;
  return { coin: r?.coin ?? 0, diamond: r?.diamond ?? 0, seasonToken: r?.season_token ?? 0 };
}

export function recentTransactions(userId: string, limit = 30) {
  return db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit);
}

export function audit(actorId: string, action: string, target: string | null, detail: unknown = {}): void {
  db.prepare('INSERT INTO audit_log (id, actor_id, action, target, detail, created_at) VALUES (?,?,?,?,?,?)').run(
    nid(),
    actorId,
    action,
    target,
    JSON.stringify(detail),
    nowMs(),
  );
}
