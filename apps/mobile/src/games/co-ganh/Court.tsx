import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ganhTheme as T } from './theme';

/**
 * Mặt sân sau bàn cờ gánh.
 *
 * Caro có mặt bàn gỗ vì nó là ván cờ trong lớp học; cờ gánh có **mặt sân
 * gạch** vì nó là ván cờ ngoài hiên. Cùng một khung app, nhưng mở hai game
 * ra là thấy ngay hai chỗ ngồi khác nhau.
 */
export function CourtBackdrop({ width, height }: { width: number; height: number }) {
  const bricks = useMemo(() => {
    const out: React.ReactElement[] = [];
    const bh = 34;
    const bw = 78;
    for (let r = 0; r * bh <= height; r++) {
      out.push(<Rect key={`h${r}`} x={0} y={r * bh} width={width} height={1.6} fill="#2A1B10" opacity={0.3} />);
      for (let c = 0; c * bw <= width + bw; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0);
        out.push(<Rect key={`v${r}-${c}`} x={x} y={r * bh} width={1.4} height={bh} fill="#2A1B10" opacity={0.22} />);
      }
    }
    return out;
  }, [width, height]);

  const grit = useMemo(() => {
    let x = 8123;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    return Array.from({ length: 90 }, (_, i) => (
      <Circle key={i} cx={rnd() * width} cy={rnd() * height} r={0.4 + rnd() * 1.2} fill="#F0D9BA" opacity={0.05 + rnd() * 0.07} />
    ));
  }, [width, height]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="court-bg" x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0" stopColor="#6B4A2E" />
            <Stop offset="0.5" stopColor="#5A3D24" />
            <Stop offset="1" stopColor="#3D2817" />
          </LinearGradient>
          <RadialGradient id="court-sun" cx="0.5" cy="0.42" r="0.68">
            <Stop offset="0" stopColor="#FFE0A8" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#FFE0A8" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="court-fadeTop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="1" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="court-fadeBottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="0" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#court-bg)" />
        {bricks}
        {grit}
        <Ellipse cx={width / 2} cy={height * 0.46} rx={width * 0.7} ry={height * 0.4} fill="url(#court-sun)" />
        <Rect x={0} y={0} width={width} height={height * 0.09} fill="url(#court-fadeTop)" />
        <Rect x={0} y={height * 0.91} width={width} height={height * 0.09} fill="url(#court-fadeBottom)" />
      </Svg>
    </View>
  );
}
