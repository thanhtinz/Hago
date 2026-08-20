import React, { useEffect, useState } from 'react';
import { api, fmtDate, fmtNum } from '../api';
import { Card, Empty, Pill, UserCell } from '../ui';

export default function Users({ toast }: { toast: (t: string) => void }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState('coin');
  const [reason, setReason] = useState('');

  const load = () => api(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r: any) => setUsers(r.users));
  useEffect(() => {
    load();
  }, [q]);

  const setStatus = async (id: string, status: string) => {
    await api(`/api/admin/users/${id}/status`, { method: 'POST', body: { status, reason: reason || `Admin ${status}`, days: 3 } });
    toast(`Đã cập nhật trạng thái: ${status}`);
    load();
  };

  const adjust = async () => {
    if (!selected) return;
    await api(`/api/admin/users/${selected.id}/currency`, { method: 'POST', body: { currency, amount: Number(amount), reason: reason || 'Điều chỉnh thủ công' } });
    toast('Đã điều chỉnh số dư (có ghi audit log)');
    setReason('');
    load();
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: selected ? '1fr 330px' : '1fr' }}>
      <Card
        title={`Người dùng (${users.length})`}
        action={<input placeholder="Tìm theo tên / username / ID..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Người chơi</th>
                <th>Cấp</th>
                <th>Rank</th>
                <th>Số dư</th>
                <th>Trạng thái</th>
                <th>Hoạt động</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <UserCell user={u} />
                  </td>
                  <td>Lv.{u.level}</td>
                  <td>
                    <Pill tone="info">
                      {u.rank} · {u.rating}
                    </Pill>
                  </td>
                  <td>
                    {fmtNum(u.coin)} coin · {fmtNum(u.diamond)} diamond
                  </td>
                  <td>
                    <Pill tone={u.status === 'active' ? 'ok' : u.status === 'banned' ? 'bad' : 'warn'}>{u.status}</Pill>
                    {u.isAdmin ? <Pill tone="info">admin</Pill> : null}
                  </td>
                  <td className="muted">{fmtDate(u.lastSeenAt)}</td>
                  <td>
                    <button className="btn sm ghost" onClick={() => setSelected(u)}>
                      Quản lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length ? <Empty icon="search" text="Không tìm thấy người dùng" /> : null}
        </div>
      </Card>

      {selected ? (
        <Card title="Thao tác" action={<button className="btn sm ghost" onClick={() => setSelected(null)}>Đóng</button>}>
          <div className="stack">
            <UserCell user={selected} />
            <div className="muted">Tạo lúc {fmtDate(selected.createdAt)}</div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            <label className="field">
              Lý do / ghi chú
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ghi vào audit log" />
            </label>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn sm mint" onClick={() => setStatus(selected.id, 'active')}>
                Mở khoá
              </button>
              <button className="btn sm sun" onClick={() => setStatus(selected.id, 'suspended')}>
                Đình chỉ 3 ngày
              </button>
              <button className="btn sm danger" onClick={() => setStatus(selected.id, 'banned')}>
                Cấm vĩnh viễn
              </button>
              <button
                className="btn sm ghost"
                onClick={async () => {
                  await api(`/api/admin/users/${selected.id}/mute`, { method: 'POST', body: { minutes: 60 } });
                  toast('Đã cấm chat 60 phút');
                }}
              >
                Cấm chat 60'
              </button>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            <div className="muted" style={{ fontWeight: 700 }}>Điều chỉnh số dư</div>
            <div className="row">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 130 }}>
                <option value="coin">Coin</option>
                <option value="diamond">Diamond</option>
                <option value="seasonToken">Season Token</option>
              </select>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <button className="btn" onClick={adjust}>
              Áp dụng (ghi transaction)
            </button>
            <div className="muted">Mọi thay đổi số dư đều tạo transaction bất biến và audit log.</div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
