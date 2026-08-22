import { GameType, ReplayData, ReplayFrame, getEngine } from '@hago/shared';
import { db, nowMs } from '../db';
import type { MatchRuntime } from '../realtime/match';

/**
 * Xem lại trận. Về lý thuyết trận nào cũng dựng lại được từ `matches.seed` +
 * bảng `match_actions` vì engine thuần và RNG có seed — nhưng mấy game realtime
 * (Sheep, Flappy) còn phụ thuộc `tick(now)` của đồng hồ máy chủ, chạy lại không
 * ra đúng khung hình cũ. Nên thay vì diễn lại, ta **chụp lại**: mỗi lần state
 * đổi thì ghi một khung.
 *
 * Khung lưu state thô của server chứ không lưu view. Lúc phát lại mới gọi
 * `engine.view(state, viewerId)` theo đúng người đang xem, nên xem lại trận của
 * mình thì thấy quân bài của mình, còn người ngoài xem thì vẫn bị giấu y như
 * lúc trận đang diễn ra.
 */

/** Trần số khung mỗi trận. Chạm trần thì thưa bớt chứ không cắt cụt đuôi. */
const MAX_FRAMES = 400;
/** Khoảng cách tối thiểu giữa hai khung của game realtime. */
const BASE_GAP_MS = 400;
/** Giữ replay 14 ngày; quá thì dọn cho DB khỏi phình. */
const TTL_MS = 14 * 86_400_000;

export function recordFrame(match: MatchRuntime, force = false): void {
  const engine = getEngine(match.gameType);
  const now = nowMs();
  // Game theo lượt mỗi nước một khung, không cần thưa. Game realtime tick 5
  // lần/giây, ghi hết thì một ván Flappy đã hơn nghìn khung.
  if (!force && engine.realtime && now - match.lastFrameAt < match.frameGapMs) return;

  if (match.frames >= MAX_FRAMES) decimate(match);

  db.prepare('INSERT OR REPLACE INTO match_frames (match_id, idx, at, version, state_json) VALUES (?,?,?,?,?)').run(
    match.id,
    match.frames,
    now - match.startedAt,
    match.version,
    JSON.stringify(match.state),
  );
  match.frames += 1;
  match.lastFrameAt = now;
}

/**
 * Chạm trần thì bỏ các khung lẻ và đánh số lại — mất một nửa độ mịn nhưng vẫn
 * phủ trọn trận, hơn hẳn cách cắt cụt phần cuối (đúng đoạn quyết định thắng
 * thua lại là đoạn bị mất).
 */
function decimate(match: MatchRuntime): void {
  const shrink = db.transaction(() => {
    db.prepare('DELETE FROM match_frames WHERE match_id = ? AND idx % 2 = 1').run(match.id);
    db.prepare('UPDATE match_frames SET idx = idx / 2 WHERE match_id = ?').run(match.id);
  });
  shrink();
  match.frames = Math.ceil(match.frames / 2);
  match.frameGapMs *= 2;
}

export const INITIAL_FRAME_GAP_MS = BASE_GAP_MS;

export function frameCount(matchId: string): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM match_frames WHERE match_id = ?').get(matchId) as { c: number };
  return row.c;
}

export interface ReplayMatchRow {
  id: string;
  game_type: GameType;
  mode: string;
  status: string;
  started_at: number;
  ended_at: number | null;
}

/** Trả về null khi không có trận, hoặc trận chưa xong (đang chơi thì dùng spectate). */
export function replayOf(matchId: string, viewerId: string | null): ReplayData | null {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as ReplayMatchRow | undefined;
  if (!match || match.status !== 'finished') return null;

  const frames = db
    .prepare('SELECT at, version, state_json FROM match_frames WHERE match_id = ? ORDER BY idx')
    .all(matchId) as { at: number; version: number; state_json: string }[];
  if (!frames.length) return null;

  const engine = getEngine(match.game_type);
  const players = db
    .prepare(
      `SELECT mp.user_id, mp.seat, u.display_name, p.avatar_seed, p.avatar_style
       FROM match_players mp
       JOIN users u ON u.id = mp.user_id
       LEFT JOIN profiles p ON p.user_id = mp.user_id
       WHERE mp.match_id = ? ORDER BY mp.seat`,
    )
    .all(matchId) as any[];
  const rows = db
    .prepare(
      `SELECT user_id, result, score, place, rating_delta, xp_gain, coin_gain
       FROM match_players WHERE match_id = ? ORDER BY place`,
    )
    .all(matchId) as any[];

  const out: ReplayFrame[] = frames.map((f) => {
    const state = JSON.parse(f.state_json);
    return {
      at: f.at,
      version: f.version,
      view: engine.view(state, viewerId),
      deadline: engine.deadline(state),
    };
  });

  return {
    matchId: match.id,
    gameType: match.game_type,
    mode: match.mode as any,
    startedAt: match.started_at,
    endedAt: match.ended_at,
    durationMs: out[out.length - 1].at,
    players: players.map((p) => ({
      id: p.user_id,
      seat: p.seat,
      name: p.display_name,
      avatarSeed: p.avatar_seed ?? p.user_id,
      avatarStyle: p.avatar_style ?? 'adventurer',
    })),
    rows: rows.map((r) => ({
      userId: r.user_id,
      result: r.result,
      score: r.score,
      place: r.place,
      ratingDelta: r.rating_delta,
      xpGain: r.xp_gain,
      coinGain: r.coin_gain,
    })),
    frames: out,
  };
}

/** Trận nào còn khung để xem lại — dùng gắn nhãn "Xem lại" vào lịch sử đấu. */
export function replayableIds(matchIds: string[]): Set<string> {
  if (!matchIds.length) return new Set();
  const marks = matchIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT DISTINCT match_id FROM match_frames WHERE match_id IN (${marks})`)
    .all(...matchIds) as { match_id: string }[];
  return new Set(rows.map((r) => r.match_id));
}

/** Gắn cờ `hasReplay` vào các dòng lịch sử đấu để client biết dòng nào bấm được. */
export function withReplayFlag<T extends { id: string }>(rows: T[]): (T & { hasReplay: boolean })[] {
  const have = replayableIds(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, hasReplay: have.has(r.id) }));
}

export function pruneReplays(ttlMs = TTL_MS): number {
  const cutoff = nowMs() - ttlMs;
  const res = db
    .prepare('DELETE FROM match_frames WHERE match_id IN (SELECT id FROM matches WHERE started_at < ?)')
    .run(cutoff);
  return res.changes;
}
