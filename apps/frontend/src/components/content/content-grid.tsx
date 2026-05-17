'use client';

import Link from 'next/link';
import { ContentCard } from './content-card';
import type { ContentItem } from '@/lib/api/content';

export function ContentGrid({ items }: { items: ContentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-secondary-text text-base mb-4">
          No content yet. Create your first carousel or reel.
        </p>
        <Link
          href="/create/carousel"
          className="text-jelly-mint hover:text-deep-link-blue transition-colors duration-150 font-semibold"
        >
          Create
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <ContentCard key={item.id} contentItem={item} />
      ))}
    </div>
  );
}
