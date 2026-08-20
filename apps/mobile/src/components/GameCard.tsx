import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GAME_GRADIENT, R, S, softShadow } from '../theme';
import { Txt } from './ui';

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  emoji: string;
  category: string;
  avgMinutes: number;
}

export function GameCard({
  game,
  onPress,
  wide,
  hotCount,
}: {
  game: GameMeta;
  onPress?: () => void;
  wide?: boolean;
  hotCount?: number;
}) {
  const grad = GAME_GRADIENT[game.id] ?? ['#FFB199', '#FF0844'];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            width: wide ? undefined : 148,
            borderRadius: R.lg,
            padding: S.lg,
            gap: 6,
            overflow: 'hidden',
          },
          softShadow(0.14, 14, 6),
        ]}
      >
        <View
          style={{
            position: 'absolute',
            right: -18,
            bottom: -18,
            width: 92,
            height: 92,
            borderRadius: 46,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        <Text style={{ fontSize: 34 }}>{game.emoji}</Text>
        <Txt size={17} weight="heading" color="#fff">
          {game.name}
        </Txt>
        <Txt size={11} weight="medium" color="rgba(255,255,255,0.9)" numberOfLines={2}>
          {game.tagline}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <Badge text={`👥 ${game.minPlayers}${game.maxPlayers > game.minPlayers ? `-${game.maxPlayers}` : ''}`} />
          <Badge text={`⏱ ${game.avgMinutes}p`} />
          {hotCount ? <Badge text={`🔥 ${hotCount}`} /> : null}
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
    <View
      style={{
        backgroundColor: C.sun,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: R.pill,
        borderWidth: 2,
        borderColor: '#fff',
      }}
    >
      <Txt size={11} weight="bold" color="#5A4200">
        Lv.{level}
      </Txt>
    </View>
  );
}
