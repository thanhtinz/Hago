import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { registry } from '@co/core';
import { CLOCKS } from '@co/protocol';
import { FACES, faceOf } from '../games/faces';
import { load as remembered, recentRooms, save } from '../net/store';
import { Field } from './Field';
import { Btn, Txt, press } from './parts';
import { Rule } from './surface';
import { Sheet } from './Sheet';
import { Chip as ClockChip } from './Tabs';
import { TheAnh } from './TheAnh';
import { A, R, S } from './theme';

/**
 * Hai tấm chọn dùng chung: chọn bộ môn, và nhập mã phòng.
 *
 * Trước đây cả hai nằm trong `app/index.tsx`. Sau khi tách màn chọn chế độ
 * ra `/choi`, tấm chọn bộ môn phải mở được từ **hai** màn, và một hàm dùng
 * ở hai chỗ thì không còn chỗ đứng nào hợp lý trong một trong hai chỗ đó.
 */

/** Bộ môn máy chủ có engine. Nguồn chân lý là registry, không phải `face.ready`. */
const READY = new Set(registry.catalog().map((s) => s.id));

/**
 * Chọn bộ môn để ghép cặp hoặc mở phòng.
 *
 * Chỉ liệt kê bộ môn **máy chủ có engine**. Cho chọn một bộ môn chưa cài rồi
 * để máy chủ trả `NO_GAME` là bắt người chơi đi một vòng mới biết mình không
 * chơi được.
 */
export function PickGameSheet({
  mode,
  onClose,
  onPick,
  onRules,
}: {
  /**
   * `xh` là ghép cặp xếp hạng, `thuong` là ghép cặp đánh thường, `create`
   * là mở phòng riêng.
   */
  mode: 'xh' | 'thuong' | 'create';
  onClose: () => void;
  onPick: (id: string, o: { clock: string; pass: string }) => void;
  /** Bộ môn chưa mở dẫn tới trang luật — một đích đến thật. */
  onRules?: (id: string) => void;
}) {
  const mo = FACES.filter((f) => READY.has(f.id));
  const khoa = FACES.filter((f) => !READY.has(f.id));
  // Mức thời gian nhớ qua lần mở sau: người quen cờ chớp không phải chọn
  // lại mỗi lần mở app.
  const [clock, setClock] = useState<string>(() => remembered<string>('muc-thoi-gian', ''));
  const [pass, setPass] = useState('');
  const { height } = useWindowDimensions();
  const pick = (id: string) => {
    save('muc-thoi-gian', clock);
    onPick(id, { clock, pass });
  };
  return (
    <Sheet
      title={mode === 'create' ? 'Mở phòng bộ môn nào?' : mode === 'xh' ? 'Đấu xếp hạng bộ môn nào?' : 'Đánh thường bộ môn nào?'}
      sub={
        mode === 'create'
          ? 'Nhận một mã năm ký tự để mời bạn'
          : mode === 'xh'
            ? 'Mức thời gian theo bộ môn — cả làn xếp hạng dùng chung một mức'
            : 'Hàng chờ tách theo mức thời gian — chỉ ghép với người chọn cùng mức'
      }
      onClose={onClose}
      height={Math.round(height * 0.82)}
    >
      {/* Làn xếp hạng ghim một mức giờ nên **không có** hàng chip này. Để
          chip ở đây rồi âm thầm bỏ qua lựa chọn của người dùng là nói dối
          họ; câu giải thích nằm ngay ở dòng phụ của tấm. */}
      {mode === 'xh' ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: S.xs }}>
          <ClockChip label="Theo bộ môn" a11y="Mức Theo bộ môn" role="button" on={clock === ''} onPress={() => setClock('')} />
          {Object.entries(CLOCKS).map(([k, c]) => (
            <ClockChip
              key={k}
              label={`${c.nameVi} ${Math.round(c.initialMs / 60_000)} phút`}
              a11y={`Mức ${c.nameVi}`}
              role="button"
              on={clock === k}
              onPress={() => setClock(k)}
            />
          ))}
        </View>
      )}
      {mode === 'create' ? (
        <View style={{ paddingBottom: S.xs }}>
          <Field label="Mật khẩu phòng (không bắt buộc)" value={pass} onChange={setPass} placeholder="Bỏ trống thì ai có mã cũng vào được" />
        </View>
      ) : null}
      {/* Lưới thẻ có tranh, không phải danh sách hàng. Tấm này nằm trên
          luồng vào trận, tức là chỗ **quyết định quan trọng nhất** của app —
          mà tranh bộ môn ở đây từng bị bóp còn 54×35 trong khi cùng bức ấy
          được vẽ 178 điểm ở màn danh mục. Hình to phải đứng cạnh quyết
          định to. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        {mo.map((f) => (
          <View key={f.id} style={{ width: '47.5%' }}>
            <TheAnh
              testID="the-bo-mon"
              ten={f.nameVi}
              surface={f.surface}
              Art={f.Motif}
              nhan={[f.minutes]}
              a11y={f.nameVi}
              onPress={() => pick(f.id)}
              onGoc={onRules ? () => onRules(f.id) : undefined}
            />
          </View>
        ))}
      </View>
      {/* Mười bộ môn chưa mở vẫn hiện. Lọc chúng đi ở đúng tấm nằm trên
          luồng vào trận thì nền tảng trông đúng bằng ba bộ môn — trong khi
          màn danh mục, nơi không ai đi qua, lại trưng đủ mười ba. */}
      <View style={{ alignItems: 'center', paddingTop: S.sm, gap: 2 }}>
        <Rule width={160} />
        <Txt size={11} color={A.inkFaint}>
          Sắp mở
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        {khoa.map((f) => (
          <View key={f.id} style={{ width: '47.5%' }}>
            <TheAnh
              testID="the-bo-mon"
              ten={f.nameVi}
              surface={f.surface}
              Art={f.Motif}
              khoa
              nhan={[f.mode]}
              a11y={`${f.nameVi}, chưa mở`}
              onPress={() => onRules?.(f.id)}
            />
          </View>
        ))}
      </View>
    </Sheet>
  );
}

/** Nhập mã phòng bạn đọc cho. */
export function CodeSheet({ onClose, onGo }: { onClose: () => void; onGo: (code: string, pass: string) => void }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const ok = code.trim().length === 5;
  // Đọc một lần lúc mở tấm: danh sách chỉ đổi khi vào một phòng mới, mà
  // lúc đó tấm này đã đóng rồi.
  const recent = useRef(recentRooms()).current;
  return (
    <Sheet title="Vào bằng mã" sub="Năm ký tự bạn của bạn đọc cho" onClose={onClose}>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCDE"
        placeholderTextColor={A.inkFaint}
        accessibilityLabel="Mã phòng"
        style={{
          borderWidth: 1.4,
          borderColor: A.goldDeep,
          backgroundColor: A.panelLo,
          borderRadius: R.md,
          color: A.gold,
          fontSize: 30,
          letterSpacing: 10,
          textAlign: 'center',
          paddingVertical: S.md,
        }}
      />
      {/* Ô mật khẩu để sẵn ở đây, không bắt người ta vào tới nơi rồi mới
          bị hỏi. Phòng không khoá thì bỏ trống. */}
      <Field label="Mật khẩu (nếu phòng có khoá)" value={pass} onChange={setPass} placeholder="Bỏ trống nếu phòng không khoá" />
      <Btn label="Vào phòng" disabled={!ok} onPress={() => onGo(code.trim(), pass.trim())} />

      {/* Mã vừa vào gần đây. Phòng bị xoá khi cả hai người rời, nên phần
          lớn mã cũ sẽ báo "không có phòng nào mang mã này" — vì thế hàng
          này kèm thời điểm và **không** trình bày như phòng đang còn sống. */}
      {recent.length ? (
        <>
          <Txt size={11} color={A.inkFaint} style={{ paddingTop: S.xs }}>
            Mã vừa vào gần đây — phòng có thể đã đóng
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {recent.map((r) => (
              <Pressable
                key={r.code}
                accessibilityRole="button"
                accessibilityLabel={`Vào lại mã ${r.code}`}
                onPress={() => onGo(r.code, pass.trim())}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: S.md,
                    paddingVertical: 10,
                    borderRadius: R.md,
                    borderWidth: 1.2,
                    borderColor: A.line,
                    backgroundColor: A.panel,
                  },
                  press({ pressed }),
                ]}
              >
                <Txt size={14} weight="bold" color={A.gold} style={{ letterSpacing: 3 }}>
                  {r.code}
                </Txt>
                <Txt size={11} color={A.inkFaint}>
                  {faceOf(r.gameId)?.nameVi ?? r.gameId} · {agoVi(r.at)}
                </Txt>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

/** "3 phút trước", "hôm qua". Đủ để biết mã còn mới hay đã cũ. */
function agoVi(at: number): string {
  const m = Math.round((Date.now() - at) / 60_000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hôm qua' : `${d} ngày trước`;
}
