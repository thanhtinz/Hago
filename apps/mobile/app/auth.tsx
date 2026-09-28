import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { backToLobby } from '../src/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, useAction, useAuth } from '../src/net/api';
import { Field } from '../src/ui/Field';
import { Icon } from '../src/ui/Icon';
import { Btn, Panel, Txt } from '../src/ui/parts';
import { AppBackdrop, Rule } from '../src/ui/surface';
import { A, R, S } from '../src/ui/theme';

/**
 * Đăng nhập và đăng ký.
 *
 * Một màn hình, hai chế độ, đổi bằng một dòng chữ ở dưới. Tách thành hai màn
 * riêng thì người vào nhầm phải bấm quay lại rồi bấm tiếp — mà "tôi đã có tài
 * khoản chưa" là câu người ta hay nhầm nhất.
 *
 * **Chơi thử không cần tài khoản** vẫn để ngay đây, ngang hàng: bắt đăng ký
 * trước khi cho xem thử một ván là cách nhanh nhất để người ta đóng app.
 */
export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { me } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [google, setGoogle] = useState(false);
  const { busy, error, run } = useAction();

  useEffect(() => {
    void auth.config().then((c) => setGoogle(c.google)).catch(() => setGoogle(false));
  }, []);

  // Đăng nhập xong là về sảnh, kể cả khi màn này mở ra lúc đã có phiên sẵn.
  useEffect(() => {
    if (me) backToLobby(router);
  }, [me, router]);

  const submit = () =>
    run(async () => {
      if (mode === 'login') await auth.login(email, pw);
      else await auth.register(name, email, pw);
    });

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={Math.min(width, 460)} height={height} />
      <ScrollView
        contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.xxl, paddingBottom: insets.bottom + S.xl, gap: S.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Txt size={13} weight="display" color={A.gold} style={{ letterSpacing: 6 }}>
            CỜ VIỆT
          </Txt>
          <Rule width={Math.min(width, 460) * 0.5} />
          <Txt size={20} weight="display" style={{ paddingTop: S.md }}>
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Txt>
          <Txt size={11.5} color={A.inkFaint} center>
            {mode === 'login' ? 'Để chơi với người thật và giữ thành tích' : 'Tên hiển thị đổi lại được bất cứ lúc nào'}
          </Txt>
        </View>

        <Panel radius={R.lg} tone={1} seed={17}>
          <View style={{ gap: S.md, padding: S.lg }}>
            {mode === 'register' ? (
              <Field label="Tên hiển thị" value={name} onChange={setName} placeholder="Tên người khác sẽ thấy" autoComplete="name" />
            ) : null}
            <Field label="Email" value={email} onChange={setEmail} placeholder="ban@vidu.com" keyboard="email-address" autoComplete="email" />
            <Field
              label="Mật khẩu"
              value={pw}
              onChange={setPw}
              secure
              autoComplete={mode === 'login' ? 'password' : 'new-password'}
              hint={mode === 'register' ? 'Từ 8 ký tự. Một câu dài dễ nhớ tốt hơn một chuỗi ký tự lạ.' : undefined}
            />

            {error ? (
              <Txt size={12.5} color={A.sealLit}>
                {error}
              </Txt>
            ) : null}

            <Btn label={busy ? 'Đang gửi…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'} disabled={busy} onPress={submit} />

            <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} accessibilityRole="button">
              <Txt size={12.5} color={A.gold} center>
                {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
              </Txt>
            </Pressable>
          </View>
        </Panel>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ flex: 1, height: 1, backgroundColor: A.lineSoft }} />
          <Txt size={10.5} color={A.inkFaint}>
            HOẶC
          </Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: A.lineSoft }} />
        </View>

        {/* Nút Google chỉ hiện khi máy chủ **đã được cấu hình**. Hiện một nút
            bấm vào là báo lỗi thì tệ hơn hẳn không có nút. */}
        {google ? (
          <Btn
            tone="wood"
            label="Tiếp tục với Google"
            onPress={() => run(async () => auth.google(await pickGoogleIdToken()))}
            disabled={busy}
          />
        ) : (
          <Panel radius={R.md} tone={0} seed={23}>
            <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center', padding: S.md }}>
              <Icon name="lock" size={14} color={A.inkFaint} />
              <Txt size={11} color={A.inkFaint} style={{ flex: 1 }}>
                Đăng nhập Google chưa bật: máy chủ chưa có GOOGLE_CLIENT_ID.
              </Txt>
            </View>
          </Panel>
        )}

        <Btn tone="ghost" label="Chơi thử, không cần tài khoản" disabled={busy} onPress={() => run(() => auth.guest())} />
      </ScrollView>
    </View>
  );
}

/**
 * Mở cửa sổ chọn tài khoản Google và trả về ID token.
 *
 * Dùng Google Identity Services trên web. Thư viện được nạp lúc bấm nút chứ
 * không nạp sẵn ở đầu trang: người chưa bao giờ bấm Google không phải tải
 * kịch bản của bên thứ ba, và trang cũng không bị theo dõi khi chưa đồng ý.
 */
async function pickGoogleIdToken(): Promise<string> {
  const g = globalThis as unknown as {
    document?: Document;
    google?: { accounts: { id: { initialize: (o: unknown) => void; prompt: (cb?: unknown) => void } } };
  };
  if (!g.document) throw new Error('Đăng nhập Google mới chạy trên bản web');
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('App chưa đặt EXPO_PUBLIC_GOOGLE_CLIENT_ID');

  if (!g.google) {
    await new Promise<void>((ok, fail) => {
      const s = g.document!.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => fail(new Error('Không tải được thư viện Google'));
      g.document!.head.appendChild(s);
    });
  }
  return new Promise<string>((ok, fail) => {
    g.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (r: { credential?: string }) => (r.credential ? ok(r.credential) : fail(new Error('Google không trả về token'))),
    });
    g.google!.accounts.id.prompt();
  });
}
