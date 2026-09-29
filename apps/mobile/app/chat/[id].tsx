import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backToLobby } from '../../src/nav';
import { api, useAuth, type PublicUser } from '../../src/net/api';
import { useLive, useWatch } from '../../src/net/live';
import { Face } from '../../src/ui/Crest';
import { ChatPanel } from '../../src/ui/Chat';
import { Icon } from '../../src/ui/Icon';
import { Txt } from '../../src/ui/parts';
import { AppBackdrop } from '../../src/ui/surface';
import { A, S } from '../../src/ui/theme';

/**
 * Nhắn riêng với một người.
 *
 * Tên kênh do **hai id sắp xếp** tạo ra, nên hai bên cùng mở một kênh mà
 * không cần ai nói cho ai biết tên nó. Máy chủ vẫn kiểm lại quyền vào: id
 * người dùng nằm ngay trong đường dẫn hồ sơ, không phải bí mật.
 */
export default function DmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me } = useAuth();
  const s = useLive();
  const [who, setWho] = useState<PublicUser | null>(null);

  useEffect(() => {
    void api
      .user(String(id))
      .then((r) => setWho(r.user))
      .catch(() => setWho(null));
  }, [id]);
  useWatch(id ? [String(id)] : []);

  const W = Math.min(width, 460);
  const online = s.online.has(String(id));
  const channel = me && id ? `rieng:${[me.id, String(id)].sort().join('|')}` : null;

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={W} height={height} />
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.sm, paddingHorizontal: S.lg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.sm }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : backToLobby(router))}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Icon name="back" size={22} color={A.inkSoft} />
          </Pressable>
          {who ? <Face avatar={who.avatar} id={who.id} size={36} ring={false} /> : null}
          <Pressable onPress={() => router.push(`/u/${id}`)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Mở hồ sơ">
            <Txt size={16} weight="display" numberOfLines={1}>
              {who?.name ?? 'Đang tải…'}
            </Txt>
            <Txt size={11} color={online ? A.jade : A.inkFaint}>
              {online ? 'Đang trực tuyến' : 'Ngoại tuyến'}
            </Txt>
          </Pressable>
        </View>

        {channel && me ? (
          <ChatPanel channel={channel} meId={me.id} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={12} color={A.inkFaint}>
              Phải đăng nhập mới nhắn tin được.
            </Txt>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
