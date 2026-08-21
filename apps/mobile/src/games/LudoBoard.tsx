import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Btn, Txt } from '../components/ui';
import { DieFace } from '../components/Piece';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps, GameLog, TurnBanner, VersusBar } from './shared';
import { LUDO_CENTER, LUDO_HORSE, LUDO_LANE, LUDO_RATIO, LUDO_SAFE, LUDO_START, LUDO_YARD, LudoColor } from '../art/ludo';

/**
 * Bàn Cờ Cá Ngựa dựng theo bản thiết kế: bàn hình chữ thập trên lưới 15x15,
 * bốn góc là bốn bức tranh ngựa, giữa là hoa văn bốn cánh, đường chạy 52 ô
 * chạy vòng quanh và mỗi màu có cầu 6 ô đánh số về chuồng.
 *
 * Bản vẽ gốc vẽ tay nên ô không đều tăm tắp, không dùng cả tấm làm nền được;
 * ở đây dựng lưới đều rồi ghép từng mảnh đã cắt (scripts/slice-ludo-art.py).
 */

const N = 15;
const TRACK = 52;

/** Màu bản vẽ theo ghế: ghế 0 góc trên trái rồi đi thuận chiều kim đồng hồ. */
const SEAT_ART: LudoColor[] = ['blue', 'red', 'green', 'yellow'];
/** Ô gốc (cột, hàng) của bốn chuồng 6x6. */
const YARD_AT: [number, number][] = [
  [0, 0],
  [9, 0],
  [9, 9],
  [0, 9],
];

/**
 * 52 ô đường chạy trên lưới 15x15, đi thuận chiều kim đồng hồ và bắt đầu ngay
 * ô xuất phát của ghế 0. Thứ tự này khớp với engine: ô xuất phát của bốn ghế
 * rơi đúng vào chỉ số 0, 13, 26, 39.
 */
const TRACK_CELLS: [number, number][] = (() => {
  const c: [number, number][] = [];
  for (let x = 1; x <= 5; x++) c.push([x, 6]);
  for (let y = 5; y >= 0; y--) c.push([6, y]);
  c.push([7, 0]);
  for (let y = 0; y <= 5; y++) c.push([8, y]);
  for (let x = 9; x <= 14; x++) c.push([x, 6]);
  c.push([14, 7]);
  for (let x = 14; x >= 9; x--) c.push([x, 8]);
  for (let y = 9; y <= 14; y++) c.push([8, y]);
  c.push([7, 14]);
  for (let y = 14; y >= 9; y--) c.push([6, y]);
  for (let x = 5; x >= 0; x--) c.push([x, 8]);
  c.push([0, 7]);
  c.push([0, 6]);
  return c;
})();

/**
 * Cầu về chuồng của từng ghế. Lưới 15x15 chừa 5 ô giữa mép chuồng và hoa văn
 * trung tâm, còn ô thứ 6 của engine chính là về đích (`lane === 5` là 'done'),
 * nên chỉ vẽ 5 ô.
 */
const LANE_LEN = 5;
const LANE_CELLS: [number, number][][] = [
  Array.from({ length: LANE_LEN }, (_, k) => [1 + k, 7] as [number, number]),
  Array.from({ length: LANE_LEN }, (_, k) => [7, 1 + k] as [number, number]),
  Array.from({ length: LANE_LEN }, (_, k) => [13 - k, 7] as [number, number]),
  Array.from({ length: LANE_LEN }, (_, k) => [7, 13 - k] as [number, number]),
];

/** Bốn chỗ đậu ngựa trong chuồng, tính theo ô con của khối 6x6. */
const YARD_SLOTS: [number, number][] = [
  [1.1, 1.1],
  [3.4, 1.1],
  [1.1, 3.4],
  [3.4, 3.4],
];

export default function LudoBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const edge = 4;
  const board = Math.max(260, Math.min(space.width - 12, space.height - 250));
  const cell = board / N;
  // RN tính width gồm cả viền nên phải cộng viền vào, không thì hàng ô ngoài
  // cùng bị mép bàn cắt mất.
  const frame = board + edge * 2;
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const canRoll = yourTurn && !view.rolled;
  const moves: number[] = view.moves ?? [];
  const seats: number = view.players.length;
  const starts: number[] = view.starts ?? [0, 13, 26, 39];
  const safe: number[] = view.safe ?? [];

  const at = (col: number, row: number) => ({ left: col * cell, top: row * cell });
  const artOf = (seat: number) => SEAT_ART[seat % SEAT_ART.length];

  /** Ngựa đặt lên bàn — bấm được khi nước đi đó hợp lệ. */
  const Horse = ({ piece, col, row, pad }: { piece: any; col: number; row: number; pad?: boolean }) => {
    const can = yourTurn && moves.includes(piece.id);
    const art = artOf(piece.seat);
    const h = cell * 0.92;
    const w = h * (LUDO_RATIO[`horse-${art}`] ?? 0.58);
    return (
      <Pressable
        disabled={!can}
        onPress={() => send('move', { pieceId: piece.id })}
        style={{
          position: 'absolute',
          left: col * cell + (cell - w) / 2,
          top: row * cell + cell * 0.04 - h * 0.18,
          width: w,
          height: h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ngựa đứng trong chuồng nằm đè lên tranh, thêm đĩa sáng cho nổi lên */}
        {pad ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -cell * 0.04,
              width: cell * 0.8,
              height: cell * 0.8,
              borderRadius: cell,
              backgroundColor: 'rgba(255,252,242,0.88)',
              borderWidth: 1.5,
              borderColor: 'rgba(90,70,45,0.35)',
            }}
          />
        ) : null}
        {can ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -cell * 0.06,
              width: cell * 0.86,
              height: cell * 0.86,
              borderRadius: cell,
              borderWidth: 2.5,
              borderColor: '#FFFFFF',
              backgroundColor: 'rgba(255,255,255,0.35)',
            }}
          />
        ) : null}
        <Image source={LUDO_HORSE[art]} resizeMode="contain" style={{ width: w, height: h }} />
      </Pressable>
    );
  };

  return (
    <View style={{ gap: S.sm, alignItems: 'center' }}>
      <VersusBar
        players={view.players}
        activeSeat={view.turnSeat}
        mySeat={mySeat}
        deadline={deadline}
        total={20}
        score={(seat) => `${view.pieces.filter((p: any) => p.seat === seat && p.state === 'done').length}/4 về đích`}
      />
      <TurnBanner
        yourTurn={yourTurn}
        text={view.over ? 'Kết thúc' : canRoll ? 'Tung xúc xắc đi!' : yourTurn ? 'Chọn ngựa để đi' : 'Chờ đối thủ...'}
      />

      <View
        style={[
          {
            width: frame,
            height: frame,
            borderRadius: R.lg,
            backgroundColor: '#FBF3E2',
            borderWidth: edge,
            borderColor: '#2E2A26',
            overflow: 'hidden',
          },
          softShadow(0.2, 16, 8),
        ]}
      >
        {/* Bốn bức tranh ngựa ở góc */}
        {/* Bàn luôn vẽ đủ bốn góc; góc không có người chơi thì làm mờ đi. */}
        {YARD_AT.map(([col, row], seat) => (
          <Image
            key={`yard${seat}`}
            source={LUDO_YARD[artOf(seat)]}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              ...at(col, row),
              width: cell * 6,
              height: cell * 6,
              opacity: seat < seats ? 1 : 0.28,
            }}
          />
        ))}

        {/* Cầu về chuồng: ô đánh số 1..6 của từng màu */}
        {LANE_CELLS.map((cells, seat) =>
          seat < seats
            ? cells.map(([col, row], k) => (
                <Image
                  key={`lane${seat}-${k}`}
                  source={LUDO_LANE[artOf(seat)][k]}
                  resizeMode="stretch"
                  style={{ position: 'absolute', ...at(col, row), width: cell, height: cell }}
                />
              ))
            : null,
        )}

        {/* 52 ô đường chạy */}
        {TRACK_CELLS.map(([col, row], i) => {
          const startSeat = starts.indexOf(i);
          if (startSeat >= 0 && startSeat < seats) {
            return (
              <Image
                key={`t${i}`}
                source={LUDO_START[artOf(startSeat)]}
                resizeMode="stretch"
                style={{ position: 'absolute', ...at(col, row), width: cell, height: cell }}
              />
            );
          }
          if (safe.includes(i)) {
            // Ô an toàn mang huy hiệu ngựa của phe gần nó nhất.
            const owner = Math.floor(i / 13) % Math.max(1, seats);
            return (
              <Image
                key={`t${i}`}
                source={LUDO_SAFE[artOf(owner)]}
                resizeMode="stretch"
                style={{ position: 'absolute', ...at(col, row), width: cell, height: cell }}
              />
            );
          }
          return (
            <View
              key={`t${i}`}
              style={{
                position: 'absolute',
                left: col * cell + cell * 0.1,
                top: row * cell + cell * 0.1,
                width: cell * 0.8,
                height: cell * 0.8,
                borderRadius: cell,
                borderWidth: 1.5,
                borderColor: 'rgba(150,120,80,0.5)',
                backgroundColor: '#FFFCF2',
              }}
            />
          );
        })}

        {/* Hoa văn bốn cánh ở giữa */}
        <Image
          source={LUDO_CENTER}
          resizeMode="stretch"
          style={{ position: 'absolute', ...at(6, 6), width: cell * 3, height: cell * 3 }}
        />

        {/* Ngựa còn trong chuồng */}
        {view.pieces
          .filter((p: any) => p.state === 'home')
          .map((p: any) => {
            const [yc, yr] = YARD_AT[p.seat % 4];
            const [sx, sy] = YARD_SLOTS[p.id % 4];
            return <Horse key={p.id} piece={p} col={yc + sx} row={yr + sy} pad />;
          })}

        {/* Ngựa trên đường chạy */}
        {view.pieces
          .filter((p: any) => p.state === 'track')
          .map((p: any) => {
            const [col, row] = TRACK_CELLS[((p.pos % TRACK) + TRACK) % TRACK];
            return <Horse key={p.id} piece={p} col={col} row={row} />;
          })}

        {/* Ngựa đang trong cầu về chuồng */}
        {view.pieces
          .filter((p: any) => p.state === 'lane')
          .map((p: any) => {
            const [col, row] = LANE_CELLS[p.seat % 4][Math.min(LANE_LEN - 1, Math.max(0, p.lane))];
            return <Horse key={p.id} piece={p} col={col} row={row} />;
          })}

        {/* Ngựa đã về đích đứng quanh hoa văn giữa */}
        {view.pieces
          .filter((p: any) => p.state === 'done')
          .map((p: any, i: number) => (
            <Image
              key={p.id}
              source={LUDO_HORSE[artOf(p.seat)]}
              resizeMode="contain"
              style={{
                position: 'absolute',
                left: cell * (6.2 + (i % 3) * 0.9),
                top: cell * (6.9 + Math.floor(i / 3) * 0.9),
                width: cell * 0.5,
                height: cell * 0.8,
              }}
            />
          ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <DieFace value={view.dice} size={46} color={C.ink} />
        {canRoll ? (
          <Btn label="Tung xúc xắc" icon="dice" size="lg" onPress={() => send('roll', {})} />
        ) : yourTurn && view.rolled && moves.length ? (
          <Txt size={12} weight="bold" color={C.mint}>
            Chọn 1 trong {moves.length} ngựa có thể đi
          </Txt>
        ) : (
          <Txt size={12} color={C.inkFaint}>
            {view.over ? 'Ván đã kết thúc' : 'Đối thủ đang đi...'}
          </Txt>
        )}
      </View>

      {/* Số ngựa đã về đích của từng người */}
      <View style={{ flexDirection: 'row', gap: S.md, flexWrap: 'wrap', justifyContent: 'center' }}>
        {view.players.map((pl: any, seat: number) => {
          const done = view.pieces.filter((p: any) => p.seat === seat && p.state === 'done').length;
          return (
            <View key={seat} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Image
                source={LUDO_HORSE[artOf(seat)]}
                resizeMode="contain"
                style={{ width: 14, height: 22 }}
              />
              <Txt size={11} weight="bold" color={SEAT_COLORS[seat]}>
                {pl.name}
              </Txt>
              <Txt size={11} color={C.inkFaint}>
                {done}/4
              </Txt>
            </View>
          );
        })}
      </View>
      <GameLog log={view.log} />
    </View>
  );
}
