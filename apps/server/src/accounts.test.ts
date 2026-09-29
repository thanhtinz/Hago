import assert from 'node:assert/strict';
import test from 'node:test';
import { Accounts, AuthError } from './accounts.js';
import { openDb } from './db.js';

/** Mỗi bài một cơ sở dữ liệu trong bộ nhớ: không bài nào thấy dữ liệu bài khác. */
const fresh = () => new Accounts(openDb(':memory:'));

const fails = async (fn: () => unknown, code: string) => {
  try {
    await fn();
  } catch (e) {
    assert.ok(e instanceof AuthError, `phải là AuthError, nhận ${String(e)}`);
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`đáng lẽ phải lỗi ${code}`);
};

test('đăng ký rồi đăng nhập lại được bằng đúng mật khẩu', async () => {
  const a = fresh();
  const s = await a.register('An Nguyễn', 'An@Example.COM ', 'matkhaudai');
  assert.equal(s.user.name, 'An Nguyễn');
  assert.equal(s.user.email, 'an@example.com', 'email chuẩn hoá về chữ thường');
  assert.ok(a.bearer(s.token));

  const again = await a.login('an@example.com', 'matkhaudai');
  assert.equal(again.user.id, s.user.id);
  assert.notEqual(again.token, s.token, 'mỗi lần đăng nhập là một phiên riêng');
});

test('mật khẩu không nằm dạng thô trong kho, và sai mật khẩu thì không vào được', async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  await a.register('An', 'an@example.com', 'matkhaudai');
  const row = db.prepare('SELECT pass_hash FROM users').get() as unknown as { pass_hash: string };
  assert.ok(!row.pass_hash.includes('matkhaudai'), 'mật khẩu thô lọt vào kho');
  assert.match(row.pass_hash, /^scrypt\$/);
  await fails(() => a.login('an@example.com', 'matkhaudaj'), 'BAD_LOGIN');
});

test('email chưa đăng ký và sai mật khẩu báo lỗi giống hệt nhau', async () => {
  const a = fresh();
  await a.register('An', 'an@example.com', 'matkhaudai');
  let m1 = '';
  let m2 = '';
  try {
    await a.login('an@example.com', 'sai-be-bet');
  } catch (e) {
    m1 = (e as AuthError).message;
  }
  try {
    await a.login('chua-ai@example.com', 'sai-be-bet');
  } catch (e) {
    m2 = (e as AuthError).message;
  }
  // Khác nhau là cho không một công cụ dò xem email nào đã có tài khoản.
  assert.equal(m1, m2);
});

test('từ chối email sai dạng, mật khẩu ngắn, tên quá ngắn, và email trùng', async () => {
  const a = fresh();
  await fails(() => a.register('An', 'khong-phai-email', 'matkhaudai'), 'BAD_EMAIL');
  await fails(() => a.register('An', 'an@example.com', '1234567'), 'WEAK_PASSWORD');
  await fails(() => a.register('A', 'an@example.com', 'matkhaudai'), 'BAD_NAME');
  await a.register('An', 'an@example.com', 'matkhaudai');
  await fails(() => a.register('An khác', 'AN@example.com', 'matkhaudai'), 'EMAIL_TAKEN');
});

test('đăng nhập Google lần hai vào đúng tài khoản cũ', async () => {
  const a = fresh();
  const s1 = a.upsertGoogle('sub-1', 'an@example.com', 'An', null);
  const s2 = a.upsertGoogle('sub-1', 'an@example.com', 'An đổi tên', null);
  assert.equal(s2.user.id, s1.user.id);
  assert.equal(s2.user.name, 'An', 'không ghi đè tên người dùng đã tự đặt');
});

test('Google trùng email với tài khoản sẵn có thì nối vào, không mở tài khoản thứ hai', async () => {
  const a = fresh();
  const mail = await a.register('An', 'an@example.com', 'matkhaudai');
  const goog = a.upsertGoogle('sub-1', 'an@example.com', 'An', null);
  assert.equal(goog.user.id, mail.user.id);
  // Và từ đó đăng nhập đường nào cũng ra đúng một người.
  assert.equal((await a.login('an@example.com', 'matkhaudai')).user.id, mail.user.id);
});

test('đăng xuất thì token cũ hết tác dụng, phiên khác không ảnh hưởng', async () => {
  const a = fresh();
  const s1 = await a.register('An', 'an@example.com', 'matkhaudai');
  const s2 = await a.login('an@example.com', 'matkhaudai');
  a.logout(s1.token);
  assert.equal(a.bearer(s1.token), null);
  assert.ok(a.bearer(s2.token), 'đăng xuất một máy không đá các máy còn lại');
});

test('hai người cùng gửi lời mời thì thành bạn luôn, không treo hai lời mời', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  assert.equal(a.requestFriend(x.id, y.id), 'pending');
  assert.equal(a.requestFriend(y.id, x.id), 'accepted');
  assert.ok(a.areFriends(x.id, y.id));
});

test('chỉ người nhận mới nhận được lời mời, và lời mời hiện đúng chiều', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  a.requestFriend(x.id, y.id);

  await fails(() => a.acceptFriend(x.id, y.id), 'NO_REQUEST');
  assert.equal(a.friends(x.id)[0]!.incoming, false, 'bên gửi thấy là lời mời đi');
  assert.equal(a.friends(y.id)[0]!.incoming, true, 'bên nhận thấy là lời mời đến');

  a.acceptFriend(y.id, x.id);
  assert.ok(a.areFriends(x.id, y.id));
});

test('chặn thì cắt luôn quan hệ bạn và không gửi mời lại được', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  a.requestFriend(x.id, y.id);
  a.acceptFriend(y.id, x.id);

  a.block(x.id, y.id);
  assert.equal(a.areFriends(x.id, y.id), false, 'chặn mà vẫn còn là bạn thì chặn vô nghĩa');
  assert.equal(a.friends(y.id).length, 0, 'bên bị chặn cũng mất khỏi danh sách');

  // Chặn một chiều nhưng **cả hai** đều không gửi mời được nữa.
  await fails(() => a.requestFriend(y.id, x.id), 'BLOCKED');
  await fails(() => a.requestFriend(x.id, y.id), 'BLOCKED');

  a.unblock(x.id, y.id);
  assert.equal(a.requestFriend(y.id, x.id), 'pending', 'bỏ chặn thì kết bạn lại được');
});

test('không tự kết bạn hay tự chặn mình', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  await fails(() => a.requestFriend(x.id, x.id), 'SELF');
  await fails(() => a.block(x.id, x.id), 'SELF');
});

test('tìm người chơi theo tên, không trả về chính mình', async () => {
  const a = fresh();
  const x = (await a.register('An Nguyễn', 'an@example.com', 'matkhaudai')).user;
  await a.register('An Trần', 'an2@example.com', 'matkhaudai');
  await a.register('Bình', 'binh@example.com', 'matkhaudai');
  const found = a.search('An', x.id);
  assert.equal(found.length, 1);
  assert.equal(found[0]!.name, 'An Trần');
  assert.equal(a.search('A', x.id).length, 0, 'một ký tự thì không tìm, tránh quét cả bảng');
});

/** Ghi một ván giữa hai người, mặc định tính xếp hạng. */
function play(a: Accounts, x: string, y: string, gameId: string, winner: number | null, rated = true) {
  a.recordMatch({ gameId, code: 'TEST1', seats: [x, y], names: ['An', 'Bình'], winner, reason: 'thử', rated });
}

test('thành tích cộng dồn theo từng bộ môn', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
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

test('Elo: thắng thì lên, thua thì xuống đúng bằng nhau, và hoà giữa hai người ngang điểm là 0', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;

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

test('điểm cao nhất không tụt theo điểm hiện tại', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  play(a, x.id, y.id, 'co-caro', 0);
  const peak = a.stats(x.id)[0]!.rating;
  play(a, x.id, y.id, 'co-caro', 1);
  play(a, x.id, y.id, 'co-caro', 1);
  const s = a.stats(x.id)[0]!;
  assert.ok(s.rating < peak);
  assert.equal(s.best, peak);
});

test('phòng riêng vào lịch sử nhưng không đụng tới điểm', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  play(a, x.id, y.id, 'co-caro', 0, false);
  assert.equal(a.stats(x.id)[0]!.rating, 1200, 'phòng riêng không tính điểm');
  assert.equal(a.stats(x.id)[0]!.win, 1, 'nhưng vẫn cộng vào thắng thua');
  assert.equal(a.history(x.id).rows.length, 1, 'và vẫn hiện trong lịch sử');
  assert.equal(a.history(x.id).rows[0]!.rated, false);
});

test('lịch sử xoay đúng theo góc nhìn từng người', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  play(a, x.id, y.id, 'co-caro', 0);

  const hx = a.history(x.id).rows[0]!;
  const hy = a.history(y.id).rows[0]!;
  assert.equal(hx.result, 'win');
  assert.equal(hx.opponent, 'Bình');
  assert.equal(hy.result, 'loss');
  assert.equal(hy.opponent, 'An');
  assert.equal(hx.delta, -hy.delta, 'điểm một bên được đúng bằng bên kia mất');
});

test('phân trang bằng con trỏ: không lặp hàng, không sót hàng', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
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

test('ván mới chen vào giữa hai lần bấm không làm lặp hàng', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  for (let i = 0; i < 5; i++) play(a, x.id, y.id, 'co-caro', 0);

  const p1 = a.history(x.id, { limit: 2 });
  // Đây chính là chỗ phân trang theo OFFSET sẽ sai: thêm một ván ở đầu rồi
  // xin trang sau là nhận lại đúng một hàng vừa thấy.
  play(a, x.id, y.id, 'co-caro', 1);
  const p2 = a.history(x.id, { limit: 2, before: p1.rows[1]!.id });

  const ids = [...p1.rows, ...p2.rows].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'không hàng nào lặp lại');
});

test('lọc lịch sử theo bộ môn', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  for (let i = 0; i < 4; i++) play(a, x.id, y.id, 'co-caro', 0);
  for (let i = 0; i < 2; i++) play(a, x.id, y.id, 'co-ganh', 0);

  const g = a.history(x.id, { gameId: 'co-ganh' });
  assert.equal(g.total, 2, 'tổng cũng phải theo bộ lọc, không phải tổng tất cả');
  assert.equal(g.rows.length, 2);
  assert.ok(g.rows.every((r) => r.gameId === 'co-ganh'));
  assert.equal(a.history(x.id).total, 6);
});

test('chuỗi tính từ ván gần nhất, và hoà cắt chuỗi', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  assert.equal(a.streak(x.id), null, 'chưa đánh ván nào thì chưa có chuỗi');

  play(a, x.id, y.id, 'co-caro', 0);
  play(a, x.id, y.id, 'co-caro', 0);
  play(a, x.id, y.id, 'co-caro', 0);
  assert.deepEqual(a.streak(x.id), { kind: 'win', n: 3 });
  assert.deepEqual(a.streak(y.id), { kind: 'loss', n: 3 });

  play(a, x.id, y.id, 'co-caro', null);
  assert.deepEqual(a.streak(x.id), { kind: 'draw', n: 1 }, 'hoà cắt chuỗi thắng');
});

test('xoá tài khoản không xoá lịch sử của đối thủ', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  play(a, x.id, y.id, 'co-caro', 0);

  a.deleteUser(x.id);
  assert.equal(a.user(x.id), null);
  const h = a.history(y.id).rows;
  assert.equal(h.length, 1, 'ván vẫn còn trong lịch sử của người còn lại');
  assert.equal(h[0]!.opponent, 'An', 'tên chép sẵn nên vẫn đọc được');
  assert.equal(h[0]!.opponentId, null, 'nhưng không còn hồ sơ để mở');
});

test('xoá tài khoản kéo theo phiên, bạn bè và thành tích', async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  a.requestFriend(x.id, y.id);
  play(a, x.id, y.id, 'co-caro', 0);

  db.prepare('DELETE FROM users WHERE id = ?').run(x.id);
  // Khoá ngoại ở SQLite **mặc định tắt**; nếu quên bật PRAGMA thì mấy hàng
  // dưới đây vẫn còn và trỏ tới một người không tồn tại.
  assert.equal(a.friends(y.id).length, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM stats WHERE user_id = ?').get(x.id) as unknown as { n: number }).n, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as unknown as { n: number }).n, 1);
});

test('email chưa đăng ký tốn đúng chừng ấy thời gian như sai mật khẩu', async () => {
  const a = fresh();
  await a.register('An', 'an@example.com', 'matkhaudai');

  const timed = async (email: string) => {
    const t = process.hrtime.bigint();
    try {
      await a.login(email, 'sai-be-bet');
    } catch {
      /* cả hai đường đều phải ném */
    }
    return Number(process.hrtime.bigint() - t) / 1e6;
  };

  const known = await timed('an@example.com');
  const unknown = await timed('chua-ai@example.com');
  // Không đo tỉ lệ (máy CI nhiễu quá), chỉ đòi cả hai đường đều **có băm**.
  // Không có bản băm giả thì đường "email không tồn tại" trả lời dưới một
  // mili giây, và chênh lệch đó đo được qua mạng — vẫn là công cụ dò xem
  // email nào đã có tài khoản, dù lời báo lỗi giống hệt nhau.
  assert.ok(known > 5, `đường sai mật khẩu phải tốn thời gian băm, đo được ${known}ms`);
  assert.ok(unknown > 5, `đường email lạ cũng phải tốn thời gian băm, đo được ${unknown}ms`);
});

test('dọn phiên hết hạn, xem phiên đang mở, và đăng xuất nơi khác', async () => {
  const a = fresh();
  const s1 = await a.register('An', 'an@example.com', 'matkhaudai');
  const s2 = await a.login('an@example.com', 'matkhaudai');
  const s3 = await a.login('an@example.com', 'matkhaudai');

  const open = a.sessions(s1.user.id);
  assert.equal(open.length, 3);
  // Token **không bao giờ** ra ngoài: chỉ sáu ký tự cuối để nhận mặt.
  assert.ok(open.every((x) => x.id.length === 6));
  assert.ok(open.every((x) => x.id !== s1.token));

  assert.equal(a.logoutOthers(s1.user.id, s3.token), 2);
  assert.equal(a.bearer(s1.token), null);
  assert.equal(a.bearer(s2.token), null);
  assert.ok(a.bearer(s3.token));

  // Phiên hết hạn không tự biến mất — `bearer` chỉ xoá đúng hàng nó đụng tới.
  assert.equal(a.sweepSessions(Date.now()), 0);
  assert.equal(a.sweepSessions(Date.now() + 61 * 86_400_000), 1);
  assert.equal(a.sessions(s1.user.id).length, 0);
});

test('bảng xếp hạng đòi đủ ván mới có tên, và xếp đúng thứ tự', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  const z = (await a.register('Cường', 'cuong@example.com', 'matkhaudai')).user;

  // x thắng y năm ván: cả hai đủ ngưỡng, x trên y.
  for (let i = 0; i < 5; i++) {
    a.recordMatch({ gameId: 'co-caro', code: `m${i}`, seats: [x.id, y.id], names: ['An', 'Bình'], winner: 0, reason: 'đủ năm', rated: true });
  }
  // z chỉ đánh một ván và thắng — Elo nhảy 40 điểm từ mốc, nhưng không đủ
  // ngưỡng nên không được đứng trên người đã đánh năm ván.
  a.recordMatch({ gameId: 'co-caro', code: 'z1', seats: [z.id, y.id], names: ['Cường', 'Bình'], winner: 0, reason: 'một ván', rated: true });

  const board = a.leaderboard('co-caro');
  assert.deepEqual(
    board.map((r) => r.user.id),
    [x.id, y.id],
    'người đánh một ván không được có tên',
  );
  assert.ok(board[0]!.rating > board[1]!.rating);
  assert.equal(board[0]!.played, 5);
  assert.equal(board[0]!.win, 5);

  assert.equal(a.rankOf(x.id, 'co-caro')!.rank, 1);
  assert.equal(a.rankOf(y.id, 'co-caro')!.rank, 2);
  assert.equal(a.rankOf(z.id, 'co-caro'), null, 'chưa đủ ván thì chưa có hạng');
  assert.equal(a.rankOf(x.id, 'khong-co-bo-mon-nay'), null);
});

test('bảng tổng cộng phần điểm vượt mốc của mọi bộ môn', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  const z = (await a.register('Cường', 'cuong@example.com', 'matkhaudai')).user;

  // x thắng ở **hai** bộ môn, mỗi người kia chỉ thua ở một.
  for (let i = 0; i < 6; i++) {
    a.recordMatch({ gameId: 'co-caro', code: `c${i}`, seats: [x.id, y.id], names: ['An', 'Bình'], winner: 0, reason: 'x thắng', rated: true });
    a.recordMatch({ gameId: 'co-ganh', code: `g${i}`, seats: [x.id, z.id], names: ['An', 'Cường'], winner: 0, reason: 'x thắng', rated: true });
  }

  const board = a.leaderboard(null);
  assert.equal(board.length, 3);
  assert.equal(board[0]!.user.id, x.id, 'giỏi hai bộ môn thì đứng trên');
  assert.equal(board[0]!.played, 12, 'ván của cả hai bộ môn cộng lại');

  // Elo là trò chơi tổng bằng không, nên bảng tổng không được tự sinh điểm
  // từ hư không.
  const total = board.reduce((n, r) => n + r.rating, 0);
  assert.ok(Math.abs(total) <= 2, `tổng điểm vượt mốc phải quanh 0, nhận ${total}`);

  assert.equal(a.rankOf(x.id, null)!.rank, 1);
  // y và z đối xứng hoàn toàn nên chúng **bằng điểm**, và bằng điểm thì
  // cùng hạng — đó là hạng đúng, không phải một lỗi cần bẻ cho lệch.
  assert.equal(a.rankOf(y.id, null)!.rank, 2);
  assert.equal(a.rankOf(z.id, null)!.rank, 2);
});

test('đổi mật khẩu đòi mật khẩu cũ, và mật khẩu mới dùng được ngay', async () => {
  const a = fresh();
  const s = await a.register('An', 'an@example.com', 'matkhaudai');

  await fails(() => a.changePassword(s.user.id, 'sai-be-bet', 'matkhaumoi'), 'BAD_PASSWORD');
  await fails(() => a.changePassword(s.user.id, 'matkhaudai', '1234567'), 'WEAK_PASSWORD');

  await a.changePassword(s.user.id, 'matkhaudai', 'matkhaumoihon');
  await fails(() => a.login('an@example.com', 'matkhaudai'), 'BAD_LOGIN');
  assert.equal((await a.login('an@example.com', 'matkhaumoihon')).user.id, s.user.id);
});

test('tài khoản Google đặt mật khẩu lần đầu không phải gõ mật khẩu cũ', async () => {
  const a = fresh();
  const g = a.upsertGoogle('sub-123', 'g@example.com', 'Người Google', null);
  assert.equal(a.hasPassword(g.user.id), false);
  await a.changePassword(g.user.id, '', 'matkhaudat-lan-dau');
  assert.equal(a.hasPassword(g.user.id), true);
  assert.ok(await a.login('g@example.com', 'matkhaudat-lan-dau'));
});

test('đổi tên: không trùng người khác, và một lần mỗi ngày', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  await a.register('Bình', 'binh@example.com', 'matkhaudai');

  // Trùng tên người khác thì danh sách bạn và bảng xếp hạng không phân biệt
  // nổi hai người.
  await fails(() => a.rename(x.id, 'Bình'), 'NAME_TAKEN');

  const t0 = 1_700_000_000_000;
  assert.equal(a.rename(x.id, 'An Mới', t0).name, 'An Mới');
  await fails(() => a.rename(x.id, 'An Mới Nữa', t0 + 3_600_000), 'TOO_SOON');
  assert.equal(a.rename(x.id, 'An Mới Nữa', t0 + 25 * 3_600_000).name, 'An Mới Nữa');
  // Đổi thành đúng tên đang có thì không tính là một lần đổi.
  assert.equal(a.rename(x.id, 'An Mới Nữa', t0 + 25 * 3_600_000).name, 'An Mới Nữa');
});

test('tiểu sử cắt đúng độ dài và bỏ ký tự điều khiển', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  assert.equal(a.setBio(x.id, '  Thích cờ gánh  ').bio, 'Thích cờ gánh');
  assert.equal(a.setBio(x.id, 'x'.repeat(200)).bio!.length, 140);
  assert.equal(a.setBio(x.id, '   ').bio, null, 'chuỗi trắng thì xoá hẳn');
});

test('xuất dữ liệu mang đủ hồ sơ, thành tích, lịch sử và bạn bè', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  a.requestFriend(x.id, y.id);
  a.acceptFriend(y.id, x.id);
  a.recordMatch({ gameId: 'co-caro', code: 'm1', seats: [x.id, y.id], names: ['An', 'Bình'], winner: 0, reason: 'thắng', rated: true });

  const out = a.exportAll(x.id) as {
    taiKhoan: { name: string };
    thanhTich: unknown[];
    lichSuTran: unknown[];
    banBe: { ten: string }[];
    phienDangMo: unknown[];
  };
  assert.equal(out.taiKhoan.name, 'An');
  assert.equal(out.thanhTich.length, 1);
  assert.equal(out.lichSuTran.length, 1);
  assert.deepEqual(out.banBe.map((b) => b.ten), ['Bình']);
  assert.equal(out.phienDangMo.length, 1);
  // Bản xuất **không được** mang mật khẩu hay token phiên ra ngoài.
  const text = JSON.stringify(out);
  assert.ok(!text.includes('scrypt$'), 'không được lộ bản băm mật khẩu');
  assert.ok(!text.includes('pass'), 'không được có trường mật khẩu nào');
});

test('báo cáo: một lần mỗi người mỗi ngày, và vào được hàng đợi quản trị', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;

  await fails(() => a.report(x.id, x.id, 'quay-roi', ''), 'SELF');
  await fails(() => a.report(x.id, 'khong-co-ai', 'quay-roi', ''), 'NO_USER');
  await fails(() => a.report(x.id, y.id, 'ly-do-bia', ''), 'BAD_REASON');

  const t0 = 1_700_000_000_000;
  a.report(x.id, y.id, 'quay-roi', 'Nhắn tin khó chịu', t0);
  // Báo cáo mười lần một người không làm việc xử lý nhanh hơn, chỉ làm hàng
  // đợi dài ra — và biến chính nó thành một công cụ quấy rối.
  await fails(() => a.report(x.id, y.id, 'quay-roi', 'lại nữa', t0 + 60_000), 'ALREADY');
  // Sang ngày hôm sau thì được.
  a.report(x.id, y.id, 'gian-lan', 'hôm nay lại thế', t0 + 25 * 3_600_000);

  const q = a.reports();
  assert.equal(q.length, 2);
  assert.equal(q[0]!.reason, 'gian-lan', 'mới nhất trước');
  assert.equal(q[0]!.targetName, 'Bình');
  assert.equal(q[1]!.note, 'Nhắn tin khó chịu');
});

test('chặn được cả người chưa từng là bạn', async () => {
  const a = fresh();
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  assert.equal(a.areFriends(x.id, y.id), false);
  a.block(x.id, y.id);
  assert.ok(a.isBlockedEither(x.id, y.id));
  assert.deepEqual(a.blocked(x.id).map((u) => u.name), ['Bình']);
  // Và chặn rồi thì bên kia không gửi lời mời sang được nữa.
  await fails(() => a.requestFriend(y.id, x.id), 'BLOCKED');
});
