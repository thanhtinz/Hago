import React, { useEffect, useState } from 'react';
import { ScrollView, Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backToLobby } from '../src/nav';
import { useAuth } from '../src/net/api';
import { useLive } from '../src/net/live';
import { BottomNav } from '../src/ui/BottomNav';
import { Icon } from '../src/ui/Icon';
import { Btn, Txt, press } from '../src/ui/parts';
import { LiveRow, NoRooms, OpenRow } from '../src/ui/RoomLists';
import { Segmented } from '../src/ui/Tabs';
import { AppBackdrop } from '../src/ui/surface';
import { A, S } from '../src/ui/theme';

/**
 * Ván đấu: phòng đang chờ, và ván đang đánh.
 *
 * Hai danh sách này từng nằm giữa sảnh. Sảnh vốn là nơi bấm để **bắt đầu**
 * một việc — đấu với máy, ghép cặp, mở phòng — và chen hai danh sách dài
 * vào giữa thì lưới bộ môn bị đẩy xuống màn hình thứ hai, đúng lúc sảnh
 * đông người là lúc nó bị đẩy xa nhất. Duyệt phòng là một việc khác hẳn
 * việc bắt đầu một ván, nên nó có trang riêng và một cửa riêng ở thanh
 * dưới.
 *
 * Hai thẻ chứ không phải hai mục cuộn nối nhau: người mở trang này đã biết
 * mình muốn **vào đánh** hay muốn **ngồi xem**, và hai việc đó không trộn
 * vào một danh sách được.
 */
export default function RoomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me } = useAuth();
  const s = useLive();
  const { tab: want } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'cho' | 'danh'>(want === 'danh' ? 'danh' : 'cho');

  // Nhãn "chờ 3 phút" lấy mốc từ lúc máy chủ gửi danh sách, mà máy chủ chỉ
  // gửi khi có người vào ra. Không tự nhích thì một phòng mở nửa tiếng vẫn
  // ghi "vừa mở" — một con số đứng yên là một con số nói dối.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  // `lobbyAt` là 0 khi chưa nhận nhịp nào; lúc đó quãng bù là 0, không
  // phải cả quãng từ 1970.
  const since = s.lobbyAt ? Math.max(0, Date.now() - s.lobbyAt) : 0;

  const w = Math.min(width, 460);
  const open = s.openRooms;
  const live = s.liveRooms;

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Về sảnh" style={press}>
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={19} weight="display" style={{ flex: 1 }}>
          Ván đấu
        </Txt>
      </View>

      <View style={{ paddingHorizontal: S.lg, paddingVertical: S.md }}>
        <Segmented
          label="Thẻ"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'cho', name: `Đang chờ${open.length ? ` (${open.length})` : ''}` },
            { id: 'danh', name: `Đang đánh${live.length ? ` (${live.length})` : ''}` },
          ]}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xxl, gap: S.sm }}>
        {tab === 'cho' ? (
          open.length ? (
            open.map((r) => (
              <OpenRow
                key={r.code}
                room={{ ...r, waitedMs: r.waitedMs + since }}
                onPress={() => go(router, me, `/online/join?${new URLSearchParams({ code: r.code }).toString()}`)}
              />
            ))
          ) : (
            <>
              <NoRooms
                title="Chưa ai mở phòng"
                body="Phòng có mật khẩu không hiện ở đây. Bạn mở một phòng thì người lạ cũng tìm thấy nó ở đúng chỗ này."
              />
              <Btn icon="door" label="Mở một phòng" onPress={() => backToLobby(router, { mo: 'phong' })} />
            </>
          )
        ) : live.length ? (
          live.map((r) => (
            <LiveRow key={r.code} room={r} onPress={() => go(router, me, `/theo-doi/${r.code}`)} />
          ))
        ) : (
          <NoRooms
            title="Chưa có ván nào đang đánh"
            body="Ván trong phòng có mật khẩu không hiện ở đây. Khi có người đánh, bạn xem được ngay từ nước đầu."
          />
        )}
      </ScrollView>

      <BottomNav active="van" />
    </View>
  );
}

/** Chưa đăng nhập thì đi qua màn đăng nhập trước, không bấm vào hư không. */
function go(router: ReturnType<typeof useRouter>, me: unknown, to: string): void {
  router.push(me ? (to as never) : '/auth');
}
