import type { Metadata } from 'next';
import MainApp from '../_components/MainApp';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Live Sports & Events | FreeStream World',
  description: 'A sample of live sports and events in the UK and the US, with links to the channels and apps showing them.',
};

export default function EventsPage() {
  return <MainApp defaultTab="events" />;
}
