import React, { useEffect, useState } from 'react';
import { api, fmtDate, GAME_NAMES } from '../api';
import { Card, Empty, Pill } from '../ui';

export default function Matches() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    const load = () => api('/api/admin/matches').then(setD).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  if (!d) return <Card>Đang tải...</Card>;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid two">
        <Card title={`Trận đang chạy (${d.live.length})`}>
          <div className="stack">
            {d.live.map((m: any) => (
              <div key={m.id} className="spread" style={{ padding: 10, borderRadius: 12, background: 'var(--surface-alt)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {GAME_NAMES[m.gameType] ?? m.gameType} · <span className="muted">v{m.version}</span>
                  </div>
                  <div className="muted">{m.players.join(' vs ')}</div>
                </div>
                <div className="row">
                  {m.disconnected.length ? <Pill tone="bad">{m.disconnected.length} mất kết nối</Pill> : <Pill tone="ok">ổn định</Pill>}
                  <Pill tone="info">{m.mode}</Pill>
                </div>
              </div>
            ))}
            {!d.live.length ? <Empty emoji="😴" text="Không có trận nào đang chạy" /> : null}
          </div>
        </Card>

        <Card title={`Phòng đang mở (${d.rooms.length})`}>
          <div className="stack">
            {d.rooms.map((r: any) => (
              <div key={r.id} className="spread" style={{ padding: 10, borderRadius: 12, background: 'var(--surface-alt)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    #{r.code} · {GAME_NAMES[r.gameType] ?? r.gameType}
                  </div>
                  <div className="muted">
                    {r.players.length}/{r.maxPlayers} người · {r.isPrivate ? 'riêng tư' : 'công khai'}
                  </div>
                </div>
                <Pill tone={r.status === 'playing' ? 'warn' : 'ok'}>{r.status}</Pill>
              </div>
            ))}
            {!d.rooms.length ? <Empty emoji="🚪" text="Chưa có phòng nào" /> : null}
          </div>
        </Card>
      </div>

      <Card title="Lịch sử trận gần đây">
        <div className="table-wrap" style={{ maxHeight: 460, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Game</th>
                <th>Chế độ</th>
                <th>Trạng thái</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
              </tr>
            </thead>
            <tbody>
              {d.recent.map((m: any) => (
                <tr key={m.id}>
                  <td className="muted">{m.id.slice(0, 8)}</td>
                  <td style={{ fontWeight: 700 }}>{GAME_NAMES[m.game_type] ?? m.game_type}</td>
                  <td>
                    <Pill tone={m.mode === 'ranked' ? 'info' : 'muted'}>{m.mode}</Pill>
                  </td>
                  <td>
                    <Pill tone={m.status === 'finished' ? 'ok' : 'warn'}>{m.status}</Pill>
                  </td>
                  <td className="muted">{fmtDate(m.started_at)}</td>
                  <td className="muted">{fmtDate(m.ended_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
