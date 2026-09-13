'use client';

import { useEffect, useState } from 'react';
import { SignInButton } from '@clerk/nextjs';
import { Star } from 'lucide-react';
import { REC_LIMIT, REVIEW_MAX, type RecItem } from '@/lib/recs';

function StarPicker({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          <Star
            size={size}
            className={shown >= n ? 'text-amber-400' : 'text-zinc-600'}
            fill={shown >= n ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

export default function RecommendBox({
  isSignedIn,
  title,
}: {
  isSignedIn: boolean;
  title: { id?: number; title?: string; year?: number; type?: string; poster?: string | null; poster_path?: string; tmdb_id?: number };
}) {
  const [mine, setMine] = useState<RecItem[]>([]);
  const [review, setReview] = useState('');
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/recommendations')
      .then((r) => r.json())
      .then((d) => {
        const list: RecItem[] = Array.isArray(d.mine) ? d.mine : [];
        setMine(list);
        const existing = list.find((r) => r.id === title.id);
        if (existing) {
          setReview(existing.review || '');
          setStars(existing.stars || 0);
        } else {
          setReview('');
          setStars(0);
        }
      })
      .catch(() => {});
  }, [isSignedIn, title.id]);

  if (!title.id) return null;

  const already = mine.some((r) => r.id === title.id);

  const save = async () => {
    if (stars < 1) {
      setMsg('Tap 1 to 5 stars first');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...title, review, stars }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || 'Could not save');
        return;
      }
      setMine(json.mine || []);
      setMsg('Added to the public list');
      window.dispatchEvent(new Event('fsw-recs'));
    } catch {
      setMsg('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/recommendations?id=${title.id}`, { method: 'DELETE' });
      const json = await res.json();
      setMine(json.mine || []);
      setStars(0);
      setMsg('Removed');
      window.dispatchEvent(new Event('fsw-recs'));
    } catch {
      setMsg('Could not remove');
    } finally {
      setBusy(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="mt-4 p-3 rounded-xl border border-zinc-700 bg-zinc-900/60">
        <p className="text-sm text-zinc-300 mb-2">Rate it 1–5 stars and recommend it (up to {REC_LIMIT} titles).</p>
        <SignInButton mode="modal">
          <button type="button" className="px-3 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white">
            Sign in to recommend
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 rounded-xl border border-amber-700/40 bg-zinc-900/60">
      <p className="text-sm font-semibold text-white flex items-center gap-1.5 mb-2">
        <Star size={14} className="text-amber-400" fill="currentColor" />
        Recommend this ({mine.length}/{REC_LIMIT})
      </p>
      <StarPicker value={stars} onChange={setStars} />
      <p className="text-[11px] text-zinc-400 mt-1 mb-2">{stars ? `${stars} / 5` : 'Click a star'}</p>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value.slice(0, REVIEW_MAX))}
        placeholder="Optional — why should people watch it?"
        rows={2}
        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-white placeholder:text-zinc-500"
      />
      <p className="text-[11px] text-zinc-500 mt-1">{review.length}/{REVIEW_MAX}</p>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          disabled={busy || stars < 1}
          onClick={save}
          className="px-3 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50"
        >
          {already ? 'Update rec' : 'Recommend'}
        </button>
        {already && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Remove
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-zinc-300 mt-2">{msg}</p>}
    </div>
  );
}
