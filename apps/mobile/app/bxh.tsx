import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registry } from '@co/core';
import '../src/catalog';
import { backToLobby } from '../src/nav';
import { api, useAuth, type Board, type BoardRow } from '../src/net/api';
import { faceOf } from '../src/games/faces';
import { Face } from '../src/ui/Crest';
import { Icon } from '../src/ui/Icon';
import { Panel, Txt, press } from '../src/ui/parts';
import { Chip } from '../src/ui/Tabs';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, R, S, glow, lift } from '../src/ui/theme';

/**
 * Bảng xếp hạng.
 *
 * Một nền tảng cờ tính điểm Elo từ ngày đầu mà không có chỗ nào nhìn thấy
 * điểm của người khác thì điểm đó chỉ là một con số trong cơ sở dữ liệu.
 * Bảng này là lý do để đánh thêm một ván nữa.
 *
 * Hai điều quyết định cách trình bày:
 *
 * 1. **Hạng của chính mình luôn hiện**, dán ở đáy màn, kể cả khi mình đứng
 *    thứ ba trăm. Đó là con số người ta mở bảng ra để xem; bắt cuộn qua
 *    năm mươi người lạ rồi không thấy mình đâu là hỏng mục đích.
 * 2. **Nói thẳng luật vào bảng.** Thiếu ván thì nói còn thiếu mấy ván, đừng
 *    để người chơi tự đoán vì sao mình không có tên.
 */

/** Chỉ bộ môn máy chủ có engine mới có bảng — bộ môn chưa mở thì bảng rỗng. */
const READY = registry.catalog().map((s) => s.id);

export default function BoardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me } = useAuth();
  const [tab, setTab] = useState<string>('tong');
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBoard(await api.board(tab === 'tong' ? undefined : tab));
    } catch {
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [tab]);
  useEffect(() => {
    void load();
  }, [load]);

  const w = Math.min(width, 460);

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Về sảnh" style={press}>
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={19} weight="display" style={{ flex: 1 }}>
          Bảng xếp hạng
        </Txt>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md }}
      >
        <Chip label="Tổng" a11y="Bảng Tổng" on={tab === 'tong'} onPress={() => setTab('tong')} />
        {READY.map((g) => (
          <Chip key={g} label={faceOf(g)?.nameVi ?? g} a11y={`Bảng ${faceOf(g)?.nameVi ?? g}`} on={tab === g} onPress={() => setTab(g)} />
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: 140, gap: S.sm }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={A.gold} colors={[A.gold]} />}
      >
        {tab === 'tong' ? (
          <Txt size={11.5} color={A.inkFaint} center style={{ paddingBottom: S.xs }}>
            Bảng tổng cộng phần điểm vượt mốc 1200 của mọi bộ môn — giỏi nhiều bộ môn ăn đứt cày một bộ môn.
          </Txt>
        ) : null}

        {board && board.rows.length === 0 ? (
          <Empty minRanked={board.minRanked} />
        ) : (
          (board?.rows ?? []).map((r) => <Row key={r.user.id} row={r} me={me?.id ?? null} total={tab === 'tong'} onPress={() => router.push(`/u/${r.user.id}`)} />)
        )}
      </ScrollView>

      {me && board ? <MyRank board={board} total={tab === 'tong'} insetBottom={insets.bottom} /> : null}
    </View>
  );
}

/** Một hàng trong bảng. Hàng của chính mình có viền vàng. */
function Row({ row, me, total, onPress }: { row: BoardRow; me: string | null; total: boolean; onPress: () => void }) {
  const mine = row.user.id === me;
  // Ba hạng đầu mang màu riêng. Không dùng huy chương vàng bạc đồng: bộ mặt
  // của app này là gỗ và triện, không phải biểu tượng thể thao.
  const tint = row.rank === 1 ? A.goldLit : row.rank === 2 ? A.gold : row.rank === 3 ? A.goldDeep : A.inkFaint;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Hạng ${row.rank}, ${row.user.name}`} onPress={onPress} style={press}>
      <Panel
        radius={R.md}
        tone={mine ? 2 : 1}
        seed={row.user.name.length * 7 + row.rank}
        hairline={false}
        style={[{ borderWidth: mine ? 1.4 : 1, borderColor: mine ? A.gold : A.lineSoft }, mine ? glow(0.22, 12) : undefined]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm, paddingHorizontal: S.md }}>
          <Txt size={row.rank < 10 ? 19 : 16} weight="display" color={tint} style={{ minWidth: 30 }}>
            {row.rank}
          </Txt>
          <Face avatar={row.user.avatar} id={row.user.id} size={38} ring={mine} />
          <View style={{ flex: 1 }}>
            <Txt size={14.5} weight={mine ? 'bold' : 'semi'} numberOfLines={1}>
              {row.user.name}
            </Txt>
            <Txt size={11} color={A.inkFaint}>
              {row.played} ván · thắng {row.played ? Math.round((row.win / row.played) * 100) : 0}%
            </Txt>
          </View>
          {/* Chữ số điểm dùng bộ chữ thân, không phải bộ chữ hiển thị:
              trong Playfair dấu cộng nằm ở trục toán học, cao hơn tâm chữ
              số, nên "+81" đọc ra thành số mũ. Kèm `tabular-nums` để cột
              điểm không nhảy trái phải giữa các hàng. */}
          <Txt size={16} weight="bold" color={mine ? A.gold : A.ink} style={{ fontVariant: ['tabular-nums'] }}>
            {total && row.rating > 0 ? `+${row.rating}` : row.rating}
          </Txt>
        </View>
      </Panel>
    </Pressable>
  );
}

/** Bảng trống: nói rõ vì sao trống, đừng để một khoảng trắng tự giải thích. */
function Empty({ minRanked }: { minRanked: number }) {
  return (
    <Panel radius={R.lg} tone={1} seed={23}>
      <View style={{ alignItems: 'center', gap: S.sm, padding: S.xl }}>
        <Rule width={120} />
        <Txt size={16} weight="display" center>
          Chưa ai đủ điều kiện
        </Txt>
        <Txt size={12.5} color={A.inkSoft} center>
          Phải đánh ít nhất {minRanked} ván ghép cặp của một bộ môn mới có tên trong bảng. Ván ở phòng riêng không tính điểm.
        </Txt>
      </View>
    </Panel>
  );
}

/**
 * Hạng của mình, dán đáy màn.
 *
 * Dán chứ không nằm trong danh sách: người đứng thứ ba trăm cuộn tới cuối
 * năm mươi hàng vẫn không thấy mình đâu, và đó đúng là người cần con số này
 * nhất.
 */
function MyRank({ board, total, insetBottom }: { board: Board; total: boolean; insetBottom: number }) {
  const m = board.me;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Panel
        radius={0}
        tone={2}
        seed={47}
        hairline={false}
        style={[{ borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, borderTopWidth: 1.4, borderTopColor: A.goldDeep }, lift(0.5, 22, -8)]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, paddingBottom: insetBottom + S.md }}>
          <Icon name="user" size={18} color={A.gold} />
          {m ? (
            <>
              <Txt size={13} color={A.inkSoft} style={{ flex: 1 }}>
                Bạn đang hạng{' '}
                <Txt size={17} weight="display" color={A.gold}>
                  {m.rank}
                </Txt>{' '}
                · {m.played} ván
              </Txt>
              <Txt size={16} weight="bold" color={A.gold} style={{ fontVariant: ['tabular-nums'] }}>
                {total && m.rating > 0 ? `+${m.rating}` : m.rating}
              </Txt>
            </>
          ) : (
            <Txt size={12.5} color={A.inkSoft} style={{ flex: 1 }}>
              Bạn chưa có hạng — cần {board.minRanked} ván ghép cặp của một bộ môn.
            </Txt>
          )}
        </View>
      </Panel>
    </View>
  );
}
