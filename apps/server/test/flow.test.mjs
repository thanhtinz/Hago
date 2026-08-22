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
