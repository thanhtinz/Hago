import React, { useMemo } from 'react';
import { ImageBackground, Pressable, ScrollView, View } from 'react-native';
import { Txt } from '../components/ui';
import { C, R, S } from '../theme';
import { Chibi } from './chibiAssets';
import { ChibiImg } from './ChibiImg';
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
        <ImageBackground
          source={Chibi.caro.boardBg}
          imageStyle={{ borderRadius: R.md }}
          style={{
            padding: 6,
            borderRadius: R.md,
            borderWidth: 3,
            borderColor: '#D8B48A',
            overflow: 'hidden',
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
                      borderColor: 'rgba(201,156,107,0.55)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: win ? 'rgba(255,240,179,0.75)' : idx === last ? 'rgba(255,233,207,0.7)' : 'transparent',
                    }}
                  >
                    {v === 0 ? <ChibiImg source={Chibi.caro.pieceO} size={cell * 0.88} /> : null}
                    {v === 1 ? <ChibiImg source={Chibi.caro.pieceX} size={cell * 0.88} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ImageBackground>
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.xl }}>
        <Legend source={Chibi.caro.pieceO} label={`${view.players[0]?.name} (O)`} />
        <Legend source={Chibi.caro.pieceX} label={`${view.players[1]?.name} (X)`} />
      </View>
      <GameLog log={view.log} />
    </View>
  );
}

function Legend({ source, label }: { source: any; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <ChibiImg source={source} size={22} />
      <Txt size={12} weight="medium" color={C.inkSoft}>
        {label}
      </Txt>
    </View>
  );
}
