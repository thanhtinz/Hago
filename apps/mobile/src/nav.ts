import type { useRouter } from 'expo-router';

/**
 * Về sảnh mà **không dựng thêm một sảnh nữa**.
 *
 * `router.replace('/')` từ một màn được `push` lên trên sảnh chỉ thay màn trên
 * cùng: sảnh cũ vẫn nằm dưới, và app có hai sảnh cùng gắn vào cây. Hậu quả
 * thấy được ngay: mọi nút trong sảnh có hai bản, và mỗi màn chơi online mở
 * thêm một socket. Quay lui đúng cách thì sảnh chỉ có một.
 */
export function backToLobby(router: ReturnType<typeof useRouter>): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
