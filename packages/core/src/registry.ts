import type { AnyEngine, GameId, GameSpec } from './types.js';

/**
 * Sổ đăng ký engine.
 *
 * Lõi không biết tên game nào (ràng buộc R3): mỗi package game tự gọi
 * `register()` lúc khởi động. Thêm game thứ 10 là một thư mục mới cộng một
 * dòng, không phải một lần sửa file lõi rồi chạy theo mọi `switch` exhaustive
 * trong matchmaker, enum DB và bot dispatcher.
 *
 * Giữ engine theo **version**: hàng `matches` ghi version nào thì phát lại
 * bằng đúng bản đó. Không có chuyện này thì ngày đầu tiên sửa luật lặp cờ
 * tướng là ngày mọi replay cũ hỏng.
 */
export class Registry {
  private readonly byKey = new Map<string, AnyEngine>();
  private readonly latest = new Map<GameId, number>();

  register(engine: AnyEngine): this {
    const key = `${engine.spec.id}@${engine.version}`;
    if (this.byKey.has(key)) throw new Error(`Đăng ký trùng: ${key}`);
    this.byKey.set(key, engine);
    const cur = this.latest.get(engine.spec.id);
    if (cur === undefined || engine.version > cur) this.latest.set(engine.spec.id, engine.version);
    return this;
  }

  /** Bản mới nhất — dùng khi mở trận mới. */
  get(id: GameId): AnyEngine {
    const v = this.latest.get(id);
    if (v === undefined) throw new Error(`Chưa đăng ký game: ${id}`);
    return this.byKey.get(`${id}@${v}`)!;
  }

  /** Bản theo version — dùng khi phát lại một trận cũ. */
  at(id: GameId, version: number): AnyEngine {
    const e = this.byKey.get(`${id}@${version}`);
    if (!e) throw new Error(`Không còn engine ${id}@${version}; không phát lại được trận cũ`);
    return e;
  }

  has(id: GameId): boolean {
    return this.latest.has(id);
  }

  /** Danh mục cho sảnh. Giao diện render từ đây nên thêm game không phải sửa UI. */
  catalog(): GameSpec[] {
    return [...this.latest.keys()].map((id) => this.get(id).spec);
  }
}

export const registry = new Registry();
