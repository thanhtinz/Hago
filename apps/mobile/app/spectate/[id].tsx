import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Txt } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { DotPattern } from '../../src/components/decor';
import { C, GAME_GRADIENT, R, S } from '../../src/theme';
import { BOARDS, GAME_NAMES } from '../../src/games';
import { spectatorView } from '../../src/games/shared';
import { friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

/**
 * Khán đài. Nhận đúng luồng `game.state` như người chơi, chỉ khác là server gửi
 * bản `view(state, null)` — đã lọc sạch thông tin ẩn — và ở đây không có đường
 * nào gửi nước đi lên cả.
 */
export default function SpectateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { socket, showToast, connected } = useStore();
  const [state, setState] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onState = (s: any) => s.matchId === id && setState(s);
    const onResult = (r: any) => r.matchId === id && setResult(r);
    socket.on('game.state', onState);
    socket.on('match.result', onResult);
    emitAck('spectate.join', { matchId: id })
      .then((res: any) => {
        if (res?.ok) onState(res.state);
        else setError(friendlyError(res?.error ?? 'NETWORK'));
      })
      .catch(() => setError(friendlyError('NETWORK')));
    return () => {
      socket.off('game.state', onState);
      socket.off('match.result', onResult);
      // Rời khán đài để người trong trận thấy đúng số người đang xem.
      emitAck('spectate.leave', { matchId: id }).catch(() => {});
    };
  }, [socket, id]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: S.lg }}>
        <StatusBar hidden />
        <Icon name="eye" size={48} color={C.inkFaint} strokeWidth={1.8} />
        <Txt size={15} weight="heading" color={C.inkSoft} center>
          {error}
        </Txt>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Txt size={13} weight="bold" color={C.primary}>
            Quay lại
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <StatusBar hidden />
        <Icon name="eye" size={48} color={C.inkFaint} strokeWidth={1.8} />
        <Txt size={15} weight="heading" color={C.inkSoft}>
          Đang vào khán đài...
        </Txt>
      </View>
    );
  }

  return <SpectateBoard state={state} result={result} onLeave={() => router.back()} showToast={showToast} connected={connected} insets={insets} width={width} height={height} />;
}

function SpectateBoard({
  state,
  result,
  onLeave,
  showToast,
  connected,
  insets,
  width,
  height,
}: {
  state: any;
  result: any;
  onLeave: () => void;
  showToast: (t: string, tone?: 'ok' | 'warn') => void;
  connected: boolean;
  insets: { top: number; bottom: number };
  width: number;
  height: number;
}) {
  const Board = BOARDS[state.gameType];
  const grad = (GAME_GRADIENT[state.gameType] ?? ['#FF8A65', '#FF5E7D']) as [string, string];
  const normalized = useMemo(() => spectatorView(state.view), [state.view]);
  const HUD = 46;
  const space = { width: width - 12, height: height - insets.top - insets.bottom - HUD - 12 };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar hidden />
      <LinearGradient
        pointerEvents="none"
        colors={[grad[0] + '4D', grad[1] + '26', C.bg]}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <DotPattern rows={9} cols={9} gap={64} color={grad[1] + '26'} />

      {/* Thanh tiêu đề luôn hiện: khán giả cần thấy rõ mình đang xem chứ không
          phải đang chơi, và nút rời khán đài phải ở ngay đó. */}
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top,
          height: HUD + insets.top,
          paddingHorizontal: S.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomLeftRadius: R.lg,
          borderBottomRightRadius: R.lg,
        }}
      >
        <Pressable onPress={onLeave} hitSlop={12} style={{ paddingRight: 4 }}>
          <Txt size={22} weight="heading" color="rgba(255,255,255,0.95)">
            ‹
          </Txt>
        </Pressable>
        <GameIcon name={state.gameType as GameIconName} size={26} />
        <Txt size={15} weight="display" color="#fff" style={{ flex: 1 }}>
          {GAME_NAMES[state.gameType] ?? state.gameType}
        </Txt>
        {!connected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.danger, paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
            <Txt size={10} weight="bold" color="#fff">
              Mất kết nối
            </Txt>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill }}>
          <Icon name="eye" size={12} color="#fff" strokeWidth={2.2} />
          <Txt size={10} weight="bold" color="#fff">
            {state.spectators ?? 1}
          </Txt>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 6, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {Board ? (
          <Board
            view={normalized.view}
            mySeat={normalized.seat}
            send={() => showToast('Bạn đang xem trận — không thao tác được', 'warn')}
            deadline={state.deadline}
            space={space}
          />
        ) : (
          <Txt center>Game chưa hỗ trợ xem trực tiếp</Txt>
        )}
      </ScrollView>

      {result ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: S.lg, paddingBottom: insets.bottom + S.lg }}>
          <Card style={{ gap: S.sm }}>
            <Txt size={16} weight="heading">
              Trận đã kết thúc
            </Txt>
            {result.rows
              .slice()
              .sort((a: any, b: any) => a.place - b.place)
              .map((r: any) => {
                const p = state.view?.players?.find((x: any) => x.id === r.userId);
                return (
                  <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Txt size={13} weight="bold" style={{ flex: 1 }}>
                      {p?.name ?? r.userId}
                    </Txt>
                    <Txt size={12} weight="medium" color={r.result === 'win' ? C.mint : C.inkSoft}>
                      {r.result === 'win' ? 'Thắng' : r.result === 'draw' ? 'Hoà' : 'Thua'} · {r.score}
                    </Txt>
                  </View>
                );
              })}
            <Btn label="Rời khán đài" tone="ghost" full onPress={onLeave} />
          </Card>
        </View>
      ) : null}
    </View>
  );
}
