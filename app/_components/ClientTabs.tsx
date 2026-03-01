'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Tv, Film, Globe, X, Radio, MonitorPlay, ChevronLeft, ChevronRight, Search, Loader2, Plus, Trash2, Heart, Star } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { staticFallbackTitles } from '../lib/static-fallback-titles';

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
  // NEW: More Like This + Cache freshness
  const [relatedTitles, setRelatedTitles] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Favorites (localStorage)
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
  // Custom links
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
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  // DYNAMIC PAGE TITLE FOR SEO
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
  // Fetch titles with infinite scroll + static fallback
  useEffect(() => {
    if (tab !== 'discover' && tab !== 'top10') return;
    const fetchData = async (isLoadMore = false) => {
      if (!isLoadMore) {
        setLoading(true);
        setAllTitles([]);
        setPage(1);
        setHasMore(true);
        setError(null);
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
          if (json.success) setLastUpdated(new Date().toISOString()); // ← NEW: record fresh cache time
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
  // Infinite scroll observer
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
  // TMDB posters
  useEffect(() => {
    if (!allTitles?.length || !TMDB_READ_TOKEN) return;
    const fetchPosters = async () => {
      const updatedTitles = await Promise.all(
        allTitles.map(async (title: any) => {
          if (!title.tmdb_id || !title.tmdb_type) return title;
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
      setAllTitles(updatedTitles);
    };
    fetchPosters();
  }, [allTitles, TMDB_READ_TOKEN]);
  // NEW: Fetch "More Like This" (just like Netflix/Tubi/Reelgood)
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
  // Sources fetch
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
  // Video.js player
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
  // Share function
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
  // NEW: Helper to show "Updated X hours ago"
  const getHoursAgo = () => {
    if (!lastUpdated) return 'just now';
    const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000);
    return diff === 0 ? 'just now' : `${diff} hour${diff > 1 ? 's' : ''} ago`;
  };
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-8">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 p-4 mb-6 rounded-lg text-center text-sm md:text-base">
          <strong>Important Disclaimer:</strong> We do NOT host, stream, or embed any video content. All links go directly to official, legal providers (Tubi, Pluto TV, BBC iPlayer, etc.). Some services are geo-restricted, require a TV licence, or need a VPN. We are not responsible for content availability or legality. User-added links in "My Links" are your responsibility — do NOT add copyrighted or illegal streams.
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 flex items-center gap-4">
          <MonitorPlay className="w-12 h-12 text-blue-500" />
          FreeStream World
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Free movies, TV shows & live channels worldwide — no sign-up needed
        </p>
        <div className="flex flex-wrap gap-4 md:gap-6 mb-8 border-b border-gray-700 pb-4">
          <button
            onClick={() => setTab('discover')}
            className={flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tab === 'discover' ? 'border-b-4 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}}
          >
            <Tv size={20} /> Discover
          </button>
          <button
            onClick={() => setTab('live')}
            className={flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tab === 'live' ? 'border-b-4 border-green-500 text-green-400' : 'text-gray-400 hover:text-white' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}}
          >
            <Radio size={20} /> Live TV
          </button>
          <button
            onClick={() => setTab('mylinks')}
            className={flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tab === 'mylinks' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}}
          >
            <Plus size={20} /> My Links
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tab === 'favorites' ? 'border-b-4 border-red-500 text-red-400' : 'text-gray-400 hover:text-white' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}}
          >
            <Heart size={20} /> Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setTab('top10')}
            className={flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tab === 'top10' ? 'border-b-4 border-yellow-500 text-yellow-400' : 'text-gray-400 hover:text-white' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}}
          >
            <Star size={20} /> Top 10
          </button>
        </div>
        {(tab === 'discover' || tab === 'top10') && (
          <div className="flex flex-wrap gap-4 md:gap-6 mb-8">
            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <Search size={20} className="text-gray-400" />
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search free movies & shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={20} />
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Tv size={20} />
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="movie,tv_series">All</option>
                <option value="movie">Movies</option>
                <option value="tv_series">TV Shows</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-lg font-medium hidden md:block">Genre:</label>
              <select value={selectedGenre || topGenre} onChange={(e) => {
                setSelectedGenre(e.target.value);
                setTopGenre(e.target.value);
              }} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Genres</option>
                {genres.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>
      {/* Discover Tab */}
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
              {/* NEW: Cache freshness badge (just like the big sites) */}
              {lastUpdated && (
                <div className="text-center text-xs text-emerald-400 mb-6">
                  Updated {getHoursAgo()} • Refreshes automatically every 24 hours
                </div>
              )}
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
                <MonitorPlay className="text-green-400" size={32} />
                {debouncedSearch ? Free Results for "${debouncedSearch}" : 'Popular Free Titles'} in {region}
              </h2>
              <p className="text-yellow-400 mb-4 text-center text-sm">
                Links only — we do not host videos. All content from official sources.
              </p>
              <p className="text-gray-400 mb-8 text-lg">
                Found {allTitles.length} titles • Scroll for more
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                {allTitles.map((title: any) => {
                  const isFavorite = favorites.some(fav => fav.id === title.id);
                  const shareUrl = https://freestreamworld.com/?title=${encodeURIComponent(title.title)};
                  const shareText = Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal.;
                  return (
                    <div
                      key={title.id}
                      onClick={() => setSelectedTitle(title)}
                      className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
                    >
                      <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
                        {title.poster_path ? (
                          <Image
                            src={https://image.tmdb.org/t/p/w500${title.poster_path}}
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
                        {/* SHARE BUTTONS */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}, '_blank'); }}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                          >
                            𝕏
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}, '_blank'); }}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                          >
                            📘
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}, '_blank'); }}
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
              {/* MOVIE STRUCTURED DATA */}
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    "name": debouncedSearch ? Free Results for "${debouncedSearch}" : "Popular Free Titles",
                    "numberOfItems": allTitles.length,
                    "itemListElement": allTitles.map((title, index) => ({
                      "@type": "ListItem",
                      "position": index + 1,
                      "item": {
                        "@type": title.type === 'tv_series' ? "TVSeries" : "Movie",
                        "name": title.title,
                        "url": https://freestreamworld.com/title/${title.id},
                        "image": title.poster_path ? https://image.tmdb.org/t/p/w500${title.poster_path} : undefined,
                        "datePublished": title.year ? ${title.year}-01-01 : undefined,
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
                <div
                  key={title.id}
                  onClick={() => setSelectedTitle(title)}
                  className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
                >
                  <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
                    {title.poster_path ? (
                      <Image
                        src={https://image.tmdb.org/t/p/w500${title.poster_path}}
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
                      onClick={(e) => { e.stopPropagation(); setSelectedTitle(title); }}
                    >
                      View Free Sources
                    </button>
                  </div>
                </div>
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
                const shareUrl = https://freestreamworld.com/?title=${encodeURIComponent(title.title)};
                const shareText = Check out "${title.title}" (${title.year}) on FreeStream World! Free & legal.;
                return (
                  <div
                    key={title.id}
                    onClick={() => setSelectedTitle(title)}
                    className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
                  >
                    <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
                      {title.poster_path ? (
                        <Image
                          src={https://image.tmdb.org/t/p/w500${title.poster_path}}
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
                      {/* SHARE BUTTONS */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}, '_blank'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          𝕏
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}, '_blank'); }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                        >
                          📘
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}, '_blank'); }}
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
          ) : (
            <div className="text-center py-20 text-xl text-gray-300">
              No favorites saved yet.<br />
              Go to Discover tab and click the heart.
            </div>
          )}
        </section>
      )}
      {/* Player Modal */}
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
      {/* Sources Modal – now with "More Like This" carousel */}
      {tab === 'discover' && selectedTitle && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900/95 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl md:text-3xl font-bold pr-10">
                  {selectedTitle.title} ({selectedTitle.year})
                </h2>
                <button
                  onClick={() => { setSelectedTitle(null); setSources([]); }}
                  className="text-gray-400 hover:text-white text-4xl leading-none"
                >
                  ×
                </button>
              </div>
              {sourcesLoading ? (
                <div className="text-center py-16 text-xl">Loading sources...</div>
              ) : sources.length > 0 ? (
                <div className="space-y-5">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <MonitorPlay size={22} /> Free Streaming Options
                  </h3>
                  {sources.map((source: any, idx: number) => (
                    <a
                      key={idx}
                      href={source.web_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-800/70 p-5 rounded-xl hover:bg-gray-700/70 transition-all border border-gray-700 hover:border-gray-500"
                    >
                      <div className="font-semibold text-lg mb-1">{source.name}</div>
                      <div className="text-gray-400 text-sm">
                        Free with Ads {source.format && • ${source.format}}
                      </div>
                      {source.web_url && (
                        <div className="mt-3 text-blue-400 text-sm font-medium">
                          Watch now →
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-300 text-lg">
                  No free sources available right now in {region}.<br />
                  Availability changes frequently — try again later!
                </div>
              )}
              {/* NEW: More Like This carousel (exactly like Netflix/Tubi) */}
              {relatedTitles.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-700">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Star className="text-yellow-400" size={20} /> More Like This
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide">
                    {relatedTitles.map((rel: any) => (
                      <div
                        key={rel.id}
                        onClick={() => {
                          setSelectedTitle({
                            id: rel.id,
                            title: rel.title || rel.name,
                            year: (rel.release_date || rel.first_air_date || '').slice(0, 4),
                            tmdb_id: rel.id,
                            tmdb_type: rel.media_type || (rel.title ? 'movie' : 'tv'),
                            poster_path: rel.poster_path
                          });
                        }}
                        className="snap-start flex-shrink-0 w-28 cursor-pointer group"
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md">
                          {rel.poster_path ? (
                            <Image
                              src={https://image.tmdb.org/t/p/w500${rel.poster_path}}
                              alt={rel.title || rel.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="112px"
                              quality={85}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <Film className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs mt-2 line-clamp-2 text-center group-hover:text-blue-300 transition-colors">
                          {rel.title || rel.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
