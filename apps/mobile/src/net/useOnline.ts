/**
 * Cách vào một ván với người thật.
 *
 * Bản thân ván đấu sống ở `live.ts` — một dây nối cho cả app. Chỗ này chỉ còn
 * giữ kiểu của **ý định**: ghép cặp, mở phòng, hay vào bằng mã.
 *
 * Ván với người thật **không có gợi ý và không có lùi lại**, khác hẳn đấu với
 * máy. Gợi ý cần chạy bot trên thế cờ mà client không giữ thế cờ; lùi lại thì
 * đối thủ phải đồng ý mới được — một bên tự rút nước đã đi thì không còn là
 * ván cờ.
 */

export type Intent =
  | { kind: 'quick'; gameId: string }
  | { kind: 'create'; gameId: string }
  | { kind: 'join'; code: string }
  /** Ván đã có sẵn trên dây nối (lời rủ vừa được nhận lời) — không gửi gì thêm. */
  | { kind: 'none' };
