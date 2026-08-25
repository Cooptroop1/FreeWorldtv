import type { Metadata } from 'next';
import MainApp from './_components/MainApp';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio',
  description: '100% legal free movies, TV shows, live channels and 50,000+ worldwide radio stations. Direct links to Tubi, Pluto TV, BBC iPlayer, ITVX and more. No sign-up needed.',
  alternates: { canonical: 'https://freestreamworld.com' },
};

export default function Home() {
  return <MainApp defaultTab="discover" />;
}
