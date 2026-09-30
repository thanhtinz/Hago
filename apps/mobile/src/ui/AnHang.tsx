import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { A } from './theme';

/**
 * Ấn hạng: huy hiệu **vẽ** cho danh hiệu.
 *
 * Trước đây danh hiệu chỉ là một chuỗi chữ bọc trong `Tag` — "Cao thủ" viết
 * bằng chữ vàng nhỏ. Một bậc hạng phải nhìn ra từ xa và phải **đổi vật
 * liệu** khi lên bậc; đó là toàn bộ lý do người ta leo hạng, và mọi tựa game
 * có hệ thống hạng đều tiêu ngân sách mỹ thuật lớn nhất vào đúng chỗ này.
 *
 * Hình là một con dấu tám cạnh khắc chìm, không phải một chiếc khiên châu
 * Âu: nền tảng này là cờ Việt, và con dấu là vật mang thứ bậc trong văn hoá
 * đó. Vành ngoài đi từ đá tới vàng sáng qua sáu bậc; sáu chấm dọc mép dưới
 * đếm bậc, nên hai bậc cùng sắc vàng vẫn phân biệt được ngay.
 *
 * `bac={null}` vẽ đúng cái khung rỗng: chưa định hạng thì không mượn vật
 * liệu của bậc một, vì bậc một cũng là một thành tựu.
 */

/** Vật liệu từng bậc. Sáu nấc đi từ đá xám tới vàng sáng, không nhảy cóc. */
const VAT_LIEU: { vanh: string; lot: string; net: string; diem: string }[] = [
  { vanh: A.line, lot: '#141A24', net: '#3A4557', diem: A.inkSoft },
  { vanh: '#8A8F98', lot: '#181D27', net: '#A8AEB8', diem: '#C9CED6' },
  { vanh: A.goldDark, lot: '#1C1608', net: '#9A6B18', diem: A.goldDeep },
  { vanh: A.goldDeep, lot: '#231A08', net: A.gold, diem: A.gold },
  { vanh: A.gold, lot: '#2A2010', net: A.goldLit, diem: A.gold },
  { vanh: A.goldLit, lot: '#33260F', net: A.gold, diem: A.goldLit },
];

/** Vành ngoài và vành khắc chìm bên trong: cùng một hình tám cạnh, tâm (50,42). */
const NGOAI = 'M28 16 H72 L82 26 V58 L72 68 H28 L18 58 V26 Z';
const TRONG = 'M33 22 H67 L77 32 V52 L67 62 H33 L23 52 V32 Z';

export function AnHang({ bac, size = 84 }: { bac: number | null; size?: number }) {
  // Dưới 56 điểm thì sáu chấm đếm bậc nhỏ hơn hai điểm ảnh và đọc ra thành
  // một vệt bẩn. Bỏ chúng đi và cắt khung lại cho con dấu chiếm hết chỗ:
  // một chi tiết không đọc được là nhiễu, không phải thông tin.
  const nho = size < 56;
  const v = bac ? VAT_LIEU[Math.min(6, Math.max(1, bac)) - 1]! : null;
  // Khung rỗng vẫn phải **nhìn thấy được**: `lineSoft` trên mặt panel gần
  // như cùng một màu, và một huy hiệu tàng hình đọc ra là một chỗ hỏng chứ
  // không phải một chỗ chưa đạt.
  const vanh = v?.vanh ?? A.line;
  const lot = v?.lot ?? A.panelLo;
  const net = v?.net ?? '#3A4557';
  const cao = bac != null && bac >= 5;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={bac ? `Ấn hạng bậc ${bac} trên 6` : 'Chưa định hạng'}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={nho ? '12 6 76 76' : '0 0 100 100'}>
        {/* Bậc cuối phát sáng: sáu tia mọc từ sau con dấu, chỉ thò ra phần
            ngọn. Chỉ bậc sáu có tia — một hiệu ứng dùng ở mọi bậc thì nó
            không còn nói được bậc nào là cao nhất. */}
        {bac === 6 ? (
          <G opacity={0.6}>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <Path key={deg} d="M46.4 22 H53.6 L50 2 Z" fill={A.goldLit} transform={`rotate(${deg} 50 42)`} />
            ))}
          </G>
        ) : null}

        {/* Mặt dấu. Lót tối hơn vành để vành đọc thành một cái gờ nổi. */}
        <Path d={NGOAI} fill={lot} stroke={vanh} strokeWidth={cao ? 4 : 3} strokeLinejoin="round" />
        {/* Bậc năm trở lên có vành kép: nấc đổi vật liệu cuối cùng không thể
            chỉ là một sắc vàng sáng hơn, mắt không đo được sắc độ. */}
        {cao ? (
          <Path d={NGOAI} fill="none" stroke={vanh} strokeWidth={1} strokeLinejoin="round" opacity={0.55} transform="translate(5.5 4.62) scale(0.89)" />
        ) : null}
        <Path d={TRONG} fill="none" stroke={net} strokeWidth={1.2} strokeLinejoin="round" opacity={0.7} />

        {/* Lõi: cửu cung — ba đường dọc, ba đường ngang, một quân ở giao
            điểm giữa. Ký hiệu này chung cho mọi bộ môn trong app, nên huy
            hiệu không thiên vị bộ môn nào. */}
        <G opacity={bac ? 1 : 0.3}>
          {[0, 1, 2].map((i) => (
            <Path key={`h${i}`} d={`M38 ${34 + i * 8} H62`} stroke={net} strokeWidth={1.1} strokeLinecap="round" />
          ))}
          {[0, 1, 2].map((i) => (
            <Path key={`v${i}`} d={`M${38 + i * 12} 34 V50`} stroke={net} strokeWidth={1.1} strokeLinecap="round" />
          ))}
          <Circle cx={50} cy={42} r={4.6} fill={bac === 6 ? A.seal : vanh} />
          <Circle cx={50} cy={42} r={4.6} fill="none" stroke={bac === 6 ? A.sealLit : net} strokeWidth={0.9} />
        </G>

        {/* Sáu chấm đếm bậc. Vàng cạnh vàng thì màu không phân biệt nổi bậc
            năm với bậc sáu; một dãy chấm thì đếm được. */}
        <G opacity={nho ? 0 : 1}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const day = bac != null && i < bac;
            return (
              <Circle
                key={i}
                cx={27.5 + i * 9}
                cy={88}
                r={3}
                fill={day ? (v?.diem ?? A.gold) : 'none'}
                stroke={day ? (v?.diem ?? A.gold) : A.line}
                strokeWidth={1.2}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
