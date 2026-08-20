import React, { useEffect, useState } from 'react';
import { api, setToken, getToken } from './api';
import { AdminIcon, Icon } from './Icon';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Moderation from './pages/Moderation';
import Economy from './pages/Economy';
import LiveOps from './pages/LiveOps';
import Matches from './pages/Matches';
import Analytics from './pages/Analytics';

const NAV: { id: string; label: string; icon: AdminIcon }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'users', label: 'Người dùng', icon: 'users' },
  { id: 'matches', label: 'Phòng & Trận', icon: 'games' },
  { id: 'economy', label: 'Kinh tế & Shop', icon: 'coins' },
  { id: 'liveops', label: 'Nhiệm vụ & Sự kiện', icon: 'events' },
  { id: 'moderation', label: 'Kiểm duyệt', icon: 'shield' },
  { id: 'analytics', label: 'Phân tích', icon: 'chart' },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: 'Tổng quan hệ thống', sub: 'Chỉ số vận hành cập nhật mỗi 10 giây' },
  users: { title: 'Quản lý người dùng', sub: 'Tìm kiếm, khoá tài khoản, điều chỉnh số dư có audit' },
  matches: { title: 'Phòng & Trận đấu', sub: 'Theo dõi phòng và trận realtime' },
  economy: { title: 'Kinh tế & Cửa hàng', sub: 'Cấu hình vật phẩm, giá bán và đối soát giao dịch' },
  liveops: { title: 'Live Ops', sub: 'Nhiệm vụ, sự kiện và thông báo hệ thống' },
  moderation: { title: 'Kiểm duyệt cộng đồng', sub: 'Xử lý báo cáo và xem nhật ký hành động' },
  analytics: { title: 'Phân tích', sub: 'Phễu người dùng và sự kiện tracking' },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [page, setPage] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [openReports, setOpenReports] = useState(0);

  const toast = (t: string) => {
    setToastMsg(t);
    setTimeout(() => setToastMsg(null), 2600);
  };

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/api/users/me')
      .then((r: any) => setMe(r.profile))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!me) return;
    const load = () => api('/api/admin/dashboard').then((d: any) => setOpenReports(d.moderation.openReports)).catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [me]);

  if (!ready) return null;
  if (!me?.isAdmin) return <Login onLogin={setMe} />;

  const head = TITLES[page];
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <Icon name="games" size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <h1>Hago</h1>
            <small>Admin Dashboard</small>
          </div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <Icon name={n.icon} />
            {n.label}
            {n.id === 'moderation' && openReports > 0 ? <span className="badge">{openReports}</span> : null}
          </button>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button
            className="nav-item"
            onClick={() => {
              setToken(null);
              location.reload();
            }}
          >
            <Icon name="logout" /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="page-head">
          <div>
            <h2>{head.title}</h2>
            <p>{head.sub}</p>
          </div>
          <div className="row">
            <span className="pill info">
              <Icon name="shield" size={13} /> {me.displayName}
            </span>
          </div>
        </div>

        {page === 'dashboard' && <Dashboard />}
        {page === 'users' && <Users toast={toast} />}
        {page === 'matches' && <Matches />}
        {page === 'economy' && <Economy toast={toast} />}
        {page === 'liveops' && <LiveOps toast={toast} />}
        {page === 'moderation' && <Moderation toast={toast} />}
        {page === 'analytics' && <Analytics />}
      </main>

      {toastMsg ? <div className="toast">{toastMsg}</div> : null}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (p: any) => void }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r: any = await api('/api/auth/login', { method: 'POST', body: { login, password } });
      if (!r.profile.isAdmin) throw new Error('NOT_ADMIN');
      setToken(r.token);
      onLogin(r.profile);
    } catch (err: any) {
      setError(err.message === 'NOT_ADMIN' ? 'Tài khoản này không có quyền quản trị' : 'Sai tài khoản hoặc mật khẩu');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={submit}>
        <div className="row">
          <div className="brand-logo">
            <Icon name="games" size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ color: 'var(--coral)' }}>Hago Admin</h2>
            <span className="muted">Bảng điều khiển vận hành</span>
          </div>
        </div>
        <label className="field">
          Tài khoản
          <input value={login} onChange={(e) => setLogin(e.target.value)} />
        </label>
        <label className="field">
          Mật khẩu
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <div className="pill bad">{error}</div> : null}
        <button className="btn" disabled={busy}>
          {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <span className="muted">Tài khoản demo: admin / admin123</span>
      </form>
    </div>
  );
}
