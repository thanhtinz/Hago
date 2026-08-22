import {
  EnginePlayer,
  GameEvent,
  GameMode,
  GameType,
  Rng,
  computeRewards,
  getEngine,
  isSolo,
  levelFromXp,
} from '@hago/shared';
import { CONFIG } from '../config';
import { db, nowMs, today } from '../db';
import { nid } from '../util';
import { mutateCurrency } from '../services/economy';
import { bumpDaily, dailyValue, track } from '../services/analytics';
import { progressAchievements, progressQuests } from '../services/quests';
import { areFriends } from '../services/social';
import { addGuildPoints } from '../services/guilds';
import { recordRankedMatch } from '../services/season';
import { notify } from '../services/notifications';
import { INITIAL_FRAME_GAP_MS, recordFrame } from '../services/replays';

export interface MatchRuntime {
  id: string;
  roomId: string | null;
  gameType: GameType;
  mode: GameMode;
  players: EnginePlayer[];
  state: any;
  rng: Rng;
  version: number;
  startedAt: number;
  finished: boolean;
  /** userId -> thời điểm mất kết nối; quá grace period thì bị xử theo luật game. */
  disconnected: Map<string, number>;
  /** Người đang xem trận (không ngồi ghế nào, chỉ nhận state đã lọc). */
  spectators: Set<string>;
  /** Số khung phát lại đã ghi và nhịp ghi hiện tại — xem services/replays.ts. */
  frames: number;
  lastFrameAt: number;
  frameGapMs: number;
}

type Broadcast = (match: MatchRuntime, events: GameEvent[]) => void;
type OnFinish = (match: MatchRuntime, summary: ReturnType<typeof settleMatch>) => void;

const matches = new Map<string, MatchRuntime>();
let broadcast: Broadcast = () => {};
let onFinish: OnFinish = () => {};

export function bindMatchHooks(b: Broadcast, f: OnFinish): void {
  broadcast = b;
  onFinish = f;
}

export function getMatch(id: string): MatchRuntime | undefined {
  return matches.get(id);
}

export function matchOfUser(userId: string): MatchRuntime | undefined {
  for (const m of matches.values()) {
    if (!m.finished && m.players.some((p) => p.id === userId)) return m;
  }
  return undefined;
}

export function activeMatches(): MatchRuntime[] {
  return [...matches.values()];
}

export function createMatch(opts: {
  roomId: string | null;
  gameType: GameType;
  mode: GameMode;
  players: EnginePlayer[];
  config?: Record<string, unknown>;
}): MatchRuntime {
  const engine = getEngine(opts.gameType);
  const id = nid();
  const seed = `${id}:${nowMs()}`;
  const rng = new Rng(seed);
  const state = engine.init(opts.players, opts.config ?? {}, rng);

  const match: MatchRuntime = {
    id,
    roomId: opts.roomId,
    gameType: opts.gameType,
    mode: opts.mode,
    players: opts.players,
    state,
    rng,
    version: 1,
    startedAt: nowMs(),
    finished: false,
    disconnected: new Map(),
    spectators: new Set(),
    frames: 0,
    lastFrameAt: 0,
    frameGapMs: INITIAL_FRAME_GAP_MS,
  };
  matches.set(id, match);

  db.prepare(
    "INSERT INTO matches (id, game_type, mode, room_id, status, seed, started_at) VALUES (?,?,?,?,'playing',?,?)",
  ).run(id, opts.gameType, opts.mode, opts.roomId, seed, match.startedAt);
  const stmt = db.prepare('INSERT INTO match_players (match_id, user_id, seat) VALUES (?,?,?)');
  opts.players.forEach((p) => stmt.run(id, p.id, p.seat));
  persist(match);
  opts.players.forEach((p) => track(p.id, 'match_start', { match_id: id, game_type: opts.gameType }));
  return match;
}

function persist(match: MatchRuntime): void {
  recordFrame(match);
  db.prepare(
    `INSERT INTO game_states (match_id, version, state_json, rng_state, updated_at) VALUES (?,?,?,?,?)
     ON CONFLICT(match_id) DO UPDATE SET version=excluded.version, state_json=excluded.state_json,
       rng_state=excluded.rng_state, updated_at=excluded.updated_at`,
  ).run(match.id, match.version, JSON.stringify(match.state), match.rng.state, nowMs());
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  version?: number;
}

/**
 * Áp dụng intent của client. Server là nguồn chân lý duy nhất: kiểm tra
 * idempotency theo action_id, validate qua engine rồi mới ghi state mới.
 */
export function applyAction(
  matchId: string,
  userId: string,
  actionId: string,
  type: string,
  payload: any,
): ActionResult {
  const match = matches.get(matchId);
  if (!match) return { ok: false, error: 'MATCH_NOT_FOUND' };
  if (match.finished) return { ok: false, error: 'MATCH_OVER' };
  if (!match.players.some((p) => p.id === userId)) return { ok: false, error: 'NOT_A_PLAYER' };

  const dup = db.prepare('SELECT version FROM match_actions WHERE action_id = ?').get(actionId) as
    | { version: number }
    | undefined;
  if (dup) return { ok: true, version: dup.version };

  const engine = getEngine(match.gameType);
  const res = engine.apply(match.state, userId, type, payload, match.rng);
  if (!res.ok) return { ok: false, error: res.error };

  match.state = res.state;
  match.version += 1;
  db.prepare(
    'INSERT INTO match_actions (action_id, match_id, user_id, type, payload, version, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(actionId, matchId, userId, type, JSON.stringify(payload ?? {}), match.version, nowMs());
  persist(match);
  track(userId, 'game_action', { match_id: matchId, action_type: type });

  broadcast(match, res.events);
  if (engine.finished(match.state)) finishMatch(match);
  return { ok: true, version: match.version };
}

/** Vòng tick chung: chạy engine realtime + auto-play khi hết giờ lượt. */
export function tickAll(now: number): void {
  for (const match of matches.values()) {
    if (match.finished) continue;
    const engine = getEngine(match.gameType);
    let dirty = false;
    const events: GameEvent[] = [];

    if (engine.tick) {
      const r = engine.tick(match.state, now, match.rng);
      if (r.state !== match.state || r.events.length) {
        match.state = r.state;
        events.push(...r.events);
        dirty = true;
      }
    }
    const deadline = engine.deadline(match.state);
    if (!engine.finished(match.state) && engine.timeout && deadline && now > deadline) {
      const r = engine.timeout(match.state, match.rng);
      match.state = r.state;
      events.push(...r.events);
      dirty = true;
    }

    // Hết grace period reconnect → xử theo luật AFK: bỏ cuộc.
    for (const [userId, at] of match.disconnected) {
      if (now - at > CONFIG.reconnectGraceMs) {
        match.disconnected.delete(userId);
        forfeit(match, userId);
        dirty = true;
      }
    }

    if (dirty) {
      match.version += 1;
      persist(match);
      broadcast(match, events);
      if (engine.finished(match.state)) finishMatch(match);
    }
  }
}

export function markDisconnected(userId: string): void {
  const match = matchOfUser(userId);
  if (match) match.disconnected.set(userId, nowMs());
}

export function markReconnected(userId: string): MatchRuntime | undefined {
  const match = matchOfUser(userId);
  if (match) match.disconnected.delete(userId);
  return match;
}

function forfeit(match: MatchRuntime, userId: string): void {
  const others = match.players.filter((p) => p.id !== userId);
  match.state = {
    ...match.state,
    over: true,
    winnerIds: others.map((p) => p.id),
    log: [...(match.state.log ?? []), `${match.players.find((p) => p.id === userId)?.name} mất kết nối quá lâu — xử thua`],
  };
}

export interface SettleRow {
  userId: string;
  result: 'win' | 'lose' | 'draw';
  score: number;
  place: number;
  ratingDelta: number;
  xpGain: number;
  coinGain: number;
  levelBefore: number;
  levelAfter: number;
}

export function settleMatch(match: MatchRuntime): { matchId: string; rows: SettleRow[] } {
  const engine = getEngine(match.gameType);
  const rows = engine.results(match.state);
  const ratings: Record<string, number> = {};
  const firstWinAvailable: Record<string, boolean> = {};
  const dailyXp: Record<string, number> = {};
  for (const p of match.players) {
    const u = db.prepare('SELECT rating, xp FROM users WHERE id = ?').get(p.id) as
      | { rating: number; xp: number }
      | undefined;
    ratings[p.id] = u?.rating ?? 1000;
    firstWinAvailable[p.id] = dailyValue(p.id, 'wins') === 0;
    dailyXp[p.id] = dailyValue(p.id, 'xp');
  }

  const rewards = computeRewards({
    rows,
    ratings,
    mode: match.mode,
    gameType: match.gameType,
    durationMs: nowMs() - match.startedAt,
    firstWinAvailable,
    dailyXp,
    dailyXpCap: CONFIG.dailyXpCap,
  });

  const out: SettleRow[] = [];
  // Game một người không có đối thủ để so, nên không cộng thắng/thua và không
  // đổi rating — chỉ ghi nhận điểm cao nhất cho bảng xếp hạng.
  const solo = isSolo(match.gameType);
  const apply = db.transaction(() => {
    for (const reward of rewards) {
      const row = rows.find((r) => r.userId === reward.userId)!;
      const before = db.prepare('SELECT xp, rating FROM users WHERE id = ?').get(reward.userId) as {
        xp: number;
        rating: number;
      };
      const levelBefore = levelFromXp(before.xp).level;
      const newXp = before.xp + reward.xpGain;
      const newRating = Math.max(0, before.rating + reward.ratingDelta);
      const levelAfter = levelFromXp(newXp).level;

      db.prepare(
        `UPDATE users SET xp = ?, rating = ?, level = ?,
           wins = wins + ?, losses = losses + ?, draws = draws + ?
         WHERE id = ?`,
      ).run(
        newXp,
        newRating,
        levelAfter,
        !solo && reward.result === 'win' ? 1 : 0,
        !solo && reward.result === 'lose' ? 1 : 0,
        !solo && reward.result === 'draw' ? 1 : 0,
        reward.userId,
      );
      if (reward.coinGain > 0) mutateCurrency(reward.userId, 'coin', reward.coinGain, 'match_reward', match.id);

      db.prepare(
        `INSERT INTO game_stats (user_id, game_type, matches, wins, losses, rating, best_score)
         VALUES (?,?,1,?,?,?,?)
         ON CONFLICT(user_id, game_type) DO UPDATE SET
           matches = matches + 1,
           wins = wins + excluded.wins,
           losses = losses + excluded.losses,
           rating = max(0, rating + ?),
           best_score = max(best_score, excluded.best_score)`,
      ).run(
        reward.userId,
        match.gameType,
        !solo && reward.result === 'win' ? 1 : 0,
        !solo && reward.result === 'lose' ? 1 : 0,
        1000 + reward.ratingDelta,
        row.score,
        reward.ratingDelta,
      );

      db.prepare(
        `UPDATE match_players SET result = ?, score = ?, place = ?, rating_delta = ?, xp_gain = ?, coin_gain = ?
         WHERE match_id = ? AND user_id = ?`,
      ).run(reward.result, row.score, row.place, reward.ratingDelta, reward.xpGain, reward.coinGain, match.id, reward.userId);

      out.push({
        userId: reward.userId,
        result: reward.result,
        score: row.score,
        place: row.place,
        ratingDelta: reward.ratingDelta,
        xpGain: reward.xpGain,
        coinGain: reward.coinGain,
        levelBefore,
        levelAfter,
      });
    }
    db.prepare("UPDATE matches SET status = 'finished', ended_at = ? WHERE id = ?").run(nowMs(), match.id);
  });
  apply();

  // Quest/achievement/analytics chạy ngoài transaction tiền tệ chính.
  for (const r of out) {
    bumpDaily(r.userId, 'xp', r.xpGain);
    bumpDaily(r.userId, 'matches');
    progressQuests(r.userId, 'play_match', 1, match.gameType);
    // Nhiệm vụ 'chơi cùng bạn bè' trước giờ không ai làm xong được vì chẳng có
    // chỗ nào phát ra mốc này — cùng bàn với một người bạn thì tính.
    if (match.players.some((p) => p.id !== r.userId && areFriends(r.userId, p.id))) {
      progressQuests(r.userId, 'play_with_friend', 1, match.gameType);
    }
    progressAchievements(r.userId, 'matches', 1);
    // Đóng góp cho bang: chơi xong được 5 điểm, thắng thêm 10. Tính theo trận
    // chứ không theo XP để bang không lệ thuộc vào việc ai cày game dài.
    addGuildPoints(r.userId, r.result === 'win' ? 15 : 5);
    // Trận xếp hạng mới tính vào định hạng mùa; trận thường không đụng tới rank.
    if (match.mode === 'ranked') {
      const now = db.prepare('SELECT rating FROM users WHERE id = ?').get(r.userId) as { rating: number };
      recordRankedMatch(r.userId, now.rating);
    }
    if (r.result === 'win') {
      bumpDaily(r.userId, 'wins');
      progressQuests(r.userId, 'win_match', 1, match.gameType);
      progressAchievements(r.userId, 'wins', 1);
    }
    notify(
      r.userId,
      'match_result',
      r.result === 'win' ? 'Chiến thắng!' : r.result === 'draw' ? 'Hoà' : 'Trận đấu kết thúc',
      `+${r.xpGain} XP · +${r.coinGain} Coin${r.ratingDelta ? ` · ${r.ratingDelta > 0 ? '+' : ''}${r.ratingDelta} điểm rank` : ''}`,
      { matchId: match.id, gameType: match.gameType },
    );
    track(r.userId, 'match_end', {
      match_id: match.id,
      result: r.result,
      duration: nowMs() - match.startedAt,
      score: r.score,
      game_type: match.gameType,
    });
  }
  return { matchId: match.id, rows: out };
}

function finishMatch(match: MatchRuntime): void {
  if (match.finished) return;
  match.finished = true;
  // Khung cuối luôn phải có: đó là khung người ta tua tới để xem ai thắng.
  recordFrame(match, true);
  const summary = settleMatch(match);
  onFinish(match, summary);
  // Giữ lại 5 phút để client xem kết quả / rematch rồi mới dọn.
  setTimeout(() => matches.delete(match.id), 5 * 60_000).unref?.();
}

export function matchHistory(userId: string, limit = 20) {
  return db
    .prepare(
      `SELECT m.id, m.game_type, m.mode, m.started_at, m.ended_at,
              mp.result, mp.score, mp.place, mp.rating_delta, mp.xp_gain, mp.coin_gain
       FROM match_players mp JOIN matches m ON m.id = mp.match_id
       WHERE mp.user_id = ? AND m.status = 'finished'
       ORDER BY m.ended_at DESC LIMIT ?`,
    )
    .all(userId, limit);
}

export { today };
