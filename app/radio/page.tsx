// app/radio/page.tsx
import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Worldwide Radio Stations | FreeStream World',
  description: '50,000+ live radio stations worldwide. Browse free, or sign in to save favourite stations.',
};

export default function RadioPage() {
  return <MainApp defaultTab="radio" />;
}
