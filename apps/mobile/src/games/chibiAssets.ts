/**
 * Registry ảnh 2D chibi dùng trên các màn chơi.
 * Không vẽ bằng View/emoji — chỉ render Image từ asset pack.
 */
import { ImageSourcePropType } from 'react-native';

export const Chibi = {
  shared: {
    dice: [
      null,
      require('../../assets/chibi/shared/dice_1.png'),
      require('../../assets/chibi/shared/dice_2.png'),
      require('../../assets/chibi/shared/dice_3.png'),
      require('../../assets/chibi/shared/dice_4.png'),
      require('../../assets/chibi/shared/dice_5.png'),
      require('../../assets/chibi/shared/dice_6.png'),
    ] as (ImageSourcePropType | null)[],
    arrowUp: require('../../assets/chibi/shared/arrow_up.png'),
    arrowDown: require('../../assets/chibi/shared/arrow_down.png'),
    arrowLeft: require('../../assets/chibi/shared/arrow_left.png'),
    arrowRight: require('../../assets/chibi/shared/arrow_right.png'),
    timer: require('../../assets/chibi/shared/timer.png'),
    liveDot: require('../../assets/chibi/shared/live_dot.png'),
    trophy: require('../../assets/chibi/shared/trophy.png'),
    draw: require('../../assets/chibi/shared/draw.png'),
    loss: require('../../assets/chibi/shared/loss.png'),
  },
  caro: {
    pieceO: require('../../assets/chibi/caro/piece_o.png'),
    pieceX: require('../../assets/chibi/caro/piece_x.png'),
    boardBg: require('../../assets/chibi/caro/board_bg.png'),
  },
  battleship: {
    ships: {
      2: require('../../assets/chibi/battleship/ship_2.png'),
      3: require('../../assets/chibi/battleship/ship_3.png'),
      4: require('../../assets/chibi/battleship/ship_4.png'),
      5: require('../../assets/chibi/battleship/ship_5.png'),
    } as Record<number, ImageSourcePropType>,
    water: require('../../assets/chibi/battleship/water.png'),
    hit: require('../../assets/chibi/battleship/hit.png'),
    miss: require('../../assets/chibi/battleship/miss.png'),
    sunk: require('../../assets/chibi/battleship/sunk.png'),
    anchor: require('../../assets/chibi/battleship/anchor.png'),
  },
  oanquan: {
    seed: require('../../assets/chibi/oanquan/seed.png'),
    quan: require('../../assets/chibi/oanquan/quan.png'),
    quanEmpty: require('../../assets/chibi/oanquan/quan_empty.png'),
    boardBg: require('../../assets/chibi/oanquan/board_bg.png'),
  },
  ludo: {
    horses: [
      require('../../assets/chibi/ludo/horse_orange.png'),
      require('../../assets/chibi/ludo/horse_blue.png'),
      require('../../assets/chibi/ludo/horse_mint.png'),
      require('../../assets/chibi/ludo/horse_sun.png'),
    ] as ImageSourcePropType[],
    flag: require('../../assets/chibi/ludo/flag.png'),
  },
  monopoly: {
    tokens: [
      require('../../assets/chibi/monopoly/token_hat.png'),
      require('../../assets/chibi/monopoly/token_car.png'),
      require('../../assets/chibi/monopoly/token_dog.png'),
      require('../../assets/chibi/monopoly/token_boot.png'),
    ] as ImageSourcePropType[],
    house: require('../../assets/chibi/monopoly/house.png'),
    bank: require('../../assets/chibi/monopoly/bank.png'),
    chance: require('../../assets/chibi/monopoly/chance.png'),
    tax: require('../../assets/chibi/monopoly/tax.png'),
    jail: require('../../assets/chibi/monopoly/jail.png'),
    park: require('../../assets/chibi/monopoly/park.png'),
    start: require('../../assets/chibi/monopoly/start.png'),
  },
  sheep: {
    sheep: require('../../assets/chibi/sheep/sheep.png'),
    sheepGold: require('../../assets/chibi/sheep/sheep_gold.png'),
    farmers: [
      require('../../assets/chibi/sheep/farmer_0.png'),
      require('../../assets/chibi/sheep/farmer_1.png'),
      require('../../assets/chibi/sheep/farmer_2.png'),
      require('../../assets/chibi/sheep/farmer_3.png'),
    ] as ImageSourcePropType[],
    pens: [
      require('../../assets/chibi/sheep/pen_0.png'),
      require('../../assets/chibi/sheep/pen_1.png'),
      require('../../assets/chibi/sheep/pen_2.png'),
      require('../../assets/chibi/sheep/pen_3.png'),
    ] as ImageSourcePropType[],
    arenaBg: require('../../assets/chibi/sheep/arena_bg.png'),
  },
  werewolf: {
    roles: {
      werewolf: require('../../assets/chibi/werewolf/role_werewolf.png'),
      seer: require('../../assets/chibi/werewolf/role_seer.png'),
      guard: require('../../assets/chibi/werewolf/role_guard.png'),
      witch: require('../../assets/chibi/werewolf/role_witch.png'),
      hunter: require('../../assets/chibi/werewolf/role_hunter.png'),
      villager: require('../../assets/chibi/werewolf/role_villager.png'),
    } as Record<string, ImageSourcePropType>,
    phases: {
      night: require('../../assets/chibi/werewolf/phase_night.png'),
      day: require('../../assets/chibi/werewolf/phase_day.png'),
      vote: require('../../assets/chibi/werewolf/phase_vote.png'),
      result: require('../../assets/chibi/werewolf/phase_result.png'),
    } as Record<string, ImageSourcePropType>,
    faceAlive: require('../../assets/chibi/werewolf/face_alive.png'),
    faceDead: require('../../assets/chibi/werewolf/face_dead.png'),
    winVillage: require('../../assets/chibi/werewolf/win_village.png'),
    winWolves: require('../../assets/chibi/werewolf/win_wolves.png'),
  },
} as const;

export function diceAsset(value: number | null | undefined): ImageSourcePropType {
  const n = Math.max(1, Math.min(6, Math.floor(value || 1)));
  return Chibi.shared.dice[n]!;
}
