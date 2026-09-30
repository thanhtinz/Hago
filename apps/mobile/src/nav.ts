import type { useRouter } from 'expo-router';

/**
 * Về sảnh mà **không dựng thêm một sảnh nữa**.
 *
 * `router.replace('/')` từ một màn được `push` lên trên sảnh chỉ thay màn trên
 * cùng: sảnh cũ vẫn nằm dưới, và app có hai sảnh cùng gắn vào cây. Hậu quả
 * thấy được ngay: mọi nút trong sảnh có hai bản, và mỗi màn chơi online mở
 * thêm một socket. Quay lui đúng cách thì sảnh chỉ có một.
 */
export function backToLobby(router: ReturnType<typeof useRouter>, params?: Record<string, string>): void {
  // `params` để sảnh mở sẵn một tấm khi vừa quay lui, ví dụ `?mo=phong`.
  // Quay lui bằng `back()` **không mang tham số theo**, nên có tham số thì
  // phải điều hướng thật — nhưng vẫn `dismissAll()` trước, để không bỏ lại
  // một ngăn xếp màn cũ dưới cái sảnh mới.
  if (params) {
    const q = new URLSearchParams(params).toString();
    if (router.canDismiss?.()) router.dismissAll();
    return router.replace(`/?${q}` as never);
  }
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
