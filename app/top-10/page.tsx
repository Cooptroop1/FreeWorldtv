import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';

export const metadata: Metadata = {
  title: 'Top 10 Free This Week | FreeStream World',
  description: 'The 10 most popular free movies and shows right now across all legal platforms.',
};

export default function Top10Page() {
  return <MainApp defaultTab="top10" />;
}
