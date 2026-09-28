import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { makeRng, type BotLevel } from '@co/core';
import { caroBot, caroEngine, type CaroAction, type CaroState, type CaroView } from '@co/game-co-caro';
import { CaroBoard } from '../../src/games/co-caro/Board';
import { caroTheme as CT, inkFor } from '../../src/games/co-caro/theme';
import { Btn, Tag, Txt } from '../../src/ui/kit';
import { A, R, S } from '../../src/ui/theme';

/**
 * Màn chơi. Hiện mới đấu với máy ngay trên thiết bị — engine là hàm thuần nên
 * chạy được cả hai phía. Khi có máy chủ thì đúng engine này chạy ở server làm
 * trọng tài, còn màn này chỉ gửi ý định và vẽ lại `view` nhận về; không phải
 * viết lại giao diện.
 */

const SEATS = [0, 1];
const ME = 0;
const BOT = 1;

export default function PlayScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [level, setLevel] = useState<BotLevel>(2);
  const [seed, setSeed] = useState('van-1');
  const [state, setState] = useState<CaroState>(() => caroEngine.init(SEATS, { size: 15 }, makeRng('van-1', 0)));
  const [thinking, setThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(
    (nextSeed: string) => {
      if (timer.current) clearTimeout(timer.current);
      setSeed(nextSeed);
      setThinking(false);
      setState(caroEngine.init(SEATS, { size: 15 }, makeRng(nextSeed, 0)));
    },
    [],
  );

  const play = useCallback(
    (r: number, c: number) => {
      setState((cur) => {
        if (!caroEngine.isLegalFast!(cur, ME, { r, c })) return cur;
        return caroEngine.reduce(cur, ME, { r, c }, makeRng(seed, cur.rngCursor));
      });
    },
    [seed],
  );

  // Máy đi sau một nhịp ngắn. Không phải để giả vờ đang nghĩ, mà để người
  // chơi kịp nhìn thấy nước mình vừa đi trước khi bàn cờ đổi tiếp.
  useEffect(() => {
    const t = caroEngine.turn(state);
    if (t.kind !== 'seat' || t.seat !== BOT) return;
    setThinking(true);
    timer.current = setTimeout(() => {
      setState((cur) => {
        const turn = caroEngine.turn(cur);
        if (turn.kind !== 'seat' || turn.seat !== BOT) return cur;
        const rng = makeRng(`${seed}|bot`, cur.ply);
        const a: CaroAction = caroBot.pick(cur, BOT, level, rng, 50);
        return caroEngine.reduce(cur, BOT, a, makeRng(seed, cur.rngCursor));
      });
      setThinking(false);
    }, 420);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, seed, level]);

  if (game !== 'co-caro') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl }}>
        <Txt size={17} weight="bold">
          Bộ môn này chưa mở
        </Txt>
        <Btn label="Về sảnh" tone="ghost" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const view: CaroView = caroEngine.view(state, ME).v;
  const outcome = caroEngine.outcome(state);
  const boardSize = Math.min(width - S.lg * 2, height - insets.top - insets.bottom - 330, 460);

  const status = outcome
    ? outcome.winner === ME
      ? 'Bạn thắng'
      : outcome.winner === null
        ? 'Hoà'
        : 'Máy thắng'
    : thinking
      ? 'Máy đang nghĩ…'
      : 'Tới lượt bạn';

  return (
    <View style={{ flex: 1, paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg }}>
        <Pressable onPress={() => router.replace('/')} hitSlop={12} accessibilityLabel="Về sảnh">
          <Txt size={22} color={A.inkSoft}>
            ‹
          </Txt>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={17} weight="display">
            Cờ Caro
          </Txt>
          <Txt size={11} color={A.inkFaint}>
            Luật Việt Nam · chặn hai đầu không tính
          </Txt>
        </View>
        <Tag label={`Máy: ${level === 1 ? 'Dễ' : level === 2 ? 'Vừa' : 'Khó'}`} color={A.gold} bg={A.goldSoft} />
      </View>

      {/* Bàn cờ chiếm hết chỗ trống còn lại và nằm giữa. Trước đây nó dính
          lên đỉnh màn rồi để thừa một khoảng chết to tướng ở giữa. */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: S.lg, paddingTop: S.md, gap: S.md }}>
        <PlayerRow name="Máy" seat={BOT} active={!outcome && thinking} />
        <View style={{ alignItems: 'center' }}>
          <CaroBoard view={view} size={boardSize} mySeat={ME} onPlay={play} disabled={thinking || !!outcome} />
        </View>
        <PlayerRow name="Bạn" seat={ME} active={!outcome && !thinking} />

        {/* Trạng thái nằm ngay dưới bàn cờ, chỗ mắt đang nhìn. Để tận đáy
            màn hình thì người chơi phải rời mắt khỏi bàn mới biết ván xong. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: S.sm,
            padding: S.md,
            borderRadius: R.md,
            backgroundColor: outcome ? A.goldSoft : A.surface,
            borderWidth: 1,
            borderColor: outcome ? A.gold : A.line,
          }}
        >
          <Txt size={14} weight="bold" color={outcome ? A.gold : A.ink} style={{ flex: 1 }}>
            {status}
          </Txt>
          {outcome ? (
            <Txt size={12} color={A.inkSoft}>
              {outcome.reason}
            </Txt>
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: S.lg, gap: S.md }}>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {([1, 2, 3] as BotLevel[]).map((lv) => (
            <Pressable
              key={lv}
              onPress={() => setLevel(lv)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: R.pill,
                borderWidth: 1.5,
                borderColor: level === lv ? A.gold : A.line,
                backgroundColor: level === lv ? A.goldSoft : 'transparent',
              }}
            >
              <Txt size={13} weight="bold" color={level === lv ? A.gold : A.inkSoft}>
                {lv === 1 ? 'Dễ' : lv === 2 ? 'Vừa' : 'Khó'}
              </Txt>
            </Pressable>
          ))}
        </View>

        <Btn label="Ván mới" onPress={() => reset(`van-${Date.now() % 100000}`)} />
      </View>
    </View>
  );
}

function PlayerRow({ name, seat, active }: { name: string; seat: number; active: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: CT.paper,
          borderWidth: 2,
          borderColor: active ? A.gold : CT.paperShade,
        }}
      >
        <Svg width={18} height={18} viewBox="0 0 100 100">
          {seat === 0 ? (
            <>
              <Path d="M22 22 L78 78" stroke={inkFor(0)} strokeWidth={12} strokeLinecap="round" fill="none" />
              <Path d="M78 22 L22 78" stroke={inkFor(0)} strokeWidth={12} strokeLinecap="round" fill="none" />
            </>
          ) : (
            <Path
              d="M74 30 A28 28 0 1 0 76 62 A28 28 0 0 0 66 24"
              stroke={inkFor(1)}
              strokeWidth={12}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
      </View>
      <Txt size={14} weight={active ? 'bold' : 'regular'} color={active ? A.ink : A.inkSoft}>
        {name}
      </Txt>
      {active ? <Tag label="đang đi" color={A.gold} bg={A.goldSoft} /> : null}
    </View>
  );
}
