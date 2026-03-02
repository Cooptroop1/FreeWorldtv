'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X, Loader2 } from 'lucide-react';

interface GlobalSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onTitleSelect: (title: any) => void;
  region: string;
}

export default function GlobalSearch({ searchQuery, setSearchQuery, onTitleSelect, region }: GlobalSearchProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Live autocomplete (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/cached-fetch?query=${encodeURIComponent(searchQuery.trim())}&region=${region}&page=1`
        );
        const json = await res.json();
        const titles = json.success && json.titles ? json.titles.slice(0, 8) : [];
        setSuggestions(titles);
        setShowDropdown(titles.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
      setLoading(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, region]);

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
    onTitleSelect(title);           // ← instantly opens your Sources modal
    setShowDropdown(false);
    // Query stays in the input so the Discover tab still filters (your existing logic)
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
          type="text"
          placeholder="Search free movies & shows (e.g. The Bear, NCIS...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
          className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* AUTOCOMPLETE DROPDOWN */}
      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-h-[420px] overflow-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Finding free titles...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((title: any) => (
              <div
                key={title.id}
                onClick={() => handleSelect(title)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800 cursor-pointer transition-colors group"
              >
                <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-700">
                  {title.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w200${title.poster_path}`}
                      alt={title.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Search size={18} className="text-gray-600" />
                    </div>
                  )}
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
                  Open →
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
