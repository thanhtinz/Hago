import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { QuanView } from '@co/game-o-an-quan';
import { quanTheme as T } from './theme';

/**
 * Bàn ô ăn quan — vạch phấn trên nền đất, **không có khung**.
 *
 * Đây là điểm khác biệt lớn nhất so với tám bộ môn kia: cờ tướng có bàn gỗ,
 * caro có trang giấy, cờ gánh có sân gạch — đều là một *vật* đặt trên mặt
 * bàn. Ô ăn quan thì không có vật nào cả: người ta lấy viên gạch non vạch
 * thẳng xuống nền sân, chơi xong mưa một trận là hết. Đóng nó vào một cái
 * khung bo góc là biến nó thành thứ khác.
 *
 * Nên ở đây chỉ có ba lớp: một vạt đất đã quét sạch (mép tan dần, không có
 * đường biên), nét phấn hơi run tay, và sỏi. Cái nào cũng có thể vẽ ra khỏi
 * mép mà không lộ chỗ nối.
 *
 * Thứ tự vòng vẫn phải đúng hình học thật: hàng dưới đọc trái sang phải
 * (1→5), vào quan Đông bên phải (6), hàng trên đọc **phải sang trái** (7→11),
 * rồi về quan Tây bên trái (0).
 */

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

function seeded(seed: number) {
  let x = seed | 0 || 9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

export function QuanBoard({ view, width, mySide, picked, onPick, onSow, disabled, hint }: QuanBoardProps) {
  // Vạt đất rộng hơn bàn cờ, vì mép của nó phải tan dần ra ngoài chứ không
  // dừng lại ở một đường biên.
  const pad = width * 0.09;
  const W = width + pad * 2;
  const bh = width * 0.4;
  const H = bh + pad * 2;
  const quanW = width * 0.095;
  const cellW = (width - quanW * 2) / 5;
  const cellH = bh / 2;
  const L = pad;
  const Tp = pad;

  const flip = mySide === 1;
  const real = (screen: number) => (flip ? (screen + 6) % RING : screen);

  const centre = (screen: number): [number, number] => {
    if (screen === 0) return [L + quanW * 0.5, Tp + bh / 2];
    if (screen === 6) return [L + width - quanW * 0.5, Tp + bh / 2];
    if (screen <= 5) return [L + quanW + (screen - 1) * cellW + cellW / 2, Tp + bh / 2 + cellH / 2];
    return [L + quanW + (11 - screen) * cellW + cellW / 2, Tp + cellH / 2];
  };

  /**
   * Nét phấn: một nét rộng rất nhạt cho bụi phấn bám quanh, rồi nét chính
   * hơi cong. Một đường thẳng tắp một màu thì ra nét vector, không ra vạch
   * gạch non kéo trên nền sân.
   */
  const chalk = useMemo(() => {
    const rnd = seeded(4477);
    const w = width * 0.007;
    const line = (key: string, x1: number, y1: number, x2: number, y2: number) => {
      const bend = (rnd() - 0.5) * width * 0.008;
      const nx = -(y2 - y1);
      const ny = x2 - x1;
      const len = Math.hypot(nx, ny) || 1;
      const mx = (x1 + x2) / 2 + (nx / len) * bend;
      const my = (y1 + y2) / 2 + (ny / len) * bend;
      const d = `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
      return (
        <G key={key}>
          <Path d={d} stroke={T.chalkSoft} strokeWidth={w * 2.6} opacity={0.3} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={T.chalk} strokeWidth={w} opacity={0.92} strokeLinecap="round" fill="none" />
        </G>
      );
    };
    const arc = (key: string, x: number, sweep: 0 | 1) => {
      const d = `M${x} ${Tp} A ${quanW} ${bh / 2} 0 0 ${sweep} ${x} ${Tp + bh}`;
      return (
        <G key={key}>
          <Path d={d} stroke={T.chalkSoft} strokeWidth={w * 2.6} opacity={0.3} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={T.chalk} strokeWidth={w} opacity={0.92} strokeLinecap="round" fill="none" />
        </G>
      );
    };
    const x0 = L + quanW;
    const x1 = L + width - quanW;
    const out: React.ReactElement[] = [
      line('top', x0, Tp, x1, Tp),
      line('mid', x0, Tp + cellH, x1, Tp + cellH),
      line('bot', x0, Tp + bh, x1, Tp + bh),
      arc('west', x0, 0),
      arc('east', x1, 1),
    ];
    // Kẻ cả hai vạch ở hai đầu, không chỉ bốn vạch bên trong.
    //
    // Bàn thật là một **hình chữ nhật kẻ đủ bốn cạnh** rồi mới gắn hai bán
    // nguyệt ra ngoài hai cạnh ngắn. Thiếu hai cạnh ngắn thì ô quan dính
    // liền vào ô dân đầu tiên — nhìn ra một cái máng dài chứ không ra bàn ô
    // ăn quan, và người chơi không biết ranh giới ô quan ở đâu.
    for (let i = 0; i <= 5; i++) {
      const x = x0 + i * cellW;
      out.push(line(`v${i}`, x, Tp, x, Tp + bh));
    }
    return out;
  }, [width, bh, cellH, cellW, quanW, L, Tp]);

  /**
   * Sỏi thật thì hòn to hòn nhỏ, hòn ngả nâu hòn ngả xám. Vẽ mười hai viên
   * y hệt nhau trong một ô là ra hàng bi nhựa.
   */
  const stones = useMemo(() => {
    const rnd = seeded(20260930);
    return Array.from({ length: RING }, () =>
      Array.from({ length: 12 }, () => ({
        x: rnd() * 2 - 1,
        y: rnd() * 2 - 1,
        r: 0.82 + rnd() * 0.42,
        tone: rnd() < 0.34 ? 1 : rnd() < 0.6 ? 2 : 0,
      })),
    );
  }, []);

  const eaten = new Set(view.trail.filter((e) => e.t === 'capture').map((e) => (e as { cell: number }).cell));
  /**
   * Ô vừa được rải quân đầu tiên của nước vừa rồi.
   *
   * `trail[0]` luôn là `drop` của chính nước đó, nên nó chính là ô người
   * kia vừa bốc. Không đánh dấu thì liếc đi một giây là mất dấu hoàn toàn:
   * ô ăn quan rải quân đi khắp bàn, nhìn vào thế cờ sau không suy ngược
   * ra được ai vừa bốc ô nào.
   */
  const startedAt = view.trail.find((e) => e.t === 'drop') as { cell: number } | undefined;

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          {/* Vạt đất đã quét: sáng ở giữa, tan hẳn ra ngoài. Không có mép,
              nên bàn cờ không thành một tấm dán lên nền. */}
          {/* Vạt đất là nền **vừa đủ sáng** để sỏi sẫm nổi lên, không phải
              một quầng đèn. Bản đầu tôi lấy màu sáng nhất làm tâm, thành ra
              cả bàn bạc phếch và sỏi chìm nghỉm. */}
          <RadialGradient id="peb-0" cx="0.34" cy="0.3" r="0.8">
            <Stop offset="0" stopColor={T.pebbleLit} />
            <Stop offset="1" stopColor={T.pebble} />
          </RadialGradient>
          <RadialGradient id="peb-1" cx="0.34" cy="0.3" r="0.8">
            <Stop offset="0" stopColor="#8A7358" />
            <Stop offset="1" stopColor="#3F3324" />
          </RadialGradient>
          <RadialGradient id="peb-2" cx="0.34" cy="0.3" r="0.8">
            <Stop offset="0" stopColor="#8C8C83" />
            <Stop offset="1" stopColor="#3E3E38" />
          </RadialGradient>
          <RadialGradient id="quan-big" cx="0.34" cy="0.28" r="0.8">
            <Stop offset="0" stopColor="#FFFDF6" />
            <Stop offset="0.6" stopColor={T.quanStone} />
            <Stop offset="1" stopColor={T.quanStoneDark} />
          </RadialGradient>
          <ClipPath id="clip-west">
            <Path d={`M${L + quanW} ${Tp} A ${quanW} ${bh / 2} 0 0 0 ${L + quanW} ${Tp + bh} Z`} />
          </ClipPath>
          <ClipPath id="clip-east">
            <Path d={`M${L + width - quanW} ${Tp} A ${quanW} ${bh / 2} 0 0 1 ${L + width - quanW} ${Tp + bh} Z`} />
          </ClipPath>
        </Defs>

        {/* Không có vạt sáng nào dưới bàn cờ.
            Một vầng sáng mờ vẫn là một vầng sáng **có mép**, và mắt bắt mép
            đó thành cái khung thứ hai bao quanh bàn. Nền đã là cát thì bàn
            cờ cứ vạch thẳng lên cát, không cần chỗ lót. */}
        {chalk}

        {Array.from({ length: RING }, (_, screen) => {
          const i = real(screen);
          const cell = view.cells[i]!;
          const [cx, cy] = centre(screen);
          const isQuanCell = screen === 0 || screen === 6;
          const rPeb = width * 0.019;
          const spread = isQuanCell ? [quanW * 0.24, bh * 0.1] : [cellW * 0.3, cellH * 0.28];
          const shown = Math.min(cell.dan, isQuanCell ? 8 : 12);
          return (
            <G key={screen} clipPath={screen === 0 ? 'url(#clip-west)' : screen === 6 ? 'url(#clip-east)' : undefined}>
              {startedAt?.cell === i ? (
                <Ellipse
                  testID="quan-o-vua-boc"
                  cx={cx}
                  cy={cy}
                  rx={(isQuanCell ? quanW : cellW) * 0.44}
                  ry={cellH * 0.4}
                  stroke={T.hint}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="none"
                  opacity={0.8}
                />
              ) : null}
              {eaten.has(i) ? (
                <Ellipse
                  cx={cx}
                  cy={cy}
                  rx={(isQuanCell ? quanW : cellW) * 0.42}
                  ry={cellH * 0.38}
                  fill={T.eaten}
                  opacity={0.22}
                />
              ) : null}
              {cell.quan > 0 ? (
                <G>
                  <Ellipse cx={cx} cy={cy + width * 0.022} rx={width * 0.038} ry={width * 0.014} fill="#3A2A14" opacity={0.35} />
                  <Circle cx={cx} cy={cy - width * 0.006} r={width * 0.04} fill="url(#quan-big)" />
                </G>
              ) : null}
              {Array.from({ length: shown }, (_, k) => {
                const st = stones[screen]![k]!;
                const sy = cy + st.y * spread[1]! + (cell.quan > 0 ? bh * 0.13 : 0);
                const sx = cx + st.x * spread[0]!;
                return (
                  <G key={k}>
                    <Ellipse cx={sx + rPeb * 0.15} cy={sy + rPeb * 0.7} rx={rPeb * st.r * 0.9} ry={rPeb * st.r * 0.34} fill="#3A2A14" opacity={0.28} />
                    <Circle cx={sx} cy={sy} r={rPeb * st.r} fill={`url(#peb-${st.tone})`} />
                  </G>
                );
              })}
              {/* Con số viết hai lớp: một lớp viền màu đất rồi mới tới nét
                  đen. Ô tám dân thì sỏi phủ kín chỗ đặt số, không có viền
                  thì số chìm vào đống sỏi đúng lúc cần đọc nhất. */}
              {cell.dan > 0
                ? (() => {
                    const ty = cy + (isQuanCell ? bh * 0.27 : cellH * 0.42);
                    const fs = width * 0.038;
                    return (
                      <G>
                        <SvgText
                          x={cx}
                          y={ty}
                          fontSize={fs}
                          fill="none"
                          stroke="#C6A576"
                          strokeWidth={fs * 0.42}
                          strokeLinejoin="round"
                          textAnchor="middle"
                          fontWeight="bold"
                          opacity={0.95}
                        >
                          {cell.dan}
                        </SvgText>
                        <SvgText x={cx} y={ty} fontSize={fs} fill="#2E2414" textAnchor="middle" fontWeight="bold" opacity={0.9}>
                          {cell.dan}
                        </SvgText>
                      </G>
                    );
                  })()
                : null}
            </G>
          );
        })}

        {/* Ô đang chọn và nước được gợi ý: khoanh bằng nét phấn đậm hơn,
            không dùng khung chữ nhật — trên bàn không có ô vuông nào cả,
            chỉ có mấy vạch. */}
        {[picked !== null ? { cell: picked, tone: T.pick, dash: undefined } : null, hint ? { cell: hint.cell, tone: T.hint, dash: '7 6' } : null]
          .filter(Boolean)
          .map((m, k) => {
            const mark = m as { cell: number; tone: string; dash?: string };
            const screen = flip ? (mark.cell + 6) % RING : mark.cell;
            const [cx, cy] = centre(screen);
            return (
              <Ellipse
                key={k}
                cx={cx}
                cy={cy}
                rx={cellW * 0.44}
                ry={cellH * 0.42}
                stroke={mark.tone}
                strokeWidth={3}
                strokeDasharray={mark.dash}
                fill="none"
              />
            );
          })}
      </Svg>

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

        {picked !== null
          ? ([-1, 1] as const).map((dir) => {
              const screen = flip ? (picked + 6) % RING : picked;
              const [cx, cy] = centre(screen);
              const dx = dir === 1 ? cellW * 0.56 : -cellW * 0.56;
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
