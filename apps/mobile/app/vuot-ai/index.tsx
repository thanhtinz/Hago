import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHUONG, TONG_SAO, aiCuaChuong, daMo, type Ai } from '@co/protocol';
import { backToLobby } from '../../src/nav';
import { faceOf } from '../../src/games/faces';
import { saoVuotAi } from '../../src/net/store';
import { CHAT_SPACE } from '../../src/ui/FloatingChat';
import { Icon } from '../../src/ui/Icon';
import { Panel, Txt, press } from '../../src/ui/parts';
import { Sao } from '../../src/ui/Sao';
import { AppBackdrop, Rule } from '../../src/ui/surface';
import { A, R, S, lift } from '../../src/ui/theme';

/**
 * Vượt ải: mười ải, ba chương, ba mươi sao.
 *
 * Tiến độ đọc từ máy chứ không từ máy chủ, nên màn này chạy được cả khi
 * chưa đăng nhập. Đọc lại mỗi lần màn được tập trung, vì người chơi vừa
 * qua một ải rồi quay lui về đây và con số phải đổi ngay.
 */
export default function VuotAiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const [sao, setSao] = React.useState<Record<string, number>>({});
  useFocusEffect(
    React.useCallback(() => {
      setSao(saoVuotAi());
    }, []),
  );
  const tong = Object.values(sao).reduce((n, x) => n + x, 0);

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Về sảnh" style={press}>
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={19} weight="display">
            Vượt ải
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {tong}/{TONG_SAO} sao
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + CHAT_SPACE + S.xxl, gap: S.lg }}>
        <Txt size={11.5} color={A.inkFaint} center>
          Vượt ải đánh với máy, không tính điểm và không lên bảng xếp hạng.
        </Txt>

        {CHUONG.map((ch) => (
          <View key={ch.so} style={{ gap: S.sm }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Txt size={15} weight="display" color={A.ink}>
                Chương {ch.so} · {ch.ten}
              </Txt>
              <Txt size={11} color={A.inkFaint}>
                {faceOf(ch.gameId)?.nameVi ?? ch.gameId}
              </Txt>
              <Rule width={w * 0.3} />
            </View>
            {aiCuaChuong(ch.so).map((ai) => (
              <Hang key={ai.id} ai={ai} sao={sao[ai.id] ?? 0} mo={daMo(ai.id, sao)} onPress={() => router.push(`/vuot-ai/${ai.id}`)} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Một ải. Ải chưa mở thì mờ, không bấm được, và nói rõ điều kiện mở. */
function Hang({ ai, sao, mo, onPress }: { ai: Ai; sao: number; mo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={mo ? onPress : undefined}
      disabled={!mo}
      accessibilityRole="button"
      accessibilityLabel={mo ? `Ải ${ai.ten}, ${sao} sao` : `Ải ${ai.ten}, chưa mở`}
      style={({ pressed }) => [{ borderRadius: R.md, opacity: mo ? 1 : 0.55 }, lift(0.28, 10, 4), press({ pressed })]}
    >
      <Panel radius={R.md} tone={sao > 0 ? 2 : 1} hairline={false} style={{ borderWidth: 1, borderColor: sao > 0 ? A.line : A.lineSoft }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt size={14.5} weight="semi" color={mo ? A.ink : A.inkSoft}>
              {ai.ten}
            </Txt>
            <Txt size={11} color={A.inkFaint} numberOfLines={2}>
              {mo ? `Máy mức ${ai.muc}` : 'Qua ải trước là mở'}
            </Txt>
          </View>
          {mo ? <Sao n={sao} /> : <Icon name="lock" size={16} color={A.inkFaint} />}
        </View>
      </Panel>
    </Pressable>
  );
}
