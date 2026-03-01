// app/_components/HorizontalRow.tsx
'use client';
import Image from 'next/image';
import { Film } from 'lucide-react';

type Title = {
  id: number;
  title: string;
  year?: string;
  poster_path?: string;
  type?: string;
};

interface HorizontalRowProps {
  title: string;
  items: Title[];
  onClick: (title: Title) => void;
}

export default function HorizontalRow({ title, items, onClick }: HorizontalRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-bold mb-4 px-1 flex items-center gap-3">
        {title}
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide scroll-smooth">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onClick(item)}
            className="snap-start flex-shrink-0 w-40 md:w-48 cursor-pointer group"
          >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-all duration-300">
              {item.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="192px"
                  quality={85}
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Film className="w-12 h-12 text-gray-600" />
                </div>
              )}
            </div>
            <p className="text-sm mt-3 line-clamp-2 text-center group-hover:text-blue-300 transition-colors">
              {item.title}
            </p>
            {item.year && <p className="text-xs text-gray-400 text-center">{item.year}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
