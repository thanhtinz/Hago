import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Nút quay lại cứng của Android đóng tấm đang mở, thay vì rời cả màn hình.
 *
 * Mọi hộp thoại trong app là **lớp phủ điều khiển bằng state**, không phải
 * một màn của expo-router — nên hệ điều hành không biết chúng tồn tại. Đang
 * mở hộp "Chịu thua ván này?" mà bấm nút quay lại thì rời luôn bàn cờ, và
 * rời bàn giữa ván là bỏ trận.
 *
 * `BackHandler` không làm gì trên iOS và trên web, nên gọi ở đâu cũng an
 * toàn — nhưng cũng chính vì thế mà **quy trình ảnh chụp bằng Chromium
 * không bao giờ bắt được lỗi này**. Đây là một trong số ít chỗ phải soi
 * bằng mắt thay vì bằng bài kiểm.
 *
 * Trả `true` từ hàm nghe nghĩa là "tôi xử lý rồi, đừng đi tiếp".
 */
export function useBackClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);
}
