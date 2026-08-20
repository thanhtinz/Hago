import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { SHEEP_STRIPS, SheepAnim, SheepTeam, sheepBadge, sheepStrip } from '../art/sheepFight';

/**
 * Cừu trong Sheep Battle — sprite thật của game Sheep Fight, mỗi bậc hợp thể là
 * một giống cừu riêng: cừu non chưa có sừng, nhú sừng, sừng xoắn, đeo băng đầu,
 * cừu chúa sừng vàng mặt dữ. Hai phe khác hẳn nhau chứ không chỉ đổi màu: đàn
 * trắng nhìn từ sau lưng (đang đi lên), đàn đen nhìn chính diện (đang đi xuống).
 *
 * Art: TomoSheepFight của Do Trung Kien (MIT) — assets/sheep-fight/CREDITS.md.
 */

export function SheepSprite({
  tier = 1,
  team = 'w',
  anim = 'walk',
  size = 48,
  /** Đứng yên thì dừng ở khung đầu. */
  animated = true,
  frameMs = 120,
}: {
  tier?: number;
  team?: SheepTeam;
  anim?: SheepAnim;
  /** Chiều cao hiển thị; bề ngang suy ra từ tỉ lệ khung gốc. */
  size?: number;
  animated?: boolean;
  frameMs?: number;
}) {
  const strip = sheepStrip(tier, team, anim);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animated) {
      setFrame(0);
      return;
    }
    // Lệch pha ngẫu nhiên để cả đàn không bước trùng chân nhau.
    const kick = setTimeout(() => setFrame((f) => (f + 1) % strip.count), Math.floor(Math.random() * frameMs));
    const timer = setInterval(() => setFrame((f) => (f + 1) % strip.count), frameMs);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
    };
  }, [animated, frameMs, strip.count]);

  const k = size / strip.h;
  const i = frame % strip.count;
  return (
    <View style={{ width: strip.w * k, height: size, overflow: 'hidden' }}>
      <Image
        source={strip.src}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: strip.w * strip.count * k,
          height: size,
          left: -i * strip.w * k,
          top: 0,
        }}
      />
    </View>
  );
}

/** Icon cấp cừu — dùng cho hàng chờ và chú thích. */
export function SheepBadge({ tier, team = 'w', size = 30 }: { tier: number; team?: SheepTeam; size?: number }) {
  return <Image source={sheepBadge(tier, team)} resizeMode="contain" style={{ width: size, height: size }} />;
}

/**
 * Một con cừu trên sân: tự trượt tới ô mới thay vì nhảy cóc mỗi lần server tick,
 * nảy nhẹ theo nhịp bước, và giật lùi một cái khi đang húc nhau.
 */
export function SheepUnit({
  x,
  y,
  width,
  height,
  moveMs = 620,
  clashing,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  moveMs?: number;
  clashing?: boolean;
  children?: React.ReactNode;
}) {
  const pos = useRef(new Animated.ValueXY({ x, y })).current;
  const hop = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      pos.setValue({ x, y });
      return;
    }
    Animated.timing(pos, {
      toValue: { x, y },
      duration: moveMs,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [x, y, moveMs, pos]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: clashing ? 90 : 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: clashing ? 90 : 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hop, clashing]);

  const bob = hop.interpolate({ inputRange: [0, 1], outputRange: [0, clashing ? -height * 0.1 : -height * 0.05] });

  return (
    <Animated.View
      // Cừu không được nuốt cú chạm — vùng chạm thả cừu nằm dưới nó.
      pointerEvents="none"
      style={{
        position: 'absolute',
        width,
        height,
        alignItems: 'center',
        justifyContent: 'flex-end',
        transform: [{ translateX: pos.x }, { translateY: Animated.add(pos.y, bob) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Hiệu ứng nhiều khung của bộ art (bụi húc nhau, vệt sáng làn).
 * `loop = false` thì chạy hết một lượt rồi tắt.
 */
export function SheepEffect({
  name,
  width,
  height,
  frameMs = 70,
  loop = true,
  opacity = 1,
}: {
  name: 'push-effect' | 'lane-effect';
  width: number;
  height: number;
  frameMs?: number;
  loop?: boolean;
  opacity?: number;
}) {
  const strip = SHEEP_STRIPS[name];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const timer = setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (next >= strip.count) return loop ? 0 : strip.count - 1;
        return next;
      });
    }, frameMs);
    return () => clearInterval(timer);
  }, [strip.count, frameMs, loop, name]);

  return (
    <View style={{ width, height, overflow: 'hidden', opacity }} pointerEvents="none">
      <Image
        source={strip.src}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: width * strip.count,
          height,
          left: -frame * width,
          top: 0,
        }}
      />
    </View>
  );
}
