import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'My Links | FreeStream World',
  description: 'Your saved direct links to free streaming content.',
};

export default function MyLinksPage() {
  return <MainApp defaultTab="mylinks" />;
}
