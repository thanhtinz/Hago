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

/** Ghi một ván giữa hai người, mặc định tính xếp hạng. */
function play(a: Accounts, x: string, y: string, gameId: string, winner: number | null, rated = true) {
  a.recordMatch({ gameId, code: 'TEST1', seats: [x, y], names: ['An', 'Bình'], winner, reason: 'thử', rated });
}

test('thành tích cộng dồn theo từng bộ môn', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  play(a, x.id, y.id, 'co-caro', 0);
  play(a, x.id, y.id, 'co-caro', 0);
  play(a, x.id, y.id, 'co-caro', 1);
  play(a, x.id, y.id, 'co-ganh', null);

  const s = a.stats(x.id);
  assert.equal(s.length, 2);
  assert.deepEqual(
    s.map((r) => [r.gameId, r.win, r.draw, r.loss]),
    [
      ['co-caro', 2, 0, 1],
      ['co-ganh', 0, 1, 0],
    ],
  );
  // Bộ môn chưa đánh ván nào thì **không** hiện ra, thay vì một hàng 0–0–0.
  assert.equal(a.stats(x.id).some((r) => r.gameId === 'co-vua'), false);
});

test('Elo: thắng thì lên, thua thì xuống đúng bằng nhau, và hoà giữa hai người ngang điểm là 0', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;

  play(a, x.id, y.id, 'co-caro', 0);
  const sx = a.stats(x.id)[0]!;
  const sy = a.stats(y.id)[0]!;
  assert.ok(sx.rating > 1200, 'người thắng phải lên điểm');
  assert.equal(sx.rating - 1200, 1200 - sy.rating, 'hai bên ngang điểm thì cộng và trừ bằng nhau');
  assert.equal(sx.best, sx.rating);

  const before = a.stats(x.id)[0]!.rating;
  play(a, x.id, y.id, 'co-ganh', null);
  assert.equal(a.stats(x.id).find((r) => r.gameId === 'co-ganh')!.rating, 1200, 'hoà ngang điểm thì không đổi');
  assert.equal(a.stats(x.id).find((r) => r.gameId === 'co-caro')!.rating, before, 'bộ môn khác không bị đụng');
});

test('điểm cao nhất không tụt theo điểm hiện tại', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  play(a, x.id, y.id, 'co-caro', 0);
  const peak = a.stats(x.id)[0]!.rating;
  play(a, x.id, y.id, 'co-caro', 1);
  play(a, x.id, y.id, 'co-caro', 1);
  const s = a.stats(x.id)[0]!;
  assert.ok(s.rating < peak);
  assert.equal(s.best, peak);
});

test('phòng riêng vào lịch sử nhưng không đụng tới điểm', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  play(a, x.id, y.id, 'co-caro', 0, false);
  assert.equal(a.stats(x.id)[0]!.rating, 1200, 'phòng riêng không tính điểm');
  assert.equal(a.stats(x.id)[0]!.win, 1, 'nhưng vẫn cộng vào thắng thua');
  assert.equal(a.history(x.id).rows.length, 1, 'và vẫn hiện trong lịch sử');
  assert.equal(a.history(x.id).rows[0]!.rated, false);
});

test('lịch sử xoay đúng theo góc nhìn từng người', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  play(a, x.id, y.id, 'co-caro', 0);

  const hx = a.history(x.id).rows[0]!;
  const hy = a.history(y.id).rows[0]!;
  assert.equal(hx.result, 'win');
  assert.equal(hx.opponent, 'Bình');
  assert.equal(hy.result, 'loss');
  assert.equal(hy.opponent, 'An');
  assert.equal(hx.delta, -hy.delta, 'điểm một bên được đúng bằng bên kia mất');
});

test('phân trang bằng con trỏ: không lặp hàng, không sót hàng', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  for (let i = 0; i < 7; i++) play(a, x.id, y.id, i < 4 ? 'co-caro' : 'co-ganh', i % 2);

  const p1 = a.history(x.id, { limit: 3 });
  assert.equal(p1.rows.length, 3);
  assert.equal(p1.more, true);
  assert.equal(p1.total, 7, 'tổng là tổng thật, không phải số hàng của trang');

  const p2 = a.history(x.id, { limit: 3, before: p1.rows[2]!.id });
  const p3 = a.history(x.id, { limit: 3, before: p2.rows[2]!.id });
  assert.equal(p3.rows.length, 1);
  assert.equal(p3.more, false, 'trang cuối phải biết là hết');

  const ids = [...p1.rows, ...p2.rows, ...p3.rows].map((r) => r.id);
  assert.equal(new Set(ids).size, 7, 'không hàng nào lặp lại giữa các trang');
  assert.deepEqual([...ids].sort((m, n) => n - m), ids, 'thứ tự mới nhất trước xuyên suốt các trang');
});

test('ván mới chen vào giữa hai lần bấm không làm lặp hàng', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  for (let i = 0; i < 5; i++) play(a, x.id, y.id, 'co-caro', 0);

  const p1 = a.history(x.id, { limit: 2 });
  // Đây chính là chỗ phân trang theo OFFSET sẽ sai: thêm một ván ở đầu rồi
  // xin trang sau là nhận lại đúng một hàng vừa thấy.
  play(a, x.id, y.id, 'co-caro', 1);
  const p2 = a.history(x.id, { limit: 2, before: p1.rows[1]!.id });

  const ids = [...p1.rows, ...p2.rows].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'không hàng nào lặp lại');
});

test('lọc lịch sử theo bộ môn', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  for (let i = 0; i < 4; i++) play(a, x.id, y.id, 'co-caro', 0);
  for (let i = 0; i < 2; i++) play(a, x.id, y.id, 'co-ganh', 0);

  const g = a.history(x.id, { gameId: 'co-ganh' });
  assert.equal(g.total, 2, 'tổng cũng phải theo bộ lọc, không phải tổng tất cả');
  assert.equal(g.rows.length, 2);
  assert.ok(g.rows.every((r) => r.gameId === 'co-ganh'));
  assert.equal(a.history(x.id).total, 6);
});

test('chuỗi tính từ ván gần nhất, và hoà cắt chuỗi', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  assert.equal(a.streak(x.id), null, 'chưa đánh ván nào thì chưa có chuỗi');

  play(a, x.id, y.id, 'co-caro', 0);
  play(a, x.id, y.id, 'co-caro', 0);
  play(a, x.id, y.id, 'co-caro', 0);
  assert.deepEqual(a.streak(x.id), { kind: 'win', n: 3 });
  assert.deepEqual(a.streak(y.id), { kind: 'loss', n: 3 });

  play(a, x.id, y.id, 'co-caro', null);
  assert.deepEqual(a.streak(x.id), { kind: 'draw', n: 1 }, 'hoà cắt chuỗi thắng');
});

test('xoá tài khoản không xoá lịch sử của đối thủ', () => {
  const a = fresh();
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  play(a, x.id, y.id, 'co-caro', 0);

  a.deleteUser(x.id);
  assert.equal(a.user(x.id), null);
  const h = a.history(y.id).rows;
  assert.equal(h.length, 1, 'ván vẫn còn trong lịch sử của người còn lại');
  assert.equal(h[0]!.opponent, 'An', 'tên chép sẵn nên vẫn đọc được');
  assert.equal(h[0]!.opponentId, null, 'nhưng không còn hồ sơ để mở');
});

test('xoá tài khoản kéo theo phiên, bạn bè và thành tích', () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const x = a.register('An', 'an@example.com', 'matkhaudai').user;
  const y = a.register('Bình', 'binh@example.com', 'matkhaudai').user;
  a.requestFriend(x.id, y.id);
  play(a, x.id, y.id, 'co-caro', 0);

  db.prepare('DELETE FROM users WHERE id = ?').run(x.id);
  // Khoá ngoại ở SQLite **mặc định tắt**; nếu quên bật PRAGMA thì mấy hàng
  // dưới đây vẫn còn và trỏ tới một người không tồn tại.
  assert.equal(a.friends(y.id).length, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM stats WHERE user_id = ?').get(x.id) as unknown as { n: number }).n, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as unknown as { n: number }).n, 1);
});
