import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/**
 * Sheep Battle — đấu cừu theo làn.
 *
 * Hai người chơi đứng hai đầu sân cỏ chia thành nhiều làn dọc. Mỗi bên có một
 * hàng chờ cừu; thả cừu vào làn nào thì cừu tự đi về phía đối thủ. Hai cừu cùng
 * cấp của mình chồng lên nhau sẽ hợp thành cừu cấp cao hơn (cừu → cừu sừng →
 * dê → hươu → kỳ lân). Cừu hai bên gặp nhau thì trừ cấp lẫn nhau, bên nào còn
 * cấp thì đi tiếp. Cừu chạy lọt qua đầu sân đối thủ sẽ ghi điểm bằng đúng cấp
 * của nó — ai đạt mốc điểm trước, hoặc dẫn điểm khi hết giờ, là người thắng.
 */
export interface SheepConfig {
  lanes?: number;
  laneLength?: number;
  durationSeconds?: number;
  targetScore?: number;
  queueSize?: number;
}

export interface SheepUnit {
  id: number;
  seat: number;
  lane: number;
  /** Vị trí tuyệt đối trong làn: 0 là đầu sân của ghế 0, laneLength-1 là đầu sân ghế 1. */
  pos: number;
  level: number;
  lastMoveAt: number;
  /** Đánh dấu để client chạy hiệu ứng va chạm. */
  clashAt?: number;
  /** Đang ghì nhau tới thời điểm này thì chưa ai đi tiếp. */
  lockUntil?: number;
}

export interface SheepState extends BaseState {
  lanes: number;
  laneLength: number;
  units: SheepUnit[];
  /** Hàng chờ cừu sắp thả của từng ghế (giá trị là cấp). */
  queues: number[][];
  queueSize: number;
  refillAt: number[];
  score: number[];
  targetScore: number;
  endsAt: number;
  lastTick: number;
  nextUnitId: number;
  turnSeconds: number;
}

export const MAX_LEVEL = 5;
/** Mỗi cừu đi 1 ô sau ngần này mili-giây. */
const MOVE_MS = 620;
/** Hai bên chạm nhau thì ghì nhau chừng này rồi mới phân thắng bại. */
const PUSH_MS = 700;
/** Hàng chờ hồi thêm 1 con cừu sau ngần này mili-giây. */
const REFILL_MS = 1400;

const dirOf = (seat: number) => (seat === 0 ? 1 : -1);
const spawnPos = (seat: number, laneLength: number) => (seat === 0 ? 0 : laneLength - 1);

/** Cừu mới chủ yếu là cấp 1, thỉnh thoảng được cấp 2 cho đỡ nhàm. */
function rollLevel(rng: Rng): number {
  return rng.next() < 0.18 ? 2 : 1;
}

export const SheepEngine: GameEngine<SheepState, SheepConfig> = {
  id: 'sheep',
  minPlayers: 2,
  maxPlayers: 2,
  turnSeconds: 0,
  realtime: true,

  init(players: EnginePlayer[], config: SheepConfig = {}, rng: Rng): SheepState {
    const lanes = Math.min(6, Math.max(3, config.lanes ?? 5));
    const laneLength = Math.min(16, Math.max(7, config.laneLength ?? 9));
    const duration = config.durationSeconds ?? 120;
    const queueSize = Math.min(6, Math.max(2, config.queueSize ?? 4));
    const now = Date.now();

    return {
      players,
      lanes,
      laneLength,
      units: [],
      queues: players.map(() => Array.from({ length: queueSize }, () => rollLevel(rng))),
      queueSize,
      refillAt: players.map(() => now + REFILL_MS),
      score: players.map(() => 0),
      targetScore: config.targetScore ?? 20,
      endsAt: now + duration * 1000,
      lastTick: now,
      nextUnitId: 1,
      turn: 0,
      turnStartedAt: now,
      winnerIds: [],
      over: false,
      log: ['Thả cừu vào làn — hai cừu cùng cấp chồng lên nhau sẽ tiến hoá!'],
      turnSeconds: 0,
    };
  },

  apply(state, playerId, type, payload): ApplyResult<SheepState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (type !== 'deploy') return err('UNKNOWN_ACTION');

    const lane = Number(payload?.lane);
    if (!Number.isInteger(lane) || lane < 0 || lane >= state.lanes) return err('BAD_LANE');
    const queue = state.queues[seat];
    if (!queue.length) return err('QUEUE_EMPTY');

    const level = queue[0];
    const pos = spawnPos(seat, state.laneLength);
    const occupant = state.units.find((u) => u.lane === lane && u.pos === pos);

    const units = state.units.map((u) => ({ ...u }));
    const queues = state.queues.map((q) => q.slice());
    const now = Date.now();
    const log: string[] = [];
    const events: any[] = [];

    if (occupant) {
      if (occupant.seat !== seat) return err('LANE_BLOCKED');
      if (occupant.level !== level) return err('LANE_BLOCKED');
      if (occupant.level >= MAX_LEVEL) return err('MAX_LEVEL_REACHED');
      // Thả trúng cừu cùng cấp ở ô xuất phát → tiến hoá tại chỗ.
      const target = units.find((u) => u.id === occupant.id)!;
      target.level += 1;
      log.push(`${state.players[seat].name} tiến hoá cừu lên cấp ${target.level}`);
      events.push({ type: 'merge', payload: { seat, lane, level: target.level } });
    } else {
      units.push({
        id: state.nextUnitId,
        seat,
        lane,
        pos,
        level,
        lastMoveAt: now,
      });
      events.push({ type: 'deploy', payload: { seat, lane, level } });
    }

    queues[seat] = queue.slice(1);

    return ok(
      {
        ...state,
        units,
        queues,
        nextUnitId: state.nextUnitId + (occupant ? 0 : 1),
        log: [...state.log, ...log].slice(-20),
      },
      events,
    );
  },

  tick(state, now, rng) {
    if (state.over) return ok(state);
    const events: any[] = [];
    const log: string[] = [];
    let units = state.units.map((u) => ({ ...u }));
    const queues = state.queues.map((q) => q.slice());
    const refillAt = [...state.refillAt];
    const score = [...state.score];
    let dirty = false;

    // Hồi hàng chờ cừu.
    state.players.forEach((_, seat) => {
      if (now >= refillAt[seat]) {
        refillAt[seat] = now + REFILL_MS;
        if (queues[seat].length < state.queueSize) {
          queues[seat].push(rollLevel(rng));
          dirty = true;
        }
      }
    });

    // Cừu đi trước là cừu đang tiến sâu nhất vào phần sân đối phương.
    const advance = (u: SheepUnit) => (u.seat === 0 ? u.pos : state.laneLength - 1 - u.pos);
    const order = units.slice().sort((a, b) => advance(b) - advance(a));
    const dead = new Set<number>();

    for (const mover of order) {
      if (dead.has(mover.id)) continue;
      // Đang ghì nhau: đứng tại chỗ đẩy, chưa đi và chưa phân thắng bại.
      if (mover.lockUntil && now < mover.lockUntil) continue;
      if (now - mover.lastMoveAt < MOVE_MS) continue;
      mover.lastMoveAt = now;
      dirty = true;

      const dir = dirOf(mover.seat);
      const next = mover.pos + dir;

      // Lọt qua đầu sân đối thủ → ghi điểm bằng đúng cấp của cừu.
      if (next < 0 || next >= state.laneLength) {
        score[mover.seat] += mover.level;
        dead.add(mover.id);
        log.push(`${state.players[mover.seat].name} ghi ${mover.level} điểm`);
        events.push({ type: 'score', payload: { seat: mover.seat, points: mover.level } });
        continue;
      }

      const target = units.find((u) => !dead.has(u.id) && u.id !== mover.id && u.lane === mover.lane && u.pos === next);

      if (!target) {
        mover.pos = next;
        continue;
      }

      if (target.seat === mover.seat) {
        // Cừu nhà: cùng cấp thì hợp nhất, khác cấp thì đứng chờ.
        if (target.level === mover.level && target.level < MAX_LEVEL) {
          target.level += 1;
          dead.add(mover.id);
          events.push({ type: 'merge', payload: { seat: mover.seat, lane: mover.lane, level: target.level } });
        }
        continue;
      }

      // Chạm cừu địch: ghì nhau một nhịp cho thấy hai bên đang đẩy, hết nhịp
      // mới trừ cấp. Không có nhịp này thì va chạm xong trong một tick, người
      // chơi chỉ thấy cừu biến mất.
      if (!mover.lockUntil || !target.lockUntil) {
        mover.lockUntil = now + PUSH_MS;
        target.lockUntil = now + PUSH_MS;
        mover.clashAt = now;
        target.clashAt = now;
        events.push({ type: 'clash', payload: { lane: mover.lane, pos: next, by: mover.seat } });
        continue;
      }

      const damage = Math.min(mover.level, target.level);
      mover.level -= damage;
      target.level -= damage;
      mover.clashAt = now;
      target.clashAt = now;
      events.push({
        type: 'clash',
        payload: { lane: mover.lane, pos: next, by: mover.seat },
      });
      mover.lockUntil = undefined;
      target.lockUntil = undefined;
      if (target.level <= 0) dead.add(target.id);
      if (mover.level <= 0) dead.add(mover.id);
      // Thắng giao tranh thì tràn lên ô vừa dọn sạch.
      if (mover.level > 0 && target.level <= 0) mover.pos = next;
    }

    units = units.filter((u) => !dead.has(u.id));

    let next: SheepState = {
      ...state,
      units,
      queues,
      refillAt,
      score,
      lastTick: now,
      log: [...state.log, ...log].slice(-20),
    };

    const winner = score.findIndex((s) => s >= state.targetScore);
    if (winner >= 0) return ok(finish(next, `${state.players[winner].name} cán mốc ${state.targetScore} điểm`), events);
    if (now >= state.endsAt) return ok(finish(next, 'Hết giờ'), [...events, { type: 'time_up' }]);
    if (!dirty && !events.length) return ok(state);
    return ok(next, events);
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    return {
      lanes: state.lanes,
      laneLength: state.laneLength,
      units: state.units,
      score: state.score,
      targetScore: state.targetScore,
      maxLevel: MAX_LEVEL,
      // Client dùng nhịp này để trượt cừu sang ô mới đúng bằng thời gian server đi.
      moveMs: MOVE_MS,
      pushMs: PUSH_MS,
      mySeat: seat,
      // Hàng chờ của đối thủ được giấu, chỉ lộ số lượng.
      myQueue: seat >= 0 ? state.queues[seat] : [],
      foeQueueCount: seat >= 0 ? state.queues[1 - seat]?.length ?? 0 : 0,
      queueSize: state.queueSize,
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
    const top = Math.max(...state.score);
    const tie = state.score.filter((s) => s === top).length > 1;
    return state.players.map((p, seat) => ({
      userId: p.id,
      result: tie ? 'draw' : state.score[seat] === top ? 'win' : 'lose',
      score: state.score[seat],
      place: state.score[seat] === top ? 1 : 2,
    }));
  },

  deadline: (s) => (s.over ? null : s.endsAt),
};

function finish(state: SheepState, reason: string): SheepState {
  const top = Math.max(...state.score);
  const winners = state.players.filter((_, seat) => state.score[seat] === top);
  const tie = winners.length === state.players.length;
  return {
    ...state,
    over: true,
    winnerIds: tie ? [] : winners.map((p) => p.id),
    log: [...state.log, `${reason} — tỉ số ${state.score.join(' : ')}`],
  };
}
