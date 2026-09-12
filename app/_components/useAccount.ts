'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { slimTitle, type LibraryItem, type LibraryStatus } from '@/lib/account';

const LIBRARY_KEY = 'fsw_library';
const SERVICES_KEY = 'fsw_my_services';

export function useAccount(isSignedIn?: boolean, userId?: string, region?: string) {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [myServices, setMyServices] = useState<string[]>([]);

  const persistLibrary = useCallback(async (next: LibraryItem[]) => {
    setLibrary(next);
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    if (isSignedIn && userId) {
      fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library: next }),
      }).catch(() => {});
    }
  }, [isSignedIn, userId]);

  const persistServices = useCallback(async (next: string[]) => {
    setMyServices(next);
    try { localStorage.setItem(SERVICES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    if (isSignedIn && userId) {
      fetch('/api/my-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: next }),
      }).catch(() => {});
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const localLib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
        const localSvc = JSON.parse(localStorage.getItem(SERVICES_KEY) || '[]');
        if (!cancelled) {
          if (Array.isArray(localLib)) setLibrary(localLib);
          if (Array.isArray(localSvc)) setMyServices(localSvc);
        }
      } catch { /* ignore */ }

      if (!isSignedIn || !userId) return;
      try {
        const [libRes, svcRes] = await Promise.all([
          fetch('/api/library'),
          fetch('/api/my-services'),
        ]);
        const libJson = await libRes.json();
        const svcJson = await svcRes.json();
        if (cancelled) return;
        const cloudLib: LibraryItem[] = Array.isArray(libJson.library) ? libJson.library : [];
        const cloudSvc: string[] = Array.isArray(svcJson.services) ? svcJson.services : [];
        const localLib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
        const map = new Map<number, LibraryItem>();
        [...(Array.isArray(localLib) ? localLib : []), ...cloudLib].forEach((item: LibraryItem) => {
          if (item?.id) map.set(item.id, item);
        });
        const merged = Array.from(map.values());
        setLibrary(merged);
        if (localLib.length) {
          await persistLibrary(merged);
          localStorage.removeItem(LIBRARY_KEY);
        } else {
          try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        }
        if (cloudSvc.length) {
          setMyServices(cloudSvc);
          try { localStorage.setItem(SERVICES_KEY, JSON.stringify(cloudSvc)); } catch { /* ignore */ }
        }
        fetch('/api/prefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region: region || 'GB' }),
        }).catch(() => {});
      } catch {
        /* keep local */
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, userId]);

  useEffect(() => {
    const onServices = (event: Event) => {
      const next = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(next)) setMyServices(next);
    };
    window.addEventListener('fsw-services', onServices);
    return () => window.removeEventListener('fsw-services', onServices);
  }, []);

  useEffect(() => {
    if (isSignedIn && userId && region) {
      fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      }).catch(() => {});
    }
  }, [isSignedIn, userId, region]);

  const setStatus = useCallback((title: Record<string, unknown>, status: LibraryStatus | null) => {
    const rest = library.filter((item) => item.id !== Number(title.id));
    if (!status) {
      persistLibrary(rest);
      return;
    }
    persistLibrary([slimTitle(title, status), ...rest].slice(0, 400));
  }, [library, persistLibrary]);

  const hiddenIds = useMemo(
    () => new Set(library.filter((i) => i.status === 'hidden').map((i) => i.id)),
    [library]
  );
  const watchlist = useMemo(() => library.filter((i) => i.status === 'want'), [library]);
  const watched = useMemo(() => library.filter((i) => i.status === 'watched'), [library]);
  const hidden = useMemo(() => library.filter((i) => i.status === 'hidden'), [library]);

  const statusOf = useCallback(
    (id: number) => library.find((i) => i.id === id)?.status || null,
    [library]
  );

  return {
    library,
    myServices,
    setMyServices: persistServices,
    setStatus,
    statusOf,
    hiddenIds,
    watchlist,
    watched,
    hidden,
  };
}
