import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Bar, Card, Chip, Empty, SectionTitle, Txt } from '../../src/components/ui';
import { Icon, IconName } from '../../src/components/Icon';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { Bubbles, DotPattern } from '../../src/components/decor';
import { C, HERO_GRADIENT, R, S, softShadow } from '../../src/theme';
import { PlayerTitle, useBackgroundColors } from '../../src/components/Cosmetic';
import { MenuButton, MenuItem, MenuSheet } from '../../src/components/MenuSheet';
import { api } from '../../src/lib/api';
import { useStore } from '../../src/state/store';
import { rankArt } from '../../src/lib/rank';

const GAME_NAMES: Record<string, string> = {
  caro: 'Cờ Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep Battle',
  chess: 'Cờ Vua',
  flappy: 'Flappy Bird',
  werewolf: 'Ma Sói',
};
const LEVEL_CURVE = (level: number) => Math.round(60 * (level - 1) + 12 * Math.pow(level - 1, 2));

/** Mọi lối đi khác từ hồ sơ, gom vào menu ba vạch thay vì rải nút ra trang. */
const MENU: MenuItem[] = [
  { label: 'Túi đồ', icon: 'gift', route: '/inventory' },
  { label: 'Nhiệm vụ', icon: 'list', route: '/quests' },
  { label: 'Sự kiện', icon: 'gift', route: '/events' },
  { label: 'Đang thi đấu', icon: 'eye', route: '/spectate' },
  { label: 'Giải đấu', icon: 'trophy', route: '/tournaments' },
  { label: 'Bang hội', icon: 'shield', route: '/guild' },
  { label: 'Bảng xếp hạng', icon: 'trend', route: '/leaderboard' },
  { label: 'Thông báo', icon: 'bell', route: '/notifications' },
  { label: 'Cài đặt', icon: 'settings', route: '/settings' },
];

export default function ProfileScreen() {
  const { profile, logout, refresh, unread } = useStore();
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  /** Tình trạng định hạng mùa này — chưa đủ trận thì chưa có rank chính thức. */
  const [rank, setRank] = useState<any>(null);
  // Nền hồ sơ theo cosmetic đang dùng, không có thì về gradient mặc định.
  const bgColors = useBackgroundColors(profile?.backgroundId);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const [a, h, r] = await Promise.all([
        api<any>('/api/achievements'),
        api<any>(`/api/users/${profile.id}/history?limit=10`),
        api<any>('/api/users/me/rank'),
      ]);
      setAchievements(a.achievements);
      setHistory(h.history);
      setRank(r);
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
  const heroColors = (bgColors ?? HERO_GRADIENT) as [string, string];
  const xpInto = profile.xp - LEVEL_CURVE(profile.level);
  const xpNeed = LEVEL_CURVE(profile.level + 1) - LEVEL_CURVE(profile.level);
  const winRate = profile.matches ? Math.round((profile.wins / profile.matches) * 100) : 0;
  const unlocked = achievements.filter((a) => a.unlockedAt);

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      <LinearGradient
        colors={heroColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 12) + S.lg,
          paddingBottom: S.xxl,
          alignItems: 'center',
          gap: S.sm,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
        }}
      >
        <DotPattern rows={4} cols={9} />
        <View style={{ position: 'absolute', right: S.lg, top: Math.max(insets.top, 12) + 6 }}>
          <MenuButton onPress={() => setMenu(true)} badge={unread} />
        </View>
        <Bubbles spec={[{ size: 150, right: -50, top: -60, alpha: 0.14 }, { size: 90, left: -34, bottom: -30, alpha: 0.12 }]} />
        <Avatar seed={profile.avatarSeed} styleName={profile.avatarStyle} frameId={profile.frameId} size={96} ring="rgba(255,255,255,0.45)" />
        <Txt size={24} weight="display" color="#fff">
          {profile.displayName}
        </Txt>
        <Txt size={12} color="rgba(255,255,255,0.88)">
          @{profile.username}
        </Txt>
        <PlayerTitle titleId={profile.titleId} size={12} center />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <Chip label={`Lv.${profile.level}`} color="#fff" soft="rgba(255,255,255,0.24)" />
          {/* Chưa đá đủ trận định hạng thì chưa gọi tên rank, chỉ đếm tiến độ */}
          {rank?.status && !rank.status.placed ? (
            <Chip
              label={`Định hạng ${rank.status.played}/${rank.status.placement}`}
              icon="target"
              color="#fff"
              soft="rgba(255,255,255,0.24)"
            />
          ) : (
            <Chip label={`${profile.rank} · ${profile.rating}`} art={rankArt(profile.rank)} color="#fff" soft="rgba(255,255,255,0.24)" />
          )}
          {profile.isAdmin ? <Chip label="Admin" icon="shield" color="#fff" soft="rgba(255,255,255,0.24)" /> : null}
        </View>
        <View style={{ width: '80%', gap: 4, marginTop: 8 }}>
          <Bar value={xpInto} max={xpNeed} color="#FFD36E" bg="rgba(255,255,255,0.28)" />
          <Txt size={11} color="rgba(255,255,255,0.9)" center>
            {xpInto}/{xpNeed} XP tới Lv.{profile.level + 1}
          </Txt>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: S.lg, marginTop: -22, flexDirection: 'row', gap: S.md }}>
        <Stat label="Trận" value={profile.matches} icon="dice" />
        <Stat label="Thắng" value={profile.wins} icon="trophy" tone={C.mint} />
        <Stat label="Tỉ lệ" value={`${winRate}%`} icon="trend" tone={C.secondary} />
      </View>

      <View style={{ paddingHorizontal: S.lg, paddingTop: S.lg, gap: S.md }}>
        <SectionTitle title="Thành tựu" icon="medal" action={<Txt size={12} weight="bold" color={C.inkFaint}>{unlocked.length}/{achievements.length}</Txt>} />
        <Card style={{ gap: S.md }}>
          {achievements.length ? (
            achievements.slice(0, 6).map((a) => (
              <View key={a.achievement.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, opacity: a.unlockedAt ? 1 : 0.55 }}>
                <View style={{ width: 42, height: 42, borderRadius: R.md, backgroundColor: a.unlockedAt ? C.sunSoft : C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={(a.achievement.art ?? 'trophy') as IconName} size={20} color={a.unlockedAt ? C.sun : C.inkFaint} strokeWidth={2} />
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
            <Empty icon="trophy" title="Chưa có thành tựu" />
          )}
        </Card>
      </View>

      <View style={{ padding: S.lg, gap: S.md }}>
        <SectionTitle title="Thống kê theo game" icon="grid" />
        <Card style={{ gap: S.md }}>
          {Object.values(profile.perGame).map((g: any) => (
            <View key={g.gameType} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={13} weight="bold">
                {GAME_NAMES[g.gameType] ?? g.gameType}
              </Txt>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Chip label={`${g.matches} trận`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
                <Chip label={`${g.wins} thắng`} color={C.mint} soft={C.mintSoft} size={10} />
                <Chip label={`${g.rating}`} icon="medal" color={C.secondaryDark} soft={C.secondarySoft} size={10} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View style={{ paddingHorizontal: S.lg, gap: S.md }}>
        <SectionTitle title="Lịch sử trận" icon="grid" />
        <Card style={{ gap: S.md }}>
          {history.length ? (
            history.map((m: any) => (
              // Trận còn khung phát lại thì bấm vào là mở màn xem lại.
              <Pressable
                key={m.id}
                disabled={!m.hasReplay}
                onPress={() => router.push(`/replay/${m.id}`)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Icon
                    name={m.result === 'win' ? 'trophy' : m.result === 'draw' ? 'handshake' : 'flag'}
                    size={17}
                    color={m.result === 'win' ? C.sun : m.result === 'draw' ? C.inkFaint : C.sky}
                    strokeWidth={2.1}
                  />
                  <Txt size={13} weight="medium">
                    {GAME_NAMES[m.game_type] ?? m.game_type}
                  </Txt>
                  <Chip label={m.mode} color={C.inkFaint} soft={C.surfaceAlt} size={9} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt size={12} weight="bold" color={m.rating_delta >= 0 ? C.mint : C.danger}>
                    {m.rating_delta > 0 ? '+' : ''}
                    {m.rating_delta}
                  </Txt>
                  {m.hasReplay ? <Icon name="play" size={13} color={C.primary} /> : null}
                </View>
              </Pressable>
            ))
          ) : (
            <Empty icon="grid" title="Chưa có trận nào" />
          )}
        </Card>
      </View>

    </ScrollView>

      <MenuSheet
        visible={menu}
        items={MENU}
        onClose={() => setMenu(false)}
        onPick={(route) => {
          // Đóng trước rồi mới đi, không thì menu còn nằm đè lên màn mới.
          setMenu(false);
          router.push(route as any);
        }}
        onLogout={() => {
          setMenu(false);
          logout();
        }}
      />
    </>
  );
}

function Stat({ label, value, icon, tone = C.primary }: { label: string; value: number | string; icon: IconName; tone?: string }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: S.md, alignItems: 'center', gap: 3, borderWidth: 2, borderColor: C.line }, softShadow(0.06, 10, 4)]}>
      <Icon name={icon} size={21} color={tone} strokeWidth={2.1} />
      <Txt size={19} weight="display" color={tone}>
        {value}
      </Txt>
      <Txt size={11} weight="medium" color={C.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}
