import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { backToLobby } from '../src/nav';

/**
 * Đường dẫn cũ của màn chọn chế độ.
 *
 * Chọn chế độ **không còn là một màn**: nó là một tấm cao 88% mở ngay trên
 * sảnh, vì đó là thao tác lặp nhiều lần trong ngày và tính nó thành một lần
 * điều hướng là sai giá. Tệp này ở lại để mọi liên kết sâu cũ còn sống —
 * xoá route thì một liên kết đã lưu sẽ rơi vào màn "không tìm thấy".
 */
export default function ChoiScreen() {
  const router = useRouter();
  useEffect(() => {
    backToLobby(router, { mo: 'che-do' });
  }, [router]);
  return null;
}
