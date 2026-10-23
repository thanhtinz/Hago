import { registry, withStandardMeta } from '@co/core';
import { caroEngine } from '@co/game-co-caro';
import { ganhEngine } from '@co/game-co-ganh';
import { latEngine } from '@co/game-co-lat';
import { baQuanEngine } from '@co/game-co-ba-quan';
import { hexEngine } from '@co/game-co-hex';
import { quanEngine } from '@co/game-o-an-quan';

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

export const quanMeta = withStandardMeta(quanEngine);

export const latMeta = withStandardMeta(latEngine);

export const baQuanMeta = withStandardMeta(baQuanEngine);

export const hexMeta = withStandardMeta(hexEngine);

registry.register(caroMeta);
registry.register(ganhMeta);
registry.register(quanMeta);
registry.register(latMeta);
registry.register(baQuanMeta);
registry.register(hexMeta);
