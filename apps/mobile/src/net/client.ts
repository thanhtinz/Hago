import type { ChatLine, ClientMsg, SeatInfo, ServerMsg } from '@co/protocol';
import type { Outcome, Seat, Turn } from '@co/core';

/**
 * Nối dây tới máy chủ trọng tài.
 *
 * Lớp này **không biết game nào cả**. Nó cầm socket, nối lại khi rớt, và đẩy
 * thông điệp đã đọc ra ngoài. Mọi thứ liên quan tới cờ nằm ở phía kia của
 * dây — client ở đây không chạy engine, không tự tính nước hợp lệ để rồi tin
 * nó. Nó vẽ đúng cái `view` máy chủ gửi về.
 */

export interface RoomInfo {
  code: string;
  gameId: string;
  rated: boolean;
  yourSeat: Seat | null;
  seats: SeatInfo[];
  started: boolean;
}

export interface StateMsg {
  ply: number;
  v: unknown;
  events: unknown[];
  turn: Turn;
  seats: SeatInfo[];
  outcome: Outcome | null;
}

export type Phase = 'off' | 'connecting' | 'ready' | 'queued' | 'lost';

export interface ChallengeMsg {
  id: string;
  dir: 'in' | 'out';
  withId: string;
  withName: string;
  gameId: string;
}

export interface ClientEvents {
  phase: (p: Phase) => void;
  room: (r: RoomInfo | null) => void;
  state: (s: StateMsg) => void;
  queued: (gameId: string, waiting: number) => void;
  error: (code: string, msg: string) => void;
  challenge: (c: ChallengeMsg) => void;
  challengeGone: (id: string, why: 'declined' | 'cancelled' | 'expired' | 'accepted') => void;
  presence: (online: string[]) => void;
  chat: (m: ChatLine) => void;
  chatPage: (channel: string, rows: ChatLine[], more: boolean, reset: boolean) => void;
  chatUnread: (dms: Record<string, number>, system: number) => void;
}

/**
 * Địa chỉ máy chủ.
 *
 * Mặc định đoán từ chính trang đang mở: cùng host, cổng 8787. Nhờ vậy mở app
 * từ điện thoại trong cùng mạng LAN là chạy được ngay, không phải sửa mã.
 * Đặt `EXPO_PUBLIC_SERVER_URL` để trỏ đi nơi khác.
 */
export function serverUrl(): string {
  const env = process.env.EXPO_PUBLIC_SERVER_URL;
  if (env) return env;
  const loc = (globalThis as { location?: { hostname?: string; protocol?: string } }).location;
  const host = loc?.hostname || 'localhost';
  const scheme = loc?.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${host}:8787`;
}

/**
 * Không còn kho `playerId` riêng ở đây nữa.
 *
 * Trước kia client tự nhớ một chuỗi id do máy chủ phát, và ai gửi lại đúng
 * chuỗi đó là thành người đó. Giờ danh tính đến từ **token đăng nhập**, do
 * `src/net/api.ts` giữ — một chỗ duy nhất trong app.
 */
/** Chờ bao lâu trước lần nối lại thứ n. Tăng dần, trần 8 giây. */
const backoff = (n: number) => Math.min(8000, 400 * 2 ** n);

export class GameClient {
  private ws: WebSocket | null = null;
  private tries = 0;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Ý định chờ gửi khi dây nối xong.
   *
   * Là **hàng đợi** chứ không phải một ô: dây chung của cả app có thể nhận
   * "theo dõi danh sách bạn" và "vào hàng chờ ghép cặp" trước khi socket mở
   * xong, và giữ mỗi cái cuối là im lặng đánh rơi cái đầu.
   */
  private pending: ClientMsg[] = [];
  private nonce = 0;

  constructor(
    /** Token phiên đăng nhập. Danh tính và ghế trong phòng đều từ nó mà ra. */
    private readonly token: string,
    private readonly on: Partial<ClientEvents>,
  ) {}

  connect(): void {
    this.closed = false;
    this.on.phase?.('connecting');
    const ws = new WebSocket(serverUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.tries = 0;
      this.raw({ t: 'hello', token: this.token });
      this.on.phase?.('ready');
      const queued = this.pending;
      this.pending = [];
      for (const m of queued) this.raw(m);
    };

    ws.onmessage = (e) => {
      let m: ServerMsg;
      try {
        m = JSON.parse(String(e.data)) as ServerMsg;
      } catch {
        return;
      }
      switch (m.t) {
        case 'welcome':
          return; // id đã biết từ hồ sơ đăng nhập, không cần nhớ thêm
        case 'room':
          // Có phòng nghĩa là đã hết xếp hàng. Không tắt cờ `queued` ở đây thì
          // dải "đang tìm đối thủ" treo lại suốt ván sau khi ghép xong.
          this.on.phase?.('ready');
          return this.on.room?.(m);
        case 'state':
          return this.on.state?.(m);
        case 'queued':
          this.on.phase?.('queued');
          return this.on.queued?.(m.gameId, m.waiting);
        case 'left':
          return this.on.room?.(null);
        case 'challenge':
          return this.on.challenge?.(m);
        case 'challenge-gone':
          return this.on.challengeGone?.(m.id, m.why);
        case 'presence':
          return this.on.presence?.(m.online);
        case 'chat':
          return this.on.chat?.(m.m);
        case 'chat-page':
          return this.on.chatPage?.(m.channel, m.rows, m.more, m.reset);
        case 'chat-unread':
          return this.on.chatUnread?.(m.dms, m.system);
        case 'error':
          return this.on.error?.(m.code, m.msg);
      }
    };

    // Rớt dây thì nối lại, **không** báo thua. Ghế vẫn giữ ở máy chủ và đồng
    // hồ vẫn chạy, nên im lặng thử lại đúng hơn là đá người ra khỏi ván.
    ws.onclose = () => {
      this.ws = null;
      if (this.closed) return;
      this.on.phase?.('lost');
      this.timer = setTimeout(() => this.connect(), backoff(this.tries++));
    };
    ws.onerror = () => ws.close();
  }

  private raw(m: ClientMsg): void {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m));
    else this.pending.push(m);
  }

  create(gameId: string, config?: unknown): void {
    this.raw({ t: 'create', gameId, ...(config === undefined ? {} : { config }) });
  }
  join(code: string): void {
    this.raw({ t: 'join', code: code.trim().toUpperCase() });
  }
  quick(gameId: string): void {
    this.raw({ t: 'quick', gameId });
  }
  leave(): void {
    this.raw({ t: 'leave' });
  }
  challenge(to: string, gameId: string): void {
    this.raw({ t: 'challenge', to, gameId });
  }
  answerChallenge(id: string, accept: boolean): void {
    this.raw({ t: 'challenge-answer', id, accept });
  }
  cancelChallenge(id: string): void {
    this.raw({ t: 'challenge-cancel', id });
  }
  watch(ids: string[]): void {
    this.raw({ t: 'watch', ids });
  }
  openChat(channel: string): void {
    this.raw({ t: 'chat-open', channel });
  }
  sendChat(channel: string, body: string): void {
    this.raw({ t: 'chat-send', channel, body });
  }
  moreChat(channel: string, before: number): void {
    this.raw({ t: 'chat-more', channel, before });
  }
  readChat(channel: string, lastId: number): void {
    this.raw({ t: 'chat-read', channel, lastId });
  }

  /**
   * Gửi một nước. Mỗi nước một `nonce` riêng, và **gửi lại đúng nonce đó** khi
   * không chắc nước đã tới nơi — máy chủ bỏ qua bản thứ hai thay vì đánh hai
   * lần. Đây là lý do nonce đếm theo client chứ không sinh ngẫu nhiên.
   */
  act(action: unknown): void {
    this.raw({ t: 'act', nonce: `n${this.nonce++}`, action });
  }

  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
    this.on.phase?.('off');
  }
}
