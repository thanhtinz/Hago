import assert from 'node:assert/strict';
import test from 'node:test';
import { CHIEN_DICH, CHUONG, TONG_SAO, aiCuaChuong, aiOf, chamSao, daMo } from './chien-dich.js';

test('mỗi ải có một khoá riêng, và thuộc một chương có thật', () => {
  const ids = new Set<string>();
  for (const a of CHIEN_DICH) {
    assert.ok(!ids.has(a.id), `trùng khoá ải: ${a.id}`);
    ids.add(a.id);
    const ch = CHUONG.find((c) => c.so === a.chuong);
    assert.ok(ch, `${a.id} thuộc chương không có thật`);
    assert.equal(a.gameId, ch!.gameId, `${a.id} khác bộ môn với chương của nó`);
    assert.ok(a.hat.length > 0, `${a.id} thiếu hạt giống cố định`);
    assert.ok(a.muc >= 1 && a.muc <= 3);
  }
  assert.equal(TONG_SAO, CHIEN_DICH.length * 3);
});

test('không ải nào trùng cấu hình với ải khác trong cùng chương', () => {
  // Một ải chỉ khai lại giá trị của ải trước là một ải đổi tên chứ không
  // đổi ván.
  for (const ch of CHUONG) {
    const seen = new Map<string, string>();
    for (const a of aiCuaChuong(ch.so)) {
      const key = JSON.stringify(a.config);
      const truoc = seen.get(key);
      assert.equal(truoc, undefined, `${a.id} có cấu hình trùng khít ${truoc}`);
      seen.set(key, a.id);
    }
  }
});

test('ải đầu mỗi chương mở sẵn, ải sau cần ải trước từ một sao', () => {
  for (const ch of CHUONG) {
    const list = aiCuaChuong(ch.so);
    assert.ok(list.length > 0);
    // Giữa các chương không khoá gì: ải đầu của **mọi** chương đều mở sẵn.
    assert.equal(daMo(list[0]!.id, {}), true, `ải đầu chương ${ch.so} phải mở sẵn`);
    if (list.length < 2) continue;
    assert.equal(daMo(list[1]!.id, {}), false, 'chưa qua ải trước thì ải sau còn khoá');
    assert.equal(daMo(list[1]!.id, { [list[0]!.id]: 1 }), true, 'một sao là đủ mở ải sau');
  }
});

test('ải không có thật thì không bao giờ mở', () => {
  assert.equal(daMo('khong-co-that', { 'khong-co-that': 3 }), false);
  assert.equal(aiOf('khong-co-that'), null);
});

test('chấm sao: ba điều kiện lồng nhau', () => {
  assert.equal(chamSao({ thang: false, dungGoiY: true, dungLuiLai: true }), 0, 'thua thì không có sao nào');
  assert.equal(chamSao({ thang: true, dungGoiY: true, dungLuiLai: true }), 1);
  assert.equal(chamSao({ thang: true, dungGoiY: false, dungLuiLai: true }), 2);
  assert.equal(chamSao({ thang: true, dungGoiY: false, dungLuiLai: false }), 3);
  // Lồng nhau: đã dùng gợi ý thì dù không lùi vẫn chỉ một sao.
  assert.equal(chamSao({ thang: true, dungGoiY: true, dungLuiLai: false }), 1);
});
