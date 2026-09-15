import type { Metadata } from 'next';
import { CookieSettingsLink } from '../_components/CookieConsent';

export const metadata: Metadata = {
  title: 'About | FreeStream World',
  description: 'FreeStream World is a legal discovery directory for movies, TV, live channels and radio. Browse free, or sign in to save lists.',
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
          Tubi, Pluto TV, BBC iPlayer, ITVX, Channel 4 and My5. You can use the whole site without an account.
        </p>
        <p className="text-lg mb-6 text-gray-200">
          Sign in if you want extras to follow you on every device: watchlist, watched, hidden titles, continue watching,
          favourite radio, the apps you actually have, and up to five public recommendations with a short review.
          Guests can still heart titles on this browser only.
        </p>
        <p className="text-lg mb-6 text-gray-200">
          Optional analytics only run if you accept them in the cookie banner. Ads may appear via Google AdSense.
          You can change cookie settings any time from the footer.
        </p>
        <p className="text-gray-400">
          Title metadata from Watchmode and TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="mt-6"><CookieSettingsLink /></p>
      </div>
    </div>
  );
}
