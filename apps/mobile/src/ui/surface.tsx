import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { A, R } from './theme';

/**
 * Lớp bề mặt của app: **phẳng, phân tầng bằng độ sáng**.
 *
 * Bản trước dựng cảm giác "vật thật" bằng ba thứ: chuyển sắc mạnh, vân gỗ
 * sinh ngẫu nhiên, và một cặp nét vát sáng-tối ở mép. Cả ba đều làm tốt
 * đúng việc chúng nhận, và cả ba đều là lý do app trông cũ. Một tấm có vân
 * và có vát là một tấm **giả vờ làm gỗ**; mắt bây giờ đọc nó ra là một nút
 * bấm của phần mềm mười lăm năm trước, không phải ra một mặt bàn.
 *
 * Bản này chỉ còn một ngữ pháp duy nhất: **tầng nào cao hơn thì sáng hơn**.
 * Chuyển sắc còn lại rất nhẹ, chỉ đủ để mép trên của một tấm không chết
 * cứng thành một đường thẳng. Không vân, không vát, không vệt loé.
 *
 * Vẫn vẽ bằng SVG chứ không bằng thư viện gradient: React Native không có
 * chuyển sắc trong `style`, và `react-native-svg` thì vốn đã dùng để vẽ bàn
 * cờ nên không kéo thêm phụ thuộc nào.
 */

const fill = { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0 };

/**
 * Mặt của một tấm. `tone` sáng dần: 0 chìm, 1 mặc định, 2 nổi.
 *
 * `seed` giữ lại nhưng **không còn dùng**: nó từng gieo vân gỗ, mà bản này
 * không có vân. Giữ tham số để bốn mươi chỗ gọi không phải sửa một lượt chỉ
 * để xoá một con số.
 */
export function SurfaceFill({
  width,
  height,
  radius = 0,
  tone = 1,
}: {
  width: number;
  height: number;
  radius?: number;
  tone?: 0 | 1 | 2;
  seed?: number;
  bevel?: boolean;
}) {
  const base = tone === 0 ? A.panelLo : tone === 1 ? A.panel : A.panelHi;
  const top = tone === 0 ? A.panel : tone === 1 ? A.panelHi : A.woodLit;
  const id = `s${tone}`;
  return (
    <Svg width={width} height={height} style={fill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.7" stopColor={base} />
          <Stop offset="1" stopColor={base} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Nền toàn màn.
 *
 * Một dải chuyển từ xám mực sang gần đen, cộng đúng **một** quầng sáng màu
 * nhấn rất loãng ở trên. Bản gỗ có thêm bảy mươi hạt bụi lơ lửng và một
 * vòng tối bốn góc rất nặng; bỏ cả hai. Bụi là chi tiết của một app muốn
 * trông ấm cúng, còn vòng tối nặng thì bóp màn hình lại và làm mọi thứ ở
 * mép đọc khó hơn.
 */
export function AppBackdrop({ width, height }: { width: number; height: number }) {
  return (
    <View style={fill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="app-bg" x1="0" y1="0" x2="0.1" y2="1">
            <Stop offset="0" stopColor={A.bgWarm} />
            <Stop offset="0.5" stopColor={A.bg} />
            <Stop offset="1" stopColor={A.bgDeep} />
          </LinearGradient>
          <RadialGradient id="app-lamp" cx="0.5" cy="0" r="0.75">
            <Stop offset="0" stopColor={A.gold} stopOpacity="0.1" />
            <Stop offset="1" stopColor={A.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#app-bg)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#app-lamp)" />
      </Svg>
    </View>
  );
}

/**
 * Một tấm. Dùng cho mọi thẻ, mọi thanh, mọi tấm trượt lên.
 *
 * Đo cỡ bằng `onLayout` nên không cần biết trước, và chỉ vẽ mặt khi đã biết
 * cỡ — vẽ trước là một khung 0×0 nháy lên ở khung hình đầu.
 */
export function Panel({
  children,
  radius = R.md,
  tone = 1,
  hairline = true,
  style,
}: {
  children?: React.ReactNode;
  radius?: number;
  tone?: 0 | 1 | 2;
  /** Không còn dùng; giữ để chỗ gọi không phải sửa. Xem `SurfaceFill`. */
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
          borderColor: hairline ? A.lineSoft : 'transparent',
          backgroundColor: A.panel,
        },
        style,
      ]}
    >
      {size.w > 0 ? <SurfaceFill width={size.w} height={size.h} radius={radius} tone={tone} /> : null}
      {children}
    </View>
  );
}

/**
 * Nền của nút chính: màu nhấn phẳng, một chuyển sắc rất nhẹ theo chiều dọc.
 *
 * Bản gỗ dựng bốn chặng chuyển sắc cộng một vệt loé trắng chạy ngang để ra
 * kim loại đánh bóng. Đó đúng là cách vẽ vàng, và cũng đúng là thứ làm nút
 * trông như một viên kẹo nhựa của năm 2010. Một màu đặc với một nhịp tối
 * dần ở đáy là đủ để nút có khối mà không giả vờ làm vật liệu gì cả.
 */
export function GoldFill({ width, height, radius = R.pill }: { width: number; height: number; radius?: number }) {
  // Bo góc chặn theo chiều cao: để `rx` lớn hơn nửa chiều cao thì trình
  // duyệt kéo hình chữ nhật thành hình bầu dục.
  const rx = Math.min(radius, height / 2);
  return (
    <Svg width={width} height={height} style={fill}>
      <Defs>
        <LinearGradient id="gold-m" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={A.goldLit} />
          <Stop offset="0.5" stopColor={A.gold} />
          <Stop offset="1" stopColor={A.goldDeep} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={rx} fill="url(#gold-m)" />
    </Svg>
  );
}

/**
 * Đường chỉ ngăn hai khối: một nét mảnh loe ra hai đầu, giữa có một chấm.
 *
 * Bản gỗ đặt ở giữa một hạt kim cương lấy từ khung viền bàn cờ. Hạt ấy đẹp
 * nhưng nó là một hoạ tiết, và một hoạ tiết lặp lại ở mười màn thì thành
 * chữ ký của một app cũ. Một chấm tròn nói đúng chừng ấy việc — "hết một
 * đoạn" — mà không nói thêm gì.
 */
export function Rule({ width }: { width: number }) {
  const m = width / 2;
  return (
    <Svg width={width} height={8}>
      <Defs>
        <LinearGradient id="rule-g" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={A.line} stopOpacity="0" />
          <Stop offset="0.5" stopColor={A.line} stopOpacity="1" />
          <Stop offset="1" stopColor={A.line} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={3.5} width={width} height={1} fill="url(#rule-g)" />
      <Path d={`M${m - 2} 4 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0`} fill={A.gold} opacity={0.85} />
    </Svg>
  );
}
