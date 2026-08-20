import { API_URL } from './api';

/**
 * Asset chibi lấy từ Noto Emoji (Apache 2.0), phục vụ bởi chính API server.
 * Dùng ảnh thay vì emoji hệ thống để mọi thiết bị nhìn giống hệt nhau —
 * emoji của iOS, Android và Chrome vốn khác nhau khá nhiều.
 */
export function chibi(name: string): string {
  return `${API_URL}/asset/chibi/${name}.svg`;
}

/** Ảnh đại diện của từng game, dùng ở card, lobby và HUD trong trận. */
export const GAME_ART: Record<string, string> = {
  caro: 'game-caro',
  battleship: 'game-battleship',
  oanquan: 'game-oanquan',
  sheep: 'game-sheep',
  monopoly: 'game-monopoly',
  ludo: 'game-ludo',
  werewolf: 'game-werewolf',
};

export const gameArt = (gameType: string): string => chibi(GAME_ART[gameType] ?? 'gamepad');
