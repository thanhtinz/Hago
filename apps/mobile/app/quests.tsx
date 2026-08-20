import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, Btn, Card, Chip, CoinPill, Empty, SectionTitle, Txt } from '../src/components/ui';
import { C, R, S } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

export default function QuestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast, refresh } = useStore();
  const [quests, setQuests] = useState<any[]>([]);
  const [balance, setBalance] = useState({ coin: 0, diamond: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api<any>('/api/quests');
      setQuests(r.quests);
      setBalance(r.balance);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const claim = async (id: string) => {
    try {
      const r = await api<any>(`/api/quests/${id}/claim`, { method: 'POST' });
      showToast(`Nhận thưởng: +${r.reward.coin}🪙 +${r.reward.xp} XP${r.reward.diamond ? ` +${r.reward.diamond}💎` : ''}`);
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      showToast(friendlyError(e.code), 'warn');
    }
  };

  const daily = quests.filter((q) => q.quest.type === 'daily');
  const weekly = quests.filter((q) => q.quest.type === 'weekly');

  const renderQuest = (q: any) => (
    <Card key={q.quest.id} style={{ gap: S.sm, borderColor: q.completed && !q.claimed ? C.mint : C.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="heading">
            {q.quest.title}
          </Txt>
          <Txt size={12} color={C.inkSoft}>
            {q.quest.description}
          </Txt>
        </View>
        {q.claimed ? (
          <Chip label="Đã nhận" icon="✅" color={C.mint} soft={C.mintSoft} size={10} />
        ) : q.completed ? (
          <Btn label="Nhận" size="sm" tone="mint" onPress={() => claim(q.quest.id)} />
        ) : null}
      </View>
      <Bar value={q.progress} max={q.quest.target} color={q.completed ? C.mint : C.sun} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {q.quest.rewardCoin ? <Chip label={`+${q.quest.rewardCoin}`} icon="🪙" color="#9A6B00" soft={C.sunSoft} size={10} /> : null}
          {q.quest.rewardXp ? <Chip label={`+${q.quest.rewardXp} XP`} color={C.secondaryDark} soft={C.secondarySoft} size={10} /> : null}
          {q.quest.rewardDiamond ? <Chip label={`+${q.quest.rewardDiamond}`} icon="💎" color="#1A73B8" soft={C.skySoft} size={10} /> : null}
        </View>
        <Txt size={12} weight="bold" color={C.inkFaint}>
          {q.progress}/{q.quest.target}
        </Txt>
      </View>
    </Card>
  );

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
            Nhiệm vụ 📋
          </Txt>
        </View>
        <CoinPill coin={balance.coin} diamond={balance.diamond} />
      </View>

      <SectionTitle title="Hằng ngày" emoji="🌅" />
      {daily.length ? daily.map(renderQuest) : <Empty emoji="🌱" title="Chưa có nhiệm vụ ngày" />}

      <SectionTitle title="Hằng tuần" emoji="🗓️" />
      {weekly.length ? weekly.map(renderQuest) : <Empty emoji="🗓️" title="Chưa có nhiệm vụ tuần" />}
    </ScrollView>
  );
}
