import React, { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faceOf } from '../games/faces';
import { live, useLive } from '../net/live';
import { feedback } from './feedback';
import { Icon } from './Icon';
import { Btn, Txt } from './parts';
import { Panel } from './surface';
import { A, R, S, lift } from './theme';

/**
 * Lời rủ đấu đến, hiện **ở bất kỳ màn nào**.
 *
 * Trước đây nó chỉ vẽ trong trang Bạn bè, còn ở sảnh thì chỉ hiện thành
 * một chấm đỏ nhỏ trên ô "Bạn bè". Nhưng lời rủ **hết hạn sau hai phút**
 * và bên kia đang ngồi chờ: bắt người ta đoán ra chấm đỏ nghĩa là gì rồi
 * mới đi tìm đúng màn là đủ để hầu hết lời rủ chết già.
 *
 * Trượt từ trên xuống chứ không từ dưới lên: đáy màn đã có nút chat nổi và
 * thanh điều hướng, mà đây là việc gấp nên nó không nên phải chen chỗ.
 *
 * Không hiện trong lúc đang ở bàn cờ — đang đánh dở mà nhận lời rủ khác
 * thì chỉ tổ bấm nhầm, và máy chủ cũng từ chối với mã BUSY.
 */
export function ChallengeToast() {
  const s = useLive();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const inMatch = path.startsWith('/online') || path.startsWith('/play');
  const c = s.challenges.find((x) => x.dir === 'in');
  // Một tiếng chuông nhỏ khi lời rủ vừa tới. Lời rủ hết hạn sau hai phút
  // và người kia đang ngồi chờ; một tấm trượt xuống im lặng thì người đang
  // nhìn chỗ khác không biết gì.
  const rang = useRef<string | null>(null);
  useEffect(() => {
    if (!c) {
      rang.current = null;
      return;
    }
    if (rang.current === c.id) return;
    rang.current = c.id;
    feedback.bao();
  }, [c?.id]);
  // Trang Bạn bè đã vẽ đầy đủ mọi lời rủ ngay trong dòng chảy của nó rồi.
  if (!c || inMatch || path.startsWith('/friends')) return null;

  return (
    // Tối thiểu 12 điểm kể cả khi không có tai thỏ: dán sát mép trên thì
    // tấm trông như bị cắt cụt chứ không như một thứ vừa trượt xuống.
    <View style={{ position: 'absolute', left: 0, right: 0, top: Math.max(insets.top, 12) + S.sm, paddingHorizontal: S.md }}>
      <Panel
        radius={R.lg}
        tone={2}
        seed={19}
        hairline={false}
        style={[{ borderWidth: 1.6, borderColor: A.gold }, lift(0.55, 24, 8)]}
      >
        <View style={{ gap: S.sm, padding: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Icon name="bolt" size={16} color={A.gold} />
            <Txt size={13.5} weight="semi" style={{ flex: 1 }}>
              <Txt size={13.5} weight="bold" color={A.gold}>
                {c.withName}
              </Txt>{' '}
              rủ bạn một ván {faceOf(c.gameId)?.nameVi ?? c.gameId}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Btn tone="ghost" label="Để lúc khác" style={{ flex: 1 }} onPress={() => live.answer(c.id, false)} />
            <Btn label="Vào ngay" style={{ flex: 1.2 }} onPress={() => live.answer(c.id, true)} />
          </View>
        </View>
      </Panel>
    </View>
  );
}
