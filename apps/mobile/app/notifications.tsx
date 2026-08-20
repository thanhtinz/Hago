import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Empty, Txt } from '../src/components/ui';
import { Icon, IconName } from '../src/components/Icon';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { C, R, S } from '../src/theme';
import { api } from '../src/lib/api';
import { emitAck } from '../src/lib/socket';
import { useStore } from '../src/state/store';

/** Mỗi loại thông báo một asset riêng để lướt danh sách nhận ra ngay. */
const ICONS: Record<string, IconName> = {
  friend_request: 'handshake',
  friend_accepted: 'user-plus',
  room_invite: 'door',
  match_found: 'bolt',
  match_result: 'trophy',
  quest_complete: 'list',
  reward: 'gift',
  event: 'star',
  system: 'bell',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUnread, showToast } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api<any>('/api/notifications');
      setItems(r.notifications);
      setUnread(r.unread);
    } finally {
      setBusy(false);
    }
  }, [setUnread]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const readAll = async () => {
    await api('/api/notifications/read', { method: 'POST', body: {} });
    setUnread(0);
    load();
  };

  const open = async (n: any) => {
    if (n.type === 'room_invite' && n.payload?.roomId) {
      const res: any = await emitAck('room.join', { roomId: n.payload.roomId });
      if (res?.ok) router.push(`/room/${res.room.id}`);
      else showToast('Phòng không còn khả dụng', 'warn');
    } else if (n.type === 'friend_request' && n.payload?.userId) {
      router.push(`/user/${n.payload.userId}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScreenHeader
      title="Thông báo"
      icon="bell"
      right={
        <Pressable onPress={readAll} style={{ backgroundColor: 'rgba(255,255,255,0.24)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
          <Txt size={12} weight="bold" color="#fff">
            Đọc hết
          </Txt>
        </Pressable>
      }
    />
    <ScrollView
      contentContainerStyle={{ padding: S.lg, paddingBottom: 40, gap: S.md }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >

      {items.length ? (
        items.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)}>
            <Card style={{ flexDirection: 'row', gap: S.md, backgroundColor: n.readAt ? C.surface : C.primarySoft, borderColor: n.readAt ? C.line : C.primary }}>
              <View style={{ width: 40, height: 40, borderRadius: R.md, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ICONS[n.type] ?? 'bell'} size={21} color={C.primary} strokeWidth={2.1} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold">
                  {n.title}
                </Txt>
                <Txt size={12} color={C.inkSoft}>
                  {n.body}
                </Txt>
                <Txt size={10} color={C.inkFaint} style={{ marginTop: 3 }}>
                  {new Date(n.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </Txt>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty icon="bell" title="Chưa có thông báo" hint="Kết bạn và chơi game để nhận thông báo nhé!" />
      )}
    </ScrollView>
    </View>
  );
}
