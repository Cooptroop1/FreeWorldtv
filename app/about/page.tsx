import type { Metadata } from 'next';
import { CookieSettingsLink } from '../_components/CookieConsent';

export const metadata: Metadata = {
  title: 'About | FreeStream World',
  description: 'FreeStream World is a legal discovery directory for free movies, TV, live channels and radio.',
};

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">About FreeStream World</h1>
        <p className="text-lg mb-6 leading-relaxed text-yellow-300 font-medium">
          We are not a streaming service. We only link to official, legal, free (ad-supported) and subscription sources.
          We do not host videos, bypass geo-blocks, or encourage illegal activity.
        </p>
        <p className="text-lg mb-6 text-gray-200">
          FreeStream World helps you find legal movies, TV shows, live channels and radio from providers such as
          Tubi, Pluto TV, BBC iPlayer, ITVX, Channel 4 and My5. Sign-up is optional — it only exists so favourites
          can sync across devices.
        </p>
        <p className="text-lg mb-6 text-gray-200">
          Ads and analytics only run if you accept them in the cookie banner. You can change that any time from Cookie settings in the footer.
        </p>
        <p className="text-gray-400">
          Title metadata from Watchmode and TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="mt-6"><CookieSettingsLink /></p>
      </div>
    </div>
  );
}
