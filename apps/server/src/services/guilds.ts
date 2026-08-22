import {
  GuildCheckinState,
  GuildJoinPolicy,
  GuildMemberRow,
  GuildRole,
  GuildSummary,
  guildLevelFromXp,
  guildSlots,
} from '@hago/shared';
import { db, nowMs, today } from '../db';
import { nid } from '../util';
import { toPublicUser } from './users';
import { notify } from './notifications';
import { logGuild } from './guildLog';
import { progressGuildQuests } from './guildQuests';

/**
 * Bang hội.
 *
 * Một người chỉ ở được một bang — ràng buộc đó khoá bằng UNIQUE INDEX trên
 * `guild_members(user_id)` chứ không chỉ kiểm tra trong code, để hai request
 * vào bang cùng lúc không lọt được cả hai.
 *
 * Bang có kênh chat riêng dùng lại hệ thống channel sẵn có (`kind = 'guild'`),
 * nên không phải dựng thêm đường truyền tin nhắn.
 */

const TAG_RE = /^[A-Z0-9]{2,5}$/;

/** Giá lập bang, trừ vào coin để tên bang không bị chiếm bừa. */
export const GUILD_COST = 500;

function row(id: string): any {
  return db.prepare('SELECT * FROM guilds WHERE id = ?').get(id);
}

function memberCount(guildId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM guild_members WHERE guild_id = ?').get(guildId) as any).n;
}

export function toGuildSummary(g: any): GuildSummary {
  const { level, into, need } = guildLevelFromXp(g.xp);
  return {
    id: g.id,
    name: g.name,
    tag: g.tag,
    description: g.description,
    emblem: g.emblem,
    color: g.color,
    joinPolicy: g.join_policy as GuildJoinPolicy,
    minLevel: g.min_level,
    xp: g.xp,
    level,
    into,
    need,
    members: memberCount(g.id),
    slots: guildSlots(level),
    notice: g.notice ?? '',
    noticeBy: g.notice_by ?? null,
    noticeAt: g.notice_at ?? null,
  };
}

/* ------------------------------ thông báo ------------------------------ */

/** Điểm cộng cho bang mỗi lượt điểm danh của một thành viên. */
export const GUILD_CHECKIN_POINTS = 20;

export function setNotice(actorId: string, guildId: string, text: string): GuildSummary {
  requireRole(guildId, actorId, ['owner', 'officer']);
  const notice = String(text ?? '').trim().slice(0, 300);
  db.prepare('UPDATE guilds SET notice = ?, notice_by = ?, notice_at = ? WHERE id = ?').run(
    notice,
    actorId,
    nowMs(),
    guildId,
  );
  logGuild(guildId, 'notice', { actorId, detail: notice.slice(0, 80) });
  // Báo cho cả bang: thông báo mới mà không ai biết thì đặt làm gì.
  for (const m of db.prepare('SELECT user_id FROM guild_members WHERE guild_id = ?').all(guildId) as any[]) {
    if (m.user_id === actorId) continue;
    notify(m.user_id, 'guild', 'Thông báo mới của bang', notice || 'Thông báo đã được gỡ', { guildId });
  }
  return toGuildSummary(row(guildId));
}

/* ----------------------------- điểm danh bang ---------------------------- */

export function guildCheckinState(userId: string): GuildCheckinState | null {
  const m = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(userId) as any;
  if (!m) return null;
  const mine = db
    .prepare('SELECT 1 AS x FROM guild_checkins WHERE guild_id = ? AND user_id = ? AND day = ?')
    .get(m.guild_id, userId, today());
  const count = (
    db.prepare('SELECT COUNT(*) AS n FROM guild_checkins WHERE guild_id = ? AND day = ?').get(m.guild_id, today()) as any
  ).n;
  return { checkedInToday: !!mine, todayCount: count, rewardPoints: GUILD_CHECKIN_POINTS };
}

/**
 * Điểm danh bang. Khác điểm danh cá nhân ở chỗ phần thưởng không phải tiền mà
 * là **điểm đóng góp** — nó chảy vào cả kho bang lẫn sổ công trạng của chính
 * mình, nên đây là cách góp cho bang mà không cần phải thắng trận nào.
 */
export function guildCheckin(userId: string): { points: number; state: GuildCheckinState } {
  const m = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(userId) as any;
  if (!m) throw new Error('NOT_IN_GUILD');
  const dup = db
    .prepare('SELECT 1 AS x FROM guild_checkins WHERE guild_id = ? AND user_id = ? AND day = ?')
    .get(m.guild_id, userId, today());
  if (dup) throw new Error('ALREADY_CLAIMED');

  db.prepare('INSERT INTO guild_checkins (guild_id, user_id, day, created_at) VALUES (?,?,?,?)').run(
    m.guild_id,
    userId,
    today(),
    nowMs(),
  );
  addGuildPoints(userId, GUILD_CHECKIN_POINTS);
  progressGuildQuests(userId, 'guild_checkin', 1);
  return { points: GUILD_CHECKIN_POINTS, state: guildCheckinState(userId)! };
}

/** Kênh chat của bang; tạo cùng lúc với bang và bám theo thành viên. */
function guildChannel(guildId: string): string {
  const id = `guild:${guildId}`;
  db.prepare("INSERT OR IGNORE INTO channels (id, kind, ref_id, created_at) VALUES (?,'guild',?,?)").run(
    id,
    guildId,
    nowMs(),
  );
  return id;
}

function joinChannel(guildId: string, userId: string): void {
  db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?,?)').run(
    guildChannel(guildId),
    userId,
  );
}

function leaveChannel(guildId: string, userId: string): void {
  db.prepare('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?').run(
    `guild:${guildId}`,
    userId,
  );
}

export function guildOf(userId: string): (GuildSummary & { role: GuildRole; points: number }) | null {
  const m = db.prepare('SELECT * FROM guild_members WHERE user_id = ?').get(userId) as any;
  if (!m) return null;
  const g = row(m.guild_id);
  if (!g) return null;
  return { ...toGuildSummary(g), role: m.role as GuildRole, points: m.points };
}

export function listGuilds(query: string, limit = 30): GuildSummary[] {
  const like = `%${query.trim().toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT * FROM guilds
       WHERE (? = '%%' OR lower(name) LIKE ? OR lower(tag) LIKE ?)
       ORDER BY xp DESC, created_at ASC LIMIT ?`,
    )
    .all(like, like, like, limit) as any[];
  return rows.map(toGuildSummary);
}

export function guildMembers(guildId: string): GuildMemberRow[] {
  const rows = db
    .prepare(
      `SELECT gm.role, gm.points, gm.joined_at, u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id,
              (SELECT 1 FROM guild_checkins gc
                WHERE gc.guild_id = gm.guild_id AND gc.user_id = gm.user_id AND gc.day = ?) AS checked
       FROM guild_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE gm.guild_id = ?
       ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, gm.points DESC`,
    )
    .all(today(), guildId) as any[];
  return rows.map((r) => ({
    user: toPublicUser(r),
    role: r.role as GuildRole,
    points: r.points,
    joinedAt: r.joined_at,
    checkedInToday: !!r.checked,
  }));
}

export function pendingRequests(guildId: string) {
  const rows = db
    .prepare(
      `SELECT gr.created_at, u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id
       FROM guild_requests gr
       JOIN users u ON u.id = gr.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE gr.guild_id = ? ORDER BY gr.created_at`,
    )
    .all(guildId) as any[];
  return rows.map((r) => ({ user: toPublicUser(r), createdAt: r.created_at }));
}

export function createGuild(
  userId: string,
  input: { name: string; tag: string; description?: string; emblem?: string; color?: string; joinPolicy?: GuildJoinPolicy; minLevel?: number },
): GuildSummary {
  if (guildOf(userId)) throw new Error('ALREADY_IN_GUILD');
  const name = String(input.name ?? '').trim();
  const tag = String(input.tag ?? '').trim().toUpperCase();
  if (name.length < 3 || name.length > 24) throw new Error('BAD_GUILD_NAME');
  if (!TAG_RE.test(tag)) throw new Error('BAD_GUILD_TAG');

  const id = nid();
  const now = nowMs();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO guilds (id, name, tag, description, emblem, color, owner_id, join_policy, min_level, xp, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
    ).run(
      id,
      name,
      tag,
      String(input.description ?? '').slice(0, 200),
      input.emblem ?? 'crown',
      input.color ?? '#7C6BFF',
      userId,
      input.joinPolicy ?? 'open',
      Math.max(1, Math.min(100, Number(input.minLevel ?? 1))),
      now,
    );
    db.prepare('INSERT INTO guild_members (guild_id, user_id, role, points, joined_at) VALUES (?,?,?,0,?)').run(
      id,
      userId,
      'owner',
      now,
    );
  });
  try {
    tx();
  } catch (e: any) {
    // UNIQUE trên name/tag — báo đúng lỗi thay vì lỗi SQL thô.
    if (String(e.message).includes('UNIQUE')) throw new Error('GUILD_NAME_TAKEN');
    throw e;
  }
  joinChannel(id, userId);
  return toGuildSummary(row(id));
}

/** Vào bang: chính sách 'open' vào thẳng, 'request' xếp hàng chờ duyệt. */
export function joinGuild(userId: string, guildId: string): { joined: boolean } {
  if (guildOf(userId)) throw new Error('ALREADY_IN_GUILD');
  const g = row(guildId);
  if (!g) throw new Error('GUILD_NOT_FOUND');
  if (g.join_policy === 'closed') throw new Error('GUILD_CLOSED');

  const me = db.prepare('SELECT level FROM users WHERE id = ?').get(userId) as any;
  if ((me?.level ?? 1) < g.min_level) throw new Error('LEVEL_TOO_LOW');

  const { level } = guildLevelFromXp(g.xp);
  if (memberCount(guildId) >= guildSlots(level)) throw new Error('GUILD_FULL');

  if (g.join_policy === 'request') {
    db.prepare('INSERT OR IGNORE INTO guild_requests (guild_id, user_id, created_at) VALUES (?,?,?)').run(
      guildId,
      userId,
      nowMs(),
    );
    for (const m of db
      .prepare("SELECT user_id FROM guild_members WHERE guild_id = ? AND role IN ('owner','officer')")
      .all(guildId) as any[]) {
      notify(m.user_id, 'guild', 'Có người xin vào bang', `Xem danh sách chờ của ${g.name}`, { guildId });
    }
    return { joined: false };
  }

  addMember(guildId, userId);
  logGuild(guildId, 'join', { targetId: userId });
  return { joined: true };
}

function addMember(guildId: string, userId: string, role: GuildRole = 'member'): void {
  db.prepare('INSERT INTO guild_members (guild_id, user_id, role, points, joined_at) VALUES (?,?,?,0,?)').run(
    guildId,
    userId,
    role,
    nowMs(),
  );
  db.prepare('DELETE FROM guild_requests WHERE user_id = ?').run(userId);
  joinChannel(guildId, userId);
}

function requireRole(guildId: string, userId: string, roles: GuildRole[]): any {
  const m = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, userId) as any;
  if (!m || !roles.includes(m.role)) throw new Error('NOT_ALLOWED');
  return m;
}

export function reviewRequest(actorId: string, guildId: string, targetId: string, accept: boolean): void {
  requireRole(guildId, actorId, ['owner', 'officer']);
  const g = row(guildId);
  const pending = db
    .prepare('SELECT 1 AS x FROM guild_requests WHERE guild_id = ? AND user_id = ?')
    .get(guildId, targetId);
  if (!pending) throw new Error('NO_REQUEST');
  db.prepare('DELETE FROM guild_requests WHERE guild_id = ? AND user_id = ?').run(guildId, targetId);
  if (!accept) {
    notify(targetId, 'guild', 'Đơn vào bang bị từ chối', `${g.name} chưa nhận bạn lần này`, { guildId });
    return;
  }
  if (guildOf(targetId)) throw new Error('ALREADY_IN_GUILD');
  const { level } = guildLevelFromXp(g.xp);
  if (memberCount(guildId) >= guildSlots(level)) throw new Error('GUILD_FULL');
  addMember(guildId, targetId);
  logGuild(guildId, 'join', { actorId, targetId });
  notify(targetId, 'guild', 'Được nhận vào bang', `Chào mừng tới ${g.name}`, { guildId });
}

export function leaveGuild(userId: string): void {
  const m = db.prepare('SELECT * FROM guild_members WHERE user_id = ?').get(userId) as any;
  if (!m) throw new Error('NOT_IN_GUILD');
  if (m.role === 'owner' && memberCount(m.guild_id) > 1) throw new Error('OWNER_MUST_TRANSFER');
  db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(userId);
  leaveChannel(m.guild_id, userId);
  logGuild(m.guild_id, 'leave', { targetId: userId });
  // Chủ bang rời khi không còn ai thì giải tán luôn, khỏi để bang ma.
  if (m.role === 'owner') db.prepare('DELETE FROM guilds WHERE id = ?').run(m.guild_id);
}

export function kickMember(actorId: string, guildId: string, targetId: string): void {
  const actor = requireRole(guildId, actorId, ['owner', 'officer']);
  const target = db
    .prepare('SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?')
    .get(guildId, targetId) as any;
  if (!target) throw new Error('NOT_A_MEMBER');
  if (target.role === 'owner') throw new Error('CANNOT_KICK_OWNER');
  // Sĩ quan chỉ đuổi được thành viên thường, không đuổi được sĩ quan khác.
  if (actor.role === 'officer' && target.role === 'officer') throw new Error('NOT_ALLOWED');
  db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?').run(guildId, targetId);
  leaveChannel(guildId, targetId);
  logGuild(guildId, 'kick', { actorId, targetId });
  notify(targetId, 'guild', 'Bạn đã rời bang', `Bạn không còn trong ${row(guildId)?.name ?? 'bang'}`, { guildId });
}

export function setRole(actorId: string, guildId: string, targetId: string, role: GuildRole): void {
  requireRole(guildId, actorId, ['owner']);
  if (targetId === actorId) throw new Error('NOT_ALLOWED');
  const target = db
    .prepare('SELECT 1 AS x FROM guild_members WHERE guild_id = ? AND user_id = ?')
    .get(guildId, targetId);
  if (!target) throw new Error('NOT_A_MEMBER');

  if (role === 'owner') {
    // Nhường ghế chủ: đổi cả hai trong một transaction, không để bang hai chủ.
    const tx = db.transaction(() => {
      db.prepare("UPDATE guild_members SET role = 'member' WHERE guild_id = ? AND user_id = ?").run(guildId, actorId);
      db.prepare("UPDATE guild_members SET role = 'owner' WHERE guild_id = ? AND user_id = ?").run(guildId, targetId);
      db.prepare('UPDATE guilds SET owner_id = ? WHERE id = ?').run(targetId, guildId);
    });
    tx();
    logGuild(guildId, 'role', { actorId, targetId, detail: 'owner' });
    notify(targetId, 'guild', 'Bạn là chủ bang mới', `Bạn tiếp quản ${row(guildId)?.name ?? 'bang'}`, { guildId });
    return;
  }
  db.prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND user_id = ?').run(role, guildId, targetId);
  logGuild(guildId, 'role', { actorId, targetId, detail: role });
}

export function updateGuild(
  actorId: string,
  guildId: string,
  patch: { description?: string; emblem?: string; color?: string; joinPolicy?: GuildJoinPolicy; minLevel?: number },
): GuildSummary {
  requireRole(guildId, actorId, ['owner', 'officer']);
  const g = row(guildId);
  db.prepare(
    'UPDATE guilds SET description = ?, emblem = ?, color = ?, join_policy = ?, min_level = ? WHERE id = ?',
  ).run(
    patch.description !== undefined ? String(patch.description).slice(0, 200) : g.description,
    patch.emblem ?? g.emblem,
    patch.color ?? g.color,
    patch.joinPolicy ?? g.join_policy,
    patch.minLevel !== undefined ? Math.max(1, Math.min(100, Number(patch.minLevel))) : g.min_level,
    guildId,
  );
  return toGuildSummary(row(guildId));
}

/**
 * Cộng điểm đóng góp sau mỗi trận. Điểm vào cả kho chung của bang lẫn sổ riêng
 * của thành viên, nên bảng xếp hạng bang và bảng công trạng trong bang dùng
 * chung một nguồn số.
 */
export function addGuildPoints(userId: string, points: number): void {
  if (points <= 0) return;
  const m = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(userId) as any;
  if (!m) return;
  const tx = db.transaction(() => {
    db.prepare('UPDATE guild_members SET points = points + ? WHERE user_id = ?').run(points, userId);
    db.prepare('UPDATE guilds SET xp = xp + ? WHERE id = ?').run(points, m.guild_id);
  });
  tx();
}

/** Bảng xếp hạng bang theo tổng điểm đóng góp. */
export function guildLeaderboard(limit = 50): GuildSummary[] {
  const rows = db.prepare('SELECT * FROM guilds ORDER BY xp DESC, created_at ASC LIMIT ?').all(limit) as any[];
  return rows.map(toGuildSummary);
}
