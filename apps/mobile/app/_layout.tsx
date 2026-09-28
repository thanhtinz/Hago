import React from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { A } from '../src/ui/theme';

/**
 * Khung ngoài cùng.
 *
 * Hai việc: nạp chữ, và trải mặt gỗ cho toàn app. Nền gỗ nằm ở đây chứ không
 * ở từng màn, nên cuộn màn này sang màn kia thì mặt bàn không đổi — cảm giác
 * là đi trong cùng một căn phòng, không phải nhảy giữa mấy trang rời.
 */
export default function RootLayout() {
  const [ready] = useFonts({
    Playfair: require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    PlayfairHeavy: require('../assets/fonts/PlayfairDisplay-ExtraBold.ttf'),
    BeVietnam: require('../assets/fonts/BeVietnamPro-Regular.ttf'),
    BeVietnamSemi: require('../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    BeVietnamBold: require('../assets/fonts/BeVietnamPro-Bold.ttf'),
  });

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
        {/* Chưa có chữ thì chưa vẽ: hiện bằng chữ hệ thống rồi nhảy sang chữ
            thật là cú giật thấy rõ ngay giây đầu tiên mở app. */}
        {/* Nền gỗ do từng màn tự trải, không trải ở đây: bộ điều hướng tự
            sơn một lớp nền của nó lên trên, nên nền đặt ở lớp ngoài cùng sẽ
            bị che — lỗi chỉ lộ ra ở khe giữa các tấm, nhìn lướt rất dễ bỏ
            qua. */}
        {ready ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: A.bg }, animation: 'fade' }} />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
