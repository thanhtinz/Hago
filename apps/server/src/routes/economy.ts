import { Router } from 'express';
import { CosmeticItem, InventoryEntry } from '@hago/shared';
import { requireAuth } from '../auth';
import { db, nowMs } from '../db';
import { balanceOf, recentTransactions } from '../services/economy';

/**
 * Túi đồ và cosmetic.
 *
 * Không còn mua bán: cosmetic chỉ **kiếm được** qua Battle Pass, thành tựu và
 * phần thưởng sự kiện. Route này chỉ còn liệt kê đồ đang có, gắn/tháo trang bị
 * và xem sổ giao dịch tiền tệ.
 */
export const economyRouter = Router();

function mapItem(r: any): CosmeticItem {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    rarity: r.rarity,
    payload: JSON.parse(r.payload ?? '{}'),
    status: r.status,
    description: r.description,
  };
}

economyRouter.get('/inventory', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT i.*, inv.quantity, inv.equipped, inv.acquired_at FROM inventory inv JOIN items i ON i.id = inv.item_id WHERE inv.user_id = ?')
    .all(req.auth!.sub) as any[];
  const entries: InventoryEntry[] = rows.map((r) => ({
    item: mapItem(r),
    quantity: r.quantity,
    equipped: !!r.equipped,
    acquiredAt: r.acquired_at,
  }));
  res.json({ inventory: entries, balance: balanceOf(req.auth!.sub) });
});

const SLOT_COLUMN: Record<string, string> = {
  avatar: 'avatar_seed',
  frame: 'frame_id',
  title: 'title_id',
  background: 'background_id',
  bubble: 'bubble_id',
};

economyRouter.post('/inventory/:itemId/equip', requireAuth, (req, res) => {
  const userId = req.auth!.sub;
  const row = db
    .prepare('SELECT i.* FROM inventory inv JOIN items i ON i.id = inv.item_id WHERE inv.user_id = ? AND inv.item_id = ?')
    .get(userId, req.params.itemId) as any;
  if (!row) return res.status(404).json({ error: 'NOT_OWNED' });
  const equip = req.body?.equip !== false;

  db.transaction(() => {
    const sameType = db
      .prepare('SELECT i.id FROM inventory inv JOIN items i ON i.id = inv.item_id WHERE inv.user_id = ? AND i.type = ?')
      .all(userId, row.type) as { id: string }[];
    sameType.forEach((s) =>
      db.prepare('UPDATE inventory SET equipped = 0 WHERE user_id = ? AND item_id = ?').run(userId, s.id),
    );
    if (equip)
      db.prepare('UPDATE inventory SET equipped = 1 WHERE user_id = ? AND item_id = ?').run(userId, row.id);
    const col = SLOT_COLUMN[row.type];
    if (col) db.prepare(`UPDATE profiles SET ${col} = ? WHERE user_id = ?`).run(equip ? row.id : null, userId);
  })();
  res.json({ ok: true });
});

economyRouter.get('/transactions', requireAuth, (req, res) => {
  res.json({ transactions: recentTransactions(req.auth!.sub) });
});
