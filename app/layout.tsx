import type { Metadata, Viewport } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows & Live TV (Legal)',
  description: 'Discover 100% legal free streaming movies, TV shows and live UK TV channels. No sign-up needed. Powered by Watchmode & TMDB.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
  },
  themeColor: '#111827',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FreeStream World',
  },
  openGraph: {
    title: 'FreeStream World - Free Legal Streaming',
    description: 'Watch free movies, TV shows & live TV legally from Tubi, Pluto TV, BBC iPlayer and more.',
    url: 'https://freestreamworld.com',
    siteName: 'FreeStream World',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'FreeStream World Logo' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreeStream World',
    description: 'Free & legal movies, TV shows & live TV',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://freestreamworld.com',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Site Verification */}
        <meta name="google-site-verification" content="v5peivsBuVQvw32Su3UT4btwIbndtLT1Eg4JGPDhM_E" />
        
        {/* AdSense global script */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7060442609132196"
          crossOrigin="anonymous"
        ></script>

        {/* Structured Data - Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "FreeStream World",
              "url": "https://freestreamworld.com",
              "logo": "https://freestreamworld.com/logo.png",
              "description": "100% legal free streaming discovery site",
              "sameAs": ["https://freestreamworld.com"]
            })
          }}
        />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('Service Worker registered with scope:', reg.scope))
                    .catch(err => console.log('Service Worker registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
