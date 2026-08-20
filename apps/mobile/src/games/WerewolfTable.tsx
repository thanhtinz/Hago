import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Chip, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { Art, ArtName } from '../components/Art';
import { RoleArt, RoleName, SeatFace } from '../components/Piece';
import { DotPattern } from '../components/decor';
import { C, R, S, softShadow } from '../theme';
import { BoardProps, GameLog } from './shared';

const ROLE_INFO: Record<string, { name: string; hint: string; color: string }> = {
  werewolf: { name: 'Sói', hint: 'Mỗi đêm chọn một dân làng để cắn', color: '#E9556D' },
  seer: { name: 'Tiên Tri', hint: 'Mỗi đêm soi 1 người xem có phải Sói', color: '#7C6BFF' },
  guard: { name: 'Bảo Vệ', hint: 'Bảo vệ 1 người mỗi đêm, không lặp lại 2 đêm liền', color: '#2FA9F5' },
  witch: { name: 'Phù Thuỷ', hint: 'Có bình cứu và bình độc, mỗi loại dùng 1 lần', color: '#39C77F' },
  hunter: { name: 'Thợ Săn', hint: 'Khi chết có thể bắn theo 1 người', color: '#FF8A3D' },
  villager: { name: 'Dân Làng', hint: 'Không có kỹ năng — hãy suy luận và bỏ phiếu đúng', color: '#8E96A8' },
};

/** Mỗi vai một asset riêng trong bộ game-icons. */
function RoleMark({ role, size, color }: { role: string; size: number; color: string }) {
  if (!ROLE_INFO[role]) return null;
  return <RoleArt role={role as RoleName} size={size} color={color} />;
}

const PHASE_TEXT: Record<string, { title: string; art: ArtName; colors: [string, string] }> = {
  night: { title: 'Đêm xuống', art: 'moon', colors: ['#3A2E6E', '#1C1636'] },
  day: { title: 'Trời sáng — thảo luận', art: 'sun', colors: ['#FFD9A0', '#FFF3E0'] },
  vote: { title: 'Bỏ phiếu treo cổ', art: 'vote', colors: ['#FFB4A2', '#FFE5DC'] },
  result: { title: 'Kết thúc', art: 'win', colors: ['#C8B6FF', '#EDE7FF'] },
};

export default function WerewolfTable({ view, mySeat, send, space }: BoardProps) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, (view.phaseEndsAt ?? 0) - Date.now())), 250);
    return () => clearInterval(t);
  }, [view.phaseEndsAt]);

  const phase = PHASE_TEXT[view.phase] ?? PHASE_TEXT.day;
  const role = view.myRole ? ROLE_INFO[view.myRole] : null;
  const alive = view.seats?.find((s: any) => s.seat === mySeat)?.alive;
  const night = view.phase === 'night';
  const dark = night;

  const canAct = alive && ((night && view.myRole && view.myRole !== 'villager' && view.myRole !== 'hunter') || view.phase === 'vote');
  const actionType = night ? 'night_action' : 'vote';

  // Ghế chia lưới rộng để cả bàn làng lấp đầy màn hình dọc.
  const cols = view.seats.length <= 6 ? 2 : 3;
  // Trừ cả padding của khung bàn, không thì 2 cột không lọt và rơi xuống 1 cột.
  const seatW = Math.floor((space.width - S.md * 2 - S.sm * (cols + 1)) / cols);
  const faceSize = cols === 2 ? 52 : 38;

  return (
    <View style={{ gap: S.md }}>
      <LinearGradient colors={phase.colors} style={{ borderRadius: R.lg, padding: S.lg, gap: 4, alignItems: 'center' }}>
        <Art name={phase.art} size={44} color={dark ? '#FFD36E' : C.ink} hi={dark ? '#3A2E6E' : '#FFF3E0'} />
        <Txt size={20} weight="display" color={dark ? '#fff' : C.ink}>
          {phase.title}
        </Txt>
        <Txt size={12} weight="bold" color={dark ? 'rgba(255,255,255,0.8)' : C.inkSoft}>
          Ngày {view.day} · còn {Math.ceil(left / 1000)}s
        </Txt>
      </LinearGradient>

      {role ? (
        <Card style={{ gap: 4, borderColor: role.color }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RoleMark role={view.myRole} size={30} color={role.color} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight="heading" color={role.color}>
                Bạn là {role.name}
              </Txt>
              <Txt size={11} color={C.inkSoft}>
                {role.hint}
              </Txt>
            </View>
            {!alive ? <Chip label="Đã chết" icon="skull" color={C.danger} soft="#FFE5E5" size={10} /> : null}
          </View>
        </Card>
      ) : null}

      {view.myRole === 'seer' && view.seerResults?.length ? (
        <Card style={{ gap: 4, borderColor: '#7C6BFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="eye" size={17} color="#7C6BFF" strokeWidth={2.1} />
            <Txt size={13} weight="heading" color="#7C6BFF">
              Kết quả soi (chỉ bạn thấy)
            </Txt>
          </View>
          {view.seerResults.map((r: any, i: number) => (
            <Txt key={i} size={12} color={C.inkSoft}>
              Đêm {r.day}: {view.seats[r.target]?.name} — {r.isWolf ? 'LÀ SÓI' : 'không phải sói'}
            </Txt>
          ))}
        </Card>
      ) : null}

      {/* Ban đêm cả bàn làng chìm trong tối — nền sáng trắng làm hỏng không khí. */}
      <View
        style={[
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: S.sm,
            justifyContent: 'center',
            alignContent: 'center',
            padding: S.md,
            borderRadius: 26,
            backgroundColor: dark ? '#241A47' : 'rgba(255,255,255,0.45)',
            borderWidth: 2,
            borderColor: dark ? '#3B2E6B' : C.line,
            overflow: 'hidden',
          },
          dark ? softShadow(0.3, 18, 8) : null,
        ]}
      >
        {dark ? <DotPattern rows={6} cols={7} gap={54} color="rgba(255,255,255,0.10)" /> : null}
        {view.seats.map((s: any) => {
          const selected = night ? view.myNightTarget === s.seat : view.votes?.[mySeat] === s.seat;
          const voteCount = view.phase === 'vote' ? Object.values(view.votes ?? {}).filter((v) => v === s.seat).length : 0;
          const disabled = !canAct || !s.alive || s.seat === mySeat;
          return (
            <Pressable
              key={s.seat}
              disabled={disabled}
              onPress={() => send(actionType, { target: s.seat })}
              style={{
                width: seatW,
                paddingVertical: S.md,
                paddingHorizontal: S.sm,
                borderRadius: R.lg,
                alignItems: 'center',
                gap: 4,
                backgroundColor: selected
                  ? C.primarySoft
                  : dark
                    ? s.alive
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(255,255,255,0.04)'
                    : s.alive
                      ? C.surface
                      : '#EFEAE4',
                borderWidth: 2,
                borderColor: selected ? C.primary : dark ? 'rgba(255,255,255,0.16)' : C.line,
                opacity: s.alive ? 1 : 0.55,
              }}
            >
              {/* Ghế nào lộ vai thì hiện luôn asset của vai đó. */}
              {s.alive && s.role ? (
                <RoleArt role={s.role as RoleName} size={faceSize} color={ROLE_INFO[s.role]?.color ?? C.inkSoft} />
              ) : (
                <SeatFace alive={s.alive} size={faceSize} color={s.seat === mySeat ? C.primary : dark ? '#C7B3FF' : '#A98BFF'} />
              )}
              <Txt size={13} weight="bold" numberOfLines={1} color={dark ? '#F3EEFF' : C.ink}>
                {s.name}
                {s.seat === mySeat ? ' (bạn)' : ''}
              </Txt>
              {s.role ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <RoleMark role={s.role} size={12} color={ROLE_INFO[s.role]?.color ?? C.inkSoft} />
                  <Txt size={11} weight="bold" color={ROLE_INFO[s.role]?.color}>
                    {ROLE_INFO[s.role]?.name}
                  </Txt>
                </View>
              ) : (
                <Txt size={11} color={dark ? 'rgba(255,255,255,0.55)' : C.inkFaint}>
                  ???
                </Txt>
              )}
              {voteCount > 0 ? <Chip label={`${voteCount} phiếu`} color={C.danger} soft="#FFE5E5" size={9} /> : null}
            </Pressable>
          );
        })}
      </View>

      {view.phase === 'day' && alive ? (
        <Btn label="Sẵn sàng bỏ phiếu" icon="ballot" style={{ alignSelf: 'center' }} onPress={() => send('ready_vote', {})} />
      ) : null}

      {view.winner ? (
        <Card style={{ alignItems: 'center', gap: 4, borderColor: C.primary }}>
          {view.winner === 'wolves' ? <Art name="role-werewolf" size={44} color="#E9556D" /> : <Art name="role-villager" size={44} color={C.mint} />}
          <Txt size={18} weight="display">
            Phe {view.winner === 'wolves' ? 'Sói' : 'Dân làng'} chiến thắng!
          </Txt>
        </Card>
      ) : null}

      <GameLog log={view.log} />
    </View>
  );
}
