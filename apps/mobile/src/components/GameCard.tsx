import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GAME_GRADIENT, R, S, glowShadow, softShadow } from '../theme';
import { Txt } from './ui';
import { Bubbles, Gloss } from './decor';
import { ArtToken } from './ArtToken';
import { ArtName } from './Art';
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
        style={[{ width: 214, height: 258, borderRadius: 30, padding: S.lg, overflow: 'hidden' }, glowShadow(grad[0], 0.4, 22, 12)]}
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
          {/* Quầng sáng sau đồng xu để khối art tách hẳn khỏi nền gradient */}
          <View style={{ position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.14)' }} />
          <ArtToken name={`game-${game.id}` as ArtName} size={112} art={68} shadow={0.26} />
        </View>

        {/* Chuyển màu mờ dần ở chân thẻ để chữ trắng luôn đọc được mà không tạo mép cứng */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.32)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 132 }}
        />
        <Txt size={20} weight="display" color="#fff">
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
        style={[{ borderRadius: 26, padding: S.lg, gap: 3, overflow: 'hidden', minHeight: 182 }, glowShadow(grad[0], 0.34, 18, 9)]}
      >
        <Bubbles spec={[{ size: 104, right: -22, bottom: -22, alpha: 0.2 }]} />
        <Gloss opacity={0.11} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <ArtToken name={`game-${game.id}` as ArtName} size={68} art={42} shadow={0.2} />
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
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 }}
        />
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
