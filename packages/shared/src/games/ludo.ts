import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/**
 * Cờ Cá Ngựa (Ludo). Vòng ngoài 52 ô, mỗi người 4 ngựa, 6 ô về chuồng.
 * Xúc xắc do server tung — client không bao giờ tự sinh số.
 */
export interface LudoConfig {
  piecesPerPlayer?: number;
}

export type PieceState = 'home' | 'track' | 'lane' | 'done';

export interface LudoPiece {
  id: number;
  seat: number;
  state: PieceState;
  /** Vị trí tuyệt đối trên vòng ngoài (0..51) khi state = 'track'. */
  pos: number;
  /** Vị trí trong cầu về chuồng (0..5) khi state = 'lane'. */
  lane: number;
}

export interface LudoState extends BaseState {
  pieces: LudoPiece[];
  dice: number | null;
  rolled: boolean;
  extraTurn: boolean;
  rollsThisTurn: number;
  finishedSeats: number[];
  turnSeconds: number;
}

const TRACK = 52;
const LANE = 6;
const START: number[] = [0, 13, 26, 39];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const entryOf = (seat: number) => (START[seat] + TRACK - 1) % TRACK;

/** Số bước ngựa đã đi tính từ ô xuất phát của chủ nó. */
function traveled(p: LudoPiece): number {
  return (p.pos - START[p.seat] + TRACK) % TRACK;
}

export const LudoEngine: GameEngine<LudoState, LudoConfig> = {
  id: 'ludo',
  minPlayers: 2,
  maxPlayers: 4,
  turnSeconds: 20,

  init(players: EnginePlayer[], config: LudoConfig = {}): LudoState {
    const per = Math.min(4, Math.max(1, config.piecesPerPlayer ?? 4));
    const pieces: LudoPiece[] = [];
    players.forEach((_, seat) => {
      for (let i = 0; i < per; i++) pieces.push({ id: seat * 4 + i, seat, state: 'home', pos: -1, lane: -1 });
    });
    return {
      players,
      pieces,
      dice: null,
      rolled: false,
      extraTurn: false,
      rollsThisTurn: 0,
      finishedSeats: [],
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: ['Tung xúc xắc để bắt đầu. Ra 6 mới được xuất chuồng.'],
      turnSeconds: 20,
    };
  },

  apply(state, playerId, type, payload, rng): ApplyResult<LudoState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (seat !== activeSeat(state)) return err('NOT_YOUR_TURN');

    if (type === 'roll') {
      if (state.rolled) return err('ALREADY_ROLLED');
      const dice = rng.dice(6);
      const next: LudoState = {
        ...state,
        dice,
        rolled: true,
        rollsThisTurn: state.rollsThisTurn + 1,
        log: [...state.log, `${state.players[seat].name} tung được ${dice}`].slice(-20),
      };
      const moves = legalMoves(next, seat);
      if (!moves.length) {
        // Không có nước đi hợp lệ: ra 6 thì được tung lại (tối đa 3 lần).
        if (dice === 6 && next.rollsThisTurn < 3) {
          return ok({ ...next, rolled: false, turnStartedAt: Date.now() }, [
            { type: 'roll', payload: { seat, dice, again: true } },
          ]);
        }
        return ok(endTurn(next), [{ type: 'roll', payload: { seat, dice, skipped: true } }]);
      }
      return ok(next, [{ type: 'roll', payload: { seat, dice, moves } }]);
    }

    if (type === 'move') {
      if (!state.rolled || state.dice == null) return err('ROLL_FIRST');
      const pieceId = Number(payload?.pieceId);
      const moves = legalMoves(state, seat);
      if (!moves.includes(pieceId)) return err('ILLEGAL_MOVE');
      return ok(...doMove(state, seat, pieceId));
    }

    return err('UNKNOWN_ACTION');
  },

  timeout(state, rng) {
    if (state.over) return ok(state);
    const seat = activeSeat(state);
    const pid = state.players[seat].id;
    if (!state.rolled) {
      const r = LudoEngine.apply(state, pid, 'roll', {}, rng);
      return r.ok ? ok(r.state, r.events) : ok(endTurn(state));
    }
    const moves = legalMoves(state, seat);
    if (!moves.length) return ok(endTurn(state));
    const r = LudoEngine.apply(state, pid, 'move', { pieceId: rng.pick(moves) }, rng);
    return r.ok ? ok(r.state, r.events) : ok(endTurn(state));
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    const active = activeSeat(state);
    return {
      pieces: state.pieces,
      dice: state.dice,
      rolled: state.rolled,
      track: TRACK,
      lane: LANE,
      starts: START,
      safe: Array.from(SAFE),
      turnSeat: active,
      mySeat: seat,
      moves: seat === active && state.rolled ? legalMoves(state, seat) : [],
      players: state.players,
      finishedSeats: state.finishedSeats,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-8),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    const order = [...state.finishedSeats];
    state.players.forEach((_, seat) => {
      if (!order.includes(seat)) order.push(seat);
    });
    return state.players.map((p, seat) => {
      const place = order.indexOf(seat) + 1;
      return {
        userId: p.id,
        result: place === 1 ? 'win' : 'lose',
        score: state.pieces.filter((x) => x.seat === seat && x.state === 'done').length,
        place,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.turnStartedAt + s.turnSeconds * 1000),
};

function activeSeat(state: LudoState): number {
  const n = state.players.length;
  let seat = state.turn % n;
  for (let i = 0; i < n; i++) {
    if (!state.finishedSeats.includes(seat)) return seat;
    seat = (seat + 1) % n;
  }
  return seat;
}

function legalMoves(state: LudoState, seat: number): number[] {
  const dice = state.dice;
  if (dice == null) return [];
  return state.pieces
    .filter((p) => p.seat === seat && p.state !== 'done')
    .filter((p) => {
      if (p.state === 'home') return dice === 6;
      if (p.state === 'lane') return p.lane + dice < LANE;
      const t = traveled(p) + dice;
      if (t < TRACK) {
        const dest = (START[seat] + t) % TRACK;
        // Không chồng lên ngựa của chính mình.
        return !state.pieces.some(
          (o) => o.seat === seat && o.state === 'track' && o.pos === dest && o.id !== p.id,
        );
      }
      return t - TRACK < LANE;
    })
    .map((p) => p.id);
}

function doMove(state: LudoState, seat: number, pieceId: number): [LudoState, any[]] {
  const dice = state.dice!;
  const pieces = state.pieces.map((p) => ({ ...p }));
  const piece = pieces.find((p) => p.id === pieceId)!;
  const events: any[] = [];
  const log: string[] = [];

  if (piece.state === 'home') {
    piece.state = 'track';
    piece.pos = START[seat];
    log.push(`${state.players[seat].name} xuất chuồng 1 ngựa`);
  } else if (piece.state === 'lane') {
    piece.lane += dice;
    if (piece.lane === LANE - 1) {
      piece.state = 'done';
      log.push(`Một ngựa của ${state.players[seat].name} đã về đích`);
    }
  } else {
    const t = traveled(piece) + dice;
    if (t < TRACK) {
      piece.pos = (START[seat] + t) % TRACK;
    } else {
      piece.state = 'lane';
      piece.lane = t - TRACK;
      piece.pos = -1;
      if (piece.lane === LANE - 1) {
        piece.state = 'done';
        log.push(`Một ngựa của ${state.players[seat].name} đã về đích`);
      }
    }
  }

  // Đá ngựa đối thủ nếu đáp xuống ô không an toàn.
  let kicked = false;
  if (piece.state === 'track' && !SAFE.has(piece.pos)) {
    for (const o of pieces) {
      if (o.seat !== seat && o.state === 'track' && o.pos === piece.pos) {
        o.state = 'home';
        o.pos = -1;
        kicked = true;
        log.push(`${state.players[seat].name} đá ngựa của ${state.players[o.seat].name} về chuồng!`);
        events.push({ type: 'kick', payload: { by: seat, victim: o.seat } });
      }
    }
  }

  let next: LudoState = {
    ...state,
    pieces,
    log: [...state.log, ...log].slice(-20),
  };

  const done = pieces.filter((p) => p.seat === seat && p.state === 'done').length;
  const total = pieces.filter((p) => p.seat === seat).length;
  if (done === total && !next.finishedSeats.includes(seat)) {
    next = { ...next, finishedSeats: [...next.finishedSeats, seat] };
    events.push({ type: 'seat_finished', payload: { seat } });
  }

  const remaining = state.players.length - next.finishedSeats.length;
  if (remaining <= 1) {
    const first = next.finishedSeats[0];
    next = {
      ...next,
      over: true,
      winnerIds: first != null ? [state.players[first].id] : [],
      log: [...next.log, 'Kết thúc ván cá ngựa'],
    };
    return [next, events];
  }

  // Ra 6, đá ngựa hoặc về đích → được đi tiếp.
  const again = dice === 6 || kicked || piece.state === 'done';
  next = again
    ? { ...next, rolled: false, dice: null, turnStartedAt: Date.now() }
    : endTurn(next);
  events.push({ type: 'move', payload: { seat, pieceId, dice, again } });
  return [next, events];
}

function endTurn(state: LudoState): LudoState {
  return {
    ...state,
    turn: state.turn + 1,
    rolled: false,
    dice: null,
    rollsThisTurn: 0,
    turnStartedAt: Date.now(),
  };
}
