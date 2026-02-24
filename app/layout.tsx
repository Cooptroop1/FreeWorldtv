import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreeStream World',
  description: 'Free movies, TV shows & live channels worldwide - no sign-up needed',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
  themeColor: '#111827', // Matches your dark background
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FreeStream World',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  openGraph: {
    title: 'FreeStream World',
    description: 'Discover free movies, TV shows and live channels from around the world',
    url: 'https://freestreamworld.com',
    siteName: 'FreeStream World',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'FreeStream World Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme & Icons */}
        <meta name="theme-color" content="#111827" />
        <meta name="msapplication-TileColor" content="#111827" />

        {/* Apple / iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FreeStream World" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        {/* Android / General Icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* Preload icons for faster load */}
        <link rel="preload" href="/icon-192.png" as="image" />
        <link rel="preload" href="/icon-512.png" as="image" />

        {/* Optional: Service Worker registration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('Service Worker registered'))
                    .catch(err => console.log('Service Worker failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
