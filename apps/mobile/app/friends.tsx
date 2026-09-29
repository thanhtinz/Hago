import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backToLobby } from '../src/nav';
import { api, useAuth, type Friend, type PublicUser } from '../src/net/api';
import { live, useLive, useWatch } from '../src/net/live';
import { faceOf } from '../src/games/faces';
import { Face } from '../src/ui/Crest';
import { Field } from '../src/ui/Field';
import { Icon } from '../src/ui/Icon';
import { Btn, Panel, Txt } from '../src/ui/parts';
import { AppBackdrop } from '../src/ui/surface';
import { A, R, S } from '../src/ui/theme';

/**
 * Bạn bè.
 *
 * Thứ tự các khối theo mức độ **cần mình làm gì**: lời mời đến trước (chờ
 * mình bấm), rồi bạn bè (rủ được ngay), rồi lời mời mình gửi đi, rồi người
 * đã chặn ở cuối. Xếp theo thứ tự abc tất cả vào một danh sách thì việc cần
 * làm chìm lẫn vào việc không cần làm.
 */

const GAMES = ['co-caro', 'co-ganh', 'o-an-quan'] as const;

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me, loading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blocked, setBlocked] = useState<PublicUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<PublicUser | null>(null);
  const [menu, setMenu] = useState<PublicUser | null>(null);
  const s = useLive();

  const load = useCallback(() => {
    void api
      .friends()
      .then((r) => {
        setFriends(r.friends);
        setBlocked(r.blocked);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  // Theo dõi trạng thái trực tuyến của đúng những người trong danh sách.
  const ids = useMemo(() => friends.map((f) => f.user.id), [friends]);
  useWatch(ids);

  // Lời rủ được nhận lời thì cả hai bên cùng vào bàn — chuyển màn ngay.
  useEffect(() => {
    if (s.justMatched) {
      live.clearMatched();
      router.replace('/online/live');
    }
  }, [s.justMatched, router]);

  const act = (f: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    void f()
      .then(load)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Có lỗi xảy ra'))
      .finally(() => setBusy(false));
  };

  const W = Math.min(width, 460);
  if (loading) return <Shell W={W} height={height} insets={insets} />;
  if (!me) {
    return (
      <Shell W={W} height={height} insets={insets}>
        <View style={{ alignItems: 'center', gap: S.md, paddingTop: S.xxl }}>
          <Txt size={18} weight="display">
            Chưa đăng nhập
          </Txt>
          <Btn label="Đăng nhập" onPress={() => router.push('/auth')} />
          <Btn tone="ghost" label="Về sảnh" onPress={() => backToLobby(router)} />
        </View>
      </Shell>
    );
  }

  const incoming = friends.filter((f) => f.status === 'pending' && f.incoming);
  const outgoing = friends.filter((f) => f.status === 'pending' && !f.incoming);
  const mates = friends.filter((f) => f.status === 'accepted');
  const inChallenges = s.challenges.filter((c) => c.dir === 'in');
  const outChallenges = s.challenges.filter((c) => c.dir === 'out');

  return (
    <Shell W={W} height={height} insets={insets}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.sm }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={14} accessibilityRole="button" accessibilityLabel="Về sảnh">
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={18} weight="display" style={{ flex: 1 }}>
          Bạn bè
        </Txt>
      </View>

      {error ? (
        <Txt size={12.5} color={A.sealLit}>
          {error}
        </Txt>
      ) : null}

      {/* Lời rủ đấu đến: việc gấp nhất trên màn này, vì bên kia đang chờ. */}
      {inChallenges.map((c) => (
        <Panel key={c.id} radius={R.md} tone={1} seed={3} style={{ borderWidth: 1.2, borderColor: A.goldDeep }}>
          <View style={{ gap: S.sm, padding: S.md }}>
            <Txt size={13.5} weight="semi">
              <Txt size={13.5} weight="bold" color={A.gold}>
                {c.withName}
              </Txt>{' '}
              rủ bạn một ván {faceOf(c.gameId)?.nameVi ?? c.gameId}
            </Txt>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Btn label="Vào ngay" style={{ flex: 1 }} onPress={() => live.answer(c.id, true)} />
              <Btn tone="ghost" label="Để lúc khác" style={{ flex: 1 }} onPress={() => live.answer(c.id, false)} />
            </View>
          </View>
        </Panel>
      ))}

      {outChallenges.map((c) => (
        <Panel key={c.id} radius={R.md} tone={0} seed={5}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md }}>
            <Icon name="bolt" size={14} color={A.gold} />
            <Txt size={12} color={A.inkSoft} style={{ flex: 1 }}>
              Đang chờ {c.withName} trả lời
            </Txt>
            <Pressable onPress={() => live.cancel(c.id)} accessibilityRole="button" accessibilityLabel="Rút lại lời rủ">
              <Txt size={12} color={A.sealLit}>
                Rút lại
              </Txt>
            </Pressable>
          </View>
        </Panel>
      ))}

      <Search onAdded={load} />

      {incoming.length ? (
        <Card title="Lời mời kết bạn" sub={`${incoming.length} người muốn kết bạn với bạn`}>
          {incoming.map((f) => (
            <Row key={f.user.id} u={f.user} online={s.online.has(f.user.id)} onOpen={() => router.push(`/u/${f.user.id}`)}>
              <Mini label="Đồng ý" tone="gold" disabled={busy} onPress={() => act(() => api.accept(f.user.id))} />
              <Mini label="Bỏ qua" disabled={busy} onPress={() => act(() => api.remove(f.user.id))} />
            </Row>
          ))}
        </Card>
      ) : null}

      <Card title="Bạn bè" sub={mates.length ? `${mates.filter((f) => s.online.has(f.user.id)).length} đang trực tuyến` : undefined}>
        {mates.length ? (
          mates
            // Người đang trực tuyến lên trước: họ là người rủ được ngay.
            .sort((x, y) => Number(s.online.has(y.user.id)) - Number(s.online.has(x.user.id)))
            .map((f) => (
              <Row key={f.user.id} u={f.user} online={s.online.has(f.user.id)} onOpen={() => router.push(`/u/${f.user.id}`)}>
                <Mini label="Nhắn tin" badge={s.unread[f.user.id] ?? 0} onPress={() => router.push(`/chat/${f.user.id}`)} />
                <Mini label="Tỷ thí" tone="gold" disabled={!s.online.has(f.user.id)} onPress={() => setPick(f.user)} />
                {/* Xoá bạn và chặn nằm sau một nhịp bấm nữa. Để một nút đỏ
                    ngay cạnh nút bấm hằng ngày là mời người ta bấm nhầm. */}
                <More onPress={() => setMenu(f.user)} />
              </Row>
            ))
        ) : (
          <Txt size={12} color={A.inkFaint}>
            Chưa có ai. Tìm theo tên ở ô trên để gửi lời mời.
          </Txt>
        )}
      </Card>

      {outgoing.length ? (
        <Card title="Đã gửi lời mời" sub="Chờ họ đồng ý">
          {outgoing.map((f) => (
            <Row key={f.user.id} u={f.user} online={s.online.has(f.user.id)} onOpen={() => router.push(`/u/${f.user.id}`)}>
              <Mini label="Rút lại" disabled={busy} onPress={() => act(() => api.remove(f.user.id))} />
            </Row>
          ))}
        </Card>
      ) : null}

      {blocked.length ? (
        <Card title="Đã chặn" sub="Hai bên không nhắn tin và không rủ nhau được">
          {blocked.map((u) => (
            <Row key={u.id} u={u} online={false}>
              <Mini label="Bỏ chặn" disabled={busy} onPress={() => act(() => api.unblock(u.id))} />
            </Row>
          ))}
        </Card>
      ) : null}

      {menu ? (
        <Sheet title={menu.name} sub="Chọn một việc" onClose={() => setMenu(null)}>
          <Btn
            tone="wood"
            label="Xem hồ sơ"
            onPress={() => {
              const id = menu.id;
              setMenu(null);
              router.push(`/u/${id}`);
            }}
          />
          <Btn
            tone="ghost"
            label="Xoá khỏi danh sách bạn"
            onPress={() => {
              const id = menu.id;
              setMenu(null);
              act(() => api.remove(id));
            }}
          />
          <Btn
            tone="ghost"
            label="Chặn người này"
            onPress={() => {
              const id = menu.id;
              setMenu(null);
              act(() => api.block(id));
            }}
          />
        </Sheet>
      ) : null}

      {pick ? (
        <PickGame
          name={pick.name}
          onClose={() => setPick(null)}
          onPick={(g) => {
            live.challenge(pick.id, g);
            setPick(null);
          }}
        />
      ) : null}
    </Shell>
  );
}

/** Tìm người chơi theo tên rồi gửi lời mời. */
function Search({ onAdded }: { onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<PublicUser[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    // Chờ một nhịp sau khi ngừng gõ: gọi máy chủ mỗi ký tự là bốn năm lần
    // gọi cho một lần tìm, và kết quả về lộn xộn thứ tự.
    const t = setTimeout(() => {
      void api
        .search(q)
        .then((r) => setHits(r.users))
        .catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Panel radius={R.lg} tone={1} seed={23}>
      <View style={{ gap: S.sm, padding: S.lg }}>
        <Field label="Tìm người chơi" value={q} onChange={setQ} placeholder="Gõ ít nhất hai ký tự" />
        {hits.map((u) => (
          <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingTop: S.xs }}>
            <Face avatar={u.avatar} id={u.id} size={32} ring={false} />
            <Txt size={13} style={{ flex: 1 }} numberOfLines={1}>
              {u.name}
            </Txt>
            <Mini
              label={sent.has(u.id) ? 'Đã gửi' : 'Kết bạn'}
              tone={sent.has(u.id) ? undefined : 'gold'}
              disabled={sent.has(u.id)}
              onPress={() => {
                setSent((cur) => new Set(cur).add(u.id));
                void api.request(u.id).then(onAdded).catch(() => {});
              }}
            />
          </View>
        ))}
      </View>
    </Panel>
  );
}

function Row({
  u,
  online,
  onOpen,
  children,
}: {
  u: PublicUser;
  online: boolean;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: S.sm }}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${u.name}`} disabled={!onOpen}>
        <View>
          <Face avatar={u.avatar} id={u.id} size={38} ring={false} />
          {/* Chấm trực tuyến có viền cùng màu nền, nên nó nổi lên trên ảnh
              chứ không lẫn vào một vùng sáng của ảnh. */}
          {online ? (
            <View
              style={{
                position: 'absolute',
                right: -1,
                bottom: -1,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: A.jade,
                borderWidth: 2,
                borderColor: A.panel,
              }}
            />
          ) : null}
        </View>
      </Pressable>
      <Pressable onPress={onOpen} disabled={!onOpen} style={{ flex: 1 }}>
        <Txt size={13.5} weight="semi" numberOfLines={1}>
          {u.name}
        </Txt>
        <Txt size={10} color={online ? A.jade : A.inkFaint}>
          {online ? 'Đang trực tuyến' : 'Ngoại tuyến'}
        </Txt>
      </Pressable>
      {children}
    </View>
  );
}

function Mini({
  label,
  tone,
  disabled,
  onPress,
  badge = 0,
}: {
  label: string;
  tone?: 'gold' | 'seal';
  disabled?: boolean;
  onPress: () => void;
  /** Số tin chưa đọc. Hiện thành chấm đỏ có số ở góc nút. */
  badge?: number;
}) {
  const fg = disabled ? A.inkFaint : tone === 'gold' ? A.gold : tone === 'seal' ? A.sealLit : A.inkSoft;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} tin chưa đọc` : label}
      style={{
        paddingHorizontal: 9,
        paddingVertical: 7,
        borderRadius: R.pill,
        borderWidth: 1.1,
        borderColor: disabled ? A.lineSoft : tone === 'gold' ? A.goldDeep : tone === 'seal' ? A.sealSoft : A.line,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Txt size={11} weight="semi" color={badge ? A.gold : fg}>
        {label}
      </Txt>
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: A.seal,
            borderWidth: 1.4,
            borderColor: A.panel,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={9.5} weight="bold" color="#FFF">
            {badge > 9 ? '9+' : badge}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Nút ba chấm: mở danh sách việc ít dùng hoặc không hoàn lại được. */
function More({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Thêm lựa chọn"
      hitSlop={8}
      style={{ paddingHorizontal: 8, paddingVertical: 7 }}
    >
      <Txt size={15} weight="bold" color={A.inkSoft}>
        ···
      </Txt>
    </Pressable>
  );
}

/** Tấm trượt từ dưới lên, dùng chung cho mấy tấm ở màn này. */
function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 }}
      />
      <Panel radius={R.xl} tone={1} seed={67}>
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: insets.bottom + S.lg }}>
          <Txt size={17} weight="display">
            {title}
          </Txt>
          {sub ? (
            <Txt size={11} color={A.inkFaint} style={{ paddingBottom: S.xs }}>
              {sub}
            </Txt>
          ) : null}
          {children}
          <Btn tone="ghost" label="Đóng" onPress={onClose} />
        </View>
      </Panel>
    </View>
  );
}

/** Rủ ai đó thì phải nói rủ đánh bộ môn nào. */
function PickGame({ name, onClose, onPick }: { name: string; onClose: () => void; onPick: (g: string) => void }) {
  return (
    <Sheet title={`Rủ ${name} bộ môn nào?`} sub="Phòng riêng, không tính xếp hạng" onClose={onClose}>
      <>
          {GAMES.map((g) => (
            <Pressable key={g} onPress={() => onPick(g)} accessibilityRole="button" accessibilityLabel={`Rủ ${faceOf(g)?.nameVi ?? g}`}>
              <Panel radius={R.md} tone={0} seed={g.length * 9}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
                  <View style={{ width: 48, height: 31, borderRadius: 5, overflow: 'hidden' }}>{renderMotif(g)}</View>
                  <Txt size={14} weight="semi" style={{ flex: 1 }}>
                    {faceOf(g)?.nameVi ?? g}
                  </Txt>
                  <Icon name="chevron" size={15} color={A.inkFaint} />
                </View>
              </Panel>
            </Pressable>
          ))}
      </>
    </Sheet>
  );
}

function renderMotif(id: string) {
  const f = faceOf(id);
  return f ? <f.Motif /> : null;
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Panel radius={R.lg} tone={1} seed={title.length * 13}>
      <View style={{ gap: 2, padding: S.lg }}>
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

function Shell({ W, height, insets, children }: { W: number; height: number; insets: { top: number; bottom: number }; children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={W} height={height} />
      <ScrollView
        contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.xxl, gap: S.md }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}
