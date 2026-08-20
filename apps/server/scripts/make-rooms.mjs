#!/usr/bin/env node
/** Tạo vài phòng công khai bằng tài khoản demo — dùng khi dev UI danh sách phòng. */
import { io } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:4000';
const PLAN = [
  { user: 'minhcaro', gameType: 'caro', mode: 'ranked' },
  { user: 'soigia', gameType: 'werewolf', mode: 'custom' },
  { user: 'meomap', gameType: 'ludo', mode: 'custom', password: 'abc' },
  { user: 'nhimxu', gameType: 'battleship', mode: 'custom' },
];

for (const p of PLAN) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: p.user, password: 'demo123' }),
  });
  const { token, profile } = await res.json();
  const socket = io(API, { auth: { token }, transports: ['websocket'] });
  await new Promise((r) => socket.on('connect', r));
  socket.emit(
    'room.create',
    { gameType: p.gameType, mode: p.mode, isPrivate: false, password: p.password ?? null },
    (ack) => console.log(`${profile.displayName}: phòng ${ack?.room?.code} (${p.gameType})`),
  );
  await new Promise((r) => setTimeout(r, 300));
}
console.log('🚪 Đã tạo phòng demo — Ctrl+C để đóng');
setInterval(() => {}, 1 << 30);
