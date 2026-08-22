import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Chip, Txt } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { DotPattern } from '../../src/components/decor';
import { C, GAME_GRADIENT, R, S, SEAT_COLORS, softShadow } from '../../src/theme';
import { BOARDS, GAME_NAMES } from '../../src/games';
import { SpectateProvider, activeSeatName, spectatorView } from '../../src/games/shared';
import { api } from '../../src/lib/api';
import { useStore } from '../../src/state/store';

const SPEEDS = [0.5, 1, 2, 4];

/**
 * Xem lại trận. Server đã chụp sẵn từng khung (xem services/replays.ts) nên ở
 * đây chỉ việc tua qua mảng khung theo đúng mốc thời gian thật của trận — không
 * chạy lại engine, không nối socket, mở lúc nào cũng ra đúng ván đó.
 */
export default function ReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { profile, showToast } = useStore();

  const [replay, setReplay] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [trackW, setTrackW] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    api<any>(`/api/matches/${id}/replay`)
      .then((r) => alive && setReplay(r.replay))
      .catch(() => alive && setError('Trận này không có bản xem lại'));
    return () => {
      alive = false;
    };
  }, [id]);

  const frames: any[] = replay?.frames ?? [];
  const last = frames.length - 1;

  /**
   * Nhảy sang khung kế tiếp sau đúng khoảng cách thời gian giữa hai khung. Đặt
   * hẹn giờ từng khung một thay vì chạy đồng hồ chung: khung của game theo lượt
   * cách nhau vài giây, khung realtime cách nhau vài trăm ms, một nhịp cố định
   * không tả được cả hai.
   */
  useEffect(() => {
    clearTimeout(timer.current);
    if (!playing || idx >= last) return;
    const gap = Math.max(60, frames[idx + 1].at - frames[idx].at);
    // Nước đi cách nhau cả phút (người chơi suy nghĩ lâu) thì tua nhanh cho đỡ chán.
    timer.current = setTimeout(() => setIdx((i) => Math.min(last, i + 1)), Math.min(2500, gap) / speed);
    return () => clearTimeout(timer.current);
  }, [playing, idx, last, speed, frames]);

  useEffect(() => {
    if (idx >= last && last > 0) setPlaying(false);
  }, [idx, last]);

  const seekTo = useCallback(
    (ratio: number) => {
      if (!frames.length) return;
      const target = frames[last].at * Math.min(1, Math.max(0, ratio));
      let best = 0;
      for (let i = 0; i < frames.length; i++) if (frames[i].at <= target) best = i;
      setIdx(best);
    },
    [frames, last],
  );

  const frame = frames[idx];
  /**
   * Ghế của chính người đang xem trong trận đó. Caro và Ô Ăn Quan không khai
   * `mySeat` trong view (mọi thứ đều công khai) nên phải tra từ danh sách người
   * chơi — không thì màn xem lại mặc định lấy ghế 0 và gọi nhầm người khác là
   * "Bạn".
   */
  const mySeat: number = replay?.players?.find((p: any) => p.id === profile?.id)?.seat ?? -1;
  const normalized = useMemo(() => spectatorView(frame?.view, Math.max(0, mySeat)), [frame, mySeat]);
  // Xem lại thì chẳng tới lượt ai cả: luôn nói tên người đang đi thay vì giục.
  const spectate = useMemo(
    () => ({ spectating: mySeat < 0, activeName: activeSeatName(frame?.view, mySeat) }),
    [frame, mySeat],
  );

  if (error || (replay && !frames.length)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: S.lg }}>
        <StatusBar hidden />
        <Icon name="play" size={48} color={C.inkFaint} strokeWidth={1.8} />
        <Txt size={15} weight="heading" color={C.inkSoft} center>
          {error ?? 'Trận này không có bản xem lại'}
        </Txt>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Txt size={13} weight="bold" color={C.primary}>
            Quay lại
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (!replay) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <StatusBar hidden />
        <Icon name="play" size={48} color={C.inkFaint} strokeWidth={1.8} />
        <Txt size={15} weight="heading" color={C.inkSoft}>
          Đang tải bản xem lại...
        </Txt>
      </View>
    );
  }

  const Board = BOARDS[replay.gameType];
  const grad = (GAME_GRADIENT[replay.gameType] ?? ['#FF8A65', '#FF5E7D']) as [string, string];
  const BAR = 118;
  const space = {
    width: width - 12,
    height: height - insets.top - insets.bottom - BAR - 52,
  };
  const progress = frames[last].at ? frame.at / frames[last].at : 1;
  const mine = replay.rows.find((r: any) => r.userId === profile?.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar hidden />
      <LinearGradient
        pointerEvents="none"
        colors={[grad[0] + '4D', grad[1] + '26', C.bg]}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <DotPattern rows={9} cols={9} gap={64} color={grad[1] + '26'} />

      {/* Thanh tiêu đề: ở đây không tự ẩn như màn chơi, vì xem lại thì cái nhãn
          "Xem lại" và nút thoát cần luôn thấy được để khỏi tưởng đang chơi thật. */}
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top,
          height: 46 + insets.top,
          paddingHorizontal: S.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomLeftRadius: R.lg,
          borderBottomRightRadius: R.lg,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 4 }}>
          <Txt size={22} weight="heading" color="rgba(255,255,255,0.95)">
            ‹
          </Txt>
        </Pressable>
        <GameIcon name={replay.gameType as GameIconName} size={26} />
        <Txt size={15} weight="display" color="#fff" style={{ flex: 1 }}>
          {GAME_NAMES[replay.gameType] ?? replay.gameType}
        </Txt>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: 'rgba(0,0,0,0.25)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: R.pill,
          }}
        >
          <Icon name="play" size={11} color="#fff" strokeWidth={2.4} />
          <Txt size={10} weight="bold" color="#fff">
            XEM LẠI
          </Txt>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 6, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {Board ? (
          <SpectateProvider value={spectate}>
            <Board
              view={normalized.view}
              mySeat={normalized.seat}
              // Xem lại thì không gửi được nước đi nào; báo nhẹ thay vì im lặng.
              send={() => showToast('Đang xem lại — không thao tác được', 'warn')}
              // Deadline trong khung là mốc tuyệt đối của ngày hôm đó, hiện lại chỉ
              // ra một đồng hồ đếm ngược sai bét. Xem lại thì bỏ hẳn.
              deadline={null}
              space={space}
            />
          </SpectateProvider>
        ) : (
          <Txt center>Game chưa hỗ trợ xem lại</Txt>
        )}
      </ScrollView>

      {/* Bảng điều khiển phát lại */}
      <View
        style={[
          {
            paddingHorizontal: S.md,
            paddingTop: S.sm,
            paddingBottom: insets.bottom + S.sm,
            backgroundColor: C.surface,
            borderTopLeftRadius: R.lg,
            borderTopRightRadius: R.lg,
            gap: S.sm,
          },
          softShadow(0.16, 18, -6),
        ]}
      >
        <Pressable
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
          onPress={(e) => trackW && seekTo(e.nativeEvent.locationX / trackW)}
          hitSlop={10}
          style={{ height: 8, borderRadius: 4, backgroundColor: C.surfaceAlt, justifyContent: 'center' }}
        >
          <View style={{ height: 8, borderRadius: 4, width: `${progress * 100}%`, backgroundColor: grad[0] }} />
          <View
            style={{
              position: 'absolute',
              left: Math.max(0, progress * trackW - 7),
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#fff',
              borderWidth: 3,
              borderColor: grad[0],
            }}
          />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Txt size={11} weight="bold" color={C.inkSoft} style={{ width: 78 }}>
            {fmtClock(frame.at)} / {fmtClock(frames[last].at)}
          </Txt>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} hitSlop={10}>
              <Icon name="rewind" size={20} color={C.inkSoft} />
            </Pressable>
            <Pressable
              onPress={() => {
                // Bấm phát khi đang đứng ở khung cuối thì xem lại từ đầu.
                if (idx >= last) setIdx(0);
                setPlaying((v) => !v);
              }}
              hitSlop={12}
              style={[
                { width: 46, height: 46, borderRadius: 23, backgroundColor: grad[0], alignItems: 'center', justifyContent: 'center' },
                softShadow(0.2, 10, 4),
              ]}
            >
              <Icon name={playing ? 'pause' : 'play'} size={22} color="#fff" strokeWidth={2.4} />
            </Pressable>
            <Pressable onPress={() => setIdx((i) => Math.min(last, i + 1))} hitSlop={10}>
              <Icon name="forward" size={20} color={C.inkSoft} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
            hitSlop={10}
            style={{
              width: 78,
              alignItems: 'flex-end',
            }}
          >
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, backgroundColor: C.surfaceAlt }}>
              <Txt size={12} weight="bold" color={C.ink}>
                {speed}x
              </Txt>
            </View>
          </Pressable>
        </View>

        {/* Kết quả chỉ hiện khi đã tua tới cuối, không thì lộ mất cái hồi hộp. */}
        {idx >= last ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {replay.rows
              .slice()
              .sort((a: any, b: any) => a.place - b.place)
              .map((r: any) => {
                const p = replay.players.find((x: any) => x.id === r.userId);
                return (
                  <View
                    key={r.userId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: R.pill,
                      backgroundColor: r.result === 'win' ? C.mintSoft : C.surfaceAlt,
                    }}
                  >
                    <Avatar seed={p?.avatarSeed ?? r.userId} styleName={p?.avatarStyle} size={20} ring={SEAT_COLORS[p?.seat ?? 0]} />
                    <Txt size={11} weight="bold">
                      {p?.name ?? r.userId}
                    </Txt>
                    <Txt size={11} weight="medium" color={r.result === 'win' ? '#1F7A50' : C.inkSoft}>
                      {r.result === 'win' ? 'Thắng' : r.result === 'draw' ? 'Hoà' : 'Thua'} · {r.score}
                    </Txt>
                  </View>
                );
              })}
            {mine ? <Chip label={`${mine.ratingDelta > 0 ? '+' : ''}${mine.ratingDelta} rank`} icon="trend" color={mine.ratingDelta >= 0 ? C.mint : C.danger} soft={C.surfaceAlt} size={10} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function fmtClock(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
