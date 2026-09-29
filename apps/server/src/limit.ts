/**
 * Giới hạn tần suất — cửa sổ trượt, đếm trong bộ nhớ.
 *
 * Đây là thứ đứng giữa một nền tảng có người chơi và một vòng lặp `curl`.
 * Không có nó thì `/api/auth/login` vừa là cửa dò mật khẩu không giới hạn,
 * vừa là cửa đánh sập: mỗi lần thử tốn một lần băm scrypt, và dù đã chuyển
 * scrypt sang threadpool thì threadpool cũng chỉ có bốn chỗ.
 *
 * **Trong bộ nhớ, không phải Redis**, đúng mạch với chỗ cất dữ liệu: một
 * tiến trình máy chủ, một tệp SQLite. Khi nào chạy nhiều tiến trình thì cả
 * hai chỗ cùng phải đổi, và đó là một quyết định, không phải một chi tiết.
 *
 * Cửa sổ trượt chứ không phải "đếm lại mỗi phút": đếm theo mốc phút cho
 * phép bắn gấp đôi hạn mức quanh ranh giới phút, mà ranh giới đó thì ai
 * cũng đoán được.
 */

export interface Rule {
  /** Số lần cho phép trong cửa sổ. */
  max: number;
  /** Độ dài cửa sổ, mili giây. */
  windowMs: number;
}

export class Limiter {
  /** Mốc thời gian của từng lần, theo khoá. Cắt bớt mỗi lần hỏi. */
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  /**
   * Ghi một lần và trả lời còn trong hạn mức không.
   *
   * Trả về số mili giây phải chờ nếu đã quá hạn, hoặc 0 nếu qua được. Trả
   * về thời gian chờ chứ không phải true/false, vì người dùng thật cũng có
   * lúc gõ sai mật khẩu ba lần và họ xứng đáng được biết phải đợi bao lâu.
   */
  take(key: string, rule: Rule): number {
    const t = this.now();
    const from = t - rule.windowMs;
    const arr = (this.hits.get(key) ?? []).filter((x) => x > from);
    if (arr.length >= rule.max) {
      this.hits.set(key, arr);
      return Math.max(1, (arr[0] ?? t) + rule.windowMs - t);
    }
    arr.push(t);
    this.hits.set(key, arr);
    return 0;
  }

  /** Xoá sạch dấu vết của một khoá — gọi khi việc đã thành công. */
  clear(key: string): void {
    this.hits.delete(key);
  }

  /**
   * Dọn khoá đã hết hạn.
   *
   * Không dọn thì mỗi địa chỉ IP từng gõ một lần là một khoá nằm lại mãi
   * trong `Map`, và một trận quét cổng để lại vài trăm nghìn khoá.
   */
  sweep(maxWindowMs: number): void {
    const from = this.now() - maxWindowMs;
    for (const [k, arr] of this.hits) {
      const live = arr.filter((x) => x > from);
      if (live.length) this.hits.set(k, live);
      else this.hits.delete(k);
    }
  }

  /** Dùng cho test và trang trạng thái. */
  size(): number {
    return this.hits.size;
  }
}

/**
 * Hạn mức của từng cửa.
 *
 * Con số chọn theo **người dùng thật làm gì**, không theo cảm giác an toàn:
 * ai cũng có lúc gõ sai mật khẩu vài lần liên tiếp, nhưng không ai mở mười
 * tài khoản trong một giờ từ cùng một máy.
 */
export const RULES = {
  login: { max: 10, windowMs: 5 * 60_000 },
  // Mười chứ không phải năm: cả một lớp học hay một quán net đi chung một
  // địa chỉ NAT, và năm tài khoản một giờ là chặn oan cả phòng.
  register: { max: 10, windowMs: 60 * 60_000 },
  /** Đổi tên, đổi ảnh, đổi mật khẩu — việc ghi, nhưng không phải việc hiếm. */
  write: { max: 40, windowMs: 60_000 },
  /** Đọc: hồ sơ, lịch sử, tìm người. Rộng tay, chỉ để chặn vòng lặp. */
  read: { max: 240, windowMs: 60_000 },
  /** Nhắn tin qua WebSocket. Gõ nhanh nhất cũng không quá chừng này. */
  chat: { max: 20, windowMs: 10_000 },
  /** Mọi thông điệp WebSocket gộp lại. Nước cờ, mở kênh, theo dõi. */
  socket: { max: 120, windowMs: 10_000 },
} as const satisfies Record<string, Rule>;

/** Cửa sổ dài nhất trong bảng trên — dùng cho `sweep`. */
export const MAX_WINDOW = Math.max(...Object.values(RULES).map((r) => r.windowMs));
