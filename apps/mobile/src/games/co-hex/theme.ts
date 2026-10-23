/**
 * Bộ mặt của cờ Hex: **gạch men lục giác**.
 *
 * Bàn là một sàn gạch men hình thoi — ô trống là men kem chưa nung màu, quân
 * là ô gạch đã tráng men đỏ hoặc xanh. Hai bờ của mỗi bên nhuộm đúng màu
 * của bên đó ngay trên mép bàn: người mới nhìn vào là biết mình phải nối
 * hai phía nào, không cần đọc luật.
 */
export const hexTheme = {
  /** Men kem của ô trống. */
  tile: '#E6DAC4',
  tileAlt: '#DFD0B2',
  /** Rãnh vữa giữa các viên gạch. */
  grout: '#B49B72',
  /** Men đỏ của ghế 0 — nối bờ trên với bờ dưới. */
  redFace: '#C0392B',
  redDeep: '#8E2A1F',
  redRim: '#E8A49C',
  /** Men xanh của ghế 1 — nối bờ trái với bờ phải. */
  blueFace: '#2B5EA7',
  blueDeep: '#1D4479',
  blueRim: '#9CC0E8',
  gold: '#E3BC72',
  ink: '#3A2E20',
} as const;

export function faceFor(seat: number): { face: string; deep: string; rim: string } {
  return seat === 0
    ? { face: hexTheme.redFace, deep: hexTheme.redDeep, rim: hexTheme.redRim }
    : { face: hexTheme.blueFace, deep: hexTheme.blueDeep, rim: hexTheme.blueRim };
}
