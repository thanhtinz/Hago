import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

/**
 * Bộ mặt riêng của từng bộ môn.
 *
 * Khung app dùng chung một tông, nhưng mỗi game phải nhận ra được từ xa. Mỗi
 * mục ở đây khai màu nhấn, tên chất liệu, và một hình thu nhỏ gợi đúng bàn cờ
 * của nó — thẻ trong sảnh vẽ từ đây, và màn chơi sau này lấy cùng bảng màu.
 *
 * Hình thu nhỏ vẽ bằng SVG trong khung 100×64 cho mọi game, nên lưới thẻ đều
 * tăm tắp mà không cần một tấm ảnh nào.
 */

export interface GameFace {
  id: string;
  nameVi: string;
  taglineVi: string;
  /** Màu nhấn của game, dùng cho viền, nhãn và nền hình thu nhỏ. */
  accent: string;
  /** Nền của hình thu nhỏ — chính là chất liệu bàn cờ. */
  surface: string;
  material: string;
  seats: string;
  ready: boolean;
  Motif: () => React.ReactElement;
}

const V = '0 0 100 64';

/**
 * `meet` chứ không `slice`: thẻ trong sảnh rộng hơn tỉ lệ của hình, cắt cho
 * đầy thì mấy quân cờ ở mép trên mép dưới bị xén mất một nửa. Để lọt khung
 * thì hai bên hở ra nền — mà nền hở đúng bằng màu chất liệu của game nên
 * không thấy mối nối.
 */
const Frame = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <Svg width="100%" height="100%" viewBox={V} preserveAspectRatio="xMidYMid meet">
    <Rect x={0} y={0} width={100} height={64} fill={bg} />
    {children}
  </Svg>
);

/** Lưới đều, dùng lại cho mấy game bàn kẻ ô. */
const grid = (step: number, color: string, w = 0.7) => {
  const out: React.ReactElement[] = [];
  for (let x = 0; x <= 100; x += step) out.push(<Line key={`x${x}`} x1={x} y1={0} x2={x} y2={64} stroke={color} strokeWidth={w} />);
  for (let y = 0; y <= 64; y += step) out.push(<Line key={`y${y}`} x1={0} y1={y} x2={100} y2={y} stroke={color} strokeWidth={w} />);
  return out;
};

export const FACES: GameFace[] = [
  {
    id: 'co-caro',
    nameVi: 'Cờ Caro',
    taglineVi: 'Năm quân liền nhau, chặn hai đầu không tính',
    accent: '#25428F',
    surface: '#FBF8EF',
    material: 'Giấy ô ly',
    seats: '2 người',
    ready: true,
    Motif: () => (
      <Frame bg="#FBF8EF">
        {grid(8, '#A9BEDD')}
        <Line x1={16} y1={0} x2={16} y2={64} stroke="#E0736F" strokeWidth={1} opacity={0.7} />
        <Line x1={36} y1={32} x2={76} y2={32} stroke="#FCE99A" strokeWidth={13} strokeLinecap="round" />
        {[36, 46, 56, 66, 76].map((x) => (
          <G key={x}>
            <Path d={`M${x - 4} 28 L${x + 4} 36`} stroke="#25428F" strokeWidth={2.2} strokeLinecap="round" />
            <Path d={`M${x + 4} 28 L${x - 4} 36`} stroke="#25428F" strokeWidth={2.2} strokeLinecap="round" />
          </G>
        ))}
        {[40, 50, 60].map((x) => (
          <Circle key={x} cx={x} cy={44} r={4} stroke="#C0392B" strokeWidth={2.2} fill="none" />
        ))}
      </Frame>
    ),
  },
  {
    id: 'co-ganh',
    nameVi: 'Cờ Gánh',
    taglineVi: 'Cờ dân gian Quảng Nam — kẹp hai đầu là gánh được quân',
    accent: '#C06030',
    surface: '#E8D3BC',
    material: 'Sân gạch',
    seats: '2 người',
    ready: false,
    Motif: () => (
      <Frame bg="#E8D3BC">
        {grid(16, '#B08258', 1)}
        <Line x1={4} y1={0} x2={100} y2={64} stroke="#B08258" strokeWidth={1} />
        <Line x1={100} y1={0} x2={4} y2={64} stroke="#B08258" strokeWidth={1} />
        {[
          [20, 16, '#8C3A22'],
          [36, 32, '#F3E7D6'],
          [52, 16, '#8C3A22'],
          [68, 48, '#F3E7D6'],
          [84, 32, '#8C3A22'],
        ].map(([x, y, c], i) => (
          <Circle key={i} cx={x as number} cy={y as number} r={6} fill={c as string} stroke="#6E4A2E" strokeWidth={1} />
        ))}
      </Frame>
    ),
  },
  {
    id: 'o-an-quan',
    nameVi: 'Ô Ăn Quan',
    taglineVi: 'Rải sỏi từng ô, ăn quan, hết quan thì tàn dân',
    accent: '#6E8F4A',
    surface: '#D9CBB0',
    material: 'Sỏi đất',
    seats: '2 người',
    ready: false,
    Motif: () => (
      <Frame bg="#D9CBB0">
        <Rect x={16} y={14} width={68} height={36} stroke="#8A7350" strokeWidth={1.4} fill="none" />
        <Line x1={16} y1={32} x2={84} y2={32} stroke="#8A7350" strokeWidth={1.2} />
        {[33, 50, 67].map((x) => (
          <Line key={x} x1={x} y1={14} x2={x} y2={50} stroke="#8A7350" strokeWidth={1.2} />
        ))}
        <Path d="M16 14 A12 18 0 0 0 16 50 Z" fill="#C2B08C" stroke="#8A7350" strokeWidth={1.2} />
        <Path d="M84 14 A12 18 0 0 1 84 50 Z" fill="#C2B08C" stroke="#8A7350" strokeWidth={1.2} />
        {[
          [24, 22],
          [27, 27],
          [41, 22],
          [45, 26],
          [58, 41],
          [62, 44],
          [74, 24],
          [8, 32],
          [92, 30],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.6} fill="#5C5445" />
        ))}
      </Frame>
    ),
  },
  {
    id: 'co-tuong',
    nameVi: 'Cờ Tướng',
    taglineVi: 'Pháo qua sông, tướng không bao giờ lộ mặt',
    accent: '#A33B2A',
    surface: '#D8B98A',
    material: 'Gỗ tre',
    seats: '2 người',
    ready: false,
    Motif: () => (
      <Frame bg="#D8B98A">
        {grid(11, '#9A7443', 0.9)}
        <Rect x={0} y={26} width={100} height={12} fill="#D8B98A" />
        <Line x1={0} y1={26} x2={100} y2={26} stroke="#9A7443" strokeWidth={1} />
        <Line x1={0} y1={38} x2={100} y2={38} stroke="#9A7443" strokeWidth={1} />
        {[
          [26, 13, '#A33B2A', '帥'],
          [55, 13, '#2E2A26', '車'],
          [40, 51, '#2E2A26', '將'],
          [70, 51, '#A33B2A', '炮'],
        ].map(([x, y, c, ch], i) => (
          <G key={i}>
            <Circle cx={x as number} cy={y as number} r={8.5} fill="#F0DFC0" stroke={c as string} strokeWidth={1.6} />
            <SvgText
              x={x as number}
              y={(y as number) + 3.4}
              fontSize={9}
              fill={c as string}
              textAnchor="middle"
              fontWeight="bold"
            >
              {ch as string}
            </SvgText>
          </G>
        ))}
      </Frame>
    ),
  },
  {
    id: 'co-vua',
    nameVi: 'Cờ Vua',
    taglineVi: 'Cờ quốc tế, quân đá cẩm thạch',
    accent: '#7C8AA0',
    surface: '#EDE7DC',
    material: 'Đá',
    seats: '2 người',
    ready: false,
    Motif: () => (
      <Frame bg="#EDE7DC">
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 13 }, (_, c) =>
            (r + c) % 2 === 0 ? <Rect key={`${r}-${c}`} x={c * 8} y={r * 8} width={8} height={8} fill="#B9AE9B" /> : null,
          ),
        )}
        <Path d="M36 44 l4-14 h8 l4 14 z" fill="#2A2622" />
        <Circle cx={44} cy={26} r={5} fill="#2A2622" />
        <Path d="M60 44 l3-12 h6 l3 12 z" fill="#FAF6EE" stroke="#2A2622" strokeWidth={0.8} />
        <Circle cx={66} cy={28} r={4.4} fill="#FAF6EE" stroke="#2A2622" strokeWidth={0.8} />
      </Frame>
    ),
  },
  {
    id: 'co-up',
    nameVi: 'Cờ Úp',
    taglineVi: 'Quân úp sấp, đi rồi lật lên mới biết là gì',
    accent: '#8A6A3B',
    surface: '#B08E5E',
    material: 'Gỗ sẫm',
    seats: '2 người',
    ready: false,
    Motif: () => (
      <Frame bg="#B08E5E">
        {grid(11, '#8A6A3B', 0.9)}
        {[
          [22, 18],
          [40, 18],
          [58, 18],
          [76, 18],
          [31, 46],
          [67, 46],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={8} fill="#6E5330" stroke="#4C391F" strokeWidth={1.4} />
        ))}
        <G>
          <Circle cx={49} cy={46} r={8.5} fill="#F0DFC0" stroke="#A33B2A" strokeWidth={1.6} />
          <SvgText x={49} y={49.4} fontSize={9} fill="#A33B2A" textAnchor="middle" fontWeight="bold">
            馬
          </SvgText>
        </G>
      </Frame>
    ),
  },
  {
    id: 'co-ca-ngua',
    nameVi: 'Cờ Cá Ngựa',
    taglineVi: 'Bốn người, xúc xắc, về chuồng trước là thắng',
    accent: '#1F8A8A',
    surface: '#F2EFE6',
    material: 'Nhựa bóng',
    seats: '2–4 người',
    ready: false,
    Motif: () => (
      <Frame bg="#F2EFE6">
        <Rect x={0} y={22} width={100} height={20} fill="#FFFFFF" stroke="#C9C2B4" strokeWidth={0.8} />
        <Rect x={36} y={0} width={28} height={64} fill="#FFFFFF" stroke="#C9C2B4" strokeWidth={0.8} />
        <Rect x={2} y={24} width={16} height={16} rx={2} fill="#E24A4A" />
        <Rect x={82} y={24} width={16} height={16} rx={2} fill="#2E9E5B" />
        <Rect x={42} y={2} width={16} height={16} rx={2} fill="#3B76D1" />
        <Rect x={42} y={46} width={16} height={16} rx={2} fill="#E8B23A" />
        <Rect x={64} y={44} width={16} height={16} rx={3} fill="#FFFFFF" stroke="#8C8577" strokeWidth={1} />
        {[
          [68, 48],
          [76, 48],
          [72, 52],
          [68, 56],
          [76, 56],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={1.7} fill="#2A2622" />
        ))}
      </Frame>
    ),
  },
  {
    id: 'co-vay',
    nameVi: 'Cờ Vây',
    taglineVi: 'Vây đất, bắt khí — ván cờ dài nhất trong chín bộ',
    accent: '#4C4740',
    surface: '#E3BE7C',
    material: 'Gỗ kaya',
    seats: '2 người',
    ready: false,
    Motif: () => (
      <Frame bg="#E3BE7C">
        {grid(9, '#8A6A3B', 0.8)}
        {[
          [27, 18, '#1A1714'],
          [36, 18, '#1A1714'],
          [36, 27, '#FAF7F0'],
          [45, 27, '#1A1714'],
          [45, 36, '#FAF7F0'],
          [54, 36, '#FAF7F0'],
          [63, 27, '#1A1714'],
          [54, 45, '#1A1714'],
          [72, 45, '#FAF7F0'],
        ].map(([x, y, c], i) => (
          <Circle
            key={i}
            cx={x as number}
            cy={y as number}
            r={4.4}
            fill={c as string}
            stroke="#6E5330"
            strokeWidth={0.5}
          />
        ))}
      </Frame>
    ),
  },
  {
    id: 'co-ty-phu',
    nameVi: 'Cờ Tỷ Phú',
    taglineVi: 'Mua đất, thu tiền, đấu giá kín — bốn người',
    accent: '#C2477E',
    surface: '#EAF0E6',
    material: 'Bìa cứng',
    seats: '2–4 người',
    ready: false,
    Motif: () => (
      <Frame bg="#EAF0E6">
        <Rect x={8} y={6} width={84} height={52} rx={2} fill="#F7FAF4" stroke="#B8C4AE" strokeWidth={1} />
        <Rect x={20} y={18} width={60} height={28} rx={2} fill="#EAF0E6" stroke="#B8C4AE" strokeWidth={1} />
        {['#C2477E', '#E8B23A', '#3B76D1', '#2E9E5B', '#E24A4A'].map((c, i) => (
          <Rect key={c} x={20 + i * 12} y={6} width={12} height={7} fill={c} />
        ))}
        {['#7B4BC2', '#2E9E5B', '#E8B23A'].map((c, i) => (
          <Rect key={c} x={20 + i * 12} y={51} width={12} height={7} fill={c} />
        ))}
        <Rect x={36} y={26} width={28} height={13} rx={2} fill="#FFFFFF" stroke="#B8C4AE" strokeWidth={0.8} />
        <SvgText x={50} y={35.5} fontSize={8} fill="#2A2622" textAnchor="middle" fontWeight="bold">
          ₫
        </SvgText>
      </Frame>
    ),
  },
];

export const faceOf = (id: string): GameFace | undefined => FACES.find((f) => f.id === id);
