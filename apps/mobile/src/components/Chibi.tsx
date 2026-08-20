import React from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { chibi } from '../lib/assets';

/**
 * Một asset chibi. Dùng thay cho <Text>emoji</Text> ở mọi chỗ cần hình đồng nhất
 * giữa các nền tảng; emoji hệ thống vẫn dùng được cho chữ chạy trong câu.
 */
export function Chibi({
  name,
  size = 24,
  style,
  opacity,
}: {
  name: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  opacity?: number;
}) {
  return (
    <Image
      source={{ uri: chibi(name) }}
      style={[{ width: size, height: size, opacity }, style]}
      resizeMode="contain"
    />
  );
}

/** Chibi đặt trong một khối tròn/bo góc có nền — dùng cho icon trong danh sách. */
export function ChibiBadge({
  name,
  size = 44,
  bg,
  radius,
  scale = 0.62,
}: {
  name: string;
  size?: number;
  bg: string;
  radius?: number;
  scale?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size / 3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Chibi name={name} size={size * scale} />
    </View>
  );
}
