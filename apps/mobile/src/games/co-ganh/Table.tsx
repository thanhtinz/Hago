import React, { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { BotLevel, MetaState, Seat, Wrapped } from '@co/core';
import { ganhBot, type GanhAction, type GanhState, type GanhView } from '@co/game-co-ganh';
import { ganhMeta } from '../../catalog';
import { meName } from '../../net/api';
import { LEVEL_NAME, MatchShell } from '../../ui/MatchShell';
import { S } from '../../ui/theme';
import { BOT, ME, useFlagOnTimeout, useVsBot } from '../useVsBot';
import { GanhBoard, targetsOf } from './Board';
import { TableBackdrop, tintOf } from '../../ui/TableBackdrop';
import { ganhTheme as T } from './theme';

type S0 = MetaState<GanhState>;
type A0 = Wrapped<GanhAction>;

const HINTS: Record<BotLevel, string> = {
  1: 'Đi gần như ngẫu nhiên, nhưng thấy ăn là ăn',
  2: 'Nhìn trước hai nước, không thí quân bừa',
  3: 'Nhìn trước bốn nước, biết dùng thế mở để ép',
};

export function GanhTable({ level, onLevel, onHome }: { level: BotLevel; onLevel: (l: BotLevel) => void; onHome: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [picked, setPicked] = useState<number | null>(null);

  const pickBot = useCallback(
    (s: S0, seat: Seat, lv: BotLevel, rng: Parameters<typeof ganhBot.pick>[3], budget: number): A0 => ({
      t: 'game',
      a: ganhBot.pick(s.inner, seat, lv, rng, budget),
    }),
    [],
  );

  const m = useVsBot<S0, A0>(ganhMeta as never, pickBot, {
    startMs: 8 * 60 * 1000,
    level,
    // Bàn 25 điểm nên tìm kiếm sâu 4 vẫn kịp; cho máy nhiều ngân sách hơn
    // caro vì ở đây nhìn trước mới hiểu được cú thí quân.
    budgetMs: 300,
  });
  useFlagOnTimeout<A0>(m.clock, m.toMove, m.outcome, m.send, (seat) => ({ t: 'flag', seat }));

  const view = ganhMeta.view(m.state, ME).v as GanhView;
  const myTurn = m.toMove === ME && !m.outcome;

  // Bỏ chọn quân khi tới lượt máy, nếu không vòng chọn treo lại trên bàn
  // suốt lượt của đối thủ.
  useEffect(() => {
    if (!myTurn) setPicked(null);
  }, [myTurn]);

  const size = Math.min(width - S.xl * 2, height - insets.top - insets.bottom - 320, 420);
  const targets = myTurn ? targetsOf(view, picked) : [];

  const mine = view.board.filter((v) => v === ME).length;
  const theirs = view.board.filter((v) => v === BOT).length;

  return (
    <MatchShell
      title="Cờ Gánh"
      level={level}
      onLevel={onLevel}
      levelHints={HINTS}
      onHome={onHome}
      onRules={() => router.push('/luat/co-ganh')}
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
      ended={m.outcome}
      youWon={m.outcome?.winner === ME}
      surface={(w, h) => <TableBackdrop width={w} height={h} tint={tintOf('co-ganh')} />}
      // Luật mở ràng buộc đối thủ chỉ được đi vào mấy ô nhất định. Không nói
      // ra thì người chơi bấm mãi vào chỗ khác mà không hiểu vì sao bàn cờ
      // không nghe lời.
      noteTone={m.hint ? 'gold' : 'seal'}
      note={
        m.hint
          ? 'Gợi ý: nước mà máy mức Khó sẽ chọn ở chỗ bạn'
          : myTurn && view.forcedTo
            ? 'Đối thủ vừa mở — bạn buộc phải đi vào ô đánh dấu đỏ'
            : null
      }
      top={{
        name: 'Máy',
        sub: `Mức ${LEVEL_NAME[level]} · ${theirs} quân`,
        token: <Token dark={false} active={m.toMove === BOT} />,
        active: !m.outcome && m.toMove === BOT,
        thinking: m.thinking,
        ms: m.clock[BOT],
      }}
      bottom={{
        name: meName(),
        sub: `${mine} quân`,
        token: <Token dark active={m.toMove === ME} />,
        active: myTurn,
        ms: m.clock[ME],
      }}
    >
      {/* Không bọc khung, không đổ bóng: vạch gạch non không có bóng. */}
      <View>
        <GanhBoard
          view={view}
          size={size}
          mySeat={ME}
          picked={picked}
          onPick={setPicked}
          onMove={(f, t) => {
            setPicked(null);
            m.send(ME, { t: 'game', a: { f, t } });
          }}
          legalTargets={targets}
          hint={m.hint?.t === 'game' ? m.hint.a : null}
          disabled={!myTurn}
        />
      </View>
    </MatchShell>
  );
}

/** Quân của người chơi: đất nung hay vỏ nghêu, đúng như trên bàn. */
function Token({ dark, active }: { dark: boolean; active: boolean }) {
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.court,
        borderWidth: 2,
        borderColor: active ? '#E3BC72' : T.courtDark,
      }}
    >
      <Svg width={24} height={24}>
        <Defs>
          <RadialGradient id={dark ? 'tok-d' : 'tok-l'} cx="0.34" cy="0.28" r="0.85">
            <Stop offset="0" stopColor={dark ? T.redFace : T.paleFace} />
            <Stop offset="1" stopColor={dark ? T.redDeep : T.paleDeep} />
          </RadialGradient>
        </Defs>
        <Circle cx={12} cy={12} r={9} fill={`url(#${dark ? 'tok-d' : 'tok-l'})`} stroke={dark ? T.redRim : T.paleRim} strokeWidth={1} />
      </Svg>
    </View>
  );
}
