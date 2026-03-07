import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';

export const metadata: Metadata = {
  title: 'Discover - Free Movies & TV Shows | FreeStream World',
  description: 'Browse thousands of 100% legal free movies and TV shows. Infinite scroll, smart filters, direct links to Tubi, Pluto TV and more.',
};

export default function DiscoverPage() {
  return <MainApp defaultTab="discover" />;
}
