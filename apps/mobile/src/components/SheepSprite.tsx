import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

/**
 * Cừu trong Sheep Battle — sprite sheet đi bộ thật, không phải icon tĩnh.
 *
 * Asset: "LPC Style Farm Animals" của Daniel Eddeland (CC-BY 3.0), xem
 * assets/farm-animals/CREDITS.md. Sheet 512×512, ô 128×128:
 * hàng 0 quay lưng, 1 quay trái, 2 quay mặt, 3 quay phải; 4 cột là 4 khung bước.
 */

const SHEET = require('../../assets/farm-animals/sheep_walk.png');
const CELL = 128;
const COLS = 4;
const ROWS = 4;
const SHEET_PX = CELL * COLS;

export type SheepDir = 'up' | 'left' | 'down' | 'right';

/**
 * Con cừu chỉ chiếm một góc nhỏ trong ô 128px, phần còn lại là khoảng trong
 * suốt. Cắt sát theo hình thật (đo từ kênh alpha) rồi mới phóng to, không thì
 * cừu bé tí giữa một ô rỗng.
 */
const CROP: Record<SheepDir, { row: number; x: number; y: number; w: number; h: number }> = {
  up: { row: 0, x: 49, y: 38, w: 29, h: 52 },
  left: { row: 1, x: 36, y: 42, w: 51, h: 42 },
  down: { row: 2, x: 49, y: 46, w: 29, h: 44 },
  right: { row: 3, x: 41, y: 42, w: 51, h: 42 },
};

export function SheepSprite({
  size = 48,
  dir = 'up',
  /** Đang di chuyển thì chạy chu kỳ bước chân, đứng yên thì dừng ở khung 0. */
  walking = true,
  /** Nhịp một khung, ms. */
  frameMs = 170,
}: {
  /** Chiều cao hiển thị của con cừu; bề ngang suy ra từ tỉ lệ hình gốc. */
  size?: number;
  dir?: SheepDir;
  walking?: boolean;
  frameMs?: number;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!walking) {
      setFrame(0);
      return;
    }
    // Lệch pha ngẫu nhiên để cả đàn không bước trùng chân nhau.
    const offset = Math.floor(Math.random() * frameMs);
    const start = setTimeout(() => {
      setFrame((f) => (f + 1) % COLS);
    }, offset);
    const timer = setInterval(() => setFrame((f) => (f + 1) % COLS), frameMs);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [walking, frameMs]);

  const crop = CROP[dir];
  const k = size / crop.h;
  return (
    <View style={{ width: crop.w * k, height: size, overflow: 'hidden' }}>
      <Image
        source={SHEET}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: SHEET_PX * k,
          height: CELL * ROWS * k,
          left: -(frame * CELL + crop.x) * k,
          top: -(crop.row * CELL + crop.y) * k,
        }}
      />
    </View>
  );
}

/**
 * Một con cừu trên sân: tự trượt tới ô mới thay vì nhảy cóc mỗi lần server tick,
 * và nảy nhẹ theo nhịp bước.
 */
export function SheepUnit({
  x,
  y,
  size,
  dir,
  moveMs = 620,
  children,
}: {
  x: number;
  y: number;
  size: number;
  dir: SheepDir;
  moveMs?: number;
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
        Animated.timing(hop, { toValue: 1, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hop]);

  const bob = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.06] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: [{ translateX: pos.x }, { translateY: Animated.add(pos.y, bob) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
