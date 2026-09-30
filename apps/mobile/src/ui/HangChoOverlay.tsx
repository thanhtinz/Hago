import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLOCKS } from '@co/protocol';
import { faceOf } from '../games/faces';
import { live, useLive } from '../net/live';
import { Btn, Txt } from './parts';
import { Panel } from './surface';
import { A, F, R, S, lift } from './theme';
import { useBackClose } from './useBackClose';

/**
 * Hàng chờ tìm đối: một **lớp phủ trên sảnh**, không phải một màn.
 *
 * Trước đây bấm ghép cặp là điều hướng sang `/online/quick`, tức là vào
 * hàng chờ tốn một lần rời sảnh và huỷ tốn một lần quay lui. Với một nền
 * người chơi mỏng — nơi chờ hai phút rồi không có ai là chuyện thường —
 * cái giá đó quyết định người ta có dám bấm hay không. Ở đây huỷ là một
 * chạm và không mất gì: sảnh vẫn nguyên ở phía sau lớp mờ.
 *
 * Đồng hồ đếm **lên**, không đếm ngược và không hứa "khoảng 12 giây": máy
 * chủ này không có đủ người để hứa, và một lời hứa sai về thời gian chờ bị
 * bắt bài trong đúng một lần.
 */
export function HangChoOverlay({
  gameId,
  lan,
  clock,
  onClose,
}: {
  gameId: string;
  lan: 'xh' | 'thuong';
  clock: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = useLive();
  const [giay, setGiay] = useState(0);
  useBackClose(true, onClose);

  // Gửi ý định **đúng một lần**, kể cả khi màn render lại: hai gói `quick`
  // liên tiếp làm máy chủ xếp mình vào hàng hai lần và lần huỷ chỉ gỡ được
  // một. `forget()` trước để một lần ghép hỏng trước đó không còn thế cờ cũ.
  const daGui = useRef(false);
  useEffect(() => {
    if (daGui.current) return;
    daGui.current = true;
    // Rời ghế cũ trước: ván xong rồi mà chưa rời phòng thì máy chủ vẫn giữ
    // chỗ, và gói `quick` tiếp theo rơi vào một người đang ngồi đâu đó.
    // `leave()` với người không ở phòng nào là một lệnh rỗng.
    live.leave();
    live.forget();
    live.quick(gameId, lan === 'thuong' && clock ? clock : undefined, lan === 'xh');
  }, [gameId, lan, clock]);

  useEffect(() => {
    const t = setInterval(() => setGiay((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Ghép được thì vào bàn. `replace` chứ không `push`: hàng chờ không phải
  // một chặng để quay lui vào.
  useEffect(() => {
    if (s.room) router.replace('/online/live');
  }, [s.room, router]);

  const ten = faceOf(gameId)?.nameVi ?? gameId;
  const mucGio = lan === 'thuong' && clock && CLOCKS[clock as keyof typeof CLOCKS] ? ` · ${CLOCKS[clock as keyof typeof CLOCKS]!.nameVi}` : '';
  const huy = () => {
    live.leave();
    live.forget();
    onClose();
  };

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Huỷ tìm đối"
        onPress={huy}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 }}
      />
      <Panel radius={R.xl} tone={1} style={lift(0.6, 30, -8)}>
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: insets.bottom + S.lg, alignItems: 'center' }}>
          <Txt size={17} weight="display">
            Đang tìm đối
          </Txt>
          {/* Chữ số cùng bề rộng: không có nó thì con số nhảy ngang mỗi
              giây, và một thứ nhúc nhích trong lúc chờ đọc ra là lỗi. */}
          <Txt size={28} weight="bold" color={A.gold} style={{ fontFamily: F.bodyBold, fontVariant: ['tabular-nums'] }}>
            {dongHo(giay)}
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {lan === 'xh' ? 'Đấu xếp hạng' : 'Đánh thường'} · {ten}
            {mucGio}
          </Txt>
          {/* Máy chủ đếm **cả mình** trong `waiting`, nên "1 người đang
              chờ" chính là mình — một con số đúng mà đọc ra thành sai. Chỉ
              in khi có người khác thật sự đang đứng cùng hàng. */}
          {s.waiting != null && s.waiting > 1 ? (
            <Txt size={11.5} color={A.inkSoft}>
              {s.waiting - 1} người khác cũng đang chờ
            </Txt>
          ) : null}
          {s.error ? (
            <Txt size={11.5} color={A.seal} center>
              {s.error}
            </Txt>
          ) : null}
          <Btn label="Huỷ" tone="ghost" onPress={huy} style={{ alignSelf: 'stretch', marginTop: S.xs }} />
        </View>
      </Panel>
    </View>
  );
}

/** `0:07`, `1:24`. Phút và giây, không giờ — chờ tới một giờ là đã bỏ máy. */
function dongHo(giay: number): string {
  const m = Math.floor(giay / 60);
  const g = giay % 60;
  return `${m}:${String(g).padStart(2, '0')}`;
}
