import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

export default function CaroBoard({ view, mySeat, send, deadline }: BoardProps) {
  const size = view.size ?? 15;
  const cell = Math.min(26, Math.floor(330 / size));
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const winSet = useMemo(() => new Set<number>(view.winLine ?? []), [view.winLine]);
  const last = view.lastMove ? view.lastMove.y * size + view.lastMove.x : -1;

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PlayerStrip players={view.players} activeSeat={view.turnSeat} mySeat={mySeat} />
        <TurnTimer deadline={deadline} total={30} />
      </View>
      <TurnBanner yourTurn={yourTurn} text={view.over ? 'Ván đã kết thúc' : yourTurn ? 'Tới lượt bạn — đánh đi!' : 'Đang chờ đối thủ...'} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: '#F6DFC2',
            padding: 6,
            borderRadius: R.md,
            borderWidth: 3,
            borderColor: '#D8B48A',
          }}
        >
          {Array.from({ length: size }, (_, y) => (
            <View key={y} style={{ flexDirection: 'row' }}>
              {Array.from({ length: size }, (_, x) => {
                const idx = y * size + x;
                const v = view.cells[idx];
                const win = winSet.has(idx);
                return (
                  <Pressable
                    key={x}
                    disabled={!yourTurn || v !== -1}
                    onPress={() => send('move', { x, y })}
                    style={{
                      width: cell,
                      height: cell,
                      borderWidth: 0.5,
                      borderColor: '#C99C6B',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: win ? '#FFF0B3' : idx === last ? '#FFE9CF' : 'transparent',
                    }}
                  >
                    {v === 0 ? (
                      <View style={{ width: cell * 0.62, height: cell * 0.62, borderRadius: cell, borderWidth: 3, borderColor: SEAT_COLORS[0] }} />
                    ) : v === 1 ? (
                      <Txt size={cell * 0.8} weight="display" color={SEAT_COLORS[1]} style={{ lineHeight: cell }}>
                        ✕
                      </Txt>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.lg }}>
        <Legend color={SEAT_COLORS[0]} label={`${view.players[0]?.name} (O)`} />
        <Legend color={SEAT_COLORS[1]} label={`${view.players[1]?.name} (X)`} />
      </View>
      <GameLog log={view.log} />
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
      <Txt size={12} weight="medium" color={C.inkSoft}>
        {label}
      </Txt>
    </View>
  );
}
