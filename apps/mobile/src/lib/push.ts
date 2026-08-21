import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

/**
 * Đăng ký nhận push.
 *
 * App chạy bằng Expo nên lấy ExponentPushToken rồi gửi lên server; server đẩy
 * qua Expo Push Service, Expo lo phần chuyển tiếp sang FCM và APNs. Nhờ vậy
 * không phải nhúng khoá của Google hay Apple vào app hay server.
 *
 * Máy ảo không có push thật, và bản web thì trình duyệt lo thông báo theo cách
 * khác — cả hai trường hợp đều bỏ qua im lặng, không báo lỗi cho người chơi.
 */

let current: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Android bắt buộc có channel, không thì thông báo không kêu và không rung. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Thông báo Hago',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#7C6BFF',
  });
}

export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    // Chỉ hỏi quyền khi chưa từng hỏi; đã từ chối rồi thì tôn trọng, không hỏi lại.
    if (status !== 'granted' && existing.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

    await api('/api/push/register', { method: 'POST', body: { token, platform: Platform.OS } });
    current = token;
    return token;
  } catch {
    // Push hỏng thì app vẫn chạy bình thường, thông báo trong app không phụ thuộc.
    return null;
  }
}

/** Gỡ token khi đăng xuất, để máy này không nhận push của tài khoản cũ nữa. */
export async function unregisterPush(): Promise<void> {
  if (!current) return;
  try {
    await api('/api/push/unregister', { method: 'POST', body: { token: current } });
  } catch {
    /* đăng xuất không nên vì chuyện này mà hỏng */
  }
  current = null;
}
