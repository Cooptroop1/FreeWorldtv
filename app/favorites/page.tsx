import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'My Favorites | FreeStream World',
  description: 'Your saved movies, shows and channels. Sign in so the list follows you on every device.',
};

export default function FavoritesPage() {
  return <MainApp defaultTab="favorites" />;
}
