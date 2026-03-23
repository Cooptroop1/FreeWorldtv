'use client';
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs';

export default function AuthHeader() {
  return (
    <header className="flex justify-end items-center p-4 gap-3 border-b border-zinc-800 bg-[#111827] sticky top-0 z-50">
      {/* Only show buttons when NOT logged in */}
      <SignedOut>
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
      </SignedOut>

      {/* Only show profile icon when logged in */}
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: "w-9 h-9 ring-2 ring-violet-500",
              userButtonTrigger: "hover:opacity-90"
            }
          }}
        />
      </SignedIn>
    </header>
  );
}
