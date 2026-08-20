import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/**
 * Ô Ăn Quan — traditional Vietnamese mancala.
 * Board layout (index): 0 = Quan trái, 1..5 = dân của seat 0,
 * 6 = Quan phải, 11..7 = dân của seat 1 (đi ngược chiều kim đồng hồ).
 */
export interface OanQuanConfig {
  stonesPerCell?: number;
  quanValue?: number;
}

export interface OanQuanState extends BaseState {
  /** Số dân trong mỗi ô. */
  cells: number[];
  /** Quan còn trên bàn hay không (index 0 và 6). */
  quan: [number, number];
  captured: [number, number];
  quanValue: number;
  turnSeconds: number;
  lastPath: number[];
}

const QUAN_L = 0;
const QUAN_R = 6;
const SIZE = 12;
const OWN: Record<number, number[]> = { 0: [1, 2, 3, 4, 5], 1: [7, 8, 9, 10, 11] };

const isQuan = (i: number) => i === QUAN_L || i === QUAN_R;
const step = (i: number, dir: number) => (i + dir + SIZE) % SIZE;

export const OanQuanEngine: GameEngine<OanQuanState, OanQuanConfig> = {
  id: 'oanquan',
  minPlayers: 2,
  maxPlayers: 2,
  turnSeconds: 35,

  init(players: EnginePlayer[], config: OanQuanConfig = {}): OanQuanState {
    const per = config.stonesPerCell ?? 5;
    const cells = new Array(SIZE).fill(per);
    cells[QUAN_L] = 0;
    cells[QUAN_R] = 0;
    return {
      players,
      cells,
      quan: [1, 1],
      captured: [0, 0],
      quanValue: config.quanValue ?? 10,
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: ['Ván mới — mỗi ô 5 dân, hai ô Quan mỗi bên 1 quan'],
      lastPath: [],
      turnSeconds: 35,
    };
  },

  apply(state, playerId, type, payload): ApplyResult<OanQuanState> {
    if (state.over) return err('MATCH_OVER');
    if (type !== 'sow') return err('UNKNOWN_ACTION');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (seat !== state.turn % 2) return err('NOT_YOUR_TURN');

    const cell = Number(payload?.cell);
    const dir = Number(payload?.dir) >= 0 ? 1 : -1;
    if (!OWN[seat].includes(cell)) return err('NOT_YOUR_CELL');
    if (state.cells[cell] <= 0) return err('EMPTY_CELL');

    const cells = state.cells.slice();
    const quan: [number, number] = [...state.quan];
    const captured: [number, number] = [...state.captured];
    const path: number[] = [cell];
    const log: string[] = [];

    let hand = cells[cell];
    cells[cell] = 0;
    let pos = cell;

    // Sow, then chain-pick-up while the landing square is non-empty.
    for (let guard = 0; guard < 400; guard++) {
      while (hand > 0) {
        pos = step(pos, dir);
        cells[pos] += 1;
        hand -= 1;
        path.push(pos);
      }
      const nextCell = step(pos, dir);
      if (isQuan(nextCell)) break; // dừng khi ô kế tiếp là Quan
      if (cells[nextCell] > 0) {
        hand = cells[nextCell];
        cells[nextCell] = 0;
        pos = nextCell;
        path.push(nextCell);
        continue;
      }
      // Ô kế trống → ăn ô liền sau nếu có quân, và ăn dây.
      let empty = nextCell;
      let ate = 0;
      for (let chain = 0; chain < 6; chain++) {
        const target = step(empty, dir);
        const hasQuanStone = isQuan(target) && quan[target === QUAN_L ? 0 : 1] > 0;
        const amount = cells[target] + (hasQuanStone ? state.quanValue : 0);
        if (amount <= 0) break;
        captured[seat] += amount;
        ate += amount;
        cells[target] = 0;
        if (hasQuanStone) quan[target === QUAN_L ? 0 : 1] = 0;
        path.push(target);
        empty = step(target, dir);
        if (cells[empty] > 0 || isQuan(empty)) break;
      }
      if (ate > 0) log.push(`${state.players[seat].name} ăn ${ate} quân`);
      break;
    }

    let next: OanQuanState = {
      ...state,
      cells,
      quan,
      captured,
      lastPath: path,
      turn: state.turn + 1,
      turnStartedAt: Date.now(),
      log: [...state.log, ...log].slice(-20),
    };

    // Nếu bên tới lượt hết dân, rải 5 quân đã ăn ra 5 ô của mình.
    const nextSeat = next.turn % 2;
    if (OWN[nextSeat].every((i) => next.cells[i] === 0)) {
      if (next.captured[nextSeat] >= 5) {
        const c = next.cells.slice();
        OWN[nextSeat].forEach((i) => (c[i] = 1));
        const cap: [number, number] = [...next.captured];
        cap[nextSeat] -= 5;
        next = {
          ...next,
          cells: c,
          captured: cap,
          log: [...next.log, `${state.players[nextSeat].name} rải 5 dân từ kho`],
        };
      } else {
        next = { ...next, log: [...next.log, `${state.players[nextSeat].name} hết quân để rải`] };
        return ok(finish(next), [{ type: 'end', payload: { reason: 'no_stones' } }]);
      }
    }

    // Hết quan hai bên → tàn cuộc, mỗi bên thu nốt dân bên mình.
    if (quan[0] === 0 && quan[1] === 0) {
      return ok(finish(next), [{ type: 'end', payload: { reason: 'no_quan' } }]);
    }
    return ok(next, [{ type: 'sow', payload: { seat, cell, dir, path } }]);
  },

  timeout(state, rng: Rng) {
    if (state.over) return ok(state);
    const seat = state.turn % 2;
    const options = OWN[seat].filter((i) => state.cells[i] > 0);
    if (!options.length) return ok(finish(state));
    const res = OanQuanEngine.apply(
      state,
      state.players[seat].id,
      'sow',
      { cell: rng.pick(options), dir: rng.next() < 0.5 ? 1 : -1 },
      rng,
    );
    return res.ok ? ok(res.state, res.events) : ok(state);
  },

  view(state) {
    return {
      cells: state.cells,
      quan: state.quan,
      quanValue: state.quanValue,
      captured: state.captured,
      turn: state.turn,
      turnSeat: state.turn % 2,
      own: OWN,
      players: state.players,
      lastPath: state.lastPath,
      over: state.over,
      winnerIds: state.winnerIds,
      scores: score(state),
      log: state.log.slice(-8),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    const s = score(state);
    return state.players.map((p, seat) => {
      const win = state.winnerIds.includes(p.id);
      const draw = state.winnerIds.length === 0;
      return {
        userId: p.id,
        result: draw ? 'draw' : win ? 'win' : 'lose',
        score: s[seat],
        place: draw ? 1 : win ? 1 : 2,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.turnStartedAt + s.turnSeconds * 1000),
};

function score(state: OanQuanState): [number, number] {
  const out: [number, number] = [state.captured[0], state.captured[1]];
  ([0, 1] as const).forEach((seat) => {
    OWN[seat].forEach((i) => (out[seat] += state.cells[i]));
  });
  return out;
}

function finish(state: OanQuanState): OanQuanState {
  const s = score(state);
  const winnerIds = s[0] === s[1] ? [] : s[0] > s[1] ? [state.players[0].id] : [state.players[1].id];
  return {
    ...state,
    over: true,
    winnerIds,
    log: [...state.log, `Tàn cuộc — ${s[0]} : ${s[1]}`],
  };
}
