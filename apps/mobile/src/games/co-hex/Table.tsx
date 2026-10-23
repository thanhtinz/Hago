import React, { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import type { BotLevel, MetaState, Seat, Wrapped } from '@co/core';
import { hexBot, type HexAction, type HexState, type HexView } from '@co/game-co-hex';
import { hexMeta } from '../../catalog';
import { meName } from '../../net/api';
import { LEVEL_NAME, MatchShell } from '../../ui/MatchShell';
import { S } from '../../ui/theme';
import { TableBackdrop, tintOf } from '../../ui/TableBackdrop';
import type { AiProp } from '../ai';
import { useChamSao } from '../ai';
import { BOT, ME, useFlagOnTimeout, useVsBot } from '../useVsBot';
import { HexBoard } from './Board';
import { faceFor } from './theme';

type S0 = MetaState<HexState>;
type A0 = Wrapped<HexAction>;

const HINTS: Record<BotLevel, string> = {
  1: 'Đặt gần quân mình, không biết chặn',
  2: 'Đo khoảng cách nối bằng mạch điện trở, biết giữ cầu',
  3: 'Tìm kiếm MCTS — ván ngẫu nhiên của Hex luôn có thắng thua',
};

export function HexTable({ level, onLevel, onHome, ai }: { level: BotLevel; onLevel: (l: BotLevel) => void; onHome: () => void; ai?: AiProp }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pickBot = useCallback(
    (s: S0, seat: Seat, lv: BotLevel, rng: Parameters<typeof hexBot.pick>[3], budget: number): A0 => ({
      t: 'game',
      a: hexBot.pick(s.inner, seat, lv, rng, budget),
    }),
    [],
  );

  const m = useVsBot<S0, A0>(hexMeta as never, pickBot, {
    config: ai?.config ?? {},
    startMs: 10 * 60 * 1000,
    level,
    ...(ai ? { hatCoDinh: ai.hat } : {}),
    budgetMs: 900,
  });
  useChamSao(ai, m);
  useFlagOnTimeout<A0>(m.clock, m.toMove, m.outcome, m.send, (seat) => ({ t: 'flag', seat }));

  const view = hexMeta.view(m.state, ME).v as HexView;
  const myTurn = m.toMove === ME && !m.outcome;

  const boardWidth = Math.min(width - S.xl * 2, 460);
  const boardHeight = boardWidth * 0.62 + 28; // tỉ lệ hình thoi + chỗ cho nút Đổi
  void height;
  void insets;

  const hintAt = m.hint?.t === 'game' && typeof m.hint.a.at === 'number' ? m.hint.a.at : null;
  const hintSwap = m.hint?.t === 'game' && m.hint.a.swap === true;

  return (
    <MatchShell
      title="Cờ Hex"
      {...(ai ? {} : { level, onLevel, levelHints: HINTS })}
      onHome={onHome}
      onRules={() => router.push('/luat/co-hex')}
      onReset={() => m.reset()}
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
      note={
        m.hint
          ? hintSwap
            ? 'Gợi ý: đổi lấy quân mở màn đó'
            : 'Gợi ý: nước mà máy mức cao nhất sẽ chọn ở chỗ bạn'
          : myTurn && view.canSwap
            ? 'Đối thủ vừa mở màn: lấy luôn quân đó bằng nút Đổi, hoặc cứ đặt quân như thường'
            : myTurn
              ? 'Đặt một quân — nối hai bờ cùng màu với quân của bạn'
              : null
      }
      ended={m.outcome}
      youWon={m.outcome?.winner === ME}
      surface={(w, h) => <TableBackdrop width={w} height={h} tint={tintOf('co-hex')} />}
      top={{ name: 'Máy', sub: `Mức ${LEVEL_NAME[level]}`, token: <Token seat={BOT} active={m.toMove === BOT} />, active: !m.outcome && m.toMove === BOT, thinking: m.thinking, ms: m.clock[BOT] }}
      bottom={{ name: meName(), sub: 'Đấu với máy', token: <Token seat={ME} active={m.toMove === ME} />, active: myTurn, ms: m.clock[ME] }}
    >
      <View style={{ width: boardWidth, height: boardHeight, alignItems: 'center', justifyContent: 'center' }}>
        <HexBoard
          view={view}
          width={boardWidth}
          mySeat={ME}
          onPlay={(at) => m.send(ME, { t: 'game', a: { at } })}
          onSwap={() => m.send(ME, { t: 'game', a: { swap: true } })}
          disabled={!myTurn}
          hint={hintAt}
        />
      </View>
    </MatchShell>
  );
}

function Token({ seat, active }: { seat: number; active: boolean }) {
  const f = faceFor(seat);
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6DAC4',
        borderWidth: 2,
        borderColor: active ? '#E3BC72' : '#B49B72',
      }}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill={f.face} stroke={f.rim} strokeWidth={1.2} />
      </Svg>
    </View>
  );
}
