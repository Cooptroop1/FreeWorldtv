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

/** Tight matchers — title should actually belong to the series. */
const KNOWN: { name: string; test: RegExp }[] = [
  { name: 'Harry Potter', test: /^(harry potter|fantastic beasts)\b/i },
  { name: 'Fast & Furious', test: /fast(\s|&)+\s*furious|^the fast and the furious$|^furious [0-9]|^fast five$|^fast x$|hobbs\s*(&|and)\s*shaw/i },
  { name: 'Star Wars', test: /^star wars\b/i },
  { name: 'John Wick', test: /^john wick\b/i },
  { name: 'Mission: Impossible', test: /^mission:\s*impossible/i },
  { name: 'Jurassic Park', test: /^jurassic (park|world)\b/i },
  { name: 'Lord of the Rings', test: /^(the )?lord of the rings\b|^the hobbit\b/i },
  { name: 'The Matrix', test: /^(the )?matrix\b/i },
  { name: 'Pirates of the Caribbean', test: /^pirates of the caribbean\b/i },
  { name: 'Toy Story', test: /^toy story\b/i },
  { name: 'Shrek', test: /^shrek\b|^puss in boots\b/i },
  { name: 'Despicable Me', test: /^despicable me\b|^minions\b/i },
  { name: 'Ice Age', test: /^ice age\b/i },
  { name: 'Transformers', test: /^transformers\b/i },
  { name: 'Terminator', test: /^(the )?terminator\b/i },
  { name: 'Alien', test: /^(alien|aliens|alien:|prometheus|alien covenant|alien romulus)/i },
  { name: 'Predator', test: /^(predator|predators|the predator)\b/i },
  { name: 'Indiana Jones', test: /^(indiana jones|raiders of the lost ark)\b/i },
  { name: 'Batman', test: /^(batman|the dark knight|the batman)\b/i },
  { name: 'Spider-Man', test: /^(spider-man|spiderman|spider man)\b|spider-verse/i },
  { name: 'X-Men', test: /^(x-men|x2|x-men:)\b|^the wolverine$|^logan$/i },
  { name: 'Bourne', test: /bourne (identity|supremacy|ultimatum|legacy|jason bourne)|^the bourne\b|^jason bourne$/i },
  { name: 'Die Hard', test: /die hard/i },
  { name: 'Hunger Games', test: /^(the )?hunger games\b|^the ballad of songbirds/i },
  { name: 'Twilight', test: /^(the )?twilight saga|^twilight$|^new moon$|^eclipse$|^breaking dawn/i },
  { name: 'James Bond', test: /\b007\b|^casino royale$|^skyfall$|^spectre$|^no time to die$|^quantum of solace$|^goldfinger$|^goldeneye$|^tomorrow never dies$|^the world is not enough$|^die another day$|^casino royale$|^a view to a kill$/i },
  { name: 'Rocky', test: /^rocky(\s|$|\d)|^(creed)(\s|$|\d)/i },
  { name: 'Halloween', test: /^halloween(\s|$|:)/i },
  { name: 'Saw', test: /^saw(\s|$|:|\d)/i },
  { name: 'The Conjuring', test: /^(the conjuring|annabelle|the nun)\b/i },
  { name: 'Final Destination', test: /^final destination\b/i },
  { name: 'Scary Movie', test: /^scary movie\b/i },
  { name: 'Narnia', test: /narnia|^prince caspian$|^the voyage of the dawn treader$/i },
  { name: 'Planet of the Apes', test: /planet of the apes/i },
  { name: 'Mad Max', test: /^mad max\b|^furiosa\b/i },
  { name: 'Dune', test: /^dune\b/i },
  { name: 'Kung Fu Panda', test: /^kung fu panda\b/i },
  { name: 'How to Train Your Dragon', test: /^how to train your dragon\b/i },
  { name: 'The Godfather', test: /^(the )?godfather\b/i },
  { name: 'Ocean\'s', test: /ocean'?s\s+(\d|eleven|twelve|thirteen|8)/i },
  { name: 'Men in Black', test: /^men in black\b/i },
  { name: 'Night at the Museum', test: /^night at the museum\b/i },
  { name: 'Jumanji', test: /^jumanji\b/i },
  { name: 'Paddington', test: /^paddington\b/i },
  { name: 'Carry On', test: /^carry[\s-]on\s+\w/i },
  { name: 'Beverly Hills Cop', test: /^beverly hills cop\b/i },
  { name: 'Bad Boys', test: /^bad boys\b/i },
  { name: 'Taken', test: /^taken(\s+\d)?$/i },
  { name: 'The Expendables', test: /^(the )?expendables\b/i },
  { name: 'Rambo', test: /^rambo\b|^first blood\b/i },
  { name: 'Star Trek', test: /^star trek\b/i },
  { name: 'Avengers', test: /^(the )?avengers\b/i },
  { name: 'Iron Man', test: /^iron man\b/i },
  { name: 'Captain America', test: /^captain america\b/i },
  { name: 'Thor', test: /^thor(\s|:|$)/i },
  { name: 'Guardians of the Galaxy', test: /^guardians of the galaxy\b/i },
  { name: 'Deadpool', test: /^deadpool\b/i },
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

function normalize(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(the|a|an)\s+/, '')
    .trim();
}

/** Only numbered sequels: "Hangover Part II", "Taken 2", "Toy Story 3". */
function sequelBase(title: string): string | null {
  const n = normalize(title);
  const stripped = n
    .replace(/\s+(part|chapter|episode|vol|volume)\s+[\divxlc0-9]+.*$/, '')
    .replace(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/, '')
    .replace(/\s+\d{1,2}$/, '');
  if (stripped === n) return null;
  if (stripped.length < 4) return null;
  return stripped;
}

function toSet(name: string, list: CatalogTitle[]): FranchiseSet | null {
  const unique = new Map<number, CatalogTitle>();
  for (const t of list) unique.set(t.id, t);
  const titles = [...unique.values()]
    .map(slim)
    .sort((a, b) => (a.year || 9999) - (b.year || 9999));
  if (titles.length < 2) return null;
  const score = titles.reduce((s, t) => s + (t.popularity || 0), 0);
  return { name, count: titles.length, score, titles: titles.slice(0, 50) };
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
    const key = sequelBase(t.title);
    if (!key) continue;
    const list = buckets.get(key) || [];
    list.push(t);
    buckets.set(key, list);
  }
  for (const [key, list] of buckets) {
    const extras = movies.filter((t) => !used.has(t.id) && !list.includes(t) && normalize(t.title) === key);
    const set = toSet(key.replace(/\b\w/g, (c) => c.toUpperCase()), [...list, ...extras]);
    if (set) {
      set.titles.forEach((t) => used.add(t.id));
      sets.push(set);
    }
  }

  sets.sort((a, b) => b.score - a.score || b.count - a.count);
  return sets.slice(0, 16);
}
