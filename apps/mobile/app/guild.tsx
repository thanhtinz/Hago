import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Btn, Card, Chip, Empty, Field, SectionTitle, Txt } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon, IconName } from '../src/components/Icon';
import { Art, ArtName } from '../src/components/Art';
import { C, R, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

/**
 * Bang hội — một người chỉ ở một bang.
 *
 * Chưa có bang thì màn này là chỗ tìm bang và lập bang; đã có bang thì thành
 * trang của bang: tiến độ cấp, danh sách thành viên xếp theo công trạng, đơn
 * xin vào (chỉ chủ và sĩ quan thấy) và lối vào kênh chat riêng của bang.
 */

/** Huy hiệu chọn được khi lập bang — dùng asset, không dùng emoji. */
const EMBLEMS: ArtName[] = ['crown', 'star', 'fire', 'skull', 'gem', 'paw', 'win', 'draw'];
const COLORS = ['#7C6BFF', '#FF6B8A', '#2FA9F5', '#42C98D', '#F5A623', '#B06BFF'];

const ROLE_LABEL: Record<string, string> = { owner: 'Chủ bang', officer: 'Sĩ quan', member: 'Thành viên' };
const POLICY_LABEL: Record<string, string> = {
  open: 'Vào tự do',
  request: 'Duyệt đơn',
  closed: 'Chỉ mời',
};

export default function GuildScreen() {
  const router = useRouter();
  const { showToast, profile } = useStore();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'members' | 'requests'>('members');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData(await api<any>('/api/guilds/me'));
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (fn: () => Promise<any>) => {
    try {
      await fn();
      await load();
    } catch (e: any) {
      showToast(friendlyError(e?.message), 'warn');
    }
  };

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenHeader title="Bang hội" icon="shield" />
        <Empty icon="shield" title="Đang tải..." />
      </View>
    );
  }

  if (!data.guild) return <NoGuild data={data} onDone={load} />;

  const g = data.guild;
  const me = data.role as string;
  const canManage = me === 'owner' || me === 'officer';
  const pct = Math.min(1, g.into / Math.max(1, g.need));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title={g.name}
        subtitle={`[${g.tag}] · ${ROLE_LABEL[me]}`}
        icon="shield"
        right={
          <Pressable onPress={() => router.push(`/guild-chat?id=${g.id}`)} hitSlop={10}>
            <Icon name="chat" size={22} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      >
        <GuildBanner guild={g} />

        <Card style={{ gap: S.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt size={13} weight="bold" style={{ flex: 1 }}>
              Cấp {g.level} · {g.members}/{g.slots} thành viên
            </Txt>
            <Txt size={12} color={C.inkFaint}>
              {g.xp} điểm cống hiến
            </Txt>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.surfaceAlt, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: g.color }} />
          </View>
          <Txt size={11} color={C.inkFaint}>
            Mỗi trận chơi xong được 5 điểm, thắng được 15. Lên cấp mở thêm 5 chỗ.
          </Txt>
        </Card>

        {g.description ? (
          <Card>
            <Txt size={13} color={C.inkSoft}>
              {g.description}
            </Txt>
          </Card>
        ) : null}

        {/* Thành viên thường chỉ có một danh sách, bày ra hàng tab một nút thì thừa */}
        {canManage ? (
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <TabBtn label={`Thành viên (${data.members.length})`} on={tab === 'members'} onPress={() => setTab('members')} />
            <TabBtn
              label={`Đơn xin vào (${data.requests.length})`}
              on={tab === 'requests'}
              onPress={() => setTab('requests')}
            />
          </View>
        ) : (
          <SectionTitle title={`Thành viên (${data.members.length})`} icon="users" />
        )}

        {tab === 'members'
          ? data.members.map((m: any) => (
              <Card key={m.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <Avatar seed={m.user.avatarSeed} styleName={m.user.avatarStyle} frameId={m.user.frameId} size={40} />
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold" numberOfLines={1}>
                    {m.user.displayName}
                  </Txt>
                  <Txt size={11} color={C.inkFaint}>
                    {ROLE_LABEL[m.role]} · {m.points} điểm
                  </Txt>
                </View>
                {m.role !== 'member' ? (
                  <Chip
                    label={ROLE_LABEL[m.role]}
                    icon={m.role === 'owner' ? 'crown' : 'shield'}
                    color={m.role === 'owner' ? C.sun : C.secondary}
                    soft={m.role === 'owner' ? C.sunSoft : C.secondarySoft}
                    size={11}
                  />
                ) : null}
                {canManage && m.user.id !== profile?.id && m.role !== 'owner' ? (
                  <Pressable
                    onPress={() => act(() => api(`/api/guilds/${g.id}/kick/${m.user.id}`, { method: 'POST' }))}
                    hitSlop={8}
                  >
                    <Icon name="close" size={18} color={C.danger} />
                  </Pressable>
                ) : null}
                {me === 'owner' && m.user.id !== profile?.id ? (
                  <Pressable
                    onPress={() =>
                      act(() =>
                        api(`/api/guilds/${g.id}/role/${m.user.id}`, {
                          method: 'POST',
                          body: { role: m.role === 'officer' ? 'member' : 'officer' },
                        }),
                      )
                    }
                    hitSlop={8}
                  >
                    <Icon name={m.role === 'officer' ? 'chevron-down' : 'trend'} size={18} color={C.inkFaint} />
                  </Pressable>
                ) : null}
              </Card>
            ))
          : data.requests.length
            ? data.requests.map((r: any) => (
                <Card key={r.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                  <Avatar seed={r.user.avatarSeed} styleName={r.user.avatarStyle} size={38} />
                  <Txt size={14} weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                    {r.user.displayName}
                  </Txt>
                  <Btn
                    label="Nhận"
                    size="sm"
                    tone="mint"
                    onPress={() =>
                      act(() =>
                        api(`/api/guilds/${g.id}/requests/${r.user.id}`, { method: 'POST', body: { accept: true } }),
                      )
                    }
                  />
                  <Btn
                    label="Từ chối"
                    size="sm"
                    tone="ghost"
                    onPress={() =>
                      act(() =>
                        api(`/api/guilds/${g.id}/requests/${r.user.id}`, { method: 'POST', body: { accept: false } }),
                      )
                    }
                  />
                </Card>
              ))
            : <Empty icon="users" title="Chưa có đơn nào" hint="Đơn xin vào bang sẽ hiện ở đây" />}

        <Btn
          label={me === 'owner' && g.members > 1 ? 'Phải nhường ghế chủ trước' : 'Rời bang'}
          tone="danger"
          icon="door"
          full
          disabled={me === 'owner' && g.members > 1}
          onPress={() => act(() => api('/api/guilds/leave', { method: 'POST' }))}
        />
      </ScrollView>
    </View>
  );
}

/** Màn khi chưa có bang: tìm bang đang mở hoặc bỏ coin lập bang mới. */
function NoGuild({ data, onDone }: { data: any; onDone: () => void }) {
  const { showToast } = useStore();
  const [mode, setMode] = useState<'find' | 'create'>('find');
  const [query, setQuery] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [emblem, setEmblem] = useState<ArtName>('crown');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (q: string) => {
    setBusy(true);
    try {
      const r = await api<{ guilds: any[] }>(`/api/guilds?q=${encodeURIComponent(q)}`);
      setList(r.guilds);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      search('');
    }, [search]),
  );

  const run = async (fn: () => Promise<any>, ok: string) => {
    try {
      await fn();
      showToast(ok, 'ok');
      onDone();
    } catch (e: any) {
      showToast(friendlyError(e?.message), 'warn');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Bang hội" subtitle="Chơi cùng nhau, leo hạng cùng nhau" icon="shield" />
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <TabBtn label="Tìm bang" on={mode === 'find'} onPress={() => setMode('find')} />
          <TabBtn label="Lập bang" on={mode === 'create'} onPress={() => setMode('create')} />
        </View>

        {mode === 'find' ? (
          <>
            <Field
              placeholder="Tìm theo tên hoặc thẻ bang"
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                search(t);
              }}
            />
            {list.length ? (
              list.map((g) => (
                <Card key={g.id} style={{ gap: S.sm }}>
                  <GuildBanner guild={g} compact />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                    <Chip label={POLICY_LABEL[g.joinPolicy]} icon="key" size={11} />
                    <Chip label={`Cấp ${g.level}`} icon="trend" size={11} />
                    <Txt size={12} color={C.inkFaint} style={{ flex: 1 }}>
                      {g.members}/{g.slots}
                    </Txt>
                    <Btn
                      label={g.joinPolicy === 'request' ? 'Xin vào' : 'Vào bang'}
                      size="sm"
                      disabled={g.joinPolicy === 'closed' || g.members >= g.slots}
                      onPress={() =>
                        run(
                          () => api(`/api/guilds/${g.id}/join`, { method: 'POST' }),
                          g.joinPolicy === 'request' ? 'Đã gửi đơn, chờ duyệt nhé' : 'Vào bang rồi!',
                        )
                      }
                    />
                  </View>
                </Card>
              ))
            ) : (
              <Empty icon="shield" title={busy ? 'Đang tìm...' : 'Chưa có bang nào'} hint="Lập bang mới đi!" />
            )}
          </>
        ) : (
          <Card style={{ gap: S.md }}>
            <Field label="Tên bang" placeholder="3-24 ký tự" value={name} onChangeText={setName} maxLength={24} />
            <Field
              label="Thẻ bang"
              placeholder="2-5 chữ in hoa hoặc số"
              value={tag}
              autoCapitalize="characters"
              maxLength={5}
              onChangeText={(t) => setTag(t.toUpperCase())}
            />

            <View style={{ gap: 6 }}>
              <Txt size={13} weight="bold" color={C.inkSoft}>
                Huy hiệu
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EMBLEMS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmblem(e)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: R.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: emblem === e ? color : C.surfaceAlt,
                      borderWidth: 2,
                      borderColor: emblem === e ? color : C.line,
                    }}
                  >
                    <Art name={e} size={28} color={emblem === e ? '#FFFFFF' : C.inkFaint} glyph />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Txt size={13} weight="bold" color={C.inkSoft}>
                Màu bang
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: c,
                      borderWidth: 3,
                      borderColor: color === c ? C.ink : 'transparent',
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="coin" size={16} color={C.sun} />
              <Txt size={13} weight="bold" color={C.inkSoft} style={{ flex: 1 }}>
                Phí lập bang {data.cost} coin
              </Txt>
              <Txt size={13} weight="bold" color={data.balance?.coin >= data.cost ? C.mint : C.danger}>
                Bạn có {data.balance?.coin ?? 0}
              </Txt>
            </View>

            <Btn
              label="Lập bang"
              icon="shield"
              full
              disabled={name.trim().length < 3 || tag.length < 2 || (data.balance?.coin ?? 0) < data.cost}
              onPress={() =>
                run(
                  () => api('/api/guilds', { method: 'POST', body: { name, tag, emblem, color } }),
                  'Lập bang thành công!',
                )
              }
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function GuildBanner({ guild, compact }: { guild: any; compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      <View
        style={[
          {
            width: compact ? 44 : 58,
            height: compact ? 44 : 58,
            borderRadius: R.md,
            backgroundColor: guild.color,
            alignItems: 'center',
            justifyContent: 'center',
          },
          softShadow(0.18, 10, 4),
        ]}
      >
        {/* glyph: mấy asset huy hiệu có đĩa nền, không bỏ đi thì ra hình tròn trắng */}
        <Art name={guild.emblem as ArtName} size={compact ? 26 : 34} color="#FFFFFF" glyph />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={compact ? 15 : 18} weight="display" numberOfLines={1}>
          {guild.name}
        </Txt>
        <Txt size={12} color={C.inkFaint}>
          [{guild.tag}] · Cấp {guild.level} · {guild.members}/{guild.slots} thành viên
        </Txt>
      </View>
    </View>
  );
}

function TabBtn({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: R.pill,
        alignItems: 'center',
        backgroundColor: on ? C.primary : C.surface,
        borderWidth: 2,
        borderColor: on ? C.primary : C.line,
      }}
    >
      <Txt size={13} weight="bold" color={on ? '#fff' : C.inkSoft}>
        {label}
      </Txt>
    </Pressable>
  );
}
