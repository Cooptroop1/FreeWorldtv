'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Film, Loader2, Star, Heart } from 'lucide-react';
import GlobalSearch from './GlobalSearch';   // ← FIXED import

interface PremiumTabProps {
  region: string;
  contentType: string;
  favorites: any[];
  toggleFavorite: (title: any) => void;
  selectedTitle: any;
  setSelectedTitle: (title: any) => void;
  pauseInfiniteScroll: boolean;
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
  const loadLock = useRef(false);
  const pageRef = useRef(1);
  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

  // Search state for Premium tab only
  const [searchQuery, setSearchQuery] = useState('');

  // Initial fetch (paid titles only)
  useEffect(() => {
    const fetchPremium = async () => {
      setLoading(true);
      setPremiumTitles([]);
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      try {
        const res = await fetch(
          `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=1&paid=true`
        );
        const json = await res.json();
        let titles = json.success && json.titles?.length
          ? json.titles.map((t: any) => ({ ...t, fromPremium: true }))
          : [];
        setPremiumTitles(titles);
        setHasMore(Boolean(json.hasMore));
      } catch (err) {
        console.error('Premium fetch failed:', err);
        setPremiumTitles([]);
        setHasMore(false);
      }
      setLoading(false);
    };
    fetchPremium();
  }, [region, contentType]);

  // Load more (unchanged)
  const loadMore = useCallback(async () => {
    if (loadLock.current || loading || !hasMore || pauseInfiniteScroll) return;
    loadLock.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(
        `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=${nextPage}&paid=true`
      );
      const json = await res.json();
      const newTitles = json.success && json.titles?.length
        ? json.titles.map((t: any) => ({ ...t, fromPremium: true }))
        : [];
      if (newTitles.length) {
        setPremiumTitles((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          return [...prev, ...newTitles.filter((t: any) => !seen.has(t.id))];
        });
        pageRef.current = nextPage;
        setPage(nextPage);
      }
      setHasMore(Boolean(json.hasMore && newTitles.length));
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      loadLock.current = false;
    }
  }, [loading, hasMore, pauseInfiniteScroll, region, contentType]);

  const attachSentinel = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !hasMore || loading || pauseInfiniteScroll) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) loadMore();
        },
        { root: null, rootMargin: '900px 0px', threshold: 0 }
      );
      observerRef.current.observe(node);
    },
    [hasMore, loading, pauseInfiniteScroll, loadMore]
  );

  useEffect(() => {
    if (loading || loadingMore || !hasMore || pauseInfiniteScroll) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById('premium-scroll-sentinel');
      if (!el) return;
      if (el.getBoundingClientRect().top < window.innerHeight + 900) loadMore();
    }, 50);
    return () => window.clearTimeout(id);
  }, [premiumTitles.length, loading, loadingMore, hasMore, pauseInfiniteScroll, loadMore]);

  // Poster enrichment (unchanged)
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
      >
        <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
          {title.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
              alt={title.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
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
      {/* Premium-only search bar */}
      <div className="mb-8">
        <GlobalSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onTitleSelect={setSelectedTitle}
          region={region}
          contentType={contentType}
          paidOnly={true}
        />
      </div>

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
          <div key={contentType} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
            {premiumTitles.map((title, index) => MovieCard(title, index))}
          </div>
          <div
            id="premium-scroll-sentinel"
            ref={attachSentinel}
            className="min-h-24 flex flex-col items-center justify-center mt-12 gap-3"
          >
            {loadingMore && <Loader2 className="w-8 h-8 animate-spin text-purple-500" />}
            {hasMore && !loading && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more titles'}
              </button>
            )}
            {!hasMore && (
              <p className="text-center text-gray-400 py-8">End of premium titles • Try changing region or content type</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
