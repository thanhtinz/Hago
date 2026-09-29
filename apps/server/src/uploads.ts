import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Kho ảnh đại diện người dùng tải lên.
 *
 * Nhận tệp của người lạ rồi phát lại cho người lạ khác là chỗ dễ hỏng nhất
 * trong cả máy chủ, nên mọi quy tắc ở đây đều có một lý do cụ thể:
 *
 * 1. **Đọc dấu nhận dạng trong tệp, không tin `Content-Type`.** Header do
 *    client đặt, ai cũng sửa được.
 * 2. **Từ chối SVG.** SVG chạy được JavaScript. Phát một tệp SVG của người
 *    dùng từ cùng tên miền với app là mở thẳng cửa XSS lưu trữ — kẻ tấn công
 *    tải lên một "ảnh đại diện", ai xem hồ sơ họ cũng chạy mã của họ.
 * 3. **Tên tệp do máy chủ sinh**, không lấy từ tên người dùng gửi lên. Tên do
 *    client đặt là đường đi tới `../../` và tới việc ghi đè tệp khác.
 * 4. **Trả kèm `X-Content-Type-Options: nosniff`** và đúng một trong ba kiểu
 *    ảnh, để trình duyệt không tự đoán lại thành HTML.
 * 5. **Trần dung lượng.** Không có trần thì một người tải một tệp 2 GB là hết
 *    đĩa của cả máy chủ.
 *
 * Ảnh **không** được thu nhỏ ở đây: app đã vẽ lại thành ô vuông 256 điểm
 * trước khi gửi, nên tệp tới nơi đã nhỏ sẵn. Thu nhỏ ở máy chủ cần thư viện
 * xử lý ảnh, mà thư viện giải mã ảnh chính là nơi hay có lỗ hổng nhất.
 */

export const MAX_BYTES = 512 * 1024;

const KINDS = [
  { ext: 'png', mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
] as const;

export type UploadKind = (typeof KINDS)[number];

/** WebP nằm sau 4 byte kích thước nên phải kiểm riêng. */
function sniff(buf: Buffer): UploadKind | null {
  for (const k of KINDS) {
    if (k.magic.every((b, i) => buf[i] === b)) return k;
  }
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp', magic: [] } as unknown as UploadKind;
  }
  return null;
}

export class UploadError extends Error {
  constructor(
    readonly code: string,
    msg: string,
  ) {
    super(msg);
  }
}

export class Avatars {
  constructor(private readonly dir = process.env.AVATAR_DIR ?? 'data/avatars') {
    mkdirSync(path.resolve(this.dir), { recursive: true });
  }

  /** Lưu một tệp ảnh, trả về tên để ghi vào hồ sơ. Ném lỗi nếu không phải ảnh. */
  save(buf: Buffer): string {
    if (buf.length === 0) throw new UploadError('EMPTY', 'Tệp rỗng');
    if (buf.length > MAX_BYTES) throw new UploadError('TOO_BIG', `Ảnh phải nhỏ hơn ${Math.round(MAX_BYTES / 1024)} KB`);
    const kind = sniff(buf);
    if (!kind) throw new UploadError('NOT_IMAGE', 'Chỉ nhận ảnh PNG, JPEG hoặc WebP');
    // Tên gồm phần ngẫu nhiên và vân tay nội dung: hai người tải cùng một ảnh
    // vẫn ra hai tệp (không lộ việc trùng), mà tên thì không đoán được.
    const name = `${randomBytes(9).toString('hex')}${createHash('sha256').update(buf).digest('hex').slice(0, 8)}.${kind.ext}`;
    writeFileSync(path.join(path.resolve(this.dir), name), buf);
    return name;
  }

  /** Đọc một tệp để phát ra. `name` đến từ ngoài nên phải chặn đường thoát thư mục. */
  read(name: string): { buf: Buffer; mime: string } | null {
    if (!/^[0-9a-f]{26}\.(png|jpg|webp)$/.test(name)) return null;
    const file = path.join(path.resolve(this.dir), name);
    if (!existsSync(file)) return null;
    const ext = name.slice(name.lastIndexOf('.') + 1);
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : 'image/webp';
    return { buf: readFileSync(file), mime };
  }

  /** Xoá ảnh cũ khi người dùng đổi sang ảnh khác hoặc về con dấu. */
  remove(name: string | null | undefined): void {
    if (!name || !/^[0-9a-f]{26}\.(png|jpg|webp)$/.test(name)) return;
    rmSync(path.join(path.resolve(this.dir), name), { force: true });
  }
}

/** Giá trị lưu trong `users.avatar` khi là ảnh tải lên. */
export const UP = 'up:';
export const isUpload = (v: string | null): v is string => !!v && v.startsWith(UP);
export const uploadName = (v: string) => v.slice(UP.length);
