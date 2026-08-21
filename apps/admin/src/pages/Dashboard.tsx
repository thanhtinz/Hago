import React, { useEffect, useState } from 'react';
import { api, fmtNum, GAME_NAMES, GAME_SHORT } from '../api';
import { BarChart, Card, Kpi, Pill } from '../ui';

export default function Dashboard() {
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    const load = () => api('/api/admin/dashboard').then(setD).catch(() => {});
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  if (!d) return <Card>Đang tải...</Card>;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid kpi">
        <Kpi icon="users" label="Tổng người dùng" value={fmtNum(d.users.total)} sub={`+${d.users.newToday} hôm nay`} />
        <Kpi icon="chart" label="DAU / MAU" value={`${fmtNum(d.engagement.dau)} / ${fmtNum(d.engagement.mau)}`} sub="người hoạt động" color="var(--mint)" />
        <Kpi icon="games" label="Trận hôm nay" value={fmtNum(d.matches.today)} sub={`${fmtNum(d.matches.total)} tổng cộng`} color="var(--coral)" />
        <Kpi icon="dashboard" label="Trận đang chạy" value={fmtNum(d.matches.live)} sub={`${d.matches.activeRooms} phòng mở`} color="var(--danger)" />
        <Kpi icon="shield" label="Báo cáo chờ xử lý" value={fmtNum(d.moderation.openReports)} sub="cần kiểm duyệt" color="var(--sun)" />
      </div>

      <div className="grid two">
        <Card title="Số trận theo game (tổng)">
          <BarChart data={d.byGame.map((g: any) => ({ label: GAME_SHORT[g.gameType] ?? g.gameType, value: g.matches }))} />
        </Card>
        <Card title="Sức khoẻ hệ thống">
          <div className="stack">
            <Row label="D1 Retention" value={`${d.engagement.d1}%`} tone={d.engagement.d1 >= 30 ? 'ok' : 'warn'} />
            <Row label="D7 Retention" value={`${d.engagement.d7}%`} tone={d.engagement.d7 >= 15 ? 'ok' : 'warn'} />
            <Row label="Tài khoản hoạt động" value={fmtNum(d.users.active)} tone="ok" />
            <Row label="Tài khoản bị khoá" value={fmtNum(d.users.banned)} tone={d.users.banned ? 'bad' : 'muted'} />
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Hàng chờ matchmaking</div>
              {Object.keys(d.matches.queues).length ? (
                Object.entries(d.matches.queues).map(([k, v]: any) => (
                  <div className="spread" key={k} style={{ padding: '4px 0' }}>
                    <span>{k}</span>
                    <Pill tone="info">{v} người</Pill>
                  </div>
                ))
              ) : (
                <span className="muted">Không có ai đang chờ ghép trận</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Chi tiết theo game">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>Tổng trận</th>
                <th>Hôm nay</th>
                <th>Tỉ trọng</th>
              </tr>
            </thead>
            <tbody>
              {d.byGame.map((g: any) => {
                const pct = d.matches.total ? Math.round((g.matches / d.matches.total) * 100) : 0;
                return (
                  <tr key={g.gameType}>
                    <td style={{ fontWeight: 700 }}>{GAME_NAMES[g.gameType] ?? g.gameType}</td>
                    <td>{fmtNum(g.matches)}</td>
                    <td>{fmtNum(g.today)}</td>
                    <td style={{ width: 220 }}>
                      <div className="row">
                        <div className="bar-track" style={{ flex: 1 }}>
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="muted">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: any }) {
  return (
    <div className="spread">
      <span className="muted">{label}</span>
      <Pill tone={tone}>{value}</Pill>
    </div>
  );
}
