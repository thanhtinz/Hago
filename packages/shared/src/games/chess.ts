import { ApplyResult, BaseState, EnginePlayer, EngineResultRow, GameEngine, err, ok } from '../engine';

/**
 * Cờ Vua — luật đầy đủ: nhập thành, bắt tốt qua đường, phong cấp, chiếu hết,
 * hết nước đi (hoà), luật 50 nước, lặp vị trí 3 lần và hoà do không đủ quân.
 *
 * Bàn là mảng 64 ô, chỉ số = hàng * 8 + cột, **hàng 0 nằm trên cùng** (phía
 * quân đen, tức hàng 8 theo cách đọc bàn cờ) và cột 0 là cột a. Quân trắng viết
 * hoa, quân đen viết thường — cách này gọn, so sánh nhanh và in ra đọc được
 * ngay khi cần dò lỗi.
 *
 * Ghế 0 cầm trắng và đi trước.
 */
export interface ChessConfig {
  /** Giây cho mỗi nước; hết giờ là xử thua bên đang đi, đúng luật cờ. */
  turnSeconds?: number;
}

export type ChessSquare = string | null;

export interface ChessMove {
  from: number;
  to: number;
  /** Quân phong cấp khi tốt tới hàng cuối: 'q' | 'r' | 'b' | 'n'. */
  promo?: string;
  /** Ký hiệu đại số rút gọn, ví dụ 'Nf3', 'exd5', 'O-O', 'Qh5#'. */
  san: string;
  /** Quân bị bắt (nếu có) — để dựng hàng quân đã mất. */
  captured?: string;
}

export interface ChessState extends BaseState {
  board: ChessSquare[];
  /** Quyền nhập thành còn lại: [trắng gần, trắng xa, đen gần, đen xa]. */
  castling: boolean[];
  /** Ô có thể bắt tốt qua đường ở nước tiếp theo, hoặc null. */
  ep: number | null;
  /** Số nửa nước không ăn quân và không đi tốt — chạm 100 là hoà. */
  halfmove: number;
  history: ChessMove[];
  /** Đếm số lần mỗi thế cờ xuất hiện, để bắt lặp 3 lần. */
  seen: Record<string, number>;
  /** Lý do ván kết thúc, hiện trên màn hình. */
  ending: string | null;
  draw: boolean;
  turnSeconds: number;
}

const WHITE = 0;
const BLACK = 1;

const isWhite = (p: ChessSquare) => !!p && p === p.toUpperCase();
const colorOf = (p: ChessSquare) => (isWhite(p) ? WHITE : BLACK);
const rowOf = (i: number) => Math.floor(i / 8);
const colOf = (i: number) => i % 8;
const onBoard = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

/** Tên ô theo cách đọc bàn cờ: cột a..h, hàng 1..8 tính từ phía trắng. */
export const squareName = (i: number) => 'abcdefgh'[colOf(i)] + String(8 - rowOf(i));

const START = 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR';

const KNIGHT_JUMPS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_STEPS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_RAYS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_RAYS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function freshBoard(): ChessSquare[] {
  return START.split('').map((ch) => (ch === '.' ? null : ch));
}

/** Mọi nước đi thô của một bên, chưa lọc nước để hở vua. */
function pseudoMoves(state: ChessState, side: number): { from: number; to: number; promo?: string }[] {
  const out: { from: number; to: number; promo?: string }[] = [];
  const board = state.board;

  const push = (from: number, to: number) => {
    const target = board[to];
    if (target && colorOf(target) === side) return false;
    out.push({ from, to });
    return !target;
  };

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || colorOf(p) !== side) continue;
    const r = rowOf(i);
    const c = colOf(i);
    const kind = p.toLowerCase();

    if (kind === 'p') {
      const dir = side === WHITE ? -1 : 1;
      const startRow = side === WHITE ? 6 : 1;
      const lastRow = side === WHITE ? 0 : 7;
      const one = i + dir * 8;
      if (onBoard(r + dir, c) && !board[one]) {
        if (rowOf(one) === lastRow) for (const q of 'qrbn') out.push({ from: i, to: one, promo: q });
        else out.push({ from: i, to: one });
        const two = i + dir * 16;
        if (r === startRow && !board[two]) out.push({ from: i, to: two });
      }
      for (const dc of [-1, 1]) {
        if (!onBoard(r + dir, c + dc)) continue;
        const to = (r + dir) * 8 + (c + dc);
        const target = board[to];
        const canTake = (target && colorOf(target) !== side) || to === state.ep;
        if (!canTake) continue;
        if (rowOf(to) === lastRow) for (const q of 'qrbn') out.push({ from: i, to, promo: q });
        else out.push({ from: i, to });
      }
      continue;
    }

    if (kind === 'n') {
      for (const [dr, dc] of KNIGHT_JUMPS) if (onBoard(r + dr, c + dc)) push(i, (r + dr) * 8 + (c + dc));
      continue;
    }

    if (kind === 'k') {
      for (const [dr, dc] of KING_STEPS) if (onBoard(r + dr, c + dc)) push(i, (r + dr) * 8 + (c + dc));
      continue;
    }

    const rays = kind === 'b' ? BISHOP_RAYS : kind === 'r' ? ROOK_RAYS : BISHOP_RAYS.concat(ROOK_RAYS);
    for (const [dr, dc] of rays) {
      let rr = r + dr;
      let cc = c + dc;
      while (onBoard(rr, cc)) {
        if (!push(i, rr * 8 + cc)) break;
        rr += dr;
        cc += dc;
      }
    }
  }
  return out;
}

/** Ô `sq` có đang bị bên `by` tấn công không. */
function attacked(board: ChessSquare[], sq: number, by: number): boolean {
  const r = rowOf(sq);
  const c = colOf(sq);

  const at = (rr: number, cc: number) => (onBoard(rr, cc) ? board[rr * 8 + cc] : undefined);
  const mine = (p: ChessSquare | undefined, kind: string) =>
    !!p && colorOf(p) === by && p.toLowerCase() === kind;

  // Tốt ăn chéo về phía trước của nó, nên soi ngược lại từ ô đang xét.
  const pawnDir = by === WHITE ? 1 : -1;
  if (mine(at(r + pawnDir, c - 1), 'p') || mine(at(r + pawnDir, c + 1), 'p')) return true;

  for (const [dr, dc] of KNIGHT_JUMPS) if (mine(at(r + dr, c + dc), 'n')) return true;
  for (const [dr, dc] of KING_STEPS) if (mine(at(r + dr, c + dc), 'k')) return true;

  for (const [dr, dc] of BISHOP_RAYS) {
    let rr = r + dr;
    let cc = c + dc;
    while (onBoard(rr, cc)) {
      const p = board[rr * 8 + cc];
      if (p) {
        if (colorOf(p) === by && (p.toLowerCase() === 'b' || p.toLowerCase() === 'q')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  for (const [dr, dc] of ROOK_RAYS) {
    let rr = r + dr;
    let cc = c + dc;
    while (onBoard(rr, cc)) {
      const p = board[rr * 8 + cc];
      if (p) {
        if (colorOf(p) === by && (p.toLowerCase() === 'r' || p.toLowerCase() === 'q')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return false;
}

function kingSquare(board: ChessSquare[], side: number): number {
  const k = side === WHITE ? 'K' : 'k';
  return board.indexOf(k);
}

export function inCheck(state: ChessState, side: number): boolean {
  const k = kingSquare(state.board, side);
  return k >= 0 && attacked(state.board, k, 1 - side);
}

/** Áp một nước lên bản sao bàn cờ, trả về bàn mới và quân bị bắt. */
function applyToBoard(state: ChessState, m: { from: number; to: number; promo?: string }) {
  const board = state.board.slice();
  const piece = board[m.from]!;
  const kind = piece.toLowerCase();
  const side = colorOf(piece);
  let captured = board[m.to] ?? undefined;

  board[m.to] = piece;
  board[m.from] = null;

  // Bắt tốt qua đường: quân bị bắt không nằm ở ô mình đi tới.
  if (kind === 'p' && m.to === state.ep && !captured) {
    const victim = m.to + (side === WHITE ? 8 : -8);
    captured = board[victim] ?? undefined;
    board[victim] = null;
  }
  if (kind === 'p' && m.promo) board[m.to] = side === WHITE ? m.promo.toUpperCase() : m.promo;

  // Nhập thành: vua nhảy 2 ô thì xe nhảy qua bên kia.
  if (kind === 'k' && Math.abs(colOf(m.to) - colOf(m.from)) === 2) {
    const row = rowOf(m.from);
    const short = colOf(m.to) === 6;
    const rookFrom = row * 8 + (short ? 7 : 0);
    const rookTo = row * 8 + (short ? 5 : 3);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  return { board, captured };
}

/** Nước nhập thành hợp lệ của một bên. */
function castleMoves(state: ChessState, side: number): { from: number; to: number }[] {
  if (inCheck(state, side)) return [];
  const row = side === WHITE ? 7 : 0;
  const king = row * 8 + 4;
  if (state.board[king] !== (side === WHITE ? 'K' : 'k')) return [];
  const out: { from: number; to: number }[] = [];
  const rights = side === WHITE ? [state.castling[0], state.castling[1]] : [state.castling[2], state.castling[3]];

  // Gần vua: ô f, g trống và không bị tấn công; xe còn ở h.
  if (rights[0] && !state.board[row * 8 + 5] && !state.board[row * 8 + 6]) {
    if (!attacked(state.board, row * 8 + 5, 1 - side) && !attacked(state.board, row * 8 + 6, 1 - side)) {
      out.push({ from: king, to: row * 8 + 6 });
    }
  }
  // Xa vua: b, c, d trống; vua chỉ đi qua d nên chỉ cần c và d an toàn.
  if (rights[1] && !state.board[row * 8 + 1] && !state.board[row * 8 + 2] && !state.board[row * 8 + 3]) {
    if (!attacked(state.board, row * 8 + 3, 1 - side) && !attacked(state.board, row * 8 + 2, 1 - side)) {
      out.push({ from: king, to: row * 8 + 2 });
    }
  }
  return out;
}

/** Toàn bộ nước đi hợp lệ của một bên (đã loại nước để hở vua). */
export function legalMoves(state: ChessState, side: number): { from: number; to: number; promo?: string }[] {
  const raw = pseudoMoves(state, side).concat(castleMoves(state, side));
  return raw.filter((m) => {
    const { board } = applyToBoard(state, m);
    const k = kingSquare(board, side);
    return k < 0 ? false : !attacked(board, k, 1 - side);
  });
}

/** Chuỗi mô tả thế cờ, dùng để đếm lặp 3 lần. */
function positionKey(state: ChessState, side: number): string {
  return `${state.board.map((p) => p ?? '.').join('')}|${side}|${state.castling.map((b) => (b ? 1 : 0)).join('')}|${state.ep ?? '-'}`;
}

/** Hai bên đều không còn đủ quân để chiếu hết. */
function deadPosition(board: ChessSquare[]): boolean {
  const rest = board.filter((p) => p && p.toLowerCase() !== 'k') as string[];
  if (!rest.length) return true;
  if (rest.length === 1) return 'nb'.includes(rest[0].toLowerCase());
  if (rest.length === 2 && rest.every((p) => p.toLowerCase() === 'b')) {
    // Hai tượng cùng màu ô thì không chiếu hết được.
    const squares = board
      .map((p, i) => (p && p.toLowerCase() === 'b' ? (rowOf(i) + colOf(i)) % 2 : -1))
      .filter((v) => v >= 0);
    return squares[0] === squares[1];
  }
  return false;
}

/** Ký hiệu đại số rút gọn cho một nước, kèm dấu chiếu / chiếu hết. */
function toSan(
  state: ChessState,
  m: { from: number; to: number; promo?: string },
  captured: string | undefined,
  next: ChessState,
): string {
  const piece = state.board[m.from]!;
  const kind = piece.toLowerCase();
  const side = colorOf(piece);

  let san: string;
  if (kind === 'k' && Math.abs(colOf(m.to) - colOf(m.from)) === 2) {
    san = colOf(m.to) === 6 ? 'O-O' : 'O-O-O';
  } else if (kind === 'p') {
    san = captured ? `${'abcdefgh'[colOf(m.from)]}x${squareName(m.to)}` : squareName(m.to);
    if (m.promo) san += `=${m.promo.toUpperCase()}`;
  } else {
    // Khi hai quân cùng loại cùng đi được tới đó thì phải ghi rõ cột hoặc hàng.
    const rivals = legalMoves(state, side).filter(
      (o) => o.to === m.to && o.from !== m.from && state.board[o.from]?.toLowerCase() === kind,
    );
    let mark = '';
    if (rivals.length) {
      mark = rivals.every((o) => colOf(o.from) !== colOf(m.from))
        ? 'abcdefgh'[colOf(m.from)]
        : rivals.every((o) => rowOf(o.from) !== rowOf(m.from))
          ? String(8 - rowOf(m.from))
          : squareName(m.from);
    }
    san = `${kind.toUpperCase()}${mark}${captured ? 'x' : ''}${squareName(m.to)}`;
  }

  const foe = 1 - side;
  if (inCheck(next, foe)) san += legalMoves(next, foe).length ? '+' : '#';
  return san;
}

function finish(state: ChessState, ending: string, winnerSeat: number | null): ChessState {
  return {
    ...state,
    over: true,
    draw: winnerSeat === null,
    ending,
    winnerIds: winnerSeat === null ? [] : [state.players[winnerSeat].id],
    log: [...state.log, ending].slice(-20),
  };
}

export const ChessEngine: GameEngine<ChessState, ChessConfig> = {
  id: 'chess',
  minPlayers: 2,
  maxPlayers: 2,
  turnSeconds: 45,

  init(players: EnginePlayer[], config: ChessConfig = {}): ChessState {
    const turnSeconds = Math.min(120, Math.max(15, config.turnSeconds ?? 45));
    const state: ChessState = {
      players,
      board: freshBoard(),
      castling: [true, true, true, true],
      ep: null,
      halfmove: 0,
      history: [],
      seen: {},
      ending: null,
      draw: false,
      turn: 0,
      turnStartedAt: Date.now(),
      winnerIds: [],
      over: false,
      log: ['Trắng đi trước'],
      turnSeconds,
    };
    state.seen[positionKey(state, WHITE)] = 1;
    return state;
  },

  apply(state, playerId, type, payload): ApplyResult<ChessState> {
    if (state.over) return err('MATCH_OVER');
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return err('NOT_A_PLAYER');

    if (type === 'resign') {
      return ok(finish(state, `${state.players[seat].name} xin thua`, 1 - seat), [
        { type: 'resign', payload: { seat } },
      ]);
    }
    if (type !== 'move') return err('UNKNOWN_ACTION');
    if (seat !== state.turn % 2) return err('NOT_YOUR_TURN');

    const from = Number(payload?.from);
    const to = Number(payload?.to);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 63 || to < 0 || to > 63) {
      return err('BAD_SQUARE');
    }
    const promo = typeof payload?.promo === 'string' ? payload.promo.toLowerCase() : undefined;

    // Tốt lên hàng cuối sinh ra 4 nước cùng from/to khác quân phong; không chọn
    // thì mặc định hậu, như mọi app cờ.
    const want = promo && 'qrbn'.includes(promo) ? promo : 'q';
    const legal = legalMoves(state, seat);
    const chosen = legal.find((m) => m.from === from && m.to === to && (m.promo ? m.promo === want : true));
    if (!chosen) return err('ILLEGAL_MOVE');

    const piece = state.board[from]!;
    const kind = piece.toLowerCase();
    const { board, captured } = applyToBoard(state, chosen);

    // Quyền nhập thành mất khi vua hoặc xe rời ô gốc, hoặc xe bị ăn ngay tại ô gốc.
    const castling = state.castling.slice();
    if (kind === 'k') {
      if (seat === WHITE) { castling[0] = false; castling[1] = false; }
      else { castling[2] = false; castling[3] = false; }
    }
    const clearRook = (sq: number) => {
      if (sq === 63) castling[0] = false;
      if (sq === 56) castling[1] = false;
      if (sq === 7) castling[2] = false;
      if (sq === 0) castling[3] = false;
    };
    clearRook(from);
    clearRook(to);

    const ep = kind === 'p' && Math.abs(rowOf(to) - rowOf(from)) === 2 ? (from + to) / 2 : null;
    const halfmove = kind === 'p' || captured ? 0 : state.halfmove + 1;

    let next: ChessState = {
      ...state,
      board,
      castling,
      ep,
      halfmove,
      turn: state.turn + 1,
      turnStartedAt: Date.now(),
    };

    const san = toSan(state, chosen, captured, next);
    const move: ChessMove = { from, to, promo: chosen.promo, san, captured };
    const moveNo = Math.floor(state.turn / 2) + 1;
    next = {
      ...next,
      history: [...state.history, move],
      log: [...state.log, `${moveNo}${seat === WHITE ? '.' : '...'} ${san}`].slice(-20),
    };

    const key = positionKey(next, 1 - seat);
    const seen = { ...next.seen, [key]: (next.seen[key] ?? 0) + 1 };
    next = { ...next, seen };

    const events: any[] = [{ type: 'move', payload: { seat, san } }];
    if (captured) events.push({ type: 'capture', payload: { seat, piece: captured } });

    const foe = 1 - seat;
    const foeMoves = legalMoves(next, foe);
    if (!foeMoves.length) {
      if (inCheck(next, foe)) {
        return ok(finish(next, `Chiếu hết — ${state.players[seat].name} thắng`, seat), [
          ...events,
          { type: 'win', payload: { seat } },
        ]);
      }
      return ok(finish(next, 'Hết nước đi — hoà', null), events);
    }
    if (halfmove >= 100) return ok(finish(next, 'Luật 50 nước — hoà', null), events);
    if (seen[key] >= 3) return ok(finish(next, 'Lặp vị trí ba lần — hoà', null), events);
    if (deadPosition(board)) return ok(finish(next, 'Không đủ quân chiếu hết — hoà', null), events);
    if (inCheck(next, foe)) events.push({ type: 'check', payload: { seat: foe } });

    return ok(next, events);
  },

  /** Hết giờ là thua, đúng luật cờ — không tự đi hộ. */
  timeout(state) {
    if (state.over) return ok(state);
    const seat = state.turn % 2;
    return ok(finish(state, `${state.players[seat].name} hết giờ`, 1 - seat), [
      { type: 'timeout', payload: { seat } },
    ]);
  },

  view(state, viewerId) {
    const seat = state.players.findIndex((p) => p.id === viewerId);
    const turnSeat = state.turn % 2;
    // Cờ vua không có thông tin ẩn: gửi cả bàn, chỉ tính sẵn nước đi cho người xem.
    const moves = seat >= 0 && seat === turnSeat && !state.over ? legalMoves(state, seat) : [];
    const last = state.history[state.history.length - 1] ?? null;
    return {
      board: state.board,
      moves,
      lastMove: last ? { from: last.from, to: last.to } : null,
      check: !state.over && inCheck(state, turnSeat) ? turnSeat : null,
      captured: state.history.filter((m) => m.captured).map((m) => m.captured),
      history: state.history.map((m) => m.san),
      mySeat: seat,
      turnSeat,
      turn: state.turn,
      ending: state.ending,
      draw: state.draw,
      players: state.players,
      over: state.over,
      winnerIds: state.winnerIds,
      log: state.log.slice(-6),
    };
  },

  finished: (s) => s.over,

  results(state): EngineResultRow[] {
    return state.players.map((p, seat) => {
      const win = state.winnerIds.includes(p.id);
      const result = state.draw ? 'draw' : win ? 'win' : 'lose';
      return {
        userId: p.id,
        result: result as 'win' | 'lose' | 'draw',
        // Điểm ghi nhận là số nước đã đi của bên đó — dùng cho bảng thống kê.
        score: Math.ceil((state.turn - seat) / 2),
        place: state.draw ? 1 : win ? 1 : 2,
      };
    });
  },

  deadline: (s) => (s.over ? null : s.turnStartedAt + s.turnSeconds * 1000),
};
