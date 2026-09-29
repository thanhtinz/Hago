import assert from 'node:assert/strict';
import test from 'node:test';
import { parseClientMsg } from './parse.js';

/**
 * Cửa duy nhất dữ liệu ngoài đi vào máy chủ.
 *
 * Trước file `parse.ts`, mỗi dòng dưới đây là một cách **giết cả tiến
 * trình**: ngoại lệ trong handler `message` của `ws` thoát ra thành
 * `uncaughtException`, và vì mọi ván đang chạy chỉ sống trong bộ nhớ,
 * một khách đã đăng nhập xoá sạch ván của tất cả mọi người bằng một dòng.
 */
const KILLERS: unknown[] = [
  { t: 'join', code: 5 },
  { t: 'join' },
  { t: 'join', code: null },
  { t: 'watch', ids: 5 },
  { t: 'watch', ids: [1, 2, 3] },
  { t: 'watch', ids: [{}] },
  { t: 'chat-open', channel: 5 },
  { t: 'chat-send', channel: 'chung' },
  { t: 'chat-send', channel: 'chung', body: 12 },
  { t: 'chat-more', channel: 'chung', before: 'x' },
  { t: 'chat-read', channel: 'chung', lastId: null },
  { t: 'act', nonce: 1, action: {} },
  { t: 'act', nonce: 'n1' },
  { t: 'quick', gameId: [] },
  { t: 'create', gameId: 'co-caro', config: 'khong-phai-object' },
  { t: 'challenge', to: 5, gameId: 'co-caro' },
  { t: 'challenge-answer', id: 'c1', accept: 'co' },
  { t: 'rematch', want: 'co' },
  { t: 'hello', token: 12 },
  { t: 'khong-co-nuoc-nay' },
  {},
  null,
  5,
  'chuoi',
  [],
];

test('mọi gói tin dị dạng đều bị trả về null, không có cái nào ném', () => {
  for (const k of KILLERS) {
    assert.equal(parseClientMsg(k), null, `phải từ chối: ${JSON.stringify(k)}`);
  }
});

test('gói tin đúng dạng thì đi qua nguyên vẹn', () => {
  assert.deepEqual(parseClientMsg({ t: 'hello', token: 'abc' }), { t: 'hello', token: 'abc' });
  assert.deepEqual(parseClientMsg({ t: 'join', code: 'abcde' }), { t: 'join', code: 'abcde' });
  assert.deepEqual(parseClientMsg({ t: 'leave' }), { t: 'leave' });
  assert.deepEqual(parseClientMsg({ t: 'rematch', want: true }), { t: 'rematch', want: true });
  assert.deepEqual(parseClientMsg({ t: 'watch', ids: ['a', 'b'] }), { t: 'watch', ids: ['a', 'b'] });
  assert.deepEqual(parseClientMsg({ t: 'create', gameId: 'co-caro' }), { t: 'create', gameId: 'co-caro' });
  assert.deepEqual(parseClientMsg({ t: 'create', gameId: 'co-caro', config: { size: 15 } }), {
    t: 'create',
    gameId: 'co-caro',
    config: { size: 15 },
  });
  // `action` do engine quyết định hình dạng, nên nó đi qua nguyên si.
  assert.deepEqual(parseClientMsg({ t: 'act', nonce: 'n1', action: { t: 'game', a: { r: 1, c: 2 } } }), {
    t: 'act',
    nonce: 'n1',
    action: { t: 'game', a: { r: 1, c: 2 } },
  });
});

test('chuỗi và danh sách quá dài bị từ chối, không bị cắt ngắn', () => {
  // Cắt ngắn thì mã phòng "ABCDEFGH" thành "ABCDE" và người chơi vào nhầm
  // một phòng có thật của người khác.
  assert.equal(parseClientMsg({ t: 'join', code: 'A'.repeat(17) }), null);
  assert.equal(parseClientMsg({ t: 'chat-send', channel: 'chung', body: 'x'.repeat(4097) }), null);
  assert.equal(parseClientMsg({ t: 'watch', ids: Array.from({ length: 501 }, (_, i) => `u${i}`) }), null);
  assert.ok(parseClientMsg({ t: 'watch', ids: Array.from({ length: 500 }, (_, i) => `u${i}`) }));
});
