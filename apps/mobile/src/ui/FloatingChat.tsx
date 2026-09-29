import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, useAuth } from '../net/api';
import { useLive } from '../net/live';
import { ChatPanel } from './Chat';
import { Face } from './Crest';
import { Icon } from './Icon';
import { Panel, SLOP, Txt, press } from './parts';
import { Chip } from './Tabs';
import { A, R, S, glow, lift } from './theme';
import { useBackClose } from './useBackClose';

/**
 * Nút chat nổi, kéo được, và tấm trò chuyện mở ra từ nó.
 *
 * Nổi lên trên mọi màn hình vì tin nhắn đến bất kỳ lúc nào; kéo được vì nó
 * chắc chắn sẽ che mất một thứ gì đó — ở đây là góc bàn cờ — và người chơi
 * phải tự dời được nó đi mà không cần ai làm hộ.
 *
 * **Trong ván đấu, nút chỉ mở chat của phòng đó.** Không phải vì khó làm,
 * mà vì đang đánh cờ thì một tin nhắn từ người khác là thứ kéo sự chú ý ra
 * khỏi bàn cờ — và người ngồi đối diện có quyền biết đối thủ đang nói với
 * ai. Sảnh chung và tin riêng vẫn còn nguyên khi ra khỏi ván.
 */

const SIZE = 54;

/**
 * Khoảng phải chừa ở mép phải cho nút chat nổi.
 *
 * Nút nổi trên **mọi** màn, nên bất kỳ nút nào dán sát mép phải đều có
 * nguy cơ nằm dưới nó — và nằm dưới nó thì bấm không được, mà nhìn thì
 * vẫn thấy. Màn nào có nút sát mép phải thì chừa đúng chừng này.
 */
export const CHAT_SPACE = SIZE + 10;
const MARGIN = 12;

type Tab = 'chung' | 'rieng' | 'he-thong';

export function FloatingChat() {
  const { me } = useAuth();
  const s = useLive();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const W = Math.min(width, 460);

  // Đang trong một ván có phòng: nút đổi sang chat phòng.
  const inMatch = !!s.room?.code && path.startsWith('/online');
  const roomChannel = s.room?.code ? `phong:${s.room.code}` : null;

  /**
   * Trong ván **không hiện số chưa đọc**.
   *
   * Số đó đếm tin riêng và thông báo hệ thống, mà trong ván thì nút chỉ mở
   * chat phòng — bấm vào không thấy gì mới. Một con số dẫn tới chỗ không có
   * gì tệ hơn là không có con số nào.
   */
  const unread = useMemo(
    () => (inMatch ? 0 : Object.values(s.unread).reduce((n, x) => n + x, 0) + s.unreadSystem),
    [s.unread, s.unreadSystem, inMatch],
  );

  // Không đăng nhập thì không có gì để chat. Ở màn đăng nhập cũng không hiện.
  if (!me || path === '/auth') return null;
  // Đang ở màn nhắn riêng thì nút nổi là thừa, và nó che đúng ô nhập tin.
  if (path.startsWith('/chat/')) return null;

  return (
    <>
      <Bubble unread={unread} inMatch={inMatch} onPress={() => setOpen(true)} W={W} height={height} insets={insets} />
      {open ? (
        <Sheet
          meId={me.id}
          W={W}
          height={height}
          insets={insets}
          inMatch={inMatch}
          roomChannel={roomChannel}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

/** Bong bóng kéo được, tự dính vào mép trái hoặc mép phải khi thả. */
function Bubble({
  unread,
  inMatch,
  onPress,
  W,
  height,
  insets,
}: {
  unread: number;
  inMatch: boolean;
  onPress: () => void;
  W: number;
  height: number;
  insets: { top: number; bottom: number };
}) {
  const right = W - SIZE - MARGIN;
  const low = height - insets.bottom - SIZE - 96;
  /**
   * Chỗ đậu mặc định: **sát đáy**, ngay trên thanh điều hướng.
   *
   * Trước đây nó đậu ở khoảng giữa chiều cao màn, mà giữa màn là nơi mọi
   * màn hình đặt nội dung: nó che mất ngày tháng trong danh sách thiết bị,
   * che nút "Mời" trong màn chờ, che một quân cờ trên bàn. Đáy phải là chỗ
   * quen của một nút nổi, và cũng là chỗ ngón cái với tới dễ nhất. Kéo đi
   * chỗ khác vẫn được.
   */
  const pos = useRef(new Animated.ValueXY({ x: right, y: low })).current;
  /**
   * Thời điểm vừa thả tay sau một cú kéo.
   *
   * Dùng mốc thời gian chứ không phải cờ đúng/sai: cú kéo trên web sinh ra
   * một sự kiện `click` ngay sau khi thả, và một cờ chỉ đặt lại lúc bắt đầu
   * cử chỉ sau thì giữ nguyên `true` qua mọi cú bấm thường — **nút không bao
   * giờ mở được nữa sau lần kéo đầu tiên**. Mốc thời gian tự hết hạn.
   */
  const draggedAt = useRef(0);

  const pan = useRef(
    PanResponder.create({
      // Chỉ nhận là kéo khi ngón đi quá vài điểm ảnh. Nhận ngay từ nét chạm
      // đầu thì mọi cú bấm đều thành cú kéo dài 0 điểm và nút không bấm được.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        pos.extractOffset();
      },
      onPanResponderMove: (_e, g) => {
        draggedAt.current = Date.now();
        pos.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: () => {
        draggedAt.current = Date.now();
        pos.flattenOffset();
        const x = (pos.x as unknown as { _value: number })._value;
        const y = (pos.y as unknown as { _value: number })._value;
        // Dính mép: thả ở giữa màn thì nó che nội dung, mà không ai cố ý muốn
        // để một nút nổi đứng giữa màn hình.
        Animated.spring(pos, {
          toValue: {
            x: x + SIZE / 2 < W / 2 ? MARGIN : right,
            y: Math.max(insets.top + MARGIN, Math.min(y, low)),
          },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
    >
      <Pressable
        onPress={() => Date.now() - draggedAt.current > 200 && onPress()}
        accessibilityRole="button"
        accessibilityLabel={unread ? `Mở chat, ${unread} tin chưa đọc` : 'Mở chat'}
        style={[
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: A.panelHi,
            borderWidth: 1.6,
            borderColor: inMatch ? A.goldDeep : A.line,
          },
          glow(0.3, 12),
          lift(0.5, 14, 5),
        ]}
      >
        <Icon name="chat" size={24} color={inMatch ? A.gold : A.inkSoft} />
      </Pressable>
      {unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 5,
            backgroundColor: A.seal,
            borderWidth: 1.6,
            borderColor: A.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={11} weight="bold" color="#FFF">
            {unread > 9 ? '9+' : unread}
          </Txt>
        </View>
      ) : null}
    </Animated.View>
  );
}

function Sheet({
  meId,
  W,
  height,
  insets,
  inMatch,
  roomChannel,
  onClose,
}: {
  meId: string;
  W: number;
  height: number;
  insets: { top: number; bottom: number };
  inMatch: boolean;
  roomChannel: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const s = useLive();
  const [tab, setTab] = useState<Tab>('chung');
  const [convos, setConvos] = useState<
    { withId: string; withName: string; withAvatar: string | null; last: { body: string; at: number; fromId: string | null }; unread: number }[]
  >([]);

  useEffect(() => {
    if (tab === 'rieng' && !inMatch) void api.conversations().then((r) => setConvos(r.rows)).catch(() => setConvos([]));
  }, [tab, inMatch, s.unread]);

  /**
   * Trong ván thì tấm chat **thấp hơn hẳn**, và nền mờ cũng nhạt hơn.
   *
   * Đang đánh cờ mà mở chat lên che mất bàn cờ là buộc người ta phải đóng
   * lại mới nhìn được nước vừa đi — tức là không nhắn được trong lúc chơi,
   * đúng cái việc nó sinh ra để làm.
   */
  const H = inMatch ? Math.min(height * 0.44, 340) : Math.min(height * 0.72, 560);
  const channel = inMatch ? roomChannel : tab === 'chung' ? 'chung' : tab === 'he-thong' ? `he-thong` : null;
  useBackClose(true, onClose);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng chat"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: inMatch ? 0.28 : 0.55 }}
      />
      {/* Ô nhắn tin nằm sát đáy tấm, mà tấm thì dán đáy màn — không có lớp
          né bàn phím thì bàn phím che đúng cái ô đang gõ. iOS không bao giờ
          tự co màn hộ. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Panel radius={R.xl} tone={1} seed={83}>
        <View style={{ height: H, padding: S.lg, paddingBottom: insets.bottom + S.md, gap: S.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Txt size={16} weight="display" style={{ flex: 1 }}>
              {inMatch ? 'Trò chuyện trong phòng' : 'Trò chuyện'}
            </Txt>
            <Pressable onPress={onClose} hitSlop={SLOP} accessibilityRole="button" accessibilityLabel="Đóng" style={press}>
              <Icon name="close" size={18} color={A.inkSoft} />
            </Pressable>
          </View>

          {inMatch ? (
            <Txt size={10.5} color={A.inkFaint}>
              Đang trong ván nên chỉ thấy tin của phòng này.
            </Txt>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip label="Chung" on={tab === 'chung'} onPress={() => setTab('chung')} />
              <Chip
                label="Riêng"
                on={tab === 'rieng'}
                badge={Object.values(s.unread).reduce((n, x) => n + x, 0)}
                onPress={() => setTab('rieng')}
              />
              <Chip label="Hệ thống" on={tab === 'he-thong'} badge={s.unreadSystem} onPress={() => setTab('he-thong')} />
            </View>
          )}

          {!inMatch && tab === 'rieng' ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2 }}>
              {convos.length === 0 ? (
                <Txt size={12} color={A.inkFaint} center style={{ paddingVertical: S.xl }}>
                  Chưa nhắn riêng với ai. Vào mục Bạn bè để bắt đầu.
                </Txt>
              ) : null}
              {convos.map((c) => (
                <Pressable
                  key={c.withId}
                  accessibilityRole="button"
                  accessibilityLabel={`Nhắn với ${c.withName}`}
                  onPress={() => {
                    onClose();
                    router.push(`/chat/${c.withId}`);
                  }}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 12 },
                    press({ pressed }),
                  ]}
                >
                  <Face avatar={c.withAvatar ?? null} id={c.withId} size={36} ring={false} />
                  <View style={{ flex: 1 }}>
                    <Txt size={13.5} weight="semi" numberOfLines={1}>
                      {c.withName}
                    </Txt>
                    <Txt size={11} color={A.inkFaint} numberOfLines={1}>
                      {c.last.fromId === meId ? 'Bạn: ' : ''}
                      {c.last.body}
                    </Txt>
                  </View>
                  {c.unread > 0 ? (
                    <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: A.seal, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt size={11} weight="bold" color="#FFF">
                        {c.unread > 9 ? '9+' : c.unread}
                      </Txt>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : channel ? (
            <ChatPanel channel={channel} meId={meId} readOnly={tab === 'he-thong' && !inMatch} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={12} color={A.inkFaint}>
                Chưa vào phòng nào.
              </Txt>
            </View>
          )}
        </View>
      </Panel>
      </KeyboardAvoidingView>
    </View>
  );
}
