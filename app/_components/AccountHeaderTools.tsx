'use client';

import { useEffect, useState } from 'react';
import { Bell, Tv } from 'lucide-react';
import { SERVICE_OPTIONS, type AlertItem } from '@/lib/account';

export default function AccountHeaderTools({ isSignedIn }: { isSignedIn: boolean }) {
  const [showApps, setShowApps] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('fsw_my_services') || '[]');
      if (Array.isArray(local)) setServices(local);
    } catch { /* ignore */ }
    if (!isSignedIn) return;
    fetch('/api/my-services')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.services) && d.services.length) setServices(d.services);
      })
      .catch(() => {});
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((d) => setAlerts(Array.isArray(d.alerts) ? d.alerts : []))
      .catch(() => {});
  }, [isSignedIn]);

  const unread = alerts.filter((a) => !a.read).length;

  const toggleService = (id: string) => {
    const next = services.includes(id) ? services.filter((s) => s !== id) : [...services, id];
    setServices(next);
    try { localStorage.setItem('fsw_my_services', JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('fsw-services', { detail: next }));
    if (isSignedIn) {
      fetch('/api/my-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: next }),
      }).catch(() => {});
    }
  };

  const markRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    if (isSignedIn) {
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      }).catch(() => {});
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setShowApps(true); setShowAlerts(false); }}
        className="px-3 py-2 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
      >
        <Tv size={16} /> My apps
      </button>
      {isSignedIn && (
        <button
          type="button"
          onClick={() => {
            setShowAlerts(true);
            setShowApps(false);
            markRead();
          }}
          className="relative p-2 text-gray-300 hover:text-white rounded-xl hover:bg-zinc-800"
          aria-label="Availability alerts"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {showApps && (
        <div className="fixed inset-0 z-[100000] bg-black/70 flex items-start justify-center p-4 pt-24" onClick={() => setShowApps(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1">Apps I have</h2>
            <p className="text-sm text-gray-400 mb-4">We’ll put these at the top of every sources list. Sign in to sync across devices.</p>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {SERVICE_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 bg-gray-800/70 px-3 py-2 rounded-xl text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={services.includes(opt.id)}
                    onChange={() => toggleService(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setShowApps(false)} className="mt-4 w-full py-2 rounded-xl bg-gray-700 hover:bg-gray-600">
              Done
            </button>
          </div>
        </div>
      )}

      {showAlerts && (
        <div className="fixed inset-0 z-[100000] bg-black/70 flex items-start justify-end p-4 pt-20" onClick={() => setShowAlerts(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">Saved titles leaving free</h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing yet. Heart a title and we’ll warn you if it drops off the free list in your country.</p>
            ) : (
              <ul className="space-y-3 max-h-[70vh] overflow-y-auto">
                {alerts.map((a) => (
                  <li key={a.id} className="bg-gray-800/70 rounded-xl p-3">
                    <p className="font-medium">{a.title}{a.year ? ` (${a.year})` : ''}</p>
                    <p className="text-sm text-amber-300">{a.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setShowAlerts(false)} className="mt-4 w-full py-2 rounded-xl bg-gray-700 hover:bg-gray-600">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
