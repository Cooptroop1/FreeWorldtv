import type { Metadata } from 'next';
import { CookieSettingsLink } from '../_components/CookieConsent';

export const metadata: Metadata = {
  title: 'Privacy Policy | FreeStream World',
  description: 'How FreeStream World collects and uses data, including accounts and optional analytics.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-300 mb-6">Last updated: 20 September 2026</p>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>
            FreeStream World ("we", "us") operates https://freestreamworld.com.
            We are based in the United Kingdom. This policy explains what we collect and why.
          </p>

          <h2 className="text-2xl font-semibold text-white">1. Information we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account data</strong> if you sign in (name, email, user id) via Clerk.</li>
            <li><strong>Saved lists</strong> if you sign in: watchlist, watched, hidden, continue watching, radio favourites, and the streaming apps you pick, stored against your account so they sync across devices.</li>
            <li><strong>Public recommendations</strong> if you choose to post them (up to five titles, star rating and an optional short review). These appear on the site for everyone. We may hide or remove reviews that include swearing or abuse.</li>
            <li><strong>Local storage</strong> on your device for guest favourites, custom links, region choice and cookie preferences. Guest lists stay on your device unless you sign in.</li>
            <li><strong>Usage analytics</strong> (Vercel Analytics / Speed Insights) only if you accept analytics cookies.</li>
            <li><strong>Title metadata</strong> requested from Watchmode and TMDB to show posters, plots and official watch links. We do not host video.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white">2. Legal bases (UK GDPR)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Contract / legitimate interests — running the directory and optional accounts.</li>
            <li>Consent — optional analytics cookies. You can change this any time via Cookie settings in the footer.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white">3. Cookies</h2>
          <p>
            Strictly necessary cookies keep sign-in and security working. Analytics cookies are off until you opt in.
            We do not sell your personal data.
          </p>

          <h2 className="text-2xl font-semibold text-white">4. Third parties</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Clerk — authentication</li>
            <li>Vercel — hosting, optional analytics</li>
            <li>Watchmode — where titles can be watched</li>
            <li>TMDB — posters, plots, trailers, cast</li>
            <li>radio-browser.info — public radio station directory</li>
          </ul>
          <p>
            Their privacy policies apply to data they process:{' '}
            <a className="text-blue-400 underline" href="https://clerk.com/privacy">Clerk</a>,{' '}
            <a className="text-blue-400 underline" href="https://vercel.com/legal/privacy-policy">Vercel</a>,{' '}
            <a className="text-blue-400 underline" href="https://www.themoviedb.org/privacy-policy">TMDB</a>.
          </p>

          <h2 className="text-2xl font-semibold text-white">5. Your rights</h2>
          <p>
            You can access, correct or delete account data by deleting your Clerk account or contacting us.
            You can clear localStorage in your browser to remove guest favourites and custom links.
            You may complain to the ICO (ico.org.uk) if you are unhappy with how we handle your data.
          </p>

          <h2 className="text-2xl font-semibold text-white">6. Retention</h2>
          <p>Account lists are stored for up to 12 months of inactivity, then expire. Cookie choices stay on your device until you change them.</p>

          <h2 className="text-2xl font-semibold text-white">7. Contact</h2>
          <p>Questions about this policy: see <a className="text-blue-400 underline" href="/about">About</a>.</p>
          <p className="mt-6"><CookieSettingsLink /></p>
        </div>
      </div>
    </div>
  );
}
