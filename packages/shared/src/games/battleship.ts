import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

export interface BattleshipConfig {
  size?: number;
  fleet?: number[];
}

export interface Ship {
  id: number;
  size: number;
  x: number;
  y: number;
  horizontal: boolean;
  hits: number[];
}

export interface Side {
  ships: Ship[];
  placed: boolean;
  /** Shots this side has fired at the opponent. */
  shots: { x: number; y: number; hit: boolean; sunk: number | null }[];
}

export interface BattleshipState extends BaseState {
  size: number;
  fleet: number[];
  phase: 'placement' | 'battle';
  sides: [Side, Side];
  turnSeconds: number;
  placementDeadline: number;
}

const DEFAULT_FLEET = [5, 4, 3, 3, 2];

function emptySide(): Side {
  return { ships: [], placed: false, shots: [] };
}

function cellsOf(ship: Ship): { x: number; y: number }[] {
  return Array.from({ length: ship.size }, (_, i) => ({
    x: ship.x + (ship.horizontal ? i : 0),
    y: ship.y + (ship.horizontal ? 0 : i),
  }));
}

function randomFleet(size: number, fleet: number[], rng: Rng): Ship[] {
  const ships: Ship[] = [];
  const taken = new Set<string>();
  fleet.forEach((len, id) => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const horizontal = rng.next() < 0.5;
      const x = rng.int(0, size - (horizontal ? len : 1));
      const y = rng.int(0, size - (horizontal ? 1 : len));
      const ship: Ship = { id, size: len, x, y, horizontal, hits: [] };
      const cells = cellsOf(ship);
      if (cells.some((c) => taken.has(`${c.x},${c.y}`))) continue;
      cells.forEach((c) => taken.add(`${c.x},${c.y}`));
      ships.push(ship);
      return;
    }
  });
  return ships;
}

function sunk(ship: Ship): boolean {
  return ship.hits.length >= ship.size;
}

export const BattleshipEngine: GameEngine<BattleshipState, BattleshipConfig> = {
  id: 'battleship',
  minPlayers: 2,
  maxPlayers: 2,
  turnSeconds: 25,

  init(players: EnginePlayer[], config: BattleshipConfig = {}): BattleshipState {
    const size = Math.min(12, Math.max(8, config.size ?? 10));
    return {
      players,
      size,
      fleet: config.fleet ?? DEFAULT_FLEET,
      phase: 'placement',
      sides: [emptySide(), emptySide()],
      turn: 0,
      turnStartedAt: Date.now(),
      placementDeadline: Date.now() + 60_000,
      winnerIds: [],
      over: false,
      log: ['Đặt hạm đội của bạn — 60 giây'],
      turnSeconds: 25,
    };
  },

  apply(state, playerId, type, payload, rng): ApplyResult<BattleshipState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');

    if (type === 'place') {
      if (state.phase !== 'placement') return err('NOT_PLACEMENT_PHASE');
      if (state.sides[seat].placed) return err('ALREADY_PLACED');
      const raw = Array.isArray(payload?.ships) ? payload.ships : null;
      let ships: Ship[];
      if (!raw) {
        ships = randomFleet(state.size, state.fleet, rng);
      } else {
        if (raw.length !== state.fleet.length) return err('BAD_FLEET_COUNT');
        ships = [];
        const taken = new Set<string>();
        for (let i = 0; i < raw.length; i++) {
          const s = raw[i];
          const ship: Ship = {
            id: i,
            size: state.fleet[i],
            x: Number(s?.x),
            y: Number(s?.y),
            horizontal: !!s?.horizontal,
            hits: [],
          };
          if (!Number.isInteger(ship.x) || !Number.isInteger(ship.y)) return err('BAD_COORD');
          const cells = cellsOf(ship);
          for (const c of cells) {
            if (c.x < 0 || c.y < 0 || c.x >= state.size || c.y >= state.size) return err('SHIP_OUT_OF_BOARD');
            if (taken.has(`${c.x},${c.y}`)) return err('SHIP_OVERLAP');
            taken.add(`${c.x},${c.y}`);
          }
          ships.push(ship);
        }
      }
      const sides = [...state.sides] as [Side, Side];
      sides[seat] = { ...sides[seat], ships, placed: true };
      const next = { ...state, sides };
      if (sides[0].placed && sides[1].placed) {
        next.phase = 'battle';
        next.turnStartedAt = Date.now();
        next.log = [...next.log, 'Cả hai đã sẵn sàng — khai hỏa!'];
        return ok(next, [{ type: 'battle_start' }]);
      }
      return ok(next, [{ type: 'placed', payload: { seat } }]);
    }

    if (type === 'fire') {
      if (state.phase !== 'battle') return err('NOT_BATTLE_PHASE');
      if (seat !== state.turn % 2) return err('NOT_YOUR_TURN');
      const x = Number(payload?.x);
      const y = Number(payload?.y);
      if (x < 0 || y < 0 || x >= state.size || y >= state.size) return err('OUT_OF_BOARD');
      const me = state.sides[seat];
      if (me.shots.some((s) => s.x === x && s.y === y)) return err('ALREADY_FIRED');

      const foeSeat = 1 - seat;
      const foe = state.sides[foeSeat];
      const ships = foe.ships.map((s) => ({ ...s, hits: s.hits.slice() }));
      let hit = false;
      let sunkId: number | null = null;
      for (const ship of ships) {
        const cells = cellsOf(ship);
        const partIdx = cells.findIndex((c) => c.x === x && c.y === y);
        if (partIdx >= 0) {
          hit = true;
          if (!ship.hits.includes(partIdx)) ship.hits.push(partIdx);
          if (sunk(ship)) sunkId = ship.id;
          break;
        }
      }

      const sides = [...state.sides] as [Side, Side];
      sides[foeSeat] = { ...foe, ships };
      sides[seat] = { ...me, shots: [...me.shots, { x, y, hit, sunk: sunkId }] };

      const allSunk = ships.every(sunk);
      const next: BattleshipState = {
        ...state,
        sides,
        // A hit grants another shot — classic salvo rule.
        turn: hit && !allSunk ? state.turn + 2 : state.turn + 1,
        turnStartedAt: Date.now(),
        log: [
          ...state.log,
          // Nhãn ô theo kiểu bản đồ: chữ cái là hàng (y), số là cột (x).
          `${state.players[seat].name} bắn ${String.fromCharCode(65 + y)}${x + 1}: ${
            sunkId !== null ? 'CHÌM TÀU!' : hit ? 'TRÚNG!' : 'trượt'
          }`,
        ].slice(-20),
      };
      if (allSunk) {
        next.over = true;
        next.winnerIds = [playerId];
        return ok(next, [{ type: 'win', payload: { seat } }]);
      }
      return ok(next, [{ type: 'shot', payload: { seat, x, y, hit, sunk: sunkId } }]);
    }

    return err('UNKNOWN_ACTION');
  },

  timeout(state, rng) {
    if (state.over) return ok(state);
    if (state.phase === 'placement') {
      const sides = state.sides.map((s) =>
        s.placed ? s : { ...s, placed: true, ships: randomFleet(state.size, state.fleet, rng) },
      ) as [Side, Side];
      return ok(
        {
          ...state,
          sides,
          phase: 'battle',
          turnStartedAt: Date.now(),
          log: [...state.log, 'Hết giờ đặt tàu — server xếp hạm đội tự động'],
        },
        [{ type: 'battle_start' }],
      );
    }
    const seat = state.turn % 2;
    const me = state.sides[seat];
    const free: { x: number; y: number }[] = [];
    for (let y = 0; y < state.size; y++)
      for (let x = 0; x < state.size; x++)
        if (!me.shots.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    if (!free.length) return ok(state);
    const target = rng.pick(free);
    const res = BattleshipEngine.apply(state, state.players[seat].id, 'fire', target, rng);
    return res.ok ? ok(res.state, res.events) : ok(state);
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    const render = (i: number) => {
      const side = state.sides[i];
      const mine = i === seat;
      return {
        placed: side.placed,
        // Opponent ship positions are only revealed once sunk or when the match ends.
        ships: side.ships
          .filter((s) => mine || state.over || sunk(s))
          .map((s) => ({ id: s.id, size: s.size, x: s.x, y: s.y, horizontal: s.horizontal, hits: s.hits })),
        alive: side.ships.filter((s) => !sunk(s)).length,
        total: side.ships.length,
        shots: side.shots,
      };
    };
    return {
      size: state.size,
      fleet: state.fleet,
      phase: state.phase,
      mySeat: seat,
      me: seat >= 0 ? render(seat) : null,
      foe: seat >= 0 ? render(1 - seat) : render(1),
      sides: seat < 0 ? [render(0), render(1)] : undefined,
      turn: state.turn,
      turnSeat: state.turn % 2,
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-8),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    return state.players.map((p, seat) => {
      const win = state.winnerIds.includes(p.id);
      return {
        userId: p.id,
        result: win ? 'win' : 'lose',
        score: state.sides[seat].shots.filter((s) => s.hit).length,
        place: win ? 1 : 2,
      };
    });
  },

  deadline: (s) =>
    s.over ? null : s.phase === 'placement' ? s.placementDeadline : s.turnStartedAt + s.turnSeconds * 1000,
};
