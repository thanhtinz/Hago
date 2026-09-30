/**
 * Luật chơi, viết cho **người chơi**.
 *
 * Chỉ có luật. Không mẹo chơi, không nhận xét, không ghi chú về giao diện,
 * không so sánh bộ môn này với bộ môn kia. Người mở trang này ra để biết
 * nước nào hợp lệ và thắng bằng gì; mọi câu khác chen vào đều đẩy câu họ
 * cần xuống dưới.
 *
 * `docs/rules/*.md` là **nguồn chân lý về luật** — đặc tả cho engine, có đồ
 * thị kề, perft và biến thể. Bản này là cùng luật ấy kể lại cho người đọc
 * khác, nên chỗ nào ở đây mâu thuẫn với tài liệu kia thì chỗ này sai. Đã
 * xảy ra: bản đầu viết cờ caro "sáu quân trở lên không tính thắng", đúng
 * ngược với luật thật.
 *
 * Mười ba bộ môn đều có mục, kể cả mười bộ chưa mở.
 */

export interface Rules {
  /** Một câu nói trò này là trò gì. */
  tomTat: string;
  /** Bàn cờ và số quân. */
  ban: string;
  /** Quân đi thế nào, ăn thế nào. */
  cachDi: string[];
  /** Ván kết thúc thế nào, ai thắng. */
  thang: string[];
}

export const RULES: Record<string, Rules> = {
  'co-caro': {
    tomTat: 'Thay nhau đặt quân, ai xếp được năm quân liền nhau trước thì thắng.',
    ban: 'Bàn 15×15 ô, mỗi bên đặt không giới hạn số quân. Bên X đi trước.',
    cachDi: ['Mỗi lượt đặt đúng một quân vào một ô còn trống.', 'Quân đã đặt không di chuyển và không bị ăn.'],
    thang: [
      'Xếp được năm quân liền nhau theo hàng ngang, hàng dọc hoặc đường chéo.',
      'Chuỗi **đúng năm quân** mà **bị chặn cả hai đầu** thì không tính thắng — đây là luật chặn hai đầu của cờ caro Việt Nam.',
      'Chuỗi **từ sáu quân trở lên** luôn thắng, kể cả khi bị chặn cả hai đầu.',
      'Kín bàn mà chưa ai thắng thì hoà.',
    ],
  },

  'co-ganh': {
    tomTat: 'Quân không bao giờ bị nhấc khỏi bàn — quân bị ăn chỉ **đổi màu** sang phe người ăn.',
    ban: 'Bàn 25 điểm, giao của lưới 5×5. Mỗi bên 8 quân, xếp sẵn ở hai cạnh đối diện.',
    cachDi: [
      'Mỗi lượt nhấc một quân của mình sang **một điểm kề đang trống**.',
      'Điểm kề gồm ngang và dọc ở mọi điểm, cộng thêm đường chéo ở những điểm có tổng hàng và cột là số chẵn.',
      '**Gánh**: đi tới một điểm mà hai bên nó có đúng hai quân địch nằm đối xứng qua nó thì cả hai quân đó đổi màu.',
      '**Vây**: một **cụm** quân địch mà cả cụm không còn điểm trống nào kề thì cả cụm đổi màu. Xét cả cụm, không xét từng quân.',
      'Trong một nước, xét gánh trước rồi mới xét vây.',
      '**Mở**: nếu nước vừa đi tạo ra một điểm trống mà đối thủ đi vào đó sẽ gánh được, thì lượt sau đối thủ **chỉ được đi vào** những điểm ấy. Ràng buộc chỉ kéo dài đúng một lượt.',
    ],
    thang: [
      'Chiếm hết cả 16 quân trên bàn. Tổng số quân trên bàn luôn là 16 — không quân nào rời bàn.',
      'Hoà khi cùng một thế cờ lặp lại ba lần, hoặc khi ván chạm giới hạn số nước.',
    ],
  },

  'o-an-quan': {
    tomTat: 'Rải sỏi quanh bàn theo một chiều, rải khéo thì ăn được cả ô.',
    ban: 'Hai ô quan lớn ở hai đầu, mỗi ô một quan. Mười ô dân nhỏ ở giữa, mỗi ô năm dân. Mỗi bên giữ năm ô dân bên mình.',
    cachDi: [
      'Bốc hết sỏi ở **một ô dân bên mình**, chọn một chiều, rồi rải mỗi ô một viên theo chiều đó. Chọn chiều lại ở mỗi nước.',
      'Rải hết mà ô kế tiếp là **ô dân còn sỏi** thì bốc tiếp ô đó và rải tiếp, cứ thế.',
      'Rải hết mà ô kế tiếp là **ô quan còn quân** thì mất lượt.',
      'Rải hết mà ô kế tiếp **trống** và ô sau nữa có quân thì **ăn** hết ô sau nữa.',
      'Ăn xong mà ô tiếp theo lại trống và ô sau nữa có quân thì ăn tiếp, cứ thế.',
      'Ăn ô quan thì lấy cả quan lẫn toàn bộ dân đã tích trong ô đó.',
      'Đầu lượt mà cả năm ô dân bên mình đều trống thì phải lấy năm dân từ phần đã ăn rải lại vào các ô của mình; thiếu thì vay của đối thủ và trừ khi tính điểm cuối ván.',
    ],
    thang: ['Ván dừng khi **cả hai quan đều đã bị ăn**. Ai nhiều điểm hơn thì thắng.', 'Một quan bằng mười dân.'],
  },

  'co-lat': {
    tomTat: 'Kẹp quân địch giữa hai quân mình thì quân bị kẹp lật sang màu mình.',
    ban: 'Bàn 8×8. Bốn quân đặt sẵn ở giữa, hai đen hai trắng chéo nhau. Bên đen đi trước.',
    cachDi: [
      'Đặt một quân sao cho **kẹp được ít nhất một quân địch** giữa quân vừa đặt và một quân khác của mình, theo một dãy liền không đứt.',
      'Kẹp tính theo cả tám hướng, và mọi quân bị kẹp đều lật sang màu mình.',
      'Nước không kẹp được quân nào là nước không hợp lệ.',
      'Không còn nước hợp lệ nào thì **mất lượt**, đối thủ đi tiếp.',
    ],
    thang: ['Hết nước đi cho cả hai bên thì đếm quân trên bàn; ai nhiều hơn thắng, bằng nhau thì hoà.'],
  },

  'co-hum': {
    tomTat: 'Hai bên chơi hai luật khác nhau và thắng theo hai cách: một bên là hùm đi săn, bên kia là đàn dê đi vây.',
    ban: 'Bàn 25 điểm, giao của lưới 5×5, cùng hình bàn với cờ gánh. Bên hùm có 2 con đặt sẵn; bên dê có 12 con, thả dần.',
    cachDi: [
      '**Hùm**: đi sang một điểm kề đang trống, hoặc **nhảy qua một con dê kề** xuống điểm trống ngay sau nó theo cùng đường thẳng để ăn con dê đó.',
      '**Dê**: khi chưa thả hết, mỗi lượt chỉ được thả một con xuống điểm trống, không được di chuyển dê đã có trên bàn.',
      'Thả hết mười hai con rồi thì mỗi lượt dời một con dê sang điểm kề trống. Dê không ăn được hùm.',
    ],
    thang: ['**Hùm** thắng khi ăn đủ năm con dê.', '**Dê** thắng khi cả hai con hùm đều không còn nước đi nào.'],
  },

  'co-ba-quan': {
    tomTat: 'Mỗi bên ba quân, xếp được ba quân thành một hàng thì thắng.',
    ban: 'Chín điểm xếp thành lưới 3×3, mỗi bên ba quân.',
    cachDi: [
      'Khi chưa thả hết, mỗi lượt thả một quân xuống điểm trống.',
      'Thả hết ba quân rồi thì mỗi lượt dời một quân của mình sang điểm kề trống.',
    ],
    thang: ['Xếp được ba quân của mình thành một hàng ngang, hàng dọc hoặc đường chéo.'],
  },

  'co-hex': {
    tomTat: 'Nối hai cạnh bàn của mình bằng một dải quân liền nhau.',
    ban: 'Bàn hình thoi lát ô lục giác, 11×11. Mỗi bên nhận hai cạnh đối diện.',
    cachDi: ['Mỗi lượt đặt một quân của mình xuống một ô trống.', 'Quân đã đặt không di chuyển và không bị ăn.'],
    thang: [
      'Nối được hai cạnh của mình bằng một dải quân liền nhau, đi qua các ô kề cạnh.',
      'Ván không thể hoà: lấp kín bàn thì chắc chắn đã có một bên nối xong.',
    ],
  },

  'co-dam': {
    tomTat: 'Quân đi chéo, nhảy qua quân địch để ăn, và ăn được thì bắt buộc phải ăn.',
    ban: 'Bàn 8×8 nhưng chỉ dùng 32 ô sẫm. Mỗi bên 12 quân.',
    cachDi: [
      'Quân thường đi chéo một ô về phía trước, sang ô trống.',
      'Ăn bằng cách nhảy qua một quân địch kề chéo xuống ô trống ngay sau nó. Quân thường **ăn được cả bốn hướng chéo, kể cả lùi**.',
      'Nhảy xong mà còn nhảy tiếp được thì phải nhảy tiếp trong cùng một nước.',
      'Có nước ăn thì **bắt buộc phải ăn**, và phải chọn chuỗi ăn được **nhiều quân nhất**.',
      'Quân tới hàng cuối của đối phương thì thành **Đam**: đi và ăn xa tuỳ ý theo đường chéo.',
    ],
    thang: ['Đối phương hết quân, hoặc còn quân mà không còn nước đi hợp lệ nào.'],
  },

  'co-vua': {
    tomTat: 'Cờ vua quốc tế, luật FIDE.',
    ban: 'Bàn 8×8, mỗi bên 16 quân. Bên trắng đi trước.',
    cachDi: [
      'Vua đi một ô mọi hướng; Hậu đi xa mọi hướng; Xe đi thẳng; Tượng đi chéo; Mã đi hình chữ L và nhảy qua được quân khác; Tốt tiến thẳng một ô và ăn chéo.',
      'Tốt ở vị trí xuất phát được tiến hai ô.',
      'Có nhập thành, bắt tốt qua đường, và phong cấp khi tốt tới hàng cuối.',
      'Không được đi nước để Vua của mình bị chiếu.',
    ],
    thang: [
      'Chiếu bí Vua đối phương.',
      'Hoà khi hết nước đi hợp lệ mà Vua không bị chiếu, khi lặp thế cờ ba lần, khi năm mươi nước không ăn quân và không đẩy tốt, hoặc khi hai bên không còn đủ quân để chiếu bí.',
    ],
  },

  'co-tuong': {
    tomTat: 'Cờ tướng: bàn có sông và cung, quân đặt trên giao điểm.',
    ban: 'Bàn 9 đường dọc và 10 đường ngang, quân đặt trên giao điểm. Mỗi bên 16 quân.',
    cachDi: [
      'Tướng đi một ô ngang dọc và **chỉ trong cung** ba nhân ba; Sĩ đi một ô chéo và cũng chỉ trong cung.',
      'Tượng đi hai ô chéo, **không qua sông**, và bị chặn nếu ô giữa có quân.',
      'Mã đi hình chữ L và bị chặn nếu ô kề theo hướng đi ngang hoặc dọc có quân.',
      'Xe đi thẳng xa tuỳ ý. Pháo đi như Xe, nhưng **ăn thì phải nhảy qua đúng một quân** làm ngòi.',
      'Tốt tiến một ô; qua sông rồi mới được đi ngang, và không bao giờ lùi.',
      'Hai Tướng **không được đối mặt** trên cùng một đường dọc khi giữa chúng không còn quân nào.',
    ],
    thang: ['Chiếu bí Tướng đối phương, hoặc đối phương hết nước đi hợp lệ.'],
  },

  'co-up': {
    tomTat: 'Cờ tướng với quân úp sấp: chỉ biết quân thật là gì sau khi nó đi nước đầu tiên.',
    ban: 'Bàn cờ tướng. Hai Tướng để ngửa; mười bốn quân còn lại mỗi bên úp sấp, quân thật xếp ngẫu nhiên.',
    cachDi: [
      'Quân còn úp đi theo **cách đi của quân xếp ban đầu ở ô đó**, không theo quân thật bên dưới.',
      'Đi xong nước đầu tiên thì lật ngửa, và từ đó đi theo đúng quân thật.',
      'Sĩ và Tượng sau khi lật **không còn bị cung và sông giới hạn**, đi tự do toàn bàn theo cách đi của mình.',
      'Mọi luật còn lại theo cờ tướng.',
    ],
    thang: ['Chiếu bí Tướng đối phương, hoặc đối phương hết nước đi hợp lệ.'],
  },

  'co-nhat': {
    tomTat: 'Shogi: quân ăn được đổi chủ — bạn thả nó lại xuống bàn làm quân của mình.',
    ban: 'Bàn 9×9, mỗi bên 20 quân. Quân hai bên cùng hình dạng, phân biệt bằng hướng quay.',
    cachDi: [
      'Quân ăn được vào tay, và ở một lượt sau **thả** xuống một ô trống làm quân của mình.',
      'Thả quân tính là cả một nước đi. Quân vừa thả chưa được phong cấp.',
      'Quân đi vào, đi trong, hoặc đi ra khỏi **ba hàng cuối** của đối phương thì được phong cấp, đi mạnh hơn.',
      'Không được thả Tốt vào cột đã có Tốt chưa phong của mình, và không được thả Tốt để chiếu bí ngay.',
    ],
    thang: ['Chiếu bí Vua đối phương.'],
  },

  'co-vay': {
    tomTat: 'Vây đất: ai chiếm được nhiều điểm hơn thì thắng.',
    ban: 'Bàn 19×19 giao điểm. Bản rút gọn 9×9 và 13×13 cho ván ngắn. Bên đen đi trước.',
    cachDi: [
      'Mỗi lượt đặt một quân xuống một giao điểm trống, hoặc bỏ lượt.',
      'Một nhóm quân không còn **khí** — không còn giao điểm trống nào kề — thì bị nhấc khỏi bàn.',
      'Không được đi nước tự làm nhóm của mình hết khí, trừ khi nước đó ăn quân đối phương.',
      'Không được đánh nước làm thế cờ lặp lại đúng thế vừa xảy ra (luật **ko**).',
    ],
    thang: ['Hai bên cùng bỏ lượt thì ván dừng và đếm điểm: mỗi bên tính số quân còn trên bàn cộng số điểm trống mình vây được. Ai nhiều hơn thắng.'],
  },
};

/** Luật của một bộ môn, hoặc null nếu chưa viết. */
export function rulesOf(gameId: string): Rules | null {
  return RULES[gameId] ?? null;
}
