import type { Metadata, Viewport } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows & Live TV (Legal)',
  description: 'Discover 100% legal free streaming movies, TV shows and live UK TV channels. No sign-up needed. Powered by Watchmode & TMDB.',
  keywords: ['free streaming', 'legal free movies', 'free TV shows', 'tubi', 'pluto tv', 'bbc iplayer', 'free live tv', 'watch free movies'],
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
    title: 'FreeStream World - Free Legal Movies & TV Shows',
    description: 'Watch completely free movies, TV shows & live TV legally from Tubi, Pluto TV, BBC iPlayer and more. No signup. No fees.',
    url: 'https://freestreamworld.com',
    siteName: 'FreeStream World',
    images: [
      {
        url: 'https://freestreamworld.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FreeStream World - Free Legal Streaming',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreeStream World - Watch Free Movies & TV Legally',
    description: '100% legal free streaming. Thousands of movies, shows & live channels. No signup needed.',
    images: ['https://freestreamworld.com/og-image.jpg'],
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
              "@graph": [
                {
                  "@type": "Organization",
                  "name": "FreeStream World",
                  "url": "https://freestreamworld.com",
                  "logo": "https://freestreamworld.com/logo.png",
                  "description": "100% legal free streaming discovery site",
                  "sameAs": ["https://freestreamworld.com"]
                },
                {
                  "@type": "WebSite",
                  "name": "FreeStream World",
                  "url": "https://freestreamworld.com",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://freestreamworld.com/?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
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
        {/* Skip to main content - Accessibility boost */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Skip to main content
        </a>

        <main id="main-content">
          {children}
        </main>

        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
