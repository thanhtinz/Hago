import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { Art } from '../components/Art';
import { DieFace, HorsePiece } from '../components/Piece';
import { LinearGradient } from 'expo-linear-gradient';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer, VersusBar } from './shared';

const RING = 13; // 13 ô mỗi cạnh → 52 ô vòng ngoài

/** Ánh xạ chỉ số ô (0..51) sang toạ độ trên khung vuông. */
function trackPos(i: number, cell: number): { x: number; y: number } {
  const n = i % 52;
  const side = Math.floor(n / RING);
  const k = n % RING;
  const max = RING - 1;
  switch (side) {
    case 0:
      return { x: k * cell, y: 0 };
    case 1:
      return { x: max * cell, y: k * cell };
    case 2:
      return { x: (max - k) * cell, y: max * cell };
    default:
      return { x: 0, y: (max - k) * cell };
  }
}

export default function LudoBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const BOARD = Math.max(240, Math.min(space.width - 20, space.height - 150));
  // Trừ viền 3px mỗi bên để ô ngoài cùng không tràn khỏi khung.
  const cell = (BOARD - 6) / RING;
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const canRoll = yourTurn && !view.rolled;
  const moves: number[] = view.moves ?? [];

  return (
    <View style={{ gap: S.md }}>
      <VersusBar
        players={view.players}
        activeSeat={view.turnSeat}
        mySeat={mySeat}
        deadline={deadline}
        total={20}
        score={(seat) => `${view.pieces.filter((p: any) => p.seat === seat && p.state === 'done').length}/4 về đích`}
      />
      <TurnBanner yourTurn={yourTurn} text={view.over ? 'Kết thúc' : canRoll ? 'Tung xúc xắc đi!' : yourTurn ? 'Chọn ngựa để đi' : 'Chờ đối thủ...'} />

      <View style={{ alignItems: 'center' }}>
        <LinearGradient
          colors={['#E8C89A', '#D3A972']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[
            {
              width: BOARD,
              height: BOARD,
              borderRadius: R.lg,
              borderWidth: 3,
              borderColor: '#A9773F',
            },
            softShadow(0.18, 16, 8),
          ]}
        >
          {/* Ô vòng ngoài */}
          {Array.from({ length: 52 }, (_, i) => {
            const p = trackPos(i, cell);
            const isStart = (view.starts ?? []).includes(i);
            const isSafe = (view.safe ?? []).includes(i);
            const startSeat = (view.starts ?? []).indexOf(i);
            // Mỗi cạnh bàn thuộc về một người chơi — nhuộm nhạt theo màu phe đó
            // để nhìn ra ngay đường của ai, thay vì 52 ô trắng giống hệt nhau.
            const sideSeat = Math.floor((i % 52) / RING) % Math.max(1, view.players.length);
            const side = SEAT_COLORS[sideSeat];
            const tint = isStart ? SEAT_COLORS[startSeat] : null;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: p.x + 1,
                  top: p.y + 1,
                  width: cell - 3,
                  height: cell - 3,
                  borderRadius: 6,
                  backgroundColor: tint ? tint + '4D' : isSafe ? '#FFE0A8' : '#FFFCF3',
                  borderWidth: 2,
                  borderColor: tint ? tint : isSafe ? '#E2A44E' : side + '66',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // mép dưới sẫm hơn cho ra khối gạch, không phẳng như ô bảng tính
                  borderBottomWidth: 3.5,
                  borderBottomColor: tint ? tint : isSafe ? '#C98B33' : side + '99',
                }}
              >
                {isSafe && !tint ? <Art name="star" size={cell * 0.5} color="#E8A93C" glyph /> : null}
                {tint ? <Art name="ui-quick" size={cell * 0.46} color={tint} glyph /> : null}
              </View>
            );
          })}

          {/* Ngựa trên vòng ngoài */}
          {view.pieces
            .filter((p: any) => p.state === 'track')
            .map((p: any) => {
              const pos = trackPos(p.pos, cell);
              const selectable = yourTurn && moves.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  disabled={!selectable}
                  onPress={() => send('move', { pieceId: p.id })}
                  style={[{
                    position: 'absolute',
                    left: pos.x + 1,
                    top: pos.y + 1,
                    width: cell - 3,
                    height: cell - 3,
                    borderRadius: cell,
                    backgroundColor: SEAT_COLORS[p.seat],
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: selectable ? 2.5 : 2,
                    borderColor: selectable ? '#fff' : 'rgba(255,255,255,0.75)',
                  }, softShadow(0.28, 6, 3)]}
                >
                  <HorsePiece size={cell * 0.78} color="#FFFFFF" />
                </Pressable>
              );
            })}

          {/* Khu trung tâm: chuồng + cầu về đích */}
          <View
            style={[
              {
                position: 'absolute',
                left: cell * 2.2,
                top: cell * 2.2,
                right: cell * 2.2,
                bottom: cell * 2.2,
                backgroundColor: '#FFF8E9',
                borderRadius: R.md,
                borderWidth: 2.5,
                borderColor: '#B98B4E',
                padding: 8,
                gap: 6,
                justifyContent: 'center',
                overflow: 'hidden',
              },
              softShadow(0.1, 10, 3),
            ]}
          >
            {/* Vòng đích ở giữa sân nhà */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Art name="win" size={cell * 3.4} color="rgba(180,135,70,0.22)" />
            </View>
            {view.dice ? (
              <View style={{ alignItems: 'center', marginBottom: 2 }}>
                <DieFace value={view.dice} size={Math.min(54, cell * 1.9)} color={C.ink} />
              </View>
            ) : null}
            {view.players.map((pl: any, seat: number) => {
              const home = view.pieces.filter((p: any) => p.seat === seat && p.state === 'home');
              const lane = view.pieces.filter((p: any) => p.seat === seat && p.state === 'lane');
              const done = view.pieces.filter((p: any) => p.seat === seat && p.state === 'done');
              return (
                <View
                  key={seat}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 6,
                    borderRadius: R.pill,
                    backgroundColor: SEAT_COLORS[seat] + '1A',
                    borderWidth: 1.5,
                    borderColor: SEAT_COLORS[seat] + '3D',
                  }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SEAT_COLORS[seat] }} />
                  <View style={{ flexDirection: 'row', gap: 2, flex: 1 }}>
                    {home.map((p: any) => {
                      const can = yourTurn && moves.includes(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          disabled={!can}
                          onPress={() => send('move', { pieceId: p.id })}
                          style={[
                            {
                              width: 26,
                              height: 26,
                              borderRadius: 13,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: SEAT_COLORS[seat] + (can ? 'FF' : '66'),
                              borderWidth: 2,
                              borderColor: can ? '#fff' : 'rgba(255,255,255,0.8)',
                            },
                            softShadow(can ? 0.28 : 0.12, 6, 3),
                          ]}
                        >
                          <HorsePiece size={18} color="#FFFFFF" />
                        </Pressable>
                      );
                    })}
                    {lane.map((p: any) => (
                      <Pressable
                        key={p.id}
                        disabled={!(yourTurn && moves.includes(p.id))}
                        onPress={() => send('move', { pieceId: p.id })}
                        style={{ paddingHorizontal: 3, borderRadius: 6, backgroundColor: SEAT_COLORS[seat], justifyContent: 'center' }}
                      >
                        <Txt size={9} weight="bold" color="#fff">
                          {p.lane + 1}/6
                        </Txt>
                      </Pressable>
                    ))}
                    {done.map((p: any) => (
                      <Icon key={p.id} name="flag" size={14} color={SEAT_COLORS[seat]} strokeWidth={2.4} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </LinearGradient>
      </View>

      <View style={{ alignItems: 'center', gap: S.sm }}>
        {canRoll ? <Btn label="Tung xúc xắc" icon="dice" size="lg" style={{ alignSelf: 'center' }} onPress={() => send('roll', {})} /> : null}
        {yourTurn && view.rolled && moves.length ? (
          <Txt size={12} weight="bold" color={C.mint}>
            Chọn 1 trong {moves.length} ngựa có thể đi
          </Txt>
        ) : null}
      </View>
      <GameLog log={view.log} />
    </View>
  );
}
