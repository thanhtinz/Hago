import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { registry, type BotLevel } from '@co/core';
import { load as remembered, recentRooms, save } from '../src/net/store';
import { CLOCKS, conMayVan, danhHieuOf } from '@co/protocol';
import { Chip as ClockChip } from '../src/ui/Tabs';
import { Field } from '../src/ui/Field';
import { LEVEL_NAME } from '../src/ui/MatchShell';
import '../src/catalog';
import { FACES, faceOf, type GameFace } from '../src/games/faces';
import { api, useAuth, type Profile } from '../src/net/api';
import { live, useLive } from '../src/net/live';
import { Icon, type IconName } from '../src/ui/Icon';
import { Btn, SLOP, Txt, press } from '../src/ui/parts';
import { Sheet } from '../src/ui/Sheet';
import { Face } from '../src/ui/Crest';
import { AppBackdrop, Panel, Rule, SurfaceFill } from '../src/ui/surface';
import { A, R, S, glow, lift } from '../src/ui/theme';

/**
 * Sảnh.
 *
 * Bố cục học từ các app cờ online đông người dùng: trên cùng là người chơi,
 * giữa là **một** nút chơi to, dưới là lưới bộ môn — chín lần mở app thì tám
 * lần người ta chỉ muốn bấm "chơi tiếp", không muốn đọc danh mục.
 *
 * Còn chất liệu thì lấy từ chính cái bàn cờ gỗ: mọi tấm ở đây là gỗ có vân,
 * có vát cạnh, viền chỉ vàng. Một sảnh game cờ mà dựng bằng thẻ xám bo góc
 * thì nhìn như trang cài đặt.
 */

const READY = new Set(registry.catalog().map((s) => s.id));

export default function Lobby() {
  const router = useRouter();
  /** Chế độ online đang chọn bộ môn, hoặc 'join' đang nhập mã. */
  const [sheet, setSheet] = useState<'quick' | 'create' | 'join' | null>(null);
  // `/?mo=phong` mở thẳng tấm tạo phòng. Trang "Ván đấu" lúc trống cần một
  // nút dẫn tới đúng việc tiếp theo, chứ không phải thả người ta về sảnh
  // rồi để họ tự tìm lại.
  const { mo } = useLocalSearchParams<{ mo?: string }>();
  useEffect(() => {
    if (mo === 'phong') setSheet('create');
  }, [mo]);
  const { me } = useAuth();
  const s = useLive();
  /**
   * Hồ sơ giữ **nguyên cả khối**, không chỉ moi mỗi số lời mời.
   *
   * `api.me()` trả về đủ thành tích, chuỗi thắng và lịch sử; sảnh từng gọi
   * nó rồi vứt hết trừ một con số, và in một dòng chữ cứng "Chưa xếp hạng"
   * cho cả người đã đánh trăm ván.
   */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!me) return setProfile(null);
    setLoading(true);
    try {
      setProfile(await api.me());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [me?.id]);
  useEffect(() => {
    void load();
  }, [load]);
  // Đã tới sảnh thì cờ "vừa nối lại ghế cũ" hết tác dụng: từ đây trở đi mọi
  // thứ người dùng bấm là một lựa chọn mới.
  useEffect(() => live.seen(), [s.restored]);
  // Chấm đỏ lấy từ **dây nối**, không phải từ lần gọi API lúc mở màn: ai gửi
  // lời mời trong lúc mình đang ngồi ở sảnh thì nó phải nhúc nhích ngay.
  const requests = s.friendRequests || (profile?.requests ?? 0);
  const pending = requests + s.challenges.filter((c) => c.dir === 'in').length;

  // Lời rủ được nhận lời trong lúc đang ở sảnh: vào bàn ngay.
  useEffect(() => {
    if (s.justMatched) {
      live.clearMatched();
      router.replace('/online/live');
    }
  }, [s.justMatched, router]);
  /** Ba chế độ online đều cần danh tính, nên chưa đăng nhập là đưa sang màn đăng nhập. */
  const online = (go: () => void) => (me ? go() : router.push('/auth'));
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const scroller = useRef<ScrollView>(null);
  const gridY = useRef(0);
  // Nói đúng mức máy đang nhớ, thay vì câu chung "ba mức khó": người chơi
  // quen mức Khó cần biết ngay là bấm vào sẽ vào mức nào.
  const botLevel = ((): BotLevel => {
    const v = remembered<number>('muc-may', 2);
    return v === 1 || v === 2 || v === 3 ? (v as BotLevel) : 2;
  })();

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: insets.top + S.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={me ? <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={A.gold} colors={[A.gold]} /> : undefined}
      >
        {/* Tên nền tảng khắc chữ serif, có đường chỉ vàng bên dưới như khung
            viền một bàn cờ gỗ. */}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt size={13} weight="display" color={A.gold} style={{ letterSpacing: 6 }}>
            CỜ VIỆT
          </Txt>
          <Rule width={w * 0.5} />
          <Pulse lobby={s.lobby} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cài đặt"
          hitSlop={SLOP}
          onPress={() => router.push(me ? '/me?tab=cai-dat' : '/auth')}
          style={({ pressed }) => [{ position: 'absolute', right: S.lg, top: insets.top + S.md }, press({ pressed })]}
        >
          <Icon name="settings" size={20} color={A.inkFaint} />
        </Pressable>

        <View style={{ paddingHorizontal: S.lg, paddingTop: S.lg, gap: S.md }}>
          <Panel radius={R.md} tone={1} seed={9} style={lift(0.4, 12, 5)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={me ? 'Trang cá nhân' : 'Đăng nhập'}
              onPress={() => router.push(me ? '/me' : '/auth')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}
            >
              {me ? (
                <Face avatar={me.avatar} id={me.id} size={46} />
              ) : (
                <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1.2, borderColor: A.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="user" size={22} color={A.inkFaint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Txt size={17} weight="display">
                  {me?.name ?? 'Chưa đăng nhập'}
                </Txt>
                {/* Không bịa elo hay số trận. Chưa đánh ván nào thì vẫn nói
                    là chưa xếp hạng — đừng in số 0 như một thành tích. */}
                <Txt size={11.5} color={A.inkFaint}>
                  {me ? summary(profile) : 'Đăng nhập để chơi với người thật'}
                </Txt>
              </View>
              <Icon name="chevron" size={17} color={A.inkFaint} />
            </Pressable>
          </Panel>

          <Btn
            size="lg"
            icon="robot"
            label="Đấu với máy"
            sub={`Cờ caro · mức ${LEVEL_NAME[botLevel]}`}
            onPress={() => router.push('/play/co-caro')}
          />

          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Mode icon="bolt" label="Ghép cặp" onPress={() => online(() => setSheet('quick'))} />
            <Mode icon="door" label="Tạo phòng" onPress={() => online(() => setSheet('create'))} />
            <Mode icon="key" label="Vào mã" onPress={() => online(() => setSheet('join'))} />
            <Mode icon="user" label="Bạn bè" badge={pending} onPress={() => online(() => router.push('/friends'))} />
          </View>

          <Txt size={11} color={A.inkFaint} center style={{ paddingHorizontal: S.sm }}>
            {me ? 'Ghép cặp tính xếp hạng. Phòng riêng mở bằng mã thì không.' : 'Ba chế độ trên cần đăng nhập. Đấu với máy thì không.'}
          </Txt>
        </View>

        <View
          onLayout={(e) => {
            gridY.current = e.nativeEvent.layout.y;
          }}
          style={{ alignItems: 'center', paddingTop: S.xxl, paddingBottom: S.md, gap: 2 }}
        >
          <Txt size={20} weight="display" color={A.ink}>
            Cờ hai người
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {READY.size} trên {FACES.length} đã mở
          </Txt>
          <Rule width={w * 0.38} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, paddingHorizontal: S.lg }}>
          {FACES.map((f, i) => (
            <GameCard
              key={f.id}
              face={f}
              seed={i * 17 + 5}
              ready={READY.has(f.id)}
              onPress={() => router.push(READY.has(f.id) ? `/play/${f.id}` : `/luat/${f.id}`)}
              onRules={() => router.push(`/luat/${f.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNav
        width={w}
        insetBottom={insets.bottom}
        onHome={() => scroller.current?.scrollTo({ y: 0, animated: true })}
        onGrid={() => scroller.current?.scrollTo({ y: gridY.current, animated: true })}
        onRooms={() => router.push('/van')}
        onBoard={() => router.push('/bxh')}
        onMe={() => router.push(me ? '/me' : '/auth')}
      />

      {/* Đặt sau `BottomNav`: tấm trượt phải nằm **trên** thanh điều hướng.
          Để trước thì thanh dưới cùng đè lên mất nút Đóng của tấm. */}
      {/* Đóng tấm **trước khi** chuyển màn. Sảnh vẫn nằm dưới trong ngăn xếp,
          nên quay lui từ ván đấu là thấy lại đúng tấm đang mở hôm trước. */}
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
            const q = new URLSearchParams({ game: id });
            if (o.clock) q.set('clock', o.clock);
            if (m === 'create' && o.pass.trim()) q.set('pass', o.pass.trim());
            router.push(`/online/${m}?${q.toString()}`);
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * Một dòng nói sảnh có đang sống hay không.
 *
 * Con số đến từ dây nối và tự đổi khi có người vào ra. Chưa nhận được nhịp
 * nào thì **không hiện gì** — in "0 người" trong lúc đang nối dây là nói
 * sai, và nói sai về chuyện có ai ở đây không là kiểu nói sai tệ nhất với
 * một sảnh game.
 */
function Pulse({ lobby }: { lobby: { online: number; rooms: number; queued: number } | null }) {
  if (!lobby) return null;
  const parts = [`${lobby.online} người đang chơi`];
  if (lobby.rooms > 0) parts.push(`${lobby.rooms} ván đang chạy`);
  if (lobby.queued > 0) parts.push(`${lobby.queued} đang tìm đối`);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: lobby.online > 0 ? A.jade : A.inkFaint }} />
      <Txt size={11} color={A.inkFaint}>
        {parts.join(' · ')}
      </Txt>
    </View>
  );
}

/**
 * Dòng dưới tên ở thẻ người chơi.
 *
 * Điểm đại diện là điểm ở **bộ môn đánh nhiều nhất**, không phải điểm cao
 * nhất: khoe một con số lấy từ ba ván may mắn thì nó không mô tả người chơi.
 * Cùng một quy tắc với trang cá nhân.
 */
function summary(p: Profile | null): string {
  const played = (p?.stats ?? []).reduce((n, x) => n + x.win + x.draw + x.loss, 0);
  if (!played) return 'Chưa xếp hạng · chưa đánh ván nào';
  const main = [...(p?.stats ?? [])].sort((x, y) => y.win + y.draw + y.loss - (x.win + x.draw + x.loss))[0]!;
  const name = faceOf(main.gameId)?.nameVi ?? main.gameId;
  const streak = p?.streak && p.streak.n > 1 && p.streak.kind === 'win' ? ` · ${p.streak.n} thắng liên tiếp` : '';
  // Danh hiệu đứng đầu dòng khi đã có: đó là thứ người ta muốn thấy trước
  // con số. Chưa đủ ván định hạng thì nói thẳng còn thiếu mấy ván, chứ
  // không im lặng bỏ trống chỗ đó.
  const bac = danhHieuOf(main.rating, main.ranked);
  const dau = bac ? `${bac.ten} · ` : `Còn ${conMayVan(main.ranked)} ván định hạng · `;
  return `${dau}${main.rating} điểm ${name} · ${played} ván${streak}`;
}

/** Một ô trong hàng chế độ. `badge` là số việc đang chờ mình xử lý. */
function Mode({ icon, label, onPress, badge = 0 }: { icon: IconName; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} việc chờ` : label}
      style={({ pressed }) => [{ flex: 1, borderRadius: R.md }, press({ pressed })]}
    >
      <Panel radius={R.md} tone={0} seed={label.length * 7}>
        <View style={{ gap: 5, paddingVertical: S.md, alignItems: 'center' }}>
          <Icon name={icon} size={19} color={A.gold} />
          <Txt size={10.5} weight="semi" color={A.inkSoft} numberOfLines={1}>
            {label}
          </Txt>
        </View>
      </Panel>
      {/* Chấm đếm việc chờ. Số chứ không phải chấm trơn: "3 lời mời" khác hẳn
          "có gì đó mới" về mức độ đáng bấm vào ngay. */}
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            paddingHorizontal: 5,
            backgroundColor: A.seal,
            borderWidth: 1.5,
            borderColor: A.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={11} weight="bold" color="#FFF">
            {badge > 9 ? '9+' : badge}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Chọn bộ môn để ghép cặp hoặc mở phòng.
 *
 * Chỉ liệt kê bộ môn **máy chủ có engine**. Cho chọn một bộ môn chưa cài rồi
 * để máy chủ trả `NO_GAME` là bắt người chơi đi một vòng mới biết mình không
 * chơi được.
 */
function PickGameSheet({
  mode,
  onClose,
  onPick,
}: {
  mode: 'quick' | 'create';
  onClose: () => void;
  onPick: (id: string, o: { clock: string; pass: string }) => void;
}) {
  const open = FACES.filter((f) => READY.has(f.id));
  // Mức thời gian nhớ qua lần mở sau: người quen cờ chớp không phải chọn
  // lại mỗi lần mở app.
  const [clock, setClock] = useState<string>(() => remembered<string>('muc-thoi-gian', ''));
  const [pass, setPass] = useState('');
  const pick = (id: string) => {
    save('muc-thoi-gian', clock);
    onPick(id, { clock, pass });
  };
  return (
    <Sheet
      title={mode === 'quick' ? 'Ghép cặp bộ môn nào?' : 'Mở phòng bộ môn nào?'}
      sub={
        mode === 'quick'
          ? 'Hàng chờ tách theo mức thời gian — chỉ ghép với người chọn cùng mức'
          : 'Nhận một mã năm ký tự để mời bạn'
      }
      onClose={onClose}
      maxHeight={430}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: S.xs }}>
        <ClockChip label="Theo bộ môn" a11y="Mức Theo bộ môn" on={clock === ''} onPress={() => setClock('')} />
        {Object.entries(CLOCKS).map(([k, c]) => (
          <ClockChip
            key={k}
            label={`${c.nameVi} ${Math.round(c.initialMs / 60_000)} phút`}
            a11y={`Mức ${c.nameVi}`}
            on={clock === k}
            onPress={() => setClock(k)}
          />
        ))}
      </View>
      {mode === 'create' ? (
        <View style={{ paddingBottom: S.xs }}>
          <Field label="Mật khẩu phòng (không bắt buộc)" value={pass} onChange={setPass} placeholder="Bỏ trống thì ai có mã cũng vào được" />
        </View>
      ) : null}
      {open.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => pick(f.id)}
          accessibilityRole="button"
          accessibilityLabel={f.nameVi}
          style={({ pressed }) => [{ borderRadius: R.md }, press({ pressed })]}
        >
          <Panel radius={R.md} tone={1} seed={f.id.length * 11}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
              <View style={{ width: 54, height: 35, borderRadius: 6, overflow: 'hidden' }}>
                <f.Motif />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="display">
                  {f.nameVi}
                </Txt>
                <Txt size={10.5} color={A.inkFaint}>
                  {f.minutes}
                </Txt>
              </View>
              <Icon name="chevron" size={16} color={A.inkFaint} />
            </View>
          </Panel>
        </Pressable>
      ))}
    </Sheet>
  );
}

/** Nhập mã phòng bạn đọc cho. */
function CodeSheet({ onClose, onGo }: { onClose: () => void; onGo: (code: string, pass: string) => void }) {
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

/**
 * Thẻ bộ môn: một bức tranh lồng khung.
 *
 * Nửa trên là chất liệu thật của game, được **lồng khung**: bo góc, hở ra
 * một vành quanh mép. Hình tràn sát mép thẻ thì trông như ảnh dán; lồng
 * khung thì trông như hiện vật bày trong tủ.
 *
 * Viền của thẻ đã mở là viền trung tính, **không** phải màu nhấn. Ba thẻ
 * viền nghệ vàng nằm cùng một màn với nút chính cũng nghệ vàng thì không
 * còn cái nào là chính nữa. Đã mở hay chưa đọc ra từ chỗ khác: thẻ chưa mở
 * mờ đi và mang nhãn "Sắp có".
 */
function GameCard({
  face,
  ready,
  seed,
  onPress,
  onRules,
}: {
  face: GameFace;
  ready: boolean;
  seed: number;
  onPress: () => void;
  /** Mở trang luật. Thẻ chưa mở thì bấm vào đâu cũng ra đây. */
  onRules: () => void;
}) {
  const Motif = face.Motif;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? `Chơi ${face.nameVi}` : `Xem luật ${face.nameVi}, chưa mở`}
      onPress={onPress}
      style={({ pressed }) => [
        // Bo góc phải khai ngay ở đây, chỗ mang bóng đổ. Bóng đổ bám theo bo
        // góc của chính phần tử mang nó: để trống thì bóng chạy theo hình
        // chữ nhật vuông góc, và ở bốn góc nó thò ra ngoài thành một đường
        // viền vuông bao quanh cái thẻ bo tròn.
        { width: '47.5%', borderRadius: R.md, transform: [{ translateY: pressed ? 1 : 0 }] },
        lift(ready ? 0.4 : 0.28, 12, 5),
      ]}
    >
      <Panel radius={R.md} tone={ready ? 2 : 1} seed={seed} hairline={false} style={{ borderWidth: 1, borderColor: ready ? A.line : A.lineSoft }}>
        <View style={{ padding: 6 }}>
          <View
            style={{
              // Khung ảnh phải đúng tỉ lệ 100:64 của hình, không đặt chiều
              // cao cố định. Lệch tỉ lệ thì hình co lại cho vừa chiều cao và
              // hở ra hai bên; chỗ hở lộ nền phẳng của thẻ, thành một cái
              // khung vuông thứ hai nằm bên trong khung bo góc.
              aspectRatio: 100 / 64,
              borderRadius: 7,
              overflow: 'hidden',
              backgroundColor: face.surface,
              borderWidth: 1,
              borderColor: '#00000055',
              opacity: ready ? 1 : 0.7,
            }}
          >
            <Motif />
            {/* Bóng đổ của khung hắt vào trong hình, để hình lõm xuống dưới
                mặt gỗ chứ không nổi lên trên. */}
            <InsetShade />
            {/* Trạng thái nằm trên hình chứ không xen vào hàng nhãn: ba nhãn
                một hàng thì thẻ "2–4 người" bị xuống dòng, và hai thẻ cùng
                hàng cao thấp khác nhau. */}
            {ready ? null : (
              <View style={{ position: 'absolute', top: 6, right: 6 }}>
                <Chip label="Sắp có" muted />
              </View>
            )}
            {/* Nút luật nằm **trong khung hình**, góc dưới trái: ở đó nó
                không chen vào hàng nhãn, và nó ở xa nhãn "Sắp có" nên hai
                thứ không đọc thành một. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Luật ${face.nameVi}`}
              hitSlop={SLOP}
              onPress={onRules}
              style={({ pressed }) => [
                {
                  position: 'absolute',
                  left: 6,
                  bottom: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: R.sm,
                  backgroundColor: '#00000088',
                },
                press({ pressed }),
              ]}
            >
              <Txt size={11} weight="semi" color={A.ink}>
                Luật
              </Txt>
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: S.md, paddingBottom: S.md, paddingTop: 2, gap: 6 }}>
          <Txt size={15} weight="display" color={ready ? A.ink : A.inkSoft} numberOfLines={1}>
            {face.nameVi}
          </Txt>
          {/* Nhãn kiểu sảnh game nhiều người: chế độ, thời lượng ván, và
              trạng thái nếu chưa mở. Nhãn "chơi được" dán lên thẻ chơi được
              là nhãn thừa — thẻ sáng, có viền vàng, bấm được; tám thẻ kia mờ
              và ghi rõ "sắp có". Nhãn chỉ nên nói thứ nhìn vào chưa biết. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            <Chip label={face.mode} />
            <Chip label={face.minutes} />
          </View>
        </View>
      </Panel>
    </Pressable>
  );
}

/**
 * Nhãn nhỏ trên thẻ: khắc chìm vào mặt gỗ, không phải miếng dán nổi. Ba nhãn
 * cạnh nhau mà cái nào cũng có viền sáng thì chúng đánh nhau với tên game.
 */
function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: R.sm,
        backgroundColor: muted ? '#40290FEE' : '#00000038',
        borderWidth: muted ? 1 : 0,
        borderColor: A.goldDeep,
      }}
    >
      <Txt size={11} weight="semi" color={muted ? A.gold : A.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}

/** Vệt tối hắt từ khung xuống mép trên của hình lồng khung. */
function InsetShade() {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18 }} pointerEvents="none">
      <Svg width="100%" height={18}>
        <Defs>
          <LinearGradient id="inset-shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={18} fill="url(#inset-shade)" />
      </Svg>
    </View>
  );
}

/** Thanh dưới ba mục, đặt trên một thanh gỗ có chỉ vàng ở mép trên. */
function BottomNav({
  width,
  insetBottom,
  onHome,
  onGrid,
  onRooms,
  onBoard,
  onMe,
}: {
  width: number;
  insetBottom: number;
  onHome: () => void;
  onGrid: () => void;
  onRooms: () => void;
  onBoard: () => void;
  onMe: () => void;
}) {
  const h = 56 + insetBottom;
  // Năm mục, đúng trần của một thanh dưới. Xếp hạng và ván đấu nằm ở đây
  // chứ không chen vào hàng chế độ: chúng là những nơi để **đi tới**,
  // không phải những việc để bấm.
  const items: { icon: IconName; label: string; onPress?: () => void; active?: boolean }[] = [
    { icon: 'home', label: 'Sảnh', onPress: onHome, active: true },
    { icon: 'grid', label: 'Bộ môn', onPress: onGrid },
    { icon: 'door', label: 'Ván đấu', onPress: onRooms },
    { icon: 'crown', label: 'Xếp hạng', onPress: onBoard },
    { icon: 'user', label: 'Tôi', onPress: onMe },
  ];
  return (
    <View style={{ height: h, flexDirection: 'row', overflow: 'hidden' }}>
      <SurfaceFill width={width} height={h} tone={1} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.2, backgroundColor: A.goldDeep, opacity: 0.6 }} />
      {items.map((it) => (
        <Pressable
          key={it.label}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          disabled={!it.onPress}
          onPress={it.onPress}
          style={({ pressed }) => [
            { flex: 1, paddingTop: S.sm, paddingBottom: insetBottom + S.sm, alignItems: 'center', gap: 3 },
            press({ pressed }),
          ]}
        >
          <Icon name={it.icon} size={21} color={it.active ? A.gold : A.inkFaint} />
          <Txt size={11} weight="semi" color={it.active ? A.gold : A.inkFaint}>
            {it.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
