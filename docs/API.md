# Hago API

Base URL mặc định: `http://localhost:4000`
Xác thực: `Authorization: Bearer <token>` (JWT, mặc định hết hạn sau 7 ngày).

## REST

### Auth — `/api/auth`

| Method | Path | Mô tả |
|---|---|---|
| POST | `/register` | `{username, password, displayName?, email?}` → `{token, profile}` |
| POST | `/login` | `{login, password}` → `{token, profile}`. Rate limit 12 lần/phút/IP |
| POST | `/logout` | Thu hồi phiên hiện tại |
| GET | `/sessions` | Danh sách phiên đăng nhập |
| DELETE | `/sessions/:id` | Thu hồi một phiên |

### Users — `/api/users`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/me` | Hồ sơ đầy đủ (số dư, thống kê từng game) |
| PATCH | `/me` | `{displayName?, bio?, avatarSeed?, avatarStyle?}` |
| GET | `/search?q=` | Tìm người chơi |
| GET | `/leaderboard?gameType=&limit=` | BXH tổng hoặc theo game |
| GET | `/ranks` | Bảng mốc rank |
| GET | `/avatar-styles` | Danh sách style avatar khả dụng |
| GET | `/:id` | Hồ sơ công khai + lịch sử + thành tựu |
| GET | `/:id/history?limit=` | Lịch sử trận |

### Social — `/api/social`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/friends` | Danh sách bạn bè và lời mời |
| POST | `/friends/:id/request` | Gửi lời mời (tự động accept nếu đối phương đã mời) |
| POST | `/friends/:id/accept` | Chấp nhận |
| DELETE | `/friends/:id` | Huỷ kết bạn |
| POST/DELETE | `/block/:id` | Chặn / bỏ chặn |
| GET | `/blocks` | Danh sách đã chặn |
| GET | `/channels` | Danh sách hội thoại + unread |
| GET | `/channels/:id/messages` | Lịch sử tin nhắn |
| POST | `/channels/direct/:userId` | Mở/lấy kênh chat 1-1 |
| POST | `/reports` | `{targetId, targetType, reason, evidence?}` |

### Túi đồ — `/api/economy`

App **không có cửa hàng và không có nạp tiền**. Cosmetic chỉ kiếm được qua
thành tựu, nên không có giá và không có đường mua.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/cosmetics` | Bảng cosmetic kèm payload màu (công khai, client tải một lần) |
| GET | `/inventory` | Túi đồ |
| POST | `/inventory/:itemId/equip` | `{equip: boolean}` — mỗi loại chỉ một món |
| GET | `/transactions` | Lịch sử giao dịch tiền tệ của mình |

### Progression — `/api`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/home` | Payload tổng hợp cho màn hình chính |
| GET | `/games` | Catalog 7 game |
| GET | `/rooms?gameType=` | Phòng công khai đang mở |
| GET | `/quests` · POST `/quests/:id/claim` | Nhiệm vụ và nhận thưởng |
| GET | `/achievements` | Thành tựu |
| GET | `/notifications` · POST `/notifications/read` | Thông báo |
| GET | `/events` | Sự kiện đang chạy, kèm nhiệm vụ riêng và tiến độ + trạng thái điểm danh |
| GET | `/checkin` · POST `/checkin` | Trạng thái điểm danh và nhận thưởng ngày hôm nay |
| GET | `/matches?limit=` | Lịch sử đấu của mình, kèm cờ `hasReplay` |
| GET | `/matches/:id/replay` | Bản xem lại: khung hình theo thời gian + kết quả |
| GET | `/live` | Trận đang diễn ra mà mình xem được (bạn bè / cùng bang) |
| POST | `/analytics` | `{name, props}` — gửi event tracking |

Nhiệm vụ sự kiện dùng chung đường nhận thưởng với nhiệm vụ thường
(`POST /quests/:id/claim`), nhưng không xuất hiện trong `GET /quests` — chúng chỉ
nằm trong thẻ sự kiện của `GET /events`.

### Admin — `/api/admin` (yêu cầu `is_admin`)

`GET /dashboard` · `GET /users` · `POST /users/:id/status` · `POST /users/:id/mute` ·
`POST /users/:id/currency` · `GET /reports` · `POST /reports/:id/resolve` ·
`GET|POST /items` · `GET|POST /quests` · `GET|POST /events` · `POST /announce` ·
`GET /matches` · `GET /transactions` · `GET /audit` · `GET /analytics?days=`

### Avatar

`GET /avatar/:style/:seed.svg?size=160` — SVG chibi render server-side, cache 7 ngày.

---

## WebSocket (Socket.IO)

Kết nối: `io(API_URL, { auth: { token } })`. Handshake thất bại nếu token sai hoặc
tài khoản bị khoá.

### Client → Server

| Event | Payload | Ack |
|---|---|---|
| `room.create` | `{gameType, mode, isPrivate?, password?, maxPlayers?, config?}` | `{ok, room}` |
| `room.join` | `{roomId}` hoặc `{code, password?}` | `{ok, room}` |
| `room.leave` | `{}` | `{ok}` |
| `room.ready` | `{ready}` | `{ok}` |
| `room.kick` | `{userId}` | `{ok}` |
| `room.invite` | `{userId}` | `{ok}` |
| `room.start` | `{}` | `{ok}` hoặc `{ok:false, error}` |
| `room.list` | `{gameType?}` | `{ok, rooms}` |
| `mm.join` | `{gameType, mode, region?}` | `{ok, queue}` |
| `mm.leave` | `{}` | `{ok}` |
| `game.action` | `{matchId, actionId, type, payload}` | `{ok, version}` |
| `game.sync` | `{matchId?}` | `{ok, state}` |
| `match.rematch` | `{matchId, accept?}` | `{ok, asked[]}` khi còn chờ, `{ok, matchId}` khi mở ván mới |
| `match.rematch.state` | `{matchId}` | `{ok, asked[]}` |
| `spectate.join` | `{matchId}` | `{ok, state, players}` hoặc `{ok:false, error}` |
| `spectate.leave` | `{matchId?}` | `{ok}` |
| `spectate.list` | `{}` | `{ok, matches}` |
| `chat.send` | `{channelId\|toUserId, body, kind?}` | `{ok, message}` |
| `chat.history` | `{channelId\|toUserId, limit?}` | `{ok, channelId, messages}` |
| `ping.check` | `{}` | `timestamp` |

### Server → Client

| Event | Payload |
|---|---|
| `room.state` | `RoomView` đầy đủ |
| `room.left` | `{roomId, kicked?}` |
| `mm.found` | `{roomId, gameType, mode, waitMs}` |
| `match.start` | `{matchId, gameType, mode, roomId, rematchOf?, tournamentId?}` |
| `match.rematch` | `{matchId, asked[], declinedBy?}` — lời rủ đấu lại của trận vừa xong |
| `game.state` | `{matchId, gameType, version, view, finished, deadline, spectators, spectating?}` |
| `game.event` | `{matchId, version, events[]}` — hiệu ứng: win, kick, bump, score, rent… |
| `match.result` | `{matchId, gameType, mode, rows[], spectating?}` với xpGain, coinGain, ratingDelta |
| `chat.message` | `ChatMessage` |
| `notification` | `NotificationRow` |
| `presence` | `{user, online}` — chỉ gửi cho bạn bè |
| `tournament.call` | `{call}` — lời gọi vào trận đổi trạng thái; `call: null` là đã đóng |

**Đấu lại.** Trận xong còn sống trên máy chủ 5 phút để client xem kết quả; đúng cửa
sổ đó là lúc rủ nhau đánh ván nữa. Ván mới chỉ mở khi **mọi người trong trận đều
bấm đồng ý**, dùng lại đúng game, chế độ và tuỳ chọn cũ, và **xoay chỗ ngồi đi một
nhịp** để lượt đi trước không rơi mãi vào một người. `accept: false` xoá hẳn lời rủ
(người kia nhận `declinedBy`) chứ không để treo đến hết giờ. Bị từ chối bằng lỗi:
`SOLO_MATCH` (game một người), `TOURNAMENT_MATCH` (trận trong nhánh giải — kết quả
đã đẩy người thắng đi tiếp), `OPPONENT_LEFT`, `ALREADY_IN_MATCH`.

### Action theo từng game

| Game | Action | Payload |
|---|---|---|
| caro | `move` | `{x, y}` |
| battleship | `place` / `fire` | `{ships?}` (bỏ trống = xếp ngẫu nhiên) / `{x, y}` |
| oanquan | `sow` | `{cell, dir}` — `dir` là `1` hoặc `-1` |
| sheep | `deploy` | `{lane}` — thả cừu đầu hàng chờ vào làn |
| chess | `move` / `resign` | `{from, to, promo?}` — ô đánh số 0–63, `promo` là `q\|r\|b\|n` / `{}` |
| flappy | `flap` | `{}` — vỗ cánh, chỉ nhận sau khi hết đếm ngược (game một người) |
| werewolf | `night_action` / `vote` / `ready_vote` | `{target}` / `{target}` / `{}` |

### Push notification

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/push/register` | Lưu token — `{token, platform}`; chỉ nhận `ExponentPushToken[...]` |
| POST | `/api/push/unregister` | Gỡ token, gọi lúc đăng xuất |

### Rank theo mùa

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users/me/rank` | Tiến độ định hạng mùa này và lịch sử rank các mùa trước |

### Giải đấu

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/tournaments` | Giải chung đang mở, đang chạy và vừa kết thúc |
| GET | `/api/tournaments/:id` | Một giải kèm danh sách người và nhánh đấu |
| POST | `/api/tournaments` | Tạo giải chung (admin) — `{name, gameType, size, entryCoin?, basePrize?}` |
| POST | `/api/tournaments/:id/join` | Đăng ký, trừ lệ phí; đủ suất là tự khai mạc |
| POST | `/api/tournaments/:id/leave` | Rút tên trước khai mạc, hoàn lệ phí |
| POST | `/api/tournaments/:id/start` | Chủ giải khai mạc sớm (từ 2 người) |
| POST | `/api/tournaments/:id/ready` | Xác nhận có mặt khi tới lượt |
| GET | `/api/tournaments/pending` | Lời gọi vào trận đang treo của chính mình, trên mọi giải |
| POST | `/api/tournaments/:id/cancel` | Chủ giải huỷ khi chưa khai mạc, hoàn hết tiền |

Chỉ nhận game đúng 2 người. Sức chứa là 4, 8 hoặc 16; đủ suất thì tự khai mạc.

Khai mạc sớm thì bảng **thu về luỹ thừa 2 vừa đủ** số người đã ghi tên (`bracketSize`,
có thể nhỏ hơn `size`) chứ không để nửa bảng rỗng. Hạt giống xếp theo rating rồi
ghép 1-N, 2-(N-1)…, nên chỗ trống rơi đúng vào đối thủ của các hạt giống đầu:
**miễn vòng đầu chỉ có ở vòng 1** và mỗi cặp nhiều nhất một suất trống. Người được
miễn vào thẳng vòng sau, không mở trận thật (`matchId` để trống).

`prizePool` = tiền treo giải + lệ phí **đã thu thật**, nên trước khi đủ suất con số
hiện ra vẫn đúng với số tiền đang có.

**Hẹn giờ khai mạc.** `startAt` (mốc epoch ms) khiến giải chỉ chạy đúng giờ, kể cả
đã đủ suất — không thì người đăng ký sớm bị gọi vào trận lúc chưa sẵn sàng. Chỉ hẹn
được trong tương lai và trong vòng 7 ngày (`BAD_START_TIME`, `SCHEDULE_TOO_FAR`).
Tới giờ mà chưa đủ hai người thì giải **tự huỷ và hoàn hết tiền**, vì mỗi bang chỉ
được một giải chưa kết thúc nên để nó nằm đó là chắn chỗ. Máy chủ quét mỗi giây.

**Cửa sổ chờ có mặt.** `noShowMs` khác 0 thì mỗi cặp tới lượt không vào trận ngay:
`tournament_matches.ready_deadline` được đặt và cả hai bên phải gọi
`POST /api/tournaments/:id/ready`. Đủ hai người xác nhận là trận thật mở ngay, không
đợi hết giờ. Hết giờ mà chỉ một người có mặt thì người đó **thắng do đối thủ vắng
mặt** và đi tiếp mà không cần đánh; cả hai vắng thì hạt giống cao hơn đi tiếp. Nhờ
vậy nhánh không bao giờ đứng chờ một người đã bỏ cuộc.

Trong view, mỗi ô `bracket` có thêm `readyDeadline` và `ready: [p1, p2]`, còn
`tournament.call` là lời gọi dành riêng cho người đang xem —
`{round, slot, deadline, opponentId, iAmReady, rivalReady}` hoặc `null`. Khi trận
thật mở, `match.start` gửi kèm `tournamentId` để client nhảy vào thẳng dù đang ở màn
nào.

Ngoài view của một giải cụ thể, client còn có hai đường để không bao giờ lỡ lời gọi:
`GET /api/tournaments/pending` trả về lời gọi đang treo trên **mọi giải**
(`{tournamentId, name, gameType, deadline, opponentName, iAmReady, rivalReady}` hoặc
`null`) — hỏi một lần lúc mở app và mỗi lần nối lại socket; còn sự kiện
`tournament.call` đẩy trạng thái mới mỗi khi nó đổi (mở ra, một bên xác nhận, trận mở,
hoặc xử vắng mặt xong).

### Bang hội

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/guilds?q=` | Tìm bang theo tên hoặc thẻ |
| GET | `/api/guilds/leaderboard` | BXH bang theo điểm đóng góp |
| GET | `/api/guilds/me` | Bang của mình, kèm thành viên và đơn chờ |
| GET | `/api/guilds/:id` | Thông tin một bang |
| POST | `/api/guilds` | Lập bang — `{name, tag, emblem?, color?, joinPolicy?, minLevel?}`, trừ 500 coin |
| POST | `/api/guilds/:id/join` | Vào bang, hoặc gửi đơn nếu bang duyệt đơn |
| POST | `/api/guilds/leave` | Rời bang |
| PATCH | `/api/guilds/:id` | Sửa mô tả, huy hiệu, chính sách nhận người |
| POST | `/api/guilds/:id/requests/:userId` | Duyệt đơn — `{accept}` |
| POST | `/api/guilds/:id/kick/:userId` | Đuổi thành viên |
| POST | `/api/guilds/:id/role/:userId` | Đổi vai — `{role}`; `owner` là nhường ghế chủ |
| PUT | `/api/guilds/:id/notice` | Đặt thông báo ghim — `{notice}`, chỉ chủ và sĩ quan |
| GET | `/api/guilds/:id/logs?limit=` | Nhật ký bang |
| POST | `/api/guilds/checkin` | Điểm danh bang, mỗi ngày một lần |
| POST | `/api/guilds/quests/:questId/claim` | Nhận phần của mình khi bang xong nhiệm vụ |
| GET | `/api/guilds/:id/tournaments` | Giải của bang (chỉ thành viên xem được) |
| POST | `/api/guilds/:id/tournaments` | Chủ bang mở giải — `{name?, gameType, size, entryCoin?, basePrize?, startAt?, noShowMinutes?}` |

`GET /api/guilds/me` nay trả thêm `quests` (nhiệm vụ bang tuần này), `logs`,
`checkin` và `tournaments` (giải của bang). Nhiệm vụ bang có tiến độ **chung của cả bang** theo tuần ISO; xong thì
mỗi thành viên tự vào nhận phần riêng, một lần một người một tuần.

**Giải đấu của bang.** Chỉ chủ bang mở được, và mỗi bang chỉ một giải chưa kết thúc
tại một thời điểm — mở chồng nhau thì một người bị gọi vào hai trận cùng lúc. Giải
bang không hiện ở `GET /api/tournaments`, và người ngoài bang biết id cũng không
đăng ký được. Tiền treo giải trừ thẳng vào ví người mở (huỷ giải thì hoàn đủ), lệ
phí vẫn thu của người đăng ký như giải chung. Khai mạc, huỷ, đăng ký và rút tên
đều đi qua các route `/api/tournaments/:id/...` ở trên.

Chat bang dùng chung `chat.send` / `chat.history` với `channelId = "guild:<id>"`.
Cả hai chỉ nhận `channelId` mà người gọi là thành viên của kênh.

### Ảnh trong chat

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/social/upload` | `{data}` là data URL ảnh; trả `{url, bytes}` |
| GET | `/api/social/upload/limit` | Trần dung lượng ảnh |
| GET | `/uploads/<file>` | Ảnh đã tải lên, cache 7 ngày |

Gửi ảnh là hai bước: tải lên lấy `url`, rồi `chat.send` với `kind: 'image'` và
`body` đúng bằng `url` đó. Server chỉ nhận `body` khớp `^/uploads/[a-z0-9]{8,32}\.(png|jpg|webp|gif)$`
— cho phép URL tuỳ ý là mở đường nhét link ngoài vào chat. Trần 2MB sau khi giải
mã, kiểm cả chữ ký file chứ không tin mime client khai, và hạn mức 10 ảnh/phút
mỗi người.

### Xem lại trận

`GET /api/matches/:id/replay` trả về:

```jsonc
{
  "replay": {
    "matchId": "...", "gameType": "caro", "mode": "ranked",
    "startedAt": 0, "endedAt": 0, "durationMs": 41200,
    "players": [{ "id": "...", "seat": 0, "name": "...", "avatarSeed": "...", "avatarStyle": "..." }],
    "rows": [{ "userId": "...", "result": "win", "score": 5, "place": 1, "ratingDelta": 12, "xpGain": 90, "coinGain": 60 }],
    // Mỗi khung là một ảnh chụp state của server, `at` tính từ lúc vào trận.
    "frames": [{ "at": 0, "version": 1, "view": { }, "deadline": null }]
  }
}
```

`view` trong mỗi khung được lọc theo **chính người gọi API**: xem lại trận của
mình thì thấy thông tin của mình, xem trận người khác thì vẫn bị giấu như lúc
trận đang diễn ra. Chỉ trận đã kết thúc mới có bản xem lại (trận đang chạy trả
`404 REPLAY_NOT_FOUND` — dùng khán đài). Khung được giữ 14 ngày.

### Khán đài

`spectate.join` chỉ nhận khi trận đang chạy, người xem **không** ở trong trận,
và có quan hệ với ít nhất một người chơi: bạn bè, cùng bang, hoặc là admin. Đã
chặn nhau thì không vào được. Khán giả nhận `view(state, null)` — cùng một bản
đã lọc sạch thông tin ẩn cho mọi khán giả — và không nhận các sự kiện gửi riêng
cho một người chơi. Một lúc chỉ xem được một trận.

### Mã lỗi thường gặp

`UNAUTHORIZED` · `NOT_A_PLAYER` · `NOT_YOUR_TURN` · `CELL_TAKEN` · `ROOM_FULL` ·
`ROOM_NOT_FOUND` · `WRONG_PASSWORD` · `NOT_ENOUGH_PLAYERS` · `PLAYERS_NOT_READY` ·
`RATE_LIMITED` · `MUTED` · `BLOCKED` · `INSUFFICIENT_FUNDS` · `ALREADY_OWNED`

Client dịch sang tiếng Việt trong `apps/mobile/src/lib/api.ts` (`ERROR_TEXT`).
