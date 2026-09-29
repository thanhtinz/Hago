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
import type { SeatInfo, ServerMsg } from '@co/protocol';

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
  /** Những người mà người này muốn biết trạng thái trực tuyến. */
  watching: Set<string>;
  send: (m: ServerMsg) => void;
}

/** Một lời rủ đấu đang treo. */
interface Challenge {
  id: string;
  from: string;
  to: string;
  gameId: string;
  at: number;
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
  private readonly challenges = new Map<string, Challenge>();
  private nextChallenge = 1;
  /** Ván đã báo kết thúc rồi, để không cộng thành tích hai lần. */
  private readonly finished = new Set<string>();

  constructor(o: RoomsOptions = {}) {
    this.serverSeed = o.serverSeed ?? `s${Date.now()}`;
    this.random = o.random ?? Math.random;
    this.onFinish = o.onFinish;
    this.mayChallenge = o.mayChallenge;
  }

  connect(id: string, name: string, send: (m: ServerMsg) => void): Player {
    const p: Player = { id, name, code: null, connected: true, watching: new Set(), send };
    this.players.set(id, p);
    send({ t: 'welcome', youId: id });
    this.announce(id);
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
    // Rời khỏi mạng thì mọi lời rủ liên quan tới mình thành vô nghĩa.
    this.dropChallenges(id, 'expired');
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
  reconnect(id: string, send: (m: ServerMsg) => void): Player | null {
    const p = this.players.get(id);
    if (!p) return null;
    p.connected = true;
    p.send = send;
    send({ t: 'welcome', youId: id });
    this.announce(id);
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
      seated: [p.id, undefined],
      seatedNames: [p.name, undefined],
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
        seated: [other.id, p.id],
        seatedNames: [other.name, p.name],
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
    if (room.players.every((x) => x === null)) {
      this.rooms.delete(code);
      this.finished.delete(code);
    }
    else this.broadcastRoom(room);
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
    if (!registry.get(gameId)) return p.send({ t: 'error', code: 'NO_GAME', msg: `Chưa có bộ môn ${gameId}` });
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
      players: [from, to],
      seated: [from.id, to.id],
      seatedNames: [from.name, to.name],
      match: null,
      clocks: [engine.spec.defaultClock.initialMs, engine.spec.defaultClock.initialMs],
      turnSince: null,
      rated: false,
      seed: revealSeed(this.serverSeed, code, ''),
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
    // Mọi đường kết thúc ván — thắng theo luật, xin thua, hết giờ, bỏ trận —
    // đều đi qua đây, nên đây là chỗ duy nhất cần canh. Đặt ở từng nhánh là
    // chắc chắn sẽ quên một nhánh.
    if (outcome && !this.finished.has(room.code)) {
      this.finished.add(room.code);
      this.onFinish?.({
        gameId: room.gameId,
        code: room.code,
        rated: room.rated,
        seats: room.seated.map((x) => x ?? null),
        names: room.seatedNames.map((x) => x ?? '—'),
        outcome,
      });
    }
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
  stats(): { rooms: number; players: number; queued: number; online: number; challenges: number } {
    let queued = 0;
    for (const q of this.queues.values()) queued += q.length;
    let online = 0;
    for (const p of this.players.values()) if (p.connected) online++;
    return { rooms: this.rooms.size, players: this.players.size, queued, online, challenges: this.challenges.size };
  }
}
