'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X, Loader2 } from 'lucide-react';

interface GlobalSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onTitleSelect: (title: any) => void;
  region: string;
  contentType: string;     // "movie", "tv_series", or ""
  paidOnly: boolean;       // ← NEW: true = search paid only, false = search free only
}

export default function GlobalSearch({
  searchQuery,
  setSearchQuery,
  onTitleSelect,
  region,
  contentType,
  paidOnly
}: GlobalSearchProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const postersFetched = useRef(new Set<number>());
  const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';
  const prevQueryRef = useRef('');

  // 24h client cache
  const getCacheKey = (query: string) => `search_cache_${query.trim().toLowerCase()}_${region}_${contentType}_${paidOnly}`;
  const getCachedSuggestions = (query: string) => {
    const cached = localStorage.getItem(getCacheKey(query));
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getCacheKey(query));
      return null;
    }
    return data;
  };
  const saveToCache = (query: string, titles: any[]) => {
    localStorage.setItem(getCacheKey(query), JSON.stringify({ data: titles, timestamp: Date.now() }));
  };

  // Main search — section-specific (free OR paid only)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed !== prevQueryRef.current) {
      postersFetched.current.clear();
      prevQueryRef.current = trimmed;
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      const cached = getCachedSuggestions(trimmed);
      if (cached) {
        setSuggestions(cached.slice(0, 20));
        setShowDropdown(true);
        return;
      }

      setLoading(true);
      setShowDropdown(true);

      try {
        const paidParam = paidOnly ? 'true' : 'false';
        const res = await fetch(
          `/api/cached-fetch?query=${encodeURIComponent(trimmed)}&types=${contentType}&paid=${paidParam}&page=1`
        );
        const json = await res.json();
        const results = json.success && Array.isArray(json.titles) ? json.titles : [];
        setSuggestions(results.slice(0, 20));
        if (results.length > 0) saveToCache(trimmed, results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, contentType, paidOnly]);

  // Poster enrichment (unchanged)
  useEffect(() => {
    if (!TMDB_READ_TOKEN || suggestions.length === 0) return;
    const needsPoster = suggestions.filter((t: any) =>
      t.tmdb_id && !t.poster_path && !postersFetched.current.has(t.tmdb_id)
    );
    if (needsPoster.length === 0) return;

    const enrich = async () => {
      const batch = needsPoster.slice(0, 20);
      const updates = await Promise.all(
        batch.map(async (title: any) => {
          postersFetched.current.add(title.tmdb_id);
          const endpoint = title.type === 'tv_series' ? 'tv' : 'movie';
          try {
            const res = await fetch(
              `https://api.themoviedb.org/3/${endpoint}/${title.tmdb_id}?language=en-US`,
              { headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` } }
            );
            const data = await res.json();
            return { ...title, poster_path: data.poster_path };
          } catch {
            return title;
          }
        })
      );
      setSuggestions(prev => prev.map(t => updates.find(u => u.id === t.id) || t));
    };
    enrich();
  }, [suggestions, TMDB_READ_TOKEN]);

  const handleSelect = (title: any) => {
    onTitleSelect(title);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-[280px]">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={paidOnly ? "Search paid movies & shows" : "Search free movies & shows"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        {searchQuery && (
          <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-h-[420px] overflow-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((title: any) => (
              <div
                key={title.id}
                onClick={() => handleSelect(title)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800 cursor-pointer transition-colors group"
              >
                <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                  {title.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w200${title.poster_path}`}
                      alt={title.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                      loading="lazy"
                      quality={75}
                      unoptimized={true}
                    />
                  ) : (
                    <img src="/fallback-poster.jpg" alt={title.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white group-hover:text-blue-400 line-clamp-1">{title.title}</p>
                  <p className="text-xs text-gray-400">
                    {title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-gray-400">
              No matches found for <span className="font-medium text-white">"{searchQuery}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
