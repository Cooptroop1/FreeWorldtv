'use client';

import { useEffect, useState } from 'react';

export default function EpisodeList({ titleId, type }: { titleId?: number; type?: string }) {
  const [data, setData] = useState<{ available: boolean; episodes: { id?: number; name?: string; episode_number?: number; season_number?: number; web_url?: string }[]; message?: string } | null>(null);

  useEffect(() => {
    if (!titleId) return;
    if (type && type !== 'tv_series' && type !== 'tv') return;
    fetch(`/api/title-episodes?id=${titleId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [titleId, type]);

  if (!titleId || (type && type !== 'tv_series' && type !== 'tv')) return null;
  if (!data) return null;
  if (!data.available) {
    return (
      <p className="text-xs text-zinc-500 mt-4">
        Episode-by-episode watch links will show here when Watchmode Startup is on.
      </p>
    );
  }
  if (!data.episodes?.length) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2 text-gray-300">Episodes</h3>
      <ul className="space-y-1 max-h-48 overflow-y-auto text-sm text-zinc-300">
        {data.episodes.slice(0, 20).map((ep, i) => (
          <li key={ep.id || i}>
            S{ep.season_number ?? '?'}E{ep.episode_number ?? i + 1} {ep.name || ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
