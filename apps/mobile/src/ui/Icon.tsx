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
  | 'scales'
  | 'newmatch'
  | 'more'
  | 'settings'
  | 'lock'
  | 'chevron'
  | 'check'
  | 'bulb'
  | 'undo'
  | 'chat'
  | 'copy'
  | 'crown'
  | 'list'
  | 'close';

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
    // Hai tờ giấy chồng lệch — hình quen của "sao chép" ở mọi nơi. Vẽ tờ
    // sau trước để tờ trước đè lên đúng thứ tự chiều sâu.
    // Ba dòng kẻ có chấm đầu dòng — dấu của một bản danh sách.
    case 'list':
      return (
        <>
          <Path d="M9 6.5 H20" {...p} />
          <Path d="M9 12 H20" {...p} />
          <Path d="M9 17.5 H20" {...p} />
          <Circle cx={4.6} cy={6.5} r={1.4} {...p} />
          <Circle cx={4.6} cy={12} r={1.4} {...p} />
          <Circle cx={4.6} cy={17.5} r={1.4} {...p} />
        </>
      );
    // Vương miện ba ngạnh, nét mảnh — dấu của bảng xếp hạng.
    case 'crown':
      return (
        <>
          <Path d="M4 17.5 L4 8 L8.5 11.5 L12 6 L15.5 11.5 L20 8 L20 17.5 Z" {...p} />
          <Path d="M4 20.5 H20" {...p} />
        </>
      );
    case 'copy':
      return (
        <>
          <Path d="M8 3.5 H18.5 A1.5 1.5 0 0 1 20 5 V15.5" {...p} />
          <Rect x={4} y={7} width={12} height={13.5} rx={2} {...p} />
        </>
      );
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
    /**
     * Cầu hoà: cái cân thăng bằng.
     *
     * Dấu bằng trong vòng tròn đọc ra là "bằng nhau" chứ không ra "xin
     * hoà" — nó là một phép toán, không phải một lời đề nghị. Cái cân thì
     * ai nhìn cũng hiểu là hai bên ngang nhau, và nó khác hẳn hình tròn của
     * mấy nút bên cạnh nên không lẫn.
     */
    case 'scales':
      return (
        <>
          <Path d="M12 4.5v15M7 19.5h10" {...p} />
          <Path d="M4.5 8h15" {...p} />
          <Circle cx={12} cy={6.2} r={1.5} fill={color} stroke="none" />
          <Path d="M4.5 8 L2 13.2a2.8 2.8 0 0 0 5 0z" {...p} />
          <Path d="M19.5 8 L17 13.2a2.8 2.8 0 0 0 5 0z" {...p} />
        </>
      );
    /**
     * Ván mới: một bàn cờ trống với dấu cộng.
     *
     * Trước đây là mũi tên tròn, mà nút lùi lại bên cạnh cũng là mũi tên
     * tròn quay ngược — hai nút cạnh nhau gần như giống hệt, người chơi
     * bấm nhầm là mất cả ván chứ không phải mất một nước.
     */
    case 'newmatch':
      return (
        <>
          <Rect x={2.8} y={2.8} width={13} height={13} rx={2.2} {...p} />
          <Path d="M9.3 2.8v13M2.8 9.3h13" {...p} />
          {/* Dấu cộng tách hẳn khỏi khung, không dính vào góc bàn cờ — dính
              vào thì ở cỡ 20px hai hình nhập làm một vệt. */}
          <Path d="M18.6 15.4v6.2M15.5 18.5h6.2" {...p} strokeWidth={2.3} />
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
    case 'chat':
      // Bong bóng có đuôi ở góc dưới trái và ba chấm bên trong: đọc ra là
      // "có người đang nói", không phải "một ô vuông bo góc".
      return (
        <>
          <Path d="M20 12.2c0 3.7-3.6 6.7-8 6.7-.9 0-1.8-.13-2.6-.36L5 20l1.2-3.1A6.4 6.4 0 0 1 4 12.2C4 8.5 7.6 5.5 12 5.5s8 3 8 6.7Z" {...p} />
          <Circle cx={8.8} cy={12.2} r={1.05} fill={color} stroke="none" />
          <Circle cx={12} cy={12.2} r={1.05} fill={color} stroke="none" />
          <Circle cx={15.2} cy={12.2} r={1.05} fill={color} stroke="none" />
        </>
      );
    case 'close':
      return (
        <>
          <Path d="M6 6l12 12M18 6L6 18" {...p} />
        </>
      );
  }
}
