import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

const BOARD = 300;
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

export default function LudoBoard({ view, mySeat, send, deadline }: BoardProps) {
  const cell = BOARD / RING;
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const canRoll = yourTurn && !view.rolled;
  const moves: number[] = view.moves ?? [];

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PlayerStrip
          players={view.players}
          activeSeat={view.turnSeat}
          mySeat={mySeat}
          extra={(seat) => (
            <Chip label={`${view.pieces.filter((p: any) => p.seat === seat && p.state === 'done').length}/4 🏁`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
          )}
        />
        <TurnTimer deadline={deadline} total={20} />
      </View>
      <TurnBanner yourTurn={yourTurn} text={view.over ? 'Kết thúc' : canRoll ? 'Tung xúc xắc đi!' : yourTurn ? 'Chọn ngựa để đi' : 'Chờ đối thủ...'} />

      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: BOARD,
            height: BOARD,
            backgroundColor: '#FFF3E4',
            borderRadius: R.lg,
            borderWidth: 3,
            borderColor: '#E7C79E',
          }}
        >
          {/* Ô vòng ngoài */}
          {Array.from({ length: 52 }, (_, i) => {
            const p = trackPos(i, cell);
            const isStart = (view.starts ?? []).includes(i);
            const isSafe = (view.safe ?? []).includes(i);
            const startSeat = (view.starts ?? []).indexOf(i);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: cell - 1,
                  height: cell - 1,
                  borderRadius: 4,
                  backgroundColor: isStart ? SEAT_COLORS[startSeat] + '55' : isSafe ? '#FFE9C7' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#EBD6BC',
                }}
              />
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
                  style={{
                    position: 'absolute',
                    left: pos.x + 1,
                    top: pos.y + 1,
                    width: cell - 3,
                    height: cell - 3,
                    borderRadius: cell,
                    backgroundColor: SEAT_COLORS[p.seat],
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: selectable ? 2 : 1,
                    borderColor: selectable ? '#fff' : 'rgba(0,0,0,0.15)',
                  }}
                >
                  <Text style={{ fontSize: cell * 0.5 }}>🐴</Text>
                </Pressable>
              );
            })}

          {/* Khu trung tâm: chuồng + cầu về đích */}
          <View style={{ position: 'absolute', left: cell * 2.2, top: cell * 2.2, right: cell * 2.2, bottom: cell * 2.2, backgroundColor: '#FFFAF2', borderRadius: R.md, padding: 6, gap: 6, justifyContent: 'center' }}>
            {view.players.map((pl: any, seat: number) => {
              const home = view.pieces.filter((p: any) => p.seat === seat && p.state === 'home');
              const lane = view.pieces.filter((p: any) => p.seat === seat && p.state === 'lane');
              const done = view.pieces.filter((p: any) => p.seat === seat && p.state === 'done');
              return (
                <View key={seat} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SEAT_COLORS[seat] }} />
                  <View style={{ flexDirection: 'row', gap: 2, flex: 1 }}>
                    {home.map((p: any) => (
                      <Pressable
                        key={p.id}
                        disabled={!(yourTurn && moves.includes(p.id))}
                        onPress={() => send('move', { pieceId: p.id })}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: SEAT_COLORS[seat] + (yourTurn && moves.includes(p.id) ? 'FF' : '66'),
                          borderWidth: yourTurn && moves.includes(p.id) ? 2 : 0,
                          borderColor: C.ink,
                        }}
                      />
                    ))}
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
                      <Text key={p.id} style={{ fontSize: 12 }}>
                        🏁
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: S.sm }}>
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: R.md,
            backgroundColor: C.surface,
            borderWidth: 3,
            borderColor: C.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={30} weight="display" color={C.primary}>
            {view.dice ?? '–'}
          </Txt>
        </View>
        {canRoll ? <Btn label="Tung xúc xắc" icon="🎲" size="lg" onPress={() => send('roll', {})} /> : null}
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
