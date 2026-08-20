import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Txt } from '../../src/components/ui';
import { C, GAME_GRADIENT, R, S, SEAT_COLORS } from '../../src/theme';
import { BOARDS } from '../../src/games';
import { friendlyError } from '../../src/lib/api';
import { emitAck, newActionId } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

const GAME_NAMES: Record<string, string> = {
  caro: 'Cờ Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep Battle',
  monopoly: 'Cờ Tỷ Phú',
  ludo: 'Cờ Cá Ngựa',
  werewolf: 'Ma Sói',
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, profile, showToast, connected } = useStore();
  const [state, setState] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [events, setEvents] = useState<string[]>([]);
  const flashTimer = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;
    const onState = (s: any) => {
      if (s.matchId !== id) return;
      setState(s);
    };
    const onResult = (r: any) => {
      if (r.matchId !== id) return;
      setResult(r);
    };
    const onEvent = (e: any) => {
      if (e.matchId !== id) return;
      const labels = e.events.map((x: any) => x.type).filter((t: string) => ['win', 'kick', 'bump', 'score', 'rent', 'bankrupt', 'chance'].includes(t));
      if (labels.length) {
        setEvents(labels);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setEvents([]), 1400);
      }
    };
    socket.on('game.state', onState);
    socket.on('match.result', onResult);
    socket.on('game.event', onEvent);
    emitAck('game.sync', { matchId: id }).then((res: any) => {
      if (res?.ok) setState(res.state);
    });
    return () => {
      socket.off('game.state', onState);
      socket.off('match.result', onResult);
      socket.off('game.event', onEvent);
      clearTimeout(flashTimer.current);
    };
  }, [socket, id]);

  const send = async (type: string, payload: any = {}) => {
    const res: any = await emitAck('game.action', { matchId: id, actionId: newActionId(), type, payload });
    if (!res?.ok) showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
  };

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Text style={{ fontSize: 44 }}>🎲</Text>
        <Txt size={15} weight="heading" color={C.inkSoft}>
          Đang tải trận đấu...
        </Txt>
      </View>
    );
  }

  const Board = BOARDS[state.gameType];
  const view = state.view;
  const mySeat = view.mySeat ?? view.players?.findIndex((p: any) => p.id === profile?.id) ?? 0;
  const grad = (GAME_GRADIENT[state.gameType] ?? ['#FF8A65', '#FF5E7D']) as [string, string];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={grad} style={{ paddingTop: insets.top + S.sm, paddingBottom: S.md, paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Pressable onPress={() => router.replace('/')}>
          <Txt size={20} weight="heading" color="rgba(255,255,255,0.95)">
            ‹
          </Txt>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={17} weight="display" color="#fff">
            {GAME_NAMES[state.gameType]}
          </Txt>
          <Txt size={11} weight="medium" color="rgba(255,255,255,0.85)">
            v{state.version} · {connected ? 'đã kết nối' : 'đang kết nối lại...'}
          </Txt>
        </View>
        <Chip label={connected ? 'LIVE' : 'OFF'} color={connected ? '#fff' : '#fff'} soft={connected ? 'rgba(255,255,255,0.28)' : C.danger} size={10} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + 40, gap: S.md }}>
        {Board ? <Board view={view} mySeat={mySeat} send={send} deadline={state.deadline} /> : <Txt>Game chưa hỗ trợ</Txt>}
      </ScrollView>

      {events.length ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(46,37,69,0.88)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: R.pill }}>
            <Txt size={20} weight="display" color="#fff">
              {events.includes('win') ? '🎉 Thắng rồi!' : events.includes('kick') ? '💥 Đá ngựa!' : events.includes('bump') ? '💢 Húc!' : events.includes('score') ? '⭐ Ghi điểm!' : events.includes('bankrupt') ? '💸 Phá sản!' : '💰 Thu tô!'}
            </Txt>
          </View>
        </View>
      ) : null}

      <Modal visible={!!result} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
          <Card style={{ width: '100%', maxWidth: 400, gap: S.md, alignItems: 'center' }}>
            {(() => {
              const mine = result?.rows.find((r: any) => r.userId === profile?.id);
              const win = mine?.result === 'win';
              return (
                <>
                  <Text style={{ fontSize: 60 }}>{win ? '🏆' : mine?.result === 'draw' ? '🤝' : '🌧️'}</Text>
                  <Txt size={26} weight="display" color={win ? C.mint : mine?.result === 'draw' ? C.sun : C.inkSoft}>
                    {win ? 'Chiến thắng!' : mine?.result === 'draw' ? 'Hoà rồi!' : 'Thua mất rồi'}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: S.md }}>
                    <Reward label="EXP" value={`+${mine?.xpGain ?? 0}`} color={C.secondary} />
                    <Reward label="Coin" value={`+${mine?.coinGain ?? 0}`} color={C.sun} />
                    {mine?.ratingDelta ? (
                      <Reward label="Rank" value={`${mine.ratingDelta > 0 ? '+' : ''}${mine.ratingDelta}`} color={mine.ratingDelta > 0 ? C.mint : C.danger} />
                    ) : null}
                  </View>
                  {mine && mine.levelAfter > mine.levelBefore ? (
                    <Chip label={`Lên cấp ${mine.levelAfter}! 🎊`} color="#9A6B00" soft={C.sunSoft} />
                  ) : null}

                  <View style={{ width: '100%', gap: 6, marginTop: 6 }}>
                    {result?.rows
                      .slice()
                      .sort((a: any, b: any) => a.place - b.place)
                      .map((r: any, i: number) => {
                        const p = view.players?.find((x: any) => x.id === r.userId);
                        return (
                          <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: S.sm }}>
                            <Txt size={14} weight="display" color={SEAT_COLORS[i]} style={{ width: 22 }}>
                              #{r.place}
                            </Txt>
                            <Txt size={13} weight="bold" style={{ flex: 1 }}>
                              {p?.name ?? r.userId}
                            </Txt>
                            <Txt size={12} weight="medium" color={C.inkSoft}>
                              {r.score} điểm
                            </Txt>
                            <Txt size={12} weight="bold" color={r.result === 'win' ? C.mint : C.inkFaint}>
                              {r.result === 'win' ? 'Thắng' : r.result === 'draw' ? 'Hoà' : 'Thua'}
                            </Txt>
                          </View>
                        );
                      })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: S.sm, marginTop: 6 }}>
                    <Btn label="Về trang chủ" tone="ghost" onPress={() => router.replace('/')} />
                    <Btn label="Chơi tiếp" icon="🔁" onPress={() => router.replace('/quickplay')} />
                  </View>
                </>
              );
            })()}
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function Reward({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.md }}>
      <Txt size={18} weight="display" color={color}>
        {value}
      </Txt>
      <Txt size={11} color={C.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}
