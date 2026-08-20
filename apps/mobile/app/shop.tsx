import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, CoinPill, Empty, SectionTitle, Txt } from '../src/components/ui';
import { HeaderTabs, ScreenHeader } from '../src/components/ScreenHeader';
import { Icon, IconName } from '../src/components/Icon';
import { Art, ArtName } from '../src/components/Art';
import { C, R, RARITY, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

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

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast, refresh } = useStore();
  const [mode, setMode] = useState<'shop' | 'inventory' | 'topup'>('shop');
  const [type, setType] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [balance, setBalance] = useState({ coin: 0, diamond: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [shop, inv, pk] = await Promise.all([
        api<any>(`/api/economy/shop${type ? `?type=${type}` : ''}`),
        api<any>('/api/economy/inventory'),
        api<any>('/api/economy/packs'),
      ]);
      setItems(shop.items);
      setBalance(shop.balance);
      setInventory(inv.inventory);
      setPacks(pk.packs);
    } finally {
      setBusy(false);
    }
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const buy = async (item: any, currency: 'coin' | 'diamond') => {
    try {
      await api(`/api/economy/shop/${item.id}/buy`, { method: 'POST', body: { currency } });
      showToast(`Đã mua ${item.name}`);
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      showToast(friendlyError(e.code), 'warn');
    }
  };

  const equip = async (item: any, on: boolean) => {
    await api(`/api/economy/inventory/${item.id}/equip`, { method: 'POST', body: { equip: on } });
    showToast(on ? `Đã trang bị ${item.name}` : 'Đã tháo');
    await Promise.all([load(), refresh()]);
  };

  const topup = async (packId: string) => {
    const res = await api<any>('/api/economy/payment/checkout', { method: 'POST', body: { packId } });
    showToast(`Nạp thành công +${res.granted} diamond`);
    await Promise.all([load(), refresh()]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Cửa hàng"
        icon="shop"
        right={<CoinPill coin={balance.coin} diamond={balance.diamond} />}
      >
        <HeaderTabs
          tabs={[
            { id: 'shop', label: 'Cửa hàng' },
            { id: 'inventory', label: 'Túi đồ' },
            { id: 'topup', label: 'Nạp' },
          ]}
          active={mode}
          onChange={(id) => setMode(id as any)}
        />
      </ScreenHeader>

      {mode === 'shop' ? (
        // Bọc trong View có chiều cao: ScrollView ngang của react-native-web
        // cắt phần tràn theo trục dọc, chip cao hơn dòng chữ sẽ bị xén mất viền.
        <View style={{ height: 54, marginTop: S.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: S.lg, gap: 8, alignItems: 'center' }}
        >
          {TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setType(t.id)}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: R.pill,
                backgroundColor: type === t.id ? C.secondarySoft : C.surface,
                borderWidth: 2,
                borderColor: type === t.id ? C.secondary : C.line,
                flexDirection: 'row',
                gap: 5,
              }}
            >
              <Icon name={t.icon} size={15} color={type === t.id ? C.secondaryDark : C.inkSoft} />
              <Txt size={12} weight="bold" color={type === t.id ? C.secondaryDark : C.inkSoft}>
                {t.label}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
      >
        {mode === 'shop' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'space-between' }}>
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onBuy={buy} />
            ))}
          </View>
        )}

        {mode === 'inventory' &&
          (inventory.length ? (
            <View style={{ gap: S.md }}>
              {inventory.map((entry) => (
                <Card key={entry.item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <ItemPreview item={entry.item} size={48} />
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {entry.item.name}
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
              ))}
            </View>
          ) : (
            <Empty icon="shop" title="Túi đồ trống" hint="Mua cosmetic ở tab Cửa hàng để trang trí hồ sơ" />
          ))}

        {mode === 'topup' && (
          <View style={{ gap: S.md }}>
            <SectionTitle title="Gói Diamond" icon="gem" />
            {packs.map((p) => (
              <LinearGradient
                key={p.id}
                colors={['#DCF0FF', '#FFFFFF']}
                style={[{ borderRadius: R.lg, padding: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 2, borderColor: C.line }, softShadow(0.06, 10, 4)]}
              >
                <Icon name={p.diamond >= 600 ? 'gift' : p.diamond >= 180 ? 'coin' : 'gem'} size={36} color={C.sky} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Txt size={15} weight="heading">
                    {p.label}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="gem" size={13} color={C.sky} strokeWidth={2.2} />
                    <Txt size={12} color={C.inkSoft}>
                      {p.diamond}
                      {p.bonus ? ` + ${p.bonus} tặng thêm` : ''}
                    </Txt>
                  </View>
                </View>
                <Btn label={`${p.price.toLocaleString('vi-VN')}đ`} size="sm" tone="sun" onPress={() => topup(p.id)} />
              </LinearGradient>
            ))}
            <Txt size={11} color={C.inkFaint} center>
              Bản demo mô phỏng thanh toán. Bản production sẽ xác thực receipt từ App Store / Google Play trước khi ghi sổ.
            </Txt>
          </View>
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

function ItemCard({ item, onBuy }: { item: any; onBuy: (i: any, c: 'coin' | 'diamond') => void }) {
  const rar = RARITY[item.rarity];
  return (
    <Card style={{ width: '48%', gap: S.sm, borderColor: rar.soft, alignItems: 'center' }}>
      <ItemPreview item={item} />
      <Txt size={13} weight="bold" center numberOfLines={1}>
        {item.name}
      </Txt>
      <Chip label={rar.label} color={rar.color} soft={rar.soft} size={10} />
      {item.owned ? (
        <Chip label="Đã sở hữu" icon="check" color={C.mint} soft={C.mintSoft} size={10} />
      ) : item.priceCoin != null ? (
        <Btn label={item.priceCoin.toLocaleString('vi-VN')} icon="coin" size="sm" tone="sun" onPress={() => onBuy(item, 'coin')} />
      ) : (
        <Btn label={String(item.priceDiamond)} icon="gem" size="sm" tone="secondary" onPress={() => onBuy(item, 'diamond')} />
      )}
    </Card>
  );
}
