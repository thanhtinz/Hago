import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { ArtName, ArtNode, ArtShape, GAME_ART } from '../art/gameArt';

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
function paint(node: { props: Record<string, string> }, color: string, hi: string) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node.props)) out[k] = v === '@' ? color : v === '#' ? hi : v;
  return out;
}

export function Art({
  name,
  size = 32,
  color = '#FFFFFF',
  hi = '#FFFFFF',
  opacity,
}: {
  name: ArtName;
  size?: number;
  color?: string;
  /** Tông nổi bên trong huy hiệu; đặt 'transparent' nếu chỉ muốn phần ruột. */
  hi?: string;
  opacity?: number;
}) {
  const shape: ArtShape | undefined = GAME_ART[name];
  const children = useMemo(
    () =>
      (shape?.nodes ?? []).map((node, i) => {
        const Tag = TAGS[node.tag];
        return Tag ? <Tag key={i} {...paint(node, color, hi)} /> : null;
      }),
    [shape, color, hi],
  );
  // Tên lạ (ví dụ sticker của bản cũ còn trong lịch sử chat) thì bỏ qua.
  if (!shape) return null;
  return (
    <Svg width={size} height={size} viewBox={shape.viewBox} opacity={opacity}>
      {children}
    </Svg>
  );
}

export type { ArtName };
