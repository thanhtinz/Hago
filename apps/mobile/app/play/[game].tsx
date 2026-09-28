import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BotLevel } from '@co/core';
import { CaroTable } from '../../src/games/co-caro/Table';
import { GanhTable } from '../../src/games/co-ganh/Table';
import { QuanTable } from '../../src/games/o-an-quan/Table';
import { faceOf } from '../../src/games/faces';
import { Btn, Txt } from '../../src/ui/parts';
import { AppBackdrop } from '../../src/ui/surface';
import { S } from '../../src/ui/theme';

/**
 * Màn chơi — chọn bàn theo bộ môn.
 *
 * Mỗi game một `Table` riêng vì bàn cờ, cách chạm và chất liệu đều khác
 * nhau; nhưng tất cả dùng chung `MatchShell`, nên thanh người chơi, đồng hồ,
 * nút đầu hàng và tấm kết quả chỉ có một bản.
 */
export default function PlayScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const router = useRouter();
  const [level, setLevel] = useState<BotLevel>(2);
  const home = () => router.replace('/');

  if (game === 'co-caro') return <CaroTable level={level} onLevel={setLevel} onHome={home} />;
  if (game === 'co-ganh') return <GanhTable level={level} onLevel={setLevel} onHome={home} />;
  if (game === 'o-an-quan') return <QuanTable level={level} onLevel={setLevel} onHome={home} />;

  const face = faceOf(String(game));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl }}>
      <AppBackdrop width={420} height={900} />
      <Txt size={17} weight="display">
        {face ? `${face.nameVi} chưa mở` : 'Bộ môn này chưa mở'}
      </Txt>
      <Btn label="Về sảnh" tone="ghost" onPress={home} />
    </View>
  );
}
