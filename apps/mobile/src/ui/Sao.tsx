import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { A } from './theme';

/**
 * Ba ngôi sao, `n` ngôi đặc.
 *
 * Sao đặc và sao rỗng, không huy chương vàng bạc đồng: ba mức của một ải
 * không phải ba hạng của một cuộc thi, chúng là ba nấc của cùng một người
 * trên cùng một ải.
 */
export function Sao({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityRole="text" accessibilityLabel={`${n} trên 3 sao`}>
      {[0, 1, 2].map((i) => (
        <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2.6 L14.9 9 L21.6 9.8 L16.6 14.3 L18 21 L12 17.6 L6 21 L7.4 14.3 L2.4 9.8 L9.1 9 Z"
            fill={i < n ? A.gold : 'none'}
            stroke={i < n ? A.gold : A.line}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
      ))}
    </View>
  );
}
