import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeRng, type BaseState, type BotLevel, type Engine, type Outcome, type Rng, type Seat } from '@co/core';
import { useMatchFeedback } from '../ui/feedback';

/**
 * Một ván đấu với máy ngay trên thiết bị.
 *
 * Engine là hàm thuần nên chạy được cả hai phía. Khi có máy chủ thì đúng
 * engine này chạy ở server làm trọng tài, còn hook này chỉ đổi chỗ lấy state:
 * `view` nhận từ dây thay vì tự tính. Màn chơi không phải viết lại.
 *
 * Hook giữ cả đồng hồ, vì đồng hồ phải chung một nhịp với lượt đi. Để mỗi
 * màn tự đếm giờ là để chín cái đồng hồ chạy lệch nhau.
 *
 * Gợi ý và lùi lại chỉ tồn tại ở đây, tức là **chỉ khi đấu với máy**. Khi
 * có máy chủ, ván với người thật đi đường khác: lùi lại phải thành lời xin
 * và đối thủ đồng ý mới được, chứ một bên tự rút nước đã đi thì không còn
 * là ván cờ.
 */

export const ME = 0;
export const BOT = 1;
const SEATS = [ME, BOT];

export interface VsBot<S, A> {
  state: S;
  outcome: Outcome | null;
  toMove: Seat | null;
  thinking: boolean;
  clock: [number, number];
  /** Gửi một hành động của người chơi. */
  send: (seat: Seat, a: A) => void;
  reset: () => void;
  /** Số gợi ý còn lại trong ván này. */
  hintsLeft: number;
  /** Nước đang được gợi ý, hoặc null. Bàn cờ tự vẽ theo cách của nó. */
  hint: A | null;
  askHint: () => void;
  canHint: boolean;
  /** Lùi về thế cờ trước nước gần nhất của người chơi. */
  undo: () => void;
  canUndo: boolean;
  /** Số lần lùi còn lại trong ván này. */
  undosLeft: number;
  /** Tỉ số từ lúc mở màn chơi tới giờ. */
  tally: Tally;
}

/** Thắng – hoà – thua trong phiên đấu này. */
export interface Tally {
  win: number;
  draw: number;
  loss: number;
}

/**
 * Mỗi ván được ba gợi ý.
 *
 * Ba là con số cố tình: đủ để gỡ ba chỗ bí trong một ván, không đủ để chơi
 * hộ cả ván. Gợi ý nhiều vô hạn thì người chơi bấm cho xong, không học được
 * gì, mà đánh với máy vốn là để học.
 */
export const HINTS_PER_MATCH = 3;

/**
 * Mỗi ván được năm lần lùi.
 *
 * Lùi không giới hạn thì không còn là ván cờ mà là dò đáp án: cứ đi thử,
 * thua thì lùi, đi lại. Năm lần đủ để chữa mấy nước lỡ tay và học lại một
 * thế khó, không đủ để dò hết cây nước đi.
 */
export const UNDOS_PER_MATCH = 5;

export function useVsBot<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  /** Chọn nước cho máy. Trả về hành động đã bọc, sẵn sàng đưa vào `reduce`. */
  pickBotMove: (s: S, seat: Seat, level: BotLevel, rng: Rng, budgetMs: number) => A,
  o: {
    config?: unknown;
    startMs: number;
    level: BotLevel;
    thinkMs?: number;
    budgetMs?: number;
    /**
     * Ghim hạt giống của ván.
     *
     * Chỉ chế độ vượt ải dùng: một ải phải là **đúng một câu đố**, nên
     * "chơi lại" phải dựng lại y hệt thế cờ cũ chứ không bốc một thế mới.
     * Bỏ trống thì mỗi lần `reset()` sinh một hạt mới, đúng như ván
     * thường vẫn làm.
     */
    hatCoDinh?: string;
  },
): VsBot<S, A> {
  const startMs = o.startMs;
  const fresh = useCallback(
    (seed: string) => engine.init(SEATS, o.config ?? {}, makeRng(seed, 0)),
    // `config` là object literal ở chỗ gọi nên đổi tham chiếu mỗi lần render;
    // so sánh theo nội dung đã tuần tự hoá để hook không dựng lại ván liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, JSON.stringify(o.config ?? {})],
  );

  const [seed, setSeed] = useState(o.hatCoDinh ?? 'van-1');
  /**
   * Giữ cả chồng thế cờ đã qua, không chỉ thế hiện tại.
   *
   * Lùi lại phải quay về đúng thế **trước nước của người chơi**, tức là bỏ
   * cả nước mình lẫn nước máy đáp lại — lùi một nửa thì tới lượt máy và nó
   * đi tiếp ngay, người chơi không lùi được gì cả.
   */
  const [frames, setFrames] = useState<{ cur: S; past: S[] }>(() => ({ cur: fresh('van-1'), past: [] }));
  const state = frames.cur;
  const setState = useCallback(
    (fn: (cur: S) => S) =>
      setFrames((f) => {
        const next = fn(f.cur);
        if (next === f.cur) return f;
        // Chặn trần chồng lịch sử: một ván ô ăn quan có thể dài bốn trăm
        // nước, giữ hết thì mỗi ván ngốn vài megabyte cho một tính năng
        // không ai lùi quá vài nước.
        const past = [...f.past, f.cur];
        return { cur: next, past: past.length > 120 ? past.slice(-120) : past };
      }),
    [],
  );
  const [thinking, setThinking] = useState(false);
  const [clock, setClock] = useState<[number, number]>([startMs, startMs]);
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_MATCH);
  const [undosLeft, setUndosLeft] = useState(UNDOS_PER_MATCH);
  const [hint, setHint] = useState<A | null>(null);
  /**
   * Kết quả từng ván, khoá theo hạt giống của ván.
   *
   * Đếm theo khoá chứ không cộng dồn mỗi lần thấy ván kết thúc: lùi lại một
   * ván đã xong rồi đánh tiếp sẽ kết thúc lần nữa, mà cộng dồn thì ván đó
   * bị tính hai lần. Ghi theo khoá thì ghi bao nhiêu lần cũng ra một.
   */
  const [results, setResults] = useState<Record<string, 'win' | 'draw' | 'loss'>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcome = engine.outcome(state);
  // Tiếng và rung cho ván với máy. Cả ba bộ môn đi qua hook này nên đây là
  // đúng một chỗ, không phải ba bản chép.
  useMatchFeedback(state.ply, outcome ? (outcome.winner === null ? 'hoa' : outcome.winner === ME ? 'thang' : 'thua') : null);
  const t = engine.turn(state);
  const toMove = t.kind === 'seat' ? t.seat : null;

  const send = useCallback(
    (seat: Seat, a: A) => {
      setState((cur) => (engine.outcome(cur) ? cur : engine.reduce(cur, seat, a, makeRng(seed, cur.rngCursor))));
    },
    [engine, seed],
  );

  const hatCoDinh = o.hatCoDinh;
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    // Ải giữ nguyên hạt: bấm chơi lại một ải mà ra một câu đố khác thì
    // ba điều kiện sao của ải đó không còn nghĩa gì.
    const next = hatCoDinh ?? `van-${Date.now() % 100000}`;
    setSeed(next);
    setThinking(false);
    setClock([startMs, startMs]);
    setHintsLeft(HINTS_PER_MATCH);
    setUndosLeft(UNDOS_PER_MATCH);
    setHint(null);
    setFrames({ cur: fresh(next), past: [] });
  }, [fresh, startMs, hatCoDinh]);

  /**
   * Lùi về thế cờ ngay trước nước gần nhất của người chơi.
   *
   * Đồng hồ **không** lùi theo. Thời gian đã tiêu là đã tiêu — lùi cả giờ
   * thì người chơi cứ lùi mãi mà không mất gì, đồng hồ thành đồ trang trí.
   */
  const rewindTo = (() => {
    for (let i = frames.past.length - 1; i >= 0; i--) {
      const t = engine.turn(frames.past[i]!);
      if (t.kind === 'seat' && t.seat === ME) return i;
    }
    return -1;
  })();

  const undo = useCallback(() => {
    // Trừ lượt lùi **chỉ khi thật sự lùi được**. Tính trước ở đây chứ không
    // tính bên trong `setFrames`: hàm cập nhật state có thể được gọi hai
    // lần trong chế độ kiểm tra của React, và trừ bên trong đó là mỗi lần
    // bấm mất hai lượt.
    if (rewindTo < 0 || undosLeft <= 0) return;
    setFrames((f) => ({ cur: f.past[rewindTo]!, past: f.past.slice(0, rewindTo) }));
    setUndosLeft((n) => n - 1);
  }, [rewindTo, undosLeft]);

  /**
   * Gợi ý = hỏi chính con bot mức Khó xem nó sẽ đi nước nào ở chỗ của bạn.
   *
   * Nói đúng như vậy chứ không gọi là "nước tốt nhất": bot không chứng minh
   * được nước nào tốt nhất, nó chỉ tìm sâu vài tầng. Hứa "tốt nhất" rồi
   * người chơi thua theo gợi ý thì lần sau họ không tin cái nút nào nữa.
   */
  const askHint = useCallback(() => {
    if (hintsLeft <= 0 || outcome || toMove !== ME) return;
    setHint(pickBotMove(state, ME, 3, makeRng(`${seed}|hint|${state.ply}`, 0), (o.budgetMs ?? 60) * 4));
    setHintsLeft((n) => n - 1);
  }, [hintsLeft, outcome, toMove, state, seed, pickBotMove, o.budgetMs]);

  useEffect(() => {
    const r = outcome ? (outcome.winner === null ? 'draw' : outcome.winner === ME ? 'win' : 'loss') : null;
    setResults((prev) => {
      if (r === null) {
        // Lùi lại làm ván chưa xong nữa thì rút kết quả ra khỏi bảng.
        if (!(seed in prev)) return prev;
        const { [seed]: _gone, ...rest } = prev;
        return rest;
      }
      return prev[seed] === r ? prev : { ...prev, [seed]: r };
    });
  }, [outcome, seed]);

  const tally = useMemo<Tally>(() => {
    const t: Tally = { win: 0, draw: 0, loss: 0 };
    for (const r of Object.values(results)) t[r]++;
    return t;
  }, [results]);

  // Gợi ý biến mất ngay khi bàn cờ đổi: một mũi tên chỉ vào thế cờ đã qua
  // còn tệ hơn là không có gợi ý nào.
  useEffect(() => {
    setHint(null);
  }, [state.ply]);

  // Đồng hồ chạy 100ms một nhịp thay vì 1s: nhịp 1s thì giây cuối cùng có
  // thể trôi qua gần một giây mới hiện, đúng lúc người chơi nhìn chằm chằm.
  useEffect(() => {
    if (outcome || toMove === null) return;
    const seat = toMove;
    const iv = setInterval(() => {
      setClock((c) => {
        const left = Math.max(0, c[seat] - 100);
        return (seat === 0 ? [left, c[1]] : [c[0], left]) as [number, number];
      });
    }, 100);
    return () => clearInterval(iv);
  }, [outcome, toMove]);

  // Máy đi sau một nhịp ngắn — không phải giả vờ nghĩ, mà để người chơi kịp
  // nhìn thấy nước mình vừa đi trước khi bàn cờ đổi tiếp.
  useEffect(() => {
    if (outcome || toMove !== BOT) return;
    setThinking(true);
    timer.current = setTimeout(() => {
      setState((cur) => {
        const turn = engine.turn(cur);
        if (turn.kind !== 'seat' || turn.seat !== BOT) return cur;
        const a = pickBotMove(cur, BOT, o.level, makeRng(`${seed}|bot`, cur.ply), o.budgetMs ?? 60);
        return engine.reduce(cur, BOT, a, makeRng(seed, cur.rngCursor));
      });
      setThinking(false);
    }, o.thinkMs ?? 420);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, seed, o.level, o.thinkMs, o.budgetMs, outcome, toMove, engine, pickBotMove]);

  return {
    state,
    outcome,
    toMove,
    thinking,
    clock,
    send,
    reset,
    hintsLeft,
    hint,
    askHint,
    canHint: hintsLeft > 0 && !outcome && toMove === ME,
    undo,
    // Lùi được cả khi ván đã xong: nước thua cuối cùng chính là nước người
    // ta muốn rút lại nhất.
    canUndo: rewindTo >= 0 && undosLeft > 0,
    undosLeft,
    tally,
  };
}

/** Hết giờ là một action thật gửi vào engine, không phải một dòng chữ vẽ đè. */
export function useFlagOnTimeout<A>(
  clock: [number, number],
  toMove: Seat | null,
  outcome: Outcome | null,
  send: (seat: Seat, a: A) => void,
  flagOf: (seat: Seat) => A,
): void {
  useEffect(() => {
    if (outcome || toMove === null) return;
    if (clock[toMove]! > 0) return;
    send(toMove, flagOf(toMove));
  }, [clock, toMove, outcome, send, flagOf]);
}
