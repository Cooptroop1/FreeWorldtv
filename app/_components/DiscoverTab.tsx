
'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Film, Loader2, MonitorPlay, Heart, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  pauseInfiniteScroll: boolean;   // ← NEW (this fixes the error)
}

export default function DiscoverTab({
  searchQuery, setSearchQuery, debouncedSearch, region, contentType,
  favorites, toggleFavorite, selectedTitle, setSelectedTitle,
  minYearFilter, maxYearFilter, minRatingFilter,
  lastUpdated, setLastUpdated,
  surpriseMe, showFilters, setShowFilters,
  setMinYearFilter, setMaxYearFilter, setMinRatingFilter, setContentType,
  pauseInfiniteScroll   // ← NEW (this fixes the error)
}: DiscoverTabProps) {
  const [allTitles, setAllTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pauseInfinite, setPauseInfinite] = useState(false);
  const [page, setPage] = useState(1);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
    // Real Trending + New Releases (automatically updates when you switch Movies/TV/All)
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [newReleasesItems, setNewReleasesItems] = useState<any[]>([]);
  const [carouselsLoading, setCarouselsLoading] = useState(false);

  const postersFetched = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevSearchRef = useRef(debouncedSearch);
  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

  // Dynamic page title
  useEffect(() => {
    document.title = debouncedSearch
      ? `Free "${debouncedSearch}" Movies & TV Shows | FreeStream World`
      : 'FreeStream World - Watch Free Movies & TV Shows Legally';
  }, [debouncedSearch]);

  // Scroll to top on search change
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      prevSearchRef.current = debouncedSearch;
      setAllTitles([]);
      setPage(1);
      setHasMore(true);
    }
  }, [debouncedSearch]);
  
        // Initial fetch - now uses full_free_catalog snapshot (Content Type only)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setAllTitles([]);
      setPage(1);
      setHasMore(true);
      setIsUsingFallback(false);
      try {
        let url = `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=1`;
        if (debouncedSearch) {
          url = `/api/cached-fetch?query=${encodeURIComponent(debouncedSearch)}&region=${region}&page=1`;
        }
        const res = await fetch(url);
        const json = await res.json();
        let newTitles: any[] = json.success && json.titles?.length ? json.titles : [];
        if (newTitles.length === 0) {
          if (debouncedSearch) {
            newTitles = [];
          } else {
            newTitles = staticFallbackTitles;
            setIsUsingFallback(true);
          }
        } else {
          setIsUsingFallback(false);
        }
        setAllTitles(newTitles);
        setHasMore(newTitles.length >= 48);
        if (json.success) setLastUpdated(new Date().toISOString());
      } catch (err) {
        console.error(err);
        setAllTitles(debouncedSearch ? [] : staticFallbackTitles);
        setIsUsingFallback(!debouncedSearch);
        setHasMore(false);
      }
      setLoading(false);
    };
    fetchData();
  }, [debouncedSearch, region, contentType]);

    // Load more (Content Type only)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || pauseInfinite) return;
    setLoadingMore(true);
    try {
      let url = `/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=${page + 1}`;
      if (debouncedSearch) {
        url = `/api/cached-fetch?query=${encodeURIComponent(debouncedSearch)}&region=${region}&page=${page + 1}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      const newTitles = json.success && json.titles?.length ? json.titles : staticFallbackTitles;
      setAllTitles(prev => [...prev, ...newTitles]);
      setPage(prev => prev + 1);
      setHasMore(newTitles.length >= 48);
    } catch (err) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [page, debouncedSearch, region, contentType, loadingMore, hasMore, pauseInfinite]);

    // Infinite scroll observer (now respects Legal button pause from MainApp)
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

  // Optimized poster fetching
  useEffect(() => {
    if (!allTitles?.length || !TMDB_READ_TOKEN) return;
    const titlesNeedingPoster = allTitles.filter((title: any) =>
      title.tmdb_id && title.tmdb_type && (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
    );
    if (titlesNeedingPoster.length === 0) return;

    const fetchWithLimit = async () => {
      const batch = titlesNeedingPoster.slice(0, 8);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const endpoint = title.tmdb_type === 'movie' ? 'movie' : 'tv';
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
      setAllTitles(prev => prev.map(title => updates.find((u: any) => u.id === title.id) || title));
    };
    fetchWithLimit();
  }, [allTitles, TMDB_READ_TOKEN]);
    // Poster fetching for Trending & New Releases carousels (fixes black images)
  useEffect(() => {
    if (!TMDB_READ_TOKEN) return;

    const carouselItems = [...trendingItems, ...newReleasesItems];
    const titlesNeedingPoster = carouselItems.filter((title: any) =>
      title.tmdb_id && title.tmdb_type && (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
    );

    if (titlesNeedingPoster.length === 0) return;

    const fetchWithLimit = async () => {
      const batch = titlesNeedingPoster.slice(0, 6);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const endpoint = title.tmdb_type === 'movie' ? 'movie' : 'tv';
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

      // Update both carousels safely
      setTrendingItems(prev => prev.map(title => updates.find((u: any) => u.id === title.id) || title));
      setNewReleasesItems(prev => prev.map(title => updates.find((u: any) => u.id === title.id) || title));
    };

    fetchWithLimit();
  }, [trendingItems, newReleasesItems, TMDB_READ_TOKEN]);
  
  // Fetch REAL Trending and New Releases (respects Movies Only / TV Shows Only filter)
  useEffect(() => {
    const fetchCarousels = async () => {
      if (debouncedSearch) return; // hide carousels during search (same as before)
      setCarouselsLoading(true);
      try {
        const typesParam = encodeURIComponent(contentType);

        // Real Trending Now
        const trendRes = await fetch(`/api/cached-fetch?types=${typesParam}&section=trending`);
        const trendJson = await trendRes.json();
        if (trendJson.success) setTrendingItems(trendJson.titles || []);

        // Real New Releases This Week
        const newRes = await fetch(`/api/cached-fetch?types=${typesParam}&section=new-releases`);
        const newJson = await newRes.json();
        if (newJson.success) setNewReleasesItems(newJson.titles || []);
      } catch (err) {
        console.error("Carousel fetch failed:", err);
      } finally {
        setCarouselsLoading(false);
      }
    };

    fetchCarousels();
  }, [contentType, debouncedSearch]);

    // Backend already handles filtering (only Content Type)
  const filteredTitles = allTitles;

  const continueWatching = favorites.length > 0 ? favorites : filteredTitles.slice(0, 20);

  // SEO JSON-LD
  const jsonLd = useMemo(() => JSON.stringify({
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
        "image": title.poster_path ? `https://image.tmdb.org/t/p/w342${title.poster_path}` : undefined,
        "datePublished": title.year ? `${title.year}-01-01` : undefined,
      }
    }))
  }), [debouncedSearch, filteredTitles]);

    const clearFilters = () => {
    // Content Type is controlled by parent, so we just reset the others if they exist
    setMinYearFilter('');
    setMaxYearFilter('');
    setMinRatingFilter(0);
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

  const SkeletonPoster = () => <div className="flex-shrink-0 w-40 h-60 bg-zinc-800 rounded-xl animate-pulse" aria-hidden="true" />;

                                        const HorizontalCarousel = ({ title, items, loadingKey }: { title: string; items: any[]; loadingKey: 'initial' | 'more' }) => {
    const isLoading = loadingKey === 'initial' ? loading : loadingMore;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(items.length > 4);

    // Update arrow visibility
    const updateArrows = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      setShowLeft(el.scrollLeft > 10);
      setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    }, []);

    // Arrow checks + ResizeObserver
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const ro = new ResizeObserver(updateArrows);
      ro.observe(el);

      el.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows);

      requestAnimationFrame(() => {
        updateArrows();
        setTimeout(updateArrows, 150);
        setTimeout(updateArrows, 500);
      });

      return () => {
        ro.disconnect();
        el.removeEventListener('scroll', updateArrows);
        window.removeEventListener('resize', updateArrows);
      };
    }, [items, updateArrows]);

    const scrollLeft = () => {
      scrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
    };

    const scrollRight = () => {
      scrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
    };

    return (
      <section className="mb-10 relative" aria-labelledby={`carousel-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h2 id={`carousel-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-2xl font-bold mb-4 px-4 flex items-center gap-3">
          {title} {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
        </h2>
        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={scrollLeft}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all shadow-lg ${showLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Scroll Container — FIXED scrolling (grab + full touch) */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-6 px-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap touch-pan-x overscroll-x-contain select-none cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            onScroll={updateArrows}
          >
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonPoster key={i} />)
            ) : items.length > 0 ? (
              items.map((item) => {
                const isFavorite = favorites.some(fav => fav.id === item.id);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedTitle(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedTitle(item);
                      }
                    }}
                    className="flex-shrink-0 w-40 snap-start cursor-pointer group text-left flex flex-col active:scale-95 transition-transform"
                    aria-label={`View details for ${item.title} (${item.year})`}
                  >
                    <div className="relative aspect-[2/3] bg-gray-700 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                      {item.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                          alt={`${item.title} poster`}
                          fill
                          className="object-cover"
                          sizes="160px"
                          quality={75}
                          loading="lazy"
                          unoptimized={true}
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 animate-pulse" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                        aria-label={isFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
                      >
                        <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} />
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col justify-end mt-2">
                      <p className="text-sm line-clamp-2 text-center text-gray-200 group-hover:text-white">{item.title}</p>
                      <p className="text-xs text-center text-gray-400">{item.year}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 italic">No titles in this section yet</p>
            )}
          </div>

          {/* Right Arrow */}
          <button
            onClick={scrollRight}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all shadow-lg ${showRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Scroll right"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </section>
    );
  };

  return (
    <>
      {isUsingFallback && !debouncedSearch && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center py-3 px-6 rounded-2xl mx-auto max-w-2xl mb-8 text-sm" role="alert">
          Temporarily using cached titles (Watchmode is slow right now).<br />
          Everything still works — refreshes automatically every 24 hours.
        </div>
      )}

      {(loading || allTitles.length > 0) && (
        <section className="max-w-7xl mx-auto" aria-labelledby="discover-main">
          {/* Welcome box */}
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

          {lastUpdated && (
            <div className="text-center text-xs text-emerald-400 mb-6" aria-live="polite">
              Updated {(() => { const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000); return diff === 0 ? 'just now' : `${diff} hour${diff > 1 ? 's' : ''} ago`; })()} • Refreshes automatically every 24 hours
            </div>
          )}

          {/* Hero */}
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

          <HorizontalCarousel title="Continue Watching" items={continueWatching} loadingKey="initial" />
          <HorizontalCarousel title="Trending Now" items={trendingItems} loadingKey="initial" />
          <HorizontalCarousel title="New Releases This Week" items={newReleasesItems} loadingKey="initial" />
         {favorites.length > 0 && <HorizontalCarousel title="Because You Favorited..." items={favorites.slice(0, 20)} loadingKey="initial" />}

                              {/* Filters Panel — ONLY Content Type (no genres, no year, no rating) */}
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
                <h4 className="text-2xl font-bold">Content Type</h4>
                <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                  <X size={16} /> Reset
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3">Choose what to show</p>
                <div className="flex gap-3" role="group" aria-label="Content type filter">
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

            {/* MAIN GRID */}
            <div className="min-h-[600px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6" aria-labelledby="all-titles-heading">
                            {loading ? (
                Array.from({ length: 30 }).map((_, i) => <MovieCardSkeleton key={i} />)
              ) : (
                filteredTitles.map((title: any, index: number) => {
                  const isFavorite = favorites.some(fav => fav.id === title.id);
                  const shareUrl = `https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`;
                  const shareText = `Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal.`;
                  return (
                    <button
                      key={title.id}
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
                            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                            quality={75}
                            priority={index < 3}
                            loading={index < 3 ? "eager" : "lazy"}
                            onLoadingComplete={(img) => { img.dataset.loaded = 'true'; }}
                          />
                        ) : (
                          // ← This is the magic: grey skeleton while poster loads in background
                          <div className="w-full h-full bg-zinc-800 animate-pulse" />
                        )}
                        {/* Hover overlay — now fully accessible */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(title); }}
                            aria-label={isFavorite ? `Remove ${title.title} from favorites` : `Add ${title.title} to favorites`}
                            className="text-white hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <Heart size={28} className={isFavorite ? "fill-red-500" : ""} />
                          </button>
                          <div className="flex gap-5">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }}
                              aria-label="Copy link"
                              className="text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl"
                            >
                              📋
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); }}
                              aria-label="Share on X"
                              className="text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl"
                            >
                              𝕏
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); }}
                              aria-label="Share on Facebook"
                              className="text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl"
                            >
                              📘
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank'); }}
                              aria-label="Share on WhatsApp"
                              className="text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl"
                            >
                              💬
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-end">
                        <h4 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">{title.title}</h4>
                        <p className="text-gray-400 text-sm">{title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}</p>
                        <button
                          className="mt-auto w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium transition-all"
                          onClick={(e) => { e.stopPropagation(); setSelectedTitle(title); }}
                        >
                          View Free Sources
                        </button>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* SEO JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

            {hasMore && (
              <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-12" aria-live="polite">
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
