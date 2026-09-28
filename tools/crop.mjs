/**
 * Cắt một góc ảnh chụp màn hình để soi chi tiết.
 *
 * Ảnh điện thoại thu nhỏ lại vừa màn thì nhiều lỗi vẽ biến mất: nét đứt, quân
 * cờ bị xén, hai đường kẻ chồng nhau. Phóng to đúng vùng nghi ngờ rồi mới kết
 * luận là đẹp hay xấu.
 *
 *   node tools/crop.mjs docs/screenshots/01-sanh.png /tmp/x.png 30 450 390 200
 *   (toạ độ tính bằng điểm ảnh thật của file, tức gấp đôi điểm ảnh logic)
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [src, out, x, y, w, h] = process.argv.slice(2);
if (!src || !out || !h) {
  console.error('dùng: node tools/crop.mjs <ảnh vào> <ảnh ra> <x> <y> <rộng> <cao>');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: CHROME });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.setContent(
  `<body style="margin:0"><canvas id=c></canvas><script>
   const i = new Image();
   i.onload = () => { const c = document.getElementById('c'); c.width = ${w}; c.height = ${h};
     c.getContext('2d').drawImage(i, ${x}, ${y}, ${w}, ${h}, 0, 0, ${w}, ${h}); document.title = 'ok'; };
   i.src = 'data:image/png;base64,${readFileSync(src).toString('base64')}';
   </script></body>`,
);
await page.waitForFunction("document.title === 'ok'");
await page.locator('#c').screenshot({ path: out });
await browser.close();
console.log('→', out);
