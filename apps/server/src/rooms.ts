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
import type { SeatInfo, ServerMsg } from './protocol.js';

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
  send: (m: ServerMsg) => void;
}

interface Room {
  code: string;
  gameId: string;
  config: unknown;
  engine: AnyEngine;
  clockSpec: ClockSpec;
  /** Người chơi theo ghế. Ghế i là `players[i]`. */
  players: (Player | null)[];
  match: LiveMatch<BaseState> | null;
  /** Thời gian còn lại của từng ghế, mili giây. */
  clocks: number[];
  /** Mốc bắt đầu lượt hiện tại, để trừ giờ. null là chưa chạy. */
  turnSince: number | null;
  /** Phòng riêng mở bằng mã thì không tính xếp hạng. */
  rated: boolean;
  seed: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface RoomsOptions {
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

  constructor(o: RoomsOptions = {}) {
    this.serverSeed = o.serverSeed ?? `s${Date.now()}`;
    this.random = o.random ?? Math.random;
  }

  connect(id: string, name: string, send: (m: ServerMsg) => void): Player {
    const p: Player = { id, name, code: null, connected: true, send };
    this.players.set(id, p);
    send({ t: 'welcome', youId: id });
    return p;
  }

  /**
   * Mất kết nối **không** xoá người khỏi phòng.
   *
   * Mạng 4G rớt vài giây là chuyện thường; đá người ra khỏi ván vì một lần
   * rớt sóng thì không ai chơi nổi. Ghế vẫn giữ, đồng hồ vẫn chạy, và họ vào
   * lại bằng đúng `playerId` là nhận tiếp từ `ply` hiện tại.
   */
  disconnect(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = false;
    this.dequeue(id);
    if (p.code) {
      const room = this.rooms.get(p.code);
      if (room) this.broadcastRoom(room);
    }
  }

  /** Vào lại bằng cùng `playerId`: nối lại ghế cũ và nhận ngay state hiện tại. */
  reconnect(id: string, send: (m: ServerMsg) => void): Player | null {
    const p = this.players.get(id);
    if (!p) return null;
    p.connected = true;
    p.send = send;
    send({ t: 'welcome', youId: id });
    if (p.code) {
      const room = this.rooms.get(p.code);
      if (room) {
        this.broadcastRoom(room);
        this.pushState(room);
      }
    }
    return p;
  }

  create(id: string, gameId: string, config: unknown): void {
    const p = this.players.get(id);
    if (!p) return;
    const engine = registry.get(gameId);
    if (!engine) return p.send({ t: 'error', code: 'NO_GAME', msg: `Chưa có bộ môn ${gameId}` });
    this.leave(id);
    const code = this.freshCode();
    const room: Room = {
      code,
      gameId,
      config: config ?? {},
      engine,
      clockSpec: engine.spec.defaultClock,
      players: [p, null],
      match: null,
      clocks: [engine.spec.defaultClock.initialMs, engine.spec.defaultClock.initialMs],
      turnSince: null,
      // Phòng mở bằng mã là phòng riêng: mời ai vào là quyền của chủ phòng,
      // nên không thể tính điểm xếp hạng từ đó.
      rated: false,
      seed: revealSeed(this.serverSeed, code, ''),
    };
    this.rooms.set(code, room);
    p.code = code;
    this.broadcastRoom(room);
  }

  join(id: string, code: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return p.send({ t: 'error', code: 'NO_ROOM', msg: 'Không có phòng nào mang mã này' });
    if (room.players.every((x) => x !== null)) {
      return p.send({ t: 'error', code: 'ROOM_FULL', msg: 'Phòng đã đủ người' });
    }
    this.leave(id);
    const seat = room.players.findIndex((x) => x === null);
    room.players[seat] = p;
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
  quick(id: string, gameId: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const engine = registry.get(gameId);
    if (!engine) return p.send({ t: 'error', code: 'NO_GAME', msg: `Chưa có bộ môn ${gameId}` });
    this.leave(id);
    const q = this.queues.get(gameId) ?? [];
    const otherId = q.find((x) => x !== id && this.players.get(x)?.connected);
    if (otherId) {
      this.queues.set(
        gameId,
        q.filter((x) => x !== otherId),
      );
      const other = this.players.get(otherId)!;
      const code = this.freshCode();
      const room: Room = {
        code,
        gameId,
        config: {},
        engine,
        clockSpec: engine.spec.defaultClock,
        players: [other, p],
        match: null,
        clocks: [engine.spec.defaultClock.initialMs, engine.spec.defaultClock.initialMs],
        turnSince: null,
        rated: true,
        seed: revealSeed(this.serverSeed, code, ''),
      };
      this.rooms.set(code, room);
      other.code = code;
      p.code = code;
      this.broadcastRoom(room);
      this.startIfReady(room);
      return;
    }
    q.push(id);
    this.queues.set(gameId, q);
    p.send({ t: 'queued', gameId, waiting: q.length });
  }

  leave(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    this.dequeue(id);
    const code = p.code;
    p.code = null;
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const seat = room.players.indexOf(p);
    if (seat >= 0) room.players[seat] = null;
    p.send({ t: 'left' });
    // Bỏ ván đang chạy thì bên kia thắng. Không có chuyện rời phòng giữa ván
    // rồi coi như chưa từng đánh.
    if (room.match && !room.match.outcome()) {
      this.serverAction(room, { t: 'abandon', seat });
    }
    if (room.players.every((x) => x === null)) this.rooms.delete(code);
    else this.broadcastRoom(room);
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

  /** Trừ giờ của bên vừa đi và cộng phần thưởng mỗi nước. */
  private chargeClock(room: Room, before: ReturnType<AnyEngine['turn']>, now = Date.now()): void {
    if (before.kind === 'seat' && room.turnSince !== null) {
      const spent = Math.max(0, now - room.turnSince - room.clockSpec.graceMs);
      room.clocks[before.seat] = Math.max(0, (room.clocks[before.seat] ?? 0) - spent + room.clockSpec.incrementMs);
    }
    room.turnSince = room.match?.outcome() ? null : now;
  }

  /**
   * Nhịp đồng hồ. Tầng truyền tải gọi đều đặn; test gọi thẳng với `now` giả.
   * Hết giờ thì **máy chủ** phát nước `flag`, không phải client.
   */
  tick(now = Date.now()): void {
    for (const room of this.rooms.values()) {
      if (!room.match || room.match.outcome() || room.turnSince === null) continue;
      const t = room.engine.turn(room.match.s);
      if (t.kind !== 'seat') continue;
      const spent = Math.max(0, now - room.turnSince - room.clockSpec.graceMs);
      if ((room.clocks[t.seat] ?? 0) - spent > 0) continue;
      room.clocks[t.seat] = 0;
      this.serverAction(room, { t: 'flag', seat: t.seat });
    }
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

  private seatInfos(room: Room): SeatInfo[] {
    return room.players.map((p, seat) => ({
      seat,
      name: p?.name ?? '—',
      connected: p?.connected ?? false,
      ms: room.clocks[seat] ?? 0,
    }));
  }

  private broadcastRoom(room: Room): void {
    const seats = this.seatInfos(room);
    for (const [seat, p] of room.players.entries()) {
      p?.send({
        t: 'room',
        code: room.code,
        gameId: room.gameId,
        rated: room.rated,
        yourSeat: seat,
        seats,
        started: room.match !== null,
      });
    }
  }

  /** Mỗi ghế nhận đúng `view` của ghế mình, không phải state chung. */
  private pushState(room: Room): void {
    if (!room.match) return;
    const seats = this.seatInfos(room);
    const turn = room.engine.turn(room.match.s);
    const outcome: Outcome | null = room.match.outcome();
    for (const [seat, p] of room.players.entries()) {
      if (!p) continue;
      const view = room.engine.view(room.match.s, seat);
      p.send({ t: 'state', ply: view.ply, v: view.v, events: view.events as unknown[], turn, seats, outcome });
    }
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

  /** Dùng cho test và trang trạng thái. */
  stats(): { rooms: number; players: number; queued: number } {
    let queued = 0;
    for (const q of this.queues.values()) queued += q.length;
    return { rooms: this.rooms.size, players: this.players.size, queued };
  }
}
