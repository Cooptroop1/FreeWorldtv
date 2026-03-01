'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Tv, Film, Radio, MonitorPlay, ChevronRight, Search, Loader2, Plus, Trash2, Heart, Star, Shuffle, Filter } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { staticFallbackTitles } from '../../lib/static-fallback-titles';
// Use env vars (set in Vercel/Render)
const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';
// Public live channels (official links)
const liveChannels = [
  { id: 1, name: 'BBC iPlayer (Live & On-Demand)', category: 'BBC Channels', officialUrl: 'https://www.bbc.co.uk/iplayer' },
  { id: 2, name: 'ITVX (ITV Hub – Live & Catch-up)', category: 'ITV Channels', officialUrl: 'https://www.itv.com/watch' },
  { id: 3, name: 'Channel 4 (Live & On-Demand)', category: 'Channel 4 Family', officialUrl: 'https://www.channel4.com' },
  { id: 4, name: 'My5 (Channel 5 Live & Catch-up)', category: 'Channel 5 Family', officialUrl: 'https://www.my5.tv' },
  { id: 5, name: 'UKTV Play (Drama, Gold, Dave, etc.)', category: 'UKTV Channels', officialUrl: 'https://www.uktvplay.co.uk' },
  { id: 6, name: 'STV Player (Scottish ITV)', category: 'Scottish TV', officialUrl: 'https://player.stv.tv' },
  { id: 7, name: 'S4C Clic (Welsh Language)', category: 'Welsh TV', officialUrl: 'https://s4c.cymru/clic' },
  { id: 8, name: 'BBC Sounds (Radio & Podcasts)', category: 'BBC Audio', officialUrl: 'https://www.bbc.co.uk/sounds' },
  { id: 9, name: 'Pluto TV UK (FAST Channels)', category: 'Free Ad-Supported TV', officialUrl: 'https://pluto.tv/en/live-tv' },
  { id: 10, name: 'Tubi (if available in your region)', category: 'Free Movies & Shows', officialUrl: 'https://tubitv.com' },
];
// Genres
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
export default function ClientTabs() {
  const [tab, setTab] = useState<'discover' | 'live' | 'mylinks' | 'favorites' | 'top10'>('discover');
  const [data, setData] = useState<any>(null);
  const [allTitles, setAllTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pauseInfinite, setPauseInfinite] = useState(false);
  const [region, setRegion] = useState('US');
  const [contentType, setContentType] = useState('movie,tv_series');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [topGenre, setTopGenre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [relatedTitles, setRelatedTitles] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const toggleFavorite = (title: any) => {
    const isFav = favorites.some(fav => fav.id === title.id);
    if (isFav) {
      setFavorites(favorites.filter(fav => fav.id !== title.id));
    } else {
      setFavorites([...favorites, title]);
    }
  };
  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);
  const [customLinks, setCustomLinks] = useState<{ id: number; name: string; url: string }[]>([]);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem('customLinks');
    if (saved) setCustomLinks(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('customLinks', JSON.stringify(customLinks));
  }, [customLinks]);
  const addCustomLink = () => {
    if (newLinkName.trim() && newLinkUrl.trim().startsWith('http')) {
      setCustomLinks([...customLinks, { id: Date.now(), name: newLinkName.trim(), url: newLinkUrl.trim() }]);
      setNewLinkName('');
      setNewLinkUrl('');
    }
  };
  const deleteCustomLink = (id: number) => {
    setCustomLinks(customLinks.filter(link => link.id !== id));
  };
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  // FIXED: postersFetched Set (prevents duplicates + clears on filter changes)
  const postersFetched = useRef(new Set<number>());
  // Providers with logos (kept for future use / consistency)
  const [allProviders, setAllProviders] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAllProviders(data.providers);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (tab !== 'discover' && tab !== 'top10') return;
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
          setData(json);
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
  }, [tab, region, contentType, debouncedSearch, selectedGenre, topGenre]);
  useEffect(() => {
    if (tab !== 'discover') {
      if (observerRef.current) observerRef.current.disconnect();
      return;
    }
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
  }, [hasMore, loadingMore, loading, page, region, contentType, debouncedSearch, selectedGenre, tab, pauseInfinite]);
  // FIXED + IMPROVED: poster fetching (retries missing posters + only new ones)
  useEffect(() => {
    if (!allTitles?.length || !TMDB_READ_TOKEN) return;
    const fetchPosters = async () => {
      const titlesNeedingPoster = allTitles.filter((title: any) =>
        title.tmdb_id &&
        title.tmdb_type &&
        (!title.poster_path || !postersFetched.current.has(title.tmdb_id))
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
  useEffect(() => {
    if (!selectedTitle?.tmdb_id || !TMDB_READ_TOKEN) {
      setRelatedTitles([]);
      return;
    }
    const fetchRelated = async () => {
      const type = selectedTitle.tmdb_type === 'movie' ? 'movie' : 'tv';
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${selectedTitle.tmdb_id}/similar?language=en-US&page=1`,
          {
            headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` },
          }
        );
        const json = await res.json();
        setRelatedTitles(json.results?.slice(0, 8) || []);
      } catch {
        setRelatedTitles([]);
      }
    };
    fetchRelated();
  }, [selectedTitle]);
  useEffect(() => {
    if (!selectedTitle || tab !== 'discover') {
      setSources([]);
      setSourcesLoading(false);
      return;
    }
    const fetchSources = async () => {
      setSourcesLoading(true);
      try {
        const res = await fetch(`/api/title-sources?id=${selectedTitle.id}&region=${region}`);
        const json = await res.json();
        if (json.success) setSources(json.freeSources || []);
        else setSources([]);
      } catch {
        setSources([]);
      }
      setSourcesLoading(false);
    };
    fetchSources();
  }, [selectedTitle, region, tab]);
  useEffect(() => {
    if (!selectedChannel || !videoRef.current) return;
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    playerRef.current = videojs(videoRef.current, {
      autoplay: 'muted',
      muted: true,
      controls: true,
      fluid: true,
      bigPlayButton: true,
      html5: {
        vhs: {
          overrideNative: !isSafari,
          withCredentials: false,
          bandwidth: 2000000,
        },
        nativeAudioTracks: isSafari,
        nativeVideoTracks: isSafari,
      },
      sources: [{ src: selectedChannel.url, type: 'application/x-mpegURL' }],
    });
    playerRef.current.on('error', () => {
      const err = playerRef.current.error();
      console.error('[VideoJS Error]', err);
      setError(`Playback failed: ${err?.message || 'Unknown error'}`);
    });
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [selectedChannel]);
  const clearSearch = () => {
    setSearchQuery('');
    setSelectedGenre('');
  };
  const shareTitle = (title: any) => {
    const url = `https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`;
    const text = `Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal streaming.`;
    if (navigator.share) {
      navigator.share({ title: title.title, text, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };
  const getHoursAgo = () => {
    if (!lastUpdated) return 'just now';
    const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000);
    return diff === 0 ? 'just now' : `${diff} hour${diff > 1 ? 's' : ''} ago`;
  };
  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenresFilter, setSelectedGenresFilter] = useState<number[]>([]);
  const [minYearFilter, setMinYearFilter] = useState('');
  const [maxYearFilter, setMaxYearFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  // Filtered titles (respects contentType)
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
  // FIXED: Surprise Me now navigates to the title page (no more old modal)
  const surpriseMe = () => {
    if (filteredTitles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredTitles.length);
    window.location.href = `/title/${filteredTitles[randomIndex].id}`;
  };
  const toggleGenreFilter = (genreId: number) => {
    if (selectedGenresFilter.includes(genreId)) {
      setSelectedGenresFilter(selectedGenresFilter.filter(id => id !== genreId));
    } else {
      setSelectedGenresFilter([...selectedGenresFilter, genreId]);
    }
  };
  // === SKELETON LOADER (no flicker) ===
  const SkeletonPoster = () => (
    <div className="flex-shrink-0 w-40 h-60 bg-zinc-800 rounded-xl animate-pulse" />
  );
  // Netflix-style carousel with skeletons
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
                <Link href={`/title/${item.id}`} key={item.id}>
                  <div className="flex-shrink-0 w-40 snap-start cursor-pointer group">
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
                </Link>
              );
            })
          ) : (
            <div className="text-gray-500 italic">No titles in this section yet</div>
          )}
        </div>
      </div>
    );
  };
  const trending = filteredTitles.slice(0, 12);
  const newReleases = filteredTitles.slice(12, 24);
  const continueWatching = favorites.length > 0 ? favorites : filteredTitles.slice(0, 8);
  useEffect(() => {
    let newTitle = 'FreeStream World - Free Movies, TV Shows & Live TV';
    if (tab === 'discover') {
      newTitle = debouncedSearch
        ? `Free Results for "${debouncedSearch}" - FreeStream World`
        : 'Popular Free Titles - FreeStream World';
    } else if (tab === 'top10') {
      newTitle = 'Top 10 Free Titles - FreeStream World';
    } else if (tab === 'live') {
      newTitle = 'Live & Free UK TV - FreeStream World';
    } else if (tab === 'mylinks') {
      newTitle = 'My Custom Streams - FreeStream World';
    } else if (tab === 'favorites') {
      newTitle = `My Favorites (${favorites.length}) - FreeStream World`;
    }
    document.title = newTitle;
  }, [tab, debouncedSearch, favorites.length]);
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-8">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 p-4 mb-6 rounded-lg text-center text-sm md:text-base">
          <strong>Important Disclaimer:</strong> We do NOT host, stream, or embed any video content. All links go directly to official, legal providers (Tubi, Pluto TV, BBC iPlayer, etc.). Some services are geo-restricted, require a TV licence, or need a VPN. We are not responsible for content availability or legality. User-added links in "My Links" are your responsibility — do NOT add copyrighted or illegal streams.
        </div>
      
        {/* BRAND ROW — HEADING LEFT + YOUR PWA LOGO RIGHT (same line, top right) */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold flex items-center gap-4">
            <MonitorPlay className="w-12 h-12 text-blue-500" />
            FreeStream World
          </h1>
       
          {/* YOUR PWA LOGO — placed exactly where you asked */}
          <Image
            src="/logo.png"
            alt="FreeStream World Logo"
            width={88}
            height={88}
            className="rounded-2xl shadow-2xl ring-1 ring-white/10 flex-shrink-0 hover:scale-105 transition-transform"
            priority
          />
        </div>
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Free movies, TV shows & live channels worldwide — no sign-up needed
        </p>
        {/* SINGLE CLEAN GLOBAL SEARCH BAR */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex-1 relative min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search free movies & shows anywhere..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={surpriseMe}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-6 py-3 rounded-xl font-medium transition-all"
          >
            <Shuffle size={20} /> Surprise Me
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
          >
            <Filter size={20} /> Filters
          </button>
        </div>
        {/* Tab navigation ONLY */}
        <div className="flex flex-wrap gap-4 md:gap-6 mb-8 border-b border-gray-700 pb-4">
          <button
            onClick={() => setTab('discover')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${
              tab === 'discover' ? 'border-b-4 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tv size={20} /> Discover
          </button>
          <button
            onClick={() => setTab('live')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${
              tab === 'live' ? 'border-b-4 border-green-500 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio size={20} /> Live TV
          </button>
          <button
            onClick={() => setTab('mylinks')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${
              tab === 'mylinks' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Plus size={20} /> My Links
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${
              tab === 'favorites' ? 'border-b-4 border-red-500 text-red-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Heart size={20} /> Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setTab('top10')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${
              tab === 'top10' ? 'border-b-4 border-yellow-500 text-yellow-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star size={20} /> Top 10
          </button>
        </div>
      </header>
      {/* Discover Tab — FULL NETFLIX CAROUSELS + SKELETONS + PUBLISHER BOX + SEO */}
      {tab === 'discover' && (
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
                  Updated {getHoursAgo()} • Refreshes automatically every 24 hours
                </div>
              )}
              {/* Hero Banner — NOW FIXED with safe fallback (no broken image) */}
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
                    <Link href={`/title/${filteredTitles[0].id}`}>
                      <button className="bg-white text-black px-10 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition">
                        ▶ Watch Free Now
                      </button>
                    </Link>
                  </div>
                </div>
              )}
              {/* RESTORED NETFLIX CAROUSELS WITH SKELETONS (no flicker) */}
              <HorizontalCarousel title="Continue Watching" items={continueWatching} loadingKey="initial" />
              <HorizontalCarousel title="Trending Now" items={trending} loadingKey="initial" />
              <HorizontalCarousel title="New Releases This Week" items={newReleases} loadingKey="initial" />
              {favorites.length > 0 && (
                <HorizontalCarousel title="Because You Favorited..." items={favorites.slice(0, 10)} loadingKey="initial" />
              )}
              {/* Original Grid + FULL SEO JSON-LD */}
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
                      <Link href={`/title/${title.id}`} key={title.id}>
                        <div className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative">
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
                            >
                              View Free Sources
                            </button>
                          </div>
                        </div>
                      </Link>
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
                          "url": `https://freestreamworld.com/title/${title.id}`,
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
      )}
      {/* Top 10 Tab */}
      {tab === 'top10' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
            <Star className="text-yellow-400" size={32} />
            Top 10 Free Titles
          </h2>
          <p className="text-yellow-400 mb-4 text-center text-sm">
            Links only — we do not host videos. All content from official sources.
          </p>
          <p className="text-gray-400 mb-8 text-lg">
            The most popular free movies and shows available in your region right now.
          </p>
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <p className="text-xl">Loading top 10...</p>
            </div>
          )}
          {error && <div className="text-red-500 text-center py-20 text-xl">Error: {error}</div>}
          {!loading && allTitles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
              {allTitles.slice(0, 10).map((title: any) => (
                <Link href={`/title/${title.id}`} key={title.id}>
                  <div className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative">
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
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">
                        {title.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}
                      </p>
                      <button
                        className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium transition-all"
                      >
                        View Free Sources
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
      {/* Live TV Tab */}
      {tab === 'live' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
            <Radio className="text-purple-400" size={32} />
            Live & Free UK TV Services
          </h2>
          <p className="text-yellow-400 mb-4 text-center text-sm">
            Links only — we do not host videos. All content from official sources.
          </p>
          <p className="text-gray-400 mb-10 text-lg">
            Click any service to open the official live or catch-up player in a new tab.<br />
            Some require a UK TV licence or VPN if you're outside the UK.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
            {liveChannels.map((channel) => (
              <div
                key={channel.id}
                className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 backdrop-blur-sm flex flex-col"
              >
                <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
                  <Radio className="w-16 h-16 text-purple-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-purple-300 transition-colors">
                    {channel.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">{channel.category}</p>
                  <div className="flex-grow"></div>
                  <a
                    href={channel.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium text-center transition-colors shadow-md"
                  >
                    Watch Live / Catch-up →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* My Custom Links Tab */}
      {tab === 'mylinks' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
            <Plus className="text-purple-400" size={32} />
            My Custom Streams
          </h2>
          <div className="bg-red-900/50 border border-red-600 text-red-200 p-4 mb-6 rounded-lg">
            <strong>Legal Warning:</strong> Only add public, legal, non-copyrighted streams. Do NOT add pirated or illegal links. You are solely responsible.
          </div>
          <p className="text-gray-400 mb-6 text-lg">
            Add your own HLS/m3u8 links. Saved in your browser only.
          </p>
          <div className="bg-gray-800/50 p-6 rounded-xl mb-10 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g. My Sports Channel"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Stream URL</label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              onClick={addCustomLink}
              disabled={!newLinkName.trim() || !newLinkUrl.trim().startsWith('http')}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Link
            </button>
          </div>
          {customLinks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
              {customLinks.map((link) => (
                <div
                  key={link.id}
                  className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 backdrop-blur-sm flex flex-col"
                >
                  <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
                    <Radio className="w-16 h-16 text-purple-600 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-purple-300 transition-colors">
                      {link.name}
                    </h3>
                    <div className="flex-grow"></div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedChannel(link)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => deleteCustomLink(link.id)}
                        className="bg-red-600/70 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-xl text-gray-300">
              No custom links added yet.<br />
              Paste a public HLS/m3u8 URL above to start.
            </div>
          )}
        </section>
      )}
      {/* Favorites Tab */}
      {tab === 'favorites' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
            <Heart className="text-red-400" size={32} />
            My Favorites ({favorites.length})
          </h2>
          <p className="text-yellow-400 mb-4 text-center text-sm">
            Links only — we do not host videos.
          </p>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
              {favorites.map((title: any) => {
                const shareUrl = `https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`;
                const shareText = `Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal.`;
                return (
                  <Link href={`/title/${title.id}`} key={title.id}>
                    <div className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative">
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
                          <Heart size={20} className="fill-red-500 text-red-500" />
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
                        >
                          View Free Sources
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-xl text-gray-300">
              No favorites saved yet.<br />
              Go to Discover tab and click the heart.
            </div>
          )}
        </section>
      )}
      {/* Player Modal (only for My Links) */}
      {selectedChannel && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="w-full max-w-6xl bg-gray-900/95 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Radio size={24} className="text-purple-400" />
                {selectedChannel.name}
              </h2>
              <button
                onClick={() => setSelectedChannel(null)}
                className="text-gray-400 hover:text-white text-4xl leading-none"
              >
                ×
              </button>
            </div>
            <div data-vjs-player className="aspect-video bg-black">
              <video
                ref={videoRef}
                className="video-js vjs-big-play-centered vjs-fluid"
                playsInline
              />
            </div>
          </div>
        </div>
      )}
      {/* FLOATING LEGAL BUTTON */}
      {tab === 'discover' && allTitles.length > 8 && (
        <button
          onClick={() => {
            const footer = document.querySelector('footer');
            footer?.scrollIntoView({ behavior: 'smooth' });
            setPauseInfinite(true);
            setTimeout(() => setPauseInfinite(false), 10000);
          }}
          className="fixed bottom-8 right-8 z-50 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transition-all hover:scale-105"
        >
          Legal & Links
          <ChevronRight size={20} />
        </button>
      )}
      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => setShowFilters(false)}
              className="absolute top-6 right-6 text-4xl text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6">Advanced Filters</h2>
            <div className="mb-6">
              <h3 className="font-medium mb-3">Genres</h3>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {genres.map(g => (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGenresFilter.includes(g.id)}
                      onChange={() => toggleGenreFilter(g.id)}
                      className="accent-blue-500"
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm mb-1">From Year</label>
                <input
                  type="number"
                  value={minYearFilter}
                  onChange={(e) => setMinYearFilter(e.target.value)}
                  placeholder="1900"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">To Year</label>
                <input
                  type="number"
                  value={maxYearFilter}
                  onChange={(e) => setMaxYearFilter(e.target.value)}
                  placeholder="2026"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                />
              </div>
            </div>
            <div className="mb-8">
              <label className="block text-sm mb-2">Minimum Rating</label>
              <select
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              >
                <option value={0}>Any Rating</option>
                <option value={6}>6+</option>
                <option value={7}>7+</option>
                <option value={8}>8+</option>
              </select>
            </div>
            <div className="mb-8">
              <label className="block text-sm font-medium mb-2">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3"
              >
                <option value="movie,tv_series">All (Movies &amp; TV Shows)</option>
                <option value="movie">Movies Only</option>
                <option value="tv_series">TV Shows Only</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedGenresFilter([]);
                  setMinYearFilter('');
                  setMaxYearFilter('');
                  setMinRatingFilter(0);
                  setContentType('movie,tv_series');
                }}
                className="flex-1 py-3 bg-gray-700 rounded-xl"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-blue-600 rounded-xl font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="max-w-7xl mx-auto mt-20 text-center text-gray-500 text-sm">
        <p>Only public & official free streams. All content belongs to its original owners. We do not host, embed, or control any video playback — all links go to official sources. Some services may require VPN, TV licence, or geo-availability. Availability changes and is not guaranteed.</p>
        <p className="mt-2">
          <a href="/about" className="text-blue-400 hover:underline mx-2">About</a> |
          <a href="/privacy" className="text-blue-400 hover:underline mx-2">Privacy Policy</a> |
          <a href="/terms" className="text-blue-400 hover:underline mx-2">Terms of Service</a>
        </p>
        <p className="mt-2">Powered by Watchmode & TMDB • Not affiliated with any streaming service.</p>
      </footer>
    </main>
  );
}
