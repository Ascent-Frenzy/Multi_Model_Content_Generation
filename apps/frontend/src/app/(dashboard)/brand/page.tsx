'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BrandCard } from '@/components/brand/brand-card';
import { BrandForm } from '@/components/brand/brand-form';
import { useBrands, useCreateBrand } from '@/lib/api/hooks';
import type { UpdateBrandInput } from '@/lib/api/brands';

export default function BrandsPage() {
  const { data: brands, isLoading } = useBrands();
  const createBrand = useCreateBrand();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = (data: UpdateBrandInput) => {
    createBrand.mutate(
      {
        name: data.name ?? '',
        tone: data.tone ?? 'professional',
        primaryColor: data.primaryColor ?? '#3cffd0',
        secondaryColor: data.secondaryColor ?? '#5200ff',
        fontFamily: data.fontFamily ?? '',
      },
      {
        onSuccess: () => setDialogOpen(false),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-bold text-white">
          Brand Profiles
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-jelly-mint text-black rounded-xl px-6 hover:bg-jelly-mint/90 font-semibold">
              <Plus className="h-4 w-4 mr-1" />
              Create Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-canvas-black border-white/10 rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Create Brand</DialogTitle>
              <DialogDescription className="text-secondary-text">
                Set up a new brand profile for your content.
              </DialogDescription>
            </DialogHeader>
            <BrandForm
              onSubmit={handleCreate}
              isLoading={createBrand.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-slate border border-white/10 rounded-lg p-5 animate-pulse"
            >
              <div className="h-5 bg-white/5 rounded w-1/2 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
              <div className="flex gap-3">
                <div className="h-6 w-6 bg-white/5 rounded-full" />
                <div className="h-6 w-6 bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : brands && brands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-secondary-text text-base mb-4">
            No brand profiles yet. Create your first brand to get started.
          </p>
        </div>
      )}
    </div>
  );
}
