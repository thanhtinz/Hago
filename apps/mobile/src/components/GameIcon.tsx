import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Bộ mark riêng cho 7 game — vẽ tay bằng SVG chứ không mượn emoji.
 * Thiết kế để đặt trên nền gradient: khối trắng đặc là chính, một màu nhấn
 * cho chi tiết, nên đọc rõ từ cỡ 18px (tab bar) tới 96px (thẻ game).
 */
export type GameIconName = 'caro' | 'battleship' | 'oanquan' | 'sheep' | 'monopoly' | 'ludo' | 'werewolf';

const INK = 'rgba(38,26,60,0.55)';

/**
 * `tint` thay cho khối trắng khi mark nằm trên nền sáng — nếu để trắng,
 * mark sẽ tàng hình trên thẻ trắng.
 */
export function GameIcon({ name, size = 48, accent, tint }: { name: GameIconName; size?: number; accent?: string; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {shape(name, accent, tint ?? '#FFFFFF', tint ? tint + '66' : 'rgba(255,255,255,0.55)')}
    </Svg>
  );
}

function shape(name: GameIconName, accent = '#FFD36E', W = '#FFFFFF', SOFT = 'rgba(255,255,255,0.55)') {
  switch (name) {
    // Bàn cờ 3x3: một quân O màu nhấn, một quân X trắng
    case 'caro':
      return (
        <G>
          <Rect x="6" y="6" width="36" height="36" rx="10" fill={SOFT} />
          <Path d="M18 9v30M30 9v30M9 18h30M9 30h30" stroke={W} strokeWidth="2.2" strokeLinecap="round" opacity={0.65} />
          <Circle cx="12" cy="12" r="4" fill="none" stroke={accent} strokeWidth="3.4" />
          <Path d="M32 32l5 5M37 32l-5 5" stroke={W} strokeWidth="3.6" strokeLinecap="round" />
          <Circle cx="24" cy="24" r="4" fill="none" stroke={W} strokeWidth="3.4" />
        </G>
      );

    // Tàu chiến trên sóng, kèm điểm ngắm
    case 'battleship':
      return (
        <G>
          <Path d="M8 26h32l-4.5 9a3 3 0 01-2.7 1.7H15.2A3 3 0 0112.5 35L8 26z" fill={W} />
          <Rect x="17" y="16" width="14" height="8" rx="2" fill={W} />
          <Rect x="21.5" y="8" width="3.4" height="8" rx="1.7" fill={accent} />
          <Circle cx="21" cy="20" r="1.5" fill={INK} />
          <Circle cx="27" cy="20" r="1.5" fill={INK} />
          <Path d="M6 40c3-2.4 5.5-2.4 8.5 0s5.5 2.4 8.5 0 5.5-2.4 8.5 0 5.5 2.4 8.5 0" stroke={SOFT} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </G>
      );

    // Bàn ô ăn quan: hai ô Quan hình bán nguyệt ở hai đầu, hai hàng ô dân ở giữa
    case 'oanquan':
      return (
        <G>
          <Rect x="3" y="12" width="42" height="24" rx="12" fill={SOFT} />
          <Path d="M14 12H9a9 9 0 000 24h5V12z" fill={W} />
          <Path d="M34 12h5a9 9 0 010 24h-5V12z" fill={W} />
          <Circle cx="10.5" cy="24" r="3.2" fill={accent} />
          <Circle cx="37.5" cy="24" r="3.2" fill={accent} />
          <Rect x="17" y="15.5" width="9" height="7.4" rx="2.6" fill={W} />
          <Rect x="27" y="15.5" width="6" height="7.4" rx="2.6" fill={W} />
          <Rect x="17" y="25.1" width="6" height="7.4" rx="2.6" fill={W} />
          <Rect x="24" y="25.1" width="9" height="7.4" rx="2.6" fill={W} />
          <Circle cx="20" cy="19.2" r="1.5" fill={INK} />
          <Circle cx="23.6" cy="19.2" r="1.5" fill={INK} />
          <Circle cx="29" cy="28.8" r="1.5" fill={INK} />
          <Circle cx="20" cy="28.8" r="1.5" fill={INK} />
        </G>
      );

    // Cừu: thân mây tròn, mặt sẫm
    case 'sheep':
      return (
        <G>
          <Path
            d="M17 15.5a5 5 0 019.2-2.2 5.2 5.2 0 016.6 3 5 5 0 012.6 9.1 5 5 0 01-4.3 6.4 5.1 5.1 0 01-8.4 2.5 5.1 5.1 0 01-8.3-2.6 5 5 0 01-4.2-6.4 5 5 0 012.7-9 5 5 0 014.1-.8z"
            fill={W}
          />
          <Ellipse cx="31.5" cy="24" rx="6.6" ry="6" fill={INK} />
          <Circle cx="29.4" cy="22.6" r="1.5" fill={W} />
          <Circle cx="34" cy="22.6" r="1.5" fill={W} />
          <Path d="M25.6 20.4c-2.4-1.6-4.4-.6-4.7 1.5" stroke={accent} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <Path d="M18 34.5v4M24 35.5v3.5M30 35v4" stroke={W} strokeWidth="3" strokeLinecap="round" />
        </G>
      );

    // Nhà phố + đồng xu: bất động sản và tiền
    case 'monopoly':
      return (
        <G>
          <Path d="M9 22.5L20 13l11 9.5V37a2 2 0 01-2 2H11a2 2 0 01-2-2V22.5z" fill={W} />
          <Rect x="16" y="27" width="8" height="12" rx="1.6" fill={INK} opacity={0.35} />
          <Path d="M6 23L20 11l14 12" stroke={W} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx="35" cy="30" r="9" fill={accent} />
          <Circle cx="35" cy="30" r="6.4" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.6" />
          <Path d="M35 25.6v8.8M32.6 27.6h3.6a1.9 1.9 0 010 3.8h-2.6a1.9 1.9 0 000 3.8h3.8" stroke="rgba(60,40,0,0.8)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </G>
      );

    // Quân mã (đầu ngựa) đứng trên bệ, kèm xúc xắc
    case 'ludo':
      return (
        <G>
          <Path
            d="M30.5 14.2c-2-2.6-5-4.2-8.2-4.4l1.4-3.6-4.3 1.9-1.6-3.3-1.5 5.2c-2.3 1.5-4 3.7-5.2 6.3l-2.6 5.6 4.1-1.1 2.6-2.6 2.6 1.4-4.6 5.1a9 9 0 00-2.3 6v3.1h19.4V22.6c0-3.2-.9-6.1-2.4-8.4z"
            fill={W}
          />
          <Circle cx="26.5" cy="16.2" r="1.9" fill={INK} />
          <Path d="M13 36.5h22v3.2a1.6 1.6 0 01-1.6 1.6H14.6a1.6 1.6 0 01-1.6-1.6v-3.2z" fill={W} />
          <Rect x="4.5" y="26" width="13" height="13" rx="4" fill={accent} />
          <Circle cx="8.6" cy="30" r="1.5" fill="rgba(60,40,0,0.8)" />
          <Circle cx="13.4" cy="35" r="1.5" fill="rgba(60,40,0,0.8)" />
          <Circle cx="11" cy="32.5" r="1.5" fill="rgba(60,40,0,0.8)" />
        </G>
      );

    // Đầu sói: hàm thon, mõm nhô, tai nhọn có lòng tai màu nhấn
    case 'werewolf':
      return (
        <G>
          <Path
            d="M6 4l9.4 8.4a17.5 17.5 0 0117.2 0L42 4l-2.4 15c1.6 2.5 2.4 5.3 2.4 8.2 0 4.3-2 7.6-5.2 10.1C33.6 39.8 29.2 44 24 44s-9.6-4.2-12.8-6.7C8 34.8 6 31.5 6 27.2c0-2.9.8-5.7 2.4-8.2L6 4z"
            fill={W}
          />
          <Path d="M10.6 9.6l6.2 5.6-1.4 3.6-5.4-4.6-.6-4.6zM37.4 9.6l-6.2 5.6 1.4 3.6 5.4-4.6.6-4.6z" fill={accent} />
          <Path d="M24 26.4c4.3 0 7 2.4 7 5.8 0 3.7-3.2 6.8-7 6.8s-7-3.1-7-6.8c0-3.4 2.7-5.8 7-5.8z" fill={SOFT} />
          <Path d="M14.6 21.4l5.4 1.8-5.4 2-1.6-1.9 1.6-1.9zM33.4 21.4l-5.4 1.8 5.4 2 1.6-1.9-1.6-1.9z" fill={INK} />
          <Path d="M24 29.4l-3 2.6h6l-3-2.6z" fill={INK} />
          <Path d="M19.6 35c2.7 2.1 6.1 2.1 8.8 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
        </G>
      );
    default:
      return null;
  }
}
