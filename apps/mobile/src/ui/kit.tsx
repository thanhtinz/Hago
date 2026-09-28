import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
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
  sub,
  icon,
  onPress,
  tone = 'primary',
  size = 'md',
  disabled,
  style,
}: {
  label: string;
  sub?: string;
  icon?: IconName;
  onPress?: () => void;
  tone?: 'primary' | 'ghost' | 'solid';
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = disabled ? A.surfaceAlt : tone === 'primary' ? A.gold : tone === 'solid' ? A.surfaceHigh : 'transparent';
  const fg = disabled ? A.inkFaint : tone === 'primary' ? '#1B1408' : A.ink;
  const lg = size === 'lg';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          minHeight: lg ? 64 : 44,
          flexDirection: 'row',
          gap: S.md,
          paddingHorizontal: lg ? S.xl : S.lg,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: lg ? R.lg : R.pill,
          backgroundColor: bg,
          borderWidth: tone === 'ghost' ? 1.5 : 0,
          borderColor: A.line,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={lg ? 26 : 18} color={fg} strokeWidth={2.1} /> : null}
      <View style={lg ? undefined : { flexDirection: 'row' }}>
        <Txt weight="bold" size={lg ? 17 : 14} color={fg}>
          {label}
        </Txt>
        {sub ? (
          <Txt size={12} color={fg} style={{ opacity: 0.72, marginTop: 1 }}>
            {sub}
          </Txt>
        ) : null}
      </View>
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

/**
 * Ảnh đại diện vẽ bằng chữ cái đầu. Chưa có ảnh thật thì chữ cái vẫn phân biệt
 * được hai bên, còn hình tròn xám giống hệt nhau thì không.
 */
export function Avatar({
  name,
  size = 40,
  tint = A.gold,
  active,
}: {
  name: string;
  size?: number;
  tint?: string;
  active?: boolean;
}) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: A.surfaceHigh,
        borderWidth: active ? 2 : 1,
        borderColor: active ? tint : A.line,
      }}
    >
      <Txt size={size * 0.42} weight="bold" color={active ? tint : A.inkSoft}>
        {letter}
      </Txt>
    </View>
  );
}

/**
 * Nút chỉ có icon. Vẫn phải có nhãn đọc màn hình và vùng chạm 44px — icon
 * không tự giải thích nó làm gì cho người dùng trình đọc màn hình.
 */
export function IconBtn({
  name,
  label,
  onPress,
  tone = 'plain',
  disabled,
}: {
  name: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'plain' | 'danger' | 'gold';
  disabled?: boolean;
}) {
  const fg = disabled ? A.inkFaint : tone === 'danger' ? A.danger : tone === 'gold' ? A.gold : A.inkSoft;
  const bg = tone === 'danger' ? A.dangerSoft : tone === 'gold' ? A.goldSoft : A.surfaceAlt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 48,
        gap: 3,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: R.md,
        backgroundColor: disabled ? A.surface : bg,
        borderWidth: 1,
        borderColor: A.lineSoft,
      }}
    >
      <Icon name={name} size={19} color={fg} />
      <Txt size={10} weight="bold" color={fg}>
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * Đồng hồ. Ở mọi app cờ online, đồng hồ là thứ mắt liếc nhiều nhất sau bàn cờ,
 * nên nó dùng chữ số đều bề ngang để không nhảy chỗ mỗi giây, và đỏ lên khi
 * dưới 20 giây thay vì chỉ đổi số.
 */
export function Clock({ ms, running, low = 20000 }: { ms: number; running?: boolean; low?: number }) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  const urgent = ms <= low;
  return (
    <View
      style={{
        paddingHorizontal: S.md,
        paddingVertical: 7,
        borderRadius: R.sm,
        minWidth: 78,
        alignItems: 'center',
        backgroundColor: urgent ? A.dangerSoft : running ? A.surfaceHigh : A.surface,
        borderWidth: 1,
        borderColor: urgent ? A.danger : running ? A.gold : A.line,
      }}
    >
      <Text
        style={{
          fontVariant: ['tabular-nums'],
          fontSize: 18,
          fontWeight: '700',
          color: urgent ? A.danger : running ? A.ink : A.inkFaint,
        }}
      >
        {mm}:{String(ss).padStart(2, '0')}
      </Text>
    </View>
  );
}
