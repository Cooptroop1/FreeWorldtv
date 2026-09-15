import type { Metadata } from 'next';
import { CookieSettingsLink } from '../_components/CookieConsent';

export const metadata: Metadata = {
  title: 'Terms of Service | FreeStream World',
  description: 'Terms of use for FreeStream World, a legal streaming discovery directory.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-300 mb-6">Last updated: 15 September 2026</p>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>
            By using https://freestreamworld.com you agree to these terms. If you do not agree, do not use the site.
          </p>

          <h2 className="text-2xl font-semibold text-white">1. What this site is</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>FreeStream World is a directory of links to official, legal streaming services (for example Tubi, Pluto TV, BBC iPlayer, ITVX).</li>
            <li>We do not host, stream, embed or control any video playback.</li>
            <li>Availability, geo-restrictions, TV licences and account requirements are the responsibility of the original provider.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white">2. Accounts</h2>
          <p>
            An account is optional. Browse without signing in. Create one if you want watchlists, continue watching,
            your apps, radio favourites and public recommendations to sync across devices. You must keep your login details safe.
            Public recommendations (stars and short reviews) can be seen by everyone; keep them civil. We may hide or remove
            reviews that include swearing or abuse.
          </p>

          <h2 className="text-2xl font-semibold text-white">3. My Links (user-added streams)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Custom stream URLs are stored in your browser only unless you later choose to sync them.</li>
            <li>You are solely responsible for any URL you add. Do not add pirated or illegal streams.</li>
            <li>We do not review or endorse user-added links.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white">4. Advertising</h2>
          <p>
            The site may show ads via Google AdSense. Google’s advertising cookies and policies apply.
            Crypto donation addresses on the site are voluntary gifts toward running costs (servers and catalogue APIs).
            Donations are not a purchase of extra features.
          </p>

          <h2 className="text-2xl font-semibold text-white">5. Intellectual property</h2>
          <p>Title names, posters and trademarks belong to their owners. TMDB data is used under TMDB's terms. This site is not endorsed by TMDB, Watchmode or any streaming service.</p>

          <h2 className="text-2xl font-semibold text-white">6. Disclaimer</h2>
          <p>The site is provided "as is". We are not liable for third-party outages, geo-blocks, or anything you do with user-added links.</p>

          <h2 className="text-2xl font-semibold text-white">7. Governing law</h2>
          <p>These terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction.</p>
          <p className="mt-6"><CookieSettingsLink /></p>
        </div>
      </div>
    </div>
  );
}
