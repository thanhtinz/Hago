import React from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { Chibi } from './chibiAssets';
import { ChibiImg } from './ChibiImg';
import { BoardProps, DiceFace, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

const BOARD = 300;
const RING = 13;

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
            <Chip
              label={`${view.pieces.filter((p: any) => p.seat === seat && p.state === 'done').length}/4`}
              color={C.inkSoft}
              soft={C.surfaceAlt}
              size={10}
            />
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
                    left: pos.x,
                    top: pos.y - 2,
                    width: cell,
                    height: cell,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: cell / 2,
                    borderWidth: selectable ? 2 : 0,
                    borderColor: '#fff',
                    backgroundColor: selectable ? 'rgba(255,255,255,0.35)' : 'transparent',
                  }}
                >
                  <ChibiImg source={Chibi.ludo.horses[p.seat % 4]} size={cell * 1.15} />
                </Pressable>
              );
            })}

          <View
            style={{
              position: 'absolute',
              left: cell * 2.2,
              top: cell * 2.2,
              right: cell * 2.2,
              bottom: cell * 2.2,
              backgroundColor: '#FFFAF2',
              borderRadius: R.md,
              padding: 6,
              gap: 6,
              justifyContent: 'center',
            }}
          >
            {view.players.map((pl: any, seat: number) => {
              const home = view.pieces.filter((p: any) => p.seat === seat && p.state === 'home');
              const lane = view.pieces.filter((p: any) => p.seat === seat && p.state === 'lane');
              const done = view.pieces.filter((p: any) => p.seat === seat && p.state === 'done');
              return (
                <View key={seat} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ChibiImg source={Chibi.ludo.horses[seat % 4]} size={18} />
                  <View style={{ flexDirection: 'row', gap: 2, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    {home.map((p: any) => (
                      <Pressable
                        key={p.id}
                        disabled={!(yourTurn && moves.includes(p.id))}
                        onPress={() => send('move', { pieceId: p.id })}
                        style={{
                          opacity: yourTurn && moves.includes(p.id) ? 1 : 0.55,
                          borderWidth: yourTurn && moves.includes(p.id) ? 2 : 0,
                          borderColor: C.ink,
                          borderRadius: 10,
                        }}
                      >
                        <ChibiImg source={Chibi.ludo.horses[seat % 4]} size={18} />
                      </Pressable>
                    ))}
                    {lane.map((p: any) => (
                      <Pressable
                        key={p.id}
                        disabled={!(yourTurn && moves.includes(p.id))}
                        onPress={() => send('move', { pieceId: p.id })}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          paddingHorizontal: 3,
                          borderRadius: 6,
                          backgroundColor: SEAT_COLORS[seat] + '33',
                        }}
                      >
                        <ChibiImg source={Chibi.ludo.horses[seat % 4]} size={16} />
                        <Txt size={9} weight="bold" color={SEAT_COLORS[seat]}>
                          {p.lane + 1}/6
                        </Txt>
                      </Pressable>
                    ))}
                    {done.map((p: any) => (
                      <ChibiImg key={p.id} source={Chibi.ludo.flag} size={14} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: S.sm }}>
        <DiceFace value={view.dice} size={64} />
        {canRoll ? <Btn label="Tung xúc xắc" size="lg" onPress={() => send('roll', {})} /> : null}
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
