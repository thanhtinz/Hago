import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, HERO_GRADIENT, S } from '../theme';
import { Txt } from './ui';
import { Chibi } from './Chibi';
import { Bubbles, DotPattern } from './decor';

/**
 * Header gradient dùng chung cho các màn phụ, giữ một ngôn ngữ thị giác
 * xuyên suốt app thay vì mỗi màn một kiểu nền.
 */
export function ScreenHeader({
  title,
  subtitle,
  art,
  back = true,
  right,
  children,
  bottomPadding = S.lg,
}: {
  title: string;
  subtitle?: string;
  art?: string;
  back?: boolean;
  right?: React.ReactNode;
  children?: React.ReactNode;
  bottomPadding?: number;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <LinearGradient
      colors={HERO_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: Math.max(insets.top, 12) + S.md,
        paddingHorizontal: S.lg,
        paddingBottom: bottomPadding,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
      }}
    >
      <DotPattern rows={3} cols={9} />
      <Bubbles spec={[{ size: 130, right: -44, top: -52, alpha: 0.14 }]} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {back ? (
          <Pressable onPress={() => router.back()} hitSlop={14}>
            <Txt size={24} weight="heading" color="rgba(255,255,255,0.95)">
              ‹
            </Txt>
          </Pressable>
        ) : null}
        {art ? <Chibi name={art} size={24} /> : null}
        <View style={{ flex: 1 }}>
          <Txt size={24} weight="display" color="#fff" numberOfLines={1}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt size={11} weight="medium" color="rgba(255,255,255,0.9)" numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>

      {children}
    </LinearGradient>
  );
}

/** Nút chuyển tab dạng viên thuốc, đặt ngay trong header gradient. */
export function HeaderTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        marginTop: S.md,
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderRadius: 999,
        padding: 4,
      }}
    >
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: on ? '#fff' : 'transparent',
            }}
          >
            <Txt size={13} weight="bold" color={on ? C.primaryDark : 'rgba(255,255,255,0.9)'}>
              {t.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
