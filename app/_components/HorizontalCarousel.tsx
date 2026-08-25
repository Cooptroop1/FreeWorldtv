'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart, Loader2 } from 'lucide-react';

type CarouselItem = {
  id: number;
  title: string;
  year?: number | string;
  poster_path?: string;
};

interface HorizontalCarouselProps {
  title: string;
  items: CarouselItem[];
  loading?: boolean;
  favorites: { id: number }[];
  toggleFavorite: (title: CarouselItem) => void;
  setSelectedTitle: (title: CarouselItem) => void;
}

export default function HorizontalCarousel({
  title,
  items,
  loading = false,
  favorites,
  toggleFavorite,
  setSelectedTitle,
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 20);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
    const t = setTimeout(updateArrows, 100);
    return () => {
      clearTimeout(t);
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [items]);

  return (
    <section className="mb-10 relative" aria-labelledby={`carousel-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h2
        id={`carousel-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="text-2xl font-bold mb-4 px-4 flex items-center gap-3"
      >
        {title} {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
      </h2>
      <div className="relative group">
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -176, behavior: 'smooth' })}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all shadow-lg ${showLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label="Scroll left"
        >
          <ChevronLeft size={28} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 px-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={updateArrows}
        >
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-40 h-60 bg-zinc-800 rounded-xl animate-pulse" aria-hidden="true" />
            ))
          ) : items.length > 0 ? (
            items.map((item) => {
              const isFavorite = favorites.some((fav) => fav.id === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTitle(item)}
                  className="flex-shrink-0 w-40 snap-start cursor-pointer group text-left flex flex-col"
                  aria-label={`View details for ${item.title} (${item.year || ''})`}
                >
                  <div className="relative aspect-[2/3] bg-gray-700 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                        alt={`${item.title} poster`}
                        fill
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        sizes="160px"
                        quality={75}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 animate-pulse" />
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }
                      }}
                      aria-label={isFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
                    >
                      <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} />
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end mt-2">
                    <p className="text-sm line-clamp-2 text-center text-gray-200 group-hover:text-white">{item.title}</p>
                    <p className="text-xs text-center text-gray-400">{item.year}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-gray-500 italic">No titles in this section yet</p>
          )}
        </div>
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 176, behavior: 'smooth' })}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all shadow-lg ${showRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label="Scroll right"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </section>
  );
}
