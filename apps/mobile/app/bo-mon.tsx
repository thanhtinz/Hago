import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registry } from '@co/core';
import '../src/catalog';
import { backToLobby } from '../src/nav';
import { FACES, GROUPS, type GameFace } from '../src/games/faces';
import { CHAT_SPACE } from '../src/ui/FloatingChat';
import { Icon } from '../src/ui/Icon';
import { Nhan, Panel, Txt, press } from '../src/ui/parts';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, R, S, lift } from '../src/ui/theme';

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

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + CHAT_SPACE + S.xxl, paddingTop: S.md, gap: S.md }}>
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
                  <Card key={f.id} face={f} ready={READY.has(f.id)} onPress={() => router.push(READY.has(f.id) ? `/play/${f.id}` : `/luat/${f.id}`)} onRules={() => router.push(`/luat/${f.id}`)} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Một thẻ bộ môn trong danh mục. Bấm vào là đấu với máy; nút Luật ở góc. */
function Card({ face, ready, onPress, onRules }: { face: GameFace; ready: boolean; onPress: () => void; onRules: () => void }) {
  const Motif = face.Motif;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? `Chơi ${face.nameVi}` : `Xem luật ${face.nameVi}, chưa mở`}
      onPress={onPress}
      style={({ pressed }) => [{ width: '47.5%', borderRadius: R.md, transform: [{ translateY: pressed ? 1 : 0 }] }, lift(ready ? 0.4 : 0.28, 12, 5)]}
    >
      <Panel radius={R.md} tone={ready ? 2 : 1} hairline={false} style={{ borderWidth: 1, borderColor: ready ? A.line : A.lineSoft }}>
        <View style={{ padding: 6 }}>
          <View style={{ aspectRatio: 100 / 64, borderRadius: 7, overflow: 'hidden', backgroundColor: face.surface, opacity: ready ? 1 : 0.7 }}>
            <Motif />
            {ready ? null : (
              <View style={{ position: 'absolute', top: 6, right: 6 }}>
                <Nhan label="Sắp có" muted />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Luật ${face.nameVi}`}
              hitSlop={12}
              onPress={onRules}
              style={({ pressed }) => [
                { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, backgroundColor: '#00000099' },
                press({ pressed }),
              ]}
            >
              <Txt size={11} weight="semi" color={A.ink}>
                Luật
              </Txt>
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: S.md, paddingBottom: S.md, paddingTop: 2, gap: 5 }}>
          <Txt size={15} weight="display" color={ready ? A.ink : A.inkSoft} numberOfLines={1}>
            {face.nameVi}
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            <Nhan label={face.mode} />
            <Nhan label={face.minutes} />
          </View>
        </View>
      </Panel>
    </Pressable>
  );
}
