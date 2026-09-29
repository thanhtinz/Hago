import {
  LiveMatch,
  registry,
  revealSeed,
  type AnyEngine,
  type BaseState,
  type ClockSpec,
  type MatchLog,
  type Outcome,
  type Seat,
} from '@co/core';
import { CLOCKS, type LiveRoom, type SeatInfo, type ServerMsg } from '@co/protocol';
import { Chat, LOBBY, SYSTEM, dm, dmPair, isSystem, roomChannel, systemFor } from './chat.js';

/**
 * Quản lý phòng — phần lõi của máy chủ, **không biết gì về WebSocket**.
 *
 * Tách khỏi tầng truyền tải để test được bằng cách gọi hàm chứ không phải
 * dựng socket: một ván cờ đi tới nước thắng, một ván hết giờ, một ván gửi
 * lặp nonce. Trộn logic phòng vào tầng socket thì mọi bài test đều phải mở
 * cổng mạng, và bài nào cũng chậm và hay hỏng vặt.
 *
 * Đồng hồ nhận `now` từ ngoài vào (`tick(now)`), không tự đọc `Date.now()`.
 * Nhờ vậy test tua giờ trong một phần nghìn giây thay vì phải ngồi chờ thật.
 */

export interface Player {
  id: string;
  name: string;
  /** Phòng đang ở, hoặc null. */
  code: string | null;
  connected: boolean;
  /** Mốc lần cuối mất kết nối, để dọn người đã đi hẳn. */
  offSince: number | null;
  /** Những người mà người này muốn biết trạng thái trực tuyến. */
  watching: Set<string>;
  /** Kênh nhắn tin đang mở. Một người mở một kênh tại một thời điểm. */
  channel: string | null;
  /**
   * Mã phòng đang **xem**, hoặc null.
   *
   * Tách hẳn khỏi `code`. Dùng chung một trường thì khán giả rời chỗ sẽ
   * chạy qua `leave()` — hàm đó xoá lời xin đấu lại và, nếu ván đang chạy,
   * tuyên bố bỏ trận. Một người ngồi xem không có ghế để bỏ.
   */
  fanOf: string | null;
  send: (m: ServerMsg) => void;
}

/** Một lời rủ đấu đang treo. */
interface Challenge {
  id: string;
  from: string;
  to: string;
  gameId: string;
  at: number;
  /**
   * Mã phòng đã mở sẵn, nếu đây là lời **mời vào phòng** chứ không phải
   * lời rủ dựng ván mới. Nhận lời thì người được mời vào đúng phòng đó.
   */
  code?: string;
}

/**
 * Lời rủ hết hạn sau hai phút.
 *
 * Không có hạn thì một lời rủ gửi lúc sáng vẫn còn treo lúc tối, và người
 * nhận bấm đồng ý khi người gửi đã đi ngủ — hai bên vào một phòng mà một
 * bên không biết mình đang ở đó.
 */
const CHALLENGE_MS = 120_000;

interface Room {
  code: string;
  gameId: string;
  config: unknown;
  engine: AnyEngine;
  clockSpec: ClockSpec;
  /** Người chơi theo ghế. Ghế i là `players[i]`. */
  players: (Player | null)[];
  /**
   * Id người từng ngồi mỗi ghế, **không xoá khi họ rời phòng**.
   *
   * `players[i]` thành null lúc bỏ trận, mà bỏ trận chính là lúc phải ghi
   * thành tích. Không giữ riêng thì ván thua vì bỏ trận không vào sổ ai cả.
   */
  seated: (string | undefined)[];
  /** Tên lúc ngồi xuống, chép lại để lịch sử đọc được cả khi họ đã rời. */
  seatedNames: (string | undefined)[];
  match: LiveMatch<BaseState> | null;
  /** Thời gian còn lại của từng ghế, mili giây. */
  clocks: number[];
  /** Mốc bắt đầu lượt hiện tại, để trừ giờ. null là chưa chạy. */
  turnSince: number | null;
  /** Phòng riêng mở bằng mã thì không tính xếp hạng. */
  rated: boolean;
  seed: string;
  /**
   * Ghế nào đã xin đấu lại. Xoá mỗi lần dựng ván mới.
   *
   * Phải là **cả hai** mới dựng ván: một bên tự quyết thì bên kia đang xem
   * lại thế cờ vừa thua bỗng thấy bàn cờ trắng tinh.
   */
  rematch: Set<Seat>;
  /** Ván thứ mấy trong phòng, đếm từ 1. Trộn vào hạt giống cho khác ván trước. */
  game: number;
  /** Số giây đã phát lần trước, để chỉ gửi khi con số thật sự đổi. */
  lastClock: number[];
  /** Khoá mức thời gian, hoặc chuỗi rỗng nếu dùng mặc định của bộ môn. */
  clockKey: string;
  /**
   * Mật khẩu phòng, hoặc null.
   *
   * Không có nó thì mã phòng năm ký tự là toàn bộ lớp bảo vệ, và không gian
   * mã chỉ có 32 mũ 5 — đoán mò vài nghìn lần là chen được vào một ván
   * riêng của hai người lạ.
   */
  pass: string | null;
  /** Id những người đang xem ván này mà không ngồi ghế nào. */
  fans: Set<string>;
}

/**
 * Đồng hồ của một phòng.
 *
 * Khoá lạ thì rơi về mặc định của engine, không phải báo lỗi: một client
 * cũ gửi lên một khoá đã bỏ thì vẫn phải chơi được.
 */
function clockOf(engine: AnyEngine, key: string | undefined): { spec: ClockSpec; key: string } {
  const c = key ? CLOCKS[key] : undefined;
  if (!c || key === undefined) return { spec: engine.spec.defaultClock, key: '' };
  return { spec: { initialMs: c.initialMs, incrementMs: c.incrementMs, graceMs: c.graceMs }, key };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface RoomsOptions {
  /**
   * Gọi đúng **một lần** khi một ván kết thúc, để ghi thành tích.
   *
   * `Rooms` không biết gì về cơ sở dữ liệu: nó chỉ báo ra "ván này xong, kết
   * quả thế này". Cắm thẳng lớp tài khoản vào đây là biến mọi bài test phòng
   * thành bài test có ổ đĩa.
   */
  /** Kho tin nhắn. Bỏ trống thì mọi lệnh nhắn tin bị bỏ qua. */
  chat?: Chat;
  /** Hai người này có bị chặn nhau không. Dùng để chặn đường nhắn tin. */
  isBlocked?: (a: string, b: string) => boolean;
  /**
   * Số lời mời kết bạn đang chờ người này trả lời.
   *
   * `Rooms` không đọc cơ sở dữ liệu, nên nó hỏi ra ngoài — cùng một lối
   * với `mayChallenge` và `isBlocked`.
   */
  pendingRequests?: (id: string) => number;
  /**
   * Hai người này có được rủ nhau không. Bỏ trống là ai cũng rủ được ai.
   *
   * `Rooms` không đọc cơ sở dữ liệu nên nó không tự biết ai là bạn ai; câu
   * hỏi đó do tầng ngoài trả lời.
   */
  mayChallenge?: (from: string, to: string) => boolean;
  onFinish?: (e: {
    gameId: string;
    code: string;
    rated: boolean;
    seats: (string | null)[];
    names: string[];
    outcome: Outcome;
    /** Log input của ván, dạng JSON. Đủ để phát lại toàn bộ. */
    log: string;
  }) => void;
  /** Hạt giống bí mật của máy chủ. Trộn với mã phòng ra hạt giống của ván. */
  serverSeed?: string;
  /** Nguồn ngẫu nhiên để sinh mã phòng — test truyền vào để có mã đoán trước. */
  random?: () => number;
}

export class Rooms {
  private readonly rooms = new Map<string, Room>();
  private readonly players = new Map<string, Player>();
  /** Hàng chờ ghép cặp, theo từng bộ môn. */
  private readonly queues = new Map<string, string[]>();
  private readonly serverSeed: string;
  private readonly random: () => number;
  private readonly onFinish: RoomsOptions['onFinish'];
  private readonly mayChallenge: RoomsOptions['mayChallenge'];
  private readonly chat: Chat | undefined;
  private readonly isBlocked: RoomsOptions['isBlocked'];
  private readonly pendingRequests: RoomsOptions['pendingRequests'];
  private readonly challenges = new Map<string, Challenge>();
  private nextChallenge = 1;
  /** Ván đã báo kết thúc rồi, để không cộng thành tích hai lần. */
  private readonly finished = new Set<string>();

  constructor(o: RoomsOptions = {}) {
    this.serverSeed = o.serverSeed ?? `s${Date.now()}`;
    this.random = o.random ?? Math.random;
    this.onFinish = o.onFinish;
    this.mayChallenge = o.mayChallenge;
    this.chat = o.chat;
    this.isBlocked = o.isBlocked;
    this.pendingRequests = o.pendingRequests;
  }

  // ---- nhắn tin --------------------------------------------------------

  /**
   * Ai được vào kênh này.
   *
   * Không kiểm thì bất kỳ ai gõ đúng `rieng:<id1>|<id2>` là đọc được cuộc
   * trò chuyện của hai người lạ — id người dùng không phải bí mật, chúng
   * nằm ngay trong đường dẫn hồ sơ.
   */
  private mayJoin(id: string, channel: string): boolean {
    if (channel === LOBBY) return true;
    // Thông báo chung ai cũng đọc; thông báo riêng chỉ đúng người đó.
    if (channel === SYSTEM) return true;
    if (channel.startsWith('he-thong:')) return channel === systemFor(id);
    const pair = dmPair(channel);
    if (pair) return pair.includes(id) && !this.isBlocked?.(pair[0], pair[1]);
    if (channel.startsWith('phong:')) {
      const room = this.rooms.get(channel.slice('phong:'.length));
      return !!room && room.seated.includes(id);
    }
    return false;
  }

  openChat(id: string, channel: string): void {
    const p = this.players.get(id);
    if (!p || !this.chat) return;
    if (!this.mayJoin(id, channel)) return p.send({ t: 'error', code: 'NO_CHANNEL', msg: 'Không vào được cuộc trò chuyện này' });
    p.channel = channel;
    const page = this.chat.page(channel);
    p.send({ t: 'chat-page', channel, rows: page.rows, more: page.more, reset: true });
    const last = page.rows[page.rows.length - 1];
    if (last) this.chat.markRead(id, channel, last.id);
    this.pushUnread(p);
  }

  moreChat(id: string, channel: string, before: number): void {
    const p = this.players.get(id);
    if (!p || !this.chat || !this.mayJoin(id, channel)) return;
    const page = this.chat.page(channel, { before });
    p.send({ t: 'chat-page', channel, rows: page.rows, more: page.more, reset: false });
  }

  sendChat(id: string, channel: string, body: string): void {
    const p = this.players.get(id);
    if (!p || !this.chat) return;
    // Kênh thông báo **chỉ để đọc**. Đọc được không có nghĩa là viết được, và
    // một người dùng gửi được vào kênh hệ thống là một người dùng giả danh
    // được máy chủ.
    if (isSystem(channel)) return p.send({ t: 'error', code: 'READ_ONLY', msg: 'Kênh thông báo chỉ để đọc' });
    if (!this.mayJoin(id, channel)) return p.send({ t: 'error', code: 'NO_CHANNEL', msg: 'Không gửi được vào đây' });
    let m;
    try {
      m = this.chat.post(channel, id, p.name, body);
    } catch {
      return;
    }
    this.deliver(channel, m);
  }

  markRead(id: string, channel: string, lastId: number): void {
    const p = this.players.get(id);
    // Cùng cánh cửa như mọi lệnh nhắn tin khác: không có nó thì ai cũng
    // đánh dấu đã đọc hộ kênh riêng của người lạ.
    if (!p || !this.chat || !this.mayJoin(id, channel)) return;
    this.chat.markRead(id, channel, lastId);
    this.pushUnread(p);
  }

  /**
   * Thông báo của hệ thống: không có người gửi.
   *
   * `to` bỏ trống là gửi cho tất cả; có `to` là gửi riêng một người.
   */
  systemMessage(body: string, to?: string): void {
    if (!this.chat) return;
    const channel = to ? systemFor(to) : SYSTEM;
    const m = this.chat.post(channel, null, 'Hệ thống', body, to);
    this.deliver(channel, m);
    // Ai không mở kênh vẫn phải thấy chấm đỏ ngay, không đợi tải lại trang.
    for (const p of this.players.values()) {
      if (p.connected && (!to || p.id === to) && p.channel !== channel) this.pushUnread(p);
    }
  }

  /**
   * Đẩy một tin tới đúng những người đang mở kênh đó.
   *
   * Người không mở kênh vẫn được cập nhật **số chưa đọc** — nếu không thì
   * chấm đỏ chỉ xuất hiện sau khi tải lại trang.
   */
  private deliver(channel: string, m: ReturnType<Chat['post']>): void {
    const pair = dmPair(channel);
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      if (p.channel === channel) {
        p.send({ t: 'chat', m });
        if (m.fromId !== p.id) this.chat?.markRead(p.id, channel, m.id);
      } else if (pair?.includes(p.id) || (channel === LOBBY && p.id !== m.fromId)) {
        this.pushUnread(p);
      }
    }
  }

  private pushUnread(p: Player): void {
    if (!this.chat) return;
    p.send({ t: 'chat-unread', dms: this.chat.unreadDms(p.id), system: this.chat.unreadSystem(p.id) });
  }

  /** Kênh nhắn tin của một phòng, để màn chơi mở đúng chỗ. */
  static roomChannel = roomChannel;
  static dmChannel = dm;

  connect(id: string, name: string, send: (m: ServerMsg) => void): Player {
    const p: Player = { id, name, code: null, connected: true, offSince: null, watching: new Set(), channel: null, fanOf: null, send };
    this.players.set(id, p);
    send({ t: 'welcome', youId: id, inRoom: false });
    this.announce(id);
    this.pushAlerts(id);
    return p;
  }

  // ---- trực tuyến ------------------------------------------------------

  /** Ai đang mở app. Chỉ tính người còn dây nối, không tính người đã rớt. */
  isOnline(id: string): boolean {
    return this.players.get(id)?.connected === true;
  }

  /** Đăng ký theo dõi trạng thái của một nhóm người, và nhận ngay ảnh hiện tại. */
  watch(id: string, ids: string[]): void {
    const p = this.players.get(id);
    if (!p) return;
    // Trần để một client không bắt máy chủ giữ hộ một danh sách vô hạn.
    p.watching = new Set(ids.slice(0, 500));
    this.pushPresence(p);
  }

  private pushPresence(p: Player): void {
    p.send({ t: 'presence', online: [...p.watching].filter((x) => this.isOnline(x)) });
  }

  /** Ai đó vào hoặc ra: báo cho đúng những người đang theo dõi họ. */
  private announce(id: string): void {
    for (const p of this.players.values()) {
      if (p.connected && p.watching.has(id)) this.pushPresence(p);
    }
    this.pushLobby();
  }

  /**
   * Nhịp thở của sảnh, gửi cho **mọi người đang nối**.
   *
   * Rẻ: ba con số, và chỉ phát khi có người vào ra hoặc phòng đổi — không
   * phải theo nhịp thời gian.
   */
  private pushLobby(): void {
    const s = this.stats();
    const live = this.liveRooms();
    for (const p of this.players.values()) {
      if (p.connected) p.send({ t: 'lobby', online: s.online, rooms: s.rooms, queued: s.queued, live });
    }
  }

  /**
   * Số việc đang chờ một người. Gọi khi quan hệ bạn bè vừa đổi.
   *
   * Tầng HTTP gọi vào đây sau mỗi lần gửi / nhận / từ chối lời mời, nên
   * chấm đỏ ở sảnh đổi ngay mà không cần ai hỏi lại.
   */
  pushAlerts(...ids: string[]): void {
    if (!this.pendingRequests) return;
    for (const id of ids) {
      const p = this.players.get(id);
      if (p?.connected) p.send({ t: 'alerts', friendRequests: this.pendingRequests(id) });
    }
  }

  /**
   * Mất kết nối **không** xoá người khỏi phòng.
   *
   * Mạng 4G rớt vài giây là chuyện thường; đá người ra khỏi ván vì một lần
   * rớt sóng thì không ai chơi nổi. Ghế vẫn giữ, đồng hồ vẫn chạy, và họ vào
   * lại bằng đúng `playerId` là nhận tiếp từ `ply` hiện tại.
   */
  disconnect(id: string, now = Date.now()): void {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = false;
    // `now` từ ngoài vào, đúng mạch với `tick(now)`: test tua mười lăm phút
    // trong một phần nghìn giây thay vì ngồi chờ thật.
    p.offSince = now;
    this.dequeue(id);
    // Rời khỏi mạng thì mọi lời rủ liên quan tới mình thành vô nghĩa.
    this.dropChallenges(id, 'expired');
    // Ghế thì giữ qua một lần rớt sóng, chỗ ngồi xem thì không: không có gì
    // để giữ, và giữ thì số khán giả trên màn hai người chơi đếm cả người
    // đã tắt máy.
    this.unspectate(id, false);
    this.announce(id);
    if (p.code) {
      const room = this.rooms.get(p.code);
      if (room) this.broadcastRoom(room);
    }
  }

  /** Đổi tên hiển thị: mọi phòng người đó đang ngồi phải thấy tên mới ngay. */
  rename(id: string, name: string): void {
    const p = this.players.get(id);
    if (!p) return;
    p.name = name;
    if (p.code) {
      const room = this.rooms.get(p.code);
      if (room) this.broadcastRoom(room);
    }
  }

  /** Vào lại bằng cùng `playerId`: nối lại ghế cũ và nhận ngay state hiện tại. */
  reconnect(id: string, send: (m: ServerMsg) => void, now = Date.now()): Player | null {
    const p = this.players.get(id);
    if (!p) return null;
    p.connected = true;
    p.offSince = null;
    p.send = send;
    // Ghế cũ còn đó hay không — client phải biết **trước khi** nó gửi lại
    // ý định trong đường dẫn, nếu không F5 giữa ván là bỏ trận.
    send({ t: 'welcome', youId: id, inRoom: p.code !== null && this.rooms.has(p.code) });
    this.announce(id);
    this.pushAlerts(id);
    if (p.code) {
      const room = this.rooms.get(p.code);
      if (room) {
        this.broadcastRoom(room);
        this.pushState(room, now);
      }
    }
    return p;
  }

  create(id: string, gameId: string, config: unknown, clockKey?: string, pass?: string): void {
    const p = this.players.get(id);
    if (!p) return;
    // `registry.get` **ném** khi chưa đăng ký, không trả về undefined — nên
    // phải hỏi `has` trước. Viết `if (!engine)` là một cái chốt không bao
    // giờ đóng, và người chơi nhận "máy chủ gặp lỗi" thay vì "chưa có bộ môn".
    if (!registry.has(gameId)) return p.send({ t: 'error', code: 'NO_GAME', msg: `Chưa có bộ môn ${gameId}` });
    const engine = registry.get(gameId);
    this.leave(id);
    const code = this.freshCode();
    const clock = clockOf(engine, clockKey);
    const room: Room = {
      code,
      gameId,
      config: config ?? {},
      engine,
      clockSpec: clock.spec,
      clockKey: clock.key,
      pass: pass?.trim() ? pass.trim().slice(0, 32) : null,
      players: [p, null],
      seated: [p.id, undefined],
      seatedNames: [p.name, undefined],
      match: null,
      clocks: [clock.spec.initialMs, clock.spec.initialMs],
      turnSince: null,
      // Phòng mở bằng mã là phòng riêng: mời ai vào là quyền của chủ phòng,
      // nên không thể tính điểm xếp hạng từ đó.
      rated: false,
      seed: revealSeed(this.serverSeed, code, '1'),
      rematch: new Set(),
      fans: new Set(),
      game: 1,
      lastClock: [-1, -1],
    };
    this.rooms.set(code, room);
    p.code = code;
    this.broadcastRoom(room);
    this.pushLobby();
  }

  join(id: string, code: string, pass?: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return p.send({ t: 'error', code: 'NO_ROOM', msg: 'Không có phòng nào mang mã này' });
    if (room.players.every((x) => x !== null)) {
      return p.send({ t: 'error', code: 'ROOM_FULL', msg: 'Phòng đã đủ người' });
    }
    // Người được mời thẳng từ trong phòng thì không phải gõ mật khẩu — chủ
    // phòng đã tự tay chọn họ rồi.
    if (room.pass !== null && room.pass !== pass?.trim() && !room.seated.includes(p.id)) {
      return p.send({ t: 'error', code: 'BAD_PASS', msg: 'Phòng này có mật khẩu, và mật khẩu chưa đúng' });
    }
    this.leave(id);
    const seat = room.players.findIndex((x) => x === null);
    room.players[seat] = p;
    room.seated[seat] = p.id;
    room.seatedNames[seat] = p.name;
    p.code = room.code;
    this.broadcastRoom(room);
    this.startIfReady(room);
  }

  /**
   * Ghép cặp: ai vào trước ghép trước.
   *
   * Cố tình đơn giản. Ghép theo trình độ chỉ có nghĩa khi đã có điểm xếp
   * hạng thật, mà điểm thì phải có người chơi trước đã. Ghép theo thứ tự
   * trước, đo phân bố, rồi mới thêm điều kiện.
   */
  quick(id: string, gameId: string, clockKey?: string): void {
    const p = this.players.get(id);
    if (!p) return;
    // `registry.get` **ném** khi chưa đăng ký, không trả về undefined — nên
    // phải hỏi `has` trước. Viết `if (!engine)` là một cái chốt không bao
    // giờ đóng, và người chơi nhận "máy chủ gặp lỗi" thay vì "chưa có bộ môn".
    if (!registry.has(gameId)) return p.send({ t: 'error', code: 'NO_GAME', msg: `Chưa có bộ môn ${gameId}` });
    const engine = registry.get(gameId);
    this.leave(id);
    const clock = clockOf(engine, clockKey);
    // Hàng chờ tách theo **bộ môn và mức thời gian**: người xếp hàng cờ
    // chớp mà bị ghép vào ván hai mươi phút thì mức thời gian vô nghĩa.
    const qKey = `${gameId}|${clock.key}`;
    const q = this.queues.get(qKey) ?? [];
    const otherId = q.find((x) => x !== id && this.players.get(x)?.connected);
    if (otherId) {
      this.queues.set(
        qKey,
        q.filter((x) => x !== otherId),
      );
      const other = this.players.get(otherId)!;
      const code = this.freshCode();
      const room: Room = {
        code,
        gameId,
        config: {},
        engine,
        clockSpec: clock.spec,
        clockKey: clock.key,
        pass: null,
        players: [other, p],
        seated: [other.id, p.id],
        seatedNames: [other.name, p.name],
        match: null,
        clocks: [clock.spec.initialMs, clock.spec.initialMs],
        turnSince: null,
        rated: true,
        seed: revealSeed(this.serverSeed, code, '1'),
        rematch: new Set(),
      fans: new Set(),
        game: 1,
        lastClock: [-1, -1],
      };
      this.rooms.set(code, room);
      other.code = code;
      p.code = code;
      this.broadcastRoom(room);
      this.startIfReady(room);
      this.pushLobby();
      return;
    }
    q.push(id);
    this.queues.set(qKey, q);
    // Báo lại cho **cả hàng**: người vào trước cũng cần thấy hàng vừa dài ra.
    for (const other of q) {
      this.players.get(other)?.send({ t: 'queued', gameId, waiting: q.length });
    }
    this.pushLobby();
  }

  /**
   * Xin đấu lại, hoặc rút lại lời xin.
   *
   * Chỉ mở sau khi ván đã xong. Hai bên cùng xin thì ván mới dựng ngay tại
   * chỗ: cùng phòng, cùng mã, **đổi bên**, đồng hồ đầy lại. Giữ nguyên
   * `rated` của phòng — phòng riêng vẫn không tính điểm dù đánh bao nhiêu ván.
   */
  rematch(id: string, want: boolean): void {
    const p = this.players.get(id);
    if (!p?.code) return;
    const room = this.rooms.get(p.code);
    if (!room?.match || !room.match.outcome()) return;
    const seat = room.players.indexOf(p);
    if (seat < 0) return;
    // Đối thủ đã rời phòng thì không còn ai để đấu lại. Nói thẳng, đừng để
    // lời xin treo mãi trong một phòng chỉ còn một người.
    if (room.players.some((x) => x === null)) {
      return p.send({ t: 'error', code: 'NO_OPPONENT', msg: 'Đối thủ đã rời phòng' });
    }
    if (want) room.rematch.add(seat as Seat);
    else room.rematch.delete(seat as Seat);
    if (room.rematch.size === room.players.length) return this.restart(room);
    this.broadcastRoom(room);
  }

  /** Dựng ván mới trong cùng một phòng, đổi bên. */
  private restart(room: Room): void {
    // Đổi bên. Ghế 0 luôn là bên đi trước ở mọi bộ môn, nên đảo mảng người
    // chơi là đủ để lượt đi đầu đổi chủ — không có chỗ nào khác phải sửa.
    room.players.reverse();
    room.seated.reverse();
    room.seatedNames.reverse();
    room.rematch.clear();
    room.game += 1;
    room.match = null;
    room.clocks = [room.clockSpec.initialMs, room.clockSpec.initialMs];
    room.turnSince = null;
    // Hạt giống phải khác ván trước, nếu không bộ môn nào có yếu tố ngẫu
    // nhiên sẽ lặp lại y hệt ván vừa đánh.
    room.seed = revealSeed(this.serverSeed, room.code, String(room.game));
    // Mở lại cửa ghi thành tích: `finished` chặn ghi hai lần cho **một** ván,
    // không phải cho cả phòng.
    this.finished.delete(room.code);
    this.startIfReady(room);
  }

  // ---- khán giả ---------------------------------------------------------

  /**
   * Vào xem một ván đang đánh, không ngồi ghế nào.
   *
   * Ba cửa phải qua. Phòng có mật khẩu thì không: hai người khoá cửa lại
   * là họ đã nói rõ họ muốn gì. Bộ môn có quân giấu thì không, vì khán giả
   * nhìn qua mắt ghế 0 và mắt ghế 0 ở bộ môn ấy là một nửa bí mật của ván.
   * Và người đang có ván của chính mình thì không — đổi một ván đang đánh
   * lấy một ghế ngồi xem là một cú bấm nhầm không gỡ lại được.
   */
  spectate(id: string, code: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const room = this.rooms.get(String(code).trim().toUpperCase());
    if (!room) return p.send({ t: 'error', code: 'NO_ROOM', msg: 'Không có ván nào với mã này' });
    if (room.players.includes(p)) return p.send({ t: 'error', code: 'SEATED', msg: 'Bạn đang ngồi trong ván này' });
    if (room.pass !== null) return p.send({ t: 'error', code: 'LOCKED', msg: 'Ván riêng, không xem được' });
    if (room.engine.spec.hiddenInfo) {
      return p.send({ t: 'error', code: 'HIDDEN', msg: 'Bộ môn có quân giấu, không xem trực tiếp được' });
    }
    if (p.code) {
      const mine = this.rooms.get(p.code);
      if (mine?.match && !mine.match.outcome()) {
        return p.send({ t: 'error', code: 'IN_MATCH', msg: 'Bạn đang có ván của mình' });
      }
      this.leave(id);
    }
    this.unspectate(id, false);
    this.dequeue(id);
    p.fanOf = room.code;
    room.fans.add(id);
    // `broadcastRoom` gửi cho cả người chơi lẫn khán giả, nên một lần gọi
    // vừa dựng màn cho người vừa vào, vừa cập nhật số khán giả cho hai
    // người đang đánh.
    this.broadcastRoom(room);
    if (room.match) this.pushState(room);
    this.pushLobby();
  }

  /** Thôi xem. `tell` tắt khi đang dọn dẹp cho một người đã rời mạng. */
  unspectate(id: string, tell = true): void {
    const p = this.players.get(id);
    if (!p?.fanOf) return;
    const room = this.rooms.get(p.fanOf);
    p.fanOf = null;
    room?.fans.delete(id);
    if (tell) p.send({ t: 'left' });
    if (room) this.broadcastRoom(room);
    this.pushLobby();
  }

  /**
   * Phòng sắp biến mất: tiễn khán giả ra trước.
   *
   * Không tiễn thì `fanOf` trỏ vào một mã không còn phòng nào, và người
   * đang xem ngồi lại với một bàn cờ đứng hình mà không có gì nói cho họ
   * biết ván đã tan.
   */
  private closeFans(room: Room): void {
    for (const id of [...room.fans]) {
      const p = this.players.get(id);
      room.fans.delete(id);
      if (!p) continue;
      p.fanOf = null;
      if (p.connected) p.send({ t: 'left' });
    }
  }

  /**
   * Những ván người lạ xem được, cho sảnh.
   *
   * Phòng chưa bắt đầu và phòng có khoá đều không vào danh sách. Trần 30:
   * một sảnh đông thì ba mươi dòng đã dài hơn màn hình, và danh sách này
   * đi kèm **mọi** nhịp thở của sảnh.
   */
  private liveRooms(): LiveRoom[] {
    const out: LiveRoom[] = [];
    for (const room of this.rooms.values()) {
      if (!room.match || room.pass !== null || room.engine.spec.hiddenInfo) continue;
      if (room.match.outcome()) continue;
      out.push({
        code: room.code,
        gameId: room.gameId,
        names: room.seatedNames.map((x) => x ?? '—'),
        ply: room.match.s.ply,
        fans: room.fans.size,
        rated: room.rated,
      });
      if (out.length >= 30) break;
    }
    return out;
  }

  leave(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    this.dequeue(id);
    const code = p.code;
    p.code = null;
    // Rời hàng chờ cũng làm con số ở sảnh đổi, nên báo trước khi thoát sớm.
    if (!code) return this.pushLobby();
    const room = this.rooms.get(code);
    if (!room) return;
    const seat = room.players.indexOf(p);
    if (seat >= 0) room.players[seat] = null;
    // Rời phòng là rút luôn lời xin đấu lại. Để lại thì người còn lại bấm
    // "đấu lại" và ván mới dựng với một cái ghế trống.
    room.rematch.clear();
    p.send({ t: 'left' });
    // Bỏ ván đang chạy thì bên kia thắng. Không có chuyện rời phòng giữa ván
    // rồi coi như chưa từng đánh.
    if (room.match && !room.match.outcome()) {
      this.serverAction(room, { t: 'abandon', seat });
    }
    if (room.players.every((x) => x === null)) {
      this.closeFans(room);
      this.rooms.delete(code);
      this.finished.delete(code);
    }
    else this.broadcastRoom(room);
    this.pushLobby();
  }

  // ---- rủ đấu ----------------------------------------------------------

  /**
   * Rủ một người bạn đánh một ván.
   *
   * `mayChallenge` do tầng ngoài cấp: `Rooms` không biết ai là bạn ai, và
   * không nên biết — nó không đọc cơ sở dữ liệu.
   */
  challenge(id: string, to: string, gameId: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const other = this.players.get(to);
    if (!registry.has(gameId)) return p.send({ t: 'error', code: 'NO_GAME', msg: `Chưa có bộ môn ${gameId}` });
    if (id === to) return p.send({ t: 'error', code: 'SELF', msg: 'Không tự rủ mình được' });
    if (!other?.connected) return p.send({ t: 'error', code: 'OFFLINE', msg: 'Người này đang không trực tuyến' });
    if (this.mayChallenge && !this.mayChallenge(id, to)) {
      return p.send({ t: 'error', code: 'NOT_FRIEND', msg: 'Chỉ rủ được bạn bè' });
    }
    if (other.code && this.rooms.get(other.code)?.match) {
      return p.send({ t: 'error', code: 'BUSY', msg: 'Người này đang trong một ván' });
    }
    // Đã có lời rủ y hệt đang treo thì không tạo thêm — bấm hai lần không
    // được biến thành hai lời mời mà bên kia phải từ chối hai lần.
    for (const c of this.challenges.values()) {
      if (c.from === id && c.to === to && c.gameId === gameId) return;
    }
    const c: Challenge = { id: `c${this.nextChallenge++}`, from: id, to, gameId, at: Date.now() };
    this.challenges.set(c.id, c);
    p.send({ t: 'challenge', id: c.id, dir: 'out', withId: to, withName: other.name, gameId });
    other.send({ t: 'challenge', id: c.id, dir: 'in', withId: id, withName: p.name, gameId });
  }

  /**
   * Mời một người bạn vào đúng cái phòng mình đang chờ.
   *
   * Dùng lại nguyên bộ máy lời rủ — cùng hạn hai phút, cùng đường trả lời,
   * cùng thông điệp — chỉ khác ở chỗ lời rủ này **mang theo mã phòng**.
   */
  invite(id: string, to: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const room = p.code ? this.rooms.get(p.code) : undefined;
    if (!room) return p.send({ t: 'error', code: 'NO_ROOM', msg: 'Bạn chưa mở phòng nào' });
    if (room.match) return p.send({ t: 'error', code: 'STARTED', msg: 'Ván đã bắt đầu rồi' });
    if (room.players.every((x) => x !== null)) {
      return p.send({ t: 'error', code: 'ROOM_FULL', msg: 'Phòng đã đủ người' });
    }
    const other = this.players.get(to);
    if (id === to) return p.send({ t: 'error', code: 'SELF', msg: 'Không tự mời mình được' });
    if (!other?.connected) return p.send({ t: 'error', code: 'OFFLINE', msg: 'Người này đang không trực tuyến' });
    if (this.mayChallenge && !this.mayChallenge(id, to)) {
      return p.send({ t: 'error', code: 'NOT_FRIEND', msg: 'Chỉ mời được bạn bè' });
    }
    if (other.code && this.rooms.get(other.code)?.match) {
      return p.send({ t: 'error', code: 'BUSY', msg: 'Người này đang trong một ván' });
    }
    for (const c of this.challenges.values()) {
      if (c.from === id && c.to === to && c.code === room.code) return;
    }
    const c: Challenge = { id: `c${this.nextChallenge++}`, from: id, to, gameId: room.gameId, at: Date.now(), code: room.code };
    this.challenges.set(c.id, c);
    p.send({ t: 'challenge', id: c.id, dir: 'out', withId: to, withName: other.name, gameId: room.gameId });
    other.send({ t: 'challenge', id: c.id, dir: 'in', withId: id, withName: p.name, gameId: room.gameId });
  }

  answerChallenge(id: string, cid: string, accept: boolean): void {
    const c = this.challenges.get(cid);
    // Chỉ **người được rủ** mới trả lời được. Không có chốt này thì người gửi
    // tự đồng ý lời rủ của chính mình và kéo người kia vào phòng.
    if (!c || c.to !== id) return;
    this.challenges.delete(cid);
    const from = this.players.get(c.from);
    const to = this.players.get(c.to);
    if (!accept) {
      from?.send({ t: 'challenge-gone', id: cid, why: 'declined' });
      to?.send({ t: 'challenge-gone', id: cid, why: 'declined' });
      return;
    }
    if (!from?.connected || !to?.connected) {
      from?.send({ t: 'challenge-gone', id: cid, why: 'expired' });
      to?.send({ t: 'challenge-gone', id: cid, why: 'expired' });
      return;
    }
    // Lời **mời vào phòng**: người mời đang ngồi sẵn trong đó, nên chỉ có
    // người được mời đi vào. Tuyệt đối không gọi `leave(c.from)` ở nhánh
    // này — chính dòng đó sẽ đá chủ phòng ra khỏi cái phòng vừa mở, và
    // `leave` xoá luôn phòng khi không còn ai.
    if (c.code) {
      const room = this.rooms.get(c.code);
      if (!room || room.match || room.players.every((x) => x !== null)) {
        from.send({ t: 'challenge-gone', id: cid, why: 'expired' });
        to.send({ t: 'challenge-gone', id: cid, why: 'expired' });
        return;
      }
      from.send({ t: 'challenge-gone', id: cid, why: 'accepted' });
      to.send({ t: 'challenge-gone', id: cid, why: 'accepted' });
      // Máy chủ tự mở khoá hộ: chủ phòng đã tự tay chọn người này, bắt họ
      // gõ thêm mật khẩu là bắt chủ phòng đọc mật khẩu cho đúng người mình
      // vừa mời.
      this.join(c.to, c.code, room.pass ?? undefined);
      return;
    }

    from.send({ t: 'challenge-gone', id: cid, why: 'accepted' });
    to.send({ t: 'challenge-gone', id: cid, why: 'accepted' });

    // Phòng của lời rủ là **phòng riêng**: hai người tự chọn nhau thì không
    // tính xếp hạng, đúng như phòng mở bằng mã.
    this.leave(c.from);
    this.leave(c.to);
    const code = this.freshCode();
    const engine = registry.get(c.gameId)!;
    const room: Room = {
      code,
      gameId: c.gameId,
      config: {},
      engine,
      clockSpec: engine.spec.defaultClock,
      clockKey: '',
      pass: null,
      players: [from, to],
      seated: [from.id, to.id],
      seatedNames: [from.name, to.name],
      match: null,
      clocks: [engine.spec.defaultClock.initialMs, engine.spec.defaultClock.initialMs],
      turnSince: null,
      rated: false,
      seed: revealSeed(this.serverSeed, code, '1'),
      rematch: new Set(),
      fans: new Set(),
      game: 1,
      lastClock: [-1, -1],
    };
    this.rooms.set(code, room);
    from.code = code;
    to.code = code;
    this.broadcastRoom(room);
    this.startIfReady(room);
  }

  cancelChallenge(id: string, cid: string): void {
    const c = this.challenges.get(cid);
    if (!c || c.from !== id) return;
    this.challenges.delete(cid);
    this.players.get(c.from)?.send({ t: 'challenge-gone', id: cid, why: 'cancelled' });
    this.players.get(c.to)?.send({ t: 'challenge-gone', id: cid, why: 'cancelled' });
  }

  private dropChallenges(id: string, why: 'expired' | 'cancelled'): void {
    for (const [cid, c] of [...this.challenges]) {
      if (c.from !== id && c.to !== id) continue;
      this.challenges.delete(cid);
      this.players.get(c.from)?.send({ t: 'challenge-gone', id: cid, why });
      this.players.get(c.to)?.send({ t: 'challenge-gone', id: cid, why });
    }
  }

  act(id: string, nonce: string, action: unknown): void {
    const p = this.players.get(id);
    if (!p?.code) return;
    const room = this.rooms.get(p.code);
    if (!room?.match) return p.send({ t: 'error', code: 'NO_MATCH', msg: 'Ván chưa bắt đầu' });
    const seat = room.players.indexOf(p);
    if (seat < 0) return;
    if (room.match.outcome()) return p.send({ t: 'error', code: 'OVER', msg: 'Ván đã kết thúc' });

    // `flag` và `abandon` là việc của máy chủ. Nhận chúng từ client nghĩa là
    // ai cũng tự tuyên bố đối thủ hết giờ được.
    // Gửi lặp được chặn **trước** khi kiểm luật: nước cũ giờ không còn hợp lệ
    // nữa (ô đã có quân), nên nếu kiểm luật trước thì mỗi lần retry đều nhận
    // `ILLEGAL` thay vì im lặng bỏ qua.
    if (room.match.hasNonce(seat, nonce)) return;

    const kind = (action as { t?: string } | null)?.t;
    if (kind === 'flag' || kind === 'abandon') {
      return p.send({ t: 'error', code: 'SERVER_ONLY', msg: 'Nước này chỉ máy chủ phát được' });
    }
    const t = room.engine.turn(room.match.s);
    const mayAct = t.kind === 'seat' ? t.seat === seat : t.kind === 'sealed' ? t.seats.includes(seat) : false;
    // Xin thua và cầu hoà đi được cả khi chưa tới lượt mình.
    const meta = kind !== undefined && kind !== 'game';
    if (!mayAct && !meta) return p.send({ t: 'error', code: 'NOT_YOUR_TURN', msg: 'Chưa tới lượt bạn' });
    if (!room.engine.legal(room.match.s, seat).some((a) => JSON.stringify(a) === JSON.stringify(action))) {
      return p.send({ t: 'error', code: 'ILLEGAL', msg: 'Nước không hợp lệ' });
    }

    const before = room.engine.turn(room.match.s);
    const res = room.match.apply(seat, action, { nonce });
    if (!res.applied) return; // gửi lặp: im lặng bỏ qua, xem LiveMatch.apply
    this.chargeClock(room, before);
    this.pushState(room);
  }

  /**
   * Danh sách nước hợp lệ của một ghế ở thế cờ hiện tại.
   *
   * Client tự tính lấy từ `view` để vẽ gợi ý, nhưng làn bot chạy trên máy chủ
   * và test tích hợp thì cần hỏi thẳng ở đây.
   */
  legalFor(id: string): unknown[] {
    const p = this.players.get(id);
    if (!p?.code) return [];
    const room = this.rooms.get(p.code);
    if (!room?.match || room.match.outcome()) return [];
    const seat = room.players.indexOf(p);
    if (seat < 0) return [];
    return room.engine.legal(room.match.s, seat) as unknown[];
  }

  /**
   * Trừ giờ của bên vừa đi và cộng phần thưởng mỗi nước.
   *
   * Phần hoàn lại **không bao giờ lớn hơn phần vừa bị trừ**, nên quỹ thời gian
   * chỉ có thể đứng yên hoặc giảm, không bao giờ vượt mức mở ván.
   *
   * Đây **không phải** Fischer chuẩn, và cố ý như vậy. Fischer cộng đủ phần
   * thưởng sau mỗi nước, mà ở đây đã có ân hạn rồi: cộng thêm nữa thì bấm
   * nhanh là in ra thời gian — ván caro năm nước bấm liên tiếp kết thúc với
   * đồng hồ 5:25 trong khi mở ván là 5:00. Người chơi nào nhìn cũng thấy sai.
   * Cách hiểu đúng của `incrementMs` ở đây là **mức hoàn tối đa mỗi nước**:
   * nghĩ dưới mức đó thì gần như không mất giờ, nghĩ lâu hơn thì trả phần dôi.
   */
  private chargeClock(room: Room, before: ReturnType<AnyEngine['turn']>, now = Date.now()): void {
    if (before.kind === 'seat' && room.turnSince !== null) {
      const elapsed = Math.max(0, now - room.turnSince);
      const spent = Math.max(0, elapsed - room.clockSpec.graceMs);
      const gain = Math.min(room.clockSpec.incrementMs, spent);
      room.clocks[before.seat] = Math.max(0, (room.clocks[before.seat] ?? 0) - spent + gain);
    }
    room.turnSince = room.match?.outcome() ? null : now;
  }

  /**
   * Nhịp đồng hồ. Tầng truyền tải gọi đều đặn; test gọi thẳng với `now` giả.
   * Hết giờ thì **máy chủ** phát nước `flag`, không phải client.
   */
  tick(now = Date.now()): void {
    for (const [cid, c] of [...this.challenges]) {
      if (now - c.at < CHALLENGE_MS) continue;
      this.challenges.delete(cid);
      this.players.get(c.from)?.send({ t: 'challenge-gone', id: cid, why: 'expired' });
      this.players.get(c.to)?.send({ t: 'challenge-gone', id: cid, why: 'expired' });
    }
    for (const room of this.rooms.values()) {
      if (!room.match || room.match.outcome() || room.turnSince === null) continue;
      const t = room.engine.turn(room.match.s);
      if (t.kind !== 'seat') continue;
      const spent = Math.max(0, now - room.turnSince - room.clockSpec.graceMs);
      if ((room.clocks[t.seat] ?? 0) - spent > 0) {
        this.pushClock(room, now);
        continue;
      }
      room.clocks[t.seat] = 0;
      this.serverAction(room, { t: 'flag', seat: t.seat });
    }
  }

  /**
   * Thời gian còn lại **tính tới lúc này**, không phải lúc nước cuối.
   *
   * `clocks[seat]` chỉ bị trừ khi nước đi được áp dụng, nên giữa lượt nó là
   * một con số cũ. Đây là cùng một phép tính `tick` dùng để quyết định hết
   * giờ, nên cái người chơi nhìn thấy và cái máy chủ quyết định là một.
   */
  private liveClocks(room: Room, now: number): number[] {
    const out = room.clocks.slice();
    if (!room.match || room.match.outcome() || room.turnSince === null) return out;
    const t = room.engine.turn(room.match.s);
    if (t.kind !== 'seat') return out;
    const spent = Math.max(0, now - room.turnSince - room.clockSpec.graceMs);
    out[t.seat] = Math.max(0, (out[t.seat] ?? 0) - spent);
    return out;
  }

  /** Phát nhịp đồng hồ, nhưng chỉ khi con số giây thật sự đổi. */
  private pushClock(room: Room, now: number): void {
    if (!room.match || room.match.outcome() || room.turnSince === null) return;
    const ms = this.liveClocks(room, now);
    const secs = ms.map((x) => Math.ceil(x / 1000));
    if (secs.every((x, i) => x === room.lastClock[i])) return;
    room.lastClock = secs;
    for (const p of room.players) p?.send({ t: 'clock', ms });
  }

  private serverAction(room: Room, action: unknown): void {
    if (!room.match || room.match.outcome()) return;
    // Ghế -1 trong log nghĩa là nước do máy chủ phát, không phải người nào.
    room.match.apply(-1, action);
    room.turnSince = null;
    this.pushState(room);
  }

  private startIfReady(room: Room): void {
    if (room.match) return;
    if (room.players.some((x) => x === null)) return;
    const seats: Seat[] = [0, 1];
    const log: MatchLog = {
      matchId: room.code,
      gameId: room.gameId,
      engineVersion: room.engine.version,
      ruleHash: room.engine.ruleHash,
      seed: room.seed,
      seats,
      config: room.config,
      inputs: [],
    };
    room.match = new LiveMatch(room.engine as never, log);
    room.turnSince = Date.now();
    this.broadcastRoom(room);
    this.pushState(room);
  }

  private seatInfos(room: Room, now = Date.now()): SeatInfo[] {
    // Giờ **tính tới lúc này**: vào lại giữa lượt mà nhận con số của nước
    // cuối thì đồng hồ nhảy ngược lên rồi mới tụt xuống.
    const live = this.liveClocks(room, now);
    return room.players.map((p, seat) => ({
      seat,
      name: p?.name ?? '—',
      connected: p?.connected ?? false,
      ms: live[seat] ?? 0,
    }));
  }

  private broadcastRoom(room: Room): void {
    const seats = this.seatInfos(room);
    for (const [seat, p] of room.players.entries()) if (p) this.sendRoom(room, p, seat, seats);
    for (const p of this.fansOf(room)) this.sendRoom(room, p, null, seats);
  }

  /**
   * Một bản `room` cho một người.
   *
   * Khán giả nhận **đúng thông điệp này**, chỉ khác `yourSeat: null`. Đắp
   * một thông điệp riêng cho khán giả là đắp một đường dữ liệu thứ hai, và
   * đường thứ hai là đường không ai canh.
   */
  private sendRoom(room: Room, p: Player, seat: Seat | null, seats = this.seatInfos(room)): void {
    p.send({
      t: 'room',
      code: room.code,
      gameId: room.gameId,
      rated: room.rated,
      yourSeat: seat,
      seats,
      started: room.match !== null,
      rematch: [...room.rematch],
      game: room.game,
      clock: room.clockKey,
      locked: room.pass !== null,
      fans: room.fans.size,
    });
  }

  /** Khán giả còn nối dây. Id đã đi hẳn thì bỏ qua, không dọn ở đây. */
  private *fansOf(room: Room): Generator<Player> {
    for (const id of room.fans) {
      const p = this.players.get(id);
      if (p?.connected) yield p;
    }
  }

  /** Mỗi ghế nhận đúng `view` của ghế mình, không phải state chung. */
  private pushState(room: Room, now = Date.now()): void {
    if (!room.match) return;
    const seats = this.seatInfos(room, now);
    // `state` đã mang giờ của cả hai ghế, nên nhịp đồng hồ kế tiếp không
    // cần nhắc lại đúng con số đó. Không ghi nhận ở đây thì mỗi nước đi kéo
    // theo một thông điệp thừa.
    room.lastClock = seats.map((x) => Math.ceil(x.ms / 1000));
    const turn = room.engine.turn(room.match.s);
    const outcome: Outcome | null = room.match.outcome();
    let justEnded = false;
    // Mọi đường kết thúc ván — thắng theo luật, xin thua, hết giờ, bỏ trận —
    // đều đi qua đây, nên đây là chỗ duy nhất cần canh. Đặt ở từng nhánh là
    // chắc chắn sẽ quên một nhánh.
    if (outcome && !this.finished.has(room.code)) {
      this.finished.add(room.code);
      justEnded = true;
      this.onFinish?.({
        gameId: room.gameId,
        code: room.code,
        rated: room.rated,
        seats: room.seated.map((x) => x ?? null),
        names: room.seatedNames.map((x) => x ?? '—'),
        outcome,
        log: JSON.stringify(room.match.log),
      });
    }
    // Chỉ nước của người chơi. Nước máy chủ phát (hết giờ, bỏ trận) mang
    // ghế -1 và không phải một nước cờ; nước meta (xin thua, cầu hoà) thì
    // đã hiện ở chỗ khác rồi.
    const moves = room.match.log.inputs
      .filter((r) => r.seat >= 0 && (r.action as { t?: string } | null)?.t === 'game')
      .map((r) => ({ seat: r.seat, a: (r.action as { a: unknown }).a }));
    for (const [seat, p] of room.players.entries()) {
      if (!p) continue;
      const view = room.engine.view(room.match.s, seat);
      p.send({ t: 'state', ply: view.ply, v: view.v, events: view.events as unknown[], turn, seats, outcome, moves });
    }
    // Khán giả nhìn bàn qua **con mắt của ghế 0**, không qua một đường
    // riêng. `spectate` đã chặn bộ môn có quân giấu, nên ghế 0 ở đây thấy
    // đúng bằng mọi ghế khác — và nếu mai có bộ môn giấu bài, cái chặn đó
    // là chỗ duy nhất phải nhớ.
    const fanView = room.engine.view(room.match.s, 0);
    for (const p of this.fansOf(room)) {
      p.send({ t: 'state', ply: fanView.ply, v: fanView.v, events: fanView.events as unknown[], turn, seats, outcome, moves });
    }
    // Ván vừa xong là danh sách "đang đánh" ở sảnh vừa sai. Không báo ở đây
    // thì nó còn sai cho tới lúc tình cờ có ai đó vào hoặc ra.
    if (justEnded) this.pushLobby();
  }

  private dequeue(id: string): void {
    for (const [g, q] of this.queues) {
      this.queues.set(
        g,
        q.filter((x) => x !== id),
      );
    }
  }

  private freshCode(): string {
    for (let i = 0; i < 200; i++) {
      let s = '';
      for (let k = 0; k < 5; k++) s += CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)];
      if (!this.rooms.has(s)) return s;
    }
    throw new Error('Không sinh được mã phòng mới');
  }

  /**
   * Dọn phòng bỏ hoang và người đã đi hẳn.
   *
   * Không dọn thì `Map` chỉ lớn lên: mỗi người từng mở app một lần là một
   * `Player` nằm lại mãi, mỗi phòng từng mở là một `Room` giữ cả `LiveMatch`
   * với toàn bộ log nước đi. Một máy chủ chạy vài tuần là hết bộ nhớ vì
   * những ván không ai còn nhớ.
   *
   * Ngưỡng rộng tay — mười lăm phút. Mất kết nối vài giây là chuyện thường,
   * và ghế phải giữ được lâu hơn thời gian người ta đi pha một ấm trà.
   */
  sweep(now = Date.now(), graceMs = 15 * 60_000): void {
    for (const [id, p] of [...this.players]) {
      if (p.connected || p.offSince === null || now - p.offSince < graceMs) continue;
      // `leave` lo phần khó: ván đang chạy thì tính là bỏ trận, phòng trống
      // thì xoá. Đây là đúng cùng một đường người dùng bấm "về sảnh".
      this.leave(id);
      this.players.delete(id);
    }
    // Phòng không còn ai nối dây và ván đã xong thì không ai quay lại nữa.
    for (const [code, room] of [...this.rooms]) {
      if (room.players.some((x) => x?.connected)) continue;
      const over = !room.match || !!room.match.outcome();
      const empty = room.players.every((x) => x === null);
      if (!empty && !over) continue;
      if (!empty && over) {
        // Ván xong mà cả hai đã rời mạng: không ai còn ở đó để đấu lại.
        for (const p of room.players) if (p) p.code = null;
      }
      this.closeFans(room);
      this.rooms.delete(code);
      this.finished.delete(code);
    }
  }

  /** Dùng cho test và trang trạng thái. */
  stats(): { rooms: number; players: number; queued: number; online: number; challenges: number } {
    let queued = 0;
    for (const q of this.queues.values()) queued += q.length;
    let online = 0;
    for (const p of this.players.values()) if (p.connected) online++;
    return { rooms: this.rooms.size, players: this.players.size, queued, online, challenges: this.challenges.size };
  }
}
