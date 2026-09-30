import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CHIEN_DICH, CHUONG, TONG_SAO, aiCuaChuong, daMo, type Ai } from '@co/protocol';
import { backToLobby } from '../../src/nav';
import { faceOf } from '../../src/games/faces';
import { saoVuotAi } from '../../src/net/store';
import { CHAT_SPACE } from '../../src/ui/FloatingChat';
import { Icon } from '../../src/ui/Icon';
import { Txt, press } from '../../src/ui/parts';
import { Sao } from '../../src/ui/Sao';
import { AppBackdrop, Rule } from '../../src/ui/surface';
import { A, S } from '../../src/ui/theme';

/**
 * Vượt ải: mười ải, ba chương, ba mươi sao — vẽ thành **một con đường dọc**.
 *
 * Bản trước là mười tấm phẳng xếp chồng: tên ải, "Máy mức 2", ba ngôi sao.
 * Đó là một danh sách, và một danh sách không nói được rằng các ải **nối
 * tiếp nhau** — thứ duy nhất làm người ta muốn đi tiếp. Ngữ pháp con đường
 * thì ai cũng đọc được ngay, và tương đương Việt gần nhất của nó là thang
 * cờ thế: giải từng thế một, mỗi thế mấy sao.
 *
 * Tiến độ đọc từ máy chứ không từ máy chủ, nên màn này chạy được cả khi
 * chưa đăng nhập. Đọc lại mỗi lần màn được tập trung, vì người chơi vừa qua
 * một ải rồi quay lui về đây và con số phải đổi ngay.
 */

/** Cao của một chặng đường. Node nằm giữa, dây nối chạy suốt hai mép. */
const CHANG = 104;
/** Node lệch khỏi trục giữa bấy nhiêu, luân phiên trái phải. */
const LECH = 40;

export default function VuotAiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const { chuong } = useLocalSearchParams<{ chuong?: string }>();
  const [sao, setSao] = React.useState<Record<string, number>>({});
  const scroller = React.useRef<ScrollView>(null);
  const moc = React.useRef<Record<number, number>>({});
  useFocusEffect(
    React.useCallback(() => {
      setSao(saoVuotAi());
    }, []),
  );
  const tong = Object.values(sao).reduce((n, x) => n + x, 0);
  // Vào thẳng một chương từ sảnh hoặc từ tấm chọn chế độ: cuộn tới đúng
  // vách ngăn của chương đó thay vì thả người ta ở đầu đường.
  React.useEffect(() => {
    const n = Number(chuong);
    if (!n) return;
    const y = moc.current[n];
    if (y != null) scroller.current?.scrollTo({ y: Math.max(0, y - 12), animated: false });
  }, [chuong, sao]);

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

      <ScrollView ref={scroller} contentContainerStyle={{ paddingBottom: insets.bottom + CHAT_SPACE + S.xxl, paddingTop: S.md }}>
        <Txt size={11.5} color={A.inkFaint} center style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}>
          Vượt ải đánh với máy, không tính điểm và không lên bảng xếp hạng.
        </Txt>

        {CHUONG.map((ch) => {
          const ais = aiCuaChuong(ch.so);
          const face = faceOf(ch.gameId);
          return (
            <View key={ch.so} onLayout={(e) => (moc.current[ch.so] = e.nativeEvent.layout.y)}>
              {/* Vách ngăn chương mang **khung ảnh** của bộ môn chương đó.
                  Trước đây bộ môn chỉ được in bằng chữ, dù mười ba bức
                  tranh đã nằm sẵn trong cùng một tệp. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm }}>
                <View style={{ width: 44, height: 28, borderRadius: 5, overflow: 'hidden', backgroundColor: face?.surface ?? A.panelLo }}>
                  {face ? <face.Motif /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={15} weight="display">
                    Chương {ch.so} · {ch.ten}
                  </Txt>
                  <Txt size={11} color={A.inkFaint}>
                    {face?.nameVi ?? ch.gameId} · {ais.reduce((n, a) => n + (sao[a.id] ?? 0), 0)}/{ais.length * 3} sao
                  </Txt>
                </View>
                <Rule width={40} />
              </View>

              {ais.map((ai, i) => (
                <Chang
                  key={ai.id}
                  ai={ai}
                  so={CHIEN_DICH.findIndex((x) => x.id === ai.id) + 1}
                  thuTu={i}
                  w={w}
                  sao={sao[ai.id] ?? 0}
                  mo={daMo(ai.id, sao)}
                  dauChuong={i === 0}
                  cuoiChuong={i === ais.length - 1}
                  quaTruoc={i === 0 ? true : (sao[ais[i - 1]!.id] ?? 0) > 0}
                  onPress={() => router.push(`/vuot-ai/${ai.id}`)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Một chặng: đoạn dây nối cộng một node.
 *
 * Dây vẽ **trong từng chặng**, không vẽ một đường dài phía sau tất cả: một
 * đường dài đòi biết trước chiều cao của mọi thứ, và ba vách ngăn chương
 * chen vào giữa thì con số đó sai ngay từ lần render đầu.
 */
function Chang({
  ai,
  so,
  thuTu,
  w,
  sao,
  mo,
  dauChuong,
  cuoiChuong,
  quaTruoc,
  onPress,
}: {
  ai: Ai;
  /** Số thứ tự trong cả chiến dịch, in vào node. */
  so: number;
  thuTu: number;
  w: number;
  sao: number;
  mo: boolean;
  dauChuong: boolean;
  cuoiChuong: boolean;
  /** Ải liền trước đã qua: nửa dây phía trên được thắp vàng. */
  quaTruoc: boolean;
  onPress: () => void;
}) {
  const rong = w - S.lg * 2;
  const giua = rong / 2;
  const x = thuTu % 2 === 0 ? giua - LECH : giua + LECH;
  const xTruoc = (thuTu - 1) % 2 === 0 ? giua - LECH : giua + LECH;
  const xSau = (thuTu + 1) % 2 === 0 ? giua - LECH : giua + LECH;
  const tren = (xTruoc + x) / 2;
  const duoi = (x + xSau) / 2;
  const cy = CHANG / 2 + 8;
  const qua = sao > 0;

  return (
    <View style={{ height: CHANG, marginHorizontal: S.lg }}>
      <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Svg width={rong} height={CHANG}>
          {dauChuong ? null : (
            <Path
              d={`M${tren} 0 C${tren} ${cy / 2}, ${x} ${cy / 2}, ${x} ${cy}`}
              stroke={quaTruoc ? A.goldDeep : A.line}
              strokeWidth={2.5}
              fill="none"
              opacity={quaTruoc ? 0.9 : 0.5}
            />
          )}
          {cuoiChuong ? null : (
            <Path
              d={`M${x} ${cy} C${x} ${cy + (CHANG - cy) / 2}, ${duoi} ${cy + (CHANG - cy) / 2}, ${duoi} ${CHANG}`}
              stroke={qua ? A.goldDeep : A.line}
              strokeWidth={2.5}
              fill="none"
              opacity={qua ? 0.9 : 0.4}
            />
          )}
        </Svg>
      </View>

      {/* Sao nổi **phía trên** node, không nằm trong node: ba ngôi sao bên
          trong một vòng tròn 56 điểm thì mỗi ngôi còn 9 điểm và không đếm
          được bằng mắt. */}
      {qua ? (
        <View style={{ position: 'absolute', left: x - 28, top: cy - 46, width: 56, alignItems: 'center' }} pointerEvents="none">
          <Sao n={sao} size={11} />
        </View>
      ) : null}

      <Pressable
        onPress={mo ? onPress : undefined}
        disabled={!mo}
        accessibilityRole="button"
        accessibilityLabel={mo ? `Ải ${ai.ten}, ${sao} sao` : `Ải ${ai.ten}, chưa mở`}
        style={({ pressed }) => [
          {
            position: 'absolute',
            left: x - 28,
            top: cy - 28,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: qua ? A.panelHi : A.panel,
            borderWidth: mo && !qua ? 1.6 : 1.2,
            borderColor: !mo ? A.lineSoft : qua ? A.goldDeep : A.gold,
            opacity: mo ? 1 : 0.55,
          },
          press({ pressed }),
        ]}
      >
        {mo ? (
          <Txt size={17} weight="display" color={qua ? A.gold : A.ink}>
            {so}
          </Txt>
        ) : (
          <Icon name="lock" size={16} color={A.inkFaint} />
        )}
      </Pressable>

      {/* Tên ải nằm **phía đối diện** node, nên hai chặng liền nhau không
          bao giờ chồng chữ lên nhau. */}
      <View
        style={{
          position: 'absolute',
          top: cy - 20,
          left: thuTu % 2 === 0 ? x + 34 : 0,
          width: rong - (x + 34) > 0 && thuTu % 2 === 0 ? rong - (x + 34) : x - 34,
          justifyContent: 'center',
        }}
        pointerEvents="none"
      >
        <Txt size={13.5} weight="semi" color={mo ? A.ink : A.inkSoft} numberOfLines={1} style={{ textAlign: thuTu % 2 === 0 ? 'left' : 'right' }}>
          {ai.ten}
        </Txt>
        <Txt size={11} color={A.inkFaint} numberOfLines={2} style={{ textAlign: thuTu % 2 === 0 ? 'left' : 'right' }}>
          {mo ? `Máy mức ${ai.muc}` : 'Qua ải trước là mở'}
        </Txt>
      </View>
    </View>
  );
}
