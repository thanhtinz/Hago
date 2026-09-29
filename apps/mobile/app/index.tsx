import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { registry } from '@co/core';
import '../src/catalog';
import { FACES, type GameFace } from '../src/games/faces';
import { useAuth, useRestoreOnce } from '../src/net/api';
import { Icon, type IconName } from '../src/ui/Icon';
import { Btn, Txt } from '../src/ui/parts';
import { Face } from '../src/ui/Crest';
import { AppBackdrop, Panel, Rule, WoodFill } from '../src/ui/surface';
import { A, R, S, glow, lift } from '../src/ui/theme';

/**
 * Sảnh.
 *
 * Bố cục học từ các app cờ online đông người dùng: trên cùng là người chơi,
 * giữa là **một** nút chơi to, dưới là lưới bộ môn — chín lần mở app thì tám
 * lần người ta chỉ muốn bấm "chơi tiếp", không muốn đọc danh mục.
 *
 * Còn chất liệu thì lấy từ chính cái bàn cờ gỗ: mọi tấm ở đây là gỗ có vân,
 * có vát cạnh, viền chỉ vàng. Một sảnh game cờ mà dựng bằng thẻ xám bo góc
 * thì nhìn như trang cài đặt.
 */

const READY = new Set(registry.catalog().map((s) => s.id));

export default function Lobby() {
  const router = useRouter();
  /** Chế độ online đang chọn bộ môn, hoặc 'join' đang nhập mã. */
  const [sheet, setSheet] = useState<'quick' | 'create' | 'join' | null>(null);
  useRestoreOnce();
  const { me } = useAuth();
  /** Ba chế độ online đều cần danh tính, nên chưa đăng nhập là đưa sang màn đăng nhập. */
  const online = (go: () => void) => (me ? go() : router.push('/auth'));
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 460);
  const scroller = useRef<ScrollView>(null);
  const gridY = useRef(0);

  return (
    <View style={{ flex: 1 }}>
      <AppBackdrop width={w} height={height} />
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: insets.top + S.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tên nền tảng khắc chữ serif, có đường chỉ vàng bên dưới như khung
            viền một bàn cờ gỗ. */}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt size={13} weight="display" color={A.gold} style={{ letterSpacing: 6 }}>
            CỜ VIỆT
          </Txt>
          <Rule width={w * 0.5} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cài đặt"
          hitSlop={10}
          onPress={() => router.push(me ? '/me?tab=cai-dat' : '/auth')}
          style={{ position: 'absolute', right: S.lg, top: insets.top + S.md }}
        >
          <Icon name="settings" size={20} color={A.inkFaint} />
        </Pressable>

        <View style={{ paddingHorizontal: S.lg, paddingTop: S.lg, gap: S.md }}>
          <Panel radius={R.md} tone={1} seed={9} style={lift(0.4, 12, 5)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={me ? 'Trang cá nhân' : 'Đăng nhập'}
              onPress={() => router.push(me ? '/me' : '/auth')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}
            >
              {me ? (
                <Face avatar={me.avatar} id={me.id} size={46} />
              ) : (
                <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1.2, borderColor: A.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="user" size={22} color={A.inkFaint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Txt size={17} weight="display">
                  {me?.name ?? 'Chưa đăng nhập'}
                </Txt>
                {/* Không bịa elo hay số trận. Chưa có xếp hạng thì nói là chưa có. */}
                <Txt size={11.5} color={A.inkFaint}>
                  {me ? 'Chưa xếp hạng · đã đăng nhập' : 'Đăng nhập để chơi với người thật'}
                </Txt>
              </View>
              <Icon name="chevron" size={17} color={A.inkFaint} />
            </Pressable>
          </Panel>

          <Btn
            size="lg"
            icon="robot"
            label="Đấu với máy"
            sub="Cờ caro · ba mức khó"
            onPress={() => router.push('/play/co-caro')}
          />

          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Mode icon="bolt" label="Ghép cặp" onPress={() => online(() => setSheet('quick'))} />
            <Mode icon="door" label="Tạo phòng" onPress={() => online(() => setSheet('create'))} />
            <Mode icon="key" label="Vào mã" onPress={() => online(() => setSheet('join'))} />
          </View>

          <Txt size={11} color={A.inkFaint} center style={{ paddingHorizontal: S.sm }}>
            {me ? 'Ghép cặp tính xếp hạng. Phòng riêng mở bằng mã thì không.' : 'Ba chế độ trên cần đăng nhập. Đấu với máy thì không.'}
          </Txt>
        </View>

        <View
          onLayout={(e) => {
            gridY.current = e.nativeEvent.layout.y;
          }}
          style={{ alignItems: 'center', paddingTop: S.xxl, paddingBottom: S.md, gap: 2 }}
        >
          <Txt size={20} weight="display" color={A.ink}>
            Cờ hai người
          </Txt>
          <Txt size={11.5} color={A.inkFaint}>
            {READY.size} trên {FACES.length} đã mở
          </Txt>
          <Rule width={w * 0.38} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, paddingHorizontal: S.lg }}>
          {FACES.map((f, i) => (
            <GameCard
              key={f.id}
              face={f}
              seed={i * 17 + 5}
              ready={READY.has(f.id)}
              onPress={() => READY.has(f.id) && router.push(`/play/${f.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNav
        width={w}
        insetBottom={insets.bottom}
        onHome={() => scroller.current?.scrollTo({ y: 0, animated: true })}
        onGrid={() => scroller.current?.scrollTo({ y: gridY.current, animated: true })}
        onMe={() => router.push(me ? '/me' : '/auth')}
      />

      {/* Đặt sau `BottomNav`: tấm trượt phải nằm **trên** thanh điều hướng.
          Để trước thì thanh dưới cùng đè lên mất nút Đóng của tấm. */}
      {/* Đóng tấm **trước khi** chuyển màn. Sảnh vẫn nằm dưới trong ngăn xếp,
          nên quay lui từ ván đấu là thấy lại đúng tấm đang mở hôm trước. */}
      {sheet === 'join' ? (
        <CodeSheet
          onClose={() => setSheet(null)}
          onGo={(code) => {
            setSheet(null);
            router.push(`/online/join?code=${code}`);
          }}
        />
      ) : sheet ? (
        <PickGameSheet
          mode={sheet}
          onClose={() => setSheet(null)}
          onPick={(id) => {
            const m = sheet;
            setSheet(null);
            router.push(`/online/${m}?game=${id}`);
          }}
        />
      ) : null}
    </View>
  );
}

/** Một trong ba cách vào ván với người thật. */
function Mode({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, borderRadius: R.md }}>
      <Panel radius={R.md} tone={0} seed={label.length * 7}>
        <View style={{ gap: 5, paddingVertical: S.md, alignItems: 'center' }}>
          <Icon name={icon} size={19} color={A.gold} />
          <Txt size={11.5} weight="semi" color={A.inkSoft}>
            {label}
          </Txt>
        </View>
      </Panel>
    </Pressable>
  );
}

/**
 * Chọn bộ môn để ghép cặp hoặc mở phòng.
 *
 * Chỉ liệt kê bộ môn **máy chủ có engine**. Cho chọn một bộ môn chưa cài rồi
 * để máy chủ trả `NO_GAME` là bắt người chơi đi một vòng mới biết mình không
 * chơi được.
 */
function PickGameSheet({ mode, onClose, onPick }: { mode: 'quick' | 'create'; onClose: () => void; onPick: (id: string) => void }) {
  const open = FACES.filter((f) => READY.has(f.id));
  return (
    <Sheet
      title={mode === 'quick' ? 'Ghép cặp bộ môn nào?' : 'Mở phòng bộ môn nào?'}
      sub={mode === 'quick' ? 'Vào hàng chờ, có người là vào ván ngay' : 'Nhận một mã năm ký tự để mời bạn'}
      onClose={onClose}
    >
      {open.map((f) => (
        <Pressable key={f.id} onPress={() => onPick(f.id)} accessibilityRole="button" accessibilityLabel={f.nameVi} style={{ borderRadius: R.md }}>
          <Panel radius={R.md} tone={1} seed={f.id.length * 11}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
              <View style={{ width: 54, height: 35, borderRadius: 6, overflow: 'hidden' }}>
                <f.Motif />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="display">
                  {f.nameVi}
                </Txt>
                <Txt size={10.5} color={A.inkFaint}>
                  {f.minutes}
                </Txt>
              </View>
              <Icon name="chevron" size={16} color={A.inkFaint} />
            </View>
          </Panel>
        </Pressable>
      ))}
    </Sheet>
  );
}

/** Nhập mã phòng bạn đọc cho. */
function CodeSheet({ onClose, onGo }: { onClose: () => void; onGo: (code: string) => void }) {
  const [code, setCode] = useState('');
  const ok = code.trim().length === 5;
  return (
    <Sheet title="Vào bằng mã" sub="Năm ký tự bạn của bạn đọc cho" onClose={onClose}>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCDE"
        placeholderTextColor={A.inkFaint}
        accessibilityLabel="Mã phòng"
        style={{
          borderWidth: 1.4,
          borderColor: A.goldDeep,
          backgroundColor: A.panelLo,
          borderRadius: R.md,
          color: A.gold,
          fontSize: 30,
          letterSpacing: 10,
          textAlign: 'center',
          paddingVertical: S.md,
        }}
      />
      <Btn label="Vào phòng" disabled={!ok} onPress={() => onGo(code.trim())} />
    </Sheet>
  );
}

/** Tấm trượt từ dưới lên, dùng chung cho hai tấm ở trên. */
function Sheet({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        onPress={onClose}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 }}
      />
      <Panel radius={R.xl} tone={1} seed={71} style={lift(0.6, 30, -8)}>
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: insets.bottom + S.lg }}>
          <Txt size={18} weight="display">
            {title}
          </Txt>
          <Txt size={11.5} color={A.inkFaint} style={{ paddingBottom: S.xs }}>
            {sub}
          </Txt>
          {children}
          <Btn label="Đóng" tone="ghost" onPress={onClose} />
        </View>
      </Panel>
    </View>
  );
}

/**
 * Thẻ bộ môn: một bức tranh lồng khung gỗ.
 *
 * Nửa trên là chất liệu thật của game — mở cờ tướng ra thấy gỗ tre thì thẻ
 * cũng phải là gỗ tre — nhưng nó được **lồng khung**: bo góc, có viền chỉ
 * vàng mảnh, hở ra một vành gỗ quanh mép. Hình tràn sát mép thẻ thì trông
 * như ảnh dán; lồng khung thì trông như hiện vật bày trong tủ.
 */
function GameCard({
  face,
  ready,
  seed,
  onPress,
}: {
  face: GameFace;
  ready: boolean;
  seed: number;
  onPress: () => void;
}) {
  const Motif = face.Motif;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? `Chơi ${face.nameVi}` : `${face.nameVi}, chưa mở`}
      disabled={!ready}
      onPress={onPress}
      style={({ pressed }) => [
        // Bo góc phải khai ngay ở đây, chỗ mang bóng đổ. Bóng đổ bám theo bo
        // góc của chính phần tử mang nó: để trống thì bóng chạy theo hình
        // chữ nhật vuông góc, và ở bốn góc nó thò ra ngoài thành một đường
        // viền vuông bao quanh cái thẻ bo tròn.
        { width: '47.5%', borderRadius: R.md, transform: [{ translateY: pressed ? 1 : 0 }] },
        ready ? glow(0.22, 12) : lift(0.35, 10, 4),
      ]}
    >
      <Panel radius={R.md} tone={ready ? 2 : 1} seed={seed} hairline={false} style={{ borderWidth: 1.2, borderColor: ready ? A.goldDeep : A.lineSoft }}>
        <View style={{ padding: 6 }}>
          <View
            style={{
              // Khung ảnh phải đúng tỉ lệ 100:64 của hình, không đặt chiều
              // cao cố định. Lệch tỉ lệ thì hình co lại cho vừa chiều cao và
              // hở ra hai bên; chỗ hở lộ nền phẳng của thẻ, thành một cái
              // khung vuông thứ hai nằm bên trong khung bo góc.
              aspectRatio: 100 / 64,
              borderRadius: 7,
              overflow: 'hidden',
              backgroundColor: face.surface,
              borderWidth: 1,
              borderColor: ready ? A.goldDeep : '#00000055',
              opacity: ready ? 1 : 0.7,
            }}
          >
            <Motif />
            {/* Bóng đổ của khung hắt vào trong hình, để hình lõm xuống dưới
                mặt gỗ chứ không nổi lên trên. */}
            <InsetShade />
            {/* Trạng thái nằm trên hình chứ không xen vào hàng nhãn: ba nhãn
                một hàng thì thẻ "2–4 người" bị xuống dòng, và hai thẻ cùng
                hàng cao thấp khác nhau. */}
            {ready ? null : (
              <View style={{ position: 'absolute', top: 6, right: 6 }}>
                <Chip label="Sắp có" muted />
              </View>
            )}
          </View>
        </View>
        <View style={{ paddingHorizontal: S.md, paddingBottom: S.md, paddingTop: 2, gap: 6 }}>
          <Txt size={15} weight="display" color={ready ? A.ink : A.inkSoft} numberOfLines={1}>
            {face.nameVi}
          </Txt>
          {/* Nhãn kiểu sảnh game nhiều người: chế độ, thời lượng ván, và
              trạng thái nếu chưa mở. Nhãn "chơi được" dán lên thẻ chơi được
              là nhãn thừa — thẻ sáng, có viền vàng, bấm được; tám thẻ kia mờ
              và ghi rõ "sắp có". Nhãn chỉ nên nói thứ nhìn vào chưa biết. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            <Chip label={face.mode} />
            <Chip label={face.minutes} />
          </View>
        </View>
      </Panel>
    </Pressable>
  );
}

/**
 * Nhãn nhỏ trên thẻ: khắc chìm vào mặt gỗ, không phải miếng dán nổi. Ba nhãn
 * cạnh nhau mà cái nào cũng có viền sáng thì chúng đánh nhau với tên game.
 */
function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: R.sm,
        backgroundColor: muted ? '#40290FEE' : '#00000038',
        borderWidth: muted ? 1 : 0,
        borderColor: A.goldDeep,
      }}
    >
      <Txt size={10} weight="semi" color={muted ? A.gold : A.inkFaint}>
        {label}
      </Txt>
    </View>
  );
}

/** Vệt tối hắt từ khung xuống mép trên của hình lồng khung. */
function InsetShade() {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18 }} pointerEvents="none">
      <Svg width="100%" height={18}>
        <Defs>
          <LinearGradient id="inset-shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={18} fill="url(#inset-shade)" />
      </Svg>
    </View>
  );
}

/** Thanh dưới ba mục, đặt trên một thanh gỗ có chỉ vàng ở mép trên. */
function BottomNav({
  width,
  insetBottom,
  onHome,
  onGrid,
  onMe,
}: {
  width: number;
  insetBottom: number;
  onHome: () => void;
  onGrid: () => void;
  onMe: () => void;
}) {
  const h = 56 + insetBottom;
  const items: { icon: IconName; label: string; onPress?: () => void; active?: boolean }[] = [
    { icon: 'home', label: 'Sảnh', onPress: onHome, active: true },
    { icon: 'grid', label: 'Bộ môn', onPress: onGrid },
    { icon: 'user', label: 'Tôi', onPress: onMe },
  ];
  return (
    <View style={{ height: h, flexDirection: 'row', overflow: 'hidden' }}>
      <WoodFill width={width} height={h} tone={1} seed={77} bevel={false} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.2, backgroundColor: A.goldDeep, opacity: 0.6 }} />
      {items.map((it) => (
        <Pressable
          key={it.label}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          disabled={!it.onPress}
          onPress={it.onPress}
          style={{ flex: 1, paddingTop: S.sm, paddingBottom: insetBottom + S.sm, alignItems: 'center', gap: 3 }}
        >
          <Icon name={it.icon} size={21} color={it.active ? A.gold : A.inkFaint} />
          <Txt size={10} weight="semi" color={it.active ? A.gold : A.inkFaint}>
            {it.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
