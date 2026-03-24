'use client';
import Hls from 'hls.js';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Tv, Film, Radio, MonitorPlay, ChevronRight, ChevronDown, Search, Loader2, Plus, Trash2, Heart, Star, Shuffle, Filter } from 'lucide-react';
import { staticFallbackTitles } from '../../lib/static-fallback-titles';
import InstallPrompt from './InstallPrompt';
import OfflineMessage from './OfflineMessage';
import GlobalSearch from './GlobalSearch';
import DiscoverTab from './DiscoverTab';
import PremiumTab from './PremiumTab'; 
import { getWatchmodeId, providerLogos } from '../../lib/watchmode-map';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

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

export default function MainApp({ defaultTab = 'discover' }: { defaultTab?: 'discover' | 'live' | 'mylinks' | 'favorites' | 'top10' | 'premium' | 'radio' }) {
  const [tab, setTab] = useState<'discover' | 'live' | 'mylinks' | 'favorites' | 'top10' | 'premium' | 'radio'>(defaultTab);
  const [region, setRegion] = useState('US');
  const [contentType, setContentType] = useState('movie,tv_series');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [paidSources, setPaidSources] = useState<any[]>([]);
  const [freeSources, setFreeSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [relatedTitles, setRelatedTitles] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
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
  const { user, isSignedIn } = useUser();

  // === FIXED CLOUD FAVORITES (no more random disappearing!) ===
  const loadFavorites = async () => {
    if (!isSignedIn || !user?.id) {
      setFavorites([]);
      return;
    }
    try {
      const res = await fetch('/api/favorites');
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error("Failed to load favorites", err);
    }
  };

  // Load on login
  useEffect(() => {
    loadFavorites();
  }, [user?.id]);

  // Refresh every time you switch to Favorites tab (this is the key fix!)
  useEffect(() => {
    if (tab === 'favorites') {
      loadFavorites();
    }
  }, [tab]);

    // === CLOUD CONTINUE WATCHING (Netflix style – last 20 titles, auto-saves) ===
  const loadContinueWatching = async () => {
    if (!isSignedIn || !user?.id) {
      setContinueWatching([]);
      return;
    }
    try {
      const res = await fetch('/api/continue-watching');
      const data = await res.json();
      setContinueWatching(data.continueWatching || []);
    } catch (err) {
      console.error("Failed to load continue watching", err);
    }
  };

  // Load when user logs in
  useEffect(() => {
    loadContinueWatching();
  }, [user?.id]);

  // Auto-add to Continue Watching + save to cloud whenever user opens a title
  const addToContinueWatching = (title: any) => {
    if (!title?.id || !user) return;

    const newItem = { ...title, watchedAt: new Date().toISOString() };

    setContinueWatching(prev => {
      const filtered = prev.filter((item: any) => item.id !== title.id);
      const updated = [newItem, ...filtered].slice(0, 20);

      // Save to Vercel KV instantly
      fetch('/api/continue-watching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continueWatching: updated })
      });

      return updated;
    });
  };

  // Trigger when title modal opens
  useEffect(() => {
    if (selectedTitle) {
      addToContinueWatching(selectedTitle);
    }
  }, [selectedTitle?.id]);
    // === REMOVE FROM CONTINUE WATCHING (cloud sync) ===
  const removeFromContinueWatching = (id: number) => {
    setContinueWatching(prev => {
      const updated = prev.filter((item: any) => item.id !== id);

      // Save to Vercel KV instantly
      fetch('/api/continue-watching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continueWatching: updated })
      });

      return updated;
    });
  };
  
    // === RADIO SECTION (new, doesn't touch anything else) ===
  const [radioStations, setRadioStations] = useState<any[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<any>(null);
  const [radioSearch, setRadioSearch] = useState('');
  const [radioFavorites, setRadioFavorites] = useState<any[]>([]);
  const [radioCountryCode, setRadioCountryCode] = useState('');
  const [showRadioFavorites, setShowRadioFavorites] = useState(false);
  const [pauseInfiniteScroll, setPauseInfiniteScroll] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tmdbDetails, setTmdbDetails] = useState<any>(null);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [cast, setCast] = useState<any[]>([]);
  const [sourcesLastUpdated, setSourcesLastUpdated] = useState<string>('');
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
    // === CLEAN URL SUPPORT WITH NEXT.JS ROUTER ===
  const pathname = usePathname();
  const router = useRouter();

    const getTabFromPath = (path: string) => {
    switch (path) {
      case '/discover': return 'discover';
      case '/live-tv': return 'live';
      case '/my-links': return 'mylinks';
      case '/favorites': return 'favorites';
      case '/top-10': return 'top10';
      case '/premium': return 'premium';
      case '/radio': return 'radio';           // ← new
      default: return defaultTab;
    }
  };

    const handleTabChange = (newTab: 'discover' | 'live' | 'mylinks' | 'favorites' | 'top10' | 'premium' | 'radio') => {
    let newPath = '/discover';
    if (newTab === 'live') newPath = '/live-tv';
    else if (newTab === 'mylinks') newPath = '/my-links';
    else if (newTab === 'top10') newPath = '/top-10';
    else if (newTab === 'favorites') newPath = '/favorites';
    else if (newTab === 'premium') newPath = '/premium';
    else if (newTab === 'radio') newPath = '/radio';   // ← new
    setTab(newTab);
    router.push(newPath, { scroll: false });
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const newTab = getTabFromPath(pathname);
    if (newTab !== tab) setTab(newTab);
  }, [pathname]);

    // Show Back to Top only after scrolling down
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

    // === RICH TMDB DATA (score + multiple trailers + cast) ===
  useEffect(() => {
    if (!selectedTitle?.tmdb_id || !TMDB_READ_TOKEN) {
      setTmdbDetails(null);
      setTrailers([]);
      setCast([]);
      return;
    }

    const fetchRichData = async () => {
      const type = selectedTitle.tmdb_type === 'movie' || selectedTitle.type === 'movie' ? 'movie' : 'tv';
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${selectedTitle.tmdb_id}?append_to_response=videos,credits&language=en-US`,
          { headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` } }
        );
        const data = await res.json();

        setTmdbDetails(data);

        // Multiple trailers (YouTube only)
        const youtubeTrailers = data.videos?.results?.filter(
          (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        ) || [];
        setTrailers(youtubeTrailers.slice(0, 3));

        // Cast (top 8 with photos)
        setCast(data.credits?.cast?.slice(0, 8) || []);
      } catch (err) {
        console.error('TMDB rich data error:', err);
      }
    };

    fetchRichData();
  }, [selectedTitle]);

      // === SOURCES WITH 24h SHARED CACHE — ONLY 1 CALL PER TITLE ===
useEffect(() => {
  if (!selectedTitle) {
    setPaidSources([]);
    setFreeSources([]);
    setSourcesLoading(false);
    setSourcesLastUpdated('');
    return;
  }

  const fetchSources = async () => {
    setSourcesLoading(true);

    let watchmodeId = selectedTitle.id;
    if (!watchmodeId && selectedTitle.tmdb_id) {
      watchmodeId = await getWatchmodeId(selectedTitle.tmdb_id);
    }
    if (!watchmodeId) {
      setPaidSources([]);
      setFreeSources([]);
      setSourcesLoading(false);
      return;
    }

    const isPremium = selectedTitle.fromPremium === true || tab === 'premium';

    try {
      const res = await fetch(
        `/api/title-sources?id=${watchmodeId}&region=${region}&paid=${isPremium}`
      );
      const json = await res.json();

      if (json.success) {
        setPaidSources(json.paidSources || (isPremium ? json.sources || [] : []));
        setFreeSources(json.freeSources || (!isPremium ? json.sources || [] : []));
        setSourcesLastUpdated(new Date().toISOString());
      } else {
        setPaidSources([]);
        setFreeSources([]);
      }
    } catch (err) {
      console.error('Sources fetch error:', err);
      setPaidSources([]);
      setFreeSources([]);
    } finally {
      setSourcesLoading(false);
    }
  };

  fetchSources();
}, [selectedTitle, region, tab]);

  // === HLS.JS PLAYER FOR MY LINKS (much better compatibility) ===
useEffect(() => {
  if (!selectedChannel) return;

  const videoElement = document.getElementById('custom-video-player') as HTMLVideoElement;
  if (!videoElement) return;

  let hls: any = null;

  const loadStream = async () => {
    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        lowLatencyMode: true,
      });
      hls.loadSource(selectedChannel.url);
      hls.attachMedia(videoElement);
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = selectedChannel.url;
    }
  };

  loadStream();

  return () => {
    if (hls) {
      hls.destroy();
    }
  };
}, [selectedChannel]);

    // === REAL TOP 10 — always pulls from your full current catalog ===
useEffect(() => {
  if (tab !== 'top10') return;

  const fetchRealTop10 = async () => {
    setTop10Loading(true);
    try {
      // Force fresh trending from the full free catalog
      const res = await fetch(`/api/cached-fetch?types=${encodeURIComponent(contentType)}&section=trending`);
      const json = await res.json();

      // Take the top 10 (real popularity sorted)
      const realTop10 = json.success && json.titles?.length
        ? json.titles.slice(0, 10)
        : staticFallbackTitles.slice(0, 10);

      setTop10Titles(realTop10);
    } catch (err) {
      console.error('Top 10 fetch failed:', err);
      setTop10Titles(staticFallbackTitles.slice(0, 10));
    }
    setTop10Loading(false);
  };

  fetchRealTop10();
}, [tab, contentType]);

            // === RADIO STATIONS (search + country filter — safe & separate) ===
  useEffect(() => {
    if (tab !== 'radio') {
      setRadioStations([]);
      return;
    }
    const fetchRadio = async () => {
      setRadioLoading(true);
      try {
        let url = 'https://de1.api.radio-browser.info/json/stations/search?limit=120&order=votes&reverse=true&hidebroken=true';
        
        if (radioSearch.trim()) {
          url += `&name=${encodeURIComponent(radioSearch.trim())}`;
        }
        if (radioCountryCode) {
          url += `&countrycode=${radioCountryCode}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setRadioStations(data);
        } else {
          setRadioStations([
            { name: "BBC Radio 1", country: "United Kingdom", favicon: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/BBC_Radio_1_2023.svg/1280px-BBC_Radio_1_2023.svg.png", url_resolved: "http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one" },
            { name: "NPR", country: "United States", favicon: "", url_resolved: "https://npr-ice.streamguys1.com/live.mp3" },
            { name: "Radio Paradise", country: "Worldwide", favicon: "", url_resolved: "https://stream.radioparadise.com/mp3-192" },
            { name: "France Inter", country: "France", favicon: "", url_resolved: "https://icecast.radiofrance.fr/franceinter-midfi.mp3" },
            { name: "Triple J", country: "Australia", favicon: "", url_resolved: "https://live-triplej.abc.net.au/triplej.mp3" },
            { name: "KIIS 106.5", country: "Australia", favicon: "", url_resolved: "https://live.kiis1065.com.au/kiis" },
            { name: "Capital FM", country: "United Kingdom", favicon: "", url_resolved: "https://media-ssl.musicradio.com/Capital" },
            { name: "Smooth Radio", country: "United Kingdom", favicon: "", url_resolved: "https://media-ssl.musicradio.com/SmoothUK" }
          ]);
        }
      } catch (err) {
        console.error('Radio fetch error:', err);
        setRadioStations([]);
      } finally {
        setRadioLoading(false);
      }
    };
    fetchRadio();
  }, [tab, radioSearch, radioCountryCode]);
  
  // === CLOUD RADIO FAVORITES (syncs across devices) ===
  useEffect(() => {
    if (!user || !showRadioFavorites) {
      setRadioFavorites([]);
      return;
    }
    fetch('/api/radio-favorites')
      .then(res => res.json())
      .then(data => setRadioFavorites(data.favorites || []));
  }, [user, showRadioFavorites]);

  const toggleRadioFavorite = (station: any) => {
    const isFav = radioFavorites.some(f => f.url_resolved === station.url_resolved);
    let newFavs = isFav 
      ? radioFavorites.filter(f => f.url_resolved !== station.url_resolved)
      : [...radioFavorites, station];
    setRadioFavorites(newFavs);

    fetch('/api/radio-favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites: newFavs })
    });
  };
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
  console.log(`🔍 Looking for logo for: "${sourceName}"`);

  // PRIORITY 1: Use the real 191 official logos from Watchmode API
  const safeProviders = Array.isArray(allProviders) ? allProviders : [];
  console.log(`📦 Loaded ${safeProviders.length} providers from Watchmode API`);

  // One-time debug: show the actual names Watchmode is using
  if (safeProviders.length > 0 && !(window as any).providersLogged) {
    console.log('🔍 ACTUAL Watchmode Provider Names (first 20):', safeProviders.slice(0, 20).map((p: any) => p.name));
    (window as any).providersLogged = true;
  }

  // Expanded aliases + super-loose matching
  const aliases: Record<string, string> = {
    'hulu': 'Hulu',
    'fubotv': 'fubo',
    'fubo': 'fubo',
    'amazon': 'Prime Video',
    'prime video': 'Prime Video',
    'prime': 'Prime Video',
    'vudu': 'Vudu',
    'appletv': 'Apple TV',
    'apple tv': 'Apple TV',
    'fx': 'FX',
    'spectrum': 'Spectrum On Demand',
    'spectrum on demand': 'Spectrum On Demand',
    'disney': 'Disney+',
    'tubi': 'Tubi',
    'pluto': 'Pluto TV',
    'apple tv+': 'Apple TV'
  };

  const searchTerm = aliases[name] || name;

  const matched = safeProviders.find((p: any) => {
    if (!p.name) return false;
    const providerName = p.name.toLowerCase()
      .replace(/\s*\(.*?\)/g, '')   // remove (US), (UK) etc.
      .trim()
      .replace(/[^a-z0-9]/g, '');   // remove all punctuation

    const cleanSearch = searchTerm.replace(/[^a-z0-9]/g, '');

    return (
      providerName === cleanSearch ||
      providerName.includes(cleanSearch) ||
      cleanSearch.includes(providerName) ||
      providerName.split(' ').some((w: string) => cleanSearch.includes(w)) ||
      cleanSearch.split(' ').some((w: string) => providerName.includes(w))
    );
  });

  if (matched?.logo_url) {
    console.log(`✅ SUCCESS – Using REAL Watchmode logo for ${sourceName}`);
    return {
      logoUrl: matched.logo_url,
      initials: name.slice(0, 2).toUpperCase(),
      color: 'from-indigo-500 to-purple-600'
    };
  } else {
    console.log(`❌ No Watchmode match for "${sourceName}"`);
  }

  // Fallback to local GitHub logos only if needed
  for (const [key, logoPath] of Object.entries(providerLogos)) {
    if (name.includes(key.toLowerCase()) || key.toLowerCase().includes(name)) {
      console.log(`📁 Using local GitHub logo for ${sourceName}`);
      return {
        logoUrl: logoPath,
        initials: name.slice(0, 2).toUpperCase(),
        color: 'from-emerald-500 to-teal-600'
      };
    }
  }

  console.log(`⚠️ No logo found for "${sourceName}"`);
  return {
    logoUrl: null,
    initials: name.slice(0, 2).toUpperCase(),
    color: 'from-indigo-500 to-purple-600'
  };
};
  // === DEDUPLICATE PREMIUM SOURCES — ONE PER PROVIDER + HD PREFERRED ===
const deduplicateSources = (sources: any[]) => {
  const map = new Map();

  sources.forEach((source) => {
    if (!source?.name) return;
    const key = source.name.toLowerCase().trim();

    const format = (source.format || '').toUpperCase();
    let priority = 0;
    if (format.includes('HD')) priority = 3;
    else if (format.includes('SD')) priority = 2;
    else if (format.includes('4K') || format.includes('UHD')) priority = 1;

    const existing = map.get(key);
    let existingPriority = 0;
    if (existing) {
      const exFormat = (existing.format || '').toUpperCase();
      if (exFormat.includes('HD')) existingPriority = 3;
      else if (exFormat.includes('SD')) existingPriority = 2;
      else if (exFormat.includes('4K') || exFormat.includes('UHD')) existingPriority = 1;
    }

    if (!existing || priority > existingPriority) {
      map.set(key, source);
    }
  });

  return Array.from(map.values());
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
                  <GlobalSearch 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onTitleSelect={setSelectedTitle} 
          region={region} 
          contentType={contentType}
          paidOnly={false}          
        />

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
            onClick={() => handleTabChange('discover')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'discover' ? 'border-b-4 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'discover' ? 'page' : undefined}
          >
            <Tv size={20} /> Discover
          </button>
          <button
            role="tab"
            aria-selected={tab === 'live'}
            onClick={() => handleTabChange('live')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'live' ? 'border-b-4 border-green-500 text-green-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'live' ? 'page' : undefined}
          >
            <Radio size={20} /> Live TV
          </button>
          <button
            role="tab"
            aria-selected={tab === 'radio'}
            onClick={() => handleTabChange('radio')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'radio' ? 'border-b-4 border-orange-500 text-orange-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'radio' ? 'page' : undefined}
          >
            📻 Radio
          </button>
          <button
            role="tab"
            aria-selected={tab === 'mylinks'}
            onClick={() => handleTabChange('mylinks')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'mylinks' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'mylinks' ? 'page' : undefined}
          >
            <Plus size={20} /> My Links
          </button>
          <button
            role="tab"
            aria-selected={tab === 'favorites'}
            onClick={() => handleTabChange('favorites')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'favorites' ? 'border-b-4 border-red-500 text-red-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'favorites' ? 'page' : undefined}
          >
            <Heart size={20} /> Favorites ({favorites.length})
          </button>
                    <button
            role="tab"
            aria-selected={tab === 'top10'}
            onClick={() => handleTabChange('top10')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'top10' ? 'border-b-4 border-yellow-500 text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'top10' ? 'page' : undefined}
          >
            <Star size={20} /> Top 10
          </button>
          <button
            role="tab"
            aria-selected={tab === 'premium'}
            onClick={() => handleTabChange('premium')}
            className={`flex items-center gap-2 pb-3 px-5 md:px-6 font-semibold text-base md:text-lg transition-colors ${tab === 'premium' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            aria-current={tab === 'premium' ? 'page' : undefined}
          >
            💎 Premium
          </button>
        </div>
      </header>

      <InstallPrompt />
      <OfflineMessage />

            {/* DISCOVER TAB + CONTINUE WATCHING ROW (Netflix style) */}
      {tab === 'discover' && (
        <>
          
          {/* The original DiscoverTab (still works exactly the same) */}
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
            minYearFilter={minYearFilter}
            maxYearFilter={maxYearFilter}
            minRatingFilter={minRatingFilter}
            lastUpdated={lastUpdated}
            setLastUpdated={setLastUpdated}
            surpriseMe={surpriseMe}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            setMinYearFilter={setMinYearFilter}
            setMaxYearFilter={setMaxYearFilter}
            setMinRatingFilter={setMinRatingFilter}
            setContentType={setContentType}
            pauseInfiniteScroll={pauseInfiniteScroll}
            continueWatching={continueWatching}
            removeFromContinueWatching={removeFromContinueWatching}
          />
        </>
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
                                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                                      quality={75}
                                      priority={index < 3}
                                      loading={index < 3 ? "eager" : "lazy"}
                                      unoptimized={true}
                                    />
                                  ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-16 h-16 text-gray-600 group-hover:text-gray-400 transition-colors" />
                              </div>
                            )}

                    {/* Hover overlay with share buttons */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(title); }}
                        className="text-white hover:text-red-500 transition-colors"
                      >
                        <Heart size={28} className={favorites.some(f => f.id === title.id) ? "fill-red-500" : ""} />
                      </button>
                      <div className="flex gap-4">
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`); alert('Link copied!'); }} className="text-white hover:text-blue-400">📋</button>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${title.title}" on FreeStream World!`)}&url=${encodeURIComponent(`https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`)}`, '_blank'); }} className="text-white hover:text-blue-400">𝕏</button>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`)}`, '_blank'); }} className="text-white hover:text-blue-400">📘</button>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(`Check out "${title.title}" on FreeStream World! https://freestreamworld.com/?title=${encodeURIComponent(title.title)}`)}`, '_blank'); }} className="text-white hover:text-blue-400">💬</button>
                      </div>
                    </div>
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

         {tab === 'premium' && (
              <PremiumTab
                region={region}
                contentType={contentType}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                selectedTitle={selectedTitle}
                setSelectedTitle={setSelectedTitle}
                pauseInfiniteScroll={pauseInfiniteScroll}
              />
            )}

                              {/* RADIO TAB — with Favorites toggle */}
      {tab === 'radio' && (
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
            📻 Worldwide Radio
          </h2>
          <p className="text-yellow-400 mb-6 text-center text-sm">50,000+ real stations • Free • Legal • Cloud-synced favorites</p>

          {/* Search + Country + Favorites Button (now matching style) */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-md mx-auto items-center">
            <input
              type="text"
              placeholder="Search station name"
              value={radioSearch}
              onChange={(e) => setRadioSearch(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={radioCountryCode}
              onChange={(e) => setRadioCountryCode(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">🌍 All Countries</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="US">🇺🇸 United States</option>
              <option value="AU">🇦🇺 Australia</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="FR">🇫🇷 France</option>
              <option value="IN">🇮🇳 India</option>
              <option value="BR">🇧🇷 Brazil</option>
              <option value="ES">🇪🇸 Spain</option>
              <option value="IT">🇮🇹 Italy</option>
            </select>

            <button
              onClick={() => setShowRadioFavorites(!showRadioFavorites)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
                showRadioFavorites 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              ❤️ {showRadioFavorites ? 'All Stations' : 'My Favorites'}
            </button>
          </div>

          {radioLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
              <p className="text-xl">Loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
              {(showRadioFavorites ? radioFavorites : radioStations).map((station: any, index: number) => {
                const isFavorited = radioFavorites.some(f => f.url_resolved === station.url_resolved);
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedRadio(station)}
                    className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm flex flex-col"
                  >
                    <div className="aspect-video bg-gray-700 flex items-center justify-center relative overflow-hidden">
                      <Radio className="w-16 h-16 text-orange-500 group-hover:text-orange-400 transition-colors" />
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-orange-300 transition-colors">
                        {station.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-1">
                        {station.country || 'Worldwide'}
                      </p>
                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleRadioFavorite(station); }}
                          className="text-2xl transition-all hover:scale-110"
                        >
                          {isFavorited ? '❤️' : '♡'}
                        </button>
                        <button className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 rounded-lg font-medium transition-all">
                          Play Live Radio
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          quality={75}
                          priority={index < 3}
                          loading={index < 3 ? "eager" : "lazy"}
                          unoptimized={true}
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

      {selectedChannel && (
  <div 
    className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md"
    onClick={() => setSelectedChannel(null)}
  >
    <div 
      className="w-full max-w-5xl bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center p-5 border-b border-gray-800">
        <h2 className="text-2xl font-bold">{selectedChannel.name || 'Custom Stream'}</h2>
        <button 
          onClick={() => setSelectedChannel(null)}
          className="text-gray-400 hover:text-white text-4xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="aspect-video bg-black p-4 relative">
        <video
          id="custom-video-player"
          controls
          autoPlay
          muted
          className="w-full h-full rounded-xl"
        />
      </div>
    </div>
  </div>
)}

            {/* RADIO PLAYER MODAL (simple audio — doesn't touch video player) */}
      {selectedRadio && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                📻 {selectedRadio.name}
              </h2>
              <button onClick={() => setSelectedRadio(null)} className="text-gray-400 hover:text-white text-4xl leading-none">×</button>
            </div>
            <div className="p-8">
              {selectedRadio.favicon && (
                <div className="mx-auto mb-6 w-24 h-24 bg-gray-800 rounded-2xl flex items-center justify-center overflow-hidden">
                  <img src={selectedRadio.favicon} alt={selectedRadio.name} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <audio
                controls
                autoPlay
                className="w-full"
                src={selectedRadio.url_resolved || selectedRadio.url}
              />
              <p className="text-center text-gray-400 text-sm mt-4">
                {selectedRadio.country} • {selectedRadio.tags || 'Live Radio'}
              </p>
            </div>
          </div>
        </div>
      )}
      
            {/* CLEAN FILTERS MODAL — ONLY Content Type */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-8 relative">
            <button 
              onClick={() => setShowFilters(false)} 
              className="absolute top-6 right-6 text-4xl text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6">Content Type</h2>
            
            <div>
              <p className="text-sm text-gray-400 mb-3">Choose what to show</p>
              <div className="flex flex-col gap-3">
                {['movie,tv_series', 'movie', 'tv_series'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setContentType(type);
                      setShowFilters(false);
                    }}
                    className={`w-full py-4 rounded-2xl text-lg font-medium transition-all ${
                      contentType === type 
                        ? 'bg-white text-black' 
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {type === 'movie,tv_series' ? 'All (Movies & TV Shows)' : type === 'movie' ? 'Movies Only' : 'TV Shows Only'}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setShowFilters(false)} 
              className="mt-8 w-full py-3 bg-gray-700 rounded-xl text-gray-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
                                          {/* RICH SOURCES MODAL — Click outside to close */}
      {selectedTitle && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => {
            setSelectedTitle(null);
            setSources([]);
            setTmdbDetails(null);
            setTrailers([]);
            setCast([]);
          }}
        >
          <div 
            className="bg-gray-900/95 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-gray-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8">
               <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold pr-10">
                    {selectedTitle.title} ({selectedTitle.year})
                  </h2>

                  {/* TMDB Score */}
                  {tmdbDetails?.vote_average && (
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="text-yellow-400" fill="currentColor" size={22} />
                      <span className="text-3xl font-bold text-yellow-400">{tmdbDetails.vote_average.toFixed(1)}</span>
                      <span className="text-gray-400">/ 10 • TMDB</span>
                    </div>
                  )}

                  {/* Runtime + Seasons */}
                  {(tmdbDetails?.runtime || tmdbDetails?.number_of_seasons) && (
                    <div className="flex gap-4 mt-3 text-sm text-gray-400">
                      {tmdbDetails.runtime && <div>⏱️ {tmdbDetails.runtime} min</div>}
                      {tmdbDetails.number_of_seasons && <div>📺 {tmdbDetails.number_of_seasons} Season{tmdbDetails.number_of_seasons > 1 ? 's' : ''}</div>}
                    </div>
                  )}

                  {/* Genres */}
                  {tmdbDetails?.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tmdbDetails.genres.slice(0, 5).map((g: any) => (
                        <span key={g.id} className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedTitle(null);
                    setSources([]);
                    setTmdbDetails(null);
                    setTrailers([]);
                    setCast([]);
                  }}
                  className="text-gray-400 hover:text-white text-4xl leading-none"
                >
                  ×
                </button>
              </div>

              {sourcesLastUpdated && (
                <p className="text-xs text-gray-500 mb-6">Sources last updated: {sourcesLastUpdated}</p>
              )}
                            {/* Plot Overview */}
              {tmdbDetails?.overview && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2 text-gray-300">Story</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {tmdbDetails.overview}
                  </p>
                </div>
              )}
                            {sourcesLoading ? (
                <div className="text-center py-16 text-xl">Loading sources...</div>
              ) : paidSources.length > 0 || freeSources.length > 0 ? (
                <div className="space-y-8">
                                    {/* 💎 PREMIUM SOURCES — deduplicated + HD only */}
                  {paidSources.length > 0 && (
                    <>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        💎 Premium / Subscription Sources
                      </h3>
                      <div className="space-y-3">
                        {deduplicateSources(paidSources).map((source: any, idx: number) => {
                          const { logoUrl, initials, color } = getProviderLogo(source.name);
                          return (
                            <a
                              key={idx}
                              href={source.web_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-gray-800/70 p-4 rounded-xl hover:bg-gray-700/70 transition-all border border-gray-700 hover:border-gray-500 group"
                            >
                              <div className="w-36 h-24 flex-shrink-0 bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 group-hover:border-blue-500 transition-all">
  {logoUrl ? (
    <img 
      src={logoUrl} 
      alt={source.name} 
      className="w-full h-full object-contain p-2" 
    />
  ) : (
    <div className={`w-full h-full flex items-center justify-center text-white font-bold text-3xl bg-gradient-to-br ${color}`}>
      {initials}
    </div>
  )}
</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-base group-hover:text-blue-400 transition-colors">{source.name}</div>
                                <div className="text-gray-400 text-xs">
                                  Subscription{source.format && ` • ${source.format}`}
                                </div>
                              </div>
                              <div className="text-blue-400 text-xs font-medium group-hover:translate-x-1 transition-transform">Watch now →</div>
                            </a>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* 🎁 ALSO FREE ON */}
                  {freeSources.length > 0 && (
                    <>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        🎁 Also Free On
                      </h3>
                      <div className="space-y-3">
                        {freeSources.map((source: any, idx: number) => {
                          const { logoUrl, initials, color } = getProviderLogo(source.name);
                          return (
                            <a
                              key={idx}
                              href={source.web_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-gray-800/70 p-4 rounded-xl hover:bg-gray-700/70 transition-all border border-gray-700 hover:border-gray-500 group"
                            >
                              <div className="w-36 h-24 flex-shrink-0 bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 group-hover:border-blue-500 transition-all">
  {logoUrl ? (
    <img 
      src={logoUrl} 
      alt={source.name} 
      className="w-full h-full object-contain p-2" 
    />
  ) : (
    <div className={`w-full h-full flex items-center justify-center text-white font-bold text-3xl bg-gradient-to-br ${color}`}>
      {initials}
    </div>
  )}
</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-base group-hover:text-blue-400 transition-colors">{source.name}</div>
                                <div className="text-gray-400 text-xs">Free with Ads{source.format && ` • ${source.format}`}</div>
                              </div>
                              <div className="text-blue-400 text-xs font-medium group-hover:translate-x-1 transition-transform">Watch now →</div>
                            </a>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-300 text-lg">
                  {selectedTitle.fromPremium || tab === 'premium'
                    ? `No sources found in ${region} right now.`
                    : `No free sources available right now in ${region}.`}
                </div>
              )}

              {trailers.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold mb-4">🎬 Trailers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trailers.map((trailer, i) => (
                      <div key={i} className="aspect-video bg-black rounded-xl overflow-hidden border border-gray-700">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${trailer.key}`}
                          title={trailer.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cast.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold mb-4">Cast</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                    {cast.map((actor: any) => (
                      <div key={actor.id} className="text-center group">
                        <div className="relative aspect-square rounded-full overflow-hidden mx-auto border-2 border-gray-700 group-hover:border-blue-500 transition-all">
                                                    {actor.profile_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                              alt={actor.name}
                              fill
                              className="object-cover"
                              loading="lazy"
                              sizes="(max-width: 640px) 20vw, 92px"
                              unoptimized={true}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-4xl">👤</div>
                          )}
                        </div>
                        <p className="text-sm mt-3 font-medium line-clamp-2">{actor.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedTitles.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-700">
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
                            poster_path: rel.poster_path,
                            fromPremium: selectedTitle.fromPremium
                          });
                        }}
                        className="snap-start flex-shrink-0 w-28 cursor-pointer group"
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md bg-gradient-to-br from-gray-800 to-gray-700">
                                                      {rel.poster_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${rel.poster_path}`}
                              alt={rel.title || rel.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="(max-width: 640px) 28vw, 128px"
                              quality={80}
                              loading="lazy"
                              unoptimized={true}
                            />
                          ) : (
                            <>
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-16 h-16 text-gray-400" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-[10px] text-center line-clamp-2">
                                {rel.title || rel.name}
                              </div>
                            </>
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
   {/* Floating Buttons Stack — mobile-friendly (smaller + no overlap) */}
<div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[75] flex flex-col gap-3 items-end">
  {/* Back to Top Button — smaller on mobile */}
  {showBackToTop && (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-2xl shadow-2xl flex items-center justify-center text-3xl transition-all hover:scale-105 active:scale-95"
      aria-label="Back to top"
    >
      ↑
    </button>
  )}
  {/* Legal Info Button — smaller on mobile, no covering videos or footer */}
  {showBackToTop && (
    <button
      onClick={() => {
        const footer = document.getElementById('footer');
        if (footer) {
          footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setPauseInfiniteScroll(true);
          setTimeout(() => {
            setPauseInfiniteScroll(false);
          }, 8000);
        }
      }}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm md:text-base transition-all hover:scale-105 active:scale-95"
      aria-label="Legal information"
    >
      📜 Legal Info
      <ChevronDown size={16} />
    </button>
  )}
</div>
        <footer id="footer" className="max-w-7xl mx-auto mt-20 text-center text-gray-500 text-sm">
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
