import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, RadialGradient, Stop } from 'react-native-svg';
import { ganhTheme as T } from './theme';

/**
 * Sân gạch — nền của cờ gánh, và cũng là **mặt bàn cờ luôn**.
 *
 * Cờ gánh vạch bằng gạch non lên nền sân, y như ô ăn quan vạch lên cát. Nên
 * ở đây không có tấm lát nào riêng cho bàn cờ: viên gạch chạy liền từ mép
 * màn hình qua dưới bàn cờ rồi ra mép bên kia.
 *
 * Không có quầng nắng ở giữa. Một vầng sáng mờ vẫn là một vầng sáng có mép,
 * và mắt bắt cái mép đó thành khung bao quanh bàn cờ. Chiều sâu để bốn góc
 * tối dần lo, vì nó không có mép nào.
 */
export function CourtBackdrop({ width, height }: { width: number; height: number }) {
  const rnd = (seed: number) => {
    let x = seed | 0 || 3;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
  };

  /** Gạch lát so le, mạch vữa sáng hơn viên gạch. */
  const bricks = useMemo(() => {
    const r = rnd(5150);
    const bh = Math.max(30, height / 14);
    const bw = bh * 2.3;
    const out: React.ReactElement[] = [];
    for (let row = 0; row * bh <= height; row++) {
      const shift = row % 2 ? bw / 2 : 0;
      for (let col = -1; col * bw + shift <= width; col++) {
        const x = col * bw + shift;
        // Mỗi viên một sắc hơi khác: sân gạch cũ không viên nào giống viên nào.
        out.push(
          <Rect
            key={`b${row}-${col}`}
            x={x + 1.2}
            y={row * bh + 1.2}
            width={bw - 2.4}
            height={bh - 2.4}
            rx={2}
            fill={r() < 0.5 ? '#7E5537' : '#6E4A30'}
            opacity={0.5 + r() * 0.45}
          />,
        );
      }
    }
    return out;
  }, [width, height]);

  const grit = useMemo(() => {
    const r = rnd(9001);
    return Array.from({ length: 320 }, (_, i) => (
      <Circle
        key={i}
        cx={r() * width}
        cy={r() * height}
        r={0.35 + r() * 1.1}
        fill={r() < 0.5 ? '#D9B189' : '#3A2617'}
        opacity={0.08 + r() * 0.16}
      />
    ));
  }, [width, height]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="court-mortar" x1="0" y1="0" x2="0.12" y2="1">
            <Stop offset="0" stopColor="#9A7250" />
            <Stop offset="1" stopColor="#6B4A30" />
          </LinearGradient>
          <RadialGradient id="court-vig" cx="0.5" cy="0.5" r="0.75">
            <Stop offset="0.45" stopColor="#2A1B0E" stopOpacity="0" />
            <Stop offset="1" stopColor="#2A1B0E" stopOpacity="0.6" />
          </RadialGradient>
          <LinearGradient id="court-top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="1" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="court-bot" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="0" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Mạch vữa là nền, viên gạch đè lên — kẻ mạch bằng nét thì góc giao
            nhau lộ ra hai nét chồng, nhìn rất giả. */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#court-mortar)" />
        {bricks}
        {grit}
        <Rect x={0} y={0} width={width} height={height} fill="url(#court-vig)" />
        <Rect x={0} y={0} width={width} height={height * 0.1} fill="url(#court-top)" />
        <Rect x={0} y={height * 0.9} width={width} height={height * 0.1} fill="url(#court-bot)" />
      </Svg>
    </View>
  );
}
