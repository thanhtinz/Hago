import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import { StoreProvider, useStore } from '../src/state/store';
import { C, F } from '../src/theme';
import { Toast } from '../src/components/Toast';
import { TournamentCall } from '../src/components/TournamentCall';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { ready, profile, socket } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    const inAuth = segments[0] === 'login' || segments[0] === 'register';
    if (!profile && !inAuth) router.replace('/login');
    if (profile && inAuth) router.replace('/');
  }, [ready, profile, segments, router]);

  /**
   * Trận của giải đấu đến lúc nào là vào lúc đó, người chơi có thể đang đứng ở
   * bất cứ màn nào — nên bắt ở gốc chứ không bắt trong từng màn. Trận thường và
   * trận đấu lại đã có màn của nó lo, ở đây bỏ qua.
   */
  useEffect(() => {
    if (!socket) return;
    const onStart = (m: any) => m?.tournamentId && router.replace(`/match/${m.matchId}`);
    socket.on('match.start', onStart);
    return () => {
      socket.off('match.start', onStart);
    };
  }, [socket, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: C.primary }}>Hago</Text>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  return (
    <>
      <Slot />
      {/* Lời gọi vào trận của giải phải nổi trên mọi màn, không chỉ trang bang. */}
      <TournamentCall />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_700Bold,
  });

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            backgroundColor: C.bg,
            // Mobile-first: trên web canh giữa với bề rộng điện thoại.
            ...(Platform.OS === 'web' ? { maxWidth: 480, width: '100%', alignSelf: 'center' } : null),
          }}
        >
          <Gate />
        </View>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
