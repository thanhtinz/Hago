import React from 'react';
import { View } from 'react-native';
import { caroTheme as T } from './theme';

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
