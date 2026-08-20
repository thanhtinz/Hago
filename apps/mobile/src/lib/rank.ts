import { ArtName } from '../components/Art';

/** Mỗi bậc hạng một asset riêng: huy chương đồng/bạc/vàng, đá quý, vương miện. */
const RANK_ART: Record<string, ArtName> = {
  Bronze: 'medal-3',
  Silver: 'medal-2',
  Gold: 'medal-1',
  Platinum: 'gem',
  Diamond: 'gem',
  Master: 'crown',
};

export function rankArt(rank?: string): ArtName {
  return RANK_ART[rank ?? ''] ?? 'medal-3';
}

/** Huy chương theo thứ hạng 1-2-3. */
export function placeArt(place: number): ArtName {
  return place === 1 ? 'medal-1' : place === 2 ? 'medal-2' : 'medal-3';
}
