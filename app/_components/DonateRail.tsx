'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const ETH_DONATE = '0x9D1AC5323583683666588B567C92FFCB1f41ba02';
export const BTC_DONATE = 'bc1qdnlgkml28evcd0322tdl2jg0v0zcp8v5esffsn';

function CopyAddress({
  label,
  address,
  tone,
}: {
  label: string;
  address: string;
  tone: 'eth' | 'btc';
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  const border = tone === 'btc'
    ? 'border-amber-700/50 hover:border-amber-400'
    : 'border-emerald-700/50 hover:border-emerald-400';
  const tag = tone === 'btc' ? 'text-amber-400' : 'text-emerald-400';
  return (
    <button
      type="button"
      onClick={copy}
      className={`w-full text-left rounded-xl bg-black/50 border ${border} p-2.5 transition-colors`}
    >
      <span className={`flex items-center justify-between text-[10px] uppercase tracking-wide ${tag} mb-1`}>
        {label}
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </span>
      <span className="block font-mono text-[11px] text-white break-all leading-snug">
        {address}
      </span>
      <span className="block text-[10px] text-zinc-400 mt-1">{copied ? 'Copied' : 'Tap to copy'}</span>
    </button>
  );
}

function Addresses() {
  return (
    <div className="space-y-2">
      <CopyAddress label="Bitcoin (BTC)" address={BTC_DONATE} tone="btc" />
      <CopyAddress label="Ethereum (ETH)" address={ETH_DONATE} tone="eth" />
    </div>
  );
}

export default function DonateRail() {
  return (
    <>
      <aside className="hidden 2xl:block fixed left-3 top-24 z-30 w-56 max-h-[calc(100vh-7.5rem)] overflow-y-auto">
        <div className="rounded-2xl border border-emerald-800/60 bg-gradient-to-b from-emerald-950/90 to-zinc-950/95 backdrop-blur p-3.5 shadow-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 mb-2">Keep it free</p>
          <h2 className="text-sm font-bold text-white leading-snug mb-2">Help us level up the listings</h2>
          <p className="text-[11px] text-zinc-300 leading-relaxed mb-3">
            FreeStream World doesn’t charge you to find something to watch. The bill is on our side:
            catalogue APIs, servers, and the next round of features — more countries, fresher lists,
            episode links, quicker “where to watch” updates.
          </p>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            BTC or ETH goes straight into that upgrade so the site can grow without a paywall.
            Any amount helps. Thank you.
          </p>
          <Addresses />
        </div>
      </aside>

      <section className="2xl:hidden max-w-7xl mx-auto mb-8">
        <div className="rounded-2xl border border-emerald-800/50 bg-gradient-to-r from-emerald-950/80 to-zinc-950 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 mb-1">Keep it free</p>
            <h2 className="text-base font-bold text-white mb-1">Help us take the site to the next level</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The posters and links are free to use. Running the catalogues and servers is not.
              We’re saving for an API and hosting upgrade so we can ship more countries, faster
              updates, and richer watch links — still without charging you to browse.
            </p>
          </div>
          <div className="w-full md:w-80 flex-shrink-0">
            <Addresses />
          </div>
        </div>
      </section>
    </>
  );
}
