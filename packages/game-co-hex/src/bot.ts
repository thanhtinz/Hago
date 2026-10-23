import type { Bot, Rng, Seat } from '@co/core';
import { neighborsOf, type HexAction, type HexState } from './engine.js';

/**
 * Bot cờ Hex — theo đặc tả luật mục 7.
 *
 * Alpha-beta cổ điển chơi Hex rất dở: hệ số phân nhánh 121 và không có
 * chênh lệch vật chất nào để đếm. Ba mức ở đây là ba cách nghĩ khác nhau:
 *
 * - **Dễ**: đặt gần quân mình và gần giữa bàn, cộng nhiều nhiễu. Không chặn,
 *   không thấy nước thắng — sai như người mới sai.
 * - **Thường**: hàm **mạch điện trở** của Shannon rút gọn thành khoảng cách
 *   0–1: muốn nối xong còn phải lấp bao nhiêu ô. Một nước được chấm bằng
 *   "nối của mình ngắn đi bao nhiêu, đường của địch dài ra bao nhiêu", cộng
 *   điểm cho mẫu cầu (bridge) — tạo cầu và giữ cầu.
 * - **Khó**: MCTS. Hex là game MCTS mạnh bất thường vì ván ngẫu nhiên tới
 *   cuối **luôn** có thắng thua rõ ràng (định lý Hex) — tín hiệu rollout
 *   không bao giờ bị hoà làm nhiễu.
 */

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

function touchesStart(i: number, size: number, seat: Seat): boolean {
  return seat === 0 ? Math.floor(i / size) === 0 : i % size === 0;
}
function touchesEnd(i: number, size: number, seat: Seat): boolean {
  return seat === 0 ? Math.floor(i / size) === size - 1 : i % size === size - 1;
}

/**
 * Số ô trống tối thiểu `seat` còn phải lấp để nối xong hai bờ.
 *
 * Đây là mạch điện trở của Shannon đã rời rạc hoá: vào ô của mình tốn 0
 * (dây dẫn), vào ô trống tốn 1, vào ô của địch là hở mạch. 0-1 BFS trên 121
 * ô rẻ tới mức mức Thường chạy được cho mọi ô trống trong một lượt.
 * Kết quả 0 nghĩa là đã nối xong — đường đi toàn quân mình.
 */
export function pathCost(cells: number[], size: number, seat: Seat): number {
  const n = size * size;
  const dist = new Float64Array(n).fill(Infinity);
  const deque: number[] = [];
  const enter = (i: number) => (cells[i] === seat ? 0 : cells[i] === -1 ? 1 : Infinity);
  for (let i = 0; i < n; i++) {
    if (!touchesStart(i, size, seat)) continue;
    const e = enter(i);
    if (e < dist[i]!) {
      dist[i] = e;
      if (e === 0) deque.unshift(i);
      else deque.push(i);
    }
  }
  while (deque.length) {
    const cur = deque.shift()!;
    const d = dist[cur]!;
    for (const j of neighborsOf(cur, size)) {
      const e = enter(j);
      if (e === Infinity) continue;
      if (d + e < dist[j]!) {
        dist[j] = d + e;
        if (e === 0) deque.unshift(j);
        else deque.push(j);
      }
    }
  }
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    if (touchesEnd(i, size, seat) && dist[i]! < best) best = dist[i]!;
  }
  return best;
}

/** Đặt quân ở `at` thì `seat` đã nối xong chưa — tràn từ quân vừa đặt. */
function connectsFrom(cells: number[], size: number, at: number, seat: Seat): boolean {
  if (cells[at] !== seat) return false;
  const seen = new Set<number>([at]);
  const queue = [at];
  let start = touchesStart(at, size, seat);
  let end = touchesEnd(at, size, seat);
  for (let h = 0; h < queue.length && !(start && end); h++) {
    for (const j of neighborsOf(queue[h]!, size)) {
      if (cells[j] === seat && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
        if (touchesStart(j, size, seat)) start = true;
        if (touchesEnd(j, size, seat)) end = true;
      }
    }
  }
  return start && end;
}

/** Các cặp lệch mà hai đầu có đúng hai ô kề chung — hình dạng của một cây cầu. */
const BRIDGE_OFFS: [number, number][] = [
  [1, 1],
  [2, -1],
  [1, -2],
];

function commonNeighbors(a: number, b: number, size: number): number[] {
  const nb = new Set(neighborsOf(b, size));
  return neighborsOf(a, size).filter((x) => nb.has(x));
}

/**
 * Điểm cầu cho một nước đặt ở `at` của `seat`:
 * - **tạo cầu**: nối với một quân mình ở lệch cầu mà cả hai miệng cầu còn
 *   trống — cặp đó đã nối chắc chắn dù chưa kề nhau;
 * - **giữ cầu**: một cầu có sẵn bị địch chiếm một miệng thì phải lấy miệng
 *   còn lại ngay, điểm cao hơn nhiều.
 */
function bridgeScore(cells: number[], size: number, at: number, seat: Seat): number {
  const r = Math.floor(at / size);
  const c = at % size;
  let score = 0;
  for (const [dr, dc] of [...BRIDGE_OFFS, ...BRIDGE_OFFS.map(([a, b]) => [-a, -b] as [number, number])]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    const mate = nr * size + nc;
    if (cells[mate] !== seat) continue;
    const mouths = commonNeighbors(at, mate, size);
    if (mouths.length !== 2) continue;
    const [m1, m2] = mouths as [number, number];
    if (cells[m1] === -1 && cells[m2] === -1) score += 1.5;
  }
  // Giữ cầu: quét các cặp quân mình đang làm cầu mà một miệng đã bị địch lấy.
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== seat) continue;
    const ir = Math.floor(i / size);
    const ic = i % size;
    for (const [dr, dc] of BRIDGE_OFFS) {
      const nr = ir + dr;
      const nc = ic + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const mate = nr * size + nc;
      if (cells[mate] !== seat) continue;
      const mouths = commonNeighbors(i, mate, size);
      if (mouths.length !== 2) continue;
      const [m1, m2] = mouths as [number, number];
      const foe = other(seat);
      if ((cells[m1] === foe && m2 === at) || (cells[m2] === foe && m1 === at)) score += 4;
    }
  }
  return score;
}

function pickEasy(s: HexState, seat: Seat, rng: Rng): HexAction {
  const size = s.size;
  const mid = (size - 1) / 2;
  let best: HexAction | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== -1) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    let score = rng.next();
    if (neighborsOf(i, size).some((j) => s.cells[j] === seat)) score += 0.6;
    score += 0.3 * (1 - (Math.abs(r - mid) + Math.abs(c - mid)) / (2 * mid + 1));
    if (score > bestScore) {
      bestScore = score;
      best = { at: i };
    }
  }
  return best!;
}

function pickMedium(s: HexState, seat: Seat, rng: Rng): HexAction {
  const size = s.size;
  const foe = other(seat);
  // Địch còn đúng một ô là nối xong thì chặn là việc bắt buộc, không phải
  // một lựa chọn đem cân với việc rút ngắn đường của mình: chỉ xét những
  // nước làm đường địch dài ra (hoặc thắng ngay). Không nước nào chặn nổi
  // — mối đe doạ kép — thì mới quay về chấm điểm thường.
  const foeCostNow = pathCost(s.cells, size, foe);
  const mustBlock = foeCostNow === 1;
  let best: HexAction | null = null;
  let bestScore = -Infinity;
  let bestBlock: HexAction | null = null;
  let bestBlockScore = -Infinity;
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== -1) continue;
    const cells = s.cells.slice();
    cells[i] = seat;
    const myCost = pathCost(cells, size, seat);
    if (myCost === 0) return { at: i };
    const foeCost = pathCost(cells, size, foe);
    const foePart = foeCost === Infinity ? 40 : foeCost;
    const score = foePart * 10 - myCost * 12 + bridgeScore(s.cells, size, i, seat) + rng.next() * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = { at: i };
    }
    if (mustBlock && foeCost > 1 && score > bestBlockScore) {
      bestBlockScore = score;
      bestBlock = { at: i };
    }
  }
  return bestBlock ?? best!;
}

/**
 * Quyết định đổi của mức Khó: đổi khi quân mở màn **mạnh** — nằm gần tâm
 * bàn, nơi nó rút ngắn cả hai hướng nối của ghế 0. Quân mở ở sát bờ của
 * ghế 1 hoặc sát góc thì yếu, cứ để ghế 0 giữ.
 */
function shouldSwap(s: HexState): boolean {
  const at = s.last!;
  const size = s.size;
  const mid = (size - 1) / 2;
  const r = Math.floor(at / size);
  const c = at % size;
  const centrality = (1 - Math.abs(r - mid) / (mid + 1)) * (1 - Math.abs(c - mid) / (mid + 1));
  return centrality >= 0.45;
}

interface McNode {
  move: number;
  mover: Seat;
  visits: number;
  wins: number;
  children: McNode[];
  untried: number[];
}

function pickHard(s: HexState, seat: Seat, rng: Rng, budgetMs: number): HexAction {
  const size = s.size;
  const cells = s.cells.slice();
  const empties: number[] = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === -1) empties.push(i);

  // Thắng ngay thì không cần nghĩ.
  for (const i of empties) {
    cells[i] = seat;
    if (connectsFrom(cells, size, i, seat)) return { at: i };
    cells[i] = -1;
  }

  const deadline = Date.now() + Math.max(30, budgetMs);
  const root: McNode = {
    move: -1,
    mover: other(seat),
    visits: 0,
    wins: 0,
    children: [],
    untried: empties.slice(),
  };

  const playout = (toMove: Seat): Seat => {
    // Đánh ngẫu nhiên tới hết bàn trên chính mảng `cells`; người gọi chịu
    // trách nhiệm dọn lại. Hex không hoà nên vòng này luôn có kẻ thắng.
    const open = empties.filter((i) => cells[i] === -1);
    rng.shuffle(open);
    const placed: number[] = [];
    let cur = toMove;
    let winner: Seat = cur;
    for (const i of open) {
      cells[i] = cur;
      placed.push(i);
      if (connectsFrom(cells, size, i, cur)) {
        winner = cur;
        break;
      }
      cur = other(cur);
    }
    for (const i of placed) cells[i] = -1;
    return winner;
  };

  let iterations = 0;
  while (Date.now() < deadline && iterations < 100_000) {
    iterations++;
    // Chọn: đi xuống theo UCB cho tới nút còn nước chưa thử hoặc nút lá.
    const path: McNode[] = [root];
    let node = root;
    let toMove = seat;
    const made: number[] = [];
    while (node.untried.length === 0 && node.children.length > 0) {
      let bestChild: McNode | null = null;
      let bestUcb = -Infinity;
      for (const child of node.children) {
        const exploit = child.wins / child.visits;
        const explore = 1.41 * Math.sqrt(Math.log(node.visits) / child.visits);
        if (exploit + explore > bestUcb) {
          bestUcb = exploit + explore;
          bestChild = child;
        }
      }
      node = bestChild!;
      path.push(node);
      cells[node.move] = node.mover;
      made.push(node.move);
      toMove = other(node.mover);
    }
    // Mở rộng một nước chưa thử.
    if (node.untried.length > 0) {
      const k = rng.int(node.untried.length);
      const move = node.untried.splice(k, 1)[0]!;
      const child: McNode = { move, mover: toMove, visits: 0, wins: 0, children: [], untried: [] };
      cells[move] = toMove;
      made.push(move);
      const rest = empties.filter((i) => cells[i] === -1);
      child.untried = rest;
      node.children.push(child);
      path.push(child);
      node = child;
      toMove = other(toMove);
    }
    // Nếu nút vừa tới đã là nước thắng thì khỏi tung ván ngẫu nhiên.
    let winner: Seat;
    const lastMove = path[path.length - 1]!;
    if (lastMove.move >= 0 && connectsFrom(cells, size, lastMove.move, lastMove.mover)) {
      winner = lastMove.mover;
    } else {
      winner = playout(toMove);
    }
    for (const n of path) {
      n.visits++;
      if (n.mover === winner) n.wins++;
    }
    for (const i of made) cells[i] = -1;
    if (iterations % 128 === 0 && Date.now() >= deadline) break;
  }

  let best: McNode | null = null;
  for (const child of root.children) {
    if (!best || child.visits > best.visits) best = child;
  }
  return best ? { at: best.move } : pickMedium(s, seat, rng);
}

export const hexBot: Bot<HexState, HexAction> = {
  gameId: 'co-hex',
  lane: 'heavy',
  pick(s, seat, level, rng, budgetMs) {
    // Luật đổi chỉ có một lần: mức Dễ không biết nó tồn tại, mức Thường
    // đổi khi quân mở nằm đúng ô giữa, mức Khó cân theo độ gần tâm.
    if (s.ply === 1 && seat === (s.seats[1] as Seat)) {
      if (level === 3 && shouldSwap(s)) return { swap: true };
      if (level === 2 && s.last === Math.floor(s.size / 2) * s.size + Math.floor(s.size / 2)) return { swap: true };
    }
    if (level === 1) return pickEasy(s, seat, rng);
    if (level === 2) return pickMedium(s, seat, rng);
    return pickHard(s, seat, rng, budgetMs);
  },
};
