import React from 'react';
import { Pressable, View } from 'react-native';
import { THANG, VAN_DINH_HANG, conMayVan, danhHieuOf } from '@co/protocol';
import { faceOf } from '../games/faces';
import type { GameStat } from '../net/api';
import { AnHang } from './AnHang';
import { Icon } from './Icon';
import { Nhan, Txt, press } from './parts';
import { Panel } from './surface';
import { A, R, S, lift } from './theme';

/**
 * Dải hạng của sảnh.
 *
 * Con số Elo của app này tính **riêng từng bộ môn**, nên một con số đứng
 * một mình là một con số bịa. Dải này luôn đi kèm tên bộ môn, và bộ môn ấy
 * là **bộ môn đang nạp trên cụm hành động**, không phải bộ môn đánh nhiều
 * nhất — người vừa đổi sang cờ gánh mà vẫn thấy điểm cờ caro thì con số
 * đang nói về một ván khác với ván họ sắp đánh.
 *
 * Ba trạng thái suy biến gom hết vào đây vì đây là chỗ dễ in số sai nhất:
 * chưa đăng nhập, chưa đủ ván định hạng, và bậc cuối thang.
 */
export function DaiHang({
  gameId,
  stats,
  daDangNhap,
  onPress,
}: {
  gameId: string;
  stats: GameStat[];
  daDangNhap: boolean;
  onPress: () => void;
}) {
  const ten = faceOf(gameId)?.nameVi ?? gameId;

  if (!daDangNhap) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng nhập để tính điểm"
        onPress={onPress}
        style={({ pressed }) => [{ marginHorizontal: S.lg, borderRadius: R.md }, lift(0.4, 12, 5), press({ pressed })]}
      >
        <Panel radius={R.md} tone={1}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md }}>
            <Icon name="crown" size={19} color={A.gold} />
            <Txt size={13.5} weight="semi" style={{ flex: 1 }}>
              Đăng nhập để tính điểm
            </Txt>
            <Icon name="chevron" size={16} color={A.inkFaint} />
          </View>
        </Panel>
      </Pressable>
    );
  }

  const row = stats.find((s) => s.gameId === gameId);
  const rating = row?.rating ?? 1200;
  const ranked = row?.ranked ?? 0;
  const b = danhHieuOf(rating, ranked);
  // Bậc cuối: `eloDen` là 99_999, một con số không ai tới. Thanh tiến độ
  // tới một bậc không tồn tại là thứ bịa; ở đây thanh **biến mất** hẳn chứ
  // không đầy 100%.
  const sau = b ? THANG.find((x) => x.bac === b.bac + 1) : null;
  const ty = b && sau ? Math.max(0, Math.min(1, (rating - b.eloTu) / (b.eloDen + 1 - b.eloTu))) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={b ? `Hạng ${b.ten}, ${rating} điểm ${ten}` : `Chưa định hạng ${ten}`}
      onPress={onPress}
      style={({ pressed }) => [{ marginHorizontal: S.lg, borderRadius: R.md }, lift(0.4, 12, 5), press({ pressed })]}
    >
      <Panel radius={R.md} tone={1}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
          <AnHang bac={b?.bac ?? null} size={84} />
          <View style={{ flex: 1, gap: 4 }}>
            {b ? (
              <>
                <Txt size={21} weight="display" color={A.gold} numberOfLines={1}>
                  {b.ten}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Txt size={28} weight="display">
                    {rating}
                  </Txt>
                  <Txt size={12} color={A.inkFaint}>
                    {' '}
                    điểm
                  </Txt>
                </View>
                {sau ? (
                  <>
                    <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: A.panelLo }}>
                      <View style={{ width: `${Math.round(ty * 100)}%`, height: 4, backgroundColor: A.gold }} />
                    </View>
                    <Txt size={11} color={A.inkFaint} numberOfLines={1}>
                      Còn {sau.eloTu - rating} điểm lên {sau.ten}
                    </Txt>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Txt size={17} weight="display" color={A.inkSoft}>
                  Chưa định hạng
                </Txt>
                {/* Năm chấm thay cho thanh tiến độ: định hạng đếm **ván**,
                    không đếm điểm, và một thanh liền mạch nói sai đơn vị. */}
                <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 3 }}>
                  {Array.from({ length: VAN_DINH_HANG }, (_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: i < ranked ? A.gold : 'transparent',
                        borderWidth: i < ranked ? 0 : 1,
                        borderColor: A.line,
                      }}
                    />
                  ))}
                </View>
                <Txt size={11} color={A.inkFaint}>
                  Còn {conMayVan(ranked)} ván định hạng
                </Txt>
              </>
            )}
          </View>
        </View>
        {/* Tên bộ môn ở góc: điểm của app này tính riêng từng bộ môn, nên
            con số phía trên không được đứng một mình. */}
        <View testID="dai-hang-bo-mon" style={{ position: 'absolute', right: S.md, bottom: S.md }}>
          <Nhan label={ten} />
        </View>
      </Panel>
    </Pressable>
  );
}
