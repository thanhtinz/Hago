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
| `match.start` | `{matchId, gameType, mode, roomId}` |
| `game.state` | `{matchId, gameType, version, view, finished, deadline, spectators, spectating?}` |
| `game.event` | `{matchId, version, events[]}` — hiệu ứng: win, kick, bump, score, rent… |
| `match.result` | `{matchId, gameType, mode, rows[], spectating?}` với xpGain, coinGain, ratingDelta |
| `chat.message` | `ChatMessage` |
| `notification` | `NotificationRow` |
| `presence` | `{user, online}` — chỉ gửi cho bạn bè |

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
| GET | `/api/tournaments` | Giải đang mở, đang chạy và vừa kết thúc |
| GET | `/api/tournaments/:id` | Một giải kèm danh sách người và nhánh đấu |
| POST | `/api/tournaments` | Tạo giải (admin) — `{name, gameType, size, entryCoin?, basePrize?}` |
| POST | `/api/tournaments/:id/join` | Đăng ký, trừ lệ phí; đủ suất là tự khai mạc |
| POST | `/api/tournaments/:id/leave` | Rút tên trước khai mạc, hoàn lệ phí |

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

Chat bang dùng chung `chat.send` / `chat.history` với `channelId = "guild:<id>"`.
Cả hai chỉ nhận `channelId` mà người gọi là thành viên của kênh.

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
