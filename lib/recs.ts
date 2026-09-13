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
  at: string;
};

export type BoardItem = RecItem & {
  count: number;
  reviews: { text: string; at: string }[];
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

export function slimRec(title: Record<string, unknown>, review: string): RecItem | null {
  const id = Number(title.id);
  const name = String(title.title || title.name || '').trim().slice(0, 120);
  if (!id || !name) return null;
  return {
    id,
    title: name,
    year: title.year ? Number(title.year) : undefined,
    type: title.type ? String(title.type) : undefined,
    poster: (title.poster as string | null) || null,
    poster_path: title.poster_path ? String(title.poster_path) : undefined,
    tmdb_id: title.tmdb_id ? Number(title.tmdb_id) : undefined,
    review,
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
        reviews: item.review ? [{ text: item.review, at: item.at }] : [],
      });
    } else {
      next[idx].count += 1;
      next[idx].title = item.title;
      next[idx].year = item.year || next[idx].year;
      next[idx].poster = item.poster || next[idx].poster;
      next[idx].poster_path = item.poster_path || next[idx].poster_path;
      if (item.review) {
        next[idx].reviews = [{ text: item.review, at: item.at }, ...next[idx].reviews].slice(0, 4);
      }
    }
  } else if (idx !== -1) {
    next[idx].count = Math.max(0, next[idx].count - 1);
    if (item.review) {
      next[idx].reviews = next[idx].reviews.filter((r) => r.text !== item.review);
    }
    if (next[idx].count === 0) next.splice(idx, 1);
  }
  next.sort((a, b) => b.count - a.count || (b.at > a.at ? 1 : -1));
  return next.slice(0, 40);
}
