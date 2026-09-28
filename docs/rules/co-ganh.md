# Cờ Gánh — đặc tả luật

> Tài liệu sinh từ khảo sát tự động, đã đối chiếu nhiều nguồn. Đây là **nguồn chân lý
> về luật** cho engine `co-ganh`. Sửa luật thì sửa ở đây trước, rồi mới sửa mã.

| Thuộc tính | Giá trị |
|---|---|
| Số người | 2–2 |
| Thời gian thực | False |
| Có ngẫu nhiên | False |
| Thông tin ẩn | False |
| Độ khó cài đặt | 2/5 |

# CỜ GÁNH (Cờ Chém) — đặc tả luật đầy đủ

Nguồn đã đối chiếu: Wikipedia tiếng Việt "Cờ gánh", thegioididong.com, mytour.vn, thuthuatchoi.com, hocvienboardgames.com, fptshop.com.vn, baodanang.vn, và repo AI của HCMUT (dangnguyen1004/CoGanh_VietnameseChess_Artificial_Intelligence_HCMUT). Mọi con số hình học và perft dưới đây tôi đã **tự cài đặt lại và chạy kiểm chứng**, không phải chép.

## 0. TỔNG QUAN
Trò chơi dân gian 2 người, xuất xứ Quảng Nam. Thông tin hoàn hảo, không ngẫu nhiên trong luật.
**Đặc điểm cốt lõi: không có quân nào bị nhấc khỏi bàn bao giờ.** Quân bị ăn chỉ **đổi màu** (lật mặt sấp/ngửa) thành quân của người ăn. Tổng số quân trên bàn **luôn luôn là 16**. Thắng = chiếm hết 16 quân.

## 1. BÀN CỜ VÀ ĐỒ THỊ KỀ (phần dễ cài sai nhất)
25 điểm = giao điểm lưới 5×5 (hình vuông chia 16 ô nhỏ). Đánh số `i = r*5 + c`, `r` = hàng 0..4 từ trên xuống, `c` = cột 0..4 từ trái sang.

Hình vẽ truyền thống gồm: 5 đường ngang, 5 đường dọc, **2 đường chéo lớn** của hình vuông lớn, và **4 đường nối trung điểm 4 cạnh** (hình thoi nội tiếp). Đừng vẽ chéo ở mọi ô — sai luật.

**Quy tắc kề rút gọn (tôi đã chứng minh tương đương chính xác với hình vẽ trên):**
- Kề NGANG/DỌC: luôn có, nếu cách đúng 1 ô và còn trong bàn.
- Kề CHÉO: **chỉ khi `(r+c)` chẵn**. (Điểm chéo kề của một điểm chẵn cũng chẵn, nên chỉ cần kiểm tại điểm xuất phát.)

Đây đúng là đồ thị **Alquerque**. Tổng **56 cạnh** (40 ngang-dọc + 16 chéo).

```ts
const NB: number[][] = [];              // neighbours
for (let r=0;r<5;r++) for (let c=0;c<5;c++) {
  const i=r*5+c, even=((r+c)%2===0), a:number[]=[];
  for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]]) {
    if (dr!==0 && dc!==0 && !even) continue;                 // chéo chỉ ở điểm chẵn
    const nr=r+dr, nc=c+dc;
    if (nr>=0&&nr<5&&nc>=0&&nc<5) a.push(nr*5+nc);
  }
  NB[i]=a;
}
```

**Bậc của từng điểm** (dùng làm bảng đối chiếu unit test, và làm trọng số vị trí cho bot):
```
r0:  3 3 5 3 3
r1:  3 8 4 8 3
r2:  5 4 8 4 5
r3:  3 8 4 8 3
r4:  3 3 5 3 3
```
Tâm (2,2) và 4 điểm (1,1),(1,3),(3,1),(3,3) có 8 hướng — đây là các điểm mạnh nhất bàn cờ.

## 2. BẢNG CẶP GÁNH (PAIRS)
Với điểm `p=(r,c)`, tập "cặp đối xứng qua p" = các cặp `{(r-dr,c-dc),(r+dr,c+dc)}` với `(dr,dc) ∈ {(0,1),(1,0),(1,1),(1,-1)}`, chỉ nhận khi **cả hai đầu nằm trong bàn**, và với 2 hướng chéo thì chỉ nhận khi `(r+c)` chẵn.

**Số cặp theo từng điểm:**
```
r0:  0 1 1 1 0
r1:  1 4 2 4 1
r2:  1 2 4 2 1
r3:  1 4 2 4 1
r4:  0 1 1 1 0
```
Chú ý: **4 góc có 0 cặp — đi vào góc không bao giờ gánh được.** Và `(1,1),(0,2),(3,1)` v.v. cần kiểm kỹ: ví dụ tại `(2,0)` chỉ có ĐÚNG 1 cặp (dọc `(1,0)`&`(3,0)`); bộ ba `(1,1),(2,0),(3,1)` là hình chữ V chứ **không** phải đường thẳng, không phải cặp gánh.

## 3. QUÂN VÀ THẾ XUẤT PHÁT
16 quân, 8 mỗi bên. Quân phải có **hai mặt phân biệt** (sấp/ngửa) vì cơ chế là đổi màu tại chỗ.

Thế xuất phát: **toàn bộ 16 điểm trên viền bàn có quân; 9 điểm trong (r,c ∈ 1..3) trống.**
- **Bên TRÊN (side 1)**: (0,0),(0,1),(0,2),(0,3),(0,4),(1,0),(1,4),(2,4) → idx `{0,1,2,3,4,5,9,14}`
- **Bên DƯỚI (side 0)**: (2,0),(3,0),(3,4),(4,0),(4,1),(4,2),(4,3),(4,4) → idx `{10,15,19,20,21,22,23,24}`

Diễn giải: mỗi bên = 5 quân kín hàng cuối của mình + 2 quân ở hai đầu hàng kế + **1 quân ở một điểm giữa cạnh bên**. Hai điểm giữa cạnh `(2,0)` và `(2,4)` chia **mỗi bên một điểm**, tạo **đối xứng tâm 180°**. Bên dưới giữ `(2,0)`, bên trên giữ `(2,4)`.

Bên DƯỚI (side 0) đi trước. Gán màu cho 2 người chơi bằng `rng` lúc `init`.

Kiểm chứng: ở thế xuất phát mỗi bên có **đúng 12 nước đi hợp lệ**, và **không nước đầu nào gánh được**.

## 4. NƯỚC ĐI
Một nước = chọn 1 quân của mình ở điểm `f`, dời sang điểm `t` **trống** và **kề `f`** theo đồ thị mục 1. Đi đúng 1 bước. Không nhảy, không đi xa, **không có nước bỏ lượt (pass)**.

Thống kê đo được (2000 ván ngẫu nhiên): hệ số phân nhánh trung bình **12.43**, tối đa **35**.

## 5. LUẬT GÁNH
Sau khi đặt quân vào `t`: với **mọi** cặp `{a,b} ∈ PAIRS[t]`, nếu `board[a]` và `board[b]` **đều là quân đối phương** thì cả `a` và `b` **đổi thành màu của bên vừa đi**.

- Kiểm **tất cả các cặp đồng thời** trên bàn cờ SAU khi quân đã nằm ở `t`. Một nước có thể gánh 2, 4, 6 hoặc 8 quân (tối đa 4 cặp tại các điểm 8-hướng).
- **Chỉ bên vừa đi mới gánh được.** Nếu đối phương đi quân khiến quân bạn tình cờ nằm giữa hai quân họ thì **không có gì xảy ra**. (Các nguồn thống nhất điểm này: "chỉ gánh được khi người đó chủ động tự mình di chuyển quân vào giữa".)
- Hệ quả: **tự đi vào giữa hai quân địch là an toàn cho mình và ăn được hai quân địch đó**. Đây chính là cơ chế gánh, không phải tự sát.
- **Mặc định KHÔNG dây chuyền**: hai quân vừa đổi màu không tiếp tục gánh tiếp (xem mục 10).

## 6. LUẬT VÂY / CHẸT
Định nghĩa:
- **Khí (liberty)** của một quân = điểm **trống** kề nó (theo đồ thị mục 1). **Viền bàn không phải khí.**
- **Cụm (group)** = tập tối đại các quân **cùng màu** liên thông qua đồ thị kề.

Sau khi giải quyết xong gánh: xét **mọi cụm quân của ĐỐI PHƯƠNG**. Cụm nào **không còn khí nào** (không quân nào trong cụm có điểm trống kề) thì **toàn bộ cụm đó đổi màu**.

Chi tiết bắt buộc:
- **Lặp đến điểm bất động.** Việc đổi màu một cụm/một quân có thể **tách** cụm đối phương thành các cụm con nhỏ hơn, mà cụm con có thể đã hết khí. Tập điểm trống không đổi khi đổi màu, nhưng **cấu trúc cụm thì đổi**. Chạy vòng lặp cho tới khi không còn cụm nào hết khí.
- **Chỉ xét cụm của đối phương.** Cụm của chính bên đi nếu hết khí thì **không bị gì** — không có luật tự sát. (Thực tế quân vừa đi luôn còn ít nhất 1 khí là ô xuất phát `f`.)
- **Thứ tự bắt buộc: GÁNH trước, VÂY sau.** Sai thứ tự sẽ ra kết quả khác, vì gánh làm đổi màu và có thể tách cụm.

**CẢNH BÁO CÀI SAI:** đừng cài "một quân riêng lẻ không còn ô trống kề thì bị ăn". Cách hiểu đó (có trong vài bài báo viết số ít "quân cờ bị vây") **sai rõ rệt**: một quân nằm sâu trong đội hình của **chính mình** cũng không có ô trống kề, và sẽ bị đối phương ăn oan. Phải dùng **cụm**.

**HỆ QUẢ ĐÃ CHỨNG MINH (verify 2000 ván ngẫu nhiên, 0 vi phạm): KHÔNG TỒN TẠI THẾ BÍ.**
Vì "cụm còn khí" ⟺ "có quân trong cụm đi được". Nếu **mọi** cụm của một bên đều hết khí thì luật vây đã đổi hết quân bên đó ngay ở nước trước rồi. Nên một bên còn quân thì **luôn còn ít nhất một nước đi hợp lệ**. **Không cần viết luật riêng cho "hết nước đi"** — nếu `genMoves()` trả mảng rỗng mà bên đó còn quân thì engine có bug, hãy `throw`.

## 7. LUẬT MỞ (ép nước) — linh hồn chiến thuật của cờ gánh
Sau nước đi của A (và sau khi giải quyết xong gánh + vây), tính tập ô mở:

```
openPoints = { p : board[p] trống
                 VÀ A đang kẹp p  (∃ cặp {x,y} ∈ PAIRS[p] với board[x]=board[y]=A)
                 VÀ điều kiện "A kẹp p" là SAI trên bàn cờ TRƯỚC nước đi này
                 VÀ ∃ quân của B kề p }
```

Nếu `openPoints ≠ ∅`: lượt kế tiếp của B **bị ràng buộc** — B chỉ được đi những nước có **đích thuộc `openPoints`**. Nhiều ô thì B tự chọn. Ràng buộc **chỉ tồn tại đúng 1 lượt**.
Nếu `openPoints = ∅`: B đi tự do.

**Ý nghĩa:** A cố tình **thí 2 quân** để **ép B phải đi đúng ô A muốn**, rồi nước sau A gánh/vây lại nhiều hơn. Đây là điều làm cờ gánh sâu hơn hẳn một trò đảo quân đơn giản.

Hai chi tiết bắt buộc trong công thức:
- Điều kiện **"SAI trước nước đi"**: nếu ô đó đã mở sẵn từ trước mà B đã không thèm ăn ở lượt trước, thì **không ép B nữa**. Thiếu điều kiện này, B sẽ bị ép liên tục bởi những thế mở cũ đứng yên.
- Điều kiện **"B có quân kề p"**: nếu B không với tới thì không có ràng buộc, nếu không sẽ tạo state chết (B không có nước hợp lệ nào).

Thường `p` chính là ô xuất phát `f` mà A vừa rời đi, nhưng công thức tổng quát trên còn bắt đúng trường hợp **gánh làm đổi màu và tạo ra thế kẹp mới** ở một ô trống khác. Cứ quét cả 25 điểm, chi phí không đáng kể.

`RESIGN` / xin hòa / claim hòa **không** bị ràng buộc bởi luật mở.

## 8. KẾT THÚC VÁN
**Thắng:**
- Đối phương còn **0 quân** (toàn bộ 16 quân đã đổi thành màu mình).
- Đối phương đầu hàng, hết giờ, hoặc mất kết nối quá hạn.

**Hòa** (quy ước nền tảng, xem cảnh báo bên dưới):
- Hai bên thỏa thuận.
- **Lặp thế cờ 3 lần.** Khóa lặp = `(bàn cờ, bên đi, tập ô mở đang ràng buộc)`. **Bắt buộc phải gồm cả `forcedTo`**, nếu không sẽ xử hòa nhầm hai thế cờ giống nhau về quân nhưng khác nghĩa vụ đi.
- **50 nước đơn (ply) liên tiếp không có bất kỳ quân nào đổi màu.** (Không dùng "không ăn quân" vì cờ gánh không ăn mất quân; chỉ tiêu tiến triển đúng là **có đổi màu hay không**.)

**CẢNH BÁO TRUNG THỰC:** cờ gánh dân gian **không có luật hòa** — các cụ chơi đến khi một bên hết quân. Hai luật hòa trên là do nền tảng đặt ra, **bắt buộc phải có**, nếu không hai bot sẽ đi qua đi lại vĩnh viễn. Đo bằng playout ngẫu nhiên: ~92% ván kết thúc thắng/thua trong giới hạn, ~8% chạm giới hạn hòa; độ dài ván trung bình 156 ply dưới lối chơi ngẫu nhiên (chơi thật ngắn hơn nhiều).

Kiểm chứng cân bằng: 2000 ván ngẫu nhiên cho 903 thắng cho bên dưới / 931 thắng cho bên trên — thế xuất phát đối xứng tâm **không thiên vị về cấu trúc**. Vẫn nên đấu **2 ván đổi màu** trong chế độ xếp hạng vì có lợi thế đi trước.

## 9. NHỮNG THỨ KHÔNG TỒN TẠI TRONG CỜ GÁNH
Nêu rõ để dev khỏi mất công tra: **không** phong cấp/phong hậu, **không** nhập thành, **không** bắt tốt qua đường, **không** có quân nào đi khác quân nào (mọi quân giống hệt nhau, không có "tướng"), **không** có luật ko như cờ vây (**được phép đi ngược lại ngay lập tức**, chống lặp bằng luật lặp 3 lần), **không** có nước pass, **không** có quân bị nhấc khỏi bàn, **không** có thế bí.

## 10. CÁC ĐIỂM CÁC NGUỒN MÂU THUẪN NHAU (phải quyết định sản phẩm)
1. **Phạm vi VÂY — cụm hay từng quân.** Wikipedia tiếng Việt và đa số bản cài đặt số nói "một nhóm quân bị bao vây hoàn toàn thì tất cả quân trong nhóm đổi màu"; thegioididong/mytour viết số ít "quân cờ bị vây sẽ bị đổi màu", dễ hiểu thành từng quân. → **Chọn CỤM** (`vayScope: 'group'`). Cách hiểu từng quân sai rõ rệt (xem mục 6).
2. **MỞ có bắt buộc không.** Nhiều bài mô tả mở như một chiến thuật tự nguyện ("có thể chủ động tạo thế"); các nguồn mô tả kỹ hơn và repo HCMUT đều nói đối phương **"phải gánh"** / *"a special type of move that forces the opponent to move according to your will"*. → **Chọn BẮT BUỘC** (`forcedOpenCapture: true`). Tắt cờ này thì cờ gánh mất phần lớn chiều sâu, chỉ nên để cho chế độ "luật đơn giản / người mới".
3. **GÁNH dây chuyền.** Không nguồn dân gian nào nhắc tới; một vài app mobile có. → **Mặc định TẮT** (`chainGanh: false`).
4. **Ai đi trước.** Không nguồn nào quy định (dân gian là nhường người yếu hơn). → Bên dưới đi trước, màu gán bằng `rng`.
5. **Luật hòa.** Không nguồn nào có. → Nền tảng tự định nghĩa (mục 8).
6. **Vị trí quân thứ 8.** thuthuatchoi mô tả "1 quân ở hàng thứ ba, phía ngoài cùng bên trái" — khớp chính xác với đối xứng tâm mà tôi dùng. Một số ảnh trôi nổi trên mạng vẽ cả hai điểm giữa cạnh cho cùng một bên (thành 9-7) — **sai**, phải 8-8 và viền phải kín.

## 11. rng
Cờ gánh **không có ngẫu nhiên trong luật**. `rng` chỉ dùng đúng 2 chỗ: (a) gán màu và thứ tự đi ở `init`; (b) bot mức Dễ/Vừa chọn nước nhiễu và phá thế lặp. `rngState` **phải nằm trong state và bị che ở `view()`**, nếu không client đọc được và đoán trước nước của bot Dễ.

## 12. PERFT — BASELINE HỒI QUY (chạy ngay sau khi viết engine)
Từ thế xuất phát, bên dưới đi trước, với biến thể mặc định (`forcedOpenCapture=true`, `vayScope='group'`, `chainGanh=false`), nút kết thúc ván tính là một lá:

| depth | nodes |
|---|---|
| 1 | 12 |
| 2 | 129 |
| 3 | 1 444 |
| 4 | 14 099 |
| 5 | 146 130 |
| 6 | 1 533 538 |
| 7 | 16 275 360 |

Nếu số của bạn khác, gần như chắc chắn sai ở một trong ba chỗ: bảng kề chéo, thứ tự gánh→vây, hoặc điều kiện "SAI trước nước đi" của luật mở.

## Mô hình trạng thái

```ts
type Pt   = number;              // 0..24, i = r*5 + c
type Side = 0 | 1;               // 0 = Men Ngọc (bên dưới, đi trước) | 1 = Đất Nung (bên trên)
type Cell = -1 | 0 | 1;          // -1 = trống

interface Variant {
  forcedOpenCapture: boolean;    // default true  — luật "mở" ép nước
  vayScope: 'group' | 'single';  // default 'group'
  chainGanh: boolean;            // default false
  repetitionLimit: number;       // default 3
  noConversionPlyLimit: number;  // default 50
}

interface Clock {
  initialMs: number;             // 300_000 (5')
  incrementMs: number;           // 3_000 Fischer
  perMoveCapMs: number;          // 60_000 trần cứng 1 nước
  graceMs: number;               // 800  bù lag mạng
}

interface CoGanhConfig {
  variant: Variant;
  clock: Clock;
  bot?: { side: Side; level: 'easy' | 'medium' | 'hard' };
  rated: boolean;
}

interface Move { from: Pt; to: Pt; }

interface Conversion {
  pt: Pt;
  kind: 'ganh' | 'vay';
  from: Side;                    // màu cũ, để client animate lật đúng chiều
  step: number;                  // 0 = gánh, 1..n = các vòng lặp vây (stagger animation)
}

interface HistEntry {
  ply: number;
  side: Side;
  move: Move;
  conversions: Conversion[];
  wasForced: boolean;            // nước này bị luật mở ép
  openedPoints: Pt[];            // ô mở nước này tạo ra
  msUsed: number;
  posKey: string;
}

interface CoGanhState {
  v: 1;                          // schema version, để migrate save
  cfg: CoGanhConfig;

  players: [{ id: string; side: 0 }, { id: string; side: 1 }];

  board: Cell[];                 // length 25. Dùng Int8Array khi chạy bot; JSON hoá thành number[]
  turn: Side;
  ply: number;                   // số nước đơn đã đi

  // Luật mở: null = đi tự do. Mảng khác rỗng = CHỈ được đi vào các ô này.
  forcedTo: Pt[] | null;

  lastMove: Move | null;
  lastConversions: Conversion[]; // để client replay animation khi reconnect

  plySinceConversion: number;    // reset về 0 mỗi khi có quân đổi màu
  repetition: Record<string, number>;  // posKey -> số lần xuất hiện
  history: HistEntry[];

  clock: {
    remainMs: [number, number];
    turnStartedAt: number;       // epoch ms, server gán
    lastTickAt: number;
  };

  drawOffer: { by: Side; atPly: number } | null;

  status: 'playing' | 'finished';
  result: null | {
    winner: Side | null;         // null = hoà
    reason: 'capture_all' | 'resign' | 'timeout' | 'abandon'
          | 'agreement' | 'repetition' | 'no_conversion';
    pieces: [number, number];    // số quân mỗi bên lúc kết thúc, tổng luôn = 16
  };

  rngState: string;              // BỊ CHE ở view()
}

// posKey = board.join('') + '|' + turn + '|' + (forcedTo ? [...forcedTo].sort((a,b)=>a-b).join(',') : '-')
// BẮT BUỘC gồm forcedTo, nếu không sẽ xử hoà lặp 3 lần nhầm.

// Bảng tra tiền tính, dựng 1 lần ở module scope, KHÔNG để trong state:
//   NB: Pt[][]            – 25 phần tử, đồ thị kề (56 cạnh)
//   PAIRS: [Pt,Pt][][]    – 25 phần tử, cặp đối xứng qua mỗi điểm
//   NB_MASK: Uint32Array  – bitmask 25 bit, cho bot
//   DEG: Uint8Array       – bậc mỗi điểm, dùng làm trọng số vị trí

// events phát ra từ apply():
type Event =
  | { t: 'moved';        side: Side; move: Move; wasForced: boolean }
  | { t: 'converted';    conversions: Conversion[] }        // gộp 1 event để client stagger
  | { t: 'open_created'; by: Side; points: Pt[] }           // client highlight ô vàng nghệ
  | { t: 'must_move_to'; side: Side; points: Pt[] }         // UI khoá các ô khác
  | { t: 'clock';        remainMs: [number, number] }
  | { t: 'draw_offered' | 'draw_declined'; by: Side }
  | { t: 'game_over';    result: NonNullable<CoGanhState['result']> };
```

## Tập hành động

| Hành động | Payload | Kiểm tra |
|---|---|---|
| `MOVE` | { type: 'MOVE', from: number, to: number }  // from, to là chỉ số điểm 0..24 | 1) state.status === 'playing'. 2) playerId khớp player có side === state.turn (chống đi hộ). 3) from, to là số nguyên trong [0,24]. 4) board[from] === state.turn (đúng quân của mình). 5) board[to] === -1 (ô đích trống). 6) NB[from].includes(to) — PHẢI tra bảng kề tiền tính, tuyệt đối không suy ra bằng |dr|<=1 && |dc|<=1 vì nước chéo chỉ hợp lệ khi (r+c) chẵn. 7) Nếu state.forcedTo !== null thì state.forcedTo.includes(to), ngược lại trả lỗi E_MUST_OPEN kèm danh sách ô bắt buộc để UI hiển thị. 8) Kiểm đồng hồ TRƯỚC khi áp dụng: nếu now - clock.turnStartedAt > remainMs[turn] + graceMs thì không xử nước này, kết thúc ván bằng timeout. 9) Sau khi hợp lệ: đặt quân -> giải quyết GÁNH (quét PAIRS[to]) -> giải quyết VÂY (lặp đến điểm bất động, chỉ cụm đối phương) -> tính openPoints -> gán forcedTo -> cộng increment, đổi lượt, cập nhật plySinceConversion và repetition -> kiểm kết thúc. 10) Sanity: tổng quân hai bên phải luôn = 16 sau mỗi nước, assert. |
| `RESIGN` | { type: 'RESIGN' } | status === 'playing'; playerId là một trong hai người chơi (KHÔNG cần đến lượt mình); không bị ràng buộc bởi forcedTo. Kết quả: đối phương thắng, reason 'resign'. Nếu là ván xếp hạng, chặn RESIGN trong 2 ply đầu hoặc tính là abort không trừ điểm — tuỳ chính sách nền tảng. |
| `OFFER_DRAW` | { type: 'OFFER_DRAW' } | status === 'playing'; drawOffer === null hoặc drawOffer.by !== side; chống spam: cùng một bên không được mời lại trong vòng 10 ply kể từ lần mời trước bị từ chối (lưu atPly). Không bị ràng buộc bởi forcedTo. Lời mời tự huỷ khi bên mời đi nước tiếp theo. |
| `ANSWER_DRAW` | { type: 'ANSWER_DRAW', accept: boolean } | status === 'playing'; drawOffer !== null; drawOffer.by !== side của người trả lời (không tự chấp nhận lời mời của chính mình). accept=true -> kết thúc hoà reason 'agreement'; accept=false -> xoá drawOffer, phát event draw_declined, ván tiếp tục, đồng hồ không dừng. |
| `CLAIM_DRAW` | { type: 'CLAIM_DRAW', reason: 'repetition' | 'no_conversion' } | status === 'playing'. reason='repetition': repetition[posKey hiện tại] >= cfg.variant.repetitionLimit. reason='no_conversion': plySinceConversion >= cfg.variant.noConversionPlyLimit. Server PHẢI tự kiểm lại điều kiện, không tin client. Khuyến nghị: engine tự xử hoà ngay khi điều kiện thoả (auto-draw) để không phụ thuộc người chơi bấm, và giữ CLAIM_DRAW chỉ như đường dự phòng cho UI cũ. Trả E_CLAIM_NOT_MET kèm số đếm hiện tại nếu chưa đủ. |
| `CLAIM_TIMEOUT` | { type: 'CLAIM_TIMEOUT' } | status === 'playing'; người gọi KHÔNG phải bên đang đến lượt. Server tính lại thời gian đã tiêu từ clock.turnStartedAt; chỉ chấp nhận khi remainMs[turn] - (now - turnStartedAt) <= -graceMs. Đây là đường dự phòng khi tick không chạy; server vẫn phải có watchdog riêng và không được dựa vào client gọi. |

## Kết thúc ván

**Điều kiện kết thúc (kiểm theo đúng thứ tự này sau mỗi `apply`):**

1. **Chiếm hết quân** — `count(board, opp) === 0` → bên vừa đi thắng, `reason: 'capture_all'`. Đây là kết cục tự nhiên duy nhất của cờ gánh dân gian.
2. **Đầu hàng** → đối phương thắng, `reason: 'resign'`.
3. **Hết giờ** → đối phương thắng, `reason: 'timeout'`. Không có ngoại lệ "đối phương không đủ lực chiếu bí" như cờ vua, vì ở cờ gánh bên nào cũng luôn còn khả năng chiếm hết quân.
4. **Bỏ cuộc / mất kết nối quá `abandonMs`** → đối phương thắng, `reason: 'abandon'`.
5. **Hoà thoả thuận** → `reason: 'agreement'`.
6. **Hoà lặp thế cờ 3 lần** → `reason: 'repetition'`. Khoá lặp phải gồm `forcedTo`.
7. **Hoà 50 ply không đổi quân** → `reason: 'no_conversion'`.

**KHÔNG có thế bí (stalemate).** Đã chứng minh ở mục 6 của `rules` và verify 2000 ván: một bên còn quân thì luôn còn nước đi. Nếu `genMoves()` trả rỗng mà bên đó còn quân → **engine có bug, hãy `throw`, đừng lặng lẽ xử hoà**.

**Cách tính điểm (`results`):**

```ts
function results(s: CoGanhState) {
  const p = s.result!.pieces;                       // [số quân side0, số quân side1], tổng = 16
  const w = s.result!.winner;
  return s.players.map(pl => ({
    playerId: pl.id,
    place: w === null ? 1 : (pl.side === w ? 1 : 2),
    score: p[pl.side],                              // 0..16
  }));
}
```

- **`score` = số quân sở hữu lúc kết thúc**, luôn trong 0..16 và tổng hai bên **luôn bằng 16**. Đây là thang điểm tự nhiên và duy nhất hợp lý của cờ gánh: thắng tuyệt đối = 16-0, thắng sát nút (do hết giờ/đầu hàng) có thể là 9-7.
- Hoà: cả hai `place: 1`, `score` là số quân thực tế (ví dụ 8-8 hoặc 10-6).
- Thắng do `resign` / `timeout` / `abandon`: **vẫn dùng số quân thực tế trên bàn**, không ép về 16-0. Điều này giữ cho `score` có nghĩa thống kê (dùng làm tie-break bảng xếp hạng, đo "thắng đậm hay thắng sát").
- Elo/MMR chỉ dùng `place`, **không** dùng `score` — nếu không sẽ khuyến khích người chơi kéo dài ván để gom quân thay vì kết thúc sớm.
- Ván `abort` (kết thúc trước ply 2) → không ghi kết quả, không tính điểm.

## Che thông tin ẩn

**Về mặt luật chơi: KHÔNG CÓ THÔNG TIN ẨN.** Cờ gánh là trò thông tin hoàn hảo tuyệt đối — không úp quân (khác cờ úp), không bốc thăm, không bài trên tay. Cả hai người chơi và cả người xem đều được thấy toàn bộ bàn cờ.

Tuy vậy `view(state, viewerId)` **vẫn phải cắt bỏ** những thứ sau, nếu không sẽ lộ hoặc bị lợi dụng:

1. **`rngState` — bắt buộc xoá cho mọi viewer.** Bot mức Dễ và Vừa chọn nước bằng `rng`; lộ seed là client tự tính trước được nước bot sẽ đi. Đây là thứ duy nhất thực sự nhạy cảm trong game này.
2. **Nội tại của bot** (`state.bot.searchDepth`, PV, điểm lượng giá, TT) — nếu bạn lưu trong state. Tốt nhất là **không để trong state**, giữ ở lớp dịch vụ bot. Lộ điểm lượng giá = người chơi có engine miễn phí.
3. **Đồng hồ**: gửi `remainMs` đã được **chuẩn hoá về thời điểm gửi** (`remainMs[turn] - (now - turnStartedAt)`), không gửi `turnStartedAt` thô của server; tránh lộ độ lệch đồng hồ server để client cheat lag.
4. **`drawOffer`**: chỉ hiện cho người nhận và người gửi. **Người xem (spectator) không thấy** lời mời hoà đang treo — nếu thấy, khán giả có thể ra hiệu cho đấu thủ. Khi ván xong thì hiện đầy đủ trong lịch sử.
5. **Người xem trong ván xếp hạng**: nên áp **độ trễ 30–60 giây** cho `view()` của spectator. Đây là chống thông đồng, không phải chống lộ thông tin — cần thiết vì cờ gánh cực ngắn và một nước mách nước là đủ đổi cục diện. Sau khi ván kết thúc thì bỏ trễ.
6. **`history[].msUsed`**: giữ nguyên, không nhạy cảm, và rất hữu ích cho phát hiện gian lận (người dùng engine có phân bố thời gian rất đều).

**Không cần che**: `board`, `turn`, `forcedTo`, `lastMove`, `lastConversions`, `plySinceConversion`, `repetition`. Ngược lại `forcedTo` **phải** gửi đầy đủ — UI bắt buộc phải khoá các ô không hợp lệ và nói rõ "Bạn buộc phải đi vào đây", nếu không người chơi mới sẽ tưởng game bị lỗi.

```ts
function view(s: CoGanhState, viewerId: string): PublicState {
  const { rngState, ...pub } = s;
  const isPlayer = s.players.some(p => p.id === viewerId);
  return {
    ...pub,
    drawOffer: isPlayer ? s.drawOffer : null,
    clock: { remainMs: normalize(s.clock), turnStartedAt: undefined },
  };
}
```

## Tính giờ

**Thuần theo lượt, đồng hồ Fischer (cộng giây sau mỗi nước).**

Vì cờ gánh có hệ số phân nhánh nhỏ (~12) và ván ngắn, nên đây là game **cờ chớp tự nhiên** — đừng áp thời gian dài kiểu cờ tướng, người chơi sẽ chán.

| Chế độ | Ban đầu | Cộng | Trần 1 nước | Ghi chú |
|---|---|---|---|---|
| **Chớp (mặc định)** | 5:00 | +3s | 60s | Dùng cho ghép cặp nhanh và đấu bot |
| Siêu chớp | 3:00 | +2s | 30s | Xếp hạng |
| Chuẩn | 10:00 | +5s | 120s | Phòng tự tạo |
| Thong thả | 15:00 | +10s | 180s | Người mới, đấu bot Dễ |

**Trần 1 nước (`perMoveCapMs`)** là bổ sung của nền tảng, không có trong đồng hồ cờ cổ điển: cờ gánh nhiều tình huống chỉ có 1–2 nước hợp lệ (đặc biệt khi bị **luật mở** ép), treo bàn 3 phút ở một nước cưỡng bức là hành vi phá game. Vượt trần → xử như hết giờ.

**Ưu đãi cho nước bị ép:** khi `forcedTo !== null` và chỉ có **đúng 1** nước hợp lệ, nên **đóng băng đồng hồ** (hoặc chỉ tính tối đa 3 giây) — người chơi không có lựa chọn nào, bắt họ trả giá thời gian là vô lý. Cài: nếu `genMoves().length === 1` thì `msUsed = Math.min(msUsed, 3000)`. Chi tiết nhỏ nhưng người chơi cảm nhận rất rõ.

**Cách cài (`realtime: false` nhưng vẫn cần watchdog):**
- Đồng hồ tính **lười (lazy)** từ mốc thời gian: mỗi `apply` trừ `now - clock.turnStartedAt` khỏi `remainMs[turn]`, rồi cộng `incrementMs`, rồi đặt `turnStartedAt = now`. Không cần tick để tính đúng.
- `tick(state, now, rng)` **chỉ làm watchdog hết giờ**, phải **thuần và bất biến (idempotent)**: nếu `remainMs[turn] - (now - turnStartedAt) <= -graceMs` thì kết thúc ván `timeout`, ngược lại **trả về `state` nguyên si**. Gọi 1 Hz là thừa đủ; gọi 0.2 Hz cũng chấp nhận được. **Không** dùng `tick` để trừ dần thời gian — sẽ tích luỹ sai số và lệch với `apply`.
- Nếu hạ tầng nền tảng **không gọi `tick` cho game `realtime: false`**, phải có một trong hai: (a) timer riêng đặt đúng thời điểm hết giờ, hoặc (b) chấp nhận action `CLAIM_TIMEOUT` từ đối phương. **Đừng chỉ dựa vào (b)** — người chơi ngủ quên thì ván treo mãi.
- `graceMs` 800ms bù lag. Với người chơi mạng 4G Việt Nam nên nới lên 1200ms.
- **Reconnect**: đồng hồ **vẫn chạy** khi mất kết nối (chuẩn cờ online). `abandonMs` 60s cho ván chớp: quá 60s không kết nối lại → xử `abandon`, kể cả khi đồng hồ chính còn.

**Với bot:** bot **không dùng đồng hồ của người chơi**. Ngân sách tìm kiếm cố định theo mức khó (Dễ 80ms, Vừa 250ms, Khó 700ms), cộng **độ trễ giả lập 300–900ms ngẫu nhiên qua `rng`** để bot không trả lời tức thì — bot đi trong 5ms khiến người chơi thấy như đang đấu với máy tính, tụt trải nghiệm rõ rệt.

## Bot

**Minimax alpha-beta HOÀN TOÀN KHẢ THI và là lựa chọn đúng** — cờ gánh là game nhỏ nhất trong cả nền tảng về mặt tìm kiếm. Không cần MCTS, không cần mạng nơ-ron.

## Số liệu tôi đã đo thật (Node 22, máy chủ thường, cài đặt NGÂY THƠ bằng `Int8Array` + copy mảng, chưa tối ưu gì)

| Depth | Nodes | Thời gian |
|---|---|---|
| 5 | 18 333 | 48 ms |
| 6 | 41 332 | 66 ms |
| 7 | 528 457 | **627 ms** |
| 8 | 995 723 | **1 161 ms** |
| 9 | 10 834 633 | 12 437 ms |

Tốc độ ~**870k nodes/s** với code ngây thơ. Hệ số phân nhánh trung bình **12.43**.

→ **Kết luận trung thực: depth 7 chắc chắn dưới 700ms ngay cả khi viết cẩu thả.** Với các tối ưu dưới đây (bitboard + sắp xếp nước + TT), kỳ vọng **depth 10–12 trong ngân sách 700ms** — đủ để bot Khó đánh bại gần hết người chơi thường.

## Biểu diễn: BITBOARD 25 bit (điểm mấu chốt về tốc độ)
25 điểm vừa khít trong một số nguyên 32 bit. Dùng **2 số**: `black`, `white`.

```ts
const NB_MASK  = new Uint32Array(25);   // bitmask các điểm kề
const PAIR_A   : Uint32Array[] = [];    // cho mỗi điểm: các cặp gánh, tiền tính
const occupied = black | white;
const empty    = (~occupied) & 0x1FFFFFF;
```

- **Sinh nước**: duyệt bit của quân mình, `NB_MASK[i] & empty` → các đích. Dùng `Math.clz32` để duyệt bit nhanh.
- **Gánh**: với mỗi cặp `(a,b)` tiền tính tại ô đích, kiểm `oppBB & maskA` và `oppBB & maskB` — 4 phép AND, không vòng lặp.
- **Vây**: flood-fill bằng mask, lan `x |= expand(x) & groupBB` cho tới bão hoà. Trên 25 bit chỉ mất 3–5 vòng.
- **Make/unmake**: chỉ cần lưu `(black, white, forcedTo)` cũ — 3 số. **Không copy mảng.** Đây là chỗ ăn 5–10x tốc độ so với bản đo ở trên.
- **Bảng chuyển vị (TT)**: khoá số nguyên chính xác `key = black * 2**25 + white + turn * 2**50`. Giá trị này **< 2^53 nên double biểu diễn chính xác tuyệt đối, không va chạm bao giờ** — dùng `Map<number, Entry>`, khỏi cần Zobrist. Mẹo này rất hợp với cờ gánh vì bàn nhỏ. (Nếu gộp cả `forcedTo` thì cần thêm 25 bit → lúc đó mới cần Zobrist; đơn giản hơn là **không tra TT khi `forcedTo !== null`**, số nút đó rất nhỏ.)

## Hàm lượng giá (điểm theo góc nhìn bên đang xét)
Tổng quân **luôn = 16**, nên `material = 2*myCount - 16`, biên độ ±16. Vì vậy **quân nặng ký hơn hẳn mọi yếu tố khác**.

```
EVAL =  100 * (myCount - oppCount)                     // vật chất, áp đảo
      +   3 * Σ DEG[p] cho quân mình  −  tương tự cho địch   // chiếm điểm 8 hướng
      +   2 * (mobility_mine − mobility_opp)           // số nước đi hợp lệ
      −  22 * (số cụm quân MÌNH chỉ còn 1 khí)         // sắp bị vây
      +  22 * (số cụm quân ĐỊCH chỉ còn 1 khí)
      −  14 * (số "cặp mình hở" mà địch với tới được)  // sắp bị gánh
      +  14 * (số "cặp địch hở" mà mình với tới được)
      +   6 * (có nước MỞ khả dụng ? 1 : 0)            // giá trị ép nước
```
- `DEG[p]` = bậc đã có sẵn ở bảng tiền tính (3..8). Đây là trọng số vị trí **tự nhiên** của cờ gánh: điểm càng nhiều hướng càng vừa mạnh công vừa khó bị vây. Không cần bảng PST viết tay.
- "**cặp hở**": với mỗi ô trống `e`, mỗi cặp `{a,b} ∈ PAIRS[e]` mà `board[a]=board[b]=X` → hai quân X đang hở; trọng số nhân đôi nếu đối thủ của X có quân kề `e` (tức ăn được ngay).
- Terminal: `±(10000 − ply)` để bot chọn đường thắng **nhanh nhất** và đường thua **chậm nhất**.
- Hoà (lặp 3 lần / 50 ply): trả `0` kèm **contempt** `−15` khi bot đang hơn quân, để bot không chọn hoà khi đang thắng.

## Kiến trúc tìm kiếm (mức Khó)
1. **Iterative deepening** từ depth 2, dừng khi hết ngân sách; luôn trả PV của depth **hoàn thành gần nhất**.
2. **Alpha-beta + PVS** (null-window cho nước thứ 2 trở đi).
3. **Sắp xếp nước** — quan trọng nhất, cắt mạnh nhất:
   TT move → nước gánh nhiều quân nhất → nước gây vây → killer moves (2/ply) → history heuristic → còn lại theo `DEG[đích]` giảm dần.
4. **Quiescence search bắt buộc, depth tối đa 6, chỉ mở rộng nước có đổi quân (gánh/vây).**
   Đây là thứ **không được bỏ**: ở cờ gánh vật chất đảo chiều 2–8 quân chỉ trong một nước, cắt cứng ở depth chẵn sẽ cho bot ảo giác thắng lợi rồi bị gánh ngược ngay nước sau.
5. **Mở rộng cưỡng bức**: khi `forcedTo !== null`, đối thủ chỉ có 1–2 nước → **`depth += 1`** (cheap, gần như miễn phí, và chính là chỗ chiến thuật "mở" nằm).
6. **Phát hiện lặp trong cây**: giữ stack `posKey`; gặp lại → trả điểm hoà ngay. Thiếu cái này bot sẽ tính đi tính lại vòng lặp vô tận.
7. **Kiểm giờ mỗi 2048 nút** (`nodes & 2047`), cờ `aborted` lan ngược lên, **bỏ kết quả của depth dở dang**.
8. **Sách khai cuộc nhỏ**: thế xuất phát cố định và đối xứng tâm → tính offline 6 ply đầu, nhét vào một bảng ~300 entry. Bot đi ngay tức thì trong khai cuộc và không bao giờ mắc bẫy mở sớm.
9. **Tàn cuộc**: khi tổng quân một bên ≤ 3, không gian trạng thái sụp rất nhanh → tăng ngân sách depth thêm 4, thường **giải quyết được đến tận cùng**.

## Ba mức khó (hạ cấp bằng cách LÀM YẾU CÓ CHỦ Ý, không phải chỉ giảm depth)

| | **Dễ** | **Vừa** | **Khó** |
|---|---|---|---|
| Ngân sách | 80 ms | 250 ms | 700 ms |
| Depth | cố định **2** | cố định **5** (ID tới 6) | ID, thường đạt **10–12** |
| Quiescence | không | depth 3 | depth 6 |
| TT / killer / history | không | chỉ killer | đủ |
| Lượng giá | **chỉ vật chất + DEG** | đủ, trừ "cặp hở" | đủ |
| Nhiễu | cộng `rng.int(-45, 45)` vào điểm mỗi nước gốc | `rng.int(-12, 12)` | chỉ phá hoà bằng `rng` |
| Sai lầm chủ động | **18%** chọn ngẫu nhiên trong top-4 | **6%** chọn nước tốt thứ 2 | 0% |
| Lưới an toàn | **có** — vẫn lọc bỏ nước thua ngay ≥4 quân | không | không |
| Sách khai cuộc | không | không | có |
| Độ trễ giả lập | 300–700 ms | 400–900 ms | 500–900 ms |

**Ghi chú về mức Dễ:** nhiễu ±45 (nhỏ hơn 100 = giá 1 quân) khiến bot vẫn ăn quân khi thấy, nhưng chọn sai về vị trí — đúng kiểu người mới. **Lưới an toàn là bắt buộc**: không có nó, bot Dễ sẽ liên tục tự đi vào thế bị gánh 4 quân và người chơi sẽ báo "bot bị lỗi" chứ không nghĩ "bot yếu".

Mọi ngẫu nhiên của bot **đi qua `rng` của server** → ván đấu với bot **tái lập được y hệt** từ seed, cực kỳ quý khi xử lý khiếu nại và viết test hồi quy.

## Kiểm định sức mạnh trước khi phát hành
Cho các mức tự đấu vòng tròn 500 ván (đổi màu mỗi ván, khai cuộc ngẫu nhiên 4 ply để tránh trùng lặp). Mục tiêu: **Khó > Vừa ≥ 75%**, **Vừa > Dễ ≥ 75%**, và **Dễ thắng được người mới khoảng 40–50%**. Nếu Khó thắng Vừa >95% thì khoảng cách quá xa, hãy nới Vừa lên depth 6.

### Chỗ bot dễ hỏng

**1. Bỏ quiescence → bot chơi như người mù (lỗi chí mạng số 1).**
Ở cờ gánh vật chất đổi 2–8 quân trong **một nước**, và tổng quân luôn = 16 nên mỗi quân đáng giá gấp đôi (vừa mất của mình vừa thêm cho địch). Cắt cứng ở depth chẵn → bot tưởng vừa gánh được 4 quân, không thấy nước sau bị gánh ngược 6. Bắt buộc quiescence trên các nước có đổi quân.

**2. Không mô hình hoá luật MỞ trong tìm kiếm → bot chơi sai về bản chất.**
Nếu node con không mang theo ràng buộc `forcedTo`, bot sẽ (a) **không bao giờ thấy được sức mạnh của nước thí 2 quân để ép nước** — nó chỉ thấy "mất 2 quân", chấm điểm −200, và không bao giờ chơi; và (b) **bị đối thủ người ép chết** vì trong cây nó tưởng mình được đi tự do. Đây là lỗi làm bot trông ngu nhất mà lại khó nhận ra nhất, vì bot vẫn chạy bình thường. Phải đưa `forcedTo` vào signature của `search()`, và **nhớ loại nó khỏi khoá TT hoặc đưa vào Zobrist** — trộn hai node khác `forcedTo` mà cùng bàn cờ sẽ cho PV rác.

**3. Lặp nước vô tận khi cân bằng.**
Không có phát hiện lặp trong cây + không có contempt → hai bot đi qua đi lại mãi, ván chạm trần 400 ply, người xem bỏ đi. Đo được: **8% ván ngẫu nhiên chạm giới hạn hoà**. Bắt buộc: stack `posKey` trong search trả hoà ngay, cộng contempt −15 khi đang hơn quân.

**4. Bot mức Dễ tự sát liên tục → bị báo lỗi chứ không bị coi là yếu.**
Depth 2 + nhiễu lớn sẽ thường xuyên đi thẳng vào giữa hai quân địch chờ sẵn, mất 2 quân mỗi nước. Người chơi mới không phân biệt được "bot ngu" và "game hỏng". Bắt buộc có lưới an toàn 1-ply lọc bỏ nước thua ngay ≥4 quân, **kể cả** ở mức Dễ nhất.

**5. Treo server vì không kiểm giờ bên trong đệ quy.**
Chỉ kiểm giữa các vòng iterative deepening là **không đủ**: bước nhảy từ depth 8 (1.1s) lên depth 9 (12.4s) là **hơn 10x** — đo thật. Một lần vào nhầm depth 9 là treo 12 giây, đủ để timeout HTTP và đẩy cả worker. Phải kiểm `nodes & 2047` bên trong node và huỷ lan ngược.

**6. Copy mảng trong vòng lặp nóng.**
Bản ngây thơ của tôi tốn 2 lần `Int8Array.from(25)` mỗi node — đó chính là lý do chỉ đạt 870k nps. Chuyển sang bitboard make/unmake (lưu 3 số) ăn ngay 5–10x. Đừng dùng `structuredClone`, đừng dùng object `{r,c}` cho toạ độ, đừng dùng `Array<string>` cho bàn cờ.

**7. Cài sai bảng kề chéo — bot "gian lận" hoặc bỏ sót nước.**
Nếu suy nước chéo bằng `|dr|<=1 && |dc|<=1` thay vì tra bảng, bot sinh ra nước bất hợp lệ ở 12 điểm lẻ, `apply` từ chối, và bot **treo hoặc trả nước rỗng**. Cho bot dùng **chính hàm `genMoves` của engine**, tuyệt đối không viết bản sinh nước thứ hai cho bot. Chạy perft đối chiếu (12 / 129 / 1444 / 14099 / 146130) trước khi đụng tới bot.

**8. Vòng lặp vây không hội tụ.**
Nếu điều kiện dừng viết sai (ví dụ quên cờ `changed`, hoặc đổi màu rồi lại xét chính cụm vừa đổi), vòng `while` chạy mãi **bên trong hàm lượng giá** → treo cứng, không có exception, không có log. Đặt trần cứng 25 vòng lặp và `throw` nếu vượt.

**9. Bot đi tức thì → cảm giác "đang bị máy nghiền".**
Mức Dễ tính xong trong 5ms. Không có độ trễ giả lập, người chơi mất cảm giác đối thủ. Thêm delay ngẫu nhiên qua `rng`, và cho delay **tương quan với độ phức tạp thế cờ** (ít nước hợp lệ → trả lời nhanh hơn) — chi tiết nhỏ nhưng làm bot "có hồn" hẳn.

**10. Bot không xử lý được lượt bị ép chỉ có 1 nước.**
Khi `forcedTo` khiến chỉ còn đúng 1 nước hợp lệ, **đừng chạy search** — trả nước đó ngay (sau delay giả lập). Chạy 700ms để chọn 1-trong-1 là đốt CPU của cả máy chủ, và với nhiều ván song song sẽ thành nút cổ chai thật.

**11. `Map` của TT phình vô hạn giữa các nước đi.**
Dùng lại `Map` xuyên nước đi mà không giới hạn → rò rỉ bộ nhớ, worker chết sau vài trăm ván. Giới hạn ~200k entry, xoá sạch mỗi nước đi hoặc dùng thay thế kiểu depth-preferred.

## Cạm bẫy khi cài đặt

- ĐỒ THỊ KỀ CHÉO — lỗi cài sai phổ biến nhất. Nước chéo CHỈ hợp lệ khi (r+c) chẵn. Tuyệt đối không suy bằng |dr|<=1 && |dc|<=1, phải tra bảng NB tiền tính. Cài sai thì 12 điểm lẻ sẽ có 8 hướng thay vì 3–4, và toàn bộ ván cờ khác đi. Test ngay bằng bảng bậc 3353338483548453848333533 (56 cạnh) và perft 12/129/1444/14099/146130.
- THỨ TỰ GÁNH RỒI MỚI VÂY. Gánh làm đổi màu và có thể TÁCH cụm địch, tạo ra cụm con hết khí. Làm vây trước sẽ ra kết quả khác. Và vây phải LẶP ĐẾN ĐIỂM BẤT ĐỘNG vì mỗi lần đổi màu lại có thể tách cụm tiếp. Nhớ đặt trần 25 vòng lặp và throw, nếu không một lỗi điều kiện dừng sẽ treo cứng server mà không có exception nào.
- VÂY PHẢI THEO CỤM, KHÔNG THEO TỪNG QUÂN. Vài bài báo viết số ít 'quân cờ bị vây sẽ bị đổi màu' khiến dev cài thành 'quân nào không có ô trống kề thì bị ăn'. Sai nghiêm trọng: một quân nằm sâu trong đội hình CỦA CHÍNH MÌNH cũng không có ô trống kề và sẽ bị đối phương ăn oan. Định nghĩa đúng: cụm liên thông cùng màu, không cụm nào còn khí thì cả cụm đổi màu.
- CHỈ BÊN VỪA ĐI MỚI GÁNH ĐƯỢC. Không quét toàn bàn tìm mọi thế kẹp sau mỗi nước — chỉ quét PAIRS[ô đích]. Nếu đối phương đi quân làm quân bạn tình cờ nằm giữa hai quân họ thì KHÔNG có gì xảy ra. Hệ quả ngược đời nhưng đúng luật: tự đi vào giữa hai quân địch là AN TOÀN và ĂN được cả hai.
- LUẬT MỞ — điều kiện 'ĐIỀU KIỆN KẸP LÀ SAI TRÊN BÀN TRƯỚC NƯỚC ĐI' cực dễ quên. Thiếu nó, người chơi bị ép liên tục bởi những thế mở cũ đứng yên mà đối thủ đã từ chối ăn ở lượt trước, ván cờ thành chuỗi cưỡng bức vô nghĩa. Và phải kiểm 'B có quân kề ô mở', nếu không sẽ tạo state chết: B bị ép đi vào ô không với tới được, genMoves trả rỗng, engine treo.
- KHÔNG CÓ THẾ BÍ (đã chứng minh + verify 2000 ván ngẫu nhiên, 0 vi phạm). Vì 'cụm còn khí' tương đương 'có quân trong cụm đi được', nên nếu mọi cụm của một bên hết khí thì luật vây đã đổi hết quân bên đó rồi. Đừng viết luật riêng cho 'hết nước đi'. Nếu genMoves() trả rỗng mà bên đó còn quân thì ĐANG CÓ BUG — hãy throw, đừng lặng lẽ xử hoà, sẽ che mất lỗi thật.
- KHOÁ LẶP THẾ CỜ PHẢI GỒM forcedTo. posKey = board + turn + forcedTo. Hai thế cờ giống hệt nhau về quân và lượt nhưng một cái bị luật mở ép, một cái đi tự do, là HAI THẾ CỜ KHÁC NHAU. Bỏ forcedTo ra khỏi khoá sẽ xử hoà lặp 3 lần nhầm và huỷ ván đang thắng.
- CHỈ TIÊU 50 NƯỚC PHẢI ĐẾM 'KHÔNG ĐỔI MÀU', KHÔNG PHẢI 'KHÔNG ĂN QUÂN'. Cờ gánh không nhấc quân khỏi bàn, tổng luôn = 16, nên 'ăn quân' là khái niệm không tồn tại. Chép luật 50 nước của cờ vua vào đây sẽ ra bộ đếm không bao giờ reset hoặc không bao giờ tăng.
- LUẬT HOÀ LÀ DO NỀN TẢNG TỰ ĐẶT, DÂN GIAN KHÔNG CÓ. Bỏ qua thì hai bot đi qua đi lại vĩnh viễn (đo được 8% ván ngẫu nhiên chạm giới hạn). Ngược lại cũng phải ghi rõ trong phần luật hiển thị cho người chơi, nếu không người Quảng Nam chơi thật sẽ khiếu nại là 'cờ gánh làm gì có hoà'.
- GÓC BÀN CÓ 0 CẶP GÁNH. Đi vào 4 góc không bao giờ gánh được. Và cẩn thận điểm (2,0): bộ ba (1,1)-(2,0)-(3,1) là hình chữ V, KHÔNG phải đường thẳng, không phải cặp gánh. (2,0) chỉ có đúng 1 cặp là dọc (1,0)&(3,0). Sinh bảng PAIRS bằng code từ 4 vector hướng, đừng gõ tay.
- THẾ XUẤT PHÁT PHẢI 8-8 VÀ VIỀN KÍN. Hai điểm giữa cạnh (2,0) và (2,4) chia MỖI BÊN MỘT ĐIỂM, đối xứng tâm 180°. Nhiều ảnh trôi nổi trên mạng vẽ cả hai cho cùng một bên thành 9-7 — sai. Assert lúc init: 16 điểm viền đều có quân, 9 điểm giữa trống, mỗi bên đúng 8 quân, và mỗi bên có đúng 12 nước đi đầu tiên.
- BẤT BIẾN 'TỔNG QUÂN LUÔN = 16' LÀ CÔNG CỤ DEBUG MẠNH NHẤT CỦA GAME NÀY. Assert sau mỗi apply. Vi phạm nghĩa là gánh hoặc vây đã ghi đè lên ô trống hoặc đổi màu quân của chính mình. Bắt được sớm tiết kiệm hàng giờ.
- UI CHO LUẬT MỞ LÀ RỦI RO SẢN PHẨM, KHÔNG PHẢI RỦI RO KỸ THUẬT. Khi forcedTo != null mà UI chỉ khoá ô lặng lẽ, người chơi mới sẽ tưởng game đơ và thoát. Bắt buộc: highlight ô bắt buộc, chữ rõ ràng 'Đối thủ vừa MỞ — bạn buộc phải đi vào đây', và animation giải thích. Đồng thời đóng băng đồng hồ khi chỉ có đúng 1 nước hợp lệ.
- CHE rngState TRONG view(). Đây là thứ nhạy cảm DUY NHẤT của game thông tin hoàn hảo này. Lộ seed là client tính trước được mọi nước của bot Dễ và Vừa. Đừng để bot internals (depth, điểm lượng giá, PV) trong state — giữ ở lớp dịch vụ bot.
- TICK PHẢI THUẦN VÀ BẤT BIẾN. realtime=false nên đồng hồ tính lười từ mốc thời gian trong apply; tick chỉ làm watchdog hết giờ và phải trả state nguyên si khi chưa hết giờ. Dùng tick để trừ dần thời gian sẽ tích luỹ sai số và lệch với apply. Nếu hạ tầng không gọi tick cho game turn-based, phải có timer riêng — đừng chỉ dựa vào đối phương bấm CLAIM_TIMEOUT, người chơi ngủ quên thì ván treo mãi.

## Mỹ thuật riêng của game này

## "SÂN GẠCH THANH HÀ" — gốm đất nung Quảng Nam

**Ý tưởng nền:** cờ gánh sinh ra ở Quảng Nam, nên lấy chất liệu bản địa nhất của vùng đó: **gốm làng Thanh Hà (Hội An)**. Bàn cờ không phải gỗ, không phải giấy, mà là **một phiến gạch nung lớn trên sân đình**, đường cờ **kẻ bằng nước vôi**. Toàn bộ nhận diện xoay quanh **đất nung và men ngọc** — hai thứ không game nào khác trong nền tảng đụng tới.

**Lý do chọn (và tránh trùng):** cờ tướng đã lấy gỗ nâu + sơn mài đỏ đen; cờ vua lấy gỗ sáng/tối cổ điển; cờ vây lấy đá bóng đen-trắng trên gỗ kaya; cờ caro lấy giấy kẻ ô vở học trò; cá ngựa lấy nhựa màu tươi; cờ tỷ phú lấy bìa boardgame hiện đại; ô ăn quan lấy phấn trắng và sỏi sông. **Cờ gánh lấy gốm nung nhám + men ngọc bóng trên gạch đỏ** — tách bạch hoàn toàn về cả chất liệu lẫn sắc độ.

## Khoảnh khắc chủ đạo: CÚ LẬT
Cơ chế độc nhất của game là **quân không chết, quân đổi màu**. Toàn bộ mỹ thuật phải phục vụ cú lật này — nó là thứ người chơi sẽ nhớ và quay clip chia sẻ.
- Quân là **đĩa gốm hai mặt thật**: một mặt **men ngọc** bóng, phản sáng nhẹ; mặt kia **đất nung** nhám, thấy rõ vân đất và lỗ khí.
- Lật: `rotateY` 3D, **240ms**, `cubic-bezier(.34, 1.30, .64, 1)` (nảy nhẹ khi đáp). Cạnh đĩa phải thấy được trong lúc lật — dựng bằng 3 lớp (mặt trước / vành / mặt sau), không dùng crossfade hai ảnh.
- **Lan theo đợt (stagger 70ms)** từ quân vừa đi ra ngoài. Nước gánh 8 quân phải trông như **sóng gốm đổ**. Các đợt vây lật sau các đợt gánh, dùng `Conversion.step` trong state để biết thứ tự.
- Kèm **bụi đất mịn** bật lên 1–2px ở chân quân khi đáp (particle, 8 hạt, 300ms).

## Bảng màu

**Sáng — nắng trưa sân đình**
| Vai trò | Hex | Ghi chú |
|---|---|---|
| Nền sân gạch | `#B4623F` | đất nung nung già |
| Phiến bàn cờ | `#C9784E` | sáng hơn nền, có vân và rìa sứt |
| Mạch vữa | `#8A472C` | |
| Đường kẻ vôi | `#F2E9D8` @ 82% | nét tay, đầu nét loe |
| **Quân Men Ngọc** (side 0) | mặt `#7FA893`, vành `#4E6F60`, cao sáng `#C5DCCF` | celadon Thanh Hà |
| **Quân Đất Nung** (side 1) | mặt `#A84A2C`, vành `#6E2A15`, cao sáng `#D98A66` | |
| Nhấn — nước vừa đi | `#E8B04B` | vàng nghệ |
| **Nhấn — ô MỞ bắt buộc** | `#E8B04B` viền 3px + vòng vôi lan toả | trạng thái quan trọng nhất của UI |
| Nguy hiểm — quân sắp bị vây | `#C4453A` @ 45%, viền đứt | |
| Chữ chính | `#2E1A12` | |

**Tối — sân đình dưới đèn lồng Hội An**
| Vai trò | Hex |
|---|---|
| Nền | `#1C1310` |
| Phiến bàn cờ | `#3A251B` |
| Đường kẻ vôi | `#E8DCC4` @ 70% |
| Quân Men Ngọc | `#6B9280` / vành `#3C5647` |
| Quân Đất Nung | `#8F3E24` / vành `#5A2012` |
| Nhấn | `#F0BE5E` (ánh đèn lồng ấm) |

Đặt tất cả thành CSS token trên `:root`, định nghĩa lại dưới `@media (prefers-color-scheme: dark)` có guard `:root:not([data-theme="light"])` và dưới `:root[data-theme="dark"]`.

## Đường kẻ bàn cờ (chi tiết quan trọng về luật)
Vẽ bằng SVG path **có run tay** (jitter ±0.6px, 4 điểm điều khiển mỗi đoạn) để ra chất vôi quét, **không dùng `<line>` thẳng tắp**.
**Đường ngang/dọc vẽ dày 2.5px; đường chéo vẽ mảnh 1.6px.** Đây không phải quyết định thẩm mỹ mà là **truyền đạt luật**: người chơi phải nhìn ra ngay 12 điểm lẻ không có đường chéo, nếu không họ sẽ liên tục thử nước chéo bất hợp lệ. Khi hover một quân, **làm sáng đúng các đường đi được từ quân đó** — cách dạy luật hiệu quả nhất, không cần một dòng hướng dẫn nào.

## Chuyển động
- **Quân TRƯỢT, không nhảy**: `translate` 160ms `ease-out`, kèm vệt bụi mờ phía sau. Gốm trượt trên gạch — không bounce, không arc.
- Quân đang chọn: **nhấc lên 3px** + đổ bóng mềm lan rộng, không phóng to.
- Ô đi được: chấm vôi mờ `#F2E9D8` @ 30%, đường kính 22% khoảng cách điểm.
- **Nước MỞ bắt buộc:** vòng vôi lan toả từ ô đó (scale 1→1.8, opacity 1→0, lặp 1.4s) + các ô khác **giảm bão hoà 60%** để dẫn mắt. Kèm chữ thật rõ: *"Đối thủ vừa MỞ — bạn buộc phải đi vào ô sáng."*
- Quân sắp bị gánh (chỉ hiện ở chế độ hướng dẫn / bot Dễ): viền đứt đỏ chạy chậm.
- Thắng: đèn lồng Hội An vàng ấm rọi loang từ giữa bàn, 16 quân lật đồng loạt về màu người thắng theo đợt từ tâm, 900ms.

## Âm thanh
Toàn bộ là **gốm chạm gạch**, khô và cao — cố tình khác tiếng gỗ trầm của cờ tướng/cờ vây.
- Đặt quân: *clack* gốm khô, đỉnh ~2.1kHz, đuôi 60ms.
- Lật quân: tiếng **ring gốm** ngắn, cao dần theo số quân lật trong đợt (2 quân → 1 nốt, 8 quân → arpeggio 4 nốt thang ngũ cung). Nước gánh lớn phải **nghe đã tai**.
- Nước MỞ: một tiếng **mõ tre** nhẹ — báo hiệu "có chuyện".
- Nền: ve sầu + gió rất khẽ (−32dB), mặc định **tắt**.

## Chữ
- Tên game và số liệu: **"Be Vietnam Pro"** (có sẵn trên Google Fonts, dấu tiếng Việt chuẩn).
- Nhãn trang trí (tên bên, "MỞ", "GÁNH", "VÂY"): một serif có chân Việt hoá, **letter-spacing rộng 0.12em, viết hoa** — gợi chữ khắc trên gốm.
- **Không dùng font thư pháp**. Đó là ngôn ngữ của cờ tướng, và làm số liệu khó đọc.

## Bố cục
- Bàn cờ vuông tuyệt đối, chiếm tối đa 92vmin, căn giữa.
- Trên điện thoại: bàn cờ trên, hai thanh người chơi trên/dưới sát mép, lề hai bên **16px**, không cuộn ngang.
- **Bộ đếm quân là HUD chính** — một thanh ngang chia đôi theo tỷ lệ 16 quân, hai màu men ngọc / đất nung, trượt mượt sau mỗi lần lật. Người chơi cờ gánh theo dõi "ai đang nhiều quân hơn" chứ không theo dõi quân bị ăn, vì không có quân nào bị ăn. Thanh này quan trọng hơn cả đồng hồ.

## Chế độ tiếp cận
- Men ngọc vs đất nung có tương phản độ sáng đủ (L≈65 vs L≈45) cho người mù màu đỏ-lục; thêm chế độ **phân biệt bằng hoa văn**: mặt men ngọc trơn, mặt đất nung có **vân khắc chìm hình xoắn ốc** — phân biệt được kể cả khi ảnh xám hoàn toàn.
- Tôn trọng `prefers-reduced-motion`: bỏ lật 3D, thay bằng crossfade 120ms, giữ nguyên stagger để vẫn đọc được thứ tự.

### Asset tối thiểu

- board-tile.webp — phiến gạch nung 1024x1024, vân đất, rìa sứt mẻ, 2 biến thể sáng/tối (dùng làm texture nền bàn cờ)
- board-lines.svg — 5 ngang + 5 dọc + 2 chéo lớn + 4 đường thoi nội tiếp, path có run tay, ngang/dọc 2.5px và chéo 1.6px, màu lấy từ CSS token
- piece-celadon.svg — mặt men ngọc, gradient bóng + cao sáng lệch tâm, vành đậm
- piece-terracotta.svg — mặt đất nung nhám, có vân khắc chìm xoắn ốc (phân biệt cho người mù màu), vành đậm
- piece-edge.svg — vành cạnh đĩa gốm, lớp giữa của cú lật 3D
- piece-sprite-flip.webp — 12 khung lật (tuỳ chọn, chỉ dùng nếu chọn lật 2D thay vì CSS 3D transform)
- fx-dust.png — 8 hạt bụi đất mịn cho particle khi quân đáp xuống
- fx-lime-ring.svg — vòng vôi lan toả, hiệu ứng ô MỞ bắt buộc
- fx-lantern-glow.webp — vệt sáng đèn lồng Hội An cho màn hình thắng, radial, alpha
- marker-legal.svg — chấm vôi mờ báo ô đi được
- marker-danger.svg — viền đứt đỏ báo quân sắp bị gánh/vây (chế độ hướng dẫn)
- icon-ganh.svg / icon-vay.svg / icon-mo.svg — 3 biểu tượng luật, dùng trong nhật ký nước đi và màn hướng dẫn
- sfx-place.ogg — clack gốm khô, đỉnh ~2.1kHz, đuôi 60ms
- sfx-flip-1.ogg … sfx-flip-4.ogg — 4 nốt ring gốm thang ngũ cung, phát chồng theo số quân lật trong đợt
- sfx-open.ogg — mõ tre nhẹ, báo nước MỞ
- sfx-win.ogg / sfx-lose.ogg — kết ván, tông gốm + chuông chùa xa
- amb-sandinh.ogg — nền ve sầu và gió, -32dB, loop 45s, mặc định tắt
- counter-bar.svg — thanh đếm quân 16 ô chia hai màu, HUD chính của game
- tutorial-ganh.json / tutorial-vay.json / tutorial-mo.json — 3 thế cờ dựng sẵn cho hướng dẫn tương tác, mỗi thế 3–4 nước; riêng tutorial-mo là bắt buộc phải có
- avatar-frame-ganh.svg — khung avatar hoạ tiết gốm Thanh Hà, phân biệt phòng cờ gánh trong sảnh chung
- font: Be Vietnam Pro (400/600/700) từ Google Fonts + 1 serif Việt hoá cho nhãn trang trí

## Ước lượng công sức

**~3 ngày công cho 1 dev** (engine 1 ngày, bot 1 ngày, UI + animation 1 ngày). Đây là **game dễ thứ nhì trong cả 9 game của nền tảng**, chỉ sau cờ caro.

So sánh tương đối (lấy cờ gánh = 1.0):

| Game | Hệ số | Vì sao |
|---|---|---|
| Cờ caro | **0.7** | Luật 10 dòng, bot đơn giản, không có khái niệm cụm/khí |
| **Cờ gánh** | **1.0** | Luật ngắn, bàn 25 điểm, bitboard 32-bit vừa khít, minimax dễ |
| Ô ăn quan | 1.4 | Vòng rải, ăn dây chuyền, luật vay quân khi hết |
| Cá ngựa | 1.8 | 4 người, xúc xắc, luật về chuồng/đá quân, nhiều biến thể vùng miền |
| Cờ tướng | 3.5 | 7 loại quân, chiếu/bí, luật chiếu mãi-đuổi mãi của Việt Nam rất rắc rối |
| Cờ úp | 4.5 | Cờ tướng + thông tin ẩn + rng + `view()` phải che thật sự |
| Cờ vua | 4.5 | Nhập thành, bắt tốt qua đường, phong cấp, 3 lần lặp, 50 nước, FIDE đủ điều |
| Cờ tỷ phú | 8 | State khổng lồ, đấu giá, giao dịch, thế chấp, 2–6 người, gần như realtime |
| Cờ vây | 12 | Ko/superko, sống-chết, đếm điểm (chưa kể chọn luật Nhật/Trung), bot phải MCTS |

**Chỗ khó thật sự — chỉ có 3, tất cả đều ở luật chứ không ở code:**
1. **Luật MỞ** (mục 7 của `rules`). Cần khoảng nửa ngày để định nghĩa cho đúng và test kỹ, đặc biệt điều kiện "SAI trước nước đi". Đây là thứ duy nhất trong game không có nguồn nào viết đủ chính xác để chép.
2. **Vây theo CỤM + lặp đến điểm bất động**, và **thứ tự gánh → vây**. Cỡ 60 dòng, nhưng sai là ra ván cờ khác hẳn.
3. **Luật hoà phải tự thiết kế** vì dân gian không có.

Ngoài ba chỗ đó, engine gọn trong **~250 dòng TypeScript**, bot ~350 dòng. Bàn 25 điểm **vừa khít một số nguyên 32 bit** nên bitboard rất dễ chịu, và khoá TT gói trong một `number` chính xác tuyệt đối — hiếm game nào được thuận lợi như vậy.

**Cảnh báo về ước lượng:** đừng để độ đơn giản của luật đánh lừa. Phần **UI cho luật MỞ** dễ bị đánh giá thấp — phải khoá các ô không hợp lệ, giải thích bằng chữ vì sao bị khoá, và animate cho người chơi hiểu mình vừa bị ép. Nếu làm hời hợt, tỷ lệ bỏ ván ở người chơi mới sẽ rất cao và bug report sẽ toàn là "game không cho tôi đi". Cộng thêm nửa ngày cho riêng phần này.

**Gợi ý thứ tự triển khai:** cờ gánh nên là **game thứ 2 được làm** sau cờ caro. Nó là bài kiểm tra vừa đủ cho toàn bộ khung nền tảng (server-authoritative, `view()` có che, bot 3 mức, đồng hồ Fischer, hoà do lặp, ràng buộc nước đi) mà không tốn thời gian như cờ tướng — dùng nó để rà soát và chốt kiến trúc engine chung trước khi đâm vào các game nặng.
