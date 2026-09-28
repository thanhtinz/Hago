import React, { useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registry } from '@co/core';
import '../src/catalog';
import { FACES, type GameFace } from '../src/games/faces';
import { Icon, type IconName } from '../src/ui/Icon';
import { Avatar, Btn, Tag, Txt } from '../src/ui/kit';
import { A, R, S, lift } from '../src/ui/theme';

/**
 * Sảnh.
 *
 * Bố cục học từ các app cờ online đông người dùng: trên cùng là người chơi,
 * giữa là **một** nút chơi to, dưới là lưới bộ môn. Bản trước xếp chín thẻ to
 * bằng nhau theo chiều dọc — người mở app lên phải cuộn và phải chọn, trong
 * khi chín lần mở thì tám lần họ chỉ muốn bấm "chơi tiếp".
 *
 * Lưới hai cột chứ không phải danh sách: chín bộ môn xếp dọc là bốn màn cuộn,
 * xếp lưới là gần một màn.
 */

const READY = new Set(registry.catalog().map((s) => s.id));

export default function Lobby() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const gridY = useRef(0);

  const open = (f: GameFace) => {
    if (!READY.has(f.id)) return;
    router.push(`/play/${f.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: A.bg }}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: insets.top + S.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Người chơi. Không bịa số trận hay điểm elo khi chưa có máy chủ ghi
            lại; chỗ đó để trống còn hơn hiện số giả. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg }}>
          <Avatar name="Khách" size={44} active />
          <View style={{ flex: 1 }}>
            <Txt size={16} weight="bold">
              Khách
            </Txt>
            <Txt size={12} color={A.inkFaint}>
              Chưa xếp hạng · chơi ngoại tuyến
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cài đặt"
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: A.surface,
              borderWidth: 1,
              borderColor: A.line,
            }}
          >
            <Icon name="settings" size={19} color={A.inkSoft} />
          </Pressable>
        </View>

        {/* Một nút chính, to hơn hẳn mọi thứ khác. Đây là thao tác chín trên
            mười lần mở app. */}
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.xl, gap: S.md }}>
          <Btn
            size="lg"
            icon="robot"
            label="Đấu với máy"
            sub="Cờ caro · ba mức khó"
            onPress={() => router.push('/play/co-caro')}
            style={lift(0.45, 18, 8)}
          />

          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Mode icon="bolt" label="Ghép cặp" />
            <Mode icon="door" label="Tạo phòng" />
            <Mode icon="key" label="Vào mã" />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: A.inkFaint }} />
            <Txt size={11} color={A.inkFaint} style={{ flex: 1 }}>
              Máy chủ chưa dựng xong nên ba chế độ trên còn khoá. Đấu với máy chạy ngay trên thiết bị.
            </Txt>
          </View>
        </View>

        <View
          onLayout={(e) => {
            gridY.current = e.nativeEvent.layout.y;
          }}
          style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: S.lg, paddingTop: S.xxl, paddingBottom: S.md }}
        >
          <Txt size={19} weight="display" style={{ flex: 1 }}>
            Chín bộ môn
          </Txt>
          <Txt size={12} color={A.inkFaint}>
            {READY.size}/{FACES.length} đã mở
          </Txt>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: S.md,
            paddingHorizontal: S.lg,
          }}
        >
          {FACES.map((f) => (
            <GameCard key={f.id} face={f} ready={READY.has(f.id)} onPress={() => open(f)} />
          ))}
        </View>
      </ScrollView>

      <BottomNav
        insetBottom={insets.bottom}
        onHome={() => scroller.current?.scrollTo({ y: 0, animated: true })}
        onGrid={() => scroller.current?.scrollTo({ y: gridY.current, animated: true })}
      />
    </View>
  );
}

function Mode({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: 5,
        paddingVertical: S.md,
        alignItems: 'center',
        borderRadius: R.md,
        backgroundColor: A.surface,
        borderWidth: 1,
        borderColor: A.lineSoft,
      }}
    >
      <Icon name={icon} size={20} color={A.inkFaint} />
      <Txt size={12} weight="bold" color={A.inkFaint}>
        {label}
      </Txt>
      <View style={{ position: 'absolute', top: 6, right: 6 }}>
        <Icon name="lock" size={11} color={A.inkFaint} />
      </View>
    </View>
  );
}

/**
 * Thẻ bộ môn. Nửa trên là chất liệu thật của game đó — mở cờ tướng ra thấy gỗ
 * tre thì thẻ cũng phải là gỗ tre. Chín thẻ giống hệt nhau chỉ khác chữ thì
 * không ai nhớ được cái nào là cái nào.
 */
function GameCard({ face, ready, onPress }: { face: GameFace; ready: boolean; onPress: () => void }) {
  const Motif = face.Motif;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? `Chơi ${face.nameVi}` : `${face.nameVi}, chưa mở`}
      disabled={!ready}
      onPress={onPress}
      style={{
        width: '47.5%',
        borderRadius: R.md,
        overflow: 'hidden',
        backgroundColor: A.surface,
        borderWidth: 1,
        borderColor: ready ? face.accent : A.line,
      }}
    >
      <View style={{ height: 92, backgroundColor: face.surface, opacity: ready ? 1 : 0.62 }}>
        <Motif />
      </View>
      <View style={{ padding: S.md, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={14} weight="bold" color={ready ? A.ink : A.inkSoft} style={{ flex: 1 }} numberOfLines={1}>
            {face.nameVi}
          </Txt>
          {ready ? null : <Icon name="lock" size={12} color={A.inkFaint} />}
        </View>
        <Txt size={11} color={A.inkFaint} numberOfLines={1}>
          {face.material} · {face.seats}
        </Txt>
      </View>
      {ready ? (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <Tag label="Chơi được" color={A.live} bg={A.liveSoft} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Thanh dưới ba mục. Quá năm mục thì không còn ai đọc, chỉ bấm bừa. */
function BottomNav({
  insetBottom,
  onHome,
  onGrid,
}: {
  insetBottom: number;
  onHome: () => void;
  onGrid: () => void;
}) {
  const items: { icon: IconName; label: string; onPress?: () => void; active?: boolean }[] = [
    { icon: 'home', label: 'Sảnh', onPress: onHome, active: true },
    { icon: 'grid', label: 'Bộ môn', onPress: onGrid },
    { icon: 'user', label: 'Tôi' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingTop: S.sm,
        paddingBottom: insetBottom + S.sm,
        backgroundColor: A.surface,
        borderTopWidth: 1,
        borderTopColor: A.line,
      }}
    >
      {items.map((it) => (
        <Pressable
          key={it.label}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          disabled={!it.onPress}
          onPress={it.onPress}
          style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3 }}
        >
          <Icon name={it.icon} size={21} color={it.active ? A.gold : A.inkFaint} />
          <Txt size={10} weight="bold" color={it.active ? A.gold : A.inkFaint}>
            {it.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
