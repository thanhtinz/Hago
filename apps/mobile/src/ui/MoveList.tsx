import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { byTurn } from '../games/notation';
import { Txt } from './parts';
import { A, R, S } from './theme';

/**
 * Biên bản nước đi.
 *
 * Hai cột, đánh số lượt — đúng cách một biên bản cờ chép tay trông thế nào.
 * Không có nó thì "đối thủ vừa đi đâu" chỉ trả lời được bằng cách nhớ, và
 * "ván này đã đi bao nhiêu nước rồi" thì không trả lời được.
 *
 * Tự cuộn xuống nước mới nhất, nhưng **chỉ khi đang ở đáy**: người chơi
 * đang cuộn lên xem lại khai cuộc mà bị kéo tuột xuống mỗi nước đi thì
 * biên bản thành thứ không đọc được.
 */
export function MoveList({
  gameId,
  moves,
  mySeat,
  height,
}: {
  gameId: string;
  moves: { seat: number; a: unknown }[];
  mySeat: number | null;
  height?: number;
}) {
  const rows = byTurn(gameId, moves);
  const ref = useRef<ScrollView>(null);
  const atEnd = useRef(true);

  useEffect(() => {
    if (atEnd.current) ref.current?.scrollToEnd({ animated: true });
  }, [rows.length]);

  if (!rows.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: S.xl }}>
        <Txt size={12.5} color={A.inkFaint} center>
          Chưa có nước nào. Biên bản hiện dần theo ván.
        </Txt>
      </View>
    );
  }

  return (
    <ScrollView
      ref={ref}
      style={height ? { maxHeight: height } : undefined}
      contentContainerStyle={{ gap: 2 }}
      showsVerticalScrollIndicator={false}
      onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        atEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
      }}
      scrollEventThrottle={64}
    >
      {/* Hàng tiêu đề nói rõ cột nào là ai. "Ghế 0 / ghế 1" thì đúng về kỹ
          thuật nhưng người chơi không biết mình là ghế mấy. */}
      <View style={{ flexDirection: 'row', paddingBottom: 4 }}>
        <Txt size={11} color={A.inkFaint} style={{ width: 34 }}>
          Lượt
        </Txt>
        <Txt size={11} color={mySeat === 0 ? A.gold : A.inkFaint} style={{ flex: 1 }}>
          {mySeat === 0 ? 'Bạn' : 'Đi trước'}
        </Txt>
        <Txt size={11} color={mySeat === 1 ? A.gold : A.inkFaint} style={{ flex: 1 }}>
          {mySeat === 1 ? 'Bạn' : 'Đi sau'}
        </Txt>
      </View>
      {rows.map((r, i) => (
        <View
          key={r.n}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 5,
            paddingHorizontal: 6,
            borderRadius: R.sm,
            // Kẻ sọc nhạt cách dòng: bàn cờ nào cũng có ván trăm nước, và
            // mắt trượt dòng ở cột số là đọc nhầm cả lượt.
            backgroundColor: i % 2 ? '#00000024' : 'transparent',
          }}
        >
          <Txt size={12} color={A.inkFaint} style={{ width: 34, fontVariant: ['tabular-nums'] }}>
            {r.n}.
          </Txt>
          <Txt size={13} weight="semi" color={A.ink} style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
            {r.a || '—'}
          </Txt>
          <Txt size={13} weight="semi" color={A.ink} style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
            {r.b || (i === rows.length - 1 ? '…' : '—')}
          </Txt>
        </View>
      ))}
    </ScrollView>
  );
}
