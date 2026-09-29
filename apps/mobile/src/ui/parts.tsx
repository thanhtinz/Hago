import React, { useState } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { GoldFill, Panel } from './surface';

export { Panel } from './surface';
import { A, F, R, S, glow, lift } from './theme';

/**
 * Chữ.
 *
 * Hai bộ chữ, chia việc rõ ràng: **Playfair Display** cho tiêu đề, **Be
 * Vietnam Pro** cho mọi thứ còn lại. Trước đây dùng chữ hệ thống ở khắp nơi —
 * đó là thứ làm một app trông rẻ nhanh nhất, vì nó giống hệt mọi app khác trên
 * máy. Be Vietnam Pro còn là bộ chữ dựng riêng cho tiếng Việt, nên dấu không
 * bị chèn lên chữ hoa như mấy bộ sans quốc tế.
 */
/**
 * Phản hồi khi ngón chạm xuống, dùng chung cho mọi `Pressable` tự dựng.
 *
 * `Btn` và `IconBtn` đã có sẵn từ đầu, nhưng ba mươi tám chỗ `Pressable`
 * khác trong app thì không đổi lấy một pixel khi bấm — và "nút không phản
 * hồi khi chạm là lỗi cảm giác lớn nhất trên di động" là luật do chính
 * tệp này viết ra. Một hàm để không chỗ nào còn cớ bỏ qua.
 */
export const press = ({ pressed }: { pressed: boolean }): ViewStyle => ({
  opacity: pressed ? 0.82 : 1,
  transform: [{ translateY: pressed ? 1 : 0 }],
});

/** Vùng chạm nới thêm cho nút nhỏ hơn 44 điểm mà bố cục không cho cao hơn. */
export const SLOP = { top: 12, bottom: 12, left: 16, right: 16 } as const;

export function Txt({
  children,
  size = 14,
  weight = 'regular',
  color = A.ink,
  center,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: 'regular' | 'semi' | 'bold' | 'display' | 'displayHeavy';
  color?: string;
  center?: boolean;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  const family =
    weight === 'display'
      ? F.display
      : weight === 'displayHeavy'
        ? F.displayHeavy
        : weight === 'bold'
          ? F.bodyBold
          : weight === 'semi'
            ? F.bodySemi
            : F.body;
  const isDisplay = weight === 'display' || weight === 'displayHeavy';
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: family,
          fontSize: size,
          lineHeight: Math.round(size * (isDisplay ? 1.25 : 1.4)),
          color,
          letterSpacing: isDisplay ? 0.2 : 0,
          textAlign: center ? 'center' : 'auto',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Đo bề rộng để đặt tấm gradient phía sau. */
function useBox() {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - box.w) > 0.5 || Math.abs(height - box.h) > 0.5) setBox({ w: width, h: height });
  };
  return [box, onLayout] as const;
}

/**
 * Nút.
 *
 * `gold` là nút chính: một thỏi kim loại đánh bóng, có vệt loé và quầng sáng.
 * Cả màn hình chỉ được có **một** nút như vậy — hai thỏi vàng cạnh nhau thì
 * không cái nào còn là chính nữa.
 */
export function Btn({
  label,
  sub,
  icon,
  onPress,
  tone = 'gold',
  size = 'md',
  disabled,
  style,
}: {
  label: string;
  sub?: string;
  icon?: IconName;
  onPress?: () => void;
  tone?: 'gold' | 'wood' | 'ghost';
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [box, onLayout] = useBox();
  const lg = size === 'lg';
  const radius = lg ? R.lg : R.pill;
  const fg = disabled ? A.inkFaint : tone === 'gold' ? A.onGold : A.ink;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed }) => [
        {
          minHeight: lg ? 66 : 46,
          flexDirection: 'row',
          gap: S.md,
          paddingHorizontal: lg ? S.xl : S.lg,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: disabled ? A.panelLo : tone === 'gold' ? A.goldDeep : tone === 'wood' ? A.panel : 'transparent',
          borderWidth: tone === 'gold' ? 0 : 1.2,
          borderColor: tone === 'ghost' ? A.line : A.lineSoft,
          // Bấm xuống thì lún: dịch 1px và giảm quầng sáng. Nút không phản hồi
          // khi chạm là lỗi cảm giác lớn nhất trên di động.
          transform: [{ translateY: pressed ? 1 : 0 }],
          opacity: pressed ? 0.94 : 1,
        },
        tone === 'gold' && !disabled ? glow(0.38, lg ? 20 : 12) : lift(0.3, 10, 4),
        style,
      ]}
    >
      {tone === 'gold' && !disabled && box.w > 0 ? <GoldFill width={box.w} height={box.h} radius={radius} /> : null}
      {/* Icon và chữ phải nằm chung một View, không đặt thẳng làm con của
          Pressable bên cạnh tấm vàng. Tấm vàng là SVG định vị tuyệt đối, và
          trên web nó phủ lên mọi phần tử tĩnh đứng cạnh: chữ vẫn đè lên
          được, còn icon thì biến mất hẳn. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        {icon ? <Icon name={icon} size={lg ? 27 : 18} color={fg} strokeWidth={2} /> : null}
        <View>
          <Txt weight={lg ? 'display' : 'bold'} size={lg ? 19 : 14} color={fg}>
            {label}
          </Txt>
          {sub ? (
            <Txt size={12} color={fg} style={{ opacity: 0.75 }}>
              {sub}
            </Txt>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Tag({ label, color = A.inkSoft, bg = A.goldSoft }: { label: string; color?: string; bg?: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: R.pill,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Txt size={10.5} weight="bold" color={color}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * Ảnh đại diện: một đồng xu gỗ có vành vàng, chữ cái đầu khắc ở giữa. Vòng
 * tròn xám trơn thì hai bên trông giống hệt nhau.
 */
export function Avatar({ name, size = 42, active }: { name: string; size?: number; active?: boolean }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: A.panelHi,
          borderWidth: active ? 2 : 1.2,
          borderColor: active ? A.gold : A.line,
        },
        active ? glow(0.35, 10) : undefined,
      ]}
    >
      <Txt size={size * 0.4} weight="display" color={active ? A.gold : A.inkSoft}>
        {letter}
      </Txt>
    </View>
  );
}

/**
 * Nút chỉ có icon, khắc chìm vào mặt gỗ. Vẫn có nhãn đọc màn hình và vùng
 * chạm 48px — icon không tự nói nó làm gì cho người dùng trình đọc màn hình.
 */
export function IconBtn({
  name,
  label,
  onPress,
  tone = 'plain',
  disabled,
}: {
  name: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'plain' | 'seal' | 'gold';
  disabled?: boolean;
}) {
  const fg = disabled ? A.inkFaint : tone === 'seal' ? A.sealLit : tone === 'gold' ? A.gold : A.inkSoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      // Nút tắt phải mờ hẳn cả tấm, không chỉ nhạt chữ. Chỉ đổi màu chữ
      // thì trên nền gỗ sẫm gần như không thấy khác gì, người chơi cứ bấm
      // mãi vào một nút không phản ứng.
      style={({ pressed }) => ({
        flex: 1,
        opacity: disabled ? 0.42 : pressed ? 0.8 : 1,
        transform: [{ translateY: pressed && !disabled ? 1 : 0 }],
      })}
    >
      <Panel
        radius={R.md}
        tone={1}
        seed={name.length * 13}
        style={{ minHeight: 52 }}
      >
        {/* Nội dung phải nằm trong một View riêng, không đặt thẳng làm con của
            Panel: tấm gỗ nền là một SVG định vị tuyệt đối, và trên web nó phủ
            lên mọi phần tử tĩnh đứng cạnh — chữ thì đè lên được, icon thì mất
            hẳn. Bọc một lớp là xong. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6 }}>
          <Icon name={name} size={20} color={fg} />
          <Txt size={10.5} weight="semi" color={fg}>
            {label}
          </Txt>
        </View>
      </Panel>
    </Pressable>
  );
}

/**
 * Đồng hồ.
 *
 * Ở mọi app cờ online, đồng hồ là thứ mắt liếc nhiều nhất sau bàn cờ. Nó dùng
 * chữ số đều bề ngang để không nhảy chỗ mỗi giây, sáng lên khi tới lượt, và
 * chuyển đỏ son khi dưới 20 giây.
 */
export function Clock({ ms, running, low = 20000 }: { ms: number; running?: boolean; low?: number }) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  const urgent = ms <= low;
  const fg = urgent ? A.sealLit : running ? A.goldLit : A.inkFaint;
  return (
    <View
      style={[
        {
          paddingHorizontal: S.md,
          paddingVertical: 6,
          borderRadius: R.sm,
          minWidth: 82,
          alignItems: 'center',
          backgroundColor: urgent ? A.sealSoft : running ? A.panelLo : 'transparent',
          borderWidth: 1.2,
          borderColor: urgent ? A.seal : running ? A.goldDeep : A.lineSoft,
        },
        running && !urgent ? glow(0.25, 8) : undefined,
      ]}
    >
      <Text
        style={{
          fontFamily: F.bodyBold,
          fontVariant: ['tabular-nums'],
          fontSize: 19,
          color: fg,
        }}
      >
        {mm}:{String(ss).padStart(2, '0')}
      </Text>
    </View>
  );
}
