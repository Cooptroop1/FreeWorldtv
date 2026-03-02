'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Tv, Film, Radio, MonitorPlay, ChevronRight, Search, Loader2, Plus, Trash2, Heart, Star, Shuffle, Filter } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { staticFallbackTitles } from '../../lib/static-fallback-titles';
import InstallPrompt from './InstallPrompt';
import OfflineMessage from './OfflineMessage';
import GlobalSearch from './GlobalSearch';
import DiscoverTab from './DiscoverTab'; // ← Keep this (all heavy logic now lives here)

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

// Genres (only for the filters modal in Tabs)
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

export default function Tabs() {
  const [tab, setTab] = useState<'discover' | 'live' | 'mylinks' | 'favorites' | 'top10'>('discover');
  const [region, setRegion] = useState('US');
  const [contentType, setContentType] = useState('movie,tv_series');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [relatedTitles, setRelatedTitles] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<any[]>([]);
  const [customLinks, setCustomLinks] = useState<{ id: number; name: string; url: string }[]>([]);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [allProviders, setAllProviders] = useState<any[]>([]);

  // Filters (passed to DiscoverTab)
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenresFilter, setSelectedGenresFilter] = useState<number[]>([]);
  const [minYearFilter, setMinYearFilter] = useState('');
  const [maxYearFilter, setMaxYearFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState(0);

  // Light state for Top 10 only (no duplication of full discover logic)
  const [top10Titles, setTop10Titles] = useState<any[]>([]);
  const [top10Loading, setTop10Loading] = useState(false);

  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

  // Favorites persistence
  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (title: any) => {
    const isFav = favorites.some(fav => fav.id === title.id);
    if (isFav) {
      setFavorites(favorites.filter(fav => fav.id !== title.id));
    } else {
      setFavorites([...favorites, title]);
    }
  };

  // Custom links persistence
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Providers for logos
  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => setAllProviders(Array.isArray(data) ? data : (data.providers || [])))
      .catch(() => setAllProviders([]));
  }, []);

  // Related titles (TMDB)
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
          { headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` } }
        );
        const json = await res.json();
        setRelatedTitles(json.results?.slice(0, 8) || []);
      } catch {
        setRelatedTitles([]);
      }
    };
    fetchRelated();
  }, [selectedTitle]);

  // Sources for selected title (only in discover)
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
        setSources(json.success ? json.freeSources || [] : []);
      } catch {
        setSources([]);
      }
      setSourcesLoading(false);
    };
    fetchSources();
  }, [selectedTitle, region, tab]);

  // Video.js for live channels
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
        vhs: { overrideNative: !isSafari, withCredentials: false, bandwidth: 2000000 },
        nativeAudioTracks: isSafari,
        nativeVideoTracks: isSafari,
      },
      sources: [{ src: selectedChannel.url, type: 'application/x-mpegURL' }],
    });
    return () => {
      if (playerRef.current) playerRef.current.dispose();
    };
  }, [selectedChannel]);

  // Top 10 light fetch (no duplication of full discover logic)
  useEffect(() => {
    if (tab !== 'top10') return;
    const fetchTop10 = async () => {
      setTop10Loading(true);
      try {
        const res = await fetch(`/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=1`);
        const json = await res.json();
        setTop10Titles(json.success && json.titles?.length ? json.titles.slice(0, 10) : staticFallbackTitles.slice(0, 10));
      } catch {
        setTop10Titles(staticFallbackTitles.slice(0, 10));
      }
      setTop10Loading(false);
    };
    fetchTop10();
  }, [tab, region, contentType]);

  // Surprise Me (uses favorites as fallback since DiscoverTab owns its own filtered list)
  const surpriseMe = () => {
    if (favorites.length > 0) {
      const randomIndex = Math.floor(Math.random() * favorites.length);
      setSelectedTitle(favorites[randomIndex]);
    } else {
      alert('Add some favorites first or switch to Discover tab!');
    }
  };

  const toggleGenreFilter = (genreId: number) => {
    if (selectedGenresFilter.includes(genreId)) {
      setSelectedGenresFilter(selectedGenresFilter.filter(id => id !== genreId));
    } else {
      setSelectedGenresFilter([...selectedGenresFilter, genreId]);
    }
  };

  const getProviderLogo = (sourceName: string) => {
    if (!sourceName) return { logoUrl: null, initials: '??', color: 'from-gray-500 to-gray-600' };
    const clean = sourceName.toLowerCase().trim();
    const safeProviders = Array.isArray(allProviders) ? allProviders : [];
    let logoUrl = null;
    let color = 'from-indigo-500 to-purple-600';
    if (clean.includes('fx')) {
      const fxProvider = safeProviders.find(p => (p.name || '').toLowerCase().includes('fx'));
      logoUrl = fxProvider?.logo_100px || fxProvider?.logo_300px;
      color = 'from-orange-500 to-red-600';
    } else if (clean.includes('spectrum')) {
      const specProvider = safeProviders.find(p => (p.name || '').toLowerCase().includes('spectrum'));
      logoUrl = specProvider?.logo_100px || specProvider?.logo_300px;
      color = 'from-blue-500 to-cyan-600';
    } else if (clean.includes('bbc') || clean.includes('iplayer')) {
      const bbcProvider = safeProviders.find(p => (p.name || '').toLowerCase().includes('bbc'));
      logoUrl = bbcProvider?.logo_100px || bbcProvider?.logo_300px;
      color = 'from-blue-600 to-indigo-600';
    } else if (clean.includes('itv') || clean.includes('itvx')) {
      const itvProvider = safeProviders.find(p => (p.name || '').toLowerCase().includes('itv'));
      logoUrl = itvProvider?.logo_100px || itvProvider?.logo_300px;
    } else if (clean.includes('my5')) {
      const my5Provider = safeProviders.find(p => (p.name || '').toLowerCase().includes('my5'));
      logoUrl = my5Provider?.logo_100px || my5Provider?.logo_300px;
    } else if (clean.includes('all 4') || clean.includes('channel 4')) {
      const all4Provider = safeProviders.find(p => (p.name || '').toLowerCase().includes('all 4') || (p.name || '').toLowerCase().includes('channel 4'));
      logoUrl = all4Provider?.logo_100px || all4Provider?.logo_300px;
    } else {
      const provider = safeProviders.find(p => {
        const pName = (p.name || p.display_name || '').toLowerCase().trim();
        return pName === clean || pName.includes(clean) || clean.includes(pName);
      });
      logoUrl = provider?.logo_100px || provider?.logo_300px;
    }
    const initials = sourceName.slice(0, 2).toUpperCase();
    return { logoUrl, initials, color };
  };

  // Dynamic document title
  useEffect(() => {
    let newTitle = 'FreeStream World - Free Movies, TV Shows & Live TV';
    if (tab === 'discover') {
      newTitle = debouncedSearch ? `Free Results for "${debouncedSearch}" - FreeStream World` : 'Popular Free Titles - FreeStream World';
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

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold flex items-center gap-4">
            <MonitorPlay className="w-12 h-12 text-blue-500" />
            FreeStream World
          </h1>
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

        <div className="flex flex-wrap gap-3 mb-8">
          <GlobalSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onTitleSelect={setSelectedTitle}
            region={region}
          />
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

      <InstallPrompt />
      <OfflineMessage />

      {/* DISCOVER TAB — now runs entirely from the fast DiscoverTab component */}
      {tab === 'discover' && (
        <DiscoverTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          debouncedSearch={debouncedSearch}
          region={region}
          contentType={contentType}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          selectedTitle={selectedTitle}
          setSelectedTitle={setSelectedTitle}
          selectedGenresFilter={selectedGenresFilter}
          minYearFilter={minYearFilter}
          maxYearFilter={maxYearFilter}
          minRatingFilter={minRatingFilter}
          lastUpdated={lastUpdated}
          setLastUpdated={setLastUpdated}
          error={error}
          setError={setError}
          surpriseMe={surpriseMe}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          toggleGenreFilter={toggleGenreFilter}
          setSelectedGenresFilter={setSelectedGenresFilter}
          setMinYearFilter={setMinYearFilter}
          setMaxYearFilter={setMaxYearFilter}
          setMinRatingFilter={setMinRatingFilter}
          setContentType={setContentType}
        />
      )}

      {/* TOP 10 TAB — light fetch (no duplication) */}
      {tab === 'top10' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
            <Star className="text-yellow-400" size={32} />
            Top 10 Free Titles
          </h2>
          <p className="text-yellow-400 mb-4 text-center text-sm">
            Links only — we do not host videos. All content from official sources.
          </p>
          {top10Loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <p className="text-xl">Loading top 10...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
              {top10Titles.map((title: any) => (
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

      {/* LIVE TV TAB */}
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

      {/* MY CUSTOM LINKS TAB */}
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

      {/* FAVORITES TAB */}
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

      {/* PLAYER MODAL (live channels) */}
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
              <video ref={videoRef} className="video-js vjs-big-play-centered vjs-fluid" playsInline />
            </div>
          </div>
        </div>
      )}

      {/* SOURCES MODAL */}
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
                  {sources.map((source: any, idx: number) => {
                    const { logoUrl, initials, color } = getProviderLogo(source.name);
                    return (
                      <a
                        key={idx}
                        href={source.web_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 bg-gray-800/70 p-5 rounded-xl hover:bg-gray-700/70 transition-all border border-gray-700 hover:border-gray-500 group"
                      >
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={source.name}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-3xl shadow-inner`}>
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg group-hover:text-blue-400 transition-colors">{source.name}</div>
                          <div className="text-gray-400 text-sm">
                            Free with Ads {source.format && `• ${source.format}`}
                          </div>
                        </div>
                        <div className="text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                          Watch now →
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-300 text-lg">
                  No free sources available right now in {region}.<br />
                  Availability changes frequently — try again later!
                </div>
              )}
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
                              src={`https://image.tmdb.org/t/p/w500${rel.poster_path}`}
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

      {/* FILTERS MODAL */}
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
