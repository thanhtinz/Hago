import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { nid } from '../util';

/**
 * Ảnh gửi trong chat.
 *
 * Client gửi lên một data URL, server tự đặt tên file và trả về **đường dẫn
 * tương đối** dạng `/uploads/<id>.<ext>`. Tin nhắn ảnh chỉ được mang đúng dạng
 * đường dẫn đó (xem `IMAGE_PATH_RE`), không phải URL tuỳ ý — không thì ai cũng
 * nhét được link ngoài vào chat, kéo theo chuyện đo dấu vết người xem và tải
 * nội dung mà server không kiểm soát.
 */

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Trần dung lượng sau khi giải mã base64. Ảnh chat không cần to hơn. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const IMAGE_PATH_RE = /^\/uploads\/[a-z0-9]{8,32}\.(png|jpg|webp|gif)$/;

export function uploadDir(): string {
  const dir = path.join(path.dirname(CONFIG.dbFile), 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export class UploadError extends Error {}

/** Nhận `data:image/png;base64,...`, ghi ra file, trả về đường dẫn phục vụ. */
export function saveDataUrl(dataUrl: string): { url: string; bytes: number } {
  const m = /^data:([a-z/+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? '').trim());
  if (!m) throw new UploadError('BAD_IMAGE');
  const ext = MIME_EXT[m[1]];
  if (!ext) throw new UploadError('UNSUPPORTED_IMAGE');

  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) throw new UploadError('BAD_IMAGE');
  if (buf.length > MAX_IMAGE_BYTES) throw new UploadError('IMAGE_TOO_LARGE');
  // Kiểm tra chữ ký file thay vì tin vào mime client khai — đổi mime là chuyện
  // client làm được, còn mấy byte đầu file thì không.
  if (!looksLikeImage(buf)) throw new UploadError('BAD_IMAGE');

  const name = `${nid()}.${ext}`;
  fs.writeFileSync(path.join(uploadDir(), name), buf);
  return { url: `/uploads/${name}`, bytes: buf.length };
}

function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // GIF
  if (buf.toString('ascii', 0, 3) === 'GIF') return true;
  // WEBP: "RIFF" .... "WEBP"
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}
