import assert from 'node:assert/strict';
import test from 'node:test';
import type { CaroView } from '@co/game-co-caro';
import './catalog.js';
import type { ServerMsg } from '@co/protocol';
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
