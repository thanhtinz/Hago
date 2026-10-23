import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { LatView } from '@co/game-co-lat';
import { latTheme as T, faceFor } from './theme';

/**
 * Bàn cờ lật — nỉ xanh và quân hai mặt.
 *
 * Quân vẽ bằng hai vòng tròn lệch nhau một chút: vòng dưới là cạnh đĩa, vòng
 * trên là mặt đĩa có quầng sáng lệch về góc trên-trái. Một vòng tròn phẳng
 * thì đọc ra là chấm màu, không phải quân cờ hai mặt.
 *
 * Ô đặt được vẽ chấm nhỏ mờ ở giữa — người mới không nhìn ra nước nào kẹp
 * được quân, và luật của game này nằm cả ở những chấm đó.
 */

export interface LatBoardProps {
  view: LatView;
  size: number;
  /** Ghế của người đang cầm máy; null nghĩa là đang xem. */
  mySeat: number | null;
  onPlay: (r: number, c: number) => void;
  disabled?: boolean;
  hint?: { r: number; c: number } | null;
}

export function LatBoard({ view, size, mySeat, onPlay, disabled, hint }: LatBoardProps) {
  const n = 8;
  const cell = size / n;
  const myTurn = !disabled && mySeat !== null && view.toMove === mySeat && view.winner === null;
  const moveSet = useMemo(() => new Set(myTurn ? view.moves : []), [myTurn, view.moves]);
  const flipSet = useMemo(() => new Set(view.flipped), [view.flipped]);
  const hintIdx = hint ? hint.r * n + hint.c : null;

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: T.felt,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: T.feltDark,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="lat-felt" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={T.feltLit} />
            <Stop offset="0.55" stopColor={T.felt} />
            <Stop offset="1" stopColor={T.feltDark} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill="url(#lat-felt)" />
        {Array.from({ length: n + 1 }, (_, i) => {
          const p = i * cell;
          return (
            <React.Fragment key={i}>
              <Rect x={0} y={p - 0.5} width={size} height={1} fill={T.grid} />
              <Rect x={p - 0.5} y={0} width={1} height={size} fill={T.grid} />
            </React.Fragment>
          );
        })}

        {/* Chấm gợi ý nước đi được — chỉ hiện ở lượt của người cầm máy. */}
        {[...moveSet].map((i) => (
          <Circle
            key={`m${i}`}
            cx={(i % n) * cell + cell / 2}
            cy={Math.floor(i / n) * cell + cell / 2}
            r={cell * 0.11}
            fill={T.hintDot}
            opacity={hintIdx === i ? 0.95 : 0.5}
          />
        ))}

        {view.cells.map((seat, i) => {
          if (seat < 0) return null;
          const r = Math.floor(i / n);
          const c = i % n;
          const f = faceFor(seat);
          const cx = c * cell + cell / 2;
          const cy = r * cell + cell / 2;
          const rad = cell * 0.4;
          return (
            <React.Fragment key={i}>
              {view.last === i ? (
                <Circle cx={cx} cy={cy} r={rad + 2.5} fill="none" stroke={T.mark} strokeWidth={2} />
              ) : null}
              {/* Cạnh đĩa, rồi mặt đĩa, rồi quầng sáng. Quân vừa lật được
                  khoanh thêm một vòng mờ để mắt thấy bàn vừa đổi ở đâu. */}
              <Circle cx={cx} cy={cy + 1.6} r={rad} fill={f.deep} />
              <Circle cx={cx} cy={cy} r={rad} fill={f.face} stroke={f.rim} strokeWidth={1} />
              <Circle cx={cx - rad * 0.32} cy={cy - rad * 0.36} r={rad * 0.42} fill="#FFFFFF" opacity={seat === 0 ? 0.14 : 0.35} />
              {flipSet.has(i) ? <Circle cx={cx} cy={cy} r={rad * 0.55} fill="none" stroke={T.mark} strokeWidth={1.4} opacity={0.8} /> : null}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={{ position: 'absolute', inset: 0, flexDirection: 'column' }}>
        {Array.from({ length: n }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row', height: cell }}>
            {Array.from({ length: n }, (_, c) => {
              const i = r * n + c;
              const at = view.cells[i] ?? -1;
              const canTap = myTurn && moveSet.has(i);
              const label = at >= 0
                ? `Ô hàng ${r + 1} cột ${c + 1}, quân ${at === 0 ? 'đen' : 'trắng'}`
                : canTap
                  ? `Đặt vào hàng ${r + 1} cột ${c + 1}`
                  : `Ô hàng ${r + 1} cột ${c + 1}, trống`;
              return (
                <Pressable
                  key={c}
                  disabled={!canTap}
                  onPress={() => onPlay(r, c)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  style={{ width: cell, height: cell }}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
