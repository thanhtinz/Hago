/**
 * Bàn cờ gánh và đồ thị kề — phần dễ cài sai nhất của game này.
 *
 * 25 điểm là giao điểm của lưới 5×5. Hình vẽ truyền thống gồm 5 đường ngang,
 * 5 đường dọc, **hai đường chéo lớn** của hình vuông, và **hình thoi nối bốn
 * trung điểm cạnh**. Không phải vẽ chéo ở mọi ô — vẽ thế là sai luật, vì nó
 * cho quân đi chéo ở những điểm lẽ ra không đi chéo được.
 *
 * Quy tắc rút gọn tương đương đúng với hình vẽ đó: kề ngang dọc thì luôn có,
 * còn **kề chéo chỉ ở điểm có `(r+c)` chẵn**. Đây chính là đồ thị Alquerque,
 * tổng 56 cạnh: 40 ngang dọc và 16 chéo.
 */

export const N = 5;
export const CELLS = N * N;

export const rowOf = (i: number) => (i / N) | 0;
export const colOf = (i: number) => i % N;
export const idx = (r: number, c: number) => r * N + c;
const inside = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

const STEPS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
];

/** Điểm kề của từng điểm. */
export const NB: number[][] = (() => {
  const out: number[][] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const even = (r + c) % 2 === 0;
      const a: number[] = [];
      for (const [dr, dc] of STEPS) {
        if (dr !== 0 && dc !== 0 && !even) continue;
        if (inside(r + dr, c + dc)) a.push(idx(r + dr, c + dc));
      }
      out.push(a);
    }
  }
  return out;
})();

/**
 * Các cặp đối xứng qua từng điểm — hai đầu của một thế gánh.
 *
 * Bốn góc có **0 cặp**: đi vào góc thì không bao giờ gánh được. Và bộ ba
 * `(1,1) (2,0) (3,1)` là hình chữ V chứ không phải đường thẳng, nên không
 * phải một cặp — đây là chỗ hay cài nhầm thành "mọi hàng xóm đối nhau".
 */
export const PAIRS: [number, number][][] = (() => {
  const out: [number, number][][] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const even = (r + c) % 2 === 0;
      const a: [number, number][] = [];
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ] as [number, number][]) {
        if (dr !== 0 && dc !== 0 && !even) continue;
        if (inside(r - dr, c - dc) && inside(r + dr, c + dc)) {
          a.push([idx(r - dr, c - dc), idx(r + dr, c + dc)]);
        }
      }
      out.push(a);
    }
  }
  return out;
})();

/** Thế xuất phát: viền kín, chín điểm trong lòng bàn để trống. */
export const START_BOTTOM = [10, 15, 19, 20, 21, 22, 23, 24];
export const START_TOP = [0, 1, 2, 3, 4, 5, 9, 14];
