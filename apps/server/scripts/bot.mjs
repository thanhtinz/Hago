#!/usr/bin/env node
/**
 * Bot người chơi cho môi trường dev: đăng nhập tài khoản demo, vào hàng chờ
 * và chơi bằng luật đơn giản. Dùng để test luồng realtime, đo tải và quay demo.
 *
 * Cách dùng:
 *   node scripts/bot.mjs --game caro --mode normal --count 1
 *   node scripts/bot.mjs --idle --count 6      # chỉ giữ online cho danh sách bạn bè
 */
import { io } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:4000';
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) =>
    a.startsWith('--') ? [[a.slice(2), arr[i + 1]?.startsWith('--') === false ? arr[i + 1] : true]] : [],
  ),
);

const ACCOUNTS = ['linhchibi', 'minhcaro', 'bopbo', 'soigia', 'tomcute', 'nhimxu', 'meomap', 'cunbong'];
const PASSWORD = 'demo123';

async function login(username) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: username, password: PASSWORD }),
  });
  const json = await res.json();
  if (!json.token) throw new Error(`login failed for ${username}: ${JSON.stringify(json)}`);
  return json;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
let actionCounter = 0;
const actionId = () => `bot-${Date.now().toString(36)}-${actionCounter++}`;

/** Luật chơi tối giản cho từng game — đủ để trận đấu luôn tiến triển. */
function decide(gameType, view, mySeat) {
  switch (gameType) {
    case 'caro': {
      if (view.turnSeat !== mySeat) return null;
      const empty = [];
      view.cells.forEach((v, i) => v === -1 && empty.push(i));
      if (!empty.length) return null;
      // Ưu tiên đánh cạnh nước đi cuối cho giống người thật.
      const last = view.lastMove;
      const near = last
        ? empty.filter((i) => {
            const x = i % view.size;
            const y = Math.floor(i / view.size);
            return Math.abs(x - last.x) <= 2 && Math.abs(y - last.y) <= 2;
          })
        : [];
      const idx = pick(near.length ? near : empty);
      return { type: 'move', payload: { x: idx % view.size, y: Math.floor(idx / view.size) } };
    }
    case 'battleship': {
      if (view.phase === 'placement') return view.me?.placed ? null : { type: 'place', payload: {} };
      if (view.turnSeat !== mySeat) return null;
      const fired = new Set((view.me?.shots ?? []).map((s) => `${s.x},${s.y}`));
      const free = [];
      for (let y = 0; y < view.size; y++)
        for (let x = 0; x < view.size; x++) if (!fired.has(`${x},${y}`)) free.push({ x, y });
      return free.length ? { type: 'fire', payload: pick(free) } : null;
    }
    case 'oanquan': {
      if (view.turnSeat !== mySeat) return null;
      const own = view.own?.[mySeat] ?? [];
      const options = own.filter((i) => view.cells[i] > 0);
      if (!options.length) return null;
      return { type: 'sow', payload: { cell: pick(options), dir: Math.random() < 0.5 ? 1 : -1 } };
    }
    case 'ludo': {
      if (view.turnSeat !== mySeat) return null;
      if (!view.rolled) return { type: 'roll', payload: {} };
      if (view.moves?.length) return { type: 'move', payload: { pieceId: pick(view.moves) } };
      return null;
    }
    case 'monopoly': {
      if (view.turnSeat !== mySeat) return null;
      if (view.phase === 'roll') return { type: 'roll', payload: {} };
      const me = view.cash?.[mySeat];
      const price = view.pending?.price ?? Infinity;
      // Giữ lại 200$ tiền mặt dự phòng trước khi mua đất.
      return { type: me && me.cash - price > 200 ? 'buy' : 'skip', payload: {} };
    }
    case 'sheep': {
      const level = view.myQueue?.[0];
      if (!level) return null;
      if ((view.readyAt ?? 0) > Date.now()) return null;
      const spawn = mySeat === 0 ? 0 : view.laneLength - 1;
      const occupied = new Set();
      for (const u of view.units ?? []) if (u.pos === spawn) occupied.add(u.lane);

      const empties = [];
      for (let lane = 0; lane < view.lanes; lane++) if (!occupied.has(lane)) empties.push(lane);
      if (!empties.length) return null;

      // Cừu nhẹ thì trừ nhiều máu nhưng đẩy yếu: con nhỏ đi làn đang trống đường,
      // con to đi làn đang bị đối thủ đè nặng nhất.
      const W = view.weights ?? [0, 10, 20, 40, 60, 80];
      const heft = (lane, seat) =>
        (view.units ?? [])
          .filter((u) => u.lane === lane && u.seat === seat)
          .reduce((sum, u) => sum + (W[u.level] ?? 0), 0);
      const deficit = (lane) => heft(lane, 1 - mySeat) - heft(lane, mySeat);
      const light = (W[level] ?? 0) <= 20;
      empties.sort((a, b) => (light ? deficit(a) - deficit(b) : deficit(b) - deficit(a)));
      const lane = empties[0] ?? pick(empties);
      return { type: 'deploy', payload: { lane } };
    }
    case 'werewolf': {
      const me = view.seats?.[mySeat];
      if (!me?.alive) return null;
      const others = view.seats.filter((s) => s.alive && s.seat !== mySeat);
      if (!others.length) return null;
      if (view.phase === 'night') {
        if (!view.myRole || view.myRole === 'villager' || view.myRole === 'hunter') return null;
        if (view.myNightTarget != null) return null;
        const prey = view.myRole === 'werewolf' ? others.filter((s) => s.role !== 'werewolf') : others;
        return prey.length ? { type: 'night_action', payload: { target: pick(prey).seat } } : null;
      }
      if (view.phase === 'vote' && view.votes?.[mySeat] == null)
        return { type: 'vote', payload: { target: pick(others).seat } };
      if (view.phase === 'day' && Math.random() < 0.02) return { type: 'ready_vote', payload: {} };
      return null;
    }
    default:
      return null;
  }
}

async function spawn(username, opts) {
  const { token, profile } = await login(username);
  const socket = io(API, { auth: { token }, transports: ['websocket'] });
  const label = `[${profile.displayName}]`;

  socket.on('connect', () => {
    console.log(`${label} online`);
    if (opts.game) socket.emit('mm.join', { gameType: opts.game, mode: opts.mode ?? 'normal' });
  });
  socket.on('mm.found', (d) => console.log(`${label} tìm được trận sau ${d.waitMs}ms`));
  socket.on('match.start', (d) => console.log(`${label} vào trận ${d.gameType}`));
  socket.on('match.result', (r) => {
    const mine = r.rows.find((x) => x.userId === profile.id);
    console.log(`${label} kết quả: ${mine?.result} (+${mine?.xpGain} XP)`);
    if (opts.loop) setTimeout(() => socket.emit('mm.join', { gameType: opts.game, mode: opts.mode ?? 'normal' }), 2500);
  });

  let lastVersion = -1;
  socket.on('game.state', (s) => {
    if (s.finished || s.version === lastVersion) return;
    lastVersion = s.version;
    const mySeat = s.view.mySeat ?? s.view.players?.findIndex((p) => p.id === profile.id) ?? 0;
    const action = decide(s.gameType, s.view, mySeat);
    if (!action) return;
    const delay = opts.speed ?? 900 + Math.random() * 900;
    setTimeout(() => socket.emit('game.action', { matchId: s.matchId, actionId: actionId(), ...action }), delay);
  });

  // Game realtime không phát state mỗi tick nên bot cần nhịp riêng.
  if (opts.game === 'sheep' || opts.game === 'werewolf') {
    setInterval(() => {
      socket.emit('game.sync', {}, (res) => {
        if (!res?.ok || res.state.finished) return;
        const mySeat = res.state.view.mySeat ?? 0;
        const action = decide(res.state.gameType, res.state.view, mySeat);
        if (action) socket.emit('game.action', { matchId: res.state.matchId, actionId: actionId(), ...action });
      });
    }, 550);
  }

  // Giữ presence để bạn bè thấy online.
  setInterval(() => socket.emit('ping.check', {}), 30_000);
  return socket;
}

const count = Number(args.count ?? 1);
const opts = {
  game: args.idle ? null : args.game ?? 'caro',
  mode: args.mode ?? 'normal',
  loop: !!args.loop,
  speed: args.speed ? Number(args.speed) : undefined,
};

for (let i = 0; i < Math.min(count, ACCOUNTS.length); i++) {
  await spawn(ACCOUNTS[i], opts);
  await new Promise((r) => setTimeout(r, 250));
}
console.log(`${Math.min(count, ACCOUNTS.length)} bot đang chạy — Ctrl+C để dừng`);
