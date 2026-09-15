import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Premium Free Titles | FreeStream World',
  description: 'See where movies and shows are on Netflix, Disney+, Prime Video and other subscription apps — plus free options. Sign in to save lists.',
};

export default function PremiumPage() {
  return <MainApp defaultTab="premium" />;
}
