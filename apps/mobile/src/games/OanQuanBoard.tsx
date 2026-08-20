import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

/** Bố cục dân gian: hàng dưới là ô của người chơi ghế 0, hàng trên của ghế 1. */
export default function OanQuanBoard({ view, mySeat, send, deadline }: BoardProps) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const mine: number[] = view.own?.[mySeat] ?? [1, 2, 3, 4, 5];
  const topRow = [11, 10, 9, 8, 7];
  const bottomRow = [1, 2, 3, 4, 5];

  const sow = (dir: number) => {
    if (picked == null) return;
    send('sow', { cell: picked, dir });
    setPicked(null);
  };

  const Cell = ({ index }: { index: number }) => {
    const count = view.cells[index];
    const own = mine.includes(index);
    const selectable = yourTurn && own && count > 0;
    const inPath = view.lastPath?.includes(index);
    return (
      <Pressable
        disabled={!selectable}
        onPress={() => setPicked(index)}
        style={{
          flex: 1,
          height: 74,
          margin: 3,
          borderRadius: R.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: picked === index ? '#FFE0B2' : inPath ? '#FFF2DC' : '#F7E4CB',
          borderWidth: 2,
          borderColor: picked === index ? C.primary : own ? SEAT_COLORS[mine === view.own?.[0] ? 0 : 1] + '55' : '#E0C7A5',
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 44, justifyContent: 'center' }}>
          {Array.from({ length: Math.min(count, 8) }, (_, i) => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8C5A32', margin: 1 }} />
          ))}
        </View>
        <Txt size={13} weight="display" color="#6B4423">
          {count}
        </Txt>
      </Pressable>
    );
  };

  const Quan = ({ index, side }: { index: number; side: 0 | 1 }) => (
    <View
      style={{
        width: 62,
        height: 158,
        borderRadius: 40,
        backgroundColor: view.quan[side] ? '#E8B14D' : '#D8CFC2',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 3,
        borderWidth: 3,
        borderColor: '#B98A2E',
      }}
    >
      <Text style={{ fontSize: 26 }}>{view.quan[side] ? '🪨' : '⚪'}</Text>
      <Txt size={11} weight="bold" color="#6B4423">
        {view.quan[side] ? `Quan ${view.quanValue}đ` : 'Quan đã bị ăn'}
      </Txt>
      <Txt size={10} color="#8C6239">
        +{view.cells[index]} dân
      </Txt>
    </View>
  );

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PlayerStrip
          players={view.players}
          activeSeat={view.turnSeat}
          mySeat={mySeat}
          extra={(seat) => <Chip label={`${view.scores?.[seat] ?? 0}đ`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />}
        />
        <TurnTimer deadline={deadline} total={35} />
      </View>
      <TurnBanner
        yourTurn={yourTurn}
        text={view.over ? 'Tàn cuộc' : yourTurn ? (picked == null ? 'Chọn 1 ô của bạn' : 'Chọn hướng rải') : 'Đối thủ đang tính nước...'}
      />

      <View style={{ backgroundColor: '#EFD9B8', padding: 8, borderRadius: R.lg, borderWidth: 3, borderColor: '#C99C6B', flexDirection: 'row', alignItems: 'center' }}>
        <Quan index={0} side={0} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            {topRow.map((i) => (
              <Cell key={i} index={i} />
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {bottomRow.map((i) => (
              <Cell key={i} index={i} />
            ))}
          </View>
        </View>
        <Quan index={6} side={1} />
      </View>

      {picked != null ? (
        <View style={{ flexDirection: 'row', gap: S.md, justifyContent: 'center' }}>
          <Btn label="Rải ngược" icon="⬅️" tone="secondary" onPress={() => sow(-1)} />
          <Btn label="Rải xuôi" icon="➡️" onPress={() => sow(1)} />
          <Btn label="Huỷ" tone="ghost" onPress={() => setPicked(null)} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {view.players.map((p: any, i: number) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Txt size={11} color={C.inkFaint}>
              {p.name}
            </Txt>
            <Txt size={18} weight="display" color={SEAT_COLORS[i]}>
              {view.scores?.[i] ?? 0}
            </Txt>
          </View>
        ))}
      </View>
      <GameLog log={view.log} />
    </View>
  );
}
