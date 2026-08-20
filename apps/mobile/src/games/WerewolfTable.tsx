import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Chip, Txt } from '../components/ui';
import { Chibi } from '../components/Chibi';
import { C, R, S } from '../theme';
import { BoardProps, GameLog } from './shared';

const ROLE_INFO: Record<string, { art: string; name: string; hint: string; color: string }> = {
  werewolf: { art: 'wolf', name: 'Sói', hint: 'Mỗi đêm chọn một dân làng để cắn', color: '#E9556D' },
  seer: { art: 'crystal', name: 'Tiên Tri', hint: 'Mỗi đêm soi 1 người xem có phải Sói', color: '#7C6BFF' },
  guard: { art: 'shield', name: 'Bảo Vệ', hint: 'Bảo vệ 1 người mỗi đêm, không lặp lại 2 đêm liền', color: '#2FA9F5' },
  witch: { art: 'potion', name: 'Phù Thuỷ', hint: 'Có bình cứu và bình độc, mỗi loại dùng 1 lần', color: '#39C77F' },
  hunter: { art: 'bow', name: 'Thợ Săn', hint: 'Khi chết có thể bắn theo 1 người', color: '#FF8A3D' },
  villager: { art: 'farmer', name: 'Dân Làng', hint: 'Không có kỹ năng — hãy suy luận và bỏ phiếu đúng', color: '#8E96A8' },
};

const PHASE_TEXT: Record<string, { title: string; art: string; colors: [string, string] }> = {
  night: { title: 'Đêm xuống', art: 'moon', colors: ['#3A2E6E', '#1C1636'] },
  day: { title: 'Trời sáng — thảo luận', art: 'sun', colors: ['#FFD9A0', '#FFF3E0'] },
  vote: { title: 'Bỏ phiếu treo cổ', art: 'ballot', colors: ['#FFB4A2', '#FFE5DC'] },
  result: { title: 'Kết thúc', art: 'flag-finish', colors: ['#C8B6FF', '#EDE7FF'] },
};

export default function WerewolfTable({ view, mySeat, send }: BoardProps) {
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

  return (
    <View style={{ gap: S.md }}>
      <LinearGradient colors={phase.colors} style={{ borderRadius: R.lg, padding: S.lg, gap: 4, alignItems: 'center' }}>
        <Chibi name={phase.art} size={38} />
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
            <Chibi name={role.art} size={30} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight="heading" color={role.color}>
                Bạn là {role.name}
              </Txt>
              <Txt size={11} color={C.inkSoft}>
                {role.hint}
              </Txt>
            </View>
            {!alive ? <Chip label="Đã chết" icon="💀" color={C.danger} soft="#FFE5E5" size={10} /> : null}
          </View>
        </Card>
      ) : null}

      {view.myRole === 'seer' && view.seerResults?.length ? (
        <Card style={{ gap: 4, borderColor: '#7C6BFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Chibi name="crystal" size={18} />
            <Txt size={13} weight="heading" color="#7C6BFF">
              Kết quả soi (chỉ bạn thấy)
            </Txt>
          </View>
          {view.seerResults.map((r: any, i: number) => (
            <Txt key={i} size={12} color={C.inkSoft}>
              Đêm {r.day}: {view.seats[r.target]?.name} {r.isWolf ? 'là SÓI 🐺' : 'không phải sói ✅'}
            </Txt>
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' }}>
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
                width: 88,
                padding: S.sm,
                borderRadius: R.md,
                alignItems: 'center',
                gap: 2,
                backgroundColor: selected ? C.primarySoft : s.alive ? C.surface : '#EFEAE4',
                borderWidth: 2,
                borderColor: selected ? C.primary : C.line,
                opacity: s.alive ? 1 : 0.55,
              }}
            >
              <Chibi name={s.alive ? 'smile' : 'skull'} size={26} />
              <Txt size={11} weight="bold" numberOfLines={1}>
                {s.name}
                {s.seat === mySeat ? ' (bạn)' : ''}
              </Txt>
              {s.role ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Chibi name={ROLE_INFO[s.role]?.art ?? 'farmer'} size={11} />
                  <Txt size={9} weight="bold" color={ROLE_INFO[s.role]?.color}>
                    {ROLE_INFO[s.role]?.name}
                  </Txt>
                </View>
              ) : (
                <Txt size={9} color={C.inkFaint}>
                  ???
                </Txt>
              )}
              {voteCount > 0 ? <Chip label={`${voteCount} phiếu`} color={C.danger} soft="#FFE5E5" size={9} /> : null}
            </Pressable>
          );
        })}
      </View>

      {view.phase === 'day' && alive ? (
        <Btn label="Sẵn sàng bỏ phiếu" icon="🗳️" style={{ alignSelf: 'center' }} onPress={() => send('ready_vote', {})} />
      ) : null}

      {view.winner ? (
        <Card style={{ alignItems: 'center', gap: 4, borderColor: C.primary }}>
          <Chibi name={view.winner === 'wolves' ? 'wolf' : 'house'} size={38} />
          <Txt size={18} weight="display">
            Phe {view.winner === 'wolves' ? 'Sói' : 'Dân làng'} chiến thắng!
          </Txt>
        </Card>
      ) : null}

      <GameLog log={view.log} />
    </View>
  );
}
