import React from 'react';
import { ScrollView, View } from 'react-native';
import { Icon } from './Icon';
import { Txt } from './ui';
import { C, R, softShadow } from '../theme';

/**
 * Nhánh đấu loại trực tiếp: mỗi vòng một cột, cột cuối là chung kết.
 *
 * Cuộn ngang vì bảng 16 người có 4 vòng, nhét vừa bề ngang điện thoại thì chữ
 * bé đến mức không đọc được. Dùng chung cho giải chung lẫn giải của bang.
 */
export function Bracket({ t, meId }: { t: any; meId?: string }) {
  const name = (id: string | null) =>
    id ? t.players.find((p: any) => p.user.id === id)?.user.displayName ?? '—' : 'Chờ';
  const rounds = Array.from({ length: t.rounds }, (_, i) =>
    t.bracket.filter((m: any) => m.round === i + 1).sort((a: any, b: any) => a.slot - b.slot),
  );
  const roundLabel = (i: number) =>
    i === t.rounds - 1 ? 'Chung kết' : i === t.rounds - 2 ? 'Bán kết' : `Vòng ${i + 1}`;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
      {rounds.map((ms, i) => (
        <View key={i} style={{ gap: 8, justifyContent: 'space-around' }}>
          <Txt size={10} weight="bold" color={C.inkFaint} center>
            {roundLabel(i)}
          </Txt>
          {ms.map((m: any) => {
            // Cặp chỉ có một người: người đó được miễn vòng này, nói thẳng ra
            // thay vì để một ô trống trông như lỗi tải dữ liệu.
            const bye = i === 0 && !!m.winnerId && (!m.p1 || !m.p2);
            return (
              <View
                key={m.slot}
                style={[
                  { width: 132, borderRadius: R.md, borderWidth: 2, borderColor: C.line, overflow: 'hidden' },
                  m.winnerId ? null : softShadow(0.1, 6, 2),
                ]}
              >
                {[m.p1, m.p2].map((pid: string | null, k: number) => {
                  const won = !!m.winnerId && m.winnerId === pid;
                  const lost = !!m.winnerId && !!pid && m.winnerId !== pid;
                  return (
                    <View
                      key={k}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: won ? C.mintSoft : C.surface,
                        borderTopWidth: k ? 1 : 0,
                        borderColor: C.line,
                        opacity: lost ? 0.55 : 1,
                      }}
                    >
                      {/* Người thắng có dấu tích, không chỉ đổi màu nền */}
                      {won ? <Icon name="check" size={12} color="#1F7A50" strokeWidth={3} /> : null}
                      <Txt
                        size={11}
                        weight={won ? 'bold' : 'medium'}
                        numberOfLines={1}
                        style={{ flex: 1 }}
                        color={pid === meId ? C.primary : bye && !pid ? C.inkFaint : C.ink}
                      >
                        {bye && !pid ? 'Miễn vòng' : name(pid)}
                      </Txt>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
