import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { CLOCKS } from '@co/protocol';
import { faceOf } from '../games/faces';
import { Icon } from './Icon';
import { Btn, Txt, press } from './parts';
import { Panel } from './surface';
import { A, R, S } from './theme';

/**
 * Cụm hành động neo đáy sảnh.
 *
 * Ba điều kiện, học thẳng từ sảnh của những tựa game đông người chơi:
 *
 * 1. **Nút bắt đầu không bao giờ cuộn khỏi màn.** Trước đây cả sảnh nằm
 *    trong một `ScrollView`, nên một dải thẻ đủ dài đẩy chính cái nút vào
 *    trận xuống dưới khung nhìn.
 * 2. **Đúng một nút vàng, và nhãn của nó không đổi.** Cấu hình nằm trên hai
 *    chip ngay phía trên, nên nhãn "VÀO TRẬN" không bao giờ xuống dòng hay
 *    nhảy cỡ dù tên bộ môn dài đến đâu. Ngoại lệ duy nhất là lúc nối lại
 *    một ván đang dở, vì lúc đó nút làm một việc khác hẳn.
 * 3. **Hai trục, hai chip.** Bộ môn và chế độ vuông góc với nhau; nhét cả
 *    hai vào mặt nút thì mỗi lần đổi một trục là đọc lại cả câu.
 *
 * Màn dọc nên cụm này là một **dải ngang trọn chiều rộng** nằm trên thanh
 * điều hướng, không phải một nút góc dưới phải — ở màn dọc nút góc đọc ra
 * là một nút nổi, và nút nổi là thứ người ta học cách bỏ qua.
 */
export function StartDock({
  gameId,
  lan,
  clock,
  noiLai,
  nhip,
  onDoiBoMon,
  onDoiCheDo,
  onVaoTran,
}: {
  gameId: string;
  lan: 'xh' | 'thuong';
  clock: string;
  /** Đang có ghế trong một ván dở. Nút đổi việc, hai chip khoá lại. */
  noiLai: boolean;
  /**
   * Nhịp thở của sảnh, đặt **ngay trên nút**.
   *
   * Trước đây dòng này nằm dưới chữ ký ở đầu màn, xa nút bấm nhất có thể.
   * Nó trả lời đúng một câu — bấm vào có ai không — nên chỗ của nó là sát
   * cái nút ấy. `null` thì không in gì: chưa nhận được nhịp mà in "0
   * người" là nói sai về đúng cái điều người ta đang muốn biết.
   */
  nhip?: React.ReactNode;
  onDoiBoMon: () => void;
  onDoiCheDo: () => void;
  onVaoTran: () => void;
}) {
  const face = faceOf(gameId);
  const Motif = face?.Motif;
  const mucGio = clock && CLOCKS[clock as keyof typeof CLOCKS] ? ` · ${CLOCKS[clock as keyof typeof CLOCKS]!.nameVi}` : '';
  return (
    <View>
      {/* Dải tan 24 điểm: nội dung cuộn **chìm xuống dưới** cụm thay vì bị
          cắt ngang một đường. Phải tắt hẳn về 0, không để lại một cạnh. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: -24, height: 24 }} pointerEvents="none">
        <Svg width="100%" height={24}>
          <Defs>
            <LinearGradient id="dock-fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={A.bg} stopOpacity="0" />
              <Stop offset="1" stopColor={A.bg} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={24} fill="url(#dock-fade)" />
        </Svg>
      </View>
      <View style={{ backgroundColor: A.bg, paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm }}>
        {nhip}
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <ChipDoc a11y="Đổi bộ môn" mo={!noiLai} onPress={onDoiBoMon}>
            {Motif ? (
              <View style={{ width: 26, height: 17, borderRadius: 4, overflow: 'hidden', backgroundColor: face?.surface }}>
                <Motif />
              </View>
            ) : null}
            <Txt size={12.5} weight="semi" numberOfLines={1} style={{ flex: 1 }}>
              {face?.nameVi ?? gameId}
            </Txt>
          </ChipDoc>
          <ChipDoc a11y="Đổi chế độ" mo={!noiLai} onPress={onDoiCheDo}>
            <Icon name={lan === 'xh' ? 'crown' : 'bolt'} size={15} color={A.gold} />
            <Txt size={12.5} weight="semi" numberOfLines={1} style={{ flex: 1 }}>
              {lan === 'xh' ? 'Đấu xếp hạng' : `Đánh thường${mucGio}`}
            </Txt>
          </ChipDoc>
        </View>
        {/* Không làm mờ nút khi chưa đăng nhập: một nút mờ đọc ra là một bức
            tường, còn một nút sáng dẫn sang màn đăng nhập thì nói đúng rằng
            đây là chỗ bắt đầu. */}
        <Btn
          size="lg"
          label={noiLai ? 'VÀO LẠI VÁN' : 'VÀO TRẬN'}
          onPress={onVaoTran}
          style={{ marginTop: S.sm, minHeight: 72, borderRadius: R.lg }}
        />
      </View>
    </View>
  );
}

/** Một chip cấu hình: 44 điểm, một trục, luôn kèm mũi tên "đổi được". */
function ChipDoc({ a11y, mo, onPress, children }: { a11y: string; mo: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={!mo}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, borderRadius: R.pill, opacity: mo ? 1 : 0.5 }, press({ pressed })]}
    >
      <Panel radius={R.pill} tone={1}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md }}>
          {children}
          <Icon name="chevron" size={14} color={A.inkFaint} />
        </View>
      </Panel>
    </Pressable>
  );
}
