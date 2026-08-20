import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, R, S, softShadow } from '../theme';
import { Txt } from './ui';
import { Icon, IconName } from './Icon';
import { Bubbles, Gloss } from './decor';

export interface BannerItem {
  id: string;
  title: string;
  description: string;
  colors: [string, string];
  icon: IconName;
  tag?: string;
  onPress?: () => void;
}

/** Carousel khuyến mãi / sự kiện ở đầu Trang chủ, tự chạy và có chấm chỉ trang. */
export function BannerCarousel({ items, height = 132 }: { items: BannerItem[]; height?: number }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 480) - S.lg * 2;
  const step = cardW + S.md;
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % items.length;
        ref.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, 4200);
    return () => clearInterval(t);
  }, [items.length, step]);

  if (!items.length) return null;

  return (
    <View style={{ gap: 8 }}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled={false}
        snapToInterval={step}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
      >
        {items.map((b) => (
          <Pressable key={b.id} onPress={b.onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <LinearGradient
              colors={b.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[{ width: cardW, height, borderRadius: 24, padding: S.lg, overflow: 'hidden', justifyContent: 'center' }, softShadow(0.16, 14, 6)]}
            >
              <Bubbles
                spec={[
                  { size: 130, right: -34, bottom: -46, alpha: 0.18 },
                  { size: 62, right: 74, top: -22, alpha: 0.14 },
                ]}
              />
              <Gloss opacity={0.2} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <View style={{ flex: 1, gap: 3 }}>
                  {b.tag ? (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill }}>
                      <Txt size={10} weight="bold" color="#fff">
                        {b.tag}
                      </Txt>
                    </View>
                  ) : null}
                  <Txt size={19} weight="display" color="#fff" numberOfLines={1}>
                    {b.title}
                  </Txt>
                  <Txt size={11} weight="medium" color="rgba(255,255,255,0.92)" numberOfLines={2}>
                    {b.description}
                  </Txt>
                </View>
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={b.icon} size={34} color="#fff" strokeWidth={1.9} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      {items.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}>
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? C.primary : C.line,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
