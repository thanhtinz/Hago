import assert from 'node:assert/strict';
import test from 'node:test';
import type { CaroView } from '@co/game-co-caro';
import './catalog.js';
import type { ServerMsg } from '@co/protocol';
import { Accounts } from './accounts.js';
import { Chat, dm } from './chat.js';
import { openDb } from './db.js';
import { Rooms } from './rooms.js';

/**
 * Máy chủ kiểm bằng cách gọi thẳng vào `Rooms`, không dựng socket.
 *
 * Bài test mở cổng mạng thì chậm và hay hỏng vặt vì lý do không liên quan
 * tới thứ đang kiểm. Tầng socket được kiểm riêng ở `wire.test.ts`, và nó chỉ
 * cần chứng minh đúng một việc: thông điệp đi qua dây rồi về đúng chỗ.
 */

/** Một client giả: ghi lại mọi thông điệp máy chủ đẩy về. */
function client(rooms: Rooms, id: string, name: string) {
  const inbox: ServerMsg[] = [];
  rooms.connect(id, name, (m) => inbox.push(m));
  return {
    id,
    inbox,
    last<T extends ServerMsg['t']>(t: T): Extract<ServerMsg, { t: T }> | undefined {
      for (let i = inbox.length - 1; i >= 0; i--) if (inbox[i]!.t === t) return inbox[i] as never;
      return undefined;
    },
    view(): CaroView {
      return this.last('state')!.v as CaroView;
    },
  };
}

const fixedCodes = () => {
  let n = 0;
  // Mã phòng đoán trước được để test đọc ra chữ.
  return () => ((n++ * 7919) % 32) / 32;
};

test('mở phòng bằng mã, người thứ hai vào là ván bắt đầu', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.create(a.id, 'co-caro', { size: 15 });
  const room = a.last('room')!;
  assert.equal(room.started, false);
  assert.equal(room.rated, false, 'phòng riêng không tính xếp hạng');
  assert.equal(a.last('state'), undefined, 'chưa đủ người thì chưa có ván');

  rooms.join(b.id, room.code);
  assert.equal(a.last('room')!.started, true);
  assert.equal(b.last('room')!.yourSeat, 1);
  assert.ok(a.last('state'), 'đủ người là ván chạy ngay');
  assert.equal(a.view().cells.filter((c) => c >= 0).length, 0);
});

test('mã sai thì báo lỗi, phòng đủ người thì không cho vào thêm', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');
  rooms.join(a.id, 'ZZZZZ');
  assert.equal(a.last('error')!.code, 'NO_ROOM');

  rooms.create(a.id, 'co-caro', {});
  const code = a.last('room')!.code;
  rooms.join(b.id, code);
  rooms.join(c.id, code);
  assert.equal(c.last('error')!.code, 'ROOM_FULL');
});

test('mỗi ghế nhận view của riêng mình, và chỉ bên tới lượt mới đi được', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  assert.equal(a.view().yourSeat, 0);
  assert.equal(b.view().yourSeat, 1);

  rooms.act(b.id, 'n1', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(b.last('error')!.code, 'NOT_YOUR_TURN');

  rooms.act(a.id, 'n1', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(a.view().cells[7 * 15 + 7], 0);
  assert.equal(b.view().cells[7 * 15 + 7], 0, 'bên kia thấy đúng nước vừa đi');
});

test('gửi lặp cùng nonce chỉ tính một lần', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  rooms.act(a.id, 'same', { t: 'game', a: { r: 7, c: 7 } });
  const ply = a.last('state')!.ply;
  rooms.act(a.id, 'same', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(a.last('state')!.ply, ply, 'gửi lại y hệt thì không đổi gì');
  assert.equal(a.last('error'), undefined, 'và cũng không báo lỗi');
});

test('client không tự phát được nước hết giờ hay bỏ trận', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  rooms.act(b.id, 'x', { t: 'flag', seat: 0 });
  assert.equal(b.last('error')!.code, 'SERVER_ONLY');
  rooms.act(b.id, 'y', { t: 'abandon', seat: 0 });
  assert.equal(b.last('error')!.code, 'SERVER_ONLY');
  assert.equal(a.last('state')!.outcome, null, 'ván vẫn chạy');
});

test('nước phạm luật bị từ chối, bàn cờ không đổi', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  rooms.act(a.id, 'n1', { t: 'game', a: { r: 7, c: 7 } });
  rooms.act(b.id, 'n2', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(b.last('error')!.code, 'ILLEGAL', 'đặt đè lên ô đã có quân');
  assert.equal(b.view().cells[7 * 15 + 7], 0);
});

test('đi nhanh không bơm được giờ lên quá mức khởi đầu', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);
  const start = a.last('state')!.seats[0]!.ms;

  // Sáu nước bấm liên tiếp trong vài mili giây. Có ân hạn 1,5s nên không nước
  // nào bị trừ; phần thưởng 5s mỗi nước mà cộng đủ thì đồng hồ sẽ phình ra.
  for (let i = 0; i < 3; i++) {
    rooms.act(a.id, `a${i}`, { t: 'game', a: { r: 2, c: i } });
    rooms.act(b.id, `b${i}`, { t: 'game', a: { r: 9, c: i } });
  }
  const now = a.last('state')!.seats[0]!.ms;
  assert.ok(now <= start, `đồng hồ không được tăng: ${start} -> ${now}`);
});

test('hết giờ thì máy chủ phát nước, bên kia thắng', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  // Tua đồng hồ tới sau khi quỹ thời gian của ghế 0 cạn.
  const spec = a.last('state')!.seats;
  rooms.tick(Date.now() + spec[0]!.ms + 60_000);
  const done = a.last('state')!.outcome;
  assert.ok(done, 'phải kết thúc vì hết giờ');
  assert.equal(done!.winner, 1);
  assert.match(done!.reason, /hết giờ/);
});

test('xin thua đi được cả khi chưa tới lượt mình', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  rooms.act(b.id, 'r', { t: 'resign' });
  const done = b.last('state')!.outcome;
  assert.ok(done);
  assert.equal(done!.winner, 0);
});

test('rời phòng giữa ván thì bên còn lại thắng', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);

  rooms.leave(b.id);
  assert.equal(a.last('state')!.outcome!.winner, 0);
});

test('mất kết nối không mất ghế; vào lại nhận đúng thế cờ hiện tại', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);
  rooms.act(a.id, 'n1', { t: 'game', a: { r: 3, c: 4 } });

  rooms.disconnect(b.id);
  assert.equal(a.last('room')!.seats[1]!.connected, false);
  assert.equal(a.last('state')!.outcome, null, 'rớt mạng không xử thua');

  const inbox: ServerMsg[] = [];
  rooms.reconnect(b.id, (m) => inbox.push(m));
  const state = [...inbox].reverse().find((m) => m.t === 'state') as Extract<ServerMsg, { t: 'state' }>;
  assert.ok(state, 'vào lại là nhận ngay state');
  assert.equal((state.v as CaroView).cells[3 * 15 + 4], 0);
});

test('ghép cặp: người vào sau được ghép với người đang chờ', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.quick(a.id, 'co-caro');
  assert.equal(a.last('queued')!.waiting, 1);
  assert.equal(rooms.stats().queued, 1);

  rooms.quick(b.id, 'co-caro');
  assert.equal(rooms.stats().queued, 0);
  assert.equal(a.last('room')!.started, true);
  assert.equal(a.last('room')!.rated, true, 'ghép cặp thì tính xếp hạng');
  assert.ok(b.last('state'));
});

test('chơi trọn một ván caro qua máy chủ, tới nước thắng thật', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.create(a.id, 'co-caro', { size: 15 });
  rooms.join(b.id, a.last('room')!.code);

  // Ghế 0 xây chuỗi năm ở hàng 7, ghế 1 đi chỗ khác.
  for (let i = 0; i < 5; i++) {
    rooms.act(a.id, `a${i}`, { t: 'game', a: { r: 7, c: 3 + i } });
    if (i < 4) rooms.act(b.id, `b${i}`, { t: 'game', a: { r: 12, c: 3 + i } });
  }
  const done = a.last('state')!.outcome;
  assert.ok(done, 'năm quân liền nhau là thắng');
  assert.equal(done!.winner, 0);
  assert.equal(b.last('state')!.outcome!.winner, 0, 'cả hai bên đều nhận kết quả');
});

test('ván ghép cặp vào sổ thành tích, phòng riêng thì không', () => {
  const got: { gameId: string; rated: boolean; seats: (string | null)[]; winner: number | null }[] = [];
  const rooms = new Rooms({
    serverSeed: 'test',
    random: fixedCodes(),
    onFinish: (e) => got.push({ gameId: e.gameId, rated: e.rated, seats: e.seats, winner: e.outcome.winner }),
  });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  // Phòng riêng: xin thua xong vẫn báo ra, nhưng mang cờ rated = false.
  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);
  rooms.act(b.id, 'r', { t: 'resign' });
  assert.equal(got.length, 1);
  assert.equal(got[0]!.rated, false);
  assert.equal(got[0]!.winner, 0);
  assert.deepEqual(got[0]!.seats, ['a', 'b']);

  // Ghép cặp: tính xếp hạng.
  rooms.leave(a.id);
  rooms.leave(b.id);
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.act(a.id, 'r2', { t: 'resign' });
  assert.equal(got.length, 2);
  assert.equal(got[1]!.rated, true);
  assert.equal(got[1]!.winner, 1);
});

test('bỏ trận giữa chừng vẫn vào sổ, dù ghế đã trống', () => {
  const got: { seats: (string | null)[]; winner: number | null }[] = [];
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), onFinish: (e) => got.push({ seats: e.seats, winner: e.outcome.winner }) });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.leave(b.id);
  assert.equal(got.length, 1);
  assert.equal(got[0]!.winner, 0);
  // Ghế 1 đã rời, nhưng phải còn tên trong sổ — nếu không thì bỏ trận là cách
  // tránh bị ghi một ván thua.
  assert.deepEqual(got[0]!.seats, ['a', 'b']);
});

test('ba bộ môn đều mở phòng và đi được nước đầu qua máy chủ', () => {
  const opens: [string, unknown][] = [
    ['co-caro', { t: 'game', a: { r: 7, c: 7 } }],
    ['co-ganh', null],
    ['o-an-quan', null],
  ];
  for (const [gameId, fixed] of opens) {
    const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
    const a = client(rooms, 'a', 'An');
    const b = client(rooms, 'b', 'Bình');
    rooms.create(a.id, gameId, {});
    rooms.join(b.id, a.last('room')!.code);
    const turn = a.last('state')!.turn;
    assert.equal(turn.kind, 'seat', `${gameId}: phải tới lượt một ghế`);
    const mover = turn.kind === 'seat' ? turn.seat : 0;
    const who = mover === 0 ? a : b;
    const before = who.last('state')!.ply;
    // Không có nước cố định thì lấy nước hợp lệ đầu tiên từ chính máy chủ
    // bằng cách thử: đây là test tích hợp, không phải test luật.
    const action = fixed ?? firstLegal(rooms, who.id);
    rooms.act(who.id, 'go', action);
    assert.ok(who.last('state')!.ply > before, `${gameId}: nước đầu phải đi được`);
  }
});

/** Nước đi thật đầu tiên của ghế: bỏ qua xin thua, cầu hoà và các nước meta. */
function firstLegal(rooms: Rooms, id: string): unknown {
  const all = rooms.legalFor(id);
  const move = all.find((a) => (a as { t?: string }).t === 'game');
  assert.ok(move, 'máy chủ phải liệt kê được ít nhất một nước đi');
  return move;
}

// ---- rủ đấu và trực tuyến -------------------------------------------

test('rủ đấu: chỉ bạn bè, chỉ người đang trực tuyến, và chỉ người được rủ mới trả lời', () => {
  const friends = new Set(['a|b']);
  const rooms = new Rooms({
    serverSeed: 'test',
    random: fixedCodes(),
    mayChallenge: (f, t) => friends.has([f, t].sort().join('|')),
  });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  rooms.challenge(a.id, 'c', 'co-caro');
  assert.equal(a.last('error')!.code, 'NOT_FRIEND');

  rooms.challenge(a.id, 'a', 'co-caro');
  assert.equal(a.last('error')!.code, 'SELF');

  rooms.disconnect(b.id);
  rooms.challenge(a.id, 'b', 'co-caro');
  assert.equal(a.last('error')!.code, 'OFFLINE');
  rooms.reconnect(b.id, (m) => b.inbox.push(m));

  rooms.challenge(a.id, 'b', 'co-caro');
  const out = a.last('challenge')!;
  const inc = b.last('challenge')!;
  assert.equal(out.dir, 'out');
  assert.equal(inc.dir, 'in');
  assert.equal(inc.withName, 'An');
  assert.equal(out.id, inc.id);

  // Người gửi không tự đồng ý được lời rủ của chính mình.
  rooms.answerChallenge(a.id, out.id, true);
  assert.equal(a.last('room'), undefined, 'không được mở phòng nào');

  rooms.answerChallenge(b.id, out.id, true);
  assert.equal(a.last('challenge-gone')!.why, 'accepted');
  assert.equal(a.last('room')!.started, true);
  assert.equal(a.last('room')!.rated, false, 'hai người tự chọn nhau thì không tính xếp hạng');
  assert.ok(b.last('state'));
  assert.equal(c.last('room'), undefined, 'người ngoài không nhận được gì');
});

test('rủ hai lần liên tiếp chỉ ra một lời rủ, và từ chối thì báo cả hai bên', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.challenge(a.id, 'b', 'co-caro');
  const first = b.last('challenge')!.id;
  rooms.challenge(a.id, 'b', 'co-caro');
  assert.equal(b.inbox.filter((m) => m.t === 'challenge').length, 1, 'bấm hai lần không thành hai lời mời');
  assert.equal(rooms.stats().challenges, 1);

  rooms.answerChallenge(b.id, first, false);
  assert.equal(a.last('challenge-gone')!.why, 'declined');
  assert.equal(b.last('challenge-gone')!.why, 'declined');
  assert.equal(rooms.stats().challenges, 0);
});

test('lời rủ hết hạn sau hai phút, và rớt mạng thì huỷ luôn', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.challenge(a.id, 'b', 'co-caro');
  rooms.tick(Date.now() + 119_000);
  assert.equal(rooms.stats().challenges, 1, 'chưa tới hạn thì còn nguyên');
  rooms.tick(Date.now() + 121_000);
  assert.equal(a.last('challenge-gone')!.why, 'expired');
  assert.equal(rooms.stats().challenges, 0);

  rooms.challenge(a.id, 'b', 'co-caro');
  rooms.disconnect(b.id);
  assert.equal(a.last('challenge-gone')!.why, 'expired', 'người kia rớt mạng thì lời rủ cũng hết');
});

test('trực tuyến: chỉ báo cho người đang theo dõi, và báo cả lúc vào lẫn lúc ra', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  client(rooms, 'c', 'Cường');

  rooms.watch(a.id, ['b', 'c', 'khong-co-ai']);
  assert.deepEqual(a.last('presence')!.online.sort(), ['b', 'c']);

  rooms.disconnect(b.id);
  assert.deepEqual(a.last('presence')!.online, ['c']);
  assert.equal(b.last('presence'), undefined, 'b không theo dõi ai nên không nhận gì');

  rooms.reconnect(b.id, (m) => b.inbox.push(m));
  assert.deepEqual(a.last('presence')!.online.sort(), ['b', 'c']);
});

// ---- nhắn tin -------------------------------------------------------

/**
 * Kho có khoá ngoại thật, nên mấy id giả `a`/`b`/`c` của các bài phòng không
 * dùng được cho phần nhắn tin. Dựng ba tài khoản mang đúng id đó.
 */
function withUsers(): { db: ReturnType<typeof openDb>; chat: Chat } {
  const db = openDb(':memory:');
  const people: [string, string][] = [
    ['a', 'An'],
    ['b', 'Bình'],
    ['c', 'Cường'],
  ];
  for (const [id, name] of people) {
    db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(id, name, Date.now());
  }
  return { db, chat: new Chat(db) };
}

test('kênh riêng chỉ hai người trong đó vào được', () => {
  const { chat } = withUsers();
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), chat });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  const ch = dm('a', 'b');
  rooms.openChat(a.id, ch);
  rooms.openChat(b.id, ch);
  // Id người dùng nằm ngay trong đường dẫn hồ sơ, không phải bí mật — nên
  // không kiểm thì ai gõ đúng tên kênh cũng đọc được.
  rooms.openChat(c.id, ch);
  assert.equal(c.last('error')!.code, 'NO_CHANNEL');

  rooms.sendChat(a.id, ch, 'chào Bình');
  assert.equal(b.last('chat')!.m.body, 'chào Bình');
  assert.equal(c.last('chat'), undefined, 'người ngoài không nhận được gì');
});

test('chặn nhau thì không vào được kênh riêng', () => {
  const { chat } = withUsers();
  const rooms = new Rooms({
    serverSeed: 'test',
    random: fixedCodes(),
    chat,
    isBlocked: (x, y) => [x, y].sort().join('|') === 'a|b',
  });
  const a = client(rooms, 'a', 'An');
  client(rooms, 'b', 'Bình');
  rooms.openChat(a.id, dm('a', 'b'));
  assert.equal(a.last('error')!.code, 'NO_CHANNEL');
});

test('kênh thông báo đọc được nhưng không gửi vào được', () => {
  const { chat } = withUsers();
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), chat });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.openChat(a.id, 'he-thong');
  assert.ok(a.last('chat-page'), 'đọc được');
  // Đọc được không có nghĩa là viết được: người dùng gửi được vào kênh hệ
  // thống là người dùng giả danh được máy chủ.
  rooms.sendChat(a.id, 'he-thong', 'giả danh máy chủ');
  assert.equal(a.last('error')!.code, 'READ_ONLY');

  // Thông báo riêng chỉ đúng người đó mở được.
  rooms.openChat(b.id, 'he-thong:a');
  assert.equal(b.last('error')!.code, 'NO_CHANNEL');

  rooms.systemMessage('Bảo trì lúc 2 giờ');
  assert.equal(a.last('chat')!.m.body, 'Bảo trì lúc 2 giờ');
  assert.equal(a.last('chat')!.m.fromId, null);
});

test('chat trong phòng chỉ người ngồi trong phòng đó', () => {
  const { chat } = withUsers();
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), chat });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');
  rooms.create(a.id, 'co-caro', {});
  const code = a.last('room')!.code;
  rooms.join(b.id, code);

  const ch = `phong:${code}`;
  rooms.openChat(a.id, ch);
  rooms.openChat(b.id, ch);
  rooms.openChat(c.id, ch);
  assert.equal(c.last('error')!.code, 'NO_CHANNEL');

  rooms.sendChat(b.id, ch, 'nước hay đấy');
  assert.equal(a.last('chat')!.m.body, 'nước hay đấy');
  assert.equal(c.last('chat'), undefined);
});

test('cầu hoà đi được cả hai chiều: bên kia đồng ý là ván hoà', () => {
  const got: { winner: number | null; reason: string }[] = [];
  const rooms = new Rooms({
    serverSeed: 'test',
    random: fixedCodes(),
    onFinish: (e) => got.push({ winner: e.outcome.winner, reason: e.outcome.reason }),
  });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');

  rooms.act(a.id, 'd1', { t: 'offer-draw' });
  // Lời cầu phải **đi tới màn hình bên kia**, không chỉ nằm trong state. Trước
  // đây luật có `accept-draw` nhưng client không có đường nào biết là đang có
  // lời cầu, nên mọi lời cầu hoà rơi vào hư không.
  const evs = b.last('state')!.events as { t?: string; kind?: string; seat?: number }[];
  assert.ok(
    evs.some((e) => e.t === 'meta' && e.kind === 'draw-offer' && e.seat === 0),
    'ghế 1 phải thấy sự kiện cầu hoà của ghế 0',
  );

  rooms.act(b.id, 'd2', { t: 'accept-draw' });
  assert.equal(got.length, 1);
  assert.equal(got[0]!.winner, null);
  assert.equal(got[0]!.reason, 'hai bên thoả thuận hoà');
});

test('từ chối cầu hoà thì ván đi tiếp và lời cầu biến mất', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');

  rooms.act(a.id, 'd1', { t: 'offer-draw' });
  rooms.act(b.id, 'd2', { t: 'decline-draw' });
  const evs = b.last('state')!.events as { kind?: string }[];
  assert.ok(!evs.some((e) => e.kind === 'draw-offer'));
  assert.equal(b.last('state')!.outcome, null, 'từ chối không kết thúc ván');
  // Và ván vẫn đi được như thường.
  rooms.act(a.id, 'm1', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(a.view().cells.filter((c) => c >= 0).length, 1);
});

test('đấu lại: cần cả hai bên, và ván sau đổi bên', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  const code = a.last('room')!.code;
  assert.equal(a.last('room')!.yourSeat, 0);
  assert.equal(a.last('room')!.game, 1);

  // Chưa xong ván thì không xin đấu lại được.
  rooms.rematch(a.id, true);
  assert.deepEqual(a.last('room')!.rematch, []);

  rooms.act(a.id, 'r', { t: 'resign' });
  rooms.rematch(a.id, true);
  assert.deepEqual(a.last('room')!.rematch, [0], 'một bên xin thì mới chỉ là xin');
  assert.equal(a.last('room')!.started, true, 'ván cũ vẫn còn đó để xem lại');
  assert.ok(b.last('state')!.outcome, 'bên kia chưa bị kéo vào ván mới');

  rooms.rematch(b.id, true);
  const after = a.last('room')!;
  assert.equal(after.code, code, 'vẫn đúng phòng đó');
  assert.equal(after.game, 2);
  assert.equal(after.yourSeat, 1, 'đổi bên: người vừa đi trước thì ván sau đi sau');
  assert.equal(b.last('room')!.yourSeat, 0);
  assert.deepEqual(after.rematch, []);
  assert.equal(a.last('state')!.outcome, null, 'ván mới chưa có kết quả');
  assert.equal(a.view().cells.filter((c) => c >= 0).length, 0, 'bàn cờ sạch');
});

test('rút lại lời xin đấu lại, và không xin được khi đối thủ đã đi', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.act(a.id, 'r', { t: 'resign' });

  rooms.rematch(a.id, true);
  rooms.rematch(a.id, false);
  assert.deepEqual(a.last('room')!.rematch, []);
  rooms.rematch(b.id, true);
  assert.equal(a.last('room')!.game, 1, 'một mình b xin thì chưa dựng ván mới');

  rooms.leave(b.id);
  rooms.rematch(a.id, true);
  assert.equal(a.last('error')!.code, 'NO_OPPONENT');
});

test('đấu lại vẫn vào sổ thành tích, mỗi ván một lần', () => {
  const got: { winner: number | null; seats: (string | null)[] }[] = [];
  const rooms = new Rooms({
    serverSeed: 'test',
    random: fixedCodes(),
    onFinish: (e) => got.push({ winner: e.outcome.winner, seats: e.seats }),
  });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');

  rooms.act(a.id, 'r1', { t: 'resign' });
  rooms.rematch(a.id, true);
  rooms.rematch(b.id, true);
  // Ván hai: a giờ ngồi ghế 1.
  rooms.act(a.id, 'r2', { t: 'resign' });

  assert.equal(got.length, 2, 'hai ván là hai hàng, không phải một');
  assert.deepEqual(got[0]!.seats, ['a', 'b']);
  assert.equal(got[0]!.winner, 1);
  assert.deepEqual(got[1]!.seats, ['b', 'a'], 'ván sau ghế đã đổi');
  assert.equal(got[1]!.winner, 0);
});

test('dọn người đã đi hẳn và phòng bỏ hoang', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  assert.equal(rooms.stats().rooms, 1);

  const t0 = 1_000_000;
  rooms.disconnect(a.id, t0);
  rooms.disconnect(b.id, t0);

  // Rớt sóng vài phút thì ghế vẫn phải còn: người ta đi pha ấm trà rồi quay lại.
  rooms.sweep(t0, 15 * 60_000);
  assert.equal(rooms.stats().players, 2, 'chưa quá hạn thì không được dọn');
  assert.equal(rooms.stats().rooms, 1);

  // Đi hẳn thì dọn, và ván đang chạy tính là bỏ trận chứ không biến mất im lặng.
  rooms.sweep(t0 + 16 * 60_000, 15 * 60_000);
  assert.equal(rooms.stats().players, 0);
  assert.equal(rooms.stats().rooms, 0);
});

test('phòng đã xong ván mà cả hai rớt mạng thì cũng được dọn', () => {
  const got: number[] = [];
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), onFinish: () => got.push(1) });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.act(a.id, 'r', { t: 'resign' });
  assert.equal(got.length, 1);

  rooms.disconnect(a.id);
  rooms.disconnect(b.id);
  rooms.sweep(Date.now(), 15 * 60_000);
  assert.equal(rooms.stats().rooms, 0, 'ván xong và không ai ở đó thì phòng vô nghĩa');
  // Dọn phòng không được ghi thêm một kết quả thứ hai.
  assert.equal(got.length, 1);
});

test('đồng hồ chạy thật giữa lượt: máy chủ phát nhịp và trừ đúng giờ đang nghĩ', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');

  const full = a.last('state')!.seats[0]!.ms;
  assert.ok(full > 0);
  const t0 = Date.now();

  // Ân hạn: nghĩ trong ngưỡng ân hạn thì chưa mất giây nào.
  rooms.tick(t0 + 500);
  assert.equal(a.last('clock'), undefined, 'trong ân hạn thì không có gì đổi để mà phát');

  // Nghĩ lâu hơn ân hạn: con số phải tụt, và phải tụt **ở máy khách** chứ
  // không đợi tới nước đi. Trước đây `clock` không tồn tại nên suốt lượt
  // đối thủ nghĩ, màn hình đứng im rồi nhảy một phát.
  rooms.tick(t0 + 8000);
  const tick = a.last('clock');
  assert.ok(tick, 'phải có nhịp đồng hồ trong lúc đối thủ nghĩ');
  assert.ok(tick.ms[0]! < full, `giờ ghế đang đi phải tụt: ${tick.ms[0]} so với ${full}`);
  assert.equal(tick.ms[1], full, 'ghế đang chờ không mất giờ');
  // Cả hai bên cùng nhận, không chỉ bên đang đi.
  assert.ok(b.last('clock'));

  // Và con số trong `state` cũng phải là giờ tính tới lúc này, không phải
  // giờ của nước cuối — vào lại giữa lượt mà nhận số cũ thì đồng hồ nhảy
  // ngược lên rồi mới tụt xuống.
  rooms.disconnect(b.id, t0 + 8000);
  rooms.reconnect(b.id, (m) => b.inbox.push(m), t0 + 8000);
  assert.ok(b.last('state')!.seats[0]!.ms < full, 'vào lại phải thấy giờ thật');
});

test('nhịp đồng hồ chỉ phát khi con số giây thật sự đổi', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  const t0 = Date.now();

  // Ân hạn của cờ caro là 1,5 giây và quỹ là 5 phút, nên mốc giây rơi vào
  // t0+8500. Bốn nhịp dưới đây nằm gọn trong cùng một giây hiển thị.
  rooms.tick(t0 + 8000);
  const n1 = a.inbox.filter((m) => m.t === 'clock').length;
  assert.equal(n1, 1);
  // Máy chủ tick 250ms một lần, mà màn hình chỉ hiện tới giây. Phát cả bốn
  // là nhân bốn lưu lượng để không đổi lấy một chữ số.
  for (const dt of [8100, 8200, 8300, 8400]) rooms.tick(t0 + dt);
  assert.equal(a.inbox.filter((m) => m.t === 'clock').length, n1, 'cùng một giây thì không phát lại');
  rooms.tick(t0 + 8600);
  assert.equal(a.inbox.filter((m) => m.t === 'clock').length, n1 + 1, 'sang giây mới thì phát');
});

test('mời bạn vào đúng phòng đang chờ, không dựng phòng mới', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), mayChallenge: () => true });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.create(a.id, 'co-caro', {});
  const code = a.last('room')!.code;
  rooms.invite(a.id, b.id);
  const inv = b.last('challenge')!;
  assert.equal(inv.dir, 'in');
  assert.equal(inv.withId, 'a');

  rooms.answerChallenge(b.id, inv.id, true);
  // Đúng cái phòng cũ, không phải một mã mới. Chủ phòng vẫn ngồi ghế 0 —
  // trước đây nhánh nhận lời gọi leave(from) và đá chính chủ phòng ra.
  assert.equal(a.last('room')!.code, code);
  assert.equal(b.last('room')!.code, code);
  assert.equal(a.last('room')!.yourSeat, 0);
  assert.equal(b.last('room')!.yourSeat, 1);
  assert.equal(a.last('room')!.started, true);
  assert.equal(rooms.stats().rooms, 1, 'chỉ một phòng, không sinh thêm');
});

test('không mời được khi chưa mở phòng, phòng đã đủ người, hay ván đã chạy', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), mayChallenge: () => true });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  rooms.invite(a.id, b.id);
  assert.equal(a.last('error')!.code, 'NO_ROOM');

  rooms.create(a.id, 'co-caro', {});
  rooms.join(b.id, a.last('room')!.code);
  rooms.invite(a.id, c.id);
  assert.equal(a.last('error')!.code, 'STARTED');
});

test('lời mời vào phòng hết hiệu lực nếu phòng đã đầy trước khi trả lời', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), mayChallenge: () => true });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  rooms.create(a.id, 'co-caro', {});
  const code = a.last('room')!.code;
  rooms.invite(a.id, c.id);
  const inv = c.last('challenge')!;
  // Người khác vào trước bằng mã.
  rooms.join(b.id, code);
  rooms.answerChallenge(c.id, inv.id, true);
  assert.equal(c.last('challenge-gone')!.why, 'expired');
  assert.equal(c.last('room'), undefined, 'không được chen vào ván của hai người khác');
});

test('số việc đang chờ được đẩy xuống, không phải hỏi lại mới biết', () => {
  let pending = 0;
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), pendingRequests: () => pending });
  const a = client(rooms, 'a', 'An');
  assert.equal(a.last('alerts')!.friendRequests, 0);
  pending = 2;
  rooms.pushAlerts('a');
  assert.equal(a.last('alerts')!.friendRequests, 2);
});

test('nhịp thở của sảnh đổi khi có người vào ra và khi phòng mở ra đóng lại', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  assert.equal(a.last('lobby')!.online, 1);

  const b = client(rooms, 'b', 'Bình');
  assert.equal(a.last('lobby')!.online, 2, 'người mới vào thì người đang ở sảnh phải thấy');

  rooms.quick(a.id, 'co-caro');
  assert.equal(a.last('lobby')!.queued, 1);
  rooms.quick(b.id, 'co-caro');
  assert.equal(a.last('lobby')!.rooms, 1);
  assert.equal(a.last('lobby')!.queued, 0);

  rooms.disconnect(b.id);
  assert.equal(a.last('lobby')!.online, 1);
});

test('mức thời gian: hàng chờ tách theo mức, và phòng dùng đúng đồng hồ', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  // a xếp hàng cờ chớp, b xếp hàng cờ dài: **không được** ghép với nhau.
  rooms.quick(a.id, 'co-caro', 'chop');
  rooms.quick(b.id, 'co-caro', 'dai');
  assert.equal(a.last('room'), undefined, 'hai mức khác nhau thì không ghép');
  assert.equal(rooms.stats().queued, 2);

  // c xếp hàng cờ chớp: ghép với a.
  rooms.quick(c.id, 'co-caro', 'chop');
  const room = a.last('room')!;
  assert.ok(room, 'cùng mức thì ghép ngay');
  assert.equal(room.clock, 'chop');
  // Ba phút, đúng như bảng mức thời gian.
  assert.equal(a.last('state')!.seats[0]!.ms, 3 * 60_000);
});

test('mức lạ thì rơi về đồng hồ mặc định của bộ môn, không báo lỗi', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  // Client cũ gửi lên một khoá đã bỏ thì vẫn phải chơi được.
  rooms.create(a.id, 'co-caro', {}, 'muc-khong-ton-tai');
  assert.equal(a.last('room')!.clock, '');
  rooms.join(b.id, a.last('room')!.code);
  assert.equal(a.last('state')!.seats[0]!.ms, 5 * 60_000, 'đồng hồ mặc định của cờ caro');
});

test('phòng có mật khẩu: sai thì không vào, đúng thì vào', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), mayChallenge: () => true });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  rooms.create(a.id, 'co-caro', {}, 'nhanh', 'mo-cua');
  const room = a.last('room')!;
  assert.equal(room.locked, true);
  assert.equal(room.clock, 'nhanh');

  rooms.join(b.id, room.code);
  assert.equal(b.last('error')!.code, 'BAD_PASS', 'không có mật khẩu thì không vào');
  rooms.join(b.id, room.code, 'sai-be-bet');
  assert.equal(b.last('error')!.code, 'BAD_PASS');
  assert.equal(b.last('room'), undefined);

  rooms.join(b.id, room.code, 'mo-cua');
  assert.equal(b.last('room')!.code, room.code);
  assert.equal(b.last('room')!.yourSeat, 1);

  // Người thứ ba vẫn bị chặn bởi phòng đầy, không phải bởi mật khẩu.
  rooms.join(c.id, room.code, 'mo-cua');
  assert.equal(c.last('error')!.code, 'ROOM_FULL');
});

test('người được mời thẳng không phải gõ mật khẩu', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes(), mayChallenge: () => true });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');

  rooms.create(a.id, 'co-caro', {}, 'chop', 'mo-cua');
  rooms.invite(a.id, b.id);
  rooms.answerChallenge(b.id, b.last('challenge')!.id, true);
  // Chủ phòng đã tự tay chọn người này rồi; bắt gõ thêm mật khẩu là bắt
  // chủ phòng đọc mật khẩu cho đúng người mình vừa mời.
  assert.equal(b.last('room')!.code, a.last('room')!.code);
  assert.equal(b.last('room')!.started, true);
});

// ---- khán giả ------------------------------------------------------------

test('khán giả xem được ván đang đánh, và nước đi tới thẳng màn họ', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  const code = a.last('room')!.code;

  rooms.spectate(c.id, code);
  const seen = c.last('room')!;
  assert.equal(seen.code, code);
  assert.equal(seen.yourSeat, null, 'khán giả không có ghế');
  assert.ok(c.last('state'), 'vào giữa ván là thấy ngay thế cờ hiện tại');
  assert.equal(c.view().cells.filter((x) => x >= 0).length, 0);

  // Hai người chơi phải biết có người đang xem.
  assert.equal(a.last('room')!.fans, 1);
  assert.equal(b.last('room')!.fans, 1);

  rooms.act(a.id, 'n1', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(c.view().cells.filter((x) => x >= 0).length, 1, 'nước đi tới thẳng màn khán giả');
  assert.equal(c.last('state')!.moves.length, 1, 'khán giả đọc được biên bản');

  rooms.unspectate(c.id);
  assert.equal(c.last('left')!.t, 'left');
  assert.equal(a.last('room')!.fans, 0);
});

test('khán giả không đi được nước nào', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.spectate(c.id, a.last('room')!.code);

  rooms.act(c.id, 'x1', { t: 'game', a: { r: 7, c: 7 } });
  assert.equal(c.view().cells.filter((x) => x >= 0).length, 0, 'bàn cờ không nhúc nhích');
  // Xin thua cũng không: một người ngồi xem không có ghế để thua.
  rooms.act(c.id, 'x2', { t: 'resign' });
  assert.equal(a.last('state')!.outcome, null);
});

test('phòng có mật khẩu thì không ai xem được, và không lên sảnh', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  rooms.create(a.id, 'co-caro', {}, undefined, 'bimat');
  const code = a.last('room')!.code;
  rooms.join(b.id, code, 'bimat');
  assert.equal(a.last('room')!.started, true);

  rooms.spectate(c.id, code);
  assert.equal(c.last('error')!.code, 'LOCKED');
  assert.equal(c.last('room'), undefined);
  assert.equal(
    c.last('lobby')!.live.length,
    0,
    'khoá cửa rồi mà vẫn phát tên hai người ra sảnh thì cái khoá chỉ khoá nước đi',
  );
});

test('sảnh liệt kê ván đang đánh, và bỏ ván đã xong', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');

  assert.equal(c.last('lobby')!.live.length, 0);
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');

  const live = c.last('lobby')!.live;
  assert.equal(live.length, 1);
  assert.deepEqual(live[0]!.names, ['An', 'Bình']);
  assert.equal(live[0]!.gameId, 'co-caro');
  assert.equal(live[0]!.rated, true);

  rooms.act(a.id, 'r1', { t: 'resign' });
  assert.equal(c.last('lobby')!.live.length, 0, 'ván đã xong không còn là ván đang đánh');
});

test('đang có ván của mình thì không bỏ ngang để đi xem', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');
  const d = client(rooms, 'd', 'Dũng');

  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  const watched = a.last('room')!.code;

  rooms.quick(c.id, 'co-caro');
  rooms.quick(d.id, 'co-caro');
  rooms.spectate(c.id, watched);
  assert.equal(c.last('error')!.code, 'IN_MATCH');
  assert.equal(c.last('room')!.yourSeat, 0, 'vẫn ngồi nguyên ghế của mình');
  assert.equal(a.last('room')!.fans, 0);
});

test('ván tan thì khán giả được tiễn ra, không ngồi lại với bàn cờ đứng hình', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.spectate(c.id, a.last('room')!.code);
  assert.equal(c.last('left'), undefined);

  rooms.leave(a.id);
  rooms.leave(b.id);
  assert.ok(c.last('left'), 'phòng biến mất thì khán giả phải được báo');
});

test('rớt mạng là thôi xem, không giữ chỗ như giữ ghế', () => {
  const rooms = new Rooms({ serverSeed: 'test', random: fixedCodes() });
  const a = client(rooms, 'a', 'An');
  const b = client(rooms, 'b', 'Bình');
  const c = client(rooms, 'c', 'Cường');
  rooms.quick(a.id, 'co-caro');
  rooms.quick(b.id, 'co-caro');
  rooms.spectate(c.id, a.last('room')!.code);
  assert.equal(a.last('room')!.fans, 1);

  rooms.disconnect(c.id);
  assert.equal(a.last('room')!.fans, 0);
});
