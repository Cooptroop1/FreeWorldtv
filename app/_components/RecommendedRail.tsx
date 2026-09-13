'use client';

import { useCallback, useEffect, useState } from 'react';
import { SignInButton } from '@clerk/nextjs';
import { Star, X } from 'lucide-react';
import type { BoardItem, RecItem } from '@/lib/recs';

function posterSrc(item: { poster?: string | null; poster_path?: string }) {
  if (item.poster_path) return `https://image.tmdb.org/t/p/w92${item.poster_path}`;
  if (item.poster) return item.poster;
  return '';
}

export default function RecommendedRail({
  isSignedIn,
  onSelect,
}: {
  isSignedIn: boolean;
  onSelect: (title: RecItem | BoardItem) => void;
}) {
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [mine, setMine] = useState<RecItem[]>([]);
  const [limit, setLimit] = useState(5);
  const [admin, setAdmin] = useState(false);

  const load = useCallback(() => {
    fetch('/api/recommendations')
      .then((r) => r.json())
      .then((d) => {
        setBoard(Array.isArray(d.board) ? d.board : []);
        setMine(Array.isArray(d.mine) ? d.mine : []);
        setAdmin(Boolean(d.admin));
        if (d.limit) setLimit(d.limit);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('fsw-recs', onChange);
    return () => window.removeEventListener('fsw-recs', onChange);
  }, [load]);

  const remove = (id: number) => {
    fetch(`/api/recommendations?id=${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((d) => {
        if (d.mine) setMine(d.mine);
        if (d.board) setBoard(d.board);
        window.dispatchEvent(new Event('fsw-recs'));
      })
      .catch(() => {});
  };

  const moderate = (id: number, action: 'title' | 'review') => {
    fetch('/api/recommendations/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.board) setBoard(d.board);
        window.dispatchEvent(new Event('fsw-recs'));
      })
      .catch(() => {});
  };

  const list = (
    <ul className="space-y-2">
      {board.length === 0 && (
        <li className="text-xs text-zinc-400 leading-relaxed">
          Nobody’s picked yet. Sign in, open a title you liked, and recommend it.
        </li>
      )}
      {board.map((item, i) => (
        <li key={item.id} className="relative">
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="w-full flex gap-2 text-left rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 p-2"
          >
            <span className="text-xs font-bold text-amber-400 w-4 flex-shrink-0 pt-3">{i + 1}</span>
            {posterSrc(item) ? (
              <img src={posterSrc(item)} alt="" className="w-10 h-14 object-cover rounded-md flex-shrink-0 bg-zinc-800" />
            ) : (
              <div className="w-10 h-14 rounded-md bg-zinc-800 flex-shrink-0" />
            )}
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white leading-snug line-clamp-2">{item.title}</span>
              <span className="block text-[11px] text-zinc-400">
                {item.year || ''} · {item.count} rec{item.count === 1 ? '' : 's'}
                {item.stars ? ` · ${Number(item.stars).toFixed(1)}★` : ''}
              </span>
              {item.reviews[0]?.text && (
                <span className="block text-[11px] text-zinc-300 italic mt-0.5 line-clamp-2">“{item.reviews[0].text}”</span>
              )}
            </span>
          </button>
          {admin && (
            <div className="flex gap-1 mt-1">
              {item.reviews[0]?.text && (
                <button
                  type="button"
                  onClick={() => moderate(item.id, 'review')}
                  className="text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800"
                >
                  Hide review
                </button>
              )}
              <button
                type="button"
                onClick={() => moderate(item.id, 'title')}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-zinc-800"
              >
                Remove
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <aside className="hidden 2xl:block fixed right-3 top-24 z-30 w-56 max-h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
        <div className="rounded-2xl border border-zinc-700 bg-zinc-950/90 backdrop-blur p-3 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
            <Star size={14} className="text-amber-400" fill="currentColor" /> Recommended
          </h2>
          <p className="text-[11px] text-zinc-400 mb-3">Top picks from people on FreeStream World.</p>
          {list}
          <div className="mt-3 pt-3 border-t border-zinc-800">
            {isSignedIn ? (
              <p className="text-[11px] text-zinc-400">
                Your picks {mine.length}/{limit}. Open a title to add a short review.
              </p>
            ) : (
              <SignInButton mode="modal">
                <button type="button" className="w-full text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg py-2">
                  Sign in to recommend
                </button>
              </SignInButton>
            )}
            {isSignedIn && mine.length > 0 && (
              <ul className="mt-2 space-y-1">
                {mine.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-1 text-[11px] text-zinc-300">
                    <button type="button" className="truncate text-left hover:text-white" onClick={() => onSelect(item)}>
                      {item.title}
                    </button>
                    <button type="button" className="text-zinc-500 hover:text-white" onClick={() => remove(item.id)} aria-label="Remove">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      <section className="2xl:hidden max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Star size={14} className="text-amber-400" fill="currentColor" /> Recommended by viewers
          </h2>
          {!isSignedIn && (
            <SignInButton mode="modal">
              <button type="button" className="text-[11px] text-violet-300 hover:text-white">Sign in to add yours</button>
            </SignInButton>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {board.length === 0 && (
            <p className="text-xs text-zinc-400">Be the first — open a title and recommend it.</p>
          )}
          {board.map((item) => (
            <div key={item.id} className="w-28 flex-shrink-0">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full text-left"
              >
                {posterSrc(item) ? (
                  <img src={posterSrc(item)} alt="" className="w-28 h-40 object-cover rounded-xl bg-zinc-800" />
                ) : (
                  <div className="w-28 h-40 rounded-xl bg-zinc-800" />
                )}
                <span className="block text-xs font-medium text-white mt-1 line-clamp-2">{item.title}</span>
                <span className="block text-[10px] text-amber-300">
                  {item.stars ? `${Number(item.stars).toFixed(1)}★ · ` : ''}{item.count} recs
                </span>
              </button>
              {admin && (
                <button
                  type="button"
                  onClick={() => moderate(item.id, 'title')}
                  className="text-[10px] text-red-400 mt-1"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
