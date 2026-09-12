'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Film, Loader2, MonitorPlay, Heart, Filter, X, Bookmark, EyeOff } from 'lucide-react';
import HorizontalCarousel from './HorizontalCarousel';
import type { LibraryStatus } from '@/lib/account';

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
  minYearFilter: string;
  maxYearFilter: string;
  minRatingFilter: number;
  lastUpdated: string;
  setLastUpdated: (date: string) => void;
  surpriseMe: () => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  setMinYearFilter: (year: string) => void;
  setMaxYearFilter: (year: string) => void;
  setMinRatingFilter: (rating: number) => void;
  setContentType: (type: string) => void;
  pauseInfiniteScroll: boolean;
  continueWatching: any[];
  removeFromContinueWatching: (id: number) => void;
  hiddenIds: Set<number>;
  statusOf: (id: number) => LibraryStatus | null;
  setLibraryStatus: (title: any, status: LibraryStatus | null) => void;
}

function catalogUrl(opts: {
  region: string;
  contentType: string;
  page?: number;
  search?: string;
  minYear?: string;
  maxYear?: string;
  minRating?: number;
  section?: string;
  genre?: string;
}) {
  const params = new URLSearchParams();
  params.set('region', opts.region);
  params.set('types', opts.contentType);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.search) params.set('query', opts.search);
  if (opts.minYear) params.set('fromYear', opts.minYear);
  if (opts.maxYear) params.set('toYear', opts.maxYear);
  if (opts.minRating) params.set('minRating', String(opts.minRating));
  if (opts.section) params.set('section', opts.section);
  if (opts.genre) params.set('genre', opts.genre);
  return `/api/cached-fetch?${params.toString()}`;
}

const GENRE_OPTIONS = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Animation', 'Documentary', 'Crime', 'Family', 'Sci-Fi'];

export default function DiscoverTab({
  searchQuery, setSearchQuery, debouncedSearch, region, contentType,
  favorites, toggleFavorite, selectedTitle, setSelectedTitle,
  minYearFilter, maxYearFilter, minRatingFilter,
  lastUpdated, setLastUpdated,
  surpriseMe, showFilters, setShowFilters,
  setMinYearFilter, setMaxYearFilter, setMinRatingFilter, setContentType,
  pauseInfiniteScroll,
  continueWatching,
  removeFromContinueWatching,
  hiddenIds,
  statusOf,
  setLibraryStatus,
}: DiscoverTabProps) {
  const [allTitles, setAllTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [newReleasesItems, setNewReleasesItems] = useState<any[]>([]);
  const [carouselsLoading, setCarouselsLoading] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');
  const [catalogEmpty, setCatalogEmpty] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [arrivedItems, setArrivedItems] = useState<any[]>([]);
  const [leftItems, setLeftItems] = useState<any[]>([]);
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [similarSeed, setSimilarSeed] = useState('');

  const postersFetched = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadLock = useRef(false);
  const pageRef = useRef(1);
  const prevSearchRef = useRef(debouncedSearch);
  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

  useEffect(() => {
    document.title = debouncedSearch
      ? `Free "${debouncedSearch}" Movies & TV Shows | FreeStream World`
      : 'FreeStream World - Watch Free Movies & TV Shows Legally';
  }, [debouncedSearch]);

  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      prevSearchRef.current = debouncedSearch;
      setAllTitles([]);
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setAllTitles([]);
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      setCatalogEmpty(false);
      try {
        const url = catalogUrl({
          region,
          contentType,
          page: 1,
          search: debouncedSearch,
          minYear: minYearFilter,
          maxYear: maxYearFilter,
          minRating: minRatingFilter,
          genre: genreFilter,
        });
        const res = await fetch(url);
        let json = await res.json();
        let newTitles: any[] = json.success && json.titles?.length ? json.titles : [];
        if (!debouncedSearch && newTitles.length === 0 && (json.catalogEmpty || json.building)) {
          for (let attempt = 0; attempt < 2 && newTitles.length === 0; attempt++) {
            await new Promise((r) => setTimeout(r, 2500));
            const retry = await fetch(url);
            json = await retry.json();
            newTitles = json.success && json.titles?.length ? json.titles : [];
          }
        }
        if (json.catalogEmpty) setCatalogEmpty(true);
        setAllTitles(newTitles);
        setHasMore(Boolean(json.hasMore && newTitles.length));
        if (json.success && newTitles.length) setLastUpdated(new Date().toISOString());
      } catch (err) {
        console.error(err);
        setAllTitles([]);
        setHasMore(false);
      }
      setLoading(false);
    };
    fetchData();
  }, [debouncedSearch, region, contentType, minYearFilter, maxYearFilter, minRatingFilter, genreFilter, setLastUpdated, reloadToken]);

  const loadMore = useCallback(async () => {
    if (loadLock.current || loading || !hasMore || pauseInfiniteScroll) return;
    loadLock.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const url = catalogUrl({
        region,
        contentType,
        page: nextPage,
        search: debouncedSearch,
        minYear: minYearFilter,
        maxYear: maxYearFilter,
        minRating: minRatingFilter,
        genre: genreFilter,
      });
      const res = await fetch(url);
      const json = await res.json();
      const newTitles = json.success && json.titles?.length ? json.titles : [];
      if (newTitles.length) {
        setAllTitles((prev) => {
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
  }, [
    loading,
    hasMore,
    pauseInfiniteScroll,
    region,
    contentType,
    debouncedSearch,
    minYearFilter,
    maxYearFilter,
    minRatingFilter,
    genreFilter,
  ]);

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

  // Observer only fires when crossing the threshold. After a page loads the
  // sentinel may still be on-screen — keep fetching until it is pushed down.
  useEffect(() => {
    if (loading || loadingMore || !hasMore || pauseInfiniteScroll) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById('discover-scroll-sentinel');
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < window.innerHeight + 900) loadMore();
    }, 50);
    return () => window.clearTimeout(id);
  }, [allTitles.length, loading, loadingMore, hasMore, pauseInfiniteScroll, loadMore]);

  useEffect(() => {
    if (!allTitles?.length || !TMDB_READ_TOKEN) return;
    const titlesNeedingPoster = allTitles.filter((title: any) =>
      title.tmdb_id && (title.tmdb_type || title.type) && (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
    );
    if (titlesNeedingPoster.length === 0) return;

    const fetchWithLimit = async () => {
      const batch = titlesNeedingPoster.slice(0, 8);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const t = title.tmdb_type || title.type;
          const endpoint = (t === 'movie' || t === 'movies') ? 'movie' : 'tv';
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
      setAllTitles((prev) => prev.map((title) => updates.find((u: any) => u.id === title.id) || title));
    };
    fetchWithLimit();
  }, [allTitles, TMDB_READ_TOKEN]);

  useEffect(() => {
    if (!TMDB_READ_TOKEN) return;
    const carouselItems = [...trendingItems, ...newReleasesItems, ...arrivedItems, ...leftItems, ...similarItems];
    const titlesNeedingPoster = carouselItems.filter((title: any) =>
      title.tmdb_id && (title.tmdb_type || title.type) && (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
    );
    if (titlesNeedingPoster.length === 0) return;

    const fetchWithLimit = async () => {
      const batch = titlesNeedingPoster.slice(0, 6);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const t = title.tmdb_type || title.type;
          const endpoint = (t === 'movie' || t === 'movies') ? 'movie' : 'tv';
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
      setTrendingItems((prev) => prev.map((title) => updates.find((u: any) => u.id === title.id) || title));
      setNewReleasesItems((prev) => prev.map((title) => updates.find((u: any) => u.id === title.id) || title));
      setArrivedItems((prev) => prev.map((title) => updates.find((u: any) => u.id === title.id) || title));
      setLeftItems((prev) => prev.map((title) => updates.find((u: any) => u.id === title.id) || title));
      setSimilarItems((prev) => prev.map((title) => updates.find((u: any) => u.id === title.id) || title));
    };
    fetchWithLimit();
  }, [trendingItems, newReleasesItems, arrivedItems, leftItems, similarItems, TMDB_READ_TOKEN]);

  useEffect(() => {
    const fetchCarousels = async () => {
      if (debouncedSearch) return;
      setCarouselsLoading(true);
      try {
        const trendRes = await fetch(catalogUrl({ region, contentType, section: 'trending' }));
        const trendJson = await trendRes.json();
        if (trendJson.success) setTrendingItems(trendJson.titles || []);

        const newRes = await fetch(catalogUrl({ region, contentType, section: 'new-releases' }));
        const newJson = await newRes.json();
        if (newJson.success) setNewReleasesItems(newJson.titles || []);

        const changeRes = await fetch(`/api/catalog-changes?region=${region}`);
        const changeJson = await changeRes.json();
        if (changeJson.success) {
          setArrivedItems(changeJson.arrived || []);
          setLeftItems(changeJson.left || []);
        }
      } catch (err) {
        console.error('Carousel fetch failed:', err);
      } finally {
        setCarouselsLoading(false);
      }
    };
    fetchCarousels();
  }, [contentType, debouncedSearch, region]);

  useEffect(() => {
    const seed = favorites[0];
    if (!seed?.id || debouncedSearch) {
      setSimilarItems([]);
      setSimilarSeed('');
      return;
    }
    let cancelled = false;
    fetch(`/api/similar?id=${seed.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setSimilarSeed(seed.title || '');
        setSimilarItems(Array.isArray(json.titles) ? json.titles.filter((t: any) => t.id !== seed.id) : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [favorites[0]?.id, favorites[0]?.title, debouncedSearch]);

  const filteredTitles = allTitles.filter((t) => !hiddenIds.has(t.id));
  const visibleTrending = trendingItems.filter((t) => !hiddenIds.has(t.id));
  const visibleNew = newReleasesItems.filter((t) => !hiddenIds.has(t.id));
  const visibleArrived = arrivedItems.filter((t) => !hiddenIds.has(t.id));
  const visibleLeft = leftItems.filter((t) => !hiddenIds.has(t.id));
  const visibleSimilar = similarItems.filter((t) => !hiddenIds.has(t.id));

  const jsonLd = useMemo(() => JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": debouncedSearch ? `Free Results for "${debouncedSearch}"` : "Popular Free Titles",
    "numberOfItems": Math.min(filteredTitles.length, 20),
    "itemListElement": filteredTitles.slice(0, 20).map((title, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": title.type === 'tv_series' ? "TVSeries" : "Movie",
        "name": title.title,
        "url": `https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`,
        "image": title.poster_path ? `https://image.tmdb.org/t/p/w342${title.poster_path}` : undefined,
        "datePublished": title.year ? `${title.year}-01-01` : undefined,
      }
    }))
  }), [debouncedSearch, filteredTitles]);

  const clearFilters = () => {
    setMinYearFilter('');
    setMaxYearFilter('');
    setMinRatingFilter(0);
    setContentType('movie,tv_series');
    setGenreFilter('');
  };

  const MovieCardSkeleton = () => (
    <div className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg flex flex-col h-full" aria-hidden="true">
      <div className="relative aspect-[2/3] bg-zinc-800 animate-pulse flex-shrink-0" />
      <div className="p-4 flex-1 flex flex-col justify-end">
        <div className="h-7 bg-zinc-700 rounded animate-pulse mb-3 w-11/12" />
        <div className="h-4 bg-zinc-700 rounded animate-pulse w-1/2 mb-8" />
        <div className="mt-auto h-11 bg-zinc-700 rounded-lg animate-pulse" />
      </div>
    </div>
  );

  return (
    <>
      {!loading && allTitles.length === 0 && (
        <div className="max-w-xl mx-auto text-center py-16 px-6" role="alert">
          <p className="text-lg text-white mb-2">
            {debouncedSearch
              ? `No free titles matching “${debouncedSearch}”.`
              : catalogEmpty
                ? `No cached list for ${region} yet. The first visit fetches Watchmode, then everyone else uses that cache. Tap retry.`
                : 'Could not load titles just now.'}
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="mt-4 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {(loading || allTitles.length > 0) && (
        <section className="max-w-7xl mx-auto" aria-labelledby="discover-main">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-3">Welcome to FreeStream World</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We help you discover completely legal free movies, TV shows and live TV channels from official providers like Tubi, Pluto TV, BBC iPlayer, ITVX and more.
              No sign-up, no hidden fees — just direct links to the best free content available in your region right now.
            </p>
            <p className="text-gray-300 leading-relaxed">
              All titles shown are free to watch on the original services. We never host or stream any video ourselves.
              Availability changes daily, so bookmark us and check back often!
            </p>
          </div>

          {lastUpdated && (
            <div className="text-center text-xs text-emerald-400 mb-6" aria-live="polite">
              Updated {(() => { const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000); return diff === 0 ? 'just now' : `${diff} hour${diff > 1 ? 's' : ''} ago`; })()}
            </div>
          )}

          {filteredTitles[0] && (
            <div className="relative h-[70vh] mb-12 rounded-3xl overflow-hidden" role="img" aria-label={`${filteredTitles[0].title} hero background`}>
              {filteredTitles[0].poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w780${filteredTitles[0].poster_path}`}
                  alt={`${filteredTitles[0].title} hero`}
                  fill
                  className="object-cover brightness-75"
                  priority
                  quality={75}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                  <div className="text-center"><Film className="w-24 h-24 text-gray-600 mx-auto mb-6" /><p className="text-4xl font-bold text-white">{filteredTitles[0].title}</p></div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
              <div className="absolute bottom-12 left-12 max-w-md">
                <h1 className="text-6xl font-bold mb-4">{filteredTitles[0].title}</h1>
                <p className="text-xl text-gray-300 mb-6">{filteredTitles[0].year}</p>
                <button onClick={() => setSelectedTitle(filteredTitles[0])} className="bg-white text-black px-10 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition">▶ Watch Free Now</button>
              </div>
            </div>
          )}

          {continueWatching.length > 0 && (
            <section className="mb-10 relative" aria-labelledby="continue-heading">
              <h2 id="continue-heading" className="text-2xl font-bold mb-4 px-4 flex items-center gap-3">
                ▶️ Continue Watching ({continueWatching.length})
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-6 px-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {continueWatching
                  .sort((a: any, b: any) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
                  .map((title: any) => (
                    <button
                      key={title.id}
                      type="button"
                      onClick={() => setSelectedTitle(title)}
                      className="flex-shrink-0 w-40 snap-start cursor-pointer group text-left flex flex-col"
                    >
                      <div className="relative aspect-[2/3] bg-gray-700 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                        {title.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
                            alt={`${title.title} poster`}
                            fill
                            className="object-cover object-top"
                            sizes="160px"
                            quality={75}
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 animate-pulse" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromContinueWatching(title.id); }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-sm line-clamp-2 text-center text-gray-200 mt-2">{title.title}</p>
                      <p className="text-xs text-center text-gray-400">{title.year}</p>
                    </button>
                  ))}
              </div>
            </section>
          )}

          <HorizontalCarousel
            title="Trending Now"
            items={visibleTrending}
            loading={carouselsLoading}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            setSelectedTitle={setSelectedTitle}
          />
          {visibleArrived.length > 0 && (
            <HorizontalCarousel
              title="New on the free list"
              items={visibleArrived}
              loading={carouselsLoading}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              setSelectedTitle={setSelectedTitle}
            />
          )}
          <HorizontalCarousel
            title="New Today"
            items={visibleNew}
            loading={carouselsLoading}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            setSelectedTitle={setSelectedTitle}
          />
          {visibleLeft.length > 0 && (
            <HorizontalCarousel
              title="Left the free list"
              items={visibleLeft}
              loading={carouselsLoading}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              setSelectedTitle={setSelectedTitle}
            />
          )}
          {visibleSimilar.length > 0 && (
            <HorizontalCarousel
              title={similarSeed ? `Because you liked ${similarSeed}` : 'More like your favourites'}
              items={visibleSimilar}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              setSelectedTitle={setSelectedTitle}
            />
          )}

          <div className="mb-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filters-panel"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl font-medium transition-all"
            >
              <Filter size={20} /> {showFilters ? 'Hide Filters' : '🔍 Filters & Options'}
            </button>
            <button
              onClick={surpriseMe}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-2xl font-medium transition-all"
            >
              🎲 Surprise Me
            </button>
          </div>
          {showFilters && (
            <div id="filters-panel" className="mb-10 bg-gray-800/50 border border-gray-700 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-2xl font-bold">Filters</h4>
                <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                  <X size={16} /> Reset
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-400 mb-3">Content type</p>
                  <div className="flex flex-wrap gap-3" role="group" aria-label="Content type filter">
                    {['movie,tv_series', 'movie', 'tv_series'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setContentType(type)}
                        aria-pressed={contentType === type}
                        className={`px-6 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                          contentType === type ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {type === 'movie,tv_series' ? 'All (Movies & TV Shows)' : type === 'movie' ? 'Movies Only' : 'TV Shows Only'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="text-sm text-gray-400">
                    From year
                    <input
                      type="number"
                      min="1900"
                      max="2030"
                      value={minYearFilter}
                      onChange={(e) => setMinYearFilter(e.target.value)}
                      placeholder="e.g. 1990"
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-gray-400">
                    To year
                    <input
                      type="number"
                      min="1900"
                      max="2030"
                      value={maxYearFilter}
                      onChange={(e) => setMaxYearFilter(e.target.value)}
                      placeholder="e.g. 2026"
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-gray-400">
                    Min rating
                    <select
                      value={minRatingFilter}
                      onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white"
                    >
                      <option value={0}>Any</option>
                      <option value={5}>5+</option>
                      <option value={6}>6+</option>
                      <option value={7}>7+</option>
                      <option value={8}>8+</option>
                    </select>
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-3">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setGenreFilter('')}
                      className={`px-4 py-2 rounded-2xl text-sm ${genreFilter === '' ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      All
                    </button>
                    {GENRE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenreFilter(g)}
                        className={`px-4 py-2 rounded-2xl text-sm ${genreFilter === g ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12">
            <h3 id="all-titles-heading" className="text-3xl font-bold mb-6 flex items-center gap-4">
              <MonitorPlay className="text-green-400" size={32} /> All Free Titles
            </h3>
            <p className="text-yellow-400 mb-4 text-center text-sm">Links only — we do not host videos. All content from official sources.</p>

            <div aria-live="polite" className="text-gray-400 mb-8 text-lg">
              {loading ? 'Searching free titles...' : `Found ${filteredTitles.length} titles • Scroll for more`}
            </div>

            <div className="min-h-[600px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6" aria-labelledby="all-titles-heading">
              {loading ? (
                Array.from({ length: 30 }).map((_, i) => <MovieCardSkeleton key={i} />)
              ) : (
                filteredTitles.map((title: any, index: number) => {
                  const isFavorite = favorites.some((fav) => fav.id === title.id);
                  const shareUrl = `https://freestreamworld.com/title/${title.id}`;
                  const shareText = `Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal.`;
                  return (
                    <button
                      key={`${title.id}-${index}`}
                      onClick={() => setSelectedTitle(title)}
                      className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative flex flex-col h-full text-left"
                      aria-label={`View free sources for ${title.title} (${title.year})`}
                    >
                      <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden flex-shrink-0">
                        {title.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
                            alt={`${title.title} poster`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                            quality={75}
                            priority={index < 3}
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 animate-pulse" />
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(title); }}
                            aria-label={isFavorite ? `Remove ${title.title} from favorites` : `Add ${title.title} to favorites`}
                            className="text-white hover:text-red-500 transition-colors"
                          >
                            <Heart size={28} className={isFavorite ? 'fill-red-500' : ''} />
                          </button>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setLibraryStatus(title, statusOf(title.id) === 'want' ? null : 'want'); }}
                              className="text-white hover:text-blue-400"
                              aria-label="Watchlist"
                            >
                              <Bookmark size={22} className={statusOf(title.id) === 'want' ? 'fill-blue-400 text-blue-400' : ''} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setLibraryStatus(title, statusOf(title.id) === 'hidden' ? null : 'hidden'); }}
                              className="text-white hover:text-amber-400"
                              aria-label="Hide from Discover"
                            >
                              <EyeOff size={22} className={statusOf(title.id) === 'hidden' ? 'text-amber-400' : ''} />
                            </button>
                          </div>
                          <div className="flex gap-5">
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(shareUrl); }} aria-label="Copy link" className="text-white hover:text-blue-400 text-2xl">📋</button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); }} aria-label="Share on X" className="text-white hover:text-blue-400 text-2xl">𝕏</button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); }} aria-label="Share on Facebook" className="text-white hover:text-blue-400 text-2xl">📘</button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank'); }} aria-label="Share on WhatsApp" className="text-white hover:text-blue-400 text-2xl">💬</button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-end">
                        <h4 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">{title.title}</h4>
                        <p className="text-gray-400 text-sm">{title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}</p>
                        <span className="mt-auto w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg font-medium text-center">
                          View Free Sources
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

            <div
              id="discover-scroll-sentinel"
              ref={attachSentinel}
              className="min-h-24 flex flex-col items-center justify-center mt-12 gap-3"
              aria-live="polite"
            >
              {loadingMore && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
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
              {!hasMore && !loading && (
                <p className="text-center text-gray-400 py-8">End of results • Try a different search or filter</p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
