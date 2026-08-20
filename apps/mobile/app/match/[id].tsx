import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Txt } from '../../src/components/ui';
import { Icon, IconName } from '../../src/components/Icon';
import { GameIcon, GameIconName } from '../../src/components/GameIcon';
import { DotPattern } from '../../src/components/decor';
import { StickerArt } from '../../src/components/Piece';
import { Art } from '../../src/components/Art';
import { placeArt } from '../../src/lib/rank';

import { C, GAME_GRADIENT, R, S, softShadow } from '../../src/theme';
import { BOARDS } from '../../src/games';
import { friendlyError } from '../../src/lib/api';
import { emitAck, newActionId } from '../../src/lib/socket';
import { useStore } from '../../src/state/store';

const GAME_NAMES: Record<string, string> = {
  caro: 'Cờ Caro',
  battleship: 'Bắn Tàu',
  oanquan: 'Ô Ăn Quan',
  sheep: 'Sheep Battle',
  monopoly: 'Cờ Tỷ Phú',
  ludo: 'Cờ Cá Ngựa',
  werewolf: 'Ma Sói',
};

const FLASH: Record<string, { icon: IconName; text: string }> = {
  win: { icon: 'trophy', text: 'Thắng rồi!' },
  kick: { icon: 'flame', text: 'Đá ngựa!' },
  bump: { icon: 'flame', text: 'Húc trúng!' },
  score: { icon: 'star', text: 'Ghi điểm!' },
  rent: { icon: 'coin', text: 'Thu tô!' },
  bankrupt: { icon: 'flame', text: 'Phá sản!' },
  chance: { icon: 'question', text: 'Cơ hội!' },
  push: { icon: 'flame', text: 'Đẩy lùi!' },
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { socket, profile, showToast, connected } = useStore();
  const [state, setState] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const flashTimer = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;
    const onState = (s: any) => s.matchId === id && setState(s);
    const onResult = (r: any) => r.matchId === id && setResult(r);
    const onEvent = (e: any) => {
      if (e.matchId !== id) return;
      const hit = e.events.map((x: any) => x.type).find((t: string) => FLASH[t]);
      if (hit) {
        setFlash(hit);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1300);
      }
    };
    socket.on('game.state', onState);
    socket.on('match.result', onResult);
    socket.on('game.event', onEvent);
    emitAck('game.sync', { matchId: id }).then((res: any) => res?.ok && setState(res.state));
    return () => {
      socket.off('game.state', onState);
      socket.off('match.result', onResult);
      socket.off('game.event', onEvent);
      clearTimeout(flashTimer.current);
    };
  }, [socket, id]);

  const send = async (type: string, payload: any = {}) => {
    const res: any = await emitAck('game.action', { matchId: id, actionId: newActionId(), type, payload });
    // Bấm nhanh hơn tốc độ hồi cừu, hoặc ô xuất phát đang có cừu khác cấp —
    // đều là nhịp chơi bình thường, không phải lỗi cần báo.
    const quiet = ['QUEUE_EMPTY', 'LANE_BLOCKED', 'MAX_LEVEL_REACHED'];
    if (!res?.ok && !quiet.includes(res?.error)) showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
  };

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <StatusBar hidden />
        <Icon name="dice" size={52} color={C.inkFaint} strokeWidth={1.8} />
        <Txt size={15} weight="heading" color={C.inkSoft}>
          Đang vào trận...
        </Txt>
      </View>
    );
  }

  const Board = BOARDS[state.gameType];
  const view = state.view;
  const mySeat = view.mySeat ?? view.players?.findIndex((p: any) => p.id === profile?.id) ?? 0;
  const grad = (GAME_GRADIENT[state.gameType] ?? ['#FF8A65', '#FF5E7D']) as [string, string];

  // Full screen: chỉ chừa HUD trên (48px) và safe area — phần còn lại là bàn chơi.
  const HUD = 46;
  const PAD = 8;
  const space = {
    width: width - PAD * 2,
    height: height - HUD - insets.top - insets.bottom - PAD * 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar hidden />

      {/* Nền nhuộm theo màu game: bàn cờ vuông luôn thừa chỗ trên màn dọc, để
          trống trơn thì trông như lỗi bố cục — nhuộm màu thì thành mặt bàn. */}
      <LinearGradient
        pointerEvents="none"
        colors={[grad[0] + '4D', grad[1] + '26', C.bg]}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <DotPattern rows={9} cols={9} gap={64} color={grad[1] + '26'} />

      {/* HUD mỏng, không chiếm chỗ của bàn chơi */}
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top,
          height: HUD + insets.top,
          paddingHorizontal: S.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Pressable onPress={() => setMenu(true)} hitSlop={12} style={{ paddingRight: 4 }}>
          <Txt size={22} weight="heading" color="rgba(255,255,255,0.95)">
            ‹
          </Txt>
        </Pressable>
        <GameIcon name={state.gameType as GameIconName} size={26} />
        <Txt size={15} weight="display" color="#fff" style={{ flex: 1 }}>
          {GAME_NAMES[state.gameType]}
        </Txt>
        {/* Chỉ báo khi mất kết nối; lúc bình thường không cần nhãn LIVE chiếm chỗ. */}
        {!connected ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: C.danger,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: R.pill,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
            <Txt size={10} weight="bold" color="#fff">
              Mất kết nối
            </Txt>
          </View>
        ) : null}
      </LinearGradient>

      {/* Bàn chơi chiếm toàn bộ phần còn lại */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          padding: PAD,
          paddingBottom: insets.bottom + PAD,
          // Căn giữa cả khối: bàn cờ vuông luôn thừa chiều cao trên màn dọc,
          // chia đều khoảng thừa cho trên và dưới thì cân hơn là dồn một chỗ.
          justifyContent: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {Board ? (
          <Board view={view} mySeat={mySeat} send={send} deadline={state.deadline} space={space} />
        ) : (
          <Txt center>Game chưa hỗ trợ</Txt>
        )}
      </ScrollView>

      {/* Hiệu ứng khoảnh khắc */}
      {flash ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center' }}>
          <View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: 'rgba(46,37,69,0.9)',
                paddingHorizontal: 22,
                paddingVertical: 12,
                borderRadius: R.pill,
              },
              softShadow(0.3, 20, 8),
            ]}
          >
            <Icon name={FLASH[flash].icon} size={26} color="#FFD36E" strokeWidth={2.2} />
            <Txt size={20} weight="display" color="#fff">
              {FLASH[flash].text}
            </Txt>
          </View>
        </View>
      ) : null}

      {/* Thoát trận */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: S.lg }} onPress={() => setMenu(false)}>
          <Card style={{ width: '100%', maxWidth: 340, gap: S.md }}>
            <Txt size={17} weight="heading">
              Rời trận đấu?
            </Txt>
            <Txt size={13} color={C.inkSoft}>
              Trận vẫn tiếp tục chạy trên máy chủ. Nếu bạn không quay lại trong 60 giây, hệ thống sẽ xử thua theo luật.
            </Txt>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Btn label="Chơi tiếp" tone="mint" style={{ flex: 1 }} full onPress={() => setMenu(false)} />
              <Btn label="Rời trận" tone="danger" onPress={() => router.replace('/')} />
            </View>
          </Card>
        </Pressable>
      </Modal>

      {/* Kết quả */}
      <Modal visible={!!result} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
          <Card style={{ width: '100%', maxWidth: 400, gap: S.md, alignItems: 'center' }}>
            {(() => {
              const mine = result?.rows.find((r: any) => r.userId === profile?.id);
              const win = mine?.result === 'win';
              const draw = mine?.result === 'draw';
              return (
                <>
                  {/* Mặt cảm xúc vẽ tay đọc rõ hơn icon nét ở cỡ lớn. */}
                  <StickerArt name={win ? 'win' : draw ? 'draw' : 'sad'} size={72} />
                  <Txt size={26} weight="display" color={win ? C.mint : draw ? C.sun : C.inkSoft}>
                    {win ? 'Chiến thắng!' : draw ? 'Hoà rồi!' : 'Thua mất rồi'}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: S.md }}>
                    <Reward icon="star" label="EXP" value={`+${mine?.xpGain ?? 0}`} color={C.secondary} />
                    <Reward icon="coin" label="Coin" value={`+${mine?.coinGain ?? 0}`} color={C.sun} />
                    {mine?.ratingDelta ? (
                      <Reward
                        icon="medal"
                        label="Rank"
                        value={`${mine.ratingDelta > 0 ? '+' : ''}${mine.ratingDelta}`}
                        color={mine.ratingDelta > 0 ? C.mint : C.danger}
                      />
                    ) : null}
                  </View>
                  {mine && mine.levelAfter > mine.levelBefore ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.sunSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill }}>
                      <Icon name="star" size={15} color="#9A6B00" strokeWidth={2.2} /> 
                      <Txt size={12} weight="bold" color="#9A6B00">
                        Lên cấp {mine.levelAfter}!
                      </Txt>
                    </View>
                  ) : null}

                  <View style={{ width: '100%', gap: 6, marginTop: 6 }}>
                    {result?.rows
                      .slice()
                      .sort((a: any, b: any) => a.place - b.place)
                      .map((r: any) => {
                        const p = view.players?.find((x: any) => x.id === r.userId);
                        return (
                          <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: S.sm }}>
                            {r.place <= 3 ? (
                              <Art name={placeArt(r.place)} size={22} color={r.place === 1 ? C.sun : r.place === 2 ? '#A9B4C2' : '#C4854B'} />
                            ) : (
                              <Txt size={13} weight="display" color={C.inkFaint} style={{ width: 20 }} center>
                                {r.place}
                              </Txt>
                            )}
                            <Txt size={13} weight="bold" style={{ flex: 1 }}>
                              {p?.name ?? r.userId}
                            </Txt>
                            <Txt size={12} weight="medium" color={C.inkSoft}>
                              {r.score} điểm
                            </Txt>
                          </View>
                        );
                      })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: S.sm, marginTop: 6 }}>
                    <Btn label="Về trang chủ" tone="ghost" onPress={() => router.replace('/')} />
                    <Btn label="Chơi tiếp" icon="refresh" onPress={() => router.replace('/quickplay')} />
                  </View>
                </>
              );
            })()}
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function Reward({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.md, gap: 2 }}>
      <Icon name={icon} size={19} color={color} strokeWidth={2.1} />
      <Txt size={17} weight="display" color={color}>
        {value}
      </Txt>
      <Txt size={10} color={C.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}
