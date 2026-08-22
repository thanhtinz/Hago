import { Router } from 'express';
import { requireAuth } from '../auth';
import { balanceOf } from '../services/economy';
import {
  TOURNAMENT_SIZES,
  cancelTournament,
  createTournament,
  joinTournament,
  leaveTournament,
  listTournaments,
  startTournament,
  toTournamentView,
} from '../services/tournaments';
import { db } from '../db';

export const tournamentsRouter = Router();

const fail = (res: any, e: any) => res.status(400).json({ error: e.message ?? 'BAD_REQUEST' });

tournamentsRouter.get('/', requireAuth, (req, res) => {
  res.json({ tournaments: listTournaments(req.auth!.sub), sizes: TOURNAMENT_SIZES });
});

tournamentsRouter.get('/:id', requireAuth, (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'TOURNAMENT_NOT_FOUND' });
  res.json({ tournament: toTournamentView(t, req.auth!.sub) });
});

tournamentsRouter.post('/:id/join', requireAuth, (req, res) => {
  try {
    res.json({ tournament: joinTournament(req.auth!.sub, req.params.id), balance: balanceOf(req.auth!.sub) });
  } catch (e: any) {
    fail(res, e);
  }
});

tournamentsRouter.post('/:id/leave', requireAuth, (req, res) => {
  try {
    res.json({ tournament: leaveTournament(req.auth!.sub, req.params.id), balance: balanceOf(req.auth!.sub) });
  } catch (e: any) {
    fail(res, e);
  }
});

/** Chủ giải bang bấm khai mạc sớm, không phải chờ đủ suất. */
tournamentsRouter.post('/:id/start', requireAuth, (req, res) => {
  try {
    res.json({ tournament: startTournament(req.auth!.sub, req.params.id) });
  } catch (e: any) {
    fail(res, e);
  }
});

tournamentsRouter.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    res.json(cancelTournament(req.auth!.sub, req.params.id));
  } catch (e: any) {
    fail(res, e);
  }
});

/** Tạo giải chung là việc của admin; giải bang đi qua route của bang. */
tournamentsRouter.post('/', requireAuth, (req, res) => {
  if (!req.auth!.admin) return res.status(403).json({ error: 'FORBIDDEN' });
  try {
    res.json({ tournament: createTournament(req.body ?? {}) });
  } catch (e: any) {
    fail(res, e);
  }
});
