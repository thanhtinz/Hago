import { GAME_CATALOG, GameType } from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';
import { mutateCurrency } from './economy';
import { logGuild } from './guildLog';
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
 *
 * Giải có hai loại. Giải chung do admin mở, ai cũng đăng ký được. Giải bang do
 * chủ bang mở (`guild_id` khác NULL), chỉ thành viên bang đó vào được và chỉ
 * hiện trong trang bang — hai danh sách không lẫn vào nhau.
 *
 * Giải hẹn giờ được: đặt `start_at` thì đủ suất cũng chưa chạy, phải tới giờ mới
 * khai mạc. Và mỗi cặp có **cửa sổ xác nhận có mặt** (`no_show_ms`): tới lượt thì
 * hai bên phải bấm vào trận, hết giờ mà chỉ một người có mặt thì người kia bị xử
 * thua vắng mặt — không thì cả nhánh đứng chờ một người đã đi ngủ.
 */

export const TOURNAMENT_SIZES = [4, 8, 16] as const;

/** Gateway gắn hàm mở trận vào đây; service không gọi ngược lên tầng realtime. */
type StartMatch = (gameType: GameType, a: string, b: string, tournamentId: string) => string | null;
let startMatch: StartMatch = () => null;
export function bindTournamentRunner(fn: StartMatch): void {
  startMatch = fn;
}

/**
 * Báo cho một người biết lời gọi vào trận của họ vừa đổi (mở ra, đối thủ đã
 * sẵn sàng, hoặc đã đóng). Gateway đẩy qua socket; ở đây chỉ biết gọi hàm.
 */
type Announce = (userId: string, call: PendingCall | null) => void;
let announce: Announce = () => {};
export function bindTournamentAnnouncer(fn: Announce): void {
  announce = fn;
}

export interface PendingCall {
  tournamentId: string;
  name: string;
  gameType: GameType;
  deadline: number;
  opponentName: string;
  iAmReady: boolean;
  rivalReady: boolean;
}

/**
 * Cặp đang chờ người này xác nhận, tìm trên **mọi giải** chứ không riêng một
 * giải: người chơi cần thấy lời gọi dù đang đứng ở màn nào trong app.
 */
export function pendingCall(userId: string): PendingCall | null {
  const m = db
    .prepare(
      `SELECT tm.*, t.name, t.game_type FROM tournament_matches tm
       JOIN tournaments t ON t.id = tm.tournament_id
       WHERE tm.ready_deadline IS NOT NULL AND tm.winner_id IS NULL AND tm.match_id IS NULL
         AND t.status = 'running' AND (tm.p1 = ? OR tm.p2 = ?)
       ORDER BY tm.ready_deadline LIMIT 1`,
    )
    .get(userId, userId) as any;
  if (!m) return null;
  const mine = m.p1 === userId;
  const rivalId = mine ? m.p2 : m.p1;
  return {
    tournamentId: m.tournament_id,
    name: m.name,
    gameType: m.game_type as GameType,
    deadline: m.ready_deadline,
    opponentName: (db.prepare('SELECT display_name FROM users WHERE id = ?').get(rivalId) as any)?.display_name ?? '—',
    iAmReady: !!(mine ? m.ready_p1 : m.ready_p2),
    rivalReady: !!(mine ? m.ready_p2 : m.ready_p1),
  };
}

/** Đẩy trạng thái lời gọi mới nhất cho từng người trong danh sách. */
function announceTo(userIds: (string | null)[]): void {
  for (const uid of userIds) if (uid) announce(uid, pendingCall(uid));
}

const row = (id: string): any => db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);

const playerIds = (id: string): string[] =>
  (db.prepare('SELECT user_id FROM tournament_players WHERE tournament_id = ? ORDER BY seed, joined_at').all(id) as any[])
    .map((r) => r.user_id);

const playerCount = (id: string): number =>
  (db.prepare('SELECT COUNT(*) AS n FROM tournament_players WHERE tournament_id = ?').get(id) as any).n;

/**
 * Tổng giải thưởng: tiền treo sẵn cộng lệ phí **đã thu thật**. Tính theo số
 * suất tối đa thì lúc giải chưa đầy con số hiện ra là tiền không có thật, mà
 * chủ giải lại được bấm bắt đầu sớm.
 */
const prizePool = (t: any): number => t.base_prize + t.entry_coin * playerCount(t.id);

/** Số nhánh của bảng: luỹ thừa 2 gần nhất không nhỏ hơn số người, tối thiểu 2. */
export function bracketSizeFor(players: number): number {
  let n = 2;
  while (n < players) n *= 2;
  return n;
}

/** Cỡ bảng đang dùng — khai mạc rồi thì lấy cỡ đã chốt, chưa thì lấy sức chứa. */
const sizeOf = (t: any): number => t.bracket_size || t.size;

/** Cửa sổ xác nhận có mặt mặc định của giải bang. */
export const DEFAULT_NO_SHOW_MS = 5 * 60_000;
/** Chặn trên cho cửa sổ chờ: quá nửa tiếng thì cả bang ngồi không. */
export const MAX_NO_SHOW_MS = 30 * 60_000;
/** Hẹn giờ xa nhất: 7 ngày. Xa hơn thì người đăng ký quên mất là có giải. */
export const MAX_SCHEDULE_MS = 7 * 86400_000;

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
  const bracketSize = sizeOf(t);
  return {
    id: t.id,
    name: t.name,
    gameType: t.game_type,
    size: t.size,
    bracketSize,
    guildId: t.guild_id ?? null,
    hostId: t.host_id ?? null,
    /** Chủ giải mới thấy nút bắt đầu sớm và huỷ giải. */
    isHost: !!viewerId && t.host_id === viewerId,
    entryCoin: t.entry_coin,
    prizePool: prizePool(t),
    status: t.status,
    winnerId: t.winner_id,
    startAt: t.start_at ?? null,
    noShowMs: t.no_show_ms ?? 0,
    startedAt: t.started_at,
    endedAt: t.ended_at,
    joined: viewerId ? players.some((p) => p.id === viewerId) : false,
    players: players.map((p) => ({ user: toPublicUser(p), seed: p.seed })),
    rounds: Math.log2(bracketSize),
    bracket: matches.map((m) => ({
      round: m.round,
      slot: m.slot,
      p1: m.p1,
      p2: m.p2,
      winnerId: m.winner_id,
      matchId: m.match_id,
      readyDeadline: m.ready_deadline ?? null,
      ready: [!!m.ready_p1, !!m.ready_p2],
    })),
    // Lời gọi vào trận dành riêng cho người đang xem: client chỉ cần đọc chỗ này
    // là biết có phải bấm gì không, khỏi tự dò cả nhánh.
    call: viewerId ? callFor(matches, viewerId) : null,
  };
}

/** Cặp đang chờ chính người này xác nhận có mặt, nếu có. */
function callFor(matches: any[], viewerId: string) {
  const m = matches.find(
    (x) => x.ready_deadline && !x.winner_id && !x.match_id && (x.p1 === viewerId || x.p2 === viewerId),
  );
  if (!m) return null;
  const mine = m.p1 === viewerId;
  return {
    round: m.round,
    slot: m.slot,
    deadline: m.ready_deadline,
    opponentId: mine ? m.p2 : m.p1,
    iAmReady: !!(mine ? m.ready_p1 : m.ready_p2),
    rivalReady: !!(mine ? m.ready_p2 : m.ready_p1),
  };
}

/** Giải chung. Giải của bang bị lọc ra — chỗ của nó là trang bang. */
export function listTournaments(viewerId?: string) {
  const rows = db
    .prepare(
      `SELECT * FROM tournaments WHERE guild_id IS NULL AND (status <> 'finished' OR ended_at > ?)
       ORDER BY created_at DESC LIMIT 20`,
    )
    .all(nowMs() - 3 * 86400_000) as any[];
  return rows.map((t) => toTournamentView(t, viewerId));
}

/** Giải của một bang, kể cả giải đã xong để còn xem lại nhà vô địch. */
export function listGuildTournaments(guildId: string, viewerId?: string) {
  const rows = db
    .prepare('SELECT * FROM tournaments WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(guildId) as any[];
  return rows.map((t) => toTournamentView(t, viewerId));
}

export function createTournament(input: {
  name: string;
  gameType: GameType;
  size: number;
  entryCoin?: number;
  basePrize?: number;
  guildId?: string | null;
  hostId?: string | null;
  /** Mốc thời gian khai mạc; bỏ trống thì đủ suất là chạy. */
  startAt?: number | null;
  /** Cửa sổ xác nhận có mặt của mỗi cặp, tính bằng mili giây. */
  noShowMs?: number;
}) {
  const meta = GAME_CATALOG[input.gameType];
  if (!meta) throw new Error('GAME_NOT_FOUND');
  if (meta.maxPlayers !== 2 || meta.minPlayers !== 2) throw new Error('GAME_NOT_ELIGIBLE');
  if (!TOURNAMENT_SIZES.includes(input.size as any)) throw new Error('BAD_SIZE');

  const startAt = input.startAt ? Math.floor(Number(input.startAt)) : null;
  if (startAt !== null) {
    // Hẹn vào quá khứ thì giải khai mạc ngay ở nhịp quét sau, người đăng ký
    // không kịp trở tay; hẹn quá xa thì tới hôm đó chẳng ai nhớ.
    if (!Number.isFinite(startAt) || startAt < nowMs()) throw new Error('BAD_START_TIME');
    if (startAt > nowMs() + MAX_SCHEDULE_MS) throw new Error('SCHEDULE_TOO_FAR');
  }
  const noShowMs = Math.min(MAX_NO_SHOW_MS, Math.max(0, Math.floor(Number(input.noShowMs ?? 0))));

  const id = nid();
  db.prepare(
    `INSERT INTO tournaments (id, name, game_type, size, entry_coin, base_prize, status, created_at, guild_id,
                              host_id, start_at, no_show_ms)
     VALUES (?,?,?,?,?,?,'open',?,?,?,?,?)`,
  ).run(
    id,
    String(input.name ?? '').trim().slice(0, 40) || `Giải ${meta.name}`,
    input.gameType,
    input.size,
    Math.max(0, Number(input.entryCoin ?? 0)),
    Math.max(0, Number(input.basePrize ?? 0)),
    nowMs(),
    input.guildId ?? null,
    input.hostId ?? null,
    startAt,
    noShowMs,
  );
  return toTournamentView(row(id), input.hostId ?? undefined);
}

/* --------------------------- giải đấu của bang --------------------------- */

/** Chức vụ trong bang, hoặc null nếu không phải thành viên. */
function guildRole(guildId: string, userId: string): string | null {
  const m = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, userId) as any;
  return m?.role ?? null;
}

/**
 * Chủ bang mở giải cho bang mình.
 *
 * Tiền treo giải trừ thẳng vào ví người mở chứ không sinh ra từ hư không —
 * không thì ai cũng gõ được một con số to rồi tự đăng ký lấy về. Lệ phí thì
 * vẫn thu của người đăng ký như giải chung.
 */
export function createGuildTournament(
  userId: string,
  guildId: string,
  input: {
    name?: string;
    gameType: GameType;
    size: number;
    entryCoin?: number;
    basePrize?: number;
    startAt?: number | null;
    noShowMinutes?: number;
  },
) {
  if (guildRole(guildId, userId) !== 'owner') throw new Error('NOT_ALLOWED');
  const open = db
    .prepare("SELECT COUNT(*) AS n FROM tournaments WHERE guild_id = ? AND status <> 'finished'")
    .get(guildId) as any;
  // Một giải đang chạy tại một thời điểm: mở chồng nhau thì thành viên bị gọi
  // vào hai trận cùng lúc, mà nhánh nào cũng cần họ đánh xong mới đi tiếp.
  if (open.n >= 1) throw new Error('TOURNAMENT_ONGOING');

  const basePrize = Math.max(0, Math.floor(Number(input.basePrize ?? 0)));
  if (basePrize > 0) mutateCurrency(userId, 'coin', -basePrize, 'guild_tournament_prize', guildId);

  // Giải bang mặc định có cửa sổ chờ: thành viên bang không ngồi sẵn trong app
  // cả ngày như người đang bấm tìm trận, phải cho họ vài phút để vào.
  const noShowMs =
    input.noShowMinutes === undefined ? DEFAULT_NO_SHOW_MS : Math.round(Number(input.noShowMinutes) * 60_000);

  let t;
  try {
    t = createTournament({ ...input, name: input.name ?? '', basePrize, guildId, hostId: userId, noShowMs });
  } catch (e) {
    if (basePrize > 0) mutateCurrency(userId, 'coin', basePrize, 'guild_tournament_refund', guildId);
    throw e;
  }

  logGuild(guildId, 'tournament', { actorId: userId, detail: `mở giải ${t.name}` });
  for (const m of db.prepare('SELECT user_id FROM guild_members WHERE guild_id = ?').all(guildId) as any[]) {
    if (m.user_id === userId) continue;
    notify(m.user_id, 'guild', 'Bang mở giải đấu', `${t.name} — vào đăng ký trước khi hết suất nhé`, {
      guildId,
      tournamentId: t.id,
    });
  }
  return t;
}

/** Chủ giải bấm khai mạc sớm; bảng thu về vừa số người đã đăng ký. */
export function startTournament(userId: string, id: string) {
  const t = row(id);
  if (!t) throw new Error('TOURNAMENT_NOT_FOUND');
  if (t.host_id !== userId) throw new Error('NOT_ALLOWED');
  if (t.status !== 'open') throw new Error('TOURNAMENT_STARTED');
  if (playerCount(id) < 2) throw new Error('NOT_ENOUGH_PLAYERS');
  start(id);
  return toTournamentView(row(id), userId);
}

/** Huỷ giải khi chưa khai mạc: hoàn lệ phí cho người đăng ký và tiền treo cho chủ giải. */
export function cancelTournament(userId: string, id: string) {
  const t = row(id);
  if (!t) throw new Error('TOURNAMENT_NOT_FOUND');
  if (t.host_id !== userId) throw new Error('NOT_ALLOWED');
  if (t.status !== 'open') throw new Error('TOURNAMENT_STARTED');

  for (const uid of playerIds(id)) {
    if (t.entry_coin > 0) mutateCurrency(uid, 'coin', t.entry_coin, 'tournament_refund', id);
    if (uid !== userId) notify(uid, 'event', 'Giải đấu bị huỷ', `${t.name} đã huỷ, lệ phí đã hoàn lại`, {});
  }
  if (t.base_prize > 0) mutateCurrency(userId, 'coin', t.base_prize, 'guild_tournament_refund', id);
  if (t.guild_id) logGuild(t.guild_id, 'tournament', { actorId: userId, detail: `huỷ giải ${t.name}` });
  // Xoá hẳn: giải chưa đá thì giữ lại chẳng để làm gì, mà còn chắn chỗ của
  // giải sau vì mỗi bang chỉ được một giải đang mở.
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
  return { ok: true };
}

/* ------------------------------ đăng ký ------------------------------ */

export function joinTournament(userId: string, id: string) {
  const t = row(id);
  if (!t) throw new Error('TOURNAMENT_NOT_FOUND');
  if (t.status !== 'open') throw new Error('TOURNAMENT_STARTED');
  // Giải của bang là sân riêng: người ngoài có id giải cũng không chen vào được.
  if (t.guild_id && !guildRole(t.guild_id, userId)) throw new Error('NOT_IN_GUILD');
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

  // Đủ suất là khai mạc luôn — trừ khi giải đã hẹn giờ, khi ấy phải đợi đúng
  // giờ đã hẹn, không thì người đăng ký sớm bị gọi vào trận lúc chưa sẵn sàng.
  if (count + 1 >= t.size && !t.start_at) start(id);
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
 *
 * Bảng lấy đúng cỡ luỹ thừa 2 vừa đủ chứa số người đã đăng ký, không phải sức
 * chứa đã khai báo — chủ giải bấm bắt đầu sớm với 5 người thì đó là bảng 8 chứ
 * không phải bảng 16 rỗng hoác. Ghép 1-N kiểu này khiến chỗ trống rơi đúng vào
 * đối thủ của các hạt giống đầu, nên **miễn vòng đầu chỉ có ở vòng 1** và mỗi
 * cặp nhiều nhất một suất trống — nhánh vẫn cân.
 */
function start(id: string): void {
  const t = row(id);
  const ranked = db
    .prepare(
      `SELECT tp.user_id, u.rating FROM tournament_players tp JOIN users u ON u.id = tp.user_id
       WHERE tp.tournament_id = ? ORDER BY u.rating DESC, tp.joined_at`,
    )
    .all(id) as any[];
  if (ranked.length < 2) return;

  const size = Math.min(t.size, bracketSizeFor(ranked.length));
  db.prepare('UPDATE tournaments SET bracket_size = ? WHERE id = ?').run(size, id);

  const seedStmt = db.prepare('UPDATE tournament_players SET seed = ? WHERE tournament_id = ? AND user_id = ?');
  ranked.forEach((p, i) => seedStmt.run(i + 1, id, p.user_id));

  const insert = db.prepare(
    'INSERT INTO tournament_matches (tournament_id, round, slot, p1, p2, winner_id, match_id) VALUES (?,?,?,?,?,NULL,NULL)',
  );
  const half = size / 2;
  for (let slot = 0; slot < half; slot++) {
    insert.run(id, 1, slot, ranked[slot]?.user_id ?? null, ranked[size - 1 - slot]?.user_id ?? null);
  }
  // Các vòng sau để trống, điền dần khi có người thắng.
  for (let round = 2, n = half / 2; n >= 1; round++, n /= 2) {
    for (let slot = 0; slot < n; slot++) insert.run(id, round, slot, null, null);
  }

  db.prepare("UPDATE tournaments SET status = 'running', started_at = ? WHERE id = ?").run(nowMs(), id);
  for (const p of ranked) {
    notify(p.user_id, 'event', 'Giải đấu khai mạc', `${t.name} bắt đầu rồi, vào xem nhánh đấu nhé`, { tournamentId: id });
  }
  // Cho người được miễn đi tiếp trước, rồi mới mở các cặp thật của vòng 1.
  resolveByes(id, 1);
  openRound(id, 1);
}

/**
 * Cặp chỉ có một người thì người đó vào thẳng vòng sau, không phải chờ ai.
 * Chạy trước `openRound` để `startMatch` không bị gọi với một bên là null.
 */
function resolveByes(id: string, round: number): void {
  const pairs = db
    .prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND winner_id IS NULL')
    .all(id, round) as any[];
  for (const m of pairs) {
    const lone = m.p1 && !m.p2 ? m.p1 : !m.p1 && m.p2 ? m.p2 : null;
    if (lone) advance(id, m.round, m.slot, lone);
  }
}

/**
 * Ghi người thắng một cặp và đẩy sang vòng sau. Tách riêng vì cả trận thật lẫn
 * suất miễn vòng đầu đều đi qua đây.
 */
function advance(id: string, round: number, slot: number, winner: string): void {
  db.prepare(
    'UPDATE tournament_matches SET ready_deadline = NULL WHERE tournament_id = ? AND round = ? AND slot = ?',
  ).run(id, round, slot);
  db.prepare('UPDATE tournament_matches SET winner_id = ? WHERE tournament_id = ? AND round = ? AND slot = ?').run(
    winner,
    id,
    round,
    slot,
  );

  const rounds = Math.log2(sizeOf(row(id)));
  if (round >= rounds) return finish(id, winner);

  // Hai slot kề nhau của vòng này gặp nhau ở slot round-sau tương ứng.
  const column = slot % 2 === 0 ? 'p1' : 'p2';
  db.prepare(`UPDATE tournament_matches SET ${column} = ? WHERE tournament_id = ? AND round = ? AND slot = ?`).run(
    winner,
    id,
    round + 1,
    Math.floor(slot / 2),
  );
  openRound(id, round + 1);
}

/**
 * Mở tất cả cặp đã đủ hai người của một vòng.
 *
 * Giải không đặt cửa sổ chờ thì vào trận thẳng như cũ. Có cửa sổ chờ thì chỉ
 * gọi tên và bấm giờ; trận thật chỉ mở khi cả hai bấm vào trận, hoặc bị xử vắng
 * mặt khi hết giờ (`resolveNoShows`).
 */
function openRound(id: string, round: number): void {
  const t = row(id);
  const pairs = db
    .prepare(
      `SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ?
       AND match_id IS NULL AND winner_id IS NULL AND ready_deadline IS NULL`,
    )
    .all(id, round) as any[];
  for (const m of pairs) {
    if (!m.p1 || !m.p2) continue;
    if (!t.no_show_ms) {
      launchPair(t, m);
      continue;
    }
    const deadline = nowMs() + t.no_show_ms;
    db.prepare(
      'UPDATE tournament_matches SET ready_deadline = ? WHERE tournament_id = ? AND round = ? AND slot = ?',
    ).run(deadline, id, round, m.slot);
    const mins = Math.round(t.no_show_ms / 60_000);
    for (const uid of [m.p1, m.p2]) {
      notify(uid, 'event', 'Tới lượt bạn thi đấu', `${t.name} — vào trận trong ${mins} phút, không thì xử thua`, {
        tournamentId: id,
      });
    }
    announceTo([m.p1, m.p2]);
  }
}

/** Mở trận thật cho một cặp và ghi lại `match_id`. */
function launchPair(t: any, m: any): boolean {
  const matchId = startMatch(t.game_type as GameType, m.p1, m.p2, t.id);
  if (!matchId) return false;
  db.prepare('UPDATE tournament_matches SET match_id = ? WHERE tournament_id = ? AND round = ? AND slot = ?').run(
    matchId,
    t.id,
    m.round,
    m.slot,
  );
  announceTo([m.p1, m.p2]);
  return true;
}

/**
 * Xác nhận có mặt. Cả hai bấm xong là trận mở ngay, không đợi hết cửa sổ —
 * đúng giờ mà cả hai đã sẵn sàng thì bắt chờ thêm chẳng để làm gì.
 */
export function markReady(userId: string, tournamentId: string) {
  const t = row(tournamentId);
  if (!t) throw new Error('TOURNAMENT_NOT_FOUND');
  if (t.status !== 'running') throw new Error('TOURNAMENT_NOT_RUNNING');
  const m = db
    .prepare(
      `SELECT * FROM tournament_matches WHERE tournament_id = ? AND ready_deadline IS NOT NULL
       AND winner_id IS NULL AND match_id IS NULL AND (p1 = ? OR p2 = ?)`,
    )
    .get(tournamentId, userId, userId) as any;
  if (!m) throw new Error('NO_PENDING_MATCH');

  const col = m.p1 === userId ? 'ready_p1' : 'ready_p2';
  db.prepare(
    `UPDATE tournament_matches SET ${col} = ? WHERE tournament_id = ? AND round = ? AND slot = ?`,
  ).run(nowMs(), tournamentId, m.round, m.slot);

  const both = (m.p1 === userId ? m.ready_p2 : m.ready_p1) != null;
  if (both) launchPair(t, m);
  announceTo([m.p1, m.p2]);
  return toTournamentView(row(tournamentId), userId);
}

/**
 * Hết cửa sổ chờ mà chưa đủ mặt: ai có mặt thì đi tiếp, cả hai vắng thì hạt
 * giống cao hơn đi tiếp — giải không được phép treo vì một người bỏ cuộc.
 */
function resolveNoShows(now: number): void {
  const due = db
    .prepare(
      `SELECT * FROM tournament_matches WHERE ready_deadline IS NOT NULL AND ready_deadline <= ?
       AND winner_id IS NULL AND match_id IS NULL`,
    )
    .all(now) as any[];

  for (const m of due) {
    const t = row(m.tournament_id);
    if (!t || t.status !== 'running') continue;

    const p1Ready = m.ready_p1 != null;
    const p2Ready = m.ready_p2 != null;
    // Cả hai đã có mặt thì tuyệt đối không xử vắng mặt, kể cả khi trận chưa mở
    // được vì ai đó đang dở ván khác: họ đã làm đúng phần của mình, cứ để
    // `retryPendingPairs` mở khi rảnh.
    if (p1Ready && p2Ready) {
      launchPair(t, m);
      continue;
    }

    const winner = p1Ready ? m.p1 : p2Ready ? m.p2 : seedWinner(m);
    if (!winner) continue;
    const loser = winner === m.p1 ? m.p2 : m.p1;

    db.prepare('UPDATE tournament_matches SET ready_deadline = NULL WHERE tournament_id = ? AND round = ? AND slot = ?')
      .run(m.tournament_id, m.round, m.slot);
    notify(winner, 'event', 'Thắng do đối thủ vắng mặt', `${t.name} — bạn được đi tiếp`, { tournamentId: t.id });
    if (loser) notify(loser, 'event', 'Bị xử thua vắng mặt', `${t.name} — bạn không vào trận kịp giờ`, { tournamentId: t.id });
    advance(m.tournament_id, m.round, m.slot, winner);
    announceTo([m.p1, m.p2]);
  }
}

/** Không ai có mặt thì lấy hạt giống cao hơn — dùng chung với luật hoà. */
function seedWinner(m: any): string | null {
  return (
    (db
      .prepare(
        'SELECT user_id FROM tournament_players WHERE tournament_id = ? AND user_id IN (?,?) ORDER BY seed LIMIT 1',
      )
      .get(m.tournament_id, m.p1, m.p2) as any)?.user_id ?? null
  );
}

/**
 * Nhịp quét của giải: tới giờ thì khai mạc, hết cửa sổ chờ thì xử vắng mặt.
 * Gọi từ vòng lặp chính của gateway.
 */
/**
 * Mở lại những cặp đã đủ điều kiện đánh mà chưa có trận thật.
 *
 * Gateway từ chối mở trận khi một trong hai người đang dở trận khác — không thì
 * họ bị kéo ra khỏi ván đang đánh và thua bên đó. Cặp ấy nằm chờ ở đây cho tới
 * lúc cả hai rảnh; không có vòng thử lại này thì nhánh treo vĩnh viễn.
 */
function retryPendingPairs(): void {
  const pairs = db
    .prepare(
      `SELECT tm.* FROM tournament_matches tm JOIN tournaments t ON t.id = tm.tournament_id
       WHERE t.status = 'running' AND tm.match_id IS NULL AND tm.winner_id IS NULL
         AND tm.p1 IS NOT NULL AND tm.p2 IS NOT NULL
         AND (tm.ready_deadline IS NULL OR (tm.ready_p1 IS NOT NULL AND tm.ready_p2 IS NOT NULL))`,
    )
    .all() as any[];
  for (const m of pairs) launchPair(row(m.tournament_id), m);
}

export function tickTournaments(now: number): void {
  const dueStart = db
    .prepare("SELECT * FROM tournaments WHERE status = 'open' AND start_at IS NOT NULL AND start_at <= ?")
    .all(now) as any[];
  for (const t of dueStart) {
    if (playerCount(t.id) >= 2) {
      start(t.id);
      continue;
    }
    // Tới giờ mà không đủ hai người: huỷ và hoàn tiền thay vì để giải nằm đó
    // chắn chỗ, vì mỗi bang chỉ được một giải chưa kết thúc.
    for (const uid of playerIds(t.id)) {
      if (t.entry_coin > 0) mutateCurrency(uid, 'coin', t.entry_coin, 'tournament_refund', t.id);
      notify(uid, 'event', 'Giải không đủ người', `${t.name} đã huỷ, lệ phí đã hoàn lại`, {});
    }
    if (t.base_prize > 0 && t.host_id) {
      mutateCurrency(t.host_id, 'coin', t.base_prize, 'guild_tournament_refund', t.id);
      notify(t.host_id, 'event', 'Giải không đủ người', `${t.name} đã huỷ, tiền treo giải đã hoàn lại`, {});
    }
    if (t.guild_id) logGuild(t.guild_id, 'tournament', { detail: `giải ${t.name} huỷ vì không đủ người` });
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(t.id);
  }

  resolveNoShows(now);
  retryPendingPairs();
}

/**
 * Một trận trong nhánh vừa xong. Ghi người thắng, đẩy sang vòng sau, và nếu
 * vòng sau đã đủ cặp thì mở luôn.
 */
export function reportMatch(matchId: string, winnerId: string | null): void {
  const m = db.prepare('SELECT * FROM tournament_matches WHERE match_id = ?').get(matchId) as any;
  if (!m || m.winner_id) return;

  // Hoà hoặc không ai thắng thì lấy hạt giống cao hơn đi tiếp, giải không thể treo.
  const winner = winnerId && (winnerId === m.p1 || winnerId === m.p2) ? winnerId : seedWinner(m);
  if (!winner) return;

  db.prepare('UPDATE tournament_matches SET winner_id = ? WHERE tournament_id = ? AND round = ? AND slot = ?').run(
    winner,
    m.tournament_id,
    m.round,
    m.slot,
  );

  advance(m.tournament_id, m.round, m.slot, winner);
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
    .get(id, Math.log2(sizeOf(t))) as any;
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
  if (t.guild_id) logGuild(t.guild_id, 'tournament', { targetId: winnerId, detail: `vô địch ${t.name}` });
}
