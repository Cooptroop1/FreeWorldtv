'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Film, Loader2, Star, Heart } from 'lucide-react';
import { staticFallbackTitles } from '../../lib/static-fallback-titles';

interface PremiumTabProps {
  region: string;
  contentType: string;
  favorites: any[];
  toggleFavorite: (title: any) => void;
  selectedTitle: any;
  setSelectedTitle: (title: any) => void;
  pauseInfiniteScroll: boolean;   // from MainApp
}

export default function PremiumTab({
  region,
  contentType,
  favorites,
  toggleFavorite,
  selectedTitle,
  setSelectedTitle,
  pauseInfiniteScroll,
}: PremiumTabProps) {
  const [premiumTitles, setPremiumTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const postersFetched = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

  // Initial fetch (paid titles only)
  useEffect(() => {
    const fetchPremium = async () => {
      setLoading(true);
      setPremiumTitles([]);
      setPage(1);
      setHasMore(true);
      try {
        const res = await fetch(
          `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=1&paid=true`
        );
        const json = await res.json();
        let titles = json.success && json.titles?.length
          ? json.titles.map((t: any) => ({ ...t, fromPremium: true }))
          : staticFallbackTitles.slice(0, 48).map(t => ({ ...t, fromPremium: true }));

        setPremiumTitles(titles);
        setHasMore(titles.length >= 48);
      } catch {
        setPremiumTitles(staticFallbackTitles.slice(0, 48).map(t => ({ ...t, fromPremium: true })));
        setHasMore(false);
      }
      setLoading(false);
    };
    fetchPremium();
  }, [region, contentType]);

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || pauseInfiniteScroll) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=${page + 1}&paid=true`
      );
      const json = await res.json();
      const newTitles = json.success && json.titles?.length
        ? json.titles.map((t: any) => ({ ...t, fromPremium: true }))
        : [];

      setPremiumTitles(prev => [...prev, ...newTitles]);
      setPage(prev => prev + 1);
      setHasMore(newTitles.length >= 48);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [page, region, contentType, loadingMore, hasMore, pauseInfiniteScroll]);

  // Infinite scroll observer (exact same as DiscoverTab)
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && !pauseInfiniteScroll) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loadingMore, loading, pauseInfiniteScroll]);

  // Optimized poster fetching (same as DiscoverTab)
  useEffect(() => {
    if (!premiumTitles?.length || !TMDB_READ_TOKEN) return;
    const titlesNeedingPoster = premiumTitles.filter((title: any) =>
      title.tmdb_id && (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
    );
    if (titlesNeedingPoster.length === 0) return;

    const fetchBatch = async () => {
      const batch = titlesNeedingPoster.slice(0, 8);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const endpoint = title.type === 'tv_series' ? 'tv' : 'movie';
          try {
            const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${title.tmdb_id}?language=en-US`, {
              headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_READ_TOKEN}` },
            });
            if (!res.ok) throw new Error();
            const json = await res.json();
            return { ...title, poster_path: json.poster_path };
          } catch {
            return title;
          }
        })
      );
      setPremiumTitles(prev => prev.map(t => updates.find(u => u.id === t.id) || t));
    };
    fetchBatch();
  }, [premiumTitles, TMDB_READ_TOKEN]);

  const MovieCard = (title: any, index: number) => {
    const isFavorite = favorites.some(fav => fav.id === title.id);
    return (
      <button
        key={title.id}
        onClick={() => setSelectedTitle(title)}
        className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative flex flex-col h-full text-left"
        aria-label={`View sources for ${title.title}`}
      >
        <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
          {title.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
              alt={title.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              quality={75}
              priority={index < 3}
              loading={index < 3 ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Film className="w-16 h-16 text-gray-600" /></div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(title); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90"
          >
            <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} />
          </button>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-end">
          <h4 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-purple-300">{title.title}</h4>
          <p className="text-gray-400 text-sm">{title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedTitle(title); }}
            className="mt-auto w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium"
          >
            View Sources
          </button>
        </div>
      </button>
    );
  };

  return (
    <section className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Star className="text-purple-400" size={36} />
        <h2 className="text-4xl font-bold">Premium on Subscription</h2>
      </div>
      <p className="text-yellow-400 mb-8 text-center text-sm">
        Popular titles on Netflix, Disney+, Prime Video, Max, Paramount+ and more
      </p>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-gray-800/80 rounded-xl overflow-hidden aspect-[2/3] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
            {premiumTitles.map((title, index) => MovieCard(title, index))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-12">
              {loadingMore && <Loader2 className="w-8 h-8 animate-spin text-purple-500" />}
            </div>
          )}
          {!hasMore && <p className="text-center text-gray-400 py-12">End of premium titles • Try changing region or content type</p>}
        </>
      )}
    </section>
  );
}
