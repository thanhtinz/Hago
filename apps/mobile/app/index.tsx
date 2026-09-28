import React, { useRef } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { registry } from '@co/core';
import '../src/catalog';
import { FACES, type GameFace } from '../src/games/faces';
import { Icon, type IconName } from '../src/ui/Icon';
import { Avatar, Btn, Tag, Txt } from '../src/ui/kit';
import { AppBackdrop, Panel, Rule, WoodFill } from '../src/ui/surface';
import { A, R, S, glow, lift } from '../src/ui/theme';

/**
 * Sảnh.
 *
 * Bố cục học từ các app cờ online đông người dùng: trên cùng là người chơi,
 * giữa là **một** nút chơi to, dưới là lưới bộ môn — chín lần mở app thì tám
 * lần người ta chỉ muốn bấm "chơi tiếp", không muốn đọc danh mục.
 *
 * Còn chất liệu thì lấy từ chính cái bàn cờ gỗ: mọi tấm ở đây là gỗ có vân,
 * có vát cạnh, viền chỉ vàng. Một sảnh game cờ mà dựng bằng thẻ xám bo góc
 * thì nhìn như trang cài đặt.
 */

const READY = new Set(registry.catalog().map((s) => s.id));

export default function Lobby() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const scroller = useRef<ScrollView>(null);
  const gridY = useRef(0);

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: insets.top + S.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tên nền tảng khắc chữ serif, có đường chỉ vàng bên dưới như khung
            viền một bàn cờ gỗ. */}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt size={13} weight="display" color={A.gold} style={{ letterSpacing: 6 }}>
            CỜ VIỆT
          </Txt>
          <Rule width={w * 0.5} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cài đặt"
          hitSlop={10}
          style={{ position: 'absolute', right: S.lg, top: insets.top + S.md }}
        >
          <Icon name="settings" size={20} color={A.inkFaint} />
        </Pressable>

        <View style={{ paddingHorizontal: S.lg, paddingTop: S.lg, gap: S.md }}>
          <Panel radius={R.md} tone={1} seed={9} style={lift(0.4, 12, 5)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
              <Avatar name="Khách" size={46} active />
              <View style={{ flex: 1 }}>
                <Txt size={17} weight="display">
                  Khách
                </Txt>
                {/* Không bịa elo hay số trận khi chưa có máy chủ ghi lại. */}
                <Txt size={11.5} color={A.inkFaint}>
                  Chưa xếp hạng · chơi ngoại tuyến
                </Txt>
              </View>
              <Icon name="chevron" size={17} color={A.inkFaint} />
            </View>
          </Panel>

          <Btn
            size="lg"
            icon="robot"
            label="Đấu với máy"
            sub="Cờ caro · ba mức khó"
            onPress={() => router.push('/play/co-caro')}
          />

          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Mode icon="bolt" label="Ghép cặp" />
            <Mode icon="door" label="Tạo phòng" />
            <Mode icon="key" label="Vào mã" />
          </View>

          <Txt size={11} color={A.inkFaint} center style={{ paddingHorizontal: S.sm }}>
            Máy chủ chưa dựng xong nên ba chế độ trên còn khoá. Đấu với máy chạy ngay trên thiết bị.
          </Txt>
        </View>

        <View
          onLayout={(e) => {
            gridY.current = e.nativeEvent.layout.y;
          }}
          style={{ alignItems: 'center', paddingTop: S.xxl, paddingBottom: S.md, gap: 2 }}
        >
          <Txt size={20} weight="display" color={A.ink}>
            Chín bộ môn
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {READY.size} trên {FACES.length} đã mở
          </Txt>
          <Rule width={w * 0.38} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, paddingHorizontal: S.lg }}>
          {FACES.map((f, i) => (
            <GameCard
              key={f.id}
              face={f}
              seed={i * 17 + 5}
              ready={READY.has(f.id)}
              onPress={() => READY.has(f.id) && router.push(`/play/${f.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNav
        width={w}
        insetBottom={insets.bottom}
        onHome={() => scroller.current?.scrollTo({ y: 0, animated: true })}
        onGrid={() => scroller.current?.scrollTo({ y: gridY.current, animated: true })}
      />
    </View>
  );
}

/** Chế độ chưa mở: vẫn hiện, nhưng khắc chìm và có ổ khoá. */
function Mode({ icon, label }: { icon: IconName; label: string }) {
  return (
    <Panel radius={R.md} tone={0} seed={label.length * 7} style={{ flex: 1 }}>
      <View style={{ gap: 5, paddingVertical: S.md, alignItems: 'center' }}>
        <Icon name={icon} size={19} color={A.inkFaint} />
        <Txt size={11.5} weight="semi" color={A.inkFaint}>
          {label}
        </Txt>
        <View style={{ position: 'absolute', top: 6, right: 7 }}>
          <Icon name="lock" size={10} color={A.inkFaint} />
        </View>
      </View>
    </Panel>
  );
}

/**
 * Thẻ bộ môn: một bức tranh lồng khung gỗ.
 *
 * Nửa trên là chất liệu thật của game — mở cờ tướng ra thấy gỗ tre thì thẻ
 * cũng phải là gỗ tre — nhưng nó được **lồng khung**: bo góc, có viền chỉ
 * vàng mảnh, hở ra một vành gỗ quanh mép. Hình tràn sát mép thẻ thì trông
 * như ảnh dán; lồng khung thì trông như hiện vật bày trong tủ.
 */
function GameCard({
  face,
  ready,
  seed,
  onPress,
}: {
  face: GameFace;
  ready: boolean;
  seed: number;
  onPress: () => void;
}) {
  const Motif = face.Motif;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? `Chơi ${face.nameVi}` : `${face.nameVi}, chưa mở`}
      disabled={!ready}
      onPress={onPress}
      style={({ pressed }) => [
        { width: '47.5%', transform: [{ translateY: pressed ? 1 : 0 }] },
        ready ? glow(0.22, 12) : lift(0.35, 10, 4),
      ]}
    >
      <Panel radius={R.md} tone={ready ? 2 : 1} seed={seed} hairline={false} style={{ borderWidth: 1.2, borderColor: ready ? A.goldDeep : A.lineSoft }}>
        <View style={{ padding: 6 }}>
          <View
            style={{
              height: 84,
              borderRadius: 7,
              overflow: 'hidden',
              backgroundColor: face.surface,
              borderWidth: 1,
              borderColor: ready ? A.goldDeep : '#00000055',
              opacity: ready ? 1 : 0.7,
            }}
          >
            <Motif />
            {/* Bóng đổ của khung hắt vào trong hình, để hình lõm xuống dưới
                mặt gỗ chứ không nổi lên trên. */}
            <InsetShade />
          </View>
        </View>
        <View style={{ paddingHorizontal: S.md, paddingBottom: S.md, paddingTop: 2, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Txt size={15} weight="display" color={ready ? A.ink : A.inkSoft} style={{ flex: 1 }} numberOfLines={1}>
              {face.nameVi}
            </Txt>
            {ready ? null : <Icon name="lock" size={11} color={A.inkFaint} />}
          </View>
          <Txt size={10.5} color={A.inkFaint} numberOfLines={1}>
            {face.material} · {face.seats}
          </Txt>
        </View>
        {ready ? (
          <View style={{ position: 'absolute', top: 12, right: 12 }}>
            <Tag label="Chơi được" color={A.jade} bg="#12291A" />
          </View>
        ) : null}
      </Panel>
    </Pressable>
  );
}

/** Vệt tối hắt từ khung xuống mép trên của hình lồng khung. */
function InsetShade() {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18 }} pointerEvents="none">
      <Svg width="100%" height={18}>
        <Defs>
          <LinearGradient id="inset-shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={18} fill="url(#inset-shade)" />
      </Svg>
    </View>
  );
}

/** Thanh dưới ba mục, đặt trên một thanh gỗ có chỉ vàng ở mép trên. */
function BottomNav({
  width,
  insetBottom,
  onHome,
  onGrid,
}: {
  width: number;
  insetBottom: number;
  onHome: () => void;
  onGrid: () => void;
}) {
  const h = 56 + insetBottom;
  const items: { icon: IconName; label: string; onPress?: () => void; active?: boolean }[] = [
    { icon: 'home', label: 'Sảnh', onPress: onHome, active: true },
    { icon: 'grid', label: 'Bộ môn', onPress: onGrid },
    { icon: 'user', label: 'Tôi' },
  ];
  return (
    <View style={{ height: h, flexDirection: 'row', overflow: 'hidden' }}>
      <WoodFill width={width} height={h} tone={1} seed={77} bevel={false} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.2, backgroundColor: A.goldDeep, opacity: 0.6 }} />
      {items.map((it) => (
        <Pressable
          key={it.label}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          disabled={!it.onPress}
          onPress={it.onPress}
          style={{ flex: 1, paddingTop: S.sm, paddingBottom: insetBottom + S.sm, alignItems: 'center', gap: 3 }}
        >
          <Icon name={it.icon} size={21} color={it.active ? A.gold : A.inkFaint} />
          <Txt size={10} weight="semi" color={it.active ? A.gold : A.inkFaint}>
            {it.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
