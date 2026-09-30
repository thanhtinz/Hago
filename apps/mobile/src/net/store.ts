/**
 * Cái hộp nhỏ nhớ vài thứ qua lần mở app sau.
 *
 * Tách ra từ chỗ giữ token trong `api.ts`: cách đọc/ghi đã đúng sẵn ở đó
 * (bọc `try/catch` vì chế độ riêng tư của trình duyệt chặn `localStorage`
 * và **ném** chứ không trả về null), nhưng nó chỉ phục vụ đúng một khoá.
 * Mức máy đã chọn, âm thanh bật hay tắt, mấy mã phòng vừa vào — thứ nào
 * cũng cần đúng cơ chế ấy.
 *
 * Không có `localStorage` thì giữ trong bộ nhớ: app vẫn chạy đủ, chỉ mất
 * khả năng nhớ qua lần mở sau. Một tuỳ chọn giao diện không đáng để làm
 * hỏng cả màn hình.
 */

const mem = new Map<string, string>();

function raw(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? mem.get(key) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}

function put(key: string, value: string | null): void {
  if (value === null) mem.delete(key);
  else mem.set(key, value);
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    /* chế độ riêng tư chặn localStorage — vẫn chơi được, chỉ không nhớ */
  }
}

/** Đọc một giá trị JSON, trả về `fallback` nếu chưa có hoặc hỏng. */
export function load<T>(key: string, fallback: T): T {
  const s = raw(`co.${key}`);
  if (s === null) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    // Dữ liệu hỏng thì vứt, đừng để một khoá sai làm app không mở được nữa.
    put(`co.${key}`, null);
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  put(`co.${key}`, JSON.stringify(value));
}

/**
 * Mã phòng vừa vào, mới nhất trước, giữ tối đa năm mã.
 *
 * Phòng bị xoá khi cả hai người rời, nên phần lớn mã cũ sẽ trả `NO_ROOM`
 * khi bấm lại — vì thế danh sách này hiện kèm thời điểm và **không** được
 * trình bày như những phòng đang còn sống.
 */
export interface RecentRoom {
  code: string;
  gameId: string;
  at: number;
}

export function recentRooms(): RecentRoom[] {
  return load<RecentRoom[]>('recent-rooms', []);
}

export function rememberRoom(code: string, gameId: string, at: number): void {
  const rest = recentRooms().filter((r) => r.code !== code);
  save('recent-rooms', [{ code, gameId, at }, ...rest].slice(0, 5));
}

/**
 * Sao đã đạt ở từng ải, giữ ngay trên máy.
 *
 * Máy là **nguồn chân lý** của tiến độ vượt ải, không phải máy chủ. Ván
 * chạy hoàn toàn trên thiết bị và máy chủ không chứng minh được bên kia là
 * máy, nên nó chỉ giữ một bản sao lưu. Nhờ thế người chưa đăng nhập vẫn
 * chơi được và vẫn giữ được buổi tối đầu tiên của họ.
 */
export function saoVuotAi(): Record<string, number> {
  return load<Record<string, number>>('vuot-ai', {});
}

/** Ghi sao của một ải. Chỉ ghi đè khi lần này **tốt hơn** lần trước. */
export function ghiSao(aiId: string, sao: number): Record<string, number> {
  const all = saoVuotAi();
  if ((all[aiId] ?? 0) >= sao) return all;
  const next = { ...all, [aiId]: sao };
  save('vuot-ai', next);
  return next;
}
