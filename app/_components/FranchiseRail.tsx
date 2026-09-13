'use client';

import { useEffect, useRef, useState } from 'react';
import { Clapperboard, X } from 'lucide-react';
import type { FranchiseSet, FranchiseTitle } from '@/lib/franchises';

const EVENT = 'fsw-franchise';
const TMDB_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

function posterUrl(t: FranchiseTitle) {
  if (t.poster_path) return `https://image.tmdb.org/t/p/w342${t.poster_path}`;
  if (t.poster && t.poster.startsWith('http') && !t.poster.includes('watchmode.com')) return t.poster;
  return '';
}

function openSet(set: FranchiseSet) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: set }));
}

export function FranchisePosterModal({
  onSelect,
}: {
  onSelect: (title: FranchiseTitle) => void;
}) {
  const [active, setActive] = useState<FranchiseSet | null>(null);
  const fetched = useRef(new Set<number>());

  useEffect(() => {
    const onOpen = (e: Event) => {
      const set = (e as CustomEvent<FranchiseSet>).detail;
      if (set?.titles?.length) {
        fetched.current = new Set();
        setActive({ ...set, titles: set.titles.map((t) => ({ ...t })) });
      }
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!active || !TMDB_READ_TOKEN) return;
    const missing = active.titles.filter((t) => t.tmdb_id && !posterUrl(t) && !fetched.current.has(t.tmdb_id));
    if (!missing.length) return;
    missing.forEach((t) => fetched.current.add(t.tmdb_id as number));
    let cancelled = false;
    (async () => {
      const updates = await Promise.all(
        missing.slice(0, 40).map(async (t) => {
          try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${t.tmdb_id}?language=en-US`, {
              headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_READ_TOKEN}` },
            });
            if (!res.ok) return t;
            const json = await res.json();
            return { ...t, poster_path: json.poster_path || t.poster_path };
          } catch {
            return t;
          }
        })
      );
      if (cancelled) return;
      setActive((prev) => {
        if (!prev) return prev;
        const map = new Map(updates.map((u) => [u.id, u]));
        return { ...prev, titles: prev.titles.map((t) => map.get(t.id) || t) };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 md:p-8 overflow-y-auto"
      onClick={() => setActive(null)}
    >
      <div
        className="w-full max-w-5xl bg-zinc-950 border border-zinc-700 rounded-2xl p-5 md:p-8 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-sky-400 mb-1">Movie set</p>
            <h2 className="text-2xl font-bold text-white">{active.name}</h2>
            <p className="text-sm text-zinc-400 mt-1">{active.count} movies · pick one to see where to watch</p>
          </div>
          <button type="button" onClick={() => setActive(null)} className="text-zinc-400 hover:text-white text-3xl leading-none" aria-label="Close">
            <X />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {active.titles.map((t) => {
            const src = posterUrl(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelect({ ...t, poster_path: t.poster_path });
                  setActive(null);
                }}
                className="text-left group"
              >
                {src ? (
                  <img src={src} alt="" className="w-full aspect-[2/3] object-cover rounded-xl bg-zinc-800 group-hover:ring-2 ring-sky-400" />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-xl bg-zinc-800 flex items-end p-2">
                    <span className="text-xs text-zinc-400 line-clamp-3">{t.title}</span>
                  </div>
                )}
                <span className="block text-sm font-medium text-white mt-2 line-clamp-2">{t.title}</span>
                <span className="block text-xs text-zinc-500">{t.year || ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FranchiseRail({
  region,
  variant = 'both',
}: {
  region: string;
  onSelect?: (title: FranchiseTitle) => void;
  variant?: 'sidebar' | 'row' | 'both';
}) {
  const [sets, setSets] = useState<FranchiseSet[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/franchises?region=${region}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.franchises)) setSets(d.franchises);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [region]);

  if (!sets.length) return null;

  const card = (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950/90 backdrop-blur p-3.5 shadow-xl">
      <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
        <Clapperboard size={14} className="text-sky-400" /> Trending sets
      </h2>
      <p className="text-[11px] text-zinc-400 mb-3">Tap a set to see the movies.</p>
      <ul className="space-y-1.5">
        {sets.slice(0, 12).map((set) => (
          <li key={set.name}>
            <button
              type="button"
              onClick={() => openSet(set)}
              className="w-full text-left rounded-xl px-2.5 py-2 border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 hover:border-sky-500"
            >
              <span className="block text-xs font-semibold text-white leading-snug">{set.name}</span>
              <span className="block text-[10px] text-zinc-400">{set.count} movies</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      {variant !== 'row' && <div className={variant === 'sidebar' ? 'mt-3' : 'hidden 2xl:block mt-3'}>{card}</div>}
      {variant !== 'sidebar' && (
        <section className="2xl:hidden max-w-7xl mx-auto mb-8">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mb-2">
            <Clapperboard size={14} className="text-sky-400" /> Trending sets
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sets.slice(0, 12).map((set) => (
              <button
                key={set.name}
                type="button"
                onClick={() => openSet(set)}
                className="flex-shrink-0 rounded-xl px-3 py-2 border border-zinc-700 bg-zinc-900 text-left hover:border-sky-500"
              >
                <span className="block text-xs font-semibold text-white whitespace-nowrap">{set.name}</span>
                <span className="block text-[10px] text-zinc-400">{set.count} movies</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
