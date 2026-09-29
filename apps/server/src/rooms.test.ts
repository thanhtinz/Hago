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
