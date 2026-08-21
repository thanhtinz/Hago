import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { ArtName, ArtShape, GAME_ART } from '../art/gameArt';

/**
 * Vẽ một asset trong trận.
 *
 * Hình lấy từ kho game-icons.net (CC BY 3.0) qua scripts/fetch-game-art.mjs —
 * không tự vẽ lại, nhờ vậy 7 game dùng chung một ngôn ngữ tạo hình.
 * Asset là silhouette một màu nên tô được theo phe, theo nền, theo trạng thái.
 */

const TAGS: Record<string, any> = {
  path: Path,
  circle: Circle,
  ellipse: Ellipse,
  rect: Rect,
  polygon: Polygon,
  polyline: Polyline,
};

/** '@' = tông chính, '#' = tông nổi (chữ/hình bên trong huy hiệu). */
function paint(node: { props: Readonly<Record<string, string>> }, color: string, hi: string) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node.props)) out[k] = v === '@' ? color : v === '#' ? hi : v;
  return out;
}

function draw(shape: ArtShape, color: string, hi: string, keyPrefix = '') {
  return shape.nodes.map((node, i) => {
    const Tag = TAGS[node.tag];
    return Tag ? <Tag key={`${keyPrefix}${i}`} {...paint(node, color, hi)} /> : null;
  });
}

/**
 * Vẽ hình của một asset vào trong một <Svg> có sẵn của người gọi, thay vì tự mở
 * <Svg> riêng — dùng khi cần đặt asset vào một cảnh chung (bàn cờ 2.5D) để nó
 * ăn theo phép chiếu của cảnh.
 */
export function artNodes(name: ArtName, color: string, hi = color, keyPrefix = '') {
  const shape: ArtShape | undefined = GAME_ART[name];
  return shape ? draw(shape, color, hi, keyPrefix) : null;
}

/** Cạnh khung nhìn gốc của asset, để tính tỉ lệ khi đặt vào cảnh. */
export function artSpan(name: ArtName): number {
  const shape: ArtShape | undefined = GAME_ART[name];
  return Number(shape?.viewBox.split(' ')[2]) || 512;
}

export function Art({
  name,
  size = 32,
  color = '#FFFFFF',
  hi = '#FFFFFF',
  opacity,
  shadow = false,
  glyph = false,
}: {
  name: ArtName;
  size?: number;
  color?: string;
  /** Tông nổi bên trong huy hiệu; đặt 'transparent' nếu chỉ muốn phần ruột. */
  hi?: string;
  opacity?: number;
  /** Bóng đổ vẽ ngay trong SVG — quân cờ trông như vật thể đặt trên bàn. */
  shadow?: boolean;
  /** Với asset huy hiệu: bỏ đĩa nền, chỉ lấy ký hiệu và tô bằng `color`. */
  glyph?: boolean;
}) {
  const shape: ArtShape | undefined = GAME_ART[name];
  const asGlyph = glyph && shape?.badge;
  const main = asGlyph ? 'transparent' : color;
  const inner = asGlyph ? color : hi;
  const body = useMemo(() => (shape ? draw(shape, main, inner) : null), [shape, main, inner]);
  const shade = useMemo(() => (shape && shadow ? draw(shape, asGlyph ? 'transparent' : '#000000', '#000000', 's') : null), [shape, shadow, asGlyph]);

  // Tên lạ (ví dụ sticker của bản cũ còn trong lịch sử chat) thì bỏ qua.
  if (!shape) return null;
  const span = Number(shape.viewBox.split(' ')[2]) || 512;
  const drop = span * 0.03;

  return (
    <Svg width={size} height={size} viewBox={shape.viewBox} opacity={opacity}>
      {shade ? (
        <G opacity={0.2} translateX={drop} translateY={drop * 1.5}>
          {shade}
        </G>
      ) : null}
      {body}
    </Svg>
  );
}

export type { ArtName };
