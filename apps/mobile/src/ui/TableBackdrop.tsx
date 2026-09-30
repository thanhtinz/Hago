import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { A } from './theme';

/**
 * Mặt bàn của một ván — **một bản dùng chung cho mọi bộ môn**.
 *
 * Trước đây mỗi bộ môn có một mặt bàn riêng: cờ caro ngồi trên gỗ nâu có
 * vân và bụi bay, cờ gánh trên sân gạch, ô ăn quan trên nền đất. Ba tấm ấy
 * dựng rất kỹ, và chúng sai ở hai chỗ.
 *
 * Thứ nhất, sau khi khung app chuyển sang xám mực thì một mặt bàn nâu nằm
 * giữa một thanh trên và một thanh dưới màu mực đọc ra là **hai app dán vào
 * nhau**. Thứ hai, bản sắc của một bộ môn nằm ở **bàn cờ**, không ở cái bàn
 * kê nó: giấy kẻ ô của cờ caro, sân của cờ gánh và những ô quan đã nói đủ
 * rồi, và một mặt bàn có hoạ tiết chỉ tranh chỗ với chúng.
 *
 * Nên còn một mặt bàn duy nhất, tối và trung tính, với một quầng sáng rất
 * loãng mang màu riêng của bộ môn. Quầng ấy trải rộng quá khổ màn hình và
 * nhạt, để trong tầm nhìn không chỗ nào đọc ra được cái mép của nó — một
 * vầng sáng có mép thì mắt bắt thành khung bầu dục bao quanh bàn cờ.
 */
export function TableBackdrop({ width, height, tint }: { width: number; height: number; tint: string }) {
  const id = tint.replace('#', '');
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`t-bg-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={A.bg} />
            <Stop offset="0.5" stopColor={A.panelLo} />
            <Stop offset="1" stopColor={A.bg} />
          </LinearGradient>
          <RadialGradient id={`t-lamp-${id}`} cx="0.5" cy="0.44" r="0.8">
            <Stop offset="0" stopColor={tint} stopOpacity="0.16" />
            <Stop offset="0.6" stopColor={tint} stopOpacity="0.05" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#t-bg-${id})`} />
        <Ellipse cx={width / 2} cy={height * 0.46} rx={width * 1.05} ry={height * 0.78} fill={`url(#t-lamp-${id})`} />
      </Svg>
    </View>
  );
}

/**
 * Màu quầng của từng bộ môn.
 *
 * Ba màu lấy từ chính bàn cờ: giấy kẻ ô của cờ caro ám lam, sân cờ gánh ám
 * đất nung, ô ăn quan ám nắng. Đủ để hai ván khác bộ môn không nhìn giống
 * hệt nhau, và nhạt đến mức không ai gọi tên được nó.
 */
export const TINT: Record<string, string> = {
  'co-caro': '#5B8FD6',
  'co-ganh': '#D98A5B',
  'o-an-quan': '#E0B368',
};

export const tintOf = (gameId: string): string => TINT[gameId] ?? A.gold;
