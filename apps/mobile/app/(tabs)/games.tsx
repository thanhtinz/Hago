import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, SectionTitle, Txt } from '../../src/components/ui';
import { GameCard, GameMeta } from '../../src/components/GameCard';
import { Chibi, ChibiBadge } from '../../src/components/Chibi';
import { GAME_ART } from '../../src/lib/assets';
import { C, GAME_GRADIENT, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

export default function GamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const [games, setGames] = useState<GameMeta[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [cat, rs] = await Promise.all([
        api<{ games: GameMeta[] }>('/api/games'),
        api<{ rooms: any[] }>('/api/rooms'),
      ]);
      setGames(cat.games);
      setRooms(rs.rooms);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, paddingBottom: 30, gap: S.xl }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt size={28} weight="display">
            Kho game
          </Txt>
          <Chibi name="joystick" size={28} />
        </View>
        <Txt size={13} color={C.inkSoft}>
          {games.length} mini game — chơi là ghiền
        </Txt>
      </View>

      {/* Lối vào phòng chơi */}
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/rooms?tab=find')}>
          <LinearGradient colors={['#7FC7F5', '#3BB4FF']} style={{ borderRadius: R.lg, padding: S.lg, gap: 4 }}>
            <Chibi name="door" size={30} />
            <Txt size={15} weight="heading" color="#fff">
              Tìm phòng
            </Txt>
            <Txt size={11} weight="medium" color="rgba(255,255,255,0.9)">
              {rooms.length} phòng đang mở
            </Txt>
          </LinearGradient>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/rooms?tab=create')}>
          <LinearGradient colors={['#FFC46B', '#FF9450']} style={{ borderRadius: R.lg, padding: S.lg, gap: 4 }}>
            <Chibi name="key" size={30} />
            <Txt size={15} weight="heading" color="#fff">
              Tạo phòng
            </Txt>
            <Txt size={11} weight="medium" color="rgba(255,255,255,0.9)">
              Tuỳ chỉnh luật, mời bạn bè
            </Txt>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={{ gap: S.md }}>
        <SectionTitle title="Tất cả game" emoji="🎲" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'space-between' }}>
          {games.map((g) => (
            <View key={g.id} style={{ width: '48%' }}>
              <GameCard game={g} onPress={() => router.push(`/game/${g.id}`)} />
            </View>
          ))}
        </View>
      </View>

      <View>
        <SectionTitle
          title="Phòng đang mở"
          emoji="🚪"
          action={
            rooms.length ? (
              <Pressable onPress={() => router.push('/rooms?tab=find')}>
                <Txt size={12} weight="bold" color={C.secondary}>
                  Xem tất cả
                </Txt>
              </Pressable>
            ) : undefined
          }
        />
        {rooms.length ? (
          <View style={{ gap: S.md }}>
            {rooms.slice(0, 4).map((r) => {
              const g = games.find((x) => x.id === r.gameType);
              const grad = (GAME_GRADIENT[r.gameType] ?? ['#eee', '#ddd']) as [string, string];
              return (
                <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <LinearGradient colors={grad} style={{ width: 46, height: 46, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' }}>
                    <Chibi name={GAME_ART[r.gameType] ?? 'gamepad'} size={28} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {g?.name ?? r.gameType}
                    </Txt>
                    <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
                      <Chip label={`#${r.code}`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
                      <Chip label={`${r.players.length}/${r.maxPlayers}`} icon="👥" color={C.mint} soft={C.mintSoft} size={10} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    {r.players.slice(0, 3).map((p: any, i: number) => (
                      <View key={p.user.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                        <Avatar seed={p.user.avatarSeed} styleName={p.user.avatarStyle} size={28} ring={C.surface} />
                      </View>
                    ))}
                  </View>
                  <Btn
                    label="Vào"
                    size="sm"
                    onPress={async () => {
                      if (r.hasPassword) return router.push('/rooms?tab=find');
                      const res: any = await emitAck('room.join', { roomId: r.id });
                      if (res?.ok) router.push(`/room/${res.room.id}`);
                      else showToast(friendlyError(res?.error ?? 'ROOM_NOT_FOUND'), 'warn');
                    }}
                  />
                </Card>
              );
            })}
          </View>
        ) : (
          <Card>
            <Empty emoji="🏠" title="Chưa có phòng công khai" hint="Tạo phòng để rủ bạn bè cùng chơi nhé!" />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
