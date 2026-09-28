import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { QuanView } from '@co/game-o-an-quan';
import { quanTheme as T } from './theme';

/**
 * Bàn ô ăn quan.
 *
 * Bàn là một **vòng khép kín 12 ô** nhưng vẽ ra thì là hình chữ nhật mười ô
 * cộng hai hình bán nguyệt hai đầu. Thứ tự vòng phải đúng hình học thật:
 * hàng dưới đọc trái sang phải (1→5), vào quan Đông bên phải (6), rồi hàng
 * trên đọc **phải sang trái** (7→11), rồi về quan Tây bên trái (0). Đánh số
 * hàng trên cùng chiều với hàng dưới là sai và làm lệch mọi ván.
 *
 * Sỏi luôn kèm **con số**. Đếm mười bốn viên sỏi bằng mắt là chuyện không
 * làm được, mà cả game là đếm.
 */

/** Vị trí trên màn theo thứ tự vòng: 0 quan trái, 1..5 hàng dưới, 6 quan phải, 7..11 hàng trên phải sang trái. */
const RING = 12;

export interface QuanBoardProps {
  view: QuanView;
  width: number;
  /** Bên của người cầm máy: 0 hàng dưới, 1 hàng trên. -1 là đang xem. */
  mySide: number;
  picked: number | null;
  onPick: (cell: number | null) => void;
  onSow: (cell: number, dir: 1 | -1) => void;
  disabled?: boolean;
  hint?: { cell: number; dir: 1 | -1 } | null;
}

export function QuanBoard({ view, width, mySide, picked, onPick, onSow, disabled, hint }: QuanBoardProps) {
  const H = width * 0.56;
  const quanW = width * 0.15;
  const cellW = (width - quanW * 2) / 5;
  const cellH = H / 2;

  /**
   * Xoay bàn nửa vòng khi người cầm máy ngồi hàng trên. Vòng 12 ô nên nửa
   * vòng đúng bằng `+6`, và phép xoay đó giữ nguyên chiều rải — mũi tên
   * sang phải vẫn là chiều `+1` ở cả hai cách ngồi.
   */
  const flip = mySide === 1;
  const real = (screen: number) => (flip ? (screen + 6) % RING : screen);

  /** Tâm của một vị trí trên màn. */
  const centre = (screen: number): [number, number] => {
    if (screen === 0) return [quanW * 0.52, H / 2];
    if (screen === 6) return [width - quanW * 0.52, H / 2];
    if (screen <= 5) return [quanW + (screen - 1) * cellW + cellW / 2, H / 2 + cellH / 2];
    return [quanW + (11 - screen) * cellW + cellW / 2, cellH / 2];
  };

  const pebbles = useMemo(() => {
    let x = 20260929;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    // Vị trí sỏi cố định theo hạt giống: mỗi ô có sẵn một chùm toạ độ, vẽ
    // bao nhiêu viên thì lấy bấy nhiêu toạ độ đầu. Nhờ vậy thêm một viên
    // vào ô không làm cả đống sỏi nhảy chỗ.
    return Array.from({ length: RING }, () =>
      Array.from({ length: 12 }, () => [rnd() * 2 - 1, rnd() * 2 - 1] as [number, number]),
    );
  }, []);

  const eaten = new Set(view.trail.filter((e) => e.t === 'capture').map((e) => (e as { cell: number }).cell));

  return (
    <View style={{ width, height: H, borderRadius: 12, overflow: 'hidden', backgroundColor: T.ground }}>
      <Svg width={width} height={H}>
        <Defs>
          <RadialGradient id="quan-ground" cx="0.4" cy="0.3" r="0.9">
            <Stop offset="0" stopColor={T.groundLit} />
            <Stop offset="1" stopColor={T.groundDark} />
          </RadialGradient>
          <LinearGradient id="quan-pit" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={T.pitDark} />
            <Stop offset="0.35" stopColor={T.pit} />
            <Stop offset="1" stopColor={T.pit} />
          </LinearGradient>
          <RadialGradient id="quan-peb" cx="0.34" cy="0.3" r="0.8">
            <Stop offset="0" stopColor={T.pebbleLit} />
            <Stop offset="1" stopColor={T.pebble} />
          </RadialGradient>
          <RadialGradient id="quan-big" cx="0.34" cy="0.28" r="0.8">
            <Stop offset="0" stopColor={T.quanStone} />
            <Stop offset="1" stopColor={T.quanStoneDark} />
          </RadialGradient>
          {/* Cắt theo đúng hình bán nguyệt. Ô quan hẹp dần về hai đầu, nên
              dù tính toạ độ sỏi khéo đến mấy thì một ô mười mấy dân vẫn có
              viên thò ra ngoài vòng cung — cắt là cách duy nhất chắc chắn. */}
          <ClipPath id="clip-west">
            <Path d={`M${quanW} 0 A ${quanW} ${H / 2} 0 0 0 ${quanW} ${H} Z`} />
          </ClipPath>
          <ClipPath id="clip-east">
            <Path d={`M${width - quanW} 0 A ${quanW} ${H / 2} 0 0 1 ${width - quanW} ${H} Z`} />
          </ClipPath>
        </Defs>
        <Rect x={0} y={0} width={width} height={H} fill="url(#quan-ground)" />

        {/* Lòng ô trũng xuống: tối ở mép trên, sáng dần xuống đáy. */}
        <Path d={`M${quanW} 0 A ${quanW} ${H / 2} 0 0 0 ${quanW} ${H} Z`} fill="url(#quan-pit)" />
        <Path d={`M${width - quanW} 0 A ${quanW} ${H / 2} 0 0 1 ${width - quanW} ${H} Z`} fill="url(#quan-pit)" />
        <Rect x={quanW} y={0} width={width - quanW * 2} height={H} fill="url(#quan-pit)" />

        {/* Nét phấn chia ô. */}
        <G stroke={T.chalk} strokeWidth={width * 0.006} fill="none" strokeLinecap="round">
          <Path d={`M${quanW} 0 H${width - quanW} M${quanW} ${cellH} H${width - quanW} M${quanW} ${H} H${width - quanW}`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Path key={i} d={`M${quanW + i * cellW} 0 V${H}`} />
          ))}
          <Path d={`M${quanW} 0 A ${quanW} ${H / 2} 0 0 0 ${quanW} ${H}`} />
          <Path d={`M${width - quanW} 0 A ${quanW} ${H / 2} 0 0 1 ${width - quanW} ${H}`} />
        </G>

        {Array.from({ length: RING }, (_, screen) => {
          const i = real(screen);
          const cell = view.cells[i]!;
          const [cx, cy] = centre(screen);
          const isQuanCell = screen === 0 || screen === 6;
          const rPeb = width * 0.019;
          // Ô quan là hình bán nguyệt, càng ra xa tâm theo chiều dọc thì
          // càng hẹp. Rải sỏi theo cùng độ giãn như ô vuông là sỏi tràn ra
          // ngoài vòng cung, trông như rơi sang ô bên cạnh.
          const spread = isQuanCell ? [quanW * 0.2, H * 0.14] : [cellW * 0.3, cellH * 0.28];
          const shown = Math.min(cell.dan, isQuanCell ? 8 : 12);
          return (
            <G key={screen} clipPath={screen === 0 ? 'url(#clip-west)' : screen === 6 ? 'url(#clip-east)' : undefined}>
              {eaten.has(i) ? (
                <Ellipse cx={cx} cy={cy} rx={(isQuanCell ? quanW : cellW) * 0.42} ry={cellH * 0.38} fill={T.eaten} opacity={0.22} />
              ) : null}
              {cell.quan > 0 ? (
                <G>
                  <Ellipse cx={cx} cy={cy + width * 0.02} rx={width * 0.035} ry={width * 0.013} fill="#4A3A22" opacity={0.3} />
                  <Circle cx={cx} cy={cy - width * 0.005} r={width * 0.038} fill="url(#quan-big)" />
                </G>
              ) : null}
              {Array.from({ length: shown }, (_, k) => {
                const [jx, jy] = pebbles[screen]![k]!;
                return (
                  <Circle
                    key={k}
                    cx={cx + jx * spread[0]!}
                    cy={cy + jy * spread[1]! + (cell.quan > 0 ? H * 0.19 : 0)}
                    r={rPeb}
                    fill="url(#quan-peb)"
                  />
                );
              })}
              {cell.dan > 0 ? (
                <SvgText
                  x={cx}
                  y={cy + (isQuanCell ? H * 0.38 : cellH * 0.42)}
                  fontSize={width * 0.036}
                  fill="#3A2E1C"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {cell.dan}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {/* Ô đang chọn, và nước được gợi ý. */}
        {[picked !== null ? { cell: picked, tone: T.pick, dash: undefined } : null, hint ? { cell: hint.cell, tone: T.hint, dash: '6 5' } : null]
          .filter(Boolean)
          .map((m, k) => {
            const mark = m as { cell: number; tone: string; dash?: string };
            const screen = flip ? (mark.cell + 6) % RING : mark.cell;
            const [cx, cy] = centre(screen);
            return (
              <Rect
                key={k}
                x={cx - cellW * 0.46}
                y={cy - cellH * 0.44}
                width={cellW * 0.92}
                height={cellH * 0.88}
                rx={8}
                stroke={mark.tone}
                strokeWidth={3}
                strokeDasharray={mark.dash}
                fill="none"
              />
            );
          })}
      </Svg>

      {/* Lớp chạm: chỉ năm ô của mình bấm được. */}
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {[1, 2, 3, 4, 5].map((screen) => {
          const i = real(screen);
          const [cx, cy] = centre(screen);
          const can = !disabled && mySide >= 0 && view.cells[i]!.dan > 0;
          return (
            <Pressable
              key={screen}
              accessibilityRole="button"
              accessibilityLabel={`Ô của bạn số ${screen}, ${view.cells[i]!.dan} dân`}
              disabled={!can}
              onPress={() => onPick(picked === i ? null : i)}
              style={{ position: 'absolute', left: cx - cellW / 2, top: cy - cellH / 2, width: cellW, height: cellH }}
            />
          );
        })}

        {/* Hai mũi tên chọn chiều rải, hiện ngay trên ô vừa chọn. */}
        {picked !== null
          ? ([-1, 1] as const).map((dir) => {
              const screen = flip ? (picked + 6) % RING : picked;
              const [cx, cy] = centre(screen);
              const dx = dir === 1 ? cellW * 0.52 : -cellW * 0.52;
              const size = Math.max(44, cellW * 0.7);
              return (
                <Pressable
                  key={dir}
                  accessibilityRole="button"
                  accessibilityLabel={dir === 1 ? 'Rải sang phải' : 'Rải sang trái'}
                  onPress={() => onSow(picked, dir)}
                  style={{
                    position: 'absolute',
                    left: cx + dx - size / 2,
                    top: cy - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1A1008EE',
                    borderWidth: 2,
                    borderColor: T.pick,
                  }}
                >
                  <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                      d={dir === 1 ? 'M9 5 L16 12 L9 19' : 'M15 5 L8 12 L15 19'}
                      stroke={T.pick}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </Pressable>
              );
            })
          : null}
      </View>
    </View>
  );
}
