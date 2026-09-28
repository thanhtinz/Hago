import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { A } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          backgroundColor: A.bg,
          // Trên web canh giữa theo bề ngang điện thoại: đây là app di động,
          // xem trên trình duyệt chỉ để kiểm tra chứ không phải bản web thật.
          ...(Platform.OS === 'web' ? { maxWidth: 460, width: '100%', alignSelf: 'center' } : null),
        }}
      >
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: A.bg } }} />
      </View>
    </SafeAreaProvider>
  );
}
