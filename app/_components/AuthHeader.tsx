'use client';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export default function AuthHeader() {
  const { isSignedIn } = useUser();

  return (
    <header className="flex justify-end items-center p-4 gap-3 border-b border-zinc-800 bg-[#111827] sticky top-0 z-50">
      {/* Show buttons only when NOT logged in */}
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

      {/* Show ONLY the profile icon when logged in */}
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
    </header>
  );
}
