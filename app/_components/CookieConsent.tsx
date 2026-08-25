'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const STORAGE_KEY = 'fsw-cookie-consent';

type Consent = { ads: boolean; analytics: boolean };

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.ads === 'boolean' && typeof parsed?.analytics === 'boolean') {
      return { ads: parsed.ads, analytics: parsed.analytics };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    setOpen(!saved);
    setReady(true);
    const reopen = () => {
      setOpen(true);
    };
    window.addEventListener('fsw:open-cookies', reopen);
    return () => window.removeEventListener('fsw:open-cookies', reopen);
  }, []);

  const save = (next: Consent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, ts: Date.now() }));
    setConsent(next);
    setOpen(false);
  };

  if (!ready) return null;

  return (
    <>
      {consent?.analytics && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
      {consent?.ads && (
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7060442609132196"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[100000] p-4 md:p-6">
          <div className="max-w-3xl mx-auto bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl p-5 md:p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Cookies & privacy</h2>
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              We use strictly necessary cookies to keep the site working (including sign-in if you use it).
              Analytics and ads cookies are optional and only load if you accept them. See our{' '}
              <a href="/privacy" className="text-blue-400 underline">Privacy Policy</a>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => save({ ads: true, analytics: true })}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                Accept all
              </button>
              <button
                onClick={() => save({ ads: false, analytics: false })}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                Necessary only
              </button>
              <button
                onClick={() => save({ ads: false, analytics: true })}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                Analytics only
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieSettingsLink({ className = 'text-blue-400 hover:underline' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('fsw:open-cookies'))}
      className={className}
    >
      Cookie settings
    </button>
  );
}
