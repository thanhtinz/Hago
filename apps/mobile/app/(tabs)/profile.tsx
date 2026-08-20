import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Bar, Btn, Card, Chip, Empty, SectionTitle, Txt } from '../../src/components/ui';
import { C, R, S, softShadow } from '../../src/theme';
import { api } from '../../src/lib/api';
import { useStore } from '../../src/state/store';

const GAME_NAMES: Record<string, string> = {
  caro: 'Cờ Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep Battle',
  monopoly: 'Cờ Tỷ Phú',
  ludo: 'Cờ Cá Ngựa',
  werewolf: 'Ma Sói',
};
const LEVEL_CURVE = (level: number) => Math.round(60 * (level - 1) + 12 * Math.pow(level - 1, 2));

export default function ProfileScreen() {
  const { profile, logout, refresh } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const [a, h] = await Promise.all([
        api<any>('/api/achievements'),
        api<any>(`/api/users/${profile.id}/history?limit=10`),
      ]);
      setAchievements(a.achievements);
      setHistory(h.history);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [profile?.id, refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!profile) return null;
  const xpInto = profile.xp - LEVEL_CURVE(profile.level);
  const xpNeed = LEVEL_CURVE(profile.level + 1) - LEVEL_CURVE(profile.level);
  const winRate = profile.matches ? Math.round((profile.wins / profile.matches) * 100) : 0;
  const unlocked = achievements.filter((a) => a.unlockedAt);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      <LinearGradient colors={['#E9E5FF', '#FFF6EE']} style={{ paddingTop: insets.top + S.lg, paddingBottom: S.xl, alignItems: 'center', gap: S.sm }}>
        <Avatar seed={profile.avatarSeed} styleName={profile.avatarStyle} frameId={profile.frameId} size={96} />
        <Txt size={24} weight="display">
          {profile.displayName}
        </Txt>
        <Txt size={12} color={C.inkSoft}>
          @{profile.username}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <Chip label={`Lv.${profile.level}`} color="#9A6B00" soft={C.sunSoft} />
          <Chip label={`${profile.rank} · ${profile.rating}`} icon="🏅" color={C.secondaryDark} soft={C.secondarySoft} />
          {profile.isAdmin ? <Chip label="Admin" icon="🛡️" color={C.danger} soft="#FFE5E5" /> : null}
        </View>
        <View style={{ width: '80%', gap: 4, marginTop: 8 }}>
          <Bar value={xpInto} max={xpNeed} color={C.secondary} />
          <Txt size={11} color={C.inkSoft} center>
            {xpInto}/{xpNeed} XP tới Lv.{profile.level + 1}
          </Txt>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: S.lg, marginTop: -14, flexDirection: 'row', gap: S.md }}>
        <Stat label="Trận" value={profile.matches} emoji="🎮" />
        <Stat label="Thắng" value={profile.wins} emoji="🏆" tone={C.mint} />
        <Stat label="Tỉ lệ" value={`${winRate}%`} emoji="📈" tone={C.secondary} />
      </View>

      <View style={{ padding: S.lg, gap: S.md }}>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          <Btn label="Nhiệm vụ" icon="📋" tone="ghost" size="sm" onPress={() => router.push('/quests')} />
          <Btn label="BXH" icon="🏆" tone="ghost" size="sm" onPress={() => router.push('/leaderboard')} />
          <Btn label="Thông báo" icon="🔔" tone="ghost" size="sm" onPress={() => router.push('/notifications')} />
          <Btn label="Cài đặt" icon="⚙️" tone="ghost" size="sm" onPress={() => router.push('/settings')} />
        </View>
      </View>

      <View style={{ paddingHorizontal: S.lg, gap: S.md }}>
        <SectionTitle title="Thành tựu" emoji="🏅" action={<Txt size={12} weight="bold" color={C.inkFaint}>{unlocked.length}/{achievements.length}</Txt>} />
        <Card style={{ gap: S.md }}>
          {achievements.length ? (
            achievements.slice(0, 6).map((a) => (
              <View key={a.achievement.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, opacity: a.unlockedAt ? 1 : 0.55 }}>
                <View style={{ width: 42, height: 42, borderRadius: R.md, backgroundColor: a.unlockedAt ? C.sunSoft : C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{a.achievement.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt size={13} weight="bold">
                    {a.achievement.title}
                  </Txt>
                  <Bar value={a.progress} max={a.achievement.target} color={a.unlockedAt ? C.sun : C.inkFaint} height={6} />
                </View>
                <Txt size={11} weight="bold" color={C.inkFaint}>
                  {a.progress}/{a.achievement.target}
                </Txt>
              </View>
            ))
          ) : (
            <Empty emoji="🏅" title="Chưa có thành tựu" />
          )}
        </Card>
      </View>

      <View style={{ padding: S.lg, gap: S.md }}>
        <SectionTitle title="Thống kê theo game" emoji="📊" />
        <Card style={{ gap: S.md }}>
          {Object.values(profile.perGame).map((g: any) => (
            <View key={g.gameType} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={13} weight="bold">
                {GAME_NAMES[g.gameType] ?? g.gameType}
              </Txt>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Chip label={`${g.matches} trận`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
                <Chip label={`${g.wins} thắng`} color={C.mint} soft={C.mintSoft} size={10} />
                <Chip label={`${g.rating}`} icon="🏅" color={C.secondaryDark} soft={C.secondarySoft} size={10} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View style={{ paddingHorizontal: S.lg, gap: S.md }}>
        <SectionTitle title="Lịch sử trận" emoji="🕹️" />
        <Card style={{ gap: S.md }}>
          {history.length ? (
            history.map((m: any) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>{m.result === 'win' ? '🏆' : m.result === 'draw' ? '🤝' : '💧'}</Text>
                  <Txt size={13} weight="medium">
                    {GAME_NAMES[m.game_type] ?? m.game_type}
                  </Txt>
                  <Chip label={m.mode} color={C.inkFaint} soft={C.surfaceAlt} size={9} />
                </View>
                <Txt size={12} weight="bold" color={m.rating_delta >= 0 ? C.mint : C.danger}>
                  {m.rating_delta > 0 ? '+' : ''}
                  {m.rating_delta}
                </Txt>
              </View>
            ))
          ) : (
            <Empty emoji="🎈" title="Chưa có trận nào" />
          )}
        </Card>
      </View>

      <View style={{ padding: S.lg }}>
        <Btn label="Đăng xuất" icon="👋" tone="danger" full onPress={logout} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, emoji, tone = C.primary }: { label: string; value: number | string; emoji: string; tone?: string }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: S.md, alignItems: 'center', gap: 2, borderWidth: 2, borderColor: C.line }, softShadow(0.06, 10, 4)]}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Txt size={19} weight="display" color={tone}>
        {value}
      </Txt>
      <Txt size={11} weight="medium" color={C.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}
