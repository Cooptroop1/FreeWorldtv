// app/_components/OfflineMessage.tsx
'use client';

import { useState, useEffect } from 'react';

export default function OfflineMessage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/95 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium">
      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
      You are offline — cached content still works!
      <button
        onClick={() => window.location.reload()}
        className="ml-4 underline hover:no-underline text-xs"
      >
        Retry
      </button>
    </div>
  );
}
