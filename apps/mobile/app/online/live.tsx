import React from 'react';
import { useRouter } from 'expo-router';
import { backToLobby } from '../../src/nav';
import { OnlineTable } from '../../src/net/OnlineTable';

/**
 * Bàn cờ của một ván **đã có sẵn** trên dây nối.
 *
 * Khác ba đường kia (`quick`, `create`, `join`) ở chỗ không gửi ý định nào:
 * phòng đã được máy chủ mở khi lời rủ được nhận lời, và dây chung đã cầm
 * `room` lẫn `state`. Màn này chỉ việc vẽ.
 */
export default function LiveMatchScreen() {
  const router = useRouter();
  return <OnlineTable intent={{ kind: 'none' }} onHome={() => backToLobby(router)} />;
}
