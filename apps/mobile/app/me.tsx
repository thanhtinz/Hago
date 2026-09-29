import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { backToLobby } from '../src/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { api, auth, useAction, useAuth, type GameStat, type MatchRow, type Profile } from '../src/net/api';
import { faceOf } from '../src/games/faces';
import { CRESTS, Crest, Face, crestFor, type CrestId } from '../src/ui/Crest';
import { canPickImage, pickSquareImage } from '../src/net/pickImage';
import { Field } from '../src/ui/Field';
import { Icon } from '../src/ui/Icon';
import { Btn, Panel, Txt } from '../src/ui/parts';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, R, S, lift } from '../src/ui/theme';

/**
 * Trang cá nhân.
 *
 * Nguyên tắc của cả trang: **mỗi con số phải đến từ một ván có thật**. Không
 * có huy hiệu trang trí, không có thanh tiến độ tới một cấp bậc không tồn tại,
 * không có biểu đồ cho ba điểm dữ liệu. Chưa đánh ván nào thì trang nói thẳng
 * là chưa có gì, chứ không bày ra một bộ khung rỗng trông như đang hỏng.
 *
 * Thứ tự các khối theo đúng thứ tự người ta nhìn: mình là ai → mình mạnh cỡ
 * nào → gần đây đánh thế nào → sửa gì được.
 */

const TABS = ['tong-quan', 'lich-su', 'cai-dat'] as const;
type Tab = (typeof TABS)[number];
const TAB_NAME: Record<Tab, string> = { 'tong-quan': 'Tổng quan', 'lich-su': 'Lịch sử', 'cai-dat': 'Cài đặt' };

export default function MeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me, loading } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const { tab: wanted } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.includes(wanted as Tab) ? (wanted as Tab) : 'tong-quan');

  const load = useCallback(() => {
    void api.me().then(setP).catch(() => setP(null));
  }, []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const W = Math.min(width, 460);

  if (loading) return <Shell W={W} height={height} insets={insets} />;

  if (!me) {
    return (
      <Shell W={W} height={height} insets={insets}>
        <View style={{ alignItems: 'center', gap: S.md, paddingTop: S.xxl }}>
          <Txt size={18} weight="display">
            Chưa đăng nhập
          </Txt>
          <Txt size={12} color={A.inkFaint} center>
            Đăng nhập để giữ thành tích, kết bạn và chơi với người thật.
          </Txt>
          <Btn label="Đăng nhập" onPress={() => router.push('/auth')} />
          <Btn tone="ghost" label="Về sảnh" onPress={() => backToLobby(router)} />
        </View>
      </Shell>
    );
  }

  return (
    <Shell W={W} height={height} insets={insets}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.sm }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={14} accessibilityRole="button" accessibilityLabel="Về sảnh">
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={18} weight="display" style={{ flex: 1 }}>
          Trang cá nhân
        </Txt>
      </View>

      <Hero me={me} p={p} />
      <Tabs tab={tab} onTab={setTab} />

      {tab === 'tong-quan' ? <Overview p={p} /> : null}
      {tab === 'lich-su' ? <History p={p} /> : null}
      {tab === 'cai-dat' ? <Settings me={me} onChanged={load} /> : null}
    </Shell>
  );
}

// ---- khối đầu trang --------------------------------------------------

function Hero({ me, p }: { me: { id: string; name: string; email: string | null; avatar: string | null; createdAt: number }; p: Profile | null }) {
  const played = (p?.stats ?? []).reduce((n, s) => n + s.win + s.draw + s.loss, 0);
  const wins = (p?.stats ?? []).reduce((n, s) => n + s.win, 0);
  // Điểm đại diện là điểm ở bộ môn đánh nhiều nhất, không phải điểm cao nhất:
  // khoe một con số lấy từ ba ván may mắn thì nó không mô tả người chơi.
  const main = [...(p?.stats ?? [])].sort((x, y) => y.win + y.draw + y.loss - (x.win + x.draw + x.loss))[0];

  return (
    <Panel radius={R.lg} tone={1} seed={11} style={lift(0.4, 14, 6)}>
      <View style={{ alignItems: 'center', gap: S.xs, padding: S.lg }}>
        <View style={[{ borderRadius: 100 }, lift(0.5, 16, 6)]}>
          <Face avatar={me.avatar} id={me.id} size={86} />
        </View>
        <Txt size={22} weight="display" style={{ paddingTop: S.xs }}>
          {me.name}
        </Txt>
        <Txt size={11} color={A.inkFaint}>
          {me.email} · tham gia {new Date(me.createdAt).toLocaleDateString('vi-VN')}
        </Txt>

        <View style={{ flexDirection: 'row', paddingTop: S.md, alignSelf: 'stretch' }}>
          <Stat n={played} label="VÁN" />
          <Divider />
          <Stat n={played ? `${Math.round((wins / played) * 100)}%` : '—'} label="TỈ LỆ THẮNG" />
          <Divider />
          <Stat n={main ? main.rating : '—'} label={main ? `ĐIỂM ${(faceOf(main.gameId)?.nameVi ?? '').toUpperCase()}` : 'ĐIỂM'} />
        </View>

        {p?.streak && p.streak.n > 1 ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingTop: S.sm }}>
            <Icon name="bolt" size={13} color={p.streak.kind === 'win' ? A.gold : A.inkFaint} />
            <Txt size={12} weight="semi" color={p.streak.kind === 'win' ? A.gold : A.inkSoft}>
              {p.streak.n} ván {p.streak.kind === 'win' ? 'thắng' : p.streak.kind === 'draw' ? 'hoà' : 'thua'} liên tiếp
            </Txt>
          </View>
        ) : null}
      </View>
    </Panel>
  );
}

const Divider = () => <View style={{ width: 1, backgroundColor: A.lineSoft, marginVertical: 4 }} />;

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
      <Txt size={20} weight="display" color={A.gold}>
        {n}
      </Txt>
      <Txt size={8.5} weight="semi" color={A.inkFaint} style={{ letterSpacing: 0.8 }} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.sm }}>
      {TABS.map((t) => {
        const on = t === tab;
        return (
          <Pressable
            key={t}
            onPress={() => onTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Thẻ ${TAB_NAME[t]}`}
            style={{ flex: 1 }}
          >
            <View
              style={{
                paddingVertical: 9,
                alignItems: 'center',
                borderRadius: R.md,
                backgroundColor: on ? A.goldSoft : 'transparent',
                borderWidth: 1.2,
                borderColor: on ? A.goldDeep : A.lineSoft,
              }}
            >
              <Txt size={12.5} weight="semi" color={on ? A.gold : A.inkFaint}>
                {TAB_NAME[t]}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- tổng quan --------------------------------------------------------

function Overview({ p }: { p: Profile | null }) {
  if (!p) return <Loading />;
  if (!p.stats.length) {
    return (
      <Empty
        title="Chưa có ván nào"
        body="Thành tích chỉ tính ván với người thật. Đấu với máy không vào đây — máy không có điểm để so."
      />
    );
  }
  return (
    <>
      <Card title="Theo bộ môn" sub="Mỗi bộ môn một thang điểm riêng">
        {p.stats.map((s) => (
          <GameRow key={s.gameId} s={s} />
        ))}
      </Card>
      <Card title="Bạn bè">
        <View style={{ flexDirection: 'row', paddingVertical: S.xs }}>
          <Stat n={p.friends} label="BẠN" />
          <Divider />
          <Stat n={p.requests} label="LỜI MỜI CHỜ" />
        </View>
      </Card>
    </>
  );
}

/**
 * Một hàng bộ môn: tên, điểm, và một **thanh ba đoạn** thắng–hoà–thua.
 *
 * Thanh đặc hơn ba con số vì mắt đọc tỉ lệ nhanh hơn đọc số, mà tỉ lệ mới là
 * thứ người ta muốn biết. Ba con số vẫn giữ bên phải cho ai cần con số chính xác.
 */
function GameRow({ s }: { s: GameStat }) {
  const n = s.win + s.draw + s.loss;
  const seg = [
    { v: s.win, c: A.gold },
    { v: s.draw, c: A.inkFaint },
    { v: s.loss, c: A.seal },
  ];
  return (
    <View style={{ gap: 6, paddingVertical: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <Txt size={13.5} weight="semi" style={{ flex: 1 }}>
          {faceOf(s.gameId)?.nameVi ?? s.gameId}
        </Txt>
        <Txt size={12} color={A.inkSoft}>
          {s.win}–{s.draw}–{s.loss}
        </Txt>
        <View style={{ minWidth: 52, alignItems: 'flex-end' }}>
          <Txt size={13} weight="bold" color={A.gold}>
            {s.rating}
          </Txt>
          {s.best > s.rating ? (
            <Txt size={9} color={A.inkFaint}>
              đỉnh {s.best}
            </Txt>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: A.panelLo }}>
        {seg.map((g, i) => (g.v > 0 ? <View key={i} style={{ flex: g.v / n, backgroundColor: g.c }} /> : null))}
      </View>
    </View>
  );
}

// ---- lịch sử ----------------------------------------------------------

function History({ p }: { p: Profile | null }) {
  if (!p) return <Loading />;
  if (!p.history.length) return <Empty title="Chưa có ván nào" body="Ván với người thật sẽ hiện ở đây, mới nhất trước." />;
  return (
    <Card title="Trận gần đây" sub={`${p.history.length} ván mới nhất`}>
      {p.history.map((m) => (
        <MatchLine key={m.id} m={m} />
      ))}
    </Card>
  );
}

const TONE = {
  win: { c: A.gold, t: 'THẮNG' },
  draw: { c: A.inkSoft, t: 'HOÀ' },
  loss: { c: A.sealLit, t: 'THUA' },
} as const;

function MatchLine({ m }: { m: MatchRow }) {
  const tone = TONE[m.result];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 9 }}>
      <Svg width={10} height={10}>
        <Circle cx={5} cy={5} r={4} fill={tone.c} />
      </Svg>
      <View style={{ flex: 1 }}>
        <Txt size={13} weight="semi" numberOfLines={1}>
          {m.opponent}
        </Txt>
        <Txt size={10} color={A.inkFaint} numberOfLines={1}>
          {faceOf(m.gameId)?.nameVi ?? m.gameId} · {m.reason}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt size={10.5} weight="bold" color={tone.c} style={{ letterSpacing: 0.6 }}>
          {tone.t}
        </Txt>
        <Txt size={10} color={m.delta > 0 ? A.jade : m.delta < 0 ? A.sealLit : A.inkFaint}>
          {m.rated ? (m.delta > 0 ? `+${m.delta}` : String(m.delta)) : 'không tính'}
        </Txt>
      </View>
      <Txt size={10} color={A.inkFaint} style={{ minWidth: 48, textAlign: 'right' }}>
        {ago(m.at)}
      </Txt>
    </View>
  );
}

/** Khoảng cách thời gian đọc được: "3 phút", "hôm qua", "12/9". */
function ago(t: number): string {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`;
  if (s < 172800) return 'hôm qua';
  if (s < 2592000) return `${Math.floor(s / 86400)} ngày`;
  return new Date(t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

// ---- cài đặt ----------------------------------------------------------

function Settings({ me, onChanged }: { me: { id: string; name: string; avatar: string | null }; onChanged: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(me.name);
  const [confirm, setConfirm] = useState('');
  const [danger, setDanger] = useState(false);
  const { busy, error, run } = useAction();

  return (
    <>
      <Card title="Ảnh đại diện" sub="Tải ảnh của bạn lên, hoặc chọn một con dấu">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.sm }}>
          <Face avatar={me.avatar} id={me.id} size={56} />
          <View style={{ flex: 1, gap: 6 }}>
            <Btn
              tone="wood"
              size="md"
              icon="user"
              label={canPickImage() ? 'Tải ảnh lên' : 'Tải ảnh (chỉ trên web)'}
              disabled={busy || !canPickImage()}
              onPress={() => run(async () => {
                const blob = await pickSquareImage();
                await auth.uploadAvatar(blob);
                onChanged();
              })}
            />
            <Txt size={10} color={A.inkFaint}>
              Ảnh được cắt vuông và thu về 256 điểm ngay trên máy bạn, nên không gửi kèm dữ liệu vị trí trong ảnh.
            </Txt>
          </View>
        </View>
        {error ? (
          <Txt size={12} color={A.sealLit} style={{ paddingBottom: S.xs }}>
            {error}
          </Txt>
        ) : null}
        <Rule width={120} />
        <Txt size={11} color={A.inkFaint} style={{ paddingTop: S.xs }}>
          Hoặc chọn một con dấu
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingTop: S.xs }}>
          {CRESTS.map((c: CrestId) => {
            const on = !me.avatar?.startsWith('up:') && crestFor(me.avatar, me.id) === c;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Con dấu ${c}`}
                onPress={() => run(async () => {
                  await auth.avatar(c);
                  onChanged();
                })}
                style={{
                  borderRadius: 100,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? A.gold : A.lineSoft,
                  padding: 2,
                }}
              >
                <Crest id={c} size={46} ring={false} />
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card title="Tên hiển thị">
        <Field label="Tên" value={name} onChange={setName} placeholder={me.name} />
        <Btn
          label="Lưu tên"
          disabled={busy || name.trim() === me.name}
          onPress={() => run(async () => {
            await auth.rename(name);
            onChanged();
          })}
        />
      </Card>

      <Card title="Phiên">
        <Btn tone="wood" label="Đăng xuất" onPress={() => run(async () => {
          await auth.logout();
          backToLobby(router);
        })} />
      </Card>

      {/* Khối nguy hiểm để cuối, viền đỏ son, và mở ra bằng một nhịp bấm riêng.
          Không để nút xoá nằm ngay cạnh nút đăng xuất. */}
      <Panel radius={R.lg} tone={0} seed={53} style={{ borderWidth: 1.2, borderColor: A.sealSoft }}>
        <View style={{ gap: S.md, padding: S.lg }}>
          <Txt size={15} weight="display" color={A.sealLit}>
            Xoá tài khoản
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            Không hoàn lại được. Thành tích, điểm và danh sách bạn mất hết. Các ván đã đánh vẫn còn trong lịch sử của
            đối thủ, dưới tên hiện tại của bạn.
          </Txt>
          {danger ? (
            <>
              <Field label={`Gõ lại "${me.name}" để xác nhận`} value={confirm} onChange={setConfirm} />
              {error ? (
                <Txt size={12.5} color={A.sealLit}>
                  {error}
                </Txt>
              ) : null}
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <Btn
                  tone="wood"
                  label="Xoá vĩnh viễn"
                  style={{ flex: 1 }}
                  disabled={busy || confirm.trim() !== me.name}
                  onPress={() => run(async () => {
                    await auth.remove(confirm.trim());
                    backToLobby(router);
                  })}
                />
                <Btn tone="ghost" label="Huỷ" style={{ flex: 1 }} onPress={() => setDanger(false)} />
              </View>
            </>
          ) : (
            <Btn tone="ghost" label="Tôi muốn xoá tài khoản" onPress={() => setDanger(true)} />
          )}
        </View>
      </Panel>
    </>
  );
}

// ---- khung dùng chung -------------------------------------------------

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Panel radius={R.lg} tone={1} seed={title.length * 13}>
      <View style={{ gap: S.xs, padding: S.lg }}>
        <Txt size={15} weight="display">
          {title}
        </Txt>
        {sub ? (
          <Txt size={10.5} color={A.inkFaint} style={{ paddingBottom: S.xs }}>
            {sub}
          </Txt>
        ) : null}
        {children}
      </View>
    </Panel>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Panel radius={R.lg} tone={1} seed={41}>
      <View style={{ alignItems: 'center', gap: S.sm, padding: S.xl }}>
        <Rule width={90} />
        <Txt size={15} weight="display">
          {title}
        </Txt>
        <Txt size={11.5} color={A.inkFaint} center>
          {body}
        </Txt>
      </View>
    </Panel>
  );
}

const Loading = () => (
  <Panel radius={R.lg} tone={1} seed={7}>
    <View style={{ padding: S.xl, alignItems: 'center' }}>
      <Txt size={12} color={A.inkFaint}>
        Đang tải…
      </Txt>
    </View>
  </Panel>
);

function Shell({ W, height, insets, children }: { W: number; height: number; insets: { top: number; bottom: number }; children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={W} height={height} />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.xxl, gap: S.md }}>
        {children}
      </ScrollView>
    </View>
  );
}
