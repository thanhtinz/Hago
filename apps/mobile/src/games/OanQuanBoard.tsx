import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps, GameLog, TurnBanner, VersusBar } from './shared';
import { GoldFlower, LeafSpray, MandarinChibi, Pit, QuanLid, QuanPit, Seed, WOOD, WoodGrain } from './OanQuanArt';

/**
 * Bàn Ô Ăn Quan dựng theo bản thiết kế: tấm gỗ nằm ngang, hai đầu là ô Quan
 * bầu dục khắc chữ, ở giữa hai hàng năm ô dân khoét tròn, vạch chia có hoa văn
 * vàng, bốn góc gắn hoa lá.
 *
 * Hàng dưới luôn là ô của người đang xem, hàng trên của đối thủ.
 */

/** Rải hạt trong lòng ô theo vòng tròn để nhìn như sỏi đổ thật. */
function SeedPile({ count, radius, seedSize, salt }: { count: number; radius: number; seedSize: number; salt: number }) {
  if (!count) return null;
  const shown = Math.min(count, 12);
  return (
    <View style={{ position: 'absolute', width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: shown }, (_, i) => {
        // Vòng trong tối đa 4 hạt, còn lại xoè ra vòng ngoài.
        const ring = i < 4 ? 0 : 1;
        const inRing = ring === 0 ? Math.min(shown, 4) : shown - 4;
        const idx = ring === 0 ? i : i - 4;
        const r = ring === 0 ? radius * 0.3 : radius * 0.62;
        const angle = (idx / Math.max(1, inRing)) * Math.PI * 2 + (ring ? 0.5 : 0) + salt;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }],
            }}
          >
            <Seed size={seedSize} tone={i + salt} />
          </View>
        );
      })}
    </View>
  );
}

export default function OanQuanBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const mine: number[] = view.own?.[mySeat] ?? [1, 2, 3, 4, 5];
  const iAmSeatZero = mine === view.own?.[0] || mySeat === 0;
  // Hàng của mình luôn nằm dưới.
  const bottomRow = iAmSeatZero ? [1, 2, 3, 4, 5] : [7, 8, 9, 10, 11];
  const topRow = iAmSeatZero ? [11, 10, 9, 8, 7] : [5, 4, 3, 2, 1];

  /**
   * Bàn nằm ngang, chiếm hết bề ngang màn hình: 5 ô dân ở giữa, hai đầu là ô
   * Quan rộng bằng 1.2 ô. Chiều cao ô co theo phần màn hình còn trống.
   */
  const pad = 9;
  const usable = Math.max(280, space.width - 4);
  const byWidth = (usable - pad * 2 - 8) / (5 + 1.2 * 2);
  const byHeight = (space.height - 280) / 2;
  const cell = Math.max(44, Math.floor(Math.min(byWidth, byHeight)));
  const quanW = Math.round(cell * 1.2);
  const boardW = cell * 5 + quanW * 2 + pad * 2 + 8;
  const boardH = cell * 2 + pad * 2 + 20;

  const sow = (dir: number) => {
    if (picked == null) return;
    send('sow', { cell: picked, dir });
    setPicked(null);
  };

  const DanCell = ({ index }: { index: number }) => {
    const count = view.cells[index];
    const own = mine.includes(index);
    const selectable = yourTurn && own && count > 0;
    const tone = picked === index ? 'picked' : view.lastPath?.includes(index) ? 'path' : 'idle';
    return (
      <Pressable
        disabled={!selectable}
        onPress={() => setPicked(index)}
        style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}
      >
        <Pit size={cell} tone={tone as any} />
        <SeedPile count={count} radius={cell * 0.34} seedSize={Math.max(9, cell * 0.23)} salt={index} />
        {/* Ô đang chọn được viền vàng đậm; ô mình đi được chỉ sáng vành nhẹ */}
        {selectable || picked === index ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: cell - 5,
              height: cell - 5,
              borderRadius: cell,
              borderWidth: picked === index ? 3 : 2,
              borderColor: picked === index ? C.primary : 'rgba(255,236,190,0.85)',
            }}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            minWidth: 18,
            paddingHorizontal: 4,
            borderRadius: R.pill,
            alignItems: 'center',
            backgroundColor: 'rgba(255,247,232,0.88)',
          }}
        >
          <Txt size={Math.max(11, Math.round(cell * 0.2))} weight="display" color="#5E3F1C">
            {count}
          </Txt>
        </View>
      </Pressable>
    );
  };

  const QuanCell = ({ index, side }: { index: number; side: 0 | 1 }) => {
    const alive = view.quan[side];
    const tone = side === 0 ? 'blue' : 'red';
    const h = cell * 2 + 12;
    return (
      <View style={{ width: quanW, height: h, alignItems: 'center', justifyContent: 'center' }}>
        <QuanPit width={quanW} height={h} empty={!alive} />
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {alive ? <MandarinChibi size={quanW * 0.78} tone={tone} /> : <QuanLid size={quanW * 0.68} tone={tone} />}
        </View>
        {/* Nhãn nằm dưới đáy ô, không đè lên quân */}
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: R.pill,
            alignItems: 'center',
            backgroundColor: 'rgba(255,246,229,0.9)',
            borderWidth: 1,
            borderColor: WOOD.rim,
          }}
        >
          <Txt size={10} weight="bold" color={WOOD.ink}>
            {alive ? `Quan ${view.quanValue}` : 'Đã ăn'}
          </Txt>
          {view.cells[index] ? (
            <Txt size={9} color="#8C6239">
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
        <LinearGradient
          colors={[WOOD.face, WOOD.faceLo]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[
            {
              width: boardW,
              height: boardH,
              borderRadius: 30,
              borderWidth: 4,
              borderColor: WOOD.rimDark,
              padding: pad,
              flexDirection: 'row',
              alignItems: 'center',
              overflow: 'hidden',
            },
            softShadow(0.22, 18, 9),
          ]}
        >
          <WoodGrain width={boardW} height={boardH} />

          <QuanCell index={0} side={0} />

          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row' }}>
              {topRow.map((i) => (
                <DanCell key={i} index={i} />
              ))}
            </View>
            {/* Vạch chia hai hàng, giữa gắn hoa văn */}
            <View style={{ height: 18, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 6, right: 6, height: 2, backgroundColor: WOOD.rim, opacity: 0.55 }} />
              <GoldFlower size={16} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              {bottomRow.map((i) => (
                <DanCell key={i} index={i} />
              ))}
            </View>
          </View>

          <QuanCell index={6} side={1} />

          {/* Hoa lá bốn góc như trong bản thiết kế */}
          <View pointerEvents="none" style={{ position: 'absolute', left: -2, top: -2 }}>
            <LeafSpray size={30} />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', right: -2, top: -2 }}>
            <LeafSpray size={30} flip />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: -2, bottom: -2 }}>
            <LeafSpray size={30} flip />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', right: -2, bottom: -2 }}>
            <LeafSpray size={30} />
          </View>
        </LinearGradient>
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
      <GameLog log={view.log} />
    </View>
  );
}
