import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { backToLobby } from '../../src/nav';
import { OnlineTable } from '../../src/net/OnlineTable';
import type { Intent } from '../../src/net/useOnline';

/**
 * Ván online. Đường dẫn mang theo ý định:
 *
 *   /online/quick?game=co-caro&clock=chop   ghép cặp, mức cờ chớp
 *   /online/create?game=co-ganh&pass=abc    mở phòng riêng có mật khẩu
 *   /online/join?code=BXB99&pass=abc        vào bằng mã
 *
 * Để ý định nằm trong URL chứ không trong state toàn cục: tải lại trang giữa
 * ván là vào lại đúng chỗ cũ, và `playerId` lưu sẵn nối lại đúng ghế.
 */
export default function OnlineScreen() {
  const { mode, game, code, clock, pass, lan } = useLocalSearchParams<{
    mode: string;
    game?: string;
    code?: string;
    clock?: string;
    pass?: string;
    lan?: string;
  }>();
  const router = useRouter();

  const intent: Intent =
    mode === 'join'
      ? { kind: 'join', code: String(code ?? ''), ...(pass ? { pass: String(pass) } : {}) }
      : mode === 'create'
        ? {
            kind: 'create',
            gameId: String(game ?? 'co-caro'),
            ...(clock ? { clock: String(clock) } : {}),
            ...(pass ? { pass: String(pass) } : {}),
          }
        : {
            kind: 'quick',
            gameId: String(game ?? 'co-caro'),
            ...(clock ? { clock: String(clock) } : {}),
            // Thiếu `lan` thì hiểu là xếp hạng, đúng như máy chủ: một
            // đường dẫn cũ được mở lại không được âm thầm đổi sang một
            // làn khác với lúc người ta lưu nó.
            xepHang: String(lan ?? 'xh') !== 'thuong',
          };

  return <OnlineTable intent={intent} onHome={() => backToLobby(router)} />;
}
