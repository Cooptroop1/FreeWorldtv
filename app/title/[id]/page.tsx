import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MonitorPlay, Star, Clock, Users } from 'lucide-react';

const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

async function getTitleDetails(id: string) {
  try {
    const wmRes = await fetch(`/api/title-sources?id=${id}&region=US`, {
      cache: 'no-store'
    });
    const wmJson = await wmRes.json();
    const watchmodeTitle = wmJson.success ? wmJson.title || {} : {};

    if (!watchmodeTitle.tmdb_id) return null;

    const type = watchmodeTitle.tmdb_type === 'movie' ? 'movie' : 'tv';

    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/${type}/${watchmodeTitle.tmdb_id}?language=en-US&append_to_response=credits,videos`,
      {
        headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` },
        cache: 'no-store'
      }
    );
    const tmdb = await tmdbRes.json();

    return {
      ...watchmodeTitle,
      ...tmdb,
      poster_path: tmdb.poster_path || watchmodeTitle.poster_path,
      backdrop_path: tmdb.backdrop_path,
      overview: tmdb.overview,
      runtime: tmdb.runtime || tmdb.episode_run_time?.[0],
      genres: tmdb.genres || [],
      cast: tmdb.credits?.cast?.slice(0, 8) || [],
      trailer: tmdb.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key || null,
      sources: wmJson.freeSources || []
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;   // ← THIS WAS THE MISSING LINE (Next.js 15+)

  const title = await getTitleDetails(id);
  if (!title) notFound();

  const trailerUrl = title.trailer ? `https://www.youtube.com/embed/${title.trailer}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white">
      <div className="absolute top-6 left-6 z-50">
        <Link href="/" className="flex items-center gap-2 bg-black/70 hover:bg-black/90 px-5 py-2 rounded-full text-sm font-medium transition">
          ← Back to Discover
        </Link>
      </div>

      {/* Hero Backdrop */}
      <div className="relative h-[75vh] w-full overflow-hidden">
        {title.backdrop_path ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/original${title.backdrop_path}`}
            alt={title.title || title.name}
            fill
            className="object-cover brightness-[0.65]"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gray-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <div className="flex-shrink-0 -mb-12 md:mb-0 relative z-10">
              <Image
                src={`${TMDB_IMAGE_BASE}/w500${title.poster_path}`}
                alt={title.title || title.name}
                width={260}
                height={390}
                className="rounded-3xl shadow-2xl border-4 border-white/20"
                priority
              />
            </div>

            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
                {title.title || title.name}
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xl text-gray-300 mb-8">
                <span>{title.year}</span>
                {title.runtime && <span className="flex items-center gap-1"><Clock size={20} /> {title.runtime} min</span>}
                {title.vote_average && (
                  <span className="flex items-center gap-1"><Star className="text-yellow-400" size={20} /> {title.vote_average.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-16">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-8">
            <h2 className="text-3xl font-bold mb-6">Story</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              {title.overview || "No plot summary available yet."}
            </p>

            {trailerUrl && (
              <div className="mt-16">
                <h3 className="text-2xl font-bold mb-6">Official Trailer</h3>
                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                  <iframe
                    width="100%"
                    height="100%"
                    src={trailerUrl}
                    title="Official Trailer"
                    allowFullScreen
                    className="rounded-3xl"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-4 space-y-10">
            <div>
              <h4 className="uppercase text-xs tracking-widest text-gray-500 mb-3">Genres</h4>
              <div className="flex flex-wrap gap-2">
                {title.genres?.map((g: any) => (
                  <span key={g.id} className="bg-gray-800 text-sm px-5 py-2 rounded-full">{g.name}</span>
                ))}
              </div>
            </div>

            {title.cast?.length > 0 && (
              <div>
                <h4 className="uppercase text-xs tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                  <Users size={18} /> Main Cast
                </h4>
                <div className="space-y-4">
                  {title.cast.slice(0, 6).map((actor: any) => (
                    <div key={actor.id} className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                        {actor.profile_path && (
                          <Image
                            src={`${TMDB_IMAGE_BASE}/w185${actor.profile_path}`}
                            alt={actor.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{actor.name}</div>
                        <div className="text-sm text-gray-400 line-clamp-1">{actor.character}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-20">
          <h3 className="text-3xl font-bold mb-8">Watch Free Now</h3>
          <div className="grid gap-4">
            {title.sources && title.sources.length > 0 ? (
              title.sources.map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-5 bg-gray-800/70 hover:bg-gray-700/70 p-6 rounded-2xl transition-all group"
                >
                  <div className="w-16 h-16 bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
                    {source.logo ? (
                      <Image src={source.logo} alt={source.name} width={64} height={64} className="object-contain" />
                    ) : (
                      <MonitorPlay size={32} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-semibold group-hover:text-blue-400 transition-colors">{source.name}</div>
                    <div className="text-gray-400">Free with ads • Official platform</div>
                  </div>
                  <div className="text-blue-400 text-xl font-medium group-hover:translate-x-1 transition">→</div>
                </a>
              ))
            ) : (
              <p className="text-gray-400 text-lg italic">No free sources available right now. Check back soon!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
