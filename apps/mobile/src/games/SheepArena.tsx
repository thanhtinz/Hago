import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bar, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { SheepPiece } from '../components/Piece';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps } from './shared';

/** Cừu càng cấp cao càng to và nhiều chi tiết (sừng, gạc, vương miện). */
const LEVEL_SCALE = [0.78, 0.78, 0.86, 0.94, 1.02, 1.1];

export default function SheepArena({ view, mySeat, send, space }: BoardProps) {
  const [now, setNow] = useState(Date.now());
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
  /** Sân luôn xoay để phần của mình nằm dưới, bất kể ngồi ghế nào. */
  const rowOf = (pos: number) => (me === 0 ? len - 1 - pos : pos);

  return (
    <View style={{ gap: S.sm, alignItems: 'center' }}>
      {/* Đối thủ */}
      <SideBar
        name={view.players[foe]?.name ?? 'Đối thủ'}
        score={view.score[foe]}
        target={view.targetScore}
        color={SEAT_COLORS[foe]}
        queueCount={view.foeQueueCount}
        width={fieldW}
      />

      <View
        style={[
          { width: fieldW, height: fieldH, borderRadius: R.lg, overflow: 'hidden', borderWidth: 4, borderColor: '#3E8F63' },
          softShadow(0.2, 16, 8),
        ]}
      >
        {/* Cỏ sọc theo làn */}
        {Array.from({ length: lanes }, (_, i) => (
          <LinearGradient
            key={`lane${i}`}
            colors={i % 2 === 0 ? ['#6FCB8F', '#4FB877'] : ['#63C486', '#46B06E']}
            style={{ position: 'absolute', left: i * cell, top: 0, width: cell, height: fieldH }}
          />
        ))}
        {/* Vệt máy cắt cỏ chạy ngang — sân bóng thật luôn có sọc hai chiều */}
        {Array.from({ length: len }, (_, r) =>
          r % 2 === 0 ? (
            <View
              key={`mow${r}`}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top: r * cell, height: cell, backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
          ) : null,
        )}
        {/* Vạch dọc chia làn */}
        {Array.from({ length: lanes - 1 }, (_, i) => (
          <View
            key={`line${i}`}
            pointerEvents="none"
            style={{ position: 'absolute', left: (i + 1) * cell - 1, top: 0, width: 2, height: fieldH, backgroundColor: 'rgba(255,255,255,0.16)' }}
          />
        ))}
        {/* Vạch giữa sân + vòng tròn trung tâm */}
        <View style={{ position: 'absolute', top: fieldH / 2 - 1.5, left: 0, width: fieldW, height: 3, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: fieldH / 2 - cell,
            left: fieldW / 2 - cell,
            width: cell * 2,
            height: cell * 2,
            borderRadius: cell,
            borderWidth: 3,
            borderColor: 'rgba(255,255,255,0.55)',
          }}
        />
        {/* Khung thành hai đầu: nơi cừu lọt qua là ghi điểm */}
        {[0, 1].map((end) => (
          <View
            key={`goal${end}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: cell * 0.6,
              right: cell * 0.6,
              top: end === 0 ? 0 : undefined,
              bottom: end === 1 ? 0 : undefined,
              height: cell * 0.55,
              backgroundColor: 'rgba(255,255,255,0.14)',
              borderBottomWidth: end === 0 ? 3 : 0,
              borderTopWidth: end === 1 ? 3 : 0,
              borderColor: 'rgba(255,255,255,0.6)',
            }}
          />
        ))}

        {/* Vùng chạm để thả cừu — cả cột làn */}
        {Array.from({ length: lanes }, (_, i) => (
          <Pressable
            key={`tap${i}`}
            onPress={() => send('deploy', { lane: i })}
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

        {/* Ô xuất phát của mình */}
        {Array.from({ length: lanes }, (_, i) => (
          <View
            key={`spawn${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: i * cell + 3,
              top: fieldH - cell + 3,
              width: cell - 6,
              height: cell - 6,
              borderRadius: 10,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,0.75)',
            }}
          />
        ))}

        {/* Cừu */}
        {view.units.map((u: any) => {
          const row = rowOf(u.pos);
          const mine = u.seat === me;
          const clashing = u.clashAt && now - u.clashAt < 400;
          return (
            <View
              key={u.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: u.lane * cell,
                top: row * cell,
                width: cell,
                height: cell,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Vòng nền theo màu phe để phân biệt cừu ta / cừu địch */}
              <View
                style={{
                  position: 'absolute',
                  width: cell * 0.9,
                  height: cell * 0.9,
                  borderRadius: cell,
                  backgroundColor: clashing ? '#FFD8D8' : mine ? 'rgba(255,255,255,0.55)' : 'rgba(46,37,69,0.13)',
                  borderWidth: 2,
                  borderColor: mine ? SEAT_COLORS[me] : SEAT_COLORS[foe],
                }}
              />
              {/* Cừu mình trắng, cừu đối thủ sẫm — nhìn lướt vẫn phân biệt được phe. */}
              <SheepPiece
                size={cell * (LEVEL_SCALE[u.level] ?? 0.78)}
                level={u.level}
                body={mine ? '#FFFFFF' : '#3B2A5A'}
              />
              {u.level > 1 ? (
                <View
                  style={{
                    position: 'absolute',
                    right: 1,
                    bottom: 1,
                    minWidth: 15,
                    paddingHorizontal: 3,
                    borderRadius: 8,
                    backgroundColor: mine ? SEAT_COLORS[me] : SEAT_COLORS[foe],
                  }}
                >
                  <Txt size={9} weight="bold" color="#fff" center>
                    {u.level}
                  </Txt>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Bên mình */}
      <SideBar
        name={`${view.players[me]?.name ?? 'Bạn'} (bạn)`}
        score={view.score[me]}
        target={view.targetScore}
        color={SEAT_COLORS[me]}
        width={fieldW}
        mine
        timeLeft={left}
      />

      {/* Hàng chờ cừu */}
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
          Sắp tới
        </Txt>
        {Array.from({ length: view.queueSize }, (_, i) => {
          const lvl = view.myQueue[i];
          return (
            <View
              key={i}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: lvl ? (i === 0 ? C.mintSoft : C.surfaceAlt) : 'transparent',
                borderWidth: 2,
                borderColor: lvl ? (i === 0 ? C.mint : C.line) : C.line,
                borderStyle: lvl ? 'solid' : 'dashed',
              }}
            >
              {/* Trên nền trắng của hàng chờ thì cừu tô màu phe mới nhìn ra. */}
              {lvl ? <SheepPiece size={30} level={lvl} body={i === 0 ? '#1F8F5F' : SEAT_COLORS[me]} /> : null}
            </View>
          );
        })}
      </View>

      {/* Trận realtime nên bỏ nhật ký chữ: mọi diễn biến đã thấy ngay trên sân. */}
      <Txt size={11} color={C.inkFaint} center style={{ maxWidth: space.width - 20 }}>
        Chạm vào làn để thả cừu · trùng cấp thì hợp thể · lọt sân đối thủ là ghi điểm
      </Txt>
    </View>
  );
}

function SideBar({
  name,
  score,
  target,
  color,
  width,
  queueCount,
  mine,
  timeLeft,
}: {
  name: string;
  score: number;
  target: number;
  color: string;
  width: number;
  queueCount?: number;
  mine?: boolean;
  timeLeft?: number;
}) {
  return (
    <View style={{ width, gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
          <Txt size={12} weight="bold" numberOfLines={1}>
            {name}
          </Txt>
          {queueCount !== undefined ? (
            <Txt size={10} color={C.inkFaint}>
              · {queueCount} cừu chờ
            </Txt>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {mine && timeLeft !== undefined ? (
            <Txt size={13} weight="display" color={timeLeft < 15000 ? C.danger : C.inkSoft}>
              {Math.ceil(timeLeft / 1000)}s
            </Txt>
          ) : null}
          <Txt size={14} weight="display" color={color}>
            {score}/{target}
          </Txt>
        </View>
      </View>
      <Bar value={score} max={target} color={color} height={9} />
    </View>
  );
}
