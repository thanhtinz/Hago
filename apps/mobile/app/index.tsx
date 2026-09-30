import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { CHUONG, TONG_SAO, aiCuaChuong, capChiTiet, daMo, xpCua } from '@co/protocol';
import { registry } from '@co/core';
import '../src/catalog';
import { FACES, faceOf } from '../src/games/faces';
import { api, useAuth, type Profile } from '../src/net/api';
import { live, useLive } from '../src/net/live';
import { load as remembered, save, saoVuotAi } from '../src/net/store';
import { BottomNav } from '../src/ui/BottomNav';
import { Face } from '../src/ui/Crest';
import { DaiHang } from '../src/ui/DaiHang';
import { HangChoOverlay } from '../src/ui/HangChoOverlay';
import { Icon } from '../src/ui/Icon';
import { Nhan, SLOP, Txt, press } from '../src/ui/parts';
import { CodeSheet, PickGameSheet } from '../src/ui/PickSheets';
import { SheetChonCheDo } from '../src/ui/SheetChonCheDo';
import { StartDock } from '../src/ui/StartDock';
import { TheAnh } from '../src/ui/TheAnh';
import { AppBackdrop, Panel } from '../src/ui/surface';
import { A, R, S } from '../src/ui/theme';

/**
 * Sảnh.
 *
 * **Sảnh không phải một danh mục.** Nó trả lời đúng ba câu: tôi là ai, tôi
 * sắp đánh gì, bấm đâu để đánh. Không một thẻ bộ môn nào còn nằm ở đây —
 * mười ba bộ môn sống ở `/bo-mon` và trong tấm chọn chế độ, và sảnh chỉ
 * giữ **một** hàng dẫn sang đó. Bản trước đổ ba thẻ bộ môn ra mặt tiền dưới
 * tiêu đề "Đấu với máy", tức là thứ chiếm nhiều diện tích nhất lại là chế
 * độ ít quan trọng nhất.
 *
 * Bốn khối, theo đúng thứ tự mắt đi:
 *
 *   A. dải danh tính — nhỏ nhất màn hình, cố ý thế;
 *   B. sân khấu — bức tranh của bộ môn **đang nạp**, phần tử lớn nhất;
 *   C. dải hạng — thứ hai về diện tích, và là thứ nói "tôi đang ở đâu";
 *   D. dải vượt ải — chỗ duy nhất sảnh trưng nội dung thay vì cấu hình;
 *   E. một hàng 56 điểm dẫn sang cả mười ba bộ môn.
 *
 * Rồi cụm hành động **nằm ngoài vùng cuộn**, neo trên thanh điều hướng: ở
 * sảnh của mọi tựa game đông người chơi, nút bắt đầu không bao giờ cuộn
 * khỏi màn. Trước đây cả sảnh nằm trong một `ScrollView`, kể cả nút chơi.
 */

const READY = new Set(registry.catalog().map((s) => s.id));

/** Cấu hình đang nạp. Một khoá, đọc và ghi ở mọi chỗ chọn chế độ. */
interface CauHinh {
  lan: 'xh' | 'thuong';
  gameId: string;
  clock: string;
}

export default function Lobby() {
  const router = useRouter();
  const { me } = useAuth();
  const s = useLive();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const scroller = useRef<ScrollView>(null);

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

  // Cấu hình đang nạp. Chưa có lần chọn nào thì mặc định là bộ môn **đánh
  // nhiều nhất** — không phải bộ môn điểm cao nhất: một con số lấy từ ba ván
  // may mắn thì không mô tả người chơi.
  const [cauHinh, setCauHinh] = useState<CauHinh>(() =>
    remembered<CauHinh | null>('che-do-gan-nhat', null) ?? { lan: 'xh', gameId: 'co-caro', clock: '' },
  );
  useEffect(() => {
    if (remembered<CauHinh | null>('che-do-gan-nhat', null)) return;
    const main = [...(profile?.stats ?? [])].sort((x, y) => y.win + y.draw + y.loss - (x.win + x.draw + x.loss))[0];
    if (main && READY.has(main.gameId)) setCauHinh((c) => ({ ...c, gameId: main.gameId }));
  }, [profile]);
  const nap = (lan: 'xh' | 'thuong', gameId: string, clock: string) => {
    const c: CauHinh = { lan, gameId, clock };
    save('che-do-gan-nhat', c);
    setCauHinh(c);
  };

  /** Tấm đang mở. Hàng chờ là lớp phủ, không phải một màn. */
  const [tam, setTam] = useState<'che-do' | 'bo-mon' | 'phong' | 'ma' | 'hang-cho' | null>(null);
  // `/?mo=che-do` và `/?mo=phong` mở sẵn đúng tấm. Trang "Ván đấu" lúc trống
  // và đường dẫn cũ `/choi` đều quay về đây kèm tham số này.
  const { mo } = useLocalSearchParams<{ mo?: string }>();
  useEffect(() => {
    if (mo === 'phong' || mo === 'che-do') setTam('che-do');
  }, [mo]);

  // Đã tới sảnh thì cờ "vừa nối lại ghế cũ" hết tác dụng: từ đây mọi thứ
  // người dùng bấm là một lựa chọn mới.
  useEffect(() => live.seen(), [s.restored]);
  // Lời rủ được nhận lời trong lúc đang ở sảnh: vào bàn ngay.
  useEffect(() => {
    if (s.justMatched) {
      live.clearMatched();
      router.replace('/online/live');
    }
  }, [s.justMatched, router]);

  const requests = s.friendRequests || (profile?.requests ?? 0);
  const pending = requests + s.challenges.filter((c) => c.dir === 'in').length;
  const online = (go: () => void) => (me ? go() : router.push('/auth'));

  // Tiến độ vượt ải đọc từ **máy**, đồng bộ, chạy được khi chưa đăng nhập.
  // Đọc lại mỗi lần sảnh được tập trung: vừa qua một ải quay về là số đổi.
  const [sao, setSao] = useState<Record<string, number>>({});
  useFocusEffect(
    useCallback(() => {
      setSao(saoVuotAi());
    }, []),
  );
  const tongSao = Object.values(sao).reduce((n, x) => n + x, 0);
  const keTiep = CHUONG.flatMap((c) => aiCuaChuong(c.so)).find((a) => daMo(a.id, sao) && (sao[a.id] ?? 0) === 0);

  const face = faceOf(cauHinh.gameId);
  // "Nối lại ván" chỉ đúng khi ván **còn đang chạy**. Ván đã kết thúc thì
  // ghế vẫn còn đó ở máy chủ cho tới lúc rời phòng, nhưng không có gì để
  // quay vào — và một cái nút khoá cả hai chip cấu hình vì một ván đã xong
  // là một sảnh tự khoá chính nó.
  const noiLai = s.room != null && s.st?.outcome == null;
  // Hàng chờ mỏng thì vượt ải lên trước dải hạng: tối nào không có ai thì
  // PvE không phải đồ độn mà là cả sản phẩm. Chưa có nhịp thì **không đổi
  // gì** — nói sai về chuyện có ai ở đây không là kiểu nói sai tệ nhất.
  const vang = s.lobby != null && s.lobby.online <= 1;

  const stage = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Đổi bộ môn, đang chọn ${face?.nameVi ?? cauHinh.gameId}`}
      onPress={() => setTam('bo-mon')}
      style={{ marginTop: S.md, marginHorizontal: S.lg }}
    >
      <View style={{ aspectRatio: 100 / 64, borderRadius: R.lg, overflow: 'hidden', backgroundColor: face?.surface ?? A.panelLo }}>
        {face ? <face.Motif /> : null}
        {/* Mép dưới tan vào nền thay vì thành một cạnh. Phải tắt hẳn về 0:
            một gradient dừng ở 0,04 để lại đúng cái đường nó định xoá. */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%' }} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="stage-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={A.bg} stopOpacity="0" />
                {/* Chặn giữa kéo phần mờ về cuối: hai điểm dừng thì nửa
                    trên của dải đã xám hẳn và bức tranh bị phủ sương. */}
                <Stop offset="0.5" stopColor={A.bg} stopOpacity="0.16" />
                <Stop offset="1" stopColor={A.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#stage-fade)" />
          </Svg>
        </View>
      </View>
    </Pressable>
  );

  // `-24` chỉ đúng khi dải hạng nằm **ngay dưới sân khấu**: nó kéo tấm lên
  // chồng vào chân dải gradient. Lúc hàng chờ mỏng, dải này tụt xuống dưới
  // dải vượt ải và cùng con số ấy cắt mất chân mấy thẻ chương.
  const daiHang = (duoiSanKhau: boolean) => (
    <View style={{ marginTop: duoiSanKhau ? -24 : 0 }}>
      <DaiHang
        gameId={cauHinh.gameId}
        stats={profile?.stats ?? []}
        daDangNhap={!!me}
        onPress={() => router.push(me ? '/me' : '/auth')}
      />
    </View>
  );

  const daiVuotAi = (
    <View style={{ marginTop: S.lg, gap: S.sm }}>
      {/* Tiêu đề cỡ 15 chứ không 21, và không huy hiệu: vượt ải **không**
          nối vào Elo hay kinh nghiệm, nên nó không được đứng ngang hàng với
          dải hạng. Cả hàng bấm được, dẫn sang con đường mười ải. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Vượt ải"
        onPress={() => router.push('/vuot-ai')}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: S.lg, gap: S.sm }, press({ pressed })]}
      >
        <Txt size={15} weight="display">
          Vượt ải
        </Txt>
        <View style={{ flex: 1 }} />
        {vang ? (
          <Txt size={11} color={A.inkFaint}>
            Chưa có ai trực tuyến
          </Txt>
        ) : null}
        <Txt size={11} color={A.inkFaint}>
          {tongSao}/{TONG_SAO} sao
        </Txt>
        <Icon name="chevron" size={14} color={A.inkFaint} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}
      >
        {/* Một chạm từ sảnh vào đúng ải đang dở. Quầng sáng để dành riêng
            cho nút vàng, nên thẻ này chỉ có viền. */}
        {keTiep ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tiếp tục ải ${keTiep.ten}`}
            onPress={() => router.push(`/vuot-ai/${keTiep.id}`)}
            style={({ pressed }) => [{ width: 150, borderRadius: R.md }, press({ pressed })]}
          >
            <Panel radius={R.md} tone={2} hairline={false} style={{ borderWidth: 1.2, borderColor: A.goldDeep, height: '100%' }}>
              <View style={{ flex: 1, justifyContent: 'center', gap: 4, padding: S.md }}>
                <Nhan label={`Chương ${keTiep.chuong}`} />
                <Txt size={15} weight="display" color={A.gold}>
                  Tiếp tục
                </Txt>
                <Txt size={11.5} color={A.inkFaint} numberOfLines={2}>
                  {keTiep.ten}
                </Txt>
              </View>
            </Panel>
          </Pressable>
        ) : null}
        {CHUONG.map((ch) => {
          const ais = aiCuaChuong(ch.so);
          const co = ais.reduce((n, a) => n + (sao[a.id] ?? 0), 0);
          const f = faceOf(ch.gameId);
          const moChuong = ais.some((a) => daMo(a.id, sao));
          return (
            <View key={ch.so} style={{ width: 190 }}>
              <TheAnh
                dieuHuong
                ten={`Chương ${ch.so} · ${ch.ten}`}
                phu={`${f?.nameVi ?? ch.gameId} · ${co}/${ais.length * 3} sao`}
                surface={f?.surface ?? A.panelLo}
                Art={f?.Motif ?? (() => <View />)}
                khoa={!moChuong}
                dieuKien={moChuong ? undefined : 'Qua chương trước'}
                tienDo={{ n: co, toi: ais.length * 3 }}
                a11y={moChuong ? `Chương ${ch.so}` : `Chương ${ch.so}, chưa mở`}
                onPress={() => router.push(`/vuot-ai?chuong=${ch.so}`)}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />

      {/* A. Dải danh tính. Không có tấm nền: đây là vùng nhỏ nhất màn hình
          và nó không cạnh tranh với sân khấu ngay dưới. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={me ? 'Trang cá nhân' : 'Đăng nhập'}
        onPress={() => router.push(me ? '/me' : '/auth')}
        style={{ height: 52, marginTop: insets.top, paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md }}
      >
        {me ? (
          <Face avatar={me.avatar} id={me.id} size={40} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.2, borderColor: A.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={20} color={A.inkFaint} />
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={15} weight="display" numberOfLines={1}>
            {me?.name ?? 'Chưa đăng nhập'}
          </Txt>
          {me ? <CapDo profile={profile} /> : (
            <Txt size={11.5} color={A.inkFaint}>
              Đăng nhập để chơi với người thật
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pending ? `Bạn bè, ${pending} việc chờ` : 'Bạn bè'}
            hitSlop={SLOP}
            onPress={() => online(() => router.push('/friends'))}
            style={({ pressed }) => [press({ pressed })]}
          >
            <Icon name="user" size={20} color={A.inkFaint} />
            {pending > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -7,
                  right: -9,
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
                  {pending > 9 ? '9+' : pending}
                </Txt>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cài đặt"
            hitSlop={SLOP}
            onPress={() => router.push(me ? '/me?tab=cai-dat' : '/auth')}
            style={({ pressed }) => [press({ pressed })]}
          >
            <Icon name="settings" size={20} color={A.inkFaint} />
          </Pressable>
        </View>
      </Pressable>

      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: S.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={me ? <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={A.gold} colors={[A.gold]} /> : undefined}
      >
        {stage}
        {vang ? (
          <>
            {daiVuotAi}
            <View style={{ marginTop: S.lg }}>{daiHang(false)}</View>
          </>
        ) : (
          <>
            {daiHang(true)}
            {daiVuotAi}
          </>
        )}

        {/* E. Lối duy nhất tới danh mục trên thân sảnh. Thanh điều hướng là
            lối thứ hai, và một thanh điều hướng không tính là "đổ ra ngoài". */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cả 13 bộ môn"
          onPress={() => router.push('/bo-mon')}
          style={({ pressed }) => [{ marginTop: S.lg, marginHorizontal: S.lg, borderRadius: R.md }, press({ pressed })]}
        >
          <Panel radius={R.md} tone={0}>
            <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md }}>
              <Icon name="grid" size={20} color={A.gold} />
              <Txt size={13} weight="semi" style={{ flex: 1 }}>
                Cả {FACES.length} bộ môn
              </Txt>
              <Txt size={11} color={A.inkFaint}>
                {READY.size} đã mở
              </Txt>
              <Icon name="chevron" size={16} color={A.inkFaint} />
            </View>
          </Panel>
        </Pressable>
      </ScrollView>

      {/* F. Cụm hành động, ngoài vùng cuộn. */}
      <StartDock
        gameId={cauHinh.gameId}
        lan={cauHinh.lan}
        clock={cauHinh.clock}
        noiLai={noiLai}
        nhip={<Pulse lobby={s.lobby} />}
        onDoiBoMon={() => setTam('bo-mon')}
        onDoiCheDo={() => setTam('che-do')}
        onVaoTran={() => (noiLai ? router.replace('/online/live') : online(() => setTam('hang-cho')))}
      />

      <BottomNav active="sanh" onHome={() => scroller.current?.scrollTo({ y: 0, animated: true })} />

      {/* Mọi tấm đặt **sau** thanh điều hướng: để trước thì thanh dưới cùng
          đè lên mất nút Đóng. */}
      {tam === 'che-do' ? (
        <SheetChonCheDo
          tabDau={cauHinh.lan}
          clockDau={cauHinh.clock}
          onClose={() => setTam(null)}
          onNap={(lan, gameId, clock) => {
            nap(lan, gameId, clock);
            setTam(null);
          }}
          onDi={(href) => {
            setTam(null);
            router.push(href as never);
          }}
          onMoTam={(t) => setTam(t)}
        />
      ) : null}

      {tam === 'bo-mon' ? (
        <PickGameSheet
          mode={cauHinh.lan}
          onClose={() => setTam(null)}
          onPick={(id, o) => {
            setTam(null);
            nap(cauHinh.lan, id, cauHinh.lan === 'thuong' ? o.clock : '');
          }}
          onRules={(id) => {
            setTam(null);
            router.push(`/luat/${id}` as never);
          }}
        />
      ) : null}

      {tam === 'phong' ? (
        <PickGameSheet
          mode="create"
          onClose={() => setTam(null)}
          onPick={(id, o) => {
            setTam(null);
            const q = new URLSearchParams({ game: id });
            if (o.clock) q.set('clock', o.clock);
            if (o.pass.trim()) q.set('pass', o.pass.trim());
            router.push(`/online/create?${q.toString()}`);
          }}
          onRules={(id) => {
            setTam(null);
            router.push(`/luat/${id}` as never);
          }}
        />
      ) : null}

      {tam === 'ma' ? (
        <CodeSheet
          onClose={() => setTam(null)}
          onGo={(code, pass) => {
            setTam(null);
            const q = new URLSearchParams({ code });
            if (pass) q.set('pass', pass);
            router.push(`/online/join?${q.toString()}`);
          }}
        />
      ) : null}

      {tam === 'hang-cho' ? (
        <HangChoOverlay gameId={cauHinh.gameId} lan={cauHinh.lan} clock={cauHinh.clock} onClose={() => setTam(null)} />
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: S.sm }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: lobby.online > 1 ? A.jade : A.inkFaint }} />
      <Txt size={11} color={A.inkFaint}>
        {parts.join(' · ')}
      </Txt>
    </View>
  );
}

/**
 * Cấp độ và thanh kinh nghiệm, dưới tên.
 *
 * Cấp đo **số ván đã đánh**, khác hẳn danh hiệu đo sức mạnh: người chơi
 * nhiều mà thua nhiều vẫn lên cấp. Hai thước đo hai thứ khác nhau thì phải
 * đứng ở hai chỗ khác nhau — cấp ở đây, danh hiệu ở dải hạng.
 */
function CapDo({ profile }: { profile: Profile | null }) {
  const xp = xpCua(profile?.stats ?? []);
  const c = capChiTiet(xp);
  const ty = c.toi ? Math.max(0, Math.min(1, c.trong / c.toi)) : 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {/* Ray dùng `line` chứ không `panelLo`: dải danh tính nằm thẳng trên
          nền app, và `panelLo` ở đó tối ngang nền — thanh rỗng tàng hình. */}
      <View style={{ width: 96, height: 3, borderRadius: 1.5, overflow: 'hidden', backgroundColor: A.line }}>
        <View style={{ width: `${Math.round(ty * 100)}%`, height: 3, backgroundColor: A.goldDeep }} />
      </View>
      <Txt size={10.5} color={A.inkFaint}>
        Cấp {c.cap}
      </Txt>
    </View>
  );
}
