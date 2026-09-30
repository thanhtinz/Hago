import React, { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { BotLevel, MetaState, Seat, Wrapped } from '@co/core';
import { caroBot, type CaroAction, type CaroState, type CaroView } from '@co/game-co-caro';
import { caroMeta } from '../../catalog';
import { meName } from '../../net/api';
import { LEVEL_NAME, MatchShell } from '../../ui/MatchShell';
import { S, lift } from '../../ui/theme';
import { BOT, ME, useFlagOnTimeout, useVsBot } from '../useVsBot';
import { CaroBoard } from './Board';
import { PaperStack } from './Desk';
import { TableBackdrop, tintOf } from '../../ui/TableBackdrop';
import { caroTheme as CT, inkFor } from './theme';

type S0 = MetaState<CaroState>;
type A0 = Wrapped<CaroAction>;

const HINTS: Record<BotLevel, string> = {
  1: 'Đi gần như ngẫu nhiên, chỉ chặn nước thua ngay',
  2: 'Biết chặn và biết nối, đủ cho ván giết thời gian',
  3: 'Nhìn trước vài nước, chơi ăn thua',
};

export function CaroTable({ level, onLevel, onHome }: { level: BotLevel; onLevel: (l: BotLevel) => void; onHome: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pickBot = useCallback(
    (s: S0, seat: Seat, lv: BotLevel, rng: Parameters<typeof caroBot.pick>[3], budget: number): A0 => ({
      t: 'game',
      a: caroBot.pick(s.inner, seat, lv, rng, budget),
    }),
    [],
  );

  const m = useVsBot<S0, A0>(caroMeta as never, pickBot, { config: { size: 15 }, startMs: 5 * 60 * 1000, level });
  useFlagOnTimeout<A0>(m.clock, m.toMove, m.outcome, m.send, (seat) => ({ t: 'flag', seat }));

  const view = caroMeta.view(m.state, ME).v as CaroView;
  // Chừa mỗi bên một khoảng mặt bàn. Bàn cờ ăn sát mép màn hình thì tờ giấy
  // không còn nằm trên cái gì, mà thành nền của cả màn hình.
  const size = Math.min(width - S.xl * 2, height - insets.top - insets.bottom - 310, 440);

  return (
    <MatchShell
      title="Cờ Caro"
      level={level}
      onLevel={onLevel}
      levelHints={HINTS}
      onHome={onHome}
      onRules={() => router.push('/luat/co-caro')}
      onReset={m.reset}
      onDraw={() => {
        m.send(ME, { t: 'offer-draw' });
        // Máy chưa biết cân nhắc hoà nên nó từ chối ngay, thay vì để lời cầu
        // treo mãi không ai trả lời.
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
      surface={(w, h) => <TableBackdrop width={w} height={h} tint={tintOf('co-caro')} />}
      top={{ name: 'Máy', sub: `Mức ${LEVEL_NAME[level]}`, token: <Token seat={BOT} active={m.toMove === BOT} />, active: !m.outcome && m.toMove === BOT, thinking: m.thinking, ms: m.clock[BOT] }}
      bottom={{ name: meName(), sub: 'Đấu với máy', token: <Token seat={ME} active={m.toMove === ME} />, active: !m.outcome && m.toMove === ME, ms: m.clock[ME] }}
    >
      <View style={{ width: size, height: size }}>
        <PaperStack size={size} />
        <View style={[{ borderRadius: 4 }, lift(0.6, 26, 12)]}>
          <CaroBoard
            view={view}
            size={size}
            mySeat={ME}
            onPlay={(r, c) => m.send(ME, { t: 'game', a: { r, c } })}
            disabled={m.toMove !== ME || !!m.outcome}
            hint={m.hint?.t === 'game' ? m.hint.a : null}
          />
        </View>
      </View>
    </MatchShell>
  );
}

/** Quân của người chơi, vẽ đúng nét bút họ dùng trên bàn cờ. */
function Token({ seat, active }: { seat: number; active: boolean }) {
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CT.paper,
        borderWidth: 2,
        borderColor: active ? '#E3BC72' : CT.paperShade,
      }}
    >
      <Svg width={21} height={21} viewBox="0 0 100 100">
        {seat === 0 ? (
          <>
            <Path d="M22 22 L78 78" stroke={inkFor(0)} strokeWidth={12} strokeLinecap="round" fill="none" />
            <Path d="M78 22 L22 78" stroke={inkFor(0)} strokeWidth={12} strokeLinecap="round" fill="none" />
          </>
        ) : (
          <Path d="M74 30 A28 28 0 1 0 76 62 A28 28 0 0 0 66 24" stroke={inkFor(1)} strokeWidth={12} strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </View>
  );
}
