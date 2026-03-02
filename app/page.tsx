import type { Metadata, Viewport } from 'next';
import Tabs from './_components/Tabs';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows & Live TV',
  description: '100% legal free movies, TV shows & live channels worldwide. No sign-up, no fees. Direct links to Tubi, Pluto TV, BBC iPlayer, ITVX, My5 and more.',
  keywords: ['free streaming', 'free movies', 'free tv', 'bbc iplayer', 'itvx', 'tubi', 'pluto tv', 'legal streaming'],
  authors: [{ name: 'FreeStream World' }],
  openGraph: {
    title: 'FreeStream World - Free Movies, TV Shows & Live TV',
    description: '100% legal free streaming. No sign-up. Direct links to official services.',
    images: [{ url: '/logo.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreeStream World',
    description: 'Free & legal movies, TV shows & live TV',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function Home() {
  return <Tabs />;
}
