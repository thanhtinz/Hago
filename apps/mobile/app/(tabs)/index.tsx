import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Bar, Card, Empty, Txt } from '../../src/components/ui';
import { HotGameCard, GameMeta } from '../../src/components/GameCard';
import { Chibi } from '../../src/components/Chibi';
import { BannerCarousel, BannerItem } from '../../src/components/Banner';
import { Bubbles, DotPattern, Gloss } from '../../src/components/decor';
import { ACTION_GRADIENT, C, HERO_GRADIENT, R, S, softShadow } from '../../src/theme';
import { api } from '../../src/lib/api';
import { useStore } from '../../src/state/store';

interface HomeData {
  friendsOnline: any[];
  hotGames: { gameType: string; matches: number }[];
  livePlayers: Record<string, number>;
  events: any[];
  quests: any[];
  recent: any[];
  unread: number;
  balance: { coin: number; diamond: number };
  openRooms: any[];
}

const LEVEL_CURVE = (level: number) => Math.round(60 * (level - 1) + 12 * Math.pow(level - 1, 2));

const EVENT_COLORS: Record<string, [string, string]> = {
  login: ['#FF9A62', '#FF5E7D'],
  winstreak: ['#8A6BFF', '#5B44D6'],
  tournament: ['#3BB4FF', '#1E6FE0'],
  seasonal: ['#5FDBA7', '#22A97A'],
};
const EVENT_ART: Record<string, string> = {
  login: 'gift',
  winstreak: 'fire',
  tournament: 'trophy',
  seasonal: 'circus',
};

export default function HomeScreen() {
  const { profile, refresh, setUnread } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [games, setGames] = useState<GameMeta[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [home, cat] = await Promise.all([api<HomeData>('/api/home'), api<{ games: GameMeta[] }>('/api/games')]);
      setData(home);
      setGames(cat.games);
      setUnread(home.unread);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh, setUnread]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const xpInto = profile ? profile.xp - LEVEL_CURVE(profile.level) : 0;
  const xpNeed = profile ? LEVEL_CURVE(profile.level + 1) - LEVEL_CURVE(profile.level) : 1;
  const hotMap = new Map(data?.hotGames.map((h) => [h.gameType, h.matches]));
  const heat = (id: string) => (data?.livePlayers?.[id] ?? 0) * 10 + (hotMap.get(id) ?? 0);
  const hotOrder = [...games].sort((a, b) => heat(b.id) - heat(a.id));

  const banners: BannerItem[] = (data?.events ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    colors: EVENT_COLORS[e.kind] ?? ['#8A6BFF', '#FF6FA5'],
    art: EVENT_ART[e.kind] ?? 'gift',
    tag: `Còn ${Math.max(0, Math.ceil((e.endAt - Date.now()) / 86400000))} ngày`,
    onPress: () => router.push('/quests'),
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      {/* ---------------- Hero header ---------------- */}
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 12) + S.md,
          paddingHorizontal: S.lg,
          paddingBottom: 44,
          borderBottomLeftRadius: 34,
          borderBottomRightRadius: 34,
          overflow: 'hidden',
        }}
      >
        <DotPattern rows={4} cols={9} />
        <Bubbles spec={[{ size: 150, right: -50, top: -60, alpha: 0.14 }, { size: 90, left: -30, bottom: -34, alpha: 0.12 }]} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Pressable onPress={() => router.push('/profile')}>
            <Avatar
              seed={profile?.avatarSeed}
              styleName={profile?.avatarStyle}
              frameId={profile?.frameId}
              size={52}
              ring="rgba(255,255,255,0.5)"
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt size={17} weight="display" color="#fff" numberOfLines={1}>
              {profile?.displayName}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 3 }}>
              <HeroChip label={`Lv.${profile?.level}`} />
              <HeroChip label={`${profile?.rank} · ${profile?.rating}`} art="medal-1" />
            </View>
          </View>
          <Pressable onPress={() => router.push('/notifications')}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.22)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Chibi name="bell" size={21} />
              {data && data.unread > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    top: -2,
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 4,
                    borderRadius: 9,
                    backgroundColor: C.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#fff',
                  }}
                >
                  <Txt size={9} weight="bold" color="#fff">
                    {data.unread > 9 ? '9+' : data.unread}
                  </Txt>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View style={{ gap: 4, marginTop: S.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt size={10} weight="bold" color="rgba(255,255,255,0.85)">
              EXP tới Lv.{(profile?.level ?? 1) + 1}
            </Txt>
            <Txt size={10} weight="bold" color="rgba(255,255,255,0.85)">
              {xpInto}/{xpNeed}
            </Txt>
          </View>
          <Bar value={xpInto} max={xpNeed} color="#FFD36E" bg="rgba(255,255,255,0.28)" height={7} />
        </View>

        <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
          <Wallet art="coin" value={(profile?.coin ?? 0).toLocaleString('vi-VN')} />
          <Wallet art="gem" value={String(profile?.diamond ?? 0)} />
          <Pressable onPress={() => router.push('/shop')} style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                backgroundColor: '#fff',
                paddingVertical: 7,
                borderRadius: R.pill,
              }}
            >
              <Chibi name="shop" size={15} />
              <Txt size={12} weight="bold" color={C.primaryDark}>
                Cửa hàng
              </Txt>
            </View>
          </Pressable>
        </View>
      </LinearGradient>

      {/* ---------------- Banner sự kiện ---------------- */}
      <View style={{ marginTop: -28 }}>
        {banners.length ? (
          <BannerCarousel items={banners} />
        ) : (
          <View style={{ paddingHorizontal: S.lg }}>
            <Card>
              <Empty emoji="🎪" title="Chưa có sự kiện" />
            </Card>
          </View>
        )}
      </View>

      {/* ---------------- Hành động nhanh ---------------- */}
      <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, marginTop: S.lg }}>
        <ActionTile
          art="bolt"
          title="Chơi nhanh"
          sub="Tự ghép đối thủ"
          colors={ACTION_GRADIENT.quick}
          onPress={() => router.push('/quickplay')}
        />
        <ActionTile
          art="door"
          title="Tìm phòng"
          sub={`${data?.openRooms?.length ?? 0} phòng mở`}
          colors={ACTION_GRADIENT.find}
          onPress={() => router.push('/rooms?tab=find')}
        />
        <ActionTile
          art="key"
          title="Tạo phòng"
          sub="Rủ bạn bè"
          colors={ACTION_GRADIENT.create}
          onPress={() => router.push('/rooms?tab=create')}
        />
      </View>

      {/* ---------------- Bạn bè online ---------------- */}
      <View style={{ marginTop: S.xl }}>
        <Head
          title="Bạn bè đang online"
          art="handshake"
          actionLabel="Xem tất cả"
          onAction={() => router.push('/social')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
          <Pressable onPress={() => router.push('/social')} style={{ alignItems: 'center', width: 62, gap: 5 }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: C.line,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.surface,
              }}
            >
              <Txt size={22} weight="display" color={C.inkFaint}>
                +
              </Txt>
            </View>
            <Txt size={10} weight="medium" color={C.inkFaint} center>
              Kết bạn
            </Txt>
          </Pressable>
          {data?.friendsOnline.map((f) => (
            <Pressable key={f.id} onPress={() => router.push(`/user/${f.id}`)} style={{ alignItems: 'center', width: 62, gap: 5 }}>
              <View style={{ padding: 2, borderRadius: 30, borderWidth: 2, borderColor: C.mint }}>
                <Avatar seed={f.avatarSeed} styleName={f.avatarStyle} size={48} online />
              </View>
              <Txt size={10} weight="medium" numberOfLines={1} center>
                {f.displayName}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ---------------- Game đang hot ---------------- */}
      <View style={{ marginTop: S.xl }}>
        <Head title="Game đang hot" art="fire" actionLabel={`Tất cả ${games.length}`} onAction={() => router.push('/games')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg, paddingBottom: 6 }}
          snapToInterval={208 + S.md}
          decelerationRate="fast"
        >
          {hotOrder.map((g, i) => (
            <HotGameCard key={g.id} game={g} rank={i + 1} livePlayers={data?.livePlayers?.[g.id]} onPress={() => router.push(`/game/${g.id}`)} />
          ))}
        </ScrollView>
      </View>

      {/* ---------------- Nhiệm vụ ---------------- */}
      <View style={{ marginTop: S.xl }}>
        <Head title="Nhiệm vụ hôm nay" art="clipboard" actionLabel="Xem hết" onAction={() => router.push('/quests')} />
        <View style={{ paddingHorizontal: S.lg }}>
          <Card style={{ gap: S.md }}>
            {data?.quests.length ? (
              data.quests.map((q: any) => (
                <View key={q.quest.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Txt size={13} weight="bold">
                      {q.quest.title}
                    </Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {q.completed ? <Chibi name="gift" size={14} /> : null}
                      <Txt size={12} weight="bold" color={q.completed ? C.mint : C.inkFaint}>
                        {q.progress}/{q.quest.target}
                      </Txt>
                    </View>
                  </View>
                  <Bar value={q.progress} max={q.quest.target} color={q.completed ? C.mint : C.sun} height={8} />
                </View>
              ))
            ) : (
              <Empty emoji="🌱" title="Chưa có nhiệm vụ" />
            )}
          </Card>
        </View>
      </View>

      {/* ---------------- Trận gần đây ---------------- */}
      <View style={{ marginTop: S.xl }}>
        <Head title="Trận gần đây" art="joystick" />
        <View style={{ paddingHorizontal: S.lg }}>
          <Card style={{ gap: S.md }}>
            {data?.recent.length ? (
              data.recent.map((m: any) => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Chibi name={m.result === 'win' ? 'trophy' : m.result === 'draw' ? 'handshake' : 'droplet'} size={20} />
                    <View>
                      <Txt size={13} weight="bold">
                        {games.find((g) => g.id === m.game_type)?.name ?? m.game_type}
                      </Txt>
                      <Txt size={10} color={C.inkFaint}>
                        {new Date(m.ended_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </Txt>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {/* Trận thường không đổi điểm rank nên hiện kết quả thay vì "0 điểm". */}
                    <Txt
                      size={12}
                      weight="bold"
                      color={m.rating_delta > 0 ? C.mint : m.rating_delta < 0 ? C.danger : C.inkSoft}
                    >
                      {m.rating_delta !== 0
                        ? `${m.rating_delta > 0 ? '+' : ''}${m.rating_delta} điểm rank`
                        : m.result === 'win'
                          ? 'Thắng'
                          : m.result === 'draw'
                            ? 'Hoà'
                            : 'Thua'}
                    </Txt>
                    <Txt size={10} color={C.inkFaint}>
                      +{m.xp_gain} XP · +{m.coin_gain} coin
                    </Txt>
                  </View>
                </View>
              ))
            ) : (
              <Empty emoji="🎈" title="Chưa có trận nào" hint="Bấm nút vàng ở giữa thanh dưới để chơi ngay!" />
            )}
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

function HeroChip({ label, art }: { label: string; art?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.24)',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: R.pill,
      }}
    >
      {art ? <Chibi name={art} size={12} /> : null}
      <Txt size={11} weight="bold" color="#fff">
        {label}
      </Txt>
    </View>
  );
}

function Wallet({ art, value }: { art: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.18)',
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: R.pill,
      }}
    >
      <Chibi name={art} size={15} />
      <Txt size={12} weight="bold" color="#fff">
        {value}
      </Txt>
    </View>
  );
}

function ActionTile({
  art,
  title,
  sub,
  colors,
  onPress,
}: {
  art: string;
  title: string;
  sub: string;
  colors: [string, string];
  onPress: () => void;
}) {
  return (
    <Pressable style={{ flex: 1 }} onPress={onPress}>
      {({ pressed }) => (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: 20,
              paddingVertical: S.md,
              paddingHorizontal: 10,
              gap: 2,
              alignItems: 'center',
              overflow: 'hidden',
              transform: [{ translateY: pressed ? 2 : 0 }],
            },
            softShadow(0.14, 10, 5),
          ]}
        >
          <Gloss opacity={0.22} angle="top" />
          <Chibi name={art} size={26} />
          <Txt size={12} weight="bold" color="#fff" center numberOfLines={1}>
            {title}
          </Txt>
          <Txt size={9} weight="medium" color="rgba(255,255,255,0.9)" center numberOfLines={1}>
            {sub}
          </Txt>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function Head({
  title,
  art,
  actionLabel,
  onAction,
}: {
  title: string;
  art: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: S.lg,
        marginBottom: S.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Chibi name={art} size={19} />
        <Txt size={17} weight="heading">
          {title}
        </Txt>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt size={12} weight="bold" color={C.secondary}>
            {actionLabel} ›
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
