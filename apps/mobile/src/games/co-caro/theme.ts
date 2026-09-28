/**
 * Bộ mặt của cờ caro: **vở ô ly học trò**.
 *
 * Mực bút bi xanh và đỏ trên giấy kẻ ô — đây là ký ức có thật và rất riêng của
 * người Việt, caro chơi trong giờ ra chơi trên trang vở. Không game nào khác
 * trong nền tảng lấy được chất liệu này, nên nó vừa đúng vừa không đụng hàng:
 * cờ vây lấy gỗ kaya và quân sứ, cờ tướng lấy gỗ nâu chữ triện, cá ngựa lấy
 * nhựa bóng bốn màu. Caro là game duy nhất **phẳng tuyệt đối** — không khối,
 * không bóng đổ, chỉ có nét viết.
 *
 * Hệ quả kỹ thuật rất có lợi: gần như toàn bộ vẽ được bằng SVG và nền màu,
 * không cần đi tìm ảnh. Nét kẻ ô ly là đường thẳng, quân X và O là nét bút.
 */
export const caroTheme = {
  paper: '#FBF8EF',
  /** Chỗ sáng nhất của trang giấy, gần giữa. */
  paperLit: '#FFFDF7',
  paperShade: '#EFE8D6',
  /** Sợi giấy lấm tấm — thứ làm nền giấy khác nền tô màu. */
  fibre: '#C7BCA0',
  /** Nét kẻ ô ly, xanh tím nhạt. */
  grid: '#A9BEDD',
  /** Nét đậm mỗi 5 ô — để đếm chuỗi bằng mắt, đúng thứ người chơi caro cần. */
  gridMajor: '#8AA6CE',
  /** Kẻ lề dọc của trang vở. */
  marginRed: '#E0736F',
  inkBlue: '#25428F',
  inkRed: '#C0392B',
  /** Vệt bút dạ quang đánh dấu chuỗi thắng. */
  highlight: '#FCE99A',
  /** Lõi đậm hơn của vệt dạ quang, nơi bút đi chậm lại. */
  highlightDeep: '#F6D964',
  pencil: '#8A8578',
  deskWood: '#5C4020',
  /** Màu app nền, để hai đầu mặt bàn tan dần vào khung chứ không cắt ngang. */
  deskFade: '#1A1008',
  /** Hai tờ giấy lót dưới, tối dần xuống. */
  paperUnder1: '#E6DFCB',
  paperUnder2: '#CFC7B0',
  ink: '#2B2A26',
  inkSoft: '#6B675C',
} as const;

/** Màu mực theo ghế. Ghế 0 cầm bút xanh, ghế 1 cầm bút đỏ. */
export function inkFor(seat: number): string {
  return seat === 0 ? caroTheme.inkBlue : caroTheme.inkRed;
}
