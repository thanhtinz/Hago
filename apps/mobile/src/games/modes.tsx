import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Frame, speckle, woodGrain } from './faces';

/**
 * Bộ hình thứ hai của app: vẽ **chế độ chơi**, không vẽ bộ môn.
 *
 * `faces.tsx` có mười ba bức, nhưng cả mười ba đều vẽ một bàn cờ. Không có
 * bức nào cho "Đấu xếp hạng", "Vượt ải" hay "Tạo phòng" — và thiếu đúng bộ
 * hình này là **lý do cơ học** khiến màn chọn chế độ lần trước tất yếu ra
 * một danh sách dòng chữ: không có gì để đặt vào thẻ ngoài một cái icon.
 * Một hàng icon cộng hai dòng chữ xám cộng mũi tên là ngữ pháp của trang
 * cài đặt, và người ta đọc ra ngay.
 *
 * Cùng khung `0 0 100 64`, cùng từ vựng chất liệu với `faces.tsx` — thớ gỗ,
 * hạt lấm tấm, bóng đổ dưới mỗi vật, một vệt sáng ở mép trên — nên hai bộ
 * hình đứng cạnh nhau trong một lưới không đọc thành hai app.
 */

const V = '0 0 100 64';
export const MODE_V = V;

/** Bóng đổ mềm dưới một vật, để nó nằm **trên** mặt chứ không dán lên mặt. */
const Bong = ({ cx, cy, rx, ry = 2 }: { cx: number; cy: number; rx: number; ry?: number }) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity={0.22} />
);

/** Vệt sáng mép trên: nguồn sáng ở trên, giống mọi bức trong `faces.tsx`. */
const Sang = () => <Rect x={0} y={0} width={100} height={20} fill="#FFFFFF" opacity={0.05} />;

export interface ModeArt {
  id: string;
  /** Màu nền của khung, cũng là màu hở ra hai bên khi thẻ rộng hơn tỉ lệ. */
  surface: string;
  Motif: () => React.ReactElement;
}

/** Ấn triện vàng dập trên giấy kẻ ô — hạng là thứ được đóng dấu. */
const XepHang: ModeArt = {
  id: 'xep-hang',
  surface: '#2A2113',
  Motif: () => (
    <Frame bg="#2A2113">
      {woodGrain(31, 9, '#120D06', 0.22)}
      {/* Giấy kẻ ô nằm nghiêng dưới con dấu. */}
      <G opacity={0.9}>
        <Rect x={16} y={12} width={68} height={44} rx={2} fill="#F4EBD6" opacity={0.14} />
        {Array.from({ length: 6 }, (_, i) => (
          <Path key={`h${i}`} d={`M18 ${16 + i * 8} H82`} stroke="#F4EBD6" strokeWidth={0.4} opacity={0.18} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <Path key={`v${i}`} d={`M${20 + i * 8} 14 V54`} stroke="#F4EBD6" strokeWidth={0.4} opacity={0.18} />
        ))}
      </G>
      <Bong cx={50} cy={49} rx={19} ry={3} />
      {/* Con dấu tám cạnh. */}
      <Path
        d="M41 16 H59 L67 24 V40 L59 48 H41 L33 40 V24 Z"
        fill="#E8C071"
        stroke="#FFE3A8"
        strokeWidth={1.1}
      />
      <Path d="M41 16 H59 L67 24 V30 H33 V24 Z" fill="#FFFFFF" opacity={0.14} />
      {/* Vương miện khắc chìm ba ngọn. */}
      <Path d="M40 37 L43 26 L47 32 L50 24 L53 32 L57 26 L60 37 Z" fill="#7A5310" opacity={0.85} />
      <Path d="M40 39.5 H60" stroke="#7A5310" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
      <Sang />
    </Frame>
  ),
};

/** Mặt đồng hồ nghiêng bên một quân cờ — ván thường là ván tính bằng giờ. */
const Thuong: ModeArt = {
  id: 'thuong',
  surface: '#1C2430',
  Motif: () => (
    <Frame bg="#1C2430">
      {woodGrain(47, 8, '#0A0E14', 0.16)}
      <Bong cx={36} cy={52} rx={20} ry={3} />
      {/* Đồng hồ hai mặt kiểu bấm giờ cờ. */}
      <Rect x={16} y={20} width={42} height={30} rx={4} fill="#243040" stroke="#3E4C61" strokeWidth={1} />
      <Rect x={16} y={20} width={42} height={9} rx={4} fill="#FFFFFF" opacity={0.06} />
      <Circle cx={28} cy={35} r={8.5} fill="#F4EBD6" opacity={0.92} />
      <Circle cx={46} cy={35} r={8.5} fill="#3E4C61" />
      <Path d="M28 35 V29" stroke="#1C2430" strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M28 35 L32.5 37.5" stroke="#B3231E" strokeWidth={1.2} strokeLinecap="round" />
      <Rect x={33} y={14} width={8} height={5} rx={2} fill="#E8C071" />
      {/* Quân cờ đứng cạnh. */}
      <Bong cx={76} cy={50} rx={9} ry={2.4} />
      <Circle cx={76} cy={40} r={10} fill="#F4EBD6" />
      <Circle cx={76} cy={40} r={10} fill="none" stroke="#C7B48E" strokeWidth={0.8} />
      <Path d="M71 35 L81 45 M81 35 L71 45" stroke="#25428F" strokeWidth={2.6} strokeLinecap="round" />
      <Sang />
    </Frame>
  ),
};

/** Đèo núi cắm cờ — mười cột, bốn cột đã cắm. */
const VuotAi: ModeArt = {
  id: 'vuot-ai',
  surface: '#22301F',
  Motif: () => (
    <Frame bg="#22301F">
      {speckle(83, 70, '#0B120A', 0.6, 0.4)}
      {/* Ba lớp núi, lớp xa nhạt hơn. */}
      <Path d="M-2 52 L18 30 L34 44 L52 22 L70 42 L86 28 L102 50 V66 H-2 Z" fill="#16200F" opacity={0.75} />
      <Path d="M-2 58 L14 42 L30 52 L48 36 L66 52 L84 40 L102 58 V66 H-2 Z" fill="#2E4028" />
      {/* Đường mòn vắt ngang. */}
      <Path
        d="M2 58 C 20 50, 26 56, 40 48 S 62 50, 74 42 S 92 40, 98 34"
        stroke="#C9B183"
        strokeWidth={1.6}
        fill="none"
        opacity={0.55}
        strokeDasharray="3 2.5"
      />
      {/* Mười cột cờ dọc đường, bốn cột đầu đã cắm cờ vàng. */}
      {Array.from({ length: 10 }, (_, i) => {
        const x = 8 + i * 9.4;
        const y = 56 - i * 2.2;
        const xong = i < 4;
        return (
          <G key={i}>
            <Path d={`M${x} ${y} V${y - 9}`} stroke={xong ? '#E8C071' : '#6B7A63'} strokeWidth={1.2} strokeLinecap="round" />
            <Path
              d={`M${x} ${y - 9} L${x + 6} ${y - 6.6} L${x} ${y - 4.2} Z`}
              fill={xong ? '#E8C071' : '#43503D'}
            />
          </G>
        );
      })}
      <Sang />
    </Frame>
  ),
};

/** Bàn tay cơ khí cầm quân cờ dưới đèn — phòng tập với máy. */
const May: ModeArt = {
  id: 'may',
  surface: '#2B2118',
  Motif: () => (
    <Frame bg="#2B2118">
      {woodGrain(19, 9, '#150F09', 0.24)}
      {/* Quầng đèn bàn. */}
      <Ellipse cx={58} cy={30} rx={40} ry={26} fill="#FFD79A" opacity={0.08} />
      <Bong cx={58} cy={52} rx={22} ry={3} />
      {/* Cánh tay máy mọc từ một cái đế, không lơ lửng từ mép tranh. */}
      <Bong cx={14} cy={52} rx={11} ry={2.6} />
      <Path d="M6 52 H22 L20 44 H8 Z" fill="#6F5A3C" />
      <Path d="M14 46 V26" stroke="#8A7150" strokeWidth={5} strokeLinecap="round" />
      <Path d="M14 26 H22 L34 34" stroke="#8A7150" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Circle cx={22} cy={26} r={3.6} fill="#C9A96A" />
      <Path d="M34 34 L44 40" stroke="#8A7150" strokeWidth={4} strokeLinecap="round" />
      <Circle cx={34} cy={34} r={3} fill="#C9A96A" />
      {/* Ngón kẹp giữ quân. */}
      <Path d="M44 40 L50 36 M44 40 L50 46" stroke="#C9A96A" strokeWidth={2.4} strokeLinecap="round" />
      <Bong cx={63} cy={49} rx={10} ry={2.4} />
      <Circle cx={63} cy={40} r={10.5} fill="#F4EBD6" />
      <Circle cx={63} cy={40} r={10.5} fill="none" stroke="#C7B48E" strokeWidth={0.8} />
      <Path d="M63 34 A6 6 0 1 0 67 44" stroke="#B3231E" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Sang />
    </Frame>
  ),
};

/** Cổng gỗ khắc năm ô trống — phòng riêng mở bằng mã năm ký tự. */
const Phong: ModeArt = {
  id: 'phong',
  surface: '#2E2116',
  Motif: () => (
    <Frame bg="#2E2116">
      {woodGrain(61, 10, '#150E07', 0.26)}
      <Bong cx={50} cy={57} rx={28} ry={3} />
      {/* Hai cánh cửa hé mở. */}
      <Path d="M18 10 H48 V56 H18 Z" fill="#4A331C" stroke="#7A5730" strokeWidth={1} />
      <Path d="M52 10 H82 V56 H52 Z" fill="#402C18" stroke="#7A5730" strokeWidth={1} />
      <Path d="M48 10 L52 14 V56 H48 Z" fill="#1A1209" opacity={0.7} />
      {/* Năm ô khắc trên cánh trái: chỗ của năm ký tự mã. */}
      {Array.from({ length: 5 }, (_, i) => (
        <Rect key={i} x={22} y={16 + i * 7.4} width={22} height={5.2} rx={1.2} fill="#1A1209" opacity={0.55} />
      ))}
      <Circle cx={55} cy={34} r={1.8} fill="#E8C071" />
      <Circle cx={45} cy={34} r={1.8} fill="#E8C071" />
      <Sang />
    </Frame>
  ),
};

/** Chìa khoá đồng trên mảnh giấy có năm ô — vào bằng mã bạn đọc cho. */
const Ma: ModeArt = {
  id: 'ma',
  surface: '#1F2732',
  Motif: () => (
    <Frame bg="#1F2732">
      {speckle(29, 50, '#0A0E14', 0.6, 0.35)}
      {/* Mảnh giấy ghi mã. */}
      <Bong cx={50} cy={50} rx={30} ry={3} />
      <Path d="M18 18 H82 L80 48 H20 Z" fill="#F4EBD6" opacity={0.9} />
      {Array.from({ length: 5 }, (_, i) => (
        <Rect key={i} x={24 + i * 11} y={34} width={8.4} height={10} rx={1.4} fill="#1F2732" opacity={0.22} />
      ))}
      <Path d="M24 26 H60" stroke="#1F2732" strokeWidth={1.2} opacity={0.3} strokeLinecap="round" />
      {/* Chìa khoá đồng nằm chéo trên giấy. */}
      <G>
        <Circle cx={68} cy={22} r={6.4} fill="none" stroke="#E8C071" strokeWidth={2.6} />
        <Path d="M72 27 L86 41" stroke="#E8C071" strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M80 35 L84 31 M84 39 L88 35" stroke="#E8C071" strokeWidth={2.2} strokeLinecap="round" />
      </G>
      <Sang />
    </Frame>
  ),
};

export const MODES: Record<string, ModeArt> = {
  'xep-hang': XepHang,
  thuong: Thuong,
  'vuot-ai': VuotAi,
  may: May,
  phong: Phong,
  ma: Ma,
};

export const modeArt = (id: string): ModeArt | null => MODES[id] ?? null;
