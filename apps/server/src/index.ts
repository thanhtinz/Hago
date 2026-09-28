import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { registry } from '@co/core';
import './catalog.js';
import { PORT, type ClientMsg } from './protocol.js';
import { Rooms } from './rooms.js';

/**
 * Tầng truyền tải: WebSocket mỏng bọc quanh `Rooms`.
 *
 * Ở đây **không có luật chơi nào cả**. Toàn bộ việc của file này là đọc một
 * thông điệp JSON, gọi đúng hàm của `Rooms`, và đẩy thông điệp trả về đúng
 * socket. Nhờ vậy đổi sang một tầng truyền tải khác sau này không đụng gì
 * tới phòng, đồng hồ hay ván đấu.
 */

const rooms = new Rooms();
let nextId = 1;

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, games: registry.catalog().map((g) => g.id), ...rooms.stats() }));
    return;
  }
  res.writeHead(404);
  res.end();
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
    // `hello` mang theo id cũ thì nối lại phiên; không có thì mở phiên mới.
    if (msg.t === 'hello') {
      const want = (msg as { id?: string }).id;
      if (want && rooms.reconnect(want, send)) {
        id = want;
        return;
      }
      id = `p${nextId++}`;
      rooms.connect(id, msg.name || 'Khách', send);
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
