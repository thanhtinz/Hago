import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { backToLobby } from '../../src/nav';
import { OnlineTable } from '../../src/net/OnlineTable';
import type { Intent } from '../../src/net/useOnline';

/**
 * Ván online. Đường dẫn mang theo ý định:
 *
 *   /online/quick?game=co-caro     ghép cặp
 *   /online/create?game=co-ganh    mở phòng riêng, nhận mã
 *   /online/join?code=BXB99        vào bằng mã
 *
 * Để ý định nằm trong URL chứ không trong state toàn cục: tải lại trang giữa
 * ván là vào lại đúng chỗ cũ, và `playerId` lưu sẵn nối lại đúng ghế.
 */
export default function OnlineScreen() {
  const { mode, game, code } = useLocalSearchParams<{ mode: string; game?: string; code?: string }>();
  const router = useRouter();

  const intent: Intent =
    mode === 'join'
      ? { kind: 'join', code: String(code ?? '') }
      : mode === 'create'
        ? { kind: 'create', gameId: String(game ?? 'co-caro') }
        : { kind: 'quick', gameId: String(game ?? 'co-caro') };

  return <OnlineTable intent={intent} onHome={() => backToLobby(router)} />;
}
