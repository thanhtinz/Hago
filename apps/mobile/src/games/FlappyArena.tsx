import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '../components/ui';
import { FLAPPY_BIRD, FLAPPY_BIRD_RATIO } from '../art/flappy';
import { R, softShadow } from '../theme';
import { BoardProps } from './shared';

/**
 * Flappy Bird — chơi một mình, chạm màn hình để vỗ cánh, qua được bao nhiêu ống
 * thì bấy nhiêu điểm.
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
  // Full screen: co theo cạnh chật nhất của phần màn hình còn lại, không chừa
  // chỗ cho thanh nào nữa vì tiêu đề đã thành lớp đè tự ẩn.
  const scale = Math.min(space.width / worldW, space.height / worldH);
  const W = worldW * scale;
  const H = worldH * scale;

  const now = Date.now();
  const dt = Math.max(0, Math.min(0.6, (now - (view.lastTick ?? now)) / 1000));
  const started = now >= (view.startAt ?? now) && !view.over;

  const x = (view.x ?? 0) + (started ? view.speed * dt : 0);
  const bird = view.birds?.[Math.max(0, mySeat)] ?? view.birds?.[0];
  const countdown = Math.max(0, (view.startAt ?? 0) - now);
  // Chim đã rơi hoặc chưa hết đếm ngược thì server từ chối 'flap' — chặn ngay ở
  // client cho khỏi hiện toast lỗi mỗi lần người chơi còn quán tính bấm tiếp.
  const canFlap = !view.over && countdown === 0 && !!bird?.alive;

  /** Vận tốc dọc hiện tại, nội suy từ state gần nhất. */
  const vy = (bird?.vy ?? 0) + (started && bird?.alive ? view.gravity * dt : 0);
  const y = bird?.alive && started ? bird.y + bird.vy * dt + 0.5 * view.gravity * dt * dt : bird?.y ?? 0;
  /** Chim chúi mũi khi rơi, ngóc lên khi vừa vỗ cánh. */
  const tilt = bird?.alive ? Math.max(-26, Math.min(80, vy * 0.09)) : 90;
  // Vừa vỗ là cánh giơ lên, rơi nhanh là cánh hạ xuống, còn lại để ngang.
  const wing: 'up' | 'mid' | 'down' = vy < -140 ? 'up' : vy > 240 ? 'down' : 'mid';

  const birdH = view.birdR * 2 * scale * 1.5;
  const birdW = birdH * FLAPPY_BIRD_RATIO;

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={() => canFlap && send('flap', {})}
        style={[{ width: W, height: H, borderRadius: R.md, overflow: 'hidden' }, softShadow(0.18, 14, 6)]}
      >
        <LinearGradient colors={['#4EC0CA', '#9BE0E8']} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />

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
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12 * scale, backgroundColor: '#DED895', borderTopWidth: 2 * scale, borderTopColor: '#7BC24E' }} />

        <Image
          source={FLAPPY_BIRD[wing]}
          style={{
            position: 'absolute',
            left: view.birdX * scale - birdW / 2,
            top: y * scale - birdH / 2,
            width: birdW,
            height: birdH,
            transform: [{ rotate: `${tilt}deg` }],
          }}
          // Giữ nguyên cạnh răng cưa của pixel art, không cho trình duyệt làm mượt.
          resizeMode="contain"
        />

        {/* Điểm to giữa trời, đúng kiểu bản gốc */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 14, alignItems: 'center' }}>
          <Txt size={46} weight="display" color="#FFFFFF" style={{ textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 }}>
            {bird?.score ?? 0}
          </Txt>
        </View>

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
        colors={['#8CD860', '#5CA82F', '#3F7A1E']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', left, top, width, height, borderWidth: 2, borderColor: '#3A5F1B' }}
      />
      <LinearGradient
        colors={['#9CE471', '#63B336', '#437F1F']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: left - width * 0.08,
          top: mouth === 'bottom' ? top + height - lip : top,
          width: width * 1.16,
          height: lip,
          borderWidth: 2,
          borderColor: '#3A5F1B',
        }}
      />
    </>
  );
}
