import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Btn, Card, Chip, Empty, Txt } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { IconName } from '../src/components/Icon';
import { Art, ArtName } from '../src/components/Art';
import { C, R, RARITY, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

/**
 * Túi đồ.
 *
 * App không có cửa hàng: cosmetic chỉ **kiếm được** qua thành tựu, nên màn này
 * chỉ để xem đồ đang có và chọn thứ muốn dùng. Mỗi loại chỉ trang bị được một
 * món, đúng như quy tắc ở server.
 */
const TYPES: { id: string; label: string; icon: IconName }[] = [
  { id: '', label: 'Tất cả', icon: 'grid' },
  { id: 'frame', label: 'Khung', icon: 'crown' },
  { id: 'title', label: 'Danh hiệu', icon: 'list' },
  { id: 'background', label: 'Nền', icon: 'grid' },
  { id: 'bubble', label: 'Bong bóng', icon: 'chat' },
  { id: 'emote', label: 'Emote', icon: 'sparkle' },
  { id: 'victory', label: 'Hiệu ứng', icon: 'bolt' },
  { id: 'boardtheme', label: 'Bàn cờ', icon: 'dice' },
];

export default function InventoryScreen() {
  const { showToast, refresh } = useStore();
  const [type, setType] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const inv = await api<any>('/api/economy/inventory');
      setInventory(inv.inventory);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const equip = async (item: any, on: boolean) => {
    try {
      await api(`/api/economy/inventory/${item.id}/equip`, { method: 'POST', body: { equip: on } });
      showToast(on ? `Đang dùng ${item.name}` : 'Đã tháo', 'ok');
      await load();
      await refresh();
    } catch (e: any) {
      showToast(friendlyError(e?.message), 'warn');
    }
  };

  const shown = useMemo(
    () => (type ? inventory.filter((e) => e.item.type === type) : inventory),
    [inventory, type],
  );
  /** Chỉ bày ra những loại thật sự có đồ, khỏi bấm vào tab trống. */
  const tabs = useMemo(
    () => TYPES.filter((t) => !t.id || inventory.some((e) => e.item.type === t.id)),
    [inventory],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Túi đồ"
        subtitle="Cosmetic mở khoá từ thành tựu"
        icon="gift"
      />

      {tabs.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: 54 }}
          contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, alignItems: 'center' }}
        >
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setType(t.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: R.pill,
                backgroundColor: type === t.id ? C.primary : C.surface,
                borderWidth: 2,
                borderColor: type === t.id ? C.primary : C.line,
              }}
            >
              <Txt size={12} weight="bold" color={type === t.id ? '#fff' : C.inkSoft}>
                {t.label}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      >
        {shown.length ? (
          shown.map((entry) => (
            <Card
              key={entry.item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: S.md,
                borderColor: entry.equipped ? C.mint : C.line,
              }}
            >
              <ItemPreview item={entry.item} size={54} />
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold" numberOfLines={1}>
                  {entry.item.name}
                </Txt>
                <Txt size={11} color={C.inkFaint} numberOfLines={1}>
                  {entry.item.description}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Chip
                    label={RARITY[entry.item.rarity].label}
                    color={RARITY[entry.item.rarity].color}
                    soft={RARITY[entry.item.rarity].soft}
                    size={10}
                  />
                </View>
              </View>
              <Btn
                label={entry.equipped ? 'Đang dùng' : 'Trang bị'}
                size="sm"
                tone={entry.equipped ? 'mint' : 'ghost'}
                onPress={() => equip(entry.item, !entry.equipped)}
              />
            </Card>
          ))
        ) : (
          <Empty
            icon="gift"
            title={inventory.length ? 'Loại này chưa có món nào' : 'Túi đồ trống'}
            hint="Mở khoá thành tựu để nhận cosmetic trang trí hồ sơ"
          />
        )}
      </ScrollView>
    </View>
  );
}

/** Mỗi loại cosmetic có một cách dựng preview riêng, thay vì ô màu trơn. */
const TYPE_ART: Record<string, ArtName> = {
  victory: 'star',
  entry: 'ui-quick',
  boardtheme: 'die-5',
  bubble: 'ui-chat',
  emote: 'happy',
  background: 'moon',
};

function ItemPreview({ item, size = 62 }: { item: any; size?: number }) {
  const p = item.payload ?? {};
  const radius = item.type === 'frame' ? size / 2 : R.md;
  const colors = [p.from ?? p.bg ?? C.primarySoft, p.to ?? p.bg ?? C.primary] as [string, string];

  if (item.type === 'title') {
    return (
      <View
        style={[
          { width: size, height: size, borderRadius: R.md, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 2, borderColor: C.line },
          softShadow(0.08, 8, 3),
        ]}
      >
        <Txt size={10} weight="bold" color={p.color ?? C.ink} center numberOfLines={2}>
          {p.text ?? item.name}
        </Txt>
      </View>
    );
  }

  if (item.type === 'frame') {
    // Khung avatar: cho luôn một avatar mẫu vào giữa để thấy khung ôm cái gì.
    return (
      <LinearGradient colors={colors} style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }, softShadow(0.12, 10, 4)]}>
        <View style={{ width: size * 0.74, height: size * 0.74, borderRadius: size, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Art name="ui-profile" size={size * 0.42} color={C.inkFaint} />
        </View>
      </LinearGradient>
    );
  }

  if (item.type === 'boardtheme') {
    // Bàn cờ: dựng lưới 3x3 nhỏ cho ra dáng mặt bàn.
    const cell = size * 0.2;
    return (
      <LinearGradient colors={colors} style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', gap: 2 }, softShadow(0.12, 10, 4)]}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 2 }}>
            {[0, 1, 2].map((c) => (
              <View
                key={c}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 3,
                  backgroundColor: (r + c) % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
          </View>
        ))}
      </LinearGradient>
    );
  }

  const art = TYPE_ART[item.type];
  return (
    <LinearGradient colors={colors} style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, softShadow(0.12, 10, 4)]}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -size * 0.3, left: -size * 0.2, width: size, height: size * 0.7, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.18)' }} />
      {art ? <Art name={art} size={size * 0.5} color="rgba(255,255,255,0.95)" glyph shadow /> : null}
    </LinearGradient>
  );
}
