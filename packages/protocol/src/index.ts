import type { Outcome, Seat, Turn } from '@co/core';

/**
 * Giao thức giữa client và máy chủ.
 *
 * Client **chỉ gửi ý định**: mã phòng, nước muốn đi. Máy chủ chạy engine và
 * trả về `view` của đúng ghế đó. Không có thông điệp nào cho phép client gửi
 * lên state — mọi game ở đây đều tính được state từ luật, nên nếu tin client
 * thì chỉ cần một bản sửa đổi là ghi đè cả bàn cờ.
 */

export interface ChatLine {
  id: number;
  channel: string;
  /** null là thông báo của hệ thống. */
  fromId: string | null;
  fromName: string;
  body: string;
  at: number;
}

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
   * Xin đấu lại ván nữa với đúng người vừa đánh, trong đúng phòng đó.
   *
   * Hai bên cùng xin thì máy chủ dựng ván mới ngay tại chỗ và **đổi bên** —
   * ai vừa đi trước thì ván sau đi sau. Gửi `want:false` là rút lại.
   */
  | { t: 'rematch'; want: boolean }
  /**
   * Một nước đi. `action` là hành động đã bọc meta (`{t:'game',a}` hoặc
   * `resign`/`offer-draw`/…). `nonce` để gửi lại không bị tính hai lần.
   */
  | { t: 'act'; nonce: string; action: unknown }
  /** Rủ một người bạn đánh một ván. Chỉ rủ được người đã là bạn và đang trực tuyến. */
  | { t: 'challenge'; to: string; gameId: string }
  /**
   * Mời một người bạn vào **đúng cái phòng mình đang chờ**.
   *
   * Khác `challenge` ở một điểm quyết định: `challenge` dựng một phòng mới
   * cho cả hai, còn `invite` kéo người kia vào phòng đã mở — cái phòng mà
   * người mời đang nhìn mã của nó trên màn hình. Không có nó thì mở phòng
   * xong chỉ còn cách đọc mã qua điện thoại.
   */
  | { t: 'invite'; to: string }
  | { t: 'challenge-answer'; id: string; accept: boolean }
  /** Rút lại lời rủ mình vừa gửi. */
  | { t: 'challenge-cancel'; id: string }
  /** Hỏi xem trong số này ai đang trực tuyến. */
  | { t: 'watch'; ids: string[] }
  /**
   * Mở một kênh nhắn tin: nhận lịch sử và **từ đó nhận tin mới theo thời
   * gian thực**. Mở kênh khác thì kênh cũ tự đóng.
   */
  | { t: 'chat-open'; channel: string }
  | { t: 'chat-send'; channel: string; body: string }
  /** Xin thêm một trang tin cũ hơn. */
  | { t: 'chat-more'; channel: string; before: number }
  | { t: 'chat-read'; channel: string; lastId: number };

export type ServerMsg =
  | { t: 'welcome'; youId: string }
  /**
   * Nhịp thở của sảnh: bao nhiêu người đang mở app, bao nhiêu ván đang chạy.
   *
   * Một sảnh cờ không nói được có ai ở đó không thì trông như một app đã
   * chết. Máy chủ đếm sẵn mấy con số này từ đầu (`Rooms.stats`) nhưng chúng
   * chỉ ra ở `/health`, không có đường nào tới màn hình.
   */
  | { t: 'lobby'; online: number; rooms: number; queued: number }
  /**
   * Số việc đang chờ chính người này xử lý: lời mời kết bạn đến.
   *
   * Trước đây sảnh hỏi con số này đúng **một lần** lúc mở màn, nên chấm đỏ
   * đứng chết cho tới khi mount lại — ai đó gửi lời mời trong lúc mình đang
   * ngồi ở sảnh thì không có gì nhúc nhích.
   */
  | { t: 'alerts'; friendRequests: number }
  | { t: 'queued'; gameId: string; waiting: number }
  | {
      t: 'room';
      code: string;
      gameId: string;
      rated: boolean;
      yourSeat: Seat | null;
      seats: SeatInfo[];
      started: boolean;
      /** Ghế nào đã xin đấu lại. Chỉ có nghĩa khi ván vừa kết thúc. */
      rematch: Seat[];
      /** Ván thứ mấy trong phòng này, đếm từ 1. */
      game: number;
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
  /**
   * Nhịp đồng hồ, một giây một lần trong lúc ván đang chạy.
   *
   * Không có nó thì con số trên màn hình chỉ đổi mỗi khi có nước đi: suốt
   * lượt đối thủ nghĩ, đồng hồ đứng im rồi nhảy một phát, và nhảy thẳng về
   * 0:00 lúc hết giờ — ngưỡng cảnh báo sắp hết giờ gần như không bao giờ
   * bật đúng lúc. Để **máy chủ** phát chứ không để client tự đếm: client tự
   * đếm thì phải đoán cả phần ân hạn, và hai máy đoán ra hai con số khác nhau.
   */
  | { t: 'clock'; ms: number[] }
  /**
   * Lời rủ đấu.
   *
   * `dir` nói đây là lời rủ **đến** hay lời rủ mình vừa gửi **đi**. Hai phía
   * cùng cần biết về nó: bên nhận để trả lời, bên gửi để hiện "đang chờ" và
   * để rút lại.
   */
  | { t: 'challenge'; id: string; dir: 'in' | 'out'; withId: string; withName: string; gameId: string }
  /** Lời rủ đã xong đời: bị từ chối, bị rút, hết hạn, hoặc đã thành ván. */
  | { t: 'challenge-gone'; id: string; why: 'declined' | 'cancelled' | 'expired' | 'accepted' }
  /** Ai trong danh sách đang theo dõi vừa đổi trạng thái trực tuyến. */
  | { t: 'presence'; online: string[] }
  /** Một tin mới trong kênh đang mở. */
  | { t: 'chat'; m: ChatLine }
  /** Một trang lịch sử, cũ nhất trước. `reset` là trang đầu khi mở kênh. */
  | { t: 'chat-page'; channel: string; rows: ChatLine[]; more: boolean; reset: boolean }
  /** Số tin chưa đọc theo từng người, để chấm đỏ trong danh sách bạn. */
  | { t: 'chat-unread'; dms: Record<string, number>; system: number }
  | { t: 'error'; code: string; msg: string };

export const PORT = Number(process.env.PORT ?? 8787);
