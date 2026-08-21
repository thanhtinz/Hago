import { GameEngine } from '../engine';
import { GameType } from '../types';
import { CaroEngine } from './caro';
import { BattleshipEngine } from './battleship';
import { OanQuanEngine } from './oanquan';
import { SheepEngine } from './sheep';
import { ChessEngine } from './chess';
import { FlappyEngine } from './flappy';
import { WerewolfEngine } from './werewolf';

export * from './caro';
export * from './battleship';
export * from './oanquan';
export * from './sheep';
export * from './chess';
export * from './flappy';
export * from './werewolf';

export const ENGINES: Record<GameType, GameEngine<any, any>> = {
  caro: CaroEngine,
  battleship: BattleshipEngine,
  oanquan: OanQuanEngine,
  sheep: SheepEngine,
  chess: ChessEngine,
  flappy: FlappyEngine,
  werewolf: WerewolfEngine,
};

export function getEngine(type: GameType): GameEngine<any, any> {
  const e = ENGINES[type];
  if (!e) throw new Error(`Unknown game type: ${type}`);
  return e;
}
