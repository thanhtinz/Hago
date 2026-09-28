import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { A } from './theme';

/**
 * Icon vẽ bằng SVG, không dùng emoji.
 *
 * Emoji đổi hình theo hệ điều hành và theo phiên bản, nên cùng một màn hình sẽ
 * trông khác nhau trên iPhone, Android và web — và không tô màu theo trạng
 * thái được. Nét SVG thì giống hệt nhau ở mọi nơi.
 */
export type IconName =
  | 'back'
  | 'bolt'
  | 'robot'
  | 'door'
  | 'key'
  | 'users'
  | 'home'
  | 'grid'
  | 'user'
  | 'clock'
  | 'flag'
  | 'draw'
  | 'refresh'
  | 'more'
  | 'settings'
  | 'lock'
  | 'chevron'
  | 'check'
  | 'bulb'
  | 'undo';

export function Icon({
  name,
  size = 20,
  color = A.ink,
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, p, color)}
    </Svg>
  );
}

function render(name: IconName, p: Record<string, unknown>, color: string) {
  switch (name) {
    case 'back':
      return <Path d="M15 5 L8 12 L15 19" {...p} />;
    case 'undo':
      return (
        <>
          <Path d="M4 12a8 8 0 1 0 2.6-5.9" {...p} />
          <Path d="M4 4v5h5" {...p} />
        </>
      );
    case 'bulb':
      return (
        <>
          <Path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" {...p} />
          <Path d="M10 19.5h4M10.5 22h3" {...p} />
        </>
      );
    case 'check':
      return <Path d="M5 12.5 L10 17.5 L19 7" {...p} />;
    case 'chevron':
      return <Path d="M9 5 L16 12 L9 19" {...p} />;
    case 'bolt':
      return <Path d="M13 2 L5 13h6l-2 9 8-11h-6z" {...p} />;
    case 'robot':
      return (
        <>
          <Rect x={4} y={8} width={16} height={12} rx={3} {...p} />
          <Path d="M12 4v4" {...p} />
          <Circle cx={9} cy={14} r={1.3} fill={color} stroke="none" />
          <Circle cx={15} cy={14} r={1.3} fill={color} stroke="none" />
        </>
      );
    case 'door':
      return (
        <>
          <Path d="M6 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" {...p} />
          <Path d="M4 21h16" {...p} />
          <Circle cx={13} cy={12} r={1} fill={color} stroke="none" />
        </>
      );
    case 'key':
      return (
        <>
          <Circle cx={8} cy={12} r={4} {...p} />
          <Path d="M12 12h9M18 12v3M21 12v2" {...p} />
        </>
      );
    case 'users':
      return (
        <>
          <Circle cx={9} cy={8} r={3.2} {...p} />
          <Path d="M3.5 20a5.5 5.5 0 0 1 11 0" {...p} />
          <Path d="M16 5.5a3.2 3.2 0 0 1 0 6M17 14.5a5.5 5.5 0 0 1 3.5 5.5" {...p} />
        </>
      );
    case 'home':
      return <Path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" {...p} />;
    case 'grid':
      return (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={1.6} {...p} />
          <Rect x={13} y={4} width={7} height={7} rx={1.6} {...p} />
          <Rect x={4} y={13} width={7} height={7} rx={1.6} {...p} />
          <Rect x={13} y={13} width={7} height={7} rx={1.6} {...p} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={3.6} {...p} />
          <Path d="M5 20a7 7 0 0 1 14 0" {...p} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Polyline points="12,7 12,12 15.5,14" {...p} />
        </>
      );
    case 'flag':
      return (
        <>
          <Path d="M6 21V4" {...p} />
          <Path d="M6 4h11l-2 4 2 4H6" {...p} />
        </>
      );
    // Hoà vẽ bằng dấu bằng trong vòng tròn. Cái bắt tay vẽ ở cỡ 20px thành
    // một vệt ngoằn ngoèo không ai đoán ra là cái gì.
    case 'draw':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M8 10h8M8 14h8" {...p} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path d="M20 12a8 8 0 1 1-2.6-5.9" {...p} />
          <Path d="M20 4v5h-5" {...p} />
        </>
      );
    case 'more':
      return (
        <>
          <Circle cx={5.5} cy={12} r={1.6} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={1.6} fill={color} stroke="none" />
          <Circle cx={18.5} cy={12} r={1.6} fill={color} stroke="none" />
        </>
      );
    case 'settings':
      return (
        <>
          <Path d="M4 8h16M4 16h16" {...p} />
          <Circle cx={9.5} cy={8} r={2.4} fill={color} stroke="none" />
          <Circle cx={15} cy={16} r={2.4} fill={color} stroke="none" />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x={5} y={10} width={14} height={10} rx={2.4} {...p} />
          <Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" {...p} />
        </>
      );
  }
}
