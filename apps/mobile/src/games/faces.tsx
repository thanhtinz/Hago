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
  /**
   * Nhãn trên thẻ, đúng loại nhãn mà các sảnh game nhiều người vẫn dùng: chế
   * độ và thời lượng một ván. Hai thứ đó quyết định người ta có bấm vào hay
   * không — "còn mười lăm phút nữa phải đi, chơi được ván nào?".
   *
   * Không có nhãn "đang có bao nhiêu người chơi" vì chưa có máy chủ nào đếm.
   * Nhãn số người online là nhãn mạnh nhất trong mọi sảnh game, nhưng bịa ra
   * một con số thì nó thành nhãn dối, và người chơi phát hiện ngay lần đầu
   * bấm vào phòng trống.
   */
  mode: string;
  /** Thời lượng một ván thường gặp, không phải kỷ lục. */
  minutes: string;
  /**
   * Thể loại, để danh mục chia nhóm.
   *
   * Bốn nhóm lệch cỡ nhau và đó là thật: nền tảng có nhiều cờ ăn quân hơn
   * cờ nối hàng. Chia cho đều là chia sai.
   */
  group: 'dan-gian' | 'co-quan' | 'noi-hang' | 'chiem-o';
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
export const Frame = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
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
export function seeded(seed: number): () => number {
  let x = seed | 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

/** Hạt lấm tấm rải đều — cát, sỏi, sợi giấy. */
export function speckle(seed: number, n: number, color: string, rMax = 0.7, opacity = 0.35) {
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
export function woodGrain(seed: number, n: number, color: string, opacity = 0.2) {
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
    group: 'noi-hang',
    nameVi: 'Cờ Caro',
    taglineVi: 'Năm quân liền nhau, chặn hai đầu không tính',
    accent: '#25428F',
    surface: '#FBF8EF',
    material: 'Giấy ô ly',
    mode: '1v1',
    minutes: '~5 phút',
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
    group: 'dan-gian',
    nameVi: 'Cờ Gánh',
    taglineVi: 'Cờ dân gian Quảng Nam — kẹp hai đầu là gánh được quân',
    accent: '#C06030',
    surface: '#E8D3BC',
    material: 'Sân gạch',
    mode: '1v1',
    minutes: '~10 phút',
    ready: true,
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
        {/* Thế xuất phát thật: mỗi bên 8 quân, 5 quân hàng cuối của mình,
            2 quân hai đầu hàng thứ hai, 1 quân đầu hàng thứ ba. Chín điểm
            trong lòng bàn để trống — đó là chỗ để gánh nhau. */}
        {(() => {
          const px = (i: number) => 18 + i * 16;
          const py = (j: number) => 8 + j * 12;
          const dark: [number, number][] = [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
            [0, 1],
            [4, 1],
            [0, 2],
          ];
          const light: [number, number][] = dark.map(([i, j]) => [4 - i, 4 - j]);
          return (
            <G>
              {dark.map(([i, j]) => (
                <Disc key={`d${i}${j}`} x={px(i)} y={py(j)} r={5} grad="ganh-d" rim="#5A2212" />
              ))}
              {light.map(([i, j]) => (
                <Disc key={`l${i}${j}`} x={px(i)} y={py(j)} r={5} grad="ganh-l" rim="#A98A6C" />
              ))}
            </G>
          );
        })()}
      </Frame>
    ),
  },
  {
    id: 'o-an-quan',
    group: 'dan-gian',
    nameVi: 'Ô Ăn Quan',
    taglineVi: 'Rải sỏi từng ô, ăn quan, hết quan thì tàn dân',
    accent: '#6E8F4A',
    surface: '#D9CBB0',
    material: 'Sỏi đất',
    mode: '1v1',
    minutes: '~15 phút',
    ready: true,
    Motif: () => {
      const rnd = seeded(99);
      let pk = 0;
      const pebble = (x: number, y: number, r: number, big = false) => (
        <G key={`p${pk++}`}>
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
          {/* Thế mở ván thật: mỗi ô dân đúng 5 viên, mỗi ô quan một viên
              lớn. Đây là hình ai từng chơi cũng nhận ra ngay — bày vài viên
              rải rác thì chỉ là mấy hòn sỏi trên nền đất. */}
          {[0, 1, 2, 3, 4].flatMap((col) =>
            [0, 1].flatMap((row) => {
              const cx = 28 + col * 12;
              const cy = row === 0 ? 22 : 41;
              // Năm viên xếp như mặt xúc xắc, lệch đi một chút cho khỏi đều
              // như in.
              const spots: [number, number][] = [
                [-2.5, -3],
                [2.5, -3],
                [0, 0],
                [-2.5, 3],
                [2.5, 3],
              ];
              return spots.map(([dx, dy]) =>
                pebble(cx + dx + (rnd() - 0.5) * 1.1, cy + dy + (rnd() - 0.5) * 1.1, 1.45 + rnd() * 0.35),
              );
            }),
          )}
          {pebble(15.5, 31, 5, true)}
          {pebble(88.5, 33, 5, true)}
        </Frame>
      );
    },
  },
  {
    id: 'co-tuong',
    group: 'co-quan',
    nameVi: 'Cờ Tướng',
    taglineVi: 'Pháo qua sông, tướng không bao giờ lộ mặt',
    accent: '#A33B2A',
    surface: '#D8B98A',
    material: 'Gỗ tre',
    mode: '1v1',
    minutes: '~25 phút',
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
    group: 'co-quan',
    nameVi: 'Cờ Vua',
    taglineVi: 'Cờ quốc tế, quân đá cẩm thạch',
    accent: '#7C8AA0',
    surface: '#EDE7DC',
    material: 'Đá',
    mode: '1v1',
    minutes: '~25 phút',
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
          {/* Ô to đúng tỉ lệ bàn tám cột. Ô 8px như bản trước cho ra hai
              mươi mấy ô li ti — nhìn ra hoạ tiết ca-rô, không ra bàn cờ vua,
              và quân cờ thì đứng vắt qua hai ô. */}
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => (
              <Rect
                key={`${r}-${c}`}
                x={c * 12.5}
                y={r * 12.8}
                width={12.5}
                height={12.8}
                fill={(r + c) % 2 === 0 ? 'url(#vua-d)' : 'url(#vua-l)'}
              />
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
        <G transform="translate(7.75, 0)">
          <Ellipse cx={36} cy={50} rx={11} ry={3.2} fill="#2A2622" opacity={0.3} />
          <Path d="M28 49 q1.5-4 5-5.5 l-1.5-9 q-3.5-2 0-4 l3-0.5 v-2.5 h-2 v-2.5 h2 v-2.5 h3 v2.5 h2 v2.5 h-2 v2.5 l3 0.5 q3.5 2 0 4 l-1.5 9 q3.5 1.5 5 5.5 z" fill="url(#vua-pb)" />
          <Path d="M31 33 q5-1.5 10 0" stroke="#FFFFFF" strokeWidth={0.7} fill="none" opacity={0.35} />
        </G>
        <G transform="translate(4.75, 0)">
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
    group: 'co-quan',
    nameVi: 'Cờ Úp',
    taglineVi: 'Quân úp sấp, đi rồi lật lên mới biết là gì',
    accent: '#8A6A3B',
    surface: '#B08E5E',
    material: 'Gỗ sẫm',
    mode: '1v1',
    minutes: '~20 phút',
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
    id: 'co-vay',
    group: 'chiem-o',
    nameVi: 'Cờ Vây',
    taglineVi: 'Vây đất, bắt khí — ván cờ dài nhất trong chín bộ',
    accent: '#4C4740',
    surface: '#E3BE7C',
    material: 'Gỗ kaya',
    mode: '1v1',
    minutes: '~45 phút',
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
        {/* Chín điểm sao, đúng thế bàn 19×19: bốn góc, bốn cạnh và thiên
            nguyên ở giữa. Thiếu chúng thì mặt gỗ chỉ là một tấm lưới. */}
        {[24, 48, 72].flatMap((x) => [16, 32, 48].map((y) => [x, y] as const)).map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={1.15} fill="#4A3418" />
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
    id: 'co-dam',
    group: 'co-quan',
    nameVi: 'Cờ Đam',
    taglineVi: 'Ăn là bắt buộc, và phải ăn chuỗi dài nhất',
    accent: '#8C2F2F',
    surface: '#D9C0A0',
    material: 'Gỗ mun và gỗ thích',
    mode: '1v1',
    minutes: '~15 phút',
    ready: false,
    Motif: () => (
      <Frame bg="#D9C0A0">
        <Defs>
          <LinearGradient id="dam-w" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#E7D2B4" />
            <Stop offset="1" stopColor="#C9AC88" />
          </LinearGradient>
          <RadialGradient id="dam-dark" cx="0.34" cy="0.28" r="0.85">
            <Stop offset="0" stopColor="#4A4038" />
            <Stop offset="1" stopColor="#1E1815" />
          </RadialGradient>
          <RadialGradient id="dam-light" cx="0.34" cy="0.28" r="0.85">
            <Stop offset="0" stopColor="#FBF0DB" />
            <Stop offset="1" stopColor="#D2B98F" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#dam-w)" />
        {woodGrain(19, 13, '#A8865E', 0.28)}
        {/* Chỉ ô sẫm mới dùng được — vẽ đúng 32 ô, không vẽ cả 64. */}
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 8 }, (_, c) =>
            (r + c) % 2 === 1 ? (
              <Rect key={`${r}-${c}`} x={18 + c * 8} y={r * 8} width={8} height={8} fill="#5A3A1E" opacity={0.72} />
            ) : null,
          ),
        )}
        <Rect x={18} y={0} width={64} height={64} fill="none" stroke="#5A3B22" strokeWidth={1} opacity={0.55} />
        {/* Quân sẫm ở dưới, quân nhạt ở trên, và một quân đã phong vương. */}
        {/* Tâm ô sẫm `(r,c)` là `(22 + c*8, 4 + r*8)` — quân phải nằm đúng tâm ô,
            lệch nửa ô là nhìn ra ngay dù thẻ chỉ cao 64 đơn vị. */}
        {[
          [30, 52, true],
          [46, 52, true],
          [54, 44, true],
          [30, 20, false],
          [54, 12, false],
        ].map(([x, y, dark]) => (
          <G key={`${x}-${y}`}>
            <Ellipse cx={(x as number) + 0.4} cy={(y as number) + 2.6} rx={4.4} ry={1.5} fill="#2A1C0E" opacity={0.3} />
            <Circle cx={x as number} cy={y as number} r={4.4} fill={dark ? 'url(#dam-dark)' : 'url(#dam-light)'} />
            <Circle cx={x as number} cy={y as number} r={3} fill="none" stroke={dark ? '#6A5C4E' : '#A98C60'} strokeWidth={0.6} opacity={0.7} />
          </G>
        ))}
        {/* Vương = hai quân chồng lên nhau, đúng cách người ta đánh dấu trên bàn thật. */}
        <G>
          <Ellipse cx={70.4} cy={32.6} rx={4.6} ry={1.6} fill="#2A1C0E" opacity={0.3} />
          <Circle cx={70} cy={31} r={4.4} fill="url(#dam-dark)" />
          <Circle cx={70} cy={28} r={4.4} fill="url(#dam-dark)" />
          <Circle cx={70} cy={28} r={3} fill="none" stroke="#C9A24A" strokeWidth={0.8} opacity={0.9} />
        </G>
      </Frame>
    ),
  },
  {
    id: 'co-lat',
    group: 'chiem-o',
    nameVi: 'Cờ Lật',
    taglineVi: 'Kẹp hai đầu là lật màu — đếm quân lúc hết bàn',
    accent: '#2E9E6B',
    surface: '#1E6B47',
    material: 'Nỉ xanh',
    mode: '1v1',
    minutes: '~8 phút',
    ready: false,
    Motif: () => (
      <Frame bg="#1E6B47">
        <Defs>
          <RadialGradient id="lat-felt" cx="0.42" cy="0.3" r="0.95">
            <Stop offset="0" stopColor="#2A835A" />
            <Stop offset="1" stopColor="#144A31" />
          </RadialGradient>
          <RadialGradient id="lat-b" cx="0.36" cy="0.28" r="0.9">
            <Stop offset="0" stopColor="#4C4C52" />
            <Stop offset="1" stopColor="#141417" />
          </RadialGradient>
          <RadialGradient id="lat-w" cx="0.36" cy="0.28" r="0.9">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#CFCBC0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#lat-felt)" />
        {/* Sợi nỉ: hạt li ti sáng hơn nền, không phải chấm đen. */}
        {speckle(31, 130, '#5FBF8C', 0.32, 0.16)}
        {Array.from({ length: 9 }, (_, i) => (
          <Line key={`v${i}`} x1={18 + i * 8} y1={0} x2={18 + i * 8} y2={64} stroke="#0E3A26" strokeWidth={0.6} opacity={0.7} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <Line key={`h${i}`} x1={18} y1={i * 8} x2={82} y2={i * 8} stroke="#0E3A26" strokeWidth={0.6} opacity={0.7} />
        ))}
        {/* Bốn chấm mốc của bàn Othello thật. */}
        {[[34, 16], [66, 16], [34, 48], [66, 48]].map(([x, y]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill="#0E3A26" opacity={0.85} />
        ))}
        {[
          [30, 20, 0], [38, 20, 1], [46, 20, 1],
          [38, 28, 1], [46, 28, 0], [54, 28, 0],
          [38, 36, 0], [46, 36, 1], [54, 36, 1], [62, 36, 1],
          [46, 44, 1], [54, 44, 0],
        ].map(([x, y, d]) => (
          <G key={`${x}-${y}`}>
            <Ellipse cx={(x as number) + 0.3} cy={(y as number) + 2.4} rx={3.3} ry={1.1} fill="#08251A" opacity={0.4} />
            <Circle cx={x as number} cy={y as number} r={3.3} fill={d ? 'url(#lat-b)' : 'url(#lat-w)'} />
            <Ellipse cx={(x as number) - 1} cy={(y as number) - 1.1} rx={1.2} ry={0.8} fill="#FFFFFF" opacity={d ? 0.3 : 0.7} transform={`rotate(-28 ${x} ${y})`} />
          </G>
        ))}
        {/* Một quân đang lật dở: bề ngang co lại, cạnh dày lộ ra. */}
        <G>
          <Ellipse cx={70.3} cy={31} rx={2.4} ry={1} fill="#08251A" opacity={0.45} />
          <Ellipse cx={70} cy={28} rx={2.2} ry={3.3} fill="url(#lat-w)" />
          <Path d="M70 24.7 a2.2 3.3 0 0 0 0 6.6 z" fill="#1E1E22" />
          <Ellipse cx={70} cy={28} rx={2.2} ry={3.3} fill="none" stroke="#0E3A26" strokeWidth={0.4} opacity={0.6} />
        </G>
      </Frame>
    ),
  },
  {
    id: 'co-hum',
    group: 'dan-gian',
    nameVi: 'Cờ Hùm',
    taglineVi: 'Hai hùm săn mười hai dê — hai bên hai luật khác nhau',
    accent: '#D08A2C',
    surface: '#9C7A54',
    material: 'Đất nện',
    mode: '1v1 · bất đối xứng',
    minutes: '~6 phút',
    ready: false,
    Motif: () => {
      // Đúng hình cờ gánh: 5 ngang, 5 dọc, 2 chéo lớn, 4 đường nối trung điểm.
      const px = (c: number) => 26 + c * 12;
      const py = (r: number) => 8 + r * 12;
      return (
        <Frame bg="#9C7A54">
          <Defs>
            <RadialGradient id="hum-earth" cx="0.45" cy="0.3" r="1">
              <Stop offset="0" stopColor="#8E6F4B" />
              <Stop offset="1" stopColor="#523C26" />
            </RadialGradient>
            <RadialGradient id="hum-tiger" cx="0.34" cy="0.28" r="0.9">
              <Stop offset="0" stopColor="#F0A63C" />
              <Stop offset="1" stopColor="#9A5310" />
            </RadialGradient>
            <RadialGradient id="hum-goat" cx="0.34" cy="0.28" r="0.9">
              <Stop offset="0" stopColor="#F6EFE2" />
              <Stop offset="1" stopColor="#C4B49A" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={64} fill="url(#hum-earth)" />
          {speckle(23, 150, '#3A2A18', 0.5, 0.32)}
          {speckle(91, 70, '#BFA179', 0.4, 0.25)}
          {/* Nét vạch trên đất: rãnh tối có mép sáng, không phải nét bút. */}
          {Array.from({ length: 5 }, (_, i) => (
            <G key={`g${i}`}>
              {carved(`M${px(0)} ${py(i)} H${px(4)}`, '#33240F', '#CBAE85', 0.9)}
              {carved(`M${px(i)} ${py(0)} V${py(4)}`, '#33240F', '#CBAE85', 0.9)}
            </G>
          ))}
          {carved(`M${px(0)} ${py(0)} L${px(4)} ${py(4)}`, '#33240F', '#CBAE85', 0.9)}
          {carved(`M${px(4)} ${py(0)} L${px(0)} ${py(4)}`, '#33240F', '#CBAE85', 0.9)}
          {carved(`M${px(2)} ${py(0)} L${px(4)} ${py(2)} L${px(2)} ${py(4)} L${px(0)} ${py(2)} Z`, '#33240F', '#CBAE85', 0.9)}
          {/* Dê: đĩa nhỏ nhạt, đứng thành khối. */}
          {[[1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [1, 2], [3, 2], [2, 3]].map(([c, r]) => (
            <G key={`d${c}-${r}`}>
              <Ellipse cx={px(c) + 0.3} cy={py(r) + 2} rx={3} ry={1} fill="#3E2C18" opacity={0.35} />
              <Circle cx={px(c)} cy={py(r)} r={3} fill="url(#hum-goat)" stroke="#9A876A" strokeWidth={0.5} />
            </G>
          ))}
          {/* Hùm: to hơn hẳn, có vằn. Nhìn xa phải thấy ngay ai là kẻ đi săn. */}
          {[[0, 0], [4, 4]].map(([c, r]) => (
            <G key={`h${c}-${r}`}>
              <Ellipse cx={px(c) + 0.4} cy={py(r) + 3.2} rx={4.8} ry={1.6} fill="#3E2C18" opacity={0.4} />
              <Circle cx={px(c)} cy={py(r)} r={4.8} fill="url(#hum-tiger)" stroke="#5A2C04" strokeWidth={1.1} />
              {/* Vằn hổ: nét cong dày mảnh xen kẽ, không phải gờ đồng xu đều tăm tắp. */}
              {[[-2.6, 1.5], [-0.4, 1.1], [1.9, 1.4]].map(([o, wdt]) => (
                <Path
                  key={o}
                  d={`M${px(c) + o - 0.9} ${py(r) - 3.9} q1.5 3.9 0.2 7.8`}
                  stroke="#43200A"
                  strokeWidth={wdt}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.85}
                />
              ))}
            </G>
          ))}
        </Frame>
      );
    },
  },
  {
    id: 'co-ba-quan',
    group: 'dan-gian',
    nameVi: 'Cờ Ba Quân',
    taglineVi: 'Ba quân thành hàng là thắng — một ván chưa tới một phút',
    accent: '#7FA3C8',
    surface: '#6F6B63',
    material: 'Phấn trên nền xi măng',
    mode: '1v1 · ván chớp',
    minutes: '~1 phút',
    ready: false,
    Motif: () => (
      <Frame bg="#6F6B63">
        <Defs>
          <RadialGradient id="bq-ce" cx="0.44" cy="0.3" r="1">
            <Stop offset="0" stopColor="#837E74" />
            <Stop offset="1" stopColor="#55524C" />
          </RadialGradient>
          <RadialGradient id="bq-peb" cx="0.34" cy="0.28" r="0.9">
            <Stop offset="0" stopColor="#6B7686" />
            <Stop offset="1" stopColor="#2E3540" />
          </RadialGradient>
          <RadialGradient id="bq-shell" cx="0.34" cy="0.28" r="0.9">
            <Stop offset="0" stopColor="#FFFBF0" />
            <Stop offset="1" stopColor="#D3C8B2" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={64} fill="url(#bq-ce)" />
        {speckle(47, 170, '#3F3C37', 0.55, 0.3)}
        {speckle(83, 90, '#A9A498', 0.4, 0.22)}
        {/* Phấn: nét trắng hơi nhoè, bề dày không đều, đứt quãng chỗ nền rỗ. */}
        {[[34, 10, 34, 54], [50, 10, 50, 54], [66, 10, 66, 54], [30, 20, 70, 20], [30, 32, 70, 32], [30, 44, 70, 44]].map(
          ([x1, y1, x2, y2], i) => (
            <G key={i}>
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F2EEE2" strokeWidth={2.4} strokeLinecap="round" opacity={0.2} />
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F7F4EA" strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
            </G>
          ),
        )}
        {/* Sỏi thắng một hàng chéo, vỏ sò chặn không kịp. */}
        {[[34, 20], [50, 32], [66, 44]].map(([x, y]) => (
          <G key={`p${x}`}>
            <Ellipse cx={x + 0.4} cy={y + 3} rx={4.2} ry={1.4} fill="#26241F" opacity={0.42} />
            <Circle cx={x} cy={y} r={4.2} fill="url(#bq-peb)" />
            <Ellipse cx={x - 1.3} cy={y - 1.5} rx={1.5} ry={1} fill="#FFFFFF" opacity={0.3} transform={`rotate(-30 ${x} ${y})`} />
          </G>
        ))}
        {[[66, 20], [34, 32], [50, 44]].map(([x, y]) => (
          <G key={`s${x}-${y}`}>
            <Ellipse cx={x + 0.4} cy={y + 3} rx={4} ry={1.3} fill="#26241F" opacity={0.4} />
            <Circle cx={x} cy={y} r={4} fill="url(#bq-shell)" />
            {[0, 1, 2].map((k) => (
              <Path
                key={k}
                d={`M${x - 3.2} ${y + 1.4 - k * 1.5} q3.2 -1.6 6.4 0`}
                stroke="#BBAE94"
                strokeWidth={0.45}
                fill="none"
                opacity={0.75}
              />
            ))}
          </G>
        ))}
        {/* Nét phấn gạch chéo qua hàng thắng — cách người ta chốt ván trên sân. */}
        <Line x1={28} y1={14} x2={72} y2={50} stroke="#F7F4EA" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      </Frame>
    ),
  },
  {
    id: 'co-hex',
    group: 'noi-hang',
    nameVi: 'Cờ Hex',
    taglineVi: 'Nối hai bờ của mình — không bao giờ có ván hoà',
    accent: '#C0392B',
    surface: '#E6DAC4',
    material: 'Gạch men lục giác',
    mode: '1v1',
    minutes: '~10 phút',
    ready: false,
    Motif: () => {
      // Hình thoi 7×5 ô lục giác: hàng dưới lệch sang phải nửa ô, đúng cách
      // bàn Hex thật nghiêng đi — vẽ thành hình chữ nhật là vẽ sai game.
      const w = 9.6;
      const h = 8.4;
      const hexAt = (r: number, c: number) => {
        const cx = 16 + c * w + r * (w / 2);
        const cy = 12 + r * h;
        const pts = Array.from({ length: 6 }, (_, k) => {
          const a = ((60 * k - 30) * Math.PI) / 180;
          return `${(cx + (w / 2) * Math.cos(a) * 1.08).toFixed(2)},${(cy + (w / 2) * Math.sin(a) * 1.08).toFixed(2)}`;
        });
        return { cx, cy, d: `M${pts.join('L')}Z` };
      };
      const red = [[0, 1], [1, 1], [2, 2], [3, 2], [4, 2]];
      const blue = [[1, 3], [2, 0], [2, 4], [3, 4], [1, 5]];
      return (
        <Frame bg="#E6DAC4">
          <Defs>
            <LinearGradient id="hex-bg" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#F0E6D4" />
              <Stop offset="1" stopColor="#D6C6A9" />
            </LinearGradient>
            <LinearGradient id="hex-r" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor="#D9564A" />
              <Stop offset="1" stopColor="#9E2A1E" />
            </LinearGradient>
            <LinearGradient id="hex-b" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor="#5A8FD0" />
              <Stop offset="1" stopColor="#25508F" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={64} fill="url(#hex-bg)" />
          {speckle(59, 60, '#B8A588', 0.4, 0.25)}
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 6 }, (_, c) => {
              const { d } = hexAt(r, c);
              const isR = red.some(([rr, cc]) => rr === r && cc === c);
              const isB = blue.some(([rr, cc]) => rr === r && cc === c);
              return (
                <Path
                  key={`${r}-${c}`}
                  d={d}
                  fill={isR ? 'url(#hex-r)' : isB ? 'url(#hex-b)' : '#EFE7D7'}
                  stroke={isR ? '#7C1F14' : isB ? '#193A6B' : '#BCA986'}
                  strokeWidth={0.7}
                />
              );
            }),
          )}
        </Frame>
      );
    },
  },
  {
    id: 'co-nhat',
    group: 'co-quan',
    nameVi: 'Cờ Nhật',
    taglineVi: 'Quân ăn được thả lại xuống bàn làm quân mình',
    accent: '#A8702A',
    surface: '#E9CE96',
    material: 'Gỗ hoàng dương',
    mode: '1v1',
    minutes: '~25 phút',
    ready: false,
    Motif: () => {
      // Quân shogi là miếng gỗ ngũ giác, đầu nhọn chỉ về phía đối phương —
      // hướng quay chính là thứ phân biệt hai bên, không phải màu.
      const koma = (x: number, y: number, flip: boolean, ch: string, col: string) => (
        <G key={`${x}-${y}-${ch}`} transform={flip ? `rotate(180 ${x} ${y})` : undefined}>
          <Path d={`M${x} ${y - 6} l4.6 2.4 l1.5 9.6 h-12.2 l1.5 -9.6 z`} fill="#3A2A14" opacity={0.28} transform="translate(0.5 1.4)" />
          <Path d={`M${x} ${y - 6} l4.6 2.4 l1.5 9.6 h-12.2 l1.5 -9.6 z`} fill="url(#nhat-koma)" stroke="#8A6524" strokeWidth={0.6} />
          <SvgText x={x} y={y + 4} fontSize={7} fill={col} textAnchor="middle" fontWeight="bold">
            {ch}
          </SvgText>
        </G>
      );
      return (
        <Frame bg="#E9CE96">
          <Defs>
            <LinearGradient id="nhat-board" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor="#F2DCAB" />
              <Stop offset="1" stopColor="#DDBE81" />
            </LinearGradient>
            <LinearGradient id="nhat-koma" x1="0" y1="0" x2="0.2" y2="1">
              <Stop offset="0" stopColor="#FCEFCC" />
              <Stop offset="1" stopColor="#E0C286" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={64} fill="url(#nhat-board)" />
          {woodGrain(37, 16, '#C09A57', 0.26)}
          {Array.from({ length: 10 }, (_, i) => (
            <Line key={`v${i}`} x1={14 + i * 8} y1={2} x2={14 + i * 8} y2={62} stroke="#6B4A18" strokeWidth={0.5} opacity={0.72} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <Line key={`h${i}`} x1={14} y1={2 + i * 6.67} x2={86} y2={2 + i * 6.67} stroke="#6B4A18" strokeWidth={0.5} opacity={0.72} />
          ))}
          {/* Bốn chấm 星 đánh dấu vùng phong ba hàng. */}
          {[[38, 22], [62, 22], [38, 42], [62, 42]].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="#6B4A18" opacity={0.85} />
          ))}
          {koma(26, 50, false, '歩', '#3A2A14')}
          {koma(42, 50, false, '銀', '#3A2A14')}
          {koma(58, 42, false, '飛', '#3A2A14')}
          {koma(74, 50, false, 'と', '#A8302A')}
          {koma(34, 14, true, '歩', '#3A2A14')}
          {koma(66, 14, true, '角', '#3A2A14')}
          {koma(50, 22, true, '桂', '#3A2A14')}
        </Frame>
      );
    },
  },
];

export const faceOf = (id: string): GameFace | undefined => FACES.find((f) => f.id === id);

/** Tên từng nhóm thể loại, theo thứ tự hiện trong danh mục. */
export const GROUPS: { id: GameFace['group']; ten: string }[] = [
  { id: 'dan-gian', ten: 'Cờ dân gian Việt' },
  { id: 'co-quan', ten: 'Cờ quân' },
  { id: 'noi-hang', ten: 'Cờ nối hàng' },
  { id: 'chiem-o', ten: 'Cờ chiếm ô' },
];
