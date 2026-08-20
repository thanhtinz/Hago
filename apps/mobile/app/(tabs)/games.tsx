import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, Field, SectionTitle, Txt } from '../../src/components/ui';
import { GameCard, GameMeta } from '../../src/components/GameCard';
import { C, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

export default function GamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const [games, setGames] = useState<GameMeta[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [code, setCode] = useState('');
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

  const joinByCode = async () => {
    if (code.trim().length < 4) return showToast('Nhập mã phòng 6 ký tự', 'warn');
    try {
      const res: any = await emitAck('room.join', { code: code.trim().toUpperCase() });
      if (!res?.ok) return showToast(friendlyError(res?.error ?? 'ROOM_NOT_FOUND'), 'warn');
      router.push(`/room/${res.room.id}`);
    } catch {
      showToast(friendlyError('NETWORK'), 'warn');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, paddingBottom: 30, gap: S.xl }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      <View>
        <Txt size={28} weight="display">
          Kho game 🎲
        </Txt>
        <Txt size={13} color={C.inkSoft}>
          {games.length} mini game — chơi là ghiền
        </Txt>
      </View>

      <Card style={{ gap: S.md }}>
        <Txt size={15} weight="heading">
          🔑 Vào phòng bằng mã
        </Txt>
        <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="VD: A7K2QP"
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
          <Btn label="Vào" icon="➡️" onPress={joinByCode} />
        </View>
      </Card>

      <View style={{ gap: S.md }}>
        <SectionTitle title="Tất cả game" emoji="🕹️" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'space-between' }}>
          {games.map((g) => (
            <View key={g.id} style={{ width: '48%' }}>
              <GameCard game={g} wide onPress={() => router.push(`/game/${g.id}`)} />
            </View>
          ))}
        </View>
      </View>

      <View>
        <SectionTitle title="Phòng đang mở" emoji="🚪" />
        {rooms.length ? (
          <View style={{ gap: S.md }}>
            {rooms.map((r) => (
              <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: R.md,
                    backgroundColor: C.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{games.find((g) => g.id === r.gameType)?.emoji ?? '🎮'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold">
                    {games.find((g) => g.id === r.gameType)?.name ?? r.gameType}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Chip label={`#${r.code}`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
                    <Chip label={`${r.players.length}/${r.maxPlayers}`} icon="👥" color={C.mint} soft={C.mintSoft} size={10} />
                    <Chip label={r.mode} color={C.secondary} soft={C.secondarySoft} size={10} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {r.players.slice(0, 3).map((p: any) => (
                    <View key={p.user.id} style={{ marginLeft: -8 }}>
                      <Avatar seed={p.user.avatarSeed} styleName={p.user.avatarStyle} size={28} />
                    </View>
                  ))}
                </View>
                <Btn
                  label="Vào"
                  size="sm"
                  onPress={async () => {
                    const res: any = await emitAck('room.join', { roomId: r.id });
                    if (res?.ok) router.push(`/room/${res.room.id}`);
                    else showToast(friendlyError(res?.error ?? 'ROOM_NOT_FOUND'), 'warn');
                  }}
                />
              </Card>
            ))}
          </View>
        ) : (
          <Card>
            <Empty emoji="🏠" title="Chưa có phòng công khai" hint="Tạo phòng mới từ trang chi tiết game nhé!" />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
