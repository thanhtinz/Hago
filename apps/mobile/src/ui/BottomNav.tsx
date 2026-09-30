import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../net/api';
import { Icon, type IconName } from './Icon';
import { Txt, press } from './parts';
import { SurfaceFill } from './surface';
import { A, S } from './theme';

/**
 * Thanh điều hướng dưới cùng.
 *
 * Khối này từng nằm **bên trong** `app/index.tsx` và chỉ mọc ở đúng sảnh:
 * tức là nó không phải một thanh tab mà là một hàng liên kết riêng của sảnh
 * đang đóng giả thanh tab. Đi tới "Bộ môn" thì thanh biến mất, và người dùng
 * mất luôn đường tắt sang bốn mục còn lại — hậu quả là mọi màn đều phải có
 * một mũi tên lùi và mọi đường đi đều là đường một chiều.
 *
 * Năm mục, đúng trần của một thanh dưới. Nút lùi "Về sảnh" ở các màn kia
 * vẫn **giữ nguyên**: một thanh tab không làm nút lùi thành sai, và đổi hai
 * thứ trong một lần đẩy là cách chắc chắn nhất để không biết cái nào hỏng.
 */
export type NavTab = 'sanh' | 'bo-mon' | 'van' | 'bxh' | 'toi';

/** Chiều cao phần thân, chưa kể vùng an toàn. Màn nào có thanh thì chừa chỗ. */
export const NAV_H = 56;

export function BottomNav({ active, onHome }: { active: NavTab; onHome?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { me } = useAuth();
  const w = Math.min(width, 460);
  const h = NAV_H + insets.bottom;
  const items: { id: NavTab; icon: IconName; label: string; onPress: () => void }[] = [
    // Đang đứng ở sảnh mà bấm "Sảnh" thì không điều hướng nữa — nó cuộn lên
    // đầu, đúng thói quen của mọi thanh tab.
    { id: 'sanh', icon: 'home', label: 'Sảnh', onPress: () => (active === 'sanh' && onHome ? onHome() : router.push('/')) },
    { id: 'bo-mon', icon: 'grid', label: 'Bộ môn', onPress: () => router.push('/bo-mon') },
    { id: 'van', icon: 'door', label: 'Ván đấu', onPress: () => router.push('/van') },
    { id: 'bxh', icon: 'crown', label: 'Xếp hạng', onPress: () => router.push('/bxh') },
    { id: 'toi', icon: 'user', label: 'Tôi', onPress: () => router.push(me ? '/me' : '/auth') },
  ];
  return (
    <View style={{ height: h, flexDirection: 'row', overflow: 'hidden' }}>
      <SurfaceFill width={w} height={h} tone={1} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.2, backgroundColor: A.goldDeep, opacity: 0.6 }} />
      {items.map((it) => {
        const on = it.id === active;
        return (
          <Pressable
            key={it.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label}
            onPress={it.onPress}
            style={({ pressed }) => [
              { flex: 1, paddingTop: S.sm, paddingBottom: insets.bottom + S.sm, alignItems: 'center', gap: 3 },
              press({ pressed }),
            ]}
          >
            <Icon name={it.icon} size={21} color={on ? A.gold : A.inkFaint} />
            <Txt size={11} weight="semi" color={on ? A.gold : A.inkFaint}>
              {it.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
