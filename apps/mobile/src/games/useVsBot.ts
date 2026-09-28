import { useCallback, useEffect, useRef, useState } from 'react';
import { makeRng, type BaseState, type BotLevel, type Engine, type Outcome, type Rng, type Seat } from '@co/core';

/**
 * Một ván đấu với máy ngay trên thiết bị.
 *
 * Engine là hàm thuần nên chạy được cả hai phía. Khi có máy chủ thì đúng
 * engine này chạy ở server làm trọng tài, còn hook này chỉ đổi chỗ lấy state:
 * `view` nhận từ dây thay vì tự tính. Màn chơi không phải viết lại.
 *
 * Hook giữ cả đồng hồ, vì đồng hồ phải chung một nhịp với lượt đi. Để mỗi
 * màn tự đếm giờ là để chín cái đồng hồ chạy lệch nhau.
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
}

export function useVsBot<S extends BaseState, A>(
  engine: Engine<S, A, unknown, unknown>,
  /** Chọn nước cho máy. Trả về hành động đã bọc, sẵn sàng đưa vào `reduce`. */
  pickBotMove: (s: S, seat: Seat, level: BotLevel, rng: Rng, budgetMs: number) => A,
  o: { config?: unknown; startMs: number; level: BotLevel; thinkMs?: number; budgetMs?: number },
): VsBot<S, A> {
  const startMs = o.startMs;
  const fresh = useCallback(
    (seed: string) => engine.init(SEATS, o.config ?? {}, makeRng(seed, 0)),
    // `config` là object literal ở chỗ gọi nên đổi tham chiếu mỗi lần render;
    // so sánh theo nội dung đã tuần tự hoá để hook không dựng lại ván liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, JSON.stringify(o.config ?? {})],
  );

  const [seed, setSeed] = useState('van-1');
  const [state, setState] = useState<S>(() => fresh('van-1'));
  const [thinking, setThinking] = useState(false);
  const [clock, setClock] = useState<[number, number]>([startMs, startMs]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcome = engine.outcome(state);
  const t = engine.turn(state);
  const toMove = t.kind === 'seat' ? t.seat : null;

  const send = useCallback(
    (seat: Seat, a: A) => {
      setState((cur) => (engine.outcome(cur) ? cur : engine.reduce(cur, seat, a, makeRng(seed, cur.rngCursor))));
    },
    [engine, seed],
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const next = `van-${Date.now() % 100000}`;
    setSeed(next);
    setThinking(false);
    setClock([startMs, startMs]);
    setState(fresh(next));
  }, [fresh, startMs]);

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

  return { state, outcome, toMove, thinking, clock, send, reset };
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
