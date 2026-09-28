import type { Bot, BotLevel, Rng, Seat } from '@co/core';
import { neighbourhood, winLineAt, type CaroAction, type CaroState } from './engine.js';

/**
 * Bot caro — chấm điểm theo hình, không minimax.
 *
 * Bàn 15×15 có hệ số phân nhánh ~200, minimax sâu 4 đã là 1,6 tỷ nút. Nhưng
 * caro là game mà **hình cục bộ quyết định gần hết**: một "tứ hở" là thắng
 * ép, một "tam hở" là buộc đối thủ phải đỡ. Nên chấm điểm hình quanh ô định
 * đặt, cộng một tầng nhìn trước để không rơi vào bẫy, là đủ mạnh mà chạy
 * trong vài mili giây.
 *
 * Điểm quan trọng và dễ sai: bot phải chấm theo **đúng luật chặn hai đầu của
 * Việt Nam**, nếu không nó sẽ hí hửng xây chuỗi 5 bị bịt hai đầu rồi thua.
 */

/** Điểm của một hình, tính theo (độ dài, số đầu hở). */
function shapeScore(len: number, openEnds: number, overlineWins: boolean): number {
  if (len >= 6) return overlineWins ? 1_000_000 : 0;
  if (len === 5) return openEnds >= 1 ? 1_000_000 : 0; // chặn hai đầu là chuỗi chết
  if (len === 4) return openEnds === 2 ? 100_000 : openEnds === 1 ? 10_000 : 0;
  if (len === 3) return openEnds === 2 ? 5_000 : openEnds === 1 ? 500 : 0;
  if (len === 2) return openEnds === 2 ? 200 : openEnds === 1 ? 40 : 0;
  return openEnds === 2 ? 10 : 2;
}

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const inBoard = (r: number, c: number, n: number) => r >= 0 && r < n && c >= 0 && c < n;

/** Tổng điểm hình mà ghế `seat` có được nếu đặt quân tại `(r, c)`. */
function scoreAt(s: CaroState, r: number, c: number, seat: Seat): number {
  const n = s.size;
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let back = 0;
    let rr = r - dr;
    let cc = c - dc;
    while (inBoard(rr, cc, n) && s.cells[rr * n + cc] === seat) {
      back++;
      rr -= dr;
      cc -= dc;
    }
    let fwd = 0;
    let r2 = r + dr;
    let c2 = c + dc;
    while (inBoard(r2, c2, n) && s.cells[r2 * n + c2] === seat) {
      fwd++;
      r2 += dr;
      c2 += dc;
    }
    const len = back + 1 + fwd;
    const openA = inBoard(rr, cc, n) && s.cells[rr * n + cc] === -1 ? 1 : 0;
    const openB = inBoard(r2, c2, n) && s.cells[r2 * n + c2] === -1 ? 1 : 0;
    total += shapeScore(len, openA + openB, s.cfg.overlineWins);
  }
  return total;
}

/** Đặt thử một quân rồi trả state mới — chỉ dùng trong bot, không vào log. */
function withStone(s: CaroState, r: number, c: number, seat: Seat): CaroState {
  const cells = s.cells.slice();
  cells[r * s.size + c] = seat;
  return { ...s, cells, filled: s.filled + 1 };
}

export const caroBot: Bot<CaroState, CaroAction> = {
  gameId: 'co-caro',
  lane: 'fast',

  pick(s, seat, level: BotLevel, rng: Rng): CaroAction {
    const foe = s.seats.find((x) => x !== seat) as Seat;
    const cands = neighbourhood(s, level === 1 ? 1 : 2);
    if (!cands.length) return { r: Math.floor(s.size / 2), c: Math.floor(s.size / 2) };

    // Thắng ngay thì thắng, không cần nghĩ thêm.
    for (const m of cands) {
      if (winLineAt(withStone(s, m.r, m.c, seat), m.r, m.c, seat)) return m;
    }
    // Chặn thế thắng của đối thủ. Mức Dễ cố tình bỏ qua bước này một phần
    // để người mới còn có cửa thắng.
    const blocks = cands.filter((m) => winLineAt(withStone(s, m.r, m.c, foe), m.r, m.c, foe));
    if (blocks.length && (level > 1 || rng.next() < 0.5)) return blocks[0] as CaroAction;

    // Mức Dễ: đi hơi ngẫu nhiên trong số các nước không quá tệ.
    if (level === 1) {
      const pool = cands.slice(0, Math.max(1, Math.floor(cands.length / 2)));
      return pool[rng.int(pool.length)] as CaroAction;
    }

    // Trọng số phòng thủ: mức Khó coi trọng việc phá hình đối thủ hơn.
    const defWeight = level === 3 ? 1.1 : 0.8;
    let best: CaroAction = cands[0] as CaroAction;
    let bestScore = -Infinity;
    for (const m of cands) {
      const mine = scoreAt(withStone(s, m.r, m.c, seat), m.r, m.c, seat);
      const theirs = scoreAt(withStone(s, m.r, m.c, foe), m.r, m.c, foe);
      // Nhiễu nhỏ để hai ván không giống hệt nhau; vẫn quyết định bởi seed
      // nên replay vẫn tái lập được.
      const jitter = rng.next() * 3;
      const total = mine + theirs * defWeight + jitter;
      if (total > bestScore) {
        bestScore = total;
        best = m;
      }
    }
    return best;
  },
};
