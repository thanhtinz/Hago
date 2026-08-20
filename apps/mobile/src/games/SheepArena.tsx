import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
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
        <Txt size={20} weight="display" color={left < 15000 ? C.danger : C.ink}>
          ⏱ {Math.ceil(left / 1000)}s
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {view.actors.map((a: any) => (
            <Chip
              key={a.seat}
              label={`${view.players[a.seat].name}: ${a.score}`}
              color="#fff"
              soft={SEAT_COLORS[a.seat]}
              size={11}
            />
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'center' }}>
        <View style={{ width: ARENA + 2, height: (ARENA / view.width) * view.height + 2, backgroundColor: '#DEF7E7', borderRadius: R.lg, borderWidth: 3, borderColor: '#A8E2C1', overflow: 'hidden' }}>
          {/* Chuồng */}
          {view.pens.map((p: any) => (
            <View
              key={p.seat}
              style={{
                position: 'absolute',
                left: p.x * cell,
                top: p.y * cell,
                width: cell,
                height: cell,
                backgroundColor: SEAT_COLORS[p.seat] + '44',
                borderRadius: 6,
                borderWidth: 2,
                borderColor: SEAT_COLORS[p.seat],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: cell * 0.55 }}>🏠</Text>
            </View>
          ))}
          {/* Cừu */}
          {view.sheep
            .filter((s: any) => !s.penned)
            .map((s: any) => (
              <View key={s.id} style={{ position: 'absolute', left: s.x * cell, top: s.y * cell, width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: cell * 0.7 }}>{s.golden ? '🐏' : '🐑'}</Text>
              </View>
            ))}
          {/* Người chơi */}
          {view.actors.map((a: any) => (
            <View
              key={a.seat}
              style={{
                position: 'absolute',
                left: a.x * cell,
                top: a.y * cell,
                width: cell,
                height: cell,
                borderRadius: cell / 2,
                backgroundColor: SEAT_COLORS[a.seat],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: a.seat === mySeat ? 3 : 1,
                borderColor: a.seat === mySeat ? '#fff' : 'rgba(0,0,0,0.2)',
              }}
            >
              <Text style={{ fontSize: cell * 0.55 }}>{a.carrying != null ? '🧑‍🌾' : '🏃'}</Text>
            </View>
          ))}
        </View>
      </View>

      <Txt size={12} color={C.inkSoft} center>
        {me?.carrying != null ? 'Đang vác cừu — chạy về chuồng của bạn! 🏠' : 'Đi tới ô có cừu để bắt 🐑 · Cừu vàng 🐏 = 3 điểm'}
      </Txt>

      {/* D-pad chibi */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <DPadBtn label="⬆️" onPress={() => send('move', { dir: 'up' })} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <DPadBtn label="⬅️" onPress={() => send('move', { dir: 'left' })} />
          <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24 }}>{me?.carrying != null ? '🐑' : '·'}</Text>
          </View>
          <DPadBtn label="➡️" onPress={() => send('move', { dir: 'right' })} />
        </View>
        <DPadBtn label="⬇️" onPress={() => send('move', { dir: 'down' })} />
      </View>
      <GameLog log={view.log} />
    </View>
  );
}

function DPadBtn({ label, onPress }: { label: string; onPress: () => void }) {
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
      <Text style={{ fontSize: 26 }}>{label}</Text>
    </Pressable>
  );
}
