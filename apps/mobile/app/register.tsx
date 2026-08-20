import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Field, Txt } from '../src/components/ui';
import { C, R, S } from '../src/theme';
import { useStore } from '../src/state/store';
import { friendlyError } from '../src/lib/api';

export default function RegisterScreen() {
  const { register } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (username.trim().length < 3) return setError('Tên đăng nhập cần ít nhất 3 ký tự');
    if (pw.length < 6) return setError('Mật khẩu cần ít nhất 6 ký tự');
    setBusy(true);
    setError(null);
    try {
      await register({ username: username.trim(), password: pw, displayName: displayName.trim() || undefined });
      router.replace('/');
    } catch (e: any) {
      setError(friendlyError(e.code ?? 'NETWORK'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={['#E9E5FF', '#FFF6EE', '#D9F7E8']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.xl, paddingTop: insets.top + 30, gap: S.lg }}>
          <Pressable onPress={() => router.back()}>
            <Txt size={14} weight="bold" color={C.inkSoft}>
              ‹ Quay lại
            </Txt>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 54 }}>🐣</Text>
            <Txt size={28} weight="display" color={C.secondary}>
              Tạo tài khoản
            </Txt>
            <Txt size={13} color={C.inkSoft} center>
              Nhận ngay 500 Coin và 20 Diamond khởi đầu
            </Txt>
          </View>
          <Card style={{ gap: S.lg }}>
            <Field
              label="Tên đăng nhập"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="chỉ chữ, số và _"
            />
            <Field label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} placeholder="Tên trong game" />
            <Field label="Mật khẩu" value={pw} onChangeText={setPw} secureTextEntry placeholder="tối thiểu 6 ký tự" />
            {error ? (
              <View style={{ backgroundColor: '#FFE5E5', padding: 10, borderRadius: R.md }}>
                <Txt size={13} weight="medium" color={C.danger}>
                  {error}
                </Txt>
              </View>
            ) : null}
            <Btn label="Đăng ký" icon="✨" tone="secondary" size="lg" full loading={busy} onPress={submit} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
