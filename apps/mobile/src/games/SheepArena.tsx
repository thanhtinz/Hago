import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Chip, Txt } from '../components/ui';
import { Chibi } from '../components/Chibi';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog } from './shared';

export default function SheepArena({ view, mySeat, send, space }: BoardProps) {
  // Chừa chỗ cho D-pad phía dưới.
  const ARENA = Math.max(220, Math.min(space.width - 20, space.height - 250));
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
              <Chibi name="house" size={cell * 0.66} />
            </View>
          ))}
          {/* Cừu */}
          {view.sheep
            .filter((s: any) => !s.penned)
            .map((s: any) => (
              <View key={s.id} style={{ position: 'absolute', left: s.x * cell, top: s.y * cell, width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                <Chibi name={s.golden ? 'sheep-golden' : 'sheep'} size={cell * 0.86} />
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
              <Chibi name={a.carrying != null ? 'farmer' : 'runner'} size={cell * 0.66} />
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Chibi name={me?.carrying != null ? 'house' : 'sheep-golden'} size={18} />
        <Txt size={12} color={C.inkSoft}>
          {me?.carrying != null ? 'Đang vác cừu — chạy về chuồng của bạn!' : 'Đi tới ô có cừu để bắt · Cừu vàng = 3 điểm'}
        </Txt>
      </View>

      {/* D-pad chibi */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <DPadBtn label="▲" onPress={() => send('move', { dir: 'up' })} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <DPadBtn label="◀" onPress={() => send('move', { dir: 'left' })} />
          <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
            {me?.carrying != null ? <Chibi name="sheep" size={30} /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.line }} />}
          </View>
          <DPadBtn label="▶" onPress={() => send('move', { dir: 'right' })} />
        </View>
        <DPadBtn label="▼" onPress={() => send('move', { dir: 'down' })} />
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
        width: 64,
        height: 64,
        borderRadius: R.lg,
        backgroundColor: pressed ? C.mint : C.surface,
        borderWidth: 2,
        borderColor: pressed ? C.mint : C.line,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: pressed ? 3 : 0 }],
      })}
    >
      {({ pressed }: any) => (
        <Txt size={24} weight="display" color={pressed ? '#fff' : C.mint}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}
