'use client';

import { useEffect, useState } from 'react';
import { Clapperboard, X } from 'lucide-react';
import type { FranchiseSet, FranchiseTitle } from '@/lib/franchises';

const EVENT = 'fsw-franchise';

function openSet(set: FranchiseSet) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: set }));
}

export function FranchisePosterModal({
  onSelect,
}: {
  onSelect: (title: FranchiseTitle) => void;
}) {
  const [active, setActive] = useState<FranchiseSet | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const set = (e as CustomEvent<FranchiseSet>).detail;
      if (set?.titles?.length) setActive(set);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

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
          {active.titles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onSelect(t);
                setActive(null);
              }}
              className="text-left group"
            >
              {t.poster ? (
                <img src={t.poster} alt="" className="w-full aspect-[2/3] object-cover rounded-xl bg-zinc-800 group-hover:ring-2 ring-sky-400" />
              ) : (
                <div className="w-full aspect-[2/3] rounded-xl bg-zinc-800" />
              )}
              <span className="block text-sm font-medium text-white mt-2 line-clamp-2">{t.title}</span>
              <span className="block text-xs text-zinc-500">{t.year || ''}</span>
            </button>
          ))}
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
        {sets.slice(0, 8).map((set) => (
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
            {sets.slice(0, 8).map((set) => (
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
