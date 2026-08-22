import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Bộ icon giao diện vẽ bằng SVG — dùng cho mọi nút, mũi tên, trạng thái.
 * Không dùng emoji làm icon: emoji mỗi hệ điều hành vẽ một kiểu, không đổi được
 * màu theo ngữ cảnh và không canh được nét với chữ.
 *
 * Mark riêng của từng game nằm ở <GameIcon>, quân cờ và nhân vật ở <Piece>.
 */
export type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'arrow-right'
  | 'plus'
  | 'minus'
  | 'check'
  | 'close'
  | 'bell'
  | 'users'
  | 'user-plus'
  | 'lock'
  | 'clock'
  | 'search'
  | 'send'
  | 'logout'
  | 'settings'
  | 'edit'
  | 'refresh'
  | 'flag'
  | 'ban'
  | 'play'
  | 'pause'
  | 'rewind'
  | 'forward'
  | 'dice'
  | 'target'
  | 'shield'
  | 'trend'
  | 'list'
  | 'menu'
  | 'grid'
  | 'door'
  | 'key'
  | 'bolt'
  | 'crown'
  | 'sparkle'
  | 'chat'
  | 'home'
  | 'shop'
  | 'trophy'
  | 'flame'
  | 'gift'
  | 'star'
  | 'user'
  | 'coin'
  | 'gem'
  | 'medal'
  | 'moon'
  | 'sun'
  | 'ballot'
  | 'skull'
  | 'eye'
  | 'flask'
  | 'bow'
  | 'anchor'
  | 'receipt'
  | 'parking'
  | 'question'
  | 'droplet'
  | 'handshake';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = '#2E2545', strokeWidth = 2 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, common, color)}
    </Svg>
  );
}

function render(name: IconName, p: any, color: string) {
  switch (name) {
    case 'chevron-left':
      return <Polyline points="15 5 8 12 15 19" {...p} />;
    case 'chevron-right':
      return <Polyline points="9 5 16 12 9 19" {...p} />;
    case 'chevron-down':
      return <Polyline points="5 9 12 16 19 9" {...p} />;
    case 'arrow-right':
      return (
        <>
          <Path d="M4 12h15" {...p} />
          <Polyline points="13 6 19 12 13 18" {...p} />
        </>
      );
    case 'plus':
      return (
        <>
          <Path d="M12 5v14" {...p} />
          <Path d="M5 12h14" {...p} />
        </>
      );
    case 'minus':
      return <Path d="M5 12h14" {...p} />;
    case 'check':
      return <Polyline points="4 13 9 18 20 6" {...p} />;
    case 'close':
      return (
        <>
          <Path d="M6 6l12 12" {...p} />
          <Path d="M18 6L6 18" {...p} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M18 15V10a6 6 0 10-12 0v5l-1.5 3h15L18 15z" {...p} />
          <Path d="M10 21h4" {...p} />
        </>
      );
    case 'users':
      return (
        <>
          <Circle cx="9" cy="8" r="3.2" {...p} />
          <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...p} />
          <Path d="M16 6.5a3 3 0 010 6" {...p} />
          <Path d="M17 14.4c2 .7 3.5 2.4 3.5 4.6" {...p} />
        </>
      );
    case 'user-plus':
      return (
        <>
          <Circle cx="10" cy="8" r="3.2" {...p} />
          <Path d="M4 19c0-3 2.7-5 6-5" {...p} />
          <Path d="M17 14v6" {...p} />
          <Path d="M14 17h6" {...p} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x="4.5" y="10" width="15" height="10" rx="3" {...p} />
          <Path d="M8 10V7.5a4 4 0 018 0V10" {...p} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx="12" cy="12" r="8.2" {...p} />
          <Polyline points="12 7.5 12 12 15 14" {...p} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="6.2" {...p} />
          <Path d="M15.6 15.6L20 20" {...p} />
        </>
      );
    case 'send':
      return (
        <>
          <Path d="M20 4L3.5 10.6l6.7 2.4 2.4 6.7L20 4z" {...p} />
          <Path d="M10.2 13L20 4" {...p} />
        </>
      );
    case 'logout':
      return (
        <>
          <Path d="M14 4H6.5A2.5 2.5 0 004 6.5v11A2.5 2.5 0 006.5 20H14" {...p} />
          <Path d="M17 8l4 4-4 4" {...p} />
          <Path d="M21 12h-9" {...p} />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path
            d="M12 3.5l1.4 2.2 2.6-.4.5 2.6 2.3 1.3-1.3 2.3 1.3 2.3-2.3 1.3-.5 2.6-2.6-.4L12 20.5l-1.4-2.2-2.6.4-.5-2.6L5.2 14.8 6.5 12.5 5.2 10.2l2.3-1.3.5-2.6 2.6.4L12 3.5z"
            {...p}
          />
        </>
      );
    case 'edit':
      return (
        <>
          <Path d="M4 20h4l10-10-4-4L4 16v4z" {...p} />
          <Path d="M13.5 6.5l4 4" {...p} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path d="M20 12a8 8 0 11-2.6-5.9" {...p} />
          <Polyline points="20 4 20 9 15 9" {...p} />
        </>
      );
    case 'flag':
      return (
        <>
          <Path d="M6 21V4" {...p} />
          <Path d="M6 5h11l-2 3.5L17 12H6" {...p} />
        </>
      );
    case 'ban':
      return (
        <>
          <Circle cx="12" cy="12" r="8.2" {...p} />
          <Path d="M6.4 6.4l11.2 11.2" {...p} />
        </>
      );
    case 'play':
      return <Path d="M8 5.5l10 6.5-10 6.5v-13z" {...p} fill={color} />;
    case 'pause':
      return (
        <>
          <Path d="M9 5v14" {...p} strokeWidth={3.2} />
          <Path d="M15 5v14" {...p} strokeWidth={3.2} />
        </>
      );
    case 'rewind':
      return (
        <>
          <Path d="M12 7v10L5 12l7-5z" {...p} fill={color} />
          <Path d="M20 7v10l-7-5 7-5z" {...p} fill={color} />
        </>
      );
    case 'forward':
      return (
        <>
          <Path d="M12 7v10l7-5-7-5z" {...p} fill={color} />
          <Path d="M4 7v10l7-5-7-5z" {...p} fill={color} />
        </>
      );
    case 'dice':
      return (
        <>
          <Rect x="4" y="4" width="16" height="16" rx="4" {...p} />
          <Circle cx="9" cy="9" r="1.3" fill={color} stroke="none" />
          <Circle cx="15" cy="15" r="1.3" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="1.3" fill={color} stroke="none" />
        </>
      );
    case 'target':
      return (
        <>
          <Circle cx="12" cy="12" r="8.2" {...p} />
          <Circle cx="12" cy="12" r="4" {...p} />
          <Circle cx="12" cy="12" r="1.1" fill={color} stroke="none" />
        </>
      );
    case 'shield':
      return <Path d="M12 3.5l7 2.6v5c0 4.3-2.9 8.1-7 9.4-4.1-1.3-7-5.1-7-9.4v-5l7-2.6z" {...p} />;
    case 'trend':
      return (
        <>
          <Polyline points="4 16 9.5 10.5 13 14 20 7" {...p} />
          <Polyline points="15 7 20 7 20 12" {...p} />
        </>
      );
    case 'menu':
      // Ba vạch ngang, vạch giữa ngắn hơn cho ra dáng nút menu chứ không lẫn với 'list'.
      return (
        <>
          <Path d="M4 7h16" {...p} />
          <Path d="M4 12h11" {...p} />
          <Path d="M4 17h16" {...p} />
        </>
      );
    case 'list':
      return (
        <>
          <Path d="M9 6h11" {...p} />
          <Path d="M9 12h11" {...p} />
          <Path d="M9 18h11" {...p} />
          <Circle cx="4.7" cy="6" r="1.3" fill={color} stroke="none" />
          <Circle cx="4.7" cy="12" r="1.3" fill={color} stroke="none" />
          <Circle cx="4.7" cy="18" r="1.3" fill={color} stroke="none" />
        </>
      );
    case 'grid':
      return (
        <>
          <Rect x="4" y="4" width="7" height="7" rx="2" {...p} />
          <Rect x="13" y="4" width="7" height="7" rx="2" {...p} />
          <Rect x="4" y="13" width="7" height="7" rx="2" {...p} />
          <Rect x="13" y="13" width="7" height="7" rx="2" {...p} />
        </>
      );
    case 'door':
      return (
        <>
          <Path d="M6 20V5a1 1 0 011-1h8a1 1 0 011 1v15" {...p} />
          <Path d="M4 20h16" {...p} />
          <Circle cx="13" cy="12.5" r="1.1" fill={color} stroke="none" />
        </>
      );
    case 'key':
      return (
        <>
          <Circle cx="8" cy="12" r="4" {...p} />
          <Path d="M12 12h8" {...p} />
          <Path d="M17 12v3.5" {...p} />
          <Path d="M20 12v2.5" {...p} />
        </>
      );
    case 'bolt':
      return <Path d="M13.5 3L6 13.5h5L10.5 21 18 10.5h-5L13.5 3z" {...p} fill={color} />;
    case 'crown':
      return (
        <>
          <Path d="M4 17l-1-9 5 3.5L12 5l4 6.5L21 8l-1 9H4z" {...p} />
          <Path d="M4 20h16" {...p} />
        </>
      );
    case 'sparkle':
      return (
        <>
          <Path d="M12 4l1.8 4.7L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.3L12 4z" {...p} />
          <Path d="M18 16.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" {...p} />
        </>
      );
    case 'chat':
      return (
        <>
          <Path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1 0-2-.15-2.9-.43L4 20l1.2-3.3C4.45 15.5 4 14.05 4 12.5 4 8.9 7.6 6 12 6s8 2.9 8 6.5z" {...p} />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8.5z" {...p} />
        </>
      );
    case 'shop':
      return (
        <>
          <Path d="M4.5 8h15l-1 11.2a1 1 0 01-1 .8H6.5a1 1 0 01-1-.8L4.5 8z" {...p} />
          <Path d="M9 8V6.5a3 3 0 016 0V8" {...p} />
        </>
      );
    case 'trophy':
      return (
        <>
          <Path d="M7 4h10v5a5 5 0 01-10 0V4z" {...p} />
          <Path d="M7 6H4.5v1.5A3.5 3.5 0 008 11" {...p} />
          <Path d="M17 6h2.5v1.5A3.5 3.5 0 0116 11" {...p} />
          <Path d="M12 14v3" {...p} />
          <Path d="M8.5 20h7" {...p} />
          <Path d="M10 17h4l1 3H9l1-3z" {...p} />
        </>
      );
    case 'flame':
      return (
        <Path
          d="M12 3s1.2 3.2-1 5.5C8.4 11.2 6 13 6 16.2 6 19.9 8.7 22 12 22s6-2.1 6-5.8c0-2.6-1.4-4-2.6-5.6-1.1 1.6-2.1 1.6-2.1 0C13.3 8 14 5.3 12 3z"
          {...p}
        />
      );
    case 'gift':
      return (
        <>
          <Rect x="3.5" y="9.5" width="17" height="11" rx="2" {...p} />
          <Path d="M3.5 13.5h17" {...p} />
          <Path d="M12 9.5V20" {...p} />
          <Path d="M12 9.5S9.8 4 7.6 5.3C5.8 6.4 7.5 9.5 12 9.5z" {...p} />
          <Path d="M12 9.5s2.2-5.5 4.4-4.2c1.8 1.1.1 4.2-4.4 4.2z" {...p} />
        </>
      );
    case 'star':
      return <Path d="M12 3.8l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 10l5.9-.9L12 3.8z" {...p} />;
    case 'user':
      return (
        <>
          <Circle cx="12" cy="8.4" r="3.6" {...p} />
          <Path d="M5 19.5c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6" {...p} />
        </>
      );
    case 'coin':
      return (
        <>
          <Circle cx="12" cy="12" r="8.6" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="5.9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} />
          <Path d="M12 8.4v7.2M10 9.8h3a1.5 1.5 0 010 3h-2a1.5 1.5 0 000 3h3" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} strokeLinecap="round" />
        </>
      );
    case 'gem':
      return (
        <>
          <Path d="M7.2 4h9.6l4.2 5.4L12 20.8 3 9.4 7.2 4z" fill={color} stroke="none" />
          <Path d="M3 9.4h18M9.6 9.4L12 20.8l2.4-11.4M7.2 4l2.4 5.4M16.8 4l-2.4 5.4" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.3} strokeLinejoin="round" />
        </>
      );
    case 'medal':
      return (
        <>
          {/* Dây đeo hình dải, không phải nét mảnh — cỡ nhỏ vẫn ra huy chương. */}
          <Path d="M6.6 2.4l3.8 6.6-2.8 1.6L3.8 4l2.8-1.6zM17.4 2.4l-3.8 6.6 2.8 1.6L20.2 4l-2.8-1.6z" fill={color} stroke="none" />
          <Circle cx="12" cy="15.6" r="6.3" fill={color} stroke="none" />
          <Circle cx="12" cy="15.6" r="4.6" fill="rgba(255,255,255,0.22)" stroke="none" />
          <Path d="M12 12.2l1.05 2.15 2.35.34-1.7 1.66.4 2.35-2.1-1.1-2.1 1.1.4-2.35-1.7-1.66 2.35-.34L12 12.2z" fill="rgba(255,255,255,0.95)" stroke="none" />
        </>
      );
    case 'moon':
      return <Path d="M19 14.5A8 8 0 019.5 5 8.2 8.2 0 1019 14.5z" {...p} />;
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4.2" {...p} />
          <Path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" {...p} />
        </>
      );
    case 'ballot':
      return (
        <>
          <Rect x="3.5" y="12" width="17" height="8.5" rx="2" {...p} />
          <Path d="M7.5 12V4.5h9V12" {...p} />
          <Path d="M9.8 8.2l1.7 1.7 3-3.4" {...p} />
        </>
      );
    case 'skull':
      return (
        <>
          <Path d="M5 11a7 7 0 1114 0v3.2l-1.6 1.4V19H6.6v-3.4L5 14.2V11z" {...p} />
          <Circle cx="9.4" cy="11.6" r="1.7" {...p} />
          <Circle cx="14.6" cy="11.6" r="1.7" {...p} />
          <Path d="M12 15v2" {...p} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M2.8 12S6.4 6.2 12 6.2 21.2 12 21.2 12 17.6 17.8 12 17.8 2.8 12 2.8 12z" {...p} />
          <Circle cx="12" cy="12" r="2.9" {...p} />
        </>
      );
    case 'flask':
      return (
        <>
          <Path d="M10 3.5v5.2L5.2 17a2.6 2.6 0 002.3 3.9h9a2.6 2.6 0 002.3-3.9L14 8.7V3.5" {...p} />
          <Path d="M9 3.5h6" {...p} />
          <Path d="M7.4 14.6h9.2" {...p} />
        </>
      );
    case 'bow':
      return (
        <>
          <Path d="M5 19C13 17 17 13 19 5" {...p} />
          <Path d="M19 5h-4.4M19 5v4.4" {...p} />
          <Path d="M6.5 4.5A13 13 0 0119.5 17.5" {...p} />
          <Path d="M6.5 4.5L5 6M19.5 17.5L18 19" {...p} />
        </>
      );
    case 'anchor':
      return (
        <>
          <Circle cx="12" cy="5.2" r="2.2" {...p} />
          <Path d="M12 7.4V20" {...p} />
          <Path d="M8 10.5h8" {...p} />
          <Path d="M4.5 14.5c0 3.6 3.4 5.5 7.5 5.5s7.5-1.9 7.5-5.5" {...p} />
        </>
      );
    case 'receipt':
      return (
        <>
          <Path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17z" {...p} />
          <Path d="M9 8h6M9 12h6" {...p} />
        </>
      );
    case 'parking':
      return (
        <>
          <Rect x="4" y="4" width="16" height="16" rx="4" {...p} />
          <Path d="M10 17V8h3.2a2.9 2.9 0 010 5.8H10" {...p} />
        </>
      );
    case 'question':
      return (
        <>
          <Circle cx="12" cy="12" r="8.4" {...p} />
          <Path d="M9.6 9.6a2.5 2.5 0 114 2.5c-.9.7-1.6 1.2-1.6 2.4" {...p} />
          <Circle cx="12" cy="17.2" r="1" fill={color} stroke="none" />
        </>
      );
    case 'droplet':
      return <Path d="M12 3.5s6 6.6 6 10.4a6 6 0 11-12 0C6 10.1 12 3.5 12 3.5z" {...p} />;
    case 'handshake':
      return (
        <>
          <Path d="M2.8 11.5l3.4-3.4 3.6 1 2.2-1 2.2 1 3.6-1 3.4 3.4" {...p} />
          <Path d="M6.2 8.1v7.4l3.6 3.2 2.2-1.8 2.2 1.8 3.6-3.2V8.1" {...p} />
          <Path d="M9.8 12.4l2.2 1.9 2.2-1.9" {...p} />
        </>
      );
    default:
      return null;
  }
}
