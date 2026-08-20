import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { EnginePlayer, GAME_CATALOG, GameEvent, GameMode, GameType, getEngine } from '@hago/shared';
import { CONFIG } from '../config';
import { verifyToken } from '../auth';
import { db, nowMs } from '../db';
import { RateLimiter } from '../util';
import { findUser, toPublicUser, touch } from '../services/users';
import { channelHistory, directChannel, isBlocked, markChannelRead, postMessage, roomChannel } from '../services/social';
import { bindNotificationEmitter, notify } from '../services/notifications';
import { track } from '../services/analytics';
import * as Rooms from './rooms';
import * as MM from './matchmaking';
import {
  applyAction,
  bindMatchHooks,
  createMatch,
  getMatch,
  markDisconnected,
  markReconnected,
  matchOfUser,
  tickAll,
} from './match';

let io: Server;

const socketsOfUser = new Map<string, Set<string>>();
const chatLimiter = new RateLimiter(CONFIG.chatRateLimit.windowMs, CONFIG.chatRateLimit.max);
const actionLimiter = new RateLimiter(CONFIG.actionRateLimit.windowMs, CONFIG.actionRateLimit.max);

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

function isUserOnline(userId: string): boolean {
  return (socketsOfUser.get(userId)?.size ?? 0) > 0;
}

export function onlineUserIds(): string[] {
  return [...socketsOfUser.keys()];
}

function pushRoom(room: Rooms.Room): void {
  const view = Rooms.toRoomView(room);
  room.seats.forEach((s) => emitToUser(s.userId, 'room.state', view));
}

function pushMatchState(match: ReturnType<typeof getMatch>, events: GameEvent[] = []): void {
  if (!match) return;
  const engine = getEngine(match.gameType);
  for (const p of match.players) {
    emitToUser(p.id, 'game.state', {
      matchId: match.id,
      gameType: match.gameType,
      version: match.version,
      view: engine.view(match.state, p.id),
      finished: match.finished || engine.finished(match.state),
      deadline: engine.deadline(match.state),
    });
    const mine = events.filter((e) => !e.to || e.to === p.id);
    if (mine.length) emitToUser(p.id, 'game.event', { matchId: match.id, version: match.version, events: mine });
  }
}

function startMatchForRoom(room: Rooms.Room): void {
  const players: EnginePlayer[] = room.seats
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map((s, i) => {
      const u = findUser(s.userId);
      return { id: s.userId, name: u?.display_name ?? 'Player', seat: i };
    });
  const match = createMatch({
    roomId: room.id,
    gameType: room.gameType,
    mode: room.mode,
    players,
    config: room.config,
  });
  Rooms.setStatus(room, 'playing', match.id);
  pushRoom(room);
  players.forEach((p) =>
    emitToUser(p.id, 'match.start', { matchId: match.id, gameType: room.gameType, mode: room.mode, roomId: room.id }),
  );
  pushMatchState(match);
}

export function initGateway(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: CONFIG.corsOrigin, credentials: true },
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });

  bindNotificationEmitter((userId, row) => emitToUser(userId, 'notification', row));
  bindMatchHooks(
    (match, events) => pushMatchState(match, events),
    (match, summary) => {
      match.players.forEach((p) =>
        emitToUser(p.id, 'match.result', {
          matchId: match.id,
          gameType: match.gameType,
          mode: match.mode,
          rows: summary.rows,
        }),
      );
      if (match.roomId) {
        const room = Rooms.getRoom(match.roomId);
        if (room) {
          Rooms.setStatus(room, 'waiting', null);
          room.seats.forEach((s) => (s.ready = s.userId === room.hostId));
          pushRoom(room);
        }
      }
    },
  );

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) ?? '';
    const payload = verifyToken(token);
    if (!payload) return next(new Error('UNAUTHORIZED'));
    socket.data.userId = payload.sub;
    socket.data.isAdmin = payload.admin;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    const set = socketsOfUser.get(userId) ?? new Set();
    set.add(socket.id);
    socketsOfUser.set(userId, set);
    socket.join(userRoom(userId));
    touch(userId);
    track(userId, 'app_open', {});

    // Reconnect: trả lại room + match state đang dở.
    const resumeMatch = markReconnected(userId);
    const resumeRoom = Rooms.roomOfUser(userId);
    if (resumeRoom) {
      const seat = resumeRoom.seats.find((s) => s.userId === userId);
      if (seat) {
        seat.connected = true;
        seat.disconnectedAt = null;
      }
      pushRoom(resumeRoom);
    }
    if (resumeMatch) pushMatchState(resumeMatch);
    broadcastPresence(userId, true);

    socket.on('ping.check', (_p, ack?: (t: number) => void) => {
      touch(userId);
      ack?.(nowMs());
    });

    /* ------------------------------- rooms ------------------------------ */

    socket.on('room.create', (p: any, ack?: (r: any) => void) => {
      try {
        const existing = Rooms.roomOfUser(userId);
        if (existing) Rooms.leaveRoom(existing, userId);
        const room = Rooms.createRoom({
          hostId: userId,
          gameType: p.gameType as GameType,
          mode: (p.mode ?? 'custom') as GameMode,
          isPrivate: !!p.isPrivate,
          password: p.password || null,
          maxPlayers: p.maxPlayers,
          config: p.config ?? {},
        });
        pushRoom(room);
        track(userId, 'room_create', { game_type: room.gameType });
        ack?.({ ok: true, room: Rooms.toRoomView(room) });
      } catch (e: any) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on('room.join', (p: any, ack?: (r: any) => void) => {
      try {
        const room = p.code ? Rooms.getRoomByCode(String(p.code)) : Rooms.getRoom(String(p.roomId));
        if (!room) throw new Error('ROOM_NOT_FOUND');
        const prev = Rooms.roomOfUser(userId);
        if (prev && prev.id !== room.id) {
          const left = Rooms.leaveRoom(prev, userId);
          if (left) pushRoom(left);
        }
        Rooms.joinRoom(room, userId, p.password);
        roomChannel(room.id, room.seats.map((s) => s.userId));
        pushRoom(room);
        ack?.({ ok: true, room: Rooms.toRoomView(room) });
      } catch (e: any) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on('room.leave', (_p: any, ack?: (r: any) => void) => {
      const room = Rooms.roomOfUser(userId);
      if (!room) return ack?.({ ok: true });
      const left = Rooms.leaveRoom(room, userId);
      if (left) pushRoom(left);
      emitToUser(userId, 'room.left', { roomId: room.id });
      ack?.({ ok: true });
    });

    socket.on('room.ready', (p: any, ack?: (r: any) => void) => {
      const room = Rooms.roomOfUser(userId);
      if (!room) return ack?.({ ok: false, error: 'NOT_IN_ROOM' });
      Rooms.setReady(room, userId, !!p?.ready);
      pushRoom(room);
      ack?.({ ok: true });
    });

    socket.on('room.kick', (p: any, ack?: (r: any) => void) => {
      try {
        const room = Rooms.roomOfUser(userId);
        if (!room) throw new Error('NOT_IN_ROOM');
        const left = Rooms.kickPlayer(room, userId, String(p.userId));
        emitToUser(String(p.userId), 'room.left', { roomId: room.id, kicked: true });
        if (left) pushRoom(left);
        ack?.({ ok: true });
      } catch (e: any) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on('room.invite', (p: any, ack?: (r: any) => void) => {
      const room = Rooms.roomOfUser(userId);
      if (!room) return ack?.({ ok: false, error: 'NOT_IN_ROOM' });
      const targetId = String(p.userId);
      if (isBlocked(userId, targetId)) return ack?.({ ok: false, error: 'BLOCKED' });
      const me = findUser(userId);
      notify(targetId, 'room_invite', 'Lời mời vào phòng', `${me?.display_name} mời bạn chơi ${GAME_CATALOG[room.gameType].name}`, {
        roomId: room.id,
        code: room.code,
        gameType: room.gameType,
      });
      track(userId, 'room_invite', { room_id: room.id, target_id: targetId });
      ack?.({ ok: true });
    });

    socket.on('room.start', (_p: any, ack?: (r: any) => void) => {
      const room = Rooms.roomOfUser(userId);
      if (!room) return ack?.({ ok: false, error: 'NOT_IN_ROOM' });
      if (room.hostId !== userId) return ack?.({ ok: false, error: 'NOT_HOST' });
      const check = Rooms.canStart(room);
      if (!check.ok) return ack?.({ ok: false, error: check.reason });
      startMatchForRoom(room);
      ack?.({ ok: true });
    });

    socket.on('room.list', (p: any, ack?: (r: any) => void) => {
      ack?.({ ok: true, rooms: Rooms.listPublicRooms(p?.gameType).map(Rooms.toRoomView) });
    });

    /* ---------------------------- matchmaking --------------------------- */

    socket.on('mm.join', (p: any, ack?: (r: any) => void) => {
      const gameType = p.gameType as GameType;
      if (!GAME_CATALOG[gameType]) return ack?.({ ok: false, error: 'UNKNOWN_GAME' });
      MM.enqueue({ userId, gameType, mode: (p.mode ?? 'normal') as GameMode, region: p.region ?? 'sea' });
      ack?.({ ok: true, queue: MM.queuePosition(userId) });
    });

    socket.on('mm.leave', (_p: any, ack?: (r: any) => void) => {
      MM.dequeue(userId);
      ack?.({ ok: true });
    });

    /* ------------------------------- game ------------------------------- */

    socket.on('game.action', (p: any, ack?: (r: any) => void) => {
      if (!actionLimiter.take(userId)) return ack?.({ ok: false, error: 'RATE_LIMITED' });
      const res = applyAction(String(p.matchId), userId, String(p.actionId), String(p.type), p.payload ?? {});
      ack?.(res);
    });

    socket.on('game.sync', (p: any, ack?: (r: any) => void) => {
      const match = p?.matchId ? getMatch(String(p.matchId)) : matchOfUser(userId);
      if (!match) return ack?.({ ok: false, error: 'MATCH_NOT_FOUND' });
      const engine = getEngine(match.gameType);
      ack?.({
        ok: true,
        state: {
          matchId: match.id,
          gameType: match.gameType,
          version: match.version,
          view: engine.view(match.state, userId),
          finished: match.finished,
          deadline: engine.deadline(match.state),
        },
      });
    });

    /* ------------------------------- chat ------------------------------- */

    socket.on('chat.send', (p: any, ack?: (r: any) => void) => {
      try {
        if (!chatLimiter.take(userId)) throw new Error('RATE_LIMITED');
        let channelId = String(p.channelId ?? '');
        if (p.toUserId) {
          if (isBlocked(userId, String(p.toUserId))) throw new Error('BLOCKED');
          channelId = directChannel(userId, String(p.toUserId));
        }
        if (!channelId) throw new Error('NO_CHANNEL');
        const msg = postMessage(channelId, userId, String(p.body ?? ''), p.kind ?? 'text');
        const members = db
          .prepare('SELECT user_id FROM channel_members WHERE channel_id = ?')
          .all(channelId) as { user_id: string }[];
        members.forEach((m) => {
          if (!isBlocked(m.user_id, userId)) emitToUser(m.user_id, 'chat.message', msg);
        });
        ack?.({ ok: true, message: msg });
      } catch (e: any) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on('chat.history', (p: any, ack?: (r: any) => void) => {
      const channelId = p.toUserId ? directChannel(userId, String(p.toUserId)) : String(p.channelId ?? '');
      if (!channelId) return ack?.({ ok: false, error: 'NO_CHANNEL' });
      markChannelRead(channelId, userId);
      ack?.({ ok: true, channelId, messages: channelHistory(channelId, Number(p.limit ?? 50)) });
    });

    socket.on('disconnect', () => {
      const s = socketsOfUser.get(userId);
      s?.delete(socket.id);
      if (!s || s.size === 0) {
        socketsOfUser.delete(userId);
        markDisconnected(userId);
        const room = Rooms.roomOfUser(userId);
        if (room) {
          const seat = room.seats.find((x) => x.userId === userId);
          if (seat) {
            seat.connected = false;
            seat.disconnectedAt = nowMs();
          }
          // Rời hẳn phòng nếu chưa vào trận; đang chơi thì giữ ghế cho reconnect.
          if (room.status === 'waiting') {
            const left = Rooms.leaveRoom(room, userId);
            if (left) pushRoom(left);
          } else {
            pushRoom(room);
          }
        }
        MM.dequeue(userId);
        broadcastPresence(userId, false);
      }
    });
  });

  // Vòng lặp chính: matchmaking + tick engine.
  setInterval(() => {
    try {
      runMatchmaking();
      tickAll(nowMs());
      chatLimiter.sweep();
      actionLimiter.sweep();
    } catch (e) {
      console.error('[tick]', e);
    }
  }, CONFIG.tickMs);

  return io;
}

function runMatchmaking(): void {
  for (const found of MM.findMatches()) {
    const players: EnginePlayer[] = found.entries.map((e, i) => {
      const u = findUser(e.userId);
      return { id: e.userId, name: u?.display_name ?? 'Player', seat: i };
    });
    // Quick Match tạo room ẩn để tái dùng toàn bộ luồng room/chat.
    const room = Rooms.createRoom({
      hostId: players[0].id,
      gameType: found.gameType,
      mode: found.mode,
      isPrivate: true,
    });
    players.slice(1).forEach((p) => Rooms.joinRoom(room, p.id));
    room.seats.forEach((s) => (s.ready = true));
    roomChannel(room.id, room.seats.map((s) => s.userId));

    found.entries.forEach((e) => {
      MM.dequeue(e.userId);
      track(e.userId, 'match_found', { game_type: found.gameType, wait_ms: Date.now() - e.joinedAt });
      emitToUser(e.userId, 'mm.found', {
        roomId: room.id,
        gameType: found.gameType,
        mode: found.mode,
        waitMs: Date.now() - e.joinedAt,
      });
    });
    startMatchForRoom(room);
  }
}

function broadcastPresence(userId: string, online: boolean): void {
  const friends = db
    .prepare("SELECT friend_id FROM friends WHERE user_id = ? AND status = 'accepted'")
    .all(userId) as { friend_id: string }[];
  const row = findUser(userId);
  if (!row) return;
  const payload = { user: { ...toPublicUser(row), online }, online };
  friends.forEach((f) => emitToUser(f.friend_id, 'presence', payload));
}

export { isUserOnline };
