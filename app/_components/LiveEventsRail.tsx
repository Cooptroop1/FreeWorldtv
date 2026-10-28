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
  const [loading, setLoading] = useState(true);
  const code = region.toUpperCase();
  const supported = SUPPORTED.has(code);

  useEffect(() => {
    if (!supported) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, supported]);

  return (
    <section className="mb-8" aria-labelledby="live-events-heading">
      <h2 id="live-events-heading" className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Radio size={28} className="text-emerald-400" /> Sport
      </h2>
      <p className="text-gray-400 mb-6">
        A sample for the UK and the US. Most of these are on a channel or a subscription, not the free film list.
      </p>
      {!supported && (
        <p className="text-gray-300">Switch to the UK or the US to see this. It is not available for the other countries.</p>
      )}
      {supported && loading && <p className="text-gray-400">Loading events…</p>}
      {supported && !loading && events.length === 0 && (
        <p className="text-gray-300">Nothing in the sample right now.</p>
      )}
      {events.length > 0 && (
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
      )}
    </section>
  );
}
