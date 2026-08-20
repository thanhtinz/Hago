import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/** Ma Sói — state machine theo phase, mọi thông tin ẩn giữ nguyên trên server. */
export type Role = 'werewolf' | 'seer' | 'guard' | 'witch' | 'hunter' | 'villager';

export interface WerewolfConfig {
  discussSeconds?: number;
  nightSeconds?: number;
  voteSeconds?: number;
}

export type Phase = 'night' | 'day' | 'vote' | 'result';

export interface WolfPlayer {
  seat: number;
  role: Role;
  alive: boolean;
  /** Đã dùng bình cứu / bình độc (phù thủy). */
  potionHeal: boolean;
  potionPoison: boolean;
}

export interface WerewolfState extends BaseState {
  phase: Phase;
  day: number;
  seats: WolfPlayer[];
  phaseEndsAt: number;
  discussSeconds: number;
  nightSeconds: number;
  voteSeconds: number;
  /** Hành động ban đêm của lượt hiện tại: seat -> target seat. */
  nightActions: Record<number, number>;
  votes: Record<number, number>;
  /** Kết quả soi của tiên tri, chỉ gửi riêng cho tiên tri. */
  seerResults: { day: number; target: number; isWolf: boolean }[];
  lastGuarded: number | null;
  deaths: { day: number; seat: number; cause: string }[];
  winner: 'wolves' | 'village' | null;
  turnSeconds: number;
}

function rolesFor(n: number): Role[] {
  const wolves = Math.max(1, Math.floor(n / 4));
  const roles: Role[] = [];
  for (let i = 0; i < wolves; i++) roles.push('werewolf');
  roles.push('seer');
  if (n >= 6) roles.push('guard');
  if (n >= 8) roles.push('witch');
  if (n >= 10) roles.push('hunter');
  while (roles.length < n) roles.push('villager');
  return roles.slice(0, n);
}

const WOLF_ROLES: Role[] = ['werewolf'];

export const WerewolfEngine: GameEngine<WerewolfState, WerewolfConfig> = {
  id: 'werewolf',
  minPlayers: 4,
  maxPlayers: 16,
  turnSeconds: 0,
  realtime: true,

  init(players: EnginePlayer[], config: WerewolfConfig = {}, rng: Rng): WerewolfState {
    const roles = rng.shuffle(rolesFor(players.length));
    const nightSeconds = config.nightSeconds ?? 45;
    return {
      players,
      phase: 'night',
      day: 1,
      seats: players.map((_, seat) => ({
        seat,
        role: roles[seat],
        alive: true,
        potionHeal: true,
        potionPoison: true,
      })),
      phaseEndsAt: Date.now() + nightSeconds * 1000,
      discussSeconds: config.discussSeconds ?? 90,
      nightSeconds,
      voteSeconds: config.voteSeconds ?? 40,
      nightActions: {},
      votes: {},
      seerResults: [],
      lastGuarded: null,
      deaths: [],
      winner: null,
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: ['Đêm đầu tiên buông xuống. Sói thức dậy...'],
      turnSeconds: 0,
    };
  },

  apply(state, playerId, type, payload): ApplyResult<WerewolfState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    const me = state.seats[seat];
    if (!me.alive) return err('YOU_ARE_DEAD');
    const target = Number(payload?.target);

    if (type === 'night_action') {
      if (state.phase !== 'night') return err('NOT_NIGHT');
      if (!Number.isInteger(target) || !state.seats[target]) return err('BAD_TARGET');
      if (!state.seats[target].alive) return err('TARGET_DEAD');
      if (me.role === 'villager' || me.role === 'hunter') return err('NO_NIGHT_ACTION');
      if (me.role === 'guard' && target === state.lastGuarded) return err('CANNOT_GUARD_TWICE');
      if (me.role === 'werewolf' && state.seats[target].role === 'werewolf') return err('CANNOT_EAT_ALLY');

      const nightActions = { ...state.nightActions, [seat]: target };
      let next: WerewolfState = { ...state, nightActions };

      if (me.role === 'seer') {
        next = {
          ...next,
          seerResults: [
            ...next.seerResults,
            { day: state.day, target, isWolf: WOLF_ROLES.includes(state.seats[target].role) },
          ],
        };
      }

      // Tất cả vai có hành động đêm đã chọn xong → sang ngày sớm.
      const actors = state.seats.filter(
        (s) => s.alive && s.role !== 'villager' && s.role !== 'hunter',
      );
      if (actors.every((a) => nightActions[a.seat] != null)) return ok(...resolveNight(next));
      return ok(next, [{ type: 'night_action_ack', to: playerId, payload: { target } }]);
    }

    if (type === 'vote') {
      if (state.phase !== 'vote') return err('NOT_VOTE_PHASE');
      if (!Number.isInteger(target) || !state.seats[target]?.alive) return err('BAD_TARGET');
      const votes = { ...state.votes, [seat]: target };
      const next: WerewolfState = { ...state, votes };
      const alive = state.seats.filter((s) => s.alive);
      if (alive.every((a) => votes[a.seat] != null)) return ok(...resolveVote(next));
      return ok(next, [{ type: 'vote', payload: { seat, target } }]);
    }

    if (type === 'ready_vote') {
      if (state.phase !== 'day') return err('NOT_DAY');
      return ok(...startVote(state));
    }

    return err('UNKNOWN_ACTION');
  },

  tick(state, now, rng) {
    if (state.over || now < state.phaseEndsAt) return ok(state);
    if (state.phase === 'night') {
      // Hết giờ đêm: server tự chọn mục tiêu cho các vai chưa hành động,
      // nếu không ván đấu sẽ đứng yên vô hạn.
      const nightActions = { ...state.nightActions };
      const alive = state.seats.filter((s) => s.alive);
      for (const s of alive) {
        if (nightActions[s.seat] != null) continue;
        if (s.role === 'werewolf') {
          const prey = alive.filter((o) => o.role !== 'werewolf');
          if (prey.length) nightActions[s.seat] = rng.pick(prey).seat;
        }
      }
      return ok(...resolveNight({ ...state, nightActions }));
    }
    if (state.phase === 'day') return ok(...startVote(state));
    if (state.phase === 'vote') return ok(...resolveVote(state));
    return ok(state);
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    const me = seat >= 0 ? state.seats[seat] : null;
    const revealAll = state.over;
    const iAmWolf = me?.role === 'werewolf';
    return {
      phase: state.phase,
      day: state.day,
      phaseEndsAt: state.phaseEndsAt,
      remainingMs: Math.max(0, state.phaseEndsAt - Date.now()),
      mySeat: seat,
      myRole: me?.role ?? null,
      myPotions: me ? { heal: me.potionHeal, poison: me.potionPoison } : null,
      seats: state.seats.map((s) => ({
        seat: s.seat,
        alive: s.alive,
        name: state.players[s.seat].name,
        // Vai chỉ lộ khi hết ván, khi đã chết, hoặc với đồng đội sói.
        role: revealAll || !s.alive || s.seat === seat || (iAmWolf && s.role === 'werewolf') ? s.role : null,
      })),
      seerResults: me?.role === 'seer' ? state.seerResults : [],
      votes: state.phase === 'vote' || state.phase === 'day' ? state.votes : {},
      myNightTarget: seat >= 0 ? state.nightActions[seat] ?? null : null,
      deaths: state.deaths,
      winner: state.winner,
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-10),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    return state.players.map((p, seat) => {
      const s = state.seats[seat];
      const isWolf = WOLF_ROLES.includes(s.role);
      const won = state.winner === (isWolf ? 'wolves' : 'village');
      return {
        userId: p.id,
        result: won ? 'win' : 'lose',
        score: (won ? 100 : 0) + (s.alive ? 20 : 0),
        place: won ? 1 : 2,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.phaseEndsAt),
};

function resolveNight(state: WerewolfState): [WerewolfState, any[]] {
  const seats = state.seats.map((s) => ({ ...s }));
  const log: string[] = [];
  const events: any[] = [];

  const wolfVotes: Record<number, number> = {};
  let guarded: number | null = null;
  let poisoned: number | null = null;
  let healed = false;

  for (const [rawSeat, target] of Object.entries(state.nightActions)) {
    const s = seats[Number(rawSeat)];
    if (!s?.alive) continue;
    if (s.role === 'werewolf') wolfVotes[target] = (wolfVotes[target] ?? 0) + 1;
    if (s.role === 'guard') guarded = target;
    if (s.role === 'witch') {
      // Phù thủy: mục tiêu là chính nạn nhân → cứu; ngược lại → đầu độc.
      if (s.potionHeal && wolfVotes[target] != null) {
        healed = true;
        s.potionHeal = false;
      } else if (s.potionPoison) {
        poisoned = target;
        s.potionPoison = false;
      }
    }
  }

  let victim: number | null = null;
  let best = 0;
  for (const [t, count] of Object.entries(wolfVotes)) {
    if (count > best) {
      best = count;
      victim = Number(t);
    }
  }

  const deaths = [...state.deaths];
  if (victim != null && victim !== guarded && !healed) {
    seats[victim].alive = false;
    deaths.push({ day: state.day, seat: victim, cause: 'wolf' });
    log.push(`🌙 ${state.players[victim].name} đã bị sói cắn chết.`);
  } else if (victim != null) {
    log.push('🌙 Đêm nay không ai chết — có người đã được bảo vệ.');
  } else {
    log.push('🌙 Một đêm yên tĩnh trôi qua.');
  }
  if (poisoned != null && seats[poisoned].alive) {
    seats[poisoned].alive = false;
    deaths.push({ day: state.day, seat: poisoned, cause: 'poison' });
    log.push(`☠️ ${state.players[poisoned].name} trúng độc của phù thủy.`);
  }

  let next: WerewolfState = {
    ...state,
    seats,
    deaths,
    phase: 'day',
    nightActions: {},
    lastGuarded: guarded,
    phaseEndsAt: Date.now() + state.discussSeconds * 1000,
    log: [...state.log, ...log, `☀️ Ngày ${state.day} — thảo luận ${state.discussSeconds}s`].slice(-40),
  };
  events.push({ type: 'phase', payload: { phase: 'day', day: next.day } });
  const done = checkWin(next);
  return [done, events];
}

function startVote(state: WerewolfState): [WerewolfState, any[]] {
  return [
    {
      ...state,
      phase: 'vote',
      votes: {},
      phaseEndsAt: Date.now() + state.voteSeconds * 1000,
      log: [...state.log, `🗳️ Bỏ phiếu treo cổ (${state.voteSeconds}s)`].slice(-40),
    },
    [{ type: 'phase', payload: { phase: 'vote' } }],
  ];
}

function resolveVote(state: WerewolfState): [WerewolfState, any[]] {
  const tally: Record<number, number> = {};
  Object.values(state.votes).forEach((t) => (tally[t] = (tally[t] ?? 0) + 1));
  let lynched: number | null = null;
  let best = 0;
  let tie = false;
  for (const [t, c] of Object.entries(tally)) {
    if (c > best) {
      best = c;
      lynched = Number(t);
      tie = false;
    } else if (c === best) tie = true;
  }

  const seats = state.seats.map((s) => ({ ...s }));
  const deaths = [...state.deaths];
  const log: string[] = [];
  if (lynched != null && !tie) {
    seats[lynched].alive = false;
    deaths.push({ day: state.day, seat: lynched, cause: 'lynch' });
    log.push(
      `⚖️ Dân làng treo cổ ${state.players[lynched].name} — vai trò: ${seats[lynched].role}.`,
    );
  } else {
    log.push('⚖️ Phiếu hòa — không ai bị treo cổ.');
  }

  const next: WerewolfState = {
    ...state,
    seats,
    deaths,
    votes: {},
    day: state.day + 1,
    phase: 'night',
    phaseEndsAt: Date.now() + state.nightSeconds * 1000,
    log: [...state.log, ...log, `🌙 Đêm ${state.day + 1} bắt đầu`].slice(-40),
  };
  return [checkWin(next), [{ type: 'phase', payload: { phase: 'night' } }]];
}

const MAX_DAYS = 15;

function checkWin(state: WerewolfState): WerewolfState {
  const alive = state.seats.filter((s) => s.alive);
  const wolves = alive.filter((s) => WOLF_ROLES.includes(s.role)).length;
  const villagers = alive.length - wolves;
  let winner: WerewolfState['winner'] = null;
  if (wolves === 0) winner = 'village';
  else if (wolves >= villagers) winner = 'wolves';
  // Chốt ván nếu kéo quá dài (phòng trường hợp cả làng bỏ phiếu hòa liên tục).
  else if (state.day > MAX_DAYS) winner = 'wolves';
  if (!winner) return state;
  const winnerIds = state.seats
    .filter((s) => (winner === 'wolves') === WOLF_ROLES.includes(s.role))
    .map((s) => state.players[s.seat].id);
  return {
    ...state,
    phase: 'result',
    winner,
    over: true,
    winnerIds,
    log: [...state.log, winner === 'wolves' ? '🐺 Phe Sói chiến thắng!' : '🏡 Phe Dân làng chiến thắng!'],
  };
}
