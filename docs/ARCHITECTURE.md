# Kiến trúc kỹ thuật Hago

## 1. Tổng thể

Modular monolith cho MVP. Realtime gateway nằm cùng process với API để đơn giản hoá
vận hành ban đầu, nhưng được tách thành module riêng (`src/realtime/`) không phụ thuộc
tầng REST, nên có thể tách ra service độc lập khi cần scale mà không phải viết lại.

```
┌──────────────────────────────────────────────────────────────┐
│  Mobile Client (React Native / Expo — iOS, Android, Web)     │
│  · REST cho dữ liệu tĩnh   · WebSocket cho realtime          │
└───────────────┬──────────────────────────┬───────────────────┘
                │ HTTPS                    │ WSS
┌───────────────▼──────────────────────────▼───────────────────┐
│                    Hago Server (Node.js)                     │
│  ┌────────────────────┐      ┌───────────────────────────┐   │
│  │ Express REST API   │      │ Socket.IO Gateway         │   │
│  │ auth/users/social  │      │ room · matchmaking · game │   │
│  │ economy/quest/admin│      │ chat · presence · notify  │   │
│  └─────────┬──────────┘      └──────────┬────────────────┘   │
│            │                             │                    │
│  ┌─────────▼─────────────────────────────▼────────────────┐  │
│  │ Services: users · social · economy · quests · analytics│  │
│  └─────────┬──────────────────────────────────────────────┘  │
│            │                    ┌──────────────────────────┐ │
│  ┌─────────▼──────────┐         │ Match Runtime            │ │
│  │ SQLite (WAL mode)  │◄────────┤ + Game Engines (pure TS) │ │
│  └────────────────────┘         └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Ở production, thay SQLite bằng PostgreSQL + Redis (presence, queue, pub/sub giữa các
node gateway) là đủ để scale ngang; toàn bộ truy vấn đã đi qua tầng service nên chỉ
cần đổi driver.

## 2. Game engine

Engine là hàm thuần, không I/O, không `Date.now()` ngoài `turnStartedAt` do runtime cấp,
không tự sinh ngẫu nhiên — RNG do runtime truyền vào. Nhờ vậy:

- **Test được**: chạy hàng nghìn ván trong bộ nhớ để kiểm tra engine luôn kết thúc.
- **Replay được**: `seed + danh sách action` tái tạo chính xác một ván ranked.
- **Redact được**: `view(state, viewerId)` là nơi duy nhất quyết định người xem thấy gì.

```ts
// Vòng đời một action
client ──game.action{actionId, type, payload}──> gateway
   gateway kiểm tra rate limit
   → runtime kiểm tra actionId đã xử lý chưa (idempotency)
   → engine.apply(state, userId, type, payload, rng)
      ├─ {ok:false, error} → trả lỗi, state không đổi
      └─ {ok:true, state', events}
          → version++, ghi game_states + match_actions
          → broadcast engine.view(state', p.id) cho từng người
          → nếu engine.finished(state') → settle
```

### Vòng tick

`setInterval(CONFIG.tickMs = 200ms)` chạy 3 việc:

1. `MM.findMatches()` — ghép trận từ các hàng chờ.
2. `tickAll(now)` — với mỗi trận đang chạy:
   - `engine.tick()` cho game realtime (Sheep Battle, Ma Sói),
   - `engine.timeout()` khi vượt `engine.deadline()` (server tự đánh thay),
   - xử thua người mất kết nối quá `RECONNECT_GRACE_MS`.
3. Dọn cửa sổ rate limiter.

### Matchmaking

Key hàng chờ: `gameType:mode:region`. Với Ranked, cửa sổ rating quanh người chờ lâu nhất
bắt đầu ở ±150 và nới thêm 100 mỗi 5 giây, trần ±1500 — cân bằng giữa chất lượng ghép
và thời gian chờ (mục tiêu PRD: P95 < 5s).

Quick Match tạo một room ẩn rồi mới bắt đầu trận, nên toàn bộ luồng room/chat/reconnect
dùng chung với Custom Room, không có nhánh code riêng.

## 3. Dữ liệu

24 bảng theo mục 18 PRD. Điểm đáng chú ý:

| Bảng | Vai trò |
|---|---|
| `game_states` | Snapshot state + version + rng_state → khôi phục sau restart |
| `match_actions` | Nhật ký action theo version, `action_id` là PK → idempotency |
| `transactions` | Sổ cái bất biến, có `balance_after` để đối soát |
| `audit_log` | Mọi hành động admin, đặc biệt là thay đổi economy |
| `daily_counters` | Đếm XP/thắng theo ngày cho anti-abuse và first-win bonus |
| `analytics_events` | Event tracking theo Phụ lục A của PRD |

Thay đổi số dư **chỉ** đi qua `mutateCurrency()`:

```ts
db.transaction(() => {
  đọc số dư → kiểm tra không âm → cập nhật → ghi transaction
})
```

Settlement cuối trận (XP, Coin, Elo, thống kê, match_players) nằm trong một SQL
transaction duy nhất, nên không thể double reward kể cả khi trận kết thúc hai lần
do race (đã chặn thêm bằng cờ `match.finished`).

## 4. Progression

- **Elo**: `K = 32 / 24 / 16` theo mốc rating 2000 và 2500. Với game nhiều người,
  điểm thực tế tính theo thứ hạng: `1 - (place-1)/(n-1)`.
- **XP/Coin**: base + bonus theo thứ hạng + bonus thắng, ×1.25 XP cho Ranked,
  +100 cho first-win-of-day, ÷2 nếu trận ngắn hơn 30 giây, và chặn theo `DAILY_XP_CAP`.
- **Level**: `xpForLevel(n) = 60(n-1) + 12(n-1)²` — đường cong bậc hai, lên cấp đầu nhanh
  rồi chậm dần.

## 5. Client mobile

- **expo-router** file-based routing, `(tabs)` group cho 5 tab chính.
- **StoreProvider** giữ profile, socket, toast, unread badge; auth gate ở `_layout.tsx`.
- **emitAck()** bọc mọi lệnh socket bằng Promise + timeout 8s để UI không treo.
- Board mỗi game là component độc lập nhận `{view, mySeat, send, deadline}` —
  không biết gì về socket, dễ test và dễ thay thế.
- Mobile-first: trên web bọc trong khung rộng tối đa 480px, giữ đúng tỉ lệ điện thoại.

## 6. Bảo mật

| Mối đe doạ | Biện pháp |
|---|---|
| Client tự khai kết quả | Server authoritative, engine quyết định kết quả |
| Đọc trộm thông tin ẩn | `view()` redact theo viewer; state đầy đủ không rời server |
| Đoán xúc xắc / vai | RNG seeded phía server, seed chỉ lưu trong DB |
| Double-submit | `action_id` là khoá chính của `match_actions` |
| Spam chat | Rate limit 12 tin/10s + lọc từ ngữ + mute |
| Farm XP | Daily cap, phạt trận ngắn, first-win chỉ 1 lần/ngày |
| Lệch sổ tiền tệ | Mọi mutation trong SQL transaction + transaction log |
| Chiếm phiên | JWT gắn `session_id`, revoke được; ban thu hồi mọi phiên |

## 7. Hướng phát triển

1. **Hạ tầng**: PostgreSQL + Redis, tách gateway thành service riêng, sticky session
   theo `match_id`.
2. **Gameplay**: bracket tournament, spectator, replay viewer dựa trên `match_actions`.
3. **Live Ops**: battle pass, seasonal rank reset, A/B testing remote config.
4. **Chống gian lận**: phát hiện bất thường theo hành vi (win rate, thời gian ra quyết định),
   device fingerprint.
