import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registry } from '@co/core';
import '../src/catalog';
import { backToLobby } from '../src/nav';
import { FACES, GROUPS } from '../src/games/faces';
import { BottomNav } from '../src/ui/BottomNav';
import { Icon } from '../src/ui/Icon';
import { Txt, press } from '../src/ui/parts';
import { TheAnh } from '../src/ui/TheAnh';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, S } from '../src/ui/theme';

/**
 * Danh mục mười ba bộ môn.
 *
 * Đây là **danh mục**, không phải một bước của luồng vào trận — luồng vào
 * trận đi qua màn chọn chế độ rồi tới tấm chọn bộ môn. Một màn một việc:
 * màn này trả lời "nền tảng này có gì", không trả lời "tôi đánh gì bây giờ".
 *
 * Nguồn chân lý "chơi được không" là `registry.has`, không phải `face.ready`.
 */
const READY = new Set(registry.catalog().map((s) => s.id));

export default function BoMonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Về sảnh" style={press}>
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={19} weight="display">
            Bộ môn
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {READY.size} trên {FACES.length} đã mở
          </Txt>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: S.xxl, paddingTop: S.md, gap: S.md }}>
        {GROUPS.map((g) => {
          const items = FACES.filter((f) => f.group === g.id);
          if (!items.length) return null;
          return (
            <View key={g.id} style={{ gap: S.sm }}>
              <View style={{ alignItems: 'center', gap: 2, paddingTop: S.md }}>
                <Txt size={15} weight="display" color={A.ink}>
                  {g.ten}
                </Txt>
                <Rule width={w * 0.3} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, paddingHorizontal: S.lg }}>
                {items.map((f) => (
                  <View key={f.id} style={{ width: '47.5%' }}>
                    <TheAnh
                      ten={f.nameVi}
                      surface={f.surface}
                      Art={f.Motif}
                      khoa={!READY.has(f.id)}
                      dieuKien="Sắp có"
                      nhan={[f.mode, f.minutes]}
                      a11y={READY.has(f.id) ? `Chơi ${f.nameVi}` : `Xem luật ${f.nameVi}, chưa mở`}
                      onPress={() => router.push(READY.has(f.id) ? `/play/${f.id}` : `/luat/${f.id}`)}
                      onGoc={() => router.push(`/luat/${f.id}`)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <BottomNav active="bo-mon" />
    </View>
  );
}
