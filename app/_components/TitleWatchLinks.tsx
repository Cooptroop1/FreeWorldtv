'use client';

import { useEffect, useState } from 'react';
import { isSafeHttpUrl } from '@/lib/safe-url';
import { sortByMyServices, sourceMatchesServices } from '@/lib/account';

type Source = { name?: string; web_url?: string; android_url?: string; ios_url?: string; format?: string };

export default function TitleWatchLinks({
  id,
  region,
  paid,
}: {
  id: number;
  region: string;
  paid: boolean;
}) {
  const [free, setFree] = useState<Source[]>([]);
  const [premium, setPremium] = useState<Source[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('fsw_my_services') || '[]');
      if (Array.isArray(local)) setServices(local);
    } catch { /* ignore */ }
    fetch('/api/my-services')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.services) && d.services.length) setServices(d.services);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/title-sources?id=${id}&region=${region}&paid=${paid}`);
        const json = await res.json();
        if (cancelled) return;
        setFree(json.freeSources || []);
        setPremium(json.paidSources || []);
      } catch {
        if (!cancelled) {
          setFree([]);
          setPremium([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, region, paid]);

  if (loading) return <p className="mt-8 text-gray-400">Loading official watch links…</p>;

  const render = (list: Source[], label: string) => {
    const sorted = sortByMyServices(list, services);
    if (!sorted.length) return null;
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">{label}</h2>
        <div className="space-y-3">
          {sorted.map((source, idx) => {
            const href = isSafeHttpUrl(source.web_url || '') ? source.web_url : undefined;
            if (!href) return null;
            const mine = sourceMatchesServices(source.name || '', services);
            const android = isSafeHttpUrl(source.android_url || '') ? source.android_url : undefined;
            const ios = isSafeHttpUrl(source.ios_url || '') ? source.ios_url : undefined;
            return (
              <a
                key={`${source.name}-${idx}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between bg-gray-800/70 p-4 rounded-xl hover:bg-gray-700/70 border ${mine ? 'border-violet-500' : 'border-gray-700'}`}
              >
                <span className="font-medium">
                  {source.name}
                  {mine && <span className="ml-2 text-[10px] uppercase tracking-wide text-violet-300">Your app</span>}
                </span>
                <span className="text-blue-400 text-sm flex gap-3">
                  {android && <span>Android</span>}
                  {ios && <span>iOS</span>}
                  Watch now →
                </span>
              </a>
            );
          })}
        </div>
      </section>
    );
  };

  if (!free.length && !premium.length) {
    return <p className="mt-8 text-gray-400">No official sources listed for {region} right now.</p>;
  }

  return (
    <div className="mt-4">
      {render(free, 'Free with ads')}
      {render(premium, 'Subscription')}
    </div>
  );
}
