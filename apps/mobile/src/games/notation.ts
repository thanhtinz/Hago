/**
 * Ghi một nước cờ thành chữ.
 *
 * Máy chủ gửi xuống **hành động thô của engine** (`{r,c}`, `{f,t}`,
 * `{cell,dir}`) chứ không gửi chữ: chỉ app mới biết cột của cờ caro gọi là
 * gì, và một ngày nào đó đổi cách gọi cột thì không phải đụng tới máy chủ.
 *
 * Quy ước cột là **chữ cái, hàng là số**, đếm từ góc trên bên trái — cùng
 * cách mọi sách cờ tiếng Việt đánh số bàn, và cũng là cách người chơi đọc
 * cho nhau qua điện thoại.
 */

const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const cell = (r: number, c: number): string => `${COLS[c] ?? '?'}${r + 1}`;

/** Ô thứ `i` của một bàn vuông `n` cột. */
const at = (i: number, n: number): string => cell(Math.floor(i / n), i % n);

/**
 * Một nước, viết ngắn.
 *
 * Trả về chuỗi rỗng nếu không đọc được hành động — biên bản thiếu một dòng
 * vẫn hơn là cả màn hình đổ vì một hình dạng lạ.
 */
export function moveText(gameId: string, a: unknown): string {
  if (a === null || typeof a !== 'object') return '';
  const o = a as Record<string, unknown>;
  try {
    if (gameId === 'co-caro') {
      if (typeof o.r === 'number' && typeof o.c === 'number') return cell(o.r, o.c);
      return '';
    }
    if (gameId === 'co-ganh') {
      // Bàn cờ gánh là 5×5, chỉ số chạy 0..24.
      if (typeof o.f === 'number' && typeof o.t === 'number') return `${at(o.f, 5)}–${at(o.t, 5)}`;
      return '';
    }
    if (gameId === 'o-an-quan') {
      // Ô ăn quan không có toạ độ hai chiều: mười hai ô xếp thành một vòng,
      // nên số ô cộng chiều rải là đủ để đọc lại nước đi.
      if (typeof o.cell === 'number') return `ô ${o.cell}${o.dir === -1 ? ' trái' : ' phải'}`;
      return '';
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Gom biên bản thành từng lượt: ghế 0 và ghế 1 của cùng một lượt đứng chung
 * một dòng, đánh số từ 1 — như một biên bản cờ vua chép tay.
 */
export function byTurn(gameId: string, moves: { seat: number; a: unknown }[]): { n: number; a: string; b: string }[] {
  const out: { n: number; a: string; b: string }[] = [];
  for (const [i, m] of moves.entries()) {
    const text = moveText(gameId, m.a);
    if (i % 2 === 0) out.push({ n: out.length + 1, a: text, b: '' });
    else {
      const row = out[out.length - 1];
      if (row) row.b = text;
      else out.push({ n: out.length + 1, a: '', b: text });
    }
  }
  return out;
}
