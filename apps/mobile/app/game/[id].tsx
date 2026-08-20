import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, SectionTitle, Txt } from '../../src/components/ui';
import { Bubbles, Gloss } from '../../src/components/decor';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { C, GAME_GRADIENT, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const [game, setGame] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [board, setBoard] = useState<any[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [ranked, setRanked] = useState(false);

  const load = useCallback(async () => {
    const [cat, rs, lb] = await Promise.all([
      api<{ games: any[] }>('/api/games'),
      api<{ rooms: any[] }>(`/api/rooms?gameType=${id}`),
      api<any>(`/api/users/leaderboard?gameType=${id}&limit=5`),
    ]);
    setGame(cat.games.find((g) => g.id === id));
    setRooms(rs.rooms);
    setBoard(lb.entries);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!game) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const grad = (GAME_GRADIENT[game.id] ?? ['#FF8A65', '#FF5E7D']) as [string, string];

  const openRoomBuilder = () => router.push(`/rooms?tab=create&gameType=${game.id}`);

  const createRoom = async () => {
    const res: any = await emitAck('room.create', {
      gameType: game.id,
      mode: ranked ? 'ranked' : 'custom',
      isPrivate,
    });
    if (!res?.ok) return showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
    router.push(`/room/${res.room.id}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 12) + S.md,
          padding: S.lg,
          paddingBottom: S.xxl,
          gap: 6,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          overflow: 'hidden',
        }}
      >
        <Bubbles spec={[{ size: 170, right: -50, top: -56, alpha: 0.18 }, { size: 96, left: -34, bottom: -40, alpha: 0.13 }]} />
        <Gloss opacity={0.12} />
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Txt size={20} weight="heading" color="rgba(255,255,255,0.9)">
            ‹ Quay lại
          </Txt>
        </Pressable>
        <GameIcon name={game.id as GameIconName} size={72} />
        <Txt size={30} weight="display" color="#fff">
          {game.name}
        </Txt>
        <Txt size={13} weight="medium" color="rgba(255,255,255,0.92)">
          {game.tagline}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <Chip label={game.category} color="#fff" soft="rgba(255,255,255,0.25)" size={11} />
          <Chip label={`${game.minPlayers}-${game.maxPlayers} người`} icon="users" color="#fff" soft="rgba(255,255,255,0.25)" size={11} />
          <Chip label={`~${game.avgMinutes} phút`} icon="clock" color="#fff" soft="rgba(255,255,255,0.25)" size={11} />
        </View>
      </LinearGradient>

      <View style={{ padding: S.lg, marginTop: -18, gap: S.md }}>
        <Card style={{ gap: S.md }}>
          <Btn label="Chơi nhanh" icon="bolt" size="lg" full onPress={() => router.push(`/quickplay?gameType=${game.id}`)} />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Txt size={15} weight="heading">
            Tạo phòng riêng
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt size={13} weight="medium" color={C.inkSoft}>
              Phòng kín (chỉ vào bằng mã)
            </Txt>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: C.primary }} />
          </View>
          {game.modes.includes('ranked') ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt size={13} weight="medium" color={C.inkSoft}>
                Tính điểm xếp hạng
              </Txt>
              <Switch value={ranked} onValueChange={setRanked} trackColor={{ true: C.secondary }} />
            </View>
          ) : null}
          <Btn label="Tạo phòng nhanh" icon="home" tone="secondary" full onPress={createRoom} />
          <Pressable onPress={openRoomBuilder} style={{ alignItems: 'center', paddingTop: 2 }}>
            <Txt size={12} weight="bold" color={C.secondary}>
              Tuỳ chỉnh chi tiết hơn ›
            </Txt>
          </Pressable>
        </Card>

        <SectionTitle title="Phòng đang mở" icon="grid" />
        {rooms.length ? (
          rooms.map((r) => (
            <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold">
                  Phòng #{r.code}
                </Txt>
                <Txt size={11} color={C.inkFaint}>
                  {r.players.length}/{r.maxPlayers} người · {r.mode}
                </Txt>
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
          ))
        ) : (
          <Card>
            <Empty icon="grid" title="Chưa có phòng nào" hint="Hãy là người đầu tiên tạo phòng!" />
          </Card>
        )}

        <SectionTitle title="Top người chơi" icon="grid" />
        <Card style={{ gap: S.md }}>
          {board.length ? (
            board.map((e: any) => (
              <View key={e.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <Txt size={15} weight="display" color={e.rank <= 3 ? C.sun : C.inkFaint} style={{ width: 26 }}>
                  {e.rank}
                </Txt>
                <Avatar seed={e.user.avatarSeed} styleName={e.user.avatarStyle} size={36} />
                <Txt size={13} weight="bold" style={{ flex: 1 }}>
                  {e.user.displayName}
                </Txt>
                <Chip label={String(e.user.rating)} icon="medal" color={C.secondaryDark} soft={C.secondarySoft} size={11} />
              </View>
            ))
          ) : (
            <Empty icon="trend" title="Chưa có dữ liệu xếp hạng" />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
