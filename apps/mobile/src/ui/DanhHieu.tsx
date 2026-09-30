import React from 'react';
import { View } from 'react-native';
import { conMayVan, danhHieuOf, thongThaoOf, type HangThanhTich } from '@co/protocol';
import { Tag, Txt } from './parts';
import { A } from './theme';

/**
 * Danh hiệu của một người ở **một bộ môn**.
 *
 * Luôn màu vàng — vàng là màu của sức mạnh trong app này, và nó phải khác
 * hẳn màu nhãn thông thạo ngay bên cạnh. Hai thứ ấy đứng cùng một hàng và
 * đo hai điều khác nhau; màu là thứ duy nhất phân biệt được chúng ngay lập
 * tức.
 *
 * Chưa đủ ván định hạng thì **không** vẽ một thẻ xám ghi "Chưa xếp hạng":
 * chỗ đó cần một câu nói rõ còn thiếu mấy ván, và câu đó là việc của màn
 * hình gọi, không phải của một cái thẻ. Trả về null để người gọi tự quyết.
 */
export function BacTag({ rating, ranked, testID }: { rating: number; ranked: number; testID?: string }) {
  const b = danhHieuOf(rating, ranked);
  if (!b) return null;
  return (
    <View testID={testID ?? 'danh-hieu'}>
      <Tag label={b.ten} color={A.gold} />
    </View>
  );
}

/** Danh hiệu, hoặc câu "còn mấy ván nữa" nếu chưa định hạng. */
export function BacHoacCho({ rating, ranked, size = 11.5 }: { rating: number; ranked: number; size?: number }) {
  const b = danhHieuOf(rating, ranked);
  if (b) return <BacTag rating={rating} ranked={ranked} />;
  return (
    <Txt size={size} color={A.inkFaint}>
      Còn {conMayVan(ranked)} ván định hạng
    </Txt>
  );
}

/**
 * Nhãn thông thạo của một bộ môn. Màu mờ, cố ý **không** phải màu vàng.
 *
 * Dưới nấc một thì không hiện gì: một nhãn rỗng trên mười ba thẻ là mười
 * ba nhãn rỗng, và mắt học rất nhanh cách bỏ qua chúng.
 */
export function ThongThaoTag({ row, so = false }: { row: HangThanhTich; so?: boolean }) {
  const t = thongThaoOf(row);
  if (!t.ten) return null;
  return (
    <View testID="thong-thao">
      <Tag label={so && t.toi ? `${t.ten} · ${t.diem}/${t.toi}` : t.ten} color={A.inkSoft} bg={A.panelHi} />
    </View>
  );
}
