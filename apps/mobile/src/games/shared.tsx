import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Bar, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { Chibi } from './chibiAssets';
import { ChibiImg } from './ChibiImg';

export interface BoardProps {
  view: any;
  mySeat: number;
  send: (type: string, payload?: any) => void;
  deadline: number | null;
}

/** Đồng hồ đếm ngược lượt — dùng asset timer chibi. */
export function TurnTimer({ deadline, total = 30 }: { deadline: number | null; total?: number }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(deadline ? Math.max(0, deadline - Date.now()) : 0);
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const secs = Math.ceil(left / 1000);
  const danger = secs <= 5;
  return (
    <View style={{ gap: 3, minWidth: 84, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ChibiImg source={Chibi.shared.timer} size={22} />
        <Txt size={12} weight="bold" color={danger ? C.danger : C.inkSoft}>
          {secs}s
        </Txt>
      </View>
      <Bar value={left} max={total * 1000} color={danger ? C.danger : C.mint} height={5} />
    </View>
  );
}

export function PlayerStrip({
  players,
  activeSeat,
  mySeat,
  extra,
}: {
  players: any[];
  activeSeat: number;
  mySeat: number;
  extra?: (seat: number) => React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      {players.map((p: any, i: number) => {
        const active = i === activeSeat;
        return (
          <View
            key={p.id ?? i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: R.pill,
              backgroundColor: active ? C.surface : 'transparent',
              borderWidth: 2,
              borderColor: active ? SEAT_COLORS[i] : 'transparent',
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: SEAT_COLORS[i],
                borderWidth: 2,
                borderColor: '#fff',
              }}
            />
            <Txt size={11} weight={active ? 'bold' : 'medium'} color={active ? C.ink : C.inkSoft} numberOfLines={1}>
              {p.name}
              {i === mySeat ? ' (bạn)' : ''}
            </Txt>
            {extra?.(i)}
          </View>
        );
      })}
    </View>
  );
}

export function GameLog({ log }: { log: string[] }) {
  if (!log?.length) return null;
  return (
    <View style={{ backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: S.md, gap: 3 }}>
      {log.slice(-4).map((l, i) => (
        <Txt key={i} size={11} color={i === log.slice(-4).length - 1 ? C.ink : C.inkFaint}>
          • {l}
        </Txt>
      ))}
    </View>
  );
}

export function TurnBanner({ yourTurn, text }: { yourTurn: boolean; text: string }) {
  return (
    <View
      style={{
        backgroundColor: yourTurn ? C.mintSoft : C.surfaceAlt,
        borderRadius: R.pill,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'center',
      }}
    >
      <Txt size={13} weight="bold" color={yourTurn ? '#1F7A50' : C.inkSoft}>
        {text}
      </Txt>
    </View>
  );
}

export function DiceFace({ value, size = 56 }: { value: number | null | undefined; size?: number }) {
  const face = value && value >= 1 && value <= 6 ? value : null;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: R.md,
        backgroundColor: C.surface,
        borderWidth: 3,
        borderColor: C.line,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {face ? (
        <Image source={Chibi.shared.dice[face]!} style={{ width: size - 8, height: size - 8 }} resizeMode="contain" />
      ) : (
        <Txt size={18} weight="display" color={C.inkFaint}>
          –
        </Txt>
      )}
    </View>
  );
}
