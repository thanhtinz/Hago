import React from 'react';

/** Icon SVG cho admin — cùng nguyên tắc với app: không dùng emoji làm icon. */
export type AdminIcon =
  | 'dashboard'
  | 'users'
  | 'games'
  | 'coins'
  | 'events'
  | 'shield'
  | 'chart'
  | 'logout'
  | 'search'
  | 'check'
  | 'close'
  | 'megaphone'
  | 'clipboard';

const PATHS: Record<AdminIcon, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8.5" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="3.5" y="15" width="7" height="5.5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6.5a3 3 0 010 6" />
      <path d="M17 14.4c2 .7 3.5 2.4 3.5 4.6" />
    </>
  ),
  games: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <path d="M7.5 12h3M9 10.5v3" />
      <circle cx="16" cy="11" r="1" />
      <circle cx="18" cy="13.5" r="1" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </>
  ),
  events: (
    <>
      <path d="M4 10h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" />
      <path d="M3 7.5h18V10H3z" />
      <path d="M12 7.5v13" />
      <path d="M12 7.5c-2.5 0-4-1-4-2.2S9.5 3.5 12 7.5zM12 7.5c2.5 0 4-1 4-2.2S14.5 3.5 12 7.5z" />
    </>
  ),
  shield: <path d="M12 3.5l7 2.6v5c0 4.3-2.9 8.1-7 9.4-4.1-1.3-7-5.1-7-9.4v-5l7-2.6z" />,
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4" />
      <path d="M12.5 16V8" />
      <path d="M17 16v-6" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4H6.5A2.5 2.5 0 004 6.5v11A2.5 2.5 0 006.5 20H14" />
      <path d="M17 8l4 4-4 4" />
      <path d="M21 12h-9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6L20 20" />
    </>
  ),
  check: <polyline points="4 13 9 18 20 6" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 001 1h2l7 4V5L7 9H5a1 1 0 00-1 1z" />
      <path d="M17.5 9a4 4 0 010 6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2.5" />
      <path d="M9 4.5V3.5h6v1" />
      <path d="M9 10h6M9 14h4" />
    </>
  ),
};

export function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.9 }: { name: AdminIcon; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
