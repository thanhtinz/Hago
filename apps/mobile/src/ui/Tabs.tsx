import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Txt } from './parts';
import { A, R, S } from './theme';

/**
 * Thẻ và chip chọn, dùng chung cho mọi màn.
 *
 * Bản đầu để ô **chưa chọn** trong suốt với viền `lineSoft` và chữ `inkFaint`.
 * Trên nền gỗ tối, cả ba thứ đó gần như cùng một màu: ô chưa chọn tan vào
 * nền và người dùng chỉ thấy đúng một ô — cái đang chọn — trôi lơ lửng, chứ
 * không đọc ra được đây là một hàng thẻ bấm được.
 *
 * Bản này cho ô chưa chọn **một mặt thật** sáng hơn nền, viền `line` nhìn
 * thấy được, và chữ `inkSoft`. Ô đang chọn vẫn nổi hơn hẳn nhờ nền vàng, viền
 * vàng sáng và chữ đậm — tương phản giữa hai trạng thái không mất đi, chỉ có
 * ô chưa chọn thôi tàng hình.
 */

function shell(on: boolean, extra?: ViewStyle): ViewStyle {
  return {
    backgroundColor: on ? A.goldSoft : A.panel,
    borderWidth: on ? 1.4 : 1.2,
    borderColor: on ? A.gold : A.line,
    ...extra,
  };
}

/** Hàng thẻ chia đều bề ngang. Dùng cho hai tới bốn mục. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; name: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Tiền tố cho nhãn trợ năng, ví dụ "Thẻ" → "Thẻ Lịch sử". */
  label?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: S.sm }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label ? `${label} ${it.name}` : it.name}
            style={{ flex: 1 }}
          >
            <View style={[{ paddingVertical: 9, alignItems: 'center', borderRadius: R.md }, shell(on)]}>
              <Txt size={12.5} weight={on ? 'bold' : 'semi'} color={on ? A.gold : A.inkSoft}>
                {it.name}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Chip đơn, co theo nội dung. Dùng cho bộ lọc và mục chat. */
export function Chip({
  label,
  on,
  badge = 0,
  onPress,
  role = 'tab',
  a11y,
}: {
  label: string;
  on: boolean;
  badge?: number;
  onPress: () => void;
  role?: 'tab' | 'button';
  /**
   * Nhãn trợ năng khi chữ trên chip không đủ rõ một mình.
   *
   * "Cờ Gánh" trong dải lọc trùng với tên thẻ bộ môn ở sảnh, nên nó thành
   * "Lọc Cờ Gánh" — trình đọc màn hình gặp hai nút cùng tên thì người dùng
   * không biết bấm cái nào.
   */
  a11y?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'tab' ? { selected: on } : undefined}
      accessibilityLabel={badge ? `${a11y ?? label}, ${badge} chưa đọc` : (a11y ?? label)}
      style={[
        {
          paddingHorizontal: S.md,
          paddingVertical: 7,
          borderRadius: R.pill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        shell(on),
      ]}
    >
      <Txt size={11.5} weight={on ? 'bold' : 'semi'} color={on ? A.gold : A.inkSoft}>
        {label}
      </Txt>
      {badge > 0 ? (
        <View
          style={{
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: A.seal,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={9} weight="bold" color="#FFF">
            {badge > 9 ? '9+' : badge}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}
