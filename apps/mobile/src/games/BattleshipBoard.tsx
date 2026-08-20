import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { Chibi } from '../components/Chibi';
import { C, R, S } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

export default function BattleshipBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const size = view.size ?? 10;
  // Hai bàn xếp dọc: bàn địch lớn, bàn mình nhỏ hơn ~60%.
  const cell = Math.max(14, Math.min(34, Math.floor(Math.min(space.width - 24, (space.height - 120) / 1.7) / size)));
  const yourTurn = view.turnSeat === mySeat && !view.over && view.phase === 'battle';

  if (view.phase === 'placement') {
    return (
      <View style={{ gap: S.lg, alignItems: 'center' }}>
        <Chibi name="anchor" size={56} />
        <Txt size={20} weight="display">
          Bố trí hạm đội
        </Txt>
        <Txt size={13} color={C.inkSoft} center style={{ maxWidth: 300 }}>
          Vị trí tàu được giữ kín trên server — đối thủ không bao giờ nhận được toạ độ tàu của bạn.
        </Txt>
        <TurnTimer deadline={deadline} total={60} />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {view.fleet.map((len: number, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.skySoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
              <Chibi name="ship" size={14} />
              <Txt size={11} weight="bold" color={C.sky}>
                {len} ô
              </Txt>
            </View>
          ))}
        </View>
        {view.me?.placed ? (
          <Chip label="Đã sẵn sàng — chờ đối thủ" icon="✅" color={C.mint} soft={C.mintSoft} />
        ) : (
          <Btn label="Xếp tàu ngẫu nhiên" icon="🎲" size="lg" onPress={() => send('place', {})} />
        )}
        {view.me?.placed ? <MiniGrid size={size} cell={cell} side={view.me} showShips /> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlayerStrip players={view.players} activeSeat={view.turnSeat} mySeat={mySeat} />
        <TurnTimer deadline={deadline} total={25} />
      </View>
      <TurnBanner yourTurn={yourTurn} text={view.over ? 'Kết thúc' : yourTurn ? 'Chọn ô để khai hoả!' : 'Đối thủ đang ngắm...'} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Chibi name="target" size={18} />
          <Txt size={13} weight="heading">
            Bàn đối thủ · còn {view.foe?.alive}/{view.foe?.total} tàu
          </Txt>
        </View>
        <Grid
          size={size}
          cell={cell}
          shots={view.me?.shots ?? []}
          ships={view.foe?.ships ?? []}
          interactive={yourTurn}
          onPress={(x, y) => send('fire', { x, y })}
          hideShips
        />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Chibi name="shield" size={16} />
          <Txt size={13} weight="heading" color={C.inkSoft}>
            Hạm đội của bạn · còn {view.me?.alive}/{view.me?.total}
          </Txt>
        </View>
        <MiniGrid size={size} cell={Math.round(cell * 0.62)} side={view.me} showShips incoming={view.foe?.shots ?? []} />
      </View>
      <GameLog log={view.log} />
    </View>
  );
}

function shipCells(ships: any[]): Map<string, any> {
  const m = new Map<string, any>();
  ships.forEach((s) => {
    for (let i = 0; i < s.size; i++) {
      const x = s.x + (s.horizontal ? i : 0);
      const y = s.y + (s.horizontal ? 0 : i);
      m.set(`${x},${y}`, { ship: s, part: i });
    }
  });
  return m;
}

function Grid({
  size,
  cell,
  shots,
  ships,
  interactive,
  onPress,
  hideShips,
}: {
  size: number;
  cell: number;
  shots: any[];
  ships: any[];
  interactive?: boolean;
  onPress?: (x: number, y: number) => void;
  hideShips?: boolean;
}) {
  const shotMap = new Map(shots.map((s) => [`${s.x},${s.y}`, s]));
  const sc = shipCells(ships);
  return (
    <View style={{ backgroundColor: '#CDEBFF', padding: 4, borderRadius: R.md, borderWidth: 3, borderColor: '#8FCBF0' }}>
      {Array.from({ length: size }, (_, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {Array.from({ length: size }, (_, x) => {
            const shot = shotMap.get(`${x},${y}`);
            const hasShip = sc.has(`${x},${y}`);
            return (
              <Pressable
                key={x}
                disabled={!interactive || !!shot}
                onPress={() => onPress?.(x, y)}
                style={{
                  width: cell,
                  height: cell,
                  margin: 1,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: shot ? (shot.hit ? '#FFB3B3' : '#E6F4FF') : hasShip && !hideShips ? '#8593A8' : '#EAF7FF',
                  borderWidth: 1,
                  borderColor: '#B6DDF5',
                }}
              >
                {shot ? (
                  shot.sunk !== null ? (
                    <Chibi name="explosion" size={cell * 0.72} />
                  ) : shot.hit ? (
                    <Chibi name="fire" size={cell * 0.66} />
                  ) : (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CC6E0' }} />
                  )
                ) : null}
                {!shot && hasShip && !hideShips ? <View style={{ width: cell * 0.6, height: cell * 0.6, borderRadius: 3, backgroundColor: '#5E6B80' }} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MiniGrid({ size, cell, side, showShips, incoming = [] }: { size: number; cell: number; side: any; showShips?: boolean; incoming?: any[] }) {
  return <Grid size={size} cell={cell} shots={incoming} ships={showShips ? side?.ships ?? [] : []} hideShips={!showShips} />;
}
