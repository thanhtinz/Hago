import { db } from '../db';

/**
 * Đấu lại ngay sau khi hết trận.
 *
 * Trận xong vẫn nằm trong bộ nhớ thêm 5 phút để client xem kết quả — đúng cửa
 * sổ đó là lúc rủ nhau đánh ván nữa. Chỉ giữ **lời rủ** ở đây, còn dựng trận
 * mới là việc của gateway: module này không được nhập tầng socket, không thì
 * hai file nhập vòng lẫn nhau.
 *
 * Ván mới chỉ mở khi **mọi người trong trận đều đồng ý**. Một người bấm là
 * thành lời rủ, người còn lại bấm theo là vào trận; ai bấm từ chối thì lời rủ
 * xoá hẳn, không treo đó chờ hết giờ.
 */

/** Trận đã xong sống thêm chừng này rồi mới bị dọn — xem `finishMatch`. */
export const REMATCH_WINDOW_MS = 5 * 60_000;

/** matchId -> những người đã bấm đấu lại. */
const offers = new Map<string, Set<string>>();

export type RematchOutcome =
  /** Còn thiếu người đồng ý. */
  | { kind: 'waiting'; asked: string[] }
  /** Đủ người rồi, gateway dựng ván mới. */
  | { kind: 'ready'; asked: string[] };

export function askedFor(matchId: string): string[] {
  return [...(offers.get(matchId) ?? [])];
}

export function offerRematch(matchId: string, userId: string, playerIds: string[]): RematchOutcome {
  const set = offers.get(matchId) ?? new Set<string>();
  set.add(userId);
  offers.set(matchId, set);
  const asked = [...set];
  const all = playerIds.every((id) => set.has(id));
  if (all) offers.delete(matchId);
  return { kind: all ? 'ready' : 'waiting', asked };
}

/** Từ chối xoá sạch lời rủ: người kia thấy ngay chứ không ngồi chờ vô ích. */
export function declineRematch(matchId: string): void {
  offers.delete(matchId);
}

export function forgetRematch(matchId: string): void {
  offers.delete(matchId);
}

/**
 * Trận trong nhánh giải đấu thì không đấu lại được: kết quả đã đẩy người thắng
 * sang vòng sau, đánh thêm một ván nữa cũng không đổi được gì mà còn khiến hai
 * người tưởng là còn cửa.
 */
export function isTournamentMatch(matchId: string): boolean {
  return !!db.prepare('SELECT 1 AS x FROM tournament_matches WHERE match_id = ?').get(matchId);
}
