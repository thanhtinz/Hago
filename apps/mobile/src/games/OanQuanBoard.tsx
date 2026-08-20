import React from 'react';
import { ImageBackground, Pressable, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { Chibi } from './chibiAssets';
import { ChibiImg } from './ChibiImg';
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
          height: 78,
          margin: 3,
          borderRadius: R.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: picked === index ? '#FFE0B2' : inPath ? '#FFF2DC' : 'rgba(247,228,203,0.92)',
          borderWidth: 2,
          borderColor: picked === index ? C.primary : own ? SEAT_COLORS[mine === view.own?.[0] ? 0 : 1] + '55' : '#E0C7A5',
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 48, justifyContent: 'center', minHeight: 28 }}>
          {Array.from({ length: Math.min(count, 8) }, (_, i) => (
            <ChibiImg key={i} source={Chibi.oanquan.seed} size={12} />
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
        width: 64,
        height: 164,
        borderRadius: 40,
        backgroundColor: view.quan[side] ? '#F5D48A' : '#D8CFC2',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 3,
        borderWidth: 3,
        borderColor: '#B98A2E',
        gap: 4,
        paddingVertical: 8,
      }}
    >
      <ChibiImg source={view.quan[side] ? Chibi.oanquan.quan : Chibi.oanquan.quanEmpty} size={44} />
      <Txt size={10} weight="bold" color="#6B4423" center>
        {view.quan[side] ? `Quan ${view.quanValue}đ` : 'Đã bị ăn'}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 48 }}>
        {Array.from({ length: Math.min(view.cells[index], 6) }, (_, i) => (
          <ChibiImg key={i} source={Chibi.oanquan.seed} size={10} />
        ))}
      </View>
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

      <ImageBackground
        source={Chibi.oanquan.boardBg}
        imageStyle={{ borderRadius: R.lg }}
        style={{
          padding: 8,
          borderRadius: R.lg,
          borderWidth: 3,
          borderColor: '#C99C6B',
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
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
      </ImageBackground>

      {picked != null ? (
        <View style={{ flexDirection: 'row', gap: S.md, justifyContent: 'center', alignItems: 'center' }}>
          <Btn label="Rải ngược" tone="secondary" onPress={() => sow(-1)} />
          <Btn label="Rải xuôi" onPress={() => sow(1)} />
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
