import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Empty, Txt } from '../../src/components/ui';
import { ChatComposer, ImageLightbox, MessageBody } from '../../src/components/Chat';
import { C, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';
import { useBubbleStyle } from '../../src/components/Cosmetic';

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, profile, showToast } = useStore();
  const [peer, setPeer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [zoom, setZoom] = useState<string | null>(null);
  const bubble = useBubbleStyle(profile?.bubbleId);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    api<any>(`/api/users/${userId}`).then((r) => setPeer(r.profile));
    api<any>(`/api/social/channels/direct/${userId}`, { method: 'POST' }).then((r) => setMessages(r.messages));
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

  const send = async (body: string, kind: string) => {
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
        ListEmptyComponent={<Empty icon="chat" title="Chưa có tin nhắn" hint="Gửi lời chào để bắt đầu trò chuyện!" />}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          // Ảnh tự có khung riêng nên bong bóng chỉ làm nền thừa quanh nó.
          const bare = item.kind === 'image';
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              <View
                style={{
                  backgroundColor: bare ? 'transparent' : mine ? bubble?.bg ?? C.primary : C.surface,
                  paddingHorizontal: bare ? 0 : 14,
                  paddingVertical: bare ? 0 : 9,
                  borderRadius: R.lg,
                  borderBottomRightRadius: mine && !bare ? 4 : R.lg,
                  borderBottomLeftRadius: !mine && !bare ? 4 : R.lg,
                  borderWidth: mine || bare ? 0 : 2,
                  borderColor: C.line,
                  overflow: 'hidden',
                }}
              >
                <MessageBody message={item} mine={mine} bubbleText={bubble?.text} onOpenImage={setZoom} />
              </View>
              <Txt size={9} color={C.inkFaint} style={{ marginTop: 2, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                {item.filtered ? ' · đã lọc' : ''}
              </Txt>
            </View>
          );
        }}
      />

      <View style={{ paddingBottom: Math.max(insets.bottom, 0) }}>
        <ChatComposer placeholder="Nhắn tin..." onSend={send} onError={(t) => showToast(t, 'warn')} />
      </View>

      <ImageLightbox url={zoom} onClose={() => setZoom(null)} />
    </KeyboardAvoidingView>
  );
}
