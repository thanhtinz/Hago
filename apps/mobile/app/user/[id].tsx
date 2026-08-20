import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, SectionTitle, Txt } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { C, R, S } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';
import { rankArt } from '../../src/lib/rank';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile: me, showToast } = useStore();
  const [data, setData] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    const [u, f] = await Promise.all([api<any>(`/api/users/${id}`), api<any>('/api/social/friends')]);
    setData(u);
    setFriends(f.friends);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = data.profile;
  const rel = friends.find((f) => f.user.id === id);
  const isMe = me?.id === id;

  const report = async (reason: string) => {
    await api('/api/social/reports', { method: 'POST', body: { targetId: id, targetType: 'user', reason } });
    setReporting(false);
    showToast('Đã gửi báo cáo tới đội ngũ kiểm duyệt');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={['#DCF0FF', '#FFF6EE']} style={{ paddingTop: insets.top + S.md, paddingBottom: S.xl, alignItems: 'center', gap: 6 }}>
        <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', paddingHorizontal: S.lg }}>
          <Txt size={20} weight="heading" color={C.inkSoft}>
            ‹ Quay lại
          </Txt>
        </Pressable>
        <Avatar seed={p.avatarSeed} styleName={p.avatarStyle} frameId={p.frameId} size={88} online={p.online} />
        <Txt size={22} weight="display">
          {p.displayName}
        </Txt>
        <Txt size={12} color={C.inkSoft}>
          @{p.username} · tham gia {new Date(p.createdAt).toLocaleDateString('vi-VN')}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label={`Lv.${p.level}`} color="#9A6B00" soft={C.sunSoft} />
          <Chip label={`${p.rank} · ${p.rating}`} art={rankArt(p.rank)} color={C.secondaryDark} soft={C.secondarySoft} />
        </View>
        {p.bio ? (
          <Txt size={12} color={C.inkSoft} center style={{ maxWidth: 280 }}>
            "{p.bio}"
          </Txt>
        ) : null}
      </LinearGradient>

      {!isMe ? (
        <View style={{ flexDirection: 'row', gap: S.sm, padding: S.lg, flexWrap: 'wrap', justifyContent: 'center' }}>
          {rel?.status === 'accepted' ? (
            <>
              <Btn label="Nhắn tin" icon="chat" onPress={() => router.push(`/chat/${id}`)} />
              <Btn
                label="Mời chơi"
                icon="grid"
                tone="mint"
                onPress={async () => {
                  const res: any = await emitAck('room.invite', { userId: id });
                  showToast(res?.ok ? 'Đã gửi lời mời' : 'Bạn cần vào phòng trước', res?.ok ? 'ok' : 'warn');
                }}
              />
            </>
          ) : rel?.status === 'pending' ? (
            <Chip label="Đang chờ phản hồi" color={C.inkFaint} soft={C.surfaceAlt} />
          ) : (
            <Btn
              label="Kết bạn"
              icon="plus"
              tone="secondary"
              onPress={async () => {
                try {
                  await api(`/api/social/friends/${id}/request`, { method: 'POST' });
                  showToast('Đã gửi lời mời kết bạn');
                  load();
                } catch (e: any) {
                  showToast(friendlyError(e.code), 'warn');
                }
              }}
            />
          )}
          <Btn label="Báo cáo" icon="flag" tone="ghost" size="sm" onPress={() => setReporting((v) => !v)} />
        </View>
      ) : null}

      {reporting ? (
        <View style={{ paddingHorizontal: S.lg }}>
          <Card style={{ gap: S.sm }}>
            <Txt size={14} weight="heading">
              Lý do báo cáo
            </Txt>
            {['Ngôn từ xúc phạm', 'Gian lận / hack', 'Spam quảng cáo', 'Cố tình AFK phá trận'].map((r) => (
              <Pressable key={r} onPress={() => report(r)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }}>
                <Txt size={13} weight="medium" color={C.inkSoft}>
                  {r}
                </Txt>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ padding: S.lg, gap: S.md }}>
        <SectionTitle title="Chỉ số" icon="grid" />
        <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Stat label="Trận" value={p.matches} />
          <Stat label="Thắng" value={p.wins} color={C.mint} />
          <Stat label="Thua" value={p.losses} color={C.danger} />
          <Stat label="Tỉ lệ" value={`${p.matches ? Math.round((p.wins / p.matches) * 100) : 0}%`} color={C.secondary} />
        </Card>

        <SectionTitle title="Thành tựu đã mở" icon="medal" />
        <Card style={{ gap: S.sm }}>
          {data.achievements?.length ? (
            data.achievements.map((a: any) => (
              <View key={a.achievement.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Icon name="trophy" size={20} color={C.sun} strokeWidth={2} />
                <Txt size={13} weight="bold">
                  {a.achievement.title}
                </Txt>
              </View>
            ))
          ) : (
            <Empty icon="medal" title="Chưa mở thành tựu nào" />
          )}
        </Card>

        <SectionTitle title="Trận gần đây" icon="grid" />
        <Card style={{ gap: S.sm }}>
          {data.history?.length ? (
            data.history.map((m: any) => (
              <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={13} weight="medium">
                  {m.game_type}
                </Txt>
                <Txt size={12} weight="bold" color={m.rating_delta >= 0 ? C.mint : C.danger}>
                  {m.rating_delta > 0 ? '+' : ''}
                  {m.rating_delta}
                </Txt>
              </View>
            ))
          ) : (
            <Empty icon="star" title="Chưa có trận nào" />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color = C.ink }: { label: string; value: any; color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt size={19} weight="display" color={color}>
        {value}
      </Txt>
      <Txt size={11} color={C.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}
