# 🎮 Hago — Social Mini-Game Platform

Nền tảng social mini-game **mobile-first** theo phong cách **chibi**: chơi game casual cùng bạn bè,
kết bạn, chat, leo rank, làm nhiệm vụ và sưu tầm cosmetic.

Triển khai đầy đủ theo PRD *Social Mini-Game Platform v1.0*: 7 game launch, realtime
server-authoritative, economy có audit, admin panel và analytics.

> Tác giả: **thanhtinz** · Giấy phép: MIT

---

## 📸 Ảnh màn hình

| Đăng nhập | Trang chủ | Kho game |
|---|---|---|
| ![](docs/screenshots/01-login.png) | ![](docs/screenshots/02-home.png) | ![](docs/screenshots/03-games.png) |

| Bạn bè | Chat | Túi đồ |
|---|---|---|
| ![](docs/screenshots/04-social.png) | ![](docs/screenshots/11-chat.png) | ![](docs/screenshots/05-inventory.png) |

| Tìm phòng | Tạo phòng | Chơi nhanh |
|---|---|---|
| ![](docs/screenshots/41-room-find.png) | ![](docs/screenshots/40-room-create.png) | ![](docs/screenshots/12-quickplay.png) |

| Giải đấu | Nhánh đấu | Túi đồ |
|---|---|---|
| ![](docs/screenshots/56-tournaments.png) | ![](docs/screenshots/57-tournament-bracket.png) | ![](docs/screenshots/05-inventory.png) |

| Bang hội (tìm bang) | Trang bang | Chat bang |
|---|---|---|
| ![](docs/screenshots/50-guild-find.png) | ![](docs/screenshots/52-guild-home.png) | ![](docs/screenshots/53-guild-chat.png) |

| Mở giải cho bang | Giải bang đang nhận đăng ký | Nhánh bang có suất miễn vòng |
|---|---|---|
| ![](docs/screenshots/77-guild-cup-form.png) | ![](docs/screenshots/79-guild-cup-joined.png) | ![](docs/screenshots/82-guild-cup-bye.png) |

| Hẹn giờ và thời gian chờ | Gọi vào trận, đếm ngược | Đối thủ cũng được gọi |
|---|---|---|
| ![](docs/screenshots/86-guild-cup-schedule.png) | ![](docs/screenshots/88-guild-cup-call.png) | ![](docs/screenshots/87-guild-cup-rival-call.png) |

| Lời gọi nổi trên mọi màn | Đã sẵn sàng, chờ đối thủ |
|---|---|
| ![](docs/screenshots/89-tournament-call-anywhere.png) | ![](docs/screenshots/90-tournament-call-ready.png) |

| Rủ đấu lại | Đối thủ rủ đấu lại | Ván mới, đổi lượt đi trước |
|---|---|---|
| ![](docs/screenshots/83-rematch-offer.png) | ![](docs/screenshots/84-rematch-asked.png) | ![](docs/screenshots/85-rematch-new-match.png) |

| Hồ sơ | Menu ba vạch | Túi đồ |
|---|---|---|
| ![](docs/screenshots/06-profile.png) | ![](docs/screenshots/06b-profile-menu.png) | ![](docs/screenshots/05-inventory.png) |

| Nhiệm vụ | Bảng xếp hạng | Thông báo |
|---|---|---|
| ![](docs/screenshots/07-quests.png) | ![](docs/screenshots/08-leaderboard.png) | ![](docs/screenshots/09-notifications.png) |

| Sự kiện & điểm danh | Đã điểm danh | Trang chủ có dải điểm danh |
|---|---|---|
| ![](docs/screenshots/61-events.png) | ![](docs/screenshots/62-events-checked.png) | ![](docs/screenshots/60-home-checkin.png) |

| Trận đang thi đấu | Khán đài | Xem lại trận |
|---|---|---|
| ![](docs/screenshots/63-spectate-list.png) | ![](docs/screenshots/64-spectate-match.png) | ![](docs/screenshots/66-replay-end.png) |

### 7 mini game

| Cờ Caro | Bắn Tàu | Ô Ăn Quan |
|---|---|---|
| ![](docs/screenshots/20-game-caro.png) | ![](docs/screenshots/21-game-battleship.png) | ![](docs/screenshots/22-game-oanquan.png) |

| Sheep Battle (đấu làn) | Cờ Vua | Flappy Bird |
|---|---|---|
| ![](docs/screenshots/25-game-sheep.png) | ![](docs/screenshots/27-game-chess.png) | ![](docs/screenshots/28-game-flappy.png) |

| Ma Sói | Kho game | Đang tìm trận |
|---|---|---|
| ![](docs/screenshots/26-game-werewolf.png) | ![](docs/screenshots/03-games.png) | ![](docs/screenshots/13-searching.png) |

Mọi game chạy **full screen thật**: bàn chơi lấy trọn màn hình trừ safe area, không
có thanh nào ăn bớt chiều cao. Thanh tiêu đề (nút thoát, tên game, báo mất kết nối)
nằm **đè lên trên và tự ẩn sau 2,6 giây**; chạm vào dải mép trên là hiện lại, chỗ đó
có một vạch mờ làm dấu. Dải chạm chỉ bắt sự kiện khi thanh đang ẩn nên không cướp
thao tác của bàn chơi. Nhật ký trận và dòng gợi ý cũng bỏ khỏi các màn cần trọn màn
hình — riêng Ma Sói giữ lại vì lời dẫn đêm/ngày chính là nội dung game.

| Đang chơi (thanh đã ẩn) | Chạm mép trên (thanh hiện lại) |
|---|---|
| ![](docs/screenshots/27-game-chess.png) | ![](docs/screenshots/27b-game-chess-hud.png) |

### Admin Dashboard

| Tổng quan | Người dùng |
|---|---|
| ![](docs/screenshots/31-admin-dashboard.png) | ![](docs/screenshots/32-admin-users.png) |

| Live Ops | Kiểm duyệt |
|---|---|
| ![](docs/screenshots/35-admin-liveops.png) | ![](docs/screenshots/36-admin-moderation.png) |

| Mở và theo dõi giải đấu từ trang quản trị |
|---|
| ![](docs/screenshots/91-admin-tournaments.png) |

Toàn bộ ảnh nằm trong [`docs/screenshots/`](docs/screenshots).

---

## 🧱 Kiến trúc

Modular monolith cho MVP, tách rõ realtime gateway để scale độc lập về sau.

```
hago/
├── packages/shared/     TypeScript thuần: domain model + 7 game engine + progression
│   └── src/games/       caro, battleship, oanquan, sheep, chess, flappy, werewolf
├── apps/server/         Node.js + Express + Socket.IO + SQLite (better-sqlite3)
│   ├── src/routes/      REST: auth, users, social, economy, progress, admin
│   ├── src/services/    users, social, economy, quests, notifications, analytics
│   ├── src/realtime/    rooms, matchmaking, match runtime, gateway
│   └── scripts/bot.mjs  Bot người chơi cho dev/test/demo
├── apps/mobile/         React Native + Expo (iOS/Android/Web), expo-router
│   └── src/games/       Bàn chơi riêng cho từng game
└── apps/admin/          React + Vite — bảng điều khiển vận hành
```

**Nguyên tắc cốt lõi**: client chỉ gửi *intent*, server xác thực và giữ authoritative state.
Client không bao giờ nhận thông tin ẩn (vị trí tàu đối thủ, vai Ma Sói, kết quả xúc xắc trước khi tung).

```
Mobile (RN/Expo) ──REST──> Express API ──> SQLite (WAL)
        └────WebSocket────> Socket.IO Gateway
                                 ├── Room registry
                                 ├── Matchmaking (Elo window nới dần)
                                 └── Match runtime ──> Game Engines (pure)
```

---

## 🕹️ Danh mục game

| Game | Người chơi | Thể loại | Chế độ | Điểm kỹ thuật |
|---|---|---|---|---|
| Cờ Caro | 2 | Board strategy | Normal/Ranked/Custom | Bàn cấu hình 9–19, luật đúng-5-quân |
| Bắn Tàu | 2 | Turn-based | Normal/Ranked/Custom | Mỗi lượt chỉ hiện một bàn, trúng được bắn tiếp |
| Ô Ăn Quan | 2 | Board dân gian | Normal/Ranked/Custom | Rải, ăn dây, rải lại khi hết dân |
| Sheep Battle | 2 | Realtime lane battle | Normal/Ranked/Custom | Đấu làn 30 máu, cừu nhỏ trừ nhiều máu, cừu to đẩy khoẻ |
| Cờ Vua | 2 | Board strategy | Normal/Ranked/Custom | Bàn vẽ 2.5D phối cảnh một điểm tụ; luật đủ: nhập thành, bắt tốt qua đường, phong cấp, hoà 50 nước / lặp 3 lần / thiếu quân |
| Flappy Bird | 1 | Arcade một người | Normal | Chơi một mình lấy điểm cao; engine chia bước 20ms để không xuyên ống, sprite pixel của dự án |
| Ma Sói | 4–16 | Social deduction | Normal/Custom | State machine đêm/ngày/vote, 6 vai |

Mỗi engine tuân theo `GameEngine` interface trong `packages/shared/src/engine.ts`:

```ts
interface GameEngine<S, C> {
  init(players, config, rng): S;
  apply(state, playerId, type, payload, rng): ApplyResult<S>;
  tick?(state, now, rng): ApplyOk<S>;      // game realtime
  timeout?(state, rng): ApplyOk<S>;         // auto-play khi hết giờ
  view(state, viewerId): unknown;           // redact thông tin ẩn
  results(state): EngineResultRow[];
  deadline(state): number | null;
}
```

Thêm game mới = viết 1 file engine + 1 component bàn chơi. Toàn bộ account, lobby,
matchmaking, economy và realtime dùng chung.

---

## ✨ Tính năng đã hoàn thiện

**Tài khoản & hồ sơ** — đăng ký/đăng nhập JWT, quản lý phiên đăng nhập, avatar chibi
sinh tự động, level/XP, rank Bronze→Master, thống kê theo từng game.

**Social** — kết bạn hai chiều, chặn, chat 1-1 và chat phòng, sticker, presence online,
báo cáo người chơi, lọc từ ngữ tục tĩu, rate limit chống spam.

**Lobby & matchmaking** — màn *Phòng chơi* gồm hai tab:
- **Tìm phòng**: lọc theo game, ẩn phòng đã đầy, tự làm mới mỗi 5 giây, hiện mã phòng,
  chế độ, số chỗ trống và avatar người đang ngồi; phòng khoá sẽ hỏi mật khẩu; vào nhanh
  bằng mã 6 ký tự.
- **Tạo phòng**: chọn game, chế độ Tự do/Xếp hạng, số người tối đa, riêng tư + mật khẩu,
  và tuỳ chọn riêng từng game (bàn Caro 9–19, thời lượng Sheep Battle).

Trong phòng: kick, mời bạn bè, đánh dấu sẵn sàng, chat phòng. Quick Match ghép theo
game + mode + region với cửa sổ Elo nới dần theo thời gian chờ.

**Sheep Battle** — dựng lại luật của bản Unity gốc, số liệu lấy thẳng từ prefab và
`GameManager` trong kho [TomoSheepFight](https://github.com/dotrungkien/TomoSheepFight):

| Cấp | Trọng lượng | Sát thương |
|---|---|---|
| 1 cừu non | 10 | 7 |
| 2 nhú sừng | 20 | 5 |
| 3 sừng xoắn | 40 | 3 |
| 4 đeo băng đầu | 60 | 2 |
| 5 cừu chúa | 80 | 1 |

Mỗi bên bắt đầu **30 máu**, ai về 0 trước là thua. Cấp cừu bốc ngẫu nhiên đều nhau
(`rand % 5`), hàng chờ hiện trước 3 con, mỗi lần thả cách nhau **5 giây** hồi chiêu.
Nút thắt nằm ở chỗ **cừu càng nặng thì càng ít sát thương**: cừu non nhẹ hều nhưng
trừ 7 máu, cừu chúa nặng gấp 8 lần mà chỉ trừ 1 — cừu to là để mở đường, cừu nhỏ mới
là thứ phải lùa qua vạch.

Hai đàn gặp nhau trong một làn thì **ghì nhau**: mỗi bên cộng trọng lượng của cả dây
cừu liền nhau, bên nặng hơn đẩy nguyên cụm về phía sân bên nhẹ, ngang cân thì cả hai
đứng im. Cừu lọt qua vạch sân địch trừ máu đối thủ đúng bằng sát thương của nó; bị
đẩy lùi qua vạch nhà mình thì chỉ mất xác chứ đối thủ không được gì. Bản gốc chơi
tới khi có bên hết máu — ở đây thêm mốc 3 phút, hết giờ thì bên còn nhiều máu hơn
thắng, để trận không kéo dài vô hạn trên nền matchmaking.

**Realtime** — Socket.IO, idempotency theo `action_id`, version state tăng dần,
reconnect tự động khôi phục ván đang chơi, grace period 60s trước khi xử thua AFK.

**Progression** — Elo với K giảm theo rank, XP/Coin có daily cap chống farm, first-win
bonus, nhiệm vụ ngày/tuần, thành tựu, bảng xếp hạng tổng và theo game.

Game một người (Flappy Bird) đi đường riêng: không có đối thủ để so nên không tính
thắng/thua và không đổi rating, thưởng tính theo điểm (6 XP + 4 coin mỗi ống, có
trần). Bảng xếp hạng của game đó sắp theo `game_stats.best_score` thay vì Elo —
`isSolo(game)` trong `packages/shared/src/types.ts` là chỗ duy nhất quyết định.

**Bang hội** — một người chỉ ở một bang (khoá bằng UNIQUE INDEX ở tầng DB chứ
không chỉ kiểm tra trong code, để hai request cùng lúc không lọt cả hai). Lập bang
mất 500 coin; ba mức nhận người: vào tự do / duyệt đơn / chỉ mời. Ba vai chủ bang –
sĩ quan – thành viên, chủ bang còn người thì phải nhường ghế mới rời được. Bang lên
cấp theo điểm đóng góp (mỗi trận 5 điểm, thắng 15), mỗi cấp mở thêm 5 chỗ. Kênh chat
riêng dùng lại hệ thống channel sẵn có nên không phải dựng thêm đường truyền.

**Push notification** — app chạy bằng Expo nên không nói chuyện thẳng với FCM/APNs:
client lấy `ExponentPushToken` gửi lên server, server đẩy qua Expo Push Service và
Expo chuyển tiếp sang FCM/APNs. Nhờ vậy không phải nhúng khoá của Google hay Apple
vào mã nguồn — hai khoá đó khai báo một lần trong dự án Expo lúc phát hành. Mọi
thông báo trong app đều có bản push tương ứng, nhưng **chỉ gửi cho người đang không
mở app** (gateway báo trạng thái online về cho tầng notification). Token chết
(`DeviceNotRegistered`) bị xoá ngay khi Expo báo về. Push hỏng không bao giờ làm hỏng
request đang phục vụ: mọi lỗi đều nuốt và ghi log.

> Phần này **chưa chạy thật được trong repo**: cần một dự án Expo có khoá FCM/APNs và
> một máy thật để lấy token. Test chỉ phủ tới lớp đăng ký token (`PUSH_ENABLED=0` để
> không gọi ra `exp.host`).

**Rank theo mùa** — mỗi mùa phải đá 5 trận định hạng mới hiện rank; trước đó hồ sơ
chỉ đếm tiến độ chứ không gọi tên hạng. Hết mùa, điểm được chốt vào `season_ranks`
để xem lại lịch sử rồi **kéo mềm về mốc 1000** (đi một nửa khoảng cách): đưa hẳn về
1000 thì cao thủ phải leo lại từ đầu, giữ nguyên thì mùa nào bảng cũng y hệt mùa
trước. Chỉ trận Ranked mới tính; trận Thường không đụng tới rank.

**Ghép trận theo trình** — cửa sổ Elo vẫn nới dần theo thời gian chờ, nhưng trong số
người lọt cửa sổ thì chọn người **sát trình nhất** với người đứng đầu hàng thay vì
người vào hàng sớm nhất. Cùng một cửa sổ mà cặp đấu cân hơn hẳn khi hàng chờ đông,
và ai chờ lâu vẫn được ghép trước vì người đứng đầu hàng luôn là mỏ neo.

**Giải đấu** — bảng loại trực tiếp 4/8/16 suất, chỉ mở cho game 2 người vì nhánh
cần mỗi cặp ra đúng một người thắng. Đủ suất là tự khai mạc, xếp hạt giống theo
rating rồi ghép 1–N, 2–(N‑1)… để hai người mạnh nhất chỉ gặp nhau ở chung kết. **Mỗi
cặp trong nhánh là một trận thật** chạy qua đúng hệ trận đấu sẵn có — cùng luật, cùng
tính giờ, cùng reconnect — giải chỉ nối các trận lại và biết ai đi tiếp. Lệ phí gộp
vào giải thưởng, vô địch 70% và á quân 30%; rút tên trước khai mạc thì hoàn tiền.

**Giải đấu của bang** — chủ bang tự mở giải cho bang mình, đi qua đúng bộ máy nhánh
đấu ở trên nên không có nhánh nào chạy song song hai kiểu. Khác giải chung ở ba chỗ.
Một, giải bang là sân riêng: không hiện ở danh sách giải chung và người ngoài bang
biết id cũng không đăng ký được. Hai, tiền treo giải trừ thẳng vào ví người mở chứ
không sinh từ hư không — không thì ai cũng gõ được một con số to rồi tự đăng ký lấy
về; huỷ giải khi chưa khai mạc thì hoàn đủ cho cả chủ giải lẫn người đã ghi tên. Ba,
chủ giải **bấm khai mạc sớm** được thay vì ngồi chờ đủ 8 hay 16 người: bảng khi ấy
thu về luỹ thừa 2 vừa đủ số người đã ghi tên, và vì vẫn ghép 1–N nên chỗ trống rơi
đúng vào đối thủ của các hạt giống đầu — **miễn vòng đầu chỉ có ở vòng 1**, mỗi cặp
nhiều nhất một suất trống, nhánh vẫn cân. Mỗi bang chỉ một giải chưa kết thúc tại
một thời điểm, vì mở chồng nhau thì một người bị gọi vào hai trận cùng lúc mà nhánh
nào cũng cần họ đánh xong mới đi tiếp.

**Hẹn giờ và xử vắng mặt** — hai thứ khiến giải bang chạy được với người thật chứ
không chỉ với người đang ngồi sẵn trong app. Chủ bang hẹn giờ khai mạc, và khi ấy đủ
suất cũng chưa chạy: đủ suất mà chạy luôn thì người đăng ký từ sáng bị gọi vào trận
lúc đang ăn cơm. Tới giờ mà không đủ hai người thì giải tự huỷ, hoàn cả lệ phí lẫn
tiền treo, vì mỗi bang chỉ được một giải chưa kết thúc nên để nó nằm đó là chắn chỗ
của giải sau.

Tới lượt mỗi cặp, trận **chưa mở ngay**: hai bên có một cửa sổ vài phút (chủ bang
đặt, 0–15 phút) để bấm *Vào trận*. Đủ hai người xác nhận là vào luôn, không đợi hết
giờ. Hết giờ mà chỉ một người có mặt thì người đó thắng và đi tiếp không cần đánh;
cả hai vắng thì hạt giống cao hơn đi tiếp. Không có luật này thì cả nhánh đứng chờ
một người đã đi ngủ, mà giải loại trực tiếp thì một cặp treo là cả bảng treo.

Trận giải **không cướp người đang đánh dở ván khác**: nếu một trong hai đang bận, cặp
đó nằm chờ và được thử lại mỗi nhịp quét cho tới khi cả hai rảnh. Mở bừa thì client
kéo họ sang trận mới, ván đang đánh bị bỏ rơi và thua theo luật. Đổi lại, ai đã bấm
có mặt thì không bao giờ bị xử vắng mặt dù cửa sổ chờ đã hết.

Lời gọi vào trận **nổi trên mọi màn**, không nằm yên trong trang bang: cửa sổ chỉ vài
phút và hết giờ là thua, nên nó phải đi theo người chơi chứ không chờ người ta tự mở
đúng tab ra xem. Thanh gọi đổi sang màu đỏ khi còn dưới 30 giây, và tự ẩn khi đang
trong trận — người đang đánh không phải người đang bị gọi. Trạng thái đẩy qua socket
`tournament.call`; lúc mở app hoặc vừa nối lại mạng thì hỏi `GET /api/tournaments/pending`
một phát cho khỏi lỡ lời gọi đã bắn trước khi kết nối. Người tắt hẳn app vẫn nhận
push, vì mọi thông báo trong app đều có bản push tương ứng.

Trận của giải kéo người chơi vào thẳng dù họ đang ở màn nào — `match.start` mang theo
`tournamentId` và được bắt ở gốc điều hướng, chứ không phải chỉ ở màn tìm trận.

**Đấu lại** — hết trận, bảng kết quả có nút rủ đối thủ đánh ván nữa: một người bấm
là thành lời rủ, người kia gật là vào luôn, không phải quay về sảnh tìm trận lại từ
đầu. Ván mới dùng đúng game, chế độ và tuỳ chọn cũ nhưng **xoay chỗ ngồi đi một
nhịp**, không thì lượt đi trước rơi mãi vào một người. Ai bấm từ chối thì lời rủ xoá
hẳn để người kia biết ngay, chứ không treo đó tới lúc trận cũ bị dọn. Trận trong
nhánh giải đấu thì không rủ được — kết quả đã đẩy người thắng sang vòng sau rồi.

**Cosmetic & tiền tệ** — 19 cosmetic và **cả 8 loại đều có tác dụng thật**: khung
avatar, danh hiệu dưới tên, nền hồ sơ, bong bóng chat, theme mặt bàn cờ, hiệu ứng ăn
mừng khi thắng, hiệu ứng lúc vào phòng, gói emote nối thêm vào thanh sticker. Màu sắc
đọc từ `payload` của món trên server chứ không giữ bảng hardcode ở client — thêm món
mới chỉ cần sửa dữ liệu, không phải phát hành lại app. Bốn loại người khác nhìn thấy
(khung, danh hiệu, nền, bong bóng) nằm trong hồ sơ công khai; bốn loại chỉ đổi màn
hình của chính chủ thì không lộ ra.

**Không có cửa hàng và không có nạp tiền**: cosmetic chỉ kiếm được qua **thành tựu**,
nên không có giá. 19 thành tựu tặng đúng một món mỗi cái, khó dần thì hiếm dần — đó là
toàn bộ đường lấy cosmetic. Hai thành tựu điểm danh thêm sau chỉ thưởng Coin/XP vì 19
món đã chia hết; có món mới thì gắn vào đó trước. Coin dùng làm phí lập
bang và lệ phí giải đấu, chỉ đến từ trận đấu và nhiệm vụ; mọi thay đổi số dư vẫn ghi
transaction bất biến trong SQL transaction.

> **Hai loại tiền còn treo sau khi bỏ shop và Battle Pass.** Diamond vẫn được nhiệm
> vụ thưởng nhưng không mua được gì nữa. Season Token thì mất cả nguồn lẫn chỗ tiêu —
> Battle Pass là nơi duy nhất phát ra nó. Cả hai nên bỏ hẳn hoặc gắn công dụng mới;
> hiện chúng chỉ là con số đứng yên trong ví.

**Xem lại trận** — mọi trận đều được server chụp lại thành từng khung, xem lại bằng
một trình phát có thanh tua, nút lùi/tới từng khung và bốn mức tốc độ 0,5x–4x. Bàn cờ
dùng lại đúng component của màn chơi nên xem lại trông y hệt lúc đấu.

Chọn cách **chụp khung** thay vì **diễn lại từ seed**: engine thuần và RNG có seed nên
về lý thuyết diễn lại được từ `matches.seed` + `match_actions`, nhưng Sheep và Flappy
còn phụ thuộc `tick(now)` của đồng hồ máy chủ — diễn lại không ra đúng khung cũ. Khung
lưu **state thô**, lúc phát mới lọc theo người đang xem, nên xem lại trận của mình thì
thấy thông tin của mình còn người ngoài vẫn bị giấu. Trần 400 khung mỗi trận; chạm trần
thì bỏ bớt khung lẻ và giãn nhịp ra, giữ trọn trận thay vì cắt cụt đúng đoạn quyết định.
Khung giữ 14 ngày.

Vào từ: nút *Xem lại* ngay trong bảng kết quả trận, dòng trận trong *Trận gần đây* ở
trang chủ, và lịch sử đấu trong hồ sơ (dòng nào còn bản xem lại thì có dấu ▶).

Khán đài và màn xem lại **dùng lại nguyên bàn chơi** của màn đấu, mà bàn chơi vốn được
viết theo góc nhìn người trong trận — để nguyên thì nó gọi khán giả là "Bạn" và giục
"Tới lượt bạn — đánh đi!". Nên có một ngữ cảnh `SpectateProvider`: người xem không ngồi
ghế nào thì bỏ hết nhãn *Bạn* / *Đối thủ* / *(bạn)*, và băng-rôn lượt đi nói thẳng tên
người đang đi ("Tới lượt Minh Caro") thay vì câu giục. Ghế của người xem trong bản xem
lại được tra từ danh sách người chơi của trận, không đoán theo ghế 0 — Caro và Ô Ăn Quan
không khai `mySeat` trong view vì chúng chẳng giấu gì cả.

**Xem trực tiếp** — vào khán đài trận đang diễn ra của bạn bè hoặc người cùng bang,
nhận state realtime qua đúng luồng của người chơi. Khán giả nhận **một bản chung** đã
lọc sạch thông tin ẩn (`view(state, null)`) và không nhận các sự kiện gửi riêng cho một
người chơi — nên khán đài không thể thành đường rò bài: xem Bắn Tàu thì không thấy toạ
độ tàu của ai cả. Người trong trận thấy số khán giả trên thanh tiêu đề. Không mở công
khai cho cả thiên hạ vì như thế là mời người ta lập nick phụ ngồi xem bài đối thủ rồi
mách nước qua kênh ngoài.

**Điểm danh & sự kiện** — điểm danh vòng 7 mốc, thưởng tăng dần và mốc 7 nặng nhất; bỏ
một ngày là về mốc 1. Sự kiện giới hạn thời gian có nhiệm vụ riêng, tiến độ và nút nhận
thưởng ngay trong thẻ sự kiện.

Nhiệm vụ sự kiện **dùng lại nguyên bảng `quests`**, chỉ khác là có `event_id`: tiến độ,
chống nhận trùng và trả thưởng đi chung một đường với nhiệm vụ thường, không phải viết
lại lần nữa. Chúng không hiện ở màn *Nhiệm vụ* để hai chỗ không lẫn vào nhau. Admin gắn
nhiệm vụ vào sự kiện ngay trong LiveOps, và nhiệm vụ tự mượn khung thời gian của sự kiện
sinh ra nó — quên đặt ngày kết thúc là nhiệm vụ sống dai hơn cả sự kiện.

**Admin** — dashboard KPI, quản lý user, theo dõi phòng/trận live, CRUD vật phẩm và
nhiệm vụ/sự kiện (gắn được nhiệm vụ vào sự kiện), mở giải đấu chung kèm hẹn giờ và
thời gian chờ có mặt, xử lý báo cáo, audit log, phễu analytics. Bảng giải đấu liệt kê
cả giải của bang để nắm tình hình nhưng không huỷ được chúng — đó là việc chủ bang.

---

## 🚀 Chạy dự án

```bash
# 1. Cài dependencies
npm install                       # workspaces: shared, server, admin
npm install --prefix apps/mobile  # Expo có node_modules riêng

# 2. Build package dùng chung
npm run build:shared

# 3. Chạy server (http://localhost:4000)
npm run dev:server

# 4. Chạy app mobile
cd apps/mobile && npx expo start
#   → nhấn 'a' mở Android, 'i' mở iOS, 'w' mở web

# 5. Chạy admin (http://localhost:5174)
npm run dev:admin
```

Tài khoản có sẵn: `demo / demo123` (người chơi) và `admin / admin123` (quản trị),
kèm 8 tài khoản demo khác để test social.

### Build production

```bash
npm run build -w @hago/shared
npm run build -w @hago/server
npm run build -w @hago/admin          # served tại /admin của server
cd apps/mobile && npx expo export --platform web
cd apps/mobile && eas build -p android   # build APK/AAB native
```

### Bot cho dev / demo

```bash
node apps/server/scripts/bot.mjs --idle --count 6         # giữ bạn bè online
node apps/server/scripts/bot.mjs --game caro --count 1    # ghép trận với bạn
node apps/server/scripts/bot.mjs --game caro --count 3 --loop
```

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `4000` | Cổng server |
| `JWT_SECRET` | dev secret | **Bắt buộc đổi khi lên production** |
| `DB_FILE` | `data/hago.db` | Đường dẫn SQLite |
| `CORS_ORIGIN` | `*` | Origin cho phép |
| `RECONNECT_GRACE_MS` | `60000` | Thời gian chờ reconnect |
| `DAILY_XP_CAP` | `3000` | Trần XP mỗi ngày |
| `EXPO_PUBLIC_API_URL` | tự dò | URL API cho app mobile |

---

## 🎨 Ngôn ngữ thiết kế

Lấy cảm hứng từ các app social game casual (Hago, WePlay) nhưng dựng lại toàn bộ
bằng component riêng:

- **Header gradient tím→hồng** (`HERO_GRADIENT`) dùng chung cho mọi màn qua
  component `ScreenHeader`, có hoạ tiết chấm bi và bong bóng mờ.
- **Banner carousel** sự kiện ở đầu Trang chủ, tự chạy và có chấm chỉ trang.
- **Thẻ game nhiều lớp**: gradient đậm → bong bóng trang trí → lớp gloss chéo →
  bệ tròn sau nhân vật → chuyển màu mờ dần ở chân thẻ cho chữ luôn đọc được.
- **Bottom nav 4 tab + nút Chơi nhanh tròn nổi ở giữa**, đúng bố cục quen thuộc
  của app game casual.
- **Tile hành động** (Chơi nhanh / Tìm phòng / Tạo phòng) gradient riêng theo
  chức năng, có hiệu ứng nhấn lún xuống.

## 🎨 Nguồn asset

| Loại | Nguồn | Giấy phép |
|---|---|---|
| Art trong trận: mark 7 game, chim, xúc xắc, vai Ma Sói, sticker | [game-icons.net](https://github.com/game-icons/icons) — 62 asset trong `apps/mobile/assets/game-icons/` | CC BY 3.0 |
| Quân Cờ Vua: bộ **rhosgfx**, 12 quân | [RhosGFX](https://rhosgfx.itch.io/) qua kho [lichess](https://github.com/lichess-org/lila/tree/master/public/piece) — `apps/mobile/assets/chess/` | CC0 1.0 |
| Art Sheep Battle: 5 giống cừu × 2 phe × 2 animation, icon cấp, hiệu ứng | [TomoSheepFight](https://github.com/dotrungkien/TomoSheepFight) của Do Trung Kien — `apps/mobile/assets/sheep-fight/` | MIT |
| Art Ô Ăn Quan: bàn gỗ, hai ô Quan, quan chibi, nắp quan, 6 màu hạt, hoa lá | Bản vẽ riêng của dự án — `apps/mobile/assets/oanquan/` | Nội bộ |
| Art Bắn Tàu: mặt biển, 5 loại tàu (nhìn trên + nhìn ngang), cột nước, tàu cháy, dấu chìm, vòng ngắm | Bản vẽ riêng của dự án — `apps/mobile/assets/battleship/` | Nội bộ |
| Art Flappy Bird: chim pixel 3 nhịp vỗ cánh | Bản vẽ riêng của dự án, sinh bằng `scripts/make-flappy-art.py` — `apps/mobile/assets/flappy/` | Nội bộ |
| Avatar người chơi | [DiceBear](https://github.com/dicebear/dicebear) — render SVG server-side, 10 bộ style | MIT |
| Font tiêu đề | [Baloo 2](https://github.com/googlefonts/baloo) qua `@expo-google-fonts` | OFL |
| Font nội dung | [Be Vietnam Pro](https://github.com/bettergui/BeVietnamPro) — hỗ trợ tiếng Việt đầy đủ | OFL |
| Icon điều hướng, nút, trạng thái | Bộ icon nét trong `src/components/Icon.tsx` | — |
| Khung, nền, bàn cờ, hiệu ứng cosmetic | CSS/gradient trong `src/theme.ts` | — |

**Art của game lấy từ kho có sẵn, không vẽ tay.** game-icons.net là kho 4000+ icon
game do hoạ sĩ vẽ, cùng khung 512×512 và cùng ngôn ngữ tạo hình silhouette — nhờ
vậy 7 game xếp cạnh nhau vẫn ăn khớp, thứ mà tự vẽ từng cái rất khó giữ đồng bộ.
Ghi công từng asset trong `apps/mobile/assets/game-icons/CREDITS.md`.

Tải và cập nhật bộ asset:

```bash
node apps/mobile/scripts/fetch-game-art.mjs      # icon chung của 7 game
node apps/mobile/scripts/fetch-chess-pieces.mjs  # bộ quân Cờ Vua
python3 apps/mobile/scripts/make-flappy-art.py   # sprite chim Flappy
```

Script tải SVG gốc về `apps/mobile/assets/game-icons/` (giữ nguyên file để tuân thủ
giấy phép) rồi sinh `src/art/gameArt.ts` — dữ liệu vector đã bỏ nền đen và đánh dấu
chỗ ăn màu, để `<Art>` vẽ bằng `react-native-svg` và tô theo phe / theo trạng thái.
Muốn đổi hình cho game nào chỉ cần sửa một dòng trong bảng `ART` của script.

**Cờ Vua vẽ 2.5D bằng SVG.** Ô cờ trong phối cảnh là hình thang chứ không phải
hình chữ nhật, mà `<View>` chỉ vẽ được hình chữ nhật — nên cả bàn là một `<Svg>`
với 64 `<Polygon>`. Phép chiếu là phối cảnh một điểm tụ thật: bề ngang và khoảng
cách hàng đều tỉ lệ `1/z`, nhờ vậy các hàng dồn lại về phía xa đúng như mắt nhìn,
kèm hàng xa nhạt dần (phối cảnh khí quyển) và thành bàn phía gần cho thấy bề dày.
Quân dùng bộ **rhosgfx** lấy từ kho quân cờ của lichess: khối mập, viền dày, nhìn
nghiêng nên đứng trên bàn là hợp và nổi được trên cả ô sáng lẫn ô tối — thứ mà
silhouette một màu dùng lúc đầu không làm được, đứng lên nhìn bẹt. Chọn bộ này còn
vì giấy phép: dự án phát hành được nên mấy bộ CC BY-NC-SA dùng không được, còn cburnett và
merida là GPL sẽ kéo theo cả repo; rhosgfx là **CC0** nên không vướng gì. Hình vẽ
thẳng vào cảnh chung nên co theo tỉ lệ xa gần, kèm bóng đổ dẹt dưới chân, và chiều
cao tương đối giữa tốt với vua giữ nguyên như bản gốc.

Chạm thì **nghịch đảo phép chiếu** ra ô cờ thay vì gắn `onPress` lên từng polygon:
`react-native-svg` không chuyển `onPress` thành sự kiện chuột trên web, mà một hàm
nghịch đảo thì đúng tuyệt đối và chạy được cả hai nền. Toạ độ lấy từ
`onResponderRelease` chứ không từ `Pressable` — `onPress` của Pressable trên web
không kèm `locationX/locationY`.

Flappy Bird là **ngoại lệ duy nhất của quy tắc "lấy asset có sẵn"**: con chim
của bản gốc là art có bản quyền của Dong Nguyen, mọi kho "flappy bird assets"
trên mạng đều là bản trích xuất từ game gốc nên không dùng được, còn game-icons
thì không có con chim thân tròn nhìn nghiêng nào đúng chất. Nên sprite được vẽ
theo phong cách pixel của thể loại bằng `scripts/make-flappy-art.py`: lưới ASCII
một ký tự một điểm ảnh, ba nhịp vỗ cánh, phóng to nearest-neighbour để giữ cạnh
răng cưa. Sửa hình = sửa mấy dòng ASCII rồi chạy lại script.

Sheep Battle dùng **art gốc của game Sheep Fight**: mỗi cấp cừu là một giống
cừu riêng — cừu non chưa có sừng, nhú sừng, sừng xoắn, đeo băng đầu, cừu chúa
sừng vàng mặt dữ — và hai phe khác hẳn nhau chứ không chỉ đổi màu: đàn trắng
nhìn từ sau lưng (đang đi lên), đàn đen nhìn chính diện (đang đi xuống).

- `<SheepSprite>` chạy strip 6 khung, đổi sang animation *húc* khi hai con chạm nhau.
- Chạm nhau thì hai bên **ghì nhau ~1s** (`PUSH_MS` trong engine — bản gốc hạ tốc độ
  từ 0.5 xuống 0.3 khi đang đẩy) rồi mới phân
  thắng bại, kèm đám bụi 8 khung `push-effect` bốc lên giữa hai con — không có
  nhịp này thì va chạm xong trong một tick, người chơi chỉ thấy cừu biến mất.
- Chạm vào làn nào thì làn đó loé `lane-effect` 4 khung.
- `<SheepUnit>` trượt con cừu sang ô mới đúng bằng nhịp `moveMs` của server nên
  đàn cừu đi mượt thay vì nhảy cóc mỗi lần tick; lúc húc thì nảy gấp đôi nhịp.
- Kích thước từng khung đọc thẳng từ file `.meta` của Unity đi kèm sprite —
  vài strip lẻ 1–2px nên chia đều chiều ngang là lệch khung.
- Sàn đấu là ảnh `map.png` gốc, cắt đúng vùng 5 làn (`MAP_LANES`) và bỏ dải trời
  cùng nông trại phía xa (`MAP_ROWS`) để cừu không đi lên cả bầu trời.

Tải lại bộ art: `node apps/mobile/scripts/fetch-sheep-fight.mjs`.

Ô Ăn Quan cắt từ **một bảng thiết kế duy nhất** (`assets/oanquan/source/oanquan-sheet.png`)
bằng `python3 apps/mobile/scripts/slice-oanquan-art.py`:

- Nền bản vẽ gần trắng nên script **tô loang từ bốn cạnh** để tìm nền, không cắt
  bằng ngưỡng màu — hạt trắng cũng gần trắng, cắt kiểu ngưỡng là thủng ruột hạt.
- Bàn gốc vẽ **6 ô mỗi hàng** còn game chỉ dùng 5, nên script cắt bàn thành nắp
  trái + một cột ô + nắp phải rồi ghép lại thành bàn 5 cột, mép nối được pha mờ
  14px cho khỏi lộ vệt vân gỗ. Giữ nguyên nét vẽ gốc thay vì co ảnh cho vừa.
- Tâm từng lòng ô được dò ngay trên bàn đã ghép và ghi ra `src/art/oanQuan.ts`
  dưới dạng **tỉ lệ 0..1**, nên bàn to nhỏ cỡ nào thì hạt vẫn rơi đúng ô.

Bắn Tàu cũng cắt từ một bảng thiết kế (`assets/battleship/source/battleship-sheet.png`)
bằng `python3 apps/mobile/scripts/slice-battleship-art.py`, nhưng nền bảng này là
dải chuyển màu tối chứ không phải nền trắng:

- Nền chuyển màu rất mượt nên **làm mờ mạnh cả tấm là ra gần đúng nền**; chỗ nào
  lệch nhiều so với bản mờ đó chính là hình. Alpha lấy theo độ lệch ấy nên mép
  tàu mượt, không răng cưa.
- Mặt biển cắt đúng **một ô nước** trong lòng bàn gốc (40×40, vạch lưới vẽ sẵn ở
  mép) rồi lát ra — bàn 8 hay 12 ô thì lưới vẫn liền, thay vì kéo giãn cả tấm
  10×10 rồi lệch vạch.
- Cột nước, tàu cháy và dấu chìm được bóc khỏi nền xanh của ô bằng khoảng cách
  màu so với màu viền ô, rồi bỏ các mảng vụn (viền và vệt sáng của chính ô cũng
  lệch màu) nên chỉ còn đúng hình.
- Tàu nhìn từ trên được kéo phủ đúng số ô nó chiếm; giữ nguyên tỉ lệ thì tàu
  ngắn hơn ô của nó vì bản vẽ gốc vẽ tàu mập hơn một ô.

Trong trận **chỉ hiện một bàn**, đổi theo lượt: tới lượt mình thì hiện bàn địch
với tàu giấu sạch, chỉ thấy chỗ đã bắn; tới lượt địch thì hiện bàn nhà, lúc đó
mới nhìn được hạm đội của chính mình và đối thủ đang dò vào đâu. Bảng hạm đội
bên dưới cũng đổi theo. Nhờ vậy bàn to gần gấp đôi và không lộ tàu lúc đang
ngắm bắn.

Quick Match với Ma Sói **chờ gom đủ bàn**
trước: trong 15 giây đầu chỉ mở trận khi đủ `maxPlayers`, quá thời gian đó thì
mở với số người đang có miễn không dưới mức tối thiểu.

**Không dùng emoji ở bất kỳ đâu trong giao diện** — emoji mỗi hệ điều hành vẽ một
kiểu, không đổi được màu theo ngữ cảnh và không canh được nét với chữ.

Cosmetic vẫn vẽ bằng gradient nên thêm item mới chỉ cần một dòng cấu hình màu.

---

## 🔒 Bảo mật & chống gian lận

- Server authoritative tuyệt đối — client gửi intent, không gửi kết quả.
- Thông tin ẩn không rời server: `view(state, viewerId)` lọc theo từng người xem.
- Xúc xắc và phân vai sinh bằng RNG có seed lưu cùng match → replay/audit được.
- `action_id` chống double-submit khi mạng chập chờn.
- Rate limit REST (đăng nhập), WebSocket (chat 12/10s, action 25/s).
- Số dư chỉ đổi qua `mutateCurrency()` → luôn có transaction + audit log.
- JWT có session revoke; ban/suspend thu hồi toàn bộ phiên ngay lập tức.

---

## 🗺️ Trạng thái theo PRD

| Hạng mục | Trạng thái |
|---|---|
| Authentication, Profile, Avatar | ✅ |
| Friend, Block, Text chat 1-1 & room | ✅ |
| Home, game catalog, Quick Match | ✅ |
| Lobby, Room, Invite, room code | ✅ |
| 7 game launch (Normal/Ranked/Custom) | ✅ |
| XP, Coin, Rank, Achievement, Quest | ✅ |
| Túi đồ + cosmetic (không mua bán) | ✅ |
| Notification in-app | ✅ |
| Admin Panel + Analytics | ✅ |
| Report/Ban/Mute, profanity filter | ✅ |
| Reconnect + grace period | ✅ |
| Guild (bang hội) + chat bang | ✅ |
| Tournament bracket (loại trực tiếp) | ✅ |
| Push notification (Expo → FCM/APNs) | ✅ mã hoàn chỉnh, chưa chạy thật |
| Seasonal rank + định hạng đầu mùa | ✅ |
| Skill-based MM: ghép theo trình sát nhất | ✅ |
| Xem lại trận (replay có tua, đổi tốc độ) | ✅ |
| Xem trực tiếp trận của bạn bè / cùng bang | ✅ |
| Điểm danh theo chuỗi ngày + nhiệm vụ sự kiện | ✅ |

Chi tiết kỹ thuật: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · API: [`docs/API.md`](docs/API.md)

---

## ✅ Kiểm thử

```bash
npm test                    # chạy toàn bộ
npm test -w @hago/shared    # 41 test: 7 engine, redact thông tin ẩn, Elo, XP cap
npm test -w @hago/server    # 36 test tích hợp: đăng ký → ghép trận → thưởng → bang hội → giải đấu → xem lại → khán đài → admin
```

Test tích hợp khởi động server thật trên SQLite tạm và điều khiển hai WebSocket client
chơi trọn một ván Caro ranked, kiểm tra: kết quả do server quyết định, Elo bảo toàn tổng,
`action_id` trùng không tính hai lần, lọc từ tục, rate limit chat, không mua trùng vật phẩm,
không claim quest hai lần, RBAC admin và ban thu hồi phiên. Phần mới thêm: bản xem lại
có đủ khung từ đầu tới cuối và mốc thời gian không lùi, người lạ không vào được khán đài,
khán giả xem Bắn Tàu không nhận được toạ độ tàu, điểm danh chỉ ăn một lần mỗi ngày và
nhiệm vụ sự kiện không lẫn vào màn Nhiệm vụ.
