#!/bin/sh
# Bật máy chủ cờ và trang web cùng lúc, và tắt cả hai khi bấm Ctrl+C.
#
# Không có tệp này thì `npm run serve` mở trang web mà không có máy chủ, và
# thứ đầu tiên nhìn thấy đã là một màn đăng nhập hỏng — màn đó gọi
# /api/auth/config ngay khi mở.
#
# `ADMIN_TOKEN` phải có mặt: đường quản trị tắt hẳn khi chưa đặt biến đó,
# nên thiếu nó thì hàng đợi báo cáo trả 401 và hai bài kiểm báo sai thành
# "báo cáo không vào hàng đợi".
set -e
ADMIN_TOKEN=${ADMIN_TOKEN:-bimat-quan-tri} node apps/server/dist/index.js &
MAY_CHU=$!
npx serve -l 8080 -s apps/mobile/dist &
WEB=$!
# Bẫy tín hiệu để không bỏ lại một tiến trình giữ cổng 8787 sau khi thoát.
trap 'kill $MAY_CHU $WEB 2>/dev/null; exit 0' INT TERM
echo "Máy chủ cờ: http://localhost:8787/health"
echo "App:        http://localhost:8080"
wait
