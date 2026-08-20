import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { C, R, softShadow } from '../theme';
import { Txt } from './ui';

export function Toast() {
  const { toast } = useStore();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, alignItems: 'center' }}
    >
      <View
        style={[
          {
            backgroundColor: toast.tone === 'warn' ? C.danger : C.ink,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: R.pill,
            maxWidth: '100%',
          },
          softShadow(0.2, 18, 8),
        ]}
      >
        <Txt size={13} weight="bold" color="#fff">
          {toast.text}
        </Txt>
      </View>
    </View>
  );
}
