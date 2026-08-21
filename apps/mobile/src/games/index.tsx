import React from 'react';
import CaroBoard from './CaroBoard';
import BattleshipBoard from './BattleshipBoard';
import OanQuanBoard from './OanQuanBoard';
import MonopolyBoard from './MonopolyBoard';
import SheepArena from './SheepArena';
import WerewolfTable from './WerewolfTable';
import { BoardProps } from './shared';

export const BOARDS: Record<string, React.ComponentType<BoardProps>> = {
  caro: CaroBoard,
  battleship: BattleshipBoard,
  oanquan: OanQuanBoard,
  monopoly: MonopolyBoard,
  sheep: SheepArena,
  werewolf: WerewolfTable,
};
