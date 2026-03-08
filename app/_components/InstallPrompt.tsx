// app/_components/InstallPrompt.tsx
'use client';
import { useState, useEffect, useRef } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Never show again if user already installed it (even after closing browser)
    if (localStorage.getItem('pwaInstalled') === 'true') {
      return;
    }

    // Don't spam in the same session if they clicked "Later"
    if (sessionStorage.getItem('pwaPromptShown') === 'true') {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      if (!hasShownRef.current) {
        hasShownRef.current = true;
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwaInstalled', 'true'); // Never show again — ever
    }
    
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleLater = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwaPromptShown', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-md w-full mx-4 border border-white/20">
      <div className="flex-1">
        <div className="font-bold text-lg flex items-center gap-2">
          📺 Install FreeStream World
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">PWA</span>
        </div>
        <p className="text-sm opacity-90 mt-1">Get instant access + offline mode. Takes 2 seconds.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleLater}
          className="px-5 py-2 text-sm font-medium rounded-xl hover:bg-white/10 transition"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="bg-white text-purple-700 px-6 py-2 text-sm font-semibold rounded-xl hover:bg-white/90 transition flex items-center gap-2"
        >
          Install Now
        </button>
      </div>
    </div>
  );
}
