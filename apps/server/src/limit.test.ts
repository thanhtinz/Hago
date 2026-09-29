import assert from 'node:assert/strict';
import test from 'node:test';
import { Limiter, MAX_WINDOW, RULES } from './limit.js';

/** Đồng hồ giả: tua giờ trong một phần nghìn giây thay vì ngồi chờ thật. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, tick: (ms: number) => (t += ms) };
}

test('quá hạn mức thì bị chặn, và được nói phải chờ bao lâu', () => {
  const c = clock();
  const l = new Limiter(c.now);
  const rule = { max: 3, windowMs: 1000 };
  assert.equal(l.take('a', rule), 0);
  assert.equal(l.take('a', rule), 0);
  assert.equal(l.take('a', rule), 0);
  const wait = l.take('a', rule);
  assert.ok(wait > 0 && wait <= 1000, `phải nói thời gian chờ, nhận ${wait}`);
  // Khoá khác không liên quan.
  assert.equal(l.take('b', rule), 0);
});

test('cửa sổ trượt, không phải đếm lại theo mốc', () => {
  const c = clock();
  const l = new Limiter(c.now);
  const rule = { max: 2, windowMs: 1000 };
  l.take('a', rule);
  c.tick(600);
  l.take('a', rule);
  assert.ok(l.take('a', rule) > 0, 'hai lần trong một giây là đủ');
  // Sau khi lần đầu trôi ra khỏi cửa sổ thì có thêm một suất, chứ không
  // phải cả hai suất cùng lúc — đó mới là "trượt".
  c.tick(500);
  assert.equal(l.take('a', rule), 0);
  assert.ok(l.take('a', rule) > 0);
});

test('thành công thì xoá dấu, và khoá hết hạn được dọn', () => {
  const c = clock();
  const l = new Limiter(c.now);
  const rule = { max: 1, windowMs: 1000 };
  l.take('a', rule);
  assert.ok(l.take('a', rule) > 0);
  l.clear('a');
  assert.equal(l.take('a', rule), 0, 'gõ đúng rồi thì không bị tính tiếp');

  l.take('b', rule);
  assert.equal(l.size(), 2);
  c.tick(2000);
  l.sweep(1000);
  assert.equal(l.size(), 0, 'khoá hết hạn không được nằm lại mãi');
});

test('hạn mức thật đủ rộng cho người dùng thật', () => {
  // Gõ sai mật khẩu vài lần là chuyện thường; ba lần mà đã khoá là app hỏng.
  assert.ok(RULES.login.max >= 5);
  // Nhưng không được rộng tới mức dò được: 10 lần mỗi 5 phút là 2880 lần
  // mỗi ngày, quá ít để dò một mật khẩu tám ký tự.
  assert.ok(RULES.login.max <= 20);
  assert.equal(MAX_WINDOW, RULES.register.windowMs);
});
