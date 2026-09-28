import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { backToLobby } from '../src/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, auth, useAction, useAuth, type GameStat } from '../src/net/api';
import { faceOf } from '../src/games/faces';
import { Field } from '../src/ui/Field';
import { Icon } from '../src/ui/Icon';
import { Avatar, Btn, Panel, Txt } from '../src/ui/parts';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, R, S } from '../src/ui/theme';

/**
 * Trang cá nhân.
 *
 * Thành tích chia theo **bộ môn**, không gộp một con số. "Thắng 40 thua 12"
 * gộp cả chín bộ môn thì không nói lên điều gì; người chơi muốn biết mình
 * mạnh ở món nào.
 */
export default function MeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me, loading } = useAuth();
  const [stats, setStats] = useState<GameStat[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const { busy, error, run } = useAction();

  const load = useCallback(() => {
    void api
      .me()
      .then((r) => setStats(r.stats))
      .catch(() => setStats([]));
  }, []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  if (loading) return <Shell width={width} height={height} insets={insets} />;

  if (!me) {
    return (
      <Shell width={width} height={height} insets={insets}>
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

  const total = stats.reduce((s, r) => ({ win: s.win + r.win, draw: s.draw + r.draw, loss: s.loss + r.loss }), { win: 0, draw: 0, loss: 0 });
  const played = total.win + total.draw + total.loss;

  return (
    <Shell width={width} height={height} insets={insets}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.md }}>
        <Pressable onPress={() => backToLobby(router)} hitSlop={14} accessibilityRole="button" accessibilityLabel="Về sảnh">
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <Txt size={18} weight="display" style={{ flex: 1 }}>
          Trang cá nhân
        </Txt>
      </View>

      <Panel radius={R.lg} tone={1} seed={11}>
        <View style={{ alignItems: 'center', gap: S.sm, padding: S.lg }}>
          <Avatar name={me.name} size={72} active />
          <Txt size={21} weight="display">
            {me.name}
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {me.email ?? 'Tài khoản khách · chưa có email'}
          </Txt>
          <Txt size={10.5} color={A.inkFaint}>
            Tham gia {new Date(me.createdAt).toLocaleDateString('vi-VN')}
          </Txt>
        </View>
      </Panel>

      {/* Khách chưa có email thì nói thẳng là mất dữ liệu khi đổi máy, chứ
          không để họ đánh mấy chục ván rồi mới phát hiện. */}
      {me.email ? null : (
        <Panel radius={R.md} tone={0} seed={19}>
          <View style={{ flexDirection: 'row', gap: S.sm, padding: S.md, alignItems: 'center' }}>
            <Icon name="lock" size={15} color={A.gold} />
            <Txt size={11.5} color={A.inkSoft} style={{ flex: 1 }}>
              Tài khoản khách chỉ sống trên máy này. Đổi máy hoặc xoá dữ liệu trình duyệt là mất hết thành tích.
            </Txt>
          </View>
        </Panel>
      )}

      <Panel radius={R.lg} tone={1} seed={29}>
        <View style={{ gap: S.sm, padding: S.lg }}>
          <Txt size={15} weight="display">
            Thành tích
          </Txt>
          {played === 0 ? (
            <Txt size={12} color={A.inkFaint}>
              Chưa đánh ván nào với người thật. Ván với máy không tính vào đây.
            </Txt>
          ) : (
            <>
              <View style={{ flexDirection: 'row', paddingVertical: S.sm }}>
                <Cell n={total.win} label="THẮNG" color={A.gold} />
                <Cell n={total.draw} label="HOÀ" color={A.inkSoft} />
                <Cell n={total.loss} label="THUA" color={A.sealLit} />
              </View>
              <Rule width={200} />
              {stats.map((s) => (
                <View key={s.gameId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                  <Txt size={13} style={{ flex: 1 }}>
                    {faceOf(s.gameId)?.nameVi ?? s.gameId}
                  </Txt>
                  <Txt size={13} weight="semi" color={A.inkSoft}>
                    {s.win} – {s.draw} – {s.loss}
                  </Txt>
                </View>
              ))}
            </>
          )}
        </View>
      </Panel>

      <Panel radius={R.lg} tone={1} seed={37}>
        <View style={{ gap: S.md, padding: S.lg }}>
          {editing ? (
            <>
              <Field label="Tên hiển thị" value={name} onChange={setName} placeholder={me.name} />
              {error ? (
                <Txt size={12.5} color={A.sealLit}>
                  {error}
                </Txt>
              ) : null}
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <Btn
                  label="Lưu"
                  disabled={busy}
                  style={{ flex: 1 }}
                  onPress={() => run(async () => {
                    await auth.rename(name);
                    setEditing(false);
                  })}
                />
                <Btn tone="ghost" label="Huỷ" style={{ flex: 1 }} onPress={() => setEditing(false)} />
              </View>
            </>
          ) : (
            <Btn
              tone="wood"
              label="Đổi tên hiển thị"
              onPress={() => {
                setName(me.name);
                setEditing(true);
              }}
            />
          )}
          <Btn tone="ghost" label="Đăng xuất" onPress={() => run(async () => {
            await auth.logout();
            backToLobby(router);
          })} />
        </View>
      </Panel>
    </Shell>
  );
}

function Cell({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt size={24} weight="display" color={color}>
        {n}
      </Txt>
      <Txt size={9.5} weight="semi" color={A.inkFaint} style={{ letterSpacing: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

function Shell({
  width,
  height,
  insets,
  children,
}: {
  width: number;
  height: number;
  insets: { top: number; bottom: number };
  children?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={Math.min(width, 460)} height={height} />
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.xl, gap: S.md }}>
        {children}
      </ScrollView>
    </View>
  );
}
