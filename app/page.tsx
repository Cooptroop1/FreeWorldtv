'use client';

import { useState, useEffect, useRef } from 'react';
import { Tv, Film, Globe, X, Radio, MonitorPlay, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Use env vars (set these in Vercel/Render dashboard)
const WATCHMODE_API_KEY = process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

// Live channels – public, legal streams
// Reliable public live channels (tested to work on Vercel/Render)
// Reliable public live channels (CORS/DNS friendly on Vercel/Render)
// Proven, cloud-friendly public live channels (work on Vercel/Render)
const liveChannels = [
  { 
    id: 1, 
    name: 'BBC iPlayer (Live & On-Demand)', 
    category: 'BBC Channels', 
    officialUrl: 'https://www.bbc.co.uk/iplayer' 
  },
  { 
    id: 2, 
    name: 'ITVX (ITV Hub – Live & Catch-up)', 
    category: 'ITV Channels', 
    officialUrl: 'https://www.itv.com/watch' 
  },
  { 
    id: 3, 
    name: 'Channel 4 (Live & On-Demand)', 
    category: 'Channel 4 Family', 
    officialUrl: 'https://www.channel4.com' 
  },
  { 
    id: 4, 
    name: 'My5 (Channel 5 Live & Catch-up)', 
    category: 'Channel 5 Family', 
    officialUrl: 'https://www.my5.tv' 
  },
  { 
    id: 5, 
    name: 'UKTV Play (Drama, Gold, Dave, etc.)', 
    category: 'UKTV Channels', 
    officialUrl: 'https://www.uktvplay.co.uk' 
  },
  { 
    id: 6, 
    name: 'STV Player (Scottish ITV)', 
    category: 'Scottish TV', 
    officialUrl: 'https://player.stv.tv' 
  },
  { 
    id: 7, 
    name: 'S4C Clic (Welsh Language)', 
    category: 'Welsh TV', 
    officialUrl: 'https://s4c.cymru/clic' 
  },
  { 
    id: 8, 
    name: 'BBC Sounds (Radio & Podcasts)', 
    category: 'BBC Audio', 
    officialUrl: 'https://www.bbc.co.uk/sounds' 
  },
  { 
    id: 9, 
    name: 'Pluto TV UK (FAST Channels)', 
    category: 'Free Ad-Supported TV', 
    officialUrl: 'https://pluto.tv/en/live-tv' 
  },
  { 
    id: 10, 
    name: 'Tubi UK (if available)', 
    category: 'Free Movies & Shows', 
    officialUrl: 'https://tubitv.com' 
  },
];
// Genres (Watchmode IDs)
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

export default function Home() {
  const [tab, setTab] = useState<'discover' | 'live'>('discover');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('US');
  const [contentType, setContentType] = useState('movie,tv_series');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [selectedTitle, setSelectedTitle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch titles / search
  useEffect(() => {
    if (tab !== 'discover') return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/popular-free?region=${region}&type=${encodeURIComponent(contentType)}&page=${currentPage}`;

        if (debouncedSearch) {
          url = `/api/search?query=${encodeURIComponent(debouncedSearch)}&region=${region}&page=${currentPage}`;
        } else if (selectedGenre) {
          url += `&genres=${selectedGenre}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
          setData(json);
        } else {
          setError(json.error || 'Failed to load titles');
          setData(null);
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
        setData(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [region, contentType, currentPage, debouncedSearch, selectedGenre, tab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [region, contentType, debouncedSearch, selectedGenre]);

  // TMDB posters
  useEffect(() => {
    if (!data?.titles?.length || !TMDB_READ_TOKEN) return;

    const fetchPosters = async () => {
      const updatedTitles = await Promise.all(
        data.titles.map(async (title: any) => {
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
          } catch (err) {
            return title;
          }
        })
      );
      setData({ ...data, titles: updatedTitles });
    };

    fetchPosters();
  }, [data, TMDB_READ_TOKEN]);

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

  // IMPROVED Video.js player with native HLS fallback
  useEffect(() => {
    if (!selectedChannel || !videoRef.current) return;

    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    // Better config: use native HLS on Safari, override on others
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    playerRef.current = videojs(videoRef.current, {
      autoplay: 'muted',
      muted: true,
      controls: true,
      fluid: true,
      bigPlayButton: true,
      html5: {
        vhs: {
          overrideNative: !isSafari,  // Native on Safari, Video.js VHS on others
          withCredentials: false,
          bandwidth: 2000000,         // Initial bandwidth estimate (helps startup)
        },
        nativeAudioTracks: isSafari,
        nativeVideoTracks: isSafari,
      },
      sources: [{ src: selectedChannel.url, type: 'application/x-mpegURL' }],
    });

    playerRef.current.on('error', () => {
      const err = playerRef.current.error();
      console.error('[VideoJS Error] Code:', err?.code, 'Message:', err?.message || '(empty)');
      setError(`Playback failed: ${err?.message || 'Unknown error - check console'}`);
    });

    playerRef.current.on('loadedmetadata', () => console.log('[VideoJS] Metadata loaded'));
    playerRef.current.on('canplay', () => console.log('[VideoJS] Ready to play'));
    playerRef.current.on('waiting', () => console.log('[VideoJS] Buffering'));

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [selectedChannel]);

  const goToNextPage = () => {
    if (data && currentPage < data.totalPages) setCurrentPage(prev => prev + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedGenre('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-8">
      <header className="max-w-7xl mx-auto mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 flex items-center gap-4">
          <MonitorPlay className="w-12 h-12 text-blue-500" />
          FreeStream World
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Free movies, TV shows & live channels worldwide — no sign-up needed
        </p>

        <div className="flex flex-wrap gap-6 mb-8 border-b border-gray-700 pb-4">
          <button
            onClick={() => setTab('discover')}
            className={`flex items-center gap-2 pb-3 px-6 font-semibold text-lg transition-colors ${
              tab === 'discover' ? 'border-b-4 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tv size={22} /> Discover
          </button>
          <button
            onClick={() => setTab('live')}
            className={`flex items-center gap-2 pb-3 px-6 font-semibold text-lg transition-colors ${
              tab === 'live' ? 'border-b-4 border-green-500 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio size={22} /> Live TV
          </button>
        </div>

        {tab === 'discover' && (
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
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Globe size={20} />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <Tv size={20} />
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="movie,tv_series">All</option>
                <option value="movie">Movies</option>
                <option value="tv_series">TV Shows</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-lg font-medium hidden md:block">Genre:</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Genres</option>
                {genres.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

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

          {!loading && data && (
            <section className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-4">
                <MonitorPlay className="text-green-400" size={32} />
                {debouncedSearch ? `Free Results for "${debouncedSearch}"` : 'Popular Free Titles'} in {data.region}
              </h2>

              <p className="text-gray-400 mb-8 text-lg">
                {data.message || `Found ${Array.isArray(data.titles) ? data.titles.length : 0} titles`} • Page {currentPage} of {data.totalPages || 1}
              </p>

              {Array.isArray(data.titles) && data.titles.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                    {data.titles.map((title: any) => (
                      <div
                        key={title.id}
                        onClick={() => setSelectedTitle(title)}
                        className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer backdrop-blur-sm"
                      >
                        <div className="aspect-[2/3] bg-gray-700 relative overflow-hidden">
                          {title.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w500${title.poster_path}`}
                              alt={title.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Poster';
                              }}
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

                  <div className="flex justify-center items-center gap-6 mt-12">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1 || loading}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={20} />
                      Previous
                    </button>

                    <span className="text-lg font-medium px-6 py-3 bg-gray-800 rounded-lg">
                      Page {currentPage} of {data.totalPages}
                    </span>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= data.totalPages || loading}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </>
              ) : (
                !loading && (
                  <div className="text-center py-20 text-xl text-gray-300">
                    {debouncedSearch ? (
                      <>No free matches found for "{debouncedSearch}".<br />Try another term like "Matrix" or "John Wick".</>
                    ) : (
                      'No titles match your current filters. Try changing region, content type or genre.'
                    )}
                  </div>
                )
              )}
            </section>
          )}
        </>
      )}

      {/* Live TV Tab */}
      {tab === 'live' && (
  <section className="max-w-7xl mx-auto">
    <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
      <Radio className="text-purple-400" size={32} />
      Live TV Channels
    </h2>
    <p className="text-gray-400 mb-6 text-lg">
      Click to open official live stream in a new tab — no embeds due to network restrictions.
    </p>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
      {liveChannels.map((channel) => (
        <div
          key={channel.id}
          className="group bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 backdrop-blur-sm"
        >
          <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
            <Radio className="w-16 h-16 text-purple-600 group-hover:text-purple-400 transition-colors" />
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 group-hover:text-purple-300 transition-colors">
              {channel.name}
            </h3>
            <p className="text-gray-400 text-sm mb-4">{channel.category}</p>
            <a
              href={channel.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium text-center transition-colors"
            >
              Watch Live →
            </a>
          </div>
        </div>
      ))}
    </div>
  </section>
)}

      {/* Sources Modal */}
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
                        Free with Ads {source.format && `• ${source.format}`}
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
            </div>
          </div>
        </div>
      )}

      {/* Live Player Modal */}
      {tab === 'live' && (
  <section className="max-w-7xl mx-auto">
    <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
      <Radio className="text-purple-400" size={32} />
      Live & Free UK TV Channels
    </h2>
    <p className="text-gray-400 mb-10 text-lg">
      Click any service to open the official live or catch-up player in a new tab.<br />
      Some may require a UK TV licence or VPN if you're outside the UK.
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
            
            {/* Push button to bottom */}
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
      <footer className="max-w-7xl mx-auto mt-20 text-center text-gray-500 text-sm">
        <p>Only public & official free streams. All content belongs to its original owners.</p>
        <p className="mt-2">Powered by Watchmode & TMDB • Not affiliated with any streaming service.</p>
      </footer>
    </main>
  );
}
