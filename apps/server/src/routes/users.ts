import { Router } from 'express';
import { GAME_TYPES, RANKS, isSolo } from '@hago/shared';
import { requireAuth } from '../auth';
import { db } from '../db';
import { AVATAR_STYLES } from '../avatar';
import { findUser, searchUsers, toProfile, toPublicUser } from '../services/users';
import { matchHistory } from '../realtime/match';
import { userAchievements } from '../services/quests';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, (req, res) => {
  const row = findUser(req.auth!.sub);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ profile: toProfile(row) });
});

usersRouter.patch('/me', requireAuth, (req, res) => {
  const { displayName, bio, avatarSeed, avatarStyle } = req.body ?? {};
  if (typeof displayName === 'string' && displayName.trim())
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName.trim().slice(0, 30), req.auth!.sub);
  if (typeof bio === 'string')
    db.prepare('UPDATE profiles SET bio = ? WHERE user_id = ?').run(bio.slice(0, 160), req.auth!.sub);
  if (typeof avatarSeed === 'string' && avatarSeed.trim())
    db.prepare('UPDATE profiles SET avatar_seed = ? WHERE user_id = ?').run(avatarSeed.trim().slice(0, 40), req.auth!.sub);
  if (typeof avatarStyle === 'string' && AVATAR_STYLES.includes(avatarStyle))
    db.prepare('UPDATE profiles SET avatar_style = ? WHERE user_id = ?').run(avatarStyle, req.auth!.sub);
  res.json({ profile: toProfile(findUser(req.auth!.sub)!) });
});

usersRouter.get('/avatar-styles', (_req, res) => res.json({ styles: AVATAR_STYLES }));

usersRouter.get('/search', requireAuth, (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 1) return res.json({ users: [] });
  const rows = searchUsers(q).filter((r) => r.id !== req.auth!.sub);
  res.json({ users: rows.map(toPublicUser) });
});

usersRouter.get('/leaderboard', (req, res) => {
  const gameType = String(req.query.gameType ?? '');
  const limit = Math.min(100, Number(req.query.limit ?? 50));
  if (gameType && GAME_TYPES.includes(gameType as any)) {
    /**
     * Game một người (Flappy Bird) không có đối thủ nên không có Elo — xếp theo
     * điểm cao nhất, ai đạt được sớm hơn thì đứng trên khi bằng điểm.
     */
    const solo = isSolo(gameType as any);
    const rows = db
      .prepare(
        `SELECT u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id,
                gs.rating AS grating, gs.wins AS gwins, gs.matches AS gmatches, gs.best_score AS gbest
         FROM game_stats gs JOIN users u ON u.id = gs.user_id
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE gs.game_type = ? AND u.status = 'active'
         ORDER BY ${solo ? 'gs.best_score DESC, gs.matches ASC' : 'gs.rating DESC, gs.wins DESC'} LIMIT ?`,
      )
      .all(gameType, limit) as any[];
    return res.json({
      gameType,
      solo,
      entries: rows.map((r, i) => ({
        rank: i + 1,
        user: { ...toPublicUser(r), rating: r.grating },
        wins: r.gwins,
        matches: r.gmatches,
        bestScore: r.gbest,
      })),
    });
  }
  const rows = db
    .prepare(
      `SELECT u.*, p.avatar_seed, p.avatar_style, p.frame_id, p.title_id
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.status = 'active' ORDER BY u.rating DESC, u.wins DESC LIMIT ?`,
    )
    .all(limit) as any[];
  res.json({
    gameType: null,
    entries: rows.map((r, i) => ({ rank: i + 1, user: toPublicUser(r), wins: r.wins, matches: r.wins + r.losses + r.draws })),
  });
});

usersRouter.get('/ranks', (_req, res) => res.json({ ranks: RANKS }));

usersRouter.get('/:id', requireAuth, (req, res) => {
  const row = findUser(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({
    profile: toProfile(row),
    history: matchHistory(row.id, 10),
    achievements: userAchievements(row.id).filter((a) => a.unlockedAt),
  });
});

usersRouter.get('/:id/history', requireAuth, (req, res) => {
  res.json({ history: matchHistory(req.params.id, Math.min(50, Number(req.query.limit ?? 20))) });
});
