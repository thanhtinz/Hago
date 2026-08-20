import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bar, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { SheepBadge, SheepEffect, SheepSprite, SheepUnit } from '../components/SheepSprite';
import { SHEEP_STILLS } from '../art/sheepFight';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps } from './shared';

/**
 * Vùng 5 làn trong ảnh sàn gốc (540px). Đo bằng cách dò các dải bụi trong ảnh:
 * tâm 5 dải cỏ nằm ở x = 155, 239, 322, 406, 488 — bước làn ~83.6px — nên vùng
 * chơi là x 113–531. Ảnh còn kèm thanh ray bên trái, cắt bỏ luôn.
 */
const MAP_LANES = { x: 113, width: 418, full: 540 };

/**
 * Chỉ giữ đúng phần cỏ có làn: dải trời và nông trại nằm ở y 0–190, còn từ y 825
 * xuống đáy là đồng hoa phẳng lì không có bụi ngăn làn — để lại thì đáy sân (phía
 * người chơi) trông trống trơn, không liền với phần cỏ bên trên. Đo bằng độ nhiễu
 * màu theo từng hàng: bụi cỏ chạy đều tới y 820 rồi tắt hẳn ở 825.
 */
const MAP_ROWS = { y: 190, height: 635, full: 960 };

/** Cừu càng cấp cao càng to và nhiều chi tiết (sừng, gạc, vương miện). */
const LEVEL_SCALE = [0.74, 0.74, 0.86, 0.98, 1.1, 1.24];

export default function SheepArena({ view, mySeat, send, space }: BoardProps) {
  const [now, setNow] = useState(Date.now());
  /** Lần chạm gần nhất của từng làn, để chạy vệt sáng. */
  const [tapped, setTapped] = useState<Record<number, number>>({});
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const lanes: number = view.lanes;
  const len: number = view.laneLength;
  const me = mySeat < 0 ? 0 : mySeat;
  const foe = 1 - me;

  // Chừa chỗ cho hai thanh điểm, hàng chờ cừu và dòng hướng dẫn.
  const fieldMaxH = Math.max(220, space.height - 196);
  const cellW = Math.floor((space.width - 8) / lanes);
  const cell = Math.max(26, Math.min(cellW, Math.floor(fieldMaxH / len)));
  const fieldW = cell * lanes;
  const fieldH = cell * len;

  const left = Math.max(0, (view.endsAt ?? 0) - now);
  /** Hồi chiêu 5 giây giữa hai lần thả, đúng như maxCooldown của bản gốc. */
  const ready = Math.max(0, (view.readyAt ?? 0) - now);
  const nextLevel: number | undefined = view.myQueue?.[0];

  const rowOf = (pos: number) => (me === 0 ? len - 1 - pos : pos);

  /**
   * Chỗ hai phe đang tì nhau trong mỗi làn: lấy cặp gần nhau nhất rồi đặt đám
   * bụi vào chính giữa, thay vì mỗi con tự vẽ một đám lệch nhau.
   */
  const clashSpots: { lane: number; row: number }[] = [];
  {
    const byLane = new Map<number, any[]>();
    for (const u of view.units as any[]) {
      const pushing = (u.lockUntil && now < u.lockUntil) || (u.clashAt && now - u.clashAt < 420);
      if (!pushing) continue;
      const list = byLane.get(u.lane) ?? [];
      list.push(u);
      byLane.set(u.lane, list);
    }
    byLane.forEach((units, lane) => {
      const ours = units.filter((u) => u.seat === me);
      const theirs = units.filter((u) => u.seat !== me);
      let best: [any, any] | null = null;
      let gap = Infinity;
      for (const a of ours)
        for (const b of theirs) {
          const d = Math.abs(a.pos - b.pos);
          if (d < gap) {
            gap = d;
            best = [a, b];
          }
        }
      if (best) clashSpots.push({ lane, row: (rowOf(best[0].pos) + rowOf(best[1].pos)) / 2 });
    });
  }
  /** Sân luôn xoay để phần của mình nằm dưới, bất kể ngồi ghế nào. */

  return (
    <View style={{ gap: S.sm, alignItems: 'center' }}>
      {/* Đối thủ */}
      <SideBar
        name={view.players[foe]?.name ?? 'Đối thủ'}
        hp={view.hp[foe]}
        startHp={view.startHp}
        color={SEAT_COLORS[foe]}
        width={fieldW}
      />

      <View
        style={[
          { width: fieldW, height: fieldH, borderRadius: R.lg, overflow: 'hidden', borderWidth: 4, borderColor: '#3E8F63' },
          softShadow(0.2, 16, 8),
        ]}
      >
        {/* Sàn đấu gốc của Sheep Fight: 5 làn cỏ ngăn bằng hàng rào, nông trại
            phía xa, đồng hoa dưới chân. Ảnh gốc 540px còn kèm thanh ray bên
            trái (x 14–100 là viền trắng của nó), nên cắt bỏ phần đó và chỉ kéo
            đúng vùng 5 làn (x 99–519) cho khớp với 5 làn của bàn chơi. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: fieldW, height: fieldH, overflow: 'hidden' }}>
          <Image
            source={SHEEP_STILLS['map']}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              width: (fieldW / MAP_LANES.width) * MAP_LANES.full,
              height: (fieldH / MAP_ROWS.height) * MAP_ROWS.full,
              left: (-MAP_LANES.x / MAP_LANES.width) * fieldW,
              top: (-MAP_ROWS.y / MAP_ROWS.height) * fieldH,
            }}
          />
        </View>

        {/* Vệt sáng chạy dọc làn vừa thả cừu, cho biết chạm đã ăn */}
        {Array.from({ length: lanes }, (_, i) =>
          now - (tapped[i] ?? 0) < 380 ? (
            <View key={`lanefx${i}`} pointerEvents="none" style={{ position: 'absolute', left: i * cell, top: 0 }}>
              <SheepEffect name="lane-effect" width={cell} height={fieldH} frameMs={95} opacity={0.4} />
            </View>
          ) : null,
        )}

        {/* Vùng chạm để thả cừu — cả cột làn */}
        {Array.from({ length: lanes }, (_, i) => (
          <Pressable
            key={`tap${i}`}
            onPress={() => {
              setTapped((t) => ({ ...t, [i]: Date.now() }));
              send('deploy', { lane: i });
            }}
            style={({ pressed }) => ({
              position: 'absolute',
              left: i * cell,
              top: 0,
              width: cell,
              height: fieldH,
              backgroundColor: pressed ? 'rgba(255,255,255,0.35)' : 'transparent',
            })}
          />
        ))}

        {/* Cừu: mỗi bậc là một giống riêng, phe trắng nhìn từ sau, phe đen nhìn chính diện */}
        {view.units.map((u: any) => {
          const row = rowOf(u.pos);
          const mine = u.seat === me;
          const clashing = (!!u.lockUntil && now < u.lockUntil) || (!!u.clashAt && now - u.clashAt < 420);
          const body = cell * (LEVEL_SCALE[u.level] ?? 0.9);
          return (
            <SheepUnit
              key={u.id}
              x={u.lane * cell}
              y={row * cell}
              width={cell}
              height={cell}
              moveMs={view.moveMs ?? 620}
              clashing={clashing}
            >
              <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'flex-end', height: cell }}>
                {/* Bóng đổ để cừu đứng trên cỏ chứ không lơ lửng */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: cell * 0.08,
                    width: body * 0.52,
                    height: body * 0.1,
                    borderRadius: body,
                    backgroundColor: 'rgba(20,60,35,0.18)',
                  }}
                />
                <SheepSprite
                  tier={u.level}
                  team={mine ? 'w' : 'b'}
                  anim={clashing ? 'push' : 'walk'}
                  size={body}
                  frameMs={clashing ? 90 : 120}
                />
              </View>
            </SheepUnit>
          );
        })}
        {/* Bụi bốc lên chỗ hai phe tì nhau — hiệu ứng 8 khung của bộ art gốc */}
        {clashSpots.map((spot) => (
          <View
            key={`clash${spot.lane}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: spot.lane * cell,
              top: spot.row * cell,
              width: cell,
              height: cell,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SheepEffect name="push-effect" width={cell * 1.35} height={cell * 1.2} frameMs={60} />
          </View>
        ))}

      </View>

      {/* Bên mình */}
      <SideBar
        name={`${view.players[me]?.name ?? 'Bạn'} (bạn)`}
        hp={view.hp[me]}
        startHp={view.startHp}
        color={SEAT_COLORS[me]}
        width={fieldW}
        mine
        timeLeft={left}
      />

      {/* Hàng chờ cừu — con đầu là con sắp thả, kèm chỉ số nặng / sát thương */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: C.surface,
          borderRadius: R.pill,
          borderWidth: 2,
          borderColor: C.line,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Txt size={11} weight="bold" color={C.inkSoft}>
          {ready > 0 ? `Chờ ${(ready / 1000).toFixed(1)}s` : 'Sắp tới'}
        </Txt>
        {Array.from({ length: view.queueSize }, (_, i) => {
          const lvl = view.myQueue[i];
          const head = i === 0;
          return (
            <View
              key={i}
              style={{
                width: head ? 44 : 38,
                height: head ? 44 : 38,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: head && ready > 0 ? 0.45 : 1,
                backgroundColor: lvl ? (head ? C.mintSoft : C.surfaceAlt) : 'transparent',
                borderWidth: 2,
                borderColor: lvl ? (head ? C.mint : C.line) : C.line,
                borderStyle: lvl ? 'solid' : 'dashed',
              }}
            >
              {lvl ? <SheepBadge tier={lvl} team="w" size={head ? 34 : 30} /> : null}
            </View>
          );
        })}
        {nextLevel ? (
          <View style={{ gap: 1, paddingLeft: 2 }}>
            <Txt size={10} weight="bold" color={C.danger}>
              -{view.points?.[nextLevel] ?? 0} máu
            </Txt>
            <Txt size={10} color={C.inkFaint}>
              nặng {view.weights?.[nextLevel] ?? 0}
            </Txt>
          </View>
        ) : null}
      </View>

    </View>
  );
}

function SideBar({
  name,
  hp,
  startHp,
  color,
  width,
  mine,
  timeLeft,
}: {
  name: string;
  hp: number;
  startHp: number;
  color: string;
  width: number;
  mine?: boolean;
  timeLeft?: number;
}) {
  const low = hp <= startHp * 0.3;
  return (
    <View style={{ width, gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
          <Txt size={12} weight="bold" numberOfLines={1}>
            {name}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {mine && timeLeft !== undefined ? (
            <Txt size={13} weight="display" color={timeLeft < 15000 ? C.danger : C.inkSoft}>
              {Math.ceil(timeLeft / 1000)}s
            </Txt>
          ) : null}
          <Txt size={14} weight="display" color={low ? C.danger : color}>
            {hp}/{startHp} máu
          </Txt>
        </View>
      </View>
      <Bar value={hp} max={startHp} color={low ? C.danger : color} height={9} />
    </View>
  );
}
