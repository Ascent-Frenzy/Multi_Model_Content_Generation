'use client';

import Link from 'next/link';
import { ImagePlus, Film, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentGrid } from '@/components/content/content-grid';
import { useContentItems } from '@/lib/api/hooks';

export default function DashboardPage() {
  const { data: items, isLoading } = useContentItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-bold text-white">
          Content Library
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-jelly-mint text-black rounded-xl px-6 hover:bg-jelly-mint/90 font-semibold">
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-surface-slate border-white/10">
            <DropdownMenuItem asChild>
              <Link href="/create/carousel" className="flex items-center gap-2 cursor-pointer">
                <ImagePlus className="h-4 w-4" />
                Carousel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/create/reel" className="flex items-center gap-2 cursor-pointer">
                <Film className="h-4 w-4" />
                Reel
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-slate border border-white/10 rounded-lg overflow-hidden animate-pulse"
            >
              <div className="aspect-video w-full bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-white/5 rounded w-20" />
                <div className="h-5 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ContentGrid items={items ?? []} />
      )}
    </div>
  );
}
