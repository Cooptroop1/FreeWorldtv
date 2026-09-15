import type { Metadata } from 'next';
import MainApp from './_components/MainApp';

export const metadata: Metadata = {
  title: 'FreeStream World - Free Movies, TV Shows, Live TV & Radio',
  description: 'Find legal free movies, TV, live TV and radio. Browse without an account — sign in to save watchlists, continue watching and recommend titles.',
  alternates: { canonical: 'https://freestreamworld.com' },
};

export default function Home() {
  return <MainApp defaultTab="discover" />;
}
