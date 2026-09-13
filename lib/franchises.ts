import type { CatalogTitle } from '@/lib/watchmode-list';

export type FranchiseTitle = {
  id: number;
  title: string;
  year?: number;
  poster: string | null;
  poster_path?: string;
  popularity: number;
  tmdb_id?: number;
  type?: string;
};

export type FranchiseSet = {
  name: string;
  count: number;
  score: number;
  titles: FranchiseTitle[];
};

const KNOWN: { name: string; test: RegExp }[] = [
  { name: 'Harry Potter', test: /harry potter|fantastic beasts/i },
  { name: 'Fast & Furious', test: /fast(\s|&)+\s*furious|the fast and the furious|furious \d|fast five|fast x|hobbs\s*(&|and)\s*shaw/i },
  { name: 'Star Wars', test: /star wars|the mandalorian|andor\b|ahsoka|obi-wan kenobi/i },
  { name: 'Marvel', test: /avengers|iron man|captain america|thor:|guardians of the galaxy|doctor strange|black panther|ant-man|spider-man: no way|spider-man: far from|spider-man: homecoming|captain marvel|shang-chi|eternals|multiverse of madness|love and thunder|wakanda forever|quantumania|the marvels|deadpool & wolverine/i },
  { name: 'John Wick', test: /john wick/i },
  { name: 'Mission: Impossible', test: /mission:\s*impossible/i },
  { name: 'Jurassic Park', test: /jurassic (park|world)/i },
  { name: 'Lord of the Rings', test: /lord of the rings|the hobbit/i },
  { name: 'The Matrix', test: /the matrix|matrix reloaded|matrix revolutions|the matrix resurrections/i },
  { name: 'Pirates of the Caribbean', test: /pirates of the caribbean/i },
  { name: 'Toy Story', test: /toy story/i },
  { name: 'Shrek', test: /\bshrek\b|puss in boots/i },
  { name: 'Despicable Me', test: /despicable me|\bminions\b/i },
  { name: 'Ice Age', test: /ice age/i },
  { name: 'Transformers', test: /transformers/i },
  { name: 'Terminator', test: /\bterminator\b/i },
  { name: 'Alien', test: /\balien\b|aliens\b|prometheus|covenant/i },
  { name: 'Predator', test: /\bpredator\b|prey\b/i },
  { name: 'Indiana Jones', test: /indiana jones/i },
  { name: 'Batman', test: /batman|the dark knight|joker\b/i },
  { name: 'Spider-Man', test: /spider-man|spiderman|into the spider-verse|across the spider-verse/i },
  { name: 'X-Men', test: /\bx-men\b|wolverine|deadpool/i },
  { name: 'Bourne', test: /\bbourne\b/i },
  { name: 'Die Hard', test: /die hard/i },
  { name: 'Hunger Games', test: /hunger games|ballad of songbirds/i },
  { name: 'Twilight', test: /\btwilight\b|breaking dawn|new moon|eclipse/i },
  { name: 'James Bond', test: /\b007\b|james bond|casino royale|skyfall|spectre|no time to die|quantum of solace/i },
  { name: 'Rocky / Creed', test: /\brocky\b|\bcreed\b/i },
  { name: 'Halloween', test: /\bhalloween\b/i },
  { name: 'Saw', test: /\bsaw\b|jigsaw|spiral:/i },
  { name: 'Conjuring', test: /conjuring|annabelle|the nun/i },
  { name: 'Final Destination', test: /final destination/i },
  { name: 'Scary Movie', test: /scary movie/i },
  { name: 'Narnia', test: /narnia|prince caspian|voyage of the dawn/i },
  { name: 'Planet of the Apes', test: /planet of the apes|dawn of the planet|war for the planet|kingdom of the planet/i },
  { name: 'Mad Max', test: /mad max|fury road|furiosa/i },
  { name: 'Dune', test: /\bdune\b/i },
  { name: 'Kung Fu Panda', test: /kung fu panda/i },
  { name: 'How to Train Your Dragon', test: /how to train your dragon/i },
  { name: 'The Godfather', test: /godfather/i },
  { name: 'Ocean\'s', test: /ocean'?s\s+(\d|eleven|twelve|thirteen|8)/i },
  { name: 'Men in Black', test: /men in black/i },
  { name: 'Night at the Museum', test: /night at the museum/i },
  { name: 'Jumanji', test: /\bjumanji\b/i },
  { name: 'Paddington', test: /paddington/i },
  { name: 'Downton Abbey', test: /downton abbey/i },
  { name: 'Carry On', test: /\bcarry on\b/i },
  { name: 'Beverly Hills Cop', test: /beverly hills cop/i },
  { name: 'Bad Boys', test: /\bbad boys\b/i },
  { name: 'Taken', test: /\btaken\b/i },
  { name: 'The Expendables', test: /expendables/i },
  { name: 'Rambo', test: /\brambo\b/i },
  { name: 'Star Trek', test: /star trek/i },
];

function isMovie(t: CatalogTitle) {
  const type = (t.type || 'movie').toLowerCase();
  return type === 'movie' || type === 'short_film';
}

function slim(t: CatalogTitle): FranchiseTitle {
  return {
    id: t.id,
    title: t.title,
    year: t.year,
    poster: t.poster,
    poster_path: (t as CatalogTitle & { poster_path?: string }).poster_path,
    popularity: t.popularity || 0,
    tmdb_id: t.tmdb_id,
    type: t.type,
  };
}

function stemKey(title: string): string | null {
  const cleaned = title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|and|of|part|chapter|episode|vol|volume)\b/g, ' ')
    .replace(/\b(1|2|3|4|5|6|7|8|9|10|11|12|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length < 1) return null;
  const key = words.slice(0, Math.min(2, words.length)).join(' ');
  if (key.length < 5) return null;
  return key;
}

function toSet(name: string, list: CatalogTitle[]): FranchiseSet | null {
  const unique = new Map<number, CatalogTitle>();
  for (const t of list) unique.set(t.id, t);
  const titles = [...unique.values()]
    .map(slim)
    .sort((a, b) => (a.year || 9999) - (b.year || 9999));
  if (titles.length < 2) return null;
  const score = titles.reduce((n, t) => n + (t.popularity || 0), 0);
  return { name, count: titles.length, score, titles: titles.slice(0, 12) };
}

export function buildFranchiseSets(catalog: CatalogTitle[]): FranchiseSet[] {
  const movies = catalog.filter(isMovie);
  const used = new Set<number>();
  const sets: FranchiseSet[] = [];

  for (const known of KNOWN) {
    const hits = movies.filter((t) => known.test.test(t.title) && !used.has(t.id));
    const set = toSet(known.name, hits);
    if (set) {
      set.titles.forEach((t) => used.add(t.id));
      sets.push(set);
    }
  }

  const buckets = new Map<string, CatalogTitle[]>();
  for (const t of movies) {
    if (used.has(t.id)) continue;
    const key = stemKey(t.title);
    if (!key) continue;
    const list = buckets.get(key) || [];
    list.push(t);
    buckets.set(key, list);
  }
  for (const [key, list] of buckets) {
    const set = toSet(key.replace(/\b\w/g, (c) => c.toUpperCase()), list);
    if (set) sets.push(set);
  }

  sets.sort((a, b) => b.score - a.score || b.count - a.count);
  return sets.slice(0, 12);
}
