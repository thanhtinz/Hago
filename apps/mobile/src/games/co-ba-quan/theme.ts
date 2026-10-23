/**
 * Bộ mặt của cờ ba quân: **vẽ trên nền đất**.
 *
 * Đặc tả luật gọi đây là trò "trẻ con Việt Nam vẫn vẽ trên nền đất" — bàn cờ
 * là mấy nét vạch xuống đất nện, quân là hòn sỏi và mảnh vỏ sò. Bàn nhỏ nhất
 * bộ nên nét phải thô và rõ: 9 điểm, 8 đường, không trang trí gì chen vào
 * giữa người chơi và thế cờ.
 */
export const baQuanTheme = {
  soil: '#DCC39C',
  soilLit: '#E8D5B0',
  soilDark: '#C3A678',
  /** Nét vạch xuống đất. */
  line: '#7A5C38',
  /** Quân sỏi của ghế 0. */
  stoneFace: '#4A4038',
  stoneDeep: '#2A241E',
  stoneRim: '#6B5D4C',
  /** Quân vỏ sò của ghế 1. */
  shellFace: '#F6EEDD',
  shellDeep: '#CDBB96',
  shellRim: '#FFF8EA',
  pick: '#E3BC72',
  target: '#5FB37C',
} as const;

export function faceFor(seat: number): { face: string; deep: string; rim: string } {
  return seat === 0
    ? { face: baQuanTheme.stoneFace, deep: baQuanTheme.stoneDeep, rim: baQuanTheme.stoneRim }
    : { face: baQuanTheme.shellFace, deep: baQuanTheme.shellDeep, rim: baQuanTheme.shellRim };
}
