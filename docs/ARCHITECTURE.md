# Kiến trúc nền tảng cờ online

Tài liệu này là **hợp đồng ràng buộc**. Mọi mã trong repo phải theo. Chỗ nào
thấy mã lệch khỏi đây thì mã sai, không phải tài liệu sai.

Nền tảng: 13 bộ môn cờ **hai người**, ghép cặp tự động, đấu bot, tạo phòng mời bạn. Mỗi game có
bộ mặt mỹ thuật riêng trên một khung app chung.

---

## 0. Cách tài liệu này ra đời

Hai kiến trúc được dựng độc lập theo hai góc nhìn đối nghịch (chắc chắn vs ra
mắt sớm), rồi hai giám khảo chấm chéo. Hai giám khảo **chọn hai phương án khác
nhau** — nên thứ đáng tin không phải lá phiếu của họ, mà là danh sách **lỗi
chết người cả hai phương án cùng mắc**. Chín lỗi đó thành chín ràng buộc ở mục
2. Biên bản đầy đủ: [`architecture-review.md`](architecture-review.md).

---

## 1. Ma trận game — nền phải chứa được hết

| Game | Người | Lượt/Thực | Ngẫu nhiên | Ẩn | Khó |
|---|---|---|---|---|---|
| Cờ caro | 2 | lượt | không | không | 1/5 |
| Cờ gánh | 2 | lượt | không | không | 2/5 |
| Ô ăn quan | 2 | lượt | không | không | 2/5 |
| Cờ vua | 2 | lượt | không | không | 3/5 |
| Cờ úp | 2 | lượt | **có** | **có** | 3/5 |
| Cờ tướng | 2 | lượt | không | không | 4/5 |
| Cờ vây | 2 | lượt | không | không | 5/5 |
| Cờ đam | 2 | lượt | không | không | 3/5 |
| Cờ lật | 2 | lượt | không | không | 1/5 |
| Cờ hùm | 2 | lượt | không | không | 2/5 |
| Cờ ba quân | 2 | lượt | không | không | 1/5 |
| Cờ Hex | 2 | lượt | không | không | 2/5 |
| Cờ Nhật | 2 | lượt | không | không | 4/5 |

**Mọi bộ môn đều là 2 ghế.** Cá ngựa và cờ tỷ phú — hai game duy nhất cần nhiều
hơn hai ghế — đã bị bỏ khỏi lộ trình. Cùng với chúng biến mất ba thứ: bàn nhiều
ghế, chế độ `realtime`, và nhu cầu bot thay ghế người bỏ trận giữa ván.

Ba trục quyết định hình dạng hợp đồng vẫn còn hai: **ngẫu nhiên do server gieo**
và **thông tin phải che** — cả hai giờ chỉ còn **cờ úp** chạm tới (chia quân úp
lúc bắt đầu ván). Nên cờ úp là phép thử cuối của hợp đồng, không phải game làm
đầu tiên.

Hai nguyên thể `Turn.sealed` và `enumerateChance?/applyChance?` được thêm vào
hợp đồng **chỉ vì** cá ngựa và cờ tỷ phú. Chúng **được giữ lại**, nhưng phải
nói thẳng: hiện không bộ môn nào dùng `sealed`, và chỉ cờ úp sẽ dùng `chance`.
Giữ vì gỡ ra rồi lắp lại là cửa một chiều (log cũ mất khả năng phát lại), chứ
không phải vì chúng đang có ích.

---

## 2. Chín ràng buộc bắt buộc

Mỗi ràng buộc dưới đây sửa một lỗi mà **cả hai** kiến trúc độc lập đều mắc.
Đây là chỗ đáng tiền nhất của cả bản thiết kế: chúng đều là lỗi *im lặng* —
không làm sập gì cả, chỉ âm thầm sai cho tới khi quá muộn để sửa.

### R1 — `events` phải đi qua đúng một cửa ải cùng với `view`

Cả hai phương án tuyên bố `view()` là cửa duy nhất dữ liệu rời server, rồi cả
hai phát `events[]` thẳng ra dây **ngoài** cửa đó. Ở cá ngựa thì vô hại; ở cờ
úp một event mang theo loại quân vừa lật là lộ bài; ở cờ tỷ phú một event rút
thẻ phát cho cả bàn là lộ. Bug này sống sót qua 6 game rồi giết ở game thứ 7.

```ts
view(state, seat) -> { ply, v, events }   // events sinh SAU khi lọc theo ghế
```

Test `assertNoLeak` quét **cả hai** đường ra, không chỉ `v`.

### R2 — Con trỏ RNG nằm **trong** state

`rngCursor` phải là một trường của `S` và phải được `encode()` serialize. Nếu
con trỏ sống ngoài state, khôi phục phòng từ snapshot sẽ rút seed từ sai vị
trí: xúc xắc lệch khỏi dòng đã cam kết, replay ra kết quả khác trận thật. Đây
là lỗi im lặng nhất trong cả chín.

### R3 — `GameId` là `string`, không phải union đóng

Cả hai phương án khai `type GameId = 'co-vua' | 'co-tuong' | ...` trong package
lõi. Game thứ 10 sẽ bắt sửa file lõi rồi kéo theo mọi `switch` exhaustive ở
matchmaker, enum DB, registry mỹ thuật, bot dispatcher. Lõi **không bao giờ**
biết tên game nào; mỗi game tự khai `spec` và gọi `registry.register()`.

### R4 — Meta-action thuộc về lõi, không thuộc từng engine

Đầu hàng, hết giờ, mất kết nối, cầu hoà, bỏ trận, bot tiếp quản — ngữ nghĩa
giống hệt nhau ở mọi bộ môn. Để từng engine tự xử là 13 × 6 = 78 chỗ sai lặng
lẽ. Một wrapper `withStandardMeta(engine)` sở hữu toàn bộ; engine chỉ nhìn thấy
nước đi game.

### R5 — `turn(s)` tính được **từ** state

Không được chỉ trả ra từ `reduce()`. Sau `decode(snapshot)` — đúng lúc node
chết và phòng phải dựng lại — phải biết đang chờ ai, chờ gì. Khán giả vào giữa
trận, bot đăng ký nghe, reconnect: tất cả đều hỏi câu này. Lưu nó ngoài engine
là tự phá bất biến "engine là nguồn chân lý".

### R6 — `isLegal` mặc định là `legal().some(deepEq)`

Hai đường mã trả lời cùng một câu hỏi là công thức kinh điển đẻ ra "nước này
hợp lệ trên máy tôi". Engine nào cần đường nhanh thì khai `isLegalFast?` và
**bắt buộc** kèm fuzz test 10k state đối chiếu hai hàm trong CI.

### R7 — `ply` trong state, reconnect nối từ `ply`

`S` mang `ply`, `view()` trả `ply`, client resume bằng `(matchId, ply)`. Server
hoặc phát tiếp từ đó hoặc ép resync toàn phần. Trên 4G Việt Nam, NAT nhà mạng
cắt kết nối nhàn rỗi sau 30–60 giây — đây là đường mã bị chạm nhiều nhất trong
cả hệ, không được để nó là băng dính ở tầng transport.

### R8 — Idempotency nằm trong transaction của DB

Nonce chống gửi lặp phải là `UNIQUE (match_id, seat, nonce)` trong **cùng**
transaction với lệnh ghi input log. Để bảng nonce trong Redis là mở cheat đổ
lại xúc xắc: client tắt bật 4G, retry `{t:'roll'}`, server gieo lần hai.

### R9 — Ghi **nước bot đã chọn**, không chỉ ghi seed

Bot dùng iterative deepening chặn bằng đồng hồ tường: cùng seed, máy đang tải
nặng, độ sâu hoàn tất khác nhau, **nước đi khác**. Ghi seed thôi thì "replay
tái lập từng bit" là sai ngay khi có bot ngồi ghế — mà đó là phần lớn trận 4
người. Coi bot là nguồn input bên ngoài giống hệt người.

---

## 3. Hợp đồng engine

```ts
/** Lõi không biết tên game nào — R3. */
export type GameId = string;
export type Seat = number;

export interface GameSpec {
  id: GameId;
  nameVi: string;
  minSeats: number;
  maxSeats: number;
  usesChance: boolean;
  hiddenInfo: boolean;
  realtime: boolean;
  defaultClock: ClockSpec;   // thuộc engine, không thuộc config server
  variant?: string;
}

/** Engine đang chờ gì — tính được từ state (R5). */
export type Turn =
  | { kind: 'seat'; seat: Seat }                  // chờ một người đi
  | { kind: 'chance' }                            // chờ server gieo
  | { kind: 'auto'; delayMs: number }             // engine tự chạy tiếp
  | { kind: 'sealed'; seats: Seat[]; closesAt: number } // thu kín, mở đồng loạt
  | { kind: 'over' };

export interface Engine<S, A, V, Ev> {
  readonly spec: GameSpec;
  readonly version: number;     // R: engineVersion vào hàng `matches`
  readonly ruleHash: string;

  init(seats: Seat[], config: unknown, rng: Rng): S;
  turn(s: S): Turn;                               // R5
  legal(s: S, seat: Seat): A[];
  isLegalFast?(s: S, seat: Seat, a: A): boolean;  // R6 — kèm fuzz test
  reduce(s: S, seat: Seat, a: A, rng: Rng): S;
  step?(s: S, rng: Rng): S;                       // cho Turn.auto
  view(s: S, seat: Seat | 'spectator'): { ply: number; v: V; events: Ev[] }; // R1, R7
  outcome(s: S): Outcome | null;
  encode(s: S): string;                           // phải gồm ply + rngCursor (R2)
  decode(x: string): S;

  // Năng lực tuỳ chọn — chỉ cá ngựa và tỷ phú cài, để bot expectimax
  // không phải tự giả lập rng.
  enumerateChance?(s: S): { draw: unknown; p: number }[];
  applyChance?(s: S, draw: unknown): S;
}
```

`S` **bắt buộc** mang `ply: number` và `rngCursor: number`.

### Vì sao `Turn.sealed` phải có từ đầu

Cả roll-off "ai đi trước" của cá ngựa lẫn đấu giá của cờ tỷ phú đều cần thu kín
rồi mở đồng loạt. Để giá đi tới theo **thứ tự đến** thì đó không phải đấu giá,
đó là đo đường truyền: ai ping thấp nhất luôn ra giá cuối ở deadline−1ms và
luôn thắng. Nhét một nguyên thể đồng thời vào một log thuần lượt về sau là cửa
một chiều — nên `sealed` nằm trong hạt nhân từ commit đầu, dù game đầu tiên
không dùng tới.

---

## 4. Bot

Bot là **nguồn input bên ngoài**, đi qua đúng cổng vào như người: cùng
`isLegal`, cùng nonce, cùng input log. Khác biệt duy nhất là ai gõ.

- Chạy **ngoài vòng lặp sự kiện** (worker thread / tiến trình riêng). Một ván
  cờ vây nghĩ 1,5 giây không được làm đứng cả server.
- **Hai hàng đợi tách theo chi phí:** `bot:fast` (caro, gánh, ô ăn quan, cá
  ngựa, tỷ phú — ≤50 ms) và `bot:heavy` (vua, tướng, úp, vây — 300–1500 ms).
  Gộp chung thì một ván cờ vây làm 200 ván caro xếp hàng.
- Engine cờ native (Pikafish, Stockfish) nếu dùng thì là **bot adapter**, nước
  nó đề xuất vẫn phải qua `isLegal` của TypeScript. Và phải có job đối chiếu
  perft/luật lặp giữa hai bản luật trong CI **từ ngày cắm native** — nếu không,
  ở đúng hai game khó nhất sẽ có hai bộ luật lệch nhau âm thầm.

---

## 5. Xếp hạng

Rating thật (Glicko-2) **chỉ cho 6 game thông tin hoàn hảo 2 người**. Cá ngựa
và cờ tỷ phú dùng thang điểm mùa cộng dồn, và nói rõ trong UI vì sao khác: 4
người + xúc xắc thì 50 ván đầu là nhiễu thuần tuý, điểm nhảy loạn và người chơi
sẽ kết luận hệ thống hỏng.

**Phòng riêng luôn `rated: false`, vô điều kiện.** Không có ngoại lệ kiểu "tính
điểm nếu chưa đấu nhau quá 10 trận/24h" — 10 trận rated mỗi ngày mỗi cặp là quá
đủ để cày một tài khoản lên đỉnh bảng.

---

## 6. Phiên bản luật

`matches` lưu `{ seed, seedCommit, engineVersion, ruleHash, variant }` **từ hàng
đầu tiên**, không phải thêm sau. Không có nó thì ngày đầu tiên sửa luật lặp cờ
tướng là ngày toàn bộ replay cũ hỏng, và lý do tồn tại của reducer thuần bốc
hơi. Giữ engine cũ theo thư mục version; registry trả engine theo version ghi
trong hàng `matches`.

Cap cứng **2 biến thể mỗi game** trong năm đầu. `variant` đi vào `ruleHash`.
Bốn game Việt (cá ngựa, cờ gánh, ô ăn quan, tỷ phú) có nhiều dị bản theo vùng —
đây là chỗ sinh bình luận một sao đầu tiên nếu thả nổi.

---

## 7. Điều không hứa

Không in con số **9** lên tên app, mô tả store hay ảnh chụp màn hình cho tới
khi game thứ 9 lên store. Cờ vây và cờ tỷ phú, theo chính khảo sát độ khó, tốn
công gấp nhiều lần phần còn lại. Định vị là "nền tảng cờ Việt + cờ quốc tế" với
lộ trình từng game công khai trong app.
