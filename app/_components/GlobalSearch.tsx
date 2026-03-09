'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X, Loader2 } from 'lucide-react';

interface GlobalSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onTitleSelect: (title: any) => void;
  region: string;
  contentType: string;
}

export default function GlobalSearch({
  searchQuery,
  setSearchQuery,
  onTitleSelect,
  region,
  contentType
}: GlobalSearchProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // === 24h CLIENT-SIDE CACHE FOR SEARCH (on top of your backend cache) ===
  const getCacheKey = (query: string) => 
    `search_cache_${query.trim().toLowerCase()}_${region}_${contentType}`;

  const getCachedSuggestions = (query: string) => {
    const key = getCacheKey(query);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000;
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  };

  const saveToCache = (query: string, titles: any[]) => {
    const key = getCacheKey(query);
    localStorage.setItem(key, JSON.stringify({
      data: titles,
      timestamp: Date.now()
    }));
  };

  // Live autocomplete with 24h cache
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      // Check client-side 24h cache first
      const cached = getCachedSuggestions(trimmed);
      if (cached) {
        setSuggestions(cached.slice(0, 8));
        setShowDropdown(true);
        return;
      }

      setLoading(true);
      setShowDropdown(true);

      try {
        const res = await fetch(
          `/api/cached-fetch?query=${encodeURIComponent(trimmed)}&region=${region}&page=1&types=${encodeURIComponent(contentType)}`
        );
        const json = await res.json();

        const results = json.success && Array.isArray(json.titles) ? json.titles : [];
        setSuggestions(results.slice(0, 8));

        // Save to 24h client cache
        if (results.length > 0) {
          saveToCache(trimmed, results);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400); // slightly better debounce

    return () => clearTimeout(timer);
  }, [searchQuery, region, contentType]);

  // Click outside → close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (title: any) => {
    onTitleSelect(title);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-[280px]">
      <label htmlFor="global-search-input" className="sr-only">
        Search free movies and TV shows
      </label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          id="global-search-input"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-suggestions"
          placeholder="Search free movies & shows (min 3 letters)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim().length >= 3 && setShowDropdown(true)}
          className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* AUTOCOMPLETE DROPDOWN */}
      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-h-[420px] overflow-auto py-2"
          aria-live="polite"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
              Searching our 24h cache...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((title: any) => (
              <div
                key={title.id}
                role="option"
                onClick={() => handleSelect(title)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800 cursor-pointer transition-colors group"
              >
                <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                  <Image
                    src={title.poster_path
                      ? `https://image.tmdb.org/t/p/w200${title.poster_path}`
                      : '/fallback-poster.jpg'}
                    alt={`${title.title} poster`}
                    fill
                    className="object-cover"
                    sizes="48px"
                    loading="lazy"
                    quality={75}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-poster.jpg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {title.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {title.year} • {title.type === 'tv_series' ? 'TV Series' : 'Movie'}
                  </p>
                </div>
                <div className="text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all pr-2">
                  View sources →
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              No free titles found for <span className="font-medium text-white">"{searchQuery.trim()}"</span>
              <div className="text-xs mt-1">Try a different word or check spelling</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
