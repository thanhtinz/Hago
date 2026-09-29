import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Outcome, Seat, Turn } from '@co/core';
import type { ChatLine, SeatInfo } from '@co/protocol';
import { token, useAuth } from './api';
import { GameClient, type Phase, type RoomInfo, type StateMsg } from './client';

/**
 * **Một** dây nối cho cả app, sống suốt phiên đăng nhập.
 *
 * Trước đây mỗi màn chơi tự mở một socket rồi đóng khi rời màn. Cách đó chạy
 * được khi app chỉ có mỗi việc đánh cờ, nhưng nó không nhận được gì khi người
 * dùng đang ở sảnh hay ở danh sách bạn — mà lời rủ đấu và tin nhắn thì đến
 * đúng lúc đó. Một dây nối ở tầng app giải quyết cả hai, và nó cũng đúng hơn
 * về tài nguyên: một kết nối, không phải một kết nối mỗi lần mở màn chơi.
 *
 * Trạng thái để ngoài React (`state` bên dưới) vì nó phải sống lâu hơn mọi
 * component, kể cả khi không màn nào đang hiển thị.
 */

export interface ChallengeItem {
  id: string;
  dir: 'in' | 'out';
  withId: string;
  withName: string;
  gameId: string;
}

export interface LiveState {
  phase: Phase;
  room: RoomInfo | null;
  st: StateMsg | null;
  waiting: number | null;
  error: string | null;
  challenges: ChallengeItem[];
  /** Id những người đang trực tuyến, trong số mình đang theo dõi. */
  online: Set<string>;
  /** Lời rủ vừa được nhận lời — màn hình dùng nó để chuyển sang bàn cờ. */
  justMatched: string | null;
  /** Kênh nhắn tin đang mở, và nội dung của nó. */
  chat: { channel: string | null; rows: ChatLine[]; more: boolean };
  /** Số tin chưa đọc theo từng người. */
  unread: Record<string, number>;
}

const EMPTY: LiveState = {
  phase: 'off',
  room: null,
  st: null,
  waiting: null,
  error: null,
  challenges: [],
  online: new Set(),
  justMatched: null,
  chat: { channel: null, rows: [], more: false },
  unread: {},
};

let state: LiveState = EMPTY;
let client: GameClient | null = null;
let watchList: string[] = [];
const subs = new Set<() => void>();

const emit = () => {
  for (const f of subs) f();
};
const set = (patch: Partial<LiveState>) => {
  state = { ...state, ...patch };
  emit();
};

function open(t: string): void {
  client?.close();
  state = EMPTY;
  client = new GameClient(t, {
    phase: (phase) => set({ phase }),
    room: (room) => {
      // Đổi phòng thì vứt `view` cũ: `room` và `state` là hai thông điệp rời
      // nhau, nên có khoảnh khắc phòng đã là bộ môn khác mà view vẫn là ván cũ.
      if (state.room?.code !== room?.code) set({ st: null });
      set({ room, ...(room ? { waiting: null } : {}) });
    },
    state: (st) => set({ st }),
    queued: (_g, waiting) => set({ waiting }),
    error: (_c, msg) => set({ error: msg }),
    challenge: (c) => set({ challenges: [...state.challenges.filter((x) => x.id !== c.id), c] }),
    challengeGone: (id, why) =>
      set({
        challenges: state.challenges.filter((x) => x.id !== id),
        ...(why === 'accepted' ? { justMatched: id } : {}),
      }),
    presence: (ids) => set({ online: new Set(ids) }),
    chat: (m) => {
      // Tin của kênh khác vẫn tới khi hai màn chat chồng nhau lúc chuyển —
      // bỏ qua, nếu không nó chen vào cuộc trò chuyện đang mở.
      if (m.channel !== state.chat.channel) return;
      set({ chat: { ...state.chat, rows: [...state.chat.rows, m] } });
    },
    chatPage: (channel, rows, more, reset) => {
      if (reset) return set({ chat: { channel, rows, more } });
      if (channel !== state.chat.channel) return;
      // Trang cũ hơn nối vào **đầu** danh sách: cuộn lên là đi ngược thời gian.
      set({ chat: { channel, rows: [...rows, ...state.chat.rows], more } });
    },
    chatUnread: (dms) => set({ unread: dms }),
  });
  client.connect();
  if (watchList.length) client.watch(watchList);
}

function close(): void {
  client?.close();
  client = null;
  state = EMPTY;
  emit();
}

/**
 * Mở dây khi đăng nhập, đóng khi đăng xuất. Gọi **một lần** ở lớp ngoài cùng.
 */
export function useLiveSession(): void {
  const { me } = useAuth();
  useEffect(() => {
    if (!me) {
      close();
      return;
    }
    const t = token();
    if (t) open(t);
    return () => close();
  }, [me?.id]);
}

export function useLive(): LiveState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}

/** Theo dõi trạng thái trực tuyến của một nhóm người. */
export function useWatch(ids: string[]): void {
  const key = ids.join(',');
  useEffect(() => {
    watchList = ids;
    client?.watch(ids);
    // `key` chứ không phải `ids`: mảng mới mỗi lần render sẽ gửi lại danh
    // sách y hệt mỗi khung hình.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export const live = {
  quick: (gameId: string) => client?.quick(gameId),
  create: (gameId: string) => client?.create(gameId),
  join: (code: string) => client?.join(code),
  leave: () => client?.leave(),
  act: (action: unknown) => client?.act(action),
  challenge: (to: string, gameId: string) => client?.challenge(to, gameId),
  answer: (id: string, accept: boolean) => client?.answerChallenge(id, accept),
  cancel: (id: string) => client?.cancelChallenge(id),
  openChat: (channel: string) => {
    // Xoá nội dung cũ ngay, không đợi trang đầu về: thấy cuộc trò chuyện của
    // người trước trong một nhịp rồi mới đổi là cú nhảy khó chịu, và tệ hơn
    // là một thoáng đọc được nội dung không thuộc về màn này.
    set({ chat: { channel, rows: [], more: false } });
    client?.openChat(channel);
  },
  closeChat: () => set({ chat: { channel: null, rows: [], more: false } }),
  sendChat: (channel: string, body: string) => client?.sendChat(channel, body),
  moreChat: (channel: string, before: number) => client?.moreChat(channel, before),
  readChat: (channel: string, lastId: number) => client?.readChat(channel, lastId),
  clearMatched: () => set({ justMatched: null }),
  clearError: () => set({ error: null }),
};

/** Góc nhìn của màn chơi: giống hệt hình dạng cũ, nhưng lấy từ dây chung. */
export interface Online {
  phase: Phase;
  room: RoomInfo | null;
  view: unknown;
  ply: number;
  turn: Turn | null;
  seats: SeatInfo[];
  outcome: Outcome | null;
  mySeat: Seat | null;
  myTurn: boolean;
  waiting: number | null;
  error: string | null;
  send: (action: unknown) => void;
  leave: () => void;
}

export function useMatch(): Online {
  const s = useLive();
  const mySeat = s.room?.yourSeat ?? null;
  const turn = s.st?.turn ?? null;
  const myTurn =
    !s.st?.outcome &&
    mySeat !== null &&
    turn !== null &&
    (turn.kind === 'seat' ? turn.seat === mySeat : turn.kind === 'sealed' ? turn.seats.includes(mySeat) : false);
  const send = useCallback((a: unknown) => {
    live.clearError();
    live.act(a);
  }, []);
  return {
    phase: s.phase,
    room: s.room,
    view: s.st?.v ?? null,
    ply: s.st?.ply ?? 0,
    turn,
    seats: s.st?.seats ?? s.room?.seats ?? [],
    outcome: s.st?.outcome ?? null,
    mySeat,
    myTurn,
    waiting: s.waiting,
    error: s.error,
    send,
    leave: () => live.leave(),
  };
}

/** Dùng cho màn chờ: đã gửi ý định vào phòng chưa. */
export function useIntentOnce(run: () => void): void {
  const [done, setDone] = useState(false);
  const { phase } = useLive();
  useEffect(() => {
    if (done || phase === 'off' || phase === 'connecting') return;
    run();
    setDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, done]);
}
