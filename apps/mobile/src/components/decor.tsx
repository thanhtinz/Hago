import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Lớp bóng chéo phủ lên thẻ gradient — tạo cảm giác bề mặt bóng, kiểu thẻ game
 * casual. Đặt tuyệt đối nên không ảnh hưởng layout bên dưới.
 */
export function Gloss({ opacity = 0.28, angle = 'diagonal' }: { opacity?: number; angle?: 'diagonal' | 'top' }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`rgba(255,255,255,${opacity})`, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.06)']}
      locations={[0, 0.45, 1]}
      start={angle === 'top' ? { x: 0.5, y: 0 } : { x: 0, y: 0 }}
      end={angle === 'top' ? { x: 0.5, y: 1 } : { x: 1, y: 1 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    />
  );
}

/** Bong bóng trang trí phía sau nội dung thẻ. */
export function Bubbles({
  spec,
}: {
  spec: { size: number; top?: number; bottom?: number; left?: number; right?: number; alpha?: number }[];
}) {
  return (
    <>
      {spec.map((b, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: `rgba(255,255,255,${b.alpha ?? 0.16})`,
            top: b.top,
            bottom: b.bottom,
            left: b.left,
            right: b.right,
          }}
        />
      ))}
    </>
  );
}

/** Vệt sáng cong ở mép trên thẻ, giúp bề mặt trông cong và mềm hơn. */
export function TopSheen({ radius = 26 }: { radius?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: '6%',
        right: '6%',
        top: 3,
        height: 22,
        borderRadius: radius,
        backgroundColor: 'rgba(255,255,255,0.16)',
      }}
    />
  );
}

/** Nền chấm bi mờ cho vùng header. */
export function DotPattern({ rows = 3, cols = 8, color = 'rgba(255,255,255,0.18)', gap = 26, style }: { rows?: number; cols?: number; color?: string; gap?: number; style?: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, style]}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <View
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: color,
              left: `${(c / cols) * 100 + 3}%`,
              top: 10 + r * gap + (c % 2) * 9,
            }}
          />
        )),
      )}
    </View>
  );
}
