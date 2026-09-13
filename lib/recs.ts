export const REC_LIMIT = 5;
export const REVIEW_MAX = 180;
export const BOARD_KEY = 'recs:board';
export const REC_TTL = 60 * 60 * 24 * 365;

export type RecItem = {
  id: number;
  title: string;
  year?: number;
  type?: string;
  poster?: string | null;
  poster_path?: string;
  tmdb_id?: number;
  review: string;
  stars: number;
  at: string;
};

export type BoardItem = RecItem & {
  count: number;
  starSum: number;
  reviews: { text: string; stars: number; at: string }[];
};

export function recsUserKey(userId: string) {
  return `recs:user:${userId}`;
}

export function cleanReview(raw: unknown): string {
  const text = String(raw || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, REVIEW_MAX);
}

const SWEAR =
  /\b(fuck(?:ing|er)?|shit|cunt|bitch|nigg(?:a|er)s?|faggot|rape|asshole|bastard|dickhead|slut|whore)\b/i;

export function reviewIsClean(text: string): boolean {
  if (!text) return true;
  return !SWEAR.test(text);
}

export function clampStars(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (n < 1 || n > 5) return 0;
  return n;
}

export function avgStars(item: { starSum?: number; count?: number; stars?: number }): number {
  if (item.count && item.starSum) return item.starSum / item.count;
  return Number(item.stars) || 0;
}

export function slimRec(title: Record<string, unknown>, review: string, stars: number): RecItem | null {
  const id = Number(title.id);
  const name = String(title.title || title.name || '').trim().slice(0, 120);
  if (!id || !name || stars < 1 || stars > 5) return null;
  return {
    id,
    title: name,
    year: title.year ? Number(title.year) : undefined,
    type: title.type ? String(title.type) : undefined,
    poster: (title.poster as string | null) || null,
    poster_path: title.poster_path ? String(title.poster_path) : undefined,
    tmdb_id: title.tmdb_id ? Number(title.tmdb_id) : undefined,
    review,
    stars,
    at: new Date().toISOString(),
  };
}

export function applyRecToBoard(board: BoardItem[], item: RecItem, delta: number): BoardItem[] {
  const next = board.map((row) => ({ ...row, reviews: [...row.reviews] }));
  const idx = next.findIndex((row) => row.id === item.id);
  if (delta > 0) {
    if (idx === -1) {
      next.push({
        ...item,
        count: 1,
        starSum: item.stars,
        reviews: item.review ? [{ text: item.review, stars: item.stars, at: item.at }] : [],
      });
    } else {
      next[idx].count += 1;
      next[idx].starSum = (next[idx].starSum || 0) + item.stars;
      next[idx].stars = Math.round((next[idx].starSum / next[idx].count) * 10) / 10;
      next[idx].title = item.title;
      next[idx].year = item.year || next[idx].year;
      next[idx].poster = item.poster || next[idx].poster;
      next[idx].poster_path = item.poster_path || next[idx].poster_path;
      if (item.review) {
        next[idx].reviews = [{ text: item.review, stars: item.stars, at: item.at }, ...next[idx].reviews].slice(0, 4);
      }
    }
  } else if (idx !== -1) {
    next[idx].count = Math.max(0, next[idx].count - 1);
    next[idx].starSum = Math.max(0, (next[idx].starSum || 0) - (item.stars || 0));
    next[idx].stars = next[idx].count ? Math.round((next[idx].starSum / next[idx].count) * 10) / 10 : 0;
    if (item.review) {
      next[idx].reviews = next[idx].reviews.filter((r) => r.text !== item.review);
    }
    if (next[idx].count === 0) next.splice(idx, 1);
  }
  next.sort((a, b) => b.count - a.count || avgStars(b) - avgStars(a));
  return next.slice(0, 40);
}
