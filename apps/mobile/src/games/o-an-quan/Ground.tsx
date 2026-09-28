import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Rect, RadialGradient, Stop } from 'react-native-svg';

/**
 * Mặt đất sau bàn ô ăn quan.
 *
 * Cùng họ với mặt sân của cờ gánh nhưng là **đất nện**, không phải gạch lát:
 * ô ăn quan vạch thẳng xuống nền sân trường, còn cờ gánh thì vạch lên nền
 * gạch. Khác biệt nhỏ nhưng đủ để hai game không lẫn vào nhau.
 */
export function GroundBackdrop({ width, height }: { width: number; height: number }) {
  const grit = useMemo(() => {
    let x = 31337;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    return Array.from({ length: 150 }, (_, i) => (
      <Circle key={i} cx={rnd() * width} cy={rnd() * height} r={0.4 + rnd() * 1.4} fill="#E4C79A" opacity={0.05 + rnd() * 0.09} />
    ));
  }, [width, height]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="ground-bg" x1="0" y1="0" x2="0.15" y2="1">
            <Stop offset="0" stopColor="#6A4F30" />
            <Stop offset="0.5" stopColor="#55402A" />
            <Stop offset="1" stopColor="#38291A" />
          </LinearGradient>
          <RadialGradient id="ground-sun" cx="0.5" cy="0.44" r="0.7">
            <Stop offset="0" stopColor="#FFE3AE" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#FFE3AE" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="ground-top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="1" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="ground-bot" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="0" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#ground-bg)" />
        {grit}
        <Ellipse cx={width / 2} cy={height * 0.46} rx={width * 0.7} ry={height * 0.4} fill="url(#ground-sun)" />
        <Rect x={0} y={0} width={width} height={height * 0.09} fill="url(#ground-top)" />
        <Rect x={0} y={height * 0.91} width={width} height={height * 0.09} fill="url(#ground-bot)" />
      </Svg>
    </View>
  );
}
