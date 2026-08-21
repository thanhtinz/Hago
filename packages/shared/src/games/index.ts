import { GameEngine } from '../engine';
import { GameType } from '../types';
import { CaroEngine } from './caro';
import { BattleshipEngine } from './battleship';
import { OanQuanEngine } from './oanquan';
import { SheepEngine } from './sheep';
import { WerewolfEngine } from './werewolf';

export * from './caro';
export * from './battleship';
export * from './oanquan';
export * from './sheep';
export * from './werewolf';

export const ENGINES: Record<GameType, GameEngine<any, any>> = {
  caro: CaroEngine,
  battleship: BattleshipEngine,
  oanquan: OanQuanEngine,
  sheep: SheepEngine,
  werewolf: WerewolfEngine,
};

export function getEngine(type: GameType): GameEngine<any, any> {
  const e = ENGINES[type];
  if (!e) throw new Error(`Unknown game type: ${type}`);
  return e;
}
