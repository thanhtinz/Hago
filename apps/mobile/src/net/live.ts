import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Outcome, Seat, Turn } from '@co/core';
import type { ChatLine, LiveRoom, OpenRoom, SeatInfo } from '@co/protocol';
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
  /** Số thông báo hệ thống chưa đọc. */
  unreadSystem: number;
  /** Nhịp thở của sảnh. `null` là chưa nhận được nhịp nào. */
  lobby: { online: number; rooms: number; queued: number } | null;
  /** Những ván đang đánh mà ai cũng xem được. */
  liveRooms: LiveRoom[];
  /** Những phòng đang chờ người thứ hai. */
  openRooms: OpenRoom[];
  /**
   * Lúc nhận nhịp sảnh gần nhất.
   *
   * `waitedMs` của mỗi phòng là ảnh chụp tại thời điểm đó. Máy chủ chỉ gửi
   * lại khi có người vào ra, nên màn nào in "đã chờ bao lâu" phải cộng
   * thêm quãng từ mốc này — nếu không, một phòng mở nửa tiếng vẫn ghi
   * "vừa mở".
   */
  lobbyAt: number;
  /** Số lời mời kết bạn đang chờ mình trả lời. */
  friendRequests: number;
  /**
   * Máy chủ vừa nối lại ghế cũ, và **chưa màn nào tiêu thụ tin đó**.
   * `null` là chưa nối dây xong.
   *
   * Cờ này giải đúng một tình huống: bấm F5 khi đang ở giữa ván. Lúc đó
   * đường dẫn vẫn là `/online/quick?...`, và màn chơi sẽ gửi lại ý định
   * "vào hàng chờ" ngay khi socket mở — mà vào hàng chờ là rời phòng hiện
   * tại, và rời phòng giữa ván là bỏ trận.
   *
   * Nó là cờ **dùng một lần**: màn nào mở ra trước thì tiêu thụ nó. Vào
   * thẳng bàn cờ thì bàn cờ tiêu thụ và bỏ qua ý định; còn nếu người dùng
   * đã ghé qua sảnh thì sảnh tiêu thụ — đã ghé sảnh nghĩa là họ đang tự
   * chọn việc tiếp theo, và lựa chọn đó phải được nghe.
   */
  restored: boolean | null;
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
  unreadSystem: 0,
  lobby: null,
  liveRooms: [],
  openRooms: [],
  lobbyAt: 0,
  friendRequests: 0,
  restored: null,
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
      // Rời phòng là hết "ghế cũ": lần vào ván sau phải gửi lại ý định.
      if (!room) set({ restored: false });
      // Đổi phòng thì vứt `view` cũ: `room` và `state` là hai thông điệp rời
      // nhau, nên có khoảnh khắc phòng đã là bộ môn khác mà view vẫn là ván cũ.
      // Đấu lại cũng vậy: cùng mã phòng nhưng khác ván, và thế cờ cũ còn
      // mang kết quả ván trước — để nguyên thì tấm "Bạn thua" đứng lại trên
      // bàn cờ mới trong một nhịp.
      if (state.room?.code !== room?.code || state.room?.game !== room?.game) set({ st: null });
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
    chatUnread: (dms, system) => set({ unread: dms, unreadSystem: system }),
    // Nhịp đồng hồ chỉ đụng vào `ms` của từng ghế, không đụng thế cờ. Gộp
    // vào `st` để màn chơi đọc đồng hồ ở đúng một chỗ như mọi thứ khác.
    welcome: (inRoom) => set({ restored: inRoom }),
    lobby: (online, rooms, queued, liveRooms, openRooms) => set({ lobby: { online, rooms, queued }, liveRooms, openRooms, lobbyAt: Date.now() }),
    alerts: (friendRequests) => set({ friendRequests }),
    clock: (ms) => {
      const st = state.st;
      if (!st) return;
      set({ st: { ...st, seats: st.seats.map((s, i) => ({ ...s, ms: ms[i] ?? s.ms })) } });
    },
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
  quick: (gameId: string, clock?: string) => client?.quick(gameId, clock),
  create: (gameId: string, o: { clock?: string; pass?: string } = {}) => client?.create(gameId, o),
  join: (code: string, pass?: string) => client?.join(code, pass),
  leave: () => client?.leave(),
  spectate: (code: string) => client?.spectate(code),
  unspectate: () => client?.unspectate(),
  rematch: (want: boolean) => client?.rematch(want),
  act: (action: unknown) => client?.act(action),
  challenge: (to: string, gameId: string) => client?.challenge(to, gameId),
  invite: (to: string) => client?.invite(to),
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
  /**
   * Quên thế cờ đang giữ.
   *
   * Gọi ngay trước khi gửi một ý định mới. Không gọi thì một lần vào mã bị
   * từ chối (sai mật khẩu, phòng đầy) sẽ **vẫn vẽ ván cũ**: máy chủ trả lỗi
   * chứ không gửi `left`, nên `st` của ván trước còn nguyên và màn chơi
   * tưởng mình đang ở trong đó.
   */
  forget: () => set({ room: null, st: null, waiting: null, error: null }),
  /**
   * Tiêu thụ cờ "vừa nối lại ghế cũ".
   *
   * Sảnh gọi khi mở ra: người dùng đã ở sảnh thì mọi thứ họ bấm sau đó là
   * một lựa chọn mới, không phải dư âm của lần tải trang.
   */
  seen: () => {
    if (state.restored) set({ restored: false });
  },
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
  /**
   * Lời cầu hoà đang treo là của ai, hoặc null.
   *
   * Đọc ra từ `events` của `view` — lớp meta phát `{kind:'draw-offer'}` mỗi
   * lần dựng view, nên nó có mặt suốt thời gian lời cầu còn hiệu lực chứ
   * không phải một sự kiện chớp qua một lần rồi mất.
   */
  drawOffer: 'mine' | 'theirs' | null;
  /** Biên bản nước đi, theo thứ tự. */
  moves: { seat: Seat; a: unknown }[];
  /** Mình đã xin đấu lại chưa, và đối thủ đã xin chưa. */
  rematch: { mine: boolean; theirs: boolean };
  send: (action: unknown) => void;
  leave: () => void;
  askRematch: (want: boolean) => void;
}

/** Sự kiện của lớp meta, hình dạng đúng như `MetaEvent` trong core. */
interface MetaEventLike {
  t?: string;
  kind?: string;
  seat?: number;
}

function drawOfferOf(events: unknown[] | undefined, mySeat: Seat | null): 'mine' | 'theirs' | null {
  if (!events || mySeat === null) return null;
  for (const e of events) {
    const m = e as MetaEventLike;
    if (m?.t === 'meta' && m.kind === 'draw-offer') return m.seat === mySeat ? 'mine' : 'theirs';
  }
  return null;
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
    drawOffer: drawOfferOf(s.st?.events, mySeat),
    moves: s.st?.moves ?? [],
    rematch: {
      mine: mySeat !== null && !!s.room?.rematch?.includes(mySeat),
      theirs: !!s.room?.rematch?.some((x) => x !== mySeat),
    },
    send,
    leave: () => live.leave(),
    askRematch: (want: boolean) => live.rematch(want),
  };
}

/** Dùng cho màn chờ: đã gửi ý định vào phòng chưa. */
export function useIntentOnce(run: () => void): void {
  const [done, setDone] = useState(false);
  const { phase, restored } = useLive();
  useEffect(() => {
    if (done || phase === 'off' || phase === 'connecting') return;
    // Chờ máy chủ trả lời đã nối lại ghế cũ hay chưa. `'ready'` chỉ nghĩa
    // là socket đã mở, và nó mở **trước** khi máy chủ kịp nói mình đang ở
    // trong phòng nào.
    if (restored === null) return;
    setDone(true);
    if (restored) live.seen();
    // Đã có ghế sẵn thì đừng gửi lại ý định trong đường dẫn: `quick` và
    // `create` ở máy chủ đều rời phòng hiện tại trước, nên gửi lại là tự
    // bỏ trận ván đang đánh dở.
    if (restored) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restored, done]);
}
