import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRng, registry } from '@co/core';
import './catalog.js';
import { CHIEN_DICH } from '@co/protocol';

/**
 * Bảng ải nằm ở `@co/protocol`, nhưng bài kiểm phải ở đây: `@co/protocol`
 * không được phụ thuộc vào engine, còn kiểm một ải thì bắt buộc phải dựng
 * ván thật.
 */

test('mọi ải đều dựng được bằng đúng engine và cấu hình của nó', () => {
  for (const ai of CHIEN_DICH) {
    assert.ok(registry.has(ai.gameId), `${ai.id} trỏ vào bộ môn chưa có engine`);
    const engine = registry.get(ai.gameId);
    const s = engine.init([0, 1], ai.config, makeRng(ai.hat, 0));
    assert.ok(engine.legal(s as never, 0).length > 0 || engine.legal(s as never, 1).length > 0, `${ai.id} dựng ra thế cờ không ai đi được`);
  }
});

test('câu "ai đi trước" trong mô tả khớp với hạt giống đã ghim', () => {
  // Cờ gánh và ô ăn quan bốc người đi trước bằng `rng`. Không ghim hạt thì
  // cùng một ải mỗi lần vào một khác, và câu trong `moTa` sẽ đúng lúc này
  // sai lúc kia. Bài này là thứ duy nhất canh cho lời hứa đó.
  for (const ai of CHIEN_DICH) {
    const engine = registry.get(ai.gameId);
    const s = engine.init([0, 1], ai.config, makeRng(ai.hat, 0));
    const t = engine.turn(s as never);
    assert.equal(t.kind, 'seat', `${ai.id} không mở ván bằng lượt của một ghế`);
    const mayDiTruoc = t.kind === 'seat' && t.seat === 1;
    const noiMayDiTruoc = ai.moTa.includes('Máy đi trước');
    const noiBanDiTruoc = ai.moTa.includes('Bạn đi trước');
    assert.ok(noiMayDiTruoc || noiBanDiTruoc, `${ai.id} không nói ai đi trước`);
    assert.equal(mayDiTruoc, noiMayDiTruoc, `${ai.id}: mô tả nói sai người đi trước`);
  }
});

test('hạt giống cố định thì dựng lại bao nhiêu lần cũng ra một thế cờ', () => {
  for (const ai of CHIEN_DICH) {
    const engine = registry.get(ai.gameId);
    const a = engine.init([0, 1], ai.config, makeRng(ai.hat, 0));
    const b = engine.init([0, 1], ai.config, makeRng(ai.hat, 0));
    assert.deepEqual(b, a, `${ai.id} dựng hai lần ra hai thế cờ khác nhau`);
  }
});
