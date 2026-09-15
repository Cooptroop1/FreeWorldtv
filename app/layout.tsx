import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import AuthHeader from './_components/AuthHeader';
import { CookieConsent } from './_components/CookieConsent';

export const metadata: Metadata = {
  metadataBase: new URL('https://freestreamworld.com'),
  title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio (Legal)',
  description: 'Find legal free movies, TV, live TV and radio. Browse without an account — sign in to save watchlists, continue watching and recommend titles.',
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FreeStream World',
  },
  openGraph: {
    title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio',
    description: 'Legal free movies, TV, live TV and radio. Browse straight away, or sign in to save lists and recommendations.',
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
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreeStream World - Watch Free Movies, TV & Radio Legally',
    description: 'Legal free streaming discovery. Sign in to save watchlists and recommend titles.',
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
    <html lang="en-GB" className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <meta name="google-site-verification" content="v5peivsBuVQvw32Su3UT4btwIbndtLT1Eg4JGPDhM_E" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7060442609132196"
          crossOrigin="anonymous"
        />
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
                  "description": "Legal free streaming discovery — movies, live TV and radio. Optional account to save lists.",
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
        <ClerkProvider>
          <AuthHeader />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Skip to main content
          </a>
          <main id="main-content" className="pt-20">
            {children}
          </main>
        </ClerkProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
