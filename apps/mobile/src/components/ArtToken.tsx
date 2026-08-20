import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Art, ArtName } from './Art';
import { softShadow } from '../theme';

/**
 * Đặt asset lên một "đồng xu" tròn: nền chuyển màu, vành sáng ở trên, bóng đổ
 * bên dưới. Cùng một asset silhouette nhưng đặt trên bệ thì ra khối, không còn
 * phẳng như dán icon lên nền.
 */
export function ArtToken({
  name,
  size = 96,
  art,
  plate = ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.12)'],
  rim = 'rgba(255,255,255,0.5)',
  color = '#FFFFFF',
  hi,
  glyph = false,
  shadow = 0.18,
  style,
}: {
  name: ArtName;
  /** Đường kính đồng xu. */
  size?: number;
  /** Cỡ asset bên trong; mặc định 62% đồng xu. */
  art?: number;
  plate?: [string, string];
  rim?: string;
  color?: string;
  hi?: string;
  /** Asset huy hiệu: chỉ lấy ký hiệu, bỏ đĩa nền (đồng xu đã là nền rồi). */
  glyph?: boolean;
  shadow?: number;
  style?: ViewStyle;
}) {
  const inner = art ?? Math.round(size * 0.62);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={plate}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: Math.max(1.5, size * 0.022),
            borderColor: rim,
          },
          shadow ? softShadow(shadow, size * 0.22, size * 0.07) : null,
        ]}
      >
        {/* Vệt sáng vòng cung phía trên cho cảm giác mặt cong */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.07,
            left: size * 0.14,
            right: size * 0.14,
            height: size * 0.34,
            borderRadius: size,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        <Art name={name} size={inner} color={color} hi={hi ?? color} glyph={glyph} shadow />
      </LinearGradient>
    </View>
  );
}
