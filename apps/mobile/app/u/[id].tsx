import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { backToLobby } from '../../src/nav';
import { api, useAuth, type GameStat, type MatchRow, type PublicUser } from '../../src/net/api';
import { live, useLive, useWatch } from '../../src/net/live';
import { faceOf } from '../../src/games/faces';
import { Face } from '../../src/ui/Crest';
import { Icon } from '../../src/ui/Icon';
import { Btn, Panel, Txt } from '../../src/ui/parts';
import { AppBackdrop } from '../../src/ui/surface';
import { A, R, S, lift } from '../../src/ui/theme';

/**
 * Hồ sơ người khác.
 *
 * Chỉ những gì công khai: tên, con dấu, thành tích, điểm, và mấy ván gần đây.
 * **Không có email** — nó không bao giờ rời máy chủ cho người thứ ba, kể cả
 * khi hai người là bạn.
 */
export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me } = useAuth();
  const s = useLive();
  const [data, setData] = useState<{
    user: PublicUser;
    stats: GameStat[];
    history: { rows: MatchRow[]; more: boolean; total: number };
    /** Chuỗi thắng / hoà / thua gần nhất. Máy chủ gửi kèm từ đầu. */
    streak: { kind: 'win' | 'draw' | 'loss'; n: number } | null;
    friend: boolean;
    blocked: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    void api
      .user(String(id))
      .then(setData)
      .catch(() => setData(null));
  }, [id]);
  useEffect(load, [load]);
  useWatch(id ? [String(id)] : []);

  useEffect(() => {
    if (s.justMatched) {
      live.clearMatched();
      router.replace('/online/live');
    }
  }, [s.justMatched, router]);

  const W = Math.min(width, 460);
  const online = s.online.has(String(id));
  const mine = me?.id === id;

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={W} height={height} />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.xxl, gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.sm }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : backToLobby(router))}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Icon name="back" size={22} color={A.inkSoft} />
          </Pressable>
          <Txt size={18} weight="display" style={{ flex: 1 }}>
            Hồ sơ
          </Txt>
        </View>

        {!data ? (
          <Panel radius={R.lg} tone={1} seed={7}>
            <View style={{ padding: S.xl, alignItems: 'center' }}>
              <Txt size={12} color={A.inkFaint}>
                Đang tải…
              </Txt>
            </View>
          </Panel>
        ) : (
          <>
            <Panel radius={R.lg} tone={1} seed={11} style={lift(0.4, 14, 6)}>
              <View style={{ alignItems: 'center', gap: S.xs, padding: S.lg }}>
                <View style={[{ borderRadius: 100 }, lift(0.5, 16, 6)]}>
                  <Face avatar={data.user.avatar} id={data.user.id} size={78} />
                </View>
                <Txt size={20} weight="display" style={{ paddingTop: S.xs }}>
                  {data.user.name}
                </Txt>
                <Txt size={11} color={online ? A.jade : A.inkFaint}>
                  {online ? 'Đang trực tuyến' : 'Ngoại tuyến'} · tham gia{' '}
                  {new Date(data.user.createdAt).toLocaleDateString('vi-VN')}
                </Txt>
                {data.user.bio ? (
                  <Txt size={12.5} color={A.inkSoft} center style={{ paddingTop: S.xs }}>
                    {data.user.bio}
                  </Txt>
                ) : null}
                {/* Chuỗi thắng máy chủ đã gửi kèm từ đầu mà màn này bỏ rơi.
                    Đây đúng là thứ người ta muốn biết trước khi rủ ai đó
                    một ván. */}
                {data.streak && data.streak.n > 1 ? (
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingTop: S.xs }}>
                    <Icon name="bolt" size={13} color={data.streak.kind === 'win' ? A.gold : A.inkFaint} />
                    <Txt size={12} weight="semi" color={data.streak.kind === 'win' ? A.gold : A.inkSoft}>
                      {data.streak.n} ván {data.streak.kind === 'win' ? 'thắng' : data.streak.kind === 'draw' ? 'hoà' : 'thua'} liên tiếp
                    </Txt>
                  </View>
                ) : null}

                {mine ? null : data.blocked ? (
                  <Txt size={11.5} color={A.sealLit} style={{ paddingTop: S.sm }}>
                    Không tương tác được với người này.
                  </Txt>
                ) : (
                  <View style={{ flexDirection: 'row', gap: S.sm, paddingTop: S.md, alignSelf: 'stretch' }}>
                    {data.friend ? (
                      <>
                        <Btn tone="wood" label="Nhắn tin" style={{ flex: 1 }} onPress={() => router.push(`/chat/${data.user.id}`)} />
                        <Btn
                          label="Tỷ thí"
                          style={{ flex: 1 }}
                          disabled={!online}
                          onPress={() => live.challenge(data.user.id, 'co-caro')}
                        />
                      </>
                    ) : (
                      <Btn
                        tone="wood"
                        label={sent ? 'Đã gửi lời mời' : 'Kết bạn'}
                        style={{ flex: 1 }}
                        disabled={busy || sent}
                        onPress={() => {
                          setBusy(true);
                          setSent(true);
                          void api.request(data.user.id).then(load).finally(() => setBusy(false));
                        }}
                      />
                    )}
                  </View>
                )}
              </View>
            </Panel>

            {data.stats.length ? (
              <Card title="Thành tích">
                {data.stats.map((g) => (
                  <View key={g.gameId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                    <Txt size={13} style={{ flex: 1 }}>
                      {faceOf(g.gameId)?.nameVi ?? g.gameId}
                    </Txt>
                    <Txt size={12} color={A.inkSoft} style={{ paddingRight: S.md }}>
                      {g.win}–{g.draw}–{g.loss}
                    </Txt>
                    <Txt size={13} weight="bold" color={A.gold}>
                      {g.rating}
                    </Txt>
                  </View>
                ))}
              </Card>
            ) : (
              <Card title="Thành tích">
                <Txt size={12} color={A.inkFaint}>
                  Chưa đánh ván nào với người thật.
                </Txt>
              </Card>
            )}

            {data.history.rows.length ? (
              <Card title="Trận gần đây" sub={`${data.history.total} ván đã đánh`}>
                {data.history.rows.map((m) => (
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 7 }}>
                    <Svg width={8} height={8}>
                      <Circle cx={4} cy={4} r={3.5} fill={m.result === 'win' ? A.gold : m.result === 'draw' ? A.inkSoft : A.sealLit} />
                    </Svg>
                    <Txt size={12.5} style={{ flex: 1 }} numberOfLines={1}>
                      {m.opponent}
                    </Txt>
                    <Txt size={10.5} color={A.inkFaint}>
                      {faceOf(m.gameId)?.nameVi ?? m.gameId}
                    </Txt>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
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
