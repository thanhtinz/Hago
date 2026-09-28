import type { Rng } from './types.js';

/**
 * Nguồn ngẫu nhiên của máy chủ.
 *
 * Kiểu **counter-based**: giá trị thứ `n` tính thẳng từ `(seed, n)`, không phụ
 * thuộc trạng thái nội bộ tích luỹ. Đây không phải sở thích phong cách mà là
 * điều kiện để ràng buộc R2 đúng được: khôi phục phòng từ snapshot chỉ cần
 * `(seed, rngCursor)` là dòng ngẫu nhiên nối lại **đúng từng bit**. Với PRNG
 * kiểu tích luỹ trạng thái (Mersenne Twister, xorshift có state), muốn nhảy
 * tới vị trí `n` phải quay lại từ đầu — và khi ai đó quên làm vậy thì xúc xắc
 * lệch âm thầm, không có lỗi nào nổ ra.
 */

/** FNV-1a 32 bit. Đủ tốt để rải một chuỗi seed thành hạt số. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** splitmix32 — trộn một số nguyên thành một giá trị phân bố đều. */
function mix(x: number): number {
  let z = x >>> 0;
  z = (z + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

class CounterRng implements Rng {
  private readonly base: number;
  private pos: number;

  constructor(seed: string, cursor: number) {
    this.base = hashSeed(seed);
    this.pos = cursor;
  }

  get cursor(): number {
    return this.pos;
  }

  next(): number {
    const v = mix((this.base + Math.imul(this.pos, 0x9e3779b1)) >>> 0);
    this.pos++;
    return v / 0x1_0000_0000;
  }

  int(n: number): number {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`int(${n}): cần số nguyên dương`);
    return Math.floor(this.next() * n);
  }

  die(sides: number): number {
    return this.int(sides) + 1;
  }

  /**
   * Fisher–Yates. Tiêu thụ đúng `xs.length - 1` giá trị bất kể nội dung mảng —
   * số lần rút phải chỉ phụ thuộc độ dài, không thì con trỏ sẽ lệch giữa lần
   * chạy thật và lần replay.
   */
  shuffle<T>(xs: T[]): T[] {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const a = xs[i] as T;
      const b = xs[j] as T;
      xs[i] = b;
      xs[j] = a;
    }
    return xs;
  }
}

/** Mở dòng ngẫu nhiên tại đúng vị trí `cursor`. */
export function makeRng(seed: string, cursor = 0): Rng {
  return new CounterRng(seed, cursor);
}

/**
 * Cam kết seed trước khi ván bắt đầu (commit–reveal).
 *
 * Máy chủ công bố `commit` lúc mở phòng, client gửi `clientSeed`, seed thật là
 * hàm của cả hai. Gần như không người chơi nào đi kiểm, nhưng giá trị nằm ở
 * chỗ nó **trói chính máy chủ**: khi có người tố xúc xắc gian, có một câu trả
 * lời kiểm chứng được thay vì lời hứa suông.
 */
export function commitSeed(serverSeed: string, matchId: string): string {
  return `${hashSeed(`${serverSeed}|${matchId}`).toString(16).padStart(8, '0')}`;
}

export function revealSeed(serverSeed: string, matchId: string, clientSeed: string): string {
  return `${serverSeed}|${matchId}|${clientSeed}`;
}
