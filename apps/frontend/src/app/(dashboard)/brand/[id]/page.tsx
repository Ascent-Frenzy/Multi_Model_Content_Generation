'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandForm } from '@/components/brand/brand-form';
import { useBrand, useUpdateBrand } from '@/lib/api/hooks';
import type { UpdateBrandInput } from '@/lib/api/brands';

export default function BrandEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: brand, isLoading } = useBrand(id);
  const updateBrand = useUpdateBrand();

  const handleSubmit = (data: UpdateBrandInput) => {
    updateBrand.mutate(
      { id, data },
      {
        onSuccess: () => router.push('/brand'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-jelly-mint border-t-transparent" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center py-20">
        <p className="text-secondary-text">Brand not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/brand"
          className="flex items-center gap-2 text-secondary-text hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>
        <Link href={`/brand/${id}/assets`}>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-muted-text rounded-lg hover:border-jelly-mint hover:text-white"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Assets
          </Button>
        </Link>
      </div>

      <h1 className="font-sans text-2xl font-bold text-white">
        Edit Brand
      </h1>

      <BrandForm
        brand={brand}
        brandId={id}
        onSubmit={handleSubmit}
        isLoading={updateBrand.isPending}
      />
    </div>
  );
}
