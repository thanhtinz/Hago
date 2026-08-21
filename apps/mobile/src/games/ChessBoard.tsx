import React from 'react';
import { Pressable, View } from 'react-native';
import { Txt } from '../components/ui';
import { Art, ArtName } from '../components/Art';
import { C, R, S, softShadow } from '../theme';
import { BoardProps, TurnBanner, VersusBar } from './shared';

/**
 * Bàn Cờ Vua. Bàn luôn xoay để quân của người đang xem nằm phía dưới, chạm một
 * quân là sáng hết các ô nó đi được — chấm tròn cho ô trống, vòng tròn cho ô ăn
 * quân, đúng cách các app cờ hay làm.
 *
 * Quân dùng bộ chess-* của game-icons.net: quân trắng tô kem viền sẫm, quân đen
 * tô sẫm viền kem, nhờ vậy nổi trên cả ô sáng lẫn ô tối.
 */

const LIGHT = '#F0D9B5';
const DARK = '#B58863';
const MOVE_DOT = 'rgba(60,120,70,0.45)';

/** Chữ hoa là quân trắng, chữ thường là quân đen. */
const artOf = (piece: string): ArtName => `chess-${piece.toLowerCase()}` as ArtName;

export default function ChessBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const board: (string | null)[] = view.board ?? [];
  const moves: { from: number; to: number; promo?: string }[] = view.moves ?? [];
  const yourTurn = view.turnSeat === mySeat && !view.over;

  // Ngồi ghế đen thì lật bàn lại cho quân mình ở dưới.
  const flipped = mySeat === 1;
  const cell = Math.floor(Math.min(space.width - 16, space.height - 230) / 8);
  const size = cell * 8;
  // RN tính width gồm cả viền nên phải cộng viền vào, không thì hàng cuối bị cắt.
  const edge = 3;
  const frame = size + edge * 2;

  const toScreen = (i: number) => (flipped ? 63 - i : i);
  const fromScreen = (i: number) => (flipped ? 63 - i : i);

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
  const lostBy = (white: boolean) =>
    captured.filter((p) => (p === p.toUpperCase()) === white);

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

      {/* Quân đã mất của đối thủ nằm trên bàn, của mình nằm dưới */}
      <TakenRow pieces={lostBy(mySeat !== 1)} width={size} />

      <View
        style={[
          { width: frame, height: frame, borderRadius: R.md, overflow: 'hidden', borderWidth: edge, borderColor: '#7A5230' },
          softShadow(0.2, 14, 6),
        ]}
      >
        {Array.from({ length: 64 }, (_, s) => {
          const index = fromScreen(s);
          const row = Math.floor(s / 8);
          const col = s % 8;
          const piece = board[index];
          const isTarget = targets.some((m) => m.to === index);
          const isPicked = picked === index;
          const inLast = !!last && (last.from === index || last.to === index);
          const checked = view.check != null && piece && piece.toLowerCase() === 'k'
            && (piece === piece.toUpperCase() ? 0 : 1) === view.check;

          return (
            <Pressable
              key={s}
              onPress={() => tap(index)}
              style={{
                position: 'absolute',
                left: col * cell,
                top: row * cell,
                width: cell,
                height: cell,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: (row + col) % 2 === 0 ? LIGHT : DARK,
              }}
            >
              {inLast ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,214,102,0.42)' }} />
              ) : null}
              {isPicked ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(120,200,140,0.5)' }} />
              ) : null}
              {checked ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(238,90,90,0.45)' }} />
              ) : null}

              {piece ? (
                <Art
                  name={artOf(piece)}
                  size={cell * 0.82}
                  color={piece === piece.toUpperCase() ? '#FFF7E8' : '#2B2333'}
                  shadow
                />
              ) : null}

              {/* Ô đi được: chấm giữa nếu trống, vòng viền nếu có quân để ăn */}
              {isTarget ? (
                <View
                  pointerEvents="none"
                  style={
                    piece
                      ? {
                          position: 'absolute',
                          left: 2,
                          top: 2,
                          right: 2,
                          bottom: 2,
                          borderRadius: cell,
                          borderWidth: Math.max(3, cell * 0.09),
                          borderColor: MOVE_DOT,
                        }
                      : {
                          width: cell * 0.3,
                          height: cell * 0.3,
                          borderRadius: cell,
                          backgroundColor: MOVE_DOT,
                        }
                  }
                />
              ) : null}

              {/* Thước toạ độ in nhạt ở mép, như bàn cờ thật */}
              {col === 0 ? (
                <Txt size={Math.max(8, cell * 0.22)} weight="bold" color={(row + col) % 2 === 0 ? DARK : LIGHT} style={{ position: 'absolute', left: 2, top: 1 }}>
                  {String(flipped ? row + 1 : 8 - row)}
                </Txt>
              ) : null}
              {row === 7 ? (
                <Txt size={Math.max(8, cell * 0.22)} weight="bold" color={(row + col) % 2 === 0 ? DARK : LIGHT} style={{ position: 'absolute', right: 3, bottom: 0 }}>
                  {'abcdefgh'[flipped ? 7 - col : col]}
                </Txt>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <TakenRow pieces={lostBy(mySeat === 1)} width={size} />
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
