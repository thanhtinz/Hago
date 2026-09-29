import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { registry } from '@co/core';
import './catalog.js';
import { PORT, type ClientMsg } from '@co/protocol';
import { Accounts } from './accounts.js';
import { openDb } from './db.js';
import { handleApi } from './http.js';
import { Avatars } from './uploads.js';
import { Rooms } from './rooms.js';

/**
 * Tầng truyền tải: WebSocket mỏng bọc quanh `Rooms`.
 *
 * Ở đây **không có luật chơi nào cả**. Toàn bộ việc của file này là đọc một
 * thông điệp JSON, gọi đúng hàm của `Rooms`, và đẩy thông điệp trả về đúng
 * socket. Nhờ vậy đổi sang một tầng truyền tải khác sau này không đụng gì
 * tới phòng, đồng hồ hay ván đấu.
 */

const db = openDb();
const accounts = new Accounts(db);
const avatars = new Avatars();

/**
 * Chỉ **ván ghép cặp** mới vào sổ thành tích.
 *
 * Phòng riêng mở bằng mã là phòng mời bạn: hai người quen nhau muốn bơm điểm
 * cho nhau chỉ cần mở phòng rồi thay nhau xin thua vài chục lần. Đây cũng
 * đúng là lý do `rated` có mặt từ đầu trong `Rooms`.
 */
const rooms = new Rooms({
  onFinish: ({ gameId, code, rated, seats, names, outcome }) => {
    accounts.recordMatch({
      gameId,
      code,
      seats: [seats[0] ?? null, seats[1] ?? null],
      names: [names[0] ?? '—', names[1] ?? '—'],
      winner: outcome.winner,
      reason: outcome.reason,
      // Lịch sử ghi **mọi** ván, kể cả phòng riêng; chỉ điểm Elo là không
      // tính. Giấu cả ván khỏi lịch sử thì người chơi tưởng app quên mất ván
      // họ vừa đánh với bạn.
      rated,
    });
  },
});

const http = createServer((req, res) => {
  void handleApi(req, res, { accounts, avatars, onRename: (u) => rooms.rename(u.id, u.name) }).then((done) => {
    if (done) return;
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify({ ok: true, games: registry.catalog().map((g) => g.id), ...rooms.stats() }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws: WebSocket) => {
  let id: string | null = null;
  const send = (m: unknown) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
  };

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw)) as ClientMsg;
    } catch {
      return send({ t: 'error', code: 'BAD_JSON', msg: 'Không đọc được thông điệp' });
    }
    /**
     * `hello` mang theo **token phiên**, và token quyết định mình là ai.
     *
     * Trước đây id do máy chủ phát rồi client nhớ lấy, nên ai gửi lại đúng
     * chuỗi đó là thành người đó. Giờ danh tính đến từ phiên đăng nhập: không
     * có token hợp lệ thì không vào được phòng nào.
     *
     * Vào lại cũng là `hello` với cùng token — không cần trường `id` nữa, vì
     * `userId` **chính là** khoá ghế trong phòng.
     */
    if (msg.t === 'hello') {
      const user = msg.token ? accounts.bearer(msg.token) : null;
      if (!user) return send({ t: 'error', code: 'NO_AUTH', msg: 'Phải đăng nhập trước' });
      id = user.id;
      if (!rooms.reconnect(user.id, send)) rooms.connect(user.id, user.name, send);
      return;
    }
    if (!id) return send({ t: 'error', code: 'NO_HELLO', msg: 'Phải gửi hello trước' });

    switch (msg.t) {
      case 'create':
        return rooms.create(id, msg.gameId, msg.config);
      case 'join':
        return rooms.join(id, msg.code);
      case 'quick':
        return rooms.quick(id, msg.gameId);
      case 'leave':
        return rooms.leave(id);
      case 'act':
        return rooms.act(id, msg.nonce, msg.action);
      default:
        return send({ t: 'error', code: 'UNKNOWN', msg: 'Không hiểu thông điệp' });
    }
  });

  ws.on('close', () => {
    if (id) rooms.disconnect(id);
  });
});

// Đồng hồ chạy ở máy chủ, một nhịp 250ms. Không để client tự báo hết giờ:
// ai cũng tự tuyên bố đối thủ hết giờ được thì đồng hồ vô nghĩa.
setInterval(() => rooms.tick(), 250);

http.listen(PORT, () => {
  console.log(`Máy chủ cờ nghe ở cổng ${PORT}, bộ môn: ${registry.catalog().map((g) => g.id).join(', ')}`);
});
