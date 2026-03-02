'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Film, Loader2, MonitorPlay, Star, Heart } from 'lucide-react';
import { staticFallbackTitles } from '../../lib/static-fallback-titles';

interface DiscoverTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearch: string;
  region: string;
  contentType: string;
  favorites: any[];
  toggleFavorite: (title: any) => void;
  selectedTitle: any;
  setSelectedTitle: (title: any) => void;
  selectedGenresFilter: number[];
  minYearFilter: string;
  maxYearFilter: string;
  minRatingFilter: number;
  lastUpdated: string;
  setLastUpdated: (date: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  surpriseMe: () => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  toggleGenreFilter: (genreId: number) => void;
  setSelectedGenresFilter: (genres: number[]) => void;
  setMinYearFilter: (year: string) => void;
  setMaxYearFilter: (year: string) => void;
  setMinRatingFilter: (rating: number) => void;
  setContentType: (type: string) => void;
}

// Genres (only used in DiscoverTab for the filter modal logic)
const genres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export default function DiscoverTab({
  searchQuery,
  setSearchQuery,
  debouncedSearch,
  region,
  contentType,
  favorites,
  toggleFavorite,
  selectedTitle,
  setSelectedTitle,
  selectedGenresFilter,
  minYearFilter,
  maxYearFilter,
  minRatingFilter,
  lastUpdated,
  setLastUpdated,
  error,
  setError,
  surpriseMe,
  showFilters,
  setShowFilters,
  toggleGenreFilter,
  setSelectedGenresFilter,
  setMinYearFilter,
  setMaxYearFilter,
  setMinRatingFilter,
  setContentType
}: DiscoverTabProps) {
  const [allTitles, setAllTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pauseInfinite, setPauseInfinite] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [topGenre, setTopGenre] = useState('');
  const postersFetched = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

  // Fetch data (discover + search + genre)
  useEffect(() => {
    const fetchData = async (isLoadMore = false) => {
      if (!isLoadMore) {
        setLoading(true);
        setAllTitles([]);
        setPage(1);
        setHasMore(true);
        setError(null);
        postersFetched.current.clear();
      } else {
        setLoadingMore(true);
      }
      try {
        let url = `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=${isLoadMore ? page + 1 : 1}`;
        if (debouncedSearch) {
          url = `/api/cached-fetch?query=${encodeURIComponent(debouncedSearch)}&region=${region}&page=${isLoadMore ? page + 1 : 1}`;
        } else if (selectedGenre) {
          url += `&genres=${selectedGenre}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        let newTitles: any[] = json.success && json.titles?.length ? json.titles : staticFallbackTitles;
        if (newTitles === staticFallbackTitles) {
          setError('Using cached fallback titles (Watchmode temporarily unavailable)');
        }
        if (isLoadMore) {
          setAllTitles(prev => [...prev, ...newTitles]);
          setPage(prev => prev + 1);
          setHasMore(newTitles.length >= 48);
        } else {
          setAllTitles(newTitles);
          setPage(1);
          setHasMore(newTitles.length >= 48);
          if (json.success) setLastUpdated(new Date().toISOString());
        }
      } catch (err: any) {
        console.error(err);
        if (!isLoadMore) {
          setAllTitles(staticFallbackTitles);
          setError('Using cached fallback titles (network issue)');
        }
        setHasMore(false);
      }
      setLoading(false);
      setLoadingMore(false);
    };
    fetchData();
  }, [debouncedSearch, selectedGenre, region, contentType, page]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && !pauseInfinite) {
        setLoadingMore(true);
        const loadMore = async () => {
          try {
            let url = `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=${page + 1}`;
            if (debouncedSearch) url = `/api/cached-fetch?query=${encodeURIComponent(debouncedSearch)}&region=${region}&page=${page + 1}`;
            else if (selectedGenre) url += `&genres=${selectedGenre}`;
            const res = await fetch(url);
            const json = await res.json();
            const newTitles = json.success && json.titles?.length ? json.titles : staticFallbackTitles;
            setAllTitles(prev => [...prev, ...newTitles]);
            setPage(prev => prev + 1);
            setHasMore(newTitles.length >= 48);
          } catch {
            setHasMore(false);
          }
          setLoadingMore(false);
        };
        loadMore();
      }
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loadingMore, loading, page, region, contentType, debouncedSearch, selectedGenre, pauseInfinite]);

  // TMDB poster fetching
  useEffect(() => {
    if (!allTitles?.length || !TMDB_READ_TOKEN) return;
    const fetchPosters = async () => {
      const titlesNeedingPoster = allTitles.filter((title: any) =>
        title.tmdb_id && title.tmdb_type && (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
      );
      if (titlesNeedingPoster.length === 0) return;
      const updates = await Promise.all(
        titlesNeedingPoster.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const endpoint = title.tmdb_type === 'movie' ? 'movie' : 'tv';
          try {
            const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${title.tmdb_id}?language=en-US`, {
              headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_READ_TOKEN}`,
              },
            });
            if (!res.ok) throw new Error('TMDB error');
            const json = await res.json();
            return { ...title, poster_path: json.poster_path };
          } catch {
            return title;
          }
        })
      );
      setAllTitles(prev =>
        prev.map(title => {
          const update = updates.find((u: any) => u.id === title.id);
          return update || title;
        })
      );
    };
    fetchPosters();
  }, [allTitles, TMDB_READ_TOKEN]);

  // Filtered titles (exact original logic)
  const filteredTitles = allTitles.filter((title: any) => {
    const matchesSearch = !searchQuery || title.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenres = selectedGenresFilter.length === 0 || selectedGenresFilter.some(g => title.genre_ids?.includes(g));
    const year = parseInt(title.year || '0');
    const matchesYear = (!minYearFilter || year >= parseInt(minYearFilter)) && (!maxYearFilter || year <= parseInt(maxYearFilter));
    const rating = title.vote_average || 0;
    const matchesRating = rating >= minRatingFilter;
    const matchesType = contentType === 'movie,tv_series' || title.type === contentType;
    return matchesSearch && matchesGenres && matchesYear && matchesRating && matchesType;
  });

  const trending = filteredTitles.slice(0, 12);
  const newReleases = filteredTitles.slice(12, 24);
  const continueWatching = favorites.length > 0 ? favorites : filteredTitles.slice(0, 8);

  // Skeleton loader
  const SkeletonPoster = () => (
    <div className="flex-shrink-0 w-40 h-60 bg-zinc-800 rounded-xl animate-pulse" />
  );

  // Netflix-style carousel (exact original)
  const HorizontalCarousel = ({ title, items, loadingKey }: {
    title: string;
    items: any[];
    loadingKey: 'initial' | 'more'
  }) => {
    const isLoading = loadingKey === 'initial' ? loading : loadingMore;
    return (
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 px-4 flex items-center gap-3">
          {title}
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-6 px-4 snap-x snap-mandatory scrollbar-hide">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonPoster key={i} />)
          ) : items.length > 0 ? (
            items.map((item) => {
              const isFavorite = favorites.some(fav => fav.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedTitle(item)}
                  className="flex-shrink-0 w-40 snap-start cursor-pointer group"
                >
                  <div className="relative aspect-[2/3] bg-gray-700 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 20vw"
                        quality={85}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
                    >
                      <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} />
                    </button>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2 text-center text-gray-200 group-hover:text-white">
                    {item.title}
                  </p>
                  <p className="text-xs text-center text-gray-400">{item.year}</p>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 italic">No titles in this section yet</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-xl">
            {debouncedSearch ? 'Searching free titles...' : 'Loading popular titles...'}
          </p>
        </div>
      )}
      {error && <div className="text-red-500 text-center py-20 text-xl">Error: {error}</div>}

      {!loading && allTitles.length > 0 && (
        <section className="max-w-7xl mx-auto">
          {/* Publisher content */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-3">Welcome to FreeStream World</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We help you discover completely legal free movies, TV shows and live TV channels from official providers like Tubi, Pluto TV, BBC iPlayer, ITVX and more.
              No sign-up, no hidden fees — just direct links to the best free content available in your region right now.
            </p>
            <p className="text-gray-300 leading-relaxed">
              All titles shown are 100% free to watch on the original services. We never host or stream any video ourselves.
              Availability changes daily, so bookmark us and check back often!
            </p>
          </div>
          {/* Cache freshness badge */}
          {lastUpdated && (
            <div className="text-center text-xs text-emerald-400 mb-6">
              Updated {(() => {
                const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000);
                return diff === 0 ? 'just now' : `${diff} hour${diff > 1 ? 's' : ''} ago`;
              })()} • Refreshes automatically every 24 hours
            </div>
          )}
          {/* Hero Banner */}
          {filteredTitles[0] && (
            <div className="relative h-[70vh] mb-12 rounded-3xl overflow-hidden">
              {filteredTitles[0].poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/original${filteredTitles[0].poster_path}`}
                  alt={filteredTitles[0].title}
                  fill
                  className="object-cover brightness-75"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                  <div className="text-center">
                    <Film className="w-24 h-24 text-gray-600 mx-auto mb-6" />
                    <p className="text-4xl font-bold text-white">{filteredTitles[0].title}</p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
              <div className="absolute bottom-12 left-12 max-w-md">
                <h1 className="text-6xl font-bold mb-4">{filteredTitles[0].title}</h1>
                <p className="text-xl text-gray-300 mb-6">{filteredTitles[0].year}</p>
                <button
                  onClick={() => setSelectedTitle(filteredTitles[0])}
                  className="bg-white text-black px-10 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition"
                >
                  ▶ Watch Free Now
                </button>
              </div>
            </div>
          )}
          {/* Netflix carousels */}
          <HorizontalCarousel title="Continue Watching" items={continueWatching} loadingKey="initial" />
          <HorizontalCarousel title="Trending Now" items={trending} loadingKey="initial" />
          <HorizontalCarousel title="New Releases This Week" items={newReleases} loadingKey="initial" />
          {favorites.length > 0 && (
            <HorizontalCarousel title="Because You Favorited..." items={favorites.slice(0, 10)} loadingKey="initial" />
          )}
          {/* All Free Titles Grid + JSON-LD */}
          <div className="mt-12">
            <h3 className="text-3xl font-bold mb-6 flex items-center gap-4">
              <MonitorPlay className="text-green-400" size={32} />
              All Free Titles
            </h3>
            <p className="text-yellow-400 mb-4 text-center text-sm">
              Links only — we do not host videos. All content from official sources.
            </p>
            <p className="text-gray-400 mb-8 text-lg">
              Found {filteredTitles.length} titles • Scroll for more
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
              {filteredTitles.map((title: any) => {
                const isFavorite = favorites.some(fav => fav.id === title.id);
                const shareUrl = `https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`;
                const shareText = `Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal.`;
                return (
                  <div
                    key={title.id}
                    onClick={() => setSelectedTitle(title)}
                    className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
                  >
                    <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
                      {title.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${title.poster_path}`}
                          alt={title.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          quality={85}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-16 h-16 text-gray-600 group-hover:text-gray-400 transition-colors" />
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(title); }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-gray-900/70 hover:bg-gray-900/90 transition-colors"
                      >
                        <Heart size={20} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white hover:text-red-400'} />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">
                        {title.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          𝕏
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          📘
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          💬
                        </button>
                      </div>
                      <button
                        className="mt-3 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium transition-all"
                        onClick={(e) => { e.stopPropagation(); setSelectedTitle(title); }}
                      >
                        View Free Sources
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* FULL SEO JSON-LD */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  "name": debouncedSearch ? `Free Results for "${debouncedSearch}"` : "Popular Free Titles",
                  "numberOfItems": filteredTitles.length,
                  "itemListElement": filteredTitles.map((title, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                      "@type": title.type === 'tv_series' ? "TVSeries" : "Movie",
                      "name": title.title,
                      "url": `https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`,
                      "image": title.poster_path ? `https://image.tmdb.org/t/p/w500${title.poster_path}` : undefined,
                      "datePublished": title.year ? `${title.year}-01-01` : undefined,
                    }
                  }))
                })
              }}
            />
            {hasMore && (
              <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-12">
                {loadingMore && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
              </div>
            )}
            {!hasMore && <p className="text-center text-gray-400 py-12">End of results • Try a different search or filter</p>}
          </div>
        </section>
      )}
    </>
  );
}
