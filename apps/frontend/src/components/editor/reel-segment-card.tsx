'use client';

import type { ReelSegmentDB } from '@app/types';
import type { BrandAsset } from '@/lib/api/brands';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ReelSegmentCardProps {
  segment: ReelSegmentDB;
  index: number;
  onChange: (updated: ReelSegmentDB) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  brandAssets?: BrandAsset[];
}

export function ReelSegmentCard({
  segment,
  index,
  onChange,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  brandAssets,
}: ReelSegmentCardProps) {
  const duration = segment.endSec - segment.startSec;

  // Filter assets by type for clip/asset selection
  const filteredAssets = brandAssets?.filter((asset) => {
    if (segment.type === 'clip') return asset.type === 'clip';
    if (segment.type === 'static_image') return asset.type === 'image';
    return false;
  });

  return (
    <div className="rounded-lg border border-white/10 bg-surface-slate p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[1.5px] text-secondary-text">
            Segment {segment.order}
          </p>
          <Badge
            variant="outline"
            className="font-mono text-[11px] uppercase tracking-[1.5px]"
          >
            {segment.type}
          </Badge>
          <span className="text-xs text-secondary-text">
            {duration.toFixed(1)}s
          </span>
        </div>

        {/* Move Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            className="h-8 w-8 text-secondary-text hover:text-white disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={isLast}
            className="h-8 w-8 text-secondary-text hover:text-white disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-1">
        <Label className="text-xs text-secondary-text">Caption</Label>
        <Textarea
          value={segment.caption ?? ''}
          onChange={(e) => onChange({ ...segment, caption: e.target.value })}
          className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
          rows={2}
        />
      </div>

      {/* Clip/Asset Selection — for clip or static_image types when brandAssets provided */}
      {(segment.type === 'clip' || segment.type === 'static_image') && brandAssets && (
        <div className="space-y-1">
          <Label className="text-xs text-secondary-text">
            {segment.type === 'clip' ? 'Select Clip' : 'Select Image'}
          </Label>
          <Select
            value={segment.assetS3Key ?? ''}
            onValueChange={(value) => onChange({ ...segment, assetS3Key: value })}
          >
            <SelectTrigger className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint">
              <SelectValue placeholder={`Choose a ${segment.type === 'clip' ? 'clip' : 'image'}...`} />
            </SelectTrigger>
            <SelectContent className="bg-surface-slate border border-white/10">
              {filteredAssets && filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.s3Key}>
                    {asset.filename}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="_none" disabled>
                  No {segment.type === 'clip' ? 'clips' : 'images'} available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Flux Prompt — for flux_image type */}
      {segment.type === 'flux_image' && (
        <div className="space-y-1">
          <Label className="text-xs text-secondary-text">Flux Prompt</Label>
          <Input
            value={segment.fluxPrompt ?? ''}
            onChange={(e) => onChange({ ...segment, fluxPrompt: e.target.value })}
            placeholder="Describe the image to generate..."
            className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
          />
        </div>
      )}
    </div>
  );
}
