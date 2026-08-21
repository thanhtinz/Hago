import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Avatar, Btn, Card, Chip, Empty, Txt } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon } from '../src/components/Icon';
import { GameIcon, GameIconName } from '../src/components/GameIcon';
import { Art } from '../src/components/Art';
import { C, R, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { useStore } from '../src/state/store';

/**
 * Giải đấu loại trực tiếp.
 *
 * Nhánh đấu vẽ thành các cột: cột đầu là vòng ngoài, cột cuối là chung kết.
 * Cuộn ngang vì bảng 16 người có 4 vòng, nhét vừa bề ngang điện thoại thì chữ
 * bé đến mức không đọc được.
 */
const STATUS: Record<string, { label: string; color: string; soft: string }> = {
  open: { label: 'Đang nhận đăng ký', color: '#1F7A50', soft: '#DFF6EA' },
  running: { label: 'Đang thi đấu', color: '#B8892B', soft: '#FFF1CF' },
  finished: { label: 'Đã kết thúc', color: '#6B6480', soft: '#EFEDF4' },
};

export default function TournamentsScreen() {
  const { showToast, profile } = useStore();
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api<any>('/api/tournaments');
      setList(r.tournaments);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (fn: () => Promise<any>, ok?: string) => {
    try {
      await fn();
      if (ok) showToast(ok, 'ok');
      await load();
    } catch (e: any) {
      showToast(friendlyError(e?.message), 'warn');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Giải đấu" subtitle="Loại trực tiếp, thắng là đi tiếp" icon="trophy" />
      <ScrollView
        contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      >
        {list.length ? (
          list.map((t) => {
            const st = STATUS[t.status] ?? STATUS.open;
            const expanded = open === t.id;
            return (
              <Card key={t.id} style={{ gap: S.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                  {/* GameIcon mặc định tô trắng cho thẻ gradient — trên nền sáng phải chỉ định tint */}
                  <GameIcon name={t.gameType as GameIconName} size={30} tint={C.secondary} />
                  <View style={{ flex: 1 }}>
                    <Txt size={15} weight="display" numberOfLines={1}>
                      {t.name}
                    </Txt>
                    <Txt size={11} color={C.inkFaint}>
                      {t.players.length}/{t.size} người · thưởng {t.prizePool} coin
                    </Txt>
                  </View>
                  <Chip label={st.label} color={st.color} soft={st.soft} size={10} />
                </View>

                {t.status === 'finished' && t.winnerId ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.sunSoft, borderRadius: R.md, padding: S.sm }}>
                    <Art name="win" size={22} color="#B8892B" glyph />
                    <Txt size={12} weight="bold" color="#7A5A00">
                      Vô địch: {t.players.find((p: any) => p.user.id === t.winnerId)?.user.displayName ?? '—'}
                    </Txt>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                  {t.entryCoin > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="coin" size={14} color={C.sun} />
                      <Txt size={12} color={C.inkSoft}>
                        Lệ phí {t.entryCoin}
                      </Txt>
                    </View>
                  ) : (
                    <Txt size={12} color={C.mint}>
                      Miễn phí
                    </Txt>
                  )}
                  <View style={{ flex: 1 }} />
                  {t.status === 'open' ? (
                    t.joined ? (
                      <Btn
                        label="Rút tên"
                        size="sm"
                        tone="ghost"
                        onPress={() => act(() => api(`/api/tournaments/${t.id}/leave`, { method: 'POST' }), 'Đã rút tên')}
                      />
                    ) : (
                      <Btn
                        label="Đăng ký"
                        size="sm"
                        onPress={() => act(() => api(`/api/tournaments/${t.id}/join`, { method: 'POST' }), 'Đăng ký xong!')}
                      />
                    )
                  ) : (
                    <Btn
                      label={expanded ? 'Ẩn nhánh' : 'Xem nhánh'}
                      size="sm"
                      tone="ghost"
                      onPress={() => setOpen(expanded ? null : t.id)}
                    />
                  )}
                </View>

                {/* Danh sách người đăng ký khi giải chưa chạy */}
                {t.status === 'open' && t.players.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {t.players.map((p: any) => (
                      <View
                        key={p.user.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: p.user.id === profile?.id ? C.primarySoft : C.surfaceAlt,
                          borderRadius: R.pill,
                          paddingRight: 10,
                          paddingLeft: 3,
                          paddingVertical: 3,
                        }}
                      >
                        <Avatar seed={p.user.avatarSeed} styleName={p.user.avatarStyle} size={22} />
                        <Txt size={11} weight="bold">
                          {p.user.displayName}
                        </Txt>
                      </View>
                    ))}
                  </View>
                ) : null}

                {expanded ? <Bracket t={t} meId={profile?.id} /> : null}
              </Card>
            );
          })
        ) : (
          <Empty icon="trophy" title="Chưa có giải nào" hint="Giải mới sẽ mở thường xuyên, ghé lại nhé" />
        )}
      </ScrollView>
    </View>
  );
}

/** Nhánh đấu: mỗi vòng một cột, cuộn ngang. */
function Bracket({ t, meId }: { t: any; meId?: string }) {
  const name = (id: string | null) =>
    id ? t.players.find((p: any) => p.user.id === id)?.user.displayName ?? '—' : 'Chờ';
  const rounds = Array.from({ length: t.rounds }, (_, i) =>
    t.bracket.filter((m: any) => m.round === i + 1).sort((a: any, b: any) => a.slot - b.slot),
  );
  const roundLabel = (i: number) =>
    i === t.rounds - 1 ? 'Chung kết' : i === t.rounds - 2 ? 'Bán kết' : `Vòng ${i + 1}`;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
      {rounds.map((ms, i) => (
        <View key={i} style={{ gap: 8, justifyContent: 'space-around' }}>
          <Txt size={10} weight="bold" color={C.inkFaint} center>
            {roundLabel(i)}
          </Txt>
          {ms.map((m: any) => (
            <View
              key={m.slot}
              style={[
                { width: 132, borderRadius: R.md, borderWidth: 2, borderColor: C.line, overflow: 'hidden' },
                m.winnerId ? null : softShadow(0.1, 6, 2),
              ]}
            >
              {[m.p1, m.p2].map((pid: string | null, k: number) => {
                const won = !!m.winnerId && m.winnerId === pid;
                const lost = !!m.winnerId && !!pid && m.winnerId !== pid;
                return (
                  <View
                    key={k}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      backgroundColor: won ? C.mintSoft : C.surface,
                      borderTopWidth: k ? 1 : 0,
                      borderColor: C.line,
                      opacity: lost ? 0.55 : 1,
                    }}
                  >
                    {/* Người thắng có dấu tích, không chỉ đổi màu nền */}
                    {won ? <Icon name="check" size={12} color="#1F7A50" strokeWidth={3} /> : null}
                    <Txt size={11} weight={won ? 'bold' : 'medium'} numberOfLines={1} style={{ flex: 1 }} color={pid === meId ? C.primary : C.ink}>
                      {name(pid)}
                    </Txt>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
