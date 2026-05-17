'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { BrandProfile } from '@/lib/api/brands';
import { cn, assetUrl } from '@/lib/utils';

export function BrandCard({ brand }: { brand: BrandProfile }) {
  return (
    <Link href={`/brand/${brand.id}`}>
      <div className="bg-surface-slate border border-white/10 rounded-lg p-5 transition-colors group">
        <div className="flex items-start justify-between mb-3">
          <h3
            className={cn(
              'font-sans text-[20px] font-bold text-white transition-colors duration-150',
              'group-hover:text-deep-link-blue'
            )}
          >
            {brand.name}
          </h3>
          {brand.isDefault && (
            <Badge className="bg-jelly-mint text-black border-transparent text-[11px] font-mono uppercase tracking-[1.5px]">
              Default
            </Badge>
          )}
        </div>

        <Badge
          variant="outline"
          className="text-[11px] font-mono uppercase tracking-[1.5px] border-white/20 text-muted-text mb-3"
        >
          {brand.tone}
        </Badge>

        <div className="flex items-center gap-3 mt-3">
          <div
            className="w-6 h-6 rounded-full border border-white/20"
            style={{ backgroundColor: brand.primaryColor }}
            title={`Primary: ${brand.primaryColor}`}
          />
          <div
            className="w-6 h-6 rounded-full border border-white/20"
            style={{ backgroundColor: brand.secondaryColor }}
            title={`Secondary: ${brand.secondaryColor}`}
          />
          <span className="text-sm text-secondary-text ml-auto">
            {brand.fontFamily}
          </span>
        </div>

        {brand.logoS3Key && (
          <div className="mt-3">
            <img
              src={assetUrl(brand.logoS3Key)}
              alt={`${brand.name} logo`}
              className="h-8 w-auto object-contain rounded"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
