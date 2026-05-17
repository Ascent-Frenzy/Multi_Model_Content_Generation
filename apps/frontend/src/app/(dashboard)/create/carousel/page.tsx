'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrands, useCreateCarousel, useApproveEditedContent } from '@/lib/api/hooks';
import type { CarouselSlide } from '@app/types';
import type { ContentItem } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export default function CreateCarouselPage() {
  const router = useRouter();
  const [wizardStep, setWizardStep] = useState(1);
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const createCarousel = useCreateCarousel();
  const { approve, isPending: isApproving } = useApproveEditedContent();

  const [topic, setTopic] = useState('');
  const [brandProfileId, setBrandProfileId] = useState('');
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [editedSlides, setEditedSlides] = useState<CarouselSlide[]>([]);

  const handleGenerate = () => {
    createCarousel.mutate(
      { topic, brandProfileId },
      {
        onSuccess: (data) => {
          setContentItem(data);
          setEditedSlides(data.carouselDetail?.slides ?? []);
          setWizardStep(2);
        },
      }
    );
  };

  const handleApproveAndRender = async () => {
    if (!contentItem) return;
    await approve(contentItem.id, { slides: editedSlides });
    router.push(`/editor/${contentItem.id}`);
  };

  const handleSlideChange = (index: number, field: keyof CarouselSlide, value: string) => {
    setEditedSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, [field]: value } : slide
      )
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans">Create Carousel</h1>
        <p className="mt-1 text-sm text-secondary-text">
          Step {wizardStep} of 2 — {wizardStep === 1 ? 'Define your topic' : 'Review & edit slides'}
        </p>
      </div>

      {wizardStep === 1 && (
        <div className="space-y-6">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm text-muted-text">
              Topic
            </Label>
            <Textarea
              id="topic"
              placeholder="What should this carousel be about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[120px] bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
            />
          </div>

          {/* Brand Select */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-text">Brand Profile</Label>
            <Select value={brandProfileId} onValueChange={setBrandProfileId}>
              <SelectTrigger className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint">
                <SelectValue placeholder="Select a brand profile" />
              </SelectTrigger>
              <SelectContent className="bg-surface-slate border border-white/10">
                {brandsLoading ? (
                  <SelectItem value="_loading" disabled>
                    Loading brands...
                  </SelectItem>
                ) : (
                  brands?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || !brandProfileId || createCarousel.isPending}
            className="rounded-xl bg-jelly-mint text-black hover:bg-jelly-mint/90 font-sans"
          >
            {createCarousel.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Script
              </>
            )}
          </Button>

          {createCarousel.isError && (
            <p className="text-sm text-ultraviolet">
              {getErrorMessage(createCarousel.error, 'Failed to generate carousel')}
            </p>
          )}
        </div>
      )}

      {wizardStep === 2 && contentItem && (
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => {
              setWizardStep(1);
              setContentItem(null);
              setEditedSlides([]);
            }}
            className="text-secondary-text hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Slide Cards */}
          <div className="space-y-4">
            {editedSlides.map((slide, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/10 bg-surface-slate p-5 space-y-4"
              >
                {/* Slide Label */}
                <p className="font-mono text-xs uppercase tracking-[1.5px] text-secondary-text">
                  Slide {slide.order}
                </p>

                {/* Headline */}
                <div className="space-y-1">
                  <Label className="text-xs text-secondary-text">Headline</Label>
                  <Input
                    value={slide.headline}
                    onChange={(e) => handleSlideChange(index, 'headline', e.target.value)}
                    className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1">
                  <Label className="text-xs text-secondary-text">Body</Label>
                  <Textarea
                    value={slide.body}
                    onChange={(e) => handleSlideChange(index, 'body', e.target.value)}
                    className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
                  />
                </div>

                {/* Colors */}
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-secondary-text">Background Color</Label>
                    <input
                      type="color"
                      value={slide.bgColor}
                      onChange={(e) => handleSlideChange(index, 'bgColor', e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-sm border border-white/20 bg-canvas-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-secondary-text">Text Color</Label>
                    <input
                      type="color"
                      value={slide.textColor}
                      onChange={(e) => handleSlideChange(index, 'textColor', e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-sm border border-white/20 bg-canvas-black"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Approve & Render Button */}
          <Button
            onClick={handleApproveAndRender}
            disabled={isApproving}
            className="rounded-xl bg-jelly-mint text-black hover:bg-jelly-mint/90 font-sans"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving & Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Approve & Render
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
