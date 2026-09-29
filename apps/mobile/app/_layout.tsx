import React from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRestoreOnce } from '../src/net/api';
import { useLiveSession } from '../src/net/live';
import { ChallengeToast } from '../src/ui/ChallengeToast';
import { FloatingChat } from '../src/ui/FloatingChat';
import { A } from '../src/ui/theme';

/**
 * Khung ngoài cùng.
 *
 * Bốn việc: nạp chữ, khôi phục phiên, mở dây nối, và trải mặt gỗ cho toàn app.
 * Nền gỗ nằm ở đây chứ không ở từng màn, nên cuộn màn này sang màn kia thì
 * mặt bàn không đổi — cảm giác là đi trong cùng một căn phòng, không phải
 * nhảy giữa mấy trang rời.
 */
export default function RootLayout() {
  /**
   * Khôi phục phiên ở **lớp ngoài cùng**, không ở sảnh.
   *
   * Để trong sảnh thì mở thẳng một đường dẫn khác — `/me`, `/online/...`, hay
   * chỉ là bấm F5 khi đang ở trang cá nhân — sẽ không bao giờ chạy tới nó.
   * Hậu quả: `loading` treo mãi ở true và màn hình trắng trơn, không báo lỗi
   * gì để lần theo.
   */
  useRestoreOnce();
  // Một dây nối cho cả app, mở khi đăng nhập. Lời rủ đấu và tin nhắn đến khi
  // người dùng đang ở sảnh hay danh sách bạn, không phải chỉ lúc đang đánh.
  useLiveSession();

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
          <>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: A.bg }, animation: 'fade' }} />
            {/* Nút chat nằm **ngoài** bộ điều hướng: tin nhắn đến bất kỳ lúc
                nào, nên nó phải nổi trên mọi màn chứ không thuộc màn nào. */}
            <FloatingChat />
            {/* Lời rủ đấu hết hạn sau hai phút và bên kia đang ngồi chờ, nên
                nó phải nổi lên ở bất kỳ màn nào — không phải nằm im thành
                một chấm đỏ mà người dùng phải đoán ra rồi đi tìm. */}
            <ChallengeToast />
          </>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
