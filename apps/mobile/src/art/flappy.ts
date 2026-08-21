// Tệp sinh tự động bởi scripts/make-flappy-art.py — đừng sửa tay.
// Pixel art của dự án, vẽ theo phong cách thể loại (xem chú thích đầu script).

/** Ba nhịp vỗ cánh; client đảo qua lại theo vận tốc dọc của chim. */
export const FLAPPY_BIRD = {
  up: require('../../assets/flappy/bird-up.png'),
  mid: require('../../assets/flappy/bird-mid.png'),
  down: require('../../assets/flappy/bird-down.png'),
};

/** Tỉ lệ khung của sprite chim (rộng / cao), để đặt kích thước không méo. */
export const FLAPPY_BIRD_RATIO = 1.3333;
