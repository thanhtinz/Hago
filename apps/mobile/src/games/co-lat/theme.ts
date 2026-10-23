/**
 * Bộ mặt của cờ lật: **bàn nỉ xanh của phòng cờ**.
 *
 * Othello là game duy nhất trong bộ có luật quốc tế thống nhất và một hình
 * ảnh toàn cầu đi kèm: nỉ xanh đậm, quân hai mặt đen trắng bóng. Không vay
 * mượn chất liệu của game nào khác — giấy vở là của caro, sân gạch là của
 * gánh — nên bàn này giữ đúng hình ảnh đó: ô nỉ có vân chéo rất nhẹ, quân là
 * đĩa hai mặt có khối, mặt đen bóng đèn, mặt trắng ngà.
 */
export const latTheme = {
  /** Nỉ bàn. */
  felt: '#2E6B4F',
  feltLit: '#35795A',
  feltDark: '#24543E',
  /** Vạch kẻ ô — sáng hơn nỉ một nấc, không trắng hẳn. */
  grid: '#4C9271',
  /** Quân đen. */
  blackFace: '#2A2A2E',
  blackDeep: '#101012',
  blackRim: '#4A4A52',
  /** Quân trắng. */
  whiteFace: '#F4EFE3',
  whiteDeep: '#CFC5AC',
  whiteRim: '#FFFDF4',
  /** Chấm gợi ý nước đi được. */
  hintDot: '#D9E8B0',
  /** Vòng đánh dấu nước vừa đi và quân vừa lật. */
  mark: '#E3BC72',
} as const;

/** Mặt quân theo ghế: ghế 0 cầm đen (đi trước), ghế 1 cầm trắng. */
export function faceFor(seat: number): { face: string; deep: string; rim: string } {
  return seat === 0
    ? { face: latTheme.blackFace, deep: latTheme.blackDeep, rim: latTheme.blackRim }
    : { face: latTheme.whiteFace, deep: latTheme.whiteDeep, rim: latTheme.whiteRim };
}
