import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { makeRng, type BotLevel, type MetaState, type Wrapped } from '@co/core';
import { caroBot, type CaroAction, type CaroState, type CaroView } from '@co/game-co-caro';
import { caroMeta } from '../../src/catalog';
import { CaroBoard } from '../../src/games/co-caro/Board';
import { DeskBackdrop, PaperStack } from '../../src/games/co-caro/Desk';
import { caroTheme as CT, inkFor } from '../../src/games/co-caro/theme';
import { faceOf } from '../../src/games/faces';
import { Icon } from '../../src/ui/Icon';
import { Btn, Clock, IconBtn, Tag, Txt } from '../../src/ui/kit';
import { A, R, S, lift } from '../../src/ui/theme';

/**
 * Màn chơi.
 *
 * Bản trước thiếu đúng thứ làm một ván cờ online *căng*: cái đồng hồ. Không có
 * đồng hồ thì màn chơi chỉ là bàn cờ đặt trên nền tối, không có nhịp. Ở đây
 * đồng hồ là nhân vật chính của hai thanh người chơi, còn bàn cờ chiếm hết
 * phần giữa.
 *
 * Đầu hàng và hết giờ đi qua lớp `withStandardMeta` chứ không phải cờ dựng
 * riêng ngoài state — cùng đường mà máy chủ sẽ chạy sau này, nên khi nối server
 * màn này không phải viết lại.
 */

const SEATS = [0, 1];
const ME = 0;
const BOT = 1;
const START_MS = 5 * 60 * 1000;
const LEVEL_NAME: Record<BotLevel, string> = { 1: 'Dễ', 2: 'Vừa', 3: 'Khó' };

type S0 = MetaState<CaroState>;
type A0 = Wrapped<CaroAction>;

const fresh = (seed: string): S0 => caroMeta.init(SEATS, { size: 15 }, makeRng(seed, 0)) as S0;

export default function PlayScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [level, setLevel] = useState<BotLevel>(2);
  const [pickingLevel, setPicking] = useState(false);
  const [seed, setSeed] = useState('van-1');
  const [state, setState] = useState<S0>(() => fresh('van-1'));
  const [thinking, setThinking] = useState(false);
  const [clock, setClock] = useState<[number, number]>([START_MS, START_MS]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcome = caroMeta.outcome(state);
  const turn = caroMeta.turn(state);
  const toMove = turn.kind === 'seat' ? turn.seat : null;

  const send = useCallback(
    (seat: number, a: A0) => {
      setState((cur) => {
        if (caroMeta.outcome(cur)) return cur;
        return caroMeta.reduce(cur, seat, a, makeRng(seed, cur.rngCursor)) as S0;
      });
    },
    [seed],
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const next = `van-${Date.now() % 100000}`;
    setSeed(next);
    setThinking(false);
    setClock([START_MS, START_MS]);
    setState(fresh(next));
  }, []);

  // Đồng hồ chạy 100ms một nhịp thay vì 1s: nhịp 1s thì giây cuối cùng có thể
  // trôi qua gần một giây mới hiện, đúng lúc người chơi nhìn chằm chằm vào nó.
  useEffect(() => {
    if (outcome || toMove === null) return;
    const seat = toMove;
    const iv = setInterval(() => {
      setClock((c) => {
        const left = Math.max(0, c[seat] - 100);
        const n: [number, number] = seat === 0 ? [left, c[1]] : [c[0], left];
        return n;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [outcome, toMove]);

  // Hết giờ là một action thật gửi vào engine, không phải một dòng chữ vẽ đè
  // lên bàn cờ. Nhờ vậy kết quả ván hết giờ giống hệt máy chủ sẽ chốt.
  useEffect(() => {
    if (outcome || toMove === null) return;
    if (clock[toMove] > 0) return;
    send(toMove, { t: 'flag', seat: toMove });
  }, [clock, toMove, outcome, send]);

  const play = useCallback(
    (r: number, c: number) => {
      send(ME, { t: 'game', a: { r, c } });
    },
    [send],
  );

  // Máy đi sau một nhịp ngắn — không phải giả vờ nghĩ, mà để người chơi kịp
  // nhìn thấy nước mình vừa đi trước khi bàn cờ đổi tiếp.
  useEffect(() => {
    if (outcome || toMove !== BOT) return;
    setThinking(true);
    timer.current = setTimeout(() => {
      setState((cur) => {
        const t = caroMeta.turn(cur);
        if (t.kind !== 'seat' || t.seat !== BOT) return cur;
        const rng = makeRng(`${seed}|bot`, cur.ply);
        const a = caroBot.pick(cur.inner, BOT, level, rng, 50);
        return caroMeta.reduce(cur, BOT, { t: 'game', a }, makeRng(seed, cur.rngCursor)) as S0;
      });
      setThinking(false);
    }, 420);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, seed, level, outcome, toMove]);

  const face = faceOf(String(game));
  if (game !== 'co-caro') {
    return (
      <View style={{ flex: 1, backgroundColor: A.bg, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl }}>
        <Txt size={17} weight="bold">
          {face ? `${face.nameVi} chưa mở` : 'Bộ môn này chưa mở'}
        </Txt>
        <Btn label="Về sảnh" tone="ghost" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const view: CaroView = caroMeta.view(state, ME).v as CaroView;
  // Chừa mỗi bên một khoảng mặt bàn. Bàn cờ ăn sát mép màn hình thì tờ giấy
  // không còn nằm trên cái gì, mà thành cái nền của cả màn hình.
  const board = Math.min(width - S.xxl * 2, height - insets.top - insets.bottom - 320, 430);

  return (
    <View style={{ flex: 1, backgroundColor: A.bg, paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingBottom: S.md }}>
        <Pressable onPress={() => router.replace('/')} hitSlop={14} accessibilityRole="button" accessibilityLabel="Về sảnh">
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="display">
            Cờ Caro
          </Txt>
          <Txt size={11} color={A.inkFaint}>
            Luật Việt Nam · chặn hai đầu không tính · 5 phút
          </Txt>
        </View>
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel="Đổi mức máy"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 34,
            paddingHorizontal: S.md,
            borderRadius: R.pill,
            backgroundColor: A.goldSoft,
            borderWidth: 1,
            borderColor: A.goldDeep,
          }}
        >
          <Icon name="robot" size={15} color={A.gold} />
          <Txt size={12} weight="bold" color={A.gold}>
            {LEVEL_NAME[level]}
          </Txt>
        </Pressable>
      </View>

      {/* Hai thanh người chơi dính sát bàn cờ trong cùng một khối căn giữa.
          Tách ra rồi cho bàn cờ `flex: 1` thì trên dưới bàn cờ đều hở một
          khoảng chết to bằng nửa bàn tay. */}
      <View style={{ flex: 1, justifyContent: 'center', gap: S.sm }}>
        <Bar
          name="Máy"
          sub={`Mức ${LEVEL_NAME[level]}`}
          seat={BOT}
          active={!outcome && toMove === BOT}
          thinking={thinking}
          ms={clock[BOT]}
        />

        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <DeskBackdrop width={width} height={board + S.xxl * 4} />
          <View style={{ width: board, height: board }}>
            <PaperStack size={board} />
            <View style={lift(0.55, 24, 12)}>
              <CaroBoard view={view} size={board} mySeat={ME} onPlay={play} disabled={toMove !== ME || !!outcome} />
            </View>
          </View>
        </View>

        <Bar name="Bạn" sub="Khách" seat={ME} active={!outcome && toMove === ME} ms={clock[ME]} />
      </View>

      <View style={{ flexDirection: 'row', gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.md }}>
        <IconBtn name="refresh" label="Ván mới" onPress={reset} />
        <IconBtn
          name="draw"
          label="Cầu hoà"
          disabled={!!outcome}
          onPress={() => {
            send(ME, { t: 'offer-draw' });
            // Máy chưa biết cân nhắc hoà, nên nó từ chối ngay thay vì để lời
            // cầu treo mãi không ai trả lời.
            setTimeout(() => send(BOT, { t: 'decline-draw' }), 500);
          }}
        />
        <IconBtn name="flag" label="Xin thua" tone="danger" disabled={!!outcome} onPress={() => send(ME, { t: 'resign' })} />
      </View>

      {state.drawOffer && !outcome ? (
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm }}>
          <Txt size={12} color={A.inkSoft}>
            Đã gửi lời cầu hoà…
          </Txt>
        </View>
      ) : null}

      {outcome ? (
        <Result
          win={outcome.winner === ME}
          draw={outcome.winner === null}
          reason={outcome.reason}
          onAgain={reset}
          onHome={() => router.replace('/')}
        />
      ) : null}

      {pickingLevel ? (
        <LevelSheet
          level={level}
          onPick={(lv) => {
            setLevel(lv);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * Thanh người chơi. Đồng hồ nằm bên phải, to nhất trong thanh — đó là thứ mắt
 * liếc nhiều nhất sau bàn cờ.
 */
function Bar({
  name,
  sub,
  seat,
  active,
  thinking,
  ms,
}: {
  name: string;
  sub: string;
  seat: number;
  active: boolean;
  thinking?: boolean;
  ms: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: S.md,
        marginHorizontal: S.md,
        padding: S.sm,
        paddingRight: S.sm,
        borderRadius: R.md,
        backgroundColor: active ? A.surfaceAlt : 'transparent',
        borderWidth: 1,
        borderColor: active ? A.goldDeep : 'transparent',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: CT.paper,
          borderWidth: 2,
          borderColor: active ? A.gold : CT.paperShade,
        }}
      >
        <Svg width={20} height={20} viewBox="0 0 100 100">
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
      <View style={{ flex: 1 }}>
        <Txt size={14} weight="bold" color={active ? A.ink : A.inkSoft}>
          {name}
        </Txt>
        <Txt size={11} color={A.inkFaint}>
          {thinking ? 'đang nghĩ…' : sub}
        </Txt>
      </View>
      {active && !thinking ? <Tag label="đang đi" color={A.gold} bg={A.goldSoft} /> : null}
      <Clock ms={ms} running={active} />
    </View>
  );
}

/**
 * Kết quả trượt lên từ đáy chứ không che giữa màn.
 *
 * Bản trước đặt tấm kết quả ngay giữa — đúng chỗ vệt dạ quang đánh dấu năm
 * quân thắng. Người chơi vừa thắng thì thứ họ muốn nhìn đầu tiên là *thắng ở
 * đâu*, mà tấm thông báo lại nằm đè lên đúng chỗ đó.
 */
function Result({
  win,
  draw,
  reason,
  onAgain,
  onHome,
}: {
  win: boolean;
  draw: boolean;
  reason: string;
  onAgain: () => void;
  onHome: () => void;
}) {
  const tint = draw ? A.info : win ? A.gold : A.danger;
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          gap: S.sm,
          padding: S.lg,
          paddingBottom: S.xxl,
          backgroundColor: A.surface,
          borderTopLeftRadius: R.xl,
          borderTopRightRadius: R.xl,
          borderTopWidth: 2,
          borderTopColor: tint,
        },
        lift(0.6, 28, -10),
      ]}
    >
      <Txt size={24} weight="display" color={tint} center>
        {draw ? 'Hoà' : win ? 'Bạn thắng' : 'Bạn thua'}
      </Txt>
      <Txt size={13} color={A.inkSoft} center style={{ marginBottom: S.sm }}>
        {reason}
      </Txt>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Btn label="Về sảnh" tone="ghost" onPress={onHome} style={{ flex: 1 }} />
        <Btn label="Ván mới" onPress={onAgain} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

/**
 * Chọn mức máy tách khỏi màn chơi. Ba nút mức nằm thường trực dưới bàn cờ vừa
 * chiếm chỗ, vừa mời người chơi đổi mức giữa ván — đổi giữa ván thì con số
 * thắng thua chẳng còn nghĩa gì.
 */
function LevelSheet({
  level,
  onPick,
  onClose,
}: {
  level: BotLevel;
  onPick: (lv: BotLevel) => void;
  onClose: () => void;
}) {
  const desc: Record<BotLevel, string> = {
    1: 'Đi gần như ngẫu nhiên, chỉ chặn nước thua ngay',
    2: 'Biết chặn và biết nối, đủ cho ván giết thời gian',
    3: 'Nhìn trước vài nước, chơi ăn thua',
  };
  return (
    <Pressable
      accessibilityLabel="Đóng"
      onPress={onClose}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(8,7,5,0.7)' }}
    >
      <View
        style={{
          gap: S.sm,
          padding: S.lg,
          paddingBottom: S.xxl,
          backgroundColor: A.surface,
          borderTopLeftRadius: R.xl,
          borderTopRightRadius: R.xl,
          borderTopWidth: 1,
          borderTopColor: A.line,
        }}
      >
        <Txt size={17} weight="display" style={{ marginBottom: S.xs }}>
          Mức máy
        </Txt>
        {([1, 2, 3] as BotLevel[]).map((lv) => (
          <Pressable
            key={lv}
            accessibilityRole="button"
            onPress={() => onPick(lv)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.md,
              minHeight: 56,
              padding: S.md,
              borderRadius: R.md,
              backgroundColor: level === lv ? A.goldSoft : A.surfaceAlt,
              borderWidth: 1,
              borderColor: level === lv ? A.gold : A.lineSoft,
            }}
          >
            <Icon name="robot" size={20} color={level === lv ? A.gold : A.inkFaint} />
            <View style={{ flex: 1 }}>
              <Txt size={14} weight="bold" color={level === lv ? A.gold : A.ink}>
                {LEVEL_NAME[lv]}
              </Txt>
              <Txt size={11} color={A.inkFaint}>
                {desc[lv]}
              </Txt>
            </View>
            {level === lv ? <Icon name="check" size={18} color={A.gold} /> : null}
          </Pressable>
        ))}
        <Txt size={11} color={A.inkFaint} style={{ marginTop: S.xs }}>
          Đổi mức có hiệu lực ngay ở nước kế tiếp của máy.
        </Txt>
      </View>
    </Pressable>
  );
}
