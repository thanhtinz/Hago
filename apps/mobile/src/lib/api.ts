import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function guessHost(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  // Trên thiết bị thật, lấy IP máy dev từ Expo host URI.
  const hostUri = (Constants.expoConfig as any)?.hostUri ?? (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = guessHost();
export const TOKEN_KEY = 'hago.token';

let memoryToken: string | null = null;

export async function setToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  return memoryToken;
}

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(json.error ?? 'REQUEST_FAILED', res.status);
  return json as T;
}

export function avatarUrl(style: string | undefined, seed: string | undefined, size = 160): string {
  return `${API_URL}/avatar/${style || 'adventurer'}/${encodeURIComponent(seed || 'hago')}.svg?size=${size}`;
}

/** Thông báo lỗi thân thiện cho người chơi Việt. */
export const ERROR_TEXT: Record<string, string> = {
  INVALID_CREDENTIALS: 'Sai tài khoản hoặc mật khẩu',
  USERNAME_TAKEN: 'Tên đăng nhập đã có người dùng',
  EMAIL_TAKEN: 'Email đã được đăng ký',
  VALIDATION: 'Thông tin chưa hợp lệ',
  TOO_MANY_ATTEMPTS: 'Thử lại sau ít phút nhé',
  ACCOUNT_BANNED: 'Tài khoản đã bị khoá',
  INSUFFICIENT_FUNDS: 'Bạn không đủ tiền',
  ALREADY_OWNED: 'Bạn đã sở hữu món này',
  ROOM_FULL: 'Phòng đã đầy',
  ROOM_NOT_FOUND: 'Không tìm thấy phòng',
  WRONG_PASSWORD: 'Sai mật khẩu phòng',
  ROOM_IN_PROGRESS: 'Phòng đang trong trận',
  NOT_ENOUGH_PLAYERS: 'Chưa đủ người chơi',
  PLAYERS_NOT_READY: 'Còn người chưa sẵn sàng',
  NOT_YOUR_TURN: 'Chưa tới lượt bạn',
  CELL_TAKEN: 'Ô này đã có quân',
  RATE_LIMITED: 'Bạn thao tác hơi nhanh, chờ chút nhé',
  MUTED: 'Bạn đang bị hạn chế chat',
  BLOCKED: 'Không thể tương tác với người này',
  NETWORK: 'Mất kết nối tới máy chủ',

  // Bang hội
  ALREADY_IN_GUILD: 'Bạn đang ở một bang rồi',
  NOT_IN_GUILD: 'Bạn chưa ở bang nào',
  GUILD_NOT_FOUND: 'Không tìm thấy bang',
  GUILD_NAME_TAKEN: 'Tên hoặc thẻ bang đã có người dùng',
  BAD_GUILD_NAME: 'Tên bang cần 3-24 ký tự',
  BAD_GUILD_TAG: 'Thẻ bang cần 2-5 chữ in hoa hoặc số',
  GUILD_FULL: 'Bang đã đủ người',
  GUILD_CLOSED: 'Bang này chỉ nhận người được mời',
  LEVEL_TOO_LOW: 'Cấp của bạn chưa đủ để vào bang này',
  OWNER_MUST_TRANSFER: 'Nhường ghế chủ bang trước đã',
  CANNOT_KICK_OWNER: 'Không thể đuổi chủ bang',
  NOT_A_MEMBER: 'Người này không ở trong bang',
  NO_REQUEST: 'Không còn đơn nào của người này',
  NOT_ALLOWED: 'Bạn không có quyền làm việc này',

  ALREADY_CLAIMED: 'Bạn đã nhận phần này rồi',
  QUEST_INCOMPLETE: 'Nhiệm vụ chưa xong',
  QUEST_NOT_FOUND: 'Không tìm thấy nhiệm vụ',

  // Ảnh trong chat
  BAD_IMAGE: 'File này không phải ảnh hợp lệ',
  UNSUPPORTED_IMAGE: 'Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF',
  IMAGE_TOO_LARGE: 'Ảnh nặng quá, tối đa 2MB',

  // Giải đấu
  TOURNAMENT_NOT_FOUND: 'Không tìm thấy giải',
  TOURNAMENT_STARTED: 'Giải đã khai mạc, không đổi được nữa',
  TOURNAMENT_FULL: 'Giải đã đủ người',
  ALREADY_JOINED: 'Bạn đã đăng ký giải này',
  NOT_JOINED: 'Bạn chưa đăng ký giải này',
  GAME_NOT_ELIGIBLE: 'Game này không mở giải đấu được',
  BAD_SIZE: 'Số suất phải là 4, 8 hoặc 16',
};

export function friendlyError(code: string): string {
  return ERROR_TEXT[code] ?? 'Có lỗi xảy ra, thử lại nhé';
}
