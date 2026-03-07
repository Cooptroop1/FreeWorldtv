import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';
export const metadata: Metadata = {
  title: 'Live TV - Free Channels | FreeStream World',
  description: 'Watch free live TV channels from around the world. BBC, ITV, CBS, NBC and more — all legal and direct.',
};

export default function LiveTVPage() {
  return <MainApp defaultTab="live" />;
}
