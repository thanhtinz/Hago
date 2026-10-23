import React, { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import type { BotLevel, MetaState, Seat, Wrapped } from '@co/core';
import { baQuanBot, type BaQuanAction, type BaQuanState, type BaQuanView } from '@co/game-co-ba-quan';
import { baQuanMeta } from '../../catalog';
import { meName } from '../../net/api';
import { MatchShell } from '../../ui/MatchShell';
import { S } from '../../ui/theme';
import { TableBackdrop, tintOf } from '../../ui/TableBackdrop';
import type { AiProp } from '../ai';
import { useChamSao } from '../ai';
import { BOT, ME, useFlagOnTimeout, useVsBot } from '../useVsBot';
import { BaQuanBoard } from './Board';
import { faceFor } from './theme';

type S0 = MetaState<BaQuanState>;
type A0 = Wrapped<BaQuanAction>;

/**
 * Tên mức riêng cho game này: mức cao nhất **không bao giờ thua** vì game
 * đã giải được — gọi nó là "Khó" là hứa một điều không đúng (đặc tả luật,
 * mục 4). `MatchShell` vẫn đánh số mức 1–3, ở đây chỉ đổi chữ.
 */
const LEVEL_NAMES: Record<BotLevel, string> = { 1: 'Dễ', 2: 'Thường', 3: 'Không thua' };

const HINTS: Record<BotLevel, string> = {
  1: 'Tìm sâu hai nước — sai như người mới sai',
  2: 'Tìm sâu bốn nước, biết chặn hàng ba',
  3: 'Vét cạn cả ván: đi đúng là nó không thua',
};

export function BaQuanTable({ level, onLevel, onHome, ai }: { level: BotLevel; onLevel: (l: BotLevel) => void; onHome: () => void; ai?: AiProp }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [picked, setPicked] = useState<number | null>(null);

  const pickBot = useCallback(
    (s: S0, seat: Seat, lv: BotLevel, rng: Parameters<typeof baQuanBot.pick>[3], budget: number): A0 => ({
      t: 'game',
      a: baQuanBot.pick(s.inner, seat, lv, rng, budget),
    }),
    [],
  );

  const m = useVsBot<S0, A0>(baQuanMeta as never, pickBot, {
    config: ai?.config ?? {},
    startMs: 3 * 60 * 1000,
    level,
    ...(ai ? { hatCoDinh: ai.hat } : {}),
    budgetMs: 400,
  });
  useChamSao(ai, m);
  useFlagOnTimeout<A0>(m.clock, m.toMove, m.outcome, m.send, (seat) => ({ t: 'flag', seat }));

  const view = baQuanMeta.view(m.state, ME).v as BaQuanView;
  const myTurn = m.toMove === ME && !m.outcome;
  useEffect(() => {
    if (!myTurn) setPicked(null);
  }, [myTurn]);

  const size = Math.min(width - S.xl * 2, height - insets.top - insets.bottom - 310, 400);
  const placing = view.placed[ME]! < 3;

  return (
    <MatchShell
      title="Cờ Ba Quân"
      {...(ai ? {} : { level, onLevel, levelHints: HINTS, levelNames: LEVEL_NAMES })}
      onHome={onHome}
      onRules={() => router.push('/luat/co-ba-quan')}
      onReset={() => {
        setPicked(null);
        m.reset();
      }}
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
          ? 'Gợi ý: nước mà máy mức cao nhất sẽ chọn ở chỗ bạn'
          : myTurn
            ? placing
              ? 'Thả một quân xuống điểm trống'
              : picked === null
                ? 'Chạm một quân của bạn để cầm lên'
                : 'Chạm điểm được khoanh xanh để đi'
            : null
      }
      ended={m.outcome}
      youWon={m.outcome?.winner === ME}
      surface={(w, h) => <TableBackdrop width={w} height={h} tint={tintOf('co-ba-quan')} />}
      top={{ name: 'Máy', sub: `Mức ${LEVEL_NAMES[level]}`, token: <Token seat={BOT} active={m.toMove === BOT} />, active: !m.outcome && m.toMove === BOT, thinking: m.thinking, ms: m.clock[BOT] }}
      bottom={{ name: meName(), sub: 'Đấu với máy', token: <Token seat={ME} active={m.toMove === ME} />, active: myTurn, ms: m.clock[ME] }}
    >
      <View style={{ width: size, height: size }}>
        <BaQuanBoard
          view={view}
          size={size}
          mySeat={ME}
          picked={picked}
          onPick={setPicked}
          onPlay={(f, t) => {
            setPicked(null);
            m.send(ME, { t: 'game', a: { f, t } });
          }}
          disabled={!myTurn}
          hint={m.hint?.t === 'game' ? m.hint.a : null}
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
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DCC39C',
        borderWidth: 2,
        borderColor: active ? '#E3BC72' : '#C3A678',
      }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12.8} r={9} fill={f.deep} />
        <Circle cx={12} cy={12} r={9} fill={f.face} stroke={f.rim} strokeWidth={1} />
      </Svg>
    </View>
  );
}
