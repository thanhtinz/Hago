import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { registry } from '@co/core';
import { CHUONG, CLOCKS, TONG_SAO, aiCuaChuong, daMo } from '@co/protocol';
import { FACES, faceOf } from '../games/faces';
import { modeArt } from '../games/modes';
import { save, saoVuotAi } from '../net/store';
import { Txt } from './parts';
import { Rule } from './surface';
import { Sheet } from './Sheet';
import { Chip } from './Tabs';
import { TheAnh } from './TheAnh';
import { A, S } from './theme';

/**
 * Chọn chế độ.
 *
 * Trước đây đây là một **màn của router** in ra bảy hàng "icon 22 điểm +
 * tên + hai dòng chữ xám + mũi tên". Đó là ngữ pháp của trang Cài đặt iOS,
 * và nó đọc ra đúng như thế: một danh sách tuỳ chọn, không phải một chỗ
 * chọn trận đánh. Bản này là một tấm cao 88% màn hình — đủ cao để **phủ cả
 * thanh điều hướng**, nhưng vẫn hở ra phần đầu sảnh phía sau lớp mờ, và
 * việc còn thấy sảnh là thứ mang nghĩa: bạn đang cấu hình, không đang đi.
 *
 * Bốn thẻ chọn giữ nguyên xương sống "đấu với ai" của màn cũ — với người,
 * một mình, với bạn — chỉ tách "với người" làm hai, vì đó đúng là **hai
 * làn có thật** ở máy chủ và mỗi làn xứng một chạm.
 *
 * Hai loại kết quả, hai callback: `onNap` **nạp cấu hình** rồi đóng tấm
 * (sảnh đổi tại chỗ, không vào hàng chờ), `onDi` **đi ngay**. Tách ở API
 * thì chỗ gọi không thể lẫn "nạp" với "bắn"; trên mặt thẻ chúng phân biệt
 * bằng một mũi tên ở góc tranh.
 */

/** Nguồn chân lý "chơi được không" là registry, không phải `face.ready`. */
const READY = new Set(registry.catalog().map((s) => s.id));

type Tab = 'xh' | 'thuong' | 'vuot-ai' | 'ban';

export function SheetChonCheDo({
  tabDau = 'xh',
  clockDau,
  onNap,
  onDi,
  onMoTam,
  onClose,
}: {
  tabDau?: Tab;
  clockDau?: string;
  onNap: (lan: 'xh' | 'thuong', gameId: string, clock: string) => void;
  onDi: (href: string) => void;
  /** Hai thẻ ở tab Với bạn mở thêm một tấm nữa chứ không điều hướng. */
  onMoTam: (t: 'phong' | 'ma') => void;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const [tab, setTab] = useState<Tab>(tabDau);
  const [clock, setClock] = useState(clockDau ?? '');
  // Ghi cùng khoá `muc-thoi-gian` mà `PickGameSheet` đọc: hai tấm cùng nói
  // về một mức giờ thì chúng phải nhớ chung một chỗ, không thì chọn cờ
  // chớp ở tấm này rồi mở phòng ở tấm kia lại ra mức mặc định.
  const doiClock = (k: string) => {
    setClock(k);
    save('muc-thoi-gian', k);
  };
  const sao = saoVuotAi();
  const tongSao = Object.values(sao).reduce((n, x) => n + x, 0);
  const tatCaAi = CHUONG.flatMap((c) => aiCuaChuong(c.so));
  const xong = tatCaAi.filter((a) => (sao[a.id] ?? 0) > 0).length;

  const tabs: { id: Tab; ten: string }[] = [
    { id: 'xh', ten: 'Đấu hạng' },
    { id: 'thuong', ten: 'Đánh thường' },
    // Tiến độ nằm ở **mặt ngoài**: một chiến dịch chỉ khoe tiến độ sau khi
    // đã mở ra thì chơi một lần rồi bỏ.
    { id: 'vuot-ai', ten: `Vượt ải · ${tongSao}/${TONG_SAO}` },
    { id: 'ban', ten: 'Với bạn' },
  ];

  return (
    <Sheet
      title="Chọn chế độ"
      sub={
        tab === 'xh'
          ? 'Mức thời gian theo bộ môn — cả làn xếp hạng dùng chung một mức'
          : tab === 'thuong'
            ? 'Hàng chờ tách theo mức thời gian — chỉ ghép với người chọn cùng mức'
            : tab === 'vuot-ai'
              ? 'Đánh với máy theo màn, không tính điểm và không lên bảng xếp hạng'
              : 'Mở một phòng riêng, hoặc vào bằng mã bạn đọc cho'
      }
      onClose={onClose}
      height={Math.round(height * 0.88)}
      truoc={
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ gap: 6, paddingBottom: S.xs }}
        >
          {/* Nhãn trợ năng mang tiền tố "Chế độ": nhãn trần "Vượt ải"
              trùng với hàng tiêu đề vượt ải của sảnh nằm ngay phía sau lớp
              mờ, và một nhãn trùng là một bài kiểm không biết bấm cái nào. */}
          {tabs.map((t) => (
            <Chip key={t.id} label={t.ten} a11y={`Chế độ ${t.id === 'vuot-ai' ? 'Vượt ải' : t.ten}`} on={tab === t.id} onPress={() => setTab(t.id)} />
          ))}
        </ScrollView>
      }
    >
      {tab === 'thuong' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: S.xs }}>
          <Chip label="Theo bộ môn" a11y="Mức Theo bộ môn" role="button" on={clock === ''} onPress={() => doiClock('')} />
          {Object.entries(CLOCKS).map(([k, c]) => (
            <Chip
              key={k}
              label={`${c.nameVi} ${Math.round(c.initialMs / 60_000)} phút`}
              a11y={`Mức ${c.nameVi}`}
              role="button"
              on={clock === k}
              onPress={() => doiClock(k)}
            />
          ))}
        </View>
      ) : null}

      {tab === 'xh' || tab === 'thuong' ? (
        <>
          <DaiLan lan={tab} />
          <LuoiBoMon lan={tab} clock={clock} onNap={onNap} onDi={onDi} />
        </>
      ) : tab === 'vuot-ai' ? (
        <TabVuotAi w={w} sao={sao} tongSao={tongSao} xong={xong} tatCa={tatCaAi.length} onDi={onDi} onClose={onClose} />
      ) : (
        <TabBan onMoTam={onMoTam} />
      )}
    </Sheet>
  );
}

/**
 * Dải giới thiệu làn, đặt trên lưới bộ môn.
 *
 * Lưới thẻ trả lời "bộ môn nào", nhưng không trả lời "làn này khác gì" —
 * và đó đúng là câu người mới cần nhất, vì hai làn trông giống hệt nhau
 * cho tới lúc kết ván. Không phải một thẻ bấm được: ở đây không có gì để
 * chọn, làn đã chọn bằng chính cái tab đang mở.
 */
function DaiLan({ lan }: { lan: 'xh' | 'thuong' }) {
  const art = modeArt(lan === 'xh' ? 'xep-hang' : 'thuong');
  if (!art) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.xs }}>
      <View style={{ width: 72, aspectRatio: 100 / 64, borderRadius: 6, overflow: 'hidden', backgroundColor: art.surface }}>
        <art.Motif />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={14} weight="display" color={lan === 'xh' ? A.gold : A.ink}>
          {lan === 'xh' ? 'Đấu xếp hạng' : 'Đánh thường'}
        </Txt>
        <Txt size={11.5} color={A.inkFaint}>
          {lan === 'xh'
            ? 'Tính điểm, lên bảng xếp hạng, lên danh hiệu.'
            : 'Không tính điểm, không lên bảng xếp hạng.'}
        </Txt>
      </View>
    </View>
  );
}

/**
 * Mười ba thẻ bộ môn, ba thẻ mở trước, mười thẻ khoá sau một đường kẻ.
 *
 * Khoá thì **hiện**, không giấu — và đây là món lãi nhất với một nền tảng
 * mới mở ba trên mười ba. Tấm cũ lọc mất mười bộ môn ở đúng chỗ nằm trên
 * luồng vào trận, nên nền tảng trông đúng bằng ba bộ môn. Thẻ khoá vẫn bấm
 * được và dẫn tới trang luật: một đích đến thật, không phải một cú chạm rơi
 * vào khoảng không.
 */
function LuoiBoMon({
  lan,
  clock,
  onNap,
  onDi,
}: {
  lan: 'xh' | 'thuong';
  clock: string;
  onNap: (lan: 'xh' | 'thuong', gameId: string, clock: string) => void;
  onDi: (href: string) => void;
}) {
  const mo = FACES.filter((f) => READY.has(f.id));
  const khoa = FACES.filter((f) => !READY.has(f.id));
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        {mo.map((f) => (
          <View key={f.id} style={{ width: '47.5%' }}>
            <TheAnh
              testID="the-che-do"
              ten={f.nameVi}
              surface={f.surface}
              Art={f.Motif}
              nhan={[f.mode, f.minutes]}
              a11y={f.nameVi}
              onPress={() => onNap(lan, f.id, lan === 'thuong' ? clock : '')}
              onGoc={() => onDi(`/luat/${f.id}`)}
            />
          </View>
        ))}
      </View>
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
              testID="the-che-do"
              ten={f.nameVi}
              surface={f.surface}
              Art={f.Motif}
              khoa
              nhan={[f.mode]}
              a11y={`${f.nameVi}, chưa mở`}
              onPress={() => onDi(`/luat/${f.id}`)}
            />
          </View>
        ))}
      </View>
    </>
  );
}

/**
 * Vượt ải đứng **trên** đấu với máy, cách nhau một đường kẻ.
 *
 * Thứ tự này là cố ý: vượt ải là **nội dung** — có màn, có sao, có tiến độ
 * in trên mặt thẻ; đấu với máy là **phòng tập** — không tiến độ, không sao.
 * Màn cũ để hai thứ ngang hàng trong cùng một nhóm, và tệ hơn, "Đấu với
 * máy" là mục duy nhất mở thẳng ra danh mục mười ba bộ môn.
 */
function TabVuotAi({
  w,
  sao,
  tongSao,
  xong,
  tatCa,
  onDi,
  onClose,
}: {
  w: number;
  sao: Record<string, number>;
  tongSao: number;
  xong: number;
  tatCa: number;
  onDi: (href: string) => void;
  onClose: () => void;
}) {
  const art = modeArt('vuot-ai');
  const may = modeArt('may');
  const keTiep = CHUONG.flatMap((c) => aiCuaChuong(c.so)).find((a) => daMo(a.id, sao) && (sao[a.id] ?? 0) === 0);
  return (
    <>
      <View style={{ gap: 6, paddingBottom: S.xs }}>
        <Txt size={12} color={A.inkSoft}>
          Ải {Math.min(xong + 1, tatCa)}/{tatCa} · {tongSao}/{TONG_SAO} sao
        </Txt>
        <View style={{ height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: A.panelLo }}>
          <View style={{ width: `${Math.round((tongSao / TONG_SAO) * 100)}%`, height: 3, backgroundColor: A.gold }} />
        </View>
      </View>
      {CHUONG.map((ch) => {
        const ais = aiCuaChuong(ch.so);
        const co = ais.reduce((n, a) => n + (sao[a.id] ?? 0), 0);
        const face = faceOf(ch.gameId);
        const moChuong = ais.some((a) => daMo(a.id, sao));
        return (
          <TheAnh
            key={ch.so}
            testID="the-che-do"
            ngang
            dieuHuong
            ten={`Chương ${ch.so} · ${ch.ten}`}
            phu={`${face?.nameVi ?? ch.gameId} · ${co}/${ais.length * 3} sao`}
            surface={face?.surface ?? A.panelLo}
            Art={face?.Motif ?? (art?.Motif as () => React.ReactElement)}
            khoa={!moChuong}
            dieuKien={moChuong ? undefined : 'Qua chương trước'}
            tienDo={{ n: co, toi: ais.length * 3 }}
            a11y={moChuong ? `Chương ${ch.so}` : `Chương ${ch.so}, chưa mở`}
            onPress={() => {
              onClose();
              onDi(keTiep && moChuong && keTiep.chuong === ch.so ? `/vuot-ai/${keTiep.id}` : `/vuot-ai?chuong=${ch.so}`);
            }}
          />
        );
      })}
      <View style={{ alignItems: 'center', paddingTop: S.sm }}>
        <Rule width={Math.round(w * 0.4)} />
      </View>
      {may ? (
        <TheAnh
          testID="the-che-do"
          ngang
          dieuHuong
          ten="Đấu với máy"
          phu="Luyện tập · không tính điểm"
          surface={may.surface}
          Art={may.Motif}
          a11y="Đấu với máy"
          onPress={() => {
            onClose();
            onDi('/bo-mon');
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Với bạn: đúng hai thẻ.
 *
 * "Bạn bè" **không** ở đây — nó không phải một chế độ chơi mà là mở danh
 * bạ, và nó đã lên góc phải dải danh tính cùng với chấm đếm lời mời.
 */
function TabBan({ onMoTam }: { onMoTam: (t: 'phong' | 'ma') => void }) {
  const phong = modeArt('phong');
  const ma = modeArt('ma');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
      {phong ? (
        <View style={{ width: '47.5%' }}>
          <TheAnh
            testID="the-che-do"
            dieuHuong
            ten="Tạo phòng"
            phu="Nhận một mã năm ký tự"
            surface={phong.surface}
            Art={phong.Motif}
            a11y="Tạo phòng"
            onPress={() => onMoTam('phong')}
          />
        </View>
      ) : null}
      {ma ? (
        <View style={{ width: '47.5%' }}>
          <TheAnh
            testID="the-che-do"
            dieuHuong
            ten="Vào mã"
            phu="Bạn đọc mã cho thì gõ vào"
            surface={ma.surface}
            Art={ma.Motif}
            a11y="Vào mã"
            onPress={() => onMoTam('ma')}
          />
        </View>
      ) : null}
    </View>
  );
}
