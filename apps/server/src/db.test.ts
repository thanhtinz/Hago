import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Accounts } from './accounts.js';
import { openDb } from './db.js';

/**
 * Di trú phải kiểm trên **tệp thật**, không phải `:memory:`.
 *
 * `CREATE TABLE IF NOT EXISTS` không bao giờ đụng tới một kho đã tồn tại,
 * nên một cột mới chỉ vào được bằng `ALTER`. Kho trong bộ nhớ luôn mới tinh
 * nên nó nuốt trôi mọi câu `ALTER` và mọi bài test đều xanh — trong khi máy
 * chủ thật báo "no such column" ở đúng câu truy vấn mới. Cả nhóm bài dưới
 * đây mở một tệp thật, đóng, rồi mở lại, đúng như một lần lên bản.
 */

function tmpDb(): { file: string; done: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), 'co-db-'));
  return { file: path.join(dir, 'thu.db'), done: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Một kho **đời cũ**: đúng hình dạng trước khi có cột `ranked`. */
function khoCu(file: string): void {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, google_id TEXT UNIQUE,
                        pass_hash TEXT, avatar TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE stats (user_id TEXT NOT NULL, game_id TEXT NOT NULL, win INTEGER NOT NULL DEFAULT 0,
                        draw INTEGER NOT NULL DEFAULT 0, loss INTEGER NOT NULL DEFAULT 0,
                        rating INTEGER NOT NULL DEFAULT 1200, best INTEGER NOT NULL DEFAULT 1200,
                        PRIMARY KEY (user_id, game_id));
    CREATE TABLE matches (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT NOT NULL, code TEXT NOT NULL,
                          a_id TEXT, b_id TEXT, a_name TEXT NOT NULL, b_name TEXT NOT NULL, winner INTEGER,
                          reason TEXT NOT NULL, rated INTEGER NOT NULL, delta_a INTEGER NOT NULL DEFAULT 0,
                          delta_b INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
  `);
  db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run('u1', 'An', 1);
  db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run('u2', 'Bình', 1);
  db.prepare('INSERT INTO stats (user_id, game_id, win, loss, rating) VALUES (?, ?, ?, ?, ?)').run('u1', 'co-caro', 4, 3, 1260);
  db.prepare('INSERT INTO stats (user_id, game_id, win, loss, rating) VALUES (?, ?, ?, ?, ?)').run('u2', 'co-caro', 3, 4, 1140);
  // Bốn ván tính điểm và ba ván phòng riêng, trộn lẫn đúng như đời thật.
  for (const rated of [1, 1, 1, 1, 0, 0, 0]) {
    db.prepare(
      `INSERT INTO matches (game_id, code, a_id, b_id, a_name, b_name, winner, reason, rated, created_at)
       VALUES ('co-caro', 'AAAAA', 'u1', 'u2', 'An', 'Bình', 0, 'thắng', ?, 1)`,
    ).run(rated);
  }
  db.close();
}

test('mở một kho đời cũ: cột mới được thêm và dữ liệu cũ được đổ lại', () => {
  const { file, done } = tmpDb();
  try {
    khoCu(file);
    const db = openDb(file);
    const rows = db.prepare('SELECT user_id, ranked FROM stats ORDER BY user_id').all() as unknown as {
      user_id: string;
      ranked: number;
    }[];
    // Bốn ván `rated = 1`, và cả hai người đều có mặt trong cả bốn.
    // `node:sqlite` trả về đối tượng không có nguyên mẫu nên phải nắn lại
    // trước khi so sâu, chứ không `deepEqual` thẳng.
    assert.deepEqual(
      rows.map((r) => ({ user_id: r.user_id, ranked: r.ranked })),
      [
        { user_id: 'u1', ranked: 4 },
        { user_id: 'u2', ranked: 4 },
      ],
    );
    const chot = db.prepare("SELECT value FROM meta WHERE key = 'backfill-ranked'").get();
    assert.ok(chot, 'phải chốt lại để lần mở sau không chạy lại');
    db.close();
  } finally {
    done();
  }
});

test('mở lại lần nữa thì không đổ lại, và ván mới vẫn ghi được', async () => {
  // Đây là bài bắt đúng cái lỗi nguy hiểm nhất của di trú: nếu đổ lại dữ
  // liệu nằm chung `try` với `ALTER`, thì lần mở thứ hai `ALTER` ném, `catch`
  // nuốt lỗi, không ai gọi `ROLLBACK`, và kết nối kẹt trong transaction
  // suốt đời tiến trình — `recordMatch` nhận "cannot start a transaction
  // within a transaction" và **mọi ván kết thúc đều không ghi được**.
  const { file, done } = tmpDb();
  try {
    khoCu(file);
    openDb(file).close();

    const db = openDb(file);
    const acc = new Accounts(db);
    const truoc = (db.prepare("SELECT ranked FROM stats WHERE user_id = 'u1'").get() as unknown as { ranked: number }).ranked;
    assert.equal(truoc, 4, 'lần mở thứ hai không được cộng dồn thêm lần nữa');

    const r = acc.recordMatch({
      gameId: 'co-caro',
      code: 'BBBBB',
      seats: ['u1', 'u2'],
      names: ['An', 'Bình'],
      winner: 0,
      reason: 'thắng',
      rated: true,
    });
    assert.notEqual(r.delta[0], 0, 'ván xếp hạng phải đổi điểm');
    const sau = (db.prepare("SELECT ranked FROM stats WHERE user_id = 'u1'").get() as unknown as { ranked: number }).ranked;
    assert.equal(sau, 5, 'ván vừa đánh phải cộng vào cột ván xếp hạng');
    db.close();
  } finally {
    done();
  }
});

test('ván phòng riêng không đưa ai lên bảng, ván ghép cặp thì có', () => {
  const acc = new Accounts(openDb(':memory:'));
  const db = (acc as unknown as { db: DatabaseSync }).db;
  for (const [id, ten] of [
    ['u1', 'An'],
    ['u2', 'Bình'],
  ] as const) {
    db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(id, ten, 1);
  }
  const danh = (rated: boolean) =>
    acc.recordMatch({
      gameId: 'co-caro',
      code: 'AAAAA',
      seats: ['u1', 'u2'],
      names: ['An', 'Bình'],
      winner: 0,
      reason: 'thắng',
      rated,
    });

  for (let i = 0; i < 6; i++) danh(false);
  assert.equal(acc.leaderboard('co-caro').length, 0, 'sáu ván phòng riêng không mua được một chỗ trên bảng');
  assert.equal(acc.rankOf('u1', 'co-caro'), null);

  for (let i = 0; i < 5; i++) danh(true);
  assert.equal(acc.leaderboard('co-caro').length, 2, 'đủ năm ván xếp hạng thì có tên');
  const hang = acc.rankOf('u1', 'co-caro');
  assert.equal(hang?.rank, 1);
  assert.equal(hang?.ranked, 5);
  assert.equal(hang?.played, 11, 'số ván đã đánh vẫn đếm cả ván phòng riêng');
});
