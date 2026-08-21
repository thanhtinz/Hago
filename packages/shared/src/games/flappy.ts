import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';
import { Rng } from '../rng';

/**
 * Flappy Bird — chơi một mình, luồn qua càng nhiều ống càng tốt.
 *
 * Không có đối thủ: điểm của ván là số ống đã qua, đem so trên bảng xếp hạng
 * điểm cao nhất chứ không tính thắng thua hay rating. Ống sinh từ seed của ván
 * nên cùng một seed là cùng một đường ống, tiện cho việc kiểm thử và phát lại.
 *
 * Thế giới đo bằng đơn vị ảo (rộng `WORLD_W`, cao `WORLD_H`); client co lại cho
 * vừa màn hình. Server tick 200ms một lần — quá thô để tính va chạm — nên mỗi
 * lần tick engine chia nhỏ thành từng bước `STEP_MS` rồi mới xét chạm, nhờ vậy
 * chim không "xuyên" qua mép ống.
 */
export interface FlappyConfig {
  /** Số ống phải qua để thắng ngay; 0 là bay tới khi rơi. */
  targetScore?: number;
  pipeGap?: number;
}

export interface FlappyBird {
  seat: number;
  y: number;
  vy: number;
  alive: boolean;
  score: number;
  /** Quãng đường đã bay, dùng để hiển thị và so kỷ lục phụ. */
  dist: number;
  /** Nhịp vỗ cánh gần nhất, để client nghiêng cánh cho khớp. */
  flapAt: number;
}

export interface FlappyPipe {
  /** Toạ độ x của mép trái ống. */
  x: number;
  /** Tâm khe hở. */
  gapY: number;
}

export interface FlappyState extends BaseState {
  birds: FlappyBird[];
  pipes: FlappyPipe[];
  /** Mốc thời gian bắt đầu bay; trước mốc này là đếm ngược vào trận. */
  startAt: number;
  lastTick: number;
  /** Vị trí ngang của chim. */
  x: number;
  targetScore: number;
  gap: number;
  ending: string | null;
  turnSeconds: number;
}

export const WORLD_W = 360;
/**
 * Khung trời cao gần gấp đôi bề ngang để tỉ lệ khớp màn điện thoại dọc — co
 * theo bề rộng là vừa kín màn hình, không còn dải trống trên dưới.
 */
export const WORLD_H = 720;
/** Chim bay ngang với tốc độ này (đơn vị/giây). */
const SPEED = 132;
const GRAVITY = 1250;
const FLAP_V = -390;
const BIRD_X = 96;
const BIRD_R = 15;
const PIPE_W = 62;
const PIPE_SPACING = 210;
/** Bước tính va chạm bên trong một lần tick. */
const STEP_MS = 20;
/** Đếm ngược trước khi thả chim, để người chơi kịp cầm máy. */
const COUNTDOWN_MS = 3000;
/** Sinh sẵn ngần này ống, đủ cho một ván rất dài. */
const PIPE_COUNT = 400;
/**
 * Ống đầu tiên đặt xa hẳn: chim bay 132 đơn vị/giây, để ở 300 thì chỉ 1,4 giây
 * sau khi hết đếm ngược là đã tới ống — không kịp phản xạ. 560 cho hơn 3 giây
 * làm quen.
 */
const FIRST_PIPE = 560;
/** Thả chim với chút đà bay lên, khỏi rơi thẳng ngay khi vào trận. */
const START_VY = -150;

const rowGap = (gap: number) => Math.max(140, Math.min(280, gap));

function makePipes(rng: Rng, gap: number): FlappyPipe[] {
  const pipes: FlappyPipe[] = [];
  const margin = gap / 2 + 46;
  for (let i = 0; i < PIPE_COUNT; i++) {
    pipes.push({
      x: FIRST_PIPE + i * PIPE_SPACING,
      gapY: Math.round(margin + rng.next() * (WORLD_H - margin * 2)),
    });
  }
  return pipes;
}

/** Chim có chạm ống hoặc chạm đất/trần ở vị trí hiện tại không. */
function hits(state: FlappyState, x: number, y: number): boolean {
  if (y - BIRD_R <= 0 || y + BIRD_R >= WORLD_H) return true;
  const left = x + BIRD_X - BIRD_R;
  const right = x + BIRD_X + BIRD_R;
  for (const pipe of state.pipes) {
    if (pipe.x > right) break;
    if (pipe.x + PIPE_W < left) continue;
    const half = state.gap / 2;
    if (y - BIRD_R < pipe.gapY - half || y + BIRD_R > pipe.gapY + half) return true;
  }
  return false;
}

/** Số ống đã bay qua hẳn tính tới vị trí x. */
function passed(state: FlappyState, x: number): number {
  const nose = x + BIRD_X - BIRD_R;
  let n = 0;
  for (const pipe of state.pipes) {
    if (pipe.x + PIPE_W >= nose) break;
    n += 1;
  }
  return n;
}

function finish(state: FlappyState, ending: string): FlappyState {
  return {
    ...state,
    over: true,
    ending,
    // Chơi một mình thì không có kẻ thắng người thua, chỉ có điểm.
    winnerIds: [],
    log: [...state.log, ending].slice(-20),
  };
}

export const FlappyEngine: GameEngine<FlappyState, FlappyConfig> = {
  id: 'flappy',
  minPlayers: 1,
  maxPlayers: 1,
  turnSeconds: 0,
  realtime: true,

  init(players: EnginePlayer[], config: FlappyConfig = {}, rng: Rng): FlappyState {
    const gap = rowGap(config.pipeGap ?? 200);
    const now = Date.now();
    return {
      players,
      birds: players.map((_, seat) => ({
        seat,
        y: WORLD_H / 2,
        vy: START_VY,
        alive: true,
        score: 0,
        dist: 0,
        flapAt: 0,
      })),
      pipes: makePipes(rng, gap),
      startAt: now + COUNTDOWN_MS,
      lastTick: now + COUNTDOWN_MS,
      x: 0,
      targetScore: Math.max(0, config.targetScore ?? 0),
      gap,
      ending: null,
      turn: 0,
      turnStartedAt: now,
      winnerIds: [],
      over: false,
      log: ['Chạm màn hình để vỗ cánh — qua được càng nhiều ống, điểm càng cao'],
      turnSeconds: 0,
    };
  },

  apply(state, playerId, type, payload): ApplyResult<FlappyState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');
    if (type !== 'flap') return err('UNKNOWN_ACTION');

    const now = Date.now();
    if (now < state.startAt) return err('NOT_STARTED');
    const bird = state.birds[seat];
    if (!bird.alive) return err('BIRD_DOWN');

    const birds = state.birds.map((b) => (b.seat === seat ? { ...b, vy: FLAP_V, flapAt: now } : b));
    return ok({ ...state, birds }, [{ type: 'flap', payload: { seat } }]);
  },

  tick(state, now) {
    if (state.over) return ok(state);
    if (now < state.startAt) return ok(state);

    const elapsed = now - state.lastTick;
    if (elapsed <= 0) return ok(state);

    const birds = state.birds.map((b) => ({ ...b }));
    let x = state.x;
    const events: any[] = [];
    const log: string[] = [];

    // Chia nhỏ khoảng thời gian để va chạm không bị nhảy cóc qua mép ống.
    let left = Math.min(elapsed, 1000);
    while (left > 0) {
      const step = Math.min(STEP_MS, left);
      const dt = step / 1000;
      left -= step;
      x += SPEED * dt;

      for (const bird of birds) {
        if (!bird.alive) continue;
        bird.vy += GRAVITY * dt;
        bird.y += bird.vy * dt;
        bird.dist = x;

        if (hits({ ...state, gap: state.gap }, x, bird.y)) {
          bird.alive = false;
          bird.y = Math.max(BIRD_R, Math.min(WORLD_H - BIRD_R, bird.y));
          log.push(`Rơi ở ống thứ ${bird.score + 1} — được ${bird.score} điểm`);
          events.push({ type: 'fell', payload: { seat: bird.seat, score: bird.score } });
          continue;
        }

        const n = passed({ ...state, gap: state.gap }, x);
        if (n > bird.score) {
          bird.score = n;
          // Đặt tên riêng 'pipe', không dùng 'score' vì Sheep đã dùng tên đó cho
          // banner "Trừ máu!" giữa màn — qua ống mỗi lần mà nháy banner thì rối.
          events.push({ type: 'pipe', payload: { seat: bird.seat, score: n } });
        }
      }
    }

    let next: FlappyState = { ...state, birds, x, lastTick: now, log: [...state.log, ...log].slice(-20) };

    if (next.targetScore > 0) {
      const champ = birds.find((b) => b.alive && b.score >= next.targetScore);
      if (champ) return ok(finish(next, `Qua đủ ${next.targetScore} ống`), events);
    }
    if (birds.every((b) => !b.alive)) {
      return ok(finish(next, `Kết thúc với ${birds[0].score} điểm`), events);
    }

    return ok(next, events);
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    const now = Date.now();
    // Chỉ gửi mấy ống quanh tầm nhìn, không gửi cả 400 cái.
    const from = state.x - PIPE_W;
    const to = state.x + WORLD_W + PIPE_SPACING;
    return {
      worldW: WORLD_W,
      worldH: WORLD_H,
      birdX: BIRD_X,
      birdR: BIRD_R,
      pipeW: PIPE_W,
      gap: state.gap,
      // Client tự nội suy giữa hai lần server đẩy state bằng đúng mấy hằng số này.
      speed: SPEED,
      gravity: GRAVITY,
      flapV: FLAP_V,
      x: state.x,
      birds: state.birds,
      pipes: state.pipes.filter((p) => p.x >= from && p.x <= to),
      startAt: state.startAt,
      countdown: Math.max(0, state.startAt - now),
      lastTick: state.lastTick,
      targetScore: state.targetScore,
      mySeat: seat,
      solo: true,
      ending: state.ending,
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-6),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    // Một mình một ván: luôn về nhất, chỉ có điểm là khác nhau giữa các ván.
    return state.players.map((p, seat) => ({
      userId: p.id,
      result: 'win' as const,
      score: state.birds[seat].score,
      place: 1,
    }));
  },

  deadline: () => null,
};
