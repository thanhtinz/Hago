import type { Bot, BotLevel, Rng, Seat } from '@co/core';
import { ADJ, LINES, lineAt, posKey, type BaQuanAction, type BaQuanState } from './engine.js';

/**
 * Bot cờ ba quân — game **giải được** (mục 4 của `docs/rules/co-ba-quan.md`).
 *
 * - Mức Dễ và Thường **không** phải bot khó bị làm yếu ngẫu nhiên: chúng tìm
 *   kiếm nông thật, sâu 2 và 4 nước, nên sai theo kiểu con người sai — bỏ lỡ
 *   hàng ba, không chặn hàng ba của đối phương.
 * - Mức cao nhất tìm vét cạn kèm cắt tỉa và bảng băm: đi đúng thì nó **không
 *   bao giờ thua**, và giao diện gọi mức này là "Không thua" thay vì "Khó" —
 *   nói thẳng ra là tôn trọng người chơi hơn.
 */

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);
const WIN = 1000;

interface Pos {
  cells: number[];
  placed: [number, number];
  quiet: number;
}

function legalOf(p: Pos, seat: Seat): BaQuanAction[] {
  const out: BaQuanAction[] = [];
  if (p.placed[seat]! < 3) {
    for (let i = 0; i < 9; i++) if (p.cells[i] === -1) out.push({ f: -1, t: i });
    return out;
  }
  for (let f = 0; f < 9; f++) {
    if (p.cells[f] !== seat) continue;
    for (const t of ADJ[f]!) if (p.cells[t] === -1) out.push({ f, t });
  }
  return out;
}

function applied(p: Pos, seat: Seat, a: BaQuanAction): Pos {
  const cells = p.cells.slice();
  const placing = p.placed[seat]! < 3;
  if (!placing) cells[a.f] = -1;
  cells[a.t] = seat;
  const placed: [number, number] = [...p.placed] as [number, number];
  if (placing) placed[seat] = placed[seat]! + 1;
  return { cells, placed, quiet: placing ? 0 : p.quiet + 1 };
}

/** Điểm tĩnh khi hết độ sâu: hàng hai chờ một là thứ đáng giá nhất. */
function heuristic(p: Pos, seat: Seat): number {
  const foe = other(seat);
  let score = 0;
  for (const line of LINES) {
    const vals = line.map((i) => p.cells[i]);
    const mine = vals.filter((v) => v === seat).length;
    const theirs = vals.filter((v) => v === foe).length;
    if (mine === 2 && theirs === 0) score += 30;
    else if (theirs === 2 && mine === 0) score -= 35;
    else if (mine === 1 && theirs === 0) score += 3;
    else if (theirs === 1 && mine === 0) score -= 3;
  }
  if (p.cells[4] === seat) score += 5;
  if (p.cells[4] === foe) score -= 5;
  score += (legalOf(p, seat).length - legalOf(p, foe).length) * 2;
  return score;
}

type Flag = 'exact' | 'lower' | 'upper';
const tt = new Map<string, { depth: number; score: number; flag: Flag }>();

/**
 * Negamax. `ancestors` là các thế đã qua trên đường tìm kiếm này: đi lại vào
 * một thế trong đó là tự dẫn tới hoà lặp thế, chấm 0 ngay.
 */
function search(
  p: Pos,
  seat: Seat,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ancestors: Set<string>,
): number {
  if (lineAt(p.cells, other(seat))) return -(WIN - ply); // bên vừa đi đã thắng
  const moves = legalOf(p, seat);
  if (!moves.length) return -(WIN - ply); // bí nước là thua
  if (p.quiet >= 30) return 0;
  if (depth === 0) return heuristic(p, seat);

  const key = `${posKey(p.cells, seat)}|${depth}`;
  const hit = tt.get(key);
  if (hit && hit.depth >= depth) {
    if (hit.flag === 'exact') return hit.score;
    if (hit.flag === 'lower') alpha = Math.max(alpha, hit.score);
    else beta = Math.min(beta, hit.score);
    if (alpha >= beta) return hit.score;
  }
  const alpha0 = alpha;
  // Nước thắng ngay và nước vào tâm xét trước: cắt tỉa mạnh hơn hẳn.
  moves.sort((a, b) => (b.t === 4 ? 1 : 0) - (a.t === 4 ? 1 : 0));
  let best = -Infinity;
  for (const m of moves) {
    const next = applied(p, seat, m);
    const childKey = posKey(next.cells, other(seat));
    const v = ancestors.has(childKey)
      ? 0
      : -search(next, other(seat), depth - 1, -beta, -alpha, ply + 1, new Set([...ancestors, childKey]));
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  tt.set(key, { depth, score: best, flag: best <= alpha0 ? 'upper' : best >= beta ? 'lower' : 'exact' });
  return best;
}

export const baQuanBot: Bot<BaQuanState, BaQuanAction> = {
  gameId: 'co-ba-quan',
  lane: 'fast',

  pick(s, seat, level: BotLevel, rng: Rng): BaQuanAction {
    const pos: Pos = { cells: s.cells, placed: s.placed, quiet: s.quiet };
    const moves = legalOf(pos, seat);
    const first = moves[0]!;
    // Dễ sâu 2, Thường sâu 4, "Không thua" vét cạn — trần 40 nước vì luật
    // 30 nước không thắng đã chặn mọi ván ở đó rồi.
    const depth = level === 1 ? 2 : level === 2 ? 4 : 40;
    const ancestors = new Set<string>([posKey(s.cells, seat)]);
    let best = first;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    for (const m of moves) {
      const next = applied(pos, seat, m);
      const childKey = posKey(next.cells, other(seat));
      const v = ancestors.has(childKey)
        ? 0
        : -search(next, other(seat), depth - 1, -Infinity, -alpha, 1, new Set([...ancestors, childKey]));
      // Mức Dễ và Thường cộng nhiễu rất nhỏ để ván sau không lặp lại ván
      // trước y hệt; nhiễu nhỏ hơn khoảng cách giữa thắng và hoà nên không
      // bao giờ lật một nước thắng thành nước thua.
      const score = v + (level < 3 ? rng.next() * 0.01 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
      if (v > alpha) alpha = v;
    }
    return best;
  },
};
