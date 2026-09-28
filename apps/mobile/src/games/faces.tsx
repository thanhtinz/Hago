import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

/**
 * Bộ mặt riêng của từng bộ môn.
 *
 * Khung app dùng chung một tông, nhưng mỗi game phải nhận ra được từ xa. Mỗi
 * mục ở đây khai màu nhấn, tên chất liệu, và một hình thu nhỏ gợi đúng bàn cờ
 * của nó — thẻ trong sảnh vẽ từ đây, và màn chơi lấy cùng bảng màu.
 *
 * Hình vẽ bằng SVG trong khung 100×64 cho mọi game, nên lưới thẻ đều tăm tắp
 * mà không cần một tấm ảnh nào, sắc nét ở mọi mật độ điểm ảnh, và tải về 0
 * byte.
 *
 * Bản đầu chỉ là hình khối phẳng: đĩa tròn tô một màu đặt trên nền một màu.
 * Nhìn xa thì chín thẻ hoá ra giống nhau — vẫn là "mấy chấm tròn trên nền
 * be". Bản này dựng **chất liệu** thật: gỗ có thớ, sỏi có vân, đá có mạch,
 * nhựa có vệt bóng, bìa có sợi giấy. Quân nào cũng có bóng đổ và vệt sáng
 * mép trên, nên chúng nằm *trên* bàn chứ không dán *vào* bàn.
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

/**
 * Số ngẫu nhiên **cố định theo hạt giống**. Vân gỗ, hạt cát, vết lốm đốm cần
 * trông ngẫu nhiên, nhưng phải giống hệt nhau qua mỗi lần vẽ lại — nếu không
 * thì cứ đổi hướng màn hình là cả bàn cờ lại đổi vân, trông như đang chập.
 */
function seeded(seed: number): () => number {
  let x = seed | 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

/** Hạt lấm tấm rải đều — cát, sỏi, sợi giấy. */
function speckle(seed: number, n: number, color: string, rMax = 0.7, opacity = 0.35) {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, i) => (
    <Circle
      key={i}
      cx={rnd() * 100}
      cy={rnd() * 64}
      r={0.25 + rnd() * rMax}
      fill={color}
      opacity={opacity * (0.5 + rnd() * 0.5)}
    />
  ));
}

/** Thớ gỗ: những đường cong dài gần song song, chỗ dày chỗ thưa. */
function woodGrain(seed: number, n: number, color: string, opacity = 0.2) {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, i) => {
    const y = (i + 0.5) * (64 / n) + (rnd() - 0.5) * 3;
    const a = y + (rnd() - 0.5) * 3.5;
    const b = y + (rnd() - 0.5) * 3.5;
    return (
      <Path
        key={i}
        d={`M-2 ${y} C 20 ${a}, 45 ${b}, 70 ${a} S 95 ${y}, 102 ${b}`}
        stroke={color}
        strokeWidth={0.3 + rnd() * 0.5}
        fill="none"
        opacity={opacity * (0.4 + rnd() * 0.6)}
      />
    );
  });
}

/** Lưới đều, dùng lại cho mấy game bàn kẻ ô. */
function grid(step: number, color: string, w = 0.7, opacity = 1) {
  const out: React.ReactElement[] = [];
  for (let x = 0; x <= 100; x += step)
    out.push(<Line key={`x${x}`} x1={x} y1={0} x2={x} y2={64} stroke={color} strokeWidth={w} opacity={opacity} />);
  for (let y = 0; y <= 64; y += step)
    out.push(<Line key={`y${y}`} x1={0} y1={y} x2={100} y2={y} stroke={color} strokeWidth={w} opacity={opacity} />);
  return out;
}

/**
 * Nét khắc chìm: một nét tối rồi một nét sáng ngay dưới. Mắt đọc cặp nét đó
 * thành rãnh khắc trên mặt gỗ, thay vì một sợi chỉ vẽ lên trên.
 */
function carved(d: string, dark: string, light: string, w = 0.9) {
  return (
    <G>
      <Path d={d} stroke={light} strokeWidth={w} fill="none" opacity={0.5} transform="translate(0, 0.55)" />
      <Path d={d} stroke={dark} strokeWidth={w} fill="none" opacity={0.75} />
    </G>
  );
}

/**
 * Quân cờ hình đĩa: bóng đổ, mặt có chuyển sáng, vành khắc, và một vệt sáng
 * ở mép trên. Bốn chi tiết đó là toàn bộ khác biệt giữa "quân cờ gỗ" và "hình
 * tròn tô màu".
 */
function Disc({
  x,
  y,
  r,
  grad,
  rim,
  ring,
  char,
  charColor,
}: {
  x: number;
  y: number;
  r: number;
  grad: string;
  rim: string;
  ring?: boolean;
  char?: string;
  charColor?: string;
}) {
  return (
    <G>
      <Ellipse cx={x + 0.4} cy={y + r * 0.5} rx={r * 0.92} ry={r * 0.3} fill="#2A1C0E" opacity={0.28} />
      <Circle cx={x} cy={y} r={r} fill={`url(#${grad})`} stroke={rim} strokeWidth={0.7} />
      {ring ? <Circle cx={x} cy={y} r={r * 0.76} fill="none" stroke={rim} strokeWidth={0.6} opacity={0.65} /> : null}
      <Path
        d={`M${x - r * 0.72} ${y - r * 0.4} A ${r * 0.85} ${r * 0.85} 0 0 1 ${x + r * 0.5} ${y - r * 0.68}`}
        stroke="#FFFFFF"
        strokeWidth={r * 0.16}
        strokeLinecap="round"
        fill="none"
        opacity={0.4}
      />
      {char ? (
        <SvgText x={x} y={y + r * 0.38} fontSize={r * 1.05} fill={charColor} textAnchor="middle" fontWeight="bold">
          {char}
        </SvgText>
      ) : null}
    </G>
  );
}

/** Quân cờ vây: sứ đen bóng hoặc sò trắng, khác nhau ở chỗ bắt sáng. */
function Stone({ x, y, r, dark, idp }: { x: number; y: number; r: number; dark: boolean; idp: string }) {
  return (
    <G>
      <Ellipse cx={x + 0.3} cy={y + r * 0.55} rx={r * 0.95} ry={r * 0.3} fill="#3A2A12" opacity={0.3} />
      <Circle cx={x} cy={y} r={r} fill={`url(#${idp}-${dark ? 'b' : 'w'})`} />
      <Ellipse
        cx={x - r * 0.28}
        cy={y - r * 0.34}
        rx={r * 0.38}
        ry={r * 0.24}
        fill="#FFFFFF"
        opacity={dark ? 0.45 : 0.75}
        transform={`rotate(-28 ${x - r * 0.28} ${y - r * 0.34})`}
      />
    </G>
  );
}

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
        <Defs>
          <LinearGradient id="caro-p" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#FFFDF6" />
            <Stop offset="0.6" stopColor="#FBF8EF" />
            <Stop offset="1" stopColor="#F2ECDC" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#caro-p)" />
        {speckle(7, 40, '#C9BFA4', 0.35, 0.3)}
        {grid(8, '#A9BEDD', 0.55)}
        {grid(40, '#8AA6CE', 0.9)}
        <Line x1={14} y1={0} x2={14} y2={64} stroke="#E0736F" strokeWidth={0.9} opacity={0.75} />
        {/* Vệt dạ quang: hai nhát chồng lệch nhau, một nhát đậm hơn ở giữa —
            bút dạ thật không bao giờ ra một dải đều tăm tắp. */}
        <Line x1={34} y1={31.4} x2={78} y2={31.8} stroke="#FCE99A" strokeWidth={13} strokeLinecap="round" opacity={0.95} />
        <Line x1={37} y1={32.6} x2={73} y2={32.2} stroke="#F7DC72" strokeWidth={8} strokeLinecap="round" opacity={0.55} />
        {[36, 46, 56, 66, 76].map((x, i) => (
          <G key={x} opacity={0.94}>
            <Path d={`M${x - 4.4} ${27.6 + (i % 2) * 0.4} Q${x} 32 ${x + 4.2} 36.4`} stroke="#25428F" strokeWidth={2.4} strokeLinecap="round" fill="none" />
            <Path d={`M${x + 4.2} 27.8 Q${x - 0.4} 32.4 ${x - 4.4} 36.2`} stroke="#25428F" strokeWidth={2.4} strokeLinecap="round" fill="none" />
          </G>
        ))}
        {[40, 50, 60].map((x, i) => (
          <Path
            key={x}
            d={`M${x + 3.6} ${41.4 + i * 0.2} A4.2 4 0 1 0 ${x + 4} ${46} A4 4 0 0 0 ${x + 2.4} ${40.8}`}
            stroke="#C0392B"
            strokeWidth={2.3}
            strokeLinecap="round"
            fill="none"
            opacity={0.94}
          />
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
        <Defs>
          <LinearGradient id="ganh-b" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor="#E9D6BE" />
            <Stop offset="1" stopColor="#CDAF92" />
          </LinearGradient>
          <RadialGradient id="ganh-d" cx="0.36" cy="0.3" r="0.85">
            <Stop offset="0" stopColor="#B4533A" />
            <Stop offset="1" stopColor="#6E2B1B" />
          </RadialGradient>
          <RadialGradient id="ganh-l" cx="0.36" cy="0.3" r="0.85">
            <Stop offset="0" stopColor="#FFF9EE" />
            <Stop offset="1" stopColor="#DCC7A8" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#ganh-b)" />
        {/* Mạch vữa giữa các viên gạch, hàng lệch nhau như lát sân thật. */}
        {[0, 1, 2, 3].map((r) => (
          <G key={r}>
            <Line x1={0} y1={r * 16} x2={100} y2={r * 16} stroke="#BFA184" strokeWidth={1.1} opacity={0.65} />
            {[0, 1, 2, 3, 4].map((c) => (
              <Line
                key={c}
                x1={c * 25 + (r % 2 ? 12.5 : 0)}
                y1={r * 16}
                x2={c * 25 + (r % 2 ? 12.5 : 0)}
                y2={r * 16 + 16}
                stroke="#BFA184"
                strokeWidth={1.1}
                opacity={0.5}
              />
            ))}
          </G>
        ))}
        {speckle(21, 70, '#A98A6C', 0.5, 0.3)}
        {/* Bàn cờ gánh thật: 5×5 điểm, hai đường chéo lớn và hình thoi nối
            các điểm giữa cạnh — đúng những đường cho phép quân đi chéo. */}
        {(() => {
          const px = (i: number) => 18 + i * 16;
          const py = (j: number) => 8 + j * 12;
          const chalk = { stroke: '#F8F2E6', fill: 'none', strokeLinecap: 'round' as const };
          return (
            <G opacity={0.9}>
              {[0, 1, 2, 3, 4].map((j) => (
                <Path key={`h${j}`} d={`M${px(0)} ${py(j)} H${px(4)}`} strokeWidth={1.3} {...chalk} />
              ))}
              {[0, 1, 2, 3, 4].map((i) => (
                <Path key={`v${i}`} d={`M${px(i)} ${py(0)} V${py(4)}`} strokeWidth={1.3} {...chalk} />
              ))}
              <Path d={`M${px(0)} ${py(0)} L${px(4)} ${py(4)}`} strokeWidth={1.1} {...chalk} />
              <Path d={`M${px(4)} ${py(0)} L${px(0)} ${py(4)}`} strokeWidth={1.1} {...chalk} />
              <Path
                d={`M${px(2)} ${py(0)} L${px(4)} ${py(2)} L${px(2)} ${py(4)} L${px(0)} ${py(2)} Z`}
                strokeWidth={1.1}
                {...chalk}
              />
            </G>
          );
        })()}
        {[
          [18, 8],
          [50, 8],
          [82, 8],
          [34, 20],
          [66, 44],
        ].map(([x, y]) => (
          <Disc key={`d${x}-${y}`} x={x!} y={y!} r={5.6} grad="ganh-d" rim="#5A2212" />
        ))}
        {[
          [18, 56],
          [50, 56],
          [82, 56],
          [50, 32],
          [34, 44],
        ].map(([x, y]) => (
          <Disc key={`l${x}-${y}`} x={x!} y={y!} r={5.6} grad="ganh-l" rim="#A98A6C" />
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
    Motif: () => {
      const rnd = seeded(99);
      const pebble = (x: number, y: number, r: number, big = false) => (
        <G key={`${x}-${y}`}>
          <Ellipse cx={x + 0.3} cy={y + r * 0.6} rx={r} ry={r * 0.42} fill="#6B5B42" opacity={0.3} />
          <Circle cx={x} cy={y} r={r} fill={`url(#quan-${big ? 'q' : 'd'})`} />
          <Ellipse cx={x - r * 0.3} cy={y - r * 0.35} rx={r * 0.4} ry={r * 0.26} fill="#FFFFFF" opacity={0.5} />
        </G>
      );
      return (
        <Frame bg="#D9CBB0">
          <Defs>
            <LinearGradient id="quan-g" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#E8D9BB" />
              <Stop offset="1" stopColor="#C3AD87" />
            </LinearGradient>
            <RadialGradient id="quan-d" cx="0.35" cy="0.3" r="0.8">
              <Stop offset="0" stopColor="#8D8474" />
              <Stop offset="1" stopColor="#4C463A" />
            </RadialGradient>
            <RadialGradient id="quan-q" cx="0.35" cy="0.28" r="0.8">
              <Stop offset="0" stopColor="#F3EADA" />
              <Stop offset="1" stopColor="#B7A98C" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={64} fill="url(#quan-g)" />
          {speckle(33, 110, '#9C8C6E', 0.55, 0.4)}
          {/* Lòng ô trũng xuống: mép trên tối, đáy sáng. */}
          {/* Lòng ô trũng xuống: đáy tối hơn mặt sân, mép trên có một vệt
              bóng đổ. Ô vẽ bằng nét viền không thôi thì trông như kẻ bằng
              phấn, không ra cái hố đào trên đất. */}
          {[0, 1, 2, 3, 4].map((i) => (
            <G key={i}>
              <Rect x={22 + i * 12} y={13} width={12} height={19} fill="#B9A681" />
              <Rect x={22 + i * 12} y={32} width={12} height={19} fill="#B9A681" />
              <Rect x={22 + i * 12} y={13} width={12} height={3} fill="#8A7854" opacity={0.45} />
              <Rect x={22 + i * 12} y={32} width={12} height={3} fill="#8A7854" opacity={0.45} />
            </G>
          ))}
          <Path d="M22 13 A11 19 0 0 0 22 51 Z" fill="#AC9873" />
          <Path d="M82 13 A11 19 0 0 1 82 51 Z" fill="#AC9873" />
          <Path d="M22 13 A11 19 0 0 0 13 32" stroke="#846F4C" strokeWidth={2.4} fill="none" opacity={0.4} />
          <Path d="M82 13 A11 19 0 0 1 91 32" stroke="#846F4C" strokeWidth={2.4} fill="none" opacity={0.4} />
          {carved('M22 13 H82 M22 32 H82 M22 51 H82', '#6B5636', '#EFE2C8', 1.3)}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <G key={i}>{carved(`M${22 + i * 12} 13 V51`, '#6B5636', '#EFE2C8', 1.2)}</G>
          ))}
          {carved('M22 13 A11 19 0 0 0 22 51', '#6B5636', '#EFE2C8', 1.3)}
          {carved('M82 13 A11 19 0 0 1 82 51', '#6B5636', '#EFE2C8', 1.3)}
          {[
            [27, 21],
            [30, 26],
            [26.5, 27.5],
            [40, 22],
            [44, 25],
            [63, 41],
            [67, 44],
            [64, 46],
            [76, 22],
            [79, 25],
            [52, 43],
          ].map(([x, y]) => pebble(x!, y!, 2.1 + rnd() * 0.9))}
          {pebble(16.5, 30, 4.4, true)}
          {pebble(87.5, 34, 4.4, true)}
        </Frame>
      );
    },
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
        <Defs>
          <LinearGradient id="tuong-b" x1="0" y1="0" x2="0.25" y2="1">
            <Stop offset="0" stopColor="#E8CBA0" />
            <Stop offset="0.5" stopColor="#D8B98A" />
            <Stop offset="1" stopColor="#BF9C6C" />
          </LinearGradient>
          <RadialGradient id="tuong-p" cx="0.36" cy="0.28" r="0.85">
            <Stop offset="0" stopColor="#FCF2DE" />
            <Stop offset="1" stopColor="#DCC095" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#tuong-b)" />
        {woodGrain(5, 9, '#9A7443', 0.3)}
        {/* Bàn cờ tướng: 9 cột, sông ở giữa, cung tướng có gạch chéo. */}
        <G>
          {Array.from({ length: 9 }, (_, i) => (
            <G key={`v${i}`}>
              {carved(`M${8 + i * 10.5} 8 V26`, '#7A5828', '#F0DDBA', 0.8)}
              {carved(`M${8 + i * 10.5} 38 V56`, '#7A5828', '#F0DDBA', 0.8)}
            </G>
          ))}
          {[8, 14, 20, 26, 38, 44, 50, 56].map((y) => (
            <G key={`h${y}`}>{carved(`M8 ${y} H92`, '#7A5828', '#F0DDBA', 0.8)}</G>
          ))}
          {carved('M8 8 V56 M92 8 V56', '#7A5828', '#F0DDBA', 0.9)}
          {carved('M39.5 8 L60.5 20 M60.5 8 L39.5 20', '#7A5828', '#F0DDBA', 0.7)}
          {carved('M39.5 44 L60.5 56 M60.5 44 L39.5 56', '#7A5828', '#F0DDBA', 0.7)}
        </G>
        <SvgText x={28} y={35} fontSize={8.5} fill="#8A6438" textAnchor="middle" opacity={0.75}>
          楚河
        </SvgText>
        <SvgText x={72} y={35} fontSize={8.5} fill="#8A6438" textAnchor="middle" opacity={0.75}>
          漢界
        </SvgText>
        <Disc x={18} y={14} r={8.2} grad="tuong-p" rim="#A33B2A" ring char="帥" charColor="#A33B2A" />
        <Disc x={50} y={14} r={8.2} grad="tuong-p" rim="#3A3430" ring char="車" charColor="#2E2A26" />
        <Disc x={34} y={50} r={8.2} grad="tuong-p" rim="#3A3430" ring char="馬" charColor="#2E2A26" />
        <Disc x={72} y={50} r={8.2} grad="tuong-p" rim="#A33B2A" ring char="炮" charColor="#A33B2A" />
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
        <Defs>
          <LinearGradient id="vua-l" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F6F2E9" />
            <Stop offset="1" stopColor="#DFD8C8" />
          </LinearGradient>
          <LinearGradient id="vua-d" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8D93A0" />
            <Stop offset="1" stopColor="#666D7C" />
          </LinearGradient>
          <LinearGradient id="vua-pb" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#4A4E58" />
            <Stop offset="1" stopColor="#1C1E24" />
          </LinearGradient>
          <LinearGradient id="vua-pw" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#D9D2C4" />
          </LinearGradient>
          <ClipPath id="vua-clip">
            <Rect x={0} y={0} width={100} height={64} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#vua-clip)">
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 13 }, (_, c) => (
              <Rect key={`${r}-${c}`} x={c * 8} y={r * 8} width={8} height={8} fill={(r + c) % 2 === 0 ? 'url(#vua-d)' : 'url(#vua-l)'} />
            )),
          )}
          {/* Mạch đá: vài đường mảnh chạy xiên qua cả bàn. */}
          {[12, 30, 48].map((y, i) => (
            <Path
              key={i}
              d={`M-4 ${y} C 25 ${y + 8}, 55 ${y - 7}, 104 ${y + 4}`}
              stroke="#FFFFFF"
              strokeWidth={0.5}
              fill="none"
              opacity={0.3}
            />
          ))}
        </G>
        {/* Vua đen và tốt trắng, có bệ và bóng đổ. */}
        <G>
          <Ellipse cx={36} cy={50} rx={11} ry={3.2} fill="#2A2622" opacity={0.3} />
          <Path d="M28 49 q1.5-4 5-5.5 l-1.5-9 q-3.5-2 0-4 l3-0.5 v-2.5 h-2 v-2.5 h2 v-2.5 h3 v2.5 h2 v2.5 h-2 v2.5 l3 0.5 q3.5 2 0 4 l-1.5 9 q3.5 1.5 5 5.5 z" fill="url(#vua-pb)" />
          <Path d="M31 33 q5-1.5 10 0" stroke="#FFFFFF" strokeWidth={0.7} fill="none" opacity={0.35} />
        </G>
        <G>
          <Ellipse cx={64} cy={50} rx={9} ry={2.8} fill="#2A2622" opacity={0.28} />
          <Path d="M57 49 q1-4 4.5-6 l-1-7 q-3-1.5 0-3 h7 q3 1.5 0 3 l-1 7 q3.5 2 4.5 6 z" fill="url(#vua-pw)" stroke="#8D93A0" strokeWidth={0.6} />
          <Circle cx={64} cy={30} r={4.6} fill="url(#vua-pw)" stroke="#8D93A0" strokeWidth={0.6} />
          <Path d="M61 28.4 q3-2 6 0" stroke="#FFFFFF" strokeWidth={0.9} fill="none" opacity={0.8} />
        </G>
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
        <Defs>
          <LinearGradient id="up-b" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#BE9A66" />
            <Stop offset="1" stopColor="#8E6F45" />
          </LinearGradient>
          <RadialGradient id="up-back" cx="0.35" cy="0.28" r="0.85">
            <Stop offset="0" stopColor="#7E6138" />
            <Stop offset="1" stopColor="#3F2E18" />
          </RadialGradient>
          <RadialGradient id="up-face" cx="0.36" cy="0.28" r="0.85">
            <Stop offset="0" stopColor="#FCF2DE" />
            <Stop offset="1" stopColor="#DCC095" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#up-b)" />
        {woodGrain(11, 8, '#5E4526', 0.28)}
        {[8, 20, 32, 44, 56].map((y) => (
          <G key={y}>{carved(`M6 ${y} H94`, '#6A4F2A', '#D6B584', 0.8)}</G>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <G key={i}>{carved(`M${6 + i * 12.6} 8 V56`, '#6A4F2A', '#D6B584', 0.8)}</G>
        ))}
        {/* Quân úp sấp: lưng gỗ tối, có vòng khắc ở giữa nên nhìn ra là mặt sau. */}
        {[
          [22, 18],
          [40, 18],
          [58, 18],
          [76, 18],
          [31, 46],
          [69, 46],
        ].map(([x, y]) => (
          <G key={`${x}-${y}`}>
            <Disc x={x!} y={y!} r={7.8} grad="up-back" rim="#2F2110" />
            <Circle cx={x} cy={y} r={3.4} fill="none" stroke="#2F2110" strokeWidth={0.8} opacity={0.6} />
            <Circle cx={x} cy={y} r={1.2} fill="#2F2110" opacity={0.5} />
          </G>
        ))}
        {/* Đúng một quân đã lật — cả bộ mặt của game nằm ở chi tiết này. */}
        <Disc x={50} y={46} r={8.4} grad="up-face" rim="#A33B2A" ring char="馬" charColor="#A33B2A" />
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
    Motif: () => {
      const peg = (x: number, y: number, c: string, d: string) => (
        <G key={`${x}-${y}`}>
          <Ellipse cx={x} cy={y + 5} rx={3.4} ry={1.2} fill="#2A2622" opacity={0.25} />
          <Path d={`M${x - 3.2} ${y + 5} q0.6-3.6 3.2-5.2 q2.6 1.6 3.2 5.2 z`} fill={d} />
          <Circle cx={x} cy={y - 3} r={3.4} fill={c} />
          <Circle cx={x - 1.1} cy={y - 4.2} r={1.1} fill="#FFFFFF" opacity={0.75} />
        </G>
      );
      return (
        <Frame bg="#F2EFE6">
          <Defs>
            <LinearGradient id="ngua-b" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#FBFAF5" />
              <Stop offset="1" stopColor="#E4E0D3" />
            </LinearGradient>
            <LinearGradient id="ngua-die" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#D8D3C4" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={64} fill="url(#ngua-b)" />
          {/* Bàn chữ thập, bốn nhà bốn góc. */}
          <Rect x={0} y={23} width={100} height={18} fill="#FFFFFF" stroke="#C9C2B4" strokeWidth={0.7} />
          <Rect x={37} y={0} width={26} height={64} fill="#FFFFFF" stroke="#C9C2B4" strokeWidth={0.7} />
          {Array.from({ length: 12 }, (_, i) => (
            <Line key={`c${i}`} x1={i * 8.4} y1={23} x2={i * 8.4} y2={41} stroke="#E0DACB" strokeWidth={0.6} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <Line key={`r${i}`} x1={37} y1={i * 8.5} x2={63} y2={i * 8.5} stroke="#E0DACB" strokeWidth={0.6} />
          ))}
          {[
            [2, 25, '#E24A4A'],
            [84, 25, '#2E9E5B'],
          ].map(([x, y, c], i) => (
            <G key={i}>
              <Rect x={x as number} y={y as number} width={14} height={14} rx={2.5} fill={c as string} />
              <Rect x={(x as number) + 1.4} y={(y as number) + 1.4} width={11.2} height={4.6} rx={1.6} fill="#FFFFFF" opacity={0.28} />
            </G>
          ))}
          {[
            [43, 2, '#3B76D1'],
            [43, 48, '#E8B23A'],
          ].map(([x, y, c], i) => (
            <G key={i}>
              <Rect x={x as number} y={y as number} width={14} height={14} rx={2.5} fill={c as string} />
              <Rect x={(x as number) + 1.4} y={(y as number) + 1.4} width={11.2} height={4.6} rx={1.6} fill="#FFFFFF" opacity={0.28} />
            </G>
          ))}
          {peg(22, 32, '#E24A4A', '#B33333')}
          {peg(78, 32, '#2E9E5B', '#217544')}
          {peg(50, 12, '#3B76D1', '#2A56A0')}
          {/* Xúc xắc đang nằm trên bàn, nghiêng một chút cho có động. */}
          <G transform="rotate(-11 74 50)">
            <Rect x={66} y={43} width={15} height={15} rx={3.4} fill="#BFB8A8" />
            <Rect x={66} y={42} width={15} height={15} rx={3.4} fill="url(#ngua-die)" stroke="#A8A193" strokeWidth={0.6} />
            {[
              [70, 46],
              [77, 46],
              [73.5, 49.5],
              [70, 53],
              [77, 53],
            ].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={1.6} fill="#2A2622" />
            ))}
            <Rect x={67.4} y={43.4} width={12} height={3.4} rx={1.4} fill="#FFFFFF" opacity={0.5} />
          </G>
        </Frame>
      );
    },
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
        <Defs>
          <LinearGradient id="vay-bd" x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0" stopColor="#F0D097" />
            <Stop offset="0.55" stopColor="#E3BE7C" />
            <Stop offset="1" stopColor="#CBA365" />
          </LinearGradient>
          <RadialGradient id="vay-b" cx="0.32" cy="0.26" r="0.9">
            <Stop offset="0" stopColor="#585349" />
            <Stop offset="0.55" stopColor="#23201C" />
            <Stop offset="1" stopColor="#0E0D0B" />
          </RadialGradient>
          <RadialGradient id="vay-w" cx="0.32" cy="0.26" r="0.9">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.7" stopColor="#F3EEE2" />
            <Stop offset="1" stopColor="#CFC6B2" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#vay-bd)" />
        {woodGrain(17, 12, '#A97F44', 0.22)}
        {grid(8, '#6E5330', 0.5, 0.75)}
        {/* Sao: chấm mốc trên bàn vây thật, thiếu nó là nhìn ra ngay. */}
        {[
          [24, 16],
          [72, 16],
          [24, 48],
          [72, 48],
          [48, 32],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={1.1} fill="#4A3418" />
        ))}
        {[
          [32, 16, true],
          [40, 16, true],
          [40, 24, false],
          [48, 24, true],
          [48, 32, false],
          [56, 32, false],
          [64, 24, true],
          [56, 40, true],
          [72, 40, false],
          [32, 32, true],
        ].map(([x, y, d], i) => (
          <Stone key={i} x={x as number} y={y as number} r={4.2} dark={d as boolean} idp="vay" />
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
        <Defs>
          <LinearGradient id="typhu-b" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#F3F7EF" />
            <Stop offset="1" stopColor="#DDE6D7" />
          </LinearGradient>
          <LinearGradient id="typhu-card" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#EFEFE6" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#typhu-b)" />
        {speckle(55, 90, '#B9C6B2', 0.4, 0.3)}
        <Rect x={4} y={3} width={92} height={58} rx={2} fill="#F7FAF4" stroke="#B8C4AE" strokeWidth={0.9} />
        <Rect x={17} y={16} width={66} height={32} rx={1.5} fill="#E7EEE2" stroke="#B8C4AE" strokeWidth={0.8} />
        {/* Dải màu các nhóm đất, viền đen như bìa in thật. */}
        {['#C2477E', '#E8B23A', '#3B76D1', '#2E9E5B', '#E24A4A'].map((c, i) => (
          <G key={c}>
            <Rect x={17 + i * 13.2} y={3.6} width={13.2} height={7} fill={c} />
            <Rect x={17 + i * 13.2} y={3.6} width={13.2} height={7} fill="none" stroke="#2A2622" strokeWidth={0.4} opacity={0.5} />
          </G>
        ))}
        {['#7B4BC2', '#2E9E5B', '#E8B23A', '#3B76D1'].map((c, i) => (
          <G key={c}>
            <Rect x={17 + i * 13.2} y={53.4} width={13.2} height={7} fill={c} />
            <Rect x={17 + i * 13.2} y={53.4} width={13.2} height={7} fill="none" stroke="#2A2622" strokeWidth={0.4} opacity={0.5} />
          </G>
        ))}
        {/* Thẻ bài úp và một tờ tiền nhô ra dưới — đấu giá kín là điểm riêng. */}
        <G transform="rotate(-7 44 32)">
          <Rect x={31} y={22} width={26} height={19} rx={1.6} fill="#D3DCCB" />
          <Rect x={30} y={21} width={26} height={19} rx={1.6} fill="url(#typhu-card)" stroke="#B8C4AE" strokeWidth={0.7} />
          <SvgText x={43} y={34} fontSize={11} fill="#2A7A4A" textAnchor="middle" fontWeight="bold">
            ₫
          </SvgText>
        </G>
        {/* Quân: một ngôi nhà nhỏ. */}
        <G>
          <Ellipse cx={72} cy={39} rx={6} ry={1.6} fill="#2A2622" opacity={0.22} />
          <Path d="M66 38 v-7 l6-4.5 l6 4.5 v7 z" fill="#2E9E5B" />
          <Path d="M66 31 l6-4.5 l6 4.5" fill="none" stroke="#1F6B3A" strokeWidth={1.1} />
          <Rect x={70} y={33.5} width={4} height={4.5} fill="#1F6B3A" opacity={0.6} />
        </G>
      </Frame>
    ),
  },
];

export const faceOf = (id: string): GameFace | undefined => FACES.find((f) => f.id === id);
