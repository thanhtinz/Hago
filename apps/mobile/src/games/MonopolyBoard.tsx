import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Btn, Card, Chip, Txt } from '../components/ui';
import { C, R, S, SEAT_COLORS } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

const SIZE = 320;

/** 28 ô xếp quanh khung vuông 8x8 (mỗi cạnh 7 ô). */
function tilePos(i: number, n: number, cell: number): { x: number; y: number } {
  const per = n / 4;
  const side = Math.floor(i / per);
  const k = i % per;
  const max = per;
  switch (side) {
    case 0:
      return { x: k * cell, y: 0 };
    case 1:
      return { x: max * cell, y: k * cell };
    case 2:
      return { x: (max - k) * cell, y: max * cell };
    default:
      return { x: 0, y: (max - k) * cell };
  }
}

const KIND_EMOJI: Record<string, string> = {
  start: '🚩',
  tax: '🧾',
  chance: '❓',
  jail: '🚔',
  gotojail: '👮',
  park: '🅿️',
};

export default function MonopolyBoard({ view, mySeat, send, deadline }: BoardProps) {
  const n = view.board.length;
  const cell = SIZE / (n / 4 + 1);
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const me = view.cash?.[mySeat];

  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PlayerStrip
          players={view.players}
          activeSeat={view.turnSeat}
          mySeat={mySeat}
          extra={(seat) => <Chip label={`$${view.cash[seat]?.cash ?? 0}`} color={C.inkSoft} soft={C.surfaceAlt} size={10} />}
        />
        <TurnTimer deadline={deadline} total={25} />
      </View>
      <TurnBanner
        yourTurn={yourTurn}
        text={view.over ? 'Kết thúc' : view.phase === 'decide' && yourTurn ? 'Mua đất không?' : yourTurn ? 'Tung xúc xắc!' : 'Chờ đối thủ...'}
      />

      <View style={{ alignItems: 'center' }}>
        <View style={{ width: SIZE, height: SIZE, backgroundColor: '#FFF6EA', borderRadius: R.lg, borderWidth: 3, borderColor: '#E7C79E' }}>
          {view.board.map((t: any, i: number) => {
            const p = tilePos(i, n, cell);
            const owner = view.owner[i];
            const here = view.cash.filter((c: any) => c.pos === i && !c.bankrupt);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: cell - 2,
                  height: cell - 2,
                  borderRadius: 5,
                  backgroundColor: t.color ?? '#FFFFFF',
                  borderWidth: owner != null ? 2 : 1,
                  borderColor: owner != null ? SEAT_COLORS[owner] : '#EBD6BC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 1,
                }}
              >
                {t.kind === 'property' ? (
                  <Txt size={7} weight="bold" center numberOfLines={2} color="#4A3B2A">
                    {t.name}
                  </Txt>
                ) : (
                  <Text style={{ fontSize: cell * 0.4 }}>{KIND_EMOJI[t.kind]}</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 1, marginTop: 1 }}>
                  {here.map((c: any) => (
                    <View key={c.seat} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: SEAT_COLORS[c.seat], borderWidth: 1, borderColor: '#fff' }} />
                  ))}
                </View>
              </View>
            );
          })}

          <View style={{ position: 'absolute', left: cell * 1.4, top: cell * 1.4, right: cell * 1.4, bottom: cell * 1.4, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={{ fontSize: 30 }}>🏦</Text>
            <Txt size={13} weight="display" color={C.rose}>
              Vòng {view.round}/{view.maxRounds}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(view.dice ?? [0, 0]).map((d: number, i: number) => (
                <View key={i} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.surface, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={16} weight="display">
                    {d || '–'}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {yourTurn && view.phase === 'decide' && view.pending ? (
        <Card style={{ gap: S.sm, borderColor: C.primary }}>
          <Txt size={15} weight="heading">
            {view.board[view.pending.tile].name}
          </Txt>
          <Txt size={12} color={C.inkSoft}>
            Giá ${view.pending.price} · Tiền thuê ${view.board[view.pending.tile].baseRent} · Bạn có ${me?.cash}
          </Txt>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Btn label="Mua" icon="🏠" tone="mint" onPress={() => send('buy', {})} disabled={(me?.cash ?? 0) < view.pending.price} />
            <Btn label="Bỏ qua" tone="ghost" onPress={() => send('skip', {})} />
          </View>
        </Card>
      ) : null}

      {yourTurn && view.phase === 'roll' ? <Btn label="Tung xúc xắc" icon="🎲" size="lg" style={{ alignSelf: 'center' }} onPress={() => send('roll', {})} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {view.cash.map((c: any) => (
          <View key={c.seat} style={{ backgroundColor: c.bankrupt ? '#F0EDE8' : C.surface, borderRadius: R.md, padding: S.md, borderWidth: 2, borderColor: SEAT_COLORS[c.seat], minWidth: 118, gap: 2 }}>
            <Txt size={12} weight="bold">
              {view.players[c.seat].name}
            </Txt>
            <Txt size={16} weight="display" color={SEAT_COLORS[c.seat]}>
              ${c.cash}
            </Txt>
            <Txt size={10} color={C.inkFaint}>
              {c.bankrupt ? 'Phá sản 💥' : `${c.properties.length} bất động sản`}
            </Txt>
            {c.jailTurns > 0 ? <Chip label={`Tù ${c.jailTurns} lượt`} icon="🚔" color={C.danger} soft="#FFE5E5" size={9} /> : null}
          </View>
        ))}
      </ScrollView>
      <GameLog log={view.log} />
    </View>
  );
}
