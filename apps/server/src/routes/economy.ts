import { Router } from 'express';
import { InventoryEntry, ShopItem } from '@hago/shared';
import { requireAuth } from '../auth';
import { db, nowMs } from '../db';
import { nid } from '../util';
import { balanceOf, InsufficientFunds, mutateCurrency, recentTransactions } from '../services/economy';
import { track } from '../services/analytics';
import { progressQuests } from '../services/quests';

export const economyRouter = Router();

function mapItem(r: any): ShopItem {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    rarity: r.rarity,
    priceCoin: r.price_coin,
    priceDiamond: r.price_diamond,
    payload: JSON.parse(r.payload ?? '{}'),
    status: r.status,
    description: r.description,
  };
}

economyRouter.get('/shop', requireAuth, (req, res) => {
  const type = String(req.query.type ?? '');
  const rows = (
    type
      ? db.prepare("SELECT * FROM items WHERE status = 'active' AND type = ? ORDER BY price_coin, price_diamond").all(type)
      : db.prepare("SELECT * FROM items WHERE status = 'active' ORDER BY type, price_coin").all()
  ) as any[];
  const owned = new Set(
    (db.prepare('SELECT item_id FROM inventory WHERE user_id = ?').all(req.auth!.sub) as any[]).map((r) => r.item_id),
  );
  res.json({
    balance: balanceOf(req.auth!.sub),
    items: rows.map((r) => ({ ...mapItem(r), owned: owned.has(r.id) })),
  });
});

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

economyRouter.post('/shop/:itemId/buy', requireAuth, (req, res) => {
  const userId = req.auth!.sub;
  const item = db.prepare("SELECT * FROM items WHERE id = ? AND status = 'active'").get(req.params.itemId) as any;
  if (!item) return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
  const owned = db.prepare('SELECT 1 AS x FROM inventory WHERE user_id = ? AND item_id = ?').get(userId, item.id);
  if (owned) return res.status(409).json({ error: 'ALREADY_OWNED' });

  const currency = req.body?.currency === 'diamond' || item.price_coin == null ? 'diamond' : 'coin';
  const price = currency === 'diamond' ? item.price_diamond : item.price_coin;
  if (price == null) return res.status(400).json({ error: 'CURRENCY_NOT_SUPPORTED' });

  try {
    mutateCurrency(userId, currency, -price, 'shop_purchase', item.id);
    db.prepare('INSERT INTO inventory (user_id, item_id, quantity, equipped, acquired_at) VALUES (?,?,1,0,?)').run(
      userId,
      item.id,
      nowMs(),
    );
    track(userId, 'item_purchase', { item_id: item.id, currency, price });
    progressQuests(userId, 'buy_item', 1);
    res.json({ ok: true, balance: balanceOf(userId) });
  } catch (e) {
    if (e instanceof InsufficientFunds) return res.status(402).json({ error: 'INSUFFICIENT_FUNDS' });
    throw e;
  }
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

/** Mô phỏng nạp Diamond — production sẽ verify receipt từ store trước khi ghi sổ. */
const PACKS: Record<string, { diamond: number; price: number; label: string; bonus: number }> = {
  starter: { diamond: 60, price: 22000, label: 'Túi khởi đầu', bonus: 0 },
  small: { diamond: 180, price: 59000, label: 'Túi nhỏ', bonus: 10 },
  medium: { diamond: 600, price: 199000, label: 'Rương bạc', bonus: 60 },
  large: { diamond: 1300, price: 399000, label: 'Rương vàng', bonus: 200 },
};

economyRouter.get('/packs', requireAuth, (_req, res) => {
  res.json({ packs: Object.entries(PACKS).map(([id, p]) => ({ id, ...p })) });
});

economyRouter.post('/payment/checkout', requireAuth, (req, res) => {
  const pack = PACKS[String(req.body?.packId ?? '')];
  if (!pack) return res.status(404).json({ error: 'PACK_NOT_FOUND' });
  const orderRef = `ord_${nid()}`;
  const total = pack.diamond + pack.bonus;
  mutateCurrency(req.auth!.sub, 'diamond', total, 'payment_topup', orderRef);
  track(req.auth!.sub, 'payment_success', { product_id: req.body.packId, amount: pack.price });
  res.json({ ok: true, orderRef, granted: total, balance: balanceOf(req.auth!.sub) });
});
