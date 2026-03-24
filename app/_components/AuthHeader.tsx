'use client';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export default function AuthHeader() {
  const { isSignedIn } = useUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-gray-950 border-b border-gray-800/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-end gap-3">
        {/* Buttons only when logged out */}
        {!isSignedIn && (
          <>
            <SignInButton mode="modal">
              <button className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-all active:scale-95">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-all active:scale-95">
                Sign Up Free
              </button>
            </SignUpButton>
          </>
        )}

        {/* Profile icon when logged in — always visible */}
        {isSignedIn && (
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9 ring-2 ring-violet-500",
                userButtonTrigger: "hover:opacity-90"
              }
            }}
          />
        )}
      </div>
    </header>
  );
}
