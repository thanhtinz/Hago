import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { conMayVan, danhHieuOf } from '@co/protocol';
import { backToLobby } from '../src/nav';
import { faceOf } from '../src/games/faces';
import { api, useAuth, type Profile } from '../src/net/api';
import { useLive } from '../src/net/live';
import { save } from '../src/net/store';
import { CHAT_SPACE } from '../src/ui/FloatingChat';
import { Icon, type IconName } from '../src/ui/Icon';
import { CodeSheet, PickGameSheet } from '../src/ui/PickSheets';
import { Panel, Txt, press } from '../src/ui/parts';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, R, S, glow, lift } from '../src/ui/theme';
import { LEVEL_NAME } from '../src/ui/MatchShell';
import { load as remembered } from '../src/net/store';

/**
 * Chọn chế độ.
 *
 * Sảnh cũ suy ra chế độ từ việc bấm ô nào, và không có chỗ nào tên là "chế
 * độ" cả — bốn ô Ghép cặp / Tạo phòng / Vào mã / Bạn bè trộn lẫn ba việc
 * khác hẳn nhau: vào trận, mở phòng, và mở danh bạ.
 *
 * Màn này chia đúng ba nhóm theo **đấu với ai**: với người lạ, một mình, và
 * với bạn. Đó là câu hỏi đầu tiên người ta tự trả lời khi mở app, và nó
 * quyết định mọi thứ phía sau.
 *
 * Là một màn thật của router chứ không phải một tấm trượt lên: đây là chỗ
 * người ta quay lui vào nhiều lần trong ngày, và một tấm dán đáy có ba
 * nhóm thì nằm dưới thanh điều hướng.
 */
export default function ChoiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me } = useAuth();
  const s = useLive();
  const [sheet, setSheet] = useState<'xh' | 'thuong' | 'create' | 'join' | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  React.useEffect(() => {
    if (!me) return setProfile(null);
    void api
      .me()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [me?.id]);

  const w = Math.min(width, 460);
  const botLevel = remembered<number>('muc-may', 2);

  /** Bộ môn đánh nhiều nhất — dòng trạng thái của thẻ xếp hạng nói về nó. */
  const main = [...(profile?.stats ?? [])].sort((x, y) => y.win + y.draw + y.loss - (x.win + x.draw + x.loss))[0];
  const hangXh = !me
    ? 'Cần đăng nhập'
    : !main
      ? `Chưa định hạng · ${conMayVan(0)} ván xếp hạng mới có danh hiệu`
      : (() => {
          const b = danhHieuOf(main.rating, main.ranked);
          if (b) return `${b.ten} · ${main.rating} điểm ${faceOf(main.gameId)?.nameVi ?? ''}`;
          return `Định hạng ${main.ranked}/5 ván`;
        })();

  const go = (to: string) => (me ? router.push(to as never) : router.push('/auth'));

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Về sảnh" style={press}>
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={19} weight="display" style={{ flex: 1 }}>
          Chọn chế độ
        </Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + CHAT_SPACE + S.xxl, gap: S.lg }}>
        <Nhom ten="Đấu với người" w={w}>
          <CheDo
            icon="crown"
            ten="Đấu xếp hạng"
            mo="Tính điểm, lên bảng xếp hạng, lên danh hiệu."
            trangThai={hangXh}
            noiBat
            onPress={() => (me ? setSheet('xh') : router.push('/auth'))}
          />
          <CheDo
            icon="bolt"
            ten="Đánh thường"
            mo="Không tính điểm, không lên bảng xếp hạng."
            trangThai={me ? 'Chọn được mức thời gian' : 'Cần đăng nhập'}
            onPress={() => (me ? setSheet('thuong') : router.push('/auth'))}
          />
        </Nhom>

        <Nhom ten="Một mình" w={w}>
          <CheDo
            icon="robot"
            ten="Đấu với máy"
            mo="Ba mức, chơi được khi chưa đăng nhập."
            trangThai={`Mức ${LEVEL_NAME[(botLevel as 1 | 2 | 3) ?? 2]}`}
            onPress={() => router.push('/bo-mon')}
          />
          <CheDo
            icon="flag"
            ten="Vượt ải"
            mo="Mười ải đánh với máy, mỗi ải một luật riêng."
            trangThai="Không tính điểm"
            onPress={() => router.push('/vuot-ai')}
          />
        </Nhom>

        <Nhom ten="Với bạn" w={w}>
          <CheDo icon="door" ten="Tạo phòng" mo="Nhận một mã năm ký tự để mời bạn." onPress={() => (me ? setSheet('create') : router.push('/auth'))} />
          <CheDo icon="key" ten="Vào mã" mo="Bạn đọc mã cho thì gõ vào đây." onPress={() => setSheet('join')} />
          <CheDo
            icon="user"
            ten="Bạn bè"
            mo="Rủ bạn một ván, hoặc xem ai đang trực tuyến."
            trangThai={s.friendRequests > 0 ? `${s.friendRequests} lời mời chờ` : undefined}
            onPress={() => go('/friends')}
          />
        </Nhom>
      </ScrollView>

      {sheet === 'join' ? (
        <CodeSheet
          onClose={() => setSheet(null)}
          onGo={(code, pass) => {
            setSheet(null);
            const q = new URLSearchParams({ code });
            if (pass) q.set('pass', pass);
            router.push(`/online/join?${q.toString()}`);
          }}
        />
      ) : sheet ? (
        <PickGameSheet
          mode={sheet}
          onClose={() => setSheet(null)}
          onPick={(id, o) => {
            const m = sheet;
            setSheet(null);
            if (m === 'create') {
              const q = new URLSearchParams({ game: id });
              if (o.clock) q.set('clock', o.clock);
              if (o.pass.trim()) q.set('pass', o.pass.trim());
              return router.push(`/online/create?${q.toString()}`);
            }
            const q = new URLSearchParams({ game: id, lan: m });
            if (m === 'thuong' && o.clock) q.set('clock', o.clock);
            // Nhớ lần chọn gần nhất để sảnh có nút "Đánh lại" một chạm.
            save('che-do-gan-nhat', { lan: m, gameId: id, clock: m === 'thuong' ? o.clock : '' });
            router.push(`/online/quick?${q.toString()}`);
          }}
        />
      ) : null}
    </View>
  );
}

function Nhom({ ten, w, children }: { ten: string; w: number; children: React.ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <View style={{ alignItems: 'center', gap: 2, paddingBottom: S.xs }}>
        <Txt size={13} weight="display" color={A.inkSoft}>
          {ten}
        </Txt>
        <Rule width={w * 0.3} />
      </View>
      {children}
    </View>
  );
}

/**
 * Một chế độ.
 *
 * `trangThai` là dòng nói **tình trạng hiện tại của chính người này** ở chế
 * độ đó — danh hiệu, mức máy đang nhớ, số lời mời đang chờ. Bỏ trống thì
 * không in một dòng rỗng: một dòng trống dưới mỗi thẻ là năm dòng trống.
 */
function CheDo({
  icon,
  ten,
  mo,
  trangThai,
  noiBat,
  onPress,
}: {
  icon: IconName;
  ten: string;
  mo: string;
  trangThai?: string;
  noiBat?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ten}
      style={({ pressed }) => [{ borderRadius: R.md }, noiBat ? glow(0.24, 14) : lift(0.3, 10, 4), press({ pressed })]}
    >
      <Panel
        radius={R.md}
        tone={noiBat ? 2 : 1}
        hairline={false}
        style={{ borderWidth: noiBat ? 1.4 : 1, borderColor: noiBat ? A.gold : A.lineSoft }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg }}>
          <Icon name={icon} size={22} color={noiBat ? A.gold : A.inkSoft} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={16} weight="display" color={noiBat ? A.gold : A.ink}>
              {ten}
            </Txt>
            <Txt size={11.5} color={A.inkFaint}>
              {mo}
            </Txt>
            {trangThai ? (
              <Txt size={11} color={noiBat ? A.inkSoft : A.inkFaint} style={{ paddingTop: 2 }}>
                {trangThai}
              </Txt>
            ) : null}
          </View>
          <Icon name="chevron" size={16} color={A.inkFaint} />
        </View>
      </Panel>
    </Pressable>
  );
}
