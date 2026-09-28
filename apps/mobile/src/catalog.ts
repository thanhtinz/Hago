import { registry, withStandardMeta } from '@co/core';
import { caroEngine } from '@co/game-co-caro';

/**
 * Nơi duy nhất các game được cắm vào. Lõi không biết tên game nào — mỗi game
 * tự khai `spec`, sảnh render từ đó. Thêm game thứ mười là thêm một dòng ở
 * đây, không phải sửa giao diện.
 */
registry.register(withStandardMeta(caroEngine));

/**
 * Game chưa làm xong vẫn hiện trong sảnh, nhưng ghi rõ "sắp có". Giấu đi thì
 * người dùng không biết nền tảng đi tới đâu; hiện mà không ghi chú thì thành
 * lời hứa hão.
 */
export interface ComingSoon {
  id: string;
  nameVi: string;
  taglineVi: string;
  accent: string;
  material: string;
}

export const COMING_SOON: ComingSoon[] = [
  { id: 'co-ganh', nameVi: 'Cờ Gánh', taglineVi: 'Cờ dân gian Quảng Nam, vây là gánh', accent: '#B5651D', material: 'Sân gạch' },
  { id: 'o-an-quan', nameVi: 'Ô Ăn Quan', taglineVi: 'Rải sỏi, ăn quan, hết quan tàn dân', accent: '#7A9E5C', material: 'Sỏi đất' },
  { id: 'co-tuong', nameVi: 'Cờ Tướng', taglineVi: 'Pháo qua sông, tướng không lộ mặt', accent: '#A33B2A', material: 'Gỗ tre' },
  { id: 'co-vua', nameVi: 'Cờ Vua', taglineVi: 'Cờ quốc tế, quân đá cẩm thạch', accent: '#6E7B8B', material: 'Đá' },
  { id: 'co-up', nameVi: 'Cờ Úp', taglineVi: 'Quân úp sấp, lật lên mới biết là gì', accent: '#8A6A3B', material: 'Gỗ sẫm' },
  { id: 'co-ca-ngua', nameVi: 'Cờ Cá Ngựa', taglineVi: 'Bốn người, xúc xắc, về chuồng trước là thắng', accent: '#2E8B8B', material: 'Nhựa bóng' },
  { id: 'co-vay', nameVi: 'Cờ Vây', taglineVi: 'Vây đất, bắt khí, ván cờ dài nhất', accent: '#4C4740', material: 'Gỗ kaya' },
  { id: 'co-ty-phu', nameVi: 'Cờ Tỷ Phú', taglineVi: 'Mua đất, thu tiền, đấu giá kín', accent: '#C64B8C', material: 'Bìa cứng' },
];
