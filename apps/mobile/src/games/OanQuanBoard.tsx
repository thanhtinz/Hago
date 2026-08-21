import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Btn, Txt } from '../components/ui';
import { C, S, SEAT_COLORS } from '../theme';
import { BoardProps, TurnBanner, VersusBar } from './shared';
import {
  OAN_QUAN_BOARD,
  OAN_QUAN_LAYOUT as L,
  OAN_QUAN_RATIO,
  QUAN_ART,
  QUAN_LID_ART,
  SEED_ART,
  SEED_COLORS,
} from '../art/oanQuan';

/**
 * Bàn Ô Ăn Quan dùng thẳng bản vẽ gốc.
 *
 * Ảnh bàn, hạt dân, quan và nắp quan đều cắt ra từ bảng thiết kế bằng
 * `scripts/slice-oanquan-art.py`; toạ độ từng lòng ô nằm trong
 * `OAN_QUAN_LAYOUT` dưới dạng tỉ lệ nên chỉ cần nhân với bề ngang bàn là ra
 * đúng chỗ, màn hình to nhỏ gì cũng khớp.
 *
 * Hàng dưới luôn là ô của người đang xem, hàng trên của đối thủ.
 */

const BOARD_RATIO = L.boardW / L.boardH;

/**
 * Chữ đặt thẳng lên mặt gỗ: quầng sáng quanh nét thay cho viên nền trắng, đọc
 * vẫn rõ mà không có mảng trắng đè lên bàn.
 */
const CARVED = {
  textShadowColor: 'rgba(255,244,222,0.95)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

/** Rải hạt trong lòng ô theo hai vòng, màu xen kẽ như bản vẽ. */
function SeedPile({ count, radius, seed, salt }: { count: number; radius: number; seed: number; salt: number }) {
  if (!count) return null;
  const shown = Math.min(count, 10);
  const ratio = OAN_QUAN_RATIO['seed-white'] ?? 0.81;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: shown }, (_, i) => {
        const inner = shown <= 3 || i < 3;
        const ring = inner ? Math.min(shown, 3) : shown - 3;
        const idx = inner ? i : i - 3;
        const r = inner ? radius * 0.28 : radius * 0.62;
        const angle = (idx / Math.max(1, ring)) * Math.PI * 2 + salt * 0.7 + (inner ? 0 : 0.4);
        const color = SEED_COLORS[(i + salt) % SEED_COLORS.length];
        return (
          <Image
            key={i}
            source={SEED_ART[color]}
            resizeMode="contain"
            style={{
              position: 'absolute',
              width: seed * ratio,
              height: seed,
              transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }],
            }}
          />
        );
      })}
    </View>
  );
}

export default function OanQuanBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const mine: number[] = view.own?.[mySeat] ?? [1, 2, 3, 4, 5];
  const iAmSeatZero = mySeat !== 1;
  // Hàng của mình luôn nằm dưới.
  const bottomRow = iAmSeatZero ? [1, 2, 3, 4, 5] : [7, 8, 9, 10, 11];
  const topRow = iAmSeatZero ? [11, 10, 9, 8, 7] : [5, 4, 3, 2, 1];

  // Bàn nằm ngang, chiếm hết bề ngang màn hình nhưng không cao quá phần trống.
  const maxW = Math.max(280, space.width - 8);
  const maxH = Math.max(150, space.height - 260);
  const boardW = Math.min(maxW, maxH * BOARD_RATIO);
  const boardH = boardW / BOARD_RATIO;

  const pitW = L.pitW * boardW;
  const pitH = L.pitH * boardH;

  const sow = (dir: number) => {
    if (picked == null) return;
    send('sow', { cell: picked, dir });
    setPicked(null);
  };

  /** Một ô dân: vùng chạm đặt đúng lên lòng ô đã khoét sẵn trong ảnh bàn. */
  const DanCell = ({ index, col, top }: { index: number; col: number; top: boolean }) => {
    const count = view.cells[index];
    const own = mine.includes(index);
    const selectable = yourTurn && own && count > 0;
    const inPath = view.lastPath?.includes(index);
    const cx = L.pitXs[col] * boardW;
    const cy = (top ? L.rowTop : L.rowBottom) * boardH;
    return (
      <Pressable
        disabled={!selectable}
        onPress={() => setPicked(index)}
        style={{
          position: 'absolute',
          left: cx - pitW / 2,
          top: cy - pitH / 2,
          width: pitW,
          height: pitH,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ô đang chọn / vừa rải qua được sáng lên, còn lòng ô là của ảnh bàn */}
        {picked === index || inPath ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: pitW,
              height: pitW,
              borderRadius: pitW,
              backgroundColor: picked === index ? 'rgba(255,214,120,0.5)' : 'rgba(255,240,200,0.3)',
              borderWidth: picked === index ? 3 : 0,
              borderColor: C.primary,
            }}
          />
        ) : null}
        {selectable && picked !== index ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: pitW - 4,
              height: pitW - 4,
              borderRadius: pitW,
              borderWidth: 2,
              borderColor: 'rgba(255,246,214,0.85)',
            }}
          />
        ) : null}
        {/* Hạt nhích lên một chút để không đè lên số dân ở đáy ô */}
        <View pointerEvents="none" style={{ position: 'absolute', top: pitH * 0.5 }}>
          <SeedPile count={count} radius={pitW * 0.27} seed={Math.max(10, pitW * 0.28)} salt={index} />
        </View>
        <Txt
          size={Math.max(10, Math.round(pitW * 0.26))}
          weight="display"
          color="#4A3113"
          style={[{ position: 'absolute', bottom: pitH * 0.06 }, CARVED]}
        >
          {count}
        </Txt>
      </Pressable>
    );
  };

  /** Ô Quan hai đầu bàn: còn quan thì hiện chibi, ăn rồi thì còn cái nắp. */
  const QuanCell = ({ index, side }: { index: number; side: 0 | 1 }) => {
    const spot = side === 0 ? L.quanLeft : L.quanRight;
    const alive = view.quan[side];
    const tone = side === 0 ? 'blue' : 'red';
    const w = spot.w * boardW;
    const h = spot.h * boardH;
    const art = alive ? QUAN_ART[tone] : QUAN_LID_ART[tone];
    const ratio = OAN_QUAN_RATIO[alive ? `quan-${tone}` : `lid-${tone}`] ?? 1;
    const artW = w * (alive ? 0.86 : 0.74);
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: spot.cx * boardW - w / 2,
          top: spot.cy * boardH - h / 2,
          width: w,
          height: h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image source={art} resizeMode="contain" style={{ width: artW, height: artW / ratio }} />
        {/* Số dân đang nằm trong ô Quan */}
        <View style={{ position: 'absolute', bottom: h * 0.05, alignItems: 'center' }}>
          <Txt size={11} weight="display" color="#4A3113" style={CARVED}>
            {alive ? `Quan ${view.quanValue}` : 'Đã ăn'}
          </Txt>
          {view.cells[index] ? (
            <Txt size={10} weight="bold" color="#6B4A22" style={CARVED}>
              +{view.cells[index]} dân
            </Txt>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={{ gap: S.md }}>
      <VersusBar
        players={view.players}
        activeSeat={view.turnSeat}
        mySeat={mySeat}
        deadline={deadline}
        total={35}
        score={(seat) => `${view.scores?.[seat] ?? 0} điểm`}
      />
      <TurnBanner
        yourTurn={yourTurn}
        text={view.over ? 'Tàn cuộc' : yourTurn ? (picked == null ? 'Chọn 1 ô của bạn' : 'Chọn hướng rải') : 'Đối thủ đang tính nước...'}
      />

      <View style={{ alignItems: 'center' }}>
        {/* Không đổ bóng khung: ảnh bàn có góc bo và lá thò ra, bóng của khung
            chữ nhật sẽ lòi ra thành một mảng vuông quanh bàn. */}
        <View style={{ width: boardW, height: boardH }}>
          <Image source={OAN_QUAN_BOARD} resizeMode="contain" style={{ width: boardW, height: boardH }} />

          {topRow.map((i, col) => (
            <DanCell key={i} index={i} col={col} top />
          ))}
          {bottomRow.map((i, col) => (
            <DanCell key={i} index={i} col={col} top={false} />
          ))}

          <QuanCell index={0} side={0} />
          <QuanCell index={6} side={1} />
        </View>
      </View>

      {picked != null ? (
        <View style={{ flexDirection: 'row', gap: S.md, justifyContent: 'center' }}>
          <Btn label="Rải ngược" icon="chevron-left" tone="secondary" onPress={() => sow(-1)} />
          <Btn label="Rải xuôi" icon="chevron-right" onPress={() => sow(1)} />
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
    </View>
  );
}
