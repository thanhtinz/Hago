import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Quân cờ và nhân vật trong trận — vẽ tay bằng SVG để nhận màu theo phe và
 * co giãn không vỡ nét. Không dùng emoji làm quân cờ.
 */

const TIER_ACCENT = ['#C9C4D6', '#C9C4D6', '#F2B33D', '#7FD3A0', '#7FB2FF', '#D68BFF'];

/** Cừu Sheep Battle — 5 bậc, càng cao càng nhiều chi tiết. */
export function SheepPiece({ size = 32, level = 1, body = '#FFFFFF', outline = '#8E86A3' }: { size?: number; level?: number; body?: string; outline?: string }) {
  const accent = TIER_ACCENT[Math.min(level, 5)];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* chân */}
      <Path d="M17 35v5M23 36v5M31 35v5" stroke={outline} strokeWidth="3.2" strokeLinecap="round" />
      {/* thân dạng mây */}
      <Path
        d="M15 20a5.4 5.4 0 019.6-2.6 5.6 5.6 0 017 3.2 5.4 5.4 0 012.6 9.6 5.4 5.4 0 01-4.6 6.6 5.5 5.5 0 01-8.8 2.4 5.5 5.5 0 01-8.6-2.6A5.4 5.4 0 018 30 5.4 5.4 0 0110.6 21a5.4 5.4 0 014.4-1z"
        fill={body}
        stroke={outline}
        strokeWidth="1.6"
      />
      {/* đầu */}
      <Ellipse cx="33" cy="25" rx="7" ry="6.4" fill={outline} />
      <Circle cx="30.6" cy="23.6" r="1.6" fill="#fff" />
      <Circle cx="35.4" cy="23.6" r="1.6" fill="#fff" />
      <Path d="M31.5 28.4c1 .9 2.6.9 3.6 0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* sừng từ bậc 2 */}
      {level >= 2 ? (
        <G>
          <Path d="M28.5 20.6c-3-1.6-5.4-.4-5.6 2.2" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
          <Path d="M37.6 20.6c3-1.6 5.4-.4 5.6 2.2" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
        </G>
      ) : null}
      {/* gạc từ bậc 4 */}
      {level >= 4 ? (
        <G>
          <Path d="M30 17.5l-2.5-5M27.5 12.5l-3.4.6M27.5 12.5l.6-3.4" stroke={accent} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <Path d="M36 17.5l2.5-5M38.5 12.5l3.4.6M38.5 12.5l-.6-3.4" stroke={accent} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </G>
      ) : null}
      {/* vương miện bậc 5 */}
      {level >= 5 ? (
        <Path d="M27 8.5l2 3 2.5-3.6 2.5 3.6 2-3 .8 5h-10l.2-5z" fill={accent} />
      ) : null}
    </Svg>
  );
}

/** Quân cá ngựa. */
export function HorsePiece({ size = 26, color = '#FF7A59' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M14 40V31c0-7 3.6-9.6 7-11.4l-1.6-3.6 4 .7 1.6-3.9 2.6 3.3c4.8 1 8.2 4.8 8.2 10V40H14z"
        fill={color}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.6"
      />
      <Circle cx="28.4" cy="21.6" r="1.9" fill="rgba(255,255,255,0.95)" />
      <Path d="M11 40h26" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}

/** Quân Caro: O hoặc X. */
export function CaroMark({ size = 22, kind, color }: { size?: number; kind: 'o' | 'x'; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {kind === 'o' ? (
        <Circle cx="12" cy="12" r="7.6" fill="none" stroke={color} strokeWidth="4" />
      ) : (
        <Path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke={color} strokeWidth="4" strokeLinecap="round" />
      )}
    </Svg>
  );
}

/** Viên sỏi trong Ô ăn quan. */
export function StonePiece({ size = 10, color = '#8C5A32' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Circle cx="6" cy="6" r="5" fill={color} />
      <Circle cx="4.4" cy="4.4" r="1.5" fill="rgba(255,255,255,0.32)" />
    </Svg>
  );
}

/** Quân Quan (hòn to) ở hai đầu bàn Ô ăn quan. */
export function MandarinStone({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M6 20.5l4-9.5 8-4 8 6-2 11-11 3-7-6.5z" fill="#9B8B7A" />
      <Path d="M10 11l8-4 8 6-8 2-8-4z" fill="#B7A897" />
      <Path d="M10 11l8 4-3 12-9-6.5 4-9.5z" fill="#7E7060" />
    </Svg>
  );
}

/** Kết quả bắn trong Bắn tàu. */
export function ShotMark({ size = 18, kind }: { size?: number; kind: 'hit' | 'sunk' | 'miss' }) {
  if (kind === 'miss') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="3" fill="#9CC6E0" />
      </Svg>
    );
  }
  const color = kind === 'sunk' ? '#E03A3A' : '#FF7A3D';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5s1.6 4-1.2 6.8C8 12 5.5 14 5.5 17.4 5.5 20.9 8.4 23 12 23s6.5-2.1 6.5-5.6c0-2.8-1.6-4.4-2.9-6.1-1.2 1.8-2.3 1.8-2.3 0 0-2.8.8-5.8-1.3-8.8z"
        fill={color}
      />
      {kind === 'sunk' ? <Path d="M12 12.5c1.4 1.6 1.4 3.6 0 5.4-1.4-1.8-1.4-3.8 0-5.4z" fill="#FFD36E" /> : null}
    </Svg>
  );
}

/** Chấm quân trên bàn Cờ tỷ phú. */
export function TokenDot({ size = 9, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Circle cx="6" cy="6" r="5" fill={color} stroke="#fff" strokeWidth="1.6" />
    </Svg>
  );
}

/** Ghế người chơi Ma sói: còn sống hay đã chết. */
export function SeatFace({ size = 26, alive = true, color = '#FFC46B' }: { size?: number; alive?: boolean; color?: string }) {
  if (!alive) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 11a7 7 0 1114 0v3.2l-1.6 1.4V19H6.6v-3.4L5 14.2V11z" fill="#B9B2C7" />
        <Circle cx="9.4" cy="11.6" r="1.9" fill="#6B6285" />
        <Circle cx="14.6" cy="11.6" r="1.9" fill="#6B6285" />
        <Path d="M10.4 16h3.2" stroke="#6B6285" strokeWidth="1.6" strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" fill={color} />
      <Circle cx="9.2" cy="10.6" r="1.5" fill="rgba(60,40,0,0.75)" />
      <Circle cx="14.8" cy="10.6" r="1.5" fill="rgba(60,40,0,0.75)" />
      <Path d="M9.2 15c1.7 1.5 3.9 1.5 5.6 0" stroke="rgba(60,40,0,0.75)" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Sticker chat — mặt biểu cảm vẽ tay, thay cho emoji. */
export type StickerName = 'happy' | 'sad' | 'angry' | 'love' | 'cool' | 'shock' | 'fire' | 'trophy' | 'gem' | 'crown';

const FACE_BG: Record<string, string> = {
  happy: '#FFD36E',
  sad: '#9FC6F5',
  angry: '#FF8A8A',
  love: '#FFA3C4',
  cool: '#8ED9C4',
  shock: '#C7B3FF',
};

export function StickerArt({ name, size = 40 }: { name: StickerName; size?: number }) {
  const bg = FACE_BG[name];
  if (bg) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx="24" cy="24" r="20" fill={bg} />
        {face(name)}
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {object(name)}
    </Svg>
  );
}

const EYE = 'rgba(60,40,20,0.82)';

function face(name: string) {
  switch (name) {
    case 'happy':
      return (
        <G>
          <Path d="M15 20c1.6-2.4 4.4-2.4 6 0M27 20c1.6-2.4 4.4-2.4 6 0" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <Path d="M16 28c3.6 5 12.4 5 16 0" stroke={EYE} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </G>
      );
    case 'sad':
      return (
        <G>
          <Circle cx="18" cy="21" r="2.4" fill={EYE} />
          <Circle cx="30" cy="21" r="2.4" fill={EYE} />
          <Path d="M17 32c3.6-4.6 10.4-4.6 14 0" stroke={EYE} strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <Path d="M31 24c1.6 3 1.6 5.4 0 7" stroke="#5FA8F0" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </G>
      );
    case 'angry':
      return (
        <G>
          <Path d="M13.5 17l7 3.4M34.5 17l-7 3.4" stroke={EYE} strokeWidth="2.8" strokeLinecap="round" />
          <Circle cx="18" cy="24" r="2.2" fill={EYE} />
          <Circle cx="30" cy="24" r="2.2" fill={EYE} />
          <Path d="M17 33c3.6-3.4 10.4-3.4 14 0" stroke={EYE} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </G>
      );
    case 'love':
      return (
        <G>
          <Path d="M14 20.5c1.6-2.6 4.6-1.6 4.6.7 0 2-2.4 3.4-4.6 5-2.2-1.6-4.6-3-4.6-5 0-2.3 3-3.3 4.6-.7z" fill="#E0335F" transform="translate(4 0)" />
          <Path d="M14 20.5c1.6-2.6 4.6-1.6 4.6.7 0 2-2.4 3.4-4.6 5-2.2-1.6-4.6-3-4.6-5 0-2.3 3-3.3 4.6-.7z" fill="#E0335F" transform="translate(16 0)" />
          <Path d="M17 30c3.6 4 10.4 4 14 0" stroke={EYE} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </G>
      );
    case 'cool':
      return (
        <G>
          <Path d="M11 19h26v3.4a5 5 0 01-5 5h-2.6a5 5 0 01-4.6-3l-.8-2-.8 2a5 5 0 01-4.6 3H16a5 5 0 01-5-5V19z" fill="rgba(40,30,60,0.85)" />
          <Path d="M18 33c3.4 3 8.6 3 12 0" stroke={EYE} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </G>
      );
    case 'shock':
      return (
        <G>
          <Circle cx="18" cy="20" r="3.2" fill="#fff" />
          <Circle cx="18" cy="20" r="1.5" fill={EYE} />
          <Circle cx="30" cy="20" r="3.2" fill="#fff" />
          <Circle cx="30" cy="20" r="1.5" fill={EYE} />
          <Ellipse cx="24" cy="31" rx="4.6" ry="5.4" fill={EYE} />
        </G>
      );
    default:
      return null;
  }
}

function object(name: string) {
  switch (name) {
    case 'fire':
      return (
        <Path
          d="M24 5s3 6.4-2.4 11.6C16.8 21.2 13 24.6 13 30.4 13 37.2 18.2 42 24 42s11-4.8 11-11.6c0-4.8-2.8-7.6-5.2-11-2.2 3.2-4.2 3.2-4.2 0C25.6 15 27 9.6 24 5z"
          fill="#FF7A3D"
        />
      );
    case 'trophy':
      return (
        <G>
          <Path d="M15 8h18v9a9 9 0 01-18 0V8z" fill="#FFC93D" />
          <Path d="M15 11h-5v2.6A6.4 6.4 0 0016.4 20M33 11h5v2.6A6.4 6.4 0 0131.6 20" stroke="#FFC93D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M21 26h6l2 6h-10l2-6z" fill="#E0A100" />
          <Rect x="15" y="32" width="18" height="5" rx="2.4" fill="#E0A100" />
        </G>
      );
    case 'gem':
      return (
        <G>
          <Path d="M14 10h20l8 10-18 20L6 20l8-10z" fill="#6FC3FF" />
          <Path d="M6 20h36" stroke="#B7E4FF" strokeWidth="2.4" />
          <Path d="M19 20l5 20 5-20" stroke="#B7E4FF" strokeWidth="2.4" fill="none" />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path d="M8 34l-2-18 10 7 8-13 8 13 10-7-2 18H8z" fill="#FFC93D" />
          <Rect x="8" y="36" width="32" height="5" rx="2.4" fill="#E0A100" />
        </G>
      );
    default:
      return null;
  }
}

/** Mặt xúc xắc thật: chấm theo số, không dùng chữ số. */
const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[16, 16]],
  2: [[9, 9], [23, 23]],
  3: [[9, 9], [16, 16], [23, 23]],
  4: [[9, 9], [23, 9], [9, 23], [23, 23]],
  5: [[9, 9], [23, 9], [16, 16], [9, 23], [23, 23]],
  6: [[9, 8], [23, 8], [9, 16], [23, 16], [9, 24], [23, 24]],
};

export function DieFace({ value, size = 44, color = '#3B2A5A' }: { value?: number | null; size?: number; color?: string }) {
  const pips = value ? DIE_PIPS[value] ?? [] : [];
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#FFFFFF" stroke={color} strokeWidth={2} />
      {pips.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={3} fill={color} />
      ))}
      {value ? null : <Circle cx="16" cy="16" r="3" fill="rgba(59,42,90,0.18)" />}
    </Svg>
  );
}
