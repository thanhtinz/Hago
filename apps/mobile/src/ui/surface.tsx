import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { A, R } from './theme';

/**
 * Lớp bề mặt của app: gỗ, vát cạnh, vàng kim.
 *
 * React Native không có gradient trong `style`, nên mọi chuyển sắc ở đây đều
 * là một tấm SVG trải kín phía sau nội dung. Đổi lại thì nó chạy y hệt trên
 * iOS, Android và web, và không kéo thêm thư viện nào ngoài `react-native-svg`
 * vốn đã dùng để vẽ bàn cờ.
 *
 * Ba thứ tạo ra cảm giác "vật thật" chứ không phải "ô màu":
 *
 * 1. **Chuyển sắc** — mặt gỗ sáng ở trên, sẫm xuống dưới, như có đèn ở trên.
 * 2. **Vân** — vài đường cong mờ, sinh từ hạt giống cố định nên không nhảy.
 * 3. **Vát cạnh** — một nét sáng sát mép trên, một nét tối sát mép dưới. Chi
 *    tiết rẻ nhất và ăn tiền nhất: chỉ hai đường kẻ mà tấm phẳng thành khối
 *    dày.
 */

function rng(seed: number) {
  let x = seed | 0 || 7;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

const fill = { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0 };

/** Mặt gỗ trải kín một vùng. `tone` sáng dần: 0 nền app, 1 panel, 2 panel nổi. */
export function WoodFill({
  width,
  height,
  radius = 0,
  tone = 1,
  seed = 3,
  bevel = true,
}: {
  width: number;
  height: number;
  radius?: number;
  tone?: 0 | 1 | 2;
  seed?: number;
  bevel?: boolean;
}) {
  const top = tone === 0 ? '#2E1C0D' : tone === 1 ? A.panelHi : '#55361A';
  const bottom = tone === 0 ? A.bgDeep : tone === 1 ? A.panelLo : '#2A1A0B';
  const grain = useMemo(() => {
    const r = rng(seed);
    const n = Math.max(4, Math.round(height / 14));
    return Array.from({ length: n }, (_, i) => {
      const y = (i + 0.5) * (height / n) + (r() - 0.5) * 6;
      const a = y + (r() - 0.5) * 7;
      return (
        <Path
          key={i}
          d={`M-4 ${y} C ${width * 0.3} ${a}, ${width * 0.65} ${y}, ${width + 4} ${a}`}
          stroke="#160D05"
          strokeWidth={0.4 + r() * 0.8}
          fill="none"
          opacity={0.1 + r() * 0.14}
        />
      );
    });
  }, [width, height, seed]);

  const id = `w${seed}-${tone}`;
  return (
    <Svg width={width} height={height} style={fill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.18" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={radius} fill={`url(#${id})`} />
      {grain}
      {bevel ? (
        <>
          <Path
            d={`M${radius} 0.6 H${width - radius}`}
            stroke={A.bevel}
            strokeWidth={1.1}
            opacity={0.55}
            strokeLinecap="round"
          />
          <Path
            d={`M${radius} ${height - 0.6} H${width - radius}`}
            stroke={A.bevelDark}
            strokeWidth={1.4}
            opacity={0.7}
            strokeLinecap="round"
          />
        </>
      ) : null}
    </Svg>
  );
}

/**
 * Nền toàn màn: gỗ sẫm, quầng đèn ở trên, tối dần bốn góc. Đây là thứ thay
 * cái nền đen phẳng của bản trước, và một mình nó đổi hẳn cảm giác của app.
 */
export function AppBackdrop({ width, height }: { width: number; height: number }) {
  const motes = useMemo(() => {
    const r = rng(1234);
    return Array.from({ length: 70 }, (_, i) => (
      <Circle key={i} cx={r() * width} cy={r() * height} r={0.4 + r() * 1.1} fill="#E7C489" opacity={0.03 + r() * 0.05} />
    ));
  }, [width, height]);
  return (
    <View style={fill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="app-bg" x1="0" y1="0" x2="0.15" y2="1">
            <Stop offset="0" stopColor={A.bgWarm} />
            <Stop offset="0.55" stopColor={A.bg} />
            <Stop offset="1" stopColor={A.bgDeep} />
          </LinearGradient>
          <RadialGradient id="app-lamp" cx="0.5" cy="0.06" r="0.85">
            <Stop offset="0" stopColor="#FFD79A" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FFD79A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="app-vig" cx="0.5" cy="0.5" r="0.78">
            <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.45" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#app-bg)" />
        {motes}
        <Rect x={0} y={0} width={width} height={height} fill="url(#app-lamp)" />
        <Ellipse cx={width / 2} cy={height / 2} rx={width * 0.85} ry={height * 0.62} fill="url(#app-vig)" />
      </Svg>
    </View>
  );
}

/**
 * Tấm gỗ có viền chỉ vàng. Dùng cho mọi thẻ, mọi thanh, mọi tấm trượt lên.
 * Nhận `width`/`height` đo được từ `onLayout` nên không cần biết trước cỡ.
 */
export function Panel({
  children,
  radius = R.md,
  tone = 1,
  seed = 3,
  hairline = true,
  style,
}: {
  children?: React.ReactNode;
  radius?: number;
  tone?: 0 | 1 | 2;
  seed?: number;
  hairline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) setSize({ w: width, h: height });
      }}
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: hairline ? 1 : 0,
          borderColor: hairline ? A.line : 'transparent',
          backgroundColor: A.panel,
        },
        style,
      ]}
    >
      {size.w > 0 ? <WoodFill width={size.w} height={size.h} radius={radius} tone={tone} seed={seed} /> : null}
      {children}
    </View>
  );
}

/**
 * Vàng kim: sáng ở mép trên, đậm ở giữa, sẫm ở đáy, thêm một vệt loé chạy
 * ngang. Một mã màu vàng phẳng thì ra nhựa; đúng bốn chặng chuyển sắc này
 * mới ra kim loại đánh bóng.
 */
export function GoldFill({ width, height, radius = R.pill }: { width: number; height: number; radius?: number }) {
  // Bo góc phải chặn lại theo chiều cao. Để `rx` lớn hơn nửa chiều cao thì
  // trình duyệt kéo hình chữ nhật thành hình bầu dục — và vệt loé bên trong
  // biến thành một quả trứng trắng nằm giữa nút.
  const rx = Math.min(radius, height / 2);
  const sheenRx = Math.min(rx, height * 0.2);
  return (
    <Svg width={width} height={height} style={fill}>
      <Defs>
        <LinearGradient id="gold-m" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={A.goldLit} />
          <Stop offset="0.38" stopColor={A.gold} />
          <Stop offset="0.62" stopColor="#C89A45" />
          <Stop offset="1" stopColor={A.goldDeep} />
        </LinearGradient>
        <LinearGradient id="gold-sheen" x1="0" y1="0" x2="1" y2="0.3">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.4" />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={rx} fill="url(#gold-m)" />
      <Rect x={1} y={1} width={width - 2} height={height * 0.4} rx={sheenRx} fill="url(#gold-sheen)" opacity={0.3} />
      <Rect
        x={0.6}
        y={0.6}
        width={width - 1.2}
        height={height - 1.2}
        rx={rx}
        fill="none"
        stroke={A.goldLit}
        strokeWidth={0.9}
        opacity={0.55}
      />
    </Svg>
  );
}

/**
 * Đường chỉ trang trí ngăn hai khối: một nét vàng mảnh loe ra hai đầu, giữa
 * có một hạt kim cương nhỏ. Chi tiết này lấy thẳng từ khung viền bàn cờ gỗ.
 */
export function Rule({ width }: { width: number }) {
  const m = width / 2;
  return (
    <Svg width={width} height={10}>
      <Defs>
        <LinearGradient id="rule-g" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={A.gold} stopOpacity="0" />
          <Stop offset="0.5" stopColor={A.gold} stopOpacity="0.6" />
          <Stop offset="1" stopColor={A.gold} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={4.4} width={width} height={1} fill="url(#rule-g)" />
      <Path d={`M${m - 5} 5 L${m} 1.6 L${m + 5} 5 L${m} 8.4 Z`} fill={A.gold} opacity={0.85} />
    </Svg>
  );
}
