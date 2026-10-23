import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import type { HexView } from '@co/game-co-hex';
import { hexTheme as T, faceFor } from './theme';

/**
 * Bàn Hex — hình thoi lát gạch lục giác, mỗi hàng lệch phải nửa ô.
 *
 * Hình học phải khớp toạ độ axial của engine: ô `(r, c)` có tâm ở
 * `x = bước ngang × (c + r/2)`, `y = bước dọc × r` với lục giác nhọn đầu.
 * Vẽ thành lưới chữ nhật là vẽ sai game — hai ô trông kề nhau mà engine
 * bảo không kề, và ngược lại.
 *
 * Bốn mép bàn nhuộm màu hai bên ngay dưới lớp gạch: trên/dưới đỏ của ghế
 * 0, trái/phải xanh của ghế 1. Bàn tự nói mục tiêu của nó.
 */

export interface HexBoardProps {
  view: HexView;
  /** Chiều ngang bàn; chiều cao suy từ tỉ lệ hình thoi. */
  width: number;
  mySeat: number | null;
  onPlay: (at: number) => void;
  /** Nước đổi — chỉ gọi được khi `view.canSwap` và tới lượt người cầm máy. */
  onSwap?: () => void;
  disabled?: boolean;
  hint?: number | null;
}

const SQRT3 = Math.sqrt(3);

export function HexBoard({ view, width, mySeat, onPlay, onSwap, disabled, hint }: HexBoardProps) {
  const size = view.size;
  // R là bán kính một viên gạch. Tổng bề ngang = R·√3·(size + (size−1)/2 + 1)
  // tính cả hai nửa viên ở hai đầu hàng chéo nhất; bề cao = R·(1.5·(size−1) + 2).
  const R = width / (SQRT3 * (size + (size - 1) / 2 + 1));
  const height = R * (1.5 * (size - 1) + 2);
  const hexW = SQRT3 * R;
  const center = (i: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    return { x: hexW * (c + r / 2) + hexW / 2, y: R * (1.5 * r + 1) };
  };
  const corners = (i: number) => {
    const { x, y } = center(i);
    return [0, 1, 2, 3, 4, 5]
      .map((k) => {
        const ang = ((60 * k - 90) * Math.PI) / 180;
        return `${(x + R * 0.96 * Math.cos(ang)).toFixed(1)},${(y + R * 0.96 * Math.sin(ang)).toFixed(1)}`;
      })
      .join(' ');
  };

  const myTurn = !disabled && mySeat !== null && view.toMove === mySeat && view.winner === null;
  const showSwap = myTurn && view.canSwap && onSwap !== undefined;
  const winSet = useMemo(() => new Set(view.winPath ?? []), [view.winPath]);

  // Bốn dải bờ: hai hình bình hành đỏ ôm hàng đầu và hàng cuối, hai dải
  // xanh ôm cột đầu và cột cuối, vẽ dưới lớp gạch.
  const topLeft = center(0);
  const topRight = center(size - 1);
  const botLeft = center((size - 1) * size);
  const botRight = center(size * size - 1);
  const band = R * 0.9;
  const bands: { points: string; fill: string }[] = [
    {
      points: `${topLeft.x - hexW / 2},${topLeft.y - band} ${topRight.x + hexW / 2},${topRight.y - band} ${topRight.x + hexW / 2},${topRight.y} ${topLeft.x - hexW / 2},${topLeft.y}`,
      fill: T.redFace,
    },
    {
      points: `${botLeft.x - hexW / 2},${botLeft.y} ${botRight.x + hexW / 2},${botRight.y} ${botRight.x + hexW / 2},${botRight.y + band} ${botLeft.x - hexW / 2},${botLeft.y + band}`,
      fill: T.redFace,
    },
    {
      points: `${topLeft.x - band},${topLeft.y + R * 0.4} ${topLeft.x},${topLeft.y + R * 0.4} ${botLeft.x},${botLeft.y - R * 0.4} ${botLeft.x - band},${botLeft.y - R * 0.4}`,
      fill: T.blueFace,
    },
    {
      points: `${topRight.x},${topRight.y + R * 0.4} ${topRight.x + band},${topRight.y + R * 0.4} ${botRight.x + band},${botRight.y - R * 0.4} ${botRight.x},${botRight.y - R * 0.4}`,
      fill: T.blueFace,
    },
  ];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {bands.map((b, k) => (
          <Polygon key={k} points={b.points} fill={b.fill} opacity={0.85} />
        ))}
        {Array.from({ length: size * size }, (_, i) => {
          const seat = view.cells[i] ?? -1;
          const r = Math.floor(i / size);
          const c = i % size;
          const { x, y } = center(i);
          const fill = seat >= 0 ? faceFor(seat).face : (r + c) % 2 === 0 ? T.tile : T.tileAlt;
          return (
            <React.Fragment key={i}>
              <Polygon points={corners(i)} fill={fill} stroke={T.grout} strokeWidth={1.1} />
              {seat >= 0 ? (
                <Circle cx={x - R * 0.28} cy={y - R * 0.3} r={R * 0.16} fill="#FFFFFF" opacity={0.28} />
              ) : null}
              {hint === i && seat === -1 ? <Circle cx={x} cy={y} r={R * 0.42} fill={T.gold} opacity={0.55} /> : null}
              {winSet.has(i) ? <Polygon points={corners(i)} fill="none" stroke={T.gold} strokeWidth={2.6} /> : null}
              {view.last === i ? <Circle cx={x} cy={y} r={R * 0.13} fill={T.gold} stroke="#7A5A18" strokeWidth={0.8} /> : null}
            </React.Fragment>
          );
        })}
        {showSwap && view.last !== null ? (
          <SvgText
            x={center(view.last).x}
            y={center(view.last).y + R * 0.34}
            fontSize={R * 0.95}
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            ?
          </SvgText>
        ) : null}
      </Svg>

      <View style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: size * size }, (_, i) => {
          const { x, y } = center(i);
          const seat = view.cells[i] ?? -1;
          const r = Math.floor(i / size);
          const c = i % size;
          const canTap = myTurn && seat === -1;
          return (
            <Pressable
              key={i}
              disabled={!canTap}
              accessibilityRole="button"
              accessibilityLabel={`Ô hàng ${r + 1} cột ${c + 1}${seat >= 0 ? `, quân ${seat === 0 ? 'đỏ' : 'xanh'}` : ''}`}
              onPress={() => onPlay(i)}
              style={{ position: 'absolute', left: x - hexW / 2, top: y - R, width: hexW, height: 2 * R }}
            />
          );
        })}
      </View>

      {showSwap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi quân mở màn của đối thủ thành của mình"
          onPress={onSwap}
          style={{
            position: 'absolute',
            left: width / 2 - 74,
            bottom: -14,
            width: 148,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.blueFace,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.6,
            borderColor: T.gold,
            zIndex: 5,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' }}>Đổi quân này</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
