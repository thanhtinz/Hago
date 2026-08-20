import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GAME_GRADIENT, R, S, softShadow } from '../theme';
import { Txt } from './ui';
import { Bubbles, Gloss } from './decor';
import { GameIcon, GameIconName } from './GameIcon';
import { Icon } from './Icon';

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  art: string;
  category: string;
  avgMinutes: number;
}

/** Thẻ game cỡ lớn cho carousel "đang hot" — art chibi làm nhân vật chính. */
export function HotGameCard({
  game,
  onPress,
  livePlayers,
  rank,
}: {
  game: GameMeta;
  onPress?: () => void;
  livePlayers?: number;
  rank?: number;
}) {
  const grad = (GAME_GRADIENT[game.id] ?? ['#FFB199', '#FF0844']) as [string, string];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <LinearGradient
        colors={grad}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ width: 208, height: 244, borderRadius: 28, padding: S.lg, overflow: 'hidden' }, softShadow(0.18, 16, 8)]}
      >
        <Bubbles
          spec={[
            { size: 168, right: -34, bottom: -30, alpha: 0.2 },
            { size: 96, left: -40, top: -26, alpha: 0.14 },
          ]}
        />
        <Gloss opacity={0.13} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {rank ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill }}>
              <Txt size={11} weight="display" color={grad[0]}>
                #{rank}
              </Txt>
            </View>
          ) : (
            <View />
          )}
          {livePlayers ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6BFF9E' }} />
              <Txt size={10} weight="bold" color="#fff">
                {livePlayers} đang chơi
              </Txt>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Bệ tròn mờ để nhân vật nổi khỏi nền gradient */}
          <View style={{ position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.24)' }} />
          <GameIcon name={game.id as GameIconName} size={92} />
        </View>

        {/* Chuyển màu mờ dần ở chân thẻ để chữ trắng luôn đọc được mà không tạo mép cứng */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.2)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}
        />
        <Txt size={19} weight="display" color="#fff">
          {game.name}
        </Txt>
        <Txt size={11} weight="medium" color="rgba(255,255,255,0.92)" numberOfLines={1}>
          {game.tagline}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <Badge text={`${game.minPlayers}${game.maxPlayers > game.minPlayers ? `–${game.maxPlayers}` : ''} người`} />
          <Badge text={`~${game.avgMinutes} phút`} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Thẻ game trong lưới danh mục. */
export function GameCard({ game, onPress, hotCount }: { game: GameMeta; onPress?: () => void; hotCount?: number }) {
  const grad = (GAME_GRADIENT[game.id] ?? ['#FFB199', '#FF0844']) as [string, string];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: R.lg, padding: S.lg, gap: 3, overflow: 'hidden', minHeight: 172 }, softShadow(0.14, 14, 6)]}
      >
        <Bubbles spec={[{ size: 104, right: -22, bottom: -22, alpha: 0.2 }]} />
        <Gloss opacity={0.11} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.22)' }} />
            <GameIcon name={game.id as GameIconName} size={54} />
          </View>
          {hotCount ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.pill }}>
              <Icon name="flame" size={11} color="#fff" strokeWidth={2.4} />
              <Txt size={10} weight="bold" color="#fff">
                {hotCount}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt size={17} weight="heading" color="#fff" style={{ marginTop: 6 }}>
          {game.name}
        </Txt>
        <Txt size={11} weight="medium" color="rgba(255,255,255,0.9)" numberOfLines={2}>
          {game.tagline}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 'auto', paddingTop: 8, flexWrap: 'wrap' }}>
          <Badge text={`${game.minPlayers}${game.maxPlayers > game.minPlayers ? `–${game.maxPlayers}` : ''} người`} />
          <Badge text={`~${game.avgMinutes} phút`} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill }}>
      <Txt size={10} weight="bold" color="#fff">
        {text}
      </Txt>
    </View>
  );
}

export function LevelBadge({ level }: { level: number }) {
  return (
    <View style={{ backgroundColor: C.sun, paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.pill, borderWidth: 2, borderColor: '#fff' }}>
      <Txt size={11} weight="bold" color="#5A4200">
        Lv.{level}
      </Txt>
    </View>
  );
}
