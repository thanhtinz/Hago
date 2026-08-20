import React from 'react';
import { avatarUrl } from './api';

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card">
      {title || action ? (
        <div className="spread" style={{ marginBottom: 12 }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, emoji, color }: { label: string; value: React.ReactNode; sub?: string; emoji?: string; color?: string }) {
  return (
    <div className="card kpi-card">
      <span className="label">
        {emoji} {label}
      </span>
      <span className="value" style={{ color }}>
        {value}
      </span>
      {sub ? <span className="sub">{sub}</span> : null}
    </div>
  );
}

export function Pill({ tone = 'muted', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted'; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function UserCell({ user }: { user: any }) {
  return (
    <div className="row">
      <img className="avatar" src={avatarUrl(user.avatarStyle, user.avatarSeed)} alt="" />
      <div>
        <div style={{ fontWeight: 700 }}>{user.displayName}</div>
        <div className="muted">@{user.username}</div>
      </div>
    </div>
  );
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="empty">
      <span className="emoji">{emoji}</span>
      {text}
    </div>
  );
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart">
      {data.map((d, i) => (
        <div className="col" key={i} title={`${d.label}: ${d.value}`}>
          <span className="cap" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>
            {d.value}
          </span>
          <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="cap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
