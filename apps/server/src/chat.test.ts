import assert from 'node:assert/strict';
import test from 'node:test';
import { Accounts } from './accounts.js';
import { Chat, MAX_BODY, SYSTEM, dm, dmPair, systemFor } from './chat.js';
import { openDb } from './db.js';

const fresh = async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const x = (await a.register('An', 'an@example.com', 'matkhaudai')).user;
  const y = (await a.register('Bình', 'binh@example.com', 'matkhaudai')).user;
  return { chat: new Chat(db), a, x, y };
};

test('kênh riêng của hai người là một, dù ai nhắn trước', async () => {
  const { x, y } = await fresh();
  // Ghép theo thứ tự người gửi thì A nhắn vào `A|B` còn B nhắn vào `B|A`, và
  // hai người ngồi nhìn hai cuộc trò chuyện khác nhau.
  assert.equal(dm(x.id, y.id), dm(y.id, x.id));
  assert.deepEqual(dmPair(dm(x.id, y.id))!.sort(), [x.id, y.id].sort());
  assert.equal(dmPair('chung'), null);
});

test('gọn tin: bỏ ký tự điều khiển, gộp dòng trống, cắt quá dài', async () => {
  assert.equal(Chat.clean('  chào bạn \u0007 '), 'chào bạn');
  assert.equal(Chat.clean('a\n\n\n\n\nb'), 'a\n\nb');
  assert.equal(Chat.clean('x'.repeat(MAX_BODY + 50)).length, MAX_BODY, 'cắt chứ không từ chối');
  assert.equal(Chat.clean('   '), '');
});

test('lịch sử trả về cũ nhất trước, và phân trang lùi bằng con trỏ', async () => {
  const { chat, x, y } = await fresh();
  const c = dm(x.id, y.id);
  for (let i = 1; i <= 7; i++) chat.post(c, x.id, 'An', `tin ${i}`);

  const p1 = chat.page(c, { limit: 3 });
  assert.deepEqual(p1.rows.map((m) => m.body), ['tin 5', 'tin 6', 'tin 7'], 'trang đầu là ba tin MỚI nhất, xếp xuôi');
  assert.equal(p1.more, true);

  const p2 = chat.page(c, { limit: 3, before: p1.rows[0]!.id });
  assert.deepEqual(p2.rows.map((m) => m.body), ['tin 2', 'tin 3', 'tin 4']);
  const p3 = chat.page(c, { limit: 3, before: p2.rows[0]!.id });
  assert.deepEqual(p3.rows.map((m) => m.body), ['tin 1']);
  assert.equal(p3.more, false);
});

test('chưa đọc: không tính tin của chính mình, và đọc rồi thì về không', async () => {
  const { chat, x, y } = await fresh();
  const c = dm(x.id, y.id);
  const m1 = chat.post(c, y.id, 'Bình', 'chào');
  chat.post(c, y.id, 'Bình', 'đánh không');

  assert.equal(chat.unread(x.id, c), 2);
  assert.equal(chat.unread(y.id, c), 0, 'tin của chính mình không tính là chưa đọc');
  chat.markRead(x.id, c, m1.id);
  assert.equal(chat.unread(x.id, c), 1, 'mới đọc tới tin đầu');
});

test('gửi một tin là đã đọc cả kênh', async () => {
  const { chat, x, y } = await fresh();
  const c = dm(x.id, y.id);
  chat.post(c, y.id, 'Bình', 'chào');
  chat.post(c, y.id, 'Bình', 'đánh không');
  assert.equal(chat.unread(x.id, c), 2);

  // Trả lời xong mà vẫn còn chấm đỏ trên chính cuộc trò chuyện mình vừa gõ
  // vào là thứ người dùng thấy sai ngay lập tức.
  chat.post(c, x.id, 'An', 'ừ, mai nhé');
  assert.equal(chat.unread(x.id, c), 0);
  assert.equal(chat.unread(y.id, c), 1, 'còn bên kia thì có một tin mới thật');
});

test('mốc đã đọc không lùi về sau', async () => {
  const { chat, x, y } = await fresh();
  const c = dm(x.id, y.id);
  const m1 = chat.post(c, y.id, 'Bình', 'một');
  const m2 = chat.post(c, y.id, 'Bình', 'hai');
  chat.markRead(x.id, c, m2.id);
  // Tin cũ tới muộn không được làm hai tin đã đọc thành chưa đọc lại.
  chat.markRead(x.id, c, m1.id);
  assert.equal(chat.unread(x.id, c), 0);
});

test('chưa đọc gom theo từng người trong một câu truy vấn', async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const chat = new Chat(db);
  const me = (await (a.register('Tôi', 'toi@example.com', 'matkhaudai'))).user;
  const b = (await (a.register('Bình', 'binh@example.com', 'matkhaudai'))).user;
  const c = (await (a.register('Cường', 'cuong@example.com', 'matkhaudai'))).user;

  chat.post(dm(me.id, b.id), b.id, 'Bình', 'ê');
  chat.post(dm(me.id, b.id), b.id, 'Bình', 'ê ê');
  chat.post(dm(me.id, c.id), c.id, 'Cường', 'chào');
  chat.post(dm(b.id, c.id), b.id, 'Bình', 'không liên quan tới tôi');

  const u = chat.unreadDms(me.id);
  assert.deepEqual(u, { [b.id]: 2, [c.id]: 1 });
  assert.equal(Object.keys(chat.unreadDms(me.id)).includes(me.id), false);
});

test('thông báo hệ thống không có người gửi và hiện tên Hệ thống', async () => {
  const { chat } = await fresh();
  const m = chat.post('he-thong', null, 'Hệ thống', 'Máy chủ bảo trì lúc 2 giờ sáng');
  assert.equal(m.fromId, null);
  assert.equal(chat.page('he-thong').rows[0]!.fromName, 'Hệ thống');
});

test('xoá tài khoản: tin còn lại nhưng không còn trỏ về ai', async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const chat = new Chat(db);
  const x = (await (a.register('An', 'an@example.com', 'matkhaudai'))).user;
  const y = (await (a.register('Bình', 'binh@example.com', 'matkhaudai'))).user;
  const c = dm(x.id, y.id);
  chat.post(c, x.id, 'An', 'chào');

  a.deleteUser(x.id);
  const rows = chat.page(c).rows;
  assert.equal(rows.length, 1, 'cuộc trò chuyện của người còn lại không bị thủng');
  assert.equal(rows[0]!.body, 'chào');
});

test('danh sách cuộc trò chuyện mang tên NGƯỜI KIA, không phải người gửi tin cuối', async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const chat = new Chat(db);
  const me = (await (a.register('Tôi', 'toi@example.com', 'matkhaudai'))).user;
  const b = (await (a.register('Bình', 'binh@example.com', 'matkhaudai'))).user;
  const c = (await (a.register('Cường', 'cuong@example.com', 'matkhaudai'))).user;

  chat.post(dm(me.id, b.id), b.id, 'Bình', 'ê');
  chat.post(dm(me.id, c.id), c.id, 'Cường', 'chào');
  // Tin cuối của cuộc với Bình là tin của CHÍNH MÌNH.
  chat.post(dm(me.id, b.id), me.id, 'Tôi', 'ừ sao');

  const rows = chat.conversations(me.id);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.withName, 'Bình', 'hàng mang tên người kia, không phải tên mình');
  assert.equal(rows[0]!.last.body, 'ừ sao');
  assert.equal(rows[0]!.unread, 0, 'tin cuối là của mình nên không có gì chưa đọc');
  assert.equal(rows[1]!.withName, 'Cường');
  assert.equal(rows[1]!.unread, 1);
});

test('thông báo hệ thống: chung và riêng gộp thành một dòng thời gian', async () => {
  const db = openDb(':memory:');
  const a = new Accounts(db);
  const chat = new Chat(db);
  const x = (await (a.register('An', 'an@example.com', 'matkhaudai'))).user;
  const y = (await (a.register('Bình', 'binh@example.com', 'matkhaudai'))).user;

  chat.post(SYSTEM, null, 'Hệ thống', 'Bảo trì lúc 2 giờ');
  chat.post(systemFor(x.id), null, 'Hệ thống', 'Tài khoản của bạn vừa đổi tên', x.id);

  const feed = chat.systemFeed(x.id);
  assert.deepEqual(feed.map((m) => m.body), ['Bảo trì lúc 2 giờ', 'Tài khoản của bạn vừa đổi tên']);
  assert.equal(chat.unreadSystem(x.id), 2);

  // Bình chỉ thấy thông báo chung, không thấy thông báo riêng của An.
  const other = chat.systemFeed(y.id);
  assert.deepEqual(other.map((m) => m.body), ['Bảo trì lúc 2 giờ']);
  assert.equal(chat.unreadSystem(y.id), 1);
});

test('thông báo hệ thống gộp kênh chung và kênh riêng, và đọc rồi thì tắt chấm đỏ', async () => {
  const { chat, x, y } = await fresh();
  chat.post(SYSTEM, null, 'Hệ thống', 'Máy chủ bảo trì lúc 2 giờ sáng');
  chat.post(systemFor(x.id), null, 'Hệ thống', 'Bạn vừa thắng một ván', x.id);
  chat.post(systemFor(y.id), null, 'Hệ thống', 'Riêng của Bình', y.id);

  const feed = chat.systemFeed(x.id);
  assert.deepEqual(
    feed.map((m) => m.body),
    ['Máy chủ bảo trì lúc 2 giờ sáng', 'Bạn vừa thắng một ván'],
    'thấy tin chung và tin riêng của mình, không thấy tin riêng của người khác',
  );
  assert.equal(chat.unreadSystem(x.id), 2);

  // Đánh dấu đã đọc phải đi **từng kênh một**, tới đúng id cuối của kênh đó.
  // Gửi chung một con số là đánh dấu nhầm kênh kia — đó chính là lý do chấm
  // đỏ trước đây không bao giờ tắt.
  for (const ch of ['he-thong', `he-thong:${x.id}`]) {
    const last = feed.filter((m) => m.channel === ch).reduce((n, m) => Math.max(n, m.id), 0);
    if (last) chat.markRead(x.id, ch, last);
  }
  assert.equal(chat.unreadSystem(x.id), 0);
  // Bình vẫn còn tin riêng chưa đọc của mình.
  assert.equal(chat.unreadSystem(y.id), 2);
});
