'use client';

import { useEffect, useRef, useState } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SLOT, CONSENT_EVENT, CONSENT_STORAGE_KEY } from '@/lib/ads';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

function adsAllowed() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.ads === true;
  } catch {
    return false;
  }
}

export default function AdSlot({
  className = '',
  slot = ADSENSE_SLOT,
}: {
  className?: string;
  slot?: string;
}) {
  const [allowed, setAllowed] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    const sync = () => setAllowed(adsAllowed());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!allowed || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({} as unknown);
      pushed.current = true;
    } catch {
      /* AdSense not ready yet */
    }
  }, [allowed]);

  if (!allowed) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 text-center">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot || undefined}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
