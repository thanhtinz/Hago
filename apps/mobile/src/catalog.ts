import { registry, withStandardMeta } from '@co/core';
import { caroEngine } from '@co/game-co-caro';
import { ganhEngine } from '@co/game-co-ganh';

/**
 * Nơi duy nhất các game được cắm vào. Lõi không biết tên game nào — mỗi game
 * tự khai `spec`, sảnh render từ đó. Thêm game thứ mười là thêm một dòng ở
 * đây, không phải sửa giao diện.
 */
/**
 * Engine đã bọc lớp meta: đầu hàng, cầu hoà, hết giờ đi chung một đường với
 * nước cờ, nên màn chơi không phải tự chế cờ `isResigned` bên ngoài state.
 */
export const caroMeta = withStandardMeta(caroEngine);

export const ganhMeta = withStandardMeta(ganhEngine);

registry.register(caroMeta);
registry.register(ganhMeta);
