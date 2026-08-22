import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar, Bar, Chip, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { useBoardTheme } from '../components/Cosmetic';

/**
 * Ngữ cảnh "không phải trận của tôi": màn khán đài và màn xem lại dùng lại
 * nguyên bàn chơi, mà bàn chơi lại được viết theo góc nhìn người trong trận —
 * để nguyên thì nó gọi khán giả là "Bạn" và giục "Tới lượt bạn — đánh đi!".
 *
 * - `spectating`: người đang xem **không** ngồi ghế nào trong trận này, nên bỏ
 *   hết nhãn "Bạn" / "Đối thủ" / "(bạn)".
 * - `activeName`: tên người đang tới lượt. Có giá trị thì băng-rôn lượt đi nói
 *   thẳng tên người đó thay vì câu giục. Để `null` khi ván đã xong hoặc không
 *   xác định được — lúc ấy giữ nguyên câu của bàn chơi ("Ván đã kết thúc").
 */
export interface SpectateInfo {
  spectating: boolean;
  activeName?: string | null;
}

const SpectateCtx = createContext<SpectateInfo>({ spectating: false });
export const SpectateProvider = SpectateCtx.Provider;
export const useSpectate = () => useContext(SpectateCtx);

export interface BoardProps {
  view: any;
  mySeat: number;
  send: (type: string, payload?: any) => void;
  deadline: number | null;
  /** Không gian còn lại cho bàn chơi sau khi trừ HUD — dùng để co giãn full screen. */
  space: { width: number; height: number };
}

/** Đồng hồ đếm ngược lượt, dùng chung cho mọi game. */
export function TurnTimer({ deadline, total = 30 }: { deadline: number | null; total?: number }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(deadline ? Math.max(0, deadline - Date.now()) : 0);
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const secs = Math.ceil(left / 1000);
  const danger = secs <= 5;
  return (
    <View style={{ gap: 3, minWidth: 76 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Icon name="clock" size={12} color={danger ? C.danger : C.inkSoft} strokeWidth={2.4} />
        <Txt size={11} weight="bold" color={danger ? C.danger : C.inkSoft}>
          {secs}s
        </Txt>
      </View>
      <Bar value={left} max={total * 1000} color={danger ? C.danger : C.mint} height={5} />
    </View>
  );
}

export function PlayerStrip({
  players,
  activeSeat,
  mySeat,
  extra,
}: {
  players: any[];
  activeSeat: number;
  mySeat: number;
  extra?: (seat: number) => React.ReactNode;
}) {
  const { spectating } = useSpectate();
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      {players.map((p: any, i: number) => {
        const active = i === activeSeat;
        return (
          <View
            key={p.id ?? i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: R.pill,
              backgroundColor: active ? C.surface : 'transparent',
              borderWidth: 2,
              borderColor: active ? SEAT_COLORS[i] : 'transparent',
            }}
          >
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: SEAT_COLORS[i] }} />
            <Txt size={11} weight={active ? 'bold' : 'medium'} color={active ? C.ink : C.inkSoft} numberOfLines={1}>
              {p.name}
              {i === mySeat && !spectating ? ' (bạn)' : ''}
            </Txt>
            {extra?.(i)}
          </View>
        );
      })}
    </View>
  );
}

export function GameLog({ log }: { log: string[] }) {
  if (!log?.length) return null;
  return (
    <View style={{ backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: S.md, gap: 3 }}>
      {log.slice(-4).map((l, i) => (
        <Txt key={i} size={11} color={i === log.slice(-4).length - 1 ? C.ink : C.inkFaint}>
          • {l}
        </Txt>
      ))}
    </View>
  );
}

export function TurnBanner({ yourTurn, text }: { yourTurn: boolean; text: string }) {
  const { activeName } = useSpectate();
  // Ngoài trận thì không giục ai cả, chỉ nói đang tới lượt ai.
  const label = activeName ? `Tới lượt ${activeName}` : text;
  const mine = yourTurn && !activeName;
  return (
    <View
      style={{
        backgroundColor: mine ? C.mintSoft : C.surfaceAlt,
        borderRadius: R.pill,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'center',
      }}
    >
      <Txt size={13} weight="bold" color={mine ? '#1F7A50' : C.inkSoft}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * Mặt bàn có chất liệu: khung ngoài sẫm, mặt trong chuyển màu, vân dọc mờ và
 * viền sáng ở mép trên. Bàn cờ phẳng một màu trông như bảng tính, thêm chất
 * liệu vào là ra cảm giác vật thật.
 */
export function BoardSurface({
  tone = 'wood',
  radius = R.lg,
  pad = 6,
  children,
  style,
}: {
  tone?: 'wood' | 'water' | 'felt';
  radius?: number;
  pad?: number;
  children: React.ReactNode;
  style?: any;
}) {
  /**
   * Theme bàn cờ của người chơi đè lên tông mặc định. Chỉ đổi màu mặt bàn,
   * khung và đường vân — không đụng gì tới kích thước ô hay luật chơi.
   */
  const themed = useBoardTheme();
  const skin = themed
    ? { frame: themed.line, base: themed.from, wash: [themed.from, themed.to] as [string, string], grain: 'rgba(255,255,255,0.08)' }
    : BOARD_SKIN[tone];
  return (
    <View
      style={[
        {
          padding: pad,
          borderRadius: radius,
          borderWidth: 3,
          borderColor: skin.frame,
          backgroundColor: skin.base,
          overflow: 'hidden',
        },
        softShadow(0.18, 16, 8),
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={skin.wash}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {/* Vân bàn: vài dải mờ chạy dọc, đủ để mặt bàn không phẳng lì */}
      {skin.grain
        ? Array.from({ length: 7 }, (_, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${6 + i * 13}%`,
                width: i % 2 ? 10 : 22,
                backgroundColor: skin.grain,
                opacity: i % 2 ? 0.5 : 0.32,
              }}
            />
          ))
        : null}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 10, backgroundColor: 'rgba(255,255,255,0.28)' }}
      />
      {children}
    </View>
  );
}

const BOARD_SKIN: Record<string, { frame: string; base: string; wash: [string, string]; grain?: string }> = {
  wood: { frame: '#B5854C', base: '#EFD3A8', wash: ['#F6E2BF', '#E4C08F'], grain: 'rgba(160,110,55,0.10)' },
  water: { frame: '#3E8CC4', base: '#8FC9EC', wash: ['#A6DBF7', '#5AA9DC'], grain: 'rgba(255,255,255,0.16)' },
  felt: { frame: '#2E7D53', base: '#3FA36C', wash: ['#4CB77C', '#2E8B58'], grain: 'rgba(255,255,255,0.06)' },
};

/**
 * Đầu trận kiểu đối kháng: hai người chơi quay mặt vào nhau, ở giữa là huy hiệu
 * VS và đồng hồ lượt. Vừa lấp khoảng trống phía trên bàn cờ vuông, vừa cho biết
 * ngay đang tới lượt ai.
 */
export function VersusBar({
  players,
  activeSeat,
  mySeat,
  deadline,
  total = 30,
  score,
}: {
  players: any[];
  activeSeat: number;
  mySeat: number;
  deadline: number | null;
  total?: number;
  /** Nhãn phụ dưới tên (điểm, số tàu, tiền...). */
  score?: (seat: number) => string | undefined;
}) {
  const me = mySeat < 0 ? 0 : mySeat;
  const foe = players.length > 1 ? (me === 0 ? 1 : 0) : 0;
  const order = players.length > 2 ? players.map((_, i) => i) : [me, foe];

  if (players.length > 2) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlayerStrip players={players} activeSeat={activeSeat} mySeat={mySeat} />
        <TurnTimer deadline={deadline} total={total} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      <Side seat={order[0]} player={players[order[0]]} active={activeSeat === order[0]} mine label={score?.(order[0])} />
      <View style={{ alignItems: 'center', gap: 4, width: 74 }}>
        <View
          style={[
            { paddingHorizontal: 12, paddingVertical: 3, borderRadius: R.pill, backgroundColor: C.ink },
            softShadow(0.2, 8, 3),
          ]}
        >
          <Txt size={13} weight="display" color="#fff">
            VS
          </Txt>
        </View>
        <TurnTimer deadline={deadline} total={total} />
      </View>
      <Side seat={order[1]} player={players[order[1]]} active={activeSeat === order[1]} label={score?.(order[1])} />
    </View>
  );
}

function Side({
  seat,
  player,
  active,
  mine,
  label,
}: {
  seat: number;
  player: any;
  active: boolean;
  mine?: boolean;
  label?: string;
}) {
  const { spectating } = useSpectate();
  const tone = SEAT_COLORS[seat];
  return (
    <View
      style={[
        {
          flex: 1,
          flexDirection: mine ? 'row' : 'row-reverse',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: R.pill,
          backgroundColor: active ? C.surface : 'rgba(255,255,255,0.55)',
          borderWidth: 2,
          borderColor: active ? tone : 'transparent',
        },
        active ? softShadow(0.12, 10, 4) : null,
      ]}
    >
      <Avatar seed={player?.avatarSeed ?? player?.id ?? String(seat)} styleName={player?.avatarStyle} size={34} ring={tone} />
      <View style={{ flex: 1, alignItems: mine ? 'flex-start' : 'flex-end' }}>
        <Txt size={12} weight="bold" numberOfLines={1} color={active ? C.ink : C.inkSoft}>
          {player?.name ?? '—'}
        </Txt>
        <Txt size={10} weight="medium" color={tone}>
          {/* Ngoài trận thì không ai là "Bạn" cả; giữ một khoảng trắng để hai
              bên vẫn cao bằng nhau. */}
          {label ?? (spectating ? ' ' : mine ? 'Bạn' : 'Đối thủ')}
        </Txt>
      </View>
    </View>
  );
}

/**
 * View của người xem (`view(state, null)` trên server) không có ô "của tôi" —
 * mấy game giấu bài như Bắn Tàu trả về `sides[]` thay cho `me`/`foe`. Bàn chơi
 * lại được viết theo góc nhìn người trong trận, nên ở đây ta gán tạm ghế 0 làm
 * góc nhìn: khán giả xem trận như đang ngồi cạnh người chơi ghế 0, còn thông
 * tin ẩn thì vẫn giấu vì server đã lọc từ trước.
 */
export function spectatorView(view: any, fallbackSeat = 0): { view: any; seat: number } {
  if (!view) return { view, seat: fallbackSeat };
  // Game giấu bài trả `sides[]` cho người ngoài. Lấy ghế 0 làm góc nhìn — dữ
  // liệu trong đó đã bị server lọc rồi, nên không lộ thêm gì.
  if (Array.isArray(view.sides) && !view.me) {
    return { view: { ...view, me: view.sides[0], foe: view.sides[1] }, seat: 0 };
  }
  // Engine nào có khai `mySeat` thì tin nó, kể cả khi là -1 (không ngồi ghế
  // nào) — bàn chơi sẽ tự tắt hết nút thao tác. Engine không khai (Caro, Ô Ăn
  // Quan…) thì mọi thứ đều công khai, ghế nào cũng ra cùng một bàn.
  const seat = typeof view.mySeat === 'number' ? view.mySeat : fallbackSeat;
  return { view, seat };
}

/**
 * Tên người đang tới lượt, hoặc null khi ván đã xong / game không theo lượt.
 * `selfSeat` là ghế của chính người đang xem — trùng thì trả "bạn", vì băng-rôn
 * xưng tên chính mình đọc rất kỳ.
 */
export function activeSeatName(view: any, selfSeat = -1): string | null {
  if (!view || view.over) return null;
  const seat = typeof view.turnSeat === 'number' ? view.turnSeat : null;
  if (seat === null) return null;
  if (seat === selfSeat) return 'bạn';
  return view.players?.[seat]?.name ?? null;
}
