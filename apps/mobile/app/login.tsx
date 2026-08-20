import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Field, Txt } from '../src/components/ui';
import { C, R, S, softShadow } from '../src/theme';
import { useStore } from '../src/state/store';
import { friendlyError } from '../src/lib/api';

export default function LoginScreen() {
  const { login } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [id, setId] = useState('demo');
  const [pw, setPw] = useState('demo123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(id.trim(), pw);
      router.replace('/');
    } catch (e: any) {
      setError(friendlyError(e.code ?? 'NETWORK'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={['#FFE3D2', '#FFF6EE', '#E9E5FF']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.xl, paddingTop: insets.top + 40, gap: S.xl }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View
              style={[
                {
                  width: 96,
                  height: 96,
                  borderRadius: 32,
                  backgroundColor: C.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: '-6deg' }],
                },
                softShadow(0.12, 20, 10),
              ]}
            >
              <Text style={{ fontSize: 52 }}>🎮</Text>
            </View>
            <Txt size={40} weight="display" color={C.primary} style={{ marginTop: 12 }}>
              Hago
            </Txt>
            <Txt size={14} weight="medium" color={C.inkSoft} center>
              Chơi game cùng bạn bè — nhanh, vui, chibi
            </Txt>
          </View>

          <Card style={{ gap: S.lg }}>
            <Txt size={20} weight="heading">
              Đăng nhập
            </Txt>
            <Field
              label="Tên đăng nhập hoặc email"
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
              placeholder="vd: demo"
            />
            <Field
              label="Mật khẩu"
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              placeholder="••••••"
              onSubmitEditing={submit}
            />
            {error ? (
              <View style={{ backgroundColor: '#FFE5E5', padding: 10, borderRadius: R.md }}>
                <Txt size={13} weight="medium" color={C.danger}>
                  {error}
                </Txt>
              </View>
            ) : null}
            <Btn label="Vào chơi ngay" icon="🚀" size="lg" full loading={busy} onPress={submit} />
            <Pressable onPress={() => router.push('/register')} style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Txt size={13} weight="bold" color={C.secondary}>
                Chưa có tài khoản? Đăng ký miễn phí
              </Txt>
            </Pressable>
          </Card>

          <View style={{ backgroundColor: C.secondarySoft, borderRadius: R.lg, padding: S.lg, gap: 4 }}>
            <Txt size={12} weight="bold" color={C.secondaryDark}>
              🔑 Tài khoản dùng thử
            </Txt>
            <Txt size={12} color={C.inkSoft}>
              Người chơi: demo / demo123 · Quản trị: admin / admin123
            </Txt>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
