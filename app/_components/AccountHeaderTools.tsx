'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Tv, X } from 'lucide-react';
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
        className="px-3.5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all flex items-center gap-2 shadow-sm"
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
          className="relative p-2 text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl"
          aria-label="Availability alerts"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {showApps && (
        <div className="fixed inset-0 z-[100000] bg-black/80 flex items-start justify-center p-4 pt-24" onClick={() => setShowApps(false)}>
          <div
            className="bg-zinc-950 text-white border border-zinc-600 rounded-2xl w-full max-w-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Apps I have</h2>
                <p className="text-sm text-zinc-300 mt-1">
                  Tick the services you use. They’ll sit at the top of every watch list.
                  {!isSignedIn && ' Sign in to sync across devices.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApps(false)}
                className="text-zinc-300 hover:text-white p-1"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {SERVICE_OPTIONS.map((opt) => {
                const on = services.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleService(opt.id)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-left transition-all border ${
                      on
                        ? 'bg-violet-600 border-violet-400 text-white'
                        : 'bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                        on ? 'bg-white border-white text-violet-700' : 'bg-zinc-900 border-zinc-500 text-transparent'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              {services.length ? `${services.length} selected` : 'None selected yet'}
            </p>
            <button
              type="button"
              onClick={() => setShowApps(false)}
              className="mt-4 w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showAlerts && (
        <div className="fixed inset-0 z-[100000] bg-black/80 flex items-start justify-end p-4 pt-20" onClick={() => setShowAlerts(false)}>
          <div
            className="bg-zinc-950 text-white border border-zinc-600 rounded-2xl w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Saved titles leaving free</h2>
              <button type="button" onClick={() => setShowAlerts(false)} className="text-zinc-300 hover:text-white" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-zinc-300">Nothing yet. Heart a title and we’ll warn you if it drops off the free list in your country.</p>
            ) : (
              <ul className="space-y-3 max-h-[70vh] overflow-y-auto">
                {alerts.map((a) => (
                  <li key={a.id} className="bg-zinc-800 border border-zinc-600 rounded-xl p-3">
                    <p className="font-medium text-white">{a.title}{a.year ? ` (${a.year})` : ''}</p>
                    <p className="text-sm text-amber-300">{a.message}</p>
                    <p className="text-xs text-zinc-400 mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowAlerts(false)}
              className="mt-4 w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
