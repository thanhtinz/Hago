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

### Economy — `/api/economy`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/shop?type=` | Danh sách vật phẩm + cờ `owned` |
| GET | `/inventory` | Túi đồ |
| POST | `/shop/:itemId/buy` | `{currency: 'coin'\|'diamond'}` |
| POST | `/inventory/:itemId/equip` | `{equip: boolean}` |
| GET | `/transactions` | Lịch sử giao dịch của mình |
| GET | `/packs` | Gói nạp Diamond |
| POST | `/payment/checkout` | `{packId}` — mô phỏng nạp (production cần verify receipt) |

### Progression — `/api`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/home` | Payload tổng hợp cho màn hình chính |
| GET | `/games` | Catalog 7 game |
| GET | `/rooms?gameType=` | Phòng công khai đang mở |
| GET | `/quests` · POST `/quests/:id/claim` | Nhiệm vụ và nhận thưởng |
| GET | `/achievements` | Thành tựu |
| GET | `/notifications` · POST `/notifications/read` | Thông báo |
| GET | `/events` | Sự kiện đang diễn ra |
| POST | `/analytics` | `{name, props}` — gửi event tracking |

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
| `game.state` | `{matchId, gameType, version, view, finished, deadline}` |
| `game.event` | `{matchId, version, events[]}` — hiệu ứng: win, kick, bump, score, rent… |
| `match.result` | `{matchId, gameType, mode, rows[]}` với xpGain, coinGain, ratingDelta |
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

### Giải đấu

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/tournaments` | Giải đang mở, đang chạy và vừa kết thúc |
| GET | `/api/tournaments/:id` | Một giải kèm danh sách người và nhánh đấu |
| POST | `/api/tournaments` | Tạo giải (admin) — `{name, gameType, size, entryCoin?, basePrize?}` |
| POST | `/api/tournaments/:id/join` | Đăng ký, trừ lệ phí; đủ suất là tự khai mạc |
| POST | `/api/tournaments/:id/leave` | Rút tên trước khai mạc, hoàn lệ phí |

### Battle Pass

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/season` | Mùa hiện tại: tiến độ, 30 mốc thưởng, mốc đã nhận |
| POST | `/api/season/premium` | Mở nhánh cao cấp, trừ 250 kim cương |
| POST | `/api/season/claim` | Nhận một mốc — `{tier, track}` với `track` là `free \| premium` |
| POST | `/api/season/claim-all` | Nhận hết mốc đã mở mà chưa lấy |

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

### Mã lỗi thường gặp

`UNAUTHORIZED` · `NOT_A_PLAYER` · `NOT_YOUR_TURN` · `CELL_TAKEN` · `ROOM_FULL` ·
`ROOM_NOT_FOUND` · `WRONG_PASSWORD` · `NOT_ENOUGH_PLAYERS` · `PLAYERS_NOT_READY` ·
`RATE_LIMITED` · `MUTED` · `BLOCKED` · `INSUFFICIENT_FUNDS` · `ALREADY_OWNED`

Client dịch sang tiếng Việt trong `apps/mobile/src/lib/api.ts` (`ERROR_TEXT`).
