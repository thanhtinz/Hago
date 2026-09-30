import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CaroView } from '@co/game-co-caro';
import { type GanhView } from '@co/game-co-ganh';
import type { QuanView } from '@co/game-o-an-quan';
import { CaroBoard } from '../games/co-caro/Board';
import { PaperStack } from '../games/co-caro/Desk';
import { caroTheme as CT, inkFor } from '../games/co-caro/theme';
import { GanhBoard, targetsOf } from '../games/co-ganh/Board';
import { ganhTheme as GT } from '../games/co-ganh/theme';
import { QuanBoard } from '../games/o-an-quan/Board';
import { faceOf } from '../games/faces';
import { CLOCKS, clockLabel } from '@co/protocol';
import { Face } from '../ui/Crest';
import { CHAT_SPACE } from '../ui/FloatingChat';
import { useMatchFeedback } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { MatchShell } from '../ui/MatchShell';
import { Btn, Panel, Txt, press } from '../ui/parts';
import { Field } from '../ui/Field';
import { AppBackdrop } from '../ui/surface';
import { A, R, S, lift } from '../ui/theme';
import { api, type Friend } from './api';
import { live, useIntentOnce, useLive, useMatch, useWatch, type Online } from './live';
import { rememberRoom } from './store';
import type { Intent } from './useOnline';
import { TableBackdrop, tintOf } from '../ui/TableBackdrop';

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

export function OnlineTable({ intent, onHome }: { intent: Intent; onHome: () => void }) {
  const router = useRouter();
  const o = useMatch();
  /** Nước đang ướm trên bàn caro, để nhắc "chạm lại để đặt". */
  const [aim, setAim] = useState<string | null>(null);
  // Gửi ý định **một lần**, ngay khi dây đã nối. Gửi trong lúc chưa nối thì
  // nó nằm hàng đợi; gửi lại mỗi lần render thì vào hàng chờ hai ba lần.
  useIntentOnce(() => {
    // Vứt thế cờ đang giữ trước khi xin một phòng mới: nếu không, một lần
    // vào mã bị từ chối sẽ vẫn vẽ ván cũ.
    if (intent.kind !== 'none') live.forget();
    if (intent.kind === 'quick') live.quick(intent.gameId, intent.clock, intent.xepHang);
    else if (intent.kind === 'create') live.create(intent.gameId, { ...(intent.clock ? { clock: intent.clock } : {}), ...(intent.pass ? { pass: intent.pass } : {}) });
    else if (intent.kind === 'join') live.join(intent.code, intent.pass);
  });
  const gameId = o.room?.gameId ?? (intent.kind === 'quick' || intent.kind === 'create' ? intent.gameId : '');
  const face = faceOf(gameId);
  // Một chỗ duy nhất phát tiếng cho ván online. `useMatch()` dùng chung
  // bởi nhiều component, nên đặt trong đó là mỗi component một lần kêu.
  useMatchFeedback(
    o.ply,
    o.outcome ? (o.outcome.winner === null ? 'hoa' : o.outcome.winner === o.mySeat ? 'thang' : 'thua') : null,
  );
  // Nhớ mã phòng để lần sau mở tấm "vào mã" là thấy nó sẵn ở đó. Ghi khi
  // **đã thật sự vào phòng**, không ghi lúc gõ mã: mã gõ sai thì không
  // đáng nằm trong danh sách.
  const code = o.room?.code;
  useEffect(() => {
    if (code) rememberRoom(code, o.room?.gameId ?? '', Date.now());
  }, [code]);

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
      headerRight={
        <CodePill code={o.room?.code ?? ''} rated={!!o.room?.rated} clock={o.room?.clock ?? ''} fans={o.room?.fans ?? 0} />
      }
      banner={<Banner o={o} />}
      onHome={leaveHome}
      onRules={() => router.push(`/luat/${gameId}`)}
      homeConfirms
      onDraw={() => o.send({ t: 'offer-draw' })}
      onResign={() => o.send({ t: 'resign' })}
      record={{ gameId, moves: o.moves, mySeat: o.mySeat }}
      rematch={o.rematch}
      onRematch={o.askRematch}
      drawOffer={o.drawOffer}
      onAcceptDraw={() => o.send({ t: 'accept-draw' })}
      onDeclineDraw={() => o.send({ t: 'decline-draw' })}
      ended={o.outcome}
      youWon={o.outcome?.winner === me}
      note={o.error ?? aim}
      noteTone={o.error ? 'seal' : 'gold'}
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
      <Board gameId={gameId} o={o} onAim={setAim} />
    </MatchShell>
  );
}

export function surfaceFor(gameId: string) {
  // Một mặt bàn duy nhất cho mọi bộ môn, chỉ khác màu quầng. Bản sắc của
  // bộ môn nằm ở bàn cờ, không ở cái bàn kê nó.
  return (w: number, h: number) => <TableBackdrop width={w} height={h} tint={tintOf(gameId)} />;
}

export function Board({ gameId, o, onAim }: { gameId: string; o: Online; onAim: (t: string | null) => void }) {
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
            confirm
            onAim={(cell) => onAim(cell ? `Chạm lại ô hàng ${cell.r + 1} cột ${cell.c + 1} để đặt quân` : null)}
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
function CodePill({ code, rated, clock, fans }: { code: string; rated: boolean; clock: string; fans: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      {/* Có người đang xem thì phải nói: đánh trước mặt khán giả khác với
          đánh kín, và người chơi có quyền biết mình đang ở tình huống nào. */}
      {fans > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 30,
            paddingHorizontal: 9,
            borderRadius: R.pill,
            borderWidth: 1,
            borderColor: A.goldDeep,
          }}
          accessibilityRole="text"
          accessibilityLabel={`${fans} người đang xem`}
        >
          <Icon name="eye" size={13} color={A.gold} />
          <Txt size={12} weight="bold" color={A.gold}>
            {fans}
          </Txt>
        </View>
      ) : null}
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
      {/* Mức thời gian là thứ đáng nói hơn "xếp hạng hay không": người
          chơi biết mình vừa bấm ghép cặp hay mở phòng, nhưng ba phút hay
          hai mươi phút thì phải nhìn mới nhớ. */}
      <Txt size={11} weight="semi" color={A.inkFaint} style={{ letterSpacing: 0.5 }}>
        {clock ? (CLOCKS[clock]?.nameVi ?? 'Theo bộ môn') : rated ? 'Xếp hạng' : 'Phòng riêng'}
      </Txt>
      </View>
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

/**
 * Đồng hồ đếm từ lúc bắt đầu chờ.
 *
 * Chờ mà không thấy gì nhúc nhích thì sau mười lăm giây ai cũng nghĩ app
 * treo. Một con số đang tăng nói "vẫn đang chạy" rõ hơn mọi vòng xoay.
 */
function useElapsed(on: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return setN(0);
    const t0 = Date.now();
    const id = setInterval(() => setN(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [on]);
  return n;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Màn chờ: chưa đủ hai người nên chưa có ván. */
function Waiting({ o, intent, onHome }: { o: Online; intent: Intent; onHome: () => void }) {
  const { width, height } = useWindowDimensions();
  const [pass, setPass] = useState('');
  const code = o.room?.code;
  const waited = useElapsed(o.phase !== 'connecting' && !o.outcome);
  const clockKey = o.room?.clock ?? (intent.kind === 'quick' || intent.kind === 'create' ? (intent.clock ?? '') : '');
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
      {code ? <CodeCard code={code} /> : null}

      {/* Mức thời gian hiện **ngay từ lúc còn đang chờ**, lấy từ ý định nếu
          chưa có phòng: người vừa chọn cờ chớp cần thấy mình đang xếp hàng
          cờ chớp, không phải đợi tới khi vào bàn mới biết. */}
      {/* "Phòng có khoá" **không** được treo vào việc có chọn mức giờ hay
          không: khoá là một sự thật về cái phòng, còn mức giờ là một lựa
          chọn có thể bỏ trống. Treo vào nhau thì mở một phòng khoá ở mức
          mặc định là giấu mất chính cái khoá. */}
      {clockKey || o.room?.locked ? (
        <Txt size={12.5} weight="semi" color={A.inkSoft}>
          {clockKey ? clockLabel(clockKey) : 'Mức theo bộ môn'}
          {o.room?.locked ? ' · phòng có khoá' : ''}
        </Txt>
      ) : null}
      {/* Con số thật, nói thẳng. Hàng chờ ghép ngay khi có người thứ hai
          nên nó gần như luôn bằng 1 — in "1 người đang chờ" trong khi người
          đó chính là mình thì vô nghĩa. */}
      {o.waiting !== null ? (
        <Txt size={12} color={A.inkFaint} center>
          {o.waiting > 1 ? `${o.waiting} người đang chờ trong hàng` : 'Chưa có ai khác đang chờ bộ môn này'}
        </Txt>
      ) : null}
      {waited > 2 ? (
        <Txt size={13} weight="semi" color={A.inkSoft} style={{ fontVariant: ['tabular-nums'] }}>
          Đã chờ {mmss(waited)}
        </Txt>
      ) : null}
      {o.error ? (
        <Txt size={12.5} color={A.sealLit} center>
          {o.error}
        </Txt>
      ) : null}

      {/* Phòng hoá ra có khoá: cho gõ mật khẩu ngay tại đây thay vì bắt
          quay về sảnh, mở lại tấm nhập mã, và gõ lại cả mã lẫn mật khẩu. */}
      {intent.kind === 'join' && o.error?.includes('mật khẩu') ? (
        <View style={{ alignSelf: 'stretch', gap: S.sm }}>
          <Field label="Mật khẩu phòng" value={pass} onChange={setPass} placeholder="Hỏi người mở phòng" />
          <Btn
            label="Thử lại"
            disabled={!pass.trim()}
            onPress={() => {
              live.clearError();
              live.join(intent.code, pass.trim());
            }}
          />
        </View>
      ) : null}
      {code ? <InviteFriends /> : null}
      <Btn label="Về sảnh" tone="ghost" onPress={onHome} />
    </View>
  );
}

/**
 * Mã phòng, bấm vào là chép.
 *
 * Trước đây nó chỉ là chữ: muốn mời bạn thì phải đọc năm ký tự qua điện
 * thoại hoặc tự gõ lại vào một app nhắn tin khác.
 */
function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    // `navigator.clipboard` có trên web và trên WebView; không có thì im
    // lặng bỏ qua — mã vẫn đọc được bằng mắt, đó mới là việc chính.
    const nav = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } }).navigator;
    void nav?.clipboard?.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <View style={{ alignItems: 'center', gap: S.xs }}>
      <Txt size={11} color={A.inkFaint}>
        Đọc mã này cho bạn của bạn
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel="Sao chép mã phòng" onPress={copy} style={press}>
        <Panel radius={R.md} tone={1} seed={31}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
            <Txt size={34} weight="display" color={A.gold} style={{ letterSpacing: 8 }}>
              {code}
            </Txt>
            <Icon name={copied ? 'check' : 'copy'} size={18} color={copied ? A.jade : A.inkSoft} />
          </View>
        </Panel>
      </Pressable>
      <Txt size={11} color={copied ? A.jade : A.inkFaint}>
        {copied ? 'Đã chép mã' : 'Chạm để chép'}
      </Txt>
    </View>
  );
}

/**
 * Mời thẳng một người bạn đang trực tuyến vào đúng phòng này.
 *
 * Đây là đường ngắn nhất từ "mở phòng" tới "có đối thủ". Đọc mã qua điện
 * thoại vẫn còn đó cho người không phải bạn bè.
 */
function InviteFriends() {
  const s = useLive();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  useEffect(() => {
    void api
      .friends()
      .then((r) => setFriends(r.friends.filter((f) => f.status === 'accepted')))
      .catch(() => setFriends([]));
  }, []);
  useWatch(useMemo(() => friends.map((f) => f.user.id), [friends]));
  const online = friends.filter((f) => s.online.has(f.user.id));
  if (!friends.length) return null;

  return (
    <View style={{ alignSelf: 'stretch', gap: S.sm }}>
      <Txt size={12} color={A.inkFaint} center>
        {online.length ? 'Hoặc mời thẳng một người bạn đang trực tuyến' : 'Không có người bạn nào đang trực tuyến'}
      </Txt>
      {online.slice(0, 4).map((f) => {
        const asked = sent.has(f.user.id) || s.challenges.some((c) => c.dir === 'out' && c.withId === f.user.id);
        return (
          <Pressable
            key={f.user.id}
            accessibilityRole="button"
            accessibilityLabel={`Mời ${f.user.name} vào phòng`}
            disabled={asked}
            onPress={() => {
              live.invite(f.user.id);
              setSent(new Set([...sent, f.user.id]));
            }}
            style={press}
          >
            <Panel radius={R.md} tone={1} seed={f.user.name.length * 7}>
              {/* Chừa mép phải cho nút chat nổi: nó nổi trên mọi màn và
                  đúng chỗ này là nơi nó hay đậu. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm, paddingLeft: S.md, paddingRight: CHAT_SPACE }}>
                <Face avatar={f.user.avatar} id={f.user.id} size={34} />
                <Txt size={14} weight="semi" style={{ flex: 1 }} numberOfLines={1}>
                  {f.user.name}
                </Txt>
                <Txt size={12} weight="bold" color={asked ? A.inkFaint : A.gold}>
                  {asked ? 'Đã mời' : 'Mời'}
                </Txt>
              </View>
            </Panel>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Quân của một ghế, vẽ theo bộ môn. */
export function Token({ gameId, seat, active }: { gameId: string; seat: number; active: boolean }) {
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
