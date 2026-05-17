'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useUpdateContent } from '@/lib/api/hooks';
import type { CarouselSlide } from '@app/types';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const CarouselCanvas = dynamic(() => import('./carousel-canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-[540px] h-[540px] bg-surface-slate animate-pulse rounded-lg" />
  ),
});

interface CarouselEditorProps {
  slides: CarouselSlide[];
  contentId: string;
}

export function CarouselEditor({ slides, contentId }: CarouselEditorProps) {
  const [editedSlides, setEditedSlides] = useState<CarouselSlide[]>(slides);
  const [activeIndex, setActiveIndex] = useState(0);
  const updateContent = useUpdateContent();

  const handleSlideChange = (updated: CarouselSlide) => {
    setEditedSlides((prev) =>
      prev.map((s, i) => (i === activeIndex ? updated : s))
    );
  };

  const handleSave = () => {
    updateContent.mutate({ id: contentId, data: { slides: editedSlides } });
  };

  return (
    <div className="space-y-6">
      {/* Slide Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {editedSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'h-10 w-10 rounded-lg font-mono text-sm font-bold transition-colors',
              activeIndex === index
                ? 'bg-jelly-mint text-black'
                : 'bg-surface-slate text-secondary-text hover:text-white'
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Active Slide Canvas */}
      {editedSlides[activeIndex] && (
        <CarouselCanvas
          key={activeIndex}
          slide={editedSlides[activeIndex]}
          onChange={handleSlideChange}
          isActive={true}
        />
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={updateContent.isPending}
        className="rounded-xl bg-jelly-mint text-black hover:bg-jelly-mint/90 font-sans"
      >
        {updateContent.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Slides
          </>
        )}
      </Button>

      {updateContent.isSuccess && (
        <p className="text-sm text-jelly-mint">Slides saved successfully!</p>
      )}
      {updateContent.isError && (
        <p className="text-sm text-ultraviolet">Failed to save slides.</p>
      )}
    </div>
  );
}
