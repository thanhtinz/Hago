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
    env: { ...process.env, PORT: String(PORT), DB_FILE, JWT_SECRET: 'test-secret' },
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

test('shop: mua thành công, không mua trùng, chặn khi thiếu tiền', async () => {
  const token = users.alpha.token;
  const before = (await get('/api/economy/shop', token)).json;
  const cheap = before.items.filter((i) => i.priceCoin && !i.owned).sort((a, b) => a.priceCoin - b.priceCoin)[0];

  const buy = await post(`/api/economy/shop/${cheap.id}/buy`, { currency: 'coin' }, token);
  assert.equal(buy.status, 200);
  assert.equal(buy.json.balance.coin, before.balance.coin - cheap.priceCoin);

  assert.equal((await post(`/api/economy/shop/${cheap.id}/buy`, { currency: 'coin' }, token)).status, 409);

  const expensive = before.items.filter((i) => i.priceCoin > buy.json.balance.coin)[0];
  if (expensive) {
    assert.equal((await post(`/api/economy/shop/${expensive.id}/buy`, { currency: 'coin' }, token)).status, 402);
  }

  const inv = (await get('/api/economy/inventory', token)).json;
  assert.ok(inv.inventory.some((e) => e.item.id === cheap.id));

  const tx = (await get('/api/economy/transactions', token)).json;
  assert.ok(tx.transactions.some((t) => t.type === 'shop_purchase'), 'phải ghi transaction');
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

test('battle pass: mốc chưa tới thì không nhận được, nhận rồi không nhận lại', async () => {
  const a = (await post('/api/auth/register', { username: 'bpuser', password: 'secret123' })).json;

  const first = (await get('/api/season', a.token)).json.season;
  assert.equal(first.tier, 1);
  assert.equal(first.premium, false);
  assert.equal(first.tiers.length, 30);

  // Mốc 1 nhánh miễn phí có thưởng và đã mở.
  const got = await post('/api/season/claim', { tier: 1, track: 'free' }, a.token);
  assert.equal(got.status, 200);
  assert.equal(got.json.reward.kind, 'coin');
  assert.equal(got.json.balance.coin, 500 + got.json.reward.amount);

  // Nhận lại phải bị chặn bởi khoá chính, không phải bởi kiểm tra lỏng ở code.
  assert.equal((await post('/api/season/claim', { tier: 1, track: 'free' }, a.token)).json.error, 'ALREADY_CLAIMED');

  // Mốc cao chưa tới.
  assert.equal((await post('/api/season/claim', { tier: 9, track: 'free' }, a.token)).json.error, 'TIER_LOCKED');
  // Nhánh cao cấp chưa mở.
  assert.equal((await post('/api/season/claim', { tier: 1, track: 'premium' }, a.token)).json.error, 'PREMIUM_REQUIRED');
});

test('battle pass: mua nhánh cao cấp mở lại được cả mốc đã qua', async () => {
  const a = (await post('/api/auth/register', { username: 'bppremium', password: 'secret123' })).json;
  // Tài khoản mới có 20 kim cương, nhánh cao cấp giá 250 — phải thiếu tiền.
  assert.equal((await post('/api/season/premium', {}, a.token)).json.error, 'INSUFFICIENT_FUNDS');

  const admin = (await post('/api/auth/login', { login: 'admin', password: 'admin123' })).json;
  await post(`/api/admin/users/${a.profile.id}/currency`, { currency: 'diamond', amount: 400, reason: 'test' }, admin.token);

  const bought = await post('/api/season/premium', {}, a.token);
  assert.equal(bought.status, 200);
  assert.equal(bought.json.season.premium, true);
  assert.equal(bought.json.balance.diamond, 420 - 250);

  const claimed = await post('/api/season/claim', { tier: 1, track: 'premium' }, a.token);
  assert.equal(claimed.status, 200);
  assert.equal(claimed.json.reward.kind, 'seasonToken');
});

test('battle pass: XP mùa cộng sau khi chơi xong một trận', async () => {
  const a = (await get('/api/season', users.alpha.token)).json.season;
  assert.ok(a.xp > 0, 'alpha đã chơi Caro ở test trên nên phải có XP mùa');
});
