import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registry } from '@co/core';
import '../../src/catalog';
import { backToLobby } from '../../src/nav';
import { faceOf } from '../../src/games/faces';
import { rulesOf, type Rules } from '../../src/games/rules';
import { Icon } from '../../src/ui/Icon';
import { Btn, Panel, Txt, press } from '../../src/ui/parts';
import { AppBackdrop, Rule } from '../../src/ui/surface';
import { A, R, S, lift } from '../../src/ui/theme';

/**
 * Luật chơi của một bộ môn.
 *
 * Mở được từ mọi chỗ có tên bộ môn: thẻ ở sảnh, và nút hỏi trong màn chơi.
 * Bộ môn **chưa mở** cũng có trang này — người ta muốn biết mình đang chờ
 * cái gì, và một tấm thẻ mờ ghi "sắp có" thì không trả lời được câu đó.
 *
 * Chữ đậm trong luật đánh dấu bằng hai dấu sao, và trang này tự tách ra để
 * in đậm. Một bộ định dạng Markdown đầy đủ cho đúng một kiểu nhấn mạnh là
 * thừa; còn bỏ hẳn phần nhấn mạnh thì mấy câu luật quan trọng nhất chìm
 * lẫn vào đoạn văn.
 */
export default function RulesScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const W = Math.min(width, 460);

  const id = String(game);
  const face = faceOf(id);
  const rules = rulesOf(id);
  // `registry.get` ném khi chưa đăng ký. Trang này mở được cho **cả mười
  // ba** bộ môn, kể cả mười bộ chưa có engine, nên phải hỏi `has`.
  const ready = registry.has(id);

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={W} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : backToLobby(router))}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={press}
        >
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={18} weight="display" style={{ flex: 1 }}>
          Luật {face?.nameVi ?? 'bộ môn'}
        </Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xxl, gap: S.md }}>
        {face ? (
          <View style={{ borderRadius: R.md, overflow: 'hidden', aspectRatio: 100 / 64, borderWidth: 1.2, borderColor: A.goldDeep }}>
            <face.Motif />
          </View>
        ) : null}

        {!rules ? (
          <Panel radius={R.lg} tone={1} seed={13}>
            <View style={{ padding: S.xl, gap: S.sm, alignItems: 'center' }}>
              <Txt size={16} weight="display" center>
                Chưa có bản luật cho bộ môn này
              </Txt>
              <Btn tone="ghost" label="Về sảnh" onPress={() => backToLobby(router)} />
            </View>
          </Panel>
        ) : (
          <>
            <Panel radius={R.lg} tone={2} seed={7} hairline={false} style={[{ borderWidth: 1.2, borderColor: A.goldDeep }, lift(0.35, 12, 5)]}>
              <View style={{ padding: S.lg, gap: S.sm }}>
                <Rich text={rules.tomTat} size={14.5} color={A.ink} />
                <Rule width={100} />
                <Rich text={rules.ban} size={12.5} color={A.inkSoft} />
                {ready ? null : (
                  <Txt size={11.5} color={A.gold} style={{ paddingTop: S.xs }}>
                    Bộ môn này chưa mở.
                  </Txt>
                )}
              </View>
            </Panel>

            <Block title="Cách đi" items={rules.cachDi} />
            <Block title="Thắng thế nào" items={rules.thang} />

            {ready ? (
              <Btn label={`Đấu với máy — ${face?.nameVi ?? ''}`} icon="robot" onPress={() => router.replace(`/play/${id}`)} />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Một khối luật: tiêu đề, rồi từng gạch đầu dòng.
 *
 * Chỉ có hai khối, và cả hai đều là luật. Bản trước có thêm "Hay hiểu sai"
 * và "Mẹo cho người mới" — hai khối ấy là nhận xét và lời khuyên, không
 * phải luật, và chúng đẩy phần luật thật xuống dưới màn hình thứ hai.
 */
function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel radius={R.lg} tone={1} seed={title.length * 11}>
      <View style={{ padding: S.lg, gap: S.sm }}>
        <Txt size={14} weight="display" color={A.ink}>
          {title}
        </Txt>
        {items.map((x, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: S.sm }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: A.goldDeep, marginTop: 8 }} />
            <Rich text={x} size={13} color={A.inkSoft} />
          </View>
        ))}
      </View>
    </Panel>
  );
}

/**
 * Chữ có **nhấn mạnh**.
 *
 * Tách theo cặp hai dấu sao. Không dùng thư viện Markdown: cả tệp luật chỉ
 * dùng đúng một kiểu nhấn mạnh, và kéo cả một bộ phân tích về cho một kiểu
 * là thêm một phụ thuộc để làm ít hơn thứ nó biết làm.
 */
function Rich({ text, size, color }: { text: string; size: number; color: string }) {
  const parts = text.split('**');
  return (
    <Txt size={size} color={color} style={{ flex: 1, lineHeight: Math.round(size * 1.55) }}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Txt key={i} size={size} weight="bold" color={A.ink}>
            {p}
          </Txt>
        ) : (
          p
        ),
      )}
    </Txt>
  );
}
