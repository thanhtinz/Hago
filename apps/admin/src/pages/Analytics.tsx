import React, { useEffect, useState } from 'react';
import { api, fmtNum } from '../api';
import { BarChart, Card, Empty } from '../ui';

const FUNNEL = ['app_open', 'game_view', 'match_queue', 'match_found', 'match_start', 'match_end'];
const LABELS: Record<string, string> = {
  app_open: 'Mở app',
  login_success: 'Đăng nhập',
  game_view: 'Xem game',
  match_queue: 'Vào hàng chờ',
  match_found: 'Ghép được trận',
  match_start: 'Bắt đầu trận',
  game_action: 'Thao tác trong game',
  match_end: 'Kết thúc trận',
  friend_request: 'Gửi kết bạn',
  room_invite: 'Mời vào phòng',
  room_create: 'Tạo phòng',
  item_purchase: 'Mua vật phẩm',
  payment_success: 'Nạp thành công',
  report_submit: 'Gửi báo cáo',
};

export default function Analytics() {
  const [d, setD] = useState<any>(null);
  const [days, setDays] = useState(7);
  useEffect(() => {
    api(`/api/admin/analytics?days=${days}`).then(setD);
  }, [days]);
  if (!d) return <Card>Đang tải...</Card>;

  const byName = new Map(d.funnel.map((f: any) => [f.name, f]));
  const top = byName.get('app_open') as any;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Card
        title="Người dùng hoạt động theo ngày"
        action={
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 130 }}>
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
            <option value={30}>30 ngày</option>
          </select>
        }
      >
        {d.daily.length ? (
          <BarChart data={d.daily.map((x: any) => ({ label: x.day.slice(5), value: x.users }))} />
        ) : (
          <Empty emoji="📊" text="Chưa có dữ liệu" />
        )}
      </Card>

      <div className="grid two">
        <Card title="Phễu vào trận">
          <div className="stack">
            {FUNNEL.map((name) => {
              const row = byName.get(name) as any;
              const users = row?.users ?? 0;
              const pct = top?.users ? Math.round((users / top.users) * 100) : 0;
              return (
                <div key={name}>
                  <div className="spread" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{LABELS[name] ?? name}</span>
                    <span className="muted">
                      {fmtNum(users)} người · {pct}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Tất cả sự kiện tracking">
          <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Sự kiện</th>
                  <th>Lượt</th>
                  <th>Người dùng</th>
                </tr>
              </thead>
              <tbody>
                {d.funnel.map((f: any) => (
                  <tr key={f.name}>
                    <td style={{ fontWeight: 700 }}>{LABELS[f.name] ?? f.name}</td>
                    <td>{fmtNum(f.count)}</td>
                    <td>{fmtNum(f.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
