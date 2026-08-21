import React from 'react';
import { Art } from './Art';

/**
 * Mark của 7 game — lấy từ kho asset game-icons.net (CC BY 3.0), không tự vẽ.
 * Xem apps/mobile/assets/game-icons/CREDITS.md và scripts/fetch-game-art.mjs.
 */
export type GameIconName = 'caro' | 'battleship' | 'oanquan' | 'sheep' | 'monopoly' | 'werewolf';

export function GameIcon({
  name,
  size = 48,
  accent,
  tint,
}: {
  name: GameIconName;
  size?: number;
  /** Giữ cho tương thích chỗ gọi cũ — asset là silhouette một tông. */
  accent?: string;
  /** Màu mark khi đặt trên nền sáng; mặc định trắng cho thẻ gradient. */
  tint?: string;
}) {
  return <Art name={`game-${name}`} size={size} color={tint ?? '#FFFFFF'} />;
}
