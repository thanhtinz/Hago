/**
 * Chọn một ảnh từ máy, cắt vuông và thu nhỏ **trước khi gửi lên**.
 *
 * Ba việc, mỗi việc một lý do:
 *
 * 1. **Cắt vuông** — ảnh đại diện luôn hiện trong khung tròn. Cắt ở máy chủ
 *    thì người chọn không thấy trước phần bị cắt mất; cắt ở đây thì thứ họ
 *    thấy đúng là thứ họ nhận.
 * 2. **Thu về 256 điểm** — khung lớn nhất trong app là 86 điểm ở màn hình gấp
 *    ba. Gửi nguyên ảnh 12 megapixel từ điện thoại là tốn của người dùng vài
 *    megabyte dữ liệu di động để hiện một vòng tròn bé bằng móng tay.
 * 3. **Vẽ lại qua canvas rồi mã hoá lại thành JPEG** — việc này **xoá sạch
 *    EXIF**, trong đó có toạ độ GPS nơi chụp. Người tải ảnh lên không nghĩ
 *    tới chuyện đó, nên phần mềm phải nghĩ hộ.
 */

const SIDE = 256;
const QUALITY = 0.82;

export class PickError extends Error {}

/** Có chọn được ảnh trên nền này không. */
export function canPickImage(): boolean {
  const g = globalThis as { document?: Document };
  return !!g.document;
}

export async function pickSquareImage(): Promise<Blob> {
  const g = globalThis as unknown as { document?: Document };
  const doc = g.document;
  if (!doc) {
    // Bản gói cho iOS và Android cần `expo-image-picker`; chưa cài thì nói
    // thẳng thay vì mở một hộp thoại không bao giờ hiện ra.
    throw new PickError('Bản này mới chọn được ảnh trên web. Trên điện thoại hãy chọn một con dấu.');
  }

  const file = await new Promise<File | null>((ok) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    // Ô nhập phải **nằm trong tài liệu** thì hộp thoại chọn tệp mới mở. Một
    // phần tử rời khỏi cây DOM nhận được `click()` mà không mở gì cả, và triệu
    // chứng là nút bấm không phản ứng — không có lỗi nào để lần theo.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    doc.body.appendChild(input);
    const done = (f: File | null) => {
      input.remove();
      ok(f);
    };
    input.onchange = () => done(input.files?.[0] ?? null);
    // Người bấm Huỷ thì `change` không bao giờ nổ; `cancel` có ở trình duyệt
    // hiện đại, không có thì lời hứa treo mãi mà không hại gì.
    input.oncancel = () => done(null);
    input.click();
  });
  if (!file) throw new PickError('Chưa chọn ảnh nào');
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new PickError('Chỉ nhận ảnh PNG, JPEG hoặc WebP');

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new PickError('Không đọc được ảnh này');
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = doc.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PickError('Trình duyệt không vẽ lại được ảnh');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIDE, SIDE);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', QUALITY));
  if (!blob) throw new PickError('Không nén được ảnh');
  return blob;
}
