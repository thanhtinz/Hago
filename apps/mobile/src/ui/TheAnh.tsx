import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { Nhan, Panel, Txt, press } from './parts';
import { A, R, S, lift } from './theme';

/**
 * Thẻ có tranh — **một hình học duy nhất** cho cả app.
 *
 * Trước đây mỗi màn tự dựng một kiểu thẻ: sảnh một kiểu, danh mục một
 * kiểu, tấm chọn bộ môn thì không có tranh mà là một hàng ảnh 54×35 kèm
 * hai dòng chữ. Hậu quả nhìn thấy ngay: tranh to nhất của app nằm ở màn
 * ít quan trọng nhất, còn lúc chọn bộ môn cho ván xếp hạng thì nó bị bóp
 * còn con tem.
 *
 * Khoá thì **hiện**, không giấu. Với một nền tảng mới mở ba trên mười ba
 * bộ môn, mười thẻ "Sắp mở" biến điểm yếu thành một lộ trình nhìn thấy
 * được; giấu chúng đi thì nền tảng trông đúng bằng ba bộ môn.
 */
export function TheAnh({
  ten,
  phu,
  surface,
  Art,
  nhan,
  khoa,
  dieuKien,
  tienDo,
  dieuHuong,
  ngang,
  onPress,
  onGoc,
  gocLabel,
  a11y,
  testID,
}: {
  ten: string;
  phu?: string;
  /** Màu hở ra hai bên khi thẻ rộng hơn tỉ lệ 100:64 của tranh. */
  surface: string;
  Art: () => React.ReactElement;
  nhan?: string[];
  khoa?: boolean;
  /** Câu thay cho nhãn "Sắp mở" khi điều kiện mở là một câu cụ thể. */
  dieuKien?: string;
  tienDo?: { n: number; toi: number };
  /**
   * Thẻ này **đi ngay** chứ không nạp cấu hình. Đánh dấu bằng một mũi tên
   * ở góc tranh: hai loại kết quả khác nhau thì phải nhìn ra được khác
   * nhau trước khi chạm.
   */
  dieuHuong?: boolean;
  /**
   * Tranh nằm **bên trái**, chữ bên phải, cả thẻ thành một dải ngang.
   *
   * Dùng khi một nhóm chỉ có hai ba mục: ba thẻ trong một lưới hai cột thì
   * mục cuối đứng lẻ một mình nửa hàng, và một nửa hàng trống đọc ra là
   * thiếu mất một mục.
   */
  ngang?: boolean;
  onPress: () => void;
  /** Nút phụ ở góc dưới trái khung tranh, ví dụ "Luật". */
  onGoc?: () => void;
  gocLabel?: string;
  a11y?: string;
  testID?: string;
}) {
  const anh = (
    // Khoá thì **bạc màu và tối đi**, chứ không chỉ có một cái ổ khoá dán
    // lên trên: mười thẻ sáng bằng ba thẻ chơi được thì thứ bậc biến mất,
    // và người ta bấm nhầm rồi bực. Nhãn và chữ giữ nguyên độ sáng để câu
    // "Sắp mở" vẫn đọc được.
    <View style={{ aspectRatio: 100 / 64, borderRadius: 7, overflow: 'hidden', backgroundColor: surface, opacity: khoa ? 0.7 : 1 }}>
      <Art />
      {khoa ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#0B0E14',
            opacity: 0.45,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="lock" size={20} color={A.ink} />
        </View>
      ) : null}
      {khoa ? (
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <Nhan label={dieuKien ?? 'Sắp mở'} muted />
        </View>
      ) : dieuHuong ? (
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <Icon name="chevron" size={14} color={A.ink} />
        </View>
      ) : null}
      {onGoc ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${gocLabel ?? 'Luật'} ${ten}`}
          hitSlop={12}
          onPress={onGoc}
          style={({ pressed }) => [
            { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, backgroundColor: '#00000099' },
            press({ pressed }),
          ]}
        >
          <Txt size={11} weight="semi" color={A.ink}>
            {gocLabel ?? 'Luật'}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
  const chu = (
    <View style={{ gap: 5, flex: ngang ? 1 : undefined }}>
      <Txt size={15} weight="display" color={khoa ? A.inkSoft : A.ink} numberOfLines={1}>
        {ten}
      </Txt>
      {phu ? (
        <Txt size={11} color={A.inkFaint} numberOfLines={ngang ? 2 : 1}>
          {phu}
        </Txt>
      ) : null}
      {nhan?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {nhan.map((x) => (
            <Nhan key={x} label={x} />
          ))}
        </View>
      ) : null}
      {tienDo ? (
        <View style={{ height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: A.panelLo, marginTop: 2 }}>
          <View style={{ width: `${Math.round((tienDo.n / Math.max(1, tienDo.toi)) * 100)}%`, height: 3, backgroundColor: A.gold }} />
        </View>
      ) : null}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? ten}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [{ borderRadius: R.md, transform: [{ translateY: pressed ? 1 : 0 }] }, lift(khoa ? 0.24 : 0.4, 12, 5)]}
    >
      <Panel radius={R.md} tone={khoa ? 1 : 2} hairline={false} style={{ borderWidth: 1, borderColor: khoa ? A.lineSoft : A.line }}>
        {ngang ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: 6, paddingRight: S.md }}>
            <View style={{ width: 116 }}>{anh}</View>
            {chu}
          </View>
        ) : (
          <>
            <View style={{ padding: 6 }}>{anh}</View>
            <View style={{ paddingHorizontal: S.md, paddingBottom: S.md, paddingTop: 2 }}>{chu}</View>
          </>
        )}
      </Panel>
    </Pressable>
  );
}
