'use client';

import { useState } from 'react';
import { useUpdateContent, useBrandAssets } from '@/lib/api/hooks';
import type { ReelSegment } from '@app/types';
import { ReelSegmentCard } from './reel-segment-card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Clock } from 'lucide-react';

interface ReelTimelineProps {
  segments: ReelSegment[];
  contentId: string;
  brandProfileId?: string;
}

export function ReelTimeline({ segments, contentId, brandProfileId }: ReelTimelineProps) {
  const [editedSegments, setEditedSegments] = useState<ReelSegment[]>(segments);
  const updateContent = useUpdateContent();
  const { data: brandAssets } = useBrandAssets(brandProfileId ?? '');

  const totalDuration = editedSegments.reduce(
    (sum, seg) => sum + seg.durationSecs,
    0
  );

  const handleSegmentChange = (index: number, updated: ReelSegment) => {
    setEditedSegments((prev) =>
      prev.map((s, i) => (i === index ? updated : s))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEditedSegments((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      // Recalculate order numbers
      return next.map((seg, i) => ({ ...seg, order: i + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= editedSegments.length - 1) return;
    setEditedSegments((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      // Recalculate order numbers
      return next.map((seg, i) => ({ ...seg, order: i + 1 }));
    });
  };

  const handleSave = () => {
    updateContent.mutate({ id: contentId, data: { segments: editedSegments } });
  };

  return (
    <div className="space-y-6">
      {/* Total Duration */}
      <div className="flex items-center gap-2 text-sm text-secondary-text">
        <Clock className="h-4 w-4" />
        <span>Total duration: {totalDuration.toFixed(1)}s</span>
      </div>

      {/* Segment List */}
      <div className="space-y-4">
        {editedSegments.map((segment, index) => (
          <ReelSegmentCard
            key={`${segment.order}-${index}`}
            segment={segment}
            index={index}
            onChange={(updated) => handleSegmentChange(index, updated)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            isFirst={index === 0}
            isLast={index === editedSegments.length - 1}
            brandAssets={brandAssets}
          />
        ))}
      </div>

      {editedSegments.length === 0 && (
        <p className="text-sm text-secondary-text">
          No segments yet. Generate a reel script first.
        </p>
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
            Save Segments
          </>
        )}
      </Button>

      {updateContent.isSuccess && (
        <p className="text-sm text-jelly-mint">Segments saved successfully!</p>
      )}
      {updateContent.isError && (
        <p className="text-sm text-ultraviolet">Failed to save segments.</p>
      )}
    </div>
  );
}
