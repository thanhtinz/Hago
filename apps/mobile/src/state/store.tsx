import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api, getToken, setToken } from '../lib/api';
import { closeSocket, connectSocket } from '../lib/socket';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  avatarStyle: string;
  frameId: string | null;
  titleId: string | null;
  level: number;
  xp: number;
  rating: number;
  rank: string;
  coin: number;
  diamond: number;
  seasonToken: number;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  bio: string;
  isAdmin?: boolean;
  perGame: Record<string, { matches: number; wins: number; losses: number; rating: number }>;
}

interface Ctx {
  ready: boolean;
  profile: Profile | null;
  socket: Socket | null;
  connected: boolean;
  unread: number;
  toast: { text: string; tone: 'ok' | 'warn' } | null;
  showToast: (text: string, tone?: 'ok' | 'warn') => void;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUnread: (n: number) => void;
}

const StoreContext = createContext<Ctx>({} as Ctx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<Ctx['toast']>(null);
  const toastTimer = useRef<any>(null);

  const showToast = useCallback((text: string, tone: 'ok' | 'warn' = 'ok') => {
    setToast({ text, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const bootSocket = useCallback(async () => {
    const s = await connectSocket();
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('notification', (n: any) => {
      setUnread((u) => u + 1);
      showToast(`${n.title}`, 'ok');
    });
    setSocket(s);
    setConnected(s.connected);
  }, [showToast]);

  const refresh = useCallback(async () => {
    try {
      const { profile: p } = await api<{ profile: Profile }>('/api/users/me');
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        await refresh();
        await bootSocket();
      }
      setReady(true);
    })();
  }, [refresh, bootSocket]);

  const login = useCallback(
    async (loginName: string, password: string) => {
      const res = await api<{ token: string; profile: Profile }>('/api/auth/login', {
        method: 'POST',
        body: { login: loginName, password },
        auth: false,
      });
      await setToken(res.token);
      setProfile(res.profile);
      await bootSocket();
    },
    [bootSocket],
  );

  const register = useCallback(
    async (data: { username: string; password: string; displayName?: string }) => {
      const res = await api<{ token: string; profile: Profile }>('/api/auth/register', {
        method: 'POST',
        body: data,
        auth: false,
      });
      await setToken(res.token);
      setProfile(res.profile);
      await bootSocket();
    },
    [bootSocket],
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* offline logout vẫn xoá token local */
    }
    closeSocket();
    await setToken(null);
    setProfile(null);
    setSocket(null);
    setConnected(false);
  }, []);

  const value = useMemo(
    () => ({ ready, profile, socket, connected, unread, toast, showToast, login, register, logout, refresh, setUnread }),
    [ready, profile, socket, connected, unread, toast, showToast, login, register, logout, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
