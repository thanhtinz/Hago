import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Chip, Txt } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { Art, ArtName } from '../components/Art';
import { DieFace, TokenDot } from '../components/Piece';
import { GameIcon } from '../components/GameIcon';
import { C, R, S, SEAT_COLORS, softShadow } from '../theme';
import { BoardProps, GameLog, PlayerStrip, TurnBanner, TurnTimer } from './shared';

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

/** Ô đặc biệt dùng asset game-icons thay vì icon nét. */
const KIND_ART: Record<string, ArtName> = {
  start: 'tile-start',
  tax: 'tile-tax',
  chance: 'tile-chance',
  jail: 'tile-jail',
  gotojail: 'tile-gotojail',
  park: 'tile-park',
};

export default function MonopolyBoard({ view, mySeat, send, deadline, space }: BoardProps) {
  const n = view.board.length;
  const SIZE = Math.max(260, Math.min(space.width - 20, space.height - 190));
  // Trừ viền 3px mỗi bên để hàng ô ngoài cùng nằm gọn trong khung.
  const cell = (SIZE - 6) / (n / 4 + 1);
  const yourTurn = view.turnSeat === mySeat && !view.over;
  const me = view.cash?.[mySeat];

  return (
    <View style={{ gap: S.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
        <LinearGradient
          colors={['#FFF6E6', '#F2DFC0']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[
            { width: SIZE, height: SIZE, borderRadius: R.lg, borderWidth: 3, borderColor: '#C79A5E' },
            softShadow(0.18, 16, 8),
          ]}
        >
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
                  <Art name={KIND_ART[t.kind] ?? 'tile-chance'} size={cell * 0.62} color="#6B5B45" hi="#FFF6E8" />
                )}
                <View style={{ flexDirection: 'row', gap: 1, marginTop: 1 }}>
                  {here.map((c: any) => (
                    <TokenDot key={c.seat} size={9} color={SEAT_COLORS[c.seat]} />
                  ))}
                </View>
              </View>
            );
          })}

          <View style={{ position: 'absolute', left: cell * 1.4, top: cell * 1.4, right: cell * 1.4, bottom: cell * 1.4, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <GameIcon name="monopoly" size={38} accent="#F2B33D" tint="#E9AFC0" />
            <Txt size={13} weight="display" color={C.rose}>
              Vòng {view.round}/{view.maxRounds}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(view.dice ?? [0, 0]).map((d: number, i: number) => (
                <DieFace key={i} value={d} size={32} color={d ? C.ink : C.inkFaint} />
              ))}
            </View>
          </View>
        </LinearGradient>
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
            <Btn label="Mua" icon="home" tone="mint" onPress={() => send('buy', {})} disabled={(me?.cash ?? 0) < view.pending.price} />
            <Btn label="Bỏ qua" tone="ghost" onPress={() => send('skip', {})} />
          </View>
        </Card>
      ) : null}

      {yourTurn && view.phase === 'roll' ? <Btn label="Tung xúc xắc" icon="dice" size="lg" style={{ alignSelf: 'center' }} onPress={() => send('roll', {})} /> : null}

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
              {c.bankrupt ? 'Đã phá sản' : `${c.properties.length} bất động sản`}
            </Txt>
            {c.jailTurns > 0 ? <Chip label={`Tù ${c.jailTurns} lượt`} icon="ban" color={C.danger} soft="#FFE5E5" size={9} /> : null}
          </View>
        ))}
      </ScrollView>
      <View style={{ flex: 1 }} />
      <GameLog log={view.log} />
    </View>
  );
}
