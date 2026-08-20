import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, Txt } from '../../src/components/ui';
import { GameCard, GameMeta } from '../../src/components/GameCard';
import { Icon, IconName } from '../../src/components/Icon';
import { Bubbles, DotPattern, Gloss } from '../../src/components/decor';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { Art, ArtName } from '../../src/components/Art';
import { ArtToken } from '../../src/components/ArtToken';
import { ACTION_GRADIENT, C, GAME_GRADIENT, HERO_GRADIENT, R, S, glowShadow, softShadow } from '../../src/theme';
import { api, friendlyError } from '../../src/lib/api';
import { emitAck } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

/** Bộ lọc nhanh theo kiểu chơi, giống hàng danh mục của các app game casual. */
const FILTERS: { id: string; label: string; icon: IconName; match: (g: GameMeta) => boolean }[] = [
  { id: 'all', label: 'Tất cả', icon: 'grid', match: () => true },
  { id: 'duo', label: '2 người', icon: 'users', match: (g) => g.maxPlayers === 2 },
  { id: 'party', label: 'Nhiều người', icon: 'crown', match: (g) => g.maxPlayers > 2 },
  { id: 'quick', label: 'Ván nhanh', icon: 'bolt', match: (g) => g.avgMinutes <= 5 },
];

export default function GamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const [games, setGames] = useState<GameMeta[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [cat, rs] = await Promise.all([
        api<{ games: GameMeta[] }>('/api/games'),
        api<{ rooms: any[] }>('/api/rooms'),
      ]);
      setGames(cat.games);
      setRooms(rs.rooms);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
    return games.filter(f.match);
  }, [games, filter]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
    >
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 12) + S.md,
          paddingHorizontal: S.lg,
          paddingBottom: 40,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          overflow: 'hidden',
        }}
      >
        <DotPattern rows={3} cols={9} />
        <Bubbles spec={[{ size: 130, right: -40, top: -50, alpha: 0.14 }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="grid" size={26} color="#fff" strokeWidth={2.1} />
          <Txt size={26} weight="display" color="#fff">
            Kho game
          </Txt>
        </View>
        <Txt size={12} weight="medium" color="rgba(255,255,255,0.9)">
          {games.length} mini game — chọn là chơi, không cần tải thêm
        </Txt>
      </LinearGradient>

      {/* Hai lối vào phòng, nổi lên trên mép header */}
      <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, marginTop: -26 }}>
        <RoomShortcut
          art="ui-find"
          title="Tìm phòng"
          sub={`${rooms.length} phòng đang mở`}
          colors={ACTION_GRADIENT.find}
          onPress={() => router.push('/rooms?tab=find')}
        />
        <RoomShortcut
          art="ui-create"
          title="Tạo phòng"
          sub="Tuỳ chỉnh luật chơi"
          colors={ACTION_GRADIENT.create}
          onPress={() => router.push('/rooms?tab=create')}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 52, marginTop: S.lg }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: S.lg, alignItems: 'center' }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: R.pill,
                backgroundColor: active ? C.ink : C.surface,
                borderWidth: 2,
                borderColor: active ? C.ink : C.line,
              }}
            >
              <Icon name={f.icon} size={15} color={active ? '#fff' : C.inkSoft} strokeWidth={2.2} />
              <Txt size={12} weight="bold" color={active ? '#fff' : C.inkSoft}>
                {f.label}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: S.lg, marginTop: S.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'space-between' }}>
          {shown.map((g) => (
            <View key={g.id} style={{ width: '48%' }}>
              <GameCard game={g} onPress={() => router.push(`/game/${g.id}`)} />
            </View>
          ))}
        </View>
        {!shown.length ? (
          <Card>
            <Empty icon="grid" title="Không có game nào khớp bộ lọc" />
          </Card>
        ) : null}
      </View>

      <View style={{ marginTop: S.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, marginBottom: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="door" size={19} color={C.primary} strokeWidth={2.2} />
            <Txt size={17} weight="heading">
              Phòng đang mở
            </Txt>
          </View>
          {rooms.length ? (
            <Pressable onPress={() => router.push('/rooms?tab=find')} hitSlop={8}>
              <Txt size={12} weight="bold" color={C.secondary}>
                Xem tất cả ›
              </Txt>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: S.lg, gap: S.md }}>
          {rooms.length ? (
            rooms.slice(0, 4).map((r) => {
              const g = games.find((x) => x.id === r.gameType);
              const grad = (GAME_GRADIENT[r.gameType] ?? ['#eee', '#ddd']) as [string, string];
              return (
                <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md }}>
                  <LinearGradient
                    colors={grad}
                    style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                  >
                    <Gloss opacity={0.14} angle="top" />
                    <Art name={`game-${r.gameType}` as ArtName} size={32} color="#fff" shadow />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {g?.name ?? r.gameType}
                    </Txt>
                    <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
                      <Chip label={`#${r.code}`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
                      <Chip label={`${r.players.length}/${r.maxPlayers}`} icon="users" color={C.mint} soft={C.mintSoft} size={10} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    {r.players.slice(0, 3).map((p: any, i: number) => (
                      <View key={p.user.id} style={{ marginLeft: i === 0 ? 0 : -9 }}>
                        <Avatar seed={p.user.avatarSeed} styleName={p.user.avatarStyle} size={28} ring={C.surface} />
                      </View>
                    ))}
                  </View>
                  <Btn
                    label="Vào"
                    size="sm"
                    onPress={async () => {
                      if (r.hasPassword) return router.push('/rooms?tab=find');
                      const res: any = await emitAck('room.join', { roomId: r.id });
                      if (res?.ok) router.push(`/room/${res.room.id}`);
                      else showToast(friendlyError(res?.error ?? 'ROOM_NOT_FOUND'), 'warn');
                    }}
                  />
                </Card>
              );
            })
          ) : (
            <Card>
              <Empty icon="grid" title="Chưa có phòng công khai" hint="Tạo phòng để rủ bạn bè cùng chơi nhé!" />
            </Card>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function RoomShortcut({
  art,
  title,
  sub,
  colors,
  onPress,
}: {
  art: ArtName;
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
            { borderRadius: 22, padding: S.lg, gap: 3, overflow: 'hidden', transform: [{ translateY: pressed ? 2 : 0 }] },
            glowShadow(colors[1], 0.32, 14, 7),
          ]}
        >
          <Gloss opacity={0.16} angle="top" />
          <Bubbles spec={[{ size: 76, right: -22, bottom: -26, alpha: 0.18 }]} />
          <ArtToken name={art} size={44} art={26} shadow={0.16} glyph style={{ marginBottom: 4 }} />
          <Txt size={15} weight="heading" color="#fff">
            {title}
          </Txt>
          <Txt size={11} weight="medium" color="rgba(255,255,255,0.92)" numberOfLines={1}>
            {sub}
          </Txt>
        </LinearGradient>
      )}
    </Pressable>
  );
}
