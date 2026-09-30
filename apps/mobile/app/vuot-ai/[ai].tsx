import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { aiCuaChuong, aiOf, daMo } from '@co/protocol';
import type { BotLevel } from '@co/core';
import { CaroTable } from '../../src/games/co-caro/Table';
import { GanhTable } from '../../src/games/co-ganh/Table';
import { QuanTable } from '../../src/games/o-an-quan/Table';
import type { AiProp } from '../../src/games/ai';
import { faceOf } from '../../src/games/faces';
import { ghiSao, saoVuotAi } from '../../src/net/store';
import { Icon } from '../../src/ui/Icon';
import { Sheet } from '../../src/ui/Sheet';
import { Btn, Panel, Txt } from '../../src/ui/parts';
import { Sao } from '../../src/ui/Sao';
import { AppBackdrop } from '../../src/ui/surface';
import { A, R, S } from '../../src/ui/theme';

/**
 * Một ải.
 *
 * Dùng lại **đúng ba bàn cờ của chế độ đấu máy**, chỉ truyền thêm cấu hình
 * luật, hạt giống ghim và một lời gọi lại khi ván xong. Không có bàn cờ
 * "phiên bản vượt ải" riêng — một bản sao sẽ trôi khỏi bản gốc sau vài lần
 * sửa, và lúc đó ải chơi khác ván thường mà không ai cố ý.
 */
export default function AiScreen() {
  const { ai: aiId } = useLocalSearchParams<{ ai: string }>();
  const router = useRouter();
  const ai = aiOf(String(aiId));
  const [sao, setSao] = React.useState<number | null>(null);

  const prop: AiProp | undefined = React.useMemo(
    () =>
      ai
        ? {
            config: ai.config,
            hat: ai.hat,
            onXong: (n) => {
              ghiSao(ai.id, n);
              setSao(n);
            },
          }
        : undefined,
    [ai?.id],
  );

  if (!ai || !prop) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl }}>
        <AppBackdrop width={420} height={900} />
        <Txt size={16} weight="display">
          Không có ải này
        </Txt>
        <Btn tone="ghost" label="Về danh sách ải" onPress={() => router.replace('/vuot-ai')} />
      </View>
    );
  }

  const home = () => router.replace('/vuot-ai');
  const level = ai.muc as BotLevel;
  const noop = () => {};
  const Ban =
    ai.gameId === 'co-caro' ? CaroTable : ai.gameId === 'co-ganh' ? GanhTable : QuanTable;

  return (
    <View style={{ flex: 1 }}>
      <Ban level={level} onLevel={noop} onHome={home} ai={prop} />
      {sao !== null ? <KetQua ai={ai} sao={sao} onHome={home} onLai={() => router.replace(`/vuot-ai/${ai.id}`)} onSau={(id) => router.replace(`/vuot-ai/${id}`)} /> : null}
    </View>
  );
}

/**
 * Tấm chấm sao sau khi ván trong ải kết thúc.
 *
 * Nói rõ **từng điều kiện** đã đạt hay chưa. Chỉ hiện ba ngôi sao thì người
 * chơi được hai sao không biết mình thiếu gì, và ba điều kiện lồng nhau
 * càng khó đoán.
 */
function KetQua({
  ai,
  sao,
  onHome,
  onLai,
  onSau,
}: {
  ai: NonNullable<ReturnType<typeof aiOf>>;
  sao: number;
  onHome: () => void;
  onLai: () => void;
  onSau: (id: string) => void;
}) {
  const trong = aiCuaChuong(ai.chuong);
  const i = trong.findIndex((a) => a.id === ai.id);
  const sauDo = trong[i + 1];
  const moDuoc = sauDo ? daMo(sauDo.id, saoVuotAi()) : false;
  return (
    <Sheet title={sao > 0 ? `Qua ải ${ai.ten}` : `Chưa qua ải ${ai.ten}`} sub={faceOf(ai.gameId)?.nameVi ?? ai.gameId} onClose={onHome}>
      <View style={{ alignItems: 'center', paddingVertical: S.md }}>
        <Sao n={sao} size={34} />
      </View>
      <Panel radius={R.md} tone={1}>
        <View style={{ padding: S.lg, gap: S.sm }}>
          <DieuKien dat={sao >= 1} chu="Thắng ván" />
          <DieuKien dat={sao >= 2} chu="Không dùng gợi ý" />
          <DieuKien dat={sao >= 3} chu="Không lùi lại nước nào" />
        </View>
      </Panel>
      <View style={{ gap: S.sm, paddingTop: S.md }}>
        {sauDo && moDuoc ? <Btn label={`Ải sau · ${sauDo.ten}`} icon="chevron" onPress={() => onSau(sauDo.id)} /> : null}
        <Btn tone="ghost" label="Đánh lại ải này" onPress={onLai} />
        <Btn tone="ghost" label="Về danh sách ải" onPress={onHome} />
      </View>
    </Sheet>
  );
}

function DieuKien({ dat, chu }: { dat: boolean; chu: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      <Icon name={dat ? 'check' : 'close'} size={14} color={dat ? A.jade : A.inkFaint} />
      <Txt size={13} color={dat ? A.ink : A.inkFaint}>
        {chu}
      </Txt>
    </View>
  );
}
