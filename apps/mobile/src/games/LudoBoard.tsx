import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { DieFace, HorsePiece } from '../components/Piece';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

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
    <View style={{ gap: S.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlayerStrip
          players={view.players}
          activeSeat={view.turnSeat}
          mySeat={mySeat}
          extra={(seat) => (
            <Chip label={`${view.pieces.filter((p: any) => p.seat === seat && p.state === 'done').length}/4`} icon="flag" color={C.inkSoft} soft={C.surfaceAlt} size={10} />
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
                  <HorsePiece size={cell * 0.78} color="#FFFFFF" />
                </Pressable>
              );
            })}

          {/* Khu trung tâm: chuồng + cầu về đích */}
          <View style={{ position: 'absolute', left: cell * 2.2, top: cell * 2.2, right: cell * 2.2, bottom: cell * 2.2, backgroundColor: '#FFFAF2', borderRadius: R.md, padding: 6, gap: 6, justifyContent: 'center' }}>
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
                <View key={seat} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SEAT_COLORS[seat] }} />
                  <View style={{ flexDirection: 'row', gap: 2, flex: 1 }}>
                    {home.map((p: any) => {
                      const can = yourTurn && moves.includes(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          disabled={!can}
                          onPress={() => send('move', { pieceId: p.id })}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: SEAT_COLORS[seat] + (can ? 'FF' : '55'),
                            borderWidth: can ? 2 : 0,
                            borderColor: C.ink,
                          }}
                        >
                          <HorsePiece size={16} color="#FFFFFF" />
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
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: S.sm }}>
        {canRoll ? <Btn label="Tung xúc xắc" icon="dice" size="lg" style={{ alignSelf: 'center' }} onPress={() => send('roll', {})} /> : null}
        {yourTurn && view.rolled && moves.length ? (
          <Txt size={12} weight="bold" color={C.mint}>
            Chọn 1 trong {moves.length} ngựa có thể đi
          </Txt>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      <GameLog log={view.log} />
    </View>
  );
}
