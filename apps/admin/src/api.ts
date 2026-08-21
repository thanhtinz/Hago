const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'hago.admin.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(json.error ?? 'REQUEST_FAILED', res.status);
  return json as T;
}

export const avatarUrl = (style?: string, seed?: string, size = 64) =>
  `${BASE}/avatar/${style || 'adventurer'}/${encodeURIComponent(seed || 'hago')}.svg?size=${size}`;

export const fmtNum = (n: number) => (n ?? 0).toLocaleString('vi-VN');
export const fmtDate = (ts?: number | null) =>
  ts ? new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const GAME_NAMES: Record<string, string> = {
  caro: 'Cờ Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep Battle',
  chess: 'Cờ Vua',
  flappy: 'Flappy Bird',
  werewolf: 'Ma Sói',
};

/** Nhãn ngắn dùng cho biểu đồ, tránh cắt chữ. */
export const GAME_SHORT: Record<string, string> = {
  caro: 'Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep',
  chess: 'Cờ Vua',
  flappy: 'Flappy',
  werewolf: 'Ma Sói',
};
