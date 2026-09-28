import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { CaroView } from '@co/game-co-caro';
import { caroTheme as T, inkFor } from './theme';

/**
 * Bàn cờ caro vẽ như trang vở ô ly.
 *
 * Toàn bộ là SVG: nét kẻ ô, nét bút, vệt dạ quang. Không ảnh nào cả, nên sắc
 * nét ở mọi mật độ điểm ảnh và tải về 0 byte.
 *
 * Quân cờ cố tình **méo mó không đều**: ba biến thể nét cho X và ba cho O,
 * chọn theo vị trí ô. Nếu mọi quân X giống hệt nhau thì mất ngay cảm giác
 * viết tay, mà đó là toàn bộ ý tưởng của bộ mặt này.
 */

const X_VARIANTS: [string, string][] = [
  ['M22 20 L78 80', 'M78 22 L20 78'],
  ['M20 24 Q50 48 76 78', 'M79 20 Q48 52 22 80'],
  ['M24 18 Q52 54 74 82', 'M80 24 Q46 46 19 76'],
];

const O_VARIANTS: string[] = [
  'M74 30 A28 28 0 1 0 76 62 A28 28 0 0 0 66 24',
  'M72 26 A30 28 0 1 0 78 60 A29 27 0 0 0 62 22',
  'M70 28 A27 29 0 1 0 79 58 A28 28 0 0 0 68 25',
];

export interface CaroBoardProps {
  view: CaroView;
  /** Cỡ cạnh bàn tính bằng điểm ảnh logic. */
  size: number;
  /** Ghế của người đang cầm máy; null nghĩa là đang xem. */
  mySeat: number | null;
  onPlay: (r: number, c: number) => void;
  disabled?: boolean;
  /** Ô đang được gợi ý, vẽ bằng nét chì mờ như người ta ướm thử. */
  hint?: { r: number; c: number } | null;
}

export function CaroBoard({ view, size, mySeat, onPlay, disabled, hint }: CaroBoardProps) {
  const n = view.size;
  const cell = size / n;

  const lines = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i <= n; i++) {
      // Nét đậm mỗi 5 ô: người chơi caro đếm chuỗi bằng mắt, mốc 5 giúp
      // nhìn ra "còn thiếu mấy quân" mà không phải đếm từng ô.
      const major = i % 5 === 0;
      const stroke = major ? T.gridMajor : T.grid;
      const w = major ? 1.4 : 0.8;
      const p = i * cell;
      out.push(<Line key={`h${i}`} x1={0} y1={p} x2={size} y2={p} stroke={stroke} strokeWidth={w} />);
      out.push(<Line key={`v${i}`} x1={p} y1={0} x2={p} y2={size} stroke={stroke} strokeWidth={w} />);
    }
    return out;
  }, [n, cell, size]);

  /**
   * Sợi giấy lấm tấm. Cố định theo hạt giống chứ không `Math.random`: mỗi lần
   * vẽ lại mà hạt giấy nhảy chỗ thì cả trang giấy trông như đang nhiễu.
   */
  const fibres = useMemo(() => {
    let x = 20260928;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    return Array.from({ length: 90 }, (_, i) => (
      <Circle
        key={i}
        cx={rnd() * size}
        cy={rnd() * size}
        r={0.3 + rnd() * 0.8}
        fill={T.fibre}
        opacity={0.1 + rnd() * 0.22}
      />
    ));
  }, [size]);

  const winSet = useMemo(() => new Set(view.winLine ?? []), [view.winLine]);

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: T.paper,
        borderRadius: 4,
        // Trang giấy đặt trên mặt bàn gỗ: viền mảnh và bóng rất nhẹ, đủ để
        // tách khỏi nền chứ không làm nó thành một tấm thẻ nổi.
        borderWidth: 1,
        borderColor: T.paperShade,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          {/* Giấy thật không phải một mảng màu phẳng: sáng ở giữa, ngả vàng
              về mép, tối nhẹ ở góc dưới nơi trang giấy cong lên. */}
          <LinearGradient id="caro-paper" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={T.paperLit} />
            <Stop offset="0.55" stopColor={T.paper} />
            <Stop offset="1" stopColor={T.paperShade} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill="url(#caro-paper)" />
        {fibres}
        {lines}
        {/* Không kẻ lề đỏ ở đây. Trên trang vở thật nó là đường lề, nhưng đặt
            lên bàn cờ thì nó cắt ngang vùng chơi và người ta tưởng là một
            ranh giới có ý nghĩa luật. Chất giấy vở đã đủ đến từ màu nền, nét
            kẻ ô xanh và nét mực; kẻ lề chỉ còn dùng ở thẻ ngoài sảnh. */}

        {/* Vệt dạ quang dưới chuỗi thắng, vẽ trước quân để không che nét bút. */}
        {view.winLine && view.winLine.length >= 2
          ? (() => {
              const first = view.winLine[0]!;
              const last = view.winLine[view.winLine.length - 1]!;
              const x1 = (Math.floor(first % n) + 0.5) * cell;
              const y1 = (Math.floor(first / n) + 0.5) * cell;
              const x2 = (Math.floor(last % n) + 0.5) * cell;
              const y2 = (Math.floor(last / n) + 0.5) * cell;
              // Hai nhát bút dạ chồng lên nhau: nhát rộng phủ hết chuỗi,
              // nhát hẹp đậm hơn ở giữa. Một nhát đều tăm tắp trông như
              // thanh nền tô sẵn, không ra vệt bút.
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.hypot(dx, dy) || 1;
              const ix = (dx / len) * cell * 0.18;
              const iy = (dy / len) * cell * 0.18;
              return (
                <G>
                  <Line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={T.highlight}
                    strokeWidth={cell * 0.86}
                    strokeLinecap="round"
                    opacity={0.92}
                  />
                  <Line
                    x1={x1 + ix}
                    y1={y1 + iy + cell * 0.06}
                    x2={x2 - ix}
                    y2={y2 - iy + cell * 0.06}
                    stroke={T.highlightDeep}
                    strokeWidth={cell * 0.5}
                    strokeLinecap="round"
                    opacity={0.5}
                  />
                </G>
              );
            })()
          : null}

        {/* Gợi ý vẽ bằng nét chì mờ, không phải mực: nó là nước *ướm thử*,
            chưa phải nước đã đi. Vẽ đậm bằng mực thì nhìn thoáng qua tưởng
            mình đã đánh rồi. */}
        {hint ? (
          <G>
            <Rect
              x={hint.c * cell + cell * 0.08}
              y={hint.r * cell + cell * 0.08}
              width={cell * 0.84}
              height={cell * 0.84}
              rx={cell * 0.16}
              fill={T.highlight}
              opacity={0.45}
            />
            <Rect
              x={hint.c * cell + cell * 0.08}
              y={hint.r * cell + cell * 0.08}
              width={cell * 0.84}
              height={cell * 0.84}
              rx={cell * 0.16}
              stroke={T.pencil}
              strokeWidth={1.6}
              strokeDasharray={`${cell * 0.16} ${cell * 0.1}`}
              fill="none"
            />
          </G>
        ) : null}

        {view.cells.map((seat, i) => {
          if (seat < 0) return null;
          const r = Math.floor(i / n);
          const c = i % n;
          const variant = (r * 7 + c * 3) % 3;
          const ink = inkFor(seat);
          const isLast = view.last === i;
          const scale = (cell * 0.8) / 100;
          const ox = c * cell + cell * 0.1;
          const oy = r * cell + cell * 0.1;
          return (
            <G key={i} transform={`translate(${ox}, ${oy}) scale(${scale})`}>
              {/* Mỗi nét vẽ hai lần: một nét rộng rất nhạt cho mực loang vào
                  thớ giấy, rồi nét chính đè lên. Một nét đơn trông như đường
                  vector, hai nét thì ra bút bi. */}
              {(seat === 0 ? X_VARIANTS[variant]! : [O_VARIANTS[variant]!]).map((d, k) => (
                <G key={k}>
                  <Path d={d} stroke={ink} strokeWidth={16} strokeLinecap="round" fill="none" opacity={0.16} />
                  <Path
                    d={d}
                    stroke={ink}
                    strokeWidth={11}
                    strokeLinecap="round"
                    fill="none"
                    opacity={winSet.has(i) ? 1 : 0.93}
                  />
                  <Path d={d} stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.1} />
                </G>
              ))}
              {/* Chấm chì nhỏ đánh dấu nước vừa đi — như khi đánh dấu trên vở. */}
              {isLast ? <Path d="M50 96 l0 0" stroke={T.pencil} strokeWidth={14} strokeLinecap="round" /> : null}
            </G>
          );
        })}
      </Svg>

      {/* Lớp chạm nằm trên SVG: một ô một vùng chạm, đúng 44px trở lên ở bàn
          15×15 trên màn hình điện thoại thường. */}
      <View style={{ position: 'absolute', inset: 0, flexDirection: 'column' }}>
        {Array.from({ length: n }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row', height: cell }}>
            {Array.from({ length: n }, (_, c) => {
              const taken = (view.cells[r * n + c] ?? -1) >= 0;
              const canTap = !disabled && !taken && mySeat !== null && view.toMove === mySeat && view.winner === null;
              return (
                <Pressable
                  key={c}
                  disabled={!canTap}
                  onPress={() => onPlay(r, c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ô hàng ${r + 1} cột ${c + 1}`}
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
