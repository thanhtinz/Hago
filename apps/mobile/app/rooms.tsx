import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Chip, Empty, Field, Txt } from '../src/components/ui';
import { HeaderTabs, ScreenHeader } from '../src/components/ScreenHeader';
import { Icon, IconName } from '../src/components/Icon';
import { GameIcon, GameIconName } from '../src/components/GameIcon';
import { Art, ArtName } from '../src/components/Art';
import { Gloss } from '../src/components/decor';

import { C, GAME_GRADIENT, R, S, softShadow } from '../src/theme';
import { api, friendlyError } from '../src/lib/api';
import { emitAck } from '../src/lib/socket';
import { useStore } from '../src/state/store';

type Tab = 'find' | 'create';

/** Số ô người chơi hiển thị tối đa trên thẻ phòng. */
const SLOTS = 5;

export default function RoomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string; gameType?: string }>();
  const { showToast } = useStore();

  const [tab, setTab] = useState<Tab>(params.tab === 'create' ? 'create' : 'find');
  const [games, setGames] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // Bộ lọc tìm phòng
  const [filterGame, setFilterGame] = useState<string>(params.gameType ?? '');
  const [onlyFree, setOnlyFree] = useState(true);
  const [code, setCode] = useState('');
  const [pwPrompt, setPwPrompt] = useState<any>(null);
  const [pwInput, setPwInput] = useState('');

  // Cấu hình tạo phòng
  const [newGame, setNewGame] = useState<string>(params.gameType ?? 'caro');
  const [mode, setMode] = useState<'custom' | 'ranked'>('custom');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [boardSize, setBoardSize] = useState(15);
  const [duration, setDuration] = useState(90);

  useEffect(() => {
    api<{ games: any[] }>('/api/games').then((r) => {
      setGames(r.games);
      const g = r.games.find((x) => x.id === newGame);
      if (g && !maxPlayers) setMaxPlayers(g.maxPlayers);
    });
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api<{ rooms: any[] }>(`/api/rooms${filterGame ? `?gameType=${filterGame}` : ''}`);
      setRooms(r.rooms);
    } finally {
      setBusy(false);
    }
  }, [filterGame]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }, [load]),
  );

  const meta = games.find((g) => g.id === newGame);

  const enter = async (payload: any) => {
    const res: any = await emitAck('room.join', payload);
    if (!res?.ok) {
      if (res?.error === 'WRONG_PASSWORD') return showToast('Sai mật khẩu phòng', 'warn');
      return showToast(friendlyError(res?.error ?? 'ROOM_NOT_FOUND'), 'warn');
    }
    setPwPrompt(null);
    setPwInput('');
    router.push(`/room/${res.room.id}`);
  };

  const joinRoom = (room: any) => {
    if (room.hasPassword) {
      setPwPrompt(room);
      return;
    }
    enter({ roomId: room.id });
  };

  const joinByCode = () => {
    if (code.trim().length < 4) return showToast('Mã phòng gồm 6 ký tự', 'warn');
    enter({ code: code.trim().toUpperCase() });
  };

  const createRoom = async () => {
    const config: Record<string, unknown> = {};
    if (newGame === 'caro') config.size = boardSize;
    if (newGame === 'sheep') config.durationSeconds = duration;

    const res: any = await emitAck('room.create', {
      gameType: newGame,
      mode,
      isPrivate,
      password: isPrivate && password ? password : null,
      maxPlayers: maxPlayers || undefined,
      config,
    });
    if (!res?.ok) return showToast(friendlyError(res?.error ?? 'NETWORK'), 'warn');
    showToast(`Đã tạo phòng ${res.room.code}`);
    router.push(`/room/${res.room.id}`);
  };

  const visible = rooms.filter((r) => (onlyFree ? r.players.length < r.maxPlayers : true));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Phòng chơi" icon="door" subtitle="Tìm phòng đang mở hoặc tự mở phòng mời bạn bè">
        <HeaderTabs
          tabs={[
            { id: 'find', label: `Tìm phòng (${visible.length})` },
            { id: 'create', label: 'Tạo phòng' },
          ]}
          active={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </ScreenHeader>

      {tab === 'find' ? (
        <ScrollView
          contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.primary} />}
        >
          <Card style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="key" size={19} color={C.primary} strokeWidth={2.2} />
              <Txt size={15} weight="heading">
                Vào bằng mã phòng
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  placeholder="VD: A7K2QP"
                  autoCapitalize="characters"
                  maxLength={6}
                  onSubmitEditing={joinByCode}
                />
              </View>
              <Btn label="Vào" icon="arrow-right" onPress={joinByCode} />
            </View>
          </Card>

          {/* Lọc theo game */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, height: 48 }}
            contentContainerStyle={{ gap: 8, alignItems: 'center' }}
          >
            <FilterChip label="Tất cả" active={filterGame === ''} onPress={() => setFilterGame('')} icon="grid" />
            {games.map((g) => (
              <FilterChip
                key={g.id}
                label={g.name}
                game={g.id}
                active={filterGame === g.id}
                onPress={() => setFilterGame(filterGame === g.id ? '' : g.id)}
              />
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt size={12} weight="bold" color={C.inkSoft}>
              Chỉ hiện phòng còn chỗ
            </Txt>
            <Switch value={onlyFree} onValueChange={setOnlyFree} trackColor={{ true: C.primary }} />
          </View>

          {visible.length ? (
            visible.map((r) => {
              const g = games.find((x) => x.id === r.gameType);
              const grad = (GAME_GRADIENT[r.gameType] ?? ['#eee', '#ddd']) as [string, string];
              const full = r.players.length >= r.maxPlayers;
              return (
                <Card key={r.id} style={{ gap: S.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                    <LinearGradient
                      colors={grad}
                      style={{ width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                    >
                      <Gloss opacity={0.15} angle="top" />
                      <Art name={`game-${r.gameType}` as ArtName} size={34} color="#fff" shadow />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Txt size={15} weight="heading">
                        {g?.name ?? r.gameType}
                      </Txt>
                      <View style={{ flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                        <Chip label={`#${r.code}`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />
                        <Chip
                          label={r.mode === 'ranked' ? 'Xếp hạng' : r.mode === 'custom' ? 'Tự do' : 'Thường'}
                          color={C.secondaryDark}
                          soft={C.secondarySoft}
                          size={10}
                        />
                        {r.hasPassword ? <Chip label="Có mật khẩu" icon="lock" color="#9A6B00" soft={C.sunSoft} size={10} /> : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Txt size={17} weight="display" color={full ? C.danger : C.mint}>
                        {r.players.length}/{r.maxPlayers}
                      </Txt>
                      <Txt size={10} color={C.inkFaint}>
                        người
                      </Txt>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {r.players.slice(0, SLOTS).map((p: any, i: number) => (
                        <View key={p.user.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                          <Avatar seed={p.user.avatarSeed} styleName={p.user.avatarStyle} size={30} ring={C.surface} />
                        </View>
                      ))}
                      {/* Phòng đông (Ma Sói tới 16 người) chỉ hiện tối đa 5 chỗ rồi gộp phần dư. */}
                      {Array.from(
                        { length: Math.max(0, Math.min(SLOTS, r.maxPlayers) - r.players.length) },
                        (_, i) => (
                          <View
                            key={`e${i}`}
                            style={{
                              marginLeft: -10,
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              borderWidth: 2,
                              borderStyle: 'dashed',
                              borderColor: C.line,
                              backgroundColor: C.surface,
                            }}
                          />
                        ),
                      )}
                      {r.maxPlayers > SLOTS ? (
                        <Txt size={11} weight="bold" color={C.inkFaint} style={{ marginLeft: 8 }}>
                          +{r.maxPlayers - Math.max(SLOTS, r.players.length)} chỗ
                        </Txt>
                      ) : null}
                    </View>
                    <Btn label={full ? 'Đã đầy' : 'Vào phòng'} size="sm" disabled={full} onPress={() => joinRoom(r)} />
                  </View>
                </Card>
              );
            })
          ) : (
            <Card>
              <Empty
                icon="door"
                title="Chưa có phòng nào đang mở"
                hint="Tạo phòng mới hoặc bấm nút vàng ở giữa thanh dưới để hệ thống tự ghép đối thủ"
              />
              <Btn label="Tạo phòng ngay" icon="plus" full onPress={() => setTab('create')} />
            </Card>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: insets.bottom + 40 }}>
          <Card style={{ gap: S.md }}>
            <Txt size={15} weight="heading">
              Chọn game
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
              {games.map((g) => {
                const active = newGame === g.id;
                const grad = (GAME_GRADIENT[g.id] ?? ['#eee', '#ddd']) as [string, string];
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setNewGame(g.id);
                      setMaxPlayers(g.maxPlayers);
                      if (!g.modes.includes('ranked')) setMode('custom');
                    }}
                    style={{ width: '31%', alignItems: 'center', gap: 4 }}
                  >
                    <LinearGradient
                      colors={active ? grad : [C.surfaceAlt, C.surfaceAlt]}
                      style={[
                        { width: '100%', aspectRatio: 1, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: active ? grad[0] : C.line },
                        active ? softShadow(0.14, 10, 4) : null,
                      ]}
                    >
                      <Art name={`game-${g.id}` as ArtName} size={40} color={active ? '#fff' : C.inkFaint} shadow={active} />
                    </LinearGradient>
                    <Txt size={10} weight={active ? 'bold' : 'medium'} color={active ? C.ink : C.inkFaint} center numberOfLines={1}>
                      {g.name}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {meta ? (
            <Card style={{ gap: S.lg }}>
              <View>
                <Txt size={15} weight="heading">
                  Luật chơi
                </Txt>
                <Txt size={12} color={C.inkSoft}>
                  {meta.tagline} · {meta.category}
                </Txt>
              </View>

              <View style={{ gap: 8 }}>
                <Txt size={12} weight="bold" color={C.inkSoft}>
                  Chế độ
                </Txt>
                <View style={{ flexDirection: 'row', gap: S.sm }}>
                  {(['custom', 'ranked'] as const)
                    .filter((m) => m === 'custom' || meta.modes.includes('ranked'))
                    .map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setMode(m)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: R.md,
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: mode === m ? C.primary : C.line,
                          backgroundColor: mode === m ? C.primarySoft : C.surface,
                        }}
                      >
                        <Txt size={13} weight="bold">
                          {m === 'custom' ? 'Tự do' : 'Xếp hạng'}
                        </Txt>
                        <Txt size={10} color={C.inkFaint}>
                          {m === 'custom' ? 'Không tính điểm' : 'Ăn/mất điểm rank'}
                        </Txt>
                      </Pressable>
                    ))}
                </View>
              </View>

              {meta.maxPlayers > meta.minPlayers ? (
                <View style={{ gap: 8 }}>
                  <Txt size={12} weight="bold" color={C.inkSoft}>
                    Số người tối đa
                  </Txt>
                  <Stepper
                    value={maxPlayers || meta.maxPlayers}
                    min={meta.minPlayers}
                    max={meta.maxPlayers}
                    onChange={setMaxPlayers}
                    unit="người"
                  />
                </View>
              ) : null}

              {newGame === 'caro' ? (
                <View style={{ gap: 8 }}>
                  <Txt size={12} weight="bold" color={C.inkSoft}>
                    Kích thước bàn cờ
                  </Txt>
                  <Stepper value={boardSize} min={9} max={19} step={2} onChange={setBoardSize} unit={`× ${boardSize} ô`} />
                </View>
              ) : null}

              {newGame === 'sheep' ? (
                <View style={{ gap: 8 }}>
                  <Txt size={12} weight="bold" color={C.inkSoft}>
                    Thời lượng vòng đấu
                  </Txt>
                  <Stepper value={duration} min={45} max={180} step={15} onChange={setDuration} unit="giây" />
                </View>
              ) : null}


              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Txt size={13} weight="bold">
                    Phòng riêng tư
                  </Txt>
                  <Txt size={11} color={C.inkFaint}>
                    Không hiện trong danh sách, chỉ vào bằng mã
                  </Txt>
                </View>
                <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: C.primary }} />
              </View>

              {isPrivate ? (
                <Field
                  label="Mật khẩu phòng (không bắt buộc)"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Để trống nếu chỉ cần mã phòng"
                  autoCapitalize="none"
                />
              ) : null}

              <Btn label="Tạo phòng" icon="home" size="lg" full onPress={createRoom} />
              <Txt size={11} color={C.inkFaint} center>
                Sau khi tạo, chia sẻ mã phòng 6 ký tự cho bạn bè hoặc mời trực tiếp từ danh sách bạn.
              </Txt>
            </Card>
          ) : null}
        </ScrollView>
      )}

      {/* Nhập mật khẩu khi vào phòng khoá */}
      <Modal visible={!!pwPrompt} transparent animationType="fade" onRequestClose={() => setPwPrompt(null)}>
        <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
          <Card style={{ width: '100%', maxWidth: 360, gap: S.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="lock" size={21} color={C.primary} strokeWidth={2.1} />
              <Txt size={16} weight="heading">
                Phòng #{pwPrompt?.code} có mật khẩu
              </Txt>
            </View>
            <Field
              value={pwInput}
              onChangeText={setPwInput}
              placeholder="Nhập mật khẩu phòng"
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={() => enter({ roomId: pwPrompt.id, password: pwInput })}
            />
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Btn label="Huỷ" tone="ghost" onPress={() => setPwPrompt(null)} />
              <Btn label="Vào phòng" style={{ flex: 1 }} full onPress={() => enter({ roomId: pwPrompt.id, password: pwInput })} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({ label, active, onPress, icon, game }: { label: string; active: boolean; onPress: () => void; icon?: IconName; game?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: R.pill,
        backgroundColor: active ? C.primarySoft : C.surface,
        borderWidth: 2,
        borderColor: active ? C.primary : C.line,
      }}
    >
      {game ? <Art name={`game-${game}` as ArtName} size={17} color={active ? C.primaryDark : C.inkFaint} /> : icon ? <Icon name={icon} size={15} color={active ? C.primaryDark : C.inkSoft} strokeWidth={2.2} /> : null}
      <Txt size={12} weight="bold" color={active ? C.primaryDark : C.inkSoft}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const btn = (label: string, delta: number, disabled: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      style={{
        width: 40,
        height: 40,
        borderRadius: R.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? C.surfaceAlt : C.primarySoft,
        borderWidth: 2,
        borderColor: disabled ? C.line : C.primary,
      }}
    >
      <Txt size={18} weight="display" color={disabled ? C.inkFaint : C.primaryDark}>
        {label}
      </Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      {btn('−', -step, value <= min)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Txt size={20} weight="display">
          {value}
        </Txt>
        {unit ? (
          <Txt size={11} color={C.inkFaint}>
            {unit}
          </Txt>
        ) : null}
      </View>
      {btn('+', step, value >= max)}
    </View>
  );
}
