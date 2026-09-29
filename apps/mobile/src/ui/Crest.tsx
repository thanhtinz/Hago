import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { avatarUrl } from '../net/api';
import { A } from './theme';

/**
 * Ảnh đại diện: **chọn từ một bộ con dấu khắc sẵn**, không tải ảnh lên.
 *
 * Cho tải ảnh lên nghĩa là phải có kho tệp, phải lọc nội dung, và phải chịu
 * trách nhiệm với thứ người ta tải lên. Một bộ con dấu giải quyết đúng nhu cầu
 * thật — "cho tôi khác người bên cạnh" — mà không mở cánh cửa nào trong ba
 * cánh đó.
 *
 * Bộ hình là **mười bốn quân cờ tướng**, bảy bên đỏ và bảy bên đen, đúng chữ
 * triện hai bên dùng. Bản đầu tôi tự vẽ thêm mấy hình dân gian (sen, tre, nón,
 * rồng) bằng nét SVG; ở cỡ 46 điểm chúng đọc ra thành dấu thăng, tam giác cảnh
 * báo và một nét nguệch ngoạc. Chữ khắc thì cỡ nào cũng sắc, và nó vốn đã là
 * ngôn ngữ mỹ thuật của cả app.
 */

export const CRESTS = [
  'do-tuong', 'do-si', 'do-tinh', 'do-xe', 'do-phao', 'do-ma', 'do-tot',
  'den-tuong', 'den-si', 'den-tinh', 'den-xe', 'den-phao', 'den-ma', 'den-tot',
] as const;
export type CrestId = (typeof CRESTS)[number];

/** Chữ của từng quân. Hai bên dùng chữ khác nhau, đúng như bàn cờ thật. */
const GLYPH: Record<CrestId, string> = {
  'do-tuong': '帥',
  'do-si': '仕',
  'do-tinh': '相',
  'do-xe': '俥',
  'do-phao': '炮',
  'do-ma': '傌',
  'do-tot': '兵',
  'den-tuong': '將',
  'den-si': '士',
  'den-tinh': '象',
  'den-xe': '車',
  'den-phao': '包',
  'den-ma': '馬',
  'den-tot': '卒',
};

const isRed = (id: CrestId) => id.startsWith('do-');

export function Crest({ id, size = 64, ring = true }: { id: CrestId; size?: number; ring?: boolean }) {
  const r = size / 2;
  const gid = `crest-${size}`;
  const red = isRed(id);
  // Hai bên khác nhau cả ở màu chữ lẫn màu vành, nên nhìn lướt qua lưới mười
  // bốn ô là thấy ngay hai họ, không phải đọc từng chữ.
  const ink = red ? A.sealLit : A.ink;
  const rim = red ? A.seal : A.goldDeep;
  return (
    <Svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`}>
      <Defs>
        <RadialGradient id={gid} cx="0.35" cy="0.3" r="0.85">
          <Stop offset="0" stopColor={A.panelHi} />
          <Stop offset="1" stopColor={A.panelLo} />
        </RadialGradient>
      </Defs>
      <Circle cx={0} cy={0} r={r - 1} fill={`url(#${gid})`} />
      {ring ? <Circle cx={0} cy={0} r={r - 1.6} fill="none" stroke={rim} strokeWidth={size * 0.038} /> : null}
      <Circle cx={0} cy={0} r={r * 0.78} fill="none" stroke={rim} strokeWidth={size * 0.018} opacity={0.55} />
      <SvgText x={0} y={r * 0.37} fontSize={r * 1.02} fill={ink} textAnchor="middle" fontWeight="bold">
        {GLYPH[id]}
      </SvgText>
    </Svg>
  );
}

/**
 * Con dấu của một người, tự chọn theo id khi họ chưa đặt.
 *
 * Tự chọn **cố định theo id** chứ không ngẫu nhiên: người chưa bao giờ vào
 * phần cài đặt vẫn có một con dấu riêng, và nó không đổi sau mỗi lần mở app.
 */
export function crestFor(avatar: string | null, id: string): CrestId {
  if (avatar && (CRESTS as readonly string[]).includes(avatar)) return avatar as CrestId;
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CRESTS[h % CRESTS.length]!;
}

/**
 * Ảnh đại diện của một người: **ảnh tải lên nếu có, không thì con dấu**.
 *
 * Một chỗ duy nhất quyết định chuyện đó, nên sảnh, thanh người chơi, danh
 * sách bạn và trang cá nhân không thể lệch nhau.
 */
export function Face({ avatar, id, size = 44, ring = true }: { avatar: string | null; id: string; size?: number; ring?: boolean }) {
  const url = avatarUrl(avatar);
  if (url) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          borderWidth: ring ? Math.max(1.4, size * 0.038) : 0,
          borderColor: A.goldDeep,
          backgroundColor: A.panelLo,
        }}
      >
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Ảnh đại diện" />
      </View>
    );
  }
  return <Crest id={crestFor(avatar, id)} size={size} ring={ring} />;
}

/** Khung tròn có viền, dùng ở sảnh, thanh người chơi và danh sách bạn. */
export function CrestBadge({ avatar, id, size = 44, active }: { avatar: string | null; id: string; size?: number; active?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: active ? 2 : 1.2,
        borderColor: active ? A.gold : A.lineSoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Face avatar={avatar} id={id} size={size - 4} ring={false} />
    </View>
  );
}
