import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, Txt } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { C, F, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, profile, showToast } = useStore();
  const [room, setRoom] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    api<{ games: any[] }>('/api/games').then((r) => setGames(r.games));
    api<{ friends: any[] }>('/api/social/friends').then((r) => setFriends(r.friends.filter((f) => f.status === 'accepted')));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onRoom = (r: any) => setRoom(r);
    const onStart = (d: any) => router.replace(`/match/${d.matchId}`);
    const onLeft = () => router.replace('/games');
    const onMsg = (m: any) => {
      if (m.channelId === `room:${id}`) setMessages((prev) => [...prev, m]);
    };
    socket.on('room.state', onRoom);
    socket.on('match.start', onStart);
    socket.on('room.left', onLeft);
    socket.on('chat.message', onMsg);
    emitAck('room.join', { roomId: id }).then((res: any) => {
      if (res?.ok) setRoom(res.room);
      else {
        showToast(friendlyError(res?.error ?? 'ROOM_NOT_FOUND'), 'warn');
        router.replace('/games');
      }
    });
    emitAck('chat.history', { channelId: `room:${id}` }).then((res: any) => res?.ok && setMessages(res.messages));
    return () => {
      socket.off('room.state', onRoom);
      socket.off('match.start', onStart);
      socket.off('room.left', onLeft);
      socket.off('chat.message', onMsg);
    };
  }, [socket, id, router, showToast]);

  const meta = games.find((g) => g.id === room?.gameType);
  const me = room?.players.find((p: any) => p.user.id === profile?.id);
  const isHost = room?.hostId === profile?.id;

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const res: any = await emitAck('chat.send', { channelId: `room:${id}`, body });
    if (!res?.ok) showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
  };

  const leave = async () => {
    await emitAck('room.leave', {});
    router.replace('/games');
  };

  const start = async () => {
    const res: any = await emitAck('room.start', {});
    if (!res?.ok) showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
  };

  if (!room) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const slots = Array.from({ length: room.maxPlayers }, (_, i) => room.players.find((p: any) => p.seat === i) ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + S.md }}>
      <View style={{ paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Pressable onPress={leave}>
          <Txt size={22} weight="heading" color={C.inkSoft}>
            ‹
          </Txt>
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <GameIcon name={room.gameType as GameIconName} size={24} accent={C.primary} tint={C.inkFaint} />
            <Txt size={20} weight="display">
              {meta?.name}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            <Chip label={`Mã: ${room.code}`} icon="key" color={C.primaryDark} soft={C.primarySoft} size={11} />
            <Chip label={room.mode} color={C.secondaryDark} soft={C.secondarySoft} size={11} />
            {room.isPrivate ? <Chip label="Riêng tư" icon="lock" color={C.inkSoft} soft={C.surfaceAlt} size={11} /> : null}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }} style={{ flexGrow: 0, maxHeight: 340 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
          {slots.map((p, i) => (
            <Card key={i} style={{ width: room.maxPlayers <= 2 ? '47%' : '47%', alignItems: 'center', gap: 6, borderColor: p?.ready ? C.mint : C.line }}>
              {p ? (
                <>
                  <Avatar seed={p.user.avatarSeed} styleName={p.user.avatarStyle} frameId={p.user.frameId} size={54} online={p.connected} />
                  <Txt size={13} weight="bold" numberOfLines={1}>
                    {p.user.displayName}
                  </Txt>
                  <Txt size={10} color={C.inkFaint}>
                    Lv.{p.user.level} · {p.user.rating}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {p.isHost ? <Chip label="Chủ phòng" icon="crown" color="#9A6B00" soft={C.sunSoft} size={9} /> : null}
                    <Chip
                      label={p.ready ? 'Sẵn sàng' : 'Đang chờ'}
                      color={p.ready ? C.mint : C.inkFaint}
                      soft={p.ready ? C.mintSoft : C.surfaceAlt}
                      size={9}
                    />
                  </View>
                  {isHost && !p.isHost ? (
                    <Pressable onPress={() => emitAck('room.kick', { userId: p.user.id })}>
                      <Txt size={10} weight="bold" color={C.danger}>
                        Mời ra
                      </Txt>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <Pressable onPress={() => setShowInvite(true)} style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={22} color={C.inkFaint} />
                  </View>
                  <Txt size={12} weight="medium" color={C.inkFaint}>
                    Mời bạn
                  </Txt>
                </Pressable>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>

      {showInvite ? (
        <View style={{ paddingHorizontal: S.lg, paddingBottom: S.md }}>
          <Card style={{ gap: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt size={14} weight="heading">
                Mời bạn bè
              </Txt>
              <Pressable onPress={() => setShowInvite(false)}>
                <Txt size={13} weight="bold" color={C.inkFaint}>
                  Đóng
                </Txt>
              </Pressable>
            </View>
            {friends.length ? (
              friends.slice(0, 6).map((f) => (
                <View key={f.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar seed={f.user.avatarSeed} styleName={f.user.avatarStyle} size={34} online={f.user.online} />
                  <Txt size={13} weight="medium" style={{ flex: 1 }}>
                    {f.user.displayName}
                  </Txt>
                  <Btn
                    label="Mời"
                    size="sm"
                    tone="ghost"
                    onPress={async () => {
                      const res: any = await emitAck('room.invite', { userId: f.user.id });
                      showToast(res?.ok ? 'Đã gửi lời mời' : friendlyError(res?.error), res?.ok ? 'ok' : 'warn');
                    }}
                  />
                </View>
              ))
            ) : (
              <Empty icon="handshake" title="Chưa có bạn bè" />
            )}
          </Card>
        </View>
      ) : null}

      <View style={{ flex: 1, backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderTopWidth: 2, borderColor: C.line, paddingTop: S.md }}>
        <Txt size={13} weight="heading" color={C.inkSoft} style={{ paddingHorizontal: S.lg }}>
          Chat phòng
        </Txt>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: S.lg, gap: S.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Txt size={12} weight="bold" color={item.senderId === profile?.id ? C.primary : C.secondary}>
                {item.senderName}:
              </Txt>
              <Txt size={12} style={{ flex: 1 }} color={C.inkSoft}>
                {item.body}
              </Txt>
            </View>
          )}
          ListEmptyComponent={<Txt size={12} color={C.inkFaint} center>Chào mọi người trong phòng nào!</Txt>}
        />
        <View style={{ flexDirection: 'row', gap: S.sm, padding: S.md, paddingBottom: Math.max(insets.bottom, S.md), alignItems: 'center' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Nhắn gì đó..."
            placeholderTextColor={C.inkFaint}
            style={{ flex: 1, backgroundColor: C.bg, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 10, fontFamily: F.body, fontSize: 14, color: C.ink }}
          />
          <Btn label="Gửi" size="sm" onPress={send} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: S.sm, padding: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), backgroundColor: C.surface, borderTopWidth: 2, borderColor: C.line }}>
        {isHost ? (
          <Btn label="Bắt đầu trận" icon="play" size="lg" full style={{ flex: 1 }} onPress={start} />
        ) : (
          <Btn
            label={me?.ready ? 'Bỏ sẵn sàng' : 'Sẵn sàng!'}
            icon={me?.ready ? 'minus' : 'check'}
            tone={me?.ready ? 'ghost' : 'mint'}
            size="lg"
            style={{ flex: 1 }}
            full
            onPress={() => emitAck('room.ready', { ready: !me?.ready })}
          />
        )}
      </View>
    </View>
  );
}
