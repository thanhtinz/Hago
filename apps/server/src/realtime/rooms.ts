import { GAME_CATALOG, GameMode, GameType, RoomStatus, RoomView } from '@hago/shared';
import { nid, roomCode } from '../util';
import { findUser, toPublicUser } from '../services/users';
import { roomChannel } from '../services/social';

export interface RoomSeat {
  userId: string;
  seat: number;
  ready: boolean;
  connected: boolean;
  /** Thời điểm mất kết nối, dùng cho grace period reconnect. */
  disconnectedAt: number | null;
}

export interface Room {
  id: string;
  code: string;
  gameType: GameType;
  mode: GameMode;
  hostId: string;
  status: RoomStatus;
  isPrivate: boolean;
  password: string | null;
  maxPlayers: number;
  seats: RoomSeat[];
  matchId: string | null;
  config: Record<string, unknown>;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const byCode = new Map<string, string>();

export function createRoom(opts: {
  hostId: string;
  gameType: GameType;
  mode: GameMode;
  isPrivate?: boolean;
  password?: string | null;
  maxPlayers?: number;
  config?: Record<string, unknown>;
}): Room {
  const meta = GAME_CATALOG[opts.gameType];
  if (!meta) throw new Error('UNKNOWN_GAME');
  let code = roomCode();
  while (byCode.has(code)) code = roomCode();
  const room: Room = {
    id: nid(),
    code,
    gameType: opts.gameType,
    mode: opts.mode,
    hostId: opts.hostId,
    status: 'waiting',
    isPrivate: opts.isPrivate ?? false,
    password: opts.password ?? null,
    maxPlayers: Math.min(meta.maxPlayers, Math.max(meta.minPlayers, opts.maxPlayers ?? meta.maxPlayers)),
    seats: [{ userId: opts.hostId, seat: 0, ready: true, connected: true, disconnectedAt: null }],
    matchId: null,
    config: opts.config ?? {},
    createdAt: Date.now(),
  };
  rooms.set(room.id, room);
  byCode.set(code, room.id);
  roomChannel(room.id, [opts.hostId]);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function getRoomByCode(code: string): Room | undefined {
  const id = byCode.get(code.toUpperCase());
  return id ? rooms.get(id) : undefined;
}

export function roomOfUser(userId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.seats.some((s) => s.userId === userId)) return room;
  }
  return undefined;
}

export function listPublicRooms(gameType?: GameType): Room[] {
  return [...rooms.values()]
    .filter((r) => !r.isPrivate && r.status === 'waiting' && (!gameType || r.gameType === gameType))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
}

export function joinRoom(room: Room, userId: string, password?: string): Room {
  if (room.seats.some((s) => s.userId === userId)) {
    const seat = room.seats.find((s) => s.userId === userId)!;
    seat.connected = true;
    seat.disconnectedAt = null;
    return room;
  }
  if (room.status !== 'waiting') throw new Error('ROOM_IN_PROGRESS');
  if (room.seats.length >= room.maxPlayers) throw new Error('ROOM_FULL');
  if (room.password && room.password !== password) throw new Error('WRONG_PASSWORD');
  const used = new Set(room.seats.map((s) => s.seat));
  let seat = 0;
  while (used.has(seat)) seat++;
  room.seats.push({ userId, seat, ready: false, connected: true, disconnectedAt: null });
  room.seats.sort((a, b) => a.seat - b.seat);
  roomChannel(room.id, [userId]);
  return room;
}

export function leaveRoom(room: Room, userId: string): Room | null {
  room.seats = room.seats.filter((s) => s.userId !== userId);
  if (!room.seats.length) {
    rooms.delete(room.id);
    byCode.delete(room.code);
    return null;
  }
  if (room.hostId === userId) room.hostId = room.seats[0].userId;
  return room;
}

export function setReady(room: Room, userId: string, ready: boolean): Room {
  const seat = room.seats.find((s) => s.userId === userId);
  if (!seat) throw new Error('NOT_IN_ROOM');
  seat.ready = ready;
  return room;
}

export function kickPlayer(room: Room, hostId: string, targetId: string): Room | null {
  if (room.hostId !== hostId) throw new Error('NOT_HOST');
  if (targetId === hostId) throw new Error('CANNOT_KICK_HOST');
  return leaveRoom(room, targetId);
}

export function canStart(room: Room): { ok: boolean; reason?: string } {
  const meta = GAME_CATALOG[room.gameType];
  if (room.status !== 'waiting') return { ok: false, reason: 'ROOM_IN_PROGRESS' };
  if (room.seats.length < meta.minPlayers) return { ok: false, reason: 'NOT_ENOUGH_PLAYERS' };
  if (!room.seats.every((s) => s.ready || s.userId === room.hostId))
    return { ok: false, reason: 'PLAYERS_NOT_READY' };
  return { ok: true };
}

export function setStatus(room: Room, status: RoomStatus, matchId: string | null = room.matchId): void {
  room.status = status;
  room.matchId = matchId;
}

export function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  rooms.delete(roomId);
  byCode.delete(room.code);
}

export function toRoomView(room: Room): RoomView {
  return {
    id: room.id,
    code: room.code,
    gameType: room.gameType,
    mode: room.mode,
    status: room.status,
    hostId: room.hostId,
    isPrivate: room.isPrivate,
    hasPassword: !!room.password,
    maxPlayers: room.maxPlayers,
    matchId: room.matchId,
    createdAt: room.createdAt,
    config: room.config,
    players: room.seats
      .map((s) => {
        const row = findUser(s.userId);
        if (!row) return null;
        return {
          user: { ...toPublicUser(row), playing: room.status === 'playing' ? room.gameType : null },
          seat: s.seat,
          ready: s.ready,
          connected: s.connected,
          isHost: s.userId === room.hostId,
        };
      })
      .filter(Boolean) as RoomView['players'],
  };
}

export function allRooms(): Room[] {
  return [...rooms.values()];
}
