import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Discover - Free Movies & TV Shows | FreeStream World',
  description: 'Browse thousands of legal free movies and TV shows. Sign in to save a watchlist, continue watching and recommend titles.',
  alternates: { canonical: 'https://freestreamworld.com' },
};

export default function DiscoverPage() {
  return <MainApp defaultTab="discover" />;
}
