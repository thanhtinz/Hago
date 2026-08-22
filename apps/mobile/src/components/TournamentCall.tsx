import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Txt } from './ui';
import { Icon } from './Icon';
import { GameIcon, GameIconName } from './GameIcon';
import { C, R, S, softShadow } from '../theme';
import { api, friendlyError } from '../lib/api';
import { useStore } from '../state/store';

/**
 * Thanh gọi vào trận của giải đấu, nổi trên mọi màn.
 *
 * Cửa sổ xác nhận chỉ vài phút và hết giờ là bị xử thua, nên lời gọi không được
 * phép nằm yên trong trang bang chờ người ta tự mở ra xem — nó phải đi theo
 * người chơi. Trạng thái đến bằng socket `tournament.call`; lúc mở app thì hỏi
 * một phát cho khỏi lỡ lời gọi đã bắn trước khi kết nối.
 */
export function TournamentCall() {
  const { socket, profile, showToast } = useStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const [call, setCall] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const hydrate = useCallback(() => {
    api<any>('/api/tournaments/pending')
      .then((r) => setCall(r.call))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile) return setCall(null);
    hydrate();
  }, [profile, hydrate]);

  useEffect(() => {
    if (!socket) return;
    const onCall = (p: any) => setCall(p?.call ?? null);
    // Mất mạng rồi vào lại có thể đã lỡ vài sự kiện, hỏi lại cho chắc.
    socket.on('tournament.call', onCall);
    socket.on('connect', hydrate);
    return () => {
      socket.off('tournament.call', onCall);
      socket.off('connect', hydrate);
    };
  }, [socket, hydrate]);

  useEffect(() => {
    if (!call) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [call]);

  // Đang trong trận thì thôi: màn chơi cần trọn bề ngang, mà người đang đánh
  // cũng không phải người đang bị gọi.
  const inMatch = segments[0] === 'match';
  if (!call || inMatch) return null;

  const secs = Math.max(0, Math.round((call.deadline - now) / 1000));
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const urgent = secs <= 30;

  const enter = async () => {
    setBusy(true);
    try {
      await api(`/api/tournaments/${call.tournamentId}/ready`, { method: 'POST' });
    } catch (e: any) {
      showToast(friendlyError(e?.message), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 8, alignItems: 'center', paddingHorizontal: S.md }}
    >
      <View
        style={[
          {
            width: '100%',
            maxWidth: 420,
            flexDirection: 'row',
            alignItems: 'center',
            gap: S.sm,
            backgroundColor: urgent ? C.dangerSoft : C.sunSoft,
            borderRadius: R.lg,
            borderWidth: 2,
            borderColor: urgent ? C.danger : '#E8C46A',
            paddingHorizontal: S.md,
            paddingVertical: 10,
          },
          softShadow(0.18, 14, 6),
        ]}
      >
        <GameIcon name={call.gameType as GameIconName} size={26} tint={urgent ? C.danger : '#9A6B00'} />
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/guild')}>
          <Txt size={13} weight="bold" color={urgent ? C.danger : '#7A5A00'} numberOfLines={1}>
            {call.iAmReady ? `Chờ ${call.opponentName} vào trận` : `Tới lượt: gặp ${call.opponentName}`}
          </Txt>
          <Txt size={11} color={urgent ? C.danger : '#9A6B00'} numberOfLines={1}>
            {call.name} · còn {clock}
          </Txt>
        </Pressable>
        {call.iAmReady ? (
          <Icon name="check" size={20} color="#1F7A50" strokeWidth={3} />
        ) : (
          <Btn label="Vào trận" size="sm" tone="sun" disabled={busy} onPress={enter} />
        )}
      </View>
    </View>
  );
}
