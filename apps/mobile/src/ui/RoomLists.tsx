import React from 'react';
import { Pressable, View } from 'react-native';
import { CLOCKS, type LiveRoom, type OpenRoom } from '@co/protocol';
import { faceOf } from '../games/faces';
import { Icon } from './Icon';
import { Txt, press } from './parts';
import { A, R, S } from './theme';

/**
 * Hai danh sách phòng, dùng ở trang "Ván đấu".
 *
 * Trước đây hai danh sách này nằm giữa sảnh. Sảnh vốn đã là nơi bấm để
 * **bắt đầu** một việc — đấu với máy, ghép cặp, mở phòng — và chen hai
 * danh sách dài vào giữa thì cái lưới bộ môn bị đẩy xuống dưới màn hình
 * thứ hai, đúng lúc sảnh đông người là lúc nó bị đẩy xa nhất. Hai danh
 * sách là nơi để **đi tới và duyệt**, nên chúng thuộc về một trang riêng.
 */

export function OpenRow({ room, onPress }: { room: OpenRoom; onPress: () => void }) {
  const face = faceOf(room.gameId);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Vào phòng của ${room.host}`}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.md,
          padding: S.md,
          borderRadius: R.md,
          backgroundColor: A.panel,
          borderWidth: 1,
          borderColor: A.goldDeep,
        },
        press({ pressed }),
      ]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Txt size={13.5} weight="semi" color={A.ink} numberOfLines={1}>
          {room.host}
        </Txt>
        <Txt size={11} color={A.inkFaint}>
          {face?.nameVi ?? room.gameId} · {room.clock ? (CLOCKS[room.clock]?.nameVi ?? 'Theo bộ môn') : 'Theo bộ môn'} ·{' '}
          {waited(room.waitedMs)}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="door" size={15} color={A.gold} />
        <Txt size={12} weight="semi" color={A.gold}>
          Vào
        </Txt>
      </View>
    </Pressable>
  );
}

/**
 * Đã chờ bao lâu, nói theo cách người ta nói.
 *
 * "Vừa mở" chứ không phải "0 phút": một phòng mở được ba giây mà ghi 0
 * phút thì đọc như một phòng hỏng.
 */
export function waited(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'vừa mở';
  if (m < 60) return `chờ ${m} phút`;
  return `chờ ${Math.floor(m / 60)} giờ`;
}


export function LiveRow({ room, onPress }: { room: LiveRoom; onPress: () => void }) {
  const face = faceOf(room.gameId);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Xem ván ${room.names[0] ?? ''} với ${room.names[1] ?? ''}`}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: S.md,
          padding: S.md,
          borderRadius: R.md,
          backgroundColor: A.panel,
          borderWidth: 1,
          borderColor: A.lineSoft,
        },
        press({ pressed }),
      ]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Txt size={13.5} weight="semi" color={A.ink} numberOfLines={1}>
          {room.names[0] ?? '—'} — {room.names[1] ?? '—'}
        </Txt>
        <Txt size={11} color={A.inkFaint}>
          {face?.nameVi ?? room.gameId} · nước {room.ply}
          {room.rated ? ' · xếp hạng' : ''}
          {room.fans > 0 ? ` · ${room.fans} đang xem` : ''}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="eye" size={15} color={A.gold} />
        <Txt size={12} weight="semi" color={A.gold}>
          Xem
        </Txt>
      </View>
    </Pressable>
  );
}

/**
 * Trang trống, nói rõ vì sao trống và làm gì tiếp.
 *
 * Một danh sách rỗng không kèm câu nào đọc như một trang chưa tải xong.
 */
export function NoRooms({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xxl * 2, paddingHorizontal: S.xl }}>
      <Txt size={14.5} weight="display" color={A.inkSoft} center>
        {title}
      </Txt>
      <Txt size={12} color={A.inkFaint} center style={{ lineHeight: 19 }}>
        {body}
      </Txt>
    </View>
  );
}
