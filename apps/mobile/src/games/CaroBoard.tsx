import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Txt } from '../components/ui';
import { CaroMark } from '../components/Piece';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

export default function CaroBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const size = view.size ?? 15;
  // Bàn cờ chiếm trọn phần không gian còn lại, giới hạn để ô không quá to.
  const cell = Math.max(14, Math.min(34, Math.floor(Math.min(space.width - 26, space.height - 30) / size)));
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const winSet = useMemo(() => new Set<number>(view.winLine ?? []), [view.winLine]);
  const last = view.lastMove ? view.lastMove.y * size + view.lastMove.x : -1;

  return (
    <View style={{ gap: S.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlayerStrip players={view.players} activeSeat={view.turnSeat} mySeat={mySeat} />
        <TurnTimer deadline={deadline} total={30} />
      </View>
      <TurnBanner yourTurn={yourTurn} text={view.over ? 'Ván đã kết thúc' : yourTurn ? 'Tới lượt bạn — đánh đi!' : 'Đang chờ đối thủ...'} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
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
                    {v >= 0 ? <CaroMark kind={v === 0 ? 'o' : 'x'} color={SEAT_COLORS[v]} size={cell * 0.74} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.lg }}>
        <Legend color={SEAT_COLORS[0]} label={view.players[0]?.name} shape="o" />
        <Legend color={SEAT_COLORS[1]} label={view.players[1]?.name} shape="x" />
      </View>
      <GameLog log={view.log} />
    </View>
  );
}

function Legend({ color, label, shape }: { color: string; label: string; shape: 'o' | 'x' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <CaroMark kind={shape} color={color} size={18} />
      <Txt size={12} weight="medium" color={C.inkSoft}>
        {label}
      </Txt>
    </View>
  );
}
