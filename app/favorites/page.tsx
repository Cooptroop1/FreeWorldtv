import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';

export const metadata: Metadata = {
  title: 'My Favorites | FreeStream World',
  description: 'Your personal collection of saved free movies, shows and channels.',
};

export default function FavoritesPage() {
  return <MainApp defaultTab="favorites" />;
}
