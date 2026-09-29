import { registry } from '@co/core';
import './catalog.js';
import { PORT } from '@co/protocol';
import { buildServer } from './serve.js';

/**
 * Điểm vào của máy chủ. Mỏng cố ý.
 *
 * Toàn bộ việc dựng nằm ở `serve.ts` để **test được cả đường dây thật**.
 * Khi mọi thứ còn ở đây thì nhập file là mở cổng và chạy mãi, nên tầng
 * truyền tải chưa từng có một bài kiểm nào — đúng cái tầng có lỗ hổng giết
 * được cả tiến trình bằng một gói tin.
 */

/**
 * Mạng lưới cuối cùng.
 *
 * Mọi ván đang chạy chỉ sống trong bộ nhớ của `Rooms`, nên một ngoại lệ
 * không ai bắt là **mất sạch ván của tất cả mọi người**. Ghi lại rồi chạy
 * tiếp đúng hơn là chết: dữ liệu lâu dài trong SQLite đã ghi xong rồi, còn
 * ván đang chạy thì chỉ cứu được bằng cách đừng chết.
 */
process.on('uncaughtException', (e) => console.error('Ngoại lệ không ai bắt:', e));
process.on('unhandledRejection', (e) => console.error('Promise bị bỏ rơi:', e));

const server = buildServer();

await server.listen(PORT);
console.log(`Máy chủ cờ nghe ở cổng ${PORT}, bộ môn: ${registry.catalog().map((g) => g.id).join(', ')}`);

/**
 * Tắt máy tử tế.
 *
 * Không nghe tín hiệu thì mỗi lần triển khai là cắt ngang mọi socket đang
 * mở giữa chừng — người chơi thấy "mất kết nối" đúng lúc máy chủ chưa kịp
 * ghi kết quả ván. Đóng cổng trước, để các ván đang chạy kết thúc đường của
 * chúng, rồi mới thoát.
 */
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`Nhận ${sig}, đang đóng máy chủ…`);
    void server.close().then(() => process.exit(0));
    // Có socket cứng đầu thì vẫn phải đi, nhưng cho nó năm giây.
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
