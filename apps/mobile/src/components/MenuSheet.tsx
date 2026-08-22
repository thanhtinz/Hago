import React from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Txt } from './ui';
import { Icon, IconName } from './Icon';
import { PlayerTitle } from './Cosmetic';
import { C, R, S, softShadow } from '../theme';
import { useStore } from '../state/store';

/**
 * Menu trượt từ mép phải.
 *
 * Hồ sơ trước đây bày bảy nút điều hướng thành một khối lộn xộn ngay giữa
 * trang, đẩy phần thống kê và thành tựu xuống dưới. Gom hết vào đây thì trang
 * hồ sơ trở lại đúng việc của nó, còn lối đi tới các màn khác nằm gọn sau một
 * nút.
 */
export interface MenuItem {
  label: string;
  icon: IconName;
  route: string;
  /** Số nhỏ nằm bên phải, ví dụ số thông báo chưa đọc. */
  badge?: number;
}

export function MenuSheet({
  visible,
  items,
  onClose,
  onPick,
  onLogout,
}: {
  visible: boolean;
  items: MenuItem[];
  onClose: () => void;
  onPick: (route: string) => void;
  onLogout?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useStore();
  const panel = Math.min(310, width * 0.82);

  const slide = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Chạm ra ngoài là đóng — thói quen quen thuộc của menu kiểu này */}
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Đóng menu">
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: C.overlay,
            opacity: slide,
          }}
        />
      </Pressable>

      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: panel,
            backgroundColor: C.surface,
            borderTopLeftRadius: 26,
            borderBottomLeftRadius: 26,
            paddingTop: insets.top + S.lg,
            paddingBottom: Math.max(insets.bottom, S.md),
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [panel, 0] }) }],
          },
          softShadow(0.22, 24, 0),
        ]}
      >
        <View style={{ paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Avatar seed={profile?.avatarSeed} styleName={profile?.avatarStyle} frameId={profile?.frameId} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} weight="display" numberOfLines={1}>
              {profile?.displayName ?? ''}
            </Txt>
            <PlayerTitle titleId={profile?.titleId} size={10} />
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Đóng menu">
            <Icon name="close" size={20} color={C.inkFaint} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingVertical: S.md }}>
          {items.map((it) => (
            <Pressable
              key={it.route}
              onPress={() => onPick(it.route)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: S.md,
                // Vùng chạm cao 52px, thoải mái cho ngón tay.
                minHeight: 52,
                paddingHorizontal: S.lg,
                backgroundColor: pressed ? C.surfaceAlt : 'transparent',
              })}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: R.md,
                  backgroundColor: C.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={it.icon} size={18} color={C.inkSoft} strokeWidth={2.2} />
              </View>
              <Txt size={14} weight="bold" style={{ flex: 1 }}>
                {it.label}
              </Txt>
              {it.badge ? (
                <View
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    backgroundColor: C.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={11} weight="bold" color="#fff">
                    {it.badge > 99 ? '99+' : it.badge}
                  </Txt>
                </View>
              ) : null}
              <Icon name="chevron-right" size={16} color={C.inkFaint} />
            </Pressable>
          ))}
        </ScrollView>

        {onLogout ? (
          <Pressable
            onPress={onLogout}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.md,
              minHeight: 52,
              paddingHorizontal: S.lg,
              borderTopWidth: 2,
              borderColor: C.line,
              backgroundColor: pressed ? 'rgba(238,90,90,0.12)' : 'transparent',
            })}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: R.md,
                backgroundColor: 'rgba(238,90,90,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="logout" size={18} color={C.danger} strokeWidth={2.2} />
            </View>
            <Txt size={14} weight="bold" color={C.danger}>
              Đăng xuất
            </Txt>
          </Pressable>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

/** Nút ba vạch mở menu, kèm chấm đỏ khi có thông báo chưa đọc. */
export function MenuButton({ onPress, badge }: { onPress: () => void; badge?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={badge ? `Mở menu, ${badge} thông báo chưa đọc` : 'Mở menu'}
      style={{
        width: 40,
        height: 40,
        borderRadius: R.md,
        backgroundColor: 'rgba(255,255,255,0.24)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="menu" size={22} color="#fff" strokeWidth={2.4} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            right: 5,
            top: 5,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: C.danger,
            borderWidth: 1.5,
            borderColor: '#fff',
          }}
        />
      ) : null}
    </Pressable>
  );
}
