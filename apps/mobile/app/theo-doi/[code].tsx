import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backToLobby } from '../../src/nav';
import { faceOf } from '../../src/games/faces';
import { Board, Token, surfaceFor } from '../../src/net/OnlineTable';
import { live, useIntentOnce, useLive, useMatch } from '../../src/net/live';
import { Icon } from '../../src/ui/Icon';
import { MatchShell } from '../../src/ui/MatchShell';
import { Btn, Panel, Txt } from '../../src/ui/parts';
import { AppBackdrop } from '../../src/ui/surface';
import { A, R, S } from '../../src/ui/theme';

/**
 * Xem một ván hai người khác đang đánh.
 *
 * Khác hẳn `/xem/[id]`: kia là phát lại một ván đã xong từ biên bản lưu
 * trong máy chủ, còn đây là **ván đang chạy** — nước đi tới thẳng màn này
 * ngay khi người kia đặt quân.
 *
 * Khán giả không có ghế, nên không có gì để hoà và không có gì để thua:
 * `MatchShell` nhận thiếu `onDraw`/`onResign` và tự giấu hai nút đó. Bàn cờ
 * vẫn là **cùng một** component với ván thật — `myTurn` của người không
 * ghế luôn là false nên nó tự khoá, không cần một bàn cờ "chỉ để xem"
 * riêng, thứ chắc chắn sẽ trôi khỏi bàn cờ thật sau vài lần sửa.
 */
export default function SpectateScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const o = useMatch();
  const s = useLive();
  const room = String(code ?? '').toUpperCase();

  useIntentOnce(() => {
    live.forget();
    live.spectate(room);
  });

  // Rời màn là thôi xem. Không gọi thì máy chủ vẫn đếm mình trong số khán
  // giả, và hai người đang đánh thấy một con số không đúng.
  useEffect(() => () => live.unspectate(), []);

  const home = () => {
    live.unspectate();
    backToLobby(router);
  };

  const gameId = o.room?.gameId ?? '';
  const face = faceOf(gameId);
  if (!o.view) return <Opening error={s.error} onHome={home} />;

  const seats = o.seats;
  return (
    <MatchShell
      title={face?.nameVi ?? 'Ván cờ'}
      headerRight={<FanPill n={o.room?.fans ?? 1} />}
      banner={<Watching />}
      onHome={home}
      onRules={gameId ? () => router.push(`/luat/${gameId}`) : undefined}
      record={{ gameId, moves: o.moves, mySeat: null }}
      ended={o.outcome}
      youWon={false}
      surface={surfaceFor(gameId)}
      top={{
        name: seats[1]?.name ?? 'Ghế 2',
        sub: seats[1]?.connected === false ? 'Mất kết nối' : 'Người chơi',
        token: <Token gameId={gameId} seat={1} active={!o.outcome && o.turn?.kind === 'seat' && o.turn.seat === 1} />,
        active: !o.outcome && o.turn?.kind === 'seat' && o.turn.seat === 1,
        ms: seats[1]?.ms ?? 0,
      }}
      bottom={{
        name: seats[0]?.name ?? 'Ghế 1',
        sub: seats[0]?.connected === false ? 'Mất kết nối' : 'Người chơi',
        token: <Token gameId={gameId} seat={0} active={!o.outcome && o.turn?.kind === 'seat' && o.turn.seat === 0} />,
        active: !o.outcome && o.turn?.kind === 'seat' && o.turn.seat === 0,
        ms: seats[0]?.ms ?? 0,
      }}
    >
      <Board gameId={gameId} o={o} onAim={() => {}} />
    </MatchShell>
  );
}

/**
 * Một dải nói thẳng mình đang ở vai nào.
 *
 * Không có nó thì màn này giống hệt màn đánh thật, và cú bấm đầu tiên vào
 * bàn cờ không có gì xảy ra — người xem sẽ nghĩ app hỏng chứ không nghĩ
 * mình đang ngồi ngoài.
 */
function Watching() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: S.sm,
        marginHorizontal: S.lg,
        paddingHorizontal: S.md,
        paddingVertical: 7,
        borderRadius: R.pill,
        backgroundColor: A.goldSoft,
        borderWidth: 1,
        borderColor: A.goldDeep,
      }}
    >
      <Icon name="eye" size={14} color={A.gold} />
      <Txt size={12} color={A.inkSoft} style={{ flex: 1 }}>
        Bạn đang xem. Nước đi là của hai người trên bàn.
      </Txt>
    </View>
  );
}

/** Có bao nhiêu người đang xem cùng mình. */
function FanPill({ n }: { n: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minHeight: 34,
        paddingHorizontal: S.md,
        borderRadius: R.pill,
        backgroundColor: A.goldSoft,
        borderWidth: 1.2,
        borderColor: A.goldDeep,
      }}
    >
      <Icon name="eye" size={14} color={A.gold} />
      <Txt size={13} weight="bold" color={A.ink}>
        {n}
      </Txt>
    </View>
  );
}

/** Chưa có bàn cờ: đang mở, hoặc máy chủ đã từ chối. */
function Opening({ error, onHome }: { error: string | null; onHome: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: S.lg }}>
      <AppBackdrop width={430} height={932} />
      <Panel radius={R.lg} tone={1} seed={21}>
        <View style={{ padding: S.xl, gap: S.md, alignItems: 'center' }}>
          <Txt size={15} weight="display" center>
            {error ?? 'Đang mở ván…'}
          </Txt>
          {error ? <Btn tone="ghost" label="Về sảnh" onPress={onHome} /> : null}
        </View>
      </Panel>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}
