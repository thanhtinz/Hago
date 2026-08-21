import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Empty, Txt } from '../src/components/ui';
import { StickerArt, StickerName } from '../src/components/Piece';
import { Art, ArtName } from '../src/components/Art';
import { C, F, R, S } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { emitAck } from '../src/lib/socket';
import { useStore } from '../src/state/store';

/**
 * Kênh chat của bang. Khác chat 1-1 ở chỗ nhiều người nói nên tin của người
 * khác phải kèm tên và avatar, còn lại dùng chung đường truyền `chat.send` với
 * `channelId` thay vì `toUserId`.
 */
const STICKERS: StickerName[] = ['happy', 'sad', 'love', 'fire', 'win', 'crown', 'star', 'gem'];

export default function GuildChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, profile, showToast } = useStore();
  const [guild, setGuild] = useState<any>(null);
  const [members, setMembers] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);
  const channelId = `guild:${id}`;

  useEffect(() => {
    api<any>(`/api/guilds/${id}`).then((r) => {
      setGuild(r.guild);
      setMembers(Object.fromEntries(r.members.map((m: any) => [m.user.id, m.user])));
    });
    emitAck('chat.history', { channelId }).then((r: any) => {
      if (r?.ok) setMessages(r.messages);
      else showToast(friendlyError(r?.error ?? 'NETWORK'), 'warn');
    });
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m: any) => {
      if (m.channelId === channelId) setMessages((prev) => [...prev, m]);
    };
    socket.on('chat.message', onMsg);
    return () => {
      socket.off('chat.message', onMsg);
    };
  }, [socket, channelId]);

  const send = async (body: string, kind = 'text') => {
    if (!body.trim()) return;
    setDraft('');
    const res: any = await emitAck('chat.send', { channelId, body, kind });
    if (!res?.ok) showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + S.md, paddingHorizontal: S.lg, paddingBottom: S.md, flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderBottomWidth: 2, borderColor: C.line }}>
        <Pressable onPress={() => router.back()}>
          <Txt size={22} weight="heading" color={C.inkSoft}>
            ‹
          </Txt>
        </Pressable>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: R.md,
            backgroundColor: guild?.color ?? C.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Art name={(guild?.emblem ?? 'crown') as ArtName} size={24} color="#FFFFFF" glyph />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="heading" numberOfLines={1}>
            {guild?.name ?? '...'}
          </Txt>
          <Txt size={11} color={C.inkFaint}>
            {guild ? `${guild.members} thành viên` : ''}
          </Txt>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: S.lg, gap: S.sm, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Empty icon="chat" title="Chưa có tin nhắn" hint="Chào cả bang một câu đi!" />}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          const who = members[item.senderId];
          return (
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
              {/* Nhiều người cùng nói nên tin của người khác phải có avatar và tên */}
              {!mine ? <Avatar seed={who?.avatarSeed} styleName={who?.avatarStyle} size={28} /> : null}
              <View>
                {!mine ? (
                  <Txt size={10} weight="bold" color={C.inkFaint} style={{ marginBottom: 2 }}>
                    {who?.displayName ?? 'Thành viên'}
                  </Txt>
                ) : null}
                <View
                  style={{
                    backgroundColor: mine ? C.primary : C.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: R.lg,
                    borderBottomRightRadius: mine ? 4 : R.lg,
                    borderBottomLeftRadius: mine ? R.lg : 4,
                    borderWidth: mine ? 0 : 2,
                    borderColor: C.line,
                  }}
                >
                  {/^:[a-z0-9-]+:$/.test(item.body) ? (
                    <StickerArt name={item.body.slice(1, -1) as StickerName} size={44} />
                  ) : (
                    <Txt size={14} color={mine ? '#fff' : C.ink}>
                      {item.body}
                    </Txt>
                  )}
                </View>
                <Txt size={9} color={C.inkFaint} style={{ marginTop: 2, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                  {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </Txt>
              </View>
            </View>
          );
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 42 }}
        contentContainerStyle={{ paddingHorizontal: S.lg, gap: 10, alignItems: 'center' }}
      >
        {STICKERS.map((s) => (
          <Pressable key={s} onPress={() => send(`:${s}:`, 'sticker')} accessibilityLabel={`Gửi sticker ${s}`}>
            <StickerArt name={s} size={30} />
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: S.sm, padding: S.md, paddingBottom: Math.max(insets.bottom, S.md), alignItems: 'center', backgroundColor: C.surface, borderTopWidth: 2, borderColor: C.line }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft)}
          placeholder="Nhắn cho cả bang..."
          placeholderTextColor={C.inkFaint}
          style={{ flex: 1, backgroundColor: C.bg, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 11, fontFamily: F.body, fontSize: 14, color: C.ink }}
        />
        <Btn label="Gửi" icon="send" size="sm" onPress={() => send(draft)} />
      </View>
    </KeyboardAvoidingView>
  );
}
