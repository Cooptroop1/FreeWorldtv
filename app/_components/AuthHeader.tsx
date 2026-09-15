'use client';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import AccountHeaderTools from './AccountHeaderTools';

export default function AuthHeader() {
  const { isSignedIn } = useUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-[99999] bg-gray-950 border-b border-gray-800/80 backdrop-blur-xl shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-end gap-2">
        <AccountHeaderTools isSignedIn={Boolean(isSignedIn)} />
        {!isSignedIn && (
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-all">
              Sign in to save lists & recs
            </button>
          </SignInButton>
        )}
        {isSignedIn && (
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-9 h-9 ring-2 ring-violet-500',
                userButtonTrigger: 'hover:opacity-90',
              },
            }}
          />
        )}
      </div>
    </header>
  );
}
