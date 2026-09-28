import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Nền cát sau bàn ô ăn quan.
 *
 * Ba bộ môn đã mở đều chơi trên một mặt khác nhau, và mặt đó là thứ nhận ra
 * game trước cả bàn cờ: caro là mặt bàn gỗ trong lớp, cờ gánh là sân gạch
 * ngoài hiên, ô ăn quan là **bãi cát sân trường**.
 *
 * Cát khác đất ở ba chỗ, thiếu cái nào cũng thành nền nâu trơn: hạt lấm tấm
 * dày và có cả hạt sáng lẫn hạt tối, vài gợn sóng dài do gió, và mấy chỗ ẩm
 * sẫm màu loang không đều.
 *
 * Không có quầng nắng ở giữa. Một vầng sáng mờ vẫn là một vầng sáng có mép,
 * và mắt bắt ngay cái mép đó thành một cái khung bầu dục bao quanh bàn cờ —
 * đúng thứ vừa bỏ đi khi tháo khung. Chiều sâu để cho bốn góc tối dần lo,
 * vì nó không có mép nào cả.
 */
export function GroundBackdrop({ width, height }: { width: number; height: number }) {
  const rng = (seed: number) => {
    let x = seed | 0 || 5;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
  };

  const grains = useMemo(() => {
    const r = rng(60607);
    return Array.from({ length: 700 }, (_, i) => {
      const light = r() < 0.55;
      return (
        <Circle
          key={i}
          cx={r() * width}
          cy={r() * height}
          r={0.35 + r() * 1.15}
          fill={light ? '#F0DCB4' : '#6E5537'}
          opacity={0.12 + r() * 0.3}
        />
      );
    });
  }, [width, height]);

  const ripples = useMemo(() => {
    const r = rng(1213);
    return Array.from({ length: 9 }, (_, i) => {
      const y = (i + 0.5) * (height / 9) + (r() - 0.5) * height * 0.04;
      const bow = (r() - 0.5) * height * 0.07;
      return (
        <Path
          key={i}
          d={`M-10 ${y} Q ${width * 0.5} ${y + bow} ${width + 10} ${y - bow * 0.6}`}
          stroke="#7C6242"
          strokeWidth={1 + r() * 1.6}
          fill="none"
          opacity={0.12 + r() * 0.12}
        />
      );
    });
  }, [width, height]);

  const damp = useMemo(() => {
    const r = rng(777);
    return Array.from({ length: 6 }, (_, i) => (
      <Ellipse
        key={i}
        cx={r() * width}
        cy={r() * height}
        rx={width * (0.12 + r() * 0.22)}
        ry={height * (0.06 + r() * 0.12)}
        fill="url(#sand-damp)"
      />
    ));
  }, [width, height]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sand-bg" x1="0" y1="0" x2="0.12" y2="1">
            <Stop offset="0" stopColor="#C9A97C" />
            <Stop offset="0.45" stopColor="#B08C60" />
            <Stop offset="1" stopColor="#8B6E48" />
          </LinearGradient>
          {/* Tối dần bốn góc, nếu không thì bãi cát sáng đều trông như một
              mảng màu dán lên màn hình. */}
          {/* Vệt cát ẩm phải tan dần ra mép. Tô màu đặc rồi hạ độ mờ xuống
              thì vẫn còn nguyên đường biên — nhạt nhưng vẫn là một cung
              tròn liền, và mắt bắt nó thành cái khung. */}
          <RadialGradient id="sand-damp" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#8A6A44" stopOpacity="0.22" />
            <Stop offset="0.6" stopColor="#8A6A44" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#8A6A44" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sand-vig" cx="0.5" cy="0.5" r="0.75">
            <Stop offset="0.5" stopColor="#3A2A16" stopOpacity="0" />
            <Stop offset="1" stopColor="#3A2A16" stopOpacity="0.62" />
          </RadialGradient>
          <LinearGradient id="sand-top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="1" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="sand-bot" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1008" stopOpacity="0" />
            <Stop offset="1" stopColor="#1A1008" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sand-bg)" />
        {damp}
        {ripples}
        {grains}
        <Rect x={0} y={0} width={width} height={height} fill="url(#sand-vig)" />
        <Rect x={0} y={0} width={width} height={height * 0.1} fill="url(#sand-top)" />
        <Rect x={0} y={height * 0.9} width={width} height={height * 0.1} fill="url(#sand-bot)" />
      </Svg>
    </View>
  );
}
