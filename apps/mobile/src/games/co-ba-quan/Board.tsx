import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { BaQuanView } from '@co/game-co-ba-quan';
import { baQuanTheme as T, faceFor } from './theme';

/**
 * Bàn cờ ba quân — 9 điểm vạch trên đất.
 *
 * Chỉ vẽ đúng 8 đường thắng: 3 ngang, 3 dọc, 2 chéo qua tâm. Vẽ thêm đường
 * nào khác là nói dối về luật kề — người chơi đọc bàn cờ để biết quân đi
 * được tới đâu.
 */

export interface BaQuanBoardProps {
  view: BaQuanView;
  size: number;
  mySeat: number | null;
  /** Quân mình đang cầm lên, ở giai đoạn đi. */
  picked: number | null;
  onPick: (f: number | null) => void;
  /** Một nước hoàn chỉnh: thả (`f = -1`) hoặc dời (`f >= 0`). */
  onPlay: (f: number, t: number) => void;
  disabled?: boolean;
  hint?: { f: number; t: number } | null;
}

const SEGMENTS: [number, number][] = [
  [0, 2],
  [6, 8],
  [0, 6],
  [2, 8],
  [0, 8],
  [2, 6],
  [3, 5],
  [1, 7],
];

export function BaQuanBoard({ view, size, mySeat, picked, onPick, onPlay, disabled, hint }: BaQuanBoardProps) {
  const pad = size * 0.14;
  const span = size - pad * 2;
  const at = (i: number) => ({ x: pad + (i % 3) * (span / 2), y: pad + Math.floor(i / 3) * (span / 2) });
  const myTurn = !disabled && mySeat !== null && view.toMove === mySeat && view.winner === null && !view.drawn;
  const placing = mySeat !== null && view.placed[mySeat]! < 3;

  const targets = useMemo(() => {
    if (!myTurn || picked === null || mySeat === null) return new Set<number>();
    // Điểm kề trống của quân đang cầm — tính lại từ cùng bảng kề của engine
    // thì bàn cờ không bao giờ gợi ý một nước mà engine sẽ từ chối.
    const ADJ = [[1, 3, 4], [0, 2, 4], [1, 5, 4], [0, 6, 4], [0, 1, 2, 3, 5, 6, 7, 8], [2, 8, 4], [3, 7, 4], [6, 8, 4], [5, 7, 4]];
    return new Set((ADJ[picked] ?? []).filter((t) => view.cells[t] === -1));
  }, [myTurn, picked, mySeat, view.cells]);

  const winSet = useMemo(() => new Set(view.winLine ?? []), [view.winLine]);
  const hintTo = hint ? hint.t : null;

  return (
    <View style={{ width: size, height: size, backgroundColor: T.soil, borderRadius: 8 }}>
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} fill={T.soil} />
        {SEGMENTS.map(([a, b], k) => {
          const pa = at(a);
          const pb = at(b);
          return <Line key={k} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={T.line} strokeWidth={3} strokeLinecap="round" />;
        })}
        {Array.from({ length: 9 }, (_, i) => {
          const p = at(i);
          const seat = view.cells[i] ?? -1;
          return (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r={7} fill={T.soilDark} />
              {targets.has(i) ? <Circle cx={p.x} cy={p.y} r={13} fill="none" stroke={T.target} strokeWidth={2.4} /> : null}
              {hintTo === i && seat === -1 ? <Circle cx={p.x} cy={p.y} r={11} fill={T.pick} opacity={0.45} /> : null}
              {seat >= 0
                ? (() => {
                    const f = faceFor(seat);
                    const rad = size * 0.085;
                    return (
                      <>
                        <Circle cx={p.x} cy={p.y + 2.4} r={rad} fill={f.deep} />
                        <Circle cx={p.x} cy={p.y} r={rad} fill={f.face} stroke={f.rim} strokeWidth={1.4} />
                        {picked === i ? <Circle cx={p.x} cy={p.y} r={rad + 4} fill="none" stroke={T.pick} strokeWidth={2.6} /> : null}
                        {winSet.has(i) ? <Circle cx={p.x} cy={p.y} r={rad * 0.5} fill="none" stroke={T.pick} strokeWidth={2.4} /> : null}
                        {view.last?.t === i ? <Circle cx={p.x + rad * 0.72} cy={p.y - rad * 0.72} r={3.4} fill={T.pick} /> : null}
                      </>
                    );
                  })()
                : null}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 9 }, (_, i) => {
          const p = at(i);
          const seat = view.cells[i] ?? -1;
          const touch = size * 0.26;
          let label = `Điểm hàng ${Math.floor(i / 3) + 1} cột ${(i % 3) + 1}`;
          if (seat >= 0) label += `, quân ${seat === 0 ? 'sỏi' : 'sò'}`;
          const canTap = myTurn && (placing ? seat === -1 : seat === mySeat || targets.has(i));
          return (
            <Pressable
              key={i}
              disabled={!canTap}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => {
                if (placing) return onPlay(-1, i);
                if (seat === mySeat) return onPick(picked === i ? null : i);
                if (picked !== null && targets.has(i)) return onPlay(picked, i);
              }}
              style={{ position: 'absolute', left: p.x - touch / 2, top: p.y - touch / 2, width: touch, height: touch }}
            />
          );
        })}
      </View>
    </View>
  );
}
