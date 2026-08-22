import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bar, Btn, Card, Chip, CoinPill, Empty, SectionTitle, Txt } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { C, R, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

const KIND_LABEL: Record<string, string> = {
  login: 'Điểm danh',
  winstreak: 'Chuỗi thắng',
  seasonal: 'Theo mùa',
  tournament: 'Giải đấu',
};

export default function EventsScreen() {
  const { showToast, refresh } = useStore();
  const [events, setEvents] = useState<any[]>([]);
  const [checkin, setCheckin] = useState<any>(null);
  const [balance, setBalance] = useState({ coin: 0, diamond: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api<any>('/api/events');
      setEvents(r.events);
      setCheckin(r.checkin);
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

  const doCheckin = async () => {
    try {
      const r = await api<any>('/api/checkin', { method: 'POST' });
      showToast(
        `Điểm danh ngày ${r.streak}: +${r.reward.coin} Coin, +${r.reward.xp} XP${r.reward.diamond ? `, +${r.reward.diamond} Diamond` : ''}`,
      );
      setCheckin(r.checkin);
      setBalance(r.balance);
      // Nhiệm vụ "điểm danh N ngày" của sự kiện vừa nhích tiến độ.
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      showToast(friendlyError(e.code), 'warn');
    }
  };

  const claim = async (id: string) => {
    try {
      const r = await api<any>(`/api/quests/${id}/claim`, { method: 'POST' });
      showToast(`Nhận thưởng: +${r.reward.coin} Coin, +${r.reward.xp} XP${r.reward.diamond ? `, +${r.reward.diamond} Diamond` : ''}`);
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      showToast(friendlyError(e.code), 'warn');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Sự kiện" icon="gift" subtitle="Điểm danh mỗi ngày và làm nhiệm vụ sự kiện" />
      <ScrollView
        contentContainerStyle={{ padding: S.lg, paddingBottom: 40, gap: S.md }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
      >
        <View style={{ alignSelf: 'flex-end' }}>
          <CoinPill coin={balance.coin} diamond={balance.diamond} />
        </View>

        {checkin ? <CheckinCard checkin={checkin} onCheckin={doCheckin} /> : null}

        <SectionTitle title="Đang diễn ra" icon="flame" />
        {events.length ? (
          events.map((e) => <EventCard key={e.id} event={e} onClaim={claim} />)
        ) : (
          <Empty icon="gift" title="Chưa có sự kiện nào" hint="Sự kiện mới sẽ hiện ở đây, nhớ ghé lại nhé" />
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Bảng điểm danh: 7 mốc của vòng hiện tại. Mốc đã qua tô đậm, mốc hôm nay bật
 * lên, mốc sau để mờ — nhìn một cái là biết bỏ một ngày thì mất gì.
 */
function CheckinCard({ checkin, onCheckin }: { checkin: any; onCheckin: () => void }) {
  const cycleDone = checkin.claimedToday ? checkin.nextSlot : checkin.nextSlot - 1;
  return (
    <Card style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="heading">
            Điểm danh hằng ngày
          </Txt>
          <Txt size={12} color={C.inkSoft}>
            {checkin.streak > 0
              ? `Chuỗi ${checkin.streak} ngày · dài nhất ${checkin.bestStreak} ngày`
              : 'Điểm danh hôm nay để bắt đầu chuỗi mới'}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.sunSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill }}>
          <Icon name="flame" size={14} color="#9A6B00" strokeWidth={2.2} />
          <Txt size={13} weight="display" color="#9A6B00">
            {checkin.streak}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 5 }}>
        {checkin.rewards.map((r: any) => {
          const done = r.slot <= cycleDone;
          const isToday = !checkin.claimedToday && r.slot === checkin.nextSlot;
          return (
            <View
              key={r.slot}
              style={[
                {
                  flex: 1,
                  alignItems: 'center',
                  gap: 3,
                  paddingVertical: 8,
                  paddingTop: 14,
                  borderRadius: R.sm,
                  backgroundColor: done ? C.mintSoft : isToday ? C.sunSoft : C.surfaceAlt,
                  borderWidth: 2,
                  borderColor: isToday ? C.sun : 'transparent',
                  opacity: done || isToday ? 1 : 0.6,
                },
                isToday ? softShadow(0.14, 10, 4) : null,
              ]}
            >
              <Txt size={10} weight="bold" color={done ? '#1F7A50' : isToday ? '#9A6B00' : C.inkFaint}>
                N{r.slot}
              </Txt>
              {done ? (
                <Icon name="check" size={14} color="#1F7A50" strokeWidth={2.6} />
              ) : (
                <Icon name="coin" size={14} color="#9A6B00" strokeWidth={2.2} />
              )}
              {/* Luôn hiện số Coin: mốc có Diamond mà chỉ hiện Diamond thì mốc 3
                  ("1") trông như kém mốc 2 ("150"). Diamond gắn thêm ở góc. */}
              <Txt size={9} weight="bold" color={C.inkSoft}>
                {r.coin}
              </Txt>
              {r.diamond ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Icon name="gem" size={9} color="#1A73B8" strokeWidth={2.4} />
                  <Txt size={8} weight="bold" color="#1A73B8">
                    {r.diamond}
                  </Txt>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {checkin.claimedToday ? (
        <Chip label="Hôm nay đã điểm danh — mai quay lại nhé" icon="check" color={C.mint} soft={C.mintSoft} size={11} />
      ) : (
        <Btn label="Điểm danh hôm nay" icon="gift" tone="mint" full onPress={onCheckin} />
      )}
    </Card>
  );
}

function EventCard({ event, onClaim }: { event: any; onClaim: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const tint = /^#/.test(event.banner) ? event.banner : C.secondary;
  const left = event.endAt - Date.now();
  const done = event.quests.filter((q: any) => q.claimed).length;

  return (
    <Card padded={false} style={{ gap: S.sm, overflow: 'hidden' }}>
      <LinearGradient colors={[tint, tint + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: S.md, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={17} weight="display" color="#fff" style={{ flex: 1 }}>
            {event.title}
          </Txt>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill }}>
            <Txt size={10} weight="bold" color="#fff">
              {KIND_LABEL[event.kind] ?? event.kind}
            </Txt>
          </View>
        </View>
        <Txt size={12} color="rgba(255,255,255,0.92)">
          {event.description}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Icon name="clock" size={12} color="rgba(255,255,255,0.92)" strokeWidth={2.2} />
          <Txt size={11} weight="bold" color="rgba(255,255,255,0.92)">
            {remaining(left)}
          </Txt>
          {event.quests.length ? (
            <Txt size={11} weight="bold" color="rgba(255,255,255,0.92)">
              · {done}/{event.quests.length} nhiệm vụ
            </Txt>
          ) : null}
        </View>
      </LinearGradient>

      {event.quests.length ? (
        <View style={{ padding: S.md, paddingTop: 0, gap: S.sm }}>
          <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: S.sm }}>
            <Txt size={12} weight="bold" color={C.inkSoft}>
              Nhiệm vụ sự kiện
            </Txt>
            <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} color={C.inkSoft} />
          </Pressable>
          {open
            ? event.quests.map((q: any) => (
                <View key={q.quest.id} style={{ gap: 6, backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: S.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.sm }}>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} weight="heading">
                        {q.quest.title}
                      </Txt>
                      <Txt size={11} color={C.inkSoft}>
                        {q.quest.description}
                      </Txt>
                    </View>
                    {q.claimed ? (
                      <Chip label="Đã nhận" icon="check" color={C.mint} soft={C.mintSoft} size={10} />
                    ) : q.completed ? (
                      <Btn label="Nhận" size="sm" tone="mint" onPress={() => onClaim(q.quest.id)} />
                    ) : null}
                  </View>
                  <Bar value={q.progress} max={q.quest.target} color={q.completed ? C.mint : tint} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {q.quest.rewardCoin ? <Chip label={`+${q.quest.rewardCoin}`} icon="coin" color="#9A6B00" soft={C.sunSoft} size={10} /> : null}
                      {q.quest.rewardXp ? <Chip label={`+${q.quest.rewardXp} XP`} color={C.secondaryDark} soft={C.secondarySoft} size={10} /> : null}
                      {q.quest.rewardDiamond ? <Chip label={`+${q.quest.rewardDiamond}`} icon="gem" color="#1A73B8" soft={C.skySoft} size={10} /> : null}
                    </View>
                    <Txt size={12} weight="bold" color={C.inkFaint}>
                      {q.progress}/{q.quest.target}
                    </Txt>
                  </View>
                </View>
              ))
            : null}
        </View>
      ) : (
        <View style={{ padding: S.md, paddingTop: 0 }}>
          <Txt size={12} color={C.inkFaint}>
            Sự kiện này chưa có nhiệm vụ riêng
          </Txt>
        </View>
      )}
    </Card>
  );
}

function remaining(ms: number): string {
  if (ms <= 0) return 'Đã kết thúc';
  const hours = Math.floor(ms / 3600_000);
  if (hours >= 24) return `Còn ${Math.floor(hours / 24)} ngày`;
  if (hours >= 1) return `Còn ${hours} giờ`;
  return `Còn ${Math.max(1, Math.round(ms / 60_000))} phút`;
}
