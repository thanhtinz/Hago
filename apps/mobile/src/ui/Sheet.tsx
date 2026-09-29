import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Txt } from './parts';
import { Panel } from './surface';
import { A, R, S, lift } from './theme';

/**
 * Tấm trượt từ đáy màn hình — khuôn chung cho mọi hộp thoại của app.
 *
 * Trước đây sảnh, màn chơi và chat mỗi nơi tự dựng một tấm riêng. Ba bản
 * chép thì ba độ mờ nền khác nhau, ba bo góc khác nhau, và chỉ một trong ba
 * chừa vùng an toàn ở đáy — trên máy có thanh vuốt thì nút Đóng nằm đúng
 * dưới thanh đó.
 *
 * Nền mờ **bấm được để đóng**, nhưng luôn kèm một nút Đóng thật. Chỉ có nền
 * mờ thì trên màn hình cao, chỗ trống duy nhất để bấm nằm ngoài tầm ngón cái.
 */
export function Sheet({
  title,
  sub,
  onClose,
  children,
  maxHeight,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Cao hơn mức này thì phần thân tự cuộn, không đẩy nút ra khỏi màn. */
  maxHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        onPress={onClose}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 }}
      />
      <Panel radius={R.xl} tone={1} seed={71} style={lift(0.6, 30, -8)}>
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: insets.bottom + S.lg }}>
          <Grip />
          <Txt size={18} weight="display">
            {title}
          </Txt>
          {sub ? (
            <Txt size={11.5} color={A.inkSoft} style={{ paddingBottom: S.xs }}>
              {sub}
            </Txt>
          ) : null}
          {maxHeight ? (
            <ScrollView style={{ maxHeight }} contentContainerStyle={{ gap: S.sm }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
          <Btn label="Đóng" tone="ghost" onPress={onClose} />
        </View>
      </Panel>
    </View>
  );
}

/** Vạch kéo ở mép trên. Nó nói "tấm này trượt được" mà không cần chữ nào. */
function Grip() {
  return (
    <View style={{ alignItems: 'center', paddingBottom: S.xs }}>
      <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: A.line }} />
    </View>
  );
}

/**
 * Hỏi lại trước một việc không lùi được.
 *
 * Xin thua, xoá bạn, xoá tài khoản — những nút đó bấm nhầm một lần là mất
 * hẳn thứ gì đó. Nút đồng ý đặt **bên phải và mang màu của việc sắp làm**
 * (đỏ son cho việc mất mát), nút huỷ để trần: tay quen bấm góc phải thì màu
 * là thứ duy nhất kịp chặn lại.
 */
export function Confirm({
  title,
  body,
  ok,
  tone = 'seal',
  onOk,
  onClose,
}: {
  title: string;
  body?: string;
  ok: string;
  tone?: 'seal' | 'gold';
  onOk: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bỏ qua"
        onPress={onClose}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.6 }}
      />
      <Panel
        radius={R.xl}
        tone={2}
        seed={53}
        hairline={false}
        style={[
          { borderTopWidth: 2, borderTopColor: tone === 'seal' ? A.seal : A.goldDeep },
          lift(0.6, 30, -10),
        ]}
      >
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: insets.bottom + S.lg }}>
          <Grip />
          <Txt size={19} weight="display" center>
            {title}
          </Txt>
          {body ? (
            <Txt size={12.5} color={A.inkSoft} center style={{ paddingBottom: S.xs }}>
              {body}
            </Txt>
          ) : null}
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Btn label="Huỷ" tone="ghost" onPress={onClose} style={{ flex: 1 }} />
            <SealBtn label={ok} tone={tone} onPress={onOk} />
          </View>
        </View>
      </Panel>
    </View>
  );
}

/** Nút đồng ý của hộp xác nhận. Đỏ son là màu duy nhất của việc mất mát. */
function SealBtn({ label, tone, onPress }: { label: string; tone: 'seal' | 'gold'; onPress: () => void }) {
  if (tone === 'gold') return <Btn label={label} onPress={onPress} style={{ flex: 1.3 }} />;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1.3,
          minHeight: 46,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: R.pill,
          backgroundColor: A.seal,
          transform: [{ translateY: pressed ? 1 : 0 }],
          opacity: pressed ? 0.94 : 1,
        },
        lift(0.35, 12, 5),
      ]}
    >
      <Txt size={14} weight="bold" color="#FFF">
        {label}
      </Txt>
    </Pressable>
  );
}
