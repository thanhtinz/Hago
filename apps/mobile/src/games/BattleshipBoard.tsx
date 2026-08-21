import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Btn, Chip, Txt } from '../components/ui';
import { C, R, S, softShadow } from '../theme';
import { BoardProps, GameLog, TurnBanner, TurnTimer, VersusBar } from './shared';
import { BS_ICON, BS_MARK, BS_RATIO, BS_SEA, BS_SHIP_SIDE, BS_SHIP_TOP, ShipKind, shipKind } from '../art/battleship';

/**
 * Bàn Bắn Tàu dựng bằng bản vẽ gốc: mặt biển là ô nước cắt từ bảng thiết kế,
 * bắn trượt ra cột nước, trúng thì tàu bốc cháy, chìm hẳn thì dấu X đỏ. Tàu của
 * mình là hình nhìn từ trên, nằm đúng số ô của nó; bảng hạm đội dùng hình nhìn
 * ngang.
 *
 * Art: assets/battleship/, cắt bằng scripts/slice-battleship-art.py.
 */

/** Giữ bàn địch thêm ngần này sau khi bắn để kịp nhìn kết quả rồi mới lật bàn. */
const SHOT_HOLD_MS = 1600;

/** Loại tàu cho từng chiếc trong hạm đội — hai tàu 3 ô thì chiếc sau là tàu ngầm. */
function fleetKinds(fleet: number[]): ShipKind[] {
  const seen = new Map<number, number>();
  return fleet.map((len) => {
    const nth = seen.get(len) ?? 0;
    seen.set(len, nth + 1);
    return shipKind(len, nth);
  });
}

export default function BattleshipBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const size = view.size ?? 10;
  const fleet: number[] = view.fleet ?? [5, 4, 3, 3, 2];
  const kinds = React.useMemo(() => fleetKinds(fleet), [fleet.join(',')]);
  const yourTurn = view.turnSeat === mySeat && !view.over && view.phase === 'battle';

  /**
   * Mỗi lượt chỉ hiện **một** bàn, đúng cái đang cần nhìn: tới lượt mình thì
   * bàn địch (tàu giấu sạch, chỉ thấy chỗ đã bắn), tới lượt địch thì bàn nhà —
   * lúc đó mới nhìn được hạm đội của chính mình và đối thủ đang bắn vào đâu.
   * Nhờ vậy bàn to gần gấp đôi và không lộ tàu lúc đang ngắm bắn.
   */
  const wide = Math.max(240, space.width - 16);
  const cell = Math.max(20, Math.floor(Math.min(wide, space.height - 250) / size));

  /**
   * Bắn trượt là mất lượt ngay, nếu lật bàn tức thì thì người chơi không kịp
   * thấy phát vừa bắn rơi vào đâu. Giữ bàn địch thêm một nhịp rồi mới lật.
   */
  const myShots: any[] = view.me?.shots ?? [];
  const [holdUntil, setHoldUntil] = React.useState(0);
  const seenShots = React.useRef(myShots.length);
  const [, redraw] = React.useState(0);
  React.useEffect(() => {
    if (myShots.length > seenShots.current) {
      seenShots.current = myShots.length;
      setHoldUntil(Date.now() + SHOT_HOLD_MS);
    }
  }, [myShots.length]);
  React.useEffect(() => {
    const left = holdUntil - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => redraw((n) => n + 1), left);
    return () => clearTimeout(t);
  }, [holdUntil]);

  if (view.phase === 'placement') {
    return (
      <View style={{ gap: S.lg, alignItems: 'center' }}>
        <Image source={BS_MARK.targetBlue} resizeMode="contain" style={{ width: 56, height: 56 }} />
        <Txt size={20} weight="display">
          Bố trí hạm đội
        </Txt>
        <Txt size={13} color={C.inkSoft} center style={{ maxWidth: 300 }}>
          Vị trí tàu được giữ kín trên server — đối thủ không bao giờ nhận được toạ độ tàu của bạn.
        </Txt>
        <TurnTimer deadline={deadline} total={60} />
        <FleetPanel kinds={kinds} fleet={fleet} ships={view.me?.ships ?? []} mine width={Math.min(wide, 360)} />
        {view.me?.placed ? (
          <Chip label="Đã sẵn sàng — chờ đối thủ" icon="check" color={C.mint} soft={C.mintSoft} />
        ) : (
          <Btn label="Xếp tàu ngẫu nhiên" icon="dice" size="lg" onPress={() => send('place', {})} />
        )}
        {view.me?.placed ? (
          <Grid size={size} cell={cell} shots={[]} ships={view.me?.ships ?? []} kinds={kinds} showShips />
        ) : null}
      </View>
    );
  }

  const attacking = yourTurn || Date.now() < holdUntil || (view.over && !!view.winnerIds?.includes(view.players?.[mySeat]?.id));
  const board = attacking
    ? { title: 'Bản đồ đối thủ', tone: 'red' as const, alive: view.foe?.alive, total: view.foe?.total }
    : { title: 'Bản đồ của bạn', tone: 'blue' as const, alive: view.me?.alive, total: view.me?.total };

  return (
    <View style={{ gap: S.sm, alignItems: 'center' }}>
      <VersusBar
        players={view.players}
        activeSeat={view.turnSeat}
        mySeat={mySeat}
        deadline={deadline}
        total={25}
        score={(seat) => (seat === mySeat ? `${view.me?.alive}/${view.me?.total} tàu` : `${view.foe?.alive}/${view.foe?.total} tàu`)}
      />
      <TurnBanner
        yourTurn={yourTurn}
        text={view.over ? 'Kết thúc' : yourTurn ? 'Chọn ô để khai hoả!' : 'Đối thủ đang ngắm — canh xem họ bắn vào đâu'}
      />

      <BoardHeader title={board.title} tone={board.tone} note={`còn ${board.alive}/${board.total} tàu`} />

      {attacking ? (
        <Grid
          size={size}
          cell={cell}
          shots={myShots}
          // Server chỉ trả về tàu địch **đã chìm**, nên bật showShips ở đây là
          // lộ đúng mấy xác tàu đó chứ không lộ tàu còn sống.
          ships={view.foe?.ships ?? []}
          kinds={[]}
          showShips
          interactive={yourTurn}
          onPress={(x, y) => send('fire', { x, y })}
        />
      ) : (
        <Grid size={size} cell={cell} shots={view.foe?.shots ?? []} ships={view.me?.ships ?? []} kinds={kinds} showShips />
      )}

      {/* Bảng hạm đội đi theo bàn đang xem */}
      <FleetPanel
        kinds={kinds}
        fleet={fleet}
        ships={attacking ? view.foe?.ships ?? [] : view.me?.ships ?? []}
        mine={!attacking}
        width={Math.min(wide, 360)}
      />
      <GameLog log={view.log} />
    </View>
  );
}

/** Thanh tiêu đề nhỏ trên mỗi bàn, xanh cho bàn mình và đỏ cho bàn địch. */
function BoardHeader({ title, note, tone }: { title: string; note: string; tone: 'blue' | 'red' }) {
  const bg = tone === 'red' ? '#C2372B' : '#1E63B0';
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: bg,
          paddingHorizontal: 14,
          paddingVertical: 5,
          borderRadius: R.pill,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.35)',
        },
        softShadow(0.18, 10, 4),
      ]}
    >
      <Image
        source={tone === 'red' ? BS_MARK.targetRed : BS_MARK.targetBlue}
        resizeMode="contain"
        style={{ width: 16, height: 16 }}
      />
      <Txt size={12} weight="display" color="#FFFFFF">
        {title.toUpperCase()}
      </Txt>
      <Txt size={11} color="rgba(255,255,255,0.8)">
        {note}
      </Txt>
    </View>
  );
}

/**
 * Lưới kèm thước toạ độ: chữ cái A.. chạy dọc bên trái là hàng, số 1.. chạy
 * ngang bên trên là cột — đúng cách đọc ô trong bản thiết kế và trong nhật ký
 * trận ("bắn C7" = hàng C, cột 7).
 */
function Grid(props: React.ComponentProps<typeof Sea> & { size: number; cell: number }) {
  const { size, cell } = props;
  const label = Math.max(11, Math.round(cell * 0.42));
  const edge = 3;
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: label, paddingTop: label + edge }}>
        {Array.from({ length: size }, (_, y) => (
          <View key={y} style={{ height: cell, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={Math.max(8, Math.round(cell * 0.32))} weight="bold" color={C.inkSoft}>
              {String.fromCharCode(65 + y)}
            </Txt>
          </View>
        ))}
      </View>
      <View>
        <View style={{ flexDirection: 'row', height: label, paddingLeft: edge }}>
          {Array.from({ length: size }, (_, x) => (
            <View key={x} style={{ width: cell, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={Math.max(8, Math.round(cell * 0.32))} weight="bold" color={C.inkSoft}>
                {x + 1}
              </Txt>
            </View>
          ))}
        </View>
        <Sea {...props} />
      </View>
    </View>
  );
}

function Sea({
  size,
  cell,
  shots,
  ships,
  kinds,
  interactive,
  onPress,
  showShips,
}: {
  size: number;
  cell: number;
  shots: any[];
  ships: any[];
  kinds: ShipKind[];
  interactive?: boolean;
  onPress?: (x: number, y: number) => void;
  showShips?: boolean;
}) {
  const shotMap = new Map(shots.map((s) => [`${s.x},${s.y}`, s]));
  // Lưới liền mạch: vạch chia đã vẽ sẵn trong ảnh ô nước nên không chừa khe.
  const step = cell;
  const sea = cell * size;
  // RN tính width gồm cả viền, nên cộng viền vào để mặt biển không tràn ra ngoài.
  const edge = 3;
  const boardW = sea + edge * 2;

  return (
    <View
      style={[
        {
          width: boardW,
          height: boardW,
          borderRadius: R.md,
          overflow: 'hidden',
          backgroundColor: '#0E3A63',
          borderWidth: edge,
          borderColor: '#8A5F30',
        },
        softShadow(0.2, 14, 6),
      ]}
    >
      {/* Mặt biển: lát ô nước cắt từ bàn gốc, vạch lưới đã nằm sẵn trong ảnh */}
      {Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => (
          <Image
            key={`w${x},${y}`}
            source={(x * 7 + y * 3) % 3 ? BS_SEA.a : BS_SEA.b}
            resizeMode="stretch"
            style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell }}
          />
        )),
      )}

      {/* Tàu của mình: một ảnh cho cả con, nằm đúng số ô nó chiếm */}
      {showShips
        ? ships.map((s: any, i: number) => {
            const len = s.size;
            const kind = kinds[i] ?? shipKind(len);
            const along = step * len;
            const dead = (s.hits?.length ?? 0) >= len;
            return (
              <View
                key={`s${s.id ?? i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: s.x * step,
                  top: s.y * step,
                  width: s.horizontal ? along : cell,
                  height: s.horizontal ? cell : along,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: dead ? 0.45 : 1,
                }}
              >
                {/* Kéo cho tàu phủ đúng số ô nó chiếm — nhìn từ trên tàu vốn
                    mập hơn một ô, giữ nguyên tỉ lệ thì tàu ngắn hơn ô của nó. */}
                <Image
                  source={BS_SHIP_TOP[kind]}
                  resizeMode="stretch"
                  style={{
                    width: along,
                    height: cell,
                    transform: s.horizontal ? undefined : [{ rotate: '90deg' }],
                  }}
                />
              </View>
            );
          })
        : null}

      {/* Dấu bắn: trượt là cột nước, trúng là tàu cháy, chìm là dấu X */}
      {Array.from(shotMap.values()).map((shot: any) => {
        const kindIcon = shot.sunk !== null && shot.sunk !== undefined ? BS_ICON.sunk : shot.hit ? BS_ICON.hit : BS_ICON.miss;
        const pad = cell * 0.1;
        return (
          <Image
            key={`m${shot.x},${shot.y}`}
            source={kindIcon}
            resizeMode="contain"
            style={{
              position: 'absolute',
              left: shot.x * cell + pad,
              top: shot.y * cell + pad,
              width: cell - pad * 2,
              height: cell - pad * 2,
            }}
          />
        );
      })}

      {/* Vùng chạm để bắn — đặt trên cùng nên không bị ảnh che */}
      {interactive
        ? Array.from({ length: size }, (_, y) =>
            Array.from({ length: size }, (_, x) => {
              const shot = shotMap.get(`${x},${y}`);
              return (
                <Pressable
                  key={`t${x},${y}`}
                  disabled={!!shot}
                  onPress={() => onPress?.(x, y)}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    left: x * cell,
                    top: y * cell,
                    width: cell,
                    height: cell,
                    backgroundColor: pressed ? 'rgba(255,255,255,0.35)' : 'transparent',
                  })}
                />
              );
            }),
          )
        : null}
    </View>
  );
}

/**
 * Bảng hạm đội: mỗi chiếc một hàng, chìm rồi thì mờ đi và gạch chéo.
 *
 * Hạm đội của mình lộ đủ nên khớp thẳng theo thứ tự. Của đối thủ thì server chỉ
 * trả về những chiếc **đã chìm**, nên phải ghép theo số ô: mỗi chiếc chìm đánh
 * dấu một suất cùng cỡ trong danh sách.
 */
function FleetPanel({
  kinds,
  fleet,
  ships,
  mine,
  width,
}: {
  kinds: ShipKind[];
  fleet: number[];
  ships: any[];
  mine?: boolean;
  width: number;
}) {
  const bg = mine ? '#123E70' : '#7A2018';
  const line = mine ? '#2E77C4' : '#C2483A';

  /** Số ô đã trúng của từng suất trong hạm đội. */
  const hitsOf: number[] = React.useMemo(() => {
    if (mine) return fleet.map((len, i) => Math.min(len, ships[i]?.hits?.length ?? 0));
    const left = fleet.map(() => 0);
    const pool = fleet.map((len, i) => ({ len, i })).sort((a, b) => b.len - a.len);
    for (const s of ships) {
      const slot = pool.find((p) => p.len === s.size && left[p.i] === 0);
      if (slot) left[slot.i] = slot.len;
    }
    return left;
  }, [mine, fleet.join(','), ships]);

  return (
    <View
      style={{
        width,
        backgroundColor: bg,
        borderRadius: R.md,
        borderWidth: 2,
        borderColor: line,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 5,
      }}
    >
      <Txt size={11} weight="display" color="#FFFFFF">
        {mine ? 'TÀU CỦA BẠN' : 'TÀU ĐỐI THỦ'}
      </Txt>
      {fleet.map((len, i) => {
        const kind = kinds[i] ?? shipKind(len);
        const hits = hitsOf[i] ?? 0;
        const dead = hits >= len;
        const ratio = BS_RATIO[`${kind}-side`] ?? 2.2;
        const w = Math.min(width * 0.42, 26 + len * 22);
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image
              source={BS_SHIP_SIDE[kind]}
              resizeMode="contain"
              style={{ width: w, height: w / ratio, opacity: dead ? 0.35 : 1 }}
            />
            <Txt size={10} color="rgba(255,255,255,0.75)">
              {len} ô
            </Txt>
            <View style={{ flex: 1 }} />
            {/* Đếm ô đã trúng của từng chiếc */}
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: len }, (_, k) => (
                <View
                  key={k}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: k < hits ? '#FF7A3D' : 'rgba(255,255,255,0.22)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
