import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { NB, type GanhView } from '@co/game-co-ganh';
import { ganhTheme as T } from './theme';

/**
 * Bàn cờ gánh.
 *
 * Hai thứ bắt buộc phải vẽ đúng, không phải vì đẹp mà vì **người chơi đọc
 * luật từ hình**:
 *
 * 1. **Đường chéo chỉ ở điểm có `(r+c)` chẵn.** Vẽ chéo ở mọi ô là mời người
 *    chơi đi những nước mà engine sẽ từ chối. Hình vẽ chính là bản đồ nước đi.
 * 2. **Ô bị ép phải nổi bật hẳn.** Luật mở ràng buộc đối thủ chỉ được đi vào
 *    một số ô; không đánh dấu thì họ bấm mãi vào chỗ khác mà không hiểu vì
 *    sao không đi được.
 */

const N = 5;

export interface GanhBoardProps {
  view: GanhView;
  size: number;
  mySeat: number | null;
  /** Quân đang chọn, hoặc null. */
  picked: number | null;
  onPick: (i: number | null) => void;
  onMove: (f: number, t: number) => void;
  legalTargets: number[];
  disabled?: boolean;
  /** Nước đang được gợi ý: quân nào đi đâu. */
  hint?: { f: number; t: number } | null;
}

export function GanhBoard({ view, size, mySeat, picked, onPick, onMove, legalTargets, disabled, hint }: GanhBoardProps) {
  /**
   * Xoay bàn 180° khi người cầm máy ngồi bên trên.
   *
   * Ghế nào cầm quân dưới là do `rng` quyết lúc mở ván, nhưng người chơi thì
   * luôn phải thấy quân mình ở phía mình. Đồ thị kề của cờ gánh đối xứng qua
   * tâm — `i → 24 − i` đổi `(r,c)` thành `(4−r,4−c)` nên tính chẵn lẻ của
   * `r+c` không đổi, tức các đường chéo vẫn nằm đúng chỗ. Xoay được an toàn.
   */
  const flip = mySeat !== null && mySeat !== view.bottom;
  const at = (i: number) => (flip ? N * N - 1 - i : i);

  const pad = size * 0.125;
  const step = (size - pad * 2) / (N - 1);
  const px = (c: number) => pad + c * step;
  const py = (r: number) => pad + r * step;
  // Quân chiếm 0,3 bước lưới. To hơn nữa thì hai quân kề nhau chạm vào nhau
  // và nét kẻ bên dưới biến mất — mà nét kẻ chính là bản đồ nước đi.
  const R = step * 0.3;

  const targets = new Set(legalTargets);
  const forced = new Set(view.forcedTo ?? []);
  const flipped = new Set(view.flipped);
  const cx = (i: number) => px(at(i) % N);
  const cy = (i: number) => py((at(i) / N) | 0);

  return (
    // Không nền, không viền, không bo góc. Bàn cờ gánh là mấy vạch gạch non
    // kẻ thẳng lên nền sân, nên nền sân phải chạy liền qua dưới nó. Bản
    // trước là một tấm lát sáng màu đặt trên sân, lại còn tự vẽ gạch ở tỉ lệ
    // khác hẳn gạch bên dưới — hai lớp gạch lệch nhau nhìn ra ngay.
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ganh-red" cx="0.34" cy="0.28" r="0.85">
            <Stop offset="0" stopColor={T.redFace} />
            <Stop offset="1" stopColor={T.redDeep} />
          </RadialGradient>
          <RadialGradient id="ganh-pale" cx="0.34" cy="0.28" r="0.85">
            <Stop offset="0" stopColor={T.paleFace} />
            <Stop offset="1" stopColor={T.paleDeep} />
          </RadialGradient>
        </Defs>
        {/* Nét phấn: 5 ngang, 5 dọc, hai đường chéo lớn, và hình thoi nối bốn
            trung điểm cạnh. Đúng chừng đó, không hơn. */}
        <G opacity={0.92}>
          {Array.from({ length: N }, (_, i) => (
            <G key={i}>
              <Line x1={px(0)} y1={py(i)} x2={px(4)} y2={py(i)} stroke={T.chalk} strokeWidth={step * 0.055} strokeLinecap="round" />
              <Line x1={px(i)} y1={py(0)} x2={px(i)} y2={py(4)} stroke={T.chalk} strokeWidth={step * 0.055} strokeLinecap="round" />
            </G>
          ))}
          <Line x1={px(0)} y1={py(0)} x2={px(4)} y2={py(4)} stroke={T.chalk} strokeWidth={step * 0.045} strokeLinecap="round" />
          <Line x1={px(4)} y1={py(0)} x2={px(0)} y2={py(4)} stroke={T.chalk} strokeWidth={step * 0.045} strokeLinecap="round" />
          <Path
            d={`M${px(2)} ${py(0)} L${px(4)} ${py(2)} L${px(2)} ${py(4)} L${px(0)} ${py(2)} Z`}
            stroke={T.chalk}
            strokeWidth={step * 0.045}
            fill="none"
            strokeLinejoin="round"
          />
        </G>

        {/* Vệt nước vừa đi: một nét phấn mờ từ ô cũ sang ô mới, cộng một
            vòng nhạt ở ô xuất phát.

            `view.last` có sẵn trong engine từ đầu mà bàn cờ chưa đọc lần
            nào. Thiếu nó thì vào lại ván đang dở, hoặc chỉ liếc đi một
            giây, là không còn biết đối thủ vừa nhấc quân nào — mà ở cờ
            gánh, nước vừa đi chính là thứ quyết định mình có bị vây không. */}
        {view.last ? (
          <G opacity={0.55} testID="ganh-vet-nuoc-vua-di">
            <Line
              x1={cx(view.last.f)}
              y1={cy(view.last.f)}
              x2={cx(view.last.t)}
              y2={cy(view.last.t)}
              stroke={T.hint}
              strokeWidth={step * 0.07}
              strokeLinecap="round"
            />
            <Circle cx={cx(view.last.f)} cy={cy(view.last.f)} r={R * 0.52} stroke={T.hint} strokeWidth={1.6} fill="none" />
          </G>
        ) : null}

        {/* Ô bị ép đi vào: quầng đỏ son nhấp nháy bằng vòng kép. */}
        {[...forced].map((i: number) => (
          <G key={`f${i}`}>
            <Circle cx={cx(i)} cy={cy(i)} r={R * 1.5} fill={T.forced} opacity={0.22} />
            <Circle cx={cx(i)} cy={cy(i)} r={R * 1.15} stroke={T.forced} strokeWidth={2.4} fill="none" />
          </G>
        ))}

        {/* Chấm gợi nước đi hợp lệ của quân đang chọn. */}
        {[...targets].map((i: number) =>
          forced.has(i) ? null : (
            <Circle key={`t${i}`} cx={cx(i)} cy={cy(i)} r={R * 0.34} fill={T.hint} opacity={0.85} />
          ),
        )}

        {/* Gợi ý: một mũi tên nét đứt từ quân nên đi tới chỗ nên đến. Chỉ
            tô sáng ô đích thôi thì người chơi không biết nên nhấc quân nào. */}
        {hint ? (
          <G opacity={0.9}>
            <Circle cx={cx(hint.f)} cy={cy(hint.f)} r={R * 1.3} stroke={T.pick} strokeWidth={2.4} strokeDasharray="5 4" fill="none" />
            <Line
              x1={cx(hint.f)}
              y1={cy(hint.f)}
              x2={cx(hint.t)}
              y2={cy(hint.t)}
              stroke={T.pick}
              strokeWidth={3}
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
            <Circle cx={cx(hint.t)} cy={cy(hint.t)} r={R * 0.5} fill={T.pick} opacity={0.85} />
          </G>
        ) : null}

        {view.board.map((seat, i) => {
          if (seat < 0) return null;
          const c = at(i) % N;
          const r = (at(i) / N) | 0;
          // Màu quân bám theo **người cầm máy**, không bám theo ghế dưới của
          // engine. Ghế nào ngồi dưới là do rng, nên nếu buộc màu vào đó thì
          // ván này người chơi cầm quân đất nung, ván sau cầm vỏ nghêu — và
          // quân trên thanh tên lại không khớp với quân trên bàn.
          const mine = mySeat !== null ? seat === mySeat : seat === view.bottom;
          return (
            <G key={i}>
              <Ellipse cx={px(c) + R * 0.08} cy={py(r) + R * 0.42} rx={R * 0.95} ry={R * 0.3} fill="#4A3320" opacity={0.3} />
              {/* Vành sáng mảnh quanh quân. Trên nền gạch sẫm, quân đất
                  nung gần cùng tông với nền; thiếu vành này thì nó lẫn vào
                  sân đúng lúc người chơi cần đếm quân. */}
              <Circle
                cx={px(c)}
                cy={py(r)}
                r={R}
                fill={mine ? 'url(#ganh-red)' : 'url(#ganh-pale)'}
                stroke={flipped.has(i) ? T.flip : mine ? T.redRim : T.paleRim}
                strokeWidth={flipped.has(i) ? 2.6 : 1.2}
                strokeOpacity={flipped.has(i) ? 1 : 0.55}
              />
              <Path
                d={`M${px(c) - R * 0.68} ${py(r) - R * 0.38} A ${R * 0.8} ${R * 0.8} 0 0 1 ${px(c) + R * 0.46} ${py(r) - R * 0.66}`}
                stroke="#FFFFFF"
                strokeWidth={R * 0.15}
                strokeLinecap="round"
                fill="none"
                opacity={0.3}
              />
              {picked === i ? (
                <Circle cx={px(c)} cy={py(r)} r={R * 1.32} stroke={T.pick} strokeWidth={2.6} fill="none" />
              ) : null}
            </G>
          );
        })}
      </Svg>

      {/* Lớp chạm: một vùng tròn rộng quanh mỗi điểm, tối thiểu 44px. */}
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {Array.from({ length: N * N }, (_, screen) => {
          // Nhãn đọc màn hình và vùng chạm đánh theo **vị trí trên màn**, còn
          // chỉ số gửi cho engine là chỉ số thật của bàn cờ.
          const c = screen % N;
          const r = (screen / N) | 0;
          const i = at(screen);
          const hit = Math.max(44, step * 0.9);
          const seat = view.board[i]!;
          const canPick = !disabled && mySeat !== null && seat === mySeat;
          const canMove = !disabled && picked !== null && targets.has(i);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Điểm hàng ${r + 1} cột ${c + 1}${seat < 0 ? ', trống' : ''}`}
              disabled={!canPick && !canMove}
              onPress={() => {
                if (canMove && picked !== null) onMove(picked, i);
                else if (canPick) onPick(picked === i ? null : i);
              }}
              style={{
                position: 'absolute',
                left: px(c) - hit / 2,
                top: py(r) - hit / 2,
                width: hit,
                height: hit,
                borderRadius: hit / 2,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Nước đi hợp lệ của quân đang chọn, tính ngay trên view. */
export function targetsOf(view: GanhView, picked: number | null): number[] {
  if (picked === null) return [];
  return NB[picked]!.filter((t) => view.board[t] === -1 && (!view.forcedTo || view.forcedTo.includes(t)));
}
