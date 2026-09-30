import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registry, replayFrames, type BaseState, type MatchLog } from '@co/core';
import type { CaroView } from '@co/game-co-caro';
import type { GanhView } from '@co/game-co-ganh';
import type { QuanView } from '@co/game-o-an-quan';
import '../../src/catalog';
import { backToLobby } from '../../src/nav';
import { api, type MatchDetail } from '../../src/net/api';
import { faceOf } from '../../src/games/faces';
import { CaroBoard } from '../../src/games/co-caro/Board';
import { PaperStack } from '../../src/games/co-caro/Desk';
import { GanhBoard } from '../../src/games/co-ganh/Board';
import { QuanBoard } from '../../src/games/o-an-quan/Board';
import { byTurn } from '../../src/games/notation';
import { Icon } from '../../src/ui/Icon';
import { MoveList } from '../../src/ui/MoveList';
import { Btn, Panel, Txt, press } from '../../src/ui/parts';
import { AppBackdrop } from '../../src/ui/surface';
import { A, R, S, lift } from '../../src/ui/theme';
import { TableBackdrop, tintOf } from '../../src/ui/TableBackdrop';

/**
 * Xem lại một ván đã đánh.
 *
 * Đây là lúc **ràng buộc R1 trả công**: state không phải nguồn chân lý, log
 * input mới là. Máy chủ chỉ lưu log — vài trăm byte — rồi app tải nó về và
 * dựng lại toàn bộ ván **bằng chính engine đã dùng để đánh ván đó**. Không
 * có ảnh chụp thế cờ nào phải lưu, không có định dạng thứ hai nào phải giữ
 * đồng bộ, và ván xem lại không thể khác ván đã đánh.
 *
 * Phát lại chạy **ở máy khách**: engine là hàm thuần nên chạy được cả hai
 * phía, và tua tới tua lui trăm lần thì không có lý do gì phải hỏi máy chủ.
 */

export default function ReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const W = Math.min(width, 460);

  const [data, setData] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    void api
      .match(String(id))
      .then((m) => {
        setData(m);
        // Mở ra ở **thế cờ cuối**: người ta bấm vào một ván trong lịch sử
        // là để xem nó kết thúc thế nào, rồi mới tua ngược lên tìm chỗ hỏng.
        setAt(Number.MAX_SAFE_INTEGER);
      })
      .catch((e: { msg?: string }) => setError(e?.msg ?? 'Không tải được ván này'));
  }, [id]);

  /**
   * Dựng lại mọi thế cờ, **một lần**.
   *
   * Tính lại từ đầu mỗi lần bấm nút lùi là việc thừa: một ván hai trăm
   * nước thì tua ngược từ cuối về đầu là hai vạn lần `reduce`.
   */
  const frames = useMemo(() => {
    if (!data?.log) return null;
    try {
      const log = JSON.parse(data.log) as MatchLog;
      if (!registry.has(log.gameId)) return null;
      const engine = registry.get(log.gameId);
      return { engine, log, list: replayFrames(engine as never, log) as BaseState[] };
    } catch {
      return null;
    }
  }, [data?.log]);

  const total = frames ? frames.list.length - 1 : 0;
  const cur = Math.max(0, Math.min(at, total));
  const step = useCallback((d: number) => setAt(() => Math.max(0, Math.min(cur + d, total))), [cur, total]);

  const face = data ? faceOf(data.gameId) : null;
  const moves = frames
    ? frames.log.inputs
        .filter((r) => r.seat >= 0 && (r.action as { t?: string } | null)?.t === 'game')
        .map((r) => ({ seat: r.seat, a: (r.action as { a: unknown }).a }))
    : [];

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={W} height={height} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: insets.top + S.md }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : backToLobby(router))}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={press}
        >
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={18} weight="display" style={{ flex: 1 }}>
          {face?.nameVi ?? 'Xem lại ván'}
        </Txt>
      </View>

      {error ? (
        <Empty title="Không mở được ván này" body={error} onHome={() => backToLobby(router)} />
      ) : !data ? (
        <Empty title="Đang mở ván…" body="" />
      ) : !frames ? (
        <Empty
          title="Ván này không xem lại được"
          body="Ván đánh trước khi máy chủ bắt đầu lưu biên bản thì không còn gì để dựng lại. Ván từ nay trở đi đều xem lại được."
          onHome={() => backToLobby(router)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + S.xxl, gap: S.md }}>
          <Heads data={data} />
          <Board gameId={data.gameId} engine={frames.engine} state={frames.list[cur]!} width={W} />
          <Scrub at={cur} total={total} onStep={step} onJump={setAt} />
          <View style={{ paddingHorizontal: S.lg }}>
            <Panel radius={R.lg} tone={1} seed={31}>
              <View style={{ padding: S.lg }}>
                <MoveList gameId={data.gameId} moves={moves.slice(0, cur)} mySeat={null} height={220} />
              </View>
            </Panel>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/** Hai cái tên và kết quả. Đọc một dòng là biết ván này ai thắng vì sao. */
function Heads({ data }: { data: MatchDetail }) {
  const win = data.winner;
  return (
    <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm }}>
      <Panel radius={R.md} tone={1} seed={17}>
        <View style={{ padding: S.md, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Txt size={14} weight={win === 0 ? 'bold' : 'semi'} color={win === 0 ? A.gold : A.inkSoft} style={{ flex: 1 }} numberOfLines={1}>
              {data.names[0]}
            </Txt>
            <Txt size={11} color={A.inkFaint}>
              đấu
            </Txt>
            <Txt
              size={14}
              weight={win === 1 ? 'bold' : 'semi'}
              color={win === 1 ? A.gold : A.inkSoft}
              style={{ flex: 1, textAlign: 'right' }}
              numberOfLines={1}
            >
              {data.names[1]}
            </Txt>
          </View>
          <Txt size={11.5} color={A.inkFaint} center>
            {win === null ? 'Hoà' : `${data.names[win]} thắng`} · {data.reason} ·{' '}
            {new Date(data.at).toLocaleDateString('vi-VN')}
            {data.rated ? ' · xếp hạng' : ''}
          </Txt>
        </View>
      </Panel>
    </View>
  );
}

/** Bàn cờ ở một thế cố định. Không bấm được — đây là xem lại, không phải chơi. */
function Board({
  gameId,
  engine,
  state,
  width,
}: {
  gameId: string;
  engine: ReturnType<typeof registry.get> & object;
  state: BaseState;
  width: number;
}) {
  const size = Math.min(width - S.xl * 2, 420);
  // Xem lại thì nhìn từ ghế 0: một ván đã xong không còn thông tin nào phải
  // che, và đổi góc nhìn giữa chừng chỉ làm người xem mất phương hướng.
  const v = engine.view(state as never, 0).v;

  if (gameId === 'co-caro') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: size, height: size }}>
          <TableBackdrop width={width} height={size + S.lg} tint={tintOf('co-caro')} />
          <PaperStack size={size} />
          <View style={[{ borderRadius: 4 }, lift(0.6, 26, 12)]}>
            <CaroBoard view={v as CaroView} size={size} mySeat={null} onPlay={() => undefined} disabled hint={null} />
          </View>
        </View>
      </View>
    );
  }
  if (gameId === 'co-ganh') {
    return (
      <View style={{ alignItems: 'center' }}>
        <TableBackdrop width={width} height={size + S.lg} tint={tintOf('co-ganh')} />
        <GanhBoard
          view={v as GanhView}
          size={size}
          mySeat={null}
          picked={null}
          onPick={() => undefined}
          onMove={() => undefined}
          legalTargets={[]}
          disabled
        />
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <TableBackdrop width={width} height={size} tint={tintOf('o-an-quan')} />
      <QuanBoard
        view={v as QuanView}
        width={Math.min(width - S.lg * 2, 440)}
        mySide={0}
        picked={null}
        onPick={() => undefined}
        onSow={() => undefined}
        disabled
      />
    </View>
  );
}

/**
 * Thanh tua.
 *
 * Bốn nút chứ không phải một thanh trượt: trên điện thoại, kéo một thanh
 * trượt tới đúng nước thứ 37 là việc bất khả, mà "lùi một nước" thì lại là
 * thao tác chín trên mười lần người xem muốn làm.
 */
function Scrub({ at, total, onStep, onJump }: { at: number; total: number; onStep: (d: number) => void; onJump: (n: number) => void }) {
  const btn = (label: string, a11y: string, on: () => void, off: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={off}
      onPress={on}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 46,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: R.md,
          backgroundColor: off ? A.panelLo : A.panel,
          borderWidth: 1.2,
          borderColor: off ? A.lineSoft : A.line,
          opacity: off ? 0.5 : 1,
        },
        off ? undefined : press({ pressed }),
      ]}
    >
      <Txt size={15} weight="bold" color={off ? A.inkFaint : A.ink}>
        {label}
      </Txt>
    </Pressable>
  );
  return (
    <View style={{ paddingHorizontal: S.lg, gap: S.sm }}>
      <Txt size={12.5} color={A.inkSoft} center style={{ fontVariant: ['tabular-nums'] }}>
        Nước {at} trên {total}
      </Txt>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {btn('|<', 'Về đầu ván', () => onJump(0), at === 0)}
        {btn('<', 'Lùi một nước', () => onStep(-1), at === 0)}
        {btn('>', 'Tới một nước', () => onStep(1), at === total)}
        {btn('>|', 'Tới cuối ván', () => onJump(total), at === total)}
      </View>
    </View>
  );
}

function Empty({ title, body, onHome }: { title: string; body: string; onHome?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xl }}>
      <Txt size={17} weight="display" center>
        {title}
      </Txt>
      {body ? (
        <Txt size={12.5} color={A.inkSoft} center>
          {body}
        </Txt>
      ) : null}
      {onHome ? <Btn tone="ghost" label="Về sảnh" onPress={onHome} /> : null}
    </View>
  );
}

/** Dùng cho bài kiểm: số lượt trong biên bản của một ván. */
export const turnsOf = byTurn;
