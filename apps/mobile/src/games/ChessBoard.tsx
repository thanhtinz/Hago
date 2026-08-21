import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { Art, ArtName, artNodes, artSpan } from '../components/Art';
import { C, R, S, softShadow } from '../theme';
import { BoardProps, TurnBanner, VersusBar } from './shared';

/**
 * Bàn Cờ Vua vẽ **2.5D**: phép chiếu phối cảnh một điểm tụ, hàng xa hẹp và
 * thấp hơn hàng gần, quân đứng thẳng trên mặt bàn và có bóng đổ dưới chân.
 *
 * Vì sao vẽ bằng SVG chứ không xếp <View>: ô cờ trong phối cảnh là hình thang
 * chứ không phải hình chữ nhật, mà View thì chỉ vẽ được hình chữ nhật. SVG
 * <Polygon> nhận bốn đỉnh bất kỳ, lại bắt được sự kiện chạm đúng theo hình
 * thang đó nên vùng chạm khớp hệt cái mắt nhìn thấy.
 *
 * Quân dùng lại đúng bộ chess-* của game-icons.net (silhouette nhìn nghiêng —
 * vốn đã hợp với góc nhìn đứng), nhúng thẳng vào cảnh qua `artNodes` để ăn
 * theo tỉ lệ xa gần thay vì vẽ ra một <Svg> riêng.
 */

const LIGHT = '#F0D9B5';
const DARK = '#B07C4A';
/** Ô ở xa mờ đi một chút — mẹo phối cảnh khí quyển, giúp mắt đọc được chiều sâu. */
const FADE = 0.22;

/** Độ sâu của phép chiếu: z của hàng gần và hàng xa. Càng chênh càng nghiêng. */
const Z_NEAR = 1;
const Z_FAR = 1.62;

const WHITE_FILL = '#FFF6E4';
const WHITE_LINE = '#6B4A2A';
const BLACK_FILL = '#2E2536';
const BLACK_LINE = '#0E0A14';

/** Chữ hoa là quân trắng, chữ thường là quân đen. */
const artOf = (piece: string): ArtName => `chess-${piece.toLowerCase()}` as ArtName;

/** Trộn màu về phía màu nền để làm nhạt dần theo chiều sâu. */
function fade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (222 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

export default function ChessBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const frameRef = React.useRef<any>(null);
  /** Gốc khung trên màn, dùng khi sự kiện không kèm toạ độ tương đối. */
  const origin = React.useRef({ x: 0, y: 0 });
  const board: (string | null)[] = view.board ?? [];
  const moves: { from: number; to: number; promo?: string }[] = view.moves ?? [];
  const yourTurn = view.turnSeat === mySeat && !view.over;

  // Ngồi ghế đen thì lật bàn lại cho quân mình ở hàng gần.
  const flipped = mySeat === 1;
  const fromScreen = (i: number) => (flipped ? 63 - i : i);

  // Khung vẽ: rộng hết chỗ, cao bằng phần bàn nghiêng cộng chỗ cho quân hàng xa
  // nhô lên khỏi mép trên.
  const W = Math.min(space.width, 460);
  const NEAR_W = W * 0.98;
  const HEAD = NEAR_W * 0.12;
  const SIDE = NEAR_W * 0.035;
  /**
   * Bàn cờ nghiêng thì bị co ngắn theo chiều sâu, nên phần chiếm trên màn phải
   * *hẹp hơn* bề ngang. Kéo sâu ra cho kín màn dài thì ô giữa bàn thành hình
   * chữ nhật đứng, nhìn ra cái hành lang chứ không còn là bàn cờ.
   */
  const DEEP = Math.min(NEAR_W * 0.82, Math.max(NEAR_W * 0.62, space.height - 210 - HEAD - SIDE));
  const H = HEAD + DEEP + SIDE + 10;
  const CX = W / 2;

  const sc = (v: number) => 1 / (Z_FAR - v * (Z_FAR - Z_NEAR));
  const S0 = sc(0);
  const S1 = sc(1);
  /** y trên màn của mép hàng ở độ sâu v (0 = xa nhất, 1 = gần nhất). */
  const rowY = (v: number) => HEAD + DEEP * ((sc(v) - S0) / (S1 - S0));
  /** Bề ngang bàn cờ tại độ sâu v. */
  const rowW = (v: number) => NEAR_W * (sc(v) / S1);
  const pxAt = (u: number, v: number) => CX + (u - 0.5) * rowW(v);
  const pt = (u: number, v: number) => `${pxAt(u, v).toFixed(1)},${rowY(v).toFixed(1)}`;

  /**
   * Chiều cao quân ở hàng gần nhất; hàng xa co lại theo tỉ lệ phối cảnh.
   * Silhouette của game-icons gần vuông nên con số này cũng là bề ngang — để
   * quá 1,2 lần bề rộng ô là các quân cạnh nhau chồng lên nhau che mất bàn.
   */
  const PIECE_H = (NEAR_W / 8) * 1.12;

  /**
   * Nghịch đảo phép chiếu: từ điểm chạm trên màn suy ngược ra ô cờ.
   *
   * Cách này thay cho việc gắn onPress lên từng <Polygon> — react-native-svg
   * không chuyển onPress thành sự kiện chuột trên web, mà một hàm nghịch đảo
   * thì đúng tuyệt đối và chạy được cả trên native lẫn web.
   */
  const squareAt = (x: number, y: number): number | null => {
    const k = S0 + ((y - HEAD) / DEEP) * (S1 - S0);
    if (k <= 0) return null;
    const v = (Z_FAR - 1 / k) / (Z_FAR - Z_NEAR);
    if (v < 0 || v >= 1) return null;
    const u = (x - CX) / rowW(v) + 0.5;
    if (u < 0 || u >= 1) return null;
    const row = Math.min(7, Math.floor(v * 8));
    const col = Math.min(7, Math.floor(u * 8));
    return fromScreen(row * 8 + col);
  };

  const targets = React.useMemo(
    () => (picked == null ? [] : moves.filter((m) => m.from === picked)),
    [picked, moves],
  );

  const tap = (index: number) => {
    if (!yourTurn) return;
    const hit = targets.find((m) => m.to === index);
    if (hit) {
      // Tốt lên hàng cuối thì mặc định phong hậu, như mọi app cờ.
      send('move', { from: hit.from, to: hit.to, promo: hit.promo ?? undefined });
      setPicked(null);
      return;
    }
    setPicked(moves.some((m) => m.from === index) ? index : null);
  };

  const last = view.lastMove as { from: number; to: number } | null;
  const captured: string[] = view.captured ?? [];
  const lostBy = (white: boolean) => captured.filter((p) => (p === p.toUpperCase()) === white);

  /** Mọi ô, xếp từ hàng xa tới hàng gần để quân gần vẽ đè lên quân xa. */
  const squares = Array.from({ length: 64 }, (_, s) => {
    const row = Math.floor(s / 8);
    const col = s % 8;
    const index = fromScreen(s);
    return { s, row, col, index, piece: board[index] ?? null };
  });

  return (
    <View style={{ gap: S.sm, alignItems: 'center' }}>
      <VersusBar
        players={view.players}
        activeSeat={view.turnSeat}
        mySeat={mySeat}
        deadline={deadline}
        total={45}
        score={(seat) => (seat === 0 ? 'Trắng' : 'Đen')}
      />
      <TurnBanner
        yourTurn={yourTurn}
        text={
          view.over
            ? view.ending ?? 'Kết thúc'
            : view.check === mySeat
              ? 'Bạn đang bị chiếu — phải gỡ!'
              : yourTurn
                ? 'Tới lượt bạn'
                : 'Đối thủ đang nghĩ...'
        }
      />

      <TakenRow pieces={lostBy(mySeat !== 1)} width={W} />

      {/*
        Dùng responder chứ không dùng Pressable: onPress của Pressable trên web
        không kèm locationX/locationY, mà toạ độ trong khung mới suy ngược ra
        được ô cờ. onResponderRelease thì có toạ độ ở cả hai nền.
      */}
      <View
        ref={frameRef}
        style={softShadow(0.22, 18, 8)}
        onStartShouldSetResponder={() => true}
        onResponderRelease={(e) => {
          const n: any = e.nativeEvent;
          const x = n.locationX ?? (n.pageX ?? 0) - origin.current.x;
          const y = n.locationY ?? (n.pageY ?? 0) - origin.current.y;
          const hit = squareAt(x, y);
          if (hit != null) tap(hit);
        }}
        onLayout={() => {
          frameRef.current?.measureInWindow((x: number, y: number) => {
            origin.current = { x, y };
          });
        }}
      >
        <Svg width={W} height={H} pointerEvents="none">
          <Defs>
            {/* Thành bàn nhìn nghiêng: sáng ở mặt trên, tối dần xuống chân */}
            <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#8A5A2E" />
              <Stop offset="1" stopColor="#4E2F14" />
            </LinearGradient>
          </Defs>

          {/* Thành bàn phía gần, tạo cảm giác mặt bàn có bề dày */}
          <Polygon
            points={`${pt(0, 1)} ${pt(1, 1)} ${pxAt(1, 1).toFixed(1)},${(rowY(1) + SIDE).toFixed(1)} ${pxAt(0, 1).toFixed(1)},${(rowY(1) + SIDE).toFixed(1)}`}
            fill="url(#rim)"
          />
          {/* Viền gỗ quanh mặt bàn */}
          <Polygon
            points={`${pt(-0.02, 0)} ${pt(1.02, 0)} ${pt(1.02, 1)} ${pt(-0.02, 1)}`}
            fill="#7A5230"
          />

          {squares.map(({ s, row, col }) => {
            const u0 = col / 8;
            const u1 = (col + 1) / 8;
            const v0 = row / 8;
            const v1 = (row + 1) / 8;
            const light = (row + col) % 2 === 0;
            // Hàng càng xa càng nhạt, mắt đọc ra chiều sâu mà không cần kẻ thêm.
            const depth = FADE * (1 - row / 7);
            return (
              <Polygon
                key={`sq${s}`}
                points={`${pt(u0, v0)} ${pt(u1, v0)} ${pt(u1, v1)} ${pt(u0, v1)}`}
                fill={fade(light ? LIGHT : DARK, depth)}
              />
            );
          })}

          {/* Lớp tô nổi: nước vừa đi, ô đang chọn, ô đi được, vua bị chiếu */}
          {squares.map(({ s, row, col, index, piece }) => {
            const inLast = !!last && (last.from === index || last.to === index);
            const isPicked = picked === index;
            const isTarget = targets.some((m) => m.to === index);
            const checked =
              view.check != null &&
              piece?.toLowerCase() === 'k' &&
              (piece === piece.toUpperCase() ? 0 : 1) === view.check;
            if (!inLast && !isPicked && !isTarget && !checked) return null;
            const tint = checked
              ? 'rgba(238,90,90,0.55)'
              : isPicked
                ? 'rgba(120,200,140,0.62)'
                : inLast
                  ? 'rgba(255,214,102,0.5)'
                  : 'rgba(90,180,110,0.3)';
            return (
              <Polygon
                key={`hl${s}`}
                points={`${pt(col / 8, row / 8)} ${pt((col + 1) / 8, row / 8)} ${pt((col + 1) / 8, (row + 1) / 8)} ${pt(col / 8, (row + 1) / 8)}`}
                fill={tint}
              />
            );
          })}

          {/* Thước toạ độ in chìm ở mép trái và mép gần */}
          {Array.from({ length: 8 }, (_, row) => {
            const v = (row + 0.5) / 8;
            return (
              <SvgText
                key={`rk${row}`}
                x={pxAt(-0.012, v)}
                y={rowY(v) + 4 * (sc(v) / S1)}
                fill="rgba(255,240,220,0.85)"
                fontSize={13 * (sc(v) / S1)}
                fontWeight="bold"
                textAnchor="middle"
              >
                {String(flipped ? row + 1 : 8 - row)}
              </SvgText>
            );
          })}
          {Array.from({ length: 8 }, (_, col) => (
            <SvgText
              key={`fl${col}`}
              x={pxAt((col + 0.5) / 8, 1)}
              y={rowY(1) + SIDE * 0.78}
              fill="rgba(255,240,220,0.9)"
              fontSize={12}
              fontWeight="bold"
              textAnchor="middle"
            >
              {'abcdefgh'[flipped ? 7 - col : col]}
            </SvgText>
          ))}

          {/* Chấm/vòng báo nước đi, nằm sát mặt bàn nên vẽ dẹt theo phối cảnh */}
          {squares.map(({ s, row, col, index, piece }) => {
            if (!targets.some((m) => m.to === index)) return null;
            const v = (row + 0.55) / 8;
            const k = sc(v) / S1;
            const cell = rowW(v) / 8;
            return (
              <Ellipse
                key={`dot${s}`}
                cx={pxAt((col + 0.5) / 8, v)}
                cy={rowY(v)}
                rx={cell * (piece ? 0.42 : 0.19)}
                ry={cell * (piece ? 0.42 : 0.19) * 0.5}
                fill={piece ? 'none' : 'rgba(38,92,48,0.6)'}
                stroke={piece ? 'rgba(38,92,48,0.75)' : 'none'}
                strokeWidth={Math.max(2, 4 * k)}
              />
            );
          })}

          {/* Quân cờ: vẽ từ hàng xa tới hàng gần để quân gần che quân xa */}
          {squares.map(({ s, row, col, index, piece }) => {
            if (!piece) return null;
            // Chân quân đặt hơi lùi về phía gần trong ô, như đặt trên mặt bàn thật.
            const v = (row + 0.66) / 8;
            const k = sc(v) / S1;
            const baseX = pxAt((col + 0.5) / 8, v);
            const baseY = rowY(v);
            const h = PIECE_H * k;
            const span = artSpan(artOf(piece));
            const scale = h / span;
            const white = piece === piece.toUpperCase();
            const cell = rowW(v) / 8;
            return (
              <G key={`pc${s}`}>
                {/* Bóng đổ dẹt dưới chân, bám mặt bàn */}
                <Ellipse
                  cx={baseX + cell * 0.08}
                  cy={baseY}
                  rx={cell * 0.36}
                  ry={cell * 0.14}
                  fill="rgba(40,24,10,0.32)"
                />
                {/* Vẽ hai lần: bản to hơn làm nét viền, bản trong làm ruột */}
                <G translateX={baseX - (span * scale * 1.08) / 2} translateY={baseY - span * scale * 1.08} scale={scale * 1.08}>
                  {artNodes(artOf(piece), white ? WHITE_LINE : BLACK_LINE, white ? WHITE_LINE : BLACK_LINE, `o${s}`)}
                </G>
                <G translateX={baseX - (span * scale) / 2} translateY={baseY - span * scale} scale={scale}>
                  {artNodes(artOf(piece), white ? WHITE_FILL : BLACK_FILL, white ? WHITE_FILL : BLACK_FILL, `b${s}`)}
                </G>
              </G>
            );
          })}

        </Svg>
      </View>

      <TakenRow pieces={lostBy(mySeat === 1)} width={W} />
    </View>
  );
}

/** Hàng quân đã bị ăn, xếp theo giá trị giảm dần. */
function TakenRow({ pieces, width }: { pieces: string[]; width: number }) {
  const order = 'qrbnp';
  const sorted = [...pieces].sort((a, b) => order.indexOf(a.toLowerCase()) - order.indexOf(b.toLowerCase()));
  return (
    <View style={{ width, minHeight: 22, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      {sorted.map((p, i) => (
        <Art
          key={`${p}${i}`}
          name={artOf(p)}
          size={18}
          color={p === p.toUpperCase() ? '#C9BCA6' : '#8A8296'}
        />
      ))}
    </View>
  );
}
