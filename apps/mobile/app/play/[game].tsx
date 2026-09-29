import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { backToLobby } from '../../src/nav';
import type { BotLevel } from '@co/core';
import { CaroTable } from '../../src/games/co-caro/Table';
import { GanhTable } from '../../src/games/co-ganh/Table';
import { QuanTable } from '../../src/games/o-an-quan/Table';
import { faceOf } from '../../src/games/faces';
import { load, save } from '../../src/net/store';
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
  /**
   * Mức máy **nhớ qua lần mở sau**.
   *
   * Trước đây nó reset về Vừa mỗi lần mở màn, nên người chơi quen mức Khó
   * phải đổi lại mỗi ván — và đổi mức nằm sau một chạm vào nhãn ở góc, nên
   * dễ quên, rồi đánh nửa ván mới nhận ra máy đang chơi dở hẳn.
   */
  const [level, setLevelRaw] = useState<BotLevel>(() => {
    const v = load<number>('muc-may', 2);
    return v === 1 || v === 2 || v === 3 ? (v as BotLevel) : 2;
  });
  const setLevel = (lv: BotLevel) => {
    setLevelRaw(lv);
    save('muc-may', lv);
  };
  const home = () => backToLobby(router);

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
