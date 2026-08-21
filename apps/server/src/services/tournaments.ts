import { GAME_CATALOG, GameType } from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';
import { mutateCurrency } from './economy';
import { notify } from './notifications';
import { toPublicUser } from './users';

/**
 * Giải đấu loại trực tiếp.
 *
 * Mỗi cặp trong nhánh là một **trận thật** chạy qua đúng hệ trận đấu sẵn có,
 * không mô phỏng riêng — nhờ vậy luật, tính giờ, reconnect và trả thưởng dùng
 * chung một đường. Giải chỉ nối các trận đó lại và biết ai đi tiếp.
 *
 * Chỉ nhận game 2 người: nhánh loại trực tiếp cần mỗi cặp ra đúng một người
 * thắng, game nhiều người không chia được như vậy.
 */

export const TOURNAMENT_SIZES = [4, 8, 16] as const;

/** Gateway gắn hàm mở trận vào đây; service không gọi ngược lên tầng realtime. */
type StartMatch = (gameType: GameType, a: string, b: string) => string | null;
let startMatch: StartMatch = () => null;
export function bindTournamentRunner(fn: StartMatch): void {
  startMatch = fn;
}

const row = (id: string): any => db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);

const playerIds = (id: string): string[] =>
  (db.prepare('SELECT user_id FROM tournament_players WHERE tournament_id = ? ORDER BY seed, joined_at').all(id) as any[])
    .map((r) => r.user_id);

/** Tổng giải thưởng: tiền treo sẵn cộng toàn bộ lệ phí thu được. */
const prizePool = (t: any): number => t.base_prize + t.entry_coin * t.size;

export function toTournamentView(t: any, viewerId?: string) {
  const players = db
    .prepare(
      `SELECT tp.seed, u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id
       FROM tournament_players tp JOIN users u ON u.id = tp.user_id
       LEFT JOIN profiles p ON p.user_id = tp.user_id
       WHERE tp.tournament_id = ? ORDER BY tp.seed, tp.joined_at`,
    )
    .all(t.id) as any[];
  const matches = db
    .prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, slot')
    .all(t.id) as any[];
  return {
    id: t.id,
    name: t.name,
    gameType: t.game_type,
    size: t.size,
    entryCoin: t.entry_coin,
    prizePool: prizePool(t),
    status: t.status,
    winnerId: t.winner_id,
    startedAt: t.started_at,
    endedAt: t.ended_at,
    joined: viewerId ? players.some((p) => p.id === viewerId) : false,
    players: players.map((p) => ({ user: toPublicUser(p), seed: p.seed })),
    rounds: Math.log2(t.size),
    bracket: matches.map((m) => ({
      round: m.round,
      slot: m.slot,
      p1: m.p1,
      p2: m.p2,
      winnerId: m.winner_id,
      matchId: m.match_id,
    })),
  };
}

export function listTournaments(viewerId?: string) {
  const rows = db
    .prepare("SELECT * FROM tournaments WHERE status <> 'finished' OR ended_at > ? ORDER BY created_at DESC LIMIT 20")
    .all(nowMs() - 3 * 86400_000) as any[];
  return rows.map((t) => toTournamentView(t, viewerId));
}

export function createTournament(input: {
  name: string;
  gameType: GameType;
  size: number;
  entryCoin?: number;
  basePrize?: number;
}) {
  const meta = GAME_CATALOG[input.gameType];
  if (!meta) throw new Error('GAME_NOT_FOUND');
  if (meta.maxPlayers !== 2 || meta.minPlayers !== 2) throw new Error('GAME_NOT_ELIGIBLE');
  if (!TOURNAMENT_SIZES.includes(input.size as any)) throw new Error('BAD_SIZE');

  const id = nid();
  db.prepare(
    `INSERT INTO tournaments (id, name, game_type, size, entry_coin, base_prize, status, created_at)
     VALUES (?,?,?,?,?,?,'open',?)`,
  ).run(
    id,
    String(input.name ?? '').trim().slice(0, 40) || `Giải ${meta.name}`,
    input.gameType,
    input.size,
    Math.max(0, Number(input.entryCoin ?? 0)),
    Math.max(0, Number(input.basePrize ?? 0)),
    nowMs(),
  );
  return toTournamentView(row(id));
}

export function joinTournament(userId: string, id: string) {
  const t = row(id);
  if (!t) throw new Error('TOURNAMENT_NOT_FOUND');
  if (t.status !== 'open') throw new Error('TOURNAMENT_STARTED');
  const already = db
    .prepare('SELECT 1 AS x FROM tournament_players WHERE tournament_id = ? AND user_id = ?')
    .get(id, userId);
  if (already) throw new Error('ALREADY_JOINED');
  const count = (db.prepare('SELECT COUNT(*) AS n FROM tournament_players WHERE tournament_id = ?').get(id) as any).n;
  if (count >= t.size) throw new Error('TOURNAMENT_FULL');

  if (t.entry_coin > 0) mutateCurrency(userId, 'coin', -t.entry_coin, 'tournament_entry', id);
  db.prepare('INSERT INTO tournament_players (tournament_id, user_id, seed, joined_at) VALUES (?,?,0,?)').run(
    id,
    userId,
    nowMs(),
  );

  // Đủ suất là khai mạc luôn, không bắt ai phải bấm nút bắt đầu.
  if (count + 1 >= t.size) start(id);
  return toTournamentView(row(id), userId);
}

export function leaveTournament(userId: string, id: string) {
  const t = row(id);
  if (!t) throw new Error('TOURNAMENT_NOT_FOUND');
  if (t.status !== 'open') throw new Error('TOURNAMENT_STARTED');
  const gone = db
    .prepare('DELETE FROM tournament_players WHERE tournament_id = ? AND user_id = ?')
    .run(id, userId).changes;
  if (!gone) throw new Error('NOT_JOINED');
  if (t.entry_coin > 0) mutateCurrency(userId, 'coin', t.entry_coin, 'tournament_refund', id);
  return toTournamentView(row(id), userId);
}

/**
 * Khai mạc: xếp hạt giống theo rating rồi ghép kiểu 1-N, 2-(N-1)... để hai
 * người mạnh nhất chỉ gặp nhau ở chung kết.
 */
function start(id: string): void {
  const t = row(id);
  const ranked = db
    .prepare(
      `SELECT tp.user_id, u.rating FROM tournament_players tp JOIN users u ON u.id = tp.user_id
       WHERE tp.tournament_id = ? ORDER BY u.rating DESC, tp.joined_at`,
    )
    .all(id) as any[];

  const seedStmt = db.prepare('UPDATE tournament_players SET seed = ? WHERE tournament_id = ? AND user_id = ?');
  ranked.forEach((p, i) => seedStmt.run(i + 1, id, p.user_id));

  const insert = db.prepare(
    'INSERT INTO tournament_matches (tournament_id, round, slot, p1, p2, winner_id, match_id) VALUES (?,?,?,?,?,NULL,NULL)',
  );
  const half = t.size / 2;
  for (let slot = 0; slot < half; slot++) {
    insert.run(id, 1, slot, ranked[slot].user_id, ranked[t.size - 1 - slot].user_id);
  }
  // Các vòng sau để trống, điền dần khi có người thắng.
  for (let round = 2, n = half / 2; n >= 1; round++, n /= 2) {
    for (let slot = 0; slot < n; slot++) insert.run(id, round, slot, null, null);
  }

  db.prepare("UPDATE tournaments SET status = 'running', started_at = ? WHERE id = ?").run(nowMs(), id);
  for (const p of ranked) {
    notify(p.user_id, 'event', 'Giải đấu khai mạc', `${t.name} bắt đầu rồi, vào xem nhánh đấu nhé`, { tournamentId: id });
  }
  openRound(id, 1);
}

/** Mở tất cả trận của một vòng đã đủ hai người. */
function openRound(id: string, round: number): void {
  const t = row(id);
  const pairs = db
    .prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND match_id IS NULL')
    .all(id, round) as any[];
  for (const m of pairs) {
    if (!m.p1 || !m.p2) continue;
    const matchId = startMatch(t.game_type as GameType, m.p1, m.p2);
    if (!matchId) continue;
    db.prepare(
      'UPDATE tournament_matches SET match_id = ? WHERE tournament_id = ? AND round = ? AND slot = ?',
    ).run(matchId, id, round, m.slot);
  }
}

/**
 * Một trận trong nhánh vừa xong. Ghi người thắng, đẩy sang vòng sau, và nếu
 * vòng sau đã đủ cặp thì mở luôn.
 */
export function reportMatch(matchId: string, winnerId: string | null): void {
  const m = db.prepare('SELECT * FROM tournament_matches WHERE match_id = ?').get(matchId) as any;
  if (!m || m.winner_id) return;

  // Hoà hoặc không ai thắng thì lấy hạt giống cao hơn đi tiếp, giải không thể treo.
  const winner =
    winnerId && (winnerId === m.p1 || winnerId === m.p2)
      ? winnerId
      : (db
          .prepare(
            'SELECT user_id FROM tournament_players WHERE tournament_id = ? AND user_id IN (?,?) ORDER BY seed LIMIT 1',
          )
          .get(m.tournament_id, m.p1, m.p2) as any)?.user_id;
  if (!winner) return;

  db.prepare('UPDATE tournament_matches SET winner_id = ? WHERE tournament_id = ? AND round = ? AND slot = ?').run(
    winner,
    m.tournament_id,
    m.round,
    m.slot,
  );

  const t = row(m.tournament_id);
  const rounds = Math.log2(t.size);
  if (m.round >= rounds) return finish(m.tournament_id, winner);

  // Hai slot kề nhau của vòng này gặp nhau ở slot round-sau tương ứng.
  const nextSlot = Math.floor(m.slot / 2);
  const column = m.slot % 2 === 0 ? 'p1' : 'p2';
  db.prepare(
    `UPDATE tournament_matches SET ${column} = ? WHERE tournament_id = ? AND round = ? AND slot = ?`,
  ).run(winner, m.tournament_id, m.round + 1, nextSlot);

  openRound(m.tournament_id, m.round + 1);
}

function finish(id: string, winnerId: string): void {
  const t = row(id);
  if (t.status === 'finished') return;
  db.prepare("UPDATE tournaments SET status = 'finished', winner_id = ?, ended_at = ? WHERE id = ?").run(
    winnerId,
    nowMs(),
    id,
  );

  // Chia giải: vô địch 70%, á quân 30%.
  const pool = prizePool(t);
  const final = db
    .prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ?')
    .get(id, Math.log2(t.size)) as any;
  const runnerUp = final ? (final.p1 === winnerId ? final.p2 : final.p1) : null;

  const champ = Math.round(pool * 0.7);
  if (champ > 0) mutateCurrency(winnerId, 'coin', champ, 'tournament_prize', id);
  notify(winnerId, 'reward', 'Vô địch giải đấu!', `${t.name} — thưởng ${champ} coin`, { tournamentId: id });

  if (runnerUp) {
    const second = pool - champ;
    if (second > 0) mutateCurrency(runnerUp, 'coin', second, 'tournament_prize', id);
    notify(runnerUp, 'reward', 'Á quân giải đấu', `${t.name} — thưởng ${second} coin`, { tournamentId: id });
  }
  for (const uid of playerIds(id)) {
    if (uid !== winnerId && uid !== runnerUp) {
      notify(uid, 'event', 'Giải đấu kết thúc', `${t.name} đã có nhà vô địch`, { tournamentId: id });
    }
  }
}
