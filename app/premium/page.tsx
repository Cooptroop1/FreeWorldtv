import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Premium Free Titles | FreeStream World',
  description: 'Premium movies and TV shows available completely free on official platforms. No subscriptions needed.',
};

export default function PremiumPage() {
  return <MainApp defaultTab="premium" />;
}
