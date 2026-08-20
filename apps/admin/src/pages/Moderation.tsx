import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '../api';
import { Card, Empty, Pill } from '../ui';

export default function Moderation({ toast }: { toast: (t: string) => void }) {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const load = () => {
    api(`/api/admin/reports?status=${status}`).then((r: any) => setReports(r.reports));
    api('/api/admin/audit').then((r: any) => setAudit(r.log));
  };
  useEffect(load, [status]);

  const resolve = async (id: string, next: string) => {
    await api(`/api/admin/reports/${id}/resolve`, { method: 'POST', body: { status: next } });
    toast(next === 'resolved' ? 'Đã xử lý báo cáo' : 'Đã bỏ qua báo cáo');
    load();
  };

  return (
    <div className="grid two">
      <Card
        title={`Báo cáo (${reports.length})`}
        action={
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 150 }}>
            <option value="open">Chờ xử lý</option>
            <option value="resolved">Đã xử lý</option>
            <option value="dismissed">Đã bỏ qua</option>
          </select>
        }
      >
        <div className="stack">
          {reports.map((r) => (
            <div key={r.id} className="card" style={{ boxShadow: 'none', background: 'var(--surface-alt)' }}>
              <div className="spread">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {r.reporter_name} 🚩 {r.target_name}
                  </div>
                  <div className="muted">
                    {r.reason} · {fmtDate(r.created_at)}
                  </div>
                  {r.evidence ? <div className="muted">Bằng chứng: {r.evidence}</div> : null}
                </div>
                <Pill tone={r.status === 'open' ? 'warn' : 'ok'}>{r.status}</Pill>
              </div>
              {r.status === 'open' ? (
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn sm mint" onClick={() => resolve(r.id, 'resolved')}>
                    Đã xử lý
                  </button>
                  <button className="btn sm ghost" onClick={() => resolve(r.id, 'dismissed')}>
                    Bỏ qua
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {!reports.length ? <Empty emoji="🕊️" text="Không có báo cáo nào" /> : null}
        </div>
      </Card>

      <Card title="Nhật ký kiểm duyệt (audit log)">
        <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.action}</td>
                  <td className="muted">{a.target ?? '—'}</td>
                  <td className="muted">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!audit.length ? <Empty emoji="📋" text="Chưa có hành động nào được ghi" /> : null}
        </div>
      </Card>
    </div>
  );
}
