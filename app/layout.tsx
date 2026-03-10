import type { Metadata, Viewport } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio (Legal)',
  description: '100% legal free movies, TV shows, live channels and 50,000+ worldwide radio stations. Direct links to Tubi, Pluto TV, BBC iPlayer, ITVX and more. No sign-up needed.',
  keywords: ['free streaming', 'legal free movies', 'free TV shows', 'tubi', 'pluto tv', 'bbc iplayer', 'free live tv', 'free radio', 'internet radio', 'live radio stations', 'worldwide radio'],
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
    title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio',
    description: 'Watch completely free movies, TV shows, live TV and 50,000+ radio stations legally. No signup. No fees.',
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
    title: 'FreeStream World - Watch Free Movies, TV & Radio Legally',
    description: '100% legal free streaming including movies, live TV and worldwide radio stations.',
    images: ['https://freestreamworld.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111827',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Force dark mode on iPad / iOS Safari */}
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        {/* Google Site Verification */}
        <meta name="google-site-verification" content="v5peivsBuVQvw32Su3UT4btwIbndtLT1Eg4JGPDhM_E" />
        {/* Structured Data */}
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
                  "description": "100% legal free streaming discovery site with movies, live TV and radio",
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
        {/* Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
       <body className="antialiased dark bg-[#111827]">
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
       
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7060442609132196"
          crossOrigin="anonymous"
        ></script>
      </body>
    </html>
  );
}
