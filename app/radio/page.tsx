// app/radio/page.tsx
import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Worldwide Radio Stations | FreeStream World',
  description: '50,000+ free live radio stations from every country. Music, news, sports, talk — all 100% legal and no sign-up needed.',
};

export default function RadioPage() {
  return <MainApp defaultTab="radio" />;
}
