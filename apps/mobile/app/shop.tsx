import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, CoinPill, Empty, SectionTitle, Txt } from '../src/components/ui';
import { HeaderTabs, ScreenHeader } from '../src/components/ScreenHeader';
import { C, R, RARITY, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

const TYPES: { id: string; label: string; emoji: string }[] = [
  { id: '', label: 'Tất cả', emoji: '✨' },
  { id: 'frame', label: 'Khung', emoji: '🖼️' },
  { id: 'title', label: 'Danh hiệu', emoji: '🏷️' },
  { id: 'background', label: 'Nền', emoji: '🌄' },
  { id: 'bubble', label: 'Bong bóng', emoji: '💭' },
  { id: 'emote', label: 'Emote', emoji: '😜' },
  { id: 'victory', label: 'Hiệu ứng', emoji: '🎆' },
  { id: 'boardtheme', label: 'Bàn cờ', emoji: '🎨' },
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
      showToast(`Đã mua ${item.name} 🎉`);
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
    showToast(`Nạp thành công +${res.granted} 💎`);
    await Promise.all([load(), refresh()]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Cửa hàng"
        art="shop"
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 46, marginTop: S.md }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: 8, alignItems: 'center' }}>
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
              <Text style={{ fontSize: 13 }}>{t.emoji}</Text>
              <Txt size={12} weight="bold" color={type === t.id ? C.secondaryDark : C.inkSoft}>
                {t.label}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
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
            <Empty art="backpack" title="Túi đồ trống" hint="Mua cosmetic ở tab Cửa hàng để trang trí hồ sơ" />
          ))}

        {mode === 'topup' && (
          <View style={{ gap: S.md }}>
            <SectionTitle title="Gói Diamond" emoji="💎" />
            {packs.map((p) => (
              <LinearGradient
                key={p.id}
                colors={['#DCF0FF', '#FFFFFF']}
                style={[{ borderRadius: R.lg, padding: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 2, borderColor: C.line }, softShadow(0.06, 10, 4)]}
              >
                <Text style={{ fontSize: 34 }}>{p.diamond >= 600 ? '🎁' : p.diamond >= 180 ? '💰' : '💎'}</Text>
                <View style={{ flex: 1 }}>
                  <Txt size={15} weight="heading">
                    {p.label}
                  </Txt>
                  <Txt size={12} color={C.inkSoft}>
                    {p.diamond} 💎{p.bonus ? ` + ${p.bonus} tặng thêm` : ''}
                  </Txt>
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

/** Biểu tượng đại diện khi vật phẩm chỉ là một dải màu. */
function PREVIEW_EMOJI(item: any, p: any): string {
  if (item.type === 'victory') return p.kind === 'fireworks' ? '🎆' : '🎊';
  if (item.type === 'entry') return '⭐';
  if (item.type === 'boardtheme') return '🎲';
  if (item.type === 'bubble') return '💭';
  // Nền là chính dải gradient nên không cần biểu tượng đè lên.
  return '';
}

function ItemPreview({ item, size = 62 }: { item: any; size?: number }) {
  const p = item.payload ?? {};
  if (item.type === 'title') {
    return (
      <View style={{ width: size, height: size, borderRadius: R.md, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', padding: 4 }}>
        <Txt size={10} weight="bold" color={p.color ?? C.ink} center numberOfLines={2}>
          {p.text ?? item.name}
        </Txt>
      </View>
    );
  }
  if (item.type === 'emote') {
    return (
      <View style={{ width: size, height: size, borderRadius: R.md, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.4 }}>{(p.emojis ?? '😀').split(',')[0]}</Text>
      </View>
    );
  }
  const colors = [p.from ?? p.bg ?? C.primarySoft, p.to ?? p.bg ?? C.primary];
  return (
    <LinearGradient colors={colors as [string, string]} style={{ width: size, height: size, borderRadius: item.type === 'frame' ? size / 2 : R.md, alignItems: 'center', justifyContent: 'center' }}>
      {item.type === 'frame' ? (
        <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: C.surface }} />
      ) : PREVIEW_EMOJI(item, p) ? (
        <Text style={{ fontSize: size * 0.4 }}>{PREVIEW_EMOJI(item, p)}</Text>
      ) : null}
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
        <Chip label="Đã sở hữu" icon="✅" color={C.mint} soft={C.mintSoft} size={10} />
      ) : item.priceCoin != null ? (
        <Btn label={`${item.priceCoin.toLocaleString('vi-VN')} 🪙`} size="sm" tone="sun" onPress={() => onBuy(item, 'coin')} />
      ) : (
        <Btn label={`${item.priceDiamond} 💎`} size="sm" tone="secondary" onPress={() => onBuy(item, 'diamond')} />
      )}
    </Card>
  );
}
