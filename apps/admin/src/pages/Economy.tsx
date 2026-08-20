import React, { useEffect, useState } from 'react';
import { api, fmtDate, fmtNum } from '../api';
import { Card, Empty, Pill } from '../ui';

const TYPES = ['frame', 'title', 'background', 'bubble', 'emote', 'victory', 'entry', 'boardtheme'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];

export default function Economy({ toast }: { toast: (t: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', type: 'frame', rarity: 'common', priceCoin: 500, priceDiamond: '', description: '' });

  const load = () => {
    api('/api/admin/items').then((r: any) => setItems(r.items));
    api('/api/admin/transactions').then((r: any) => setTx(r.transactions));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name) return toast('Nhập tên vật phẩm');
    await api('/api/admin/items', {
      method: 'POST',
      body: {
        name: form.name,
        type: form.type,
        rarity: form.rarity,
        priceCoin: form.priceCoin ? Number(form.priceCoin) : null,
        priceDiamond: form.priceDiamond ? Number(form.priceDiamond) : null,
        description: form.description,
        payload: { from: '#FFB7C5', to: '#FF6F91' },
      },
    });
    toast('Đã lưu vật phẩm');
    setForm({ ...form, name: '', description: '' });
    load();
  };

  const toggle = async (item: any) => {
    await api('/api/admin/items', {
      method: 'POST',
      body: {
        id: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        priceCoin: item.price_coin,
        priceDiamond: item.price_diamond,
        description: item.description,
        payload: JSON.parse(item.payload || '{}'),
        status: item.status === 'active' ? 'hidden' : 'active',
      },
    });
    toast(item.status === 'active' ? 'Đã ẩn vật phẩm' : 'Đã hiện vật phẩm');
    load();
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid two">
        <Card title="Thêm / cập nhật vật phẩm">
          <div className="stack">
            <label className="field">
              Tên
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Khung Sao Băng" />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Loại
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}>
                Độ hiếm
                <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}>
                  {RARITIES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Giá Coin
                <input type="number" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: e.target.value as any })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                Giá Diamond
                <input type="number" value={form.priceDiamond} onChange={(e) => setForm({ ...form, priceDiamond: e.target.value })} placeholder="để trống nếu không bán" />
              </label>
            </div>
            <label className="field">
              Mô tả
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <button className="btn" onClick={save}>
              Lưu vật phẩm
            </button>
          </div>
        </Card>

        <Card title={`Giao dịch gần đây (${tx.length})`}>
          <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Loại</th>
                  <th>Số lượng</th>
                  <th>Số dư sau</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t) => (
                  <tr key={t.id}>
                    <td>{t.username ?? t.user_id}</td>
                    <td>
                      <Pill tone={t.type === 'payment_topup' ? 'info' : t.amount > 0 ? 'ok' : 'warn'}>{t.type}</Pill>
                    </td>
                    <td style={{ fontWeight: 700, color: t.amount > 0 ? 'var(--mint)' : 'var(--danger)' }}>
                      {t.amount > 0 ? '+' : ''}
                      {fmtNum(t.amount)} {t.currency}
                    </td>
                    <td>{fmtNum(t.balance_after)}</td>
                    <td className="muted">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tx.length ? <Empty icon="coins" text="Chưa có giao dịch" /> : null}
          </div>
        </Card>
      </div>

      <Card title={`Vật phẩm (${items.length})`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Loại</th>
                <th>Độ hiếm</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 700 }}>{i.name}</td>
                  <td className="muted">{i.type}</td>
                  <td>
                    <Pill tone={i.rarity === 'legendary' ? 'warn' : i.rarity === 'epic' ? 'info' : 'muted'}>{i.rarity}</Pill>
                  </td>
                  <td>{i.price_coin ? `${fmtNum(i.price_coin)} coin` : `${i.price_diamond} diamond`}</td>
                  <td>
                    <Pill tone={i.status === 'active' ? 'ok' : 'muted'}>{i.status}</Pill>
                  </td>
                  <td>
                    <button className="btn sm ghost" onClick={() => toggle(i)}>
                      {i.status === 'active' ? 'Ẩn' : 'Hiện'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
