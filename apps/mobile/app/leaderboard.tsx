import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Chip, Empty, Txt } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon } from '../src/components/Icon';
import { GameIcon, GameIconName } from '../src/components/GameIcon';
import { C, R, S } from '../src/theme';
import { api } from '../src/lib/api';
import { useStore } from '../src/state/store';
import { Art } from '../src/components/Art';
import { placeArt, rankArt } from '../src/lib/rank';

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useStore();
  const [games, setGames] = useState<any[]>([]);
  const [gameType, setGameType] = useState('');
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    api<any>('/api/games').then((r) => setGames(r.games));
  }, []);

  const load = useCallback(async () => {
    const r = await api<any>(`/api/users/leaderboard${gameType ? `?gameType=${gameType}` : ''}`);
    setEntries(r.entries);
  }, [gameType]);

  useEffect(() => {
    load();
  }, [load]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Bảng xếp hạng" icon="trophy" subtitle="Top người chơi theo điểm rank" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 54 }} contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, alignItems: 'center' }}>
        {[{ id: '', name: 'Tổng' }, ...games].map((g: any) => (
          <Pressable
            key={g.id}
            onPress={() => setGameType(g.id)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 7,
              borderRadius: R.pill,
              backgroundColor: gameType === g.id ? C.sun : C.surface,
              borderWidth: 2,
              borderColor: gameType === g.id ? C.sun : C.line,
              flexDirection: 'row',
              gap: 5,
            }}
          >
            {g.id ? (
              <GameIcon name={g.id as GameIconName} size={17} accent={gameType === g.id ? '#5A4200' : C.inkFaint} tint={gameType === g.id ? '#B8892B' : C.inkFaint} />
            ) : (
              <Icon name="grid" size={15} color={gameType === g.id ? '#5A4200' : C.inkSoft} strokeWidth={2.2} />
            )}
            <Txt size={12} weight="bold" color={gameType === g.id ? '#5A4200' : C.inkSoft}>
              {g.name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 40 }}>
        {podium.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: S.sm }}>
            {[1, 0, 2].map((i) => {
              const e = podium[i];
              if (!e) return <View key={i} style={{ width: 96 }} />;
              const heights = [104, 78, 62];
                        return (
                <Pressable key={e.user.id} onPress={() => router.push(`/user/${e.user.id}`)} style={{ alignItems: 'center', gap: 4, width: 100 }}>
                  <Art name={placeArt(i + 1)} size={30} color={i === 0 ? '#E0A100' : i === 1 ? '#9AA6B4' : '#B4784B'} shadow />
                  <View style={{ height: 66, justifyContent: 'flex-end' }}>
                    <Avatar seed={e.user.avatarSeed} styleName={e.user.avatarStyle} frameId={e.user.frameId} size={i === 0 ? 60 : 48} />
                  </View>
                  <Txt size={12} weight="bold" numberOfLines={1} center>
                    {e.user.displayName}
                  </Txt>
                  <View style={{ backgroundColor: i === 0 ? C.sun : i === 1 ? '#D6DDE6' : '#E8C39E', width: '100%', height: heights[i], borderTopLeftRadius: R.md, borderTopRightRadius: R.md, alignItems: 'center', paddingTop: 8 }}>
                    <Txt size={16} weight="display" color="#5A4200">
                      {e.user.rating}
                    </Txt>
                    <Txt size={10} weight="bold" color="rgba(0,0,0,0.45)">
                      {e.wins} thắng
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Empty icon="trend" title="Chưa có dữ liệu" />
        )}

        {rest.map((e) => (
          <Pressable key={e.user.id} onPress={() => router.push(`/user/${e.user.id}`)}>
            <Card
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: S.md,
                borderColor: e.user.id === profile?.id ? C.primary : C.line,
                backgroundColor: e.user.id === profile?.id ? C.primarySoft : C.surface,
              }}
            >
              <Txt size={15} weight="display" color={C.inkFaint} style={{ width: 28 }}>
                {e.rank}
              </Txt>
              <Avatar seed={e.user.avatarSeed} styleName={e.user.avatarStyle} frameId={e.user.frameId} size={40} online={e.user.online} />
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold">
                  {e.user.displayName}
                </Txt>
                <Txt size={11} color={C.inkFaint}>
                  Lv.{e.user.level} · {e.wins}/{e.matches} thắng
                </Txt>
              </View>
              <Chip label={String(e.user.rating)} art={rankArt(e.user.rank)} color={C.secondaryDark} soft={C.secondarySoft} size={11} />
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
