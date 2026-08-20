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

/**
 * Cấp cừu trong hàng chờ bốc ngẫu nhiên như bản gốc (rand % 5), nghiêng về cừu
 * nhỏ để cừu chúa vẫn là của hiếm.
 */
function rollLevel(rng: Rng): number {
  const r = rng.next();
  if (r < 0.4) return 1;
  if (r < 0.7) return 2;
  if (r < 0.87) return 3;
  if (r < 0.96) return 4;
  return 5;
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
      log: ['Thả cừu vào làn — làn nào nặng hơn thì đẩy được đàn địch lùi về!'],
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

    // Ô xuất phát còn cừu thì chờ nó đi đã — không có luật hợp thể.
    if (occupant) return err('LANE_BLOCKED');

    units.push({
      id: state.nextUnitId,
      seat,
      lane,
      pos,
      level,
      lastMoveAt: now,
    });
    events.push({ type: 'deploy', payload: { seat, lane, level } });

    queues[seat] = queue.slice(1);

    return ok(
      {
        ...state,
        units,
        queues,
        nextUnitId: state.nextUnitId + 1,
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

    const dead = new Set<number>();

    /**
     * Ghi điểm khi một con vượt qua vạch cuối. Vượt vạch sân địch là mình ghi;
     * bị đẩy lùi qua vạch sân nhà thì đối thủ ghi — đúng như bản gốc, nơi cừu
     * chạm vạch nào cũng trừ điểm của bên giữ vạch đó.
     */
    const crossLine = (u: SheepUnit) => {
      if (u.pos >= 0 && u.pos < state.laneLength) return false;
      // Vạch dưới (pos < 0) là sân của ghế 0, vạch trên là sân của ghế 1.
      const owner = u.pos < 0 ? 0 : 1;
      const scorer = u.seat === owner ? 1 - owner : u.seat;
      score[scorer] += u.level;
      dead.add(u.id);
      log.push(`${state.players[scorer].name} ghi ${u.level} điểm`);
      events.push({ type: 'score', payload: { seat: scorer, points: u.level } });
      return true;
    };

    // Xử lý từng làn một: trong một làn, cả đàn dính nhau thành một khối đẩy.
    const byLane = new Map<number, SheepUnit[]>();
    for (const u of units) {
      const list = byLane.get(u.lane) ?? [];
      list.push(u);
      byLane.set(u.lane, list);
    }

    for (const laneUnits of byLane.values()) {
      laneUnits.sort((a, b) => a.pos - b.pos);

      // Điểm chạm: hai con sát nhau nhưng khác phe.
      let contact: [SheepUnit, SheepUnit] | null = null;
      for (let i = 0; i + 1 < laneUnits.length; i++) {
        const a = laneUnits[i];
        const b = laneUnits[i + 1];
        if (a.seat !== b.seat && b.pos - a.pos === 1) {
          contact = [a, b];
          break;
        }
      }

      if (contact) {
        const [low, high] = contact;
        // Chuỗi cừu cùng phe đứng liền sau con đầu — cả chuỗi cùng góp sức đẩy.
        const chainOf = (head: SheepUnit, step: 1 | -1) => {
          const chain = [head];
          let p = head.pos;
          for (;;) {
            const behind = laneUnits.find((u) => u.seat === head.seat && u.pos === p + step);
            if (!behind) break;
            chain.push(behind);
            p += step;
          }
          return chain;
        };
        const lowChain = chainOf(low, -1);
        const highChain = chainOf(high, 1);
        const lowWeight = lowChain.reduce((sum, u) => sum + u.level, 0);
        const highWeight = highChain.reduce((sum, u) => sum + u.level, 0);
        const both = [...lowChain, ...highChain];

        // Đang tì nhau thì đi chậm hơn lúc chạy không.
        const lastPush = Math.max(...both.map((u) => u.lastMoveAt));
        if (now - lastPush < PUSH_MS) {
          for (const u of both) u.clashAt = now;
          continue;
        }

        for (const u of both) {
          u.lastMoveAt = now;
          u.clashAt = now;
        }
        dirty = true;

        // Bên nặng hơn đẩy cả khối về phía sân bên nhẹ; cân sức thì giậm chân.
        const shift = lowWeight > highWeight ? 1 : highWeight > lowWeight ? -1 : 0;
        if (shift === 0) continue;

        const winnerSeat = shift === 1 ? low.seat : high.seat;
        events.push({ type: 'push', payload: { lane: low.lane, seat: winnerSeat } });
        for (const u of both) {
          u.pos += shift;
          crossLine(u);
        }
        continue;
      }

      // Không chạm địch: ai tới nhịp thì đi, con trước đi trước để cả hàng dồn lên.
      const advance = (u: SheepUnit) => (u.seat === 0 ? u.pos : state.laneLength - 1 - u.pos);
      const order = laneUnits.slice().sort((a, b) => advance(b) - advance(a));
      for (const mover of order) {
        if (dead.has(mover.id)) continue;
        if (now - mover.lastMoveAt < MOVE_MS) continue;
        mover.lastMoveAt = now;
        dirty = true;

        const next = mover.pos + dirOf(mover.seat);
        if (next < 0 || next >= state.laneLength) {
          mover.pos = next;
          crossLine(mover);
          continue;
        }
        // Ô trước mặt còn người thì đứng chờ — chạm địch sẽ thành thế đẩy ở tick sau.
        if (laneUnits.some((u) => !dead.has(u.id) && u.id !== mover.id && u.pos === next)) continue;
        mover.pos = next;
      }
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
