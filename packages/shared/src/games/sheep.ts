import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/**
 * Sheep Battle — casual realtime arena. Người chơi di chuyển trên lưới,
 * bắt cừu và mang về chuồng của mình. Server tick 5Hz và validate mọi bước đi.
 */
export interface SheepConfig {
  width?: number;
  height?: number;
  durationSeconds?: number;
  sheepCount?: number;
}

export interface SheepActor {
  seat: number;
  x: number;
  y: number;
  carrying: number | null;
  score: number;
  stunUntil: number;
  lastMoveAt: number;
}

export interface SheepUnit {
  id: number;
  x: number;
  y: number;
  heldBy: number | null;
  penned: boolean;
  golden: boolean;
}

export interface SheepState extends BaseState {
  width: number;
  height: number;
  endsAt: number;
  actors: SheepActor[];
  sheep: SheepUnit[];
  pens: { seat: number; x: number; y: number }[];
  lastTick: number;
  turnSeconds: number;
}

const MOVE_COOLDOWN_MS = 130;
const DIRS: Record<string, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const SheepEngine: GameEngine<SheepState, SheepConfig> = {
  id: 'sheep',
  minPlayers: 2,
  maxPlayers: 4,
  turnSeconds: 0,
  realtime: true,

  init(players: EnginePlayer[], config: SheepConfig = {}, rng: Rng): SheepState {
    const width = config.width ?? 13;
    const height = config.height ?? 13;
    const duration = config.durationSeconds ?? 90;
    const corners = [
      [1, 1],
      [width - 2, height - 2],
      [width - 2, 1],
      [1, height - 2],
    ];
    const count = config.sheepCount ?? 10 + players.length * 2;
    const sheep: SheepUnit[] = [];
    for (let i = 0; i < count; i++) {
      sheep.push({
        id: i,
        x: rng.int(2, width - 3),
        y: rng.int(2, height - 3),
        heldBy: null,
        penned: false,
        golden: i % 7 === 6,
      });
    }
    return {
      players,
      width,
      height,
      endsAt: Date.now() + duration * 1000,
      actors: players.map((_, seat) => ({
        seat,
        x: corners[seat][0],
        y: corners[seat][1],
        carrying: null,
        score: 0,
        stunUntil: 0,
        lastMoveAt: 0,
      })),
      sheep,
      pens: players.map((_, seat) => ({ seat, x: corners[seat][0], y: corners[seat][1] })),
      lastTick: Date.now(),
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: ['Lùa cừu về chuồng! Cừu vàng = 3 điểm'],
      turnSeconds: 0,
    };
  },

  apply(state, playerId, type, payload): ApplyResult<SheepState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (type !== 'move') return err('UNKNOWN_ACTION');
    const dir = DIRS[String(payload?.dir)];
    if (!dir) return err('BAD_DIRECTION');

    const now = Date.now();
    const actors = state.actors.map((a) => ({ ...a }));
    const me = actors[seat];
    if (now < me.stunUntil) return err('STUNNED');
    if (now - me.lastMoveAt < MOVE_COOLDOWN_MS) return err('TOO_FAST');

    const nx = Math.min(state.width - 1, Math.max(0, me.x + dir[0]));
    const ny = Math.min(state.height - 1, Math.max(0, me.y + dir[1]));
    me.lastMoveAt = now;
    if (nx === me.x && ny === me.y) return err('BLOCKED');
    me.x = nx;
    me.y = ny;

    const sheep = state.sheep.map((s) => ({ ...s }));
    const events: any[] = [{ type: 'move', payload: { seat, x: nx, y: ny } }];
    const log: string[] = [];

    // Húc người chơi khác đang vác cừu → cừu rơi ra, nạn nhân choáng 1.2s.
    for (const other of actors) {
      if (other.seat !== seat && other.x === nx && other.y === ny) {
        other.stunUntil = now + 1200;
        if (other.carrying != null) {
          const drop = sheep.find((s) => s.id === other.carrying)!;
          drop.heldBy = null;
          drop.x = nx;
          drop.y = ny;
          other.carrying = null;
          log.push(`${state.players[seat].name} húc rơi cừu của ${state.players[other.seat].name}!`);
          events.push({ type: 'bump', payload: { by: seat, victim: other.seat } });
        }
      }
    }

    // Nhặt cừu.
    if (me.carrying == null) {
      const target = sheep.find((s) => !s.penned && s.heldBy == null && s.x === nx && s.y === ny);
      if (target) {
        target.heldBy = seat;
        me.carrying = target.id;
        events.push({ type: 'grab', payload: { seat, sheep: target.id } });
      }
    }

    // Về chuồng để ghi điểm.
    const pen = state.pens[seat];
    if (me.carrying != null && nx === pen.x && ny === pen.y) {
      const held = sheep.find((s) => s.id === me.carrying)!;
      held.penned = true;
      held.heldBy = null;
      const points = held.golden ? 3 : 1;
      me.score += points;
      me.carrying = null;
      log.push(`${state.players[seat].name} +${points} điểm${held.golden ? ' (cừu vàng ✨)' : ''}`);
      events.push({ type: 'score', payload: { seat, points } });
    }

    let next: SheepState = {
      ...state,
      actors,
      sheep,
      log: [...state.log, ...log].slice(-20),
    };
    if (sheep.every((s) => s.penned)) next = finish(next);
    return ok(next, events);
  },

  tick(state, now, rng) {
    if (state.over) return ok(state);
    if (now >= state.endsAt) return ok(finish(state), [{ type: 'time_up' }]);
    // Cừu tự do đi lang thang mỗi 700ms.
    if (now - state.lastTick < 700) return ok(state);
    const sheep = state.sheep.map((s) => {
      if (s.penned || s.heldBy != null || rng.next() < 0.45) return s;
      const [dx, dy] = rng.pick(Object.values(DIRS));
      return {
        ...s,
        x: Math.min(state.width - 1, Math.max(0, s.x + dx)),
        y: Math.min(state.height - 1, Math.max(0, s.y + dy)),
      };
    });
    // Cừu đang được vác thì đi theo người vác.
    const actors = state.actors;
    sheep.forEach((s) => {
      if (s.heldBy != null) {
        const a = actors[s.heldBy];
        s.x = a.x;
        s.y = a.y;
      }
    });
    return ok({ ...state, sheep, lastTick: now });
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    return {
      width: state.width,
      height: state.height,
      actors: state.actors,
      sheep: state.sheep,
      pens: state.pens,
      mySeat: seat,
      endsAt: state.endsAt,
      remainingMs: Math.max(0, state.endsAt - Date.now()),
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-6),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    const sorted = [...state.actors].sort((a, b) => b.score - a.score);
    return state.players.map((p, seat) => {
      const place = sorted.findIndex((a) => a.seat === seat) + 1;
      const top = sorted[0].score;
      const mine = state.actors[seat].score;
      return {
        userId: p.id,
        result: mine === top ? (sorted.filter((a) => a.score === top).length > 1 ? 'draw' : 'win') : 'lose',
        score: mine,
        place,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.endsAt),
};

function finish(state: SheepState): SheepState {
  const top = Math.max(...state.actors.map((a) => a.score));
  const winners = state.actors.filter((a) => a.score === top);
  return {
    ...state,
    over: true,
    winnerIds: winners.length === state.actors.length ? [] : winners.map((a) => state.players[a.seat].id),
    log: [...state.log, 'Hết giờ! Tổng kết điểm'],
  };
}
