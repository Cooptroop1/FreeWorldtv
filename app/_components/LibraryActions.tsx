'use client';

import { Bookmark, Check, EyeOff } from 'lucide-react';
import type { LibraryStatus } from '@/lib/account';

export default function LibraryActions({
  status,
  onSet,
  compact = false,
}: {
  status: LibraryStatus | null;
  onSet: (status: LibraryStatus | null) => void;
  compact?: boolean;
}) {
  const btn = compact
    ? 'p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white'
    : 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs font-medium';

  return (
    <div className={`flex ${compact ? 'flex-col gap-1' : 'flex-wrap gap-2'}`}>
      <button
        type="button"
        className={btn}
        aria-label={status === 'want' ? 'Remove from watchlist' : 'Add to watchlist'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSet(status === 'want' ? null : 'want');
        }}
      >
        <Bookmark size={compact ? 16 : 14} className={status === 'want' ? 'fill-blue-400 text-blue-400' : ''} />
        {!compact && (status === 'want' ? 'On watchlist' : 'Watchlist')}
      </button>
      <button
        type="button"
        className={btn}
        aria-label={status === 'watched' ? 'Remove watched' : 'Mark watched'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSet(status === 'watched' ? null : 'watched');
        }}
      >
        <Check size={compact ? 16 : 14} className={status === 'watched' ? 'text-emerald-400' : ''} />
        {!compact && (status === 'watched' ? 'Watched' : 'Watched')}
      </button>
      <button
        type="button"
        className={btn}
        aria-label={status === 'hidden' ? 'Show in Discover again' : 'Hide from Discover'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSet(status === 'hidden' ? null : 'hidden');
        }}
      >
        <EyeOff size={compact ? 16 : 14} className={status === 'hidden' ? 'text-amber-400' : ''} />
        {!compact && (status === 'hidden' ? 'Hidden' : 'Hide')}
      </button>
    </div>
  );
}
