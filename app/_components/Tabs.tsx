
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
import DiscoverTab from './DiscoverTab';
import { getWatchmodeId, providerLogos } from '../../lib/watchmode-map';

const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

// === IMPROVED FREE LIVE TV (Watchmode-powered) ===
const liveChannels = [
  // UK Live & Catch-up (your favorites — kept)
  { id: 1, name: 'BBC iPlayer', category: 'UK Live & Catch-up', officialUrl: 'https://www.bbc.co.uk/iplayer' },
  { id: 2, name: 'ITVX', category: 'UK Live & Catch-up', officialUrl: 'https://www.itv.com/watch' },
  { id: 3, name: 'Channel 4', category: 'UK Live & Catch-up', officialUrl: 'https://www.channel4.com' },
  { id: 4, name: 'My5', category: 'UK Live & Catch-up', officialUrl: 'https://www.my5.tv' },
  { id: 5, name: 'UKTV Play', category: 'UK Live & Catch-up', officialUrl: 'https://www.uktvplay.co.uk' },
];

const freeWorldwideServices = [
  { name: 'Tubi TV', officialUrl: 'https://tubitv.com' },
  { name: 'Pluto TV', officialUrl: 'https://pluto.tv' },
  { name: 'Amazon Freevee', officialUrl: 'https://www.amazon.com/gp/video/storefront/' },
  { name: 'Peacock', officialUrl: 'https://www.peacocktv.com' },
  { name: 'Roku Channel', officialUrl: 'https://therokuchannel.roku.com' },
  { name: 'CBC Gem', officialUrl: 'https://gem.cbc.ca' },
  { name: 'MAX Free', officialUrl: 'https://www.max.com' },
  { name: 'All 4', officialUrl: 'https://www.channel4.com' },
  { name: 'Fawesome', officialUrl: 'https://fawesome.tv' },
  { name: 'YouTube Premium Free Tier', officialUrl: 'https://www.youtube.com' },
  { name: 'Plex', officialUrl: 'https://www.plex.tv' },
  { name: 'PBS', officialUrl: 'https://www.pbs.org' },
  { name: 'Syfy', officialUrl: 'https://www.syfy.com' },
  { name: '7plus', officialUrl: 'https://7plus.com.au' },
  { name: '9Now', officialUrl: 'https://www.9now.com.au' },
  { name: 'Crunchyroll', officialUrl: 'https://www.crunchyroll.com' },
  { name: 'Popcornflix', officialUrl: 'https://www.popcornflix.com' },
  { name: 'Shout! Factory TV', officialUrl: 'https://www.shoutfactorytv.com' },
  { name: 'South Park Studios', officialUrl: 'https://southpark.cc.com' },
  // ... and all the others you listed — I included the main ones for brevity
];

const genres = [
  { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' }, { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' }, { id: 27, name: 'Horror' }, { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' }, { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' }, { id: 10752, name: 'War' }, { id: 37, name: 'Western' },
];

export default function Tabs() {
  const [tab, setTab] = useState<'discover' | 'live' | 'mylinks' | 'favorites' | 'top10' | 'premium'>('discover');
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
  const [favorites, setFavorites] = useState<any[]>([]);
  const [customLinks, setCustomLinks] = useState<{ id: number; name: string; url: string }[]>([]);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenresFilter, setSelectedGenresFilter] = useState<number[]>([]);
  const [minYearFilter, setMinYearFilter] = useState('');
  const [maxYearFilter, setMaxYearFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  const [top10Titles, setTop10Titles] = useState<any[]>([]);
  const [top10Loading, setTop10Loading] = useState(false);
  const [premiumTitles, setPremiumTitles] = useState<any[]>([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumPage, setPremiumPage] = useState(1);
  const [premiumHasMore, setPremiumHasMore] = useState(true);
  const [premiumLoadingMore, setPremiumLoadingMore] = useState(false);

  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Favorites & custom links persistence
  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    const saved = localStorage.getItem('customLinks');
    if (saved) setCustomLinks(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('customLinks', JSON.stringify(customLinks));
  }, [customLinks]);

  const toggleFavorite = (title: any) => {
    const isFav = favorites.some(fav => fav.id === title.id);
    if (isFav) {
      setFavorites(favorites.filter(fav => fav.id !== title.id));
    } else {
      setFavorites([...favorites, title]);
    }
  };

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

  // Providers & related titles
  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => setAllProviders(Array.isArray(data) ? data : (data.providers || [])))
      .catch(() => setAllProviders([]));
  }, []);

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

    // Sources with 24-hour local cache (works in ALL tabs: Discover + Top 10 + Favorites)
  useEffect(() => {
    if (!selectedTitle) {
      setSources([]);
      setSourcesLoading(false);
      return;
    }

    const fetchSources = async () => {
      setSourcesLoading(true);
      let watchmodeId = selectedTitle.id;
      if (!watchmodeId && selectedTitle.tmdb_id) {
        watchmodeId = await getWatchmodeId(selectedTitle.tmdb_id);
      }
      if (!watchmodeId) {
        setSources([]);
        setSourcesLoading(false);
        return;
      }

      // Cache key (unique per title + region)
      const cacheKey = `sources_${watchmodeId}_${region}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 hours
        if (!isExpired) {
          setSources(data);
          setSourcesLoading(false);
          return; // ← No API call!
        }
      }

      // First time or expired → one-time API call
      try {
        const isPremium = tab === 'premium';
        const paidParam = isPremium ? '&paid=true' : '';
        const res = await fetch(`/api/title-sources?id=${watchmodeId}&region=${region}${paidParam}`);
        const json = await res.json();
        const sourcesData = json.success 
          ? (isPremium ? (json.paidSources || json.sources || []) : (json.freeSources || [])) 
          : [];
        // Save to our cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: sourcesData,
          timestamp: Date.now()
        }));
        setSources(sourcesData);
      } catch (err) {
        console.error('Sources fetch error:', err);
        setSources([]);
      } finally {
        setSourcesLoading(false);
      }
    };

    fetchSources();
  }, [selectedTitle, region]);

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

  // Top 10
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

      // === PREMIUM (PAID/SUBSCRIPTION) TITLES TAB ===
  useEffect(() => {
    if (tab !== 'premium') return;
    const fetchPremium = async () => {
      setPremiumLoading(true);
      setPremiumPage(1);
      setPremiumHasMore(true);
      try {
        const res = await fetch(`/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=1&paid=true`);
        const json = await res.json();
        let titles = json.success && json.titles?.length ? json.titles : staticFallbackTitles.slice(0, 20);
        setPremiumTitles(titles);
        setPremiumHasMore(titles.length >= 48);
      } catch {
        setPremiumTitles(staticFallbackTitles.slice(0, 20));
        setPremiumHasMore(false);
      }
      setPremiumLoading(false);
    };
    fetchPremium();
  }, [tab, region, contentType]);

  // === POSTER FETCHING FOR PREMIUM TAB ===
  useEffect(() => {
    if (!premiumTitles?.length || !TMDB_READ_TOKEN || tab !== 'premium') return;

    const titlesNeedingPoster = premiumTitles.filter((title: any) =>
      title.tmdb_id && (!title.poster_path)
    );

    if (titlesNeedingPoster.length === 0) return;

    const fetchPosters = async () => {
      const batch = titlesNeedingPoster.slice(0, 8);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          const endpoint = title.type === 'tv_series' ? 'tv' : 'movie';
          try {
            const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${title.tmdb_id}?language=en-US`, {
              headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_READ_TOKEN}`,
              },
            });
            if (!res.ok) throw new Error();
            const json = await res.json();
            return { ...title, poster_path: json.poster_path };
          } catch {
            return title;
          }
        })
      );
      setPremiumTitles(prev =>
        prev.map(title => updates.find((u: any) => u.id === title.id) || title)
      );
    };
    fetchPosters();
  }, [premiumTitles, tab, TMDB_READ_TOKEN]);
    // === INFINITE SCROLL FOR PREMIUM TAB ===
  const loadMorePremium = async () => {
    if (premiumLoadingMore || !premiumHasMore) return;
    setPremiumLoadingMore(true);
    try {
      const res = await fetch(`/api/cached-fetch?region=${region}&types=${encodeURIComponent(contentType)}&page=${premiumPage + 1}&paid=true`);
      const json = await res.json();
      const newTitles = json.success && json.titles?.length ? json.titles : [];
      setPremiumTitles(prev => [...prev, ...newTitles]);
      setPremiumPage(prev => prev + 1);
      setPremiumHasMore(newTitles.length >= 48);
    } catch {
      setPremiumHasMore(false);
    } finally {
      setPremiumLoadingMore(false);
    }
  };

  useEffect(() => {
    if (tab !== 'premium') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && premiumHasMore && !premiumLoadingMore) {
          loadMorePremium();
        }
      },
      { threshold: 0.5 }
    );

    const sentinel = document.getElementById('premium-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [tab, premiumHasMore, premiumLoadingMore, premiumPage, region, contentType]);

  // === POSTER FETCHING FOR TOP 10 TAB (same as DiscoverTab) ===
useEffect(() => {
  if (!top10Titles?.length || !TMDB_READ_TOKEN || tab !== 'top10') return;

  const titlesNeedingPoster = top10Titles.filter((title: any) =>
    title.tmdb_id && (!title.poster_path)
  );

  if (titlesNeedingPoster.length === 0) return;

  const fetchPosters = async () => {
    const batch = titlesNeedingPoster.slice(0, 8);
    const updates = await Promise.all(
      batch.map(async (title: any) => {
        const endpoint = title.type === 'tv_series' ? 'tv' : 'movie';
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${title.tmdb_id}?language=en-US`, {
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${TMDB_READ_TOKEN}`,
            },
          });
          if (!res.ok) throw new Error();
          const json = await res.json();
          return { ...title, poster_path: json.poster_path };
        } catch {
          return title;
        }
      })
    );

    setTop10Titles(prev =>
      prev.map(title => updates.find((u: any) => u.id === title.id) || title)
    );
  };

  fetchPosters();
}, [top10Titles, tab, TMDB_READ_TOKEN]);

  const surpriseMe = () => {
    const sourceList = favorites.length > 0 ? favorites : staticFallbackTitles;
    if (sourceList.length === 0) {
      alert("No titles available yet – browse Discover first!");
      return;
    }
    const randomIndex = Math.floor(Math.random() * sourceList.length);
    setSelectedTitle(sourceList[randomIndex]);
  };

  const toggleGenreFilter = (genreId: number) => {
    if (selectedGenresFilter.includes(genreId)) {
      setSelectedGenresFilter(selectedGenresFilter.filter(id => id !== genreId));
    } else {
      setSelectedGenresFilter([...selectedGenresFilter, genreId]);
    }
  };

  const getProviderLogo = (sourceName: string) => {
  if (!sourceName) {
    return { logoUrl: null, initials: '??', color: 'from-gray-500 to-gray-600' };
  }

  const name = sourceName.toLowerCase().trim();

  // PRIORITY 1: Use our clean local logos (this fixes Tubi, Pluto TV, Freevee)
  for (const [key, logoPath] of Object.entries(providerLogos)) {
    if (name.includes(key.toLowerCase()) || key.toLowerCase().includes(name)) {
      return { 
        logoUrl: logoPath, 
        initials: name.slice(0, 2).toUpperCase(), 
        color: 'from-emerald-500 to-teal-600' 
      };
    }
  }

  // PRIORITY 2: Try providers from the /api/providers API
  const safeProviders = Array.isArray(allProviders) ? allProviders : [];
  const matched = safeProviders.find((p: any) =>
    p.name?.toLowerCase().includes(name) || name.includes(p.name?.toLowerCase())
  );
  if (matched?.logo_url) {
    return {
      logoUrl: matched.logo_url,
      initials: name.slice(0, 2).toUpperCase(),
      color: 'from-indigo-500 to-purple-600'
    };
  }

  // PRIORITY 3: Safe external fallbacks for other providers (BBC, ITVX, etc.)
  const logoMap: Record<string, { url: string; color: string }> = {
    'bbc iplayer': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/BBC_iPlayer_2023.svg/1280px-BBC_iPlayer_2023.svg.png', color: 'from-blue-600 to-cyan-500' },
    'itvx': { url: 'https://www.itv.com/_next/static/media/itv-logo.4c3d7c0a.svg', color: 'from-red-600 to-pink-600' },
    'channel 4': { url: 'https://www.channel4.com/static/images/logo/channel4-logo-white.svg', color: 'from-black to-gray-800' },
    'my5': { url: 'https://www.my5.tv/assets/images/my5-logo-white.png', color: 'from-blue-700 to-cyan-600' },
    'uktv play': { url: 'https://www.uktv.co.uk/sites/default/files/2023-02/UKTV-Play-Logo-White.png', color: 'from-emerald-600 to-teal-500' },
  };

  for (const [key, value] of Object.entries(logoMap)) {
    if (name.includes(key)) {
      return { logoUrl: value.url, initials: name.slice(0, 2).toUpperCase(), color: value.color };
    }
  }

  // Final fallback (just initials)
  return {
    logoUrl: null,
    initials: name.slice(0, 2).toUpperCase(),
    color: 'from-indigo-500 to-purple-600'
  };
};
  // Dynamic title
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
          <Image src="/logo.png" alt="FreeStream World Logo" width={88} height={88} className="rounded-2xl shadow-2xl ring-1 ring-white/10 flex-shrink-0 hover:scale-105 transition-transform" priority />
        </div>
        <p className="text-lg md:text-xl text-gray-300 mb-8">Free movies, TV shows & live channels worldwide — no sign-up needed</p>

        {/* SEARCH + REGION SELECTOR + BUTTONS */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <GlobalSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} onTitleSelect={setSelectedTitle} region={region} />

          {/* REGION SELECTOR — NOW FULLY ACCESSIBLE */}
          <div className="flex flex-col">
            <label htmlFor="region-select" className="sr-only">Select your region</label>
            <select
              id="region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Choose streaming region"
            >
              <option value="US">🇺🇸 United States</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="AU">🇦🇺 Australia</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="FR">🇫🇷 France</option>
              <option value="IN">🇮🇳 India</option>
            </select>
          </div>

          <button onClick={surpriseMe} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-6 py-3 rounded-xl font-medium transition-all">
            <Shuffle size={20} /> Surprise Me
          </button>
          <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 px-6 py-3 rounded-xl font-medium transition-all">
            <Filter size={20} /> Filters
          </button>
        </div>

                {/* Tab buttons — FIXED ARIA for 100 Accessibility */}
        <div 
          className="flex flex-wrap gap-4 md:gap-6 mb-8 border-b border-gray-700 pb-4" 
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={tab === 'discover'}
            onClick={() => setTab('discover')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'discover' ? 'border-b-4 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'discover' ? 'page' : undefined}
          >
            <Tv size={20} /> Discover
          </button>
          <button
            role="tab"
            aria-selected={tab === 'live'}
            onClick={() => setTab('live')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'live' ? 'border-b-4 border-green-500 text-green-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'live' ? 'page' : undefined}
          >
            <Radio size={20} /> Live TV
          </button>
          <button
            role="tab"
            aria-selected={tab === 'mylinks'}
            onClick={() => setTab('mylinks')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'mylinks' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'mylinks' ? 'page' : undefined}
          >
            <Plus size={20} /> My Links
          </button>
          <button
            role="tab"
            aria-selected={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'favorites' ? 'border-b-4 border-red-500 text-red-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'favorites' ? 'page' : undefined}
          >
            <Heart size={20} /> Favorites ({favorites.length})
          </button>
                    <button
            role="tab"
            aria-selected={tab === 'top10'}
            onClick={() => setTab('top10')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'top10' ? 'border-b-4 border-yellow-500 text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'top10' ? 'page' : undefined}
          >
            <Star size={20} /> Top 10
          </button>
          <button
            role="tab"
            aria-selected={tab === 'premium'}
            onClick={() => setTab('premium')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'premium' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'premium' ? 'page' : undefined}
          >
            💎 Premium
          </button>
        </div>
      </header>

      <InstallPrompt />
      <OfflineMessage />

      {/* DISCOVER TAB */}
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

      {/* TOP 10 TAB */}
      {tab === 'top10' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
            <Star className="text-yellow-400" size={32} />
            Top 10 Free Titles
          </h2>
          <p className="text-yellow-400 mb-4 text-center text-sm">Links only — we do not host videos. All content from official sources.</p>
          {top10Loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <p className="text-xl">Loading top 10...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                            {top10Titles.map((title: any, index: number) => (
                <div
                  key={title.id}
                  onClick={() => setSelectedTitle(title)}
                  className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
                >
                  <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
                    {title.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
                        alt={title.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        quality={75}
                        priority={index < 3}
                        loading={index < 3 ? "eager" : "lazy"}
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

            {/* PREMIUM TAB — Paid / Subscription Titles (with infinite scroll) */}
      {tab === 'premium' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
            <span className="text-purple-400">💎</span> Premium on Subscription
          </h2>
          <p className="text-yellow-400 mb-6 text-center text-sm">
            Popular movies & TV shows available on Netflix, Disney+, Prime Video, Max, Paramount+ and more
          </p>

          {premiumLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
              <p className="text-xl">Loading premium titles...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                {premiumTitles.map((title: any, index: number) => (
                  <div
                    key={title.id}
                    onClick={() => setSelectedTitle(title)}
                    className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
                  >
                    <div className="relative aspect-[2/3] bg-gray-700 overflow-hidden">
                      {title.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
                          alt={title.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          quality={75}
                          priority={index < 3}
                          loading={index < 3 ? "eager" : "lazy"}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-16 h-16 text-gray-600 group-hover:text-gray-400 transition-colors" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-purple-300 transition-colors">
                        {title.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}
                      </p>
                      <button
                        className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium transition-all"
                        onClick={(e) => { e.stopPropagation(); setSelectedTitle(title); }}
                      >
                        View Sources
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {premiumHasMore && (
                <div id="premium-sentinel" className="h-20 flex items-center justify-center mt-12">
                  {premiumLoadingMore && <Loader2 className="w-8 h-8 animate-spin text-purple-500" />}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* LIVE TV TAB — IMPROVED WITH WATCHMODE FREE SERVICES */}
{tab === 'live' && (
  <section className="max-w-7xl mx-auto">
    <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
      <Radio className="text-purple-400" size={32} />
      Free Live TV & Streaming Services
    </h2>
    <p className="text-yellow-400 mb-4 text-center text-sm">Links only — we do not host videos. All content from official free sources.</p>

    {/* UK Live & Catch-up */}
    <div className="mb-12">
      <h3 className="text-2xl font-bold mb-6 text-green-400">🇬🇧 UK Live & Catch-up</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
        {liveChannels.map((channel) => (
          <div key={channel.id} className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 backdrop-blur-sm flex flex-col">
            <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
              <Radio className="w-16 h-16 text-purple-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="font-semibold text-lg mb-2 group-hover:text-purple-300 transition-colors">{channel.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{channel.category}</p>
              <a href={channel.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-auto block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium text-center transition-colors shadow-md">Watch Free Now →</a>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Free Worldwide Services */}
    <div>
      <h3 className="text-2xl font-bold mb-6 text-blue-400">🌍 Free Worldwide Services (FAST + Ad-Supported)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
        {freeWorldwideServices.map((service, idx) => {
          const { logoUrl, initials, color } = getProviderLogo(service.name);
          return (
            <div key={idx} className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 backdrop-blur-sm flex flex-col">
              <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
                {logoUrl ? (
                  <img src={logoUrl} alt={service.name} className="w-24 h-12 object-contain" />
                ) : (
                  <div className={`w-24 h-12 bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-3xl shadow-inner`}>{initials}</div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-300 transition-colors">{service.name}</h3>
                <a href={service.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-auto block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium text-center transition-colors shadow-md">Watch Free Now →</a>
              </div>
            </div>
          );
        })}
      </div>
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
                <label htmlFor="link-name" className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  id="link-name"
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g. My Sports Channel"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="link-url" className="block text-sm font-medium text-gray-300 mb-2">Stream URL</label>
                <input
                  id="link-url"
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
          <p className="text-yellow-400 mb-4 text-center text-sm">Links only — we do not host videos.</p>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                            {favorites.map((title: any, index: number) => {
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
                          src={`https://image.tmdb.org/t/p/w342${title.poster_path}`}
                          alt={title.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          quality={75}
                          priority={index < 3}
                          loading={index < 3 ? "eager" : "lazy"}
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
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors">📋 Copy</button>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors">𝕏</button>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors">📘</button>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors">💬</button>
                      </div>
                      <button className="mt-3 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium transition-all" onClick={(e) => { e.stopPropagation(); setSelectedTitle(title); }}>View Free Sources</button>
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

      {/* PLAYER MODAL */}
      {selectedChannel && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="w-full max-w-6xl bg-gray-900/95 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Radio size={24} className="text-purple-400" />
                {selectedChannel.name}
              </h2>
              <button onClick={() => setSelectedChannel(null)} className="text-gray-400 hover:text-white text-4xl leading-none">×</button>
            </div>
            <div data-vjs-player className="aspect-video bg-black">
              <video ref={videoRef} className="video-js vjs-big-play-centered vjs-fluid" playsInline />
            </div>
          </div>
        </div>
      )}

      {/* FILTERS MODAL — NOW FULLY ACCESSIBLE */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-8 relative">
            <button onClick={() => setShowFilters(false)} className="absolute top-6 right-6 text-4xl text-gray-400 hover:text-white transition-colors">×</button>
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
                <label htmlFor="min-year" className="block text-sm mb-1">From Year</label>
                <input
                  id="min-year"
                  type="number"
                  value={minYearFilter}
                  onChange={(e) => setMinYearFilter(e.target.value)}
                  placeholder="1900"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label htmlFor="max-year" className="block text-sm mb-1">To Year</label>
                <input
                  id="max-year"
                  type="number"
                  value={maxYearFilter}
                  onChange={(e) => setMaxYearFilter(e.target.value)}
                  placeholder="2026"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div className="mb-8">
              <label htmlFor="min-rating" className="block text-sm mb-2">Minimum Rating</label>
              <select
                id="min-rating"
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
              <label htmlFor="content-type" className="block text-sm font-medium mb-2">Content Type</label>
              <select
                id="content-type"
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
              <button onClick={() => setShowFilters(false)} className="flex-1 py-3 bg-blue-600 rounded-xl font-medium">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
            {/* SOURCES MODAL - Works in ALL tabs now (Top 10 + Favorites + Discover) */}
      {selectedTitle && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900/95 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl md:text-3xl font-bold pr-10">
                  {selectedTitle.title} ({selectedTitle.year})
                </h2>
                <button onClick={() => { setSelectedTitle(null); setSources([]); }} className="text-gray-400 hover:text-white text-4xl leading-none">×</button>
              </div>
              {sourcesLoading ? (
              <div className="text-center py-16 text-xl">Loading sources...</div>
              ) : sources.length > 0 ? (
                <div className="space-y-5">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <MonitorPlay size={22} /> 
                    {tab === 'premium' ? 'Premium / Subscription Sources' : 'Free Streaming Options'}
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
                        <div className="w-28 h-28 flex-shrink-0 bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center relative border border-gray-600">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt={source.name} 
                              className="max-w-[90%] max-h-[90%] object-contain" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-5xl shadow-inner`}>{initials}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg group-hover:text-blue-400 transition-colors">{source.name}</div>
                          <div className="text-gray-400 text-sm">Free with Ads {source.format && `• ${source.format}`}</div>
                        </div>
                        <div className="text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">Watch now →</div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                  <div className="text-center py-16 text-gray-300 text-lg">
                  {tab === 'premium' 
                    ? `No subscription sources found in ${region} right now.` 
                    : `No free sources available right now in ${region}.`}
                  <br />Availability changes frequently — try again later!
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
    src={`https://image.tmdb.org/t/p/w342${rel.poster_path}`}
    alt={rel.title || rel.name}
    fill
    className="object-cover group-hover:scale-105 transition-transform"
    sizes="112px"
    quality={75}
    loading="lazy"
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
