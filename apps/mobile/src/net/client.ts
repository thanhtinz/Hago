import type { ClientMsg, SeatInfo, ServerMsg } from '@co/protocol';
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

export interface ClientEvents {
  phase: (p: Phase) => void;
  room: (r: RoomInfo | null) => void;
  state: (s: StateMsg) => void;
  queued: (gameId: string, waiting: number) => void;
  error: (code: string, msg: string) => void;
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
 * `playerId` sống qua một lần tải lại trang, nên F5 giữa ván là vào lại đúng
 * ghế cũ chứ không phải xử thua. Trên web dùng `localStorage`; chỗ nào không
 * có thì giữ trong bộ nhớ — mất khi tắt app, và như vậy là đúng mức trung
 * thực: chưa cài kho lưu cho máy thật thì đừng vờ như đã có.
 */
const memory: Record<string, string> = {};
const store = {
  get(k: string): string | null {
    try {
      return globalThis.localStorage?.getItem(k) ?? memory[k] ?? null;
    } catch {
      return memory[k] ?? null;
    }
  },
  set(k: string, v: string) {
    memory[k] = v;
    try {
      globalThis.localStorage?.setItem(k, v);
    } catch {
      /* chế độ riêng tư chặn localStorage — vẫn chơi được, chỉ mất khả năng F5 */
    }
  },
};

/**
 * Tên hiển thị khi chưa có tài khoản.
 *
 * Phải **phân biệt được hai người**: hai thanh người chơi cùng ghi "Khách" thì
 * không ai biết thanh nào là mình. Số thứ tự bốc một lần rồi giữ, nên vào lại
 * vẫn là đúng cái tên đối thủ đã thấy. Đây là chỗ giữ tạm cho tới khi có tài
 * khoản thật — không giả vờ là đã có hồ sơ người chơi.
 */
export function guestName(): string {
  const saved = store.get('co.guestName');
  if (saved) return saved;
  const n = `Khách ${Math.floor(Math.random() * 90) + 10}`;
  store.set('co.guestName', n);
  return n;
}

/** Chờ bao lâu trước lần nối lại thứ n. Tăng dần, trần 8 giây. */
const backoff = (n: number) => Math.min(8000, 400 * 2 ** n);

export class GameClient {
  private ws: WebSocket | null = null;
  private tries = 0;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Ý định đang chờ gửi khi dây nối xong, ví dụ "tạo phòng cờ caro". */
  private pending: ClientMsg | null = null;
  private nonce = 0;

  constructor(
    private readonly name: string,
    private readonly on: Partial<ClientEvents>,
  ) {}

  connect(): void {
    this.closed = false;
    this.on.phase?.('connecting');
    const ws = new WebSocket(serverUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.tries = 0;
      const id = store.get('co.playerId');
      this.raw(id ? { t: 'hello', name: this.name, id } : { t: 'hello', name: this.name });
      this.on.phase?.('ready');
      if (this.pending) {
        this.raw(this.pending);
        this.pending = null;
      }
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
          return store.set('co.playerId', m.youId);
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
    else this.pending = m;
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
