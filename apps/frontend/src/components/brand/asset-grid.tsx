'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import type { BrandAsset } from '@/lib/api/brands';

interface AssetGridProps {
  assets: BrandAsset[];
  onDelete: (assetId: string) => void;
}

export function AssetGrid({ assets, onDelete }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <p className="text-secondary-text text-center py-10">
        No assets uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="bg-surface-slate rounded-lg p-4 border border-white/10"
        >
          <p
            className="text-sm text-white truncate mb-2"
            title={asset.filename}
          >
            {asset.filename}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="text-[11px] font-mono uppercase tracking-[1.5px] border-white/20 text-muted-text"
            >
              {asset.type}
            </Badge>
            <span className="text-xs text-secondary-text">
              {formatFileSize(asset.sizeBytes)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(asset.id)}
            className="border-ultraviolet text-ultraviolet hover:bg-ultraviolet/10 rounded-lg text-xs w-full"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      ))}
    </div>
  );
}
