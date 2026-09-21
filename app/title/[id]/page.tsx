import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findTitleById } from '@/lib/catalog';
import TitleWatchLinks from '../../_components/TitleWatchLinks';

export const dynamic = 'force-dynamic';

const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

type TmdbDetails = {
  overview?: string;
  poster_path?: string;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  number_of_seasons?: number;
  genres?: { id: number; name: string }[];
};

async function loadTmdb(tmdbId?: number, type?: string): Promise<TmdbDetails | null> {
  if (!tmdbId || !TMDB_TOKEN) return null;
  const endpoint = type === 'movie' || type === 'movies' ? 'movie' : 'tv';
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}?language=en-US`, {
      headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (!parsed) return { title: 'Title | FreeStream World' };
  const title = await findTitleById(parsed);
  if (!title) return { title: 'Title not found | FreeStream World' };
  const name = `${title.title}${title.year ? ` (${title.year})` : ''}`;
  return {
    title: `Watch ${name} legally | FreeStream World`,
    description: `Official free and subscription links for ${name}. We do not host video — links go to BBC iPlayer, ITVX, Tubi, Pluto TV and other legal services.`,
    alternates: { canonical: `https://freestreamworld.com/title/${title.id}` },
    openGraph: {
      title: `${name} | FreeStream World`,
      description: `Find legal places to watch ${name}.`,
      url: `https://freestreamworld.com/title/${title.id}`,
    },
  };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (!parsed) notFound();

  const title = await findTitleById(parsed);
  if (!title) notFound();

  const tmdb = await loadTmdb(title.tmdb_id, title.type);
  const poster = tmdb?.poster_path
    ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
    : null;
  const kind = title.type === 'tv_series' ? 'TVSeries' : 'Movie';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': kind,
            name: title.title,
            datePublished: title.year ? String(title.year) : undefined,
            image: poster || undefined,
            description: tmdb?.overview || undefined,
            aggregateRating:
              tmdb?.vote_average && Number(tmdb.vote_count) > 0
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: tmdb.vote_average,
                    ratingCount: tmdb.vote_count,
                    bestRating: 10,
                    worstRating: 1,
                  }
                : undefined,
          }),
        }}
      />
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Back to FreeStream World</Link>
        <div className="mt-6 grid md:grid-cols-[220px_1fr] gap-8">
          <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gray-800">
            {poster ? (
              <Image src={poster} alt={`${title.title} poster`} fill className="object-cover" sizes="220px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No poster</div>
            )}
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold">
              {title.title} {title.year ? <span className="text-gray-400">({title.year})</span> : null}
            </h1>
            {tmdb?.vote_average ? (
              <p className="mt-3 text-yellow-400 text-xl font-semibold">{tmdb.vote_average.toFixed(1)} / 10 TMDB</p>
            ) : null}
            {tmdb?.genres?.length ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {tmdb.genres.slice(0, 6).map((g) => (
                  <span key={g.id} className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300">{g.name}</span>
                ))}
              </div>
            ) : null}
            {tmdb?.overview ? (
              <p className="mt-6 text-gray-300 leading-relaxed">{tmdb.overview}</p>
            ) : null}
            <p className="mt-4 text-sm text-yellow-200/80">
              We do not host or embed video. Buttons below open the official service.
            </p>
          </div>
        </div>
        <TitleWatchLinks id={title.id} region={title.region} paid={title.paid} />
      </div>
    </div>
  );
}
