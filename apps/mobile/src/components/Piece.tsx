import React from 'react';
import { Art, ArtName } from './Art';
import { GAME_ART } from '../art/gameArt';

/**
 * Quân cờ và nhân vật trong trận.
 *
 * Toàn bộ hình lấy từ kho asset game-icons.net (CC BY 3.0) qua
 * scripts/fetch-game-art.mjs — không tự vẽ, nhờ vậy 7 game cùng một phong cách.
 * Ở đây chỉ quyết định *dùng asset nào* và *tô màu gì* theo trạng thái ván đấu.
 */

/** Quân Caro: vòng tròn hoặc dấu nhân. */
export function CaroMark({ size = 22, kind, color }: { size?: number; kind: 'o' | 'x'; color: string }) {
  // Hai quân là cặp huy hiệu cùng bộ: đĩa mang màu phe, ký hiệu màu trắng.
  return <Art name={kind === 'o' ? 'mark-o' : 'mark-x'} size={size} color={color} hi="#FFFFFF" />;
}

/** Viên dân trong Ô ăn quan. */
export function StonePiece({ size = 10, color = '#8C5A32' }: { size?: number; color?: string }) {
  return <Art name="stone" size={size} color={color} />;
}

/** Quân Quan ở hai đầu bàn Ô ăn quan. */
export function MandarinStone({ size = 30, color = '#6B5540' }: { size?: number; color?: string }) {
  return <Art name="quan" size={size} color={color} />;
}

/** Tàu trên hạm đội của mình. */
export function ShipPiece({ size = 16, color = '#4A5568' }: { size?: number; color?: string }) {
  return <Art name="ship" size={size} color={color} />;
}

/** Kết quả bắn trong Bắn tàu. */
export function ShotMark({ size = 18, kind }: { size?: number; kind: 'hit' | 'sunk' | 'miss' }) {
  const art: Record<string, { name: ArtName; color: string }> = {
    hit: { name: 'hit', color: '#FF7A3D' },
    sunk: { name: 'sunk', color: '#E03A3A' },
    miss: { name: 'miss', color: '#9CC6E0' },
  };
  const a = art[kind];
  return <Art name={a.name} size={size} color={a.color} />;
}

/** Ghế người chơi Ma sói: còn sống là người trùm áo, chết là bia mộ. */
export function SeatFace({ size = 26, alive = true, color = '#FFC46B' }: { size?: number; alive?: boolean; color?: string }) {
  return alive ? <Art name="seat-alive" size={size} color={color} /> : <Art name="seat-dead" size={size} color="#B9B2C7" />;
}

/** Mặt xúc xắc 1–6; chưa tung thì hiện mặt mờ. */
export function DieFace({ value, size = 44, color = '#3B2A5A' }: { value?: number | null; size?: number; color?: string }) {
  const n = value && value >= 1 && value <= 6 ? value : 1;
  return <Art name={`die-${n}` as ArtName} size={size} color={color} opacity={value ? 1 : 0.28} />;
}

/** Vai trò trong Ma sói. */
export type RoleName = 'werewolf' | 'seer' | 'guard' | 'witch' | 'hunter' | 'villager';

export function RoleArt({ role, size = 24, color }: { role: RoleName; size?: number; color: string }) {
  return <Art name={`role-${role}` as ArtName} size={size} color={color} />;
}

/** Sticker chat + huy hiệu kết quả trận. */
export type StickerName = 'happy' | 'sad' | 'love' | 'fire' | 'skull' | 'crown' | 'star' | 'gem' | 'paw' | 'win' | 'draw';

const STICKER_TONE: Record<StickerName, string> = {
  happy: '#FFC93C',
  sad: '#7FB2FF',
  love: '#FF6F91',
  fire: '#FF7A3D',
  skull: '#8E86A3',
  crown: '#F2B33D',
  star: '#FFD36E',
  gem: '#4FC3F7',
  paw: '#A98BFF',
  win: '#F2B33D',
  draw: '#9AA4B2',
};

/** Tin nhắn cũ còn dùng tên sticker của bản trước — quy về bộ hiện tại. */
const STICKER_ALIAS: Record<string, StickerName> = {
  angry: 'fire',
  cool: 'star',
  shock: 'skull',
  trophy: 'win',
};

export function StickerArt({ name, size = 40, color }: { name: StickerName; size?: number; color?: string }) {
  const aliased = STICKER_ALIAS[name] ?? name;
  /**
   * Gói emote là dữ liệu do server cấu hình, nên tên có thể trỏ vào asset không
   * tồn tại (đã từng có 'wave', 'party', 'crystal'). Không chặn ở đây thì ô
   * sticker hiện ra trống trơn mà chẳng báo gì.
   */
  const key = (GAME_ART as Record<string, unknown>)[aliased] ? aliased : 'happy';
  return <Art name={key as ArtName} size={size} color={color ?? STICKER_TONE[key as StickerName] ?? '#FFC93C'} />;
}
