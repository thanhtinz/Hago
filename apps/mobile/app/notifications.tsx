import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Empty, Txt } from '../src/components/ui';
import { C, R, S } from '../src/theme';
import { api } from '../src/lib/api';
import { emitAck } from '../src/lib/socket';
import { useStore } from '../src/state/store';

const ICONS: Record<string, string> = {
  friend_request: '🤝',
  friend_accepted: '🎉',
  room_invite: '🎮',
  match_found: '⚡',
  match_result: '🏆',
  quest_complete: '📋',
  reward: '🎁',
  event: '🎪',
  system: '📢',
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
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.md, paddingBottom: 40, gap: S.md }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Pressable onPress={() => router.back()}>
            <Txt size={22} weight="heading" color={C.inkSoft}>
              ‹
            </Txt>
          </Pressable>
          <Txt size={26} weight="display">
            Thông báo 🔔
          </Txt>
        </View>
        <Btn label="Đọc hết" size="sm" tone="ghost" onPress={readAll} />
      </View>

      {items.length ? (
        items.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)}>
            <Card style={{ flexDirection: 'row', gap: S.md, backgroundColor: n.readAt ? C.surface : C.primarySoft, borderColor: n.readAt ? C.line : C.primary }}>
              <View style={{ width: 40, height: 40, borderRadius: R.md, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{ICONS[n.type] ?? '🔔'}</Text>
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
        <Empty emoji="🔕" title="Chưa có thông báo" hint="Kết bạn và chơi game để nhận thông báo nhé!" />
      )}
    </ScrollView>
  );
}
