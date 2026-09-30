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
  /** Mã con dấu (`do-xe`), hoặc `up:<tên tệp>` khi là ảnh tải lên. */
  avatar: string | null;
  createdAt: number;
  /** Một dòng tự giới thiệu, hoặc null. */
  bio: string | null;
}

/** Đường dẫn ảnh đại diện nếu là ảnh tải lên, null nếu là con dấu. */
export function avatarUrl(avatar: string | null): string | null {
  return avatar?.startsWith('up:') ? `${apiBase()}/avatars/${avatar.slice(3)}` : null;
}

export interface PublicUser {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: number;
  /** Một dòng tự giới thiệu, hoặc null. */
  bio: string | null;
}

export interface GameStat {
  gameId: string;
  win: number;
  draw: number;
  loss: number;
  rating: number;
  best: number;
  /** Bao nhiêu ván trong số đó là ván xếp hạng. */
  ranked: number;
}

export interface MatchRow {
  id: number;
  gameId: string;
  opponent: string;
  opponentId: string | null;
  result: 'win' | 'draw' | 'loss';
  reason: string;
  rated: boolean;
  delta: number;
  at: number;
}

export interface HistoryPage {
  rows: MatchRow[];
  /** Còn trang sau hay không. Máy chủ lấy dư một hàng để biết, không đếm lại. */
  more: boolean;
  /** Tổng số ván khớp bộ lọc — không phải số hàng của trang này. */
  total: number;
}

export interface Profile {
  user: Me;
  /** Tài khoản Google thuần thì chưa có mật khẩu nào. */
  hasPassword: boolean;
  stats: GameStat[];
  history: HistoryPage;
  streak: { kind: 'win' | 'draw' | 'loss'; n: number } | null;
  friends: number;
  requests: number;
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
  bio: async (bio: string) => {
    const r = await post<{ user: Me }>('/me/bio', { bio });
    set({ me: r.user });
  },
  /** Đổi mật khẩu. Máy chủ đá mọi phiên khác ra và trả về số phiên đã đá. */
  password: (old: string, next: string) => post<{ loggedOut: number }>('/me/password', { old, next }),
  sessions: () => call<{ sessions: { id: string; createdAt: number; expiresAt: number; current: boolean }[] }>('/me/sessions'),
  logoutOthers: () => call<{ loggedOut: number }>('/me/sessions', { method: 'DELETE', body: JSON.stringify({}) }),
  exportAll: () => call<Record<string, unknown>>('/me/export'),
  avatar: async (avatar: string) => {
    const r = await post<{ user: Me }>('/me/avatar', { avatar });
    set({ me: r.user });
  },
  /** Gửi thẳng tệp ảnh làm thân yêu cầu — không multipart, chỉ có một tệp. */
  uploadAvatar: async (blob: Blob) => {
    const t = read();
    const res = await fetch(`${apiBase()}/api/me/avatar/upload`, {
      method: 'POST',
      headers: { 'content-type': blob.type || 'image/jpeg', ...(t ? { authorization: `Bearer ${t}` } : {}) },
      body: blob,
    });
    const body = (await res.json().catch(() => ({}))) as { code?: string; msg?: string; user?: Me };
    if (!res.ok || !body.user) throw new ApiError(body.code ?? 'SERVER', body.msg ?? 'Không tải được ảnh lên');
    set({ me: body.user });
  },
  remove: async (confirm: string) => {
    await call('/me', { method: 'DELETE', body: JSON.stringify({ confirm }) });
    write(null);
    set({ me: null, loading: false });
  },
};

export interface BoardRow {
  rank: number;
  user: PublicUser;
  rating: number;
  played: number;
  win: number;
  /** Bao nhiêu ván trong số đó là ván xếp hạng. Danh hiệu đọc con số này. */
  ranked: number;
}

export interface Board {
  rows: BoardRow[];
  /** Hạng của chính mình, kể cả khi nằm ngoài danh sách. */
  me: { rank: number; rating: number; played: number; ranked: number } | null;
  /** Số ván tối thiểu để có tên trong bảng. */
  minRanked: number;
}

export interface MatchDetail {
  id: number;
  gameId: string;
  names: [string, string];
  ids: [string | null, string | null];
  winner: number | null;
  reason: string;
  rated: boolean;
  at: number;
  /** Log input dạng JSON, đủ để dựng lại toàn bộ ván. `null` là ván cũ. */
  log: string | null;
}

export const api = {
  me: () => call<Profile>('/me'),
  /** Một ván đã đánh, kèm log để phát lại. */
  match: (id: number | string) => call<MatchDetail>(`/matches/${id}`),
  /** `game` bỏ trống là bảng tổng. */
  board: (game?: string) => call<Board>(`/leaderboard${game ? `?game=${encodeURIComponent(game)}` : ''}`),
  /** Một trang lịch sử. `before` là `id` của hàng cuối trang trước. */
  history: (o: { before?: number; game?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (o.before) q.set('before', String(o.before));
    if (o.game) q.set('game', o.game);
    if (o.limit) q.set('limit', String(o.limit));
    const s = q.toString();
    return call<HistoryPage>(`/me/history${s ? `?${s}` : ''}`);
  },
  user: (id: string) =>
    call<{ user: PublicUser; stats: GameStat[]; history: HistoryPage; streak: Profile['streak']; friend: boolean; blocked: boolean }>(
      `/users/${id}`,
    ),
  search: (q: string) => call<{ users: PublicUser[] }>(`/users?q=${encodeURIComponent(q)}`),
  friends: () => call<{ friends: Friend[]; blocked: PublicUser[] }>('/friends'),
  /** Thông báo hệ thống: kênh chung và kênh riêng gộp làm một dòng thời gian. */
  systemFeed: () =>
    call<{ rows: { id: number; channel: string; fromId: string | null; fromName: string; body: string; at: number }[] }>('/chat/system'),
  report: (id: string, reason: string, note: string) => post('/friends/report', { id, reason, note }),
  conversations: () =>
    call<{ rows: { withId: string; withName: string; withAvatar: string | null; last: { body: string; at: number; fromId: string | null }; unread: number }[] }>(
      '/chat/conversations',
    ),
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
