import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, R, S, softShadow, toyShadow } from '../theme';
import { avatarUrl } from '../lib/api';
import { Icon, IconName } from './Icon';
import { Art, ArtName } from './Art';

/* --------------------------------- text --------------------------------- */

type TxtProps = React.ComponentProps<typeof Text> & {
  size?: number;
  color?: string;
  weight?: 'body' | 'medium' | 'bold' | 'title' | 'heading' | 'display';
  center?: boolean;
};

const FONT_BY_WEIGHT: Record<string, string> = {
  body: F.body,
  medium: F.bodyMedium,
  bold: F.bodyBold,
  title: F.title,
  heading: F.heading,
  display: F.display,
};

export function Txt({ size = 14, color = C.ink, weight = 'body', center, style, ...rest }: TxtProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontSize: size, color, fontFamily: FONT_BY_WEIGHT[weight], textAlign: center ? 'center' : undefined },
        weight === 'display' || weight === 'heading' ? { lineHeight: size * 1.25 } : null,
        style,
      ]}
    />
  );
}

/* -------------------------------- button -------------------------------- */

interface BtnProps {
  label: string;
  onPress?: () => void;
  tone?: 'primary' | 'secondary' | 'mint' | 'sun' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Icon giao diện dạng SVG. */
  icon?: IconName;
  /** Icon phụ vẽ bên phải nhãn. */
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const TONES: Record<string, { bg: string; shadow: string; text: string }> = {
  primary: { bg: C.primary, shadow: '#C94E30', text: '#FFFFFF' },
  secondary: { bg: C.secondary, shadow: '#4B3BC0', text: '#FFFFFF' },
  mint: { bg: C.mint, shadow: '#249B60', text: '#FFFFFF' },
  sun: { bg: C.sun, shadow: '#D69C13', text: '#5A4200' },
  danger: { bg: C.danger, shadow: '#BF3F3F', text: '#FFFFFF' },
  ghost: { bg: C.surface, shadow: C.shadow, text: C.ink },
};

export function Btn({ label, onPress, tone = 'primary', size = 'md', icon, trailingIcon, disabled, loading, full, style, accessibilityLabel }: BtnProps) {
  const t = TONES[tone];
  const pad = size === 'lg' ? 16 : size === 'sm' ? 9 : 12;
  // Quy tắc vùng chạm tối thiểu 44px.
  const minHeight = size === 'lg' ? 52 : size === 'sm' ? 40 : 46;
  const font = size === 'lg' ? 18 : size === 'sm' ? 13 : 15;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        {
          backgroundColor: disabled ? C.line : t.bg,
          paddingVertical: pad,
          paddingHorizontal: pad * 1.7,
          minHeight,
          borderRadius: R.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.7 : 1,
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
        toyShadow(disabled ? C.shadow : t.shadow, size === 'lg' ? 5 : 4),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.text} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={font + 3} color={disabled ? C.inkFaint : t.text} /> : null}
          <Txt size={font} weight="title" color={disabled ? C.inkFaint : t.text}>
            {label}
          </Txt>
          {trailingIcon ? <Icon name={trailingIcon} size={font + 3} color={disabled ? C.inkFaint : t.text} /> : null}
        </>
      )}
    </Pressable>
  );
}

/* --------------------------------- card --------------------------------- */

export function Card({
  children,
  style,
  padded = true,
  tone = C.surface,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  tone?: string;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: tone,
          borderRadius: R.lg,
          padding: padded ? S.lg : 0,
          borderWidth: 2,
          borderColor: C.line,
        },
        softShadow(0.06, 12, 4),
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

/* -------------------------------- avatar -------------------------------- */

const FRAME_COLORS: Record<string, [string, string]> = {
  frame_sakura: ['#FFB7C5', '#FF6F91'],
  frame_mint: ['#9BF6C5', '#3AC48A'],
  frame_royal: ['#C86DFF', '#6C5CE7'],
  frame_dragon: ['#FFD36E', '#FF8A3D'],
};

export function Avatar({
  seed,
  styleName,
  size = 48,
  frameId,
  online,
  ring,
}: {
  seed?: string;
  styleName?: string;
  size?: number;
  frameId?: string | null;
  online?: boolean;
  ring?: string;
}) {
  const border = Math.max(2, Math.round(size * 0.06));
  const frame = frameId ? FRAME_COLORS[frameId] : null;
  const inner = (
    <Image
      source={{ uri: avatarUrl(styleName, seed, Math.round(size * 2)) }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.surfaceAlt }}
    />
  );
  return (
    <View style={{ width: size + border * 2, height: size + border * 2 }}>
      {frame ? (
        <LinearGradient
          colors={frame}
          style={{
            width: size + border * 2,
            height: size + border * 2,
            borderRadius: (size + border * 2) / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={{
            width: size + border * 2,
            height: size + border * 2,
            borderRadius: (size + border * 2) / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ring ?? C.surfaceAlt,
          }}
        >
          {inner}
        </View>
      )}
      {online !== undefined ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: Math.max(10, size * 0.26),
            height: Math.max(10, size * 0.26),
            borderRadius: 999,
            backgroundColor: online ? C.mint : C.inkFaint,
            borderWidth: 2,
            borderColor: C.surface,
          }}
        />
      ) : null}
    </View>
  );
}

/* --------------------------------- chips -------------------------------- */

export function Chip({
  label,
  color = C.secondary,
  soft = C.secondarySoft,
  icon,
  art,
  size = 12,
}: {
  label: string;
  color?: string;
  soft?: string;
  icon?: IconName;
  /** Asset thay cho icon nét — dùng cho hạng, huy chương, vật phẩm. */
  art?: ArtName;
  size?: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: soft,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: R.pill,
      }}
    >
      {art ? <Art name={art} size={size + 4} color={color} /> : icon ? <Icon name={icon} size={size + 1} color={color} strokeWidth={2.4} /> : null}
      <Txt size={size} weight="bold" color={color}>
        {label}
      </Txt>
    </View>
  );
}

export function CoinPill({ coin, diamond }: { coin: number; diamond: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Chip label={coin.toLocaleString('vi-VN')} icon="coin" color="#8A5E00" soft={C.sunSoft} />
      <Chip label={String(diamond)} icon="gem" color="#125E96" soft={C.skySoft} />
    </View>
  );
}

/* -------------------------------- inputs -------------------------------- */

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt size={13} weight="bold" color={C.inkSoft}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={C.inkFaint}
        {...props}
        style={[
          {
            backgroundColor: C.surface,
            borderRadius: R.md,
            borderWidth: 2,
            borderColor: error ? C.danger : C.line,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: F.body,
            color: C.ink,
          },
          props.style as any,
        ]}
      />
      {error ? (
        <Txt size={12} color={C.danger} weight="medium">
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

/* ------------------------------ progress bar ----------------------------- */

export function Bar({
  value,
  max,
  color = C.mint,
  height = 10,
  bg = C.line,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  bg?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ height, backgroundColor: bg, borderRadius: R.pill, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: R.pill }} />
    </View>
  );
}

/* -------------------------------- misc ---------------------------------- */

export function Empty({ icon = 'list', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: C.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={32} color={C.inkFaint} strokeWidth={1.9} />
      </View>
      <Txt size={16} weight="heading" color={C.inkSoft}>
        {title}
      </Txt>
      {hint ? (
        <Txt size={13} color={C.inkFaint} center style={{ maxWidth: 260 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, icon, action }: { title: string; icon?: IconName; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {icon ? <Icon name={icon} size={19} color={C.primary} strokeWidth={2.2} /> : null}
        <Txt size={18} weight="heading">
          {title}
        </Txt>
      </View>
      {action}
    </View>
  );
}

export const sheet = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
