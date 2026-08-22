import { GuildLogKind, GuildLogRow } from '@hago/shared';
import { db, nowMs } from '../db';
import { nid } from '../util';

/**
 * Nhật ký bang. Để riêng một file vì cả `guilds.ts` lẫn `guildQuests.ts` đều
 * ghi vào đây — nhét chung vào một trong hai thì hai file phải nhập lẫn nhau.
 */

/**
 * Lưu **tên** người tại thời điểm đó chứ không chỉ id: đổi tên hay xoá tài
 * khoản thì dòng cũ vẫn đọc được, mà cũng khỏi join ngược bảng users mỗi lần đọc.
 */
export function logGuild(
  guildId: string,
  kind: GuildLogKind,
  opts: { actorId?: string | null; targetId?: string | null; detail?: string } = {},
): void {
  const name = (id?: string | null) =>
    id ? ((db.prepare('SELECT display_name FROM users WHERE id = ?').get(id) as any)?.display_name ?? null) : null;
  db.prepare(
    'INSERT INTO guild_logs (id, guild_id, kind, actor_name, target_name, detail, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(nid(), guildId, kind, name(opts.actorId), name(opts.targetId), opts.detail ?? '', nowMs());
}

export function guildLogs(guildId: string, limit = 40): GuildLogRow[] {
  const rows = db
    .prepare('SELECT * FROM guild_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(guildId, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as GuildLogKind,
    actorName: r.actor_name,
    targetName: r.target_name,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}
