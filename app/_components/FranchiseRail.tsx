'use client';

import { useEffect, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import type { FranchiseSet, FranchiseTitle } from '@/lib/franchises';

export default function FranchiseRail({
  region,
  onSelect,
  variant = 'both',
}: {
  region: string;
  onSelect: (title: FranchiseTitle) => void;
  variant?: 'sidebar' | 'row' | 'both';
}) {
  const [sets, setSets] = useState<FranchiseSet[]>([]);
  const [open, setOpen] = useState<string | null>(null);

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

  const active = sets.find((s) => s.name === open);

  const card = (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950/90 backdrop-blur p-3.5 shadow-xl">
      <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
        <Clapperboard size={14} className="text-sky-400" /> Trending sets
      </h2>
      <p className="text-[11px] text-zinc-400 mb-3">Trilogies and series with 2+ movies, from this country’s free list.</p>
      <ul className="space-y-1.5">
        {sets.slice(0, 8).map((set) => (
          <li key={set.name}>
            <button
              type="button"
              onClick={() => setOpen(open === set.name ? null : set.name)}
              className={`w-full text-left rounded-xl px-2.5 py-2 border ${open === set.name ? 'border-sky-500 bg-sky-950/50' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800'}`}
            >
              <span className="block text-xs font-semibold text-white leading-snug">{set.name}</span>
              <span className="block text-[10px] text-zinc-400">{set.count} movies</span>
            </button>
          </li>
        ))}
      </ul>
      {active && (
        <ul className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">
          {active.titles.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                className="w-full flex gap-2 text-left items-center rounded-lg hover:bg-zinc-800 p-1"
              >
                {t.poster ? (
                  <img src={t.poster} alt="" className="w-8 h-11 object-cover rounded bg-zinc-800 flex-shrink-0" />
                ) : (
                  <div className="w-8 h-11 rounded bg-zinc-800 flex-shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block text-[11px] text-white leading-snug line-clamp-2">{t.title}</span>
                  <span className="block text-[10px] text-zinc-500">{t.year || ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
              onClick={() => setOpen(open === set.name ? null : set.name)}
              className={`flex-shrink-0 rounded-xl px-3 py-2 border text-left ${open === set.name ? 'border-sky-500 bg-sky-950' : 'border-zinc-700 bg-zinc-900'}`}
            >
              <span className="block text-xs font-semibold text-white whitespace-nowrap">{set.name}</span>
              <span className="block text-[10px] text-zinc-400">{set.count} movies</span>
            </button>
          ))}
        </div>
        {active && (
          <div className="flex gap-3 overflow-x-auto pb-2 mt-2">
            {active.titles.map((t) => (
              <button key={t.id} type="button" onClick={() => onSelect(t)} className="w-24 flex-shrink-0 text-left">
                {t.poster ? (
                  <img src={t.poster} alt="" className="w-24 h-36 object-cover rounded-xl bg-zinc-800" />
                ) : (
                  <div className="w-24 h-36 rounded-xl bg-zinc-800" />
                )}
                <span className="block text-[11px] text-white mt-1 line-clamp-2">{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      )}
    </>
  );
}
