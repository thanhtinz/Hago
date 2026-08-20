import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S, softShadow } from '../../src/theme';
import { Txt } from '../../src/components/ui';
import { Chibi } from '../../src/components/Chibi';
import { useStore } from '../../src/state/store';

/** 4 tab + nút Chơi nhanh nổi ở giữa, bố cục quen thuộc của app game casual. */
const TABS: { name: string; label: string; art: string }[] = [
  { name: 'index', label: 'Trang chủ', art: 'house' },
  { name: 'games', label: 'Game', art: 'joystick' },
  { name: 'social', label: 'Bạn bè', art: 'speech-bubble' },
  { name: 'profile', label: 'Hồ sơ', art: 'chick' },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unread } = useStore();
  const items = state.routes.filter((r: any) => TABS.some((t) => t.name === r.name));
  const half = Math.ceil(items.length / 2);

  const renderTab = (route: any) => {
    const tab = TABS.find((t) => t.name === route.name)!;
    const focused = state.routes[state.index]?.key === route.key;
    const badge = tab.name === 'social' && unread > 0 ? unread : 0;
    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 }}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Chibi name={tab.art} size={focused ? 25 : 22} opacity={focused ? 1 : 0.45} />
          {badge > 0 ? (
            <View
              style={{
                position: 'absolute',
                right: -10,
                top: -4,
                minWidth: 17,
                height: 17,
                paddingHorizontal: 4,
                borderRadius: 9,
                backgroundColor: C.danger,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: C.surface,
              }}
            >
              <Txt size={9} weight="bold" color="#fff">
                {badge > 9 ? '9+' : badge}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt size={10} weight={focused ? 'bold' : 'medium'} color={focused ? C.primaryDark : C.inkFaint}>
          {tab.label}
        </Txt>
        {focused ? <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: C.primary }} /> : <View style={{ height: 3 }} />}
      </Pressable>
    );
  };

  return (
    <View>
      {/* Nút Chơi nhanh nổi lên khỏi thanh nav */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: -26, alignItems: 'center', zIndex: 10 }}>
        <Pressable onPress={() => router.push('/quickplay')} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <LinearGradient
            colors={['#FF9A62', '#FF5E7D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              {
                width: 62,
                height: 62,
                borderRadius: 31,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: C.surface,
              },
              softShadow(0.26, 14, 6),
            ]}
          >
            <Chibi name="bolt" size={30} />
          </LinearGradient>
        </Pressable>
      </View>

      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: C.surface,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 2,
            borderColor: C.line,
          },
          softShadow(0.1, 20, -6),
        ]}
      >
        {items.slice(0, half).map(renderTab)}
        <View style={{ width: 76 }} />
        {items.slice(half).map(renderTab)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
