import React from 'react';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from './ui';
import { Art, ArtName } from './Art';
import { C, R } from '../theme';
import { useStore } from '../state/store';

/**
 * Nơi cosmetic thật sự hiện ra.
 *
 * Trước đây chỉ khung avatar có tác dụng, bảy loại còn lại nhặt được mà không
 * thấy gì. Mọi thứ ở đây đọc màu từ payload của cosmetic trên server chứ không
 * giữ bảng hardcode, nên thêm món mới là app hiện đúng ngay.
 */

/** Danh hiệu hiện dưới tên người chơi. */
export function PlayerTitle({
  titleId,
  size = 11,
  center,
}: {
  titleId?: string | null;
  size?: number;
  center?: boolean;
}) {
  const { cosmetic } = useStore();
  const item = cosmetic(titleId);
  if (!item) return null;
  const text = item.payload.text ?? item.name;
  return (
    <View
      style={{
        alignSelf: center ? 'center' : 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: R.pill,
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderWidth: 1,
        borderColor: item.payload.color ?? C.secondary,
      }}
    >
      <Txt size={size} weight="bold" color={item.payload.color ?? C.secondary}>
        {text}
      </Txt>
    </View>
  );
}

/** Nền hồ sơ: cặp màu gradient thay cho gradient mặc định của app. */
export function useBackgroundColors(backgroundId?: string | null): [string, string] | null {
  const { cosmetic } = useStore();
  const item = cosmetic(backgroundId);
  if (!item?.payload?.from || !item.payload.to) return null;
  return [item.payload.from, item.payload.to];
}

/** Bong bóng chat: màu nền và màu chữ cho tin của chính mình. */
export function useBubbleStyle(bubbleId?: string | null): { bg: string; text: string } | null {
  const { cosmetic } = useStore();
  const item = cosmetic(bubbleId);
  if (!item?.payload?.bg) return null;
  return { bg: item.payload.bg, text: item.payload.text ?? C.ink };
}

/**
 * Theme bàn cờ đang dùng của chính mình. Chỉ đổi màu mặt bàn và đường kẻ nên
 * áp cho bàn nào cũng được, không đụng tới luật chơi.
 */
export function useBoardTheme(): { from: string; to: string; line: string } | null {
  const { profile, cosmetic } = useStore();
  const item = cosmetic(profile?.boardId);
  if (!item?.payload?.from) return null;
  return {
    from: item.payload.from,
    to: item.payload.to ?? item.payload.from,
    line: item.payload.line ?? 'rgba(0,0,0,0.25)',
  };
}

/** Gói emote: sticker cộng thêm vào thanh sticker mặc định. */
export function useEmotePack(): string[] {
  const { profile, cosmetic } = useStore();
  const item = cosmetic(profile?.emoteId);
  return item?.payload?.stickers ? item.payload.stickers.split(',').filter(Boolean) : [];
}

/** Một mảnh bay ra rồi rơi xuống của hiệu ứng ăn mừng. */
function Spark({ index, total, art, color, big }: { index: number; total: number; art: ArtName; color: string; big: boolean }) {
  const t = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: big ? 1800 : 1400,
      delay: index * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, index, big]);

  // Toả đều quanh vòng tròn rồi rơi xuống — quỹ đạo pháo giấy quen thuộc.
  const angle = (index / total) * Math.PI * 2;
  const reach = big ? 190 : 130;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        opacity: t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * reach] }) },
          {
            translateY: t.interpolate({
              inputRange: [0, 0.55, 1],
              outputRange: [0, Math.sin(angle) * reach * 0.7, Math.sin(angle) * reach * 0.7 + 130],
            }),
          },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${index % 2 ? 360 : -360}deg`] }) },
          { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.7] }) },
        ],
      }}
    >
      <Art name={art} size={big ? 22 : 16} color={color} glyph />
    </Animated.View>
  );
}

/**
 * Hiệu ứng ăn mừng khi thắng. `kind` lấy từ payload của cosmetic: `confetti`
 * bắn mảnh nhỏ, `fireworks` bắn to và nhiều hơn.
 */
export function VictoryEffect({ victoryId }: { victoryId?: string | null }) {
  const { cosmetic } = useStore();
  const item = cosmetic(victoryId);
  if (!item) return null;
  const big = item.payload.kind === 'fireworks';
  const color = item.payload.color ?? C.sun;
  const count = big ? 18 : 12;
  const arts: ArtName[] = big ? ['star', 'gem', 'fire'] : ['star', 'happy', 'love'];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: count }, (_, i) => (
        <Spark key={i} index={i} total={count} art={arts[i % arts.length]} color={color} big={big} />
      ))}
    </View>
  );
}

/**
 * Hiệu ứng lúc vào phòng: một vệt sáng quét ngang rồi tắt. Nhẹ hơn hiệu ứng
 * thắng vì nó chạy mỗi lần mở màn phòng.
 */
export function EntryEffect({ entryId }: { entryId?: string | null }) {
  const { cosmetic } = useStore();
  const item = cosmetic(entryId);
  const t = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!item) return;
    Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t, item]);
  if (!item) return null;
  const color = item.payload.color ?? C.primary;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 220,
        opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.85, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-60, 90] }) }],
      }}
    >
      <LinearGradient colors={[`${color}00`, color, `${color}00`]} style={{ flex: 1 }} />
    </Animated.View>
  );
}
