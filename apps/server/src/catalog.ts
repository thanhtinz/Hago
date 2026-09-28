import { registry, withStandardMeta } from '@co/core';
import { caroEngine } from '@co/game-co-caro';
import { ganhEngine } from '@co/game-co-ganh';
import { quanEngine } from '@co/game-o-an-quan';

/**
 * Nơi duy nhất máy chủ cắm game vào.
 *
 * Giống hệt `catalog.ts` của app: cùng engine, cùng lớp bọc meta, cùng
 * registry. Hai bên **phải** dùng chung một bản luật, nếu không client vẽ
 * một đằng máy chủ xử một nẻo.
 */
registry.register(withStandardMeta(caroEngine));
registry.register(withStandardMeta(ganhEngine));
registry.register(withStandardMeta(quanEngine));
