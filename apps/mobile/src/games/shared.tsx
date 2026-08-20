import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar, Bar, Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';

export interface BoardProps {
  view: any;
  mySeat: number;
  send: (type: string, payload?: any) => void;
  deadline: number | null;
  /** Không gian còn lại cho bàn chơi sau khi trừ HUD — dùng để co giãn full screen. */
  space: { width: number; height: number };
}

/** Đồng hồ đếm ngược lượt, dùng chung cho mọi game. */
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
    <View style={{ gap: 3, minWidth: 76 }}>
      <Txt size={11} weight="bold" color={danger ? C.danger : C.inkSoft} center>
        ⏱ {secs}s
      </Txt>
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
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: R.pill,
              backgroundColor: active ? C.surface : 'transparent',
              borderWidth: 2,
              borderColor: active ? SEAT_COLORS[i] : 'transparent',
            }}
          >
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: SEAT_COLORS[i] }} />
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
