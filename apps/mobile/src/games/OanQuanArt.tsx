import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGrad,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

/**
 * Bộ hình cho bàn Ô Ăn Quan, dựng theo đúng bản thiết kế: gỗ sáng vân dọc,
 * hai ô Quan hình bầu dục khắc chữ QUAN, mười ô dân khoét tròn, vạch giữa có
 * hoa văn vàng, bốn góc gắn hoa và lá.
 *
 * Tất cả vẽ bằng `react-native-svg` nên co giãn theo màn hình không vỡ nét và
 * đổi được tông màu theo phe. Ai muốn thay bằng ảnh bitmap thì chỉ cần đổi
 * từng hàm ở đây, phần bàn cờ không phải sửa gì.
 */

/** Tông gỗ dùng chung cho mặt bàn, thành ô và viền. */
export const WOOD = {
  face: '#E8C89A',
  faceLo: '#D8B076',
  rim: '#C08E4F',
  rimDark: '#A9773F',
  pit: '#B98A55',
  pitLo: '#8E6335',
  ink: '#7A5326',
  gold: '#F0B429',
  goldLo: '#C98A12',
  leaf: '#7CBF4B',
  leafLo: '#4E8F2E',
};

/** Sáu màu hạt trong bảng thiết kế; ô nào cũng rải xen kẽ cho vui mắt. */
export const SEED_TONES = [
  { top: '#FFFFFF', bottom: '#DFD6C4', edge: '#B9AE9A' },
  { top: '#5C5C66', bottom: '#2B2B33', edge: '#17171C' },
  { top: '#9BD86A', bottom: '#5FA637', edge: '#3F7A22' },
  { top: '#F2705F', bottom: '#CE3B2E', edge: '#9C271D' },
  { top: '#FFD25E', bottom: '#E2A016', edge: '#AE760A' },
  { top: '#7EC0F5', bottom: '#3B8FD4', edge: '#2769A2' },
];

/** Hạt dân: bầu dục nghiêng, có vệt sáng ở góc trên trái. */
export function Seed({ size = 12, tone = 0 }: { size?: number; tone?: number }) {
  const idx = ((tone % SEED_TONES.length) + SEED_TONES.length) % SEED_TONES.length;
  const t = SEED_TONES[idx];
  const h = size * 0.78;
  // Mỗi màu một id riêng — dùng chung id thì cả bàn ăn theo hạt vẽ đầu tiên.
  const gid = `seed-${idx}`;
  return (
    <Svg width={size} height={h} viewBox="0 0 100 78">
      <Defs>
        <SvgGrad id={gid} x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={t.top} />
          <Stop offset="1" stopColor={t.bottom} />
        </SvgGrad>
      </Defs>
      <G rotation={-18} origin="50, 39">
        <Ellipse cx="50" cy="39" rx="44" ry="31" fill={`url(#${gid})`} stroke={t.edge} strokeWidth="5" />
        <Ellipse cx="36" cy="27" rx="14" ry="8" fill="#FFFFFF" opacity={0.5} rotation={-18} origin="36, 27" />
      </G>
    </Svg>
  );
}

/** Hoa văn vàng năm cánh — ở giữa vạch chia và bốn góc bàn. */
export function GoldFlower({ size = 22 }: { size?: number }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="gf" cx="0.4" cy="0.32" r="0.75">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="1" stopColor={WOOD.goldLo} />
        </RadialGradient>
      </Defs>
      {petals.map((deg) => (
        <Ellipse
          key={deg}
          cx="50"
          cy="26"
          rx="17"
          ry="23"
          fill="url(#gf)"
          stroke={WOOD.goldLo}
          strokeWidth="4"
          rotation={deg}
          origin="50, 50"
        />
      ))}
      <Circle cx="50" cy="50" r="13" fill="#FFF0B8" stroke={WOOD.goldLo} strokeWidth="4" />
    </Svg>
  );
}

/** Chùm lá ở góc bàn. */
export function LeafSpray({ size = 34, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G scaleX={flip ? -1 : 1} originX={50} originY={50}>
        {[
          { d: 'M50 54C30 54 14 42 10 24c20-6 36 2 42 20z', r: 0 },
          { d: 'M52 50C42 32 46 14 60 4c12 12 12 30 2 44z', r: 0 },
          { d: 'M56 56c14-12 32-12 42 0-10 14-28 16-42 6z', r: 0 },
        ].map((leaf, i) => (
          <Path key={i} d={leaf.d} fill={i === 1 ? WOOD.leaf : WOOD.leafLo} stroke="#3B6E22" strokeWidth="4" />
        ))}
      </G>
    </Svg>
  );
}

/** Một ô dân: lòng khoét tròn, thành trong sẫm, đáy hắt sáng. */
export function Pit({ size, tone = 'idle' }: { size: number; tone?: 'idle' | 'picked' | 'path' }) {
  const inner =
    tone === 'picked' ? ['#FFE3A8', '#E7B168'] : tone === 'path' ? ['#F3D9AE', '#CFA268'] : ['#DFBB89', '#B0824C'];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`pit-${tone}`} cx="0.5" cy="0.34" r="0.72">
          <Stop offset="0" stopColor={inner[0]} />
          <Stop offset="1" stopColor={inner[1]} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill={WOOD.faceLo} />
      <Circle cx="50" cy="50" r="43" fill={`url(#pit-${tone})`} stroke={WOOD.pitLo} strokeWidth="4" />
      {/* Vành sáng dưới đáy cho cảm giác lõm xuống */}
      <Path d="M14 58a36 30 0 0 0 72 0" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity={0.22} />
    </Svg>
  );
}

/** Lòng ô Quan: bầu dục khoét sâu, viền khắc chỉ, chữ QUAN dựng đứng ở giữa. */
export function QuanPit({ width, height, empty }: { width: number; height: number; empty?: boolean }) {
  const letters = ['Q', 'U', 'A', 'N'];
  return (
    <Svg width={width} height={height} viewBox="0 0 100 260" preserveAspectRatio="none">
      <Defs>
        <SvgGrad id="quanpit" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={empty ? '#C9A87E' : '#DFBB89'} />
          <Stop offset="1" stopColor={empty ? '#9C7748' : '#B0824C'} />
        </SvgGrad>
      </Defs>
      <Rect x="3" y="3" width="94" height="254" rx="47" fill={WOOD.faceLo} />
      <Rect x="8" y="8" width="84" height="244" rx="42" fill="url(#quanpit)" stroke={WOOD.pitLo} strokeWidth="4" />
      <Rect x="17" y="17" width="66" height="226" rx="33" fill="none" stroke={WOOD.ink} strokeWidth="2" opacity={0.3} />
      {/* Chữ khắc chìm — nhạt để không chọi với quân đứng trên */}
      {letters.map((ch, i) => (
        <SvgText
          key={ch}
          x="50"
          y={52 + i * 52}
          fill={WOOD.ink}
          opacity={0.2}
          fontSize="30"
          fontWeight="bold"
          textAnchor="middle"
        >
          {ch}
        </SvgText>
      ))}
    </Svg>
  );
}

/**
 * Quan còn trên bàn: chibi đội mũ quan ngồi trong ô, phe nào tông nấy.
 * Vẽ theo bản thiết kế — mũ có ngọc tròn, hai bên tóc, má hồng.
 */
export function MandarinChibi({ size = 54, tone = 'blue' }: { size?: number; tone?: 'blue' | 'red' }) {
  const skin = '#FFE2C6';
  const c =
    tone === 'blue'
      ? { main: '#3B7DD8', dark: '#20477F', trim: '#9CC8FF' }
      : { main: '#D6402F', dark: '#8E2115', trim: '#FFAC9B' };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGrad id={`bowl-${tone}`} x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor={c.main} />
          <Stop offset="1" stopColor={c.dark} />
        </SvgGrad>
      </Defs>
      {/* Ô tròn ôm lấy nhân vật, miệng ô là vành sáng */}
      <Path d="M8 70h84v10a16 16 0 0 1-16 16H24A16 16 0 0 1 8 80z" fill={`url(#bowl-${tone})`} stroke={c.dark} strokeWidth="4" />
      <Ellipse cx="50" cy="70" rx="42" ry="11" fill={c.trim} stroke={c.dark} strokeWidth="4" />
      {/* Vai áo nhô lên khỏi miệng ô */}
      <Path d="M26 70c2-10 11-16 24-16s22 6 24 16z" fill={c.main} stroke={c.dark} strokeWidth="3" />
      {/* Tóc sau đầu */}
      <Ellipse cx="50" cy="44" rx="30" ry="28" fill="#42301F" />
      {/* Mặt */}
      <Ellipse cx="50" cy="47" rx="24" ry="23" fill={skin} stroke="#CE9F76" strokeWidth="3" />
      {/* Mái tóc trước trán */}
      <Path d="M26 40c4-12 13-18 24-18s20 6 24 18c-8-6-16-8-24-8s-16 2-24 8z" fill="#42301F" />
      {/* Mũ quan: chóp tròn, vành ngang, ngọc giữa */}
      <Path d="M24 28c3-13 13-20 26-20s23 7 26 20z" fill={c.main} stroke={c.dark} strokeWidth="4" />
      <Rect x="16" y="26" width="68" height="12" rx="6" fill={c.dark} />
      <Rect x="16" y="26" width="68" height="4" rx="2" fill={c.trim} opacity={0.7} />
      <Circle cx="50" cy="14" r="6.5" fill={WOOD.gold} stroke={WOOD.goldLo} strokeWidth="3" />
      {/* Mắt to, má hồng, miệng cười */}
      <Ellipse cx="41" cy="50" rx="4.6" ry="5.4" fill="#2E2216" />
      <Ellipse cx="59" cy="50" rx="4.6" ry="5.4" fill="#2E2216" />
      <Circle cx="42.6" cy="48" r="1.7" fill="#FFFFFF" />
      <Circle cx="60.6" cy="48" r="1.7" fill="#FFFFFF" />
      <Circle cx="31" cy="55" r="4.6" fill="#FF9F95" opacity={0.75} />
      <Circle cx="69" cy="55" r="4.6" fill="#FF9F95" opacity={0.75} />
      <Path d="M45 58q5 5 10 0" fill="none" stroke="#8A5A3B" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

/** Quan đã bị ăn: chỉ còn cái nắp úp lại. */
export function QuanLid({ size = 46, tone = 'blue' }: { size?: number; tone?: 'blue' | 'red' }) {
  const c = tone === 'blue' ? { main: '#4A8FE0', dark: '#2A5FA8', trim: '#A9D2FF' } : { main: '#DE5240', dark: '#9E2E20', trim: '#FFB1A2' };
  return (
    <Svg width={size} height={size * 0.82} viewBox="0 0 100 82">
      <Defs>
        <SvgGrad id="lid" x1="0.3" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={c.trim} />
          <Stop offset="0.45" stopColor={c.main} />
          <Stop offset="1" stopColor={c.dark} />
        </SvgGrad>
      </Defs>
      <Path d="M8 66c0-26 19-44 42-44s42 18 42 44z" fill="url(#lid)" stroke={c.dark} strokeWidth="4" />
      <Rect x="4" y="62" width="92" height="16" rx="8" fill={c.main} stroke={c.dark} strokeWidth="4" />
      <Circle cx="50" cy="18" r="8" fill={c.main} stroke={c.dark} strokeWidth="4" />
      <Path d="M26 56q24-18 48 0" fill="none" stroke={WOOD.gold} strokeWidth="4" strokeLinecap="round" opacity={0.85} />
    </Svg>
  );
}

/** Vân gỗ chạy dọc mặt bàn — vẽ mờ nên không chọi với quân. */
export function WoodGrain({ width, height }: { width: number; height: number }) {
  const lines = Math.max(6, Math.round(width / 46));
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: lines }, (_, i) => {
        const x = ((i + 0.5) / lines) * width;
        return (
          <Path
            key={i}
            d={`M${x} 0 q${i % 2 ? 8 : -8} ${height / 2} 0 ${height}`}
            stroke={WOOD.rim}
            strokeWidth={i % 3 === 0 ? 2 : 1}
            opacity={0.16}
            fill="none"
          />
        );
      })}
    </Svg>
  );
}
