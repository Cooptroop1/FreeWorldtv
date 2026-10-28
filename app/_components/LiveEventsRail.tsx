'use client';

import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';

type LiveLink = { name: string; url: string; subscription: boolean | null };
type LiveEvent = {
  id: number;
  name: string;
  league: string;
  start: string;
  status: string;
  links: LiveLink[];
};

const SUPPORTED = new Set(['US', 'GB']);

function when(iso: string) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveEventsRail({ region }: { region: string }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const code = region.toUpperCase();

  useEffect(() => {
    if (!SUPPORTED.has(code)) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/live-events?region=${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const now = Date.now() - 3 * 60 * 60 * 1000;
        const rows = (Array.isArray(data.events) ? data.events : []).filter((event: LiveEvent) => {
          if (event.status === 'final' || event.status === 'cancelled') return false;
          const start = new Date(event.start).getTime();
          return !start || start > now;
        });
        setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!SUPPORTED.has(code) || events.length === 0) return null;

  return (
    <section className="mb-8 px-4" aria-labelledby="live-events-heading">
      <h2 id="live-events-heading" className="text-2xl font-bold mb-1 flex items-center gap-2">
        <Radio size={20} className="text-emerald-400" /> Live sports & events
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        A sample for the UK and the US. Most of these are on a channel or a subscription, not the free film list.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <article key={event.id} className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-400">
              {event.status === 'live' ? 'Live now' : event.league || 'Event'}
            </p>
            <h3 className="font-semibold text-white mt-1">{event.name}</h3>
            {event.start && <p className="text-sm text-gray-400 mt-1">{when(event.start)}</p>}
            {event.links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {event.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1 rounded-full bg-white text-black hover:bg-gray-200"
                  >
                    {link.name}
                    {link.subscription ? ' · sub' : ''}
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
