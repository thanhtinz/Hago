import type { Outcome, Seat, Turn } from '@co/core';

/**
 * Giao thức giữa client và máy chủ.
 *
 * Client **chỉ gửi ý định**: mã phòng, nước muốn đi. Máy chủ chạy engine và
 * trả về `view` của đúng ghế đó. Không có thông điệp nào cho phép client gửi
 * lên state — mọi game ở đây đều tính được state từ luật, nên nếu tin client
 * thì chỉ cần một bản sửa đổi là ghi đè cả bàn cờ.
 */

export interface SeatInfo {
  seat: Seat;
  name: string;
  connected: boolean;
  /** Còn bao nhiêu mili giây trên đồng hồ. */
  ms: number;
}

export type ClientMsg =
  /**
   * Mở phiên bằng **token đăng nhập**.
   *
   * Danh tính đến từ token chứ không từ một chuỗi client tự nhớ: `userId`
   * chính là khoá ghế trong phòng, nên gửi lại `hello` với cùng token là nối
   * lại ghế cũ và nhận ngay thế cờ hiện tại — rớt sóng 4G vài giây không
   * được tính là bỏ trận.
   */
  | { t: 'hello'; token: string }
  /** Mở phòng riêng, trả về mã để mời bạn. Phòng riêng không tính xếp hạng. */
  | { t: 'create'; gameId: string; config?: unknown }
  | { t: 'join'; code: string }
  /** Vào hàng chờ ghép cặp của một bộ môn. */
  | { t: 'quick'; gameId: string }
  | { t: 'leave' }
  /**
   * Một nước đi. `action` là hành động đã bọc meta (`{t:'game',a}` hoặc
   * `resign`/`offer-draw`/…). `nonce` để gửi lại không bị tính hai lần.
   */
  | { t: 'act'; nonce: string; action: unknown };

export type ServerMsg =
  | { t: 'welcome'; youId: string }
  | { t: 'queued'; gameId: string; waiting: number }
  | {
      t: 'room';
      code: string;
      gameId: string;
      rated: boolean;
      yourSeat: Seat | null;
      seats: SeatInfo[];
      started: boolean;
    }
  | {
      t: 'state';
      ply: number;
      /** `view` của riêng ghế này. Ghế khác nhận bản khác. */
      v: unknown;
      events: unknown[];
      turn: Turn;
      seats: SeatInfo[];
      outcome: Outcome | null;
    }
  | { t: 'left' }
  | { t: 'error'; code: string; msg: string };

export const PORT = Number(process.env.PORT ?? 8787);
