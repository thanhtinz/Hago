import { GameEvent, GameType } from './types';
import { Rng } from './rng';

export interface EnginePlayer {
  id: string;
  name: string;
  seat: number;
}

export interface ApplyOk<S> {
  ok: true;
  state: S;
  events: GameEvent[];
}
export interface ApplyErr {
  ok: false;
  error: string;
}
export type ApplyResult<S> = ApplyOk<S> | ApplyErr;

export interface EngineResultRow {
  userId: string;
  result: 'win' | 'lose' | 'draw';
  score: number;
  place: number;
}

/**
 * Every mini-game implements this contract. Engines are pure: the server owns
 * the state and the RNG, the client may only send intents.
 */
export interface GameEngine<S = any, C = any> {
  readonly id: GameType;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  /** Seconds allowed per turn/tick before the server auto-plays. */
  readonly turnSeconds: number;
  /** True when the engine needs periodic `tick()` calls (realtime games). */
  readonly realtime?: boolean;

  init(players: EnginePlayer[], config: C, rng: Rng): S;
  apply(state: S, playerId: string, type: string, payload: any, rng: Rng): ApplyResult<S>;
  /** Called on turn timeout or every server tick for realtime games. */
  timeout?(state: S, rng: Rng): ApplyOk<S>;
  tick?(state: S, now: number, rng: Rng): ApplyOk<S>;
  /** Redacted state for one viewer — hidden information never leaves the server. */
  view(state: S, viewerId: string | null): unknown;
  finished(state: S): boolean;
  results(state: S): EngineResultRow[];
  /** Absolute ms timestamp when the current turn expires (null = untimed). */
  deadline(state: S): number | null;
}

export const ok = <S>(state: S, events: GameEvent[] = []): ApplyOk<S> => ({
  ok: true,
  state,
  events,
});
export const err = (error: string): ApplyErr => ({ ok: false, error });

/** Shared shape every engine state carries so the runtime can drive them all. */
export interface BaseState {
  players: EnginePlayer[];
  turn: number;
  turnStartedAt: number;
  winnerIds: string[];
  over: boolean;
  log: string[];
}
