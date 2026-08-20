import React from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

/** Ảnh chibi sprite — luôn dùng asset, không vẽ bằng Shape/emoji. */
export function ChibiImg({
  source,
  size = 32,
  width,
  height,
  style,
  imgStyle,
}: {
  source: ImageSourcePropType;
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  imgStyle?: StyleProp<ImageStyle>;
}) {
  const w = width ?? size;
  const h = height ?? size;
  return (
    <View style={[{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image source={source} style={[{ width: w, height: h }, imgStyle]} resizeMode="contain" />
    </View>
  );
}
