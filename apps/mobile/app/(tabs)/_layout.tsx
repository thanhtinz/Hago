import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S, softShadow } from '../../src/theme';
import { Txt } from '../../src/components/ui';
import { useStore } from '../../src/state/store';

const TABS: { name: string; label: string; icon: string }[] = [
  { name: 'index', label: 'Trang chủ', icon: '🏠' },
  { name: 'games', label: 'Game', icon: '🎲' },
  { name: 'social', label: 'Bạn bè', icon: '💬' },
  { name: 'shop', label: 'Cửa hàng', icon: '🛍️' },
  { name: 'profile', label: 'Hồ sơ', icon: '🐤' },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { unread } = useStore();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: C.surface,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingHorizontal: 6,
          borderTopLeftRadius: R.xl,
          borderTopRightRadius: R.xl,
          borderTopWidth: 2,
          borderColor: C.line,
        },
        softShadow(0.1, 20, -6),
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const badge = tab.name === 'social' && unread > 0 ? unread : 0;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 5,
                borderRadius: R.pill,
                backgroundColor: focused ? C.primarySoft : 'transparent',
              }}
            >
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{tab.icon}</Text>
              {badge > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 0,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    borderRadius: 8,
                    backgroundColor: C.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={10} weight="bold" color="#fff">
                    {badge > 9 ? '9+' : badge}
                  </Txt>
                </View>
              ) : null}
            </View>
            <Txt size={10} weight={focused ? 'bold' : 'medium'} color={focused ? C.primaryDark : C.inkFaint}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
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
