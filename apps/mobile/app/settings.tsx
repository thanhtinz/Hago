import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Field, SectionTitle, Txt } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { C, R, S } from '../src/theme';
import { API_URL, api } from '../src/lib/api';
import { useStore } from '../src/state/store';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refresh, showToast, logout } = useStore();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [seed, setSeed] = useState(profile?.avatarSeed ?? '');
  const [styleName, setStyleName] = useState(profile?.avatarStyle ?? 'adventurer');
  const [styles, setStyles] = useState<string[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [push, setPush] = useState(true);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    api<any>('/api/users/avatar-styles').then((r) => setStyles(r.styles));
    api<any>('/api/auth/sessions').then((r) => setSessions(r.sessions.filter((s: any) => !s.revoked_at)));
  }, []);

  const save = async () => {
    await api('/api/users/me', { method: 'PATCH', body: { displayName, bio, avatarSeed: seed, avatarStyle: styleName } });
    await refresh();
    showToast('Đã lưu hồ sơ ✨');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScreenHeader title="Cài đặt" art="key" subtitle="Hồ sơ, thông báo và phiên đăng nhập" />
    <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 40, gap: S.lg }}>

      <Card style={{ gap: S.md }}>
        <SectionTitle title="Hồ sơ" emoji="🐤" />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Avatar seed={seed} styleName={styleName} frameId={profile?.frameId} size={80} />
          <Txt size={11} color={C.inkFaint}>
            Avatar chibi sinh tự động từ seed
          </Txt>
        </View>
        <Field label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} />
        <Field label="Giới thiệu" value={bio} onChangeText={setBio} placeholder="Vài dòng về bạn..." multiline />
        <Field label="Avatar seed" value={seed} onChangeText={setSeed} autoCapitalize="none" />
        <Txt size={12} weight="bold" color={C.inkSoft}>
          Kiểu avatar
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {styles.map((s) => (
            <Pressable key={s} onPress={() => setStyleName(s)} style={{ alignItems: 'center', gap: 3 }}>
              <View style={{ borderWidth: 3, borderColor: styleName === s ? C.primary : 'transparent', borderRadius: 999, padding: 2 }}>
                <Avatar seed={seed || 'hago'} styleName={s} size={46} />
              </View>
              <Txt size={9} color={C.inkFaint}>
                {s}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
        <Btn label="Lưu thay đổi" icon="💾" full onPress={save} />
      </Card>

      <Card style={{ gap: S.md }}>
        <SectionTitle title="Tuỳ chọn" emoji="🔧" />
        <Row label="Thông báo đẩy" value={push} onChange={setPush} />
        <Row label="Âm thanh trong game" value={sound} onChange={setSound} />
      </Card>

      <Card style={{ gap: S.sm }}>
        <SectionTitle title="Phiên đăng nhập" emoji="📱" />
        {sessions.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Txt size={12} weight="medium" numberOfLines={1}>
                {s.device?.slice(0, 40) ?? 'Thiết bị'}
              </Txt>
              <Txt size={10} color={C.inkFaint}>
                {new Date(s.created_at).toLocaleString('vi-VN')}
              </Txt>
            </View>
            <Pressable
              onPress={async () => {
                await api(`/api/auth/sessions/${s.id}`, { method: 'DELETE' });
                setSessions((prev) => prev.filter((x) => x.id !== s.id));
                showToast('Đã thu hồi phiên');
              }}
            >
              <Txt size={12} weight="bold" color={C.danger}>
                Thu hồi
              </Txt>
            </Pressable>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 6 }}>
        <SectionTitle title="Về ứng dụng" emoji="ℹ️" />
        <Txt size={12} color={C.inkSoft}>
          Hago v1.0.0 — nền tảng social mini-game
        </Txt>
        <Txt size={11} color={C.inkFaint}>
          Máy chủ: {API_URL}
        </Txt>
        <Txt size={11} color={C.inkFaint}>
          Kết quả trận đấu do máy chủ quyết định (server-authoritative) để đảm bảo công bằng.
        </Txt>
      </Card>

      <Btn label="Đăng xuất" icon="👋" tone="danger" full onPress={logout} />
    </ScrollView>
    </View>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Txt size={13} weight="medium" color={C.inkSoft}>
        {label}
      </Txt>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.primary }} />
    </View>
  );
}
