import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CaroView } from '@co/game-co-caro';
import { type GanhView } from '@co/game-co-ganh';
import type { QuanView } from '@co/game-o-an-quan';
import { CaroBoard } from '../games/co-caro/Board';
import { DeskBackdrop, PaperStack } from '../games/co-caro/Desk';
import { caroTheme as CT, inkFor } from '../games/co-caro/theme';
import { GanhBoard, targetsOf } from '../games/co-ganh/Board';
import { CourtBackdrop } from '../games/co-ganh/Court';
import { ganhTheme as GT } from '../games/co-ganh/theme';
import { QuanBoard } from '../games/o-an-quan/Board';
import { GroundBackdrop } from '../games/o-an-quan/Ground';
import { faceOf } from '../games/faces';
import { Icon } from '../ui/Icon';
import { MatchShell } from '../ui/MatchShell';
import { Btn, Panel, Txt } from '../ui/parts';
import { AppBackdrop } from '../ui/surface';
import { A, R, S, lift } from '../ui/theme';
import { useOnline, type Intent, type Online } from './useOnline';

/**
 * Ván với người thật.
 *
 * Một màn chơi cho cả ba bộ môn, khác hẳn phía đấu với máy nơi mỗi game một
 * `Table` riêng. Làm được vì **cả ba bàn cờ đều đã vẽ từ `view`**, mà `view`
 * thì online hay ngoại tuyến đều cùng một hình dạng — chỉ khác chỗ lấy: một
 * bên tự tính, một bên nhận từ dây.
 *
 * Client ở đây **không chạy engine**. Nó không biết nước nào hợp lệ ngoài
 * những gì `view` nói ra, không tự đếm giờ, và không tự tuyên bố ai thắng.
 * Bấm vào ô phạm luật thì máy chủ trả `ILLEGAL` và bàn cờ không đổi.
 */

const SUBTITLE: Record<string, string> = {
  'co-caro': 'Năm quân liền nhau · chặn hai đầu không tính',
  'co-ganh': 'Kẹp hai đầu là gánh được quân',
  'o-an-quan': 'Rải quân, ăn ô cách một ô trống',
};

export function OnlineTable({ intent, onHome }: { intent: Intent; onHome: () => void }) {
  const o = useOnline(intent);
  const gameId = o.room?.gameId ?? (intent.kind === 'join' ? '' : intent.gameId);
  const face = faceOf(gameId);

  const leaveHome = () => {
    o.leave();
    onHome();
  };

  // Chưa đủ hai người thì chưa có bàn cờ nào để vẽ. Hiện đúng trạng thái thật
  // — đang nối dây, đang xếp hàng, hay đang chờ bạn vào mã — chứ không vẽ một
  // bàn cờ trống rồi để người chơi bấm vào đó mà không có gì xảy ra.
  if (!o.view) return <Waiting o={o} intent={intent} onHome={leaveHome} />;

  const seats = o.seats;
  const me = o.mySeat ?? 0;
  const them = me === 0 ? 1 : 0;
  const mine = seats[me];
  const theirs = seats[them];

  return (
    <MatchShell
      title={face?.nameVi ?? 'Ván cờ'}
      subtitle={SUBTITLE[gameId] ?? ''}
      headerRight={<CodePill code={o.room?.code ?? ''} rated={!!o.room?.rated} />}
      banner={<Banner o={o} />}
      onHome={leaveHome}
      onDraw={() => o.send({ t: 'offer-draw' })}
      onResign={() => o.send({ t: 'resign' })}
      ended={o.outcome}
      youWon={o.outcome?.winner === me}
      note={o.error}
      noteTone="seal"
      surface={surfaceFor(gameId)}
      top={{
        name: theirs?.name ?? 'Đối thủ',
        sub: theirs?.connected === false ? 'Mất kết nối' : 'Người chơi',
        token: <Token gameId={gameId} seat={them} active={!o.outcome && !o.myTurn} />,
        active: !o.outcome && !o.myTurn,
        ms: theirs?.ms ?? 0,
      }}
      bottom={{
        name: mine?.name ?? 'Bạn',
        sub: o.room?.rated ? 'Xếp hạng' : 'Phòng riêng',
        token: <Token gameId={gameId} seat={me} active={o.myTurn} />,
        active: o.myTurn,
        ms: mine?.ms ?? 0,
      }}
    >
      <Board gameId={gameId} o={o} />
    </MatchShell>
  );
}

function surfaceFor(gameId: string) {
  if (gameId === 'co-caro') return (w: number, h: number) => <DeskBackdrop width={w} height={h} />;
  if (gameId === 'co-ganh') return (w: number, h: number) => <CourtBackdrop width={w} height={h} />;
  return (w: number, h: number) => <GroundBackdrop width={w} height={h} />;
}

function Board({ gameId, o }: { gameId: string; o: Online }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [picked, setPicked] = useState<number | null>(null);

  // Bỏ chọn quân khi hết lượt mình, nếu không vòng chọn treo lại trên bàn
  // suốt lượt đối thủ và người chơi tưởng mình vẫn đang đi được.
  useEffect(() => {
    if (!o.myTurn) setPicked(null);
  }, [o.myTurn]);

  if (gameId === 'co-caro') {
    // Khung online không có bảng tỉ số và chỉ có hai nút, nên chừa ít theo
    // chiều dọc hơn phía đấu với máy. Chiều ngang thì **không** nới: `PaperStack`
    // vẽ chồng giấy thò ra ngoài `size`, ăn sát mép là xén mất mép tờ giấy.
    const size = Math.min(width - S.xl * 2, height - insets.top - insets.bottom - 250, 440);
    return (
      <View style={{ width: size, height: size }}>
        <PaperStack size={size} />
        <View style={[{ borderRadius: 4 }, lift(0.6, 26, 12)]}>
          <CaroBoard
            view={o.view as CaroView}
            size={size}
            mySeat={o.mySeat ?? 0}
            onPlay={(r, c) => o.send({ t: 'game', a: { r, c } })}
            disabled={!o.myTurn}
            hint={null}
          />
        </View>
      </View>
    );
  }

  if (gameId === 'co-ganh') {
    const view = o.view as GanhView;
    const size = Math.min(width - S.lg * 2, height - insets.top - insets.bottom - 260, 440);
    return (
      <View>
        <GanhBoard
          view={view}
          size={size}
          mySeat={o.mySeat}
          picked={picked}
          onPick={setPicked}
          onMove={(f, t) => {
            setPicked(null);
            o.send({ t: 'game', a: { f, t } });
          }}
          legalTargets={targetsOf(view, picked)}
          disabled={!o.myTurn}
        />
      </View>
    );
  }

  const view = o.view as QuanView;
  const boardW = Math.min(width - S.lg * 2, 440);
  return (
    <View>
      <QuanBoard
        view={view}
        width={boardW}
        mySide={view.yourSide}
        picked={picked}
        onPick={setPicked}
        onSow={(cell, dir) => {
          setPicked(null);
          o.send({ t: 'game', a: { cell, dir } });
        }}
        disabled={!o.myTurn}
      />
    </View>
  );
}

/** Mã phòng luôn hiện: đó là thứ người chơi phải đọc cho bạn mình. */
function CodePill({ code, rated }: { code: string; rated: boolean }) {
  return (
    <View
      style={{
        alignItems: 'center',
        minHeight: 34,
        paddingHorizontal: S.md,
        paddingVertical: 3,
        borderRadius: R.pill,
        backgroundColor: A.goldSoft,
        borderWidth: 1.2,
        borderColor: A.goldDeep,
      }}
    >
      <Txt size={13} weight="bold" color={A.gold} style={{ letterSpacing: 2 }}>
        {code}
      </Txt>
      <Txt size={8.5} weight="semi" color={A.inkFaint} style={{ letterSpacing: 0.8 }}>
        {rated ? 'XẾP HẠNG' : 'PHÒNG RIÊNG'}
      </Txt>
    </View>
  );
}

/**
 * Dải trạng thái dây nối.
 *
 * Chỉ hiện khi có chuyện. Mất mạng giữa ván là lúc người chơi hoảng nhất —
 * không nói gì thì họ tưởng app treo và tắt đi, mà tắt đi đúng lúc đó thì
 * đồng hồ vẫn chạy và họ thua thật.
 */
function Banner({ o }: { o: Online }) {
  if (o.phase === 'ready' || o.phase === 'off') return null;
  const text =
    o.phase === 'lost' ? 'Mất kết nối — đang nối lại, ghế của bạn vẫn giữ' : o.phase === 'connecting' ? 'Đang nối máy chủ…' : 'Đang tìm đối thủ…';
  return (
    <View style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}>
      <Panel radius={R.sm} tone={0} seed={13}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, paddingVertical: 7 }}>
          <Icon name={o.phase === 'lost' ? 'flag' : 'bolt'} size={14} color={o.phase === 'lost' ? A.sealLit : A.gold} />
          <Txt size={11.5} color={A.inkSoft}>
            {text}
          </Txt>
        </View>
      </Panel>
    </View>
  );
}

/** Màn chờ: chưa đủ hai người nên chưa có ván. */
function Waiting({ o, intent, onHome }: { o: Online; intent: Intent; onHome: () => void }) {
  const { width, height } = useWindowDimensions();
  const code = o.room?.code;
  const title =
    o.phase === 'lost'
      ? 'Mất kết nối'
      : intent.kind === 'quick'
        ? 'Đang tìm đối thủ'
        : intent.kind === 'create'
          ? 'Chờ bạn vào phòng'
          : 'Đang vào phòng';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, padding: S.xl }}>
      <AppBackdrop width={width} height={height} />
      <Txt size={20} weight="display">
        {title}
      </Txt>
      {code ? (
        <View style={{ alignItems: 'center', gap: S.xs }}>
          <Txt size={11} color={A.inkFaint}>
            Đọc mã này cho bạn của bạn
          </Txt>
          <Panel radius={R.md} tone={1} seed={31}>
            <Txt size={34} weight="display" color={A.gold} style={{ letterSpacing: 8, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
              {code}
            </Txt>
          </Panel>
        </View>
      ) : null}
      {o.waiting !== null ? (
        <Txt size={12} color={A.inkFaint}>
          {o.waiting} người đang chờ trong hàng
        </Txt>
      ) : null}
      {o.error ? (
        <Txt size={12.5} color={A.sealLit} center>
          {o.error}
        </Txt>
      ) : null}
      <Btn label="Về sảnh" tone="ghost" onPress={onHome} />
    </View>
  );
}

/** Quân của một ghế, vẽ theo bộ môn. */
function Token({ gameId, seat, active }: { gameId: string; seat: number; active: boolean }) {
  const ring = active ? A.gold : A.lineSoft;
  if (gameId === 'co-caro') {
    return (
      <View style={[box, { backgroundColor: CT.paper, borderColor: active ? A.gold : CT.paperShade }]}>
        <Svg width={21} height={21} viewBox="0 0 100 100">
          {seat === 0 ? (
            <>
              <Path d="M22 22 L78 78" stroke={inkFor(0)} strokeWidth={12} strokeLinecap="round" fill="none" />
              <Path d="M78 22 L22 78" stroke={inkFor(0)} strokeWidth={12} strokeLinecap="round" fill="none" />
            </>
          ) : (
            <Path d="M74 30 A28 28 0 1 0 76 62 A28 28 0 0 0 66 24" stroke={inkFor(1)} strokeWidth={12} strokeLinecap="round" fill="none" />
          )}
        </Svg>
      </View>
    );
  }
  const fill = gameId === 'co-ganh' ? (seat === 0 ? GT.redFace : GT.paleFace) : seat === 0 ? '#6E6257' : '#D8CBB4';
  return (
    <View style={[box, { backgroundColor: A.panelLo, borderColor: ring }]}>
      <Svg width={22} height={22}>
        <Circle cx={11} cy={11} r={8} fill={fill} />
      </Svg>
    </View>
  );
}

const box = {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 2,
};
