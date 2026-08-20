import { Platform } from 'react-native';

/**
 * Hago design system — chibi/casual: màu pastel ấm, bo góc lớn, nút "đồ chơi"
 * có viền dày và bóng đổ cứng (hard shadow) thay vì đổ bóng mờ.
 */
export const C = {
  bg: '#FFF6EE',
  bgAlt: '#FFEFE2',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF2E9',
  ink: '#2E2545',
  inkSoft: '#6B6285',
  inkFaint: '#A69FB8',
  line: '#F0E3D6',

  primary: '#FF7A59',
  primaryDark: '#E85F3C',
  primarySoft: '#FFE3D8',

  secondary: '#7C6BFF',
  secondaryDark: '#5F4DE0',
  secondarySoft: '#E9E5FF',

  mint: '#39C77F',
  mintSoft: '#D9F7E8',
  sky: '#2FA9F5',
  skySoft: '#DCF0FF',
  sun: '#FFC53D',
  sunSoft: '#FFF1CC',
  rose: '#F2589B',
  roseSoft: '#FFE0EE',

  danger: '#EE5A5A',
  white: '#FFFFFF',
  shadow: '#E4CDBB',
  overlay: 'rgba(46, 37, 69, 0.45)',
};

export const RARITY: Record<string, { color: string; soft: string; label: string }> = {
  common: { color: '#8E96A8', soft: '#EDF0F5', label: 'Thường' },
  rare: { color: '#2FA9F5', soft: '#DCF0FF', label: 'Hiếm' },
  epic: { color: '#A45BFF', soft: '#F0E5FF', label: 'Sử thi' },
  legendary: { color: '#FF9F1C', soft: '#FFF0D6', label: 'Huyền thoại' },
};

export const R = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const F = {
  display: 'Baloo2_800ExtraBold',
  heading: 'Baloo2_700Bold',
  title: 'Baloo2_600SemiBold',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodyBold: 'BeVietnamPro_700Bold',
};

/** Bóng "cứng" kiểu sticker chibi: khối màu lệch xuống dưới. */
export function toyShadow(color = C.shadow, depth = 4) {
  return Platform.select({
    web: { boxShadow: `0 ${depth}px 0 ${color}` } as any,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: depth },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: depth,
    },
  });
}

export function softShadow(opacity = 0.12, radius = 16, dy = 6) {
  return Platform.select({
    web: { boxShadow: `0 ${dy}px ${radius}px rgba(46,37,69,${opacity})` } as any,
    default: {
      shadowColor: '#2E2545',
      shadowOffset: { width: 0, height: dy },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation: 6,
    },
  });
}

/** Bóng ăn theo màu thẻ — bóng xám trên nền màu trông bẩn, bóng cùng tông thì nổi khối. */
export function glowShadow(color: string, opacity = 0.45, radius = 20, dy = 10) {
  return Platform.select({
    web: { boxShadow: `0 ${dy}px ${radius}px ${hexA(color, opacity)}` } as any,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: dy },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation: 8,
    },
  });
}

/** #RRGGBB + alpha 0..1 -> rgba() */
export function hexA(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Gradient tím→hồng dùng cho các vùng hero (header, banner nổi bật). */
export const HERO_GRADIENT: [string, string, string] = ['#6C5CE7', '#A55BFF', '#FF6FA5'];

export const ACTION_GRADIENT: Record<string, [string, string]> = {
  quick: ['#FF9A62', '#FF5E7D'],
  find: ['#4FC3F7', '#2F7BF5'],
  create: ['#5FDBA7', '#22A97A'],
  shop: ['#FFC46B', '#FF8A3D'],
};

/** Gradient của từng game — đủ đậm để chữ trắng và lớp gloss vẫn nổi rõ. */
export const GAME_GRADIENT: Record<string, [string, string]> = {
  caro: ['#7A5CFF', '#A98BFF'],
  battleship: ['#1E96F5', '#5FC2FF'],
  oanquan: ['#FF8A3D', '#FFB25E'],
  sheep: ['#25BE7B', '#5FD9A2'],
  monopoly: ['#EE4C6C', '#FF859C'],
  ludo: ['#FF7530', '#FFA45C'],
  werewolf: ['#6B55D6', '#3D3277'],
};

export const SEAT_COLORS = ['#FF7A59', '#2FA9F5', '#39C77F', '#FFC53D', '#F2589B', '#7C6BFF'];
