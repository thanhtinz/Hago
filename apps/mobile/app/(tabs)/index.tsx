import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Bar, Btn, Card, Chip, CoinPill, Empty, SectionTitle, Txt } from '../../src/components/ui';
import { GameCard, GameMeta, HotGameCard } from '../../src/components/GameCard';
import { Chibi, ChibiBadge } from '../../src/components/Chibi';
import { C, R, S, softShadow } from '../../src/theme';
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
  // Ưu tiên game có người đang chơi, sau đó tới số trận trong 24 giờ.
  const heat = (id: string) => (data?.livePlayers?.[id] ?? 0) * 10 + (hotMap.get(id) ?? 0);
  const hotOrder = [...games].sort((a, b) => heat(b.id) - heat(a.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      {/* Header hồ sơ nhanh */}
      <LinearGradient
        colors={['#FFD9C6', '#FFF6EE']}
        style={{ paddingTop: insets.top + 12, paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Pressable onPress={() => router.push('/profile')}>
            <Avatar seed={profile?.avatarSeed} styleName={profile?.avatarStyle} frameId={profile?.frameId} size={54} online />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt size={18} weight="heading">
              Chào {profile?.displayName} 👋
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Chip label={`Lv.${profile?.level}`} color="#9A6B00" soft={C.sunSoft} />
              <Chip label={`${profile?.rank} · ${profile?.rating}`} icon="🏅" color={C.secondaryDark} soft={C.secondarySoft} />
            </View>
          </View>
          <Pressable onPress={() => router.push('/notifications')}>
            <View style={{ padding: 8, backgroundColor: C.surface, borderRadius: R.pill }}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              {data && data.unread > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: 2,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    borderRadius: 8,
                    backgroundColor: C.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
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

        <View style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt size={11} weight="bold" color={C.inkSoft}>
              EXP tới Lv.{(profile?.level ?? 1) + 1}
            </Txt>
            <Txt size={11} weight="bold" color={C.inkSoft}>
              {xpInto}/{xpNeed}
            </Txt>
          </View>
          <Bar value={xpInto} max={xpNeed} color={C.primary} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <CoinPill coin={profile?.coin ?? 0} diamond={profile?.diamond ?? 0} />
          <Pressable onPress={() => router.push('/shop')}>
            <Chip label="Nạp" icon="➕" color={C.mint} soft={C.mintSoft} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Quick play — one tap to play */}
      <View style={{ paddingHorizontal: S.lg, marginTop: -12 }}>
        <LinearGradient
          colors={['#FF8A65', '#FF5E7D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ borderRadius: R.xl, padding: S.xl, gap: 10, overflow: 'hidden' }, softShadow(0.18, 18, 8)]}
        >
          <View style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Txt size={13} weight="bold" color="rgba(255,255,255,0.9)">
            SẴN SÀNG CHƠI?
          </Txt>
          <Txt size={26} weight="display" color="#fff">
            Chơi nhanh 1 chạm
          </Txt>
          <Txt size={12} color="rgba(255,255,255,0.9)">
            Hệ thống tự ghép bạn với đối thủ cùng trình độ
          </Txt>
          <Btn label="Tìm trận ngay" icon="⚡" tone="sun" onPress={() => router.push('/quickplay')} style={{ marginTop: 6 }} />
        </LinearGradient>
      </View>

      {/* Bạn bè online */}
      <View style={{ padding: S.lg }}>
        <SectionTitle
          title="Bạn bè đang online"
          emoji="🟢"
          action={
            <Pressable onPress={() => router.push('/social')}>
              <Txt size={12} weight="bold" color={C.secondary}>
                Xem tất cả
              </Txt>
            </Pressable>
          }
        />
        {data?.friendsOnline.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md }}>
            {data.friendsOnline.map((f) => (
              <Pressable key={f.id} onPress={() => router.push(`/user/${f.id}`)} style={{ alignItems: 'center', width: 68, gap: 4 }}>
                <Avatar seed={f.avatarSeed} styleName={f.avatarStyle} size={52} online />
                <Txt size={11} weight="medium" numberOfLines={1} center>
                  {f.displayName}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Card>
            <Txt size={13} color={C.inkSoft}>
              Chưa có bạn nào online. Kết bạn để rủ nhau chơi nhé!
            </Txt>
          </Card>
        )}
      </View>

      {/* Game đang hot — xếp theo số trận 24h, kèm số người đang chơi */}
      <View style={{ paddingBottom: S.lg }}>
        <View style={{ paddingHorizontal: S.lg }}>
          <SectionTitle
            title="Game đang hot"
            emoji="🔥"
            action={
              <Pressable onPress={() => router.push('/games')}>
                <Txt size={12} weight="bold" color={C.secondary}>
                  Tất cả {games.length} game
                </Txt>
              </Pressable>
            }
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg, paddingBottom: 6 }}
          snapToInterval={208 + S.md}
          decelerationRate="fast"
        >
          {hotOrder.map((g, i) => (
            <HotGameCard
              key={g.id}
              game={g}
              rank={i + 1}
              livePlayers={data?.livePlayers?.[g.id]}
              onPress={() => router.push(`/game/${g.id}`)}
            />
          ))}
        </ScrollView>

        {/* Lối tắt tới phòng chơi */}
        <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, marginTop: S.md }}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/rooms?tab=find')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: S.md }}>
              <ChibiBadge name="door" size={40} bg={C.skySoft} />
              <View style={{ flex: 1 }}>
                <Txt size={13} weight="bold">
                  Tìm phòng
                </Txt>
                <Txt size={11} color={C.inkFaint}>
                  {data?.openRooms?.length ?? 0} phòng đang mở
                </Txt>
              </View>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/rooms?tab=create')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: S.md }}>
              <ChibiBadge name="key" size={40} bg={C.sunSoft} />
              <View style={{ flex: 1 }}>
                <Txt size={13} weight="bold">
                  Tạo phòng
                </Txt>
                <Txt size={11} color={C.inkFaint}>
                  Rủ bạn bè vào chơi
                </Txt>
              </View>
            </Card>
          </Pressable>
        </View>
      </View>

      {/* Nhiệm vụ */}
      <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
        <SectionTitle
          title="Nhiệm vụ hôm nay"
          emoji="📋"
          action={
            <Pressable onPress={() => router.push('/quests')}>
              <Txt size={12} weight="bold" color={C.secondary}>
                Xem hết
              </Txt>
            </Pressable>
          }
        />
        <Card style={{ gap: S.md }}>
          {data?.quests.length ? (
            data.quests.map((q: any) => (
              <View key={q.quest.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt size={13} weight="bold">
                    {q.quest.title}
                  </Txt>
                  <Txt size={12} weight="bold" color={q.completed ? C.mint : C.inkFaint}>
                    {q.progress}/{q.quest.target}
                  </Txt>
                </View>
                <Bar value={q.progress} max={q.quest.target} color={q.completed ? C.mint : C.sun} height={8} />
              </View>
            ))
          ) : (
            <Empty emoji="🌱" title="Chưa có nhiệm vụ" />
          )}
        </Card>
      </View>

      {/* Sự kiện */}
      {data?.events.length ? (
        <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
          <SectionTitle title="Sự kiện" emoji="🎪" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.lg }}>
            {data.events.map((e: any) => (
              <LinearGradient
                key={e.id}
                colors={[e.banner || C.secondary, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 230, borderRadius: R.lg, padding: S.lg, gap: 4 }}
              >
                <Txt size={15} weight="heading" color="#fff">
                  {e.title}
                </Txt>
                <Txt size={11} weight="medium" color="rgba(255,255,255,0.95)" numberOfLines={2}>
                  {e.description}
                </Txt>
                <View style={{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill }}>
                  <Txt size={10} weight="bold" color="#fff">
                    Còn {Math.max(0, Math.ceil((e.endAt - Date.now()) / 86400000))} ngày
                  </Txt>
                </View>
              </LinearGradient>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Trận gần đây */}
      <View style={{ paddingHorizontal: S.lg }}>
        <SectionTitle title="Trận gần đây" emoji="🕹️" />
        <Card style={{ gap: S.md }}>
          {data?.recent.length ? (
            data.recent.map((m: any) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{m.result === 'win' ? '🏆' : m.result === 'draw' ? '🤝' : '💧'}</Text>
                  <View>
                    <Txt size={13} weight="bold">
                      {m.game_type}
                    </Txt>
                    <Txt size={11} color={C.inkFaint}>
                      {new Date(m.ended_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </Txt>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt size={12} weight="bold" color={m.rating_delta >= 0 ? C.mint : C.danger}>
                    {m.rating_delta > 0 ? '+' : ''}
                    {m.rating_delta} điểm
                  </Txt>
                  <Txt size={11} color={C.inkFaint}>
                    +{m.xp_gain} XP · +{m.coin_gain} 🪙
                  </Txt>
                </View>
              </View>
            ))
          ) : (
            <Empty emoji="🎈" title="Chưa có trận nào" hint="Bấm Chơi nhanh để bắt đầu ván đầu tiên!" />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
