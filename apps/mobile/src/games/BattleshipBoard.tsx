import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { C, R, S } from '../theme';
import { Chibi } from './chibiAssets';
import { ChibiImg } from './ChibiImg';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

export default function BattleshipBoard({ view, mySeat, send, deadline }: BoardProps) {
  const size = view.size ?? 10;
  const cell = Math.min(30, Math.floor(320 / size));
  const yourTurn = view.turnSeat === mySeat && !view.over && view.phase === 'battle';

  if (view.phase === 'placement') {
    return (
      <View style={{ gap: S.lg, alignItems: 'center' }}>
        <ChibiImg source={Chibi.battleship.anchor} size={72} />
        <Txt size={20} weight="display">
          Bố trí hạm đội
        </Txt>
        <Txt size={13} color={C.inkSoft} center style={{ maxWidth: 300 }}>
          Vị trí tàu được giữ kín trên server — đối thủ không bao giờ nhận được toạ độ tàu của bạn.
        </Txt>
        <TurnTimer deadline={deadline} total={60} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          {view.fleet.map((len: number, i: number) => (
            <View key={i} style={{ alignItems: 'center', gap: 2 }}>
              <Image
                source={Chibi.battleship.ships[len] ?? Chibi.battleship.ships[3]}
                style={{ width: 28 + len * 14, height: 28 }}
                resizeMode="contain"
              />
              <Txt size={10} color={C.inkFaint}>
                {len} ô
              </Txt>
            </View>
          ))}
        </View>
        {view.me?.placed ? (
          <Chip label="Đã sẵn sàng — chờ đối thủ" color={C.mint} soft={C.mintSoft} />
        ) : (
          <Btn label="Xếp tàu ngẫu nhiên" size="lg" onPress={() => send('place', {})} />
        )}
        {view.me?.placed ? <MiniGrid size={size} cell={cell} side={view.me} showShips /> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PlayerStrip players={view.players} activeSeat={view.turnSeat} mySeat={mySeat} />
        <TurnTimer deadline={deadline} total={25} />
      </View>
      <TurnBanner yourTurn={yourTurn} text={view.over ? 'Kết thúc' : yourTurn ? 'Chọn ô để khai hoả!' : 'Đối thủ đang ngắm...'} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Txt size={13} weight="heading">
          Bàn đối thủ · còn {view.foe?.alive}/{view.foe?.total} tàu
        </Txt>
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
        <Txt size={13} weight="heading" color={C.inkSoft}>
          Hạm đội của bạn · còn {view.me?.alive}/{view.me?.total}
        </Txt>
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
                  overflow: 'hidden',
                  backgroundColor: shot ? (shot.hit ? '#FFB3B3' : '#E6F4FF') : hasShip && !hideShips ? '#8593A8' : '#EAF7FF',
                  borderWidth: 1,
                  borderColor: '#B6DDF5',
                }}
              >
                {!shot ? <Image source={Chibi.battleship.water} style={{ position: 'absolute', width: cell, height: cell, opacity: 0.55 }} resizeMode="cover" /> : null}
                {shot ? (
                  <ChibiImg
                    source={shot.sunk !== null && shot.sunk !== undefined ? Chibi.battleship.sunk : shot.hit ? Chibi.battleship.hit : Chibi.battleship.miss}
                    size={cell * 0.85}
                  />
                ) : null}
                {!shot && hasShip && !hideShips ? (
                  <View style={{ width: cell * 0.7, height: cell * 0.45, borderRadius: 4, backgroundColor: '#5E6B80', borderWidth: 1, borderColor: '#3E4A5A' }} />
                ) : null}
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
