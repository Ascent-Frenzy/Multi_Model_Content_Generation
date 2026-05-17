'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AssetUpload } from '@/components/brand/asset-upload';
import { AssetGrid } from '@/components/brand/asset-grid';
import { useBrandAssets, useDeleteBrandAsset } from '@/lib/api/hooks';

export default function BrandAssetsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: assets, isLoading } = useBrandAssets(id);
  const deleteAsset = useDeleteBrandAsset();

  const handleDelete = (assetId: string) => {
    deleteAsset.mutate({ brandId: id, assetId });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href={`/brand/${id}`}
        className="flex items-center gap-2 text-secondary-text hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Brand
      </Link>

      <h1 className="font-sans text-2xl font-bold text-white">
        Brand Assets
      </h1>

      <AssetUpload brandId={id} />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-slate rounded-lg p-4 border border-white/10 animate-pulse"
            >
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2 mb-2" />
              <div className="h-8 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <AssetGrid assets={assets ?? []} onDelete={handleDelete} />
      )}
    </div>
  );
}
