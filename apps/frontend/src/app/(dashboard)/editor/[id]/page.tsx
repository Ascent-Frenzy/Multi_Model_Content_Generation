'use client';

import { use } from 'react';
import Link from 'next/link';
import { useContentItem } from '@/lib/api/hooks';
import { CarouselEditor } from '@/components/editor/carousel-editor';
import { ReelTimeline } from '@/components/editor/reel-timeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: contentItem, isLoading, isError } = useContentItem(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton toolbar */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-slate" />
          <div className="h-6 w-48 animate-pulse rounded bg-surface-slate" />
        </div>
        {/* Skeleton editor area */}
        <div className="h-[540px] w-full animate-pulse rounded-lg bg-surface-slate" />
      </div>
    );
  }

  if (isError || !contentItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-secondary-text">Content not found or failed to load.</p>
        <Button asChild variant="ghost" className="text-jelly-mint">
          <Link href="/">Back to Content Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar — back button + content title (NO save button here) */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-secondary-text hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold font-sans">{contentItem.title}</h1>
      </div>

      {/* Conditionally render editor based on content type */}
      {contentItem.type === 'carousel' && contentItem.carouselDetail && (
        <CarouselEditor
          slides={contentItem.carouselDetail.slides}
          contentId={contentItem.id}
        />
      )}

      {contentItem.type === 'reel' && contentItem.reelDetail && (
        <ReelTimeline
          segments={contentItem.reelDetail.segments}
          contentId={contentItem.id}
          brandProfileId={contentItem.brandProfileId}
        />
      )}
    </div>
  );
}
