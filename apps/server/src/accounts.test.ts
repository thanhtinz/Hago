import assert from 'node:assert/strict';
import test from 'node:test';
import { Accounts, AuthError } from './accounts.js';
import { openDb } from './db.js';

/** Mỗi bài một cơ sở dữ liệu trong bộ nhớ: không bài nào thấy dữ liệu bài khác. */
const fresh = () => new Accounts(openDb(':memory:'));

const fails = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof AuthError, `phải là AuthError, nhận ${String(e)}`);
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`đáng lẽ phải lỗi ${code}`);
};

test('đăng ký rồi đăng nhập lại được bằng đúng mật khẩu', () => {
  const a = fresh();
  const s = a.register('An Nguyễn', 'An@Example.COM ', 'matkhaudai');
  assert.equal(s.user.name, 'An Nguyễn');
  assert.equal(s.user.email, 'an@example.com', 'email chuẩn hoá về chữ thường');
  assert.ok(a.bearer(s.token));

  const again = a.login('an@example.com', 'matkhaudai');
  assert.equal(again.user.id, s.user.id);
  assert.notEqual(again.token, s.token, 'mỗi lần đăng nhập là một phiên riêng');
});

test('mật khẩu không nằm dạng thô trong kho, và sai mật khẩu thì không vào được', () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  a.register('An', 'an@example.com', 'matkhaudai');
  const row = db.prepare('SELECT pass_hash FROM users').get() as unknown as { pass_hash: string };
  assert.ok(!row.pass_hash.includes('matkhaudai'), 'mật khẩu thô lọt vào kho');
  assert.match(row.pass_hash, /^scrypt\$/);
  fails(() => a.login('an@example.com', 'matkhaudaj'), 'BAD_LOGIN');
});

test('email chưa đăng ký và sai mật khẩu báo lỗi giống hệt nhau', () => {
  const a = fresh();
  a.register('An', 'an@example.com', 'matkhaudai');
  let m1 = '';
  let m2 = '';
  try {
    a.login('an@example.com', 'sai-be-bet');
  } catch (e) {
    m1 = (e as AuthError).message;
  }
  try {
    a.login('chua-ai@example.com', 'sai-be-bet');
  } catch (e) {
    m2 = (e as AuthError).message;
  }
  // Khác nhau là cho không một công cụ dò xem email nào đã có tài khoản.
  assert.equal(m1, m2);
});

test('từ chối email sai dạng, mật khẩu ngắn, tên quá ngắn, và email trùng', () => {
  const a = fresh();
  fails(() => a.register('An', 'khong-phai-email', 'matkhaudai'), 'BAD_EMAIL');
  fails(() => a.register('An', 'an@example.com', '1234567'), 'WEAK_PASSWORD');
  fails(() => a.register('A', 'an@example.com', 'matkhaudai'), 'BAD_NAME');
  a.register('An', 'an@example.com', 'matkhaudai');
  fails(() => a.register('An khác', 'AN@example.com', 'matkhaudai'), 'EMAIL_TAKEN');
});

test('đăng nhập Google lần hai vào đúng tài khoản cũ', () => {
  const a = fresh();
  const s1 = a.upsertGoogle('sub-1', 'an@example.com', 'An', null);
  const s2 = a.upsertGoogle('sub-1', 'an@example.com', 'An đổi tên', null);
  assert.equal(s2.user.id, s1.user.id);
  assert.equal(s2.user.name, 'An', 'không ghi đè tên người dùng đã tự đặt');
});

test('Google trùng email với tài khoản sẵn có thì nối vào, không mở tài khoản thứ hai', () => {
  const a = fresh();
  const mail = a.register('An', 'an@example.com', 'matkhaudai');
  const goog = a.upsertGoogle('sub-1', 'an@example.com', 'An', null);
  assert.equal(goog.user.id, mail.user.id);
  // Và từ đó đăng nhập đường nào cũng ra đúng một người.
  assert.equal(a.login('an@example.com', 'matkhaudai').user.id, mail.user.id);
});

test('đăng xuất thì token cũ hết tác dụng, phiên khác không ảnh hưởng', () => {
  const a = fresh();
  const s1 = a.register('An', 'an@example.com', 'matkhaudai');
  const s2 = a.login('an@example.com', 'matkhaudai');
  a.logout(s1.token);
  assert.equal(a.bearer(s1.token), null);
  assert.ok(a.bearer(s2.token), 'đăng xuất một máy không đá các máy còn lại');
});

test('hai người cùng gửi lời mời thì thành bạn luôn, không treo hai lời mời', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  assert.equal(a.requestFriend(x.id, y.id), 'pending');
  assert.equal(a.requestFriend(y.id, x.id), 'accepted');
  assert.ok(a.areFriends(x.id, y.id));
});

test('chỉ người nhận mới nhận được lời mời, và lời mời hiện đúng chiều', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  a.requestFriend(x.id, y.id);

  fails(() => a.acceptFriend(x.id, y.id), 'NO_REQUEST');
  assert.equal(a.friends(x.id)[0]!.incoming, false, 'bên gửi thấy là lời mời đi');
  assert.equal(a.friends(y.id)[0]!.incoming, true, 'bên nhận thấy là lời mời đến');

  a.acceptFriend(y.id, x.id);
  assert.ok(a.areFriends(x.id, y.id));
});

test('chặn thì cắt luôn quan hệ bạn và không gửi mời lại được', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  a.requestFriend(x.id, y.id);
  a.acceptFriend(y.id, x.id);

  a.block(x.id, y.id);
  assert.equal(a.areFriends(x.id, y.id), false, 'chặn mà vẫn còn là bạn thì chặn vô nghĩa');
  assert.equal(a.friends(y.id).length, 0, 'bên bị chặn cũng mất khỏi danh sách');

  // Chặn một chiều nhưng **cả hai** đều không gửi mời được nữa.
  fails(() => a.requestFriend(y.id, x.id), 'BLOCKED');
  fails(() => a.requestFriend(x.id, y.id), 'BLOCKED');

  a.unblock(x.id, y.id);
  assert.equal(a.requestFriend(y.id, x.id), 'pending', 'bỏ chặn thì kết bạn lại được');
});

test('không tự kết bạn hay tự chặn mình', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  fails(() => a.requestFriend(x.id, x.id), 'SELF');
  fails(() => a.block(x.id, x.id), 'SELF');
});

test('tìm người chơi theo tên, không trả về chính mình', () => {
  const a = fresh();
  const x = a.register('An Nguyễn', 'an@example.com', 'matkhaudai').user;
  a.register('An Trần', 'an2@example.com', 'matkhaudai');
  a.register('Bình', 'binh@example.com', 'matkhaudai');
  const found = a.search('An', x.id);
  assert.equal(found.length, 1);
  assert.equal(found[0]!.name, 'An Trần');
  assert.equal(a.search('A', x.id).length, 0, 'một ký tự thì không tìm, tránh quét cả bảng');
});

test('thành tích cộng dồn theo từng bộ môn', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  a.recordResult(x.id, 'co-caro', 'win');
  a.recordResult(x.id, 'co-caro', 'win');
  a.recordResult(x.id, 'co-caro', 'loss');
  a.recordResult(x.id, 'co-ganh', 'draw');
  assert.deepEqual(a.stats(x.id), [
    { gameId: 'co-caro', win: 2, draw: 0, loss: 1 },
    { gameId: 'co-ganh', win: 0, draw: 1, loss: 0 },
  ]);
});

test('xoá tài khoản kéo theo phiên, bạn bè và thành tích', () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  a.requestFriend(x.id, y.id);
  a.recordResult(x.id, 'co-caro', 'win');

  db.prepare('DELETE FROM users WHERE id = ?').run(x.id);
  // Khoá ngoại ở SQLite **mặc định tắt**; nếu quên bật PRAGMA thì mấy hàng
  // dưới đây vẫn còn và trỏ tới một người không tồn tại.
  assert.equal(a.friends(y.id).length, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM stats').get() as unknown as { n: number }).n, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as unknown as { n: number }).n, 1);
});
