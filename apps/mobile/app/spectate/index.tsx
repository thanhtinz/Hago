import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Card, Chip, Empty, Txt } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { C, GAME_GRADIENT, R, S, SEAT_COLORS } from '../../src/theme';
import { GAME_NAMES } from '../../src/games';
import { api } from '../../src/lib/api';

const REASON_LABEL: Record<string, string> = {
  friend: 'Bạn bè',
  guild: 'Cùng bang',
  admin: 'Quản trị',
};

export default function LiveListScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api<any>('/api/live');
      setMatches(r.matches);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Đang thi đấu" icon="eye" subtitle="Xem trực tiếp trận của bạn bè và người cùng bang" />
      <ScrollView
        contentContainerStyle={{ padding: S.lg, paddingBottom: 40, gap: S.md }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
      >
        {matches.length ? (
          matches.map((m) => <LiveRow key={m.matchId} match={m} onPress={() => router.push(`/spectate/${m.matchId}`)} />)
        ) : (
          <Empty
            icon="eye"
            title="Chưa có trận nào để xem"
            hint="Bạn xem được trận của bạn bè và người cùng bang. Kết bạn thêm để khán đài đông vui hơn."
          />
        )}
      </ScrollView>
    </View>
  );
}

function LiveRow({ match, onPress }: { match: any; onPress: () => void }) {
  const grad = (GAME_GRADIENT[match.gameType] ?? ['#FF8A65', '#FF5E7D']) as [string, string];
  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: S.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <View style={{ width: 42, height: 42, borderRadius: R.md, backgroundColor: grad[1] + '33', alignItems: 'center', justifyContent: 'center' }}>
            <GameIcon name={match.gameType as GameIconName} size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={15} weight="heading">
              {GAME_NAMES[match.gameType] ?? match.gameType}
            </Txt>
            <Txt size={11} color={C.inkSoft}>
              {match.mode === 'ranked' ? 'Xếp hạng' : match.mode === 'custom' ? 'Tự tạo' : 'Thường'} · đã đấu {elapsed(match.startedAt)}
            </Txt>
          </View>
          <Chip label={REASON_LABEL[match.reason] ?? match.reason} color={C.secondaryDark} soft={C.secondarySoft} size={10} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, flexWrap: 'wrap' }}>
          {match.players.map((p: any, i: number) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Avatar seed={p.avatarSeed} styleName={p.avatarStyle} size={26} ring={SEAT_COLORS[i]} />
              <Txt size={12} weight="bold" numberOfLines={1}>
                {p.name}
              </Txt>
              <Txt size={10} color={C.inkFaint}>
                Lv{p.level}
              </Txt>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surfaceAlt, paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill }}>
            <Icon name="eye" size={12} color={C.inkSoft} strokeWidth={2.2} />
            <Txt size={10} weight="bold" color={C.inkSoft}>
              {match.spectators} đang xem
            </Txt>
          </View>
          <View style={{ flex: 1 }} />
          <Txt size={12} weight="bold" color={C.primary}>
            Vào xem ›
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}

function elapsed(startedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
  if (mins < 1) return 'chưa tới 1 phút';
  if (mins < 60) return `${mins} phút`;
  return `${Math.floor(mins / 60)} giờ ${mins % 60} phút`;
}
