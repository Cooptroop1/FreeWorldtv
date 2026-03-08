import type { Metadata, Viewport } from 'next';
import MainApp from './_components/MainApp';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio',
  description: '100% legal free movies, TV shows, live channels and 50,000+ worldwide radio stations. Direct links to Tubi, Pluto TV, BBC iPlayer, ITVX and more. No sign-up needed.',
  keywords: ['free streaming', 'free movies', 'free tv', 'bbc iplayer', 'itvx', 'tubi', 'pluto tv', 'legal streaming', 'free radio', 'internet radio', 'live radio stations'],
  authors: [{ name: 'FreeStream World' }],
  openGraph: {
    title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio',
    description: '100% legal free streaming including movies, live TV and 50,000+ worldwide radio stations.',
    images: [{ url: '/logo.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreeStream World',
    description: 'Free movies, TV, Live TV & Radio',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function Home() {
  return <MainApp defaultTab="discover" />;
}
