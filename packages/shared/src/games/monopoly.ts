import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/** Cờ Tỷ Phú — bàn 28 ô, kinh tế và xúc xắc đều do server quản lý. */
export interface MonopolyConfig {
  startCash?: number;
  maxRounds?: number;
}

export type TileKind = 'start' | 'property' | 'tax' | 'chance' | 'jail' | 'gotojail' | 'park';

export interface Tile {
  index: number;
  kind: TileKind;
  name: string;
  group?: string;
  price?: number;
  baseRent?: number;
  color?: string;
}

export interface MonopolyPlayer {
  seat: number;
  cash: number;
  pos: number;
  jailTurns: number;
  bankrupt: boolean;
  properties: number[];
}

export interface MonopolyState extends BaseState {
  board: Tile[];
  cash: MonopolyPlayer[];
  owner: (number | null)[];
  houses: number[];
  dice: [number, number] | null;
  phase: 'roll' | 'decide';
  pending: { tile: number; price: number } | null;
  round: number;
  maxRounds: number;
  turnSeconds: number;
}

const GROUPS: { name: string; color: string; tiles: [string, number, number][] }[] = [
  { name: 'Hà Nội', color: '#8FD5A6', tiles: [['Hồ Gươm', 90, 9], ['Phố Cổ', 100, 11]] },
  { name: 'Huế', color: '#F6C177', tiles: [['Đại Nội', 130, 14], ['Tràng Tiền', 140, 15]] },
  { name: 'Đà Nẵng', color: '#7FC7F5', tiles: [['Cầu Rồng', 170, 19], ['Bà Nà', 180, 21]] },
  { name: 'Hội An', color: '#F59FB4', tiles: [['Chùa Cầu', 210, 24], ['Phố Đèn Lồng', 220, 26]] },
  { name: 'Sài Gòn', color: '#C6A6F5', tiles: [['Bến Thành', 260, 30], ['Bitexco', 280, 33]] },
  { name: 'Phú Quốc', color: '#FFD36E', tiles: [['Bãi Sao', 320, 40], ['Hòn Thơm', 350, 45]] },
];

const CHANCE_CARDS: { text: string; cash: number; move?: number }[] = [
  { text: 'Trúng số nhỏ: +120', cash: 120 },
  { text: 'Thưởng cuối năm: +200', cash: 200 },
  { text: 'Sửa nhà: -90', cash: -90 },
  { text: 'Phạt nguội: -60', cash: -60 },
  { text: 'Về ô Xuất Phát nhận +200', cash: 200, move: 0 },
  { text: 'Đi du lịch: tiến 3 ô', cash: 0, move: -3 },
];

function buildBoard(): Tile[] {
  const board: Tile[] = [];
  const push = (t: Omit<Tile, 'index'>) => board.push({ ...t, index: board.length });
  push({ kind: 'start', name: 'Xuất Phát' });
  GROUPS.forEach((g, gi) => {
    g.tiles.forEach(([name, price, rent], i) => {
      push({ kind: 'property', name, group: g.name, price, baseRent: rent, color: g.color });
      if (i === 0 && gi % 2 === 0) push({ kind: 'chance', name: 'Cơ Hội' });
    });
    if (gi === 1) push({ kind: 'jail', name: 'Nhà Tù (thăm)' });
    if (gi === 2) push({ kind: 'tax', name: 'Thuế 10%' });
    if (gi === 3) push({ kind: 'park', name: 'Bãi Đỗ' });
    if (gi === 4) push({ kind: 'gotojail', name: 'Vào Tù' });
  });
  push({ kind: 'chance', name: 'Cơ Hội' });
  // Bàn cờ phải chia hết cho 4 để 4 cạnh dài bằng nhau khi render.
  const filler: TileKind[] = ['chance', 'park', 'tax'];
  while (board.length % 4 !== 0) {
    const kind = filler[board.length % filler.length];
    push({ kind, name: kind === 'chance' ? 'Cơ Hội' : kind === 'park' ? 'Bãi Đỗ' : 'Thuế 10%' });
  }
  return board;
}

export const MonopolyEngine: GameEngine<MonopolyState, MonopolyConfig> = {
  id: 'monopoly',
  minPlayers: 2,
  maxPlayers: 4,
  turnSeconds: 25,

  init(players: EnginePlayer[], config: MonopolyConfig = {}): MonopolyState {
    const board = buildBoard();
    const startCash = config.startCash ?? 1500;
    return {
      players,
      board,
      cash: players.map((_, seat) => ({
        seat,
        cash: startCash,
        pos: 0,
        jailTurns: 0,
        bankrupt: false,
        properties: [],
      })),
      owner: board.map(() => null),
      houses: board.map(() => 0),
      dice: null,
      phase: 'roll',
      pending: null,
      round: 1,
      maxRounds: config.maxRounds ?? 30,
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: [`Mỗi người bắt đầu với $${startCash}`],
      turnSeconds: 25,
    };
  },

  apply(state, playerId, type, payload, rng): ApplyResult<MonopolyState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (seat !== activeSeat(state)) return err('NOT_YOUR_TURN');

    if (type === 'roll') {
      if (state.phase !== 'roll') return err('ALREADY_ROLLED');
      return ok(...doRoll(state, seat, rng));
    }
    if (type === 'buy' || type === 'skip') {
      if (state.phase !== 'decide' || !state.pending) return err('NOTHING_TO_DECIDE');
      const me = state.cash[seat];
      const { tile, price } = state.pending;
      if (type === 'skip' || me.cash < price) {
        return ok(nextTurn({ ...state, phase: 'roll', pending: null }), [
          { type: 'skip', payload: { seat, tile } },
        ]);
      }
      const cash = state.cash.map((c) => ({ ...c, properties: c.properties.slice() }));
      cash[seat].cash -= price;
      cash[seat].properties.push(tile);
      const owner = state.owner.slice();
      owner[tile] = seat;
      const next: MonopolyState = {
        ...state,
        cash,
        owner,
        phase: 'roll',
        pending: null,
        log: [...state.log, `${state.players[seat].name} mua ${state.board[tile].name} giá $${price}`].slice(-20),
      };
      return ok(nextTurn(next), [{ type: 'buy', payload: { seat, tile, price } }]);
    }
    return err('UNKNOWN_ACTION');
  },

  timeout(state, rng) {
    if (state.over) return ok(state);
    const seat = activeSeat(state);
    const pid = state.players[seat].id;
    const action = state.phase === 'roll' ? 'roll' : 'skip';
    const r = MonopolyEngine.apply(state, pid, action, {}, rng);
    return r.ok ? ok(r.state, r.events) : ok(nextTurn({ ...state, phase: 'roll', pending: null }));
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    return {
      board: state.board,
      cash: state.cash,
      owner: state.owner,
      dice: state.dice,
      phase: state.phase,
      pending: state.pending,
      round: state.round,
      maxRounds: state.maxRounds,
      turnSeat: activeSeat(state),
      mySeat: seat,
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-8),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    const ranked = state.cash
      .map((c) => ({ seat: c.seat, worth: netWorth(state, c.seat), bankrupt: c.bankrupt }))
      .sort((a, b) => (a.bankrupt === b.bankrupt ? b.worth - a.worth : a.bankrupt ? 1 : -1));
    return state.players.map((p, seat) => {
      const place = ranked.findIndex((r) => r.seat === seat) + 1;
      return {
        userId: p.id,
        result: place === 1 ? 'win' : 'lose',
        score: netWorth(state, seat),
        place,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.turnStartedAt + s.turnSeconds * 1000),
};

function netWorth(state: MonopolyState, seat: number): number {
  const me = state.cash[seat];
  return me.cash + me.properties.reduce((sum, t) => sum + (state.board[t].price ?? 0), 0);
}

function activeSeat(state: MonopolyState): number {
  const n = state.players.length;
  let seat = state.turn % n;
  for (let i = 0; i < n; i++) {
    if (!state.cash[seat].bankrupt) return seat;
    seat = (seat + 1) % n;
  }
  return seat;
}

function doRoll(state: MonopolyState, seat: number, rng: Rng): [MonopolyState, any[]] {
  const d: [number, number] = [rng.dice(6), rng.dice(6)];
  const sum = d[0] + d[1];
  const cash = state.cash.map((c) => ({ ...c, properties: c.properties.slice() }));
  const log: string[] = [`${state.players[seat].name} tung ${d[0]}+${d[1]}=${sum}`];
  const events: any[] = [{ type: 'roll', payload: { seat, dice: d } }];
  const me = cash[seat];

  if (me.jailTurns > 0) {
    if (d[0] === d[1]) {
      me.jailTurns = 0;
      log.push('Ra đôi — thoát tù!');
    } else {
      me.jailTurns -= 1;
      log.push(`Còn ngồi tù ${me.jailTurns} lượt`);
      return [nextTurn({ ...state, cash, dice: d, log: [...state.log, ...log].slice(-20) }), events];
    }
  }

  const before = me.pos;
  me.pos = (me.pos + sum) % state.board.length;
  if (me.pos < before) {
    me.cash += 200;
    log.push('Qua Xuất Phát: +$200');
  }

  const tile = state.board[me.pos];
  const owner = state.owner.slice();
  let pending: MonopolyState['pending'] = null;

  if (tile.kind === 'property') {
    const holder = owner[tile.index];
    if (holder == null) {
      pending = { tile: tile.index, price: tile.price! };
      log.push(`Dừng ở ${tile.name} — có thể mua giá $${tile.price}`);
    } else if (holder !== seat && !cash[holder].bankrupt) {
      const sameGroup = state.board.filter((t) => t.group === tile.group);
      const monopoly = sameGroup.every((t) => owner[t.index] === holder);
      const rent = Math.round(tile.baseRent! * (monopoly ? 2 : 1));
      me.cash -= rent;
      cash[holder].cash += rent;
      log.push(`Trả tô $${rent} cho ${state.players[holder].name}${monopoly ? ' (độc quyền x2)' : ''}`);
      events.push({ type: 'rent', payload: { from: seat, to: holder, rent } });
    }
  } else if (tile.kind === 'tax') {
    const tax = Math.round(netWorth(state, seat) * 0.1);
    me.cash -= tax;
    log.push(`Đóng thuế $${tax}`);
  } else if (tile.kind === 'gotojail') {
    me.pos = state.board.findIndex((t) => t.kind === 'jail');
    me.jailTurns = 2;
    log.push('Vào tù 2 lượt 🚔');
  } else if (tile.kind === 'chance') {
    const card = rng.pick(CHANCE_CARDS);
    me.cash += card.cash;
    if (card.move === 0) me.pos = 0;
    else if (card.move) me.pos = (me.pos - card.move + state.board.length) % state.board.length;
    log.push(`Cơ hội: ${card.text}`);
    events.push({ type: 'chance', payload: { seat, text: card.text } });
  }

  if (me.cash < 0) {
    me.bankrupt = true;
    me.properties.forEach((t) => (owner[t] = null));
    me.properties = [];
    log.push(`${state.players[seat].name} phá sản 💥`);
    events.push({ type: 'bankrupt', payload: { seat } });
  }

  let next: MonopolyState = {
    ...state,
    cash,
    owner,
    dice: d,
    pending,
    phase: pending ? 'decide' : 'roll',
    turnStartedAt: Date.now(),
    log: [...state.log, ...log].slice(-20),
  };

  const alive = next.cash.filter((c) => !c.bankrupt);
  if (alive.length <= 1 || next.round > next.maxRounds) {
    const best = [...next.cash]
      .filter((c) => !c.bankrupt)
      .sort((a, b) => netWorth(next, b.seat) - netWorth(next, a.seat))[0];
    next = {
      ...next,
      over: true,
      winnerIds: best ? [state.players[best.seat].id] : [],
      log: [...next.log, 'Kết thúc ván tỷ phú'],
    };
    return [next, events];
  }
  return [pending ? next : nextTurn(next), events];
}

function nextTurn(state: MonopolyState): MonopolyState {
  const turn = state.turn + 1;
  return {
    ...state,
    turn,
    dice: state.dice,
    phase: 'roll',
    pending: null,
    round: Math.floor(turn / state.players.length) + 1,
    turnStartedAt: Date.now(),
  };
}
