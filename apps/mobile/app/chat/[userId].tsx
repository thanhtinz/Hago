import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Empty, Txt } from '../../src/components/ui';
import { StickerArt, StickerName } from '../../src/components/Piece';
import { C, F, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';
import { useBubbleStyle, useEmotePack } from '../../src/components/Cosmetic';

/** Sticker dùng asset game-icons, không dùng ký tự emoji. */
const STICKERS: StickerName[] = ['happy', 'sad', 'love', 'fire', 'win', 'crown', 'star', 'gem', 'paw', 'skull'];

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, profile, showToast } = useStore();
  const [peer, setPeer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Gói emote đang dùng nối thêm vào cuối thanh sticker mặc định.
  const pack = useEmotePack();
  const stickers = React.useMemo(
    () => [...STICKERS, ...pack.filter((x) => !STICKERS.includes(x as StickerName))] as StickerName[],
    [pack],
  );
  const bubble = useBubbleStyle(profile?.bubbleId);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    api<any>(`/api/users/${userId}`).then((r) => setPeer(r.profile));
    api<any>(`/api/social/channels/direct/${userId}`, { method: 'POST' }).then((r) => {
      setChannelId(r.channelId);
      setMessages(r.messages);
    });
  }, [userId]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m: any) => {
      if (m.senderId === userId || m.senderId === profile?.id) setMessages((prev) => [...prev, m]);
    };
    socket.on('chat.message', onMsg);
    return () => {
      socket.off('chat.message', onMsg);
    };
  }, [socket, userId, profile?.id]);

  const send = async (body: string, kind = 'text') => {
    if (!body.trim()) return;
    setDraft('');
    const res: any = await emitAck('chat.send', { toUserId: userId, body, kind });
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
        <Avatar seed={peer?.avatarSeed} styleName={peer?.avatarStyle} frameId={peer?.frameId} size={40} online={peer?.online} />
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="heading">
            {peer?.displayName ?? '...'}
          </Txt>
          <Txt size={11} color={peer?.online ? C.mint : C.inkFaint}>
            {peer?.online ? 'Đang online' : 'Ngoại tuyến'}
          </Txt>
        </View>
        <Pressable onPress={() => router.push(`/user/${userId}`)}>
          <Txt size={13} weight="bold" color={C.secondary}>
            Hồ sơ
          </Txt>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: S.lg, gap: S.sm, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Empty icon="grid" title="Chưa có tin nhắn" hint="Gửi lời chào để bắt đầu trò chuyện!" />}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              <View
                style={{
                  backgroundColor: mine ? bubble?.bg ?? C.primary : C.surface,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: R.lg,
                  borderBottomRightRadius: mine ? 4 : R.lg,
                  borderBottomLeftRadius: mine ? R.lg : 4,
                  borderWidth: mine ? 0 : 2,
                  borderColor: C.line,
                }}
              >
                {/* Sticker gửi dưới dạng :tên: được render thành asset. */}
                {/^:[a-z0-9-]+:$/.test(item.body) ? (
                  <StickerArt name={item.body.slice(1, -1) as StickerName} size={48} />
                ) : (
                  <Txt size={14} color={mine ? bubble?.text ?? '#fff' : C.ink}>
                    {item.body}
                  </Txt>
                )}
              </View>
              <Txt size={9} color={C.inkFaint} style={{ marginTop: 2, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                {item.filtered ? ' · đã lọc' : ''}
              </Txt>
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
        {stickers.map((s) => (
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
          placeholder="Nhắn tin..."
          placeholderTextColor={C.inkFaint}
          style={{ flex: 1, backgroundColor: C.bg, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 11, fontFamily: F.body, fontSize: 14, color: C.ink }}
        />
        <Btn label="Gửi" icon="send" size="sm" onPress={() => send(draft)} />
      </View>
    </KeyboardAvoidingView>
  );
}
