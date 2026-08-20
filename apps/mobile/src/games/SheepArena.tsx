import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, View } from 'react-native';
import { Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { Chibi } from './chibiAssets';
import { ChibiImg } from './ChibiImg';
import { BoardProps, GameLog } from './shared';

const ARENA = 320;

export default function SheepArena({ view, mySeat, send }: BoardProps) {
  const cell = ARENA / view.width;
  const [left, setLeft] = useState(view.remainingMs ?? 0);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, (view.endsAt ?? 0) - Date.now())), 200);
    return () => clearInterval(t);
  }, [view.endsAt]);

  const me = view.actors?.[mySeat];

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ChibiImg source={Chibi.shared.timer} size={28} />
          <Txt size={20} weight="display" color={left < 15000 ? C.danger : C.ink}>
            {Math.ceil(left / 1000)}s
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {view.actors.map((a: any) => (
            <View key={a.seat} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: SEAT_COLORS[a.seat], paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill }}>
              <ChibiImg source={Chibi.sheep.farmers[a.seat % 4]} size={20} />
              <Txt size={11} weight="bold" color="#fff">
                {view.players[a.seat].name}: {a.score}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'center' }}>
        <ImageBackground
          source={Chibi.sheep.arenaBg}
          imageStyle={{ borderRadius: R.lg }}
          style={{
            width: ARENA + 2,
            height: (ARENA / view.width) * view.height + 2,
            borderRadius: R.lg,
            borderWidth: 3,
            borderColor: '#A8E2C1',
            overflow: 'hidden',
          }}
        >
          {view.pens.map((p: any) => (
            <View
              key={p.seat}
              style={{
                position: 'absolute',
                left: p.x * cell,
                top: p.y * cell,
                width: cell,
                height: cell,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChibiImg source={Chibi.sheep.pens[p.seat % 4]} size={cell * 0.95} />
            </View>
          ))}
          {view.sheep
            .filter((s: any) => !s.penned)
            .map((s: any) => (
              <View key={s.id} style={{ position: 'absolute', left: s.x * cell, top: s.y * cell, width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                <ChibiImg source={s.golden ? Chibi.sheep.sheepGold : Chibi.sheep.sheep} size={cell * 0.92} />
              </View>
            ))}
          {view.actors.map((a: any) => (
            <View
              key={a.seat}
              style={{
                position: 'absolute',
                left: a.x * cell,
                top: a.y * cell,
                width: cell,
                height: cell,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: cell / 2,
                borderWidth: a.seat === mySeat ? 3 : 0,
                borderColor: '#fff',
              }}
            >
              <ChibiImg source={Chibi.sheep.farmers[a.seat % 4]} size={cell * 0.95} />
              {a.carrying != null ? (
                <View style={{ position: 'absolute', right: -2, top: -4 }}>
                  <ChibiImg source={Chibi.sheep.sheep} size={cell * 0.45} />
                </View>
              ) : null}
            </View>
          ))}
        </ImageBackground>
      </View>

      <Txt size={12} color={C.inkSoft} center>
        {me?.carrying != null ? 'Đang vác cừu — chạy về chuồng của bạn!' : 'Đi tới ô có cừu để bắt · Cừu vàng = 3 điểm'}
      </Txt>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <DPadBtn source={Chibi.shared.arrowUp} onPress={() => send('move', { dir: 'up' })} />
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <DPadBtn source={Chibi.shared.arrowLeft} onPress={() => send('move', { dir: 'left' })} />
          <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
            {me?.carrying != null ? <ChibiImg source={Chibi.sheep.sheep} size={36} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.inkFaint }} />}
          </View>
          <DPadBtn source={Chibi.shared.arrowRight} onPress={() => send('move', { dir: 'right' })} />
        </View>
        <DPadBtn source={Chibi.shared.arrowDown} onPress={() => send('move', { dir: 'down' })} />
      </View>
      <GameLog log={view.log} />
    </View>
  );
}

function DPadBtn({ source, onPress }: { source: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 62,
        height: 62,
        borderRadius: R.md,
        backgroundColor: pressed ? C.primarySoft : C.surface,
        borderWidth: 2,
        borderColor: C.line,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <ChibiImg source={source} size={40} />
    </Pressable>
  );
}
