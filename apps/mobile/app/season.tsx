import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Chip, Txt } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon } from '../src/components/Icon';
import { Art, ArtName } from '../src/components/Art';
import { C, R, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

/**
 * Battle Pass.
 *
 * Cuộn ngang theo mốc, mỗi cột là một mốc với hai ô: nhánh cao cấp ở trên,
 * nhánh miễn phí ở dưới. Một ô chỉ có ba trạng thái — chưa tới mốc (khoá), tới
 * rồi mà chưa nhận (bấm được, viền sáng), đã nhận (mờ đi có dấu tích) — phân
 * biệt bằng cả hình lẫn màu chứ không chỉ bằng màu.
 */
export default function SeasonScreen() {
  const { showToast } = useStore();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData(await api<any>('/api/season'));
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (fn: () => Promise<any>, ok?: string) => {
    try {
      await fn();
      if (ok) showToast(ok, 'ok');
      await load();
    } catch (e: any) {
      showToast(friendlyError(e?.message), 'warn');
    }
  };

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenHeader title="Battle Pass" icon="star" />
      </View>
    );
  }

  const s = data.season;
  const claimed = new Set<string>(s.claimed);
  const pct = Math.min(1, s.into / Math.max(1, s.need));
  const daysLeft = Math.max(0, Math.ceil((s.endAt - Date.now()) / 86400_000));

  /** Còn mốc nào đã mở mà chưa nhận không — quyết định có hiện nút "Nhận tất". */
  const pending = s.tiers.some(
    (t: any) =>
      t.tier <= s.tier &&
      ((t.free && !claimed.has(`free:${t.tier}`)) || (t.premium && s.premium && !claimed.has(`premium:${t.tier}`))),
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Battle Pass" subtitle={`${s.name} · còn ${daysLeft} ngày`} icon="star" />

      <ScrollView
        contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      >
        <Card style={{ gap: S.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt size={16} weight="display" style={{ flex: 1 }}>
              Mốc {s.tier}/30
            </Txt>
            <Chip
              label={s.premium ? 'Đã mở cao cấp' : 'Nhánh miễn phí'}
              icon={s.premium ? 'crown' : 'star'}
              color={s.premium ? C.sun : C.inkFaint}
              soft={s.premium ? C.sunSoft : C.surfaceAlt}
              size={11}
            />
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.surfaceAlt, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: C.secondary }} />
          </View>
          <Txt size={11} color={C.inkFaint}>
            {s.tier >= 30 ? 'Đã đạt mốc cuối mùa này' : `Còn ${s.need - s.into} XP nữa lên mốc ${s.tier + 1}`}
          </Txt>
        </Card>

        {!s.premium ? (
          <Pressable onPress={() => act(() => api('/api/season/premium', { method: 'POST' }), 'Đã mở nhánh cao cấp!')}>
            <LinearGradient
              colors={['#FFD36E', '#FF8A3D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[{ borderRadius: R.lg, padding: S.md, flexDirection: 'row', alignItems: 'center', gap: S.md }, softShadow(0.2, 14, 6)]}
            >
              <Art name="crown" size={34} color="#FFFFFF" glyph />
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="display" color="#5A3B00">
                  Mở nhánh cao cấp
                </Txt>
                <Txt size={11} color="rgba(90,59,0,0.75)">
                  Thêm thưởng ở cả 30 mốc, kể cả mốc đã qua
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="gem" size={16} color="#5A3B00" />
                <Txt size={15} weight="display" color="#5A3B00">
                  {s.premiumPrice}
                </Txt>
              </View>
            </LinearGradient>
          </Pressable>
        ) : null}

        {pending ? (
          <Btn
            label="Nhận tất cả phần thưởng đã mở"
            icon="gift"
            full
            onPress={() => act(() => api('/api/season/claim-all', { method: 'POST' }), 'Đã nhận thưởng!')}
          />
        ) : null}

        <Txt size={13} weight="bold" color={C.inkSoft}>
          Chặng đường mùa này
        </Txt>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
          {s.tiers.map((t: any) => (
            <View key={t.tier} style={{ width: 84, gap: 8 }}>
              <Slot
                reward={t.premium}
                track="premium"
                locked={t.tier > s.tier}
                needPremium={!s.premium}
                claimed={claimed.has(`premium:${t.tier}`)}
                onClaim={() => act(() => api('/api/season/claim', { method: 'POST', body: { tier: t.tier, track: 'premium' } }))}
              />
              <View
                style={{
                  alignSelf: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: R.pill,
                  backgroundColor: t.tier <= s.tier ? C.secondary : C.surfaceAlt,
                }}
              >
                <Txt size={11} weight="bold" color={t.tier <= s.tier ? '#fff' : C.inkFaint}>
                  {t.tier}
                </Txt>
              </View>
              <Slot
                reward={t.free}
                track="free"
                locked={t.tier > s.tier}
                claimed={claimed.has(`free:${t.tier}`)}
                onClaim={() => act(() => api('/api/season/claim', { method: 'POST', body: { tier: t.tier, track: 'free' } }))}
              />
            </View>
          ))}
        </ScrollView>

        <Card style={{ gap: 6 }}>
          <Txt size={13} weight="bold">
            Cách lên mốc
          </Txt>
          <Txt size={12} color={C.inkSoft}>
            Mọi XP kiếm được từ trận đấu và nhiệm vụ đều tính vào Battle Pass. Hết mùa,
            tiến độ về 0 và phần thưởng chưa nhận sẽ mất — nhớ nhận trước hạn.
          </Txt>
        </Card>
      </ScrollView>
    </View>
  );
}

function Slot({
  reward,
  track,
  locked,
  claimed,
  needPremium,
  onClaim,
}: {
  reward?: any;
  track: 'free' | 'premium';
  locked: boolean;
  claimed: boolean;
  needPremium?: boolean;
  onClaim: () => void;
}) {
  const empty = !reward;
  const premiumLocked = track === 'premium' && needPremium;
  const canClaim = !empty && !locked && !claimed && !premiumLocked;

  return (
    <Pressable
      disabled={!canClaim}
      onPress={onClaim}
      style={[
        {
          height: 92,
          borderRadius: R.md,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: 6,
          backgroundColor: empty ? 'transparent' : claimed ? C.surfaceAlt : C.surface,
          borderWidth: 2,
          borderStyle: empty ? 'dashed' : 'solid',
          borderColor: canClaim ? (track === 'premium' ? C.sun : C.mint) : C.line,
          opacity: locked || premiumLocked ? 0.45 : 1,
        },
        canClaim ? softShadow(0.16, 10, 4) : null,
      ]}
    >
      {empty ? (
        <Txt size={10} color={C.inkFaint}>
          —
        </Txt>
      ) : (
        <>
          <Art name={reward.art as ArtName} size={30} color={track === 'premium' ? C.sun : C.secondary} glyph />
          <Txt size={9} weight="bold" color={C.inkSoft} center numberOfLines={2}>
            {reward.label}
          </Txt>
          {claimed ? (
            <View style={{ position: 'absolute', right: 4, top: 4 }}>
              <Icon name="check" size={14} color={C.mint} strokeWidth={3} />
            </View>
          ) : locked || premiumLocked ? (
            <View style={{ position: 'absolute', right: 4, top: 4 }}>
              <Icon name="lock" size={13} color={C.inkFaint} />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
