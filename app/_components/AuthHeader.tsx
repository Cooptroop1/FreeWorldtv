'use client';
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function AuthHeader() {
  return (
    <header className="flex justify-end items-center p-4 gap-4 border-b border-zinc-800 bg-[#111827] sticky top-0 z-50">
      <SignInButton mode="modal">
        <button className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-medium transition">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-full text-sm font-medium transition">
          Sign Up Free
        </button>
      </SignUpButton>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
