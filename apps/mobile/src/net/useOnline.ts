import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Outcome, Seat, Turn } from '@co/core';
import type { SeatInfo } from '@co/protocol';
import { token } from './api';
import { GameClient, type Phase, type RoomInfo, type StateMsg } from './client';

/**
 * Một ván với người thật, chạy qua máy chủ.
 *
 * Song song với `useVsBot` về hình dạng, nhưng khác nhau ở một điểm không thể
 * xoá: **ở đây client không có state, chỉ có `view`**. Không tự tính nước hợp
 * lệ để rồi tin nó, không tự đếm giờ, không tự tuyên bố kết quả. Mọi thứ đó
 * là câu trả lời của máy chủ.
 *
 * Nên cũng **không có gợi ý và không có lùi lại** ở chế độ này. Gợi ý cần chạy
 * bot trên thế cờ, mà client không có thế cờ. Lùi lại thì đối thủ phải đồng ý
 * mới được — một bên tự rút nước đã đi thì không còn là ván cờ.
 */

export type Intent = { kind: 'quick'; gameId: string } | { kind: 'create'; gameId: string } | { kind: 'join'; code: string };

export interface Online {
  phase: Phase;
  room: RoomInfo | null;
  /** `view` của riêng ghế mình, do máy chủ cắt. Chưa vào ván thì null. */
  view: unknown;
  ply: number;
  turn: Turn | null;
  seats: SeatInfo[];
  outcome: Outcome | null;
  mySeat: Seat | null;
  /** True khi tới lượt mình và ván còn chạy. */
  myTurn: boolean;
  waiting: number | null;
  error: string | null;
  send: (action: unknown) => void;
  leave: () => void;
}

export function useOnline(intent: Intent): Online {
  const [phase, setPhase] = useState<Phase>('off');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [st, setSt] = useState<StateMsg | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useRef<GameClient | null>(null);

  // Ý định được chốt ở lần dựng đầu. Nếu để nó vào mảng phụ thuộc thì mỗi lần
  // render lại một object mới là mở thêm một socket nữa.
  const first = useRef(intent);

  useEffect(() => {
    // Chưa đăng nhập thì không mở dây: máy chủ sẽ từ chối `hello` không token,
    // và mở socket rồi bị đá ra là một vòng nối lại vô ích.
    const t = token();
    if (!t) {
      setError('Phải đăng nhập mới chơi với người thật được');
      setPhase('off');
      return;
    }
    const c = new GameClient(t, {
      phase: setPhase,
      room: (r) => {
        // Đổi phòng thì **vứt `view` cũ đi ngay**.
        //
        // `room` và `state` là hai thông điệp rời nhau, nên có một khoảnh khắc
        // phòng đã là cờ gánh mà `view` vẫn là ván caro vừa xong. Màn chơi
        // chọn bàn cờ theo `room.gameId` nên nó sẽ đưa view caro cho bàn cờ
        // gánh, và bàn cờ gánh nổ vì `view.board` không tồn tại. Đường đi tới
        // đúng chỗ này là đường thường nhất: đánh xong một ván rồi bấm ghép
        // cặp ván khác.
        setRoom((prev) => {
          if (prev?.code !== r?.code) setSt(null);
          return r;
        });
        if (r) setWaiting(null);
      },
      state: setSt,
      queued: (_g, n) => setWaiting(n),
      error: (_code, msg) => setError(msg),
    });
    client.current = c;
    c.connect();
    const i = first.current;
    if (i.kind === 'quick') c.quick(i.gameId);
    else if (i.kind === 'create') c.create(i.gameId);
    else c.join(i.code);
    return () => {
      c.close();
      client.current = null;
    };
  }, []);

  const mySeat = room?.yourSeat ?? null;
  const turn = st?.turn ?? null;
  const myTurn =
    !st?.outcome && mySeat !== null && turn !== null && (turn.kind === 'seat' ? turn.seat === mySeat : turn.kind === 'sealed' ? turn.seats.includes(mySeat) : false);

  const send = useCallback((action: unknown) => {
    setError(null);
    client.current?.act(action);
  }, []);
  const leave = useCallback(() => client.current?.leave(), []);

  return useMemo(
    () => ({
      phase,
      room,
      view: st?.v ?? null,
      ply: st?.ply ?? 0,
      turn,
      seats: st?.seats ?? room?.seats ?? [],
      outcome: st?.outcome ?? null,
      mySeat,
      myTurn,
      waiting,
      error,
      send,
      leave,
    }),
    [phase, room, st, turn, mySeat, myTurn, waiting, error, send, leave],
  );
}
