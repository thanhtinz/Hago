import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Gọi API tài khoản, và giữ phiên đăng nhập.
 *
 * Token nằm ở một chỗ duy nhất trong app (`store` bên dưới) và mọi màn hình
 * đọc qua `useAuth`. Rải token ra nhiều nơi là cách chắc chắn nhất để một màn
 * hình vẫn tưởng còn đăng nhập sau khi màn hình khác đã đăng xuất.
 */

export interface Me {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  createdAt: number;
}

export interface PublicUser {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: number;
}

export interface GameStat {
  gameId: string;
  win: number;
  draw: number;
  loss: number;
}

export interface Friend {
  user: PublicUser;
  status: 'accepted' | 'pending';
  /** True nếu đây là lời mời **người ta gửi đến mình**, chờ mình bấm nhận. */
  incoming: boolean;
}

export function apiBase(): string {
  const env = process.env.EXPO_PUBLIC_SERVER_URL;
  if (env) return env.replace(/^ws/, 'http');
  const loc = (globalThis as { location?: { hostname?: string; protocol?: string } }).location;
  return `${loc?.protocol === 'https:' ? 'https' : 'http'}://${loc?.hostname || 'localhost'}:8787`;
}

/** Lưu token qua một lần tải lại trang. Chỗ nào không có localStorage thì giữ trong bộ nhớ. */
let mem: string | null = null;
const read = (): string | null => {
  try {
    return globalThis.localStorage?.getItem('co.token') ?? mem;
  } catch {
    return mem;
  }
};
const write = (v: string | null) => {
  mem = v;
  try {
    if (v === null) globalThis.localStorage?.removeItem('co.token');
    else globalThis.localStorage?.setItem('co.token', v);
  } catch {
    /* chế độ riêng tư chặn localStorage — vẫn chơi được, chỉ mất khả năng F5 */
  }
};

export class ApiError extends Error {
  constructor(
    readonly code: string,
    msg: string,
  ) {
    super(msg);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = read();
  const res = await fetch(`${apiBase()}/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as { code?: string; msg?: string };
  if (!res.ok) throw new ApiError(body.code ?? 'SERVER', body.msg ?? 'Máy chủ không trả lời đúng');
  return body as T;
}

const post = <T,>(path: string, body?: unknown) =>
  call<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

// ---- kho phiên, một bản duy nhất cho cả app --------------------------

type Auth = { me: Me | null; loading: boolean };
let state: Auth = { me: null, loading: true };
const subs = new Set<() => void>();
const emit = () => {
  for (const f of subs) f();
};
const set = (a: Partial<Auth>) => {
  state = { ...state, ...a };
  emit();
};

/** Lấy lại hồ sơ từ token đang lưu. Token hỏng thì xoá luôn. */
export async function restore(): Promise<void> {
  if (!read()) return set({ me: null, loading: false });
  try {
    const r = await call<{ user: Me }>('/me');
    set({ me: r.user, loading: false });
  } catch {
    write(null);
    set({ me: null, loading: false });
  }
}

export function useAuth(): Auth {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}

export function token(): string | null {
  return read();
}

/**
 * Tên để hiện ở thanh người chơi khi **đấu với máy**.
 *
 * Ván với máy không đòi đăng nhập, nên phải có đường đi cho cả hai trường
 * hợp. Đã đăng nhập thì thấy tên mình; chưa thì "Bạn" — không bịa ra một cái
 * tên khách, vì tài khoản khách đã bị bỏ.
 */
export function meName(): string {
  return state.me?.name ?? 'Bạn';
}

const accept = (r: { token: string; user: Me }) => {
  write(r.token);
  set({ me: r.user, loading: false });
};

export const auth = {
  config: () => call<{ google: boolean }>('/auth/config'),
  register: async (name: string, email: string, password: string) => accept(await post('/auth/register', { name, email, password })),
  login: async (email: string, password: string) => accept(await post('/auth/login', { email, password })),
  google: async (idToken: string) => accept(await post('/auth/google', { idToken })),
  logout: async () => {
    // Xoá ở máy **trước**, rồi mới báo máy chủ. Ngược lại thì mạng hỏng giữa
    // chừng là người dùng bấm đăng xuất mà vẫn còn đăng nhập.
    const t = read();
    write(null);
    set({ me: null, loading: false });
    if (t) await post('/auth/logout').catch(() => {});
  },
  rename: async (name: string) => {
    const r = await post<{ user: Me }>('/me/name', { name });
    set({ me: r.user });
  },
};

export const api = {
  me: () => call<{ user: Me; stats: GameStat[] }>('/me'),
  user: (id: string) => call<{ user: PublicUser; stats: GameStat[]; friend: boolean; blocked: boolean }>(`/users/${id}`),
  search: (q: string) => call<{ users: PublicUser[] }>(`/users?q=${encodeURIComponent(q)}`),
  friends: () => call<{ friends: Friend[]; blocked: PublicUser[] }>('/friends'),
  request: (id: string) => post<{ status: string }>('/friends/request', { id }),
  accept: (id: string) => post('/friends/accept', { id }),
  remove: (id: string) => post('/friends/remove', { id }),
  block: (id: string) => post('/friends/block', { id }),
  unblock: (id: string) => post('/friends/unblock', { id }),
};

/** Gọi một lần khi app mở. */
export function useRestoreOnce(): void {
  useEffect(() => {
    void restore();
  }, []);
}

/** Bọc một lời gọi API thành trạng thái đang chạy / lỗi, để màn hình đỡ lặp. */
export function useAction(): { busy: boolean; error: string | null; run: (f: () => Promise<unknown>) => void } {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback((f: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    void f()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Có lỗi xảy ra'))
      .finally(() => setBusy(false));
  }, []);
  return { busy, error, run };
}
