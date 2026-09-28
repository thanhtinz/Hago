import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { registry } from '@co/core';
import { COMING_SOON } from '../src/catalog';
import { Btn, Tag, Txt } from '../src/ui/kit';
import { A, R, S } from '../src/ui/theme';
import { caroTheme } from '../src/games/co-caro/theme';

/**
 * Sảnh. Game đã chạy được lấy từ `registry.catalog()` — sảnh không hardcode
 * tên game nào, nên thêm game thứ mười không phải sửa màn này.
 */
export default function Lobby() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ready = registry.catalog();

  return (
    <ScrollView
      contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + 40, gap: S.lg }}
    >
      <View style={{ gap: 4 }}>
        <Txt size={12} weight="bold" color={A.gold} style={{ letterSpacing: 2 }}>
          CỜ VIỆT
        </Txt>
        <Txt size={30} weight="display">
          Chọn bàn cờ
        </Txt>
        <Txt size={13} color={A.inkSoft}>
          Đấu với người thật hoặc với máy. Mỗi bộ môn một không khí riêng.
        </Txt>
      </View>

      {ready.map((spec) => (
        <Pressable key={spec.id} onPress={() => router.push(`/play/${spec.id}`)}>
          <View
            style={{
              borderRadius: R.lg,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: A.line,
              backgroundColor: A.surface,
            }}
          >
            {/* Thẻ mang đúng chất liệu của game bên trong: mở thẻ caro ra là
                thấy trang vở, nên thẻ cũng phải là trang vở. */}
            <CaroPreview />
            <View style={{ padding: S.lg, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <Txt size={19} weight="display" style={{ flex: 1 }}>
                  {spec.nameVi}
                </Txt>
                <Tag label="Chơi được" color="#9BD6A6" bg="#22402A" />
              </View>
              <Txt size={13} color={A.inkSoft}>
                {spec.taglineVi}
              </Txt>
              <View style={{ flexDirection: 'row', gap: S.sm, marginTop: 6 }}>
                <Tag label={`${spec.minSeats}–${spec.maxSeats} người`} />
                <Tag label="Giấy ô ly" />
              </View>
              <Btn label="Vào chơi" onPress={() => router.push(`/play/${spec.id}`)} style={{ marginTop: S.sm }} />
            </View>
          </View>
        </Pressable>
      ))}

      <View style={{ gap: 4, marginTop: S.sm }}>
        <Txt size={15} weight="bold" color={A.inkSoft}>
          Đang dựng
        </Txt>
        <Txt size={12} color={A.inkFaint}>
          Tám bộ môn còn lại, mỗi bộ một chất liệu khác nhau. Chưa hứa ngày.
        </Txt>
      </View>

      <View style={{ gap: S.sm }}>
        {COMING_SOON.map((g) => (
          <View
            key={g.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.md,
              padding: S.md,
              borderRadius: R.md,
              backgroundColor: A.surface,
              borderWidth: 1,
              borderColor: A.line,
              opacity: 0.75,
            }}
          >
            <View style={{ width: 8, height: 40, borderRadius: 4, backgroundColor: g.accent }} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight="bold">
                {g.nameVi}
              </Txt>
              <Txt size={12} color={A.inkFaint} numberOfLines={1}>
                {g.taglineVi}
              </Txt>
            </View>
            <Tag label={g.material} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** Mảnh trang vở nhỏ làm ảnh bìa cho thẻ caro. */
function CaroPreview() {
  const W = 430;
  const H = 120;
  const cell = 24;
  const rows: React.ReactNode[] = [];
  for (let i = 0; i * cell <= W; i++) {
    rows.push(
      <Line
        key={`v${i}`}
        x1={i * cell}
        y1={0}
        x2={i * cell}
        y2={H}
        stroke={i % 5 === 0 ? caroTheme.gridMajor : caroTheme.grid}
        strokeWidth={i % 5 === 0 ? 1.2 : 0.7}
      />,
    );
  }
  for (let i = 0; i * cell <= H; i++) {
    rows.push(
      <Line
        key={`h${i}`}
        x1={0}
        y1={i * cell}
        x2={W}
        y2={i * cell}
        stroke={i % 5 === 0 ? caroTheme.gridMajor : caroTheme.grid}
        strokeWidth={i % 5 === 0 ? 1.2 : 0.7}
      />,
    );
  }
  const mark = (x: number, y: number, kind: 'x' | 'o') =>
    kind === 'x' ? (
      <React.Fragment key={`${x}-${y}`}>
        <Path
          d={`M${x + 5} ${y + 5} Q${x + 12} ${y + 12} ${x + 19} ${y + 19}`}
          stroke={caroTheme.inkBlue}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M${x + 19} ${y + 5} Q${x + 11} ${y + 13} ${x + 5} ${y + 19}`}
          stroke={caroTheme.inkBlue}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
      </React.Fragment>
    ) : (
      <Circle
        key={`${x}-${y}`}
        cx={x + 12}
        cy={y + 12}
        r={7.5}
        stroke={caroTheme.inkRed}
        strokeWidth={2.6}
        fill="none"
      />
    );

  return (
    <View style={{ height: H, backgroundColor: caroTheme.paper }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={W} height={H} fill={caroTheme.paper} />
        {rows}
        <Line x1={cell * 2} y1={0} x2={cell * 2} y2={H} stroke={caroTheme.marginRed} strokeWidth={1.2} opacity={0.6} />
        <Line
          x1={cell * 5 + 12}
          y1={cell * 2 + 12}
          x2={cell * 9 + 12}
          y2={cell * 2 + 12}
          stroke={caroTheme.highlight}
          strokeWidth={20}
          strokeLinecap="round"
          opacity={0.9}
        />
        {[5, 6, 7, 8, 9].map((c) => mark(c * cell, 2 * cell, 'x'))}
        {[4, 5, 6, 7].map((c) => mark(c * cell, 3 * cell, 'o'))}
        {mark(7 * cell, 1 * cell, 'o')}
      </Svg>
    </View>
  );
}
