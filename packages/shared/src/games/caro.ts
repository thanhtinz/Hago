import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

export interface CaroConfig {
  size?: number;
  winLength?: number;
  /** Standard gomoku: an exact-N line wins; blocked lines do not count. */
  strictFive?: boolean;
}

export interface CaroState extends BaseState {
  size: number;
  winLength: number;
  strictFive: boolean;
  /** Flat board, index = y * size + x, value = seat index or -1. */
  cells: number[];
  moves: { x: number; y: number; seat: number }[];
  winLine: number[] | null;
  turnSeconds: number;
}

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export const CaroEngine: GameEngine<CaroState, CaroConfig> = {
  id: 'caro',
  minPlayers: 2,
  maxPlayers: 2,
  turnSeconds: 30,

  init(players: EnginePlayer[], config: CaroConfig = {}): CaroState {
    const size = Math.min(19, Math.max(9, config.size ?? 15));
    return {
      players,
      size,
      winLength: config.winLength ?? 5,
      strictFive: config.strictFive ?? true,
      cells: new Array(size * size).fill(-1),
      moves: [],
      winLine: null,
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: [],
      turnSeconds: 30,
    };
  },

  apply(state, playerId, type, payload): ApplyResult<CaroState> {
    if (state.over) return err('MATCH_OVER');
    if (type !== 'move') return err('UNKNOWN_ACTION');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (seat !== state.turn % 2) return err('NOT_YOUR_TURN');

    const x = Number(payload?.x);
    const y = Number(payload?.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return err('BAD_COORD');
    if (x < 0 || y < 0 || x >= state.size || y >= state.size) return err('OUT_OF_BOARD');
    const idx = y * state.size + x;
    if (state.cells[idx] !== -1) return err('CELL_TAKEN');

    const cells = state.cells.slice();
    cells[idx] = seat;
    const next: CaroState = {
      ...state,
      cells,
      moves: [...state.moves, { x, y, seat }],
      turn: state.turn + 1,
      turnStartedAt: Date.now(),
    };

    const line = findWin(next, x, y, seat);
    if (line) {
      next.over = true;
      next.winLine = line;
      next.winnerIds = [playerId];
      next.log = [...next.log, `${state.players[seat].name} thắng với ${state.winLength} quân liền`];
      return ok(next, [{ type: 'win', payload: { seat, line } }]);
    }
    if (next.moves.length >= state.size * state.size) {
      next.over = true;
      next.log = [...next.log, 'Hòa — bàn cờ đã đầy'];
      return ok(next, [{ type: 'draw' }]);
    }
    return ok(next, [{ type: 'move', payload: { x, y, seat } }]);
  },

  timeout(state, rng: Rng) {
    // Auto-play a legal move near the centre so a stalled match still resolves.
    if (state.over) return ok(state);
    const seat = state.turn % 2;
    const empty: number[] = [];
    for (let i = 0; i < state.cells.length; i++) if (state.cells[i] === -1) empty.push(i);
    if (!empty.length) return ok({ ...state, over: true });
    const idx = rng.pick(empty);
    const res = CaroEngine.apply(
      state,
      state.players[seat].id,
      'move',
      { x: idx % state.size, y: Math.floor(idx / state.size) },
      rng,
    );
    if (!res.ok) return ok(state);
    return ok(
      { ...res.state, log: [...res.state.log, `${state.players[seat].name} hết giờ — server đánh thay`] },
      [...res.events, { type: 'timeout', payload: { seat } }],
    );
  },

  view(state) {
    return {
      size: state.size,
      winLength: state.winLength,
      cells: state.cells,
      moves: state.moves.slice(-1),
      lastMove: state.moves[state.moves.length - 1] ?? null,
      turn: state.turn,
      turnSeat: state.turn % 2,
      players: state.players,
      winLine: state.winLine,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-8),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    return state.players.map((p, seat) => {
      const win = state.winnerIds.includes(p.id);
      const draw = state.winnerIds.length === 0;
      const score = state.moves.filter((m) => m.seat === seat).length;
      return {
        userId: p.id,
        result: draw ? 'draw' : win ? 'win' : 'lose',
        score,
        place: draw ? 1 : win ? 1 : 2,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.turnStartedAt + s.turnSeconds * 1000),
};

function findWin(state: CaroState, x: number, y: number, seat: number): number[] | null {
  const { size, winLength, cells, strictFive } = state;
  const at = (cx: number, cy: number) =>
    cx < 0 || cy < 0 || cx >= size || cy >= size ? -2 : cells[cy * size + cx];

  for (const [dx, dy] of DIRS) {
    const line: number[] = [y * size + x];
    let a = 1;
    while (at(x + dx * a, y + dy * a) === seat) {
      line.push((y + dy * a) * size + (x + dx * a));
      a++;
    }
    let b = 1;
    while (at(x - dx * b, y - dy * b) === seat) {
      line.unshift((y - dy * b) * size + (x - dx * b));
      b++;
    }
    if (line.length < winLength) continue;
    if (!strictFive) return line.slice(0, winLength);
    // Exact length with both ends open-or-empty (a line of 6+ still wins here,
    // but a 5 blocked on both ends does not).
    const headBlocked = at(x + dx * a, y + dy * a) >= 0 && at(x + dx * a, y + dy * a) !== seat;
    const tailBlocked = at(x - dx * b, y - dy * b) >= 0 && at(x - dx * b, y - dy * b) !== seat;
    if (line.length > winLength || !(headBlocked && tailBlocked)) return line;
  }
  return null;
}
