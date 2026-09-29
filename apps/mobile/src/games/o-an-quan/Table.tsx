import React, { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { BotLevel, MetaState, Seat, Wrapped } from '@co/core';
import { quanBot, sideOf, type QuanAction, type QuanState, type QuanView } from '@co/game-o-an-quan';
import { quanMeta } from '../../catalog';
import { meName } from '../../net/api';
import { LEVEL_NAME, MatchShell } from '../../ui/MatchShell';
import { S } from '../../ui/theme';
import { BOT, ME, useFlagOnTimeout, useVsBot } from '../useVsBot';
import { QuanBoard } from './Board';
import { GroundBackdrop } from './Ground';
import { quanTheme as T } from './theme';

type S0 = MetaState<QuanState>;
type A0 = Wrapped<QuanAction>;

const HINTS: Record<BotLevel, string> = {
  1: 'Thấy ăn là ăn, còn lại đi khá tuỳ hứng',
  2: 'Nhìn trước ba nửa nước',
  3: 'Nhìn trước sáu nửa nước, biết nuôi quan và tránh bẫy thu quân',
};

export function QuanTable({ level, onLevel, onHome }: { level: BotLevel; onLevel: (l: BotLevel) => void; onHome: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [picked, setPicked] = useState<number | null>(null);

  const pickBot = useCallback(
    (s: S0, seat: Seat, lv: BotLevel, rng: Parameters<typeof quanBot.pick>[3], budget: number): A0 => ({
      t: 'game',
      a: quanBot.pick(s.inner, seat, lv, rng, budget),
    }),
    [],
  );

  const m = useVsBot<S0, A0>(quanMeta as never, pickBot, {
    startMs: 10 * 60 * 1000,
    level,
    // Chỉ 10 nước mỗi lượt nên tìm sâu 6 nửa nước là nhẹ; cho thêm ngân
    // sách vì đây là game mà nhìn xa ăn thua rõ rệt nhất.
    budgetMs: 400,
    // Rải một nước dài mất vài giây trên bàn thật, nên để máy nghỉ lâu hơn
    // một chút cho người chơi kịp nhìn sỏi rơi.
    thinkMs: 700,
  });
  useFlagOnTimeout<A0>(m.clock, m.toMove, m.outcome, m.send, (seat) => ({ t: 'flag', seat }));

  const view = quanMeta.view(m.state, ME).v as QuanView;
  const myTurn = m.toMove === ME && !m.outcome;
  const mySide = sideOf(m.state.inner, ME);

  useEffect(() => {
    if (!myTurn) setPicked(null);
  }, [myTurn]);

  const boardW = Math.min(width - S.lg * 2, 440);
  const [p0, p1] = view.projected;
  const mine = mySide === 0 ? p0 : p1;
  const theirs = mySide === 0 ? p1 : p0;

  return (
    <MatchShell
      title="Ô Ăn Quan"
      level={level}
      onLevel={onLevel}
      levelHints={HINTS}
      onHome={onHome}
      onRules={() => router.push('/luat/o-an-quan')}
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
      // Thu quân có thể lật ngược kết quả, nên phải cho thấy điểm dự kiến
      // ngay lúc đang chơi. Không hiện thì người chơi ăn nốt con quan cuối
      // rồi mới biết mình vừa tự kết thúc ván ở thế thua.
      note={m.hint ? 'Gợi ý: nước mà máy mức Khó sẽ chọn ở chỗ bạn' : 'Điểm nếu thu quân ngay: bạn ' + mine + ' – máy ' + theirs}
      noteTone={m.hint ? 'gold' : 'soft'}
      ended={m.outcome}
      youWon={m.outcome?.winner === ME}
      surface={(w, h) => <GroundBackdrop width={w} height={h} />}
      top={{
        name: 'Máy',
        sub: `Mức ${LEVEL_NAME[level]} · ${theirs} điểm`,
        token: <Token big active={m.toMove === BOT} />,
        active: !m.outcome && m.toMove === BOT,
        thinking: m.thinking,
        ms: m.clock[BOT],
      }}
      bottom={{
        name: meName(),
        sub: `${mine} điểm`,
        token: <Token big={false} active={myTurn} />,
        active: myTurn,
        ms: m.clock[ME],
      }}
    >
      {/* Không bọc khung, không đổ bóng: bàn cờ này là vạch phấn trên nền
          đất, mà nét phấn thì không có bóng. */}
      <View>
        <QuanBoard
          view={view}
          width={boardW}
          mySide={mySide}
          picked={picked}
          onPick={setPicked}
          onSow={(cell, dir) => {
            setPicked(null);
            m.send(ME, { t: 'game', a: { cell, dir } });
          }}
          disabled={!myTurn}
          hint={m.hint?.t === 'game' ? m.hint.a : null}
        />
      </View>
    </MatchShell>
  );
}

/** Quân của người chơi: viên sỏi. Ô quan là viên to trắng. */
function Token({ big, active }: { big: boolean; active: boolean }) {
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.pit,
        borderWidth: 2,
        borderColor: active ? '#E3BC72' : T.pitDark,
      }}
    >
      <Svg width={24} height={24}>
        <Defs>
          <RadialGradient id={big ? 'tk-b' : 'tk-s'} cx="0.34" cy="0.3" r="0.8">
            <Stop offset="0" stopColor={big ? T.quanStone : T.pebbleLit} />
            <Stop offset="1" stopColor={big ? T.quanStoneDark : T.pebble} />
          </RadialGradient>
        </Defs>
        <Circle cx={12} cy={12} r={big ? 9 : 6.5} fill={`url(#${big ? 'tk-b' : 'tk-s'})`} />
        {big ? null : (
          <>
            <Circle cx={6} cy={16} r={4} fill="url(#tk-s)" />
            <Circle cx={17} cy={15} r={4.5} fill="url(#tk-s)" />
          </>
        )}
      </Svg>
    </View>
  );
}
