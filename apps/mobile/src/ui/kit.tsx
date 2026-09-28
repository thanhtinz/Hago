import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { A, R, S } from './theme';

export function Txt({
  children,
  size = 14,
  weight = 'regular',
  color = A.ink,
  center,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: 'regular' | 'bold' | 'display';
  color?: string;
  center?: boolean;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: size,
          color,
          fontWeight: weight === 'regular' ? '400' : weight === 'bold' ? '700' : '800',
          letterSpacing: weight === 'display' ? 0.3 : 0,
          textAlign: center ? 'center' : 'auto',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Btn({
  label,
  onPress,
  tone = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'primary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = disabled ? A.surfaceAlt : tone === 'primary' ? A.gold : 'transparent';
  const fg = disabled ? A.inkFaint : tone === 'primary' ? '#1B1408' : A.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          minHeight: 44,
          paddingHorizontal: S.lg,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: R.pill,
          backgroundColor: bg,
          borderWidth: tone === 'ghost' ? 1.5 : 0,
          borderColor: A.line,
        },
        style,
      ]}
    >
      <Txt weight="bold" size={14} color={fg}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Tag({ label, color = A.inkSoft, bg = A.surfaceAlt }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill, backgroundColor: bg }}>
      <Txt size={11} weight="bold" color={color}>
        {label}
      </Txt>
    </View>
  );
}
