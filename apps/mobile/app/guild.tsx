import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Bar, Btn, Card, Chip, Empty, Field, SectionTitle, Txt } from '../src/components/ui';
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
  const [tab, setTab] = useState<'members' | 'quests' | 'logs' | 'requests'>('members');
  /** Đang sửa thông báo ghim; null là không sửa. */
  const [noticeDraft, setNoticeDraft] = useState<string | null>(null);

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

        {/* Thông báo ghim: chỗ chủ bang dặn cả bang, ai vào cũng thấy ngay */}
        <NoticeCard
          guild={g}
          canManage={canManage}
          draft={noticeDraft}
          onEdit={() => setNoticeDraft(g.notice ?? '')}
          onChange={setNoticeDraft}
          onCancel={() => setNoticeDraft(null)}
          onSave={() =>
            act(async () => {
              await api(`/api/guilds/${g.id}/notice`, { method: 'PUT', body: { notice: noticeDraft ?? '' } });
              setNoticeDraft(null);
            })
          }
        />

        {/* Điểm danh bang: cách góp cho bang mà không cần thắng trận nào */}
        {data.checkin ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Art name="star" size={30} color={g.color} />
            <View style={{ flex: 1 }}>
              <Txt size={14} weight="heading">
                Điểm danh bang
              </Txt>
              <Txt size={11} color={C.inkSoft}>
                +{data.checkin.rewardPoints} điểm cống hiến · hôm nay {data.checkin.todayCount}/{g.members} người đã điểm danh
              </Txt>
            </View>
            {data.checkin.checkedInToday ? (
              <Chip label="Đã điểm danh" icon="check" color={C.mint} soft={C.mintSoft} size={11} />
            ) : (
              <Btn
                label="Điểm danh"
                size="sm"
                tone="mint"
                onPress={() =>
                  act(async () => {
                    const r: any = await api('/api/guilds/checkin', { method: 'POST' });
                    showToast(`Điểm danh bang: +${r.points} điểm cống hiến`);
                  })
                }
              />
            )}
          </Card>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          <TabBtn label="Thành viên" count={data.members.length} on={tab === 'members'} onPress={() => setTab('members')} />
          <TabBtn label="Nhiệm vụ bang" count={data.quests?.length ?? 0} on={tab === 'quests'} onPress={() => setTab('quests')} />
          <TabBtn label="Nhật ký" on={tab === 'logs'} onPress={() => setTab('logs')} />
          {canManage ? (
            <TabBtn label="Đơn xin vào" count={data.requests.length} on={tab === 'requests'} onPress={() => setTab('requests')} />
          ) : null}
        </ScrollView>

        {tab === 'quests' ? (
          data.quests?.length ? (
            data.quests.map((q: any) => (
              <GuildQuestCard
                key={q.quest.id}
                state={q}
                color={g.color}
                onClaim={() =>
                  act(async () => {
                    const r: any = await api(`/api/guilds/quests/${q.quest.id}/claim`, { method: 'POST' });
                    showToast(`Nhận thưởng: +${r.reward.coin} Coin, +${r.reward.xp} XP`);
                  })
                }
              />
            ))
          ) : (
            <Empty icon="list" title="Chưa có nhiệm vụ bang" />
          )
        ) : null}

        {tab === 'logs' ? (
          data.logs?.length ? (
            <Card style={{ gap: S.md }}>
              {data.logs.map((l: any) => (
                <View key={l.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name={LOG_ICON[l.kind] ?? 'star'} size={16} color={C.inkFaint} strokeWidth={2.1} />
                  <Txt size={12} color={C.inkSoft} style={{ flex: 1 }}>
                    {logText(l)}
                  </Txt>
                  <Txt size={10} color={C.inkFaint}>
                    {shortTime(l.createdAt)}
                  </Txt>
                </View>
              ))}
            </Card>
          ) : (
            <Empty icon="list" title="Nhật ký còn trống" hint="Ai vào, ai rời, ai lên chức đều ghi lại ở đây" />
          )
        ) : null}

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
                {/* Sĩ quan chỉ đuổi được thành viên thường — bày nút ra rồi để
                    server từ chối thì người dùng chỉ thấy một thông báo lỗi. */}
                {m.user.id !== profile?.id &&
                m.role !== 'owner' &&
                (me === 'owner' || (me === 'officer' && m.role === 'member')) ? (
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
          : tab === 'requests'
            ? data.requests.length
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
              : <Empty icon="users" title="Chưa có đơn nào" hint="Đơn xin vào bang sẽ hiện ở đây" />
            : null}

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
          <TabBtn label="Tìm bang" grow on={mode === 'find'} onPress={() => setMode('find')} />
          <TabBtn label="Lập bang" grow on={mode === 'create'} onPress={() => setMode('create')} />
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

/**
 * Viên thuốc chọn tab. Nằm trong hàng cuộn ngang nên **không** dùng `flex: 1`:
 * chia đều bốn tab trên màn hẹp thì nhãn xuống dòng và tràn khỏi viền.
 */
function TabBtn({
  label,
  count,
  on,
  onPress,
  grow,
}: {
  label: string;
  count?: number;
  on: boolean;
  onPress: () => void;
  /** Dùng cho hàng hai nút chia đôi màn hình (Tìm bang / Lập bang). */
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: grow ? 1 : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: R.pill,
        backgroundColor: on ? C.primary : C.surface,
        borderWidth: 2,
        borderColor: on ? C.primary : C.line,
      }}
    >
      <Txt size={13} weight="bold" color={on ? '#fff' : C.inkSoft} numberOfLines={1}>
        {label}
      </Txt>
      {count !== undefined ? (
        <View
          style={{
            minWidth: 20,
            paddingHorizontal: 5,
            paddingVertical: 1,
            borderRadius: R.pill,
            backgroundColor: on ? 'rgba(255,255,255,0.28)' : C.surfaceAlt,
          }}
        >
          <Txt size={11} weight="bold" color={on ? '#fff' : C.inkFaint} center>
            {count}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/* --------------------------- phần bang mở rộng --------------------------- */

const LOG_ICON: Record<string, IconName> = {
  join: 'user-plus',
  leave: 'door',
  kick: 'ban',
  role: 'shield',
  notice: 'bell',
  quest: 'trophy',
  level: 'trend',
  create: 'crown',
};

function logText(l: any): string {
  const who = l.actorName ?? 'Ai đó';
  const target = l.targetName ?? 'một thành viên';
  switch (l.kind) {
    case 'join':
      return l.actorName ? `${who} nhận ${target} vào bang` : `${target} vào bang`;
    case 'leave':
      return `${target} rời bang`;
    case 'kick':
      return `${who} đuổi ${target} khỏi bang`;
    case 'role':
      return l.detail === 'owner'
        ? `${who} nhường ghế chủ bang cho ${target}`
        : `${who} đổi vai của ${target} thành ${l.detail === 'officer' ? 'sĩ quan' : 'thành viên'}`;
    case 'notice':
      return l.detail ? `${who} đổi thông báo: "${l.detail}"` : `${who} gỡ thông báo của bang`;
    case 'quest':
      return `Bang hoàn thành nhiệm vụ "${l.detail}"`;
    case 'create':
      return `${who} lập bang`;
    default:
      return l.detail || 'Có thay đổi trong bang';
  }
}

function shortTime(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.round(hours / 24)} ngày`;
}

/**
 * Thông báo ghim của bang. Chủ và sĩ quan sửa ngay tại chỗ; người thường chỉ
 * đọc. Bang chưa đặt thông báo thì không bày ra thẻ trống cho người thường.
 */
function NoticeCard({
  guild,
  canManage,
  draft,
  onEdit,
  onChange,
  onCancel,
  onSave,
}: {
  guild: any;
  canManage: boolean;
  draft: string | null;
  onEdit: () => void;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!guild.notice && !canManage) return null;
  if (draft !== null) {
    return (
      <Card style={{ gap: S.sm }}>
        <Txt size={13} weight="heading">
          Thông báo của bang
        </Txt>
        <Field
          label=""
          value={draft}
          onChangeText={onChange}
          multiline
          placeholder="Dặn dò cả bang một câu..."
        />
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Btn label="Lưu" size="sm" tone="mint" onPress={onSave} />
          <Btn label="Huỷ" size="sm" tone="ghost" onPress={onCancel} />
        </View>
      </Card>
    );
  }
  return (
    <Card style={{ gap: 6, borderColor: guild.notice ? guild.color : C.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="bell" size={15} color={guild.color} strokeWidth={2.2} />
        <Txt size={13} weight="heading" style={{ flex: 1 }}>
          Thông báo của bang
        </Txt>
        {canManage ? (
          <Pressable onPress={onEdit} hitSlop={10}>
            <Txt size={12} weight="bold" color={C.secondary}>
              {guild.notice ? 'Sửa' : 'Đặt'}
            </Txt>
          </Pressable>
        ) : null}
      </View>
      <Txt size={13} color={guild.notice ? C.ink : C.inkFaint}>
        {guild.notice || 'Chưa có thông báo nào'}
      </Txt>
    </Card>
  );
}

/**
 * Nhiệm vụ bang: thanh tiến độ là của **cả bang**, nên ghi rõ đã có bao nhiêu
 * người nhận — không thì dễ tưởng nhận xong là hết phần người khác.
 */
function GuildQuestCard({ state, color, onClaim }: { state: any; color: string; onClaim: () => void }) {
  const q = state.quest;
  return (
    <Card style={{ gap: S.sm, borderColor: state.completed && !state.claimed ? C.mint : C.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="heading">
            {q.title}
          </Txt>
          <Txt size={12} color={C.inkSoft}>
            {q.description}
          </Txt>
        </View>
        {state.claimed ? (
          <Chip label="Đã nhận" icon="check" color={C.mint} soft={C.mintSoft} size={10} />
        ) : state.completed ? (
          <Btn label="Nhận" size="sm" tone="mint" onPress={onClaim} />
        ) : null}
      </View>
      <Bar value={state.progress} max={q.target} color={state.completed ? C.mint : color} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' }}>
          {q.rewardCoin ? <Chip label={`+${q.rewardCoin}`} icon="coin" color="#9A6B00" soft={C.sunSoft} size={10} /> : null}
          {q.rewardXp ? <Chip label={`+${q.rewardXp} XP`} color={C.secondaryDark} soft={C.secondarySoft} size={10} /> : null}
          {q.rewardGuildPoints ? (
            <Chip label={`+${q.rewardGuildPoints} cống hiến`} icon="shield" color={C.secondaryDark} soft={C.secondarySoft} size={10} />
          ) : null}
        </View>
        <Txt size={12} weight="bold" color={C.inkFaint}>
          {state.progress}/{q.target}
        </Txt>
      </View>
      {state.completed ? (
        <Txt size={11} color={C.inkFaint}>
          {state.claimedBy} thành viên đã nhận phần của mình
        </Txt>
      ) : null}
    </Card>
  );
}
