import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/**
 * Sheep Battle — dựng lại luật của game Sheep Fight (bản Unity gốc).
 *
 * Mỗi bên bắt đầu với 30 máu. Cừu chạy sang sân đối thủ, lọt qua vạch thì **trừ
 * máu** đối thủ đúng bằng `point` của nó; ai về 0 máu trước là thua. Điểm mấu
 * chốt của game là **cừu càng nặng thì càng ít sát thương**: cừu non nhẹ hều
 * nhưng trừ 7 máu, cừu chúa nặng gấp 8 lần mà chỉ trừ 1 máu. Muốn thắng thì phải
 * lùa được cừu nhỏ qua sân địch, còn cừu to chỉ để mở đường.
 *
 * Hai đàn gặp nhau trong một làn thì ghì nhau: mỗi bên cộng trọng lượng của cả
 * dây cừu liền nhau, bên nặng hơn đẩy nguyên cụm về phía sân bên nhẹ, ngang cân
 * thì đứng im. Cừu bị đẩy lùi qua vạch nhà mình chỉ mất xác chứ đối thủ không
 * được gì.
 *
 * Số liệu lấy thẳng từ kho gốc:
 * - `Assets/Prefabs/sheep-{1..5}-{w,b}.prefab` → weight/point.
 * - `GameManager.MAX_SCORE = 30`, `GameManager.maxCooldown = 5f`.
 * - `GameController.Play()` bốc cấp cừu bằng `rand.Next() % 5` (đều nhau).
 * - `GameManager.LaneDirection()` so trọng lượng hai phe trong làn.
 * - `Sheep.vel` 0.5 lúc chạy tự do, 0.3 lúc đang ghì nhau.
 */
export interface SheepConfig {
  lanes?: number;
  laneLength?: number;
  durationSeconds?: number;
  /** Máu khởi điểm của mỗi bên; bản gốc là 30. */
  startHp?: number;
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
  /** Cấp của những con sắp tới trong hàng chờ từng ghế — bản gốc hiện trước 3 con. */
  queues: number[][];
  queueSize: number;
  /** Thời điểm mỗi ghế được thả con tiếp theo (hết hồi chiêu). */
  readyAt: number[];
  hp: number[];
  startHp: number;
  endsAt: number;
  lastTick: number;
  nextUnitId: number;
  turnSeconds: number;
}

export const MAX_LEVEL = 5;

/** Trọng lượng theo cấp — prefab sheep-{1..5}: 10, 20, 40, 60, 80. */
export const SHEEP_WEIGHT = [0, 10, 20, 40, 60, 80];
/** Sát thương theo cấp — prefab sheep-{1..5}: 7, 5, 3, 2, 1. Càng to càng ít. */
export const SHEEP_POINT = [0, 7, 5, 3, 2, 1];

/** Mỗi cừu đi 1 ô sau ngần này mili-giây (Sheep.vel = 0.5). */
const MOVE_MS = 620;
/** Lúc ghì nhau cừu đi chậm còn 0.3 — chậm hơn 5/3 lần so với chạy tự do. */
const PUSH_MS = Math.round((MOVE_MS * 5) / 3);
/** GameManager.maxCooldown — mỗi lần thả cách nhau 5 giây. */
const COOLDOWN_MS = 5000;
/** GameController hiện trước 3 con kế tiếp trong hàng chờ. */
const PREVIEW = 3;

const dirOf = (seat: number) => (seat === 0 ? 1 : -1);
const spawnPos = (seat: number, laneLength: number) => (seat === 0 ? 0 : laneLength - 1);

/** Bản gốc bốc cấp bằng `rand.Next() % 5` — năm cấp đều xác suất như nhau. */
function rollLevel(rng: Rng): number {
  return 1 + Math.floor(rng.next() * MAX_LEVEL);
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
    const duration = config.durationSeconds ?? 180;
    const startHp = Math.max(5, config.startHp ?? 30);
    const now = Date.now();

    return {
      players,
      lanes,
      laneLength,
      units: [],
      queues: players.map(() => Array.from({ length: PREVIEW }, () => rollLevel(rng))),
      queueSize: PREVIEW,
      // Bản gốc cho thả ngay từ giây đầu rồi mới tính hồi chiêu.
      readyAt: players.map(() => now),
      hp: players.map(() => startHp),
      startHp,
      endsAt: now + duration * 1000,
      lastTick: now,
      nextUnitId: 1,
      turn: 0,
      turnStartedAt: now,
      winnerIds: [],
      over: false,
      log: ['Cừu nhỏ trừ nhiều máu, cừu to đẩy khoẻ — chọn đúng con mà thả!'],
      turnSeconds: 0,
    };
  },

  apply(state, playerId, type, payload, rng): ApplyResult<SheepState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (type !== 'deploy') return err('UNKNOWN_ACTION');

    const lane = Number(payload?.lane);
    if (!Number.isInteger(lane) || lane < 0 || lane >= state.lanes) return err('BAD_LANE');

    const now = Date.now();
    if (now < state.readyAt[seat]) return err('COOLDOWN');

    const queue = state.queues[seat];
    if (!queue.length) return err('QUEUE_EMPTY');

    const level = queue[0];
    const pos = spawnPos(seat, state.laneLength);
    // Ô xuất phát còn cừu thì chưa có chỗ đứng — chờ nó bước lên đã.
    if (state.units.some((u) => u.lane === lane && u.pos === pos)) return err('LANE_BLOCKED');

    const units = state.units.map((u) => ({ ...u }));
    units.push({ id: state.nextUnitId, seat, lane, pos, level, lastMoveAt: now });

    const queues = state.queues.map((q) => q.slice());
    queues[seat] = queue.slice(1);
    while (queues[seat].length < PREVIEW) queues[seat].push(rollLevel(rng));

    const readyAt = [...state.readyAt];
    readyAt[seat] = now + COOLDOWN_MS;

    return ok(
      { ...state, units, queues, readyAt, nextUnitId: state.nextUnitId + 1 },
      [{ type: 'deploy', payload: { seat, lane, level } }],
    );
  },

  tick(state, now, rng) {
    if (state.over) return ok(state);
    const events: any[] = [];
    const log: string[] = [];
    let units = state.units.map((u) => ({ ...u }));
    const queues = state.queues.map((q) => q.slice());
    const hp = [...state.hp];
    let dirty = false;

    // Hàng chờ luôn đầy 3 con; nhịp thả bị chặn bằng hồi chiêu chứ không phải bằng hàng chờ.
    state.players.forEach((_, seat) => {
      while (queues[seat].length < PREVIEW) {
        queues[seat].push(rollLevel(rng));
        dirty = true;
      }
    });

    const dead = new Set<number>();

    /**
     * Cừu chạm vạch cuối làn. Lọt qua vạch **sân địch** thì trừ máu địch đúng
     * bằng `point` của nó; bị đẩy lùi qua vạch nhà mình thì chỉ mất xác, đối thủ
     * không được gì (Sheep.OnTriggerEnter của bản gốc chỉ tính vạch phía trước).
     */
    const crossLine = (u: SheepUnit) => {
      if (u.pos >= 0 && u.pos < state.laneLength) return false;
      dead.add(u.id);
      const throughEnemyLine = u.seat === 0 ? u.pos >= state.laneLength : u.pos < 0;
      if (!throughEnemyLine) return true;
      const foe = 1 - u.seat;
      const dmg = SHEEP_POINT[u.level] ?? 1;
      hp[foe] = Math.max(0, hp[foe] - dmg);
      log.push(`${state.players[u.seat].name} lùa cừu cấp ${u.level} qua sân, trừ ${dmg} máu`);
      events.push({ type: 'score', payload: { seat: u.seat, points: dmg } });
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
        // Chuỗi cừu cùng phe đứng liền sau con đầu — cả chuỗi cùng góp trọng lượng.
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
        const heft = (chain: SheepUnit[]) => chain.reduce((sum, u) => sum + (SHEEP_WEIGHT[u.level] ?? 0), 0);
        const lowWeight = heft(lowChain);
        const highWeight = heft(highChain);
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

    const next: SheepState = {
      ...state,
      units,
      queues,
      hp,
      lastTick: now,
      log: [...state.log, ...log].slice(-20),
    };

    const dropped = hp.findIndex((h) => h <= 0);
    if (dropped >= 0) return ok(finish(next, `${state.players[1 - dropped].name} hạ sạch máu đối thủ`), events);
    if (now >= state.endsAt) return ok(finish(next, 'Hết giờ'), [...events, { type: 'time_up' }]);
    if (!dirty && !events.length) return ok(state);
    return ok(next, events);
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    const now = Date.now();
    return {
      lanes: state.lanes,
      laneLength: state.laneLength,
      units: state.units,
      hp: state.hp,
      startHp: state.startHp,
      maxLevel: MAX_LEVEL,
      /** Bảng chỉ số để client hiện đúng "nặng bao nhiêu, trừ mấy máu". */
      weights: SHEEP_WEIGHT,
      points: SHEEP_POINT,
      // Client dùng nhịp này để trượt cừu sang ô mới đúng bằng thời gian server đi.
      moveMs: MOVE_MS,
      pushMs: PUSH_MS,
      cooldownMs: COOLDOWN_MS,
      /** Mốc tuyệt đối để client tự đếm ngược hồi chiêu giữa hai lần server đẩy state. */
      readyAt: seat >= 0 ? state.readyAt[seat] : 0,
      mySeat: seat,
      // Hàng chờ của đối thủ được giấu, chỉ lộ số lượng.
      myQueue: seat >= 0 ? state.queues[seat] : [],
      queueSize: state.queueSize,
      endsAt: state.endsAt,
      remainingMs: Math.max(0, state.endsAt - now),
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-6),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    const best = Math.max(...state.hp);
    const tie = state.hp.filter((h) => h === best).length > 1;
    return state.players.map((p, seat) => ({
      userId: p.id,
      result: tie ? 'draw' : state.hp[seat] === best ? 'win' : 'lose',
      // Điểm ghi nhận là lượng máu đã lấy được của đối thủ.
      score: state.startHp - state.hp[1 - seat],
      place: state.hp[seat] === best ? 1 : 2,
    }));
  },

  deadline: (s) => (s.over ? null : s.endsAt),
};

function finish(state: SheepState, reason: string): SheepState {
  const best = Math.max(...state.hp);
  const winners = state.players.filter((_, seat) => state.hp[seat] === best);
  const tie = winners.length === state.players.length;
  return {
    ...state,
    over: true,
    winnerIds: tie ? [] : winners.map((p) => p.id),
    log: [...state.log, `${reason} — máu còn lại ${state.hp.join(' : ')}`],
  };
}
