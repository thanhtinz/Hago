/**
 * Luật chơi, viết cho **người chơi**.
 *
 * `docs/rules/*.md` là đặc tả cho engine: nó có đồ thị kề, perft, biến thể,
 * và những chỗ "dễ cài sai nhất". Người mở app lên không cần thứ đó — họ
 * cần bốn câu: bàn thế nào, quân đi thế nào, thắng bằng gì, và mẹo đầu
 * tiên nên biết.
 *
 * Nên đây không phải bản chép rút gọn của tài liệu kia; nó là một văn bản
 * khác, cho một người đọc khác. Tài liệu kia vẫn là **nguồn chân lý về
 * luật** — chỗ nào ở đây mâu thuẫn với nó thì chỗ này sai.
 *
 * Mười ba bộ môn đều có mục, kể cả mười bộ chưa mở: người ta muốn biết
 * mình đang chờ cái gì.
 */

export interface Rules {
  /** Một câu nói trò này là trò gì. */
  tomTat: string;
  /** Bàn cờ và số quân. */
  ban: string;
  /** Quân đi thế nào, ăn thế nào. */
  cachDi: string[];
  /** Thắng bằng gì. */
  thang: string[];
  /** Một hai mẹo cho người mới. Bỏ trống được. */
  meo?: string[];
  /** Chỗ người mới hay hiểu sai. Bỏ trống được. */
  luuY?: string[];
}

export const RULES: Record<string, Rules> = {
  'co-caro': {
    tomTat: 'Thay nhau đặt quân, ai xếp được năm quân liền nhau trước thì thắng.',
    ban: 'Bàn 15×15 ô, mỗi bên đặt không giới hạn số quân. Bên X đi trước.',
    cachDi: [
      'Mỗi lượt đặt đúng một quân vào một ô còn trống.',
      'Quân đã đặt không di chuyển và không bị ăn.',
    ],
    thang: [
      'Xếp được **đúng năm quân** liền nhau theo hàng ngang, hàng dọc hoặc đường chéo.',
      'Sáu quân trở lên liền nhau **không tính** là thắng — đây là luật "chặn hai đầu" của cờ caro Việt Nam, khác với gomoku tự do.',
      'Kín bàn mà chưa ai đủ năm thì hoà.',
    ],
    meo: [
      'Đừng chỉ chặn: mỗi nước chặn nên đồng thời là một nước xây chuỗi của mình.',
      'Chuỗi ba quân **hở hai đầu** nguy hiểm hơn chuỗi bốn quân đã bị chặn một đầu.',
    ],
    luuY: [
      'Ô trên bàn chỉ khoảng 23 điểm, nhỏ hơn nửa mức chạm tối thiểu — nên trong ván với người thật, chạm lần đầu chỉ **ướm quân**, chạm lại đúng ô đó mới đặt thật.',
    ],
  },

  'co-ganh': {
    tomTat: 'Quân không bao giờ bị nhấc khỏi bàn — quân bị ăn chỉ **đổi màu** sang phe người ăn.',
    ban: 'Bàn 25 điểm, giao của lưới 5×5. Mỗi bên 8 quân, xếp sẵn ở hai cạnh đối diện.',
    cachDi: [
      'Mỗi lượt nhấc một quân của mình sang **một điểm kề đang trống**.',
      'Điểm kề gồm ngang và dọc ở mọi điểm, cộng thêm đường chéo ở những điểm có tổng hàng và cột là số chẵn.',
      '**Gánh**: đi tới một điểm mà hai bên nó có đúng hai quân địch thẳng hàng thì cả hai quân đó đổi màu.',
      '**Vây**: quân địch nào không còn nước đi nào cũng đổi màu theo.',
    ],
    thang: ['Chiếm hết cả 16 quân trên bàn.', 'Tổng số quân trên bàn luôn là 16 — không quân nào rời bàn.'],
    meo: [
      'Đừng đẩy hai quân của mình vào thế thẳng hàng cạnh một điểm trống: đó chính là thế bị gánh.',
      'Điểm giữa bàn có tám điểm kề, gấp đôi điểm ở cạnh — giữ được nó là giữ được thế chủ động.',
    ],
    luuY: ['Nước đi bị **ép** khi đối thủ vừa tạo thế gánh: ô bị ép hiện quầng đỏ, và lượt đó chỉ đi vào đó được.'],
  },

  'o-an-quan': {
    tomTat: 'Rải sỏi quanh bàn theo một chiều, rải khéo thì ăn được cả ô.',
    ban: 'Hai ô quan lớn ở hai đầu, mỗi ô một quan. Mười ô dân nhỏ ở giữa, mỗi ô năm dân. Mỗi bên giữ năm ô dân bên mình.',
    cachDi: [
      'Bốc hết sỏi ở **một ô dân bên mình**, chọn một chiều, rồi rải mỗi ô một viên theo chiều đó.',
      'Rải hết mà ô kế tiếp còn sỏi thì **bốc tiếp ô đó** và rải tiếp, cứ thế.',
      'Rải hết mà ô kế tiếp **trống** và ô sau nữa có sỏi thì **ăn** ô có sỏi đó.',
      'Ăn xong mà ô tiếp theo lại trống và ô sau nữa có sỏi thì ăn tiếp.',
    ],
    thang: [
      'Ván dừng khi **hết cả hai quan**. Ai nhiều điểm hơn thì thắng.',
      'Một quan bằng mười dân.',
    ],
    meo: [
      'Đếm trước: số sỏi trong ô quyết định nước rải dừng ở đâu, và chỗ dừng quyết định có ăn được hay không.',
      'Đừng để ô sát quan của mình đầy sỏi — đó là ô đối thủ nhắm vào.',
    ],
    luuY: ['Hết sỏi bên mình thì phải **vay** năm dân từ phần đã ăn để rải tiếp; hết cả phần đã ăn thì thua.'],
  },

  'co-lat': {
    tomTat: 'Kẹp quân địch giữa hai quân mình thì quân bị kẹp lật sang màu mình. Cuối ván ai nhiều quân hơn thì thắng.',
    ban: 'Bàn 8×8. Bốn quân đặt sẵn ở giữa, hai đen hai trắng chéo nhau.',
    cachDi: [
      'Đặt một quân sao cho **kẹp được ít nhất một quân địch** giữa quân vừa đặt và một quân khác của mình.',
      'Kẹp tính theo cả tám hướng, và mọi quân bị kẹp đều lật.',
      'Không có nước kẹp nào thì **mất lượt**.',
    ],
    thang: ['Hết nước đi cho cả hai bên thì đếm quân; ai nhiều hơn thắng.'],
    meo: ['Bốn góc không bao giờ bị lật — chiếm được góc là chiếm được cả một vùng.'],
  },

  'co-hum': {
    tomTat: 'Hai bên chơi hai luật khác nhau: một bên là hùm đi săn, bên kia là đàn dê đi vây.',
    ban: 'Bàn Alquerque 25 điểm, y như cờ gánh. Hai con hùm có sẵn trên bàn; hai mươi con dê thả dần.',
    cachDi: [
      '**Hùm**: đi sang điểm kề trống, hoặc **nhảy qua một con dê** xuống điểm trống ngay sau nó để ăn con dê đó.',
      '**Dê**: lượt đầu chỉ thả dê xuống điểm trống; thả hết hai mươi con rồi mới được di chuyển dê sang điểm kề.',
    ],
    thang: ['**Hùm** thắng khi ăn đủ năm con dê.', '**Dê** thắng khi cả hai con hùm đều không còn nước đi nào.'],
    meo: ['Đàn dê không bao giờ nên đứng rời rạc: một con dê lẻ cạnh một điểm trống là một bữa ăn.'],
  },

  'co-ba-quan': {
    tomTat: 'Bàn nhỏ nhất trong bộ, ván chỉ vài chục giây — đúng cho lúc chờ thang máy.',
    ban: 'Chín điểm, mỗi bên ba quân.',
    cachDi: [
      'Lượt đầu thả ba quân xuống điểm trống.',
      'Thả hết rồi thì mỗi lượt dời một quân sang điểm kề trống.',
    ],
    thang: ['Xếp được ba quân của mình thành một hàng ngang, dọc hoặc chéo.'],
    meo: ['Chiếm điểm giữa trước: nó nằm trên bốn hàng, gấp đôi mọi điểm khác.'],
  },

  'co-hex': {
    tomTat: 'Nối hai cạnh bàn của mình bằng một dải quân liền nhau. Ván này **không bao giờ hoà**.',
    ban: 'Bàn hình thoi lát ô lục giác, 11×11. Mỗi bên nhận hai cạnh đối diện.',
    cachDi: ['Mỗi lượt đặt một quân xuống ô trống.', 'Quân đã đặt không di chuyển và không bị ăn.'],
    thang: ['Nối được hai cạnh của mình bằng một dải quân liền nhau.'],
    meo: [
      'Hai ô cách nhau một nhịp chéo gọi là **cầu**: đối thủ chặn một bên thì còn bên kia, nên nó coi như đã nối.',
      'Luật ngắn nhất trong bộ, nhưng chiều sâu ngang cờ vây.',
    ],
    luuY: ['Đã lấp kín bàn thì **chắc chắn** một bên đã nối xong — hoà là điều bất khả về mặt toán học.'],
  },

  'co-dam': {
    tomTat: 'Quân đi chéo, nhảy qua quân địch để ăn, và ăn được thì **bắt buộc phải ăn**.',
    ban: 'Bàn 8×8 nhưng chỉ dùng 32 ô sẫm. Mỗi bên 12 quân.',
    cachDi: [
      'Quân thường đi chéo một ô về phía trước.',
      'Nhảy qua một quân địch kề chéo xuống ô trống ngay sau nó thì ăn quân đó, và **ăn liên tiếp** nếu còn nhảy được.',
      'Quân tới hàng cuối thành **Đam**: đi và ăn được xa tuỳ ý theo đường chéo.',
    ],
    thang: ['Đối phương hết quân, hoặc hết nước đi hợp lệ.'],
    luuY: ['Ăn là **bắt buộc**: có nước ăn thì không được đi nước khác.'],
  },

  'co-vua': {
    tomTat: 'Cờ vua quốc tế, luật FIDE.',
    ban: 'Bàn 8×8, mỗi bên 16 quân.',
    cachDi: [
      'Mỗi quân một cách đi riêng: Vua một ô, Hậu mọi hướng, Xe thẳng, Tượng chéo, Mã hình chữ L, Tốt tiến thẳng và ăn chéo.',
      'Có nhập thành, bắt tốt qua đường, và phong cấp khi tốt tới hàng cuối.',
    ],
    thang: ['Chiếu bí Vua đối phương.', 'Hoà khi hết nước đi mà không bị chiếu, lặp ba lần, hoặc năm mươi nước không ăn quân và không đẩy tốt.'],
  },

  'co-tuong': {
    tomTat: 'Cờ tướng Trung Hoa: có sông, có cung, và hai Tướng không được nhìn thẳng nhau.',
    ban: 'Bàn 9 cột 10 hàng, quân đặt trên giao điểm. Mỗi bên 16 quân.',
    cachDi: [
      'Tướng và Sĩ chỉ đi trong cung ba nhân ba; Tượng không qua sông.',
      'Pháo đi như Xe nhưng ăn thì phải **nhảy qua đúng một quân** làm ngòi.',
      'Tốt qua sông rồi mới đi ngang được.',
    ],
    thang: ['Chiếu bí Tướng đối phương.'],
    luuY: ['Hai Tướng **không được đối mặt** trên cùng một cột khi giữa chúng không còn quân nào.'],
  },

  'co-up': {
    tomTat: 'Cờ tướng nhưng quân úp sấp: chỉ biết quân gì khi nó đi nước đầu tiên.',
    ban: 'Bàn cờ tướng, quân xếp úp trừ hai Tướng.',
    cachDi: [
      'Quân úp đi theo **vị trí xếp ban đầu** của nó; đi xong thì lật lên, và từ đó đi theo đúng quân thật.',
    ],
    thang: ['Chiếu bí Tướng đối phương.'],
    meo: ['Đây là bộ môn duy nhất trong bộ có **thông tin ẩn** — nhớ quân nào đã lật là một nửa thế cờ.'],
  },

  'co-nhat': {
    tomTat: 'Shogi: quân ăn được **đổi chủ** — bạn thả nó lại xuống bàn làm quân của mình.',
    ban: 'Bàn 9×9, mỗi bên 20 quân.',
    cachDi: [
      'Quân ăn vào tay, và một lượt sau **thả** xuống một ô trống làm quân của mình.',
      'Quân vào ba hàng cuối của đối phương thì phong cấp, đi mạnh hơn hẳn.',
    ],
    thang: ['Chiếu bí Vua đối phương.'],
    luuY: ['Vì quân không bao giờ rời cuộc, **hoà gần như không tồn tại** — chỉ khoảng một tới hai phần trăm số ván.'],
  },

  'co-vay': {
    tomTat: 'Vây đất: ai bao được nhiều điểm hơn thì thắng. Luật ít nhất, chiều sâu nhiều nhất.',
    ban: 'Bàn 19×19 giao điểm (bản rút gọn 9×9 và 13×13 cho ván ngắn).',
    cachDi: [
      'Mỗi lượt đặt một quân xuống giao điểm trống.',
      'Nhóm quân nào không còn **khí** — không còn giao điểm trống kề — thì bị nhấc khỏi bàn.',
    ],
    thang: ['Hai bên cùng bỏ lượt thì đếm đất cộng quân bắt được; ai nhiều hơn thắng.'],
    luuY: ['Không được đánh lặp lại thế cờ vừa xảy ra (luật **ko**).'],
  },
};

/** Luật của một bộ môn, hoặc null nếu chưa viết. */
export function rulesOf(gameId: string): Rules | null {
  return RULES[gameId] ?? null;
}
