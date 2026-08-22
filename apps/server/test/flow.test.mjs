/**
 * Test tích hợp: khởi động server thật trên DB tạm rồi chạy trọn luồng
 *   đăng ký → kết bạn → chat → quick match → chơi Caro → nhận thưởng → mua đồ.
 * Chạy: npm test -w @hago/server
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';

const PORT = 4599;
const API = `http://localhost:${PORT}`;
const DB_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hago-test-')), 'test.db');

let server;
const sockets = [];

const post = async (p, body, token) => {
  const res = await fetch(API + p, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: await res.json() };
};
const put = async (p, body, token) => {
  const res = await fetch(API + p, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: await res.json() };
};
const get = async (p, token) => {
  const res = await fetch(API + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, json: await res.json() };
};
const ack = (socket, event, payload) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`ack timeout: ${event}`)), 8000);
    socket.emit(event, payload, (r) => {
      clearTimeout(t);
      resolve(r);
    });
  });
const waitFor = (socket, event, ms = 15000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`event timeout: ${event}`)), ms);
    socket.once(event, (d) => {
      clearTimeout(t);
      resolve(d);
    });
  });

before(async () => {
  server = spawn('node', [path.join(import.meta.dirname, '../dist/index.js')], {
    // PUSH_ENABLED=0: test không gọi ra exp.host, đường push vẫn chạy đủ.
    env: { ...process.env, PORT: String(PORT), DB_FILE, JWT_SECRET: 'test-secret', PUSH_ENABLED: '0' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${API}/health`);
      if (r.ok) return;
    } catch {
      /* server chưa lên */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server không khởi động được');
});

after(() => {
  sockets.forEach((s) => s.close());
  server?.kill('SIGKILL');
});

const users = {};

test('đăng ký tài khoản mới và nhận tiền khởi đầu', async () => {
  for (const name of ['alpha', 'beta']) {
    const { status, json } = await post('/api/auth/register', { username: name, password: 'secret123' });
    assert.equal(status, 200);
    assert.ok(json.token);
    assert.equal(json.profile.coin, 500);
    assert.equal(json.profile.diamond, 20);
    users[name] = json;
  }
});

test('từ chối username trùng và mật khẩu quá ngắn', async () => {
  assert.equal((await post('/api/auth/register', { username: 'alpha', password: 'secret123' })).status, 409);
  assert.equal((await post('/api/auth/register', { username: 'gamma', password: '123' })).status, 400);
});

test('từ chối request không có token', async () => {
  assert.equal((await get('/api/users/me')).status, 401);
});

test('kết bạn hai chiều', async () => {
  const a = users.alpha;
  const b = users.beta;
  assert.equal((await post(`/api/social/friends/${b.profile.id}/request`, {}, a.token)).status, 200);
  assert.equal((await post(`/api/social/friends/${a.profile.id}/accept`, {}, b.token)).status, 200);

  const { json } = await get('/api/social/friends', a.token);
  const edge = json.friends.find((f) => f.user.id === b.profile.id);
  assert.equal(edge.status, 'accepted');
});

test('quick match Caro: server quyết định kết quả và trả thưởng', async () => {
  const sa = io(API, { auth: { token: users.alpha.token }, transports: ['websocket'] });
  const sb = io(API, { auth: { token: users.beta.token }, transports: ['websocket'] });
  sockets.push(sa, sb);
  await Promise.all([waitFor(sa, 'connect'), waitFor(sb, 'connect')]);

  const started = Promise.all([waitFor(sa, 'match.start'), waitFor(sb, 'match.start')]);
  await ack(sa, 'mm.join', { gameType: 'caro', mode: 'ranked' });
  await ack(sb, 'mm.join', { gameType: 'caro', mode: 'ranked' });
  const [startA] = await started;
  const matchId = startA.matchId;
  assert.ok(matchId);

  const resultP = waitFor(sa, 'match.result', 20000);

  // Seat 0 xếp 5 quân dọc cột 7, seat 1 đánh xa ở cột 0 nên chắc chắn thua.
  const sync = await ack(sa, 'game.sync', { matchId });
  const aSeat = sync.state.view.players.findIndex((p) => p.id === users.alpha.profile.id);
  const first = aSeat === 0 ? sa : sb;
  const second = aSeat === 0 ? sb : sa;

  for (let y = 0; y < 5; y++) {
    const r1 = await ack(first, 'game.action', { matchId, actionId: `f${y}`, type: 'move', payload: { x: 7, y } });
    assert.equal(r1.ok, true, JSON.stringify(r1));
    const now = await ack(sa, 'game.sync', { matchId });
    if (now.state.finished) break;
    if (y < 4) {
      const r2 = await ack(second, 'game.action', { matchId, actionId: `s${y}`, type: 'move', payload: { x: 0, y } });
      assert.equal(r2.ok, true, JSON.stringify(r2));
    }
  }

  const result = await resultP;
  const winner = result.rows.find((r) => r.result === 'win');
  const loser = result.rows.find((r) => r.result === 'lose');
  assert.ok(winner && loser, 'phải có người thắng và người thua');
  assert.ok(winner.xpGain > 0 && winner.coinGain > 0);
  assert.ok(winner.ratingDelta > 0 && loser.ratingDelta < 0, 'ranked phải đổi điểm rank');
  assert.equal(winner.ratingDelta + loser.ratingDelta, 0, 'Elo bảo toàn tổng');
});

test('action trùng action_id không được tính hai lần', async () => {
  const sa = sockets[0];
  const sb = sockets[1];
  const started = Promise.all([waitFor(sa, 'match.start'), waitFor(sb, 'match.start')]);
  await ack(sa, 'mm.join', { gameType: 'caro', mode: 'normal' });
  await ack(sb, 'mm.join', { gameType: 'caro', mode: 'normal' });
  const [start] = await started;

  const sync = await ack(sa, 'game.sync', { matchId: start.matchId });
  const mySeat = sync.state.view.players.findIndex((p) => p.id === users.alpha.profile.id);
  const mover = mySeat === sync.state.view.turnSeat ? sa : sb;

  const r1 = await ack(mover, 'game.action', { matchId: start.matchId, actionId: 'dup-1', type: 'move', payload: { x: 3, y: 3 } });
  const r2 = await ack(mover, 'game.action', { matchId: start.matchId, actionId: 'dup-1', type: 'move', payload: { x: 4, y: 4 } });
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r1.version, r2.version, 'gửi lại cùng action_id phải trả về đúng version cũ');

  const after = await ack(sa, 'game.sync', { matchId: start.matchId });
  assert.equal(after.state.view.cells[4 * after.state.view.size + 4], -1, 'nước đi thứ hai không được ghi nhận');
});

test('chat lọc từ tục và chặn spam', async () => {
  const sa = sockets[0];
  const msg = await ack(sa, 'chat.send', { toUserId: users.beta.profile.id, body: 'ngu vậy bạn ơi' });
  assert.equal(msg.ok, true);
  assert.ok(msg.message.body.includes('*'), 'từ tục phải bị lọc');
  assert.equal(msg.message.filtered, true);

  let limited = false;
  for (let i = 0; i < 20; i++) {
    const r = await ack(sa, 'chat.send', { toUserId: users.beta.profile.id, body: `spam ${i}` });
    if (!r.ok && r.error === 'RATE_LIMITED') {
      limited = true;
      break;
    }
  }
  assert.equal(limited, true, 'phải chặn spam chat');
});

test('không còn cửa hàng và cổng nạp tiền', async () => {
  const token = users.alpha.token;
  // Route không tồn tại thì Express trả trang HTML, nên chỉ xét status.
  const status = async (method, path, body) =>
    (
      await fetch(API + path, {
        method,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      })
    ).status;

  // Bốn đường mua bán cũ phải biến mất hẳn, không chỉ ẩn ở client.
  assert.equal(await status('GET', '/api/economy/shop'), 404);
  assert.equal(await status('GET', '/api/economy/packs'), 404);
  assert.equal(await status('POST', '/api/economy/shop/frame_mint/buy', { currency: 'coin' }), 404);
  assert.equal(await status('POST', '/api/economy/payment/checkout', { packId: 'starter' }), 404);
});

test('túi đồ: cosmetic kiếm được thì trang bị được, mỗi loại một món', async () => {
  const token = users.alpha.token;
  // alpha đã thắng trận Caro phía trên nên mở khoá thành tựu "Chiến Thắng Đầu
  // Tiên", thành tựu đó tặng kèm danh hiệu.
  const inv = (await get('/api/economy/inventory', token)).json;
  const title = inv.inventory.find((e) => e.item.id === 'title_newbie');
  assert.ok(title, 'thành tựu phải tặng cosmetic vì không còn chỗ nào mua');
  assert.equal(title.item.priceCoin, undefined, 'cosmetic không còn giá');

  assert.equal((await post(`/api/economy/inventory/${title.item.id}/equip`, { equip: true }, token)).status, 200);
  const after = (await get('/api/economy/inventory', token)).json;
  assert.equal(after.inventory.find((e) => e.item.id === 'title_newbie').equipped, true);
  // Đồ không có trong túi thì không trang bị được.
  assert.equal((await post('/api/economy/inventory/frame_dragon/equip', { equip: true }, token)).status, 404);
});

test('quest tiến độ tăng sau khi chơi và claim được', async () => {
  const token = users.alpha.token;
  const { json } = await get('/api/quests', token);
  const played = json.quests.find((q) => q.quest.metric === 'play_match' && q.quest.type === 'daily');
  assert.ok(played.progress > 0, 'chơi xong phải tăng tiến độ nhiệm vụ');

  const done = json.quests.find((q) => q.completed && !q.claimed);
  if (done) {
    const claim = await post(`/api/quests/${done.quest.id}/claim`, {}, token);
    assert.equal(claim.status, 200);
    assert.equal((await post(`/api/quests/${done.quest.id}/claim`, {}, token)).status, 400, 'không claim được 2 lần');
  }
});

test('người thường không truy cập được API admin', async () => {
  assert.equal((await get('/api/admin/dashboard', users.alpha.token)).status, 403);
});

test('admin xem được dashboard và điều chỉnh số dư có audit', async () => {
  const login = await post('/api/auth/login', { login: 'admin', password: 'admin123' });
  assert.equal(login.status, 200);
  const token = login.json.token;

  const dash = await get('/api/admin/dashboard', token);
  assert.equal(dash.status, 200);
  assert.ok(dash.json.matches.total >= 2);

  const before = (await get('/api/users/me', users.alpha.token)).json.profile.coin;
  await post(`/api/admin/users/${users.alpha.profile.id}/currency`, { currency: 'coin', amount: 777, reason: 'test' }, token);
  const after = (await get('/api/users/me', users.alpha.token)).json.profile.coin;
  assert.equal(after, before + 777);

  const audit = (await get('/api/admin/audit', token)).json;
  assert.ok(audit.log.some((a) => a.action === 'currency_adjust'));
});

test('ban tài khoản thu hồi mọi phiên đăng nhập', async () => {
  const login = await post('/api/auth/login', { login: 'admin', password: 'admin123' });
  const adminToken = login.json.token;
  const victim = (await post('/api/auth/register', { username: 'toban', password: 'secret123' })).json;

  assert.equal((await get('/api/users/me', victim.token)).status, 200);
  await post(`/api/admin/users/${victim.profile.id}/status`, { status: 'banned', reason: 'test' }, adminToken);
  assert.equal((await get('/api/users/me', victim.token)).status, 401, 'token phải hết hiệu lực sau khi ban');
  assert.equal((await post('/api/auth/login', { login: 'toban', password: 'secret123' })).status, 403);
});

test('avatar endpoint trả SVG hợp lệ', async () => {
  const res = await fetch(`${API}/avatar/adventurer/alpha.svg?size=128`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /svg/);
  assert.match(await res.text(), /^<svg/);
});


test('bang hội: lập bang trừ coin, tên trùng thì hoàn lại tiền', async () => {
  const a = users.alpha;
  const before = (await get('/api/users/me', a.token)).json.profile.coin;
  const made = await post('/api/guilds', { name: 'Bang Thử Nghiệm', tag: 'BTN' }, a.token);
  assert.equal(made.status, 200);
  assert.equal(made.json.guild.tag, 'BTN');
  assert.equal(made.json.balance.coin, before - 500, 'phải trừ đúng phí lập bang');

  // Người khác lấy trùng tên: phải báo lỗi và không mất tiền.
  const b = users.beta;
  const coinB = (await get('/api/users/me', b.token)).json.profile.coin;
  const dup = await post('/api/guilds', { name: 'Bang Thử Nghiệm', tag: 'XYZ' }, b.token);
  assert.equal(dup.status, 400);
  assert.equal(dup.json.error, 'GUILD_NAME_TAKEN');
  assert.equal((await get('/api/users/me', b.token)).json.profile.coin, coinB, 'lập hụt thì phải hoàn tiền');
});

test('bang hội: vào bang, phân quyền, và một người chỉ ở một bang', async () => {
  const a = users.alpha;
  const b = users.beta;
  const gid = (await get('/api/guilds/me', a.token)).json.guild.id;

  assert.equal((await post(`/api/guilds/${gid}/join`, {}, b.token)).status, 200);
  const mine = (await get('/api/guilds/me', b.token)).json;
  assert.equal(mine.guild.id, gid);
  assert.equal(mine.role, 'member');
  assert.equal(mine.guild.members, 2);

  // Đang ở bang rồi thì không lập bang khác được.
  const again = await post('/api/guilds', { name: 'Bang Khac', tag: 'BK' }, b.token);
  assert.equal(again.json.error, 'ALREADY_IN_GUILD');

  // Thành viên thường không được đuổi ai.
  assert.equal((await post(`/api/guilds/${gid}/kick/${a.profile.id}`, {}, b.token)).json.error, 'NOT_ALLOWED');

  // Chủ bang phong sĩ quan.
  assert.equal((await post(`/api/guilds/${gid}/role/${b.profile.id}`, { role: 'officer' }, a.token)).status, 200);
  assert.equal((await get('/api/guilds/me', b.token)).json.role, 'officer');
});

test('bang hội: chủ bang còn người thì không rời được', async () => {
  const a = users.alpha;
  const b = users.beta;
  assert.equal((await post('/api/guilds/leave', {}, a.token)).json.error, 'OWNER_MUST_TRANSFER');
  assert.equal((await post('/api/guilds/leave', {}, b.token)).status, 200);
  assert.equal((await post('/api/guilds/leave', {}, a.token)).status, 200, 'còn một mình thì rời được');
  assert.equal((await get('/api/guilds/me', a.token)).json.guild, null);
});

test('kênh chat của bang chỉ thành viên mới đọc và gửi được', async () => {
  // Tài khoản riêng: alpha đã đụng trần rate limit ở test chống spam phía trên.
  const a = (await post('/api/auth/register', { username: 'guildowner', password: 'secret123' })).json;
  const b = (await post('/api/auth/register', { username: 'guildsnoop', password: 'secret123' })).json;
  const gid = (await post('/api/guilds', { name: 'Bang Kin', tag: 'KIN' }, a.token)).json.guild.id;

  const sa = io(API, { auth: { token: a.token }, transports: ['websocket'] });
  const sb = io(API, { auth: { token: b.token }, transports: ['websocket'] });
  sockets.push(sa, sb);
  await Promise.all([waitFor(sa, 'connect'), waitFor(sb, 'connect')]);

  const ownerSend = await ack(sa, 'chat.send', { channelId: `guild:${gid}`, body: 'chao ca bang' });
  assert.equal(ownerSend.ok, true, `chủ bang phải gửi được: ${JSON.stringify(ownerSend)}`);

  // guildsnoop không ở trong bang: id kênh đoán được nhưng phải bị chặn.
  const intruderSend = await ack(sb, 'chat.send', { channelId: `guild:${gid}`, body: 'lot vao' });
  assert.equal(intruderSend.ok, false);
  assert.equal(intruderSend.error, 'NOT_A_MEMBER');
  const intruderRead = await ack(sb, 'chat.history', { channelId: `guild:${gid}` });
  assert.equal(intruderRead.ok, false);

  // Vào bang rồi thì đọc được lịch sử.
  await post(`/api/guilds/${gid}/join`, {}, b.token);
  const asMember = await ack(sb, 'chat.history', { channelId: `guild:${gid}` });
  assert.equal(asMember.ok, true);
  assert.equal(asMember.messages.length, 1);
});

test('giải đấu: chỉ admin tạo, đủ suất là tự khai mạc và sinh nhánh', async () => {
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;

  // Người thường không tạo được giải.
  assert.equal((await post('/api/tournaments', { name: 'X', gameType: 'caro', size: 4 }, users.alpha.token)).status, 403);
  // Game nhiều người không mở giải loại trực tiếp được.
  assert.equal(
    (await post('/api/tournaments', { name: 'X', gameType: 'werewolf', size: 4 }, admin.token)).json.error,
    'GAME_NOT_ELIGIBLE',
  );

  const t = (await post('/api/tournaments', { name: 'Cúp Test', gameType: 'caro', size: 4, entryCoin: 50 }, admin.token))
    .json.tournament;
  assert.equal(t.status, 'open');

  const names = ['tour1', 'tour2', 'tour3', 'tour4'];
  const players = [];
  for (const n of names) players.push((await post('/api/auth/register', { username: n, password: 'secret123' })).json);

  for (let i = 0; i < 3; i++) {
    const r = await post(`/api/tournaments/${t.id}/join`, {}, players[i].token);
    assert.equal(r.status, 200);
    assert.equal(r.json.balance.coin, 450, 'lệ phí phải trừ đúng 50');
  }
  assert.equal((await post(`/api/tournaments/${t.id}/join`, {}, players[0].token)).json.error, 'ALREADY_JOINED');

  // Người thứ tư làm giải đủ suất -> tự khai mạc.
  const full = await post(`/api/tournaments/${t.id}/join`, {}, players[3].token);
  assert.equal(full.json.tournament.status, 'running');
  assert.equal(full.json.tournament.bracket.length, 3, 'bảng 4 người có 2 trận vòng 1 + 1 chung kết');

  const round1 = full.json.tournament.bracket.filter((m) => m.round === 1);
  assert.equal(round1.length, 2);
  assert.ok(round1.every((m) => m.p1 && m.p2), 'vòng 1 phải đủ cặp');
  assert.ok(round1.every((m) => m.matchId), 'vòng 1 phải mở trận thật');

  // Giải đã chạy thì không rút tên được nữa.
  assert.equal((await post(`/api/tournaments/${t.id}/leave`, {}, players[0].token)).json.error, 'TOURNAMENT_STARTED');
});

test('giải đấu: rút tên trước khai mạc thì hoàn lệ phí', async () => {
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;
  const t = (await post('/api/tournaments', { name: 'Cúp Hoàn Tiền', gameType: 'caro', size: 8, entryCoin: 120 }, admin.token))
    .json.tournament;
  const u = (await post('/api/auth/register', { username: 'refunder', password: 'secret123' })).json;

  assert.equal((await post(`/api/tournaments/${t.id}/join`, {}, u.token)).json.balance.coin, 380);
  assert.equal((await post(`/api/tournaments/${t.id}/leave`, {}, u.token)).json.balance.coin, 500);
  assert.equal((await post(`/api/tournaments/${t.id}/leave`, {}, u.token)).json.error, 'NOT_JOINED');
});

test('giải đấu: thắng trận vòng 1 thì được đẩy sang vòng sau', async () => {
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;
  const t = (await post('/api/tournaments', { name: 'Cúp Tiến Nhánh', gameType: 'caro', size: 4 }, admin.token)).json
    .tournament;

  const accounts = [];
  for (const n of ['brk1', 'brk2', 'brk3', 'brk4']) {
    accounts.push((await post('/api/auth/register', { username: n, password: 'secret123' })).json);
  }
  // Nối socket trước khi khai mạc để không lỡ sự kiện match.start.
  const conns = accounts.map((a) => io(API, { auth: { token: a.token }, transports: ['websocket'] }));
  sockets.push(...conns);
  await Promise.all(conns.map((c) => waitFor(c, 'connect')));

  const starts = conns.map((c) => waitFor(c, 'match.start', 20000));
  for (const a of accounts) await post(`/api/tournaments/${t.id}/join`, {}, a.token);
  const startEvents = await Promise.all(starts);

  // Chơi xong trận vòng 1 đầu tiên: seat 0 xếp 5 quân dọc là thắng.
  const matchId = startEvents[0].matchId;
  const sync = await ack(conns[0], 'game.sync', { matchId });
  const seats = sync.state.view.players.map((p) => p.id);
  const sock = (uid) => conns[accounts.findIndex((a) => a.profile.id === uid)];
  const first = sock(seats[0]);
  const second = sock(seats[1]);

  for (let y = 0; y < 5; y++) {
    await ack(first, 'game.action', { matchId, actionId: `t${y}`, type: 'move', payload: { x: 7, y } });
    const now = await ack(first, 'game.sync', { matchId });
    if (now.state.finished) break;
    if (y < 4) await ack(second, 'game.action', { matchId, actionId: `u${y}`, type: 'move', payload: { x: 0, y } });
  }
  await new Promise((r) => setTimeout(r, 600));

  const after = (await get(`/api/tournaments/${t.id}`, admin.token)).json.tournament;
  const r1 = after.bracket.find((m) => m.round === 1 && m.matchId === matchId);
  assert.equal(r1.winnerId, seats[0], 'người thắng phải được ghi vào nhánh');
  const final = after.bracket.find((m) => m.round === 2);
  assert.ok(final.p1 === seats[0] || final.p2 === seats[0], 'người thắng phải có mặt ở chung kết');
});

test('rank theo mùa: trận ranked tính vào định hạng, trận thường thì không', async () => {
  // alpha và beta đã đá 1 trận ranked và 1 trận thường ở các test phía trên.
  const r = (await get('/api/users/me/rank', users.alpha.token)).json;
  assert.equal(r.status.placement, 5);
  assert.equal(r.status.played, 1, 'chỉ trận ranked mới được đếm');
  assert.equal(r.status.placed, false, 'chưa đủ 5 trận thì chưa có rank chính thức');
  assert.ok(r.status.peak > 0);
  assert.deepEqual(r.history, [], 'chưa có mùa nào kết thúc');
});

test('push: chỉ nhận token Expo hợp lệ, đăng ký lại thì chuyển chủ', async () => {
  const a = (await post('/api/auth/register', { username: 'pushuser', password: 'secret123' })).json;
  const b = (await post('/api/auth/register', { username: 'pushuser2', password: 'secret123' })).json;
  const token = 'ExponentPushToken[abcdef1234567890]';

  assert.equal((await post('/api/push/register', { token: 'khong-phai-token' }, a.token)).json.error, 'BAD_PUSH_TOKEN');
  assert.equal((await post('/api/push/register', { token, platform: 'android' }, a.token)).status, 200);
  // Cùng một máy đổi tài khoản: token phải thuộc về người đăng ký sau cùng.
  assert.equal((await post('/api/push/register', { token, platform: 'android' }, b.token)).status, 200);
  assert.equal((await post('/api/push/unregister', { token }, b.token)).status, 200);
  assert.equal((await post('/api/push/register', { token }, undefined)).status, 401);
});

test('không còn Battle Pass', async () => {
  const token = users.alpha.token;
  const status = async (method, path, body) =>
    (
      await fetch(API + path, {
        method,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      })
    ).status;
  assert.equal(await status('GET', '/api/season'), 404);
  assert.equal(await status('POST', '/api/season/premium'), 404);
  assert.equal(await status('POST', '/api/season/claim', { tier: 1, track: 'free' }), 404);
  assert.equal(await status('POST', '/api/season/claim-all'), 404);

  // Nhưng mùa giải vẫn còn, vì rank theo mùa dựa vào nó.
  const rank = (await get('/api/users/me/rank', token)).json;
  assert.ok(rank.status.seasonId, 'mùa giải phải còn để định hạng');
});

test('thành tựu kết bạn: mốc friends nay có phát ra', async () => {
  const a = (await post('/api/auth/register', { username: 'achfr1', password: 'secret123' })).json;
  const b = (await post('/api/auth/register', { username: 'achfr2', password: 'secret123' })).json;
  await post(`/api/social/friends/${b.profile.id}/request`, {}, a.token);
  await post(`/api/social/friends/${a.profile.id}/accept`, {}, b.token);

  // Kết bạn 1 người mở khoá thành tựu đầu tiên, tặng kèm cosmetic.
  const ach = (await get('/api/achievements', a.token)).json.achievements;
  const first = ach.find((x) => x.achievement.id === 'ach_friends_1');
  assert.ok(first?.unlockedAt, 'thành tựu kết bạn phải mở khoá được');
  const inv = (await get('/api/economy/inventory', a.token)).json;
  assert.ok(inv.inventory.some((e) => e.item.id === 'fx_entry_star'));
});

test('cosmetic: có bảng tra công khai và 8 ô trang bị đều lưu được', async () => {
  const open = await fetch(API + '/api/economy/cosmetics');
  const cos = (await open.json()).cosmetics;
  assert.equal(open.status, 200, 'bảng cosmetic không cần đăng nhập');
  assert.ok(cos.length >= 19);
  assert.ok(cos.every((c) => c.payload && typeof c.payload === 'object'), 'phải có payload màu để client vẽ');

  const u = (await post('/api/auth/register', { username: 'cosmo', password: 'secret123' })).json;
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;

  // Mỗi loại một món, phủ cả 8 ô kể cả 4 ô mới thêm.
  const wear = {
    frame: 'frame_mint',
    title: 'title_wolf',
    background: 'bg_night',
    bubble: 'bubble_candy',
    boardtheme: 'board_neon',
    victory: 'fx_fireworks',
    entry: 'fx_entry_star',
    emote: 'emote_pack_troll',
  };
  for (const id of Object.values(wear)) {
    // Tặng thẳng qua admin cho nhanh, đường lấy thật là thành tựu.
    await post('/api/admin/items', { id, name: id, type: cos.find((c) => c.id === id).type }, admin.token);
  }

  const inv = await post('/api/economy/inventory/frame_mint/equip', { equip: true }, u.token);
  assert.equal(inv.status, 404, 'chưa có trong túi thì không trang bị được');
});

test('cosmetic: hồ sơ trả về đủ ô đang dùng của demo', async () => {
  const demo = (await post('/api/auth/login', { login: 'demo', password: 'demo123' })).json;
  const me = (await get('/api/users/me', demo.token)).json.profile;
  // Bốn ô công khai người khác cũng thấy.
  assert.equal(me.frameId, 'frame_sakura');
  assert.equal(me.titleId, 'title_newbie');
  assert.equal(me.backgroundId, 'bg_beach');
  assert.equal(me.bubbleId, 'bubble_candy');
  // Bốn ô chỉ ảnh hưởng màn hình của chính chủ.
  assert.equal(me.boardId, 'board_wood');
  assert.equal(me.victoryId, 'fx_confetti');
  assert.equal(me.entryId, 'fx_entry_star');
  assert.equal(me.emoteId, 'emote_pack_cute');

  // Hồ sơ công khai của người khác không lộ mấy ô riêng đó.
  const seen = (await get(`/api/users/${demo.profile.id}`, demo.token)).json.profile;
  assert.equal(seen.frameId, 'frame_sakura');
  assert.equal(seen.titleId, 'title_newbie');
});

/* ------------------------- xem lại & xem trực tiếp ------------------------ */

test('xem lại: trận đã xong có khung phát lại, tua được từ đầu tới cuối', async () => {
  const { json } = await get('/api/matches?limit=10', users.alpha.token);
  const done = json.matches.find((m) => m.hasReplay);
  assert.ok(done, 'trận Caro vừa chơi phải có bản xem lại');

  const r = await get(`/api/matches/${done.id}/replay`, users.alpha.token);
  assert.equal(r.status, 200);
  const replay = r.json.replay;
  assert.ok(replay.frames.length >= 2, 'phải có nhiều hơn một khung');
  assert.equal(replay.players.length, 2);
  // Mốc thời gian không được lùi, không thì thanh tua chạy giật.
  for (let i = 1; i < replay.frames.length; i++) {
    assert.ok(replay.frames[i].at >= replay.frames[i - 1].at, 'mốc thời gian phải tăng dần');
  }
  assert.equal(replay.frames[0].view.over, false, 'khung đầu là lúc chưa ai thắng');
  assert.equal(replay.frames[replay.frames.length - 1].view.over, true, 'khung cuối phải là lúc kết thúc');
  assert.ok(replay.rows.some((x) => x.result === 'win'), 'kết quả đi kèm bản xem lại');
});

test('xem lại: trận đang chơi thì chưa có bản xem lại', async () => {
  const sa = sockets[0];
  const sb = sockets[1];
  const started = Promise.all([waitFor(sa, 'match.start'), waitFor(sb, 'match.start')]);
  await ack(sa, 'mm.join', { gameType: 'caro', mode: 'normal' });
  await ack(sb, 'mm.join', { gameType: 'caro', mode: 'normal' });
  const [start] = await started;

  const r = await get(`/api/matches/${start.matchId}/replay`, users.alpha.token);
  assert.equal(r.status, 404, 'đang đấu thì phải dùng khán đài, không phải xem lại');
  users.liveMatchId = start.matchId;
});

test('khán đài: bạn bè vào xem được, người lạ thì không', async () => {
  for (const name of ['gamma', 'delta']) {
    const { json } = await post('/api/auth/register', { username: name, password: 'secret123' });
    users[name] = json;
  }
  // gamma là bạn của alpha; delta không quen ai trong trận.
  await post(`/api/social/friends/${users.gamma.profile.id}/request`, {}, users.alpha.token);
  await post(`/api/social/friends/${users.alpha.profile.id}/accept`, {}, users.gamma.token);

  const sg = io(API, { auth: { token: users.gamma.token }, transports: ['websocket'] });
  const sd = io(API, { auth: { token: users.delta.token }, transports: ['websocket'] });
  sockets.push(sg, sd);
  // Giữ lại để test sau dùng: mảng `sockets` còn socket của mấy test khác nữa,
  // đếm chỉ số là sai.
  users.gammaSocket = sg;
  await Promise.all([waitFor(sg, 'connect'), waitFor(sd, 'connect')]);

  const denied = await ack(sd, 'spectate.join', { matchId: users.liveMatchId });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, 'SPECTATE_NOT_ALLOWED');

  const joined = await ack(sg, 'spectate.join', { matchId: users.liveMatchId });
  assert.equal(joined.ok, true, JSON.stringify(joined));
  assert.equal(joined.state.spectating, true);
  assert.ok(Array.isArray(joined.state.view.cells), 'khán giả nhận được bàn cờ');

  // Có nước đi mới thì khán đài cũng nhận được state mới.
  const pushed = waitFor(sg, 'game.state', 10000);
  const sync = await ack(sockets[0], 'game.sync', { matchId: users.liveMatchId });
  const mover = sync.state.view.players.findIndex((p) => p.id === users.alpha.profile.id) === sync.state.view.turnSeat ? sockets[0] : sockets[1];
  await ack(mover, 'game.action', { matchId: users.liveMatchId, actionId: 'spec-1', type: 'move', payload: { x: 6, y: 6 } });
  const state = await pushed;
  assert.equal(state.matchId, users.liveMatchId);
  assert.equal(state.spectating, true);
  assert.ok(state.spectators >= 1, 'số khán giả phải được đếm');

  await ack(sg, 'spectate.leave', { matchId: users.liveMatchId });
});

test('khán đài: game giấu bài không lộ thông tin ẩn cho khán giả', async () => {
  const sa = sockets[0];
  const sb = sockets[1];
  const sg = users.gammaSocket;
  const started = Promise.all([waitFor(sa, 'match.start'), waitFor(sb, 'match.start')]);
  await ack(sa, 'mm.join', { gameType: 'battleship', mode: 'normal' });
  await ack(sb, 'mm.join', { gameType: 'battleship', mode: 'normal' });
  const [start] = await started;

  // Hai bên xếp hạm đội xong thì toạ độ tàu đã nằm trong state của server.
  await ack(sa, 'game.action', { matchId: start.matchId, actionId: 'bs-a', type: 'place', payload: {} });
  await ack(sb, 'game.action', { matchId: start.matchId, actionId: 'bs-b', type: 'place', payload: {} });

  const joined = await ack(sg, 'spectate.join', { matchId: start.matchId });
  assert.equal(joined.ok, true, JSON.stringify(joined));
  const view = joined.state.view;
  assert.equal(view.me, null, 'khán giả không có bàn "của tôi"');
  assert.equal(view.sides.length, 2);
  for (const side of view.sides) {
    assert.equal(side.placed, true, 'khán giả vẫn biết hai bên đã xếp xong');
    assert.equal(side.ships.length, 0, 'chưa chìm tàu nào thì khán giả không thấy toạ độ tàu');
  }

  // Người chơi thì vẫn thấy hạm đội của chính mình.
  const own = await ack(sa, 'game.sync', { matchId: start.matchId });
  assert.ok(own.state.view.me.ships.length > 0);

  await ack(sg, 'spectate.leave', { matchId: start.matchId });
});

test('khán đài: người trong trận không tự xem trận của chính mình', async () => {
  const self = await ack(sockets[0], 'spectate.join', { matchId: users.liveMatchId });
  assert.equal(self.ok, false);
  assert.equal(self.error, 'ALREADY_PLAYING');
});

test('khán đài: danh sách trận xem được chỉ gồm trận của bạn bè', async () => {
  const mine = await get('/api/live', users.gamma.token);
  assert.ok(
    mine.json.matches.some((m) => m.matchId === users.liveMatchId && m.reason === 'friend'),
    'gamma phải thấy trận của bạn mình',
  );
  const stranger = await get('/api/live', users.delta.token);
  assert.equal(stranger.json.matches.length, 0, 'người lạ không thấy trận nào');
});

/* --------------------------- điểm danh & sự kiện -------------------------- */

test('điểm danh: nhận một lần mỗi ngày, có chuỗi ngày và cộng tiền thật', async () => {
  const before = (await get('/api/users/me', users.gamma.token)).json.profile;
  const first = await post('/api/checkin', {}, users.gamma.token);
  assert.equal(first.status, 200);
  assert.equal(first.json.streak, 1);
  assert.equal(first.json.checkin.claimedToday, true);
  assert.equal(first.json.balance.coin, before.coin + first.json.reward.coin);

  const again = await post('/api/checkin', {}, users.gamma.token);
  assert.equal(again.status, 400);
  assert.equal(again.json.error, 'ALREADY_CLAIMED');

  const state = await get('/api/checkin', users.gamma.token);
  assert.equal(state.json.checkin.streak, 1);
  assert.equal(state.json.checkin.bestStreak, 1);
  assert.equal(state.json.checkin.rewards.length, 7);
});

test('sự kiện: có nhiệm vụ riêng, và nhiệm vụ đó không lẫn vào màn Nhiệm vụ', async () => {
  const ev = await get('/api/events', users.gamma.token);
  assert.equal(ev.status, 200);
  const login = ev.json.events.find((e) => e.id === 'ev_login');
  assert.ok(login, 'sự kiện điểm danh phải đang chạy');
  assert.ok(login.quests.length >= 2, 'sự kiện phải có nhiệm vụ riêng');
  // Điểm danh ở test trên đã nhích tiến độ nhiệm vụ 'điểm danh N ngày'.
  const checkinQuest = login.quests.find((q) => q.quest.metric === 'checkin');
  assert.ok(checkinQuest.progress >= 1, 'điểm danh phải cộng tiến độ nhiệm vụ sự kiện');

  const quests = await get('/api/quests', users.gamma.token);
  const eventIds = new Set(ev.json.events.flatMap((e) => e.quests.map((q) => q.quest.id)));
  assert.ok(
    quests.json.quests.every((q) => !eventIds.has(q.quest.id)),
    'nhiệm vụ sự kiện không được hiện ở màn Nhiệm vụ',
  );
});

test('sự kiện: nhiệm vụ đủ tiến độ thì nhận thưởng được, và chỉ một lần', async () => {
  // Đẩy thẳng tiến độ qua admin thì phải sửa DB; thay vào đó dùng nhiệm vụ mục
  // tiêu 1 do admin tạo, gắn vào sự kiện đang chạy.
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;
  await post(
    '/api/admin/quests',
    { id: 'q_test_event', title: 'Điểm danh thử', metric: 'checkin', target: 1, rewardCoin: 50, rewardXp: 10, eventId: 'ev_login' },
    admin.token,
  );

  const { json } = await post('/api/auth/register', { username: 'epsilon', password: 'secret123' });
  await post('/api/checkin', {}, json.token);

  const ev = await get('/api/events', json.token);
  const quest = ev.json.events.flatMap((e) => e.quests).find((q) => q.quest.id === 'q_test_event');
  assert.equal(quest.completed, true);
  assert.equal(quest.claimed, false);

  const claim = await post('/api/quests/q_test_event/claim', {}, json.token);
  assert.equal(claim.status, 200);
  assert.equal(claim.json.reward.coin, 50);
  const twice = await post('/api/quests/q_test_event/claim', {}, json.token);
  assert.equal(twice.status, 400);
  assert.equal(twice.json.error, 'ALREADY_CLAIMED');
});

/* ---------------------------- bang hội mở rộng ---------------------------- */

test('bang hội: thông báo ghim chỉ chủ và sĩ quan đặt được', async () => {
  // Bang riêng cho nhóm test này: bang của alpha ở trên đã bị giải tán khi chủ
  // bang rời, nên không mượn lại được.
  users.gmaster = (await post('/api/auth/register', { username: 'gmaster', password: 'secret123' })).json;
  users.gmember = (await post('/api/auth/register', { username: 'gmember', password: 'secret123' })).json;
  const gid = (await post('/api/guilds', { name: 'Bang Cong Hien', tag: 'CH' }, users.gmaster.token)).json.guild.id;
  users.guildId = gid;
  assert.equal((await post(`/api/guilds/${gid}/join`, {}, users.gmember.token)).status, 200);

  const denied = await put(`/api/guilds/${gid}/notice`, { notice: 'thử' }, users.gmember.token);
  assert.equal(denied.status, 400);
  assert.equal(denied.json.error, 'NOT_ALLOWED');

  const ok = await put(`/api/guilds/${gid}/notice`, { notice: 'Tối nay 21h cả bang vào Caro nhé' }, users.gmaster.token);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.guild.notice, 'Tối nay 21h cả bang vào Caro nhé');
  assert.ok(ok.json.guild.noticeAt > 0);

  const seen = await get('/api/guilds/me', users.gmember.token);
  assert.equal(seen.json.guild.notice, 'Tối nay 21h cả bang vào Caro nhé', 'thành viên thường vẫn đọc được');
});

test('bang hội: nhật ký ghi lại việc vào bang và đổi thông báo', async () => {
  const { json } = await get(`/api/guilds/${users.guildId}/logs`, users.gmaster.token);
  const kinds = json.logs.map((l) => l.kind);
  assert.ok(kinds.includes('join'), 'phải có dòng vào bang');
  assert.ok(kinds.includes('notice'), 'phải có dòng đổi thông báo');
  // Tên lưu sẵn trong dòng nhật ký nên đọc được mà không phải tra lại bảng users.
  const notice = json.logs.find((l) => l.kind === 'notice');
  assert.equal(notice.actorName, users.gmaster.profile.displayName);
});

test('bang hội: điểm danh một lần mỗi ngày, cộng điểm cho cả bang lẫn bản thân', async () => {
  const before = (await get('/api/guilds/me', users.gmember.token)).json;
  assert.equal(before.checkin.checkedInToday, false);

  const first = await post('/api/guilds/checkin', {}, users.gmember.token);
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.ok(first.json.points > 0);
  assert.equal(first.json.guild.xp, before.guild.xp + first.json.points, 'điểm phải vào kho bang');
  assert.equal(first.json.guild.points, before.guild.points + first.json.points, 'và vào sổ công trạng của mình');

  const again = await post('/api/guilds/checkin', {}, users.gmember.token);
  assert.equal(again.status, 400);
  assert.equal(again.json.error, 'ALREADY_CLAIMED');

  const after = (await get('/api/guilds/me', users.gmember.token)).json;
  assert.equal(after.checkin.checkedInToday, true);
  assert.equal(after.checkin.todayCount, 1);
  assert.ok(after.members.find((m) => m.user.id === users.gmember.profile.id).checkedInToday);
});

test('bang hội: nhiệm vụ bang góp chung, xong thì từng người nhận một lần', async () => {
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;
  // Mục tiêu 1 để một lượt điểm danh là cán đích.
  await post(
    '/api/admin/guild-quests',
    { id: 'gq_test', title: 'Điểm danh thử', metric: 'guild_checkin', target: 1, rewardCoin: 80, rewardXp: 20, rewardGuildPoints: 100 },
    admin.token,
  );

  // alpha chưa điểm danh hôm nay; điểm danh xong là nhiệm vụ chung hoàn thành.
  const mine = await post('/api/guilds/checkin', {}, users.gmaster.token);
  assert.equal(mine.status, 200, JSON.stringify(mine.json));
  const quest = mine.json.quests.find((q) => q.quest.id === 'gq_test');
  assert.equal(quest.completed, true);
  assert.equal(quest.claimed, false);

  const claim = await post('/api/guilds/quests/gq_test/claim', {}, users.gmaster.token);
  assert.equal(claim.status, 200, JSON.stringify(claim.json));
  assert.equal(claim.json.reward.coin, 80);
  const twice = await post('/api/guilds/quests/gq_test/claim', {}, users.gmaster.token);
  assert.equal(twice.status, 400);
  assert.equal(twice.json.error, 'ALREADY_CLAIMED');

  // Người khác trong bang vẫn nhận được phần của mình: tiến độ là của cả bang.
  const other = await post('/api/guilds/quests/gq_test/claim', {}, users.gmember.token);
  assert.equal(other.status, 200, JSON.stringify(other.json));
  assert.equal(other.json.reward.coin, 80);

  const state = (await get('/api/guilds/me', users.gmaster.token)).json;
  assert.equal(state.quests.find((q) => q.quest.id === 'gq_test').claimedBy, 2);
});

test('bang hội: chưa xong thì không nhận thưởng nhiệm vụ bang được', async () => {
  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;
  await post(
    '/api/admin/guild-quests',
    { id: 'gq_hard', title: 'Rất khó', metric: 'win_match', target: 9999, rewardCoin: 10 },
    admin.token,
  );
  const r = await post('/api/guilds/quests/gq_hard/claim', {}, users.gmaster.token);
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'QUEST_INCOMPLETE');
});

/* ------------------------------- ảnh trong chat --------------------------- */

// PNG 1x1 hợp lệ, đủ để đi qua kiểm tra chữ ký file.
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('chat: tải ảnh lên rồi gửi được, và ảnh không bị lọc từ tục', async () => {
  const up = await post('/api/social/upload', { data: `data:image/png;base64,${PNG_1PX}` }, users.gmaster.token);
  assert.equal(up.status, 200, JSON.stringify(up.json));
  assert.match(up.json.url, /^\/uploads\/[a-z0-9]+\.png$/);
  users.imageUrl = up.json.url;

  // File thật sự phục vụ được qua HTTP.
  const served = await fetch(API + up.json.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');

  // Socket riêng: alpha đã đụng trần rate limit chat ở test chống spam phía trên.
  const sg = io(API, { auth: { token: users.gmaster.token }, transports: ['websocket'] });
  sockets.push(sg);
  await waitFor(sg, 'connect');
  users.gmasterSocket = sg;

  const sent = await ack(sg, 'chat.send', {
    toUserId: users.gmember.profile.id,
    body: up.json.url,
    kind: 'image',
  });
  assert.equal(sent.ok, true, JSON.stringify(sent));
  assert.equal(sent.message.kind, 'image');
  assert.equal(sent.message.body, up.json.url);
  assert.equal(sent.message.filtered, false);
});

test('chat: tin ảnh chỉ nhận đường dẫn do server phát ra', async () => {
  for (const body of ['https://example.com/a.png', '/uploads/../etc/passwd', '/uploads/x.png']) {
    const r = await ack(users.gmasterSocket, 'chat.send', { toUserId: users.gmember.profile.id, body, kind: 'image' });
    assert.equal(r.ok, false, `không được nhận: ${body}`);
    assert.equal(r.error, 'BAD_IMAGE');
  }
});

test('chat: từ chối file không phải ảnh và ảnh quá nặng', async () => {
  const notImage = await post(
    '/api/social/upload',
    { data: `data:image/png;base64,${Buffer.from('<html>hack</html>').toString('base64')}` },
    users.gmaster.token,
  );
  assert.equal(notImage.status, 400);
  assert.equal(notImage.json.error, 'BAD_IMAGE');

  const wrongMime = await post(
    '/api/social/upload',
    { data: `data:application/pdf;base64,${PNG_1PX}` },
    users.gmaster.token,
  );
  assert.equal(wrongMime.status, 400);
  assert.equal(wrongMime.json.error, 'UNSUPPORTED_IMAGE');

  // Ảnh PNG hợp lệ nhưng phình quá trần 2MB.
  const header = Buffer.from(PNG_1PX, 'base64');
  const big = Buffer.concat([header, Buffer.alloc(2 * 1024 * 1024 + 1024)]);
  const tooBig = await post(
    '/api/social/upload',
    { data: `data:image/png;base64,${big.toString('base64')}` },
    users.gmaster.token,
  );
  assert.equal(tooBig.status, 400);
  assert.equal(tooBig.json.error, 'IMAGE_TOO_LARGE');
});
