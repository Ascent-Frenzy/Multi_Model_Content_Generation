'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrands, useCreateReel, useApproveEditedContent } from '@/lib/api/hooks';
import type { ReelSegment } from '@app/types';
import type { ContentItem } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export default function CreateReelPage() {
  const router = useRouter();
  const [wizardStep, setWizardStep] = useState(1);
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const createReel = useCreateReel();
  const { approve, isPending: isApproving } = useApproveEditedContent();

  const [topic, setTopic] = useState('');
  const [brandProfileId, setBrandProfileId] = useState('');
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [editedScript, setEditedScript] = useState('');
  const [editedSegments, setEditedSegments] = useState<ReelSegment[]>([]);

  const handleGenerate = () => {
    createReel.mutate(
      { topic, brandProfileId },
      {
        onSuccess: (data) => {
          setContentItem(data);
          setEditedScript(data.script ?? '');
          setEditedSegments(data.reelDetail?.segments ?? []);
          setWizardStep(2);
        },
      }
    );
  };

  const handleApproveAndRender = async () => {
    if (!contentItem) return;
    await approve(contentItem.id, {
      script: editedScript,
      segments: editedSegments,
    });
    router.push(`/editor/${contentItem.id}`);
  };

  const handleSegmentChange = (index: number, field: keyof ReelSegment, value: string) => {
    setEditedSegments((prev) =>
      prev.map((seg, i) =>
        i === index ? { ...seg, [field]: value } : seg
      )
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans">Create Reel</h1>
        <p className="mt-1 text-sm text-secondary-text">
          Step {wizardStep} of 2 — {wizardStep === 1 ? 'Define your topic' : 'Review & edit script'}
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
              placeholder="What should this reel be about?"
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
            disabled={!topic.trim() || !brandProfileId || createReel.isPending}
            className="rounded-xl bg-jelly-mint text-black hover:bg-jelly-mint/90 font-sans"
          >
            {createReel.isPending ? (
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

          {createReel.isError && (
            <p className="text-sm text-ultraviolet">
              {getErrorMessage(createReel.error, 'Failed to generate reel')}
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
              setEditedScript('');
              setEditedSegments([]);
            }}
            className="text-secondary-text hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Script Editor */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-text">Script</Label>
            <Textarea
              value={editedScript}
              onChange={(e) => setEditedScript(e.target.value)}
              className="min-h-[160px] bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
            />
          </div>

          {/* Segment Cards */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-text">Segments</Label>
            <div className="space-y-4">
              {editedSegments.map((segment, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-white/10 bg-surface-slate p-5 space-y-4"
                >
                  {/* Segment Header */}
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
                      {segment.durationSecs.toFixed(1)}s
                    </span>
                  </div>

                  {/* Caption */}
                  <div className="space-y-1">
                    <Label className="text-xs text-secondary-text">Caption</Label>
                    <Textarea
                      value={segment.caption ?? ''}
                      onChange={(e) => handleSegmentChange(index, 'caption', e.target.value)}
                      className="bg-canvas-black border border-white/20 rounded-sm focus:border-jelly-mint"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
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
