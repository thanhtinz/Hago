import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, Txt } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { GameIcon, GameIconName } from '../src/components/GameIcon';
import { ArtToken } from '../src/components/ArtToken';
import { Art, ArtName } from '../src/components/Art';
import { C, GAME_GRADIENT, R, S, glowShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { emitAck } from '../src/lib/socket';
import { useStore } from '../src/state/store';

export default function QuickPlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ gameType?: string; mode?: string }>();
  const { socket, showToast } = useStore();
  const [games, setGames] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(params.gameType ?? null);
  const [mode, setMode] = useState<'normal' | 'ranked'>((params.mode as any) ?? 'normal');
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    api<{ games: any[] }>('/api/games').then((r) => setGames(r.games));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onFound = (d: any) => {
      setSearching(false);
      clearInterval(timer.current);
      showToast(`Đã tìm thấy trận sau ${(d.waitMs / 1000).toFixed(1)}s`);
    };
    const onStart = (d: any) => router.replace(`/match/${d.matchId}`);
    socket.on('mm.found', onFound);
    socket.on('match.start', onStart);
    return () => {
      socket.off('mm.found', onFound);
      socket.off('match.start', onStart);
    };
  }, [socket, router, showToast]);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = async () => {
    if (!selected) return showToast('Chọn một game trước nhé', 'warn');
    const res: any = await emitAck('mm.join', { gameType: selected, mode });
    if (!res?.ok) return showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
    setSearching(true);
    setElapsed(0);
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const cancel = async () => {
    await emitAck('mm.leave', {});
    setSearching(false);
    clearInterval(timer.current);
  };

  const meta = games.find((g) => g.id === selected);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + S.md }}>
      <View style={{ paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Pressable onPress={() => router.back()}>
          <Txt size={22} weight="heading" color={C.inkSoft}>
            ‹
          </Txt>
        </Pressable>
        <Txt size={22} weight="display">
          Chơi nhanh
        </Txt>
      </View>

      {searching ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, padding: S.xl }}>
          <LinearGradient
            colors={(GAME_GRADIENT[selected ?? 'caro'] ?? ['#FF8A65', '#FF5E7D']) as [string, string]}
            style={{ width: 170, height: 170, borderRadius: 85, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArtToken name={`game-${selected ?? 'caro'}` as ArtName} size={120} art={74} shadow={0.28} />
          </LinearGradient>
          <ActivityIndicator size="large" color={C.primary} />
          <Txt size={22} weight="display">
            Đang tìm đối thủ...
          </Txt>
          <Txt size={14} color={C.inkSoft}>
            {meta?.name} · {mode === 'ranked' ? 'Xếp hạng' : 'Thường'} · {elapsed}s
          </Txt>
          <Txt size={12} color={C.inkFaint} center style={{ maxWidth: 280 }}>
            Ghép theo trình độ, càng chờ lâu hệ thống càng mở rộng khoảng điểm để bạn vào trận nhanh hơn.
          </Txt>
          <Btn label="Huỷ tìm trận" tone="ghost" onPress={cancel} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: 40 }}>
          <Card style={{ gap: S.md }}>
            <Txt size={15} weight="heading">
              Chế độ
            </Txt>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              {(['normal', 'ranked'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: S.md,
                    borderRadius: R.md,
                    borderWidth: 2,
                    alignItems: 'center',
                    gap: 3,
                    borderColor: mode === m ? C.primary : C.line,
                    backgroundColor: mode === m ? C.primarySoft : C.surface,
                  }}
                >
                  <Icon name={m === 'normal' ? 'star' : 'medal'} size={23} color={mode === m ? C.primary : C.inkFaint} strokeWidth={2.1} />
                  <Txt size={13} weight="bold">
                    {m === 'normal' ? 'Thường' : 'Xếp hạng'}
                  </Txt>
                  <Txt size={10} color={C.inkFaint} center>
                    {m === 'normal' ? 'Chơi vui, không mất điểm' : 'Ăn/mất điểm rank'}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={{ gap: S.md }}>
            <Txt size={15} weight="heading">
              Chọn game
            </Txt>
            {games
              .filter((g) => (mode === 'ranked' ? g.modes.includes('ranked') : true))
              .map((g) => (
                <Pressable key={g.id} onPress={() => setSelected(g.id)}>
                  <Card
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: S.md,
                      borderColor: selected === g.id ? C.primary : C.line,
                      backgroundColor: selected === g.id ? C.primarySoft : C.surface,
                    }}
                  >
                    <LinearGradient
                      colors={(GAME_GRADIENT[g.id] ?? ['#eee', '#ddd']) as [string, string]}
                      style={[{ width: 52, height: 52, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' }, glowShadow((GAME_GRADIENT[g.id] ?? ['#999'])[0], 0.3, 10, 5)]}
                    >
                      <Art name={`game-${g.id}` as ArtName} size={34} color="#fff" shadow />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Txt size={15} weight="bold">
                        {g.name}
                      </Txt>
                      <Txt size={11} color={C.inkSoft}>
                        {g.tagline}
                      </Txt>
                    </View>
                    <Chip
                      label={`${g.minPlayers}${g.maxPlayers > g.minPlayers ? `-${g.maxPlayers}` : ''}`}
                      icon="users"
                      color={C.inkSoft}
                      soft={C.surfaceAlt}
                      size={10}
                    />
                  </Card>
                </Pressable>
              ))}
          </View>

          <Btn label="Bắt đầu tìm trận" icon="bolt" size="lg" full disabled={!selected} onPress={start} />
        </ScrollView>
      )}
    </View>
  );
}
