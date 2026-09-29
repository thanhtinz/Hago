import { createServer, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { registry } from '@co/core';
import type { ClientMsg } from '@co/protocol';
import { Accounts } from './accounts.js';
import { Chat } from './chat.js';
import { openDb } from './db.js';
import { handleApi } from './http.js';
import { Limiter, MAX_WINDOW, RULES } from './limit.js';
import { parseClientMsg } from './parse.js';
import { Rooms } from './rooms.js';
import { Avatars } from './uploads.js';

/**
 * Tầng truyền tải: WebSocket mỏng bọc quanh `Rooms`.
 *
 * Ở đây **không có luật chơi nào cả**. Toàn bộ việc của file này là đọc một
 * thông điệp JSON, kiểm dạng, gọi đúng hàm của `Rooms`, và đẩy thông điệp
 * trả về đúng socket.
 *
 * Tách khỏi `index.ts` thành một hàm dựng để **test được cả đường dây thật**:
 * mở cổng, nối socket thật, gửi gói tin rác, và xem máy chủ có sống sót
 * không. Còn nằm trong `index.ts` thì nhập file là mở cổng 8787 và chạy mãi,
 * nên tầng này chưa từng có một bài kiểm nào — đúng tầng có lỗ hổng giết
 * được cả tiến trình.
 */

export interface ServeOptions {
  /** Tệp cơ sở dữ liệu. `:memory:` cho test. */
  dbFile?: string;
  /** Thư mục ảnh đại diện. */
  avatarDir?: string;
  /** Nhịp đồng hồ ván đấu, mili giây. */
  tickMs?: number;
  /** Nhịp tim và nhịp dọn dẹp, mili giây. */
  heartbeatMs?: number;
  /**
   * Tắt giới hạn tần suất.
   *
   * Chỉ dùng cho **bài kiểm giao diện**: sáu harness chạy nối tiếp trong
   * một tiến trình máy chủ, tất cả từ `127.0.0.1`, mỗi bài đăng ký hai tài
   * khoản — vượt hạn mức đăng ký ngay từ bài thứ tư. Bản thân bộ giới hạn
   * đã có bài kiểm riêng ở `serve.test.ts`, nên tắt ở đây không bỏ sót gì.
   */
  noLimits?: boolean;
}

export interface Serving {
  http: Server;
  wss: WebSocketServer;
  rooms: Rooms;
  accounts: Accounts;
  chat: Chat;
  limiter: Limiter;
  /** Cổng đang nghe, sau khi `listen` xong. */
  port(): number;
  listen(port: number): Promise<number>;
  close(): Promise<void>;
}

/** Trần khung WebSocket. Xem ghi chú trong thân hàm. */
export const MAX_FRAME = 32 * 1024;

export function buildServer(opts: ServeOptions = {}): Serving {
  const db = opts.dbFile ? openDb(opts.dbFile) : openDb();
  const accounts = new Accounts(db);
  const avatars = new Avatars(opts.avatarDir);
  const chat = new Chat(db);
  const limiter = new Limiter();
  const gateOff = opts.noLimits ?? process.env.RATE_LIMIT === 'off';

  /**
   * Chỉ **ván ghép cặp** mới vào sổ thành tích.
   *
   * Phòng riêng mở bằng mã là phòng mời bạn: hai người quen nhau muốn bơm
   * điểm cho nhau chỉ cần mở phòng rồi thay nhau xin thua vài chục lần.
   */
  const rooms = new Rooms({
    // Chỉ bạn bè mới rủ nhau được. `Rooms` không đọc cơ sở dữ liệu nên câu
    // hỏi đó trả lời ở đây, nơi đã có sẵn lớp tài khoản.
    mayChallenge: (from, to) => accounts.areFriends(from, to) && !accounts.isBlockedEither(from, to),
    chat,
    isBlocked: (a, b) => accounts.isBlockedEither(a, b),
    pendingRequests: (id) => accounts.friends(id).filter((f) => f.incoming).length,
    onFinish: ({ gameId, code, rated, seats, names, outcome }) => {
      const { delta } = accounts.recordMatch({
        gameId,
        code,
        seats: [seats[0] ?? null, seats[1] ?? null],
        names: [names[0] ?? '—', names[1] ?? '—'],
        winner: outcome.winner,
        reason: outcome.reason,
        // Lịch sử ghi **mọi** ván, kể cả phòng riêng; chỉ điểm Elo là không
        // tính. Giấu cả ván khỏi lịch sử thì người chơi tưởng app quên mất
        // ván họ vừa đánh với bạn.
        rated,
      });
      /**
       * Báo kết quả vào hộp thông báo riêng của từng người.
       *
       * Đây là sự kiện **đầu tiên** trong app tự sinh ra thông báo hệ
       * thống. Trước đó kênh thông báo chỉ nhận được thứ quản trị viên gõ
       * tay qua `/api/admin/notice`, nên cái chuông đỏ ở sảnh thực tế
       * không bao giờ sáng vì một việc thật nào của người chơi.
       */
      if (!rated) return;
      // Tên tiếng Việt lấy từ chính engine (`spec.nameVi`), không chép lại
      // ở đây — chép là sớm muộn cũng lệch với tên hiện trong app.
      const name = registry.get(gameId)?.spec.nameVi ?? gameId;
      for (const [seat, id] of seats.entries()) {
        if (!id) continue;
        const d = delta[seat] ?? 0;
        const them = names[seat === 0 ? 1 : 0] ?? 'đối thủ';
        const how = outcome.winner === null ? 'Hoà' : outcome.winner === seat ? 'Thắng' : 'Thua';
        const sign = d > 0 ? `+${d}` : String(d);
        rooms.systemMessage(`${how} ${them} ở ${name}. Điểm ${sign}.`, id);
      }
    },
  });

  const http = createServer((req, res) => {
    void handleApi(req, res, {
      accounts,
      avatars,
      chat,
      notify: (body, to) => rooms.systemMessage(body, to),
      onRename: (u) => rooms.rename(u.id, u.name),
      onFriendChange: (...ids) => rooms.pushAlerts(...ids),
      ...(gateOff ? {} : { limiter }),
    }).then((done) => {
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

  /**
   * `maxPayload` là bắt buộc.
   *
   * Mặc định của `ws` là 100 MiB một khung, và khung được gom **đủ vào bộ
   * nhớ trước** khi handler chạy — rồi handler còn `String(raw)` và
   * `JSON.parse` trên cả khối đó, nhân hai nhân ba. Kiểm token nằm sau chỗ
   * đó, nên một socket **chưa đăng nhập** cũng bơm được. Đường HTTP đã có
   * trần 64 KB từ đầu; đường này thì không có gì.
   *
   * 32 KB rộng hơn mọi thông điệp thật cả trăm lần: nước cờ dài nhất là vài
   * chục byte, tin nhắn bị `Chat.clean` cắt từ lâu trước mức này.
   */
  const wss = new WebSocketServer({ server: http, maxPayload: MAX_FRAME });

  /**
   * Nhịp tim.
   *
   * TCP không báo khi dây đứt giữa đường — một điện thoại vào thang máy để
   * lại một socket "đang mở" mà không bao giờ có byte nào nữa. Không dò thì
   * ghế đó vẫn tính là đang nối và bộ nhớ vẫn giữ.
   */
  const alive = new WeakSet<WebSocket>();
  const beat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
    limiter.sweep(MAX_WINDOW);
    rooms.sweep();
    accounts.sweepSessions();
  }, opts.heartbeatMs ?? 30_000);

  wss.on('connection', (ws: WebSocket, req) => {
    let id: string | null = null;
    alive.add(ws);
    ws.on('pong', () => alive.add(ws));
    // Trước khi đăng nhập thì đếm theo địa chỉ; sau đó theo tài khoản.
    const addr = req.socket.remoteAddress ?? 'khong-ro';
    const send = (m: unknown) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
    };

    ws.on('message', (raw) => {
      alive.add(ws);
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(raw));
      } catch {
        return send({ t: 'error', code: 'BAD_JSON', msg: 'Không đọc được thông điệp' });
      }
      /**
       * `ClientMsg` là kiểu TypeScript, và kiểu biến mất sau khi biên dịch.
       * Ép kiểu rồi đưa thẳng vào `Rooms` nghĩa là `{t:'join',code:5}` chạy
       * tới `code.toUpperCase()` và giết cả tiến trình — cùng với mọi ván
       * đang chạy của mọi người, vì chúng chỉ sống trong bộ nhớ.
       */
      const msg: ClientMsg | null = parseClientMsg(parsed);
      if (!msg) return send({ t: 'error', code: 'BAD_MSG', msg: 'Thông điệp không đúng dạng' });

      const who = id ? `u:${id}` : `ip:${addr}`;
      if (!gateOff) {
        if (limiter.take(`ws|${who}`, RULES.socket) > 0) {
          return send({ t: 'error', code: 'TOO_FAST', msg: 'Bạn thao tác hơi nhanh, chậm lại một chút' });
        }
        if (msg.t === 'chat-send' && limiter.take(`chat|${who}`, RULES.chat) > 0) {
          return send({ t: 'error', code: 'TOO_FAST', msg: 'Nhắn chậm lại một chút' });
        }
      }
      /**
       * `hello` mang theo **token phiên**, và token quyết định mình là ai.
       *
       * Vào lại cũng là `hello` với cùng token — `userId` **chính là** khoá
       * ghế trong phòng, nên rớt sóng vài giây không tính là bỏ trận.
       */
      if (msg.t === 'hello') {
        const user = msg.token ? accounts.bearer(msg.token) : null;
        if (!user) return send({ t: 'error', code: 'NO_AUTH', msg: 'Phải đăng nhập trước' });
        id = user.id;
        if (!rooms.reconnect(user.id, send)) rooms.connect(user.id, user.name, send);
        return;
      }
      if (!id) return send({ t: 'error', code: 'NO_HELLO', msg: 'Phải gửi hello trước' });

      // Kiểm dạng ở trên chặn gần hết, nhưng engine và cơ sở dữ liệu vẫn ném
      // được vì lý do khác. Một ngoại lệ ở đây từng đủ để giết cả máy chủ.
      try {
        switch (msg.t) {
          case 'create':
            return rooms.create(id, msg.gameId, msg.config);
          case 'join':
            return rooms.join(id, msg.code);
          case 'quick':
            return rooms.quick(id, msg.gameId);
          case 'leave':
            return rooms.leave(id);
          case 'rematch':
            return rooms.rematch(id, msg.want);
          case 'act':
            return rooms.act(id, msg.nonce, msg.action);
          case 'challenge':
            return rooms.challenge(id, msg.to, msg.gameId);
          case 'invite':
            return rooms.invite(id, msg.to);
          case 'challenge-answer':
            return rooms.answerChallenge(id, msg.id, msg.accept);
          case 'challenge-cancel':
            return rooms.cancelChallenge(id, msg.id);
          case 'watch':
            return rooms.watch(id, msg.ids);
          case 'chat-open':
            return rooms.openChat(id, msg.channel);
          case 'chat-send':
            return rooms.sendChat(id, msg.channel, msg.body);
          case 'chat-more':
            return rooms.moreChat(id, msg.channel, msg.before);
          case 'chat-read':
            return rooms.markRead(id, msg.channel, msg.lastId);
          default:
            return send({ t: 'error', code: 'UNKNOWN', msg: 'Không hiểu thông điệp' });
        }
      } catch (e) {
        console.error('Lỗi khi xử lý thông điệp:', msg.t, e);
        send({ t: 'error', code: 'SERVER', msg: 'Máy chủ gặp lỗi khi xử lý' });
      }
    });

    ws.on('close', () => {
      if (id) rooms.disconnect(id);
    });
    // `ws` phát `error` khi khung hình sai hoặc vượt `maxPayload`. Không
    // nghe thì nó nổi lên thành ngoại lệ không ai bắt.
    ws.on('error', () => ws.terminate());
  });

  // Đồng hồ chạy ở máy chủ, một nhịp 250ms. Không để client tự báo hết giờ:
  // ai cũng tự tuyên bố đối thủ hết giờ được thì đồng hồ vô nghĩa.
  const ticker = setInterval(() => rooms.tick(), opts.tickMs ?? 250);

  return {
    http,
    wss,
    rooms,
    accounts,
    chat,
    limiter,
    port: () => {
      const a = http.address();
      return typeof a === 'object' && a ? a.port : 0;
    },
    listen: (port) =>
      new Promise((ok) => {
        http.listen(port, () => {
          const a = http.address();
          ok(typeof a === 'object' && a ? a.port : port);
        });
      }),
    close: () =>
      new Promise((ok) => {
        clearInterval(beat);
        clearInterval(ticker);
        for (const c of wss.clients) c.terminate();
        wss.close(() => http.close(() => ok()));
      }),
  };
}
