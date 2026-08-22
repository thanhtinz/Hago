import React from 'react';
import CaroBoard from './CaroBoard';
import BattleshipBoard from './BattleshipBoard';
import OanQuanBoard from './OanQuanBoard';
import SheepArena from './SheepArena';
import ChessBoard from './ChessBoard';
import FlappyArena from './FlappyArena';
import WerewolfTable from './WerewolfTable';
import { BoardProps } from './shared';

/** Tên hiển thị của từng game, dùng chung cho màn chơi, xem lại và khán đài. */
export const GAME_NAMES: Record<string, string> = {
  caro: 'Cờ Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep Battle',
  chess: 'Cờ Vua',
  flappy: 'Flappy Bird',
  werewolf: 'Ma Sói',
};

export const BOARDS: Record<string, React.ComponentType<BoardProps>> = {
  caro: CaroBoard,
  battleship: BattleshipBoard,
  oanquan: OanQuanBoard,
  sheep: SheepArena,
  chess: ChessBoard,
  flappy: FlappyArena,
  werewolf: WerewolfTable,
};
