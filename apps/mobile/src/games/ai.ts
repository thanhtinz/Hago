import { useEffect, useRef } from 'react';
import { chamSao } from '@co/protocol';
import { HINTS_PER_MATCH, UNDOS_PER_MATCH, ME } from './useVsBot';

/**
 * Cấu hình một ải truyền vào bàn cờ đấu máy.
 *
 * Ba bàn cờ đã có sẵn và chạy tốt; chế độ vượt ải chỉ thêm đúng ba thứ vào
 * chúng — cấu hình luật của ải, hạt giống ghim, và một lời gọi lại khi ván
 * xong. Dựng ba bàn cờ "phiên bản vượt ải" riêng là đảm bảo chúng sẽ trôi
 * khỏi bàn cờ thật sau vài lần sửa.
 */
export interface AiProp {
  config: Record<string, unknown>;
  hat: string;
  /** Gọi đúng một lần khi ván kết thúc, kèm số sao đã chấm. */
  onXong: (sao: number) => void;
}

/**
 * Chấm sao khi ván trong ải kết thúc, và chỉ chấm **một lần**.
 *
 * Hai điều kiện sao đọc thẳng từ bộ đếm gợi ý và lùi lại mà `useVsBot` vốn
 * đã giữ, nên không tốn một dòng state mới nào và luật sao này đúng nguyên
 * xi cho engine thứ tư.
 */
export function useChamSao(
  ai: AiProp | undefined,
  o: { outcome: { winner: number | null } | null; hintsLeft: number; undosLeft: number },
): void {
  const daBao = useRef(false);
  useEffect(() => {
    if (!ai || !o.outcome || daBao.current) return;
    daBao.current = true;
    ai.onXong(
      chamSao({
        thang: o.outcome.winner === ME,
        dungGoiY: o.hintsLeft < HINTS_PER_MATCH,
        dungLuiLai: o.undosLeft < UNDOS_PER_MATCH,
      }),
    );
  }, [ai, o.outcome, o.hintsLeft, o.undosLeft]);
}
