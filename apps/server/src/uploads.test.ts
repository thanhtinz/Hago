import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Avatars, MAX_BYTES, UploadError } from './uploads.js';

const fresh = () => new Avatars(mkdtempSync(path.join(tmpdir(), 'av-')));

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64, 7)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64, 7)]);

const fails = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof UploadError, String(e));
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`đáng lẽ phải lỗi ${code}`);
};

test('nhận PNG, JPEG, WebP và phát lại đúng kiểu nội dung', () => {
  const a = fresh();
  for (const [buf, mime] of [
    [PNG, 'image/png'],
    [JPG, 'image/jpeg'],
    [WEBP, 'image/webp'],
  ] as const) {
    const name = a.save(buf);
    const got = a.read(name);
    assert.ok(got);
    assert.equal(got.mime, mime, 'kiểu nội dung lấy từ dấu nhận dạng trong tệp');
    assert.deepEqual(got.buf, buf);
  }
});

test('từ chối SVG, kể cả khi nó tự nhận là ảnh', () => {
  const a = fresh();
  // SVG chạy được JavaScript. Phát tệp SVG của người dùng từ cùng tên miền
  // với app là XSS lưu trữ: ai xem hồ sơ họ cũng chạy mã của họ.
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  fails(() => a.save(svg), 'NOT_IMAGE');
});

test('từ chối tệp không phải ảnh và tệp rỗng', () => {
  const a = fresh();
  fails(() => a.save(Buffer.from('<!doctype html><script>alert(1)</script>')), 'NOT_IMAGE');
  fails(() => a.save(Buffer.from('GIF89a')), 'NOT_IMAGE');
  fails(() => a.save(Buffer.alloc(0)), 'EMPTY');
});

test('từ chối tệp quá lớn', () => {
  const a = fresh();
  fails(() => a.save(Buffer.concat([PNG, Buffer.alloc(MAX_BYTES)])), 'TOO_BIG');
});

test('tên tệp do máy chủ sinh, không đoán trước và không lặp', () => {
  const a = fresh();
  const n1 = a.save(PNG);
  const n2 = a.save(PNG);
  assert.notEqual(n1, n2, 'cùng một ảnh vẫn ra hai tệp');
  assert.match(n1, /^[0-9a-f]{26}\.png$/);
});

test('không đọc được tệp ngoài thư mục ảnh', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'av-'));
  const a = new Avatars(dir);
  writeFileSync(path.join(dir, '..', 'bimat.txt'), 'nội dung không được lộ');
  // Tên đến từ đường dẫn URL nên phải chặn mọi đường thoát thư mục.
  for (const bad of ['../bimat.txt', '..%2Fbimat.txt', '/etc/passwd', 'a'.repeat(26) + '.png', 'abc.png']) {
    assert.equal(a.read(bad), null, `đọc được ${bad}`);
  }
});

test('xoá ảnh cũ, và không xoá nhầm gì khi tên sai', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'av-'));
  const a = new Avatars(dir);
  const name = a.save(PNG);
  assert.equal(readdirSync(dir).length, 1);
  a.remove('../../../etc/passwd');
  a.remove(null);
  assert.equal(readdirSync(dir).length, 1, 'tên sai thì không đụng vào gì');
  a.remove(name);
  assert.equal(readdirSync(dir).length, 0);
  assert.equal(a.read(name), null);
});
