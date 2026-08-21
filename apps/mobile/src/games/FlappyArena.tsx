import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '../components/ui';
import { Art } from '../components/Art';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps, GameLog } from './shared';

/**
 * Flappy Đua — hai chim bay trên cùng một hàng ống, chạm màn hình để vỗ cánh.
 *
 * Server tick 200ms một lần, quá thưa để nhìn mượt, nên client **nội suy**: lấy
 * state gần nhất rồi chạy tiếp đúng công thức vật lý của engine (cùng hằng số
 * trọng lực và tốc độ) ở 60fps. Va chạm và điểm vẫn do server quyết, client chỉ
 * vẽ cho mượt giữa hai lần nhận state.
 */
export default function FlappyArena({ view, mySeat, send, space }: BoardProps) {
  const [, redraw] = React.useState(0);
  React.useEffect(() => {
    let raf: any;
    const loop = () => {
      redraw((n) => (n + 1) % 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const worldW: number = view.worldW ?? 360;
  const worldH: number = view.worldH ?? 560;
  const scale = Math.min((space.width - 12) / worldW, (space.height - 150) / worldH);
  const W = worldW * scale;
  const H = worldH * scale;

  const now = Date.now();
  const dt = Math.max(0, Math.min(0.6, (now - (view.lastTick ?? now)) / 1000));
  const started = now >= (view.startAt ?? now) && !view.over;

  // Vị trí ngang chung của cả hai chim, chạy tiếp từ mốc server gửi.
  const x = (view.x ?? 0) + (started ? view.speed * dt : 0);
  const seatOf = (b: any) => b.seat;
  const me = mySeat < 0 ? 0 : mySeat;

  /** Độ cao hiện tại của một con chim, nội suy từ state gần nhất. */
  const yOf = (bird: any) => {
    if (!bird.alive || !started) return bird.y;
    return bird.y + bird.vy * dt + 0.5 * view.gravity * dt * dt;
  };
  /** Chim chúi mũi khi rơi, ngóc lên khi vừa vỗ cánh. */
  const tiltOf = (bird: any) => {
    if (!bird.alive) return 90;
    const vy = bird.vy + (started ? view.gravity * dt : 0);
    return Math.max(-28, Math.min(70, vy * 0.09));
  };

  const countdown = Math.max(0, (view.startAt ?? 0) - now);
  const myBird = view.birds.find((b: any) => b.seat === mySeat);
  // Chim đã rơi hoặc chưa hết đếm ngược thì server từ chối 'flap' — chặn ngay ở
  // client cho khỏi hiện toast lỗi mỗi lần người chơi còn quán tính bấm tiếp.
  const canFlap = !view.over && countdown === 0 && !!myBird?.alive;

  return (
    <View style={{ gap: S.sm, alignItems: 'center' }}>
      {/* Bảng điểm hai bên */}
      <View style={{ flexDirection: 'row', gap: S.sm, width: W }}>
        {view.birds.map((b: any) => (
          <View
            key={b.seat}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: b.seat === me ? C.surface : C.surfaceAlt,
              borderRadius: R.pill,
              borderWidth: 2,
              borderColor: b.alive ? SEAT_COLORS[b.seat] : C.line,
              paddingHorizontal: 10,
              paddingVertical: 6,
              opacity: b.alive ? 1 : 0.6,
            }}
          >
            <Art name="bird" size={16} color={SEAT_COLORS[b.seat]} />
            <Txt size={11} weight="bold" numberOfLines={1} style={{ flex: 1 }}>
              {view.players[b.seat]?.name ?? `P${b.seat + 1}`}
            </Txt>
            <Txt size={15} weight="display" color={SEAT_COLORS[b.seat]}>
              {b.score}
            </Txt>
            {!b.alive ? (
              <Txt size={10} color={C.inkFaint}>
                rơi
              </Txt>
            ) : null}
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => canFlap && send('flap', {})}
        style={[
          { width: W, height: H, borderRadius: R.lg, overflow: 'hidden', borderWidth: 3, borderColor: '#2C7CB8' },
          softShadow(0.2, 16, 8),
        ]}
      >
        <LinearGradient colors={['#8FD8FF', '#CFEEFF']} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />

        {/* Ống: cột trên và cột dưới chừa khe ở giữa */}
        {view.pipes.map((pipe: any) => {
          const left = (pipe.x - x) * scale;
          if (left > W || left + view.pipeW * scale < 0) return null;
          const w = view.pipeW * scale;
          const gapTop = (pipe.gapY - view.gap / 2) * scale;
          const gapBottom = (pipe.gapY + view.gap / 2) * scale;
          return (
            <View key={pipe.x} pointerEvents="none">
              <PipeBody left={left} top={0} width={w} height={gapTop} mouth="bottom" />
              <PipeBody left={left} top={gapBottom} width={w} height={H - gapBottom} mouth="top" />
            </View>
          );
        })}

        {/* Mặt đất chạy ngang cho thấy tốc độ */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10 * scale, backgroundColor: '#D9B871' }} />

        {/* Chim: của mình vẽ sau cùng để luôn nằm trên */}
        {[...view.birds].sort((a: any, b: any) => (seatOf(a) === me ? 1 : -1)).map((bird: any) => {
          const size = view.birdR * 2 * scale * 1.35;
          return (
            <View
              key={bird.seat}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: view.birdX * scale - size / 2,
                top: yOf(bird) * scale - size / 2,
                width: size,
                height: size,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: `${tiltOf(bird)}deg` }],
                opacity: bird.alive ? 1 : 0.55,
              }}
            >
              {/* Chim của đối thủ mờ hơn để không lẫn với chim mình */}
              <Art name="bird" size={size} color={SEAT_COLORS[bird.seat]} shadow />
            </View>
          );
        })}

        {countdown > 0 ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,40,60,0.25)' }}>
            <Txt size={64} weight="display" color="#FFFFFF">
              {Math.ceil(countdown / 1000)}
            </Txt>
            <Txt size={13} weight="bold" color="#FFFFFF">
              Chạm để vỗ cánh
            </Txt>
          </View>
        ) : null}
      </Pressable>

      <Txt size={11} color={C.inkFaint}>
        {view.over
          ? view.ending ?? 'Kết thúc'
          : myBird && !myBird.alive
            ? `Bạn đã rơi ở ống thứ ${myBird.score + 1} — chờ đối thủ`
            : 'Chạm bất kỳ đâu trên bầu trời để vỗ cánh'}
      </Txt>
      <GameLog log={view.log} />
    </View>
  );
}

/** Thân ống: cột xanh có miệng loe ở đầu hướng vào khe. */
function PipeBody({
  left,
  top,
  width,
  height,
  mouth,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  mouth: 'top' | 'bottom';
}) {
  if (height <= 0) return null;
  const lip = Math.min(16, Math.max(9, width * 0.22));
  return (
    <>
      <LinearGradient
        colors={['#4FBF5C', '#2E8B3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', left, top, width, height, borderWidth: 2, borderColor: '#1F5F2A' }}
      />
      <LinearGradient
        colors={['#5FD46C', '#33983F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: left - width * 0.07,
          top: mouth === 'bottom' ? top + height - lip : top,
          width: width * 1.14,
          height: lip,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: '#1F5F2A',
        }}
      />
    </>
  );
}
