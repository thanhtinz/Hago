import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { caroTheme as T } from './theme';

/**
 * Mặt bàn gỗ đặt sau trang giấy.
 *
 * Bộ mặt của caro là "ván cờ trên trang vở giờ ra chơi". Trang vở thì đã có,
 * nhưng nó trôi lơ lửng giữa nền đen — mà giấy không bao giờ trôi, giấy luôn
 * *nằm trên* cái gì đó. Thêm mặt bàn gỗ vào thì tờ giấy có chỗ để nằm, và
 * khoảng trống hai đầu màn hình thành mặt bàn chứ không còn là chỗ thừa.
 *
 * Vẽ bằng SVG chứ không dùng ảnh: gỗ ở đây chỉ là một dải chuyển màu cộng
 * mấy đường thớ, nặng vài trăm byte mã và sắc nét ở mọi mật độ điểm ảnh.
 */
export function DeskBackdrop({ width, height }: { width: number; height: number }) {
  const grain = useMemo(() => {
    let x = 424242;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    const n = 16;
    return Array.from({ length: n }, (_, i) => {
      const y = (i + 0.5) * (height / n) + (rnd() - 0.5) * height * 0.03;
      const a = y + (rnd() - 0.5) * height * 0.035;
      return (
        <Path
          key={i}
          d={`M-4 ${y} C ${width * 0.25} ${a}, ${width * 0.6} ${y}, ${width + 4} ${a}`}
          stroke="#2A1B0C"
          strokeWidth={0.4 + rnd() * 0.9}
          fill="none"
          opacity={0.1 + rnd() * 0.14}
        />
      );
    });
  }, [width, height]);

  const dust = useMemo(() => {
    let x = 909090;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    return Array.from({ length: 50 }, (_, i) => (
      <Circle key={i} cx={rnd() * width} cy={rnd() * height} r={0.3 + rnd() * 0.9} fill="#E8CFA6" opacity={0.05 + rnd() * 0.07} />
    ));
  }, [width, height]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="desk-wood" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#4A3319" />
            <Stop offset="0.45" stopColor="#5C4020" />
            <Stop offset="1" stopColor="#38250F" />
          </LinearGradient>
          {/* Quầng đèn bàn hắt xuống đúng chỗ đặt tờ giấy. */}
          <RadialGradient id="desk-lamp" cx="0.5" cy="0.44" r="0.62">
            <Stop offset="0" stopColor="#FFE3B0" stopOpacity="0.22" />
            <Stop offset="0.6" stopColor="#FFD9A0" stopOpacity="0.07" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="desk-fadeTop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={T.deskFade} stopOpacity="1" />
            <Stop offset="1" stopColor={T.deskFade} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="desk-fadeBottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={T.deskFade} stopOpacity="0" />
            <Stop offset="1" stopColor={T.deskFade} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#desk-wood)" />
        {grain}
        {dust}
        <Ellipse cx={width / 2} cy={height * 0.46} rx={width * 0.75} ry={height * 0.42} fill="url(#desk-lamp)" />
        {/* Hai đầu tan dần vào nền app, để mặt bàn không thành một khối chữ
            nhật dán đè lên màn hình. */}
        <Rect x={0} y={0} width={width} height={height * 0.11} fill="url(#desk-fadeTop)" />
        <Rect x={0} y={height * 0.89} width={width} height={height * 0.11} fill="url(#desk-fadeBottom)" />
      </Svg>
    </View>
  );
}

/**
 * Hai tờ giấy lót bên dưới, lệch và nghiêng một chút. Một tờ giấy đơn độc
 * trông như hình chữ nhật trắng; một xấp giấy thì trông như xấp giấy.
 */
export function PaperStack({ size }: { size: number }) {
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          left: 4,
          top: 5,
          width: size,
          height: size,
          borderRadius: 4,
          backgroundColor: T.paperUnder2,
          transform: [{ rotate: '1.3deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -3,
          top: 3,
          width: size,
          height: size,
          borderRadius: 4,
          backgroundColor: T.paperUnder1,
          transform: [{ rotate: '-0.8deg' }],
        }}
      />
    </View>
  );
}
