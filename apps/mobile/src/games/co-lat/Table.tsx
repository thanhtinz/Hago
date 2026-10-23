import React, { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import type { BotLevel, MetaState, Seat, Wrapped } from '@co/core';
import { latBot, type LatAction, type LatState, type LatView } from '@co/game-co-lat';
import { latMeta } from '../../catalog';
import { meName } from '../../net/api';
import { LEVEL_NAME, MatchShell } from '../../ui/MatchShell';
import { S } from '../../ui/theme';
import { TableBackdrop, tintOf } from '../../ui/TableBackdrop';
import type { AiProp } from '../ai';
import { useChamSao } from '../ai';
import { BOT, ME, useFlagOnTimeout, useVsBot } from '../useVsBot';
import { LatBoard } from './Board';
import { faceFor } from './theme';

type S0 = MetaState<LatState>;
type A0 = Wrapped<LatAction>;

const HINTS: Record<BotLevel, string> = {
  1: 'Ăn được nhiều là ăn — lối của người mới',
  2: 'Biết giữ góc và đếm độ cơ động',
  3: 'Nhìn sâu, vét cạn mười nước cuối',
};

export function LatTable({ level, onLevel, onHome, ai }: { level: BotLevel; onLevel: (l: BotLevel) => void; onHome: () => void; ai?: AiProp }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pickBot = useCallback(
    (s: S0, seat: Seat, lv: BotLevel, rng: Parameters<typeof latBot.pick>[3], budget: number): A0 => ({
      t: 'game',
      a: latBot.pick(s.inner, seat, lv, rng, budget),
    }),
    [],
  );

  const m = useVsBot<S0, A0>(latMeta as never, pickBot, {
    config: ai?.config ?? {},
    startMs: 5 * 60 * 1000,
    level,
    ...(ai ? { hatCoDinh: ai.hat } : {}),
    budgetMs: 300,
  });
  useChamSao(ai, m);
  useFlagOnTimeout<A0>(m.clock, m.toMove, m.outcome, m.send, (seat) => ({ t: 'flag', seat }));

  const view = latMeta.view(m.state, ME).v as LatView;
  const size = Math.min(width - S.xl * 2, height - insets.top - insets.bottom - 310, 440);
  const [den, trang] = view.counts;

  return (
    <MatchShell
      title="Cờ Lật"
      {...(ai ? {} : { level, onLevel, levelHints: HINTS })}
      onHome={onHome}
      onRules={() => router.push('/luat/co-lat')}
      onReset={m.reset}
      onDraw={() => {
        m.send(ME, { t: 'offer-draw' });
        setTimeout(() => m.send(BOT, { t: 'decline-draw' }), 500);
      }}
      onResign={() => m.send(ME, { t: 'resign' })}
      hintsLeft={m.hintsLeft}
      canHint={m.canHint}
      onHint={m.askHint}
      canUndo={m.canUndo}
      onUndo={m.undo}
      undosLeft={m.undosLeft}
      tally={m.tally}
      note={m.hint ? 'Gợi ý: nước mà máy mức Khó sẽ chọn ở chỗ bạn' : null}
      ended={m.outcome}
      youWon={m.outcome?.winner === ME}
      surface={(w, h) => <TableBackdrop width={w} height={h} tint={tintOf('co-lat')} />}
      top={{ name: 'Máy', sub: `Mức ${LEVEL_NAME[level]} · ${trang} quân trắng`, token: <Token seat={BOT} active={m.toMove === BOT} />, active: !m.outcome && m.toMove === BOT, thinking: m.thinking, ms: m.clock[BOT] }}
      bottom={{ name: meName(), sub: `${den} quân đen`, token: <Token seat={ME} active={m.toMove === ME} />, active: !m.outcome && m.toMove === ME, ms: m.clock[ME] }}
    >
      <View style={{ width: size, height: size }}>
        <LatBoard
          view={view}
          size={size}
          mySeat={ME}
          onPlay={(r, c) => m.send(ME, { t: 'game', a: { r, c } })}
          disabled={m.toMove !== ME || !!m.outcome}
          hint={m.hint?.t === 'game' ? m.hint.a : null}
        />
      </View>
    </MatchShell>
  );
}

/** Quân hai mặt thu nhỏ cho thanh người chơi. */
function Token({ seat, active }: { seat: number; active: boolean }) {
  const f = faceFor(seat);
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#24543E',
        borderWidth: 2,
        borderColor: active ? '#E3BC72' : '#4C9271',
      }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12.8} r={9} fill={f.deep} />
        <Circle cx={12} cy={12} r={9} fill={f.face} stroke={f.rim} strokeWidth={1} />
      </Svg>
    </View>
  );
}
