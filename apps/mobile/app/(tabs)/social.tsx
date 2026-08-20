import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, Field, SectionTitle, Txt } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/ScreenHeader';

import { C, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { useStore } from '../../src/state/store';
import { rankArt } from '../../src/lib/rank';

type Tab = 'friends' | 'requests' | 'chats' | 'find';

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [f, c] = await Promise.all([
        api<{ friends: any[] }>('/api/social/friends'),
        api<{ channels: any[] }>('/api/social/channels'),
      ]);
      setFriends(f.friends);
      setChannels(c.channels.filter((x) => x.kind === 'dm'));
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) return setFound([]);
    const res = await api<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
    setFound(res.users);
  };

  const act = async (path: string, ok: string) => {
    try {
      await api(path, { method: 'POST' });
      showToast(ok);
      load();
    } catch (e: any) {
      showToast(friendlyError(e.code), 'warn');
    }
  };

  const accepted = friends.filter((f) => f.status === 'accepted');
  const pending = friends.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const outgoing = friends.filter((f) => f.status === 'pending' && f.direction === 'outgoing');

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'friends', label: `Bạn bè (${accepted.length})` },
    { id: 'requests', label: 'Lời mời', badge: pending.length },
    { id: 'chats', label: 'Tin nhắn' },
    { id: 'find', label: 'Tìm bạn' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Bạn bè"
        icon="chat"
        back={false}
        subtitle={`${accepted.length} bạn · ${pending.length} lời mời đang chờ`}
        bottomPadding={S.md}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 58, marginTop: S.sm }}
        contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm, alignItems: 'center' }}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: R.pill,
              backgroundColor: tab === t.id ? C.ink : C.surface,
              borderWidth: 2,
              borderColor: tab === t.id ? C.ink : C.line,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Txt size={13} weight="bold" color={tab === t.id ? '#fff' : C.inkSoft}>
              {t.label}
            </Txt>
            {t.badge ? (
              <View style={{ backgroundColor: C.danger, borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Txt size={10} weight="bold" color="#fff">
                  {t.badge}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
      >
        {tab === 'friends' &&
          (accepted.length ? (
            accepted.map((f) => (
              <Card key={f.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <Pressable onPress={() => router.push(`/user/${f.user.id}`)}>
                  <Avatar seed={f.user.avatarSeed} styleName={f.user.avatarStyle} frameId={f.user.frameId} size={46} online={f.user.online} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold">
                    {f.user.displayName}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                    <Chip label={`Lv.${f.user.level}`} color="#9A6B00" soft={C.sunSoft} size={10} />
                    <Chip label={f.user.rank} art={rankArt(f.user.rank)} color={C.secondaryDark} soft={C.secondarySoft} size={10} />
                  </View>
                </View>
                <Btn label="Nhắn" size="sm" tone="ghost" icon="chat" onPress={() => router.push(`/chat/${f.user.id}`)} />
              </Card>
            ))
          ) : (
            <Empty icon="handshake" title="Chưa có bạn bè" hint="Sang tab Tìm bạn để kết bạn với người chơi khác" />
          ))}

        {tab === 'requests' && (
          <>
            <SectionTitle title="Đang chờ bạn duyệt" icon="grid" />
            {pending.length ? (
              pending.map((f) => (
                <Card key={f.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar seed={f.user.avatarSeed} styleName={f.user.avatarStyle} size={44} />
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {f.user.displayName}
                    </Txt>
                    <Txt size={11} color={C.inkFaint}>
                      @{f.user.username}
                    </Txt>
                  </View>
                  <Btn label="Đồng ý" size="sm" tone="mint" onPress={() => act(`/api/social/friends/${f.user.id}/accept`, 'Đã kết bạn')} />
                </Card>
              ))
            ) : (
              <Empty icon="bell" title="Không có lời mời nào" />
            )}
            {outgoing.length ? (
              <>
                <SectionTitle title="Bạn đã gửi" icon="grid" />
                {outgoing.map((f) => (
                  <Card key={f.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                    <Avatar seed={f.user.avatarSeed} styleName={f.user.avatarStyle} size={40} />
                    <Txt size={13} weight="bold" style={{ flex: 1 }}>
                      {f.user.displayName}
                    </Txt>
                    <Chip label="Đang chờ" color={C.inkFaint} soft={C.surfaceAlt} size={10} />
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}

        {tab === 'chats' &&
          (channels.length ? (
            channels.map((c) => (
              <Pressable key={c.id} onPress={() => c.peer && router.push(`/chat/${c.peer.id}`)}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar seed={c.peer?.avatarSeed} styleName={c.peer?.avatarStyle} size={46} online={c.peer?.online} />
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {c.peer?.displayName ?? 'Kênh chat'}
                    </Txt>
                    <Txt size={12} color={C.inkFaint} numberOfLines={1}>
                      {c.lastBody ?? 'Chưa có tin nhắn'}
                    </Txt>
                  </View>
                  {c.unread > 0 ? (
                    <View style={{ backgroundColor: C.primary, borderRadius: 999, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                      <Txt size={11} weight="bold" color="#fff">
                        {c.unread}
                      </Txt>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            ))
          ) : (
            <Empty icon="chat" title="Chưa có cuộc trò chuyện" hint="Nhắn tin cho bạn bè từ tab Bạn bè" />
          ))}

        {tab === 'find' && (
          <>
            <Field label="Tìm theo tên hoặc username" value={query} onChangeText={search} placeholder="Nhập tên người chơi..." autoCapitalize="none" />
            {found.map((u) => {
              const isFriend = friends.some((f) => f.user.id === u.id);
              return (
                <Card key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar seed={u.avatarSeed} styleName={u.avatarStyle} size={44} online={u.online} />
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {u.displayName}
                    </Txt>
                    <Txt size={11} color={C.inkFaint}>
                      @{u.username} · {u.rank} {u.rating}
                    </Txt>
                  </View>
                  {isFriend ? (
                    <Chip label="Đã kết nối" color={C.mint} soft={C.mintSoft} size={10} />
                  ) : (
                    <Btn label="Kết bạn" size="sm" tone="secondary" icon="plus" onPress={() => act(`/api/social/friends/${u.id}/request`, 'Đã gửi lời mời')} />
                  )}
                </Card>
              );
            })}
            {query.length > 0 && found.length === 0 ? <Empty icon="search" title="Không tìm thấy ai" /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
